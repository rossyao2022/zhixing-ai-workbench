import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("KUAKUA_BASE_URL", "http://127.0.0.1:4173/kuakua-ai/")
ARTIFACTS = Path(__file__).parent / "artifacts"
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def attach_error_capture(page, errors):
    page.on("console", lambda message: errors.append(f"console:{message.type}:{message.text} @ {message.location.get('url', '')}") if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"pageerror:{error}"))


def open_clean(page):
    page.goto(BASE_URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")


def main():
    errors = []
    checks = {}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        desktop = browser.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
        page = desktop.new_page()
        attach_error_capture(page, errors)
        open_clean(page)

        checks["title"] = page.title()
        checks["login_heading"] = page.get_by_role("heading", name="欢迎回来").is_visible()
        page.screenshot(path=str(ARTIFACTS / "01-login-desktop.png"), full_page=True)

        corrupt_context = browser.new_context(viewport={"width": 1200, "height": 800})
        corrupt_page = corrupt_context.new_page()
        attach_error_capture(corrupt_page, errors)
        corrupt_page.goto(BASE_URL, wait_until="networkidle")
        corrupt_page.evaluate("""
            localStorage.setItem('kuakua-ai.accounts.v1', JSON.stringify('wrong-shape'));
            localStorage.setItem('kuakua-ai.progress.v1', JSON.stringify({broken: true}));
            localStorage.setItem('kuakua-ai.session.v1', 'ghost-user');
        """)
        corrupt_page.reload(wait_until="networkidle")
        checks["corrupt_storage_recovers"] = corrupt_page.get_by_role("heading", name="欢迎回来").is_visible()
        corrupt_context.close()

        restricted_context = browser.new_context(viewport={"width": 1200, "height": 800})
        restricted_context.add_init_script("""
            for (const method of ['getItem', 'setItem', 'removeItem']) {
              Object.defineProperty(Storage.prototype, method, {
                configurable: true,
                value() { throw new DOMException('blocked', 'SecurityError'); }
              });
            }
        """)
        restricted_page = restricted_context.new_page()
        attach_error_capture(restricted_page, errors)
        restricted_page.goto(BASE_URL, wait_until="networkidle")
        checks["restricted_storage_fallback"] = restricted_page.get_by_role("heading", name="欢迎回来").is_visible()
        restricted_context.close()

        page.get_by_role("button", name="学员体验").click()
        page.get_by_role("dialog").wait_for(state="visible")
        checks["daily_praise"] = page.get_by_text("今日份夸赞").is_visible()
        page.screenshot(path=str(ARTIFACTS / "02-daily-praise.png"), full_page=True)
        page.get_by_role("button", name="收下夸赞，开始今天").click()
        page.get_by_role("heading", name="把一个想法，再推进一小步。", exact=False).wait_for(state="visible")
        page.screenshot(path=str(ARTIFACTS / "03-dashboard-desktop.png"), full_page=True)

        page.get_by_role("button", name="课程", exact=True).click()
        page.locator(".course-page .page-intro h1").wait_for(state="visible")
        checks["lesson_count"] = page.locator(".lesson-row").count()
        checks["stage_count"] = page.locator(".stage-card").count()
        checks["method_framework_count"] = page.locator(".method-card").count()
        checks["method_primary_sources"] = page.locator(".method-card-footer a").count()
        checks["legacy_concept_hidden"] = "八仙" not in page.locator("body").inner_text()
        page.screenshot(path=str(ARTIFACTS / "04-course-map.png"), full_page=True)

        page.locator(".lesson-row").first.click()
        page.get_by_role("dialog").wait_for(state="visible")
        checks["lesson_tabs"] = page.locator(".lesson-tabbar button").count()
        checks["deep_lecture"] = page.get_by_role("heading", name="一个责任主体，四层交付网络").is_visible()
        page.get_by_role("tab", name="核心书架").click()
        checks["core_books"] = page.locator(".book-deep-card").count()
        checks["book_has_sections"] = page.get_by_text("主要内容", exact=True).first.is_visible() and page.get_by_text("三条核心观点", exact=True).first.is_visible()
        page.get_by_role("tab", name="AI 陪练").click()
        page.locator(".ai-workspace textarea").fill("目标客户是独立顾问；最近一次用 3 天整理客户项目，没有可复用模板，现有证据是工作记录。")
        page.get_by_role("button", name="生成陪练任务").click()
        checks["ai_prompt_generated"] = page.locator(".ai-output pre").is_visible()
        page.get_by_role("tab", name="视频课").click()
        checks["video_cards"] = page.locator(".video-card").count()
        checks["original_video"] = page.locator("video source[src*='kuakua-01']").count() == 1
        page.get_by_role("tab", name="资料来源").click()
        checks["lesson_sources"] = page.locator(".source-library a").count() >= 4
        checks["dialog_focus_trapped"] = page.evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)")
        evidence_text = page.get_by_test_id("evidence-text")
        evidence_url = page.get_by_test_id("evidence-url")
        submit_evidence = page.get_by_test_id("submit-evidence")
        checks["evidence_required"] = submit_evidence.is_disabled()
        evidence_text.fill("不足十九个字的作品说明")
        checks["short_evidence_blocked"] = submit_evidence.is_disabled()
        evidence_text.fill("我完成了真实客户访谈稿，依据三次访谈整理共同问题，下一步用五位用户继续验证。")
        evidence_url.fill("not-a-link")
        checks["invalid_evidence_url_blocked"] = submit_evidence.is_disabled()
        evidence_url.fill("https://example.com/evidence")
        page.get_by_test_id("save-evidence-draft").click()
        checks["draft_saved"] = page.locator(".evidence-save-status").get_by_text("作品草稿已保存在本浏览器").is_visible()
        page.locator(".dialog-close").click()
        page.locator(".lesson-row").first.click()
        page.get_by_role("dialog").wait_for(state="visible")
        checks["draft_persists"] = (
            page.get_by_test_id("evidence-text").input_value().startswith("我完成了真实客户访谈稿")
            and page.get_by_test_id("evidence-url").input_value() == "https://example.com/evidence"
        )
        checks["draft_not_progress"] = page.evaluate("""() => {
            const all = JSON.parse(localStorage.getItem('kuakua-ai.progress.v1'));
            const item = all.find(value => value.userId === 'demo-learner');
            return item.schemaVersion === 2 && !item.evidenceByLessonId['identity-01'].submittedAt;
        }""")
        page.get_by_test_id("submit-evidence").click()
        page.get_by_text("知识吸收成功").wait_for(state="visible")
        checks["reward_40"] = page.get_by_text("小晴获得 +40 知识值").is_visible()
        checks["evidence_submitted"] = page.evaluate("""() => {
            const all = JSON.parse(localStorage.getItem('kuakua-ai.progress.v1'));
            const item = all.find(value => value.userId === 'demo-learner');
            return Boolean(item.evidenceByLessonId['identity-01'].submittedAt)
                && item.completedLessonIds.filter(id => id === 'identity-01').length === 1;
        }""")
        page.screenshot(path=str(ARTIFACTS / "05-growth-reward.png"), full_page=True)
        page.get_by_role("button", name="继续成长").click()
        checks["xp_updated"] = "40" in page.locator(".xp-pill").inner_text()

        page.get_by_role("button", name="小晴", exact=True).click()
        page.get_by_role("heading", name="这是小晴，也是你的成长镜子").wait_for(state="visible")
        checks["buddy_room"] = page.locator(".buddy-showcase img").is_visible()
        page.screenshot(path=str(ARTIFACTS / "06-buddy-room.png"), full_page=True)
        page.evaluate("""
            const all = JSON.parse(localStorage.getItem('kuakua-ai.progress.v1'));
            const item = all.find(value => value.userId === 'demo-learner');
            item.xp = 1920;
            localStorage.setItem('kuakua-ai.progress.v1', JSON.stringify(all));
        """)
        page.reload(wait_until="networkidle")
        page.get_by_role("button", name="小晴", exact=True).click()
        checks["final_level_reachable"] = page.get_by_text("Lv.7 · 链主伙伴").is_visible()
        desktop.close()

        admin_context = browser.new_context(viewport={"width": 1440, "height": 1000})
        admin_page = admin_context.new_page()
        attach_error_capture(admin_page, errors)
        open_clean(admin_page)
        admin_page.get_by_role("button", name="管理员体验").click()
        admin_page.get_by_role("dialog").wait_for(state="visible")
        admin_page.get_by_role("button", name="收下夸赞，开始今天").click()
        admin_page.get_by_role("button", name="角色管理", exact=True).click()
        admin_page.get_by_role("heading", name="用户与角色管理").wait_for(state="visible")
        checks["admin_rows"] = admin_page.locator(".account-row:not(.account-header)").count()
        checks["role_selects"] = admin_page.locator(".select-wrap select").count()
        admin_page.screenshot(path=str(ARTIFACTS / "07-role-admin.png"), full_page=True)
        admin_context.close()

        legacy_context = browser.new_context(viewport={"width": 1280, "height": 900})
        legacy_page = legacy_context.new_page()
        attach_error_capture(legacy_page, errors)
        open_clean(legacy_page)
        legacy_page.evaluate("""
            const today = new Date().toLocaleDateString('en-CA');
            localStorage.setItem('kuakua-ai.progress.v1', JSON.stringify([{
              userId: 'demo-learner', xp: 40, completedLessonIds: ['identity-01'],
              streak: 1, lastVisitDate: today, lastPraiseDate: today,
              createdAt: new Date().toISOString()
            }]));
            localStorage.setItem('kuakua-ai.session.v1', 'demo-learner');
        """)
        legacy_page.reload(wait_until="networkidle")
        legacy_page.get_by_role("button", name="课程", exact=True).click()
        legacy_page.locator(".lesson-row").first.click()
        checks["legacy_record_needs_evidence"] = legacy_page.get_by_text("历史 XP 记录但尚无作品证据", exact=False).is_visible()
        legacy_page.get_by_test_id("evidence-text").fill("这是旧版完成记录补交的真实作品证据，包含原始依据和下一步明确验收标准。")
        legacy_page.get_by_test_id("submit-evidence").click()
        legacy_page.locator(".toast").get_by_text("证据已提交，可继续完善").wait_for(state="visible")
        checks["legacy_backfill_no_duplicate_xp"] = legacy_page.evaluate("""() => {
            const all = JSON.parse(localStorage.getItem('kuakua-ai.progress.v1'));
            const item = all.find(value => value.userId === 'demo-learner');
            return item.xp === 40
                && item.completedLessonIds.filter(id => id === 'identity-01').length === 1
                && Boolean(item.evidenceByLessonId['identity-01'].submittedAt);
        }""")
        legacy_context.close()

        mobile = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        mobile_page = mobile.new_page()
        attach_error_capture(mobile_page, errors)
        open_clean(mobile_page)
        mobile_page.screenshot(path=str(ARTIFACTS / "08-login-mobile.png"), full_page=True)
        mobile_page.get_by_role("button", name="学员体验").click()
        mobile_page.get_by_role("dialog").wait_for(state="visible")
        mobile_page.get_by_role("button", name="收下夸赞，开始今天").click()
        mobile_page.locator(".bottom-nav").wait_for(state="visible")
        mobile_page.wait_for_timeout(100)
        checks["mobile_post_login_scroll_y"] = mobile_page.evaluate("window.scrollY")
        mobile_page.screenshot(path=str(ARTIFACTS / "09-dashboard-mobile.png"), full_page=True)
        overflow = mobile_page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        checks["mobile_horizontal_overflow_px"] = overflow
        mobile_page.locator(".bottom-nav").get_by_role("button", name="课程").click()
        mobile_page.locator(".course-page .page-intro h1").wait_for(state="visible")
        checks["mobile_lesson_count"] = mobile_page.locator(".lesson-row").count()
        checks["mobile_start_shortcut"] = mobile_page.locator(".course-start-shortcut").is_visible()
        mobile_page.screenshot(path=str(ARTIFACTS / "10-course-mobile.png"), full_page=True)
        mobile.close()

        admin_mobile = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        admin_mobile_page = admin_mobile.new_page()
        attach_error_capture(admin_mobile_page, errors)
        open_clean(admin_mobile_page)
        admin_mobile_page.get_by_role("button", name="管理员体验").click()
        admin_mobile_page.get_by_role("dialog").wait_for(state="visible")
        admin_mobile_page.get_by_role("button", name="收下夸赞，开始今天").click()
        checks["mobile_admin_entry"] = admin_mobile_page.locator(".bottom-nav").get_by_role("button", name="管理").is_visible()
        admin_mobile_page.locator(".bottom-nav").get_by_role("button", name="管理").click()
        checks["mobile_admin_page"] = admin_mobile_page.get_by_role("heading", name="用户与角色管理").is_visible()
        admin_mobile.close()

        browser.close()

    required = [
        checks.get("login_heading"),
        checks.get("corrupt_storage_recovers"),
        checks.get("restricted_storage_fallback"),
        checks.get("daily_praise"),
        checks.get("lesson_count") == 32,
        checks.get("stage_count") == 8,
        checks.get("method_framework_count") == 4,
        checks.get("method_primary_sources", 0) >= 8,
        checks.get("legacy_concept_hidden"),
        checks.get("lesson_tabs") == 6,
        checks.get("deep_lecture"),
        checks.get("core_books") == 3,
        checks.get("book_has_sections"),
        checks.get("ai_prompt_generated"),
        checks.get("video_cards", 0) >= 3,
        checks.get("original_video"),
        checks.get("lesson_sources"),
        checks.get("dialog_focus_trapped"),
        checks.get("evidence_required"),
        checks.get("short_evidence_blocked"),
        checks.get("invalid_evidence_url_blocked"),
        checks.get("draft_saved"),
        checks.get("draft_persists"),
        checks.get("draft_not_progress"),
        checks.get("evidence_submitted"),
        checks.get("reward_40"),
        checks.get("xp_updated"),
        checks.get("buddy_room"),
        checks.get("final_level_reachable"),
        checks.get("admin_rows") == 3,
        checks.get("role_selects") == 3,
        checks.get("legacy_record_needs_evidence"),
        checks.get("legacy_backfill_no_duplicate_xp"),
        checks.get("mobile_post_login_scroll_y") == 0,
        checks.get("mobile_horizontal_overflow_px") == 0,
        checks.get("mobile_lesson_count") == 32,
        checks.get("mobile_start_shortcut"),
        checks.get("mobile_admin_entry"),
        checks.get("mobile_admin_page"),
    ]
    result = {
        "status": "passed" if not errors and all(required) else "failed",
        "checks": checks,
        "console_errors": errors,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result["status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
