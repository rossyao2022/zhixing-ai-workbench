import json
import os
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


BASE_URL = os.environ.get("KUAKUA_BASE_URL", "http://127.0.0.1:4173/kuakua-ai/")
ARTIFACTS = Path(__file__).parent / "artifacts" / "mobile-responsive"
ARTIFACTS.mkdir(parents=True, exist_ok=True)
VIEWPORTS = (320, 360, 390, 430)


def open_clean(page: Page) -> None:
    page.goto(BASE_URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")
    page.evaluate("document.fonts.ready")


def box(page: Page, selector: str):
    value = page.locator(selector).first.bounding_box()
    return (
        {key: round(number, 1) for key, number in value.items()} if value else None
    )


def overflow(page: Page) -> int:
    return page.evaluate(
        "Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)"
    )


def font_size(page: Page, selector: str) -> float:
    return page.locator(selector).first.evaluate(
        "element => Number.parseFloat(getComputedStyle(element).fontSize)"
    )


def all_targets_at_least(page: Page, selector: str, minimum: float = 43.5) -> bool:
    return page.locator(selector).evaluate_all(
        """(elements, threshold) => elements.length > 0 && elements.every(element => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden'
            && box.width >= threshold && box.height >= threshold;
        })""",
        minimum,
    )


def main() -> None:
    checks: dict = {}
    errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for width in VIEWPORTS:
            context = browser.new_context(
                viewport={"width": width, "height": 844}, device_scale_factor=1
            )
            page = context.new_page()
            page.on(
                "console",
                lambda message, width=width: errors.append(
                    f"{width}:console:{message.type}:{message.text}"
                )
                if message.type == "error"
                else None,
            )
            page.on(
                "pageerror",
                lambda error, width=width: errors.append(f"{width}:pageerror:{error}"),
            )
            open_clean(page)

            story = box(page, ".auth-story")
            panel = box(page, ".auth-panel")
            card = box(page, ".auth-card")
            auth_ok = bool(
                story
                and panel
                and card
                and overflow(page) == 0
                and abs(story["width"] - width) <= 1
                and abs(panel["width"] - width) <= 1
                and panel["y"] >= story["height"] - 1
                and card["x"] >= 0
                and card["x"] + card["width"] <= width + 1
            )

            page.locator(".demo-buttons button").first.click()
            page.get_by_test_id("progress-praise").wait_for(state="visible")
            page.locator(".today-focus").wait_for(state="visible")
            page.wait_for_timeout(80)
            praise = box(page, '[data-testid="progress-praise"]')
            focus = box(page, ".today-focus")
            focus_title = box(page, ".today-focus h1")
            cta = box(page, ".focus-cta")
            nav = box(page, ".bottom-nav")
            dashboard_scroll_y = page.evaluate("window.scrollY")
            dashboard_ok = bool(
                praise
                and focus
                and focus_title
                and cta
                and nav
                and overflow(page) == 0
                and dashboard_scroll_y == 0
                and page.locator(".praise-dialog").count() == 0
                and page.get_by_test_id("progress-praise").get_attribute(
                    "data-praise-reason"
                )
                == "welcome"
                and focus["width"] <= width
                and focus_title["height"] < 150
                and cta["width"] >= focus["width"] * 0.82
                and cta["height"] >= 43.5
                and abs(nav["width"] - width) <= 1
                and font_size(page, "body") >= 17
                and font_size(page, ".today-focus-copy > p") >= 17
            )

            page.locator(".bottom-nav").get_by_role(
                "button", name="课程", exact=True
            ).click()
            page.locator(".course-vnext").wait_for(state="visible")
            page.wait_for_timeout(80)
            stage_summary = box(page, ".stage-disclosure > summary")
            course_ok = bool(
                stage_summary
                and overflow(page) == 0
                and page.locator(".course-next-card").is_visible()
                and page.locator(".course-loop-strip ol > li").count() == 4
                and page.locator(".stage-disclosure").count() == 8
                and page.locator(".stage-disclosure[open]").count() == 1
                and page.locator(".stage-disclosure .lesson-row").count() == 32
                and stage_summary["height"] >= 80
                and not page.locator(".methods-disclosure").evaluate(
                    "element => element.open"
                )
                and "八仙" not in page.locator("body").inner_text()
            )

            page.locator(".course-next-card").click()
            page.get_by_test_id("learning-route").wait_for(state="visible")
            page.wait_for_timeout(80)
            route_scroll_y = page.evaluate("window.scrollY")
            route_box = box(page, '[data-testid="learning-route"]')
            back_button = box(page, '[data-testid="learning-back"]')
            language = box(page, ".learning-route-language .language-switcher")
            title = box(page, ".learning-title-block h1")
            footer_next = box(page, '[data-testid="learning-next"]')
            phase_buttons_touchable = all_targets_at_least(
                page, ".learning-phase-nav button"
            )
            concept_only = (
                page.locator(
                    ".learning-phase-panel > .concept-step, "
                    ".learning-phase-panel > .learn-step, "
                    ".learning-phase-panel > .deepseek-practice, "
                    ".learning-phase-panel > .harness-step"
                ).count()
                == 1
                and page.locator(".concept-step").is_visible()
            )
            learning_ok = bool(
                route_box
                and back_button
                and language
                and title
                and footer_next
                and overflow(page) == 0
                and route_scroll_y == 0
                and route_box["x"] >= 0
                and route_box["x"] + route_box["width"] <= width + 1
                and back_button["width"] >= 43.5
                and back_button["height"] >= 43.5
                and language["height"] >= 43.5
                and footer_next["height"] >= 43.5
                and phase_buttons_touchable
                and page.locator(".learning-phase-nav button").count() == 4
                and page.get_by_test_id("learning-phase-concept").get_attribute(
                    "aria-current"
                )
                == "step"
                and page.locator(".bottom-nav").count() == 0
                and concept_only
                and font_size(page, ".learning-route") >= 17
                and font_size(page, ".concept-lead") >= 17
            )

            page.get_by_test_id("learning-phase-learn").click()
            page.locator(".learn-step").wait_for(state="visible")
            learn_ok = (
                page.get_by_test_id("learning-phase-learn").get_attribute(
                    "aria-current"
                )
                == "step"
                and page.locator(".learn-library > details").count() == 3
                and page.locator(".learn-library > details[open]").count() == 0
                and overflow(page) == 0
            )

            page.get_by_test_id("learning-phase-workbench").click()
            page.get_by_test_id("harness-step").wait_for(state="visible")
            workbench_ok = (
                page.get_by_test_id("learning-phase-workbench").get_attribute(
                    "aria-current"
                )
                == "step"
                and page.get_by_test_id("harness-file-input").is_visible()
                and page.get_by_test_id("evidence-text").is_visible()
                and page.get_by_test_id("submit-evidence").is_disabled()
                and page.get_by_test_id("harness-copy-task").is_disabled()
                and page.get_by_test_id("harness-open").get_attribute("aria-disabled")
                == "true"
                and overflow(page) == 0
            )

            checks[str(width)] = {
                "auth": auth_ok,
                "dashboard": dashboard_ok,
                "dashboard_metrics": {
                    "scroll_y": dashboard_scroll_y,
                    "praise": praise,
                    "focus": focus,
                    "focus_title": focus_title,
                    "cta": cta,
                    "nav": nav,
                    "body_font_size": font_size(page, "body"),
                },
                "course": course_ok,
                "learning": learning_ok,
                "learn_phase": learn_ok,
                "workbench": workbench_ok,
                "learning_metrics": {
                    "scroll_y": route_scroll_y,
                    "route": route_box,
                    "back": back_button,
                    "language": language,
                    "title": title,
                    "route_font_size": font_size(page, ".learning-route"),
                },
                "horizontal_overflow": overflow(page),
            }

            if width in (320, 390):
                page.screenshot(
                    path=str(ARTIFACTS / f"{width}-workbench.png"), full_page=False
                )
            context.close()

        browser.close()

    passed = not errors and all(
        all(
            item[key]
            for key in (
                "auth",
                "dashboard",
                "course",
                "learning",
                "learn_phase",
                "workbench",
            )
        )
        for item in checks.values()
    )
    result = {
        "status": "passed" if passed else "failed",
        "base_url": BASE_URL,
        "checks": checks,
        "console_errors": errors,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
