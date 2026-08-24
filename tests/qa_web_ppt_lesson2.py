import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get(
    "QINGMI_WEB_PPT_URL",
    "http://127.0.0.1:4175/kuakua-ai/slides/lesson-02-customer-evidence/index.html",
)
OUT = Path(os.environ.get(
    "QINGMI_WEB_PPT_SCREENSHOTS",
    ROOT.parent / "_web_work" / "lesson2",
))
OUT.mkdir(parents=True, exist_ok=True)


def browser_launch_options():
    executable = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
    if not executable:
        system_chrome = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
        executable = str(system_chrome) if system_chrome.exists() else None
    return {"headless": True, **({"executable_path": executable} if executable else {})}


def verify_deck(page, mobile=False):
    console_errors = []
    page_errors = []
    failed_responses = []
    page.on("console", lambda msg: console_errors.append({"text": msg.text, "location": msg.location}) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: page_errors.append(str(exc)))
    page.on("response", lambda response: failed_responses.append({"status": response.status, "url": response.url}) if response.status >= 400 else None)
    page.goto(BASE, wait_until="networkidle")
    slide_count = page.locator(".deck > .slide").count()
    assert slide_count == 35, {"expected": 35, "actual": slide_count, "base": BASE, "url": page.url, "title": page.title()}
    assert page.locator(".deck > .practice-slide").count() == 4
    assert page.locator(".deck > .slide.is-active").count() == 1
    assert page.locator("#counter").inner_text().strip() == "01 / 35"
    assert page.locator(".slide.is-active h1").inner_text().strip() == "找到客户证据"

    page.locator("#nextBtn").click()
    assert page.locator("#counter").inner_text().strip() == "02 / 35"
    page.keyboard.press("ArrowRight")
    assert page.locator("#counter").inner_text().strip() == "03 / 35"
    page.keyboard.press("n")
    assert "2:00—3:00" in page.locator("#notesPanel").inner_text()
    page.keyboard.press("n")
    page.locator("#menuBtn").click()
    assert page.locator("#slideMenu.is-open button").count() == 35
    page.keyboard.press("Escape")

    page.evaluate("window.qingmiDeck.go(0)")
    page.wait_for_timeout(350)
    page.screenshot(path=str(OUT / ("mobile-cover.png" if mobile else "desktop-cover.png")), full_page=True)
    page.evaluate("window.qingmiDeck.go(24)")
    page.wait_for_timeout(350)
    page.screenshot(path=str(OUT / ("mobile-interview.png" if mobile else "desktop-interview.png")), full_page=True)
    page.evaluate("window.qingmiDeck.go(26)")
    page.wait_for_timeout(350)
    page.screenshot(path=str(OUT / ("mobile-matrix.png" if mobile else "desktop-matrix.png")), full_page=True)

    if not mobile:
        for order, slide_index in enumerate((10, 15, 24, 30), start=1):
            page.evaluate(f"window.qingmiDeck.go({slide_index})")
            page.wait_for_timeout(350)
            page.screenshot(path=str(OUT / f"desktop-practice-{order}.png"), full_page=True)

    if mobile:
        overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        assert overflow <= 2, overflow
        page.evaluate("window.qingmiDeck.go(26)")
        assert page.locator(".slide.is-active .matrix-wrap").evaluate("el => el.scrollWidth > el.clientWidth")

    assert not console_errors, {"console": console_errors, "responses": failed_responses}
    assert not page_errors, page_errors
    return {"console_errors": len(console_errors), "page_errors": len(page_errors), "failed_responses": len(failed_responses)}


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(**browser_launch_options())
    desktop = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    desktop_result = verify_deck(desktop)
    desktop.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    mobile_result = verify_deck(mobile, mobile=True)
    mobile.close()

    editor = browser.new_page(viewport={"width": 1280, "height": 800})
    # The embedded MP4 keeps a range request open on some static servers, so
    # DOM readiness is the deterministic signal for the editor self-test.
    editor.goto(BASE + "?edtest=1", wait_until="domcontentloaded")
    editor.wait_for_function("document.body.dataset.edtest && document.body.dataset.edtest.startsWith('PASS')", timeout=20000)
    editor_result = editor.get_attribute("body", "data-edtest")
    editor.close()
    browser.close()

print(json.dumps({
    "status": "passed",
    "slides": 35,
    "desktop": desktop_result,
    "mobile": mobile_result,
    "editor": editor_result,
}, ensure_ascii=False))
