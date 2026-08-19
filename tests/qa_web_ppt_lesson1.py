import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE = os.environ.get("QINGMI_WEB_PPT_URL", "http://127.0.0.1:4175/kuakua-ai/slides/lesson-01-business-model-canvas/index.html")
OUT = Path(os.environ.get("QINGMI_WEB_PPT_SCREENSHOTS", r"E:\晴幂科技\课程资料\_web_work\lesson1"))
OUT.mkdir(parents=True, exist_ok=True)


def verify_deck(page, mobile=False):
    console_errors = []
    page_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: page_errors.append(str(exc)))
    page.goto(BASE, wait_until="networkidle")
    assert page.locator(".deck > .slide").count() == 34
    assert page.locator(".deck > .practice-slide").count() == 4
    assert page.locator(".deck > .slide.is-active").count() == 1
    assert page.locator("#counter").inner_text().strip() == "01 / 34"
    assert page.locator(".slide.is-active h1").inner_text().strip() == "选对战场"

    page.locator("#nextBtn").click()
    assert page.locator("#counter").inner_text().strip() == "02 / 34"
    page.keyboard.press("ArrowRight")
    assert page.locator("#counter").inner_text().strip() == "03 / 34"
    page.keyboard.press("n")
    assert "2:00—3:00" in page.locator("#notesPanel").inner_text()
    page.keyboard.press("n")
    page.locator("#menuBtn").click()
    assert page.locator("#slideMenu.is-open button").count() == 34
    page.keyboard.press("Escape")

    page.evaluate("window.qingmiDeck.go(0)")
    page.wait_for_timeout(450)
    page.screenshot(path=str(OUT / ("mobile-cover.png" if mobile else "desktop-cover.png")), full_page=True)
    page.evaluate("window.qingmiDeck.go(11)")
    page.wait_for_timeout(450)
    page.screenshot(path=str(OUT / ("mobile-practice.png" if mobile else "desktop-practice.png")), full_page=True)
    page.evaluate("window.qingmiDeck.go(20)")
    page.wait_for_timeout(450)
    page.screenshot(path=str(OUT / ("mobile-canvas.png" if mobile else "desktop-canvas.png")), full_page=True)

    if not mobile:
        for order, slide_index in enumerate((11, 14, 21, 25), start=1):
            page.evaluate(f"window.qingmiDeck.go({slide_index})")
            page.wait_for_timeout(450)
            page.screenshot(path=str(OUT / f"desktop-practice-{order}.png"), full_page=True)

    if mobile:
        overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        assert overflow <= 2, overflow
        assert page.locator(".slide.is-active .canvas-wrap").evaluate("el => el.scrollWidth > el.clientWidth")

    assert not console_errors, console_errors
    assert not page_errors, page_errors
    return {"console_errors": len(console_errors), "page_errors": len(page_errors)}


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    desktop = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    desktop_result = verify_deck(desktop)
    desktop.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    mobile_result = verify_deck(mobile, mobile=True)
    mobile.close()

    editor = browser.new_page(viewport={"width": 1280, "height": 800})
    editor.goto(BASE + "?edtest=1", wait_until="networkidle")
    editor.wait_for_function("document.body.dataset.edtest && document.body.dataset.edtest.startsWith('PASS')", timeout=20000)
    editor_result = editor.get_attribute("body", "data-edtest")
    editor.close()
    browser.close()

print(json.dumps({
    "status": "passed",
    "slides": 34,
    "desktop": desktop_result,
    "mobile": mobile_result,
    "editor": editor_result,
}, ensure_ascii=False))
