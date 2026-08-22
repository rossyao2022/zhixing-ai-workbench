PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS payment_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    plan_id TEXT NOT NULL CHECK (
        plan_id IN ('pro-monthly', 'pro-yearly', 'max-monthly', 'max-yearly')
    ),
    tier TEXT NOT NULL CHECK (tier IN ('pro', 'max')),
    amount_fen INTEGER NOT NULL CHECK (amount_fen > 0),
    currency TEXT NOT NULL DEFAULT 'CNY' CHECK (currency = 'CNY'),
    payer_name TEXT NOT NULL,
    payment_reference TEXT NOT NULL,
    customer_note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TEXT NOT NULL,
    reviewed_at TEXT,
    reviewed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
    review_note TEXT,
    membership_grant_id TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_reference_live_unique
    ON payment_orders(lower(payment_reference))
    WHERE status IN ('pending', 'approved');

CREATE TABLE IF NOT EXISTS redemption_codes (
    id TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL UNIQUE,
    enterprise_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    benefit TEXT NOT NULL DEFAULT 'pro-six-calendar-months'
        CHECK (benefit = 'pro-six-calendar-months'),
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'redeemed', 'revoked')),
    issued_at TEXT NOT NULL,
    expires_at TEXT,
    redeemed_at TEXT,
    redeemed_by_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
    membership_grant_id TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_enterprise
    ON redemption_codes(enterprise_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_status
    ON redemption_codes(status, issued_at DESC);

CREATE TABLE IF NOT EXISTS membership_grants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    tier TEXT NOT NULL CHECK (tier IN ('pro', 'max')),
    source TEXT NOT NULL CHECK (source IN ('purchase', 'redemption_code', 'manual_grant')),
    plan_id TEXT CHECK (
        plan_id IS NULL OR plan_id IN ('pro-monthly', 'pro-yearly', 'max-monthly', 'max-yearly')
    ),
    starts_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    redemption_code_id TEXT UNIQUE REFERENCES redemption_codes(id) ON DELETE RESTRICT,
    payment_order_id TEXT UNIQUE REFERENCES payment_orders(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL,
    CHECK (expires_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_membership_grants_user_time
    ON membership_grants(user_id, starts_at, expires_at);

CREATE TABLE IF NOT EXISTS ai_usage (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    used_runs INTEGER NOT NULL DEFAULT 0 CHECK (used_runs >= 0),
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, period)
);

-- Idempotency and quota-reservation metadata only. Learner material and model
-- answers are intentionally never persisted here.
CREATE TABLE IF NOT EXISTS ai_runs (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    model TEXT NOT NULL CHECK (model IN ('deepseek-v4-flash', 'deepseek-v4-pro')),
    status TEXT NOT NULL CHECK (status IN ('reserved', 'succeeded', 'failed')),
    quota_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quota_reserved IN (0, 1)),
    error_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, request_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_runs_user_time ON ai_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_runs_status_time ON ai_runs(status, updated_at ASC);

CREATE TABLE IF NOT EXISTS redemption_ledger (
    id TEXT PRIMARY KEY,
    code_id TEXT NOT NULL UNIQUE REFERENCES redemption_codes(id) ON DELETE RESTRICT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    membership_grant_id TEXT NOT NULL UNIQUE REFERENCES membership_grants(id) ON DELETE RESTRICT,
    redeemed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    created_at TEXT NOT NULL,
    detail_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_events_time ON audit_events(created_at DESC);
