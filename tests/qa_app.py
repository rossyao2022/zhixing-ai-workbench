import json
import os
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


BASE_URL = os.environ.get("KUAKUA_BASE_URL", "http://127.0.0.1:4173/kuakua-ai/")
ARTIFACTS = Path(__file__).parent / "artifacts"
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def attach_error_capture(page: Page, errors: list[str]) -> None:
    page.on(
        "console",
        lambda message: errors.append(
            f"console:{message.type}:{message.text} @ {message.location.get('url', '')}"
        )
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: errors.append(f"pageerror:{error}"))


def open_clean(page: Page) -> None:
    page.goto(BASE_URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")
    page.evaluate("document.fonts.ready")


def enter_demo(page: Page, name: str = "学员体验") -> None:
    page.get_by_role("button", name=name, exact=False).click()
    page.get_by_test_id("progress-praise").wait_for(state="visible")


def open_course(page: Page, *, mobile: bool = False) -> None:
    navigation = page.locator(".bottom-nav") if mobile else page.locator(".desktop-nav")
    navigation.get_by_role("button", name="课程", exact=True).click()
    page.locator(".course-vnext").wait_for(state="visible")


def open_first_lesson(page: Page) -> None:
    page.locator(".course-next-card").click()
    page.get_by_test_id("learning-route").wait_for(state="visible")


def go_to_phase(page: Page, phase: str) -> None:
    page.get_by_test_id(f"learning-phase-{phase}").click()


def font_size(page: Page, selector: str) -> float:
    return page.locator(selector).first.evaluate(
        "element => Number.parseFloat(getComputedStyle(element).fontSize)"
    )


def main() -> None:
    errors: list[str] = []
    checks: dict = {}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        desktop = browser.new_context(
            viewport={"width": 1440, "height": 1000}, device_scale_factor=1
        )
        page = desktop.new_page()
        attach_error_capture(page, errors)
        open_clean(page)

        checks["title"] = page.title()
        checks["login_heading"] = page.get_by_role(
            "heading", name="欢迎回来"
        ).is_visible()
        page.screenshot(path=str(ARTIFACTS / "01-login-desktop.png"), full_page=True)

        corrupt_context = browser.new_context(viewport={"width": 1200, "height": 800})
        corrupt_page = corrupt_context.new_page()
        attach_error_capture(corrupt_page, errors)
        corrupt_page.goto(BASE_URL, wait_until="networkidle")
        corrupt_page.evaluate(
            """
            localStorage.setItem('kuakua-ai.accounts.v1', JSON.stringify('wrong-shape'));
            localStorage.setItem('kuakua-ai.progress.v1', JSON.stringify({broken: true}));
            localStorage.setItem('kuakua-ai.session.v1', 'ghost-user');
            """
        )
        corrupt_page.reload(wait_until="networkidle")
        checks["corrupt_storage_recovers"] = corrupt_page.get_by_role(
            "heading", name="欢迎回来"
        ).is_visible()
        corrupt_context.close()

        restricted_context = browser.new_context(viewport={"width": 1200, "height": 800})
        restricted_context.add_init_script(
            """
            for (const method of ['getItem', 'setItem', 'removeItem']) {
              Object.defineProperty(Storage.prototype, method, {
                configurable: true,
                value() { throw new DOMException('blocked', 'SecurityError'); }
              });
            }
            """
        )
        restricted_page = restricted_context.new_page()
        attach_error_capture(restricted_page, errors)
        restricted_page.goto(BASE_URL, wait_until="networkidle")
        checks["restricted_storage_fallback"] = restricted_page.get_by_role(
            "heading", name="欢迎回来"
        ).is_visible()
        restricted_context.close()

        enter_demo(page)
        praise = page.get_by_test_id("progress-praise")
        checks["inline_progress_praise"] = praise.is_visible()
        checks["welcome_praise_reason"] = praise.get_attribute("data-praise-reason") == "welcome"
        checks["no_blocking_praise_dialog"] = page.locator(".praise-dialog").count() == 0
        checks["post_login_scroll_y"] = page.evaluate("window.scrollY")
        page.screenshot(path=str(ARTIFACTS / "02-dashboard-desktop.png"), full_page=True)

        open_course(page)
        checks["course_vnext"] = page.locator(".course-vnext").is_visible()
        checks["stage_count"] = page.locator(".stage-disclosure").count()
        checks["lesson_count"] = page.locator(".stage-disclosure .lesson-row").count()
        checks["first_stage_open"] = page.locator(".stage-disclosure[open]").count() == 1
        checks["course_loop_steps"] = page.locator(".course-loop-strip ol > li").count()
        checks["methods_collapsed"] = not page.locator(".methods-disclosure").evaluate(
            "element => element.open"
        )
        checks["legacy_concept_hidden"] = "八仙" not in page.locator("body").inner_text()
        page.screenshot(path=str(ARTIFACTS / "03-course-map.png"), full_page=True)

        open_first_lesson(page)
        route = page.get_by_test_id("learning-route")
        checks["learning_route"] = route.is_visible()
        checks["learning_route_font_desktop"] = font_size(page, ".learning-route")
        checks["learning_phase_count"] = page.locator(
            ".learning-phase-nav button"
        ).count()
        checks["concept_active"] = (
            page.get_by_test_id("learning-phase-concept").get_attribute("aria-current")
            == "step"
            and page.locator(".concept-step").is_visible()
        )
        checks["single_phase_panel"] = page.get_by_test_id(
            "learning-phase-panel"
        ).count() == 1

        go_to_phase(page, "learn")
        checks["learn_step"] = page.locator(".learn-step").is_visible()
        checks["deep_case"] = page.locator(".learn-case").is_visible()
        checks["supporting_library_collapsed"] = page.locator(
            ".learn-library > details[open]"
        ).count() == 0
        page.locator(".learn-library > details").first.locator("summary").click()
        checks["core_books"] = page.locator(".book-deep-card").count()
        checks["book_has_sections"] = (
            page.get_by_text("主要内容", exact=True).first.is_visible()
            and page.get_by_text("三条核心观点", exact=True).first.is_visible()
        )

        go_to_phase(page, "practice")
        checks["practice_active"] = page.get_by_test_id(
            "learning-phase-practice"
        ).get_attribute("aria-current") == "step"
        material = (
            "目标客户是独立顾问；最近一次用 3 天整理客户项目，没有可复用模板，"
            "现有证据是六次访谈记录和两份客户交付文档。"
        )
        page.get_by_test_id("coach-material").fill(material)
        page.get_by_test_id("coach-submit").click()
        page.get_by_test_id("coach-result").wait_for(state="visible")
        checks["coach_feedback_structured"] = all(
            page.locator(selector).count() >= minimum
            for selector, minimum in (
                (".coach-ack", 1),
                (".coach-feedback-grid > section", 2),
                (".coach-question", 1),
                (".coach-next-action", 1),
            )
        )

        go_to_phase(page, "workbench")
        checks["workbench_active"] = page.get_by_test_id(
            "learning-phase-workbench"
        ).get_attribute("aria-current") == "step"
        checks["harness_visible"] = page.get_by_test_id("harness-step").is_visible()
        page.get_by_test_id("harness-file-input").set_input_files(
            [
                {
                    "name": "customer-plan.md",
                    "mimeType": "text/markdown",
                    "buffer": b"customer evidence and next experiment",
                },
                {
                    "name": ".env",
                    "mimeType": "text/plain",
                    "buffer": b"PRIVATE_TEST_MARKER=never-upload",
                },
            ]
        )
        task_spec = page.get_by_test_id("harness-task-spec").inner_text()
        checks["harness_selected_safe_file"] = (
            "customer-plan.md" in page.get_by_test_id("harness-selected-files").inner_text()
            and "customer-plan.md" in task_spec
        )
        checks["harness_secret_excluded"] = ".env" not in task_spec
        checks["harness_is_bounded"] = "只允许修改以下所选文件" in task_spec
        checks["harness_local_entry"] = (
            page.get_by_test_id("harness-open").get_attribute("href")
            == "http://127.0.0.1:3080/"
        )

        evidence_text = page.get_by_test_id("evidence-text")
        evidence_url = page.get_by_test_id("evidence-url")
        submit_evidence = page.get_by_test_id("submit-evidence")
        checks["evidence_only_in_workbench"] = evidence_text.is_visible()
        checks["evidence_required"] = submit_evidence.is_disabled()
        evidence_text.fill("不足十九个字的作品说明")
        checks["short_evidence_blocked"] = submit_evidence.is_disabled()
        evidence_text.fill(
            "我完成了真实客户访谈稿，依据三次访谈整理共同问题，下一步用五位用户继续验证。"
        )
        evidence_url.fill("not-a-link")
        checks["invalid_evidence_url_blocked"] = submit_evidence.is_disabled()
        evidence_url.fill("https://example.com/evidence")
        page.get_by_test_id("save-evidence-draft").click()
        checks["draft_saved"] = page.locator(".evidence-save-status").get_by_text(
            "作品草稿已保存在本浏览器"
        ).is_visible()
        checks["learning_point_saved"] = page.evaluate(
            """() => JSON.parse(
                localStorage.getItem('kuakua-ai.learning-point.v1.demo-learner')
            ).phase === 'workbench'"""
        )

        page.get_by_test_id("learning-back").click()
        open_first_lesson(page)
        checks["workbench_phase_persists"] = page.get_by_test_id(
            "learning-phase-workbench"
        ).get_attribute("aria-current") == "step"
        checks["draft_persists"] = (
            page.get_by_test_id("evidence-text")
            .input_value()
            .startswith("我完成了真实客户访谈稿")
            and page.get_by_test_id("evidence-url").input_value()
            == "https://example.com/evidence"
        )
        checks["draft_not_progress"] = page.evaluate(
            """() => {
                const all = JSON.parse(localStorage.getItem('kuakua-ai.progress.v1'));
                const item = all.find(value => value.userId === 'demo-learner');
                return item.schemaVersion === 2
                    && !item.evidenceByLessonId['identity-01'].submittedAt;
            }"""
        )
        page.get_by_test_id("submit-evidence").click()
        page.get_by_text("知识吸收成功").wait_for(state="visible")
        checks["reward_40"] = page.get_by_text("小晴获得 +40 知识值").is_visible()
        checks["evidence_submitted"] = page.evaluate(
            """() => {
                const all = JSON.parse(localStorage.getItem('kuakua-ai.progress.v1'));
                const item = all.find(value => value.userId === 'demo-learner');
                return Boolean(item.evidenceByLessonId['identity-01'].submittedAt)
                    && item.completedLessonIds.filter(id => id === 'identity-01').length === 1;
            }"""
        )
        page.screenshot(path=str(ARTIFACTS / "04-growth-reward.png"), full_page=False)
        page.get_by_role("button", name="继续成长").click()
        checks["xp_updated"] = "40" in page.locator(".xp-pill").inner_text()

        page.locator(".desktop-nav").get_by_role("button", name="小晴", exact=True).click()
        checks["buddy_room"] = page.locator(".buddy-showcase img").is_visible()
        page.evaluate(
            """
            const all = JSON.parse(localStorage.getItem('kuakua-ai.progress.v1'));
            const item = all.find(value => value.userId === 'demo-learner');
            item.xp = 1920;
            localStorage.setItem('kuakua-ai.progress.v1', JSON.stringify(all));
            """
        )
        page.reload(wait_until="networkidle")
        page.locator(".desktop-nav").get_by_role("button", name="小晴", exact=True).click()
        checks["final_level_reachable"] = page.get_by_text(
            "Lv.7 · 链主伙伴", exact=False
        ).is_visible()
        desktop.close()

        free_context = browser.new_context(viewport={"width": 1280, "height": 900})
        free_page = free_context.new_page()
        attach_error_capture(free_page, errors)
        open_clean(free_page)
        free_page.get_by_role("button", name="注册", exact=True).click()
        free_page.get_by_label("怎么称呼你", exact=True).fill("免费流程验收")
        free_page.get_by_label("邮箱", exact=True).fill("free-flow@example.com")
        free_page.get_by_label("密码", exact=True).fill("KuaKua-QA-2026")
        free_page.get_by_role("button", name="创建账号", exact=False).click()
        free_page.get_by_test_id("progress-praise").wait_for(state="visible")
        open_course(free_page)
        open_first_lesson(free_page)
        checks["free_can_open_concept"] = free_page.locator(".concept-step").is_visible()
        go_to_phase(free_page, "learn")
        checks["free_can_open_learn"] = free_page.locator(".learn-step").is_visible()
        go_to_phase(free_page, "practice")
        gate = free_page.get_by_test_id("membership-gate")
        gate.wait_for(state="visible")
        checks["free_practice_is_gated"] = (
            gate.is_visible()
            and free_page.get_by_test_id("learning-route").is_visible()
            and free_page.get_by_test_id("learning-phase-learn").get_attribute(
                "aria-current"
            )
            == "step"
        )
        checks["free_workbench_hidden"] = free_page.get_by_test_id(
            "harness-step"
        ).count() == 0
        gate.locator(".membership-close").click()
        go_to_phase(free_page, "workbench")
        free_page.get_by_test_id("membership-gate").wait_for(state="visible")
        checks["free_workbench_is_gated"] = free_page.get_by_test_id(
            "harness-step"
        ).count() == 0
        free_context.close()

        admin_context = browser.new_context(viewport={"width": 1440, "height": 1000})
        admin_page = admin_context.new_page()
        attach_error_capture(admin_page, errors)
        open_clean(admin_page)
        enter_demo(admin_page, "管理员体验")
        admin_page.locator(".desktop-nav").get_by_role(
            "button", name="角色管理", exact=True
        ).click()
        admin_page.get_by_role("heading", name="用户与角色管理").wait_for(
            state="visible"
        )
        checks["admin_rows"] = admin_page.locator(
            ".account-row:not(.account-header)"
        ).count()
        checks["role_selects"] = admin_page.locator(".select-wrap select").count()
        admin_context.close()

        legacy_context = browser.new_context(viewport={"width": 1280, "height": 900})
        legacy_page = legacy_context.new_page()
        attach_error_capture(legacy_page, errors)
        open_clean(legacy_page)
        legacy_page.evaluate(
            """
            const today = new Date().toLocaleDateString('en-CA');
            localStorage.setItem('kuakua-ai.progress.v1', JSON.stringify([{
              userId: 'demo-learner', xp: 40, completedLessonIds: ['identity-01'],
              streak: 1, lastVisitDate: today, lastPraiseDate: today,
              createdAt: new Date().toISOString()
            }]));
            localStorage.setItem('kuakua-ai.session.v1', 'demo-learner');
            """
        )
        legacy_page.reload(wait_until="networkidle")
        open_course(legacy_page)
        open_first_lesson(legacy_page)
        go_to_phase(legacy_page, "workbench")
        checks["legacy_record_needs_evidence"] = legacy_page.get_by_text(
            "历史 XP 记录但尚无作品证据", exact=False
        ).is_visible()
        legacy_page.get_by_test_id("evidence-text").fill(
            "这是旧版完成记录补交的真实作品证据，包含原始依据和下一步明确验收标准。"
        )
        legacy_page.get_by_test_id("submit-evidence").click()
        legacy_page.locator(".toast").get_by_text(
            "证据已提交，可继续完善", exact=False
        ).wait_for(state="visible")
        checks["legacy_backfill_no_duplicate_xp"] = legacy_page.evaluate(
            """() => {
                const all = JSON.parse(localStorage.getItem('kuakua-ai.progress.v1'));
                const item = all.find(value => value.userId === 'demo-learner');
                return item.xp === 40
                    && item.completedLessonIds.filter(id => id === 'identity-01').length === 1
                    && Boolean(item.evidenceByLessonId['identity-01'].submittedAt);
            }"""
        )
        legacy_context.close()

        mobile = browser.new_context(
            viewport={"width": 390, "height": 844}, device_scale_factor=1
        )
        mobile_page = mobile.new_page()
        attach_error_capture(mobile_page, errors)
        open_clean(mobile_page)
        enter_demo(mobile_page)
        mobile_page.locator(".bottom-nav").wait_for(state="visible")
        checks["mobile_post_login_scroll_y"] = mobile_page.evaluate("window.scrollY")
        checks["mobile_progress_praise"] = mobile_page.get_by_test_id(
            "progress-praise"
        ).is_visible()
        checks["mobile_body_font_size"] = font_size(mobile_page, "body")
        checks["mobile_horizontal_overflow_px"] = mobile_page.evaluate(
            "Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)"
        )
        open_course(mobile_page, mobile=True)
        checks["mobile_stage_count"] = mobile_page.locator(
            ".stage-disclosure"
        ).count()
        checks["mobile_lesson_count"] = mobile_page.locator(
            ".stage-disclosure .lesson-row"
        ).count()
        checks["mobile_next_card"] = mobile_page.locator(
            ".course-next-card"
        ).is_visible()
        mobile.close()

        admin_mobile = browser.new_context(
            viewport={"width": 390, "height": 844}, device_scale_factor=1
        )
        admin_mobile_page = admin_mobile.new_page()
        attach_error_capture(admin_mobile_page, errors)
        open_clean(admin_mobile_page)
        enter_demo(admin_mobile_page, "管理员体验")
        checks["mobile_admin_entry"] = admin_mobile_page.locator(
            ".bottom-nav"
        ).get_by_role("button", name="管理").is_visible()
        admin_mobile_page.locator(".bottom-nav").get_by_role(
            "button", name="管理"
        ).click()
        checks["mobile_admin_page"] = admin_mobile_page.get_by_role(
            "heading", name="用户与角色管理"
        ).is_visible()
        admin_mobile.close()

        browser.close()

    required = [
        checks.get("login_heading"),
        checks.get("corrupt_storage_recovers"),
        checks.get("restricted_storage_fallback"),
        checks.get("inline_progress_praise"),
        checks.get("welcome_praise_reason"),
        checks.get("no_blocking_praise_dialog"),
        checks.get("post_login_scroll_y") == 0,
        checks.get("course_vnext"),
        checks.get("stage_count") == 8,
        checks.get("lesson_count") == 32,
        checks.get("first_stage_open"),
        checks.get("course_loop_steps") == 4,
        checks.get("methods_collapsed"),
        checks.get("legacy_concept_hidden"),
        checks.get("learning_route"),
        checks.get("learning_route_font_desktop", 0) >= 18,
        checks.get("learning_phase_count") == 4,
        checks.get("concept_active"),
        checks.get("single_phase_panel"),
        checks.get("learn_step"),
        checks.get("deep_case"),
        checks.get("supporting_library_collapsed"),
        checks.get("core_books") == 3,
        checks.get("book_has_sections"),
        checks.get("practice_active"),
        checks.get("coach_feedback_structured"),
        checks.get("workbench_active"),
        checks.get("harness_visible"),
        checks.get("harness_selected_safe_file"),
        checks.get("harness_secret_excluded"),
        checks.get("harness_is_bounded"),
        checks.get("harness_local_entry"),
        checks.get("evidence_only_in_workbench"),
        checks.get("evidence_required"),
        checks.get("short_evidence_blocked"),
        checks.get("invalid_evidence_url_blocked"),
        checks.get("draft_saved"),
        checks.get("learning_point_saved"),
        checks.get("workbench_phase_persists"),
        checks.get("draft_persists"),
        checks.get("draft_not_progress"),
        checks.get("evidence_submitted"),
        checks.get("reward_40"),
        checks.get("xp_updated"),
        checks.get("buddy_room"),
        checks.get("final_level_reachable"),
        checks.get("free_can_open_concept"),
        checks.get("free_can_open_learn"),
        checks.get("free_practice_is_gated"),
        checks.get("free_workbench_hidden"),
        checks.get("free_workbench_is_gated"),
        checks.get("admin_rows") == 3,
        checks.get("role_selects") == 3,
        checks.get("legacy_record_needs_evidence"),
        checks.get("legacy_backfill_no_duplicate_xp"),
        checks.get("mobile_post_login_scroll_y") == 0,
        checks.get("mobile_progress_praise"),
        checks.get("mobile_body_font_size", 0) >= 17,
        checks.get("mobile_horizontal_overflow_px") == 0,
        checks.get("mobile_stage_count") == 8,
        checks.get("mobile_lesson_count") == 32,
        checks.get("mobile_next_card"),
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
