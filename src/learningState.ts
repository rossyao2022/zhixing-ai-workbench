import { readLocalValue, writeLocalValue } from "./safeStorage";

export type LearningPhase = "concept" | "learn" | "practice" | "workbench";

export type LearningPoint = {
  lessonId: string;
  phase: LearningPhase;
  updatedAt: string;
};

const LEARNING_POINT_KEY = "kuakua-ai.learning-point.v1";

function keyFor(userId: string) {
  return `${LEARNING_POINT_KEY}.${userId}`;
}

function isLearningPhase(value: unknown): value is LearningPhase {
  return value === "concept" || value === "learn" || value === "practice" || value === "workbench";
}

export function loadLearningPoint(userId: string): LearningPoint | null {
  if (!userId) return null;
  try {
    const value = JSON.parse(readLocalValue(keyFor(userId)) || "null") as Partial<LearningPoint> | null;
    if (!value || typeof value.lessonId !== "string" || !isLearningPhase(value.phase) || typeof value.updatedAt !== "string") return null;
    return { lessonId: value.lessonId, phase: value.phase, updatedAt: value.updatedAt };
  } catch {
    return null;
  }
}

export function saveLearningPoint(userId: string, lessonId: string, phase: LearningPhase) {
  if (!userId || !lessonId) return;
  writeLocalValue(keyFor(userId), JSON.stringify({ lessonId, phase, updatedAt: new Date().toISOString() } satisfies LearningPoint));
}
