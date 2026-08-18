"""End-to-end QA for the membership gate and redemption flow.

Run this script against a built preview.  The default redemption code is a
non-production QA fixture and can be overridden with ``KUAKUA_REDEEM_CODE``.
"""

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


BASE_URL = os.environ.get("KUAKUA_BASE_URL", "http://127.0.0.1:4173/kuakua-ai/")
REDEEM_CODE = os.environ.get("KUAKUA_REDEEM_CODE", "KUAKUA-PRO-6M-DEMO")
ARTIFACTS = Path(__file__).parent / "artifacts" / "membership"
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def capture_browser_errors(page: Page, errors: list[str]) -> None:
    page.on(
        "console",
        lambda message: errors.append(
            f"console:{message.type}:{message.text} @ {message.location.get('url', '')}"
        )
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: errors.append(f"pageerror:{error}"))


def open_clean(page: Page) -> None:
    page.goto(BASE_URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")


def register_free_learner(page: Page) -> None:
    # Use a newly registered account so this test remains independent from any
    # paid entitlement assigned to the built-in demo learner by other QA flows.
    page.get_by_role("button", name="注册", exact=True).click()
    page.get_by_label("怎么称呼你", exact=True).fill("会员验收学员")
    page.get_by_label("邮箱", exact=True).fill("membership-qa@example.com")
    page.get_by_label("密码", exact=True).fill("KuaKua-QA-2026")
    page.get_by_role("button", name="创建账号", exact=False).click()
    praise = page.locator(".praise-dialog")
    praise.wait_for(state="visible")
    praise.get_by_role("button", name="收下夸赞，开始今天").click()
    page.locator(".app-shell").wait_for(state="visible")


def sign_out_and_back_in(page: Page) -> None:
    page.locator(".profile-button").click()
    page.get_by_role("button", name="退出登录", exact=True).click()
    page.get_by_label("邮箱", exact=True).fill("membership-qa@example.com")
    page.get_by_label("密码", exact=True).fill("KuaKua-QA-2026")
    page.get_by_role("button", name="进入学习空间", exact=False).click()
    page.locator(".app-shell").wait_for(state="visible")


def open_course(page: Page) -> None:
    page.get_by_role("button", name="课程", exact=True).click()
    page.locator(".stage-list").wait_for(state="visible")


def contains_price(text: str, amount: int, period: str) -> bool:
    compact = re.sub(r"\s+", "", text)
    return str(amount) in compact and period in compact


def expiry_is_six_months(iso_value: str | None) -> bool:
    if not iso_value:
        return False
    try:
        expiry = datetime.fromisoformat(iso_value.replace("Z", "+00:00"))
    except ValueError:
        return False
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    days = (expiry.astimezone(timezone.utc) - datetime.now(timezone.utc)).total_seconds() / 86400
    # Six calendar months range from 181 to 184 days.  Allow clock skew and a
    # small grace period while still rejecting a 30-day or one-year grant.
    return 179 <= days <= 186


def all_true(values) -> bool:
    if isinstance(values, dict):
        return all(all_true(value) for value in values.values())
    if isinstance(values, (list, tuple)):
        return all(all_true(value) for value in values)
    return bool(values)


def main() -> None:
    checks: dict = {}
    errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 1000}, device_scale_factor=1
        )
        page = context.new_page()
        capture_browser_errors(page, errors)

        try:
            open_clean(page)
            register_free_learner(page)

            membership_status = page.get_by_test_id("membership-status")
            membership_status.wait_for(state="visible")
            checks["authenticated_free_status"] = (
                membership_status.get_attribute("data-membership-tier") == "free"
                and "免费" in membership_status.inner_text()
            )

            # The authenticated state and its membership tier must survive reload.
            page.reload(wait_until="networkidle")
            checks["login_persists"] = page.locator(".app-shell").is_visible()
            checks["free_status_persists"] = "免费" in page.get_by_test_id(
                "membership-status"
            ).inner_text() and page.get_by_test_id("membership-status").get_attribute(
                "data-membership-tier"
            ) == "free"

            sign_out_and_back_in(page)
            signed_in_status = page.get_by_test_id("membership-status")
            checks["sign_in_restores_free_status"] = (
                signed_in_status.get_attribute("data-membership-tier") == "free"
                and "免费" in signed_in_status.inner_text()
            )

            # A free account can inspect the complete public catalogue.
            open_course(page)
            checks["free_stage_count"] = page.locator(".stage-card").count()
            checks["free_lesson_count"] = page.locator(".lesson-row").count()
            checks["free_book_count"] = page.locator(".resource-book-chips > span").count()
            checks["free_method_count"] = page.locator(".method-card").count()
            page.screenshot(
                path=str(ARTIFACTS / "01-free-course-catalogue.png"), full_page=True
            )

            # Starting a lesson must open the membership gate, never the reader.
            page.locator(".lesson-row").first.click()
            gate = page.get_by_test_id("membership-gate")
            gate.wait_for(state="visible")
            gate_text = gate.inner_text()
            checks["free_lesson_is_gated"] = page.locator(".lesson-dialog").count() == 0
            checks["free_ai_is_gated"] = (
                page.locator(".ai-workspace").count() == 0 and "AI" in gate_text
            )
            checks["gate_explains_membership"] = "会员" in gate_text

            # All four products and exact public prices are present in the gate.
            pricing = gate.get_by_test_id("membership-pricing")
            pricing.wait_for(state="visible")
            plan_texts = {
                "pro_monthly": pricing.get_by_test_id("plan-pro-monthly").inner_text(),
                "pro_yearly": pricing.get_by_test_id("plan-pro-yearly").inner_text(),
                "max_monthly": pricing.get_by_test_id("plan-max-monthly").inner_text(),
                "max_yearly": pricing.get_by_test_id("plan-max-yearly").inner_text(),
            }
            checks["plans"] = {
                "pro_monthly_29": contains_price(plan_texts["pro_monthly"], 29, "月"),
                "pro_yearly_299": contains_price(plan_texts["pro_yearly"], 299, "年"),
                "max_monthly_99": contains_price(plan_texts["max_monthly"], 99, "月"),
                "max_yearly_999": contains_price(plan_texts["max_yearly"], 999, "年"),
                "pro_learning_and_ai": (
                    "学习" in plan_texts["pro_monthly"] and "AI" in plan_texts["pro_monthly"]
                ),
                "max_ai_unlimited": "不限量" in (
                    plan_texts["max_monthly"] + plan_texts["max_yearly"]
                ),
            }

            payment_code = gate.get_by_test_id("enterprise-payment-code")
            checks["enterprise_payment_entry"] = payment_code.is_visible()
            checks["enterprise_payment_qr"] = (
                payment_code.locator("img").count() == 1
                and bool(payment_code.locator("img").get_attribute("src"))
            )
            checks["enterprise_discount_copy"] = "企业" in payment_code.inner_text()
            page.screenshot(
                path=str(ARTIFACTS / "02-membership-pricing.png"), full_page=False
            )

            code_input = gate.get_by_test_id("redeem-code-input")
            code_submit = gate.get_by_test_id("redeem-code-submit")
            code_input.fill("INVALID-QA-CODE")
            code_submit.click()
            feedback = gate.get_by_test_id("redeem-code-feedback")
            feedback.wait_for(state="visible")
            checks["invalid_code_rejected"] = any(
                marker in feedback.inner_text() for marker in ("无效", "错误", "不存在", "失效")
            )
            checks["invalid_code_keeps_free"] = "免费" in page.get_by_test_id(
                "membership-status"
            ).inner_text()

            # The QA fixture grants exactly six months of PRO access.
            code_input.fill(REDEEM_CODE)
            code_submit.click()
            pro_status = page.get_by_test_id("membership-status")
            pro_status.wait_for(state="visible")
            checks["redeem_upgrades_to_pro"] = "PRO" in pro_status.inner_text().upper()

            page.reload(wait_until="networkidle")
            persisted_status = page.get_by_test_id("membership-status").inner_text()
            status_locator = page.get_by_test_id("membership-status")
            checks["pro_status_persists"] = (
                "PRO" in persisted_status.upper()
                and status_locator.get_attribute("data-membership-tier") == "pro"
            )
            checks["six_month_expiry"] = expiry_is_six_months(
                status_locator.get_attribute("data-membership-expires-at")
            )

            # PRO members can open lessons and run the metered AI coach.
            open_course(page)
            page.locator(".lesson-row").first.click()
            reader = page.locator(".lesson-dialog")
            reader.wait_for(state="visible")
            checks["pro_can_start_lesson"] = reader.is_visible()
            reader.get_by_role("tab", name="AI 陪练", exact=False).click()
            usage = reader.get_by_test_id("ai-usage-status")
            usage.wait_for(state="visible")
            usage_before = usage.inner_text()
            reader.locator(".ai-workspace textarea").fill(
                "我正在验证面向独立顾问的学习产品，已经访谈六位目标用户，"
                "现在需要把问题、证据、限制条件和下一步实验整理成可验收任务。"
            )
            reader.get_by_role("button", name="生成陪练任务").click()
            output = reader.locator(".ai-output pre")
            output.wait_for(state="visible")
            checks["pro_ai_output_generated"] = bool(output.inner_text().strip())
            usage_after = usage.inner_text()
            checks["pro_ai_is_metered"] = (
                "100" in usage_before
                and "99" in usage_after
                and usage_before != usage_after
            )
            page.screenshot(
                path=str(ARTIFACTS / "03-pro-ai-coach.png"), full_page=False
            )
        finally:
            context.close()

        payment_context = browser.new_context(
            viewport={"width": 1440, "height": 1000}, device_scale_factor=1
        )
        payment_page = payment_context.new_page()
        capture_browser_errors(payment_page, errors)
        open_clean(payment_page)
        register_free_learner(payment_page)
        open_course(payment_page)
        payment_page.locator(".lesson-row").first.click()
        payment_gate = payment_page.get_by_test_id("membership-gate")
        payment_gate.wait_for(state="visible")
        payment_gate.get_by_test_id("plan-max-monthly").click()
        payment_gate.get_by_test_id("payment-reference-input").fill("260818")
        payment_gate.get_by_test_id("payment-submit").click()
        payment_page.locator(".toast").get_by_text("等待人工核对", exact=False).wait_for(
            state="visible"
        )
        checks["payment_request_created"] = (
            payment_gate.locator(".user-orders").count() == 1
            and "99" in payment_gate.locator(".user-orders").inner_text()
        )
        payment_gate.locator(".membership-close").click()

        payment_page.locator(".profile-button").click()
        payment_page.get_by_role("button", name="退出登录", exact=True).click()
        payment_page.get_by_role("button", name="管理员体验", exact=False).click()
        payment_page.locator(".praise-dialog").wait_for(state="visible")
        payment_page.get_by_role("button", name="收下夸赞，开始今天").click()
        payment_page.get_by_role("button", name="角色管理", exact=True).click()
        pending_order = payment_page.get_by_test_id("admin-payment-order")
        pending_order.wait_for(state="visible")
        checks["admin_sees_pending_payment"] = "99" in pending_order.inner_text()
        pending_order.get_by_test_id("admin-approve-payment").click()
        pending_order.wait_for(state="detached")
        checks["admin_approves_payment"] = payment_page.get_by_test_id(
            "admin-payment-order"
        ).count() == 0

        payment_page.get_by_test_id("enterprise-name-input").fill("晴幂企业验收客户")
        payment_page.get_by_test_id("enterprise-code-count").fill("2")
        payment_page.get_by_test_id("enterprise-code-generate").click()
        generated_codes_box = payment_page.get_by_test_id("generated-enterprise-codes")
        generated_codes_box.wait_for(state="visible")
        generated_codes = [
            code.strip() for code in generated_codes_box.input_value().splitlines() if code.strip()
        ]
        local_storage_dump = payment_page.evaluate(
            """() => JSON.stringify(Object.fromEntries(
                Array.from({length: localStorage.length}, (_, index) => {
                    const key = localStorage.key(index);
                    return [key, localStorage.getItem(key)];
                })
            ))"""
        )
        checks["admin_generates_enterprise_codes"] = (
            len(generated_codes) == 2
            and all(code.startswith("KUAKUA-PRO-6M-") for code in generated_codes)
        )
        checks["raw_enterprise_codes_not_persisted"] = all(
            code not in local_storage_dump for code in generated_codes
        )

        sign_out_and_back_in(payment_page)
        approved_status = payment_page.get_by_test_id("membership-status")
        checks["approved_payment_activates_max"] = (
            approved_status.get_attribute("data-membership-tier") == "max"
            and "MAX" in approved_status.inner_text().upper()
        )
        open_course(payment_page)
        payment_page.locator(".lesson-row").first.click()
        max_reader = payment_page.locator(".lesson-dialog")
        max_reader.wait_for(state="visible")
        max_reader.get_by_role("tab", name="AI 陪练", exact=False).click()
        max_usage = max_reader.get_by_test_id("ai-usage-status")
        usage_before_max = max_usage.inner_text()
        max_reader.locator(".ai-workspace textarea").fill(
            "我正在为一个企业客户设计高频 AI 训练流程，需要验证不限量会员连续运行时不会扣减显示额度。"
        )
        max_reader.get_by_role("button", name="生成陪练任务").click()
        max_reader.locator(".ai-output pre").wait_for(state="visible")
        checks["max_ai_is_unlimited"] = (
            "不限量" in usage_before_max and max_usage.inner_text() == usage_before_max
        )
        payment_page.screenshot(
            path=str(ARTIFACTS / "04-admin-payment-approved.png"), full_page=False
        )
        payment_context.close()

        mobile_checks = {}
        for width in (320, 360, 390, 430):
            mobile_context = browser.new_context(
                viewport={"width": width, "height": 844}, device_scale_factor=1
            )
            mobile_page = mobile_context.new_page()
            capture_browser_errors(mobile_page, errors)
            open_clean(mobile_page)
            register_free_learner(mobile_page)
            mobile_page.locator(".bottom-nav").get_by_role(
                "button", name="课程", exact=True
            ).click()
            mobile_page.locator(".lesson-row").first.click()
            mobile_gate = mobile_page.get_by_test_id("membership-gate")
            mobile_gate.wait_for(state="visible")
            metrics = mobile_page.evaluate(
                """() => ({
                    documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                    gateRight: document.querySelector('[data-testid="membership-gate"]').getBoundingClientRect().right,
                    viewport: document.documentElement.clientWidth,
                    planCount: document.querySelectorAll('[data-testid^="plan-"]').length,
                    qrCount: document.querySelectorAll('[data-testid="enterprise-payment-code"] img').length
                })"""
            )
            mobile_checks[str(width)] = {
                "gate_visible": mobile_gate.is_visible(),
                "document_overflow": metrics["documentOverflow"],
                "gate_within_viewport": metrics["gateRight"] <= metrics["viewport"] + 1,
                "plan_count": metrics["planCount"],
                "qr_count": metrics["qrCount"],
            }
            if width == 390:
                mobile_page.wait_for_timeout(500)
                mobile_page.screenshot(
                    path=str(ARTIFACTS / "05-membership-mobile.png"), full_page=False
                )
            mobile_context.close()
        checks["mobile"] = mobile_checks

        localized_checks = {}
        localized_headings = {
            "en": "Everything is visible",
            "es": "Todo está visible",
            "hi": "सब कुछ",
            "ar": "كل المحتوى",
        }
        for locale, heading_fragment in localized_headings.items():
            localized_context = browser.new_context(
                viewport={"width": 390, "height": 844}, device_scale_factor=1
            )
            localized_page = localized_context.new_page()
            capture_browser_errors(localized_page, errors)
            open_clean(localized_page)
            register_free_learner(localized_page)
            localized_page.get_by_test_id("language-selector").select_option(locale)
            localized_page.locator(".bottom-nav button").nth(1).click()
            localized_page.locator(".lesson-row").first.click()
            localized_gate = localized_page.get_by_test_id("membership-gate")
            localized_gate.wait_for(state="visible")
            localized_checks[locale] = {
                "heading": localized_gate.get_by_role(
                    "heading", name=re.compile(heading_fragment, re.IGNORECASE)
                ).is_visible(),
                "plans": localized_gate.locator('[data-testid^="plan-"]').count() == 4,
                "overflow": localized_page.evaluate(
                    "document.documentElement.scrollWidth - document.documentElement.clientWidth"
                )
                == 0,
                "direction": localized_page.locator("html").get_attribute("dir")
                == ("rtl" if locale == "ar" else "ltr"),
            }
            localized_context.close()
        checks["localized_membership_gate"] = localized_checks

        # Exercise the public-host boundary through the same loopback preview.
        # Chromium resolves *.localhost locally while preserving the hostname.
        public_base_url = BASE_URL
        if "127.0.0.1" in public_base_url:
            public_base_url = public_base_url.replace("127.0.0.1", "happykua.localhost")
        elif "localhost" in public_base_url:
            public_base_url = public_base_url.replace("localhost", "happykua.localhost")
        public_context = browser.new_context(viewport={"width": 1280, "height": 900})
        public_page = public_context.new_page()
        public_request_urls = []
        public_page.on("request", lambda request: public_request_urls.append(request.url))
        capture_browser_errors(public_page, errors)
        public_page.goto(public_base_url, wait_until="networkidle")
        public_page.evaluate(
            """() => {
                localStorage.setItem('kuakua-ai.accounts.v1', JSON.stringify([{
                    id: 'demo-learner', name: 'Demo', email: 'demo@example.com',
                    role: 'learner', passwordHash: '0'.repeat(64), active: true,
                    createdAt: new Date().toISOString()
                }]));
                localStorage.setItem('kuakua-ai.session.v1', 'demo-learner');
            }"""
        )
        public_page.reload(wait_until="networkidle")
        demo_bypass_blocked = (
            public_page.locator(".auth-screen").is_visible()
            and public_page.locator(".demo-buttons").count() == 0
            and public_page.evaluate("localStorage.getItem('kuakua-ai.session.v1')") is None
        )
        public_page.evaluate(
            """() => {
                localStorage.setItem('kuakua-ai.accounts.v1', JSON.stringify([{
                    id: 'public-qa', name: 'Public QA', email: 'public@example.com',
                    role: 'learner', passwordHash: '0'.repeat(64), active: true,
                    createdAt: new Date().toISOString()
                }]));
                localStorage.setItem('kuakua-ai.session.v1', 'public-qa');
            }"""
        )
        public_page.reload(wait_until="networkidle")
        public_praise = public_page.locator(".praise-dialog")
        if public_praise.is_visible():
            public_praise.locator("button").last.click()
        public_page.get_by_test_id("membership-status").click()
        public_page.locator(".membership-page").wait_for(state="visible")
        public_page.get_by_test_id("redeem-code-input").fill(REDEEM_CODE)
        public_page.locator(".redeem-card form").evaluate("form => form.requestSubmit()")
        public_page.wait_for_timeout(100)
        checks["public_host_safety"] = {
            "demo_bypass_blocked": demo_bypass_blocked,
            "payment_qr_not_rendered": public_page.get_by_test_id(
                "enterprise-payment-code"
            ).locator("img").count() == 0,
            "payment_disabled": public_page.get_by_test_id("payment-submit").is_disabled(),
            "redemption_disabled": public_page.get_by_test_id("redeem-code-submit").is_disabled(),
            "forced_redemption_stays_free": public_page.get_by_test_id(
                "membership-status"
            ).get_attribute("data-membership-tier") == "free",
            "payment_qr_not_requested": not any(
                "/__local/company-payment-qr.png" in url for url in public_request_urls
            ),
        }
        public_context.close()
        browser.close()

    required = [
        checks.get("authenticated_free_status"),
        checks.get("login_persists"),
        checks.get("free_status_persists"),
        checks.get("sign_in_restores_free_status"),
        checks.get("free_stage_count") == 8,
        checks.get("free_lesson_count") == 32,
        checks.get("free_book_count") == 24,
        checks.get("free_method_count") == 4,
        checks.get("free_lesson_is_gated"),
        checks.get("free_ai_is_gated"),
        checks.get("gate_explains_membership"),
        all_true(checks.get("plans", {})),
        checks.get("enterprise_payment_entry"),
        checks.get("enterprise_payment_qr"),
        checks.get("enterprise_discount_copy"),
        checks.get("invalid_code_rejected"),
        checks.get("invalid_code_keeps_free"),
        checks.get("redeem_upgrades_to_pro"),
        checks.get("pro_status_persists"),
        checks.get("six_month_expiry"),
        checks.get("pro_can_start_lesson"),
        checks.get("pro_ai_output_generated"),
        checks.get("pro_ai_is_metered"),
        checks.get("payment_request_created"),
        checks.get("admin_sees_pending_payment"),
        checks.get("admin_approves_payment"),
        checks.get("admin_generates_enterprise_codes"),
        checks.get("raw_enterprise_codes_not_persisted"),
        checks.get("approved_payment_activates_max"),
        checks.get("max_ai_is_unlimited"),
        all_true(
            {
                width: {
                    "gate_visible": values.get("gate_visible"),
                    "no_overflow": values.get("document_overflow") == 0,
                    "gate_within_viewport": values.get("gate_within_viewport"),
                    "four_plans": values.get("plan_count") == 4,
                    "payment_qr": values.get("qr_count") == 1,
                }
                for width, values in checks.get("mobile", {}).items()
            }
        ),
        all_true(checks.get("localized_membership_gate", {})),
        all_true(checks.get("public_host_safety", {})),
    ]
    result = {
        "status": "passed" if not errors and all(required) else "failed",
        "base_url": BASE_URL,
        "checks": checks,
        "console_errors": errors,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result["status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
