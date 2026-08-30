"""End-to-end QA for free preview, paid learning, DeepSeek practice and Harness."""

import json
import os
import re
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


BASE_URL = os.environ.get("KUAKUA_BASE_URL", "http://127.0.0.1:4173/kuakua-ai/")
REDEEM_CODE = os.environ.get("KUAKUA_REDEEM_CODE", "KUAKUA-PRO-6M-DEMO")
ARTIFACTS = Path(__file__).parent / "artifacts" / "membership"
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def capture_errors(page: Page, errors: list[str]) -> None:
    page.on("console", lambda message: errors.append(f"console:{message.type}:{message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"pageerror:{error}"))


def open_clean(page: Page) -> None:
    page.goto(BASE_URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")


def register_free(page: Page) -> None:
    page.get_by_role("button", name="注册", exact=True).click()
    page.get_by_label("怎么称呼你", exact=True).fill("会员验收学员")
    page.get_by_label("邮箱", exact=True).fill("membership-qa@example.com")
    page.get_by_label("密码", exact=True).fill("KuaKua-QA-2026")
    page.get_by_role("button", name="创建账号", exact=False).click()
    page.get_by_test_id("progress-praise").wait_for(state="visible")


def open_first_lesson(page: Page) -> None:
    page.get_by_role("button", name="课程", exact=True).click()
    page.locator(".stage-accordion").wait_for(state="visible")
    page.locator(".lesson-row").first.click()
    page.get_by_test_id("learning-route").wait_for(state="visible")


def contains_price(text: str, amount: int, period: str) -> bool:
    compact = re.sub(r"\s+", "", text)
    return str(amount) in compact and period in compact


def main() -> None:
    checks: dict[str, object] = {}
    errors: list[str] = []
    harness_requests: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
        page = context.new_page()
        capture_errors(page, errors)
        page.on("request", lambda request: harness_requests.append(request.url) if "127.0.0.1:3080" in request.url else None)
        open_clean(page)
        register_free(page)

        status = page.get_by_test_id("membership-status")
        checks["free_status"] = status.get_attribute("data-membership-tier") == "free"
        checks["praise_inline_not_modal"] = page.get_by_test_id("progress-praise").is_visible() and page.locator(".praise-dialog").count() == 0

        page.reload(wait_until="networkidle")
        checks["login_and_free_status_persist"] = page.locator(".app-shell").is_visible() and page.get_by_test_id("membership-status").get_attribute("data-membership-tier") == "free"

        page.get_by_role("button", name="课程", exact=True).click()
        checks["catalogue"] = {
            "stages": page.locator(".stage-disclosure").count() == 8,
            "lessons": page.locator(".lesson-row").count() == 32,
            "books": page.locator(".reading-disclosure a").count() == 25,
        }

        page.locator(".lesson-row").first.click()
        route = page.get_by_test_id("learning-route")
        checks["free_opens_reader"] = route.is_visible()
        checks["four_phases"] = page.locator(".learning-phase-nav button").count() == 4
        checks["free_concept_visible"] = page.locator(".concept-step").is_visible()
        page.get_by_test_id("learning-phase-learn").click()
        checks["free_learn_visible"] = page.locator(".learn-step").is_visible()
        checks["resources_collapsed"] = all(not item.is_visible() for item in [page.locator(".book-panel"), page.locator(".video-panel"), page.locator(".sources-panel")])

        page.get_by_test_id("learning-phase-practice").click()
        gate = page.get_by_test_id("membership-gate")
        gate.wait_for(state="visible")
        checks["protected_phases_gated"] = route.is_visible() and gate.is_visible() and page.locator(".deepseek-practice").count() == 0
        pricing = gate.get_by_test_id("membership-pricing")
        plan_texts = {
            "pro_monthly": pricing.get_by_test_id("plan-pro-monthly").inner_text(),
            "pro_yearly": pricing.get_by_test_id("plan-pro-yearly").inner_text(),
            "max_monthly": pricing.get_by_test_id("plan-max-monthly").inner_text(),
            "max_yearly": pricing.get_by_test_id("plan-max-yearly").inner_text(),
        }
        checks["plans"] = {
            "pro_29": contains_price(plan_texts["pro_monthly"], 29, "月"),
            "pro_299": contains_price(plan_texts["pro_yearly"], 299, "年"),
            "max_99": contains_price(plan_texts["max_monthly"], 99, "月"),
            "max_999": contains_price(plan_texts["max_yearly"], 999, "年"),
            "max_unlimited": "不限量" in (plan_texts["max_monthly"] + plan_texts["max_yearly"]),
        }
        payment = gate.get_by_test_id("enterprise-payment-code")
        checks["enterprise_payment_qr"] = payment.locator("img").count() == 1 and "企业" in payment.inner_text()

        gate.get_by_test_id("redeem-code-input").fill("INVALID-QA-CODE")
        gate.get_by_test_id("redeem-code-submit").click()
        gate.get_by_test_id("redeem-code-feedback").wait_for(state="visible")
        checks["invalid_code_rejected"] = any(token in gate.get_by_test_id("redeem-code-feedback").inner_text() for token in ("无效", "不存在", "错误"))
        gate.get_by_test_id("redeem-code-input").fill(REDEEM_CODE)
        gate.get_by_test_id("redeem-code-submit").click()
        page.wait_for_function("document.querySelector('[data-testid=membership-status]')?.dataset.membershipTier === 'pro'")
        checks["redeem_upgrades_to_pro"] = page.get_by_test_id("membership-status").get_attribute("data-membership-tier") == "pro"
        if gate.is_visible():
            gate.locator(".membership-close").click()

        page.get_by_test_id("learning-phase-practice").click()
        practice = page.get_by_test_id("deepseek-practice")
        practice.wait_for(state="visible")
        usage_before = practice.locator(".ai-usage-badge").inner_text()
        practice.get_by_test_id("coach-material").fill("我正在验证面向独立顾问的学习产品，已经访谈六位目标用户，记录了三次工作流失败；现在要决定先做模板还是服务。")
        practice.get_by_test_id("coach-submit").click()
        result = practice.get_by_test_id("coach-result")
        result.wait_for(state="visible")
        usage_after = practice.locator(".ai-usage-badge").inner_text()
        checks["structured_ai_feedback"] = (
            result.locator(".coach-ack").is_visible()
            and result.locator(".coach-feedback-grid section").count() == 2
            and result.locator(".coach-rubric > div").count() >= 1
            and result.locator(".coach-question").is_visible()
            and result.locator(".coach-next-action").is_visible()
        )
        checks["pro_ai_metered"] = "100" in usage_before and "99" in usage_after

        page.get_by_test_id("learning-phase-workbench").click()
        page.get_by_test_id("harness-step").wait_for(state="visible")
        checks["harness_requires_file_selection"] = (
            page.locator(".harness-open-disabled").is_visible()
            and page.get_by_test_id("harness-copy-task").is_disabled()
        )
        page.get_by_test_id("harness-file-input").set_input_files([
            {"name": "product-brief.md", "mimeType": "text/markdown", "buffer": b"PRIVATE_MARKER_DO_NOT_UPLOAD"},
            {"name": ".env", "mimeType": "text/plain", "buffer": b"DEEPSEEK_API_KEY=secret"},
        ])
        selected = page.get_by_test_id("harness-selected-files")
        task = page.get_by_test_id("harness-task-spec").inner_text()
        checks["harness_file_boundary"] = (
            "product-brief.md" in selected.inner_text()
            and "已从任务单排除 1" in selected.inner_text()
            and "product-brief.md" in task
            and ".env" not in task
            and "只修改" in task
            and "diff" in task
        )
        checks["no_automatic_harness_connection"] = not harness_requests
        checks["harness_user_link"] = page.get_by_test_id("harness-open").get_attribute("href") == "http://127.0.0.1:3080/"

        evidence_text = page.get_by_test_id("evidence-text")
        evidence_url = page.get_by_test_id("evidence-url")
        submit = page.get_by_test_id("submit-evidence")
        checks["evidence_required"] = submit.is_disabled()
        evidence_text.fill("我完成了真实项目的产品简报，依据六次访谈整理出共同问题，下一步用三位客户验证付费意愿。")
        evidence_url.fill("bad-url")
        checks["invalid_url_blocked"] = submit.is_disabled()
        evidence_url.fill("https://example.com/evidence")
        page.get_by_test_id("save-evidence-draft").click()
        checks["draft_saved"] = "已保存在本浏览器" in page.locator(".evidence-save-status").inner_text()
        submit.click()
        page.get_by_text("知识吸收成功").wait_for(state="visible")
        checks["evidence_completes_and_rewards"] = "小晴获得 +40 知识值" in page.locator(".reward-dialog").inner_text()
        page.screenshot(path=str(ARTIFACTS / "paid-learning-loop.png"), full_page=False)

        state = page.evaluate("""() => {
          const progress = JSON.parse(localStorage.getItem('kuakua-ai.progress.v1'));
          const user = progress.find(item => item.userId && item.userId !== 'demo-admin');
          return { xp: user.xp, submitted: Boolean(user.evidenceByLessonId['identity-01'].submittedAt) };
        }""")
        checks["progress_state"] = state["xp"] == 40 and state["submitted"]
        checks["file_content_not_in_requests"] = all("PRIVATE_MARKER_DO_NOT_UPLOAD" not in request for request in harness_requests)

        context.close()
        browser.close()

    def all_true(value):
        if isinstance(value, dict):
            return all(all_true(item) for item in value.values())
        return bool(value)

    passed = not errors and all_true(checks)
    print(json.dumps({"status": "passed" if passed else "failed", "checks": checks, "console_errors": errors}, ensure_ascii=False, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
