import {
  MEMBERSHIP_BENEFITS,
  type AiUsageDecision,
  type MembershipPlanId,
  type MembershipSnapshot,
  type MembershipTier,
} from "./membership";
import type { PaymentOrder } from "./membershipStorage";
import type { UserAccount } from "./storage";

const DEFAULT_API_BASE = "https://www.happykua.com/kuakua-ai-api";
const API_BASE = (import.meta.env.VITE_KUAKUA_API_BASE || DEFAULT_API_BASE).replace(/\/$/, "");
const API_TIMEOUT_MS = 15_000;

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error?: { code?: string; message?: string } };

export class ProductionApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "api_error", status = 0) {
    super(message);
    this.name = "ProductionApiError";
    this.code = code;
    this.status = status;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (reason) {
    if (reason instanceof ProductionApiError) throw reason;
    throw new ProductionApiError(
      controller.signal.aborted ? "Membership service request timed out" : "Membership service is unavailable",
      controller.signal.aborted ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
      0,
    );
  } finally {
    window.clearTimeout(timer);
  }
}

export function productionApiEnabled() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();
  return hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.endsWith(".localhost");
}

async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.ok) {
    const error = payload && !payload.ok ? payload.error : null;
    throw new ProductionApiError(
      error?.message || `Membership service request failed (${response.status})`,
      error?.code || "api_error",
      response.status,
    );
  }
  return payload.data;
}

function normalizeUser(value: Record<string, unknown>): UserAccount {
  const role = value.role === "admin" ? "admin" : value.role === "mentor" ? "mentor" : "learner";
  const activeValue = value.active ?? value.isActive ?? value.is_active;
  return {
    id: String(value.id || ""),
    name: String(value.name || value.displayName || value.display_name || "夸夸同学"),
    email: String(value.email || ""),
    role,
    passwordHash: "",
    active: activeValue !== false && activeValue !== 0,
    createdAt: String(value.createdAt || value.created_at || new Date().toISOString()),
  };
}

function normalizeMembership(value: Record<string, unknown> | null | undefined): MembershipSnapshot {
  const tier: MembershipTier = value?.tier === "max" ? "max" : value?.tier === "pro" ? "pro" : "free";
  const status = value?.status === "active" || value?.status === "scheduled" ? value.status : "free";
  return {
    tier,
    status,
    startsAt: typeof value?.startsAt === "string" ? value.startsAt : typeof value?.starts_at === "string" ? value.starts_at : null,
    expiresAt: typeof value?.expiresAt === "string" ? value.expiresAt : typeof value?.expires_at === "string" ? value.expires_at : null,
    activeGrantIds: Array.isArray(value?.activeGrantIds)
      ? value.activeGrantIds.filter((item): item is string => typeof item === "string")
      : [],
    benefits: MEMBERSHIP_BENEFITS[tier],
  };
}

function normalizeAiUsage(value: Record<string, unknown> | null | undefined, tier: MembershipTier): AiUsageDecision {
  const mode = value?.mode === "unlimited" ? "unlimited" : value?.mode === "metered" ? "metered" : "blocked";
  const limit = mode === "unlimited" ? null : Number(value?.limit ?? (mode === "metered" ? 100 : 0));
  const usedRuns = Math.max(0, Number(value?.usedRuns ?? value?.used_runs ?? 0));
  const remainingRuns = limit === null ? null : Math.max(0, Number(value?.remainingRuns ?? value?.remaining_runs ?? limit - usedRuns));
  return {
    allowed: typeof value?.allowed === "boolean" ? value.allowed : tier === "max" || (tier === "pro" && (remainingRuns ?? 0) > 0),
    mode,
    period: String(value?.period || ""),
    usedRuns,
    limit,
    remainingRuns,
    resetsAt: String(value?.resetsAt || value?.resets_at || ""),
  };
}

function normalizeOrder(value: Record<string, unknown>): PaymentOrder {
  return {
    schemaVersion: 1,
    id: String(value.id || ""),
    userId: String(value.userId || value.user_id || ""),
    planId: String(value.planId || value.plan_id) as MembershipPlanId,
    amountFen: Number(value.amountFen ?? value.amount_fen ?? 0),
    payerName: String(value.payerName || value.payer_name || ""),
    paymentReference: String(value.paymentReference || value.payment_reference || ""),
    status: value.status === "approved" ? "approved" : value.status === "rejected" ? "rejected" : "pending",
    createdAt: String(value.createdAt || value.created_at || ""),
    reviewedAt: typeof (value.reviewedAt || value.reviewed_at) === "string" ? String(value.reviewedAt || value.reviewed_at) : null,
    reviewedByUserId: typeof (value.reviewedByUserId || value.reviewed_by) === "string" ? String(value.reviewedByUserId || value.reviewed_by) : null,
    membershipGrantId: typeof (value.membershipGrantId || value.membership_grant_id) === "string" ? String(value.membershipGrantId || value.membership_grant_id) : null,
  };
}

export type ProductionContext = {
  user: UserAccount;
  membership: MembershipSnapshot;
  aiDecision: AiUsageDecision;
};

export type DeepSeekCoachRequest = {
  requestId: string;
  lessonId: string;
  lessonTitle: string;
  goal: string;
  material: string;
  criteria: string[];
};

export type DeepSeekCoachAnswer = {
  acknowledgement: string;
  strengths: string[];
  gaps: string[];
  questions: string[];
  nextAction: string;
  improvedDraft?: string;
  rubric?: Array<{
    label: string;
    status: "met" | "partial" | "missing";
    note: string;
  }>;
};

export type DeepSeekCoachResponse = {
  answer: DeepSeekCoachAnswer;
  model: string;
  aiDecision: AiUsageDecision;
};

export async function productionRegister(input: { name: string; email: string; password: string }) {
  const data = await apiRequest<{ user: Record<string, unknown> }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ displayName: input.name, email: input.email, password: input.password }),
  });
  return normalizeUser(data.user);
}

export async function productionLogin(email: string, password: string) {
  const data = await apiRequest<{ user: Record<string, unknown> }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return normalizeUser(data.user);
}

export async function productionLogout() {
  await apiRequest<Record<string, never>>("/auth/logout", { method: "POST", body: "{}" }).catch(() => null);
}

export async function productionContext(): Promise<ProductionContext> {
  const data = await apiRequest<{
    user: Record<string, unknown>;
    membership: Record<string, unknown>;
    aiUsage: Record<string, unknown>;
  }>("/me");
  const user = normalizeUser(data.user);
  const membership = normalizeMembership(data.membership);
  return { user, membership, aiDecision: normalizeAiUsage(data.aiUsage, membership.tier) };
}

export async function productionMembership() {
  const data = await apiRequest<Record<string, unknown>>("/membership/current");
  const membership = normalizeMembership(data);
  const aiValue = (data.aiUsage || data.ai_usage || {}) as Record<string, unknown>;
  return { membership, aiDecision: normalizeAiUsage(aiValue, membership.tier) };
}

export async function productionConsumeAi() {
  const data = await apiRequest<Record<string, unknown>>("/ai/consume", { method: "POST", body: "{}" });
  const tier: MembershipTier = data.mode === "unlimited" ? "max" : data.mode === "metered" ? "pro" : "free";
  return normalizeAiUsage(data, tier);
}

export async function productionDeepSeekCoach(input: DeepSeekCoachRequest): Promise<DeepSeekCoachResponse> {
  const data = await apiRequest<{
    answer: DeepSeekCoachAnswer;
    model: string;
    aiUsage: Record<string, unknown>;
  }>("/ai/coach", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const mode = data.aiUsage?.mode;
  const tier: MembershipTier = mode === "unlimited" ? "max" : mode === "metered" ? "pro" : "free";
  return {
    answer: data.answer,
    model: data.model,
    aiDecision: normalizeAiUsage(data.aiUsage, tier),
  };
}

export async function productionPaymentOrders() {
  const data = await apiRequest<{ orders: Record<string, unknown>[] }>("/payment-orders/my");
  return data.orders.map(normalizeOrder);
}

export async function productionCreatePaymentOrder(input: {
  planId: MembershipPlanId;
  payerName: string;
  paymentReference: string;
}) {
  const data = await apiRequest<{ order?: Record<string, unknown> } & Record<string, unknown>>("/payment-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalizeOrder((data.order || data) as Record<string, unknown>);
}

export async function productionRedeemCode(code: string) {
  const data = await apiRequest<{ membership: Record<string, unknown>; aiUsage?: Record<string, unknown> }>("/redemption-codes/redeem", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  const membership = normalizeMembership(data.membership);
  return { membership, aiDecision: normalizeAiUsage(data.aiUsage || {}, membership.tier) };
}

export async function productionPaymentQrObjectUrl() {
  const response = await fetchWithTimeout(`${API_BASE}/payment-qr`, { credentials: "include", headers: { Accept: "image/png" } });
  if (!response.ok) throw new ProductionApiError("Unable to load the company payment QR", "payment_qr_unavailable", response.status);
  return URL.createObjectURL(await response.blob());
}

export async function productionAdminPaymentOrders(status = "pending") {
  const data = await apiRequest<{ orders: Record<string, unknown>[] }>(`/admin/payment-orders?status=${encodeURIComponent(status)}`);
  return data.orders.map(normalizeOrder);
}

export async function productionAdminReviewOrder(orderId: string, approve: boolean) {
  const data = await apiRequest<{ order: Record<string, unknown> }>(`/admin/payment-orders/${encodeURIComponent(orderId)}/review`, {
    method: "POST",
    body: JSON.stringify({ decision: approve ? "approved" : "rejected" }),
  });
  return normalizeOrder(data.order);
}

export async function productionAdminGenerateCodes(input: { enterpriseName: string; count: number }) {
  const data = await apiRequest<{ codes: Array<{ code: string } | string> }>("/admin/redemption-codes/generate", {
    method: "POST",
    body: JSON.stringify({ enterpriseId: input.enterpriseName, count: input.count }),
  });
  return data.codes.map((item) => typeof item === "string" ? item : item.code);
}

export async function productionAdminCodeCount() {
  const data = await apiRequest<{ codes: Array<{ status?: string }> }>("/admin/redemption-codes");
  return data.codes.filter((code) => code.status?.toLowerCase() === "issued").length;
}
