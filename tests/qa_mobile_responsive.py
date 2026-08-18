import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("KUAKUA_BASE_URL", "http://127.0.0.1:4173/kuakua-ai/")
ARTIFACTS = Path(__file__).parent / "artifacts" / "mobile-responsive"
ARTIFACTS.mkdir(parents=True, exist_ok=True)
VIEWPORTS = (320, 360, 390, 430)


def open_clean(page):
    page.goto(BASE_URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")
    page.evaluate("document.fonts.ready")


def box(page, selector):
    value = page.locator(selector).bounding_box()
    return {key: round(number, 1) for key, number in value.items()} if value else None


def overflow(page):
    return page.evaluate(
        "Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)"
    )


def main():
    checks = {}
    errors = []

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
            auth_ok = (
                overflow(page) == 0
                and story["width"] == width
                and panel["width"] == width
                and panel["y"] >= story["height"] - 1
                and card["x"] >= 0
                and card["x"] + card["width"] <= width + 1
            )

            page.locator(".demo-buttons button").first.click()
            page.locator(".praise-dialog").wait_for(state="visible")
            page.locator(".praise-accept").click()
            page.locator(".dashboard-hero").wait_for(state="visible")
            page.wait_for_timeout(80)
            hero_copy = box(page, ".hero-copy")
            hero_title = box(page, ".hero-copy h1")
            cta = box(page, ".hero-actions .primary-button")
            nav = box(page, ".bottom-nav")
            dashboard_scroll_y = page.evaluate("window.scrollY")
            dashboard_ok = (
                overflow(page) == 0
                and dashboard_scroll_y == 0
                and hero_copy["width"] >= width * 0.72
                and hero_title["height"] < 180
                and cta["width"] >= width * 0.68
                and abs(nav["width"] - width) <= 1
            )

            page.locator(".bottom-nav .nav-button").nth(1).click()
            page.locator(".stage-list").wait_for(state="visible")
            page.wait_for_timeout(80)
            course_ok = (
                overflow(page) == 0
                and page.locator(".course-start-shortcut").is_visible()
                and page.locator(".method-card").count() == 4
                and page.locator(".method-card-footer a").count() >= 8
                and page.locator(".immortal-card").count() == 8
                and page.locator(".stage-card").count() == 8
                and page.locator(".lesson-row").count() == 32
                and "八仙" not in page.locator("body").inner_text()
            )

            page.locator(".lesson-row").first.click()
            page.locator(".lesson-dialog").wait_for(state="visible")
            page.wait_for_timeout(80)
            close_button = box(page, ".dialog-close")
            language = box(page, ".lesson-dialog-language .language-switcher")
            breadcrumb = box(page, ".lesson-breadcrumb")
            dialog_body_viewport = page.evaluate(
                """() => {
                  const dialog = document.querySelector('.lesson-dialog');
                  const top = document.querySelector('.lesson-dialog-top');
                  const tabs = document.querySelector('.lesson-tabbar');
                  const footer = document.querySelector('.lesson-dialog-footer');
                  return dialog.clientHeight - top.offsetHeight - tabs.offsetHeight - footer.offsetHeight;
                }"""
            )
            dialog_ok = (
                overflow(page) == 0
                and close_button["width"] >= 43.5
                and close_button["height"] >= 43.5
                and language["height"] >= 43.5
                and breadcrumb["y"] >= close_button["y"] + close_button["height"] + 6
                and dialog_body_viewport >= 420
                and page.locator(".lesson-tabbar button").count() == 6
            )

            checks[str(width)] = {
                "auth": auth_ok,
                "dashboard": dashboard_ok,
                "dashboard_metrics": {
                    "scroll_y": dashboard_scroll_y,
                    "hero_copy": hero_copy,
                    "hero_title": hero_title,
                    "cta": cta,
                    "nav": nav,
                },
                "course": course_ok,
                "dialog": dialog_ok,
                "dialog_body_viewport": dialog_body_viewport,
                "horizontal_overflow": overflow(page),
            }

            if width in (320, 390):
                page.screenshot(
                    path=str(ARTIFACTS / f"{width}-lesson-reader.png"), full_page=False
                )
            context.close()

        browser.close()

    passed = not errors and all(
        all(item[key] for key in ("auth", "dashboard", "course", "dialog"))
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
