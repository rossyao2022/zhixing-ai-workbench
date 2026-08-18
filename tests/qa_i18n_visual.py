import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


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


def attach_error_capture(page, errors):
    page.on(
        "console",
        lambda message: errors.append(f"console:{message.type}:{message.text}")
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: errors.append(f"pageerror:{error}"))


def open_clean(page):
    page.goto(BASE_URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")


def settle_fonts(page):
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(180)


def overflow(page):
    return page.evaluate(
        "Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)"
    )


def main():
    checks = {}
    errors = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        desktop = browser.new_context(viewport={"width": 1440, "height": 980}, device_scale_factor=1)
        page = desktop.new_page()
        attach_error_capture(page, errors)
        open_clean(page)
        checks["default_locale"] = page.locator("html").get_attribute("lang")
        checks["language_options"] = page.locator('[data-testid="language-selector"] option').count()

        locale_checks = {}
        for locale, expected in LOCALES.items():
            page.locator('[data-testid="language-selector"]').select_option(locale)
            settle_fonts(page)
            locale_checks[locale] = {
                "lang": page.locator("html").get_attribute("lang"),
                "dir": page.locator("html").get_attribute("dir"),
                "heading": page.get_by_role("heading", name=expected["heading"]).is_visible(),
                "overflow": overflow(page),
            }
            if locale in {"zh-CN", "en", "ar"}:
                page.screenshot(path=str(ARTIFACTS / f"login-{locale}.png"), full_page=True)

        page.reload(wait_until="networkidle")
        checks["locale_persists"] = page.locator("html").get_attribute("lang") == "ar"

        page.locator('[data-testid="language-selector"]').select_option("en")
        page.get_by_role("button", name="Learner demo").click()
        page.get_by_role("dialog").wait_for(state="visible")
        page.get_by_role("button", name="Take it in and begin").click()
        page.locator(".desktop-nav .nav-button").nth(1).click()
        page.locator(".stage-card").first.wait_for(state="visible")
        checks["desktop_stage_count"] = page.locator(".stage-card").count()
        checks["desktop_lesson_count"] = page.locator(".lesson-row").count()
        checks["english_course_title"] = "real solo company" in page.locator(".page-intro h1").inner_text()
        checks["desktop_course_overflow"] = overflow(page)
        page.screenshot(path=str(ARTIFACTS / "course-en.png"), full_page=True)

        page.locator(".lesson-row").first.click()
        dialog = page.get_by_role("dialog")
        dialog.wait_for(state="visible")
        english_lesson = dialog.locator("#lesson-title").inner_text()
        checks["english_language_boundary_disclosed"] = dialog.get_by_text(
            "the interface and method preview are translated", exact=False
        ).is_visible()
        dialog.get_by_role("tab", name="Core books").click()
        checks["chinese_master_badge_visible"] = dialog.get_by_text(
            "Simplified Chinese master content", exact=True
        ).is_visible()
        checks["chinese_master_semantics"] = (
            dialog.locator(".master-content").get_attribute("lang") == "zh-CN"
            and dialog.locator(".master-content").get_attribute("dir") == "ltr"
        )
        dialog.locator('[data-testid="language-selector"]').select_option("ar")
        settle_fonts(page)
        arabic_lesson = dialog.locator("#lesson-title").inner_text()
        checks["dialog_survives_locale_switch"] = dialog.is_visible() and english_lesson != arabic_lesson
        checks["dialog_rtl"] = page.locator("html").get_attribute("dir") == "rtl"
        checks["dialog_tabs_stable"] = dialog.locator('[role="tab"]').count()
        checks["dialog_overflow_rtl"] = overflow(page)
        checks["arabic_language_boundary_disclosed"] = dialog.get_by_text(
            "ملاحظة اللغة", exact=False
        ).is_visible()
        page.screenshot(path=str(ARTIFACTS / "lesson-ar.png"), full_page=False)
        dialog.get_by_role("button", name="إغلاق").click()

        page.reload(wait_until="networkidle")
        checks["authenticated_locale_persists"] = page.locator("html").get_attribute("lang") == "ar"
        checks["progress_identity_stable"] = page.evaluate(
            "Object.keys(localStorage).filter(k => k.includes('progress')).length"
        ) >= 1
        page.screenshot(path=str(ARTIFACTS / "dashboard-ar.png"), full_page=False)
        desktop.close()

        mobile = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        mobile_page = mobile.new_page()
        attach_error_capture(mobile_page, errors)
        open_clean(mobile_page)
        mobile_page.locator('[data-testid="language-selector"]').select_option("es")
        settle_fonts(mobile_page)
        mobile_page.get_by_role("button", name="Demo estudiante").click()
        mobile_page.get_by_role("dialog").wait_for(state="visible")
        mobile_page.get_by_role("button", name="Recíbelo y empieza").click()
        mobile_page.locator(".bottom-nav .nav-button").nth(1).click()
        mobile_page.locator(".stage-card").first.wait_for(state="visible")
        checks["mobile_es_lessons"] = mobile_page.locator(".lesson-row").count()
        checks["mobile_es_overflow"] = overflow(mobile_page)
        mobile_page.screenshot(path=str(ARTIFACTS / "course-es-mobile.png"), full_page=True)

        mobile_page.locator('.topbar [data-testid="language-selector"]').select_option("hi")
        settle_fonts(mobile_page)
        checks["mobile_hi_lang"] = mobile_page.locator("html").get_attribute("lang")
        checks["mobile_hi_overflow"] = overflow(mobile_page)
        checks["mobile_hi_title_localized"] = "एक विचार" in mobile_page.locator(".page-intro h1").inner_text()

        mobile_page.locator('.topbar [data-testid="language-selector"]').select_option("ar")
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
        mobile_page.screenshot(path=str(ARTIFACTS / "course-ar-mobile.png"), full_page=False)
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
        checks.get("english_course_title"),
        checks.get("desktop_course_overflow") == 0,
        checks.get("english_language_boundary_disclosed"),
        checks.get("chinese_master_badge_visible"),
        checks.get("chinese_master_semantics"),
        checks.get("dialog_survives_locale_switch"),
        checks.get("dialog_rtl"),
        checks.get("dialog_tabs_stable") == 6,
        checks.get("dialog_overflow_rtl") == 0,
        checks.get("arabic_language_boundary_disclosed"),
        checks.get("authenticated_locale_persists"),
        checks.get("progress_identity_stable"),
        checks.get("mobile_es_lessons") == 32,
        checks.get("mobile_es_overflow") == 0,
        checks.get("mobile_hi_lang") == "hi",
        checks.get("mobile_hi_overflow") == 0,
        checks.get("mobile_hi_title_localized"),
        checks.get("mobile_ar_dir") == "rtl",
        checks.get("mobile_ar_overflow") == 0,
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
