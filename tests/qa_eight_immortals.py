import json
import os
from pathlib import Path

from playwright.sync_api import Locator, Page, sync_playwright


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

PHASE_IDS = ["concept", "learn", "practice", "workbench"]


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
    page.locator(".app-shell").wait_for(state="visible")


def open_course(page: Page, *, mobile: bool = False) -> None:
    if mobile:
        page.locator(".bottom-nav").get_by_role("button", name="课程", exact=True).click()
    else:
        page.locator(".desktop-nav").get_by_role("button", name="课程", exact=True).click()
    page.locator(".course-vnext .stage-disclosure").first.wait_for(state="visible")


def horizontal_overflow(page: Page) -> int:
    return page.evaluate(
        "Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)"
    )


def stage_by_title(page: Page, title: str) -> Locator:
    return page.locator(".stage-disclosure").filter(
        has=page.get_by_role("heading", name=title, exact=True)
    )


def check_course_overview(page: Page, checks: dict, prefix: str = "desktop") -> None:
    stages = page.locator(".course-vnext .stage-disclosure")
    checks[f"{prefix}_course_vnext_visible"] = page.locator(".course-vnext").is_visible()
    checks[f"{prefix}_stage_count"] = stages.count()
    checks[f"{prefix}_stage_titles"] = {
        title: stage_by_title(page, title).count() == 1 for title in STAGE_TITLES
    }
    checks[f"{prefix}_lessons_per_stage"] = [
        stages.nth(index).locator(".lesson-row").count() for index in range(stages.count())
    ]
    checks[f"{prefix}_lesson_count"] = page.locator(
        ".course-vnext .stage-disclosure .lesson-row"
    ).count()
    checks[f"{prefix}_books_per_stage"] = [
        stages.nth(index).locator(".reading-disclosure a").count()
        for index in range(stages.count())
    ]
    checks[f"{prefix}_core_book_count"] = page.locator(
        ".course-vnext .reading-disclosure a"
    ).count()
    checks[f"{prefix}_lesson_loop_phase_count"] = page.locator(
        ".course-loop-strip ol > li"
    ).count()
    checks[f"{prefix}_default_open_stage_count"] = page.locator(
        ".stage-disclosure[open]"
    ).count()

    outbound_stage = stage_by_title(page, "出海与全球化经营")
    checks[f"{prefix}_outbound_stage_count"] = outbound_stage.count()
    checks[f"{prefix}_outbound_lesson_count"] = outbound_stage.locator(
        ".lesson-row"
    ).count()
    checks[f"{prefix}_outbound_lessons"] = {
        title: outbound_stage.get_by_text(title, exact=True).count() == 1
        for title in OUTBOUND_LESSONS
    }
    checks[f"{prefix}_horizontal_overflow_px"] = horizontal_overflow(page)


def check_outbound_learning_route(
    page: Page, checks: dict, prefix: str = "desktop"
) -> None:
    outbound_stage = stage_by_title(page, "出海与全球化经营")
    if outbound_stage.get_attribute("open") is None:
        outbound_stage.locator("summary").first.click()
    outbound_stage.get_by_text(OUTBOUND_LESSONS[0], exact=True).click()

    route = page.get_by_test_id("learning-route")
    route.wait_for(state="visible")
    checks[f"{prefix}_reader_title"] = route.get_by_role(
        "heading", name=OUTBOUND_LESSONS[0], exact=True
    ).is_visible()
    checks[f"{prefix}_route_is_not_modal"] = route.get_attribute("role") != "dialog"
    checks[f"{prefix}_phase_count"] = route.locator(
        '.learning-phase-nav [data-testid^="learning-phase-"]'
    ).count()
    checks[f"{prefix}_phase_ids"] = {
        phase: route.get_by_test_id(f"learning-phase-{phase}").count() == 1
        for phase in PHASE_IDS
    }
    checks[f"{prefix}_concept_visible"] = route.locator(".concept-step").is_visible()

    route.get_by_test_id("learning-phase-learn").click()
    route.locator(".learn-step").wait_for(state="visible")
    books = route.locator(".learn-library > details").nth(0)
    books.locator("summary").click()
    checks[f"{prefix}_reader_book_count"] = route.locator(".book-deep-card").count()
    checks[f"{prefix}_deep_case_visible"] = route.locator(".learn-case").is_visible()

    sources = route.locator(".learn-library > details").nth(2)
    sources.locator("summary").click()
    source_links = route.locator(".source-library a")
    checks[f"{prefix}_source_count"] = source_links.count()
    checks[f"{prefix}_trade_gov_source"] = (
        route.locator('.source-library a[href*="trade.gov"]').count() >= 1
    )

    route.get_by_test_id("learning-phase-practice").click()
    practice = route.get_by_test_id("deepseek-practice")
    practice.wait_for(state="visible")
    practice.get_by_test_id("coach-material").fill(
        "目标是验证新加坡中小企业的 AI 课程需求。我们已记录 6 次访谈，"
        "三位受访者当前每季度购买一次中文培训，但还没有英文落地页和当地付款证据。"
    )
    practice.get_by_test_id("coach-submit").click()
    result = practice.get_by_test_id("coach-result")
    result.wait_for(state="visible")
    checks[f"{prefix}_ai_generated"] = result.inner_text().strip() != ""
    checks[f"{prefix}_ai_preview_model"] = "local-preview" in result.inner_text()

    route.get_by_test_id("learning-phase-workbench").click()
    harness = route.get_by_test_id("harness-step")
    harness.wait_for(state="visible")
    harness.get_by_test_id("harness-file-input").set_input_files(
        [
            {
                "name": "market-brief.md",
                "mimeType": "text/markdown",
                "buffer": b"# Singapore market validation\n",
            },
            {
                "name": ".env",
                "mimeType": "text/plain",
                "buffer": b"FAKE_TEST_VALUE=not-a-secret\n",
            },
        ]
    )
    selected_files = harness.get_by_test_id("harness-selected-files")
    task_spec = harness.get_by_test_id("harness-task-spec").inner_text()
    checks[f"{prefix}_workbench_visible"] = harness.is_visible()
    checks[f"{prefix}_safe_file_count"] = selected_files.locator("header span").inner_text()
    checks[f"{prefix}_task_has_selected_file"] = "market-brief.md" in task_spec
    checks[f"{prefix}_task_excludes_secret_file"] = ".env" not in task_spec
    checks[f"{prefix}_harness_local_url"] = harness.get_by_test_id(
        "harness-open"
    ).get_attribute("href")
    checks[f"{prefix}_evidence_in_workbench"] = route.get_by_test_id(
        "evidence-text"
    ).is_visible()
    checks[f"{prefix}_learning_point_saved"] = page.evaluate(
        "Object.keys(localStorage).some(key => key.includes('learning-point'))"
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
            desktop.screenshot(
                path=str(ARTIFACTS / "01-eight-stages-desktop.png"), full_page=True
            )
            check_outbound_learning_route(desktop, checks)
            desktop.screenshot(
                path=str(ARTIFACTS / "02-outbound-learning-route-desktop.png"),
                full_page=False,
            )
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
            mobile.screenshot(
                path=str(ARTIFACTS / "03-eight-stages-mobile.png"), full_page=True
            )
            check_outbound_learning_route(mobile, checks, prefix="mobile")
            mobile.screenshot(
                path=str(ARTIFACTS / "04-outbound-learning-route-mobile.png"),
                full_page=False,
            )
            mobile_context.close()
        finally:
            browser.close()

    required = [
        checks.get("desktop_course_vnext_visible"),
        checks.get("desktop_stage_count") == 8,
        all_true(checks.get("desktop_stage_titles", {})),
        checks.get("desktop_lessons_per_stage") == [4] * 8,
        checks.get("desktop_lesson_count") == 32,
        checks.get("desktop_books_per_stage") == [3] * 8,
        checks.get("desktop_core_book_count") == 24,
        checks.get("desktop_lesson_loop_phase_count") == 4,
        checks.get("desktop_default_open_stage_count") == 1,
        checks.get("desktop_outbound_stage_count") == 1,
        checks.get("desktop_outbound_lesson_count") == 4,
        all_true(checks.get("desktop_outbound_lessons", {})),
        checks.get("desktop_reader_title"),
        checks.get("desktop_route_is_not_modal"),
        checks.get("desktop_phase_count") == 4,
        all_true(checks.get("desktop_phase_ids", {})),
        checks.get("desktop_concept_visible"),
        checks.get("desktop_reader_book_count") == 3,
        checks.get("desktop_deep_case_visible"),
        checks.get("desktop_ai_generated"),
        checks.get("desktop_ai_preview_model"),
        checks.get("desktop_source_count", 0) >= 4,
        checks.get("desktop_trade_gov_source"),
        checks.get("desktop_workbench_visible"),
        checks.get("desktop_safe_file_count") == "1",
        checks.get("desktop_task_has_selected_file"),
        checks.get("desktop_task_excludes_secret_file"),
        checks.get("desktop_harness_local_url") == "http://127.0.0.1:3080/",
        checks.get("desktop_evidence_in_workbench"),
        checks.get("desktop_learning_point_saved"),
        checks.get("desktop_horizontal_overflow_px") == 0,
        checks.get("desktop_reader_horizontal_overflow_px") == 0,
        checks.get("mobile_course_vnext_visible"),
        checks.get("mobile_stage_count") == 8,
        all_true(checks.get("mobile_stage_titles", {})),
        checks.get("mobile_lessons_per_stage") == [4] * 8,
        checks.get("mobile_lesson_count") == 32,
        checks.get("mobile_books_per_stage") == [3] * 8,
        checks.get("mobile_core_book_count") == 24,
        checks.get("mobile_lesson_loop_phase_count") == 4,
        checks.get("mobile_default_open_stage_count") == 1,
        checks.get("mobile_outbound_stage_count") == 1,
        checks.get("mobile_outbound_lesson_count") == 4,
        all_true(checks.get("mobile_outbound_lessons", {})),
        checks.get("mobile_phase_count") == 4,
        all_true(checks.get("mobile_phase_ids", {})),
        checks.get("mobile_reader_book_count") == 3,
        checks.get("mobile_ai_generated"),
        checks.get("mobile_ai_preview_model"),
        checks.get("mobile_trade_gov_source"),
        checks.get("mobile_workbench_visible"),
        checks.get("mobile_safe_file_count") == "1",
        checks.get("mobile_task_has_selected_file"),
        checks.get("mobile_task_excludes_secret_file"),
        checks.get("mobile_evidence_in_workbench"),
        checks.get("mobile_learning_point_saved"),
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
