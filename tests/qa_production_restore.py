import json
import os
import time
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("KUAKUA_BASE_URL", "http://127.0.0.1:43148/kuakua-ai/")
API_ORIGIN = f"{urlparse(BASE_URL).scheme}://{urlparse(BASE_URL).netloc}"


def main():
    checks = {}
    console_errors = []
    page_errors = []
    api_calls = []

    context_payload = {
        "ok": True,
        "data": {
            "user": {
                "id": "qa-production-restore",
                "displayName": "恢复测试学员",
                "email": "restore-qa@happykua.test",
                "role": "learner",
                "active": True,
                "createdAt": "2026-08-23T00:00:00.000Z",
            },
            "membership": {
                "tier": "pro",
                "status": "active",
                "startsAt": "2026-08-23T00:00:00.000Z",
                "expiresAt": "2027-08-23T00:00:00.000Z",
                "activeGrantIds": ["qa-restore"],
            },
            "aiUsage": {
                "allowed": True,
                "mode": "metered",
                "period": "2026-08",
                "usedRuns": 1,
                "limit": 100,
                "remainingRuns": 99,
                "resetsAt": "2026-09-01T00:00:00.000Z",
            },
        },
    }

    def handle_api(route, request):
        api_calls.append(request.url)
        path = urlparse(request.url).path
        headers = {
            "Access-Control-Allow-Origin": API_ORIGIN,
            "Access-Control-Allow-Credentials": "true",
            "Content-Type": "application/json; charset=utf-8",
        }
        if path.endswith("/me"):
            time.sleep(0.12)
            route.fulfill(status=200, headers=headers, body=json.dumps(context_payload, ensure_ascii=False))
            return
        route.fulfill(status=404, headers=headers, body=json.dumps({"ok": False, "error": {"code": "QA_NOT_FOUND"}}))

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1366, "height": 900})
        context.add_init_script(
            """(() => {
              if (sessionStorage.getItem('qa-production-restore-seeded')) return;
              localStorage.clear();
              localStorage.setItem('kuakua-ai.progress.v1', JSON.stringify([{
                schemaVersion: 2,
                userId: 'qa-production-restore',
                xp: 40,
                completedLessonIds: [],
                evidenceByLessonId: {},
                streak: 1,
                lastVisitDate: '2026-08-22',
                lastPraiseDate: '2026-08-22',
                createdAt: '2026-08-22T00:00:00.000Z'
              }]));
              sessionStorage.setItem('qa-production-restore-seeded', '1');
            })();"""
        )
        context.route("**/kuakua-ai-api/**", handle_api)
        page = context.new_page()
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        page.goto(BASE_URL, wait_until="domcontentloaded")
        praise = page.get_by_test_id("progress-praise")
        praise.wait_for(state="visible", timeout=10_000)
        checks["authenticated_restore_renders"] = praise.is_visible()
        checks["no_error_fallback"] = page.get_by_test_id("app-error-fallback").count() == 0
        checks["stored_progress_restored"] = page.evaluate(
            """() => {
              const value = JSON.parse(localStorage.getItem('kuakua-ai.progress.v1') || '[]');
              return value.some(item => item.userId === 'qa-production-restore' && item.xp === 40 && item.evidenceByLessonId);
            }"""
        )
        checks["restored_xp_visible"] = "40" in page.locator(".xp-pill").inner_text()
        checks["restoring_state_finished"] = page.get_by_test_id("session-restoring").count() == 0

        page.reload(wait_until="domcontentloaded")
        praise.wait_for(state="visible", timeout=10_000)
        checks["authenticated_reload_renders"] = praise.is_visible()
        checks["stored_xp_survives_reload"] = "40" in page.locator(".xp-pill").inner_text()
        checks["no_error_fallback_after_reload"] = page.get_by_test_id("app-error-fallback").count() == 0
        checks["context_was_restored_twice"] = sum(url.endswith("/me") for url in api_calls) >= 2
        checks["no_null_progress_crash"] = not any("evidenceByLessonId" in item for item in console_errors + page_errors)

        context.close()
        browser.close()

    passed = all(checks.values()) and not page_errors and not console_errors
    print(json.dumps({
        "status": "passed" if passed else "failed",
        "checks": checks,
        "console_errors": console_errors,
        "page_errors": page_errors,
    }, ensure_ascii=False, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
