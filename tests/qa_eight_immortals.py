import json
import os
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


BASE_URL = os.environ.get("KUAKUA_BASE_URL", "http://127.0.0.1:4173/kuakua-ai/")
ARTIFACTS = Path(__file__).parent / "artifacts" / "eight-immortals"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

STAGE_TITLES = [
    "战略定位与个体商业设计",
    "市场调研与客户洞察",
    "产品定义与最小验证",
    "品牌与界面设计",
    "AI 技术开发与上线发布",
    "商业化与客户成功",
    "OPC 系统与运营增长",
    "出海与全球化经营",
]

OUTBOUND_LESSONS = [
    "选择第一个海外市场：只打一口井",
    "从翻译到本地化：重做价值抵达路径",
    "海外定价、支付与税务链路",
    "合规冷启动：完成一次单市场试航",
]


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


def enter_as_learner(page: Page) -> None:
    page.get_by_role("button", name="学员体验").click()
    page.get_by_role("dialog").wait_for(state="visible")
    page.get_by_role("button", name="收下夸赞，开始今天").click()
    page.locator(".app-shell").wait_for(state="visible")


def open_course(page: Page, *, mobile: bool = False) -> None:
    if mobile:
        page.locator(".bottom-nav").get_by_role("button", name="课程", exact=True).click()
    else:
        page.get_by_role("button", name="课程", exact=True).click()
    page.locator(".stage-list").wait_for(state="visible")


def horizontal_overflow(page: Page) -> int:
    return page.evaluate(
        "Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)"
    )


def find_immortal_cards(page: Page):
    cards = page.locator('[data-testid="immortal-card"], .immortal-card')
    if cards.count() == 0:
        # The eight stage cards are also the canonical immortal cards in the compact layout.
        cards = page.locator(".stage-card")
    return cards


def check_course_overview(page: Page, checks: dict, prefix: str = "desktop") -> None:
    immortal_cards = find_immortal_cards(page)
    checks[f"{prefix}_immortal_card_count"] = immortal_cards.count()
    checks[f"{prefix}_stage_titles"] = {
        title: immortal_cards.filter(has_text=title).count() == 1 for title in STAGE_TITLES
    }
    checks[f"{prefix}_stage_count"] = page.locator(".stage-card").count()
    checks[f"{prefix}_lesson_count"] = page.locator(".lesson-row").count()
    checks[f"{prefix}_core_book_count"] = page.locator(".resource-book-chips > span").count()

    outbound_stage = page.locator(".stage-card").filter(has_text="出海与全球化经营")
    checks[f"{prefix}_outbound_stage_count"] = outbound_stage.count()
    checks[f"{prefix}_outbound_lesson_count"] = outbound_stage.locator(".lesson-row").count()
    checks[f"{prefix}_outbound_lessons"] = {
        title: outbound_stage.get_by_text(title, exact=True).count() == 1
        for title in OUTBOUND_LESSONS
    }
    checks[f"{prefix}_horizontal_overflow_px"] = horizontal_overflow(page)


def check_outbound_reader(page: Page, checks: dict, prefix: str = "desktop") -> None:
    outbound_stage = page.locator(".stage-card").filter(has_text="出海与全球化经营")
    outbound_stage.get_by_text(OUTBOUND_LESSONS[0], exact=True).click()
    dialog = page.get_by_role("dialog")
    dialog.wait_for(state="visible")

    checks[f"{prefix}_reader_title"] = dialog.get_by_role(
        "heading", name=OUTBOUND_LESSONS[0], exact=True
    ).is_visible()
    checks[f"{prefix}_reader_tab_count"] = dialog.get_by_role("tab").count()

    dialog.get_by_role("tab", name="核心书架", exact=False).click()
    checks[f"{prefix}_reader_book_count"] = dialog.locator(".book-deep-card").count()

    dialog.get_by_role("tab", name="AI 陪练", exact=False).click()
    dialog.locator(".ai-workspace textarea").fill(
        "目标是验证新加坡中小企业的 AI 课程需求。我们已记录 6 次访谈，"
        "三位受访者当前每季度购买一次中文培训，但还没有英文落地页和当地付款证据。"
    )
    dialog.get_by_role("button", name="生成陪练任务").click()
    output = dialog.locator(".ai-output pre")
    output.wait_for(state="visible")
    checks[f"{prefix}_ai_generated"] = output.inner_text().strip() != ""

    dialog.get_by_role("tab", name="资料来源", exact=False).click()
    source_links = dialog.locator(".source-library a")
    checks[f"{prefix}_source_count"] = source_links.count()
    checks[f"{prefix}_trade_gov_source"] = (
        dialog.locator('.source-library a[href*="trade.gov"]').count() >= 1
    )
    checks[f"{prefix}_reader_horizontal_overflow_px"] = horizontal_overflow(page)


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
        try:
            desktop_context = browser.new_context(
                viewport={"width": 1440, "height": 1000}, device_scale_factor=1
            )
            desktop = desktop_context.new_page()
            capture_browser_errors(desktop, errors)
            open_clean(desktop)
            enter_as_learner(desktop)
            open_course(desktop)
            check_course_overview(desktop, checks)
            desktop.screenshot(path=str(ARTIFACTS / "01-eight-immortals-desktop.png"), full_page=True)
            check_outbound_reader(desktop, checks)
            desktop.screenshot(path=str(ARTIFACTS / "02-outbound-reader-desktop.png"), full_page=False)
            desktop_context.close()

            mobile_context = browser.new_context(
                viewport={"width": 390, "height": 844}, device_scale_factor=1
            )
            mobile = mobile_context.new_page()
            capture_browser_errors(mobile, errors)
            open_clean(mobile)
            enter_as_learner(mobile)
            open_course(mobile, mobile=True)
            check_course_overview(mobile, checks, prefix="mobile")
            mobile.screenshot(path=str(ARTIFACTS / "03-eight-immortals-mobile.png"), full_page=True)
            check_outbound_reader(mobile, checks, prefix="mobile")
            mobile.screenshot(path=str(ARTIFACTS / "04-outbound-reader-mobile.png"), full_page=False)
            mobile_context.close()
        finally:
            browser.close()

    required = [
        checks.get("desktop_immortal_card_count") == 8,
        all_true(checks.get("desktop_stage_titles", {})),
        checks.get("desktop_stage_count") == 8,
        checks.get("desktop_lesson_count") == 32,
        checks.get("desktop_core_book_count") == 24,
        checks.get("desktop_outbound_stage_count") == 1,
        checks.get("desktop_outbound_lesson_count") == 4,
        all_true(checks.get("desktop_outbound_lessons", {})),
        checks.get("desktop_reader_title"),
        checks.get("desktop_reader_tab_count") == 6,
        checks.get("desktop_reader_book_count") == 3,
        checks.get("desktop_ai_generated"),
        checks.get("desktop_source_count", 0) >= 4,
        checks.get("desktop_trade_gov_source"),
        checks.get("desktop_horizontal_overflow_px") == 0,
        checks.get("desktop_reader_horizontal_overflow_px") == 0,
        checks.get("mobile_immortal_card_count") == 8,
        all_true(checks.get("mobile_stage_titles", {})),
        checks.get("mobile_stage_count") == 8,
        checks.get("mobile_lesson_count") == 32,
        checks.get("mobile_core_book_count") == 24,
        checks.get("mobile_outbound_stage_count") == 1,
        checks.get("mobile_outbound_lesson_count") == 4,
        all_true(checks.get("mobile_outbound_lessons", {})),
        checks.get("mobile_reader_tab_count") == 6,
        checks.get("mobile_reader_book_count") == 3,
        checks.get("mobile_ai_generated"),
        checks.get("mobile_trade_gov_source"),
        checks.get("mobile_horizontal_overflow_px") == 0,
        checks.get("mobile_reader_horizontal_overflow_px") == 0,
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
