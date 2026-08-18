export type MembershipTier = "free" | "pro" | "max";

export type PaidMembershipTier = Exclude<MembershipTier, "free">;

export type MembershipPlanId =
  | "pro-monthly"
  | "pro-yearly"
  | "max-monthly"
  | "max-yearly";

export type BillingPeriod = "month" | "year";

export type MembershipPlan = {
  id: MembershipPlanId;
  tier: PaidMembershipTier;
  billingPeriod: BillingPeriod;
  priceFen: number;
  currency: "CNY";
  durationMonths: number;
};

export type AiToolPolicy =
  | { mode: "blocked"; monthlyRuns: 0 }
  | { mode: "metered"; monthlyRuns: number }
  | { mode: "unlimited"; monthlyRuns: null };

export type MembershipBenefits = {
  canBrowseAllContent: true;
  canStartLearning: boolean;
  aiTools: AiToolPolicy;
};

/**
 * A PRO member can complete about three guided AI exercises per day.
 * The allowance resets at 00:00 Asia/Shanghai on the first day of every month.
 */
export const PRO_AI_MONTHLY_RUN_LIMIT = 100;

export const MEMBERSHIP_BENEFITS: Readonly<Record<MembershipTier, MembershipBenefits>> = {
  free: {
    canBrowseAllContent: true,
    canStartLearning: false,
    aiTools: { mode: "blocked", monthlyRuns: 0 },
  },
  pro: {
    canBrowseAllContent: true,
    canStartLearning: true,
    aiTools: { mode: "metered", monthlyRuns: PRO_AI_MONTHLY_RUN_LIMIT },
  },
  max: {
    canBrowseAllContent: true,
    canStartLearning: true,
    aiTools: { mode: "unlimited", monthlyRuns: null },
  },
};

export const MEMBERSHIP_PLANS: Readonly<Record<MembershipPlanId, MembershipPlan>> = {
  "pro-monthly": {
    id: "pro-monthly",
    tier: "pro",
    billingPeriod: "month",
    priceFen: 2_900,
    currency: "CNY",
    durationMonths: 1,
  },
  "pro-yearly": {
    id: "pro-yearly",
    tier: "pro",
    billingPeriod: "year",
    priceFen: 29_900,
    currency: "CNY",
    durationMonths: 12,
  },
  "max-monthly": {
    id: "max-monthly",
    tier: "max",
    billingPeriod: "month",
    priceFen: 9_900,
    currency: "CNY",
    durationMonths: 1,
  },
  "max-yearly": {
    id: "max-yearly",
    tier: "max",
    billingPeriod: "year",
    priceFen: 99_900,
    currency: "CNY",
    durationMonths: 12,
  },
};

export const membershipPlanList = Object.freeze([
  MEMBERSHIP_PLANS["pro-monthly"],
  MEMBERSHIP_PLANS["pro-yearly"],
  MEMBERSHIP_PLANS["max-monthly"],
  MEMBERSHIP_PLANS["max-yearly"],
]);

export type MembershipGrantSource = "purchase" | "redemption_code" | "manual_grant";

/**
 * Paid access is represented as append-only grants. Free access is the absence
 * of an active paid grant, so expired and future grants never need rewriting.
 */
export type MembershipGrant = {
  schemaVersion: 1;
  id: string;
  userId: string;
  tier: PaidMembershipTier;
  source: MembershipGrantSource;
  planId: MembershipPlanId | null;
  startsAt: string;
  expiresAt: string;
  redemptionCodeId: string | null;
  createdAt: string;
};

export type MembershipWallet = {
  schemaVersion: 1;
  userId: string;
  grants: MembershipGrant[];
  updatedAt: string;
};

export type MembershipSnapshot = {
  tier: MembershipTier;
  status: "free" | "scheduled" | "active";
  startsAt: string | null;
  expiresAt: string | null;
  activeGrantIds: string[];
  benefits: MembershipBenefits;
};

export type AiUsageCounter = {
  schemaVersion: 1;
  userId: string;
  period: string;
  usedRuns: number;
  updatedAt: string;
};

export type AiUsageDecision = {
  allowed: boolean;
  mode: AiToolPolicy["mode"];
  period: string;
  usedRuns: number;
  limit: number | null;
  remainingRuns: number | null;
  resetsAt: string;
};

export const PRO_SIX_MONTH_REDEMPTION_BENEFIT = "pro-six-calendar-months" as const;

export type RedemptionCodeStatus = "issued" | "redeemed" | "revoked";

/**
 * Store only the SHA-256 fingerprint of a normalized code. The raw code belongs
 * in the delivery channel used by the purchasing enterprise, never in source.
 * `version` must be checked by the persistence layer in the same transaction
 * that changes `status`, preventing two concurrent one-time redemptions.
 */
export type RedemptionCodeRecord = {
  schemaVersion: 1;
  id: string;
  version: number;
  codeHash: string;
  campaignId: string;
  benefit: typeof PRO_SIX_MONTH_REDEMPTION_BENEFIT;
  status: RedemptionCodeStatus;
  enterpriseId: string | null;
  issuedAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  redeemedByUserId: string | null;
  membershipGrantId: string | null;
};

export type RedemptionLedgerEntry = {
  schemaVersion: 1;
  id: string;
  codeId: string;
  codeVersion: number;
  userId: string;
  membershipGrantId: string;
  redeemedAt: string;
};

export type RedemptionFailureReason =
  | "invalid_code_format"
  | "code_mismatch"
  | "already_redeemed"
  | "revoked"
  | "expired";

export type RedemptionResult =
  | {
      ok: true;
      wallet: MembershipWallet;
      code: RedemptionCodeRecord;
      grant: MembershipGrant;
      ledgerEntry: RedemptionLedgerEntry;
    }
  | { ok: false; reason: RedemptionFailureReason };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPaidTier(value: unknown): value is PaidMembershipTier {
  return value === "pro" || value === "max";
}

function isPlanId(value: unknown): value is MembershipPlanId {
  return (
    value === "pro-monthly" ||
    value === "pro-yearly" ||
    value === "max-monthly" ||
    value === "max-yearly"
  );
}

function isGrantSource(value: unknown): value is MembershipGrantSource {
  return value === "purchase" || value === "redemption_code" || value === "manual_grant";
}

function toTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function toIsoInstant(value: string | Date) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid membership date");
  return date.toISOString();
}

function isIsoInstant(value: unknown): value is string {
  return typeof value === "string" && toTimestamp(value) !== null;
}

function compareGrantStart(a: MembershipGrant, b: MembershipGrant) {
  return Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id);
}

/** Add calendar months in UTC, clamping end-of-month dates (Jan 31 -> Feb 28/29). */
export function addCalendarMonths(value: string | Date, months: number) {
  if (!Number.isInteger(months) || months <= 0) {
    throw new Error("Membership duration must be a positive number of calendar months");
  }

  const date = new Date(toIsoInstant(value));
  const desiredDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(desiredDay, lastDay));
  return date.toISOString();
}

export function createMembershipWallet(userId: string, now: string | Date = new Date()): MembershipWallet {
  if (!userId.trim()) throw new Error("Membership wallet requires a user id");
  return {
    schemaVersion: 1,
    userId,
    grants: [],
    updatedAt: toIsoInstant(now),
  };
}

export function createPlanGrant(input: {
  id: string;
  userId: string;
  planId: MembershipPlanId;
  startsAt: string | Date;
  createdAt?: string | Date;
}): MembershipGrant {
  const plan = MEMBERSHIP_PLANS[input.planId];
  const startsAt = toIsoInstant(input.startsAt);
  const createdAt = toIsoInstant(input.createdAt ?? input.startsAt);
  if (!input.id.trim() || !input.userId.trim()) throw new Error("Membership grant requires ids");

  return {
    schemaVersion: 1,
    id: input.id,
    userId: input.userId,
    tier: plan.tier,
    source: "purchase",
    planId: plan.id,
    startsAt,
    expiresAt: addCalendarMonths(startsAt, plan.durationMonths),
    redemptionCodeId: null,
    createdAt,
  };
}

export function addGrantToWallet(
  wallet: MembershipWallet,
  grant: MembershipGrant,
  now: string | Date = new Date(),
): MembershipWallet {
  if (wallet.userId !== grant.userId) throw new Error("Membership grant belongs to another user");
  if (wallet.grants.some((item) => item.id === grant.id)) throw new Error("Duplicate membership grant id");
  return {
    ...wallet,
    grants: [...wallet.grants, grant].sort(compareGrantStart),
    updatedAt: toIsoInstant(now),
  };
}

function findContinuousExpiry(grants: MembershipGrant[], initialExpiry: number) {
  let coverageEnd = initialExpiry;
  let changed = true;
  while (changed) {
    changed = false;
    for (const grant of grants) {
      const start = Date.parse(grant.startsAt);
      const end = Date.parse(grant.expiresAt);
      if (start <= coverageEnd && end > coverageEnd) {
        coverageEnd = end;
        changed = true;
      }
    }
  }
  return coverageEnd;
}

export function resolveMembership(
  wallet: MembershipWallet | null,
  now: string | Date = new Date(),
): MembershipSnapshot {
  const at = Date.parse(toIsoInstant(now));
  if (!wallet) {
    return {
      tier: "free",
      status: "free",
      startsAt: null,
      expiresAt: null,
      activeGrantIds: [],
      benefits: MEMBERSHIP_BENEFITS.free,
    };
  }

  const active = wallet.grants.filter(
    (grant) => Date.parse(grant.startsAt) <= at && at < Date.parse(grant.expiresAt),
  );
  const tier: MembershipTier = active.some((grant) => grant.tier === "max")
    ? "max"
    : active.some((grant) => grant.tier === "pro")
      ? "pro"
      : "free";

  if (tier === "free") {
    const future = wallet.grants
      .filter((grant) => Date.parse(grant.startsAt) > at)
      .sort(compareGrantStart)[0];
    return {
      tier,
      status: future ? "scheduled" : "free",
      startsAt: future?.startsAt ?? null,
      expiresAt: future?.expiresAt ?? null,
      activeGrantIds: [],
      benefits: MEMBERSHIP_BENEFITS.free,
    };
  }

  const activeTierGrants = active.filter((grant) => grant.tier === tier);
  const initialExpiry = Math.max(...activeTierGrants.map((grant) => Date.parse(grant.expiresAt)));
  const sameTierGrants = wallet.grants.filter((grant) => grant.tier === tier);
  const continuousExpiry = findContinuousExpiry(sameTierGrants, initialExpiry);

  return {
    tier,
    status: "active",
    startsAt: new Date(Math.min(...activeTierGrants.map((grant) => Date.parse(grant.startsAt)))).toISOString(),
    expiresAt: new Date(continuousExpiry).toISOString(),
    activeGrantIds: activeTierGrants.map((grant) => grant.id),
    benefits: MEMBERSHIP_BENEFITS[tier],
  };
}

export function canStartLearning(wallet: MembershipWallet | null, now: string | Date = new Date()) {
  return resolveMembership(wallet, now).benefits.canStartLearning;
}

const SHANGHAI_TIME_ZONE = "Asia/Shanghai";

function shanghaiYearMonth(value: string | Date) {
  const date = new Date(toIsoInstant(value));
  const parts = new Intl.DateTimeFormat("en-US-u-nu-latn", {
    timeZone: SHANGHAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error("Unable to resolve the Asia/Shanghai billing period");
  }
  return { year, month };
}

export function aiUsagePeriod(value: string | Date = new Date()) {
  const { year, month } = shanghaiYearMonth(value);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function nextAiUsageReset(value: string | Date) {
  const { year, month } = shanghaiYearMonth(value);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  // Shanghai midnight is 16:00 UTC on the preceding calendar day.
  return new Date(Date.UTC(nextYear, nextMonth - 1, 1, -8)).toISOString();
}

export function getAiUsageDecision(
  wallet: MembershipWallet | null,
  counter: AiUsageCounter | null,
  now: string | Date = new Date(),
): AiUsageDecision {
  const period = aiUsagePeriod(now);
  const usedRuns = counter?.period === period ? Math.max(0, Math.trunc(counter.usedRuns)) : 0;
  const policy = resolveMembership(wallet, now).benefits.aiTools;
  const limit = policy.monthlyRuns;
  const remainingRuns = limit === null ? null : Math.max(0, limit - usedRuns);

  return {
    allowed: policy.mode === "unlimited" || (policy.mode === "metered" && (remainingRuns ?? 0) > 0),
    mode: policy.mode,
    period,
    usedRuns,
    limit,
    remainingRuns,
    resetsAt: nextAiUsageReset(now),
  };
}

export function recordAiToolRun(
  userId: string,
  wallet: MembershipWallet | null,
  counter: AiUsageCounter | null,
  now: string | Date = new Date(),
): AiUsageCounter {
  const decision = getAiUsageDecision(wallet, counter, now);
  if (!decision.allowed) throw new Error("AI tool allowance exhausted or unavailable");
  return {
    schemaVersion: 1,
    userId,
    period: decision.period,
    usedRuns: decision.usedRuns + 1,
    updatedAt: toIsoInstant(now),
  };
}

export function normalizeRedemptionCode(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/[\s_‐‑‒–—−]+/g, "-")
    .replace(/-+/g, "-");
}

/** Enterprise six-month codes use KUAKUA-PRO-6M- plus a 4-24 character token. */
export function redemptionCodeFormatIsValid(value: string) {
  return /^KUAKUA-PRO-6M-[A-Z0-9]{4,24}$/.test(normalizeRedemptionCode(value));
}

export async function hashRedemptionCode(value: string) {
  const normalized = normalizeRedemptionCode(value);
  if (!redemptionCodeFormatIsValid(normalized)) throw new Error("Invalid redemption code format");
  const bytes = new TextEncoder().encode(`kuakua-ai::redemption::${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function nextPaidAccessStart(wallet: MembershipWallet, redeemedAt: string) {
  const at = Date.parse(redeemedAt);
  const latestExistingEnd = wallet.grants.reduce((latest, grant) => {
    const starts = Date.parse(grant.startsAt);
    const expires = Date.parse(grant.expiresAt);
    return expires > at && starts <= latest ? Math.max(latest, expires) : latest;
  }, at);
  return new Date(latestExistingEnd).toISOString();
}

export function redeemProSixMonthCode(input: {
  wallet: MembershipWallet;
  code: RedemptionCodeRecord;
  presentedCode: string;
  presentedCodeHash: string;
  redeemedAt: string | Date;
  grantId: string;
  ledgerEntryId: string;
}): RedemptionResult {
  const { wallet, code } = input;
  if (!redemptionCodeFormatIsValid(input.presentedCode)) return { ok: false, reason: "invalid_code_format" };
  if (code.benefit !== PRO_SIX_MONTH_REDEMPTION_BENEFIT) {
    return { ok: false, reason: "code_mismatch" };
  }
  if (input.presentedCodeHash.toLowerCase() !== code.codeHash.toLowerCase()) {
    return { ok: false, reason: "code_mismatch" };
  }
  if (code.status === "redeemed") return { ok: false, reason: "already_redeemed" };
  if (code.status === "revoked") return { ok: false, reason: "revoked" };

  const redeemedAt = toIsoInstant(input.redeemedAt);
  if (code.expiresAt && Date.parse(redeemedAt) >= Date.parse(code.expiresAt)) {
    return { ok: false, reason: "expired" };
  }

  const startsAt = nextPaidAccessStart(wallet, redeemedAt);
  const grant: MembershipGrant = {
    schemaVersion: 1,
    id: input.grantId,
    userId: wallet.userId,
    tier: "pro",
    source: "redemption_code",
    planId: null,
    startsAt,
    expiresAt: addCalendarMonths(startsAt, 6),
    redemptionCodeId: code.id,
    createdAt: redeemedAt,
  };
  const nextWallet = addGrantToWallet(wallet, grant, redeemedAt);
  const nextCode: RedemptionCodeRecord = {
    ...code,
    version: code.version + 1,
    status: "redeemed",
    redeemedAt,
    redeemedByUserId: wallet.userId,
    membershipGrantId: grant.id,
  };
  const ledgerEntry: RedemptionLedgerEntry = {
    schemaVersion: 1,
    id: input.ledgerEntryId,
    codeId: code.id,
    codeVersion: code.version,
    userId: wallet.userId,
    membershipGrantId: grant.id,
    redeemedAt,
  };

  return { ok: true, wallet: nextWallet, code: nextCode, grant, ledgerEntry };
}

export function isMembershipGrant(value: unknown): value is MembershipGrant {
  if (!isRecord(value)) return false;
  const starts = typeof value.startsAt === "string" ? toTimestamp(value.startsAt) : null;
  const expires = typeof value.expiresAt === "string" ? toTimestamp(value.expiresAt) : null;
  const planMatchesTier =
    value.planId === null ||
    (isPlanId(value.planId) && isPaidTier(value.tier) && MEMBERSHIP_PLANS[value.planId].tier === value.tier);
  const sourceReferencesAreValid =
    (value.source === "purchase" && isPlanId(value.planId) && value.redemptionCodeId === null) ||
    (value.source === "redemption_code" &&
      value.planId === null &&
      typeof value.redemptionCodeId === "string" &&
      value.redemptionCodeId.length > 0) ||
    (value.source === "manual_grant" && value.planId === null && value.redemptionCodeId === null);
  return (
    value.schemaVersion === 1 &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.userId === "string" &&
    value.userId.length > 0 &&
    isPaidTier(value.tier) &&
    isGrantSource(value.source) &&
    planMatchesTier &&
    sourceReferencesAreValid &&
    starts !== null &&
    expires !== null &&
    expires > starts &&
    (value.redemptionCodeId === null || typeof value.redemptionCodeId === "string") &&
    isIsoInstant(value.createdAt)
  );
}

export function isMembershipWallet(value: unknown): value is MembershipWallet {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    typeof value.userId === "string" &&
    value.userId.length > 0 &&
    Array.isArray(value.grants) &&
    value.grants.every(
      (grant) => isMembershipGrant(grant) && grant.userId === value.userId,
    ) &&
    new Set(value.grants.map((grant) => (isMembershipGrant(grant) ? grant.id : ""))).size ===
      value.grants.length &&
    isIsoInstant(value.updatedAt)
  );
}

export function serializeMembershipWallet(wallet: MembershipWallet) {
  if (!isMembershipWallet(wallet)) throw new Error("Cannot serialize an invalid membership wallet");
  return JSON.stringify({ ...wallet, grants: [...wallet.grants].sort(compareGrantStart) });
}

export function deserializeMembershipWallet(value: string | null): MembershipWallet | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isMembershipWallet(parsed)) return null;
    return { ...parsed, grants: [...parsed.grants].sort(compareGrantStart) };
  } catch {
    return null;
  }
}
