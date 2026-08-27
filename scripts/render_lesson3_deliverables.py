import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get(
    "LESSON3_OUTPUT_DIR",
    ROOT.parent / "outputs" / "lesson3-feishu-delivery",
))
FRAMES = OUT / "slide-images"
URL = os.environ.get(
    "QINGMI_WEB_PPT_URL",
    "http://127.0.0.1:4175/kuakua-ai/slides/lesson-03-mvp-experiment/index.html",
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
        local_origin = f"{urlsplit(URL).scheme}://{urlsplit(URL).netloc}"

        def mock_account(route):
            if route.request.method == "OPTIONS":
                route.fulfill(status=204, headers={
                    "access-control-allow-origin": local_origin,
                    "access-control-allow-credentials": "true",
                    "access-control-allow-headers": "content-type",
                    "access-control-allow-methods": "GET,OPTIONS",
                })
                return
            route.fulfill(status=200, headers={
                "content-type": "application/json; charset=utf-8",
                "access-control-allow-origin": local_origin,
                "access-control-allow-credentials": "true",
            }, body=json.dumps({
                "ok": True,
                "data": {
                    "user": {"id": "render-user", "name": "课件渲染", "role": "learner"},
                    "membership": {"tier": "free", "status": "free"},
                    "aiUsage": {"allowed": False, "mode": "blocked", "usedRuns": 0, "limit": 0, "remainingRuns": 0},
                },
            }, ensure_ascii=False))

        page.route("https://www.happykua.com/kuakua-ai-api/me", mock_account)
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
        if count != 28:
            raise RuntimeError(f"Expected 28 slides, got {count} at {page.url}")

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
            "title": "晴幂科技第3课｜把客户证据变成首版产品",
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
