import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get(
    "LESSON2_OUTPUT_DIR",
    ROOT.parent / "outputs" / "lesson2-feishu-delivery",
))
FRAMES = OUT / "slide-images"
URL = os.environ.get(
    "QINGMI_WEB_PPT_URL",
    "http://127.0.0.1:43176/kuakua-ai/slides/lesson-02-customer-evidence/index.html",
)
CHROME = os.environ.get(
    "PLAYWRIGHT_CHROMIUM_EXECUTABLE",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    FRAMES.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        launch_options = {"headless": True}
        if Path(CHROME).exists():
            launch_options["executable_path"] = CHROME
        browser = playwright.chromium.launch(**launch_options)
        page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        console_errors = []
        page_errors = []
        failed_responses = []
        page.on("console", lambda msg: console_errors.append({"text": msg.text, "location": msg.location}) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))
        page.on("response", lambda response: failed_responses.append({"status": response.status, "url": response.url}) if response.status >= 400 else None)

        page.goto(URL, wait_until="networkidle")
        page.evaluate("document.fonts.ready")
        page.add_style_tag(content="""
            .slide { transition: none !important; }
            .controls, .notes-panel, .slide-menu,
            #ed-launch, #ed-bar, #ed-film, #ed-toast { display: none !important; }
        """)

        slides = page.locator(".deck > .slide")
        count = slides.count()
        if count != 35:
            raise RuntimeError(f"Expected 35 slides, got {count} at {page.url}")

        entries = []
        for index in range(count):
            page.evaluate(f"window.qingmiDeck.go({index})")
            page.wait_for_timeout(80)
            active = page.locator(".deck > .slide.is-active")
            image_path = FRAMES / f"slide-{index + 1:02d}.png"
            page.locator(".deck").screenshot(path=str(image_path))
            meta = active.evaluate("""el => {
                const body = el.querySelector('.slide-body');
                return {
                    title: el.dataset.title || '',
                    section: el.dataset.section || '',
                    notes: el.querySelector('.notes')?.textContent?.trim() || '',
                    overflowX: Math.max(0, (body?.scrollWidth || 0) - (body?.clientWidth || 0)),
                    overflowY: Math.max(0, (body?.scrollHeight || 0) - (body?.clientHeight || 0))
                };
            }""")
            entries.append({"number": index + 1, "image": str(image_path), **meta})

        manifest = {
            "title": "晴幂科技第2课｜找到客户证据",
            "sourceUrl": URL,
            "slideCount": count,
            "viewport": {"width": 1920, "height": 1080},
            "consoleErrors": console_errors,
            "pageErrors": page_errors,
            "failedResponses": failed_responses,
            "slides": entries,
        }
        (OUT / "slide-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        browser.close()

    if console_errors or page_errors or failed_responses:
        raise RuntimeError(json.dumps({
            "consoleErrors": console_errors,
            "pageErrors": page_errors,
            "failedResponses": failed_responses,
        }, ensure_ascii=False))
    overflow = [item for item in entries if item["overflowX"] > 2 or item["overflowY"] > 2]
    if overflow:
        raise RuntimeError(json.dumps({"overflowSlides": overflow}, ensure_ascii=False))

    print(json.dumps({"status": "passed", "slides": count, "output": str(OUT)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
