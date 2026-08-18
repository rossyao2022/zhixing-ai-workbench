import {
  MEMBERSHIP_PLANS,
  PRO_SIX_MONTH_REDEMPTION_BENEFIT,
  addCalendarMonths,
  addGrantToWallet,
  createMembershipWallet,
  createPlanGrant,
  deserializeMembershipWallet,
  getAiUsageDecision,
  hashRedemptionCode,
  isMembershipWallet,
  normalizeRedemptionCode,
  recordAiToolRun,
  redeemProSixMonthCode,
  resolveMembership,
  serializeMembershipWallet,
  type AiUsageCounter,
  type MembershipGrant,
  type MembershipPlanId,
  type MembershipSnapshot,
  type MembershipWallet,
  type RedemptionCodeRecord,
  type RedemptionLedgerEntry,
} from "./membership";
import { readLocalValue, writeLocalValue } from "./safeStorage";

const WALLETS_KEY = "kuakua-ai.membership-wallets.v1";
const AI_USAGE_KEY = "kuakua-ai.ai-usage.v1";
const PAYMENT_ORDERS_KEY = "kuakua-ai.payment-orders.v1";
const REDEMPTION_CODES_KEY = "kuakua-ai.redemption-codes.v1";
const REDEMPTION_LEDGER_KEY = "kuakua-ai.redemption-ledger.v1";

export const DEMO_REDEMPTION_CODE = "KUAKUA-PRO-6M-DEMO";

function localDemoAccessEnabled() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function isDemoUserId(userId: string) {
  return userId === "demo-learner" || userId === "demo-mentor" || userId === "demo-admin";
}

export type PaymentOrderStatus = "pending" | "approved" | "rejected";

export type PaymentOrder = {
  schemaVersion: 1;
  id: string;
  userId: string;
  planId: MembershipPlanId;
  amountFen: number;
  payerName: string;
  paymentReference: string;
  status: PaymentOrderStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  membershipGrantId: string | null;
};

export type RedemptionAttempt =
  | { ok: true; snapshot: MembershipSnapshot }
  | {
      ok: false;
      reason: "invalid" | "not_found" | "already_redeemed" | "revoked" | "expired";
    };

function safeParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function makeId(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function loadWallets() {
  const parsed = safeParse(readLocalValue(WALLETS_KEY));
  if (!Array.isArray(parsed)) return [] as MembershipWallet[];
  return parsed.filter(isMembershipWallet);
}

function saveWallets(wallets: MembershipWallet[]) {
  writeLocalValue(WALLETS_KEY, JSON.stringify(wallets.map((wallet) => JSON.parse(serializeMembershipWallet(wallet)))));
}

function demoWallet(userId: string): MembershipWallet | null {
  const tier = userId === "demo-admin" ? "max" : userId === "demo-learner" || userId === "demo-mentor" ? "pro" : null;
  if (!tier) return null;
  const startsAt = "2026-01-01T00:00:00.000Z";
  const grant: MembershipGrant = {
    schemaVersion: 1,
    id: `demo-${tier}-grant`,
    userId,
    tier,
    source: "manual_grant",
    planId: null,
    startsAt,
    expiresAt: "2036-01-01T00:00:00.000Z",
    redemptionCodeId: null,
    createdAt: startsAt,
  };
  return addGrantToWallet(createMembershipWallet(userId, startsAt), grant, startsAt);
}

export function loadMembershipWallet(userId: string) {
  if (!localDemoAccessEnabled() && isDemoUserId(userId)) return createMembershipWallet(userId);
  const stored = loadWallets().find((wallet) => wallet.userId === userId) ?? null;
  if (stored) return deserializeMembershipWallet(serializeMembershipWallet(stored)) ?? createMembershipWallet(userId);
  const seeded = localDemoAccessEnabled() ? demoWallet(userId) : null;
  if (seeded) saveMembershipWallet(seeded);
  return seeded ?? createMembershipWallet(userId);
}

export function saveMembershipWallet(wallet: MembershipWallet) {
  const wallets = loadWallets();
  const next = wallets.some((item) => item.userId === wallet.userId)
    ? wallets.map((item) => (item.userId === wallet.userId ? wallet : item))
    : [...wallets, wallet];
  saveWallets(next);
}

export function loadMembershipSnapshot(userId: string, now: string | Date = new Date()) {
  return resolveMembership(loadMembershipWallet(userId), now);
}

function isAiUsageCounter(value: unknown): value is AiUsageCounter {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    typeof value.userId === "string" &&
    typeof value.period === "string" &&
    typeof value.usedRuns === "number" &&
    Number.isFinite(value.usedRuns) &&
    value.usedRuns >= 0 &&
    typeof value.updatedAt === "string"
  );
}

function loadAiCounters() {
  const parsed = safeParse(readLocalValue(AI_USAGE_KEY));
  return Array.isArray(parsed) ? parsed.filter(isAiUsageCounter) : [];
}

export function loadAiUsage(userId: string) {
  return loadAiCounters().find((counter) => counter.userId === userId) ?? null;
}

export function getUserAiDecision(userId: string, now: string | Date = new Date()) {
  return getAiUsageDecision(loadMembershipWallet(userId), loadAiUsage(userId), now);
}

export function consumeAiToolRun(userId: string, now: string | Date = new Date()) {
  const wallet = loadMembershipWallet(userId);
  const counters = loadAiCounters();
  const current = counters.find((counter) => counter.userId === userId) ?? null;
  const next = recordAiToolRun(userId, wallet, current, now);
  const updated = counters.some((counter) => counter.userId === userId)
    ? counters.map((counter) => (counter.userId === userId ? next : counter))
    : [...counters, next];
  writeLocalValue(AI_USAGE_KEY, JSON.stringify(updated));
  return getAiUsageDecision(wallet, next, now);
}

function isPaymentOrder(value: unknown): value is PaymentOrder {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    typeof value.id === "string" &&
    typeof value.userId === "string" &&
    typeof value.planId === "string" &&
    value.planId in MEMBERSHIP_PLANS &&
    typeof value.amountFen === "number" &&
    typeof value.payerName === "string" &&
    typeof value.paymentReference === "string" &&
    (value.status === "pending" || value.status === "approved" || value.status === "rejected") &&
    typeof value.createdAt === "string" &&
    (value.reviewedAt === null || typeof value.reviewedAt === "string") &&
    (value.reviewedByUserId === null || typeof value.reviewedByUserId === "string") &&
    (value.membershipGrantId === null || typeof value.membershipGrantId === "string")
  );
}

export function loadPaymentOrders() {
  const parsed = safeParse(readLocalValue(PAYMENT_ORDERS_KEY));
  return Array.isArray(parsed)
    ? parsed.filter(isPaymentOrder).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
}

function savePaymentOrders(orders: PaymentOrder[]) {
  writeLocalValue(PAYMENT_ORDERS_KEY, JSON.stringify(orders));
}

export function createPaymentOrder(input: {
  userId: string;
  planId: MembershipPlanId;
  payerName: string;
  paymentReference?: string;
}) {
  const existingOrders = loadPaymentOrders();
  const payerName = input.payerName.trim().slice(0, 80);
  const paymentReference = (input.paymentReference ?? "").trim().toUpperCase().slice(0, 80);
  const duplicateReference = paymentReference
    ? existingOrders.find(
        (order) => order.paymentReference.toUpperCase() === paymentReference && order.status !== "rejected",
      )
    : null;
  const existing = existingOrders.find(
    (order) => order.userId === input.userId && order.planId === input.planId && order.status === "pending",
  );
  if (duplicateReference && duplicateReference.id !== existing?.id) {
    throw new Error("This payment reference already belongs to another order");
  }
  if (existing) {
    const updated: PaymentOrder = {
      ...existing,
      payerName,
      paymentReference: paymentReference || existing.paymentReference,
    };
    savePaymentOrders(existingOrders.map((order) => (order.id === existing.id ? updated : order)));
    return updated;
  }
  const now = new Date().toISOString();
  const order: PaymentOrder = {
    schemaVersion: 1,
    id: makeId("order"),
    userId: input.userId,
    planId: input.planId,
    amountFen: MEMBERSHIP_PLANS[input.planId].priceFen,
    payerName,
    paymentReference,
    status: "pending",
    createdAt: now,
    reviewedAt: null,
    reviewedByUserId: null,
    membershipGrantId: null,
  };
  savePaymentOrders([order, ...existingOrders]);
  return order;
}

function purchaseStart(wallet: MembershipWallet, planId: MembershipPlanId, now: string) {
  const current = resolveMembership(wallet, now);
  const targetTier = MEMBERSHIP_PLANS[planId].tier;
  const shouldQueue =
    current.status === "active" &&
    current.expiresAt &&
    (current.tier === targetTier || (current.tier === "max" && targetTier === "pro"));
  if (!shouldQueue) return now;
  let coverageEnd = Date.parse(current.expiresAt!);
  let changed = true;
  while (changed) {
    changed = false;
    wallet.grants
      .filter((grant) => grant.tier === targetTier)
      .forEach((grant) => {
        const startsAt = Date.parse(grant.startsAt);
        const expiresAt = Date.parse(grant.expiresAt);
        if (startsAt <= coverageEnd && expiresAt > coverageEnd) {
          coverageEnd = expiresAt;
          changed = true;
        }
      });
  }
  return new Date(coverageEnd).toISOString();
}

export function reviewPaymentOrder(orderId: string, reviewerUserId: string, approve: boolean) {
  const orders = loadPaymentOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order || order.status !== "pending") return null;
  const now = new Date().toISOString();
  let grantId: string | null = null;
  if (approve) {
    const wallet = loadMembershipWallet(order.userId);
    const grant = createPlanGrant({
      id: makeId("grant"),
      userId: order.userId,
      planId: order.planId,
      startsAt: purchaseStart(wallet, order.planId, now),
      createdAt: now,
    });
    saveMembershipWallet(addGrantToWallet(wallet, grant, now));
    grantId = grant.id;
  }
  const reviewed: PaymentOrder = {
    ...order,
    status: approve ? "approved" : "rejected",
    reviewedAt: now,
    reviewedByUserId: reviewerUserId,
    membershipGrantId: grantId,
  };
  savePaymentOrders(orders.map((item) => (item.id === orderId ? reviewed : item)));
  return reviewed;
}

function isRedemptionCodeRecord(value: unknown): value is RedemptionCodeRecord {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    typeof value.id === "string" &&
    typeof value.version === "number" &&
    typeof value.codeHash === "string" &&
    typeof value.campaignId === "string" &&
    value.benefit === PRO_SIX_MONTH_REDEMPTION_BENEFIT &&
    (value.status === "issued" || value.status === "redeemed" || value.status === "revoked") &&
    (value.enterpriseId === null || typeof value.enterpriseId === "string") &&
    typeof value.issuedAt === "string" &&
    (value.expiresAt === null || typeof value.expiresAt === "string") &&
    (value.redeemedAt === null || typeof value.redeemedAt === "string") &&
    (value.redeemedByUserId === null || typeof value.redeemedByUserId === "string") &&
    (value.membershipGrantId === null || typeof value.membershipGrantId === "string")
  );
}

export function loadRedemptionCodes() {
  const parsed = safeParse(readLocalValue(REDEMPTION_CODES_KEY));
  return Array.isArray(parsed) ? parsed.filter(isRedemptionCodeRecord) : [];
}

function saveRedemptionCodes(codes: RedemptionCodeRecord[]) {
  writeLocalValue(REDEMPTION_CODES_KEY, JSON.stringify(codes));
}

function loadRedemptionLedger() {
  const parsed = safeParse(readLocalValue(REDEMPTION_LEDGER_KEY));
  return Array.isArray(parsed) ? (parsed as RedemptionLedgerEntry[]) : [];
}

function saveRedemptionLedger(entries: RedemptionLedgerEntry[]) {
  writeLocalValue(REDEMPTION_LEDGER_KEY, JSON.stringify(entries));
}

function randomCodeToken(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function createEnterpriseRedemptionCodes(input: {
  enterpriseName: string;
  count: number;
}) {
  const count = Math.max(1, Math.min(100, Math.trunc(input.count)));
  const issuedAt = new Date().toISOString();
  const campaignId = makeId("enterprise-campaign");
  const enterpriseName = input.enterpriseName.trim().slice(0, 100) || "企业客户";
  const existing = loadRedemptionCodes();
  const rawCodes: string[] = [];
  const records: RedemptionCodeRecord[] = [];
  for (let index = 0; index < count; index += 1) {
    const raw = `KUAKUA-PRO-6M-${randomCodeToken()}`;
    rawCodes.push(raw);
    records.push({
      schemaVersion: 1,
      id: makeId("code"),
      version: 1,
      codeHash: await hashRedemptionCode(raw),
      campaignId,
      benefit: PRO_SIX_MONTH_REDEMPTION_BENEFIT,
      status: "issued",
      enterpriseId: enterpriseName,
      issuedAt,
      expiresAt: addCalendarMonths(issuedAt, 12),
      redeemedAt: null,
      redeemedByUserId: null,
      membershipGrantId: null,
    });
  }
  saveRedemptionCodes([...records, ...existing]);
  return { campaignId, enterpriseName, rawCodes };
}

async function ensureDemoCode(allowDemoCode: boolean) {
  if (!allowDemoCode) return;
  const codes = loadRedemptionCodes();
  if (codes.some((code) => code.campaignId === "local-qa-demo")) return;
  const now = new Date().toISOString();
  const demo: RedemptionCodeRecord = {
    schemaVersion: 1,
    id: "local-qa-demo-code",
    version: 1,
    codeHash: await hashRedemptionCode(DEMO_REDEMPTION_CODE),
    campaignId: "local-qa-demo",
    benefit: PRO_SIX_MONTH_REDEMPTION_BENEFIT,
    status: "issued",
    enterpriseId: "LOCAL QA ONLY",
    issuedAt: now,
    expiresAt: addCalendarMonths(now, 12),
    redeemedAt: null,
    redeemedByUserId: null,
    membershipGrantId: null,
  };
  saveRedemptionCodes([demo, ...codes]);
}

export async function redeemMembershipCode(input: {
  userId: string;
  presentedCode: string;
  allowDemoCode?: boolean;
}): Promise<RedemptionAttempt> {
  const normalized = normalizeRedemptionCode(input.presentedCode);
  if (!/^KUAKUA-PRO-6M-[A-Z0-9]{4,24}$/.test(normalized)) return { ok: false, reason: "invalid" };
  await ensureDemoCode(Boolean(input.allowDemoCode && normalized === DEMO_REDEMPTION_CODE));
  const presentedHash = await hashRedemptionCode(normalized);
  const codes = loadRedemptionCodes();
  const code = codes.find((item) => item.codeHash.toLowerCase() === presentedHash.toLowerCase());
  if (!code) return { ok: false, reason: "not_found" };
  const now = new Date().toISOString();
  const wallet = loadMembershipWallet(input.userId);
  const result = redeemProSixMonthCode({
    wallet,
    code,
    presentedCode: normalized,
    presentedCodeHash: presentedHash,
    redeemedAt: now,
    grantId: makeId("grant"),
    ledgerEntryId: makeId("redemption"),
  });
  if (!result.ok) {
    const reason = result.reason === "code_mismatch" || result.reason === "invalid_code_format" ? "invalid" : result.reason;
    return { ok: false, reason };
  }
  saveMembershipWallet(result.wallet);
  saveRedemptionCodes(codes.map((item) => (item.id === result.code.id ? result.code : item)));
  saveRedemptionLedger([result.ledgerEntry, ...loadRedemptionLedger()]);
  return { ok: true, snapshot: resolveMembership(result.wallet, now) };
}
