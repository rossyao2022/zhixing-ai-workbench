import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get(
    "QINGMI_WEB_PPT_URL",
    "http://127.0.0.1:4175/kuakua-ai/slides/lesson-02-customer-evidence/index.html",
)
OUT = Path(os.environ.get(
    "QINGMI_WEB_PPT_SCREENSHOTS",
    ROOT.parent / "_web_work" / "lesson2_v3_online",
))
OUT.mkdir(parents=True, exist_ok=True)


def browser_launch_options():
    executable = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
    if not executable:
        system_chrome = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
        executable = str(system_chrome) if system_chrome.exists() else None
    return {"headless": True, **({"executable_path": executable} if executable else {})}


def install_api_mock(page, captured, fail_first=False):
    parsed_base = urlsplit(BASE)
    mock_origin = f"{parsed_base.scheme}://{parsed_base.netloc}"

    def handle(route):
        request = route.request
        if request.method == "OPTIONS":
            route.fulfill(status=204, headers={
                "access-control-allow-origin": mock_origin,
                "access-control-allow-credentials": "true",
                "access-control-allow-headers": "content-type",
                "access-control-allow-methods": "GET,POST,OPTIONS",
            })
            return
        headers = {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": mock_origin,
            "access-control-allow-credentials": "true",
        }
        if request.url.endswith("/me"):
            body = {
                "ok": True,
                "data": {
                    "user": {"id": "qa-user", "name": "课程验收员", "role": "learner"},
                    "membership": {"tier": "pro", "status": "active"},
                    "aiUsage": {"allowed": True, "mode": "metered", "usedRuns": 58, "limit": 100, "remainingRuns": 42},
                },
            }
            route.fulfill(status=200, headers=headers, body=json.dumps(body, ensure_ascii=False))
            return
        if request.url.endswith("/ai/coach"):
            payload = request.post_data_json
            captured.append(payload)
            if fail_first and len(captured) == 1:
                route.fulfill(
                    status=503,
                    headers=headers,
                    body=json.dumps({
                        "ok": False,
                        "error": {
                            "code": "AI_REQUEST_IN_PROGRESS",
                            "message": "请求状态尚未确认，请按同一请求编号重试。",
                        },
                    }, ensure_ascii=False),
                )
                return
            remaining = max(0, 42 - len(captured))
            body = {
                "ok": True,
                "data": {
                    "answer": {
                        "acknowledgement": f"已收到 {payload['lessonId']} 的真实练习材料，并先按课程标准肯定已完成的部分。",
                        "strengths": ["已经提供了具体材料", "练习目标与客户证据相关"],
                        "gaps": ["仍需补一条过去行为原话", "需要核对现有替代方案"],
                        "questions": ["上一次发生是什么时候？", "客户当时用什么方式解决？"],
                        "nextAction": "15 分钟内补齐一条带时间点的客户原话。",
                        "improvedDraft": "先不介绍方案，请带我回到最近一次真实发生的场景。",
                        "rubric": [
                            {"label": "过去行为", "status": "partial", "note": "已有场景，但还缺时间点。"},
                            {"label": "现有替代", "status": "missing", "note": "尚未说明客户当前如何凑合。"},
                        ],
                    },
                    "model": "deepseek-v4-flash",
                    "aiUsage": {"allowed": True, "mode": "metered", "usedRuns": 100 - remaining, "limit": 100, "remainingRuns": remaining},
                },
            }
            route.fulfill(status=200, headers=headers, body=json.dumps(body, ensure_ascii=False))
            return
        route.fulfill(status=404, headers=headers, body=json.dumps({"ok": False, "error": {"message": "mock route not found"}}))

    page.route("https://www.happykua.com/kuakua-ai-api/**", handle)


def verify_ambiguous_retry(page):
    captured = []
    install_api_mock(page, captured, fail_first=True)
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_function("window.qingmiDeck && window.qingmiDeepSeek")
    page.evaluate("window.qingmiDeck.go(17)")
    page.locator(".slide.is-active .ds-launch").click()
    page.wait_for_function("document.querySelector('#coachAccount').textContent.includes('PRO')")
    page.locator("#coachMaterial").fill(
        "客户上周用微信群和 Excel 汇总了三次会议，助理花了两个小时，但还没有确认谁负责采购。"
    )
    page.locator("#coachSubmit").click()
    page.wait_for_function("document.querySelector('#coachMessage').textContent.includes('同一请求编号')")
    page.wait_for_function("document.querySelector('#coachMaterial').disabled")
    assert page.locator("#coachMaterial").is_disabled()
    assert page.locator("#coachClear").is_disabled()
    assert page.locator("#coachPromptTabs button").first.is_disabled()
    assert not page.locator("#coachSubmit").is_disabled()
    first_request_id = captured[0]["requestId"]
    page.locator("#coachSubmit").click()
    page.wait_for_selector("#coachResult:not([hidden])")
    assert len(captured) == 2
    assert captured[1]["requestId"] == first_request_id
    assert not page.locator("#coachMaterial").is_disabled()
    assert not page.locator("#coachClear").is_disabled()
    return {"calls": len(captured), "same_request_id": True, "inputs_locked_while_unresolved": True}


def verify_deck(page, mobile=False):
    console_errors = []
    page_errors = []
    failed_responses = []
    captured = []
    install_api_mock(page, captured)
    page.on("console", lambda msg: console_errors.append({"text": msg.text, "location": msg.location}) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: page_errors.append(str(exc)))
    page.on("response", lambda response: failed_responses.append({"status": response.status, "url": response.url}) if response.status >= 400 else None)
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_function("window.qingmiDeck && window.qingmiDeepSeek")

    slide_count = page.locator(".deck > .slide").count()
    assert slide_count == 26, {"expected": 26, "actual": slide_count, "base": BASE, "url": page.url, "title": page.title()}
    assert page.locator(".deck > .practice-slide").count() == 5
    assert page.locator(".ds-launch").count() == 5
    assert page.evaluate("window.qingmiDeepSeek.practices.length") == 5
    assert page.locator(".deck > .slide.is-active").count() == 1
    assert page.locator("#counter").inner_text().strip() == "01 / 26"
    assert page.locator(".slide.is-active h1").inner_text().strip() == "找到客户证据"

    page.locator("#nextBtn").click()
    assert page.locator("#counter").inner_text().strip() == "02 / 26"
    page.keyboard.press("ArrowRight")
    assert page.locator("#counter").inner_text().strip() == "03 / 26"
    page.keyboard.press("n")
    assert "5:00—7:00" in page.locator("#notesPanel").inner_text()
    page.keyboard.press("n")
    page.locator("#menuBtn").click()
    assert page.locator("#slideMenu.is-open button").count() == 26
    page.keyboard.press("Escape")

    page.evaluate("window.qingmiDeck.go(0)")
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT / ("mobile-cover.png" if mobile else "desktop-cover.png")), full_page=True)
    page.evaluate("window.qingmiDeck.go(17)")
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT / ("mobile-mirror.png" if mobile else "desktop-mirror.png")), full_page=True)
    page.evaluate("window.qingmiDeck.go(24)")
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT / ("mobile-prompts.png" if mobile else "desktop-prompts.png")), full_page=True)

    if mobile:
        overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        assert overflow <= 2, overflow
        page.evaluate("window.qingmiDeck.go(20)")
        page.locator(".slide.is-active .ds-launch").click()
        page.wait_for_selector("#coachModal.is-open")
        page.wait_for_timeout(350)
        box = page.locator(".coach-shell").bounding_box()
        assert box and box["width"] >= 388 and box["height"] >= 840, box
        assert page.locator("#ed-launch").evaluate("el => getComputedStyle(el).display === 'none'")
        assert page.locator(".coach-actions").evaluate("el => el.scrollWidth <= el.clientWidth + 2")
        assert page.locator("#coachSubmit").evaluate("el => el.getBoundingClientRect().right <= window.innerWidth + 1")
        page.screenshot(path=str(OUT / "mobile-deepseek-drawer.png"), full_page=True)
        page.locator("[data-coach-close]").last.click()
    else:
        practice_cases = [
            (17, "lesson2-mirror-audit", "这是脱敏后的未签约方案：客户说团队每周要手工整理三次会议纪要，我已经给过完整演示和报价，但还没有约到决策人。"),
            (20, "lesson2-guide-audit", "1. 您觉得我们的方案怎么样？\n2. 您会考虑购买吗？\n3. 如果有自动提醒功能，您是不是会更喜欢？"),
            (21, "lesson2-evidence-card", "P03 08:20 客户：上周五我让助理把三个群的消息复制到 Excel，花了两个小时。P04 09:10 客户：目前还没有为这件事单独采购过软件。"),
            (22, "lesson2-difficult-customer", "你上一次遇到这个问题是什么时候，当时是怎么处理的？"),
            (23, "lesson2-clue-map", "Q01｜我们现在用 Excel 和微信群，每周五让助理汇总。Q02｜试过一个工具，但同事不会用，两周后就停了。Q03｜月底经常只能加班补数据。"),
        ]
        for order, (slide_index, lesson_id, sample) in enumerate(practice_cases, start=1):
            page.evaluate(f"window.qingmiDeck.go({slide_index})")
            page.locator(".slide.is-active .ds-launch").click()
            page.wait_for_selector("#coachModal.is-open")
            page.wait_for_function("document.querySelector('#coachAccount').textContent.includes('PRO')")
            assert page.locator("#coachPromptTabs button").count() == 3
            assert len(page.locator("#coachPromptText").inner_text()) > 180
            counter_before = page.locator("#counter").inner_text()
            page.keyboard.press("ArrowRight")
            assert page.locator("#counter").inner_text() == counter_before
            page.locator("#coachMaterial").fill(sample)
            page.locator("#coachSubmit").click()
            page.wait_for_selector("#coachResult:not([hidden])")
            assert "DeepSeek 课程反馈" in page.locator("#coachResult").inner_text()
            assert "上一次发生是什么时候" in page.locator("#coachResult").inner_text()
            assert captured[-1]["lessonId"] == lesson_id
            assert captured[-1]["mode"] == "ask"
            assert len(captured[-1]["criteria"]) >= 5
            page.screenshot(path=str(OUT / f"desktop-deepseek-{order}.png"), full_page=True)

            if lesson_id == "lesson2-difficult-customer":
                page.locator("#coachMaterial").fill("当时具体花了多长时间，你为什么没有换别的工具？")
                page.locator("#coachSubmit").click()
                page.wait_for_function("document.querySelectorAll('.roleplay-turn').length === 2")
                assert "截至当前的对话" in captured[-1]["material"]
                assert "第1轮" in captured[-1]["material"]

            page.locator("[data-coach-close]").last.click()
            assert page.locator("#coachModal").get_attribute("aria-hidden") == "true"
            assert page.locator("#coachMaterial").input_value() == ""

        assert len(captured) == 6, captured
        assert "未签约方案" not in page.evaluate("Object.values(localStorage).join(' ')")

    assert not console_errors, {"console": console_errors, "responses": failed_responses}
    assert not page_errors, page_errors
    assert not failed_responses, failed_responses
    return {"console_errors": len(console_errors), "page_errors": len(page_errors), "ai_calls": len(captured)}


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(**browser_launch_options())
    desktop = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    desktop_result = verify_deck(desktop)
    desktop.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    mobile_result = verify_deck(mobile, mobile=True)
    mobile.close()

    retry_page = browser.new_page(viewport={"width": 1280, "height": 800})
    retry_result = verify_ambiguous_retry(retry_page)
    retry_page.close()

    editor = browser.new_page(viewport={"width": 1280, "height": 800})
    install_api_mock(editor, [])
    editor.goto(BASE + ("&" if "?" in BASE else "?") + "edtest=1", wait_until="domcontentloaded")
    editor.wait_for_function("document.body.dataset.edtest && document.body.dataset.edtest.startsWith('PASS')", timeout=20000)
    editor_result = editor.get_attribute("body", "data-edtest")
    editor.evaluate("window.qingmiDeck.go(17)")
    editor.locator(".slide.is-active .ds-launch").click()
    editor.wait_for_selector("#coachModal.is-open")
    editor.locator("[data-coach-close]").last.click()
    editor.close()
    browser.close()

print(json.dumps({
    "status": "passed",
    "slides": 26,
    "deepseek_practices": 5,
    "desktop": desktop_result,
    "mobile": mobile_result,
    "ambiguous_retry": retry_result,
    "editor": editor_result,
}, ensure_ascii=False))
