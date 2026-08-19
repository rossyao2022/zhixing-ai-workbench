from __future__ import annotations

import http.cookiejar
import json
import sqlite3
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest import mock

from server.app import Config, KuakuaServer, PLANS, initialize_database


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
