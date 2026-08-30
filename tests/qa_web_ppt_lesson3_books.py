import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
DECK = os.environ.get(
    "QINGMI_WEB_PPT_URL",
    "http://127.0.0.1:4175/kuakua-ai/slides/lesson-03-mvp-experiment/index.html",
)
LAB = DECK.rsplit("/", 1)[0] + "/book-lab.html"
OUT = Path(os.environ.get(
    "QINGMI_BOOK_LAB_SCREENSHOTS",
    ROOT.parent / "_web_work" / "lesson3_book_lab",
))
OUT.mkdir(parents=True, exist_ok=True)


def browser_launch_options():
    executable = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
    if not executable:
        system_chrome = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
        executable = str(system_chrome) if system_chrome.exists() else None
    return {"headless": True, **({"executable_path": executable} if executable else {})}


def install_api_mock(page, captured, tier="pro"):
    parsed_base = urlsplit(DECK)
    mock_origin = f"{parsed_base.scheme}://{parsed_base.netloc}"

    def handle(route):
        request = route.request
        headers = {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": mock_origin,
            "access-control-allow-credentials": "true",
        }
        if request.method == "OPTIONS":
            route.fulfill(status=204, headers=headers)
            return
        if request.url.endswith("/me"):
            route.fulfill(status=200, headers=headers, body=json.dumps({
                "ok": True,
                "data": {
                    "user": {"id": "qa-books", "name": "书籍工具验收员", "role": "learner"},
                    "membership": {"tier": tier, "status": "active" if tier != "free" else "inactive"},
                    "aiUsage": {"allowed": tier != "free", "mode": "unlimited" if tier == "max" else "metered", "usedRuns": 4, "limit": 100, "remainingRuns": 96},
                },
            }, ensure_ascii=False))
            return
        if request.url.endswith("/ai/coach"):
            payload = request.post_data_json
            captured.append(payload)
            route.fulfill(status=200, headers=headers, body=json.dumps({
                "ok": True,
                "data": {
                    "answer": {
                        "acknowledgement": "已收到画布材料，并保留证据、判断和未知项的边界。",
                        "strengths": ["项目材料已结构化", "当前输出可继续流转"],
                        "gaps": ["还需要一条真实行为证据"],
                        "questions": ["哪一条来自客户过去行为？"],
                        "nextAction": "补一条带时间点的客户原话。",
                        "improvedDraft": "保留当前假设，并把缺失证据标为待验证。",
                        "rubric": [{"label": "证据边界", "status": "partial", "note": "结构清楚，仍需补真实行为。"}],
                    },
                    "model": "deepseek-v4-flash",
                    "aiUsage": {"allowed": True, "mode": "metered", "usedRuns": 5 + len(captured), "limit": 100, "remainingRuns": 95 - len(captured)},
                },
            }, ensure_ascii=False))
            return
        route.fulfill(status=404, headers=headers, body=json.dumps({"ok": False}))

    page.route("https://www.happykua.com/kuakua-ai-api/**", handle)


def attach_monitors(page):
    errors = {"console": [], "page": [], "responses": []}
    page.on("console", lambda msg: errors["console"].append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: errors["page"].append(str(exc)))
    page.on("response", lambda response: errors["responses"].append({"status": response.status, "url": response.url}) if response.status >= 400 else None)
    return errors


def assert_clean(errors):
    assert not errors["console"], errors
    assert not errors["page"], errors
    assert not errors["responses"], errors


def fill_field(page, path, value):
    page.locator(f'[data-field="{path}"]').fill(value)


def run_ai_review(page, tool, expected_lesson_id, captured):
    page.locator(f'[data-tool-ai="{tool}"]').click()
    page.wait_for_selector("#coachModal.is-open")
    page.wait_for_function("document.querySelector('#coachAccount').textContent.includes('PRO')")
    material = page.locator("#coachMaterial").input_value()
    assert len(material) > 80, {"tool": tool, "material": material}
    assert page.locator("#coachPromptTabs button").count() == 3
    page.locator("#coachSubmit").click()
    page.wait_for_selector("#coachResult:not([hidden])")
    assert captured[-1]["lessonId"] == expected_lesson_id
    assert captured[-1]["material"] == material
    assert len(captured[-1]["criteria"]) >= 6
    page.locator("[data-coach-close]").last.click()


def verify_book_lab(page, captured):
    errors = attach_monitors(page)
    page.goto(LAB, wait_until="networkidle")
    page.wait_for_function("window.qingmiBookLab && window.qingmiDeepSeek")
    page.wait_for_function("document.body.dataset.labAccess === 'member'")
    assert page.evaluate("window.qingmiBookLab.toolCount") == 4
    assert page.locator(".book-tab").count() == 4
    assert page.locator("[data-tool-ai]").count() == 4

    page.locator("#projectName").fill("夸夸作业教练")
    click_values = {
        "click.customer": "每周需要逐份点评作业的独立讲师",
        "click.problem": "上周仍花两小时逐份找证据缺口，学员看完反馈却很少修改",
        "click.advantage": "晴幂已有结构化课程规准与真实教练复核经验",
        "click.competitors": "飞书批注、微信群语音和讲师人工逐份修改",
        "click.approach": "先用结构化规准生成反馈，再由讲师抽检高风险建议",
        "click.differentiators": "十分钟内指出一处证据缺口，并直接引导完成一次修改",
        "click.evidence": "E01｜上周三，3 位独立讲师仍逐份批改，每次约 2 小时；材料已脱敏。",
    }
    for path, value in click_values.items():
        fill_field(page, path, value)
    assert page.evaluate("window.qingmiBookLab.readiness().click")
    assert "如果我们帮助" in page.locator("#foundingHypothesis").inner_text()
    assert "晴幂已有结构化课程规准" in page.locator("#foundingHypothesis").inner_text()
    run_ai_review(page, "click", "lesson3-book-click", captured)

    page.locator('[data-tool="story"]').click()
    fill_field(page, "story.trigger", "学员提交一份论证不完整的作业")
    fill_field(page, "story.firstValue", "学员根据一条可理解的反馈完成一次有效修改")
    fill_field(page, "story.ttfv", "10 分钟内")
    for step in ["提交待修改作业", "获得一条证据缺口反馈", "理解反馈理由", "完成并保存修改"]:
        page.locator("#newStoryStep").fill(step)
        page.locator("#stepComposer button[type=submit]").click()
    page.locator('.story-card:has-text("完成并保存修改") [data-step-action="value"]').click()
    assert page.evaluate("window.qingmiBookLab.readiness().story")
    assert page.locator("#releaseLane .story-card").count() == 4
    run_ai_review(page, "story", "lesson3-book-story-map", captured)

    page.locator('[data-tool="shape"]').click()
    fill_field(page, "shape.rabbits", "反馈可能给出不可靠判断；提交失败后用户可能重复扣次")
    fill_field(page, "shape.noGos", "不做排行榜、长期记忆、复杂课程管理和自动发布")
    assert page.locator("#scopeItems .scope-item").count() == 4
    assert page.evaluate("window.qingmiBookLab.readiness().shape")
    run_ai_review(page, "shape", "lesson3-book-shapeup", captured)

    page.locator('[data-tool="test"]').click()
    page.locator("#newAssumption").fill("讲师愿意为节省批改时间持续使用")
    page.locator("#newAssumptionImpact").select_option("1")
    page.locator("#newAssumptionEvidence").select_option("5")
    page.locator("#assumptionComposer button[type=submit]").click()
    page.locator("#newAssumption").fill("目标学员会在 24 小时内根据反馈完成修改")
    page.locator("#newAssumptionImpact").select_option("5")
    page.locator("#newAssumptionEvidence").select_option("0")
    page.locator("#assumptionComposer button[type=submit]").click()
    assert "自动优先" in page.locator("#riskLock").inner_text()
    assert "24 小时" in page.locator("#riskLock").inner_text()
    assert "系统优先" in page.locator('.assumption-item:has-text("24 小时") small').inner_text()
    page.locator('.assumption-item:has-text("讲师愿意") [data-lock-assumption]').click()
    assert "手动锁定" in page.locator("#riskLock").inner_text()
    assert "讲师愿意" in page.locator("#riskLock").inner_text()
    page.locator("#newAssumption").fill("模型反馈质量在人工抽检后能够稳定达到交付标准")
    page.locator("#newAssumptionImpact").select_option("5")
    page.locator("#newAssumptionEvidence").select_option("1")
    page.locator("#assumptionComposer button[type=submit]").click()
    assert "讲师愿意" in page.locator("#riskLock").inner_text()
    page.locator('.assumption-item:has-text("讲师愿意") [data-remove-assumption]').click()
    assert "自动优先" in page.locator("#riskLock").inner_text()
    assert "24 小时" in page.locator("#riskLock").inner_text()
    page.locator('.assumption-item:has-text("24 小时") [data-lock-assumption]').click()
    assert "手动锁定" in page.locator("#riskLock").inner_text()
    test_values = {
        "test.experiment": "邀请 20 位匹配学员提交一份真实作业，提供一次 AI 加人工抽检反馈",
        "test.metric": "24 小时内完成并保存有效修改的学员比例",
        "test.sample": "20 位正在真实课程中交作业的学员",
        "test.pass": "至少 12 人完成有效修改",
        "test.watch": "6—11 人完成，补访谈并调整反馈表达",
        "test.fail": "5 人及以下完成，停止扩建并重做价值假设",
        "test.guardrail": "先脱敏、明确 AI 边界、关键反馈人工抽检、失败不重复扣次",
    }
    for path, value in test_values.items():
        fill_field(page, path, value)
    assert page.evaluate("Object.values(window.qingmiBookLab.readiness()).every(Boolean)")
    assert page.locator("#progressNumber").inner_text() == "100%"
    run_ai_review(page, "test", "lesson3-book-experiment", captured)

    with page.expect_download() as download_info:
        page.locator("#exportAll").click()
    download = download_info.value
    assert download.suggested_filename.endswith("_第三课四本书任务书.md")
    exported = Path(download.path()).read_text(encoding="utf-8")
    for heading in ["《Click》创始假设罗盘", "《User Story Mapping》首版切片地图", "《Shape Up》范围熔炉", "《Testing Business Ideas》7 天证据实验室"]:
        assert heading in exported

    page.screenshot(path=str(OUT / "desktop-book-lab-complete.png"), full_page=True)
    page.reload(wait_until="networkidle")
    page.wait_for_function("window.qingmiBookLab")
    page.wait_for_function("document.body.dataset.labAccess === 'member'")
    assert page.locator("#projectName").input_value() == "夸夸作业教练"
    assert page.evaluate("Object.values(window.qingmiBookLab.readiness()).every(Boolean)")
    assert_clean(errors)
    return {"progress": 100, "ai_calls": len(captured), "export": download.suggested_filename}


def verify_mobile(page):
    errors = attach_monitors(page)
    page.goto(LAB, wait_until="networkidle")
    page.wait_for_function("window.qingmiBookLab && window.qingmiDeepSeek")
    page.wait_for_function("document.body.dataset.labAccess === 'member'")
    assert page.evaluate("document.documentElement.scrollWidth - window.innerWidth") <= 2
    page.locator('[data-tool="story"]').click()
    assert page.locator('[data-tool-panel="story"]').is_visible()
    page.locator('[data-tool="test"]').click()
    page.locator('[data-tool-ai="test"]').click()
    page.wait_for_selector("#coachModal.is-open")
    shell = page.locator(".coach-shell").bounding_box()
    assert shell and shell["width"] <= 390.1 and shell["height"] <= 844.1, shell
    assert page.locator(".coach-actions").evaluate("el => el.scrollWidth <= el.clientWidth + 2")
    page.screenshot(path=str(OUT / "mobile-book-lab-ai.png"), full_page=True)
    assert_clean(errors)


def verify_free_gate(page):
    errors = attach_monitors(page)
    page.goto(LAB, wait_until="networkidle")
    page.wait_for_function("window.qingmiBookLab && document.body.dataset.labAccess === 'free'")
    assert page.locator(".book-tab").count() == 4
    assert not page.locator('[data-tool="story"]').is_disabled()
    assert page.locator("#projectName").is_disabled()
    assert page.locator('[data-field="click.customer"]').is_disabled()
    assert page.locator("#exportAll").is_disabled()
    assert "免费用户" in page.locator("#labAccessTitle").inner_text()
    assert page.locator("#labAccessAction").is_visible()
    assert_clean(errors)


def verify_60_minute_deck(page):
    errors = attach_monitors(page)
    page.goto(DECK + ("&" if "?" in DECK else "?") + "mode=60", wait_until="networkidle")
    page.wait_for_function("window.qingmiDeck && window.qingmi60Notes")
    assert page.evaluate("window.qingmiDeck.mode") == "60"
    assert page.evaluate("window.qingmiDeck.count") == 13
    assert page.locator("#counter").inner_text().strip() == "01 / 13"
    page.locator("#menuBtn").click()
    assert page.locator("#slideMenu.is-open button").count() == 13
    menu_text = page.locator("#slideMenu.is-open button").all_inner_texts()
    assert "定义首个价值时刻" in menu_text[6]
    assert "先测最高风险" in menu_text[8]
    page.keyboard.press("Escape")
    page.evaluate("window.qingmiDeck.go(3)")
    page.locator("#notesBtn").click()
    notes = page.locator("#notesPanel").inner_text()
    assert "讲师" in notes and "工作台" in notes
    page.screenshot(path=str(OUT / "desktop-60-minute-mode.png"), full_page=True)
    assert_clean(errors)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(**browser_launch_options())
    context = browser.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    desktop = context.new_page()
    captured = []
    install_api_mock(desktop, captured)
    desktop_result = verify_book_lab(desktop, captured)
    assert [call["lessonId"] for call in captured] == [
        "lesson3-book-click",
        "lesson3-book-story-map",
        "lesson3-book-shapeup",
        "lesson3-book-experiment",
    ]

    mobile = context.new_page()
    mobile.set_viewport_size({"width": 390, "height": 844})
    install_api_mock(mobile, [])
    verify_mobile(mobile)

    free_context = browser.new_context(viewport={"width": 1280, "height": 800})
    free_page = free_context.new_page()
    install_api_mock(free_page, [], tier="free")
    verify_free_gate(free_page)
    free_context.close()

    deck = context.new_page()
    install_api_mock(deck, [])
    verify_60_minute_deck(deck)
    context.close()
    browser.close()

print(json.dumps({
    "status": "passed",
    "book_tools": 4,
    "deepseek_practices": 4,
    "core_slides": 13,
    "desktop": desktop_result,
    "mobile": "passed",
}, ensure_ascii=False))
