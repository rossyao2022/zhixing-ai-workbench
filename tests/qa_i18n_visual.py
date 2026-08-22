import json
import os
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


BASE_URL = os.environ.get("KUAKUA_BASE_URL", "http://127.0.0.1:4173/kuakua-ai/")
ARTIFACTS = Path(__file__).parent / "artifacts" / "i18n"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

LOCALES = {
    "zh-CN": {"heading": "欢迎回来", "dir": "ltr"},
    "en": {"heading": "Welcome back", "dir": "ltr"},
    "es": {"heading": "Bienvenido de nuevo", "dir": "ltr"},
    "hi": {"heading": "वापसी पर स्वागत है", "dir": "ltr"},
    "ar": {"heading": "مرحباً بعودتك", "dir": "rtl"},
}


def attach_error_capture(page: Page, errors: list[str]) -> None:
    page.on(
        "console",
        lambda message: errors.append(f"console:{message.type}:{message.text}")
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: errors.append(f"pageerror:{error}"))


def open_clean(page: Page) -> None:
    page.goto(BASE_URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")


def settle_fonts(page: Page) -> None:
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(180)


def overflow(page: Page) -> int:
    return page.evaluate(
        "Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)"
    )


def enter_demo(page: Page, button_name: str) -> None:
    page.get_by_role("button", name=button_name).click()
    page.locator(".app-shell").wait_for(state="visible")


def main() -> None:
    checks: dict = {}
    errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        desktop = browser.new_context(
            viewport={"width": 1440, "height": 980}, device_scale_factor=1
        )
        page = desktop.new_page()
        attach_error_capture(page, errors)
        open_clean(page)
        checks["default_locale"] = page.locator("html").get_attribute("lang")
        checks["language_options"] = page.locator(
            '[data-testid="language-selector"] option'
        ).count()

        locale_checks = {}
        for locale, expected in LOCALES.items():
            page.locator('[data-testid="language-selector"]').select_option(locale)
            settle_fonts(page)
            locale_checks[locale] = {
                "lang": page.locator("html").get_attribute("lang"),
                "dir": page.locator("html").get_attribute("dir"),
                "heading": page.get_by_role(
                    "heading", name=expected["heading"], exact=True
                ).is_visible(),
                "overflow": overflow(page),
            }
            if locale in {"zh-CN", "en", "ar"}:
                page.screenshot(
                    path=str(ARTIFACTS / f"login-{locale}.png"), full_page=True
                )

        page.reload(wait_until="networkidle")
        checks["locale_persists"] = page.locator("html").get_attribute("lang") == "ar"

        page.locator('[data-testid="language-selector"]').select_option("en")
        enter_demo(page, "Learner demo")
        page.locator(".desktop-nav .nav-button").nth(1).click()
        page.locator(".course-vnext .stage-disclosure").first.wait_for(state="visible")
        stages = page.locator(".course-vnext .stage-disclosure")
        checks["desktop_stage_count"] = stages.count()
        checks["desktop_lesson_count"] = page.locator(
            ".course-vnext .lesson-row"
        ).count()
        checks["desktop_books_per_stage"] = [
            stages.nth(index).locator(".reading-disclosure a").count()
            for index in range(stages.count())
        ]
        checks["english_course_title"] = (
            "real solo company" in page.locator(".course-vnext-head h1").inner_text()
        )
        checks["english_course_boundary_disclosed"] = page.locator(
            ".course-vnext > .language-coverage-notice"
        ).get_by_text("the interface, course map and method preview are translated", exact=False).is_visible()
        checks["desktop_course_overflow"] = overflow(page)
        page.screenshot(path=str(ARTIFACTS / "course-en.png"), full_page=True)

        page.locator(".stage-disclosure[open] .lesson-row").first.click()
        route = page.get_by_test_id("learning-route")
        route.wait_for(state="visible")
        english_lesson = route.locator("#lesson-title").inner_text()
        checks["english_language_boundary_disclosed"] = route.get_by_text(
            "the interface and core method are translated", exact=False
        ).is_visible()
        checks["learning_phase_count"] = route.locator(
            '.learning-phase-nav [data-testid^="learning-phase-"]'
        ).count()

        route.get_by_test_id("learning-phase-learn").click()
        route.locator(".learn-step").wait_for(state="visible")
        checks["chinese_master_badge_visible"] = route.get_by_text(
            "Simplified Chinese master content", exact=True
        ).is_visible()
        book_disclosure = route.locator(".learn-library > details").nth(0)
        book_disclosure.locator("summary").click()
        checks["chinese_master_content_visible"] = (
            route.locator(".book-deep-card").count() == 3
            and route.get_by_text("主要内容", exact=True).first.is_visible()
        )
        checks["learning_point_saved"] = page.evaluate(
            "Object.keys(localStorage).some(key => key.includes('learning-point'))"
        )

        route.locator('[data-testid="language-selector"]').select_option("ar")
        settle_fonts(page)
        arabic_lesson = route.locator("#lesson-title").inner_text()
        checks["route_survives_locale_switch"] = (
            route.is_visible() and english_lesson != arabic_lesson
        )
        checks["route_rtl"] = page.locator("html").get_attribute("dir") == "rtl"
        checks["route_phase_stable"] = route.locator(
            '.learning-phase-nav [data-testid^="learning-phase-"]'
        ).count()
        checks["learn_phase_persists_across_locale"] = (
            route.get_by_test_id("learning-phase-learn").get_attribute("aria-current")
            == "step"
        )
        checks["route_overflow_rtl"] = overflow(page)
        checks["arabic_language_boundary_disclosed"] = route.get_by_text(
            "ملاحظة اللغة", exact=False
        ).is_visible()
        page.screenshot(path=str(ARTIFACTS / "lesson-ar.png"), full_page=False)
        route.get_by_test_id("learning-back").click()

        page.reload(wait_until="networkidle")
        checks["authenticated_locale_persists"] = (
            page.locator("html").get_attribute("lang") == "ar"
        )
        checks["learning_phase_storage_persists"] = page.evaluate(
            """() => {
              const key = Object.keys(localStorage).find(item => item.includes('learning-point'));
              if (!key) return false;
              try { return JSON.parse(localStorage.getItem(key)).phase === 'learn'; }
              catch { return false; }
            }"""
        )
        page.screenshot(path=str(ARTIFACTS / "dashboard-ar.png"), full_page=False)
        desktop.close()

        mobile = browser.new_context(
            viewport={"width": 390, "height": 844}, device_scale_factor=1
        )
        mobile_page = mobile.new_page()
        attach_error_capture(mobile_page, errors)
        open_clean(mobile_page)
        mobile_page.locator('[data-testid="language-selector"]').select_option("es")
        settle_fonts(mobile_page)
        enter_demo(mobile_page, "Demo estudiante")
        mobile_page.locator(".bottom-nav .nav-button").nth(1).click()
        mobile_page.locator(".course-vnext .stage-disclosure").first.wait_for(
            state="visible"
        )
        mobile_stages = mobile_page.locator(".course-vnext .stage-disclosure")
        checks["mobile_es_stages"] = mobile_stages.count()
        checks["mobile_es_lessons"] = mobile_page.locator(
            ".course-vnext .lesson-row"
        ).count()
        checks["mobile_es_books_per_stage"] = [
            mobile_stages.nth(index).locator(".reading-disclosure a").count()
            for index in range(mobile_stages.count())
        ]
        checks["mobile_es_overflow"] = overflow(mobile_page)
        mobile_page.screenshot(
            path=str(ARTIFACTS / "course-es-mobile.png"), full_page=True
        )

        mobile_page.locator(
            '.topbar [data-testid="language-selector"]'
        ).select_option("hi")
        settle_fonts(mobile_page)
        checks["mobile_hi_lang"] = mobile_page.locator("html").get_attribute("lang")
        checks["mobile_hi_overflow"] = overflow(mobile_page)
        checks["mobile_hi_title_localized"] = (
            "एक विचार" in mobile_page.locator(".course-vnext-head h1").inner_text()
        )

        mobile_page.locator(
            '.topbar [data-testid="language-selector"]'
        ).select_option("ar")
        settle_fonts(mobile_page)
        checks["mobile_ar_dir"] = mobile_page.locator("html").get_attribute("dir")
        checks["mobile_ar_overflow"] = overflow(mobile_page)
        page_widths = mobile_page.evaluate(
            """() => ({
              viewport: document.documentElement.clientWidth,
              topbar: Math.ceil(document.querySelector('.topbar').getBoundingClientRect().width),
              bottomNav: Math.ceil(document.querySelector('.bottom-nav').getBoundingClientRect().width)
            })"""
        )
        checks["mobile_ar_widths"] = page_widths
        checks["mobile_ar_shell_within_viewport"] = (
            0 < page_widths["topbar"] <= page_widths["viewport"]
            and 0 < page_widths["bottomNav"] <= page_widths["viewport"]
        )
        mobile_page.screenshot(
            path=str(ARTIFACTS / "course-ar-mobile.png"), full_page=False
        )

        mobile_page.locator(".stage-disclosure[open] .lesson-row").first.click()
        mobile_route = mobile_page.get_by_test_id("learning-route")
        mobile_route.wait_for(state="visible")
        checks["mobile_ar_route_visible"] = mobile_route.is_visible()
        checks["mobile_ar_route_phase_count"] = mobile_route.locator(
            '.learning-phase-nav [data-testid^="learning-phase-"]'
        ).count()
        checks["mobile_ar_route_rtl"] = (
            mobile_page.locator("html").get_attribute("dir") == "rtl"
        )
        checks["mobile_ar_route_overflow"] = overflow(mobile_page)
        checks["mobile_bottom_nav_hidden_in_route"] = mobile_page.locator(
            ".bottom-nav"
        ).count() == 0
        mobile_page.screenshot(
            path=str(ARTIFACTS / "lesson-ar-mobile.png"), full_page=False
        )
        mobile.close()

        browser.close()

    required = [
        checks.get("default_locale") == "zh-CN",
        checks.get("language_options") == 5,
        all(
            item["lang"] == locale
            and item["dir"] == LOCALES[locale]["dir"]
            and item["heading"]
            and item["overflow"] == 0
            for locale, item in locale_checks.items()
        ),
        checks.get("locale_persists"),
        checks.get("desktop_stage_count") == 8,
        checks.get("desktop_lesson_count") == 32,
        checks.get("desktop_books_per_stage") == [3] * 8,
        checks.get("english_course_title"),
        checks.get("english_course_boundary_disclosed"),
        checks.get("desktop_course_overflow") == 0,
        checks.get("english_language_boundary_disclosed"),
        checks.get("learning_phase_count") == 4,
        checks.get("chinese_master_badge_visible"),
        checks.get("chinese_master_content_visible"),
        checks.get("learning_point_saved"),
        checks.get("route_survives_locale_switch"),
        checks.get("route_rtl"),
        checks.get("route_phase_stable") == 4,
        checks.get("learn_phase_persists_across_locale"),
        checks.get("route_overflow_rtl") == 0,
        checks.get("arabic_language_boundary_disclosed"),
        checks.get("authenticated_locale_persists"),
        checks.get("learning_phase_storage_persists"),
        checks.get("mobile_es_stages") == 8,
        checks.get("mobile_es_lessons") == 32,
        checks.get("mobile_es_books_per_stage") == [3] * 8,
        checks.get("mobile_es_overflow") == 0,
        checks.get("mobile_hi_lang") == "hi",
        checks.get("mobile_hi_overflow") == 0,
        checks.get("mobile_hi_title_localized"),
        checks.get("mobile_ar_dir") == "rtl",
        checks.get("mobile_ar_overflow") == 0,
        checks.get("mobile_ar_shell_within_viewport"),
        checks.get("mobile_ar_route_visible"),
        checks.get("mobile_ar_route_phase_count") == 4,
        checks.get("mobile_ar_route_rtl"),
        checks.get("mobile_ar_route_overflow") == 0,
        checks.get("mobile_bottom_nav_hidden_in_route"),
    ]
    result = {
        "status": "passed" if not errors and all(required) else "failed",
        "base_url": BASE_URL,
        "checks": checks,
        "locale_checks": locale_checks,
        "console_errors": errors,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result["status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
