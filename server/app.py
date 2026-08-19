#!/usr/bin/env python3
"""Production-oriented Kuakua AI membership API using only Python's stdlib.

The public reverse-proxy prefix is /kuakua-ai-api/.  Nginx should strip that
prefix, so this process exposes routes such as /auth/login and /membership/current.
"""

from __future__ import annotations

import argparse
import base64
import calendar
import contextlib
import hashlib
import hmac
import json
import logging
import mimetypes
import os
import re
import secrets
import sqlite3
import sys
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Iterator
from urllib.parse import parse_qs, unquote, urlsplit


API_VERSION = "1.0"
COOKIE_NAME = "kuakua_session"
PUBLIC_API_PREFIX = "/kuakua-ai-api/"
MAX_JSON_BYTES = 64 * 1024
PRO_AI_MONTHLY_LIMIT = 100
SHANGHAI_TZ = timezone(timedelta(hours=8), name="Asia/Shanghai")
PASSWORD_ALGORITHM = "pbkdf2_sha256"
PASSWORD_ITERATIONS_DEFAULT = 310_000
SESSION_DAYS_DEFAULT = 30
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
SAFE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
REDEMPTION_RE = re.compile(r"^KUAKUA-PRO-6M-[A-Z0-9]{12,24}$")

PLANS: dict[str, dict[str, Any]] = {
    "pro-monthly": {"tier": "pro", "amountFen": 2_900, "durationMonths": 1},
    "pro-yearly": {"tier": "pro", "amountFen": 29_900, "durationMonths": 12},
    "max-monthly": {"tier": "max", "amountFen": 9_900, "durationMonths": 1},
    "max-yearly": {"tier": "max", "amountFen": 99_900, "durationMonths": 12},
}

LOGGER = logging.getLogger("kuakua.membership")


@dataclass(frozen=True)
class Config:
    host: str
    port: int
    database_path: Path
    payment_qr_path: Path
    allowed_origins: frozenset[str]
    session_days: int = SESSION_DAYS_DEFAULT
    password_iterations: int = PASSWORD_ITERATIONS_DEFAULT
    cookie_secure: bool = True

    @classmethod
    def from_env(cls) -> "Config":
        raw_origins = os.environ.get("KUAKUA_ALLOWED_ORIGINS", "")
        origins = frozenset(
            normalize_origin(item)
            for item in raw_origins.split(",")
            if item.strip()
        )
        root = Path(__file__).resolve().parent
        return cls(
            host=os.environ.get("KUAKUA_HOST", "127.0.0.1"),
            port=int(os.environ.get("KUAKUA_PORT", "8787")),
            database_path=Path(
                os.environ.get("KUAKUA_DATABASE_PATH", str(root / "data" / "kuakua.sqlite3"))
            ).resolve(),
            payment_qr_path=Path(
                os.environ.get(
                    "KUAKUA_PAYMENT_QR_PATH",
                    str(root.parent / "local-preview-assets" / "company-payment-qr.png"),
                )
            ).resolve(),
            allowed_origins=origins,
            session_days=max(1, min(365, int(os.environ.get("KUAKUA_SESSION_DAYS", "30")))),
            password_iterations=max(
                210_000,
                min(2_000_000, int(os.environ.get("KUAKUA_PASSWORD_ITERATIONS", "310000"))),
            ),
            cookie_secure=os.environ.get("KUAKUA_COOKIE_SECURE", "1") != "0",
        )


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def normalize_origin(value: str) -> str:
    value = value.strip().rstrip("/")
    parsed = urlsplit(value)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError(f"Invalid allowed origin: {value!r}")
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso_z(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def parse_instant(value: str) -> datetime:
    if not isinstance(value, str) or len(value) > 40:
        raise ValueError("Invalid timestamp")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include a timezone")
    return parsed.astimezone(timezone.utc)


def add_calendar_months(value: datetime, months: int) -> datetime:
    if months <= 0:
        raise ValueError("months must be positive")
    value = value.astimezone(timezone.utc)
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def shanghai_period(value: datetime) -> str:
    local = value.astimezone(SHANGHAI_TZ)
    return f"{local.year:04d}-{local.month:02d}"


def next_shanghai_reset(value: datetime) -> str:
    local = value.astimezone(SHANGHAI_TZ)
    year, month = (local.year + 1, 1) if local.month == 12 else (local.year, local.month + 1)
    return iso_z(datetime(year, month, 1, tzinfo=SHANGHAI_TZ))


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def normalize_email(value: Any) -> str:
    if not isinstance(value, str):
        raise ApiError(400, "INVALID_EMAIL", "请输入有效邮箱。")
    email = unicodedata.normalize("NFKC", value).strip().casefold()
    if len(email) > 254 or not EMAIL_RE.fullmatch(email):
        raise ApiError(400, "INVALID_EMAIL", "请输入有效邮箱。")
    return email


def clean_text(value: Any, field_name: str, minimum: int, maximum: int) -> str:
    if not isinstance(value, str):
        raise ApiError(400, "INVALID_INPUT", f"{field_name}格式不正确。")
    cleaned = unicodedata.normalize("NFKC", value).strip()
    if len(cleaned) < minimum or len(cleaned) > maximum or any(ord(ch) < 32 for ch in cleaned):
        raise ApiError(400, "INVALID_INPUT", f"{field_name}长度或格式不正确。")
    return cleaned


def optional_text(value: Any, field_name: str, maximum: int) -> str | None:
    if value is None or value == "":
        return None
    return clean_text(value, field_name, 1, maximum)


def validate_password(password: Any) -> str:
    if not isinstance(password, str) or len(password) < 10 or len(password) > 128:
        raise ApiError(400, "INVALID_PASSWORD", "密码需为 10–128 个字符。")
    if password.isspace() or "\x00" in password:
        raise ApiError(400, "INVALID_PASSWORD", "密码格式不正确。")
    return password


def hash_password(password: str, iterations: int) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return "$".join(
        [
            PASSWORD_ALGORITHM,
            str(iterations),
            base64.urlsafe_b64encode(salt).decode("ascii").rstrip("="),
            base64.urlsafe_b64encode(digest).decode("ascii").rstrip("="),
        ]
    )


def _b64decode_unpadded(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, digest_text = encoded.split("$", 3)
        if algorithm != PASSWORD_ALGORITHM:
            return False
        iterations = int(iterations_text)
        if iterations < 100_000 or iterations > 2_000_000:
            return False
        salt = _b64decode_unpadded(salt_text)
        expected = _b64decode_unpadded(digest_text)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


# Make unknown-account logins perform the same expensive verification work as
# known accounts, reducing timing-based account enumeration.
DUMMY_PASSWORD_HASH = hash_password("not-a-real-kuakua-account", PASSWORD_ITERATIONS_DEFAULT)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(f"kuakua-session::{token}".encode("utf-8")).hexdigest()


def normalize_redemption_code(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    normalized = unicodedata.normalize("NFKC", value).strip().upper()
    normalized = re.sub(r"[\s_\u2010-\u2015]+", "-", normalized)
    return re.sub(r"-+", "-", normalized)


def hash_redemption_code(code: str) -> str:
    return hashlib.sha256(f"kuakua-ai::redemption::{code}".encode("utf-8")).hexdigest()


def connect_database(config: Config) -> sqlite3.Connection:
    connection = sqlite3.connect(
        str(config.database_path), timeout=15, isolation_level=None, check_same_thread=False
    )
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 15000")
    return connection


@contextlib.contextmanager
def transaction(connection: sqlite3.Connection) -> Iterator[sqlite3.Connection]:
    connection.execute("BEGIN IMMEDIATE")
    try:
        yield connection
    except Exception:
        connection.rollback()
        raise
    else:
        connection.commit()


def initialize_database(config: Config) -> None:
    config.database_path.parent.mkdir(parents=True, exist_ok=True)
    schema = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")
    connection = connect_database(config)
    try:
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA synchronous = NORMAL")
        connection.executescript(schema)
        bootstrap_email = os.environ.get("KUAKUA_BOOTSTRAP_ADMIN_EMAIL")
        bootstrap_password = os.environ.get("KUAKUA_BOOTSTRAP_ADMIN_PASSWORD")
        if bool(bootstrap_email) != bool(bootstrap_password):
            raise RuntimeError("Both bootstrap admin variables must be provided together")
        if bootstrap_email and bootstrap_password:
            email = normalize_email(bootstrap_email)
            password = validate_password(bootstrap_password)
            timestamp = iso_z(now_utc())
            with transaction(connection):
                existing = connection.execute(
                    "SELECT id FROM users WHERE email = ? COLLATE NOCASE", (email,)
                ).fetchone()
                if existing:
                    current = connection.execute(
                        "SELECT role FROM users WHERE id = ?", (existing["id"],)
                    ).fetchone()
                    if not current or current["role"] != "admin":
                        raise RuntimeError(
                            "Bootstrap admin email already belongs to a non-admin account"
                        )
                    connection.execute(
                        "UPDATE users SET role = 'admin', is_active = 1, updated_at = ? WHERE id = ?",
                        (timestamp, existing["id"]),
                    )
                else:
                    connection.execute(
                        """INSERT INTO users
                           (id, email, display_name, password_hash, role, created_at, updated_at)
                           VALUES (?, ?, ?, ?, 'admin', ?, ?)""",
                        (
                            new_id("usr"),
                            email,
                            "平台管理员",
                            hash_password(password, config.password_iterations),
                            timestamp,
                            timestamp,
                        ),
                    )
    finally:
        connection.close()


def serialize_user(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "email": row["email"],
        "displayName": row["display_name"],
        "role": row["role"],
        "isActive": bool(row["is_active"]),
        "createdAt": row["created_at"],
    }


def membership_snapshot(
    connection: sqlite3.Connection, user_id: str, current: datetime | None = None
) -> dict[str, Any]:
    current = current or now_utc()
    current_text = iso_z(current)
    rows = connection.execute(
        """SELECT id, tier, starts_at, expires_at
           FROM membership_grants WHERE user_id = ? ORDER BY starts_at, id""",
        (user_id,),
    ).fetchall()
    active = [row for row in rows if row["starts_at"] <= current_text < row["expires_at"]]
    tier = "max" if any(row["tier"] == "max" for row in active) else (
        "pro" if any(row["tier"] == "pro" for row in active) else "free"
    )
    if tier == "free":
        future = next((row for row in rows if row["starts_at"] > current_text), None)
        status = "scheduled" if future else "free"
        starts_at = future["starts_at"] if future else None
        expires_at = future["expires_at"] if future else None
        active_ids: list[str] = []
    else:
        active_tier = [row for row in active if row["tier"] == tier]
        starts_at = min(row["starts_at"] for row in active_tier)
        coverage_end = max(row["expires_at"] for row in active_tier)
        changed = True
        while changed:
            changed = False
            for row in rows:
                if row["tier"] == tier and row["starts_at"] <= coverage_end < row["expires_at"]:
                    coverage_end = row["expires_at"]
                    changed = True
        expires_at = coverage_end
        status = "active"
        active_ids = [row["id"] for row in active_tier]

    if tier == "free":
        ai_policy = {"mode": "blocked", "monthlyRuns": 0}
    elif tier == "pro":
        ai_policy = {"mode": "metered", "monthlyRuns": PRO_AI_MONTHLY_LIMIT}
    else:
        ai_policy = {"mode": "unlimited", "monthlyRuns": None}
    return {
        "tier": tier,
        "status": status,
        "startsAt": starts_at,
        "expiresAt": expires_at,
        "activeGrantIds": active_ids,
        "benefits": {
            "canBrowseAllContent": True,
            "canStartLearning": tier != "free",
            "aiTools": ai_policy,
        },
    }


def ai_usage_decision(
    connection: sqlite3.Connection,
    user_id: str,
    snapshot: dict[str, Any] | None = None,
    current: datetime | None = None,
) -> dict[str, Any]:
    current = current or now_utc()
    snapshot = snapshot or membership_snapshot(connection, user_id, current)
    period = shanghai_period(current)
    row = connection.execute(
        "SELECT used_runs FROM ai_usage WHERE user_id = ? AND period = ?", (user_id, period)
    ).fetchone()
    used = int(row["used_runs"]) if row else 0
    mode = snapshot["benefits"]["aiTools"]["mode"]
    limit: int | None = PRO_AI_MONTHLY_LIMIT if mode == "metered" else (0 if mode == "blocked" else None)
    remaining = None if limit is None else max(0, limit - used)
    return {
        "allowed": mode == "unlimited" or (mode == "metered" and bool(remaining)),
        "mode": mode,
        "period": period,
        "usedRuns": used,
        "limit": limit,
        "remainingRuns": remaining,
        "resetsAt": next_shanghai_reset(current),
    }


def next_coverage_start(
    connection: sqlite3.Connection, user_id: str, current: datetime, tier: str | None
) -> datetime:
    rows = connection.execute(
        """SELECT tier, starts_at, expires_at FROM membership_grants
           WHERE user_id = ? AND expires_at > ? ORDER BY starts_at""",
        (user_id, iso_z(current)),
    ).fetchall()
    if tier is not None:
        rows = [row for row in rows if row["tier"] == tier]
    coverage_end = current
    changed = True
    while changed:
        changed = False
        for row in rows:
            start = parse_instant(row["starts_at"])
            end = parse_instant(row["expires_at"])
            if start <= coverage_end and end > coverage_end:
                coverage_end = end
                changed = True
    return coverage_end


def serialize_order(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "planId": row["plan_id"],
        "tier": row["tier"],
        "amountFen": row["amount_fen"],
        "currency": row["currency"],
        "payerName": row["payer_name"],
        "paymentReference": row["payment_reference"],
        "customerNote": row["customer_note"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "reviewedAt": row["reviewed_at"],
        "reviewedBy": row["reviewed_by"],
        "reviewNote": row["review_note"],
        "membershipGrantId": row["membership_grant_id"],
    }


def audit(
    connection: sqlite3.Connection,
    actor_user_id: str | None,
    action: str,
    target_type: str,
    target_id: str | None,
    detail: dict[str, Any] | None = None,
) -> None:
    connection.execute(
        """INSERT INTO audit_events
           (id, actor_user_id, action, target_type, target_id, created_at, detail_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            new_id("evt"), actor_user_id, action, target_type, target_id, iso_z(now_utc()),
            json.dumps(detail, ensure_ascii=False, separators=(",", ":")) if detail else None,
        ),
    )


class KuakuaServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], config: Config):
        self.config = config
        super().__init__(address, KuakuaHandler)


class KuakuaHandler(BaseHTTPRequestHandler):
    server: KuakuaServer
    protocol_version = "HTTP/1.1"
    server_version = "KuakuaMembership"
    sys_version = ""

    def do_OPTIONS(self) -> None:
        try:
            self._validate_origin(required=True)
            self.send_response(204)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Session-Mode")
            self.send_header("Access-Control-Max-Age", "600")
            self.send_header("Content-Length", "0")
            self.end_headers()
        except ApiError as error:
            self._send_error(error)

    def do_GET(self) -> None:
        self._handle_request()

    def do_POST(self) -> None:
        self._handle_request()

    def _handle_request(self) -> None:
        try:
            self._validate_origin(required=self.command == "POST")
            self._dispatch()
        except ApiError as error:
            self._send_error(error)
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception:
            LOGGER.exception("Unhandled API error for %s %s", self.command, urlsplit(self.path).path)
            self._send_error(ApiError(500, "INTERNAL_ERROR", "服务暂时不可用，请稍后重试。"))

    def _dispatch(self) -> None:
        path = unquote(urlsplit(self.path).path).rstrip("/") or "/"
        if path.startswith(PUBLIC_API_PREFIX.rstrip("/")):
            path = path[len(PUBLIC_API_PREFIX.rstrip("/")):] or "/"

        if self.command == "GET" and path == "/health":
            self._send_json(200, {"ok": True, "data": {"status": "ok", "version": API_VERSION}})
            return
        if self.command == "POST" and path == "/auth/register":
            self._register()
            return
        if self.command == "POST" and path == "/auth/login":
            self._login()
            return
        if self.command == "POST" and path == "/auth/logout":
            self._logout()
            return
        if self.command == "GET" and path == "/me":
            self._get_me()
            return
        if self.command == "GET" and path == "/membership/current":
            self._get_membership()
            return
        if self.command == "POST" and path == "/ai/consume":
            self._consume_ai()
            return
        if self.command == "GET" and path == "/payment-qr":
            self._get_payment_qr()
            return
        if self.command == "POST" and path == "/payment-orders":
            self._create_payment_order()
            return
        if self.command == "GET" and path == "/payment-orders/my":
            self._list_my_orders()
            return
        if self.command == "POST" and path == "/redemption-codes/redeem":
            self._redeem_code()
            return
        if self.command == "GET" and path == "/admin/payment-orders":
            self._admin_list_orders()
            return
        match = re.fullmatch(r"/admin/payment-orders/([A-Za-z0-9_-]+)/review", path)
        if self.command == "POST" and match:
            self._admin_review_order(match.group(1))
            return
        if self.command == "POST" and path == "/admin/redemption-codes/generate":
            self._admin_generate_codes()
            return
        if self.command == "GET" and path == "/admin/redemption-codes":
            self._admin_list_codes()
            return
        raise ApiError(404, "NOT_FOUND", "接口不存在。")

    def _validate_origin(self, required: bool) -> str | None:
        origin = self.headers.get("Origin")
        if not origin:
            if required:
                raise ApiError(403, "ORIGIN_REQUIRED", "请求缺少来源校验。")
            return None
        try:
            normalized = normalize_origin(origin)
        except ValueError as exc:
            raise ApiError(403, "ORIGIN_DENIED", "请求来源不受信任。") from exc
        if normalized not in self.server.config.allowed_origins:
            raise ApiError(403, "ORIGIN_DENIED", "请求来源不受信任。")
        return normalized

    def _read_json(self) -> dict[str, Any]:
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            raise ApiError(415, "JSON_REQUIRED", "请求必须使用 application/json。")
        raw_length = self.headers.get("Content-Length")
        try:
            length = int(raw_length or "0")
        except ValueError as exc:
            raise ApiError(400, "INVALID_BODY", "请求体长度无效。") from exc
        if length <= 0 or length > MAX_JSON_BYTES:
            raise ApiError(413 if length > MAX_JSON_BYTES else 400, "INVALID_BODY", "请求体为空或过大。")
        raw = self.rfile.read(length)
        try:
            body = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ApiError(400, "INVALID_JSON", "JSON 格式不正确。") from exc
        if not isinstance(body, dict):
            raise ApiError(400, "INVALID_JSON", "JSON 顶层必须是对象。")
        return body

    def _extract_token(self) -> str:
        authorization = self.headers.get("Authorization", "")
        if authorization:
            match = re.fullmatch(r"Bearer\s+([A-Za-z0-9_-]{32,256})", authorization.strip())
            if not match:
                raise ApiError(401, "UNAUTHORIZED", "登录状态无效。")
            return match.group(1)
        cookie_header = self.headers.get("Cookie", "")
        if cookie_header:
            cookie = SimpleCookie()
            try:
                cookie.load(cookie_header)
            except Exception as exc:
                raise ApiError(401, "UNAUTHORIZED", "登录状态无效。") from exc
            morsel = cookie.get(COOKIE_NAME)
            if morsel and re.fullmatch(r"[A-Za-z0-9_-]{32,256}", morsel.value):
                return morsel.value
        raise ApiError(401, "UNAUTHORIZED", "请先登录。")

    def _authenticate(self, connection: sqlite3.Connection, admin: bool = False) -> tuple[sqlite3.Row, str]:
        token = self._extract_token()
        row = connection.execute(
            """SELECT users.*, sessions.expires_at AS session_expires_at
               FROM sessions JOIN users ON users.id = sessions.user_id
               WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.is_active = 1""",
            (hash_session_token(token), iso_z(now_utc())),
        ).fetchone()
        if not row:
            raise ApiError(401, "UNAUTHORIZED", "登录已失效，请重新登录。")
        if admin and row["role"] != "admin":
            raise ApiError(403, "ADMIN_REQUIRED", "仅平台管理员可执行此操作。")
        return row, token

    def _issue_session(self, connection: sqlite3.Connection, user_id: str) -> tuple[str, str]:
        token = secrets.token_urlsafe(32)
        created = now_utc()
        expires = created + timedelta(days=self.server.config.session_days)
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (hash_session_token(token), user_id, iso_z(created), iso_z(expires)),
        )
        return token, iso_z(expires)

    def _session_cookie(self, token: str, max_age: int) -> str:
        parts = [
            f"{COOKIE_NAME}={token}",
            f"Path={PUBLIC_API_PREFIX}",
            f"Max-Age={max_age}",
            "HttpOnly",
            "SameSite=Lax",
        ]
        if self.server.config.cookie_secure:
            parts.append("Secure")
        return "; ".join(parts)

    def _session_response(self, user: sqlite3.Row, token: str, expires_at: str) -> dict[str, Any]:
        session: dict[str, Any] = {"expiresAt": expires_at}
        if self.headers.get("X-Session-Mode", "").strip().lower() == "bearer":
            session["token"] = token
        return {"user": serialize_user(user), "session": session}

    def _register(self) -> None:
        body = self._read_json()
        email = normalize_email(body.get("email"))
        password = validate_password(body.get("password"))
        display_name = clean_text(body.get("displayName"), "昵称", 1, 80)
        timestamp = iso_z(now_utc())
        user_id = new_id("usr")
        connection = connect_database(self.server.config)
        try:
            try:
                with transaction(connection):
                    connection.execute(
                        """INSERT INTO users
                           (id, email, display_name, password_hash, role, created_at, updated_at)
                           VALUES (?, ?, ?, ?, 'user', ?, ?)""",
                        (
                            user_id, email, display_name,
                            hash_password(password, self.server.config.password_iterations),
                            timestamp, timestamp,
                        ),
                    )
                    token, expires_at = self._issue_session(connection, user_id)
                    audit(connection, user_id, "auth.register", "user", user_id)
            except sqlite3.IntegrityError as exc:
                raise ApiError(409, "EMAIL_EXISTS", "该邮箱已注册。") from exc
            user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            headers = {
                "Set-Cookie": self._session_cookie(token, self.server.config.session_days * 86400)
            }
            self._send_json(201, {"ok": True, "data": self._session_response(user, token, expires_at)}, headers)
        finally:
            connection.close()

    def _login(self) -> None:
        body = self._read_json()
        email = normalize_email(body.get("email"))
        password = body.get("password")
        if not isinstance(password, str) or len(password) > 128:
            raise ApiError(401, "INVALID_CREDENTIALS", "邮箱或密码不正确。")
        connection = connect_database(self.server.config)
        try:
            user = connection.execute(
                "SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email,)
            ).fetchone()
            encoded = user["password_hash"] if user else DUMMY_PASSWORD_HASH
            password_matches = verify_password(password, encoded)
            if not user or not user["is_active"] or not password_matches:
                # Keep the response generic to avoid account enumeration.
                raise ApiError(401, "INVALID_CREDENTIALS", "邮箱或密码不正确。")
            with transaction(connection):
                connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (iso_z(now_utc()),))
                token, expires_at = self._issue_session(connection, user["id"])
                audit(connection, user["id"], "auth.login", "user", user["id"])
            headers = {
                "Set-Cookie": self._session_cookie(token, self.server.config.session_days * 86400)
            }
            self._send_json(200, {"ok": True, "data": self._session_response(user, token, expires_at)}, headers)
        finally:
            connection.close()

    def _logout(self) -> None:
        connection = connect_database(self.server.config)
        try:
            user, token = self._authenticate(connection)
            with transaction(connection):
                connection.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_session_token(token),))
                audit(connection, user["id"], "auth.logout", "user", user["id"])
            headers = {"Set-Cookie": self._session_cookie("", 0)}
            self._send_json(200, {"ok": True, "data": {"loggedOut": True}}, headers)
        finally:
            connection.close()

    def _get_me(self) -> None:
        connection = connect_database(self.server.config)
        try:
            user, _ = self._authenticate(connection)
            snapshot = membership_snapshot(connection, user["id"])
            self._send_json(
                200,
                {"ok": True, "data": {
                    "user": serialize_user(user),
                    "membership": snapshot,
                    "aiUsage": ai_usage_decision(connection, user["id"], snapshot),
                }},
            )
        finally:
            connection.close()

    def _get_membership(self) -> None:
        connection = connect_database(self.server.config)
        try:
            user, _ = self._authenticate(connection)
            snapshot = membership_snapshot(connection, user["id"])
            snapshot["aiUsage"] = ai_usage_decision(connection, user["id"], snapshot)
            self._send_json(200, {"ok": True, "data": snapshot})
        finally:
            connection.close()

    def _consume_ai(self) -> None:
        # A JSON object is required even though no input fields are currently needed.
        self._read_json()
        connection = connect_database(self.server.config)
        try:
            user, _ = self._authenticate(connection)
            current = now_utc()
            with transaction(connection):
                snapshot = membership_snapshot(connection, user["id"], current)
                decision = ai_usage_decision(connection, user["id"], snapshot, current)
                if decision["mode"] == "blocked":
                    raise ApiError(403, "MEMBERSHIP_REQUIRED", "使用 AI 工具需要 PRO 或 Max 会员。")
                if not decision["allowed"]:
                    raise ApiError(429, "AI_QUOTA_EXHAUSTED", "本月 AI 使用次数已用完。")
                if decision["mode"] == "unlimited":
                    self._send_json(200, {"ok": True, "data": decision})
                    return
                period = decision["period"]
                timestamp = iso_z(current)
                connection.execute(
                    """INSERT INTO ai_usage (user_id, period, used_runs, updated_at)
                       VALUES (?, ?, 1, ?)
                       ON CONFLICT(user_id, period) DO UPDATE
                       SET used_runs = used_runs + 1, updated_at = excluded.updated_at""",
                    (user["id"], period, timestamp),
                )
                updated = ai_usage_decision(connection, user["id"], snapshot, current)
            self._send_json(200, {"ok": True, "data": updated})
        finally:
            connection.close()

    def _get_payment_qr(self) -> None:
        connection = connect_database(self.server.config)
        try:
            self._authenticate(connection)
        finally:
            connection.close()
        path = self.server.config.payment_qr_path
        try:
            size = path.stat().st_size
            if size <= 0 or size > 8 * 1024 * 1024:
                raise OSError("QR image has an invalid size")
            payload = path.read_bytes()
        except OSError as exc:
            raise ApiError(503, "PAYMENT_QR_UNAVAILABLE", "企业收款码暂不可用。") from exc
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "private, no-store")
        self.end_headers()
        self.wfile.write(payload)

    def _create_payment_order(self) -> None:
        body = self._read_json()
        plan_id = body.get("planId")
        plan = PLANS.get(plan_id) if isinstance(plan_id, str) else None
        if not plan:
            raise ApiError(400, "INVALID_PLAN", "会员套餐无效。")
        payer_name = clean_text(body.get("payerName"), "付款人名称", 1, 80)
        payment_reference = clean_text(body.get("paymentReference"), "付款凭证号", 4, 80).upper()
        customer_note = optional_text(body.get("customerNote"), "备注", 500)
        connection = connect_database(self.server.config)
        try:
            user, _ = self._authenticate(connection)
            order_id = new_id("ord")
            try:
                with transaction(connection):
                    connection.execute(
                        """INSERT INTO payment_orders
                           (id, user_id, plan_id, tier, amount_fen, currency, payer_name,
                            payment_reference, customer_note, status, created_at)
                           VALUES (?, ?, ?, ?, ?, 'CNY', ?, ?, ?, 'pending', ?)""",
                        (
                            order_id, user["id"], plan_id, plan["tier"], plan["amountFen"],
                            payer_name, payment_reference, customer_note, iso_z(now_utc()),
                        ),
                    )
                    audit(connection, user["id"], "payment.submit", "payment_order", order_id,
                          {"planId": plan_id})
            except sqlite3.IntegrityError as exc:
                existing = connection.execute(
                    """SELECT * FROM payment_orders
                       WHERE lower(payment_reference) = lower(?)
                         AND status IN ('pending', 'approved')""",
                    (payment_reference,),
                ).fetchone()
                if existing and existing["user_id"] == user["id"] and existing["plan_id"] == plan_id:
                    self._send_json(200, {"ok": True, "data": {"order": serialize_order(existing)}})
                    return
                raise ApiError(409, "PAYMENT_REFERENCE_EXISTS", "该付款凭证号已提交。") from exc
            row = connection.execute("SELECT * FROM payment_orders WHERE id = ?", (order_id,)).fetchone()
            self._send_json(201, {"ok": True, "data": {"order": serialize_order(row)}})
        finally:
            connection.close()

    def _list_my_orders(self) -> None:
        connection = connect_database(self.server.config)
        try:
            user, _ = self._authenticate(connection)
            rows = connection.execute(
                "SELECT * FROM payment_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
                (user["id"],),
            ).fetchall()
            self._send_json(200, {"ok": True, "data": {"orders": [serialize_order(row) for row in rows]}})
        finally:
            connection.close()

    def _redeem_code(self) -> None:
        body = self._read_json()
        code = normalize_redemption_code(body.get("code"))
        if not REDEMPTION_RE.fullmatch(code):
            raise ApiError(400, "INVALID_REDEMPTION_CODE", "兑换码格式不正确。")
        code_hash = hash_redemption_code(code)
        connection = connect_database(self.server.config)
        try:
            user, _ = self._authenticate(connection)
            current = now_utc()
            timestamp = iso_z(current)
            with transaction(connection):
                record = connection.execute(
                    "SELECT * FROM redemption_codes WHERE code_hash = ?", (code_hash,)
                ).fetchone()
                if not record:
                    raise ApiError(404, "REDEMPTION_CODE_NOT_FOUND", "兑换码无效。")
                if record["status"] == "redeemed":
                    raise ApiError(409, "REDEMPTION_CODE_USED", "兑换码已被使用。")
                if record["status"] == "revoked":
                    raise ApiError(409, "REDEMPTION_CODE_REVOKED", "兑换码已失效。")
                if record["expires_at"] and parse_instant(record["expires_at"]) <= current:
                    raise ApiError(409, "REDEMPTION_CODE_EXPIRED", "兑换码已过期。")
                starts = next_coverage_start(connection, user["id"], current, tier=None)
                expires = add_calendar_months(starts, 6)
                grant_id = new_id("grt")
                ledger_id = new_id("rdm")
                cursor = connection.execute(
                    """UPDATE redemption_codes
                       SET status = 'redeemed', redeemed_at = ?, redeemed_by_user_id = ?,
                           membership_grant_id = ?
                       WHERE id = ? AND status = 'issued'""",
                    (timestamp, user["id"], grant_id, record["id"]),
                )
                if cursor.rowcount != 1:
                    raise ApiError(409, "REDEMPTION_CODE_USED", "兑换码已被使用。")
                connection.execute(
                    """INSERT INTO membership_grants
                       (id, user_id, tier, source, plan_id, starts_at, expires_at,
                        redemption_code_id, payment_order_id, created_at)
                       VALUES (?, ?, 'pro', 'redemption_code', NULL, ?, ?, ?, NULL, ?)""",
                    (grant_id, user["id"], iso_z(starts), iso_z(expires), record["id"], timestamp),
                )
                connection.execute(
                    """INSERT INTO redemption_ledger
                       (id, code_id, user_id, membership_grant_id, redeemed_at)
                       VALUES (?, ?, ?, ?, ?)""",
                    (ledger_id, record["id"], user["id"], grant_id, timestamp),
                )
                audit(connection, user["id"], "redemption.redeem", "redemption_code", record["id"])
                snapshot = membership_snapshot(connection, user["id"], current)
            self._send_json(200, {"ok": True, "data": {
                "membership": snapshot,
                "redemption": {"codeId": record["id"], "benefit": record["benefit"],
                               "membershipGrantId": grant_id},
            }})
        finally:
            connection.close()

    def _admin_list_orders(self) -> None:
        query = parse_qs(urlsplit(self.path).query)
        status = (query.get("status") or ["pending"])[0]
        if status not in {"pending", "approved", "rejected", "all"}:
            raise ApiError(400, "INVALID_STATUS", "订单状态无效。")
        connection = connect_database(self.server.config)
        try:
            self._authenticate(connection, admin=True)
            if status == "all":
                rows = connection.execute(
                    "SELECT * FROM payment_orders ORDER BY created_at DESC LIMIT 500"
                ).fetchall()
            else:
                rows = connection.execute(
                    "SELECT * FROM payment_orders WHERE status = ? ORDER BY created_at ASC LIMIT 500",
                    (status,),
                ).fetchall()
            self._send_json(200, {"ok": True, "data": {"orders": [serialize_order(row) for row in rows]}})
        finally:
            connection.close()

    def _admin_review_order(self, order_id: str) -> None:
        if not SAFE_ID_RE.fullmatch(order_id):
            raise ApiError(400, "INVALID_ORDER", "订单编号无效。")
        body = self._read_json()
        decision = body.get("decision")
        if decision not in {"approved", "rejected"}:
            raise ApiError(400, "INVALID_DECISION", "审核结果必须为 approved 或 rejected。")
        review_note = optional_text(body.get("reviewNote"), "审核备注", 500)
        connection = connect_database(self.server.config)
        try:
            admin, _ = self._authenticate(connection, admin=True)
            current = now_utc()
            timestamp = iso_z(current)
            snapshot: dict[str, Any] | None = None
            with transaction(connection):
                order = connection.execute(
                    "SELECT * FROM payment_orders WHERE id = ?", (order_id,)
                ).fetchone()
                if not order:
                    raise ApiError(404, "ORDER_NOT_FOUND", "付款订单不存在。")
                if order["status"] != "pending":
                    raise ApiError(409, "ORDER_ALREADY_REVIEWED", "该订单已经审核。")
                grant_id: str | None = None
                if decision == "approved":
                    plan = PLANS[order["plan_id"]]
                    current_membership = membership_snapshot(connection, order["user_id"], current)
                    # Max is an immediate upgrade over PRO. A lower-tier PRO pass
                    # bought while Max is active is queued after all paid coverage
                    # instead of being silently consumed underneath Max.
                    coverage_tier = None if (
                        plan["tier"] == "pro" and current_membership["tier"] == "max"
                    ) else plan["tier"]
                    starts = next_coverage_start(
                        connection, order["user_id"], current, tier=coverage_tier
                    )
                    expires = add_calendar_months(starts, plan["durationMonths"])
                    grant_id = new_id("grt")
                    connection.execute(
                        """INSERT INTO membership_grants
                           (id, user_id, tier, source, plan_id, starts_at, expires_at,
                            redemption_code_id, payment_order_id, created_at)
                           VALUES (?, ?, ?, 'purchase', ?, ?, ?, NULL, ?, ?)""",
                        (
                            grant_id, order["user_id"], plan["tier"], order["plan_id"],
                            iso_z(starts), iso_z(expires), order_id, timestamp,
                        ),
                    )
                cursor = connection.execute(
                    """UPDATE payment_orders SET status = ?, reviewed_at = ?, reviewed_by = ?,
                       review_note = ?, membership_grant_id = ?
                       WHERE id = ? AND status = 'pending'""",
                    (decision, timestamp, admin["id"], review_note, grant_id, order_id),
                )
                if cursor.rowcount != 1:
                    raise ApiError(409, "ORDER_ALREADY_REVIEWED", "该订单已经审核。")
                audit(connection, admin["id"], f"payment.{decision}", "payment_order", order_id,
                      {"planId": order["plan_id"]})
                if decision == "approved":
                    snapshot = membership_snapshot(connection, order["user_id"], current)
            updated = connection.execute("SELECT * FROM payment_orders WHERE id = ?", (order_id,)).fetchone()
            data: dict[str, Any] = {"order": serialize_order(updated)}
            if snapshot is not None:
                data["membership"] = snapshot
            self._send_json(200, {"ok": True, "data": data})
        finally:
            connection.close()

    def _admin_generate_codes(self) -> None:
        body = self._read_json()
        count = body.get("count")
        if isinstance(count, bool) or not isinstance(count, int) or not 1 <= count <= 500:
            raise ApiError(400, "INVALID_COUNT", "单次可生成 1–500 个兑换码。")
        enterprise_id = clean_text(body.get("enterpriseId"), "企业标识", 2, 100)
        campaign_id = optional_text(body.get("campaignId"), "批次标识", 100) or (
            f"enterprise-{now_utc().astimezone(SHANGHAI_TZ):%Y%m%d}"
        )
        expires_at_raw = body.get("expiresAt")
        expires_at: str | None = None
        if expires_at_raw is not None:
            try:
                expiry = parse_instant(expires_at_raw)
            except (ValueError, TypeError) as exc:
                raise ApiError(400, "INVALID_EXPIRY", "兑换码到期时间无效。") from exc
            if expiry <= now_utc() + timedelta(minutes=1):
                raise ApiError(400, "INVALID_EXPIRY", "兑换码到期时间必须晚于当前时间。")
            expires_at = iso_z(expiry)
        connection = connect_database(self.server.config)
        try:
            admin, _ = self._authenticate(connection, admin=True)
            timestamp = iso_z(now_utc())
            generated: list[dict[str, Any]] = []
            alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
            with transaction(connection):
                for _ in range(count):
                    for _attempt in range(10):
                        code = "KUAKUA-PRO-6M-" + "".join(secrets.choice(alphabet) for _ in range(16))
                        code_id = new_id("red")
                        try:
                            connection.execute(
                                """INSERT INTO redemption_codes
                                   (id, code_hash, enterprise_id, campaign_id, benefit, status,
                                    issued_at, expires_at)
                                   VALUES (?, ?, ?, ?, 'pro-six-calendar-months', 'issued', ?, ?)""",
                                (
                                    code_id, hash_redemption_code(code), enterprise_id,
                                    campaign_id, timestamp, expires_at,
                                ),
                            )
                            generated.append({"id": code_id, "code": code, "expiresAt": expires_at})
                            break
                        except sqlite3.IntegrityError:
                            continue
                    else:
                        raise RuntimeError("Unable to generate a unique redemption code")
                audit(connection, admin["id"], "redemption.generate", "enterprise", enterprise_id,
                      {"count": count, "campaignId": campaign_id, "expiresAt": expires_at})
            self._send_json(201, {"ok": True, "data": {
                "codes": generated,
                "benefit": "pro-six-calendar-months",
                "enterpriseId": enterprise_id,
                "campaignId": campaign_id,
            }})
        finally:
            connection.close()

    def _admin_list_codes(self) -> None:
        query = parse_qs(urlsplit(self.path).query)
        status = (query.get("status") or ["all"])[0]
        if status not in {"issued", "redeemed", "revoked", "all"}:
            raise ApiError(400, "INVALID_STATUS", "兑换码状态无效。")
        connection = connect_database(self.server.config)
        try:
            self._authenticate(connection, admin=True)
            sql = """SELECT id, enterprise_id, campaign_id, benefit, status, issued_at,
                            expires_at, redeemed_at, redeemed_by_user_id, membership_grant_id
                     FROM redemption_codes"""
            params: tuple[Any, ...] = ()
            if status != "all":
                sql += " WHERE status = ?"
                params = (status,)
            sql += " ORDER BY issued_at DESC LIMIT 1000"
            rows = connection.execute(sql, params).fetchall()
            codes = [
                {
                    "id": row["id"], "enterpriseId": row["enterprise_id"],
                    "campaignId": row["campaign_id"], "benefit": row["benefit"],
                    "status": row["status"], "issuedAt": row["issued_at"],
                    "expiresAt": row["expires_at"], "redeemedAt": row["redeemed_at"],
                    "redeemedByUserId": row["redeemed_by_user_id"],
                    "membershipGrantId": row["membership_grant_id"],
                }
                for row in rows
            ]
            self._send_json(200, {"ok": True, "data": {"codes": codes}})
        finally:
            connection.close()

    def _send_json(
        self, status: int, document: dict[str, Any], headers: dict[str, str] | None = None
    ) -> None:
        payload = json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(payload)

    def _send_error(self, error: ApiError) -> None:
        self._send_json(
            error.status,
            {"ok": False, "error": {"code": error.code, "message": error.message}},
        )

    def end_headers(self) -> None:
        origin = self.headers.get("Origin")
        if origin:
            try:
                normalized = normalize_origin(origin)
                if normalized in self.server.config.allowed_origins:
                    self.send_header("Access-Control-Allow-Origin", normalized)
                    self.send_header("Access-Control-Allow-Credentials", "true")
                    self.send_header("Vary", "Origin")
            except ValueError:
                pass
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        super().end_headers()

    def log_request(self, code: int | str = "-", size: int | str = "-") -> None:
        # Never log query strings, request bodies, credentials, tokens, or raw codes.
        LOGGER.info("request method=%s path=%s status=%s", self.command, urlsplit(self.path).path, code)

    def log_message(self, fmt: str, *args: Any) -> None:
        return


def build_server(config: Config) -> KuakuaServer:
    initialize_database(config)
    return KuakuaServer((config.host, config.port), config)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Kuakua AI membership API")
    parser.add_argument("--check", action="store_true", help="initialize the database, validate config, then exit")
    args = parser.parse_args(argv)
    logging.basicConfig(
        level=os.environ.get("KUAKUA_LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    try:
        config = Config.from_env()
        initialize_database(config)
    except Exception as exc:
        LOGGER.error("Configuration or database initialization failed: %s", exc)
        return 2
    if args.check:
        LOGGER.info("Configuration and database are ready")
        return 0
    server = KuakuaServer((config.host, config.port), config)
    LOGGER.info("Kuakua membership API listening on %s:%d", config.host, config.port)
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
