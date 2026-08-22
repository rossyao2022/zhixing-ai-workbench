from __future__ import annotations

import http.cookiejar
import json
import sqlite3
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

from server.app import (
    Config,
    DeepSeekProviderError,
    KuakuaServer,
    PLANS,
    call_deepseek_coach,
    initialize_database,
)


class ApiClient:
    def __init__(self, base_url: str, origin: str):
        self.base_url = base_url
        self.origin = origin
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))

    def request(
        self,
        method: str,
        path: str,
        body: dict | None = None,
        token: str | None = None,
        bearer_mode: bool = False,
        include_origin: bool = True,
    ) -> tuple[int, object, dict]:
        payload = None
        headers: dict[str, str] = {}
        if method in {"POST", "OPTIONS"} and include_origin:
            headers["Origin"] = self.origin
        if body is not None:
            payload = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if bearer_mode:
            headers["X-Session-Mode"] = "bearer"
        request = urllib.request.Request(
            self.base_url + path, data=payload, headers=headers, method=method
        )
        try:
            response = self.opener.open(request, timeout=5)
        except urllib.error.HTTPError as error:
            response = error
        raw = response.read()
        content_type = response.headers.get("Content-Type", "")
        parsed: object = json.loads(raw.decode("utf-8")) if "application/json" in content_type else raw
        result = response.status, parsed, dict(response.headers)
        response.close()
        return result


class MembershipApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        temp_path = Path(self.temp_dir.name)
        self.database_path = temp_path / "membership.sqlite3"
        self.qr_path = temp_path / "company-payment-qr.png"
        self.qr_bytes = b"\x89PNG\r\n\x1a\nkuakua-test-payment-qr"
        self.qr_path.write_bytes(self.qr_bytes)
        self.origin = "http://client.test"
        self.config = Config(
            host="127.0.0.1",
            port=0,
            database_path=self.database_path,
            payment_qr_path=self.qr_path,
            allowed_origins=frozenset({self.origin}),
            password_iterations=210_000,
            cookie_secure=False,
            deepseek_api_key="test-deepseek-key",
        )
        with mock.patch.dict(
            "os.environ",
            {
                "KUAKUA_BOOTSTRAP_ADMIN_EMAIL": "admin@kuakua.test",
                "KUAKUA_BOOTSTRAP_ADMIN_PASSWORD": "Admin-pass-2026!",
            },
            clear=False,
        ):
            initialize_database(self.config)
        self.server = KuakuaServer(("127.0.0.1", 0), self.config)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        port = self.server.server_address[1]
        self.client = ApiClient(f"http://127.0.0.1:{port}", self.origin)

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)
        self.temp_dir.cleanup()

    def register(self, email: str, display_name: str = "测试学员") -> tuple[str, dict]:
        status, document, _ = self.client.request(
            "POST",
            "/kuakua-ai-api/auth/register",
            {"email": email, "password": "Learner-pass-2026!", "displayName": display_name},
            bearer_mode=True,
        )
        self.assertEqual(status, 201, document)
        assert isinstance(document, dict)
        return document["data"]["session"]["token"], document["data"]["user"]

    def login_admin(self) -> str:
        status, document, _ = self.client.request(
            "POST",
            "/kuakua-ai-api/auth/login",
            {"email": "admin@kuakua.test", "password": "Admin-pass-2026!"},
            bearer_mode=True,
        )
        self.assertEqual(status, 200, document)
        assert isinstance(document, dict)
        return document["data"]["session"]["token"]

    def generate_codes(self, admin_token: str, count: int = 1) -> list[dict]:
        status, document, _ = self.client.request(
            "POST",
            "/kuakua-ai-api/admin/redemption-codes/generate",
            {"count": count, "enterpriseId": "QINGMI-TEST", "campaignId": "qa-2026"},
            token=admin_token,
        )
        self.assertEqual(status, 201, document)
        assert isinstance(document, dict)
        return document["data"]["codes"]

    def grant_membership(self, user_id: str, tier: str = "pro") -> None:
        current = datetime.now(timezone.utc)
        starts_at = (current - timedelta(minutes=1)).isoformat().replace("+00:00", "Z")
        expires_at = (current + timedelta(days=31)).isoformat().replace("+00:00", "Z")
        connection = sqlite3.connect(self.database_path)
        try:
            connection.execute(
                """INSERT INTO membership_grants
                   (id, user_id, tier, source, starts_at, expires_at, created_at)
                   VALUES (?, ?, ?, 'manual_grant', ?, ?, ?)""",
                (f"grant-{user_id}", user_id, tier, starts_at, expires_at, starts_at),
            )
            connection.commit()
        finally:
            connection.close()

    def test_full_membership_payment_and_redemption_flow(self) -> None:
        status, health, _ = self.client.request("GET", "/kuakua-ai-api/health")
        self.assertEqual(status, 200)
        self.assertEqual(health["data"]["status"], "ok")

        status, error, _ = self.client.request(
            "POST",
            "/kuakua-ai-api/auth/register",
            {"email": "blocked@test.example", "password": "Learner-pass-2026!", "displayName": "无来源"},
            include_origin=False,
        )
        self.assertEqual(status, 403)
        self.assertEqual(error["error"]["code"], "ORIGIN_REQUIRED")

        learner_token, learner = self.register("learner@kuakua.test")
        status, me, _ = self.client.request("GET", "/kuakua-ai-api/me", token=learner_token)
        self.assertEqual(status, 200)
        self.assertEqual(me["data"]["membership"]["tier"], "free")
        self.assertFalse(me["data"]["membership"]["benefits"]["canStartLearning"])

        status, blocked, _ = self.client.request(
            "POST", "/kuakua-ai-api/ai/consume", {}, token=learner_token
        )
        self.assertEqual(status, 403)
        self.assertEqual(blocked["error"]["code"], "MEMBERSHIP_REQUIRED")

        anonymous_client = ApiClient(self.client.base_url, self.origin)
        status, _, _ = anonymous_client.request("GET", "/kuakua-ai-api/payment-qr")
        self.assertEqual(status, 401)
        status, qr, headers = self.client.request(
            "GET", "/kuakua-ai-api/payment-qr", token=learner_token
        )
        self.assertEqual(status, 200)
        self.assertEqual(qr, self.qr_bytes)
        self.assertEqual(headers["Cache-Control"], "private, no-store")

        admin_token = self.login_admin()
        codes = self.generate_codes(admin_token, 3)
        self.assertEqual(len(codes), 3)
        self.assertTrue(all(item["code"].startswith("KUAKUA-PRO-6M-") for item in codes))
        status, code_index, _ = self.client.request(
            "GET", "/kuakua-ai-api/admin/redemption-codes?status=issued", token=admin_token
        )
        self.assertEqual(status, 200, code_index)
        self.assertEqual(len(code_index["data"]["codes"]), 3)
        self.assertNotIn("code", code_index["data"]["codes"][0])
        self.assertNotIn("codeHash", code_index["data"]["codes"][0])

        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        try:
            code_columns = [row[1] for row in connection.execute("PRAGMA table_info(redemption_codes)")]
            self.assertNotIn("code", code_columns)
            stored = connection.execute("SELECT code_hash FROM redemption_codes").fetchall()
            self.assertEqual(len(stored), 3)
            self.assertNotIn(codes[0]["code"], {row["code_hash"] for row in stored})
            user_row = connection.execute(
                "SELECT password_hash FROM users WHERE id = ?", (learner["id"],)
            ).fetchone()
            self.assertTrue(user_row["password_hash"].startswith("pbkdf2_sha256$210000$"))
            self.assertNotIn("Learner-pass-2026!", user_row["password_hash"])
            session_hashes = {row[0] for row in connection.execute("SELECT token_hash FROM sessions")}
            self.assertNotIn(learner_token, session_hashes)
        finally:
            connection.close()

        status, redeemed, _ = self.client.request(
            "POST", "/kuakua-ai-api/redemption-codes/redeem", {"code": codes[0]["code"]},
            token=learner_token,
        )
        self.assertEqual(status, 200, redeemed)
        self.assertEqual(redeemed["data"]["membership"]["tier"], "pro")
        self.assertEqual(redeemed["data"]["redemption"]["benefit"], "pro-six-calendar-months")

        status, usage, _ = self.client.request(
            "POST", "/kuakua-ai-api/ai/consume", {}, token=learner_token
        )
        self.assertEqual(status, 200)
        self.assertEqual(usage["data"]["usedRuns"], 1)
        self.assertEqual(usage["data"]["remainingRuns"], 99)

        connection = sqlite3.connect(self.database_path)
        try:
            connection.execute("UPDATE ai_usage SET used_runs = 100 WHERE user_id = ?", (learner["id"],))
            connection.commit()
        finally:
            connection.close()
        status, exhausted, _ = self.client.request(
            "POST", "/kuakua-ai-api/ai/consume", {}, token=learner_token
        )
        self.assertEqual(status, 429)
        self.assertEqual(exhausted["error"]["code"], "AI_QUOTA_EXHAUSTED")

        status, created, _ = self.client.request(
            "POST",
            "/kuakua-ai-api/payment-orders",
            {
                "planId": "max-monthly",
                "payerName": "晴幂测试",
                "paymentReference": "BANK-20260819-0001",
                "customerNote": "测试付款",
                "amountFen": 1,
            },
            token=learner_token,
        )
        self.assertEqual(status, 201, created)
        order = created["data"]["order"]
        self.assertEqual(order["amountFen"], 9_900)
        self.assertEqual(order["status"], "pending")
        status, retried, _ = self.client.request(
            "POST",
            "/kuakua-ai-api/payment-orders",
            {
                "planId": "max-monthly",
                "payerName": "晴幂测试",
                "paymentReference": "BANK-20260819-0001",
            },
            token=learner_token,
        )
        self.assertEqual(status, 200, retried)
        self.assertEqual(retried["data"]["order"]["id"], order["id"])
        status, pending_orders, _ = self.client.request(
            "GET", "/kuakua-ai-api/admin/payment-orders?status=pending", token=admin_token
        )
        self.assertEqual(status, 200, pending_orders)
        self.assertEqual(pending_orders["data"]["orders"][0]["id"], order["id"])

        second_token, _ = self.register("second@kuakua.test", "第二位学员")
        status, duplicate, _ = self.client.request(
            "POST",
            "/kuakua-ai-api/payment-orders",
            {
                "planId": "pro-monthly",
                "payerName": "另一付款人",
                "paymentReference": "bank-20260819-0001",
            },
            token=second_token,
        )
        self.assertEqual(status, 409)
        self.assertEqual(duplicate["error"]["code"], "PAYMENT_REFERENCE_EXISTS")

        status, reviewed, _ = self.client.request(
            "POST",
            f"/kuakua-ai-api/admin/payment-orders/{order['id']}/review",
            {"decision": "approved", "reviewNote": "测试到账"},
            token=admin_token,
        )
        self.assertEqual(status, 200, reviewed)
        self.assertEqual(reviewed["data"]["order"]["status"], "approved")
        self.assertEqual(reviewed["data"]["membership"]["tier"], "max")
        status, repeated, _ = self.client.request(
            "POST",
            f"/kuakua-ai-api/admin/payment-orders/{order['id']}/review",
            {"decision": "approved"},
            token=admin_token,
        )
        self.assertEqual(status, 409)
        self.assertEqual(repeated["error"]["code"], "ORDER_ALREADY_REVIEWED")

        status, unlimited, _ = self.client.request(
            "POST", "/kuakua-ai-api/ai/consume", {}, token=learner_token
        )
        self.assertEqual(status, 200)
        self.assertEqual(unlimited["data"]["mode"], "unlimited")
        self.assertEqual(unlimited["data"]["usedRuns"], 100)
        self.assertIsNone(unlimited["data"]["limit"])
        self.assertIsNone(unlimited["data"]["remainingRuns"])

        # The same one-time code can succeed in only one concurrent transaction.
        third_token, _ = self.register("third@kuakua.test", "第三位学员")
        concurrent_code = codes[1]["code"]
        barrier = threading.Barrier(2)
        results: list[int] = []

        def redeem(token: str) -> None:
            local_client = ApiClient(self.client.base_url, self.origin)
            barrier.wait(timeout=3)
            result, _, _ = local_client.request(
                "POST", "/kuakua-ai-api/redemption-codes/redeem", {"code": concurrent_code}, token=token
            )
            results.append(result)

        threads = [threading.Thread(target=redeem, args=(second_token,)), threading.Thread(target=redeem, args=(third_token,))]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=5)
        self.assertEqual(sorted(results), [200, 409])

        self.assertEqual(PLANS["pro-monthly"]["amountFen"], 2_900)
        self.assertEqual(PLANS["pro-yearly"]["amountFen"], 29_900)
        self.assertEqual(PLANS["max-monthly"]["amountFen"], 9_900)
        self.assertEqual(PLANS["max-yearly"]["amountFen"], 99_900)

    def test_ai_coach_success_idempotency_and_provider_failure_rollback(self) -> None:
        status, unauthorized, _ = self.client.request(
            "POST", "/kuakua-ai-api/ai/coach", {}
        )
        self.assertEqual(status, 401, unauthorized)
        self.assertEqual(unauthorized["error"]["code"], "UNAUTHORIZED")

        learner_token, learner = self.register("coach@kuakua.test", "陪练学员")
        request_body = {
            "requestId": "coach-free-check",
            "lessonId": "identity-01",
            "lessonTitle": "超级个体责任边界",
            "goal": "把项目任务分到本人、AI 与伙伴三类。",
            "material": "这是免费用户提交的完整练习材料，长度足够但不应调用模型。",
            "criteria": ["责任主体明确", "每项有可检查输出"],
        }
        with mock.patch("server.app.call_deepseek_coach") as provider:
            status, blocked, _ = self.client.request(
                "POST", "/kuakua-ai-api/ai/coach", request_body, token=learner_token
            )
        self.assertEqual(status, 403, blocked)
        self.assertEqual(blocked["error"]["code"], "MEMBERSHIP_REQUIRED")
        provider.assert_not_called()

        self.grant_membership(learner["id"], "pro")
        invalid_body = {**request_body, "requestId": "coach-invalid", "material": "太短"}
        with mock.patch("server.app.call_deepseek_coach") as provider:
            status, invalid, _ = self.client.request(
                "POST", "/kuakua-ai-api/ai/coach", invalid_body, token=learner_token
            )
        self.assertEqual(status, 400, invalid)
        self.assertEqual(invalid["error"]["code"], "INVALID_INPUT")
        provider.assert_not_called()

        private_marker = "PRIVATE-MATERIAL-DO-NOT-PERSIST-8842"
        request_body.update(
            {
                "requestId": "coach-success-001",
                "material": f"{private_marker}：我已列出客户承诺、执行动作和两条验收标准。",
            }
        )
        answer = {
            "acknowledgement": "你已经把客户承诺与执行动作分开，这是可靠的第一步。",
            "strengths": ["责任对象明确", "已经出现可检查输出"],
            "gaps": ["尚未定义失败升级条件"],
            "questions": ["哪项决定一旦做错最难回退？"],
            "nextAction": "用 15 分钟为两个委派项各补一条失败升级条件。",
            "improvedDraft": "本人保留承诺与最终验收，AI 只整理证据。",
            "rubric": [
                {"label": "责任主体明确", "status": "met", "note": "已指定最终责任人"},
                {"label": "每项有可检查输出", "status": "partial", "note": "仍缺失败条件"},
            ],
        }
        with mock.patch(
            "server.app.call_deepseek_coach",
            return_value=(answer, "deepseek-v4-flash"),
        ) as provider:
            status, coached, _ = self.client.request(
                "POST", "/kuakua-ai-api/ai/coach", request_body, token=learner_token
            )
        self.assertEqual(status, 200, coached)
        self.assertEqual(coached["data"]["answer"], answer)
        self.assertEqual(coached["data"]["model"], "deepseek-v4-flash")
        self.assertEqual(coached["data"]["aiUsage"]["usedRuns"], 1)
        self.assertEqual(coached["data"]["aiUsage"]["remainingRuns"], 99)
        provider.assert_called_once()

        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        try:
            columns = {row[1] for row in connection.execute("PRAGMA table_info(ai_runs)")}
            self.assertFalse(
                columns.intersection({"material", "goal", "lesson_title", "answer", "answer_json"})
            )
            stored_run = dict(
                connection.execute(
                    "SELECT * FROM ai_runs WHERE user_id = ? AND request_id = ?",
                    (learner["id"], "coach-success-001"),
                ).fetchone()
            )
            self.assertEqual(stored_run["status"], "succeeded")
            self.assertNotIn(private_marker, json.dumps(stored_run, ensure_ascii=False))
        finally:
            connection.close()

        with mock.patch("server.app.call_deepseek_coach") as provider:
            status, repeated, _ = self.client.request(
                "POST", "/kuakua-ai-api/ai/coach", request_body, token=learner_token
            )
        self.assertEqual(status, 409, repeated)
        self.assertEqual(repeated["error"]["code"], "AI_REQUEST_ALREADY_COMPLETED")
        provider.assert_not_called()

        failing_body = {
            **request_body,
            "requestId": "coach-retry-002",
            "material": "另一份已脱敏材料：包含客户对象、发生时间和现有证据，准备接受反方检查。",
        }
        provider_error = DeepSeekProviderError(
            503, "AI_PROVIDER_BUSY", "AI 教练当前繁忙，请稍后重试。"
        )
        with mock.patch("server.app.call_deepseek_coach", side_effect=provider_error):
            status, failed, _ = self.client.request(
                "POST", "/kuakua-ai-api/ai/coach", failing_body, token=learner_token
            )
        self.assertEqual(status, 503, failed)
        self.assertEqual(failed["error"]["code"], "AI_PROVIDER_BUSY")

        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        try:
            usage = connection.execute(
                "SELECT used_runs FROM ai_usage WHERE user_id = ?", (learner["id"],)
            ).fetchone()
            self.assertEqual(usage["used_runs"], 1)
            failed_run = connection.execute(
                "SELECT status, quota_reserved, error_code FROM ai_runs WHERE user_id = ? AND request_id = ?",
                (learner["id"], "coach-retry-002"),
            ).fetchone()
            self.assertEqual(dict(failed_run), {
                "status": "failed",
                "quota_reserved": 0,
                "error_code": "AI_PROVIDER_BUSY",
            })
        finally:
            connection.close()

        with mock.patch(
            "server.app.call_deepseek_coach",
            return_value=(answer, "deepseek-v4-flash"),
        ):
            status, retried, _ = self.client.request(
                "POST", "/kuakua-ai-api/ai/coach", failing_body, token=learner_token
            )
        self.assertEqual(status, 200, retried)
        self.assertEqual(retried["data"]["aiUsage"]["usedRuns"], 2)

    def test_deepseek_provider_request_uses_v4_flash_and_structured_json(self) -> None:
        provider_answer = {
            "acknowledgement": "你已经给出真实对象与时间范围。",
            "strengths": ["对象明确"],
            "gaps": ["缺少证据链接"],
            "questions": ["哪条记录可以直接核查？"],
            "nextAction": "补上一条可核查记录。",
            "rubric": [{"label": "证据", "status": "partial", "note": "有描述但无来源"}],
        }
        upstream = {
            "model": "deepseek-v4-flash",
            "choices": [{"message": {"content": json.dumps(provider_answer, ensure_ascii=False)}}],
        }

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self, _limit: int) -> bytes:
                return json.dumps(upstream, ensure_ascii=False).encode("utf-8")

        captured_request: urllib.request.Request | None = None

        def open_request(request: urllib.request.Request, timeout: int):
            nonlocal captured_request
            captured_request = request
            self.assertEqual(timeout, 60)
            return FakeResponse()

        with mock.patch("server.app.urllib_request.urlopen", side_effect=open_request):
            answer, model = call_deepseek_coach(
                self.config,
                user_id="usr_internal_123",
                lesson_id="identity-01",
                lesson_title="超级个体责任边界",
                goal="形成责任边界",
                material="真实材料中包含对象、时间和证据描述，但不包含任何密钥。",
                criteria=["对象明确", "证据可核查"],
                mode="review",
            )
        self.assertEqual(answer, provider_answer)
        self.assertEqual(model, "deepseek-v4-flash")
        assert captured_request is not None
        sent = json.loads(captured_request.data.decode("utf-8"))
        self.assertEqual(sent["model"], "deepseek-v4-flash")
        self.assertEqual(sent["thinking"], {"type": "disabled"})
        self.assertEqual(sent["response_format"], {"type": "json_object"})
        self.assertTrue(sent["user_id"].startswith("kuakua_"))
        self.assertNotIn("usr_internal_123", sent["user_id"])
        self.assertEqual(captured_request.full_url, "https://api.deepseek.com/chat/completions")

    def test_cookie_session_is_http_only_and_logout_revokes_it(self) -> None:
        status, registered, headers = self.client.request(
            "POST",
            "/kuakua-ai-api/auth/register",
            {"email": "cookie@kuakua.test", "password": "Cookie-pass-2026!", "displayName": "Cookie 学员"},
        )
        self.assertEqual(status, 201, registered)
        self.assertNotIn("token", registered["data"]["session"])
        set_cookie = headers["Set-Cookie"]
        self.assertIn("HttpOnly", set_cookie)
        self.assertIn("SameSite=Lax", set_cookie)
        self.assertIn("Path=/kuakua-ai-api/", set_cookie)

        status, me, _ = self.client.request("GET", "/kuakua-ai-api/me")
        self.assertEqual(status, 200, me)
        status, logged_out, _ = self.client.request("POST", "/kuakua-ai-api/auth/logout", {})
        self.assertEqual(status, 200, logged_out)
        status, unauthorized, _ = self.client.request("GET", "/kuakua-ai-api/me")
        self.assertEqual(status, 401)
        self.assertEqual(unauthorized["error"]["code"], "UNAUTHORIZED")

    def test_disallowed_cors_origin_is_rejected(self) -> None:
        client = ApiClient(self.client.base_url, "https://evil.example")
        status, document, headers = client.request(
            "POST",
            "/kuakua-ai-api/auth/login",
            {"email": "nobody@example.com", "password": "Not-the-password"},
        )
        self.assertEqual(status, 403)
        self.assertEqual(document["error"]["code"], "ORIGIN_DENIED")
        self.assertNotIn("Access-Control-Allow-Origin", headers)


if __name__ == "__main__":
    unittest.main()
