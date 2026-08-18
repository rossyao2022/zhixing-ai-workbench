import { readLocalValue, removeLocalValue, writeLocalValue } from "./safeStorage";

export type UserRole = "learner" | "mentor" | "admin";

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  active: boolean;
  createdAt: string;
};

export type LessonEvidence = {
  text: string;
  url: string;
  updatedAt: string;
  submittedAt: string;
};

export type LessonEvidenceDraft = Pick<LessonEvidence, "text" | "url">;

export type LearningProgress = {
  schemaVersion: 2;
  userId: string;
  xp: number;
  completedLessonIds: string[];
  evidenceByLessonId: Record<string, LessonEvidence>;
  streak: number;
  lastVisitDate: string;
  lastPraiseDate: string;
  createdAt: string;
};

const ACCOUNTS_KEY = "kuakua-ai.accounts.v1";
const PROGRESS_KEY = "kuakua-ai.progress.v1";
const SESSION_KEY = "kuakua-ai.session.v1";

const seedAccounts: UserAccount[] = [
  {
    id: "demo-learner",
    name: "夸夸同学",
    email: "learner@happykua.com",
    role: "learner",
    passwordHash: "a685ba0580e072e8c7f1f14219ac2d599d7db102a4d6179ca026d6294ab994f9",
    active: true,
    createdAt: "2026-08-12T00:00:00.000Z",
  },
  {
    id: "demo-mentor",
    name: "晴幂教练",
    email: "mentor@happykua.com",
    role: "mentor",
    passwordHash: "cb0d2af4734d993bb8ce35aec4ee3f0c52047f7133e627e1551124310e970f70",
    active: true,
    createdAt: "2026-08-12T00:00:00.000Z",
  },
  {
    id: "demo-admin",
    name: "OPC 链主",
    email: "admin@happykua.com",
    role: "admin",
    passwordHash: "3035f70320d222c5b312a3a56966217c2b15cfed2b91196a22c8b6d6a6a5df24",
    active: true,
    createdAt: "2026-08-12T00:00:00.000Z",
  },
];

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

function isUserRole(value: unknown): value is UserRole {
  return value === "learner" || value === "mentor" || value === "admin";
}

function isUserAccount(value: unknown): value is UserAccount {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    isUserRole(value.role) &&
    typeof value.passwordHash === "string" &&
    typeof value.active === "boolean" &&
    typeof value.createdAt === "string"
  );
}

export function evidenceUrlIsValid(value: string) {
  const url = value.trim();
  if (!url) return true;
  if (url.length > 500) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function evidenceCanSubmit(evidence: LessonEvidenceDraft) {
  const length = evidence.text.trim().length;
  return length >= 20 && length <= 2000 && evidenceUrlIsValid(evidence.url);
}

function normalizeEvidence(value: unknown): LessonEvidence | null {
  if (
    !isRecord(value) ||
    typeof value.text !== "string" ||
    typeof value.url !== "string" ||
    typeof value.updatedAt !== "string" ||
    typeof value.submittedAt !== "string" ||
    value.text.length > 2000 ||
    value.url.length > 500
  ) return null;
  const draft = { text: value.text, url: value.url };
  return {
    ...draft,
    updatedAt: value.updatedAt,
    submittedAt: value.submittedAt && evidenceCanSubmit(draft) ? value.submittedAt : "",
  };
}

function normalizeLearningProgress(value: unknown): LearningProgress | null {
  if (
    !isRecord(value) ||
    typeof value.userId !== "string" ||
    typeof value.xp !== "number" ||
    !Number.isFinite(value.xp) ||
    !Array.isArray(value.completedLessonIds) ||
    !value.completedLessonIds.every((item) => typeof item === "string") ||
    typeof value.streak !== "number" ||
    !Number.isFinite(value.streak) ||
    typeof value.lastVisitDate !== "string" ||
    typeof value.lastPraiseDate !== "string" ||
    typeof value.createdAt !== "string"
  ) return null;

  const evidenceByLessonId: Record<string, LessonEvidence> = {};
  if (isRecord(value.evidenceByLessonId)) {
    Object.entries(value.evidenceByLessonId).forEach(([lessonId, evidence]) => {
      const normalized = normalizeEvidence(evidence);
      if (normalized) evidenceByLessonId[lessonId] = normalized;
    });
  }

  return {
    schemaVersion: 2,
    userId: value.userId,
    xp: value.xp,
    completedLessonIds: [...new Set(value.completedLessonIds)],
    evidenceByLessonId,
    streak: value.streak,
    lastVisitDate: value.lastVisitDate,
    lastPraiseDate: value.lastPraiseDate,
    createdAt: value.createdAt,
  };
}

export function getEvidencedLessonIds(progress: LearningProgress) {
  return Object.entries(progress.evidenceByLessonId)
    .filter(([, evidence]) => Boolean(evidence.submittedAt) && evidenceCanSubmit(evidence))
    .map(([lessonId]) => lessonId);
}

function makeId(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

export function loadAccounts(): UserAccount[] {
  const parsed = safeParse(readLocalValue(ACCOUNTS_KEY));
  const stored = Array.isArray(parsed) ? parsed.filter(isUserAccount) : [];
  if (stored.length > 0) {
    if (!Array.isArray(parsed) || stored.length !== parsed.length) saveAccounts(stored);
    return stored;
  }
  writeLocalValue(ACCOUNTS_KEY, JSON.stringify(seedAccounts));
  return seedAccounts;
}

export function saveAccounts(accounts: UserAccount[]) {
  writeLocalValue(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function loadAllProgress(): LearningProgress[] {
  const parsed = safeParse(readLocalValue(PROGRESS_KEY));
  if (!Array.isArray(parsed)) return [];
  const valid = parsed.map(normalizeLearningProgress).filter((item): item is LearningProgress => item !== null);
  if (JSON.stringify(valid) !== JSON.stringify(parsed)) {
    writeLocalValue(PROGRESS_KEY, JSON.stringify(valid));
  }
  return valid;
}

export function loadProgress(userId: string): LearningProgress {
  const all = loadAllProgress();
  const found = all.find((item) => item.userId === userId);
  if (found) return found;

  const created: LearningProgress = {
    schemaVersion: 2,
    userId,
    xp: 0,
    completedLessonIds: [],
    evidenceByLessonId: {},
    streak: 0,
    lastVisitDate: "",
    lastPraiseDate: "",
    createdAt: new Date().toISOString(),
  };
  saveProgress(created);
  return created;
}

export function saveProgress(progress: LearningProgress) {
  const all = loadAllProgress();
  const next = all.some((item) => item.userId === progress.userId)
    ? all.map((item) => (item.userId === progress.userId ? progress : item))
    : [...all, progress];
  writeLocalValue(PROGRESS_KEY, JSON.stringify(next));
}

export async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(`kuakua-ai::${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function authenticate(email: string, password: string) {
  const passwordHash = await hashPassword(password);
  return (
    loadAccounts().find(
      (account) =>
        account.email.toLowerCase() === email.trim().toLowerCase() &&
        account.passwordHash === passwordHash &&
        account.active,
    ) ?? null
  );
}

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
}) {
  const accounts = loadAccounts();
  const email = input.email.trim().toLowerCase();
  if (accounts.some((account) => account.email.toLowerCase() === email)) {
    throw new Error("这个邮箱已经注册，可以直接登录");
  }
  const account: UserAccount = {
    id: makeId("user"),
    name: input.name.trim(),
    email,
    role: "learner",
    passwordHash: await hashPassword(input.password),
    active: true,
    createdAt: new Date().toISOString(),
  };
  saveAccounts([...accounts, account]);
  return account;
}

export function saveSession(userId: string) {
  writeLocalValue(SESSION_KEY, userId);
}

export function loadSession() {
  return readLocalValue(SESSION_KEY) ?? "";
}

export function clearSession() {
  removeLocalValue(SESSION_KEY);
}

export function resetProgress(userId: string) {
  const next = loadAllProgress().filter((item) => item.userId !== userId);
  writeLocalValue(PROGRESS_KEY, JSON.stringify(next));
  return loadProgress(userId);
}
