import { FormEvent, ReactNode, RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookMarked,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CirclePlay,
  CircleUserRound,
  Clock3,
  Clipboard,
  ClipboardCheck,
  Compass,
  Crown,
  FileText,
  FolderOpen,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  GraduationCap,
  Globe2,
  Gift,
  Home,
  KeyRound,
  Layers3,
  LibraryBig,
  Lightbulb,
  LockKeyhole,
  LogOut,
  Map,
  Menu,
  MessageSquareText,
  NotebookPen,
  Orbit,
  Play,
  QrCode,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Target,
  Trophy,
  UserPlus,
  UsersRound,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import qingmiBuddy from "./assets/brand/qingmi-buddy-v2.webp";
import {
  allLessons,
  buddyLevels,
  courseStages,
  getBuddyLevel,
  type Lesson,
} from "./courseData";
import { loadLearningPoint, saveLearningPoint, type LearningPhase } from "./learningState";
import { lessonGuides, moduleGuides } from "./learningContent";
import { eightImmortals, immortalByStage } from "./eightImmortals";
import { localeOptions, useI18n } from "./i18n";
import { localizeMethod, methodFrameworks, methodUi, workbenchLanes } from "./methodLibrary";
import {
  MEMBERSHIP_PLANS,
  PRO_AI_MONTHLY_RUN_LIMIT,
  getAiUsageDecision as getEmptyAiUsageDecision,
  membershipPlanList,
  resolveMembership,
  type AiUsageDecision,
  type MembershipPlan,
  type MembershipPlanId,
  type MembershipSnapshot,
  type MembershipTier,
} from "./membership";
import {
  consumeAiToolRun,
  createEnterpriseRedemptionCodes,
  createPaymentOrder,
  getUserAiDecision,
  loadMembershipSnapshot,
  loadPaymentOrders,
  loadRedemptionCodes,
  redeemMembershipCode,
  reviewPaymentOrder,
  type PaymentOrder,
} from "./membershipStorage";
import {
  ProductionApiError,
  productionAdminCodeCount,
  productionAdminGenerateCodes,
  productionAdminPaymentOrders,
  productionAdminReviewOrder,
  productionApiEnabled,
  productionContext,
  productionCreatePaymentOrder,
  productionDeepSeekCoach,
  productionLogin,
  productionLogout,
  productionMembership,
  productionPaymentOrders,
  productionPaymentQrObjectUrl,
  productionRedeemCode,
  productionRegister,
  type DeepSeekCoachRequest,
  type DeepSeekCoachResponse,
} from "./productionApi";
import {
  authenticate,
  clearSession,
  evidenceCanSubmit,
  evidenceUrlIsValid,
  getEvidencedLessonIds,
  loadAccounts,
  loadAllProgress,
  loadProgress,
  loadSession,
  registerAccount,
  resetProgress,
  saveAccounts,
  saveProgress,
  saveSession,
  type LearningProgress,
  type LessonEvidenceDraft,
  type UserAccount,
  type UserRole,
} from "./storage";

type AppView = "home" | "course" | "journey" | "buddy" | "membership" | "admin" | "profile";

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isPreviousDay(previous: string, current: string) {
  if (!previous) return false;
  const [previousYear, previousMonth, previousDay] = previous.split("-").map(Number);
  const [currentYear, currentMonth, currentDay] = current.split("-").map(Number);
  const previousUtc = Date.UTC(previousYear, previousMonth - 1, previousDay);
  const currentUtc = Date.UTC(currentYear, currentMonth - 1, currentDay);
  return currentUtc - previousUtc === 86_400_000;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

const knownLessonIds = new Set(allLessons.map((lesson) => lesson.id));

function evidencedLessonIds(progress: LearningProgress) {
  return getEvidencedLessonIds(progress).filter((lessonId) => knownLessonIds.has(lessonId));
}

function resetScrollPosition() {
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  root.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);
  window.requestAnimationFrame(() => {
    if (root.style.scrollBehavior === "auto") root.style.scrollBehavior = previousBehavior;
  });
}

function isLocalPreviewHost() {
  return window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
}

function freeMembershipState() {
  return {
    membership: resolveMembership(null),
    aiDecision: getEmptyAiUsageDecision(null, null),
  };
}

function productionErrorCode(reason: unknown) {
  return reason instanceof ProductionApiError ? reason.code.toUpperCase() : "";
}

function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `coach-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function localCoachPreview(input: DeepSeekCoachRequest, decision: AiUsageDecision): DeepSeekCoachResponse {
  const material = input.material.trim();
  const hasEvidence = /证据|数据|访谈|记录|链接|作品|客户/.test(material);
  const hasThreshold = /\d|次|天|周|元|人|%/.test(material);
  const strengths = [
    material.length >= 80 ? "你已经提供了足够具体的项目背景。" : "你已经开始把自己的项目带进练习，而不是停留在听课。",
  ];
  if (hasEvidence) strengths.push("材料中出现了可核验线索，可以继续追问来源和范围。");
  const gaps = [
    ...(!hasEvidence ? ["还缺少一条能被他人核验的事实或材料。"] : []),
    ...(!hasThreshold ? ["还没有明确时间、数量或通过阈值。"] : []),
  ];
  if (!gaps.length) gaps.push("下一步要检查这些证据是否真的支持当前结论，而不是只与结论相关。");
  return {
    model: "local-preview",
    aiDecision: decision,
    answer: {
      acknowledgement: "你已经把真实材料放到桌面上了，这比让 AI 凭空猜测更专业。",
      strengths,
      gaps,
      questions: [hasEvidence ? "哪一条证据最可能推翻你现在的判断？" : "最近一次真实发生这件事的人是谁，当时发生了什么？"],
      nextAction: hasThreshold ? "用 15 分钟找到一个反例，并记录它会怎样改变你的决定。" : "补充一个 14 天内可观察的通过阈值和停止条件。",
      rubric: input.criteria.slice(0, 3).map((label, index) => ({
        label,
        status: index === 0 && material.length >= 80 ? "met" : hasEvidence ? "partial" : "missing",
        note: index === 0 && material.length >= 80 ? "已有具体材料支撑。" : "需要补一条可核验事实。",
      })),
    },
  };
}

function App() {
  const { t, roleLabel } = useI18n();
  const productionMode = productionApiEnabled();
  const initialSession = productionMode ? "" : loadSession();
  const [accounts, setAccounts] = useState<UserAccount[]>(loadAccounts);
  const [sessionUserId, setSessionUserId] = useState(initialSession);
  const [sessionRestoring, setSessionRestoring] = useState(productionMode);
  const [progress, setProgress] = useState<LearningProgress | null>(() =>
    initialSession ? loadProgress(initialSession) : null,
  );
  const [view, setView] = useState<AppView>("home");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [reward, setReward] = useState<{ xp: number; levelUp: number } | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [showMembershipGate, setShowMembershipGate] = useState(false);
  const [membership, setMembership] = useState<MembershipSnapshot | null>(() =>
    initialSession && !productionMode ? loadMembershipSnapshot(initialSession) : null,
  );
  const [aiDecision, setAiDecision] = useState<AiUsageDecision | null>(() =>
    initialSession && !productionMode ? getUserAiDecision(initialSession) : null,
  );
  const membershipRequestRef = useRef(0);

  const user = accounts.find((account) => account.id === sessionUserId) ?? null;
  const today = localDateKey();

  const cacheProductionAccount = useCallback((account: UserAccount) => {
    const next = [...loadAccounts().filter((item) => item.id !== account.id), account];
    saveAccounts(next);
    setAccounts(next);
  }, []);

  const clearAuthenticatedState = useCallback(() => {
    membershipRequestRef.current += 1;
    clearSession();
    setSessionUserId("");
    setProgress(null);
    setMembership(null);
    setAiDecision(null);
    setSelectedLessonId("");
    setShowMembershipGate(false);
    setView("home");
  }, []);

  useEffect(() => {
    if (!productionMode) return;
    let cancelled = false;
    productionContext()
      .then((context) => {
        if (cancelled) return;
        const restoredProgress = loadProgress(context.user.id);
        cacheProductionAccount(context.user);
        saveSession(context.user.id);
        setProgress(restoredProgress);
        setSessionUserId(context.user.id);
        setMembership(context.membership);
        setAiDecision(context.aiDecision);
      })
      .catch(() => {
        if (!cancelled) clearAuthenticatedState();
      })
      .finally(() => {
        if (!cancelled) setSessionRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cacheProductionAccount, clearAuthenticatedState, productionMode]);

  useEffect(() => {
    if (!sessionUserId) {
      setProgress(null);
      setMembership(null);
      setAiDecision(null);
      return;
    }
    const account = accounts.find((item) => item.id === sessionUserId);
    if (!account || !account.active) {
      clearSession();
      setSessionUserId("");
      setProgress(null);
      setMembership(null);
      setAiDecision(null);
      return;
    }

    const current = loadProgress(sessionUserId);
    if (current.lastVisitDate !== today) {
      const next: LearningProgress = {
        ...current,
        streak: isPreviousDay(current.lastVisitDate, today) ? current.streak + 1 : 1,
        lastVisitDate: today,
        lastPraiseDate: today,
      };
      saveProgress(next);
      setProgress(next);
    } else {
      setProgress(current);
    }
    if (!productionMode) {
      setMembership(loadMembershipSnapshot(sessionUserId));
      setAiDecision(getUserAiDecision(sessionUserId));
    }
  }, [accounts, productionMode, sessionUserId, today]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMobileMenu(false);
  }, [view]);

  useEffect(() => {
    if (!sessionUserId) return;
    window.requestAnimationFrame(resetScrollPosition);
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) return;
    resetScrollPosition();
    const frame = window.requestAnimationFrame(resetScrollPosition);
    const timer = window.setTimeout(resetScrollPosition, 60);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [sessionUserId]);

  const refreshMembership = useCallback(async (userId = sessionUserId) => {
    if (!userId) return;
    const requestId = ++membershipRequestRef.current;
    if (!productionMode) {
      setMembership(loadMembershipSnapshot(userId));
      setAiDecision(getUserAiDecision(userId));
      return;
    }
    try {
      const current = await productionMembership();
      if (requestId !== membershipRequestRef.current) return;
      setMembership(current.membership);
      setAiDecision(current.aiDecision);
    } catch (reason) {
      if (requestId !== membershipRequestRef.current) return;
      if (reason instanceof ProductionApiError && reason.status === 401) clearAuthenticatedState();
      throw reason;
    }
  }, [clearAuthenticatedState, productionMode, sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) return;
    const refresh = () => {
      void refreshMembership(sessionUserId).catch(() => undefined);
    };
    const interval = window.setInterval(refresh, 60_000);
    const expiryDelay = membership?.expiresAt ? Date.parse(membership.expiresAt) - Date.now() + 50 : 0;
    const expiryTimer = expiryDelay > 0
      ? window.setTimeout(refresh, Math.min(expiryDelay, 2_147_000_000))
      : 0;
    const handleStorage = (event: StorageEvent) => {
      if (!productionMode && event.key?.startsWith("kuakua-ai.")) refresh();
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearInterval(interval);
      if (expiryTimer) window.clearTimeout(expiryTimer);
      window.removeEventListener("storage", handleStorage);
    };
  }, [membership?.expiresAt, productionMode, refreshMembership, sessionUserId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const completed = progress ? evidencedLessonIds(progress) : [];
  const progressPercent = Math.round((completed.length / allLessons.length) * 100);
  const buddyLevel = getBuddyLevel(progress?.xp ?? 0);
  const nextLesson = allLessons.find((lesson) => !completed.includes(lesson.id)) ?? null;
  const selectedLesson = selectedLessonId ? allLessons.find((lesson) => lesson.id === selectedLessonId) ?? null : null;
  const learningAccessIsCurrent = () => Boolean(
    user && (productionMode ? membership?.benefits.canStartLearning : loadMembershipSnapshot(user.id).benefits.canStartLearning),
  );
  const openLesson = (lesson: Lesson) => {
    setSelectedLessonId(lesson.id);
  };

  const handleLoggedIn = (account: UserAccount) => {
    resetScrollPosition();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (productionMode) cacheProductionAccount(account);
    saveSession(account.id);
    setSessionUserId(account.id);
    setProgress(loadProgress(account.id));
    if (productionMode) {
      const empty = freeMembershipState();
      setMembership(empty.membership);
      setAiDecision(empty.aiDecision);
      void refreshMembership(account.id).catch(() => setToast(t("service.unavailable")));
    } else {
      setMembership(loadMembershipSnapshot(account.id));
      setAiDecision(getUserAiDecision(account.id));
    }
    setView("home");
  };

  const handleLogout = async () => {
    try {
      if (productionMode) await productionLogout();
    } finally {
      clearAuthenticatedState();
    }
  };

  const saveEvidenceDraft = (lesson: Lesson, draft: LessonEvidenceDraft) => {
    if (!progress || !learningAccessIsCurrent()) {
      setSelectedLessonId("");
      setShowMembershipGate(true);
      return;
    }
    const now = new Date().toISOString();
    const existing = progress.evidenceByLessonId[lesson.id];
    const nextProgress: LearningProgress = {
      ...progress,
      evidenceByLessonId: {
        ...progress.evidenceByLessonId,
        [lesson.id]: {
          text: draft.text.slice(0, 2000),
          url: draft.url.trim().slice(0, 500),
          updatedAt: now,
          submittedAt: existing?.submittedAt ?? "",
        },
      },
    };
    saveProgress(nextProgress);
    setProgress(nextProgress);
    setToast(t("lesson.draftSaved"));
  };

  const completeLesson = (lesson: Lesson, draft: LessonEvidenceDraft) => {
    if (!progress || !evidenceCanSubmit(draft)) return;
    if (!learningAccessIsCurrent()) {
      setSelectedLessonId("");
      setShowMembershipGate(true);
      return;
    }
    const alreadyRewarded = progress.completedLessonIds.includes(lesson.id);
    const now = new Date().toISOString();
    const oldLevel = getBuddyLevel(progress.xp);
    const nextProgress: LearningProgress = {
      ...progress,
      xp: alreadyRewarded ? progress.xp : progress.xp + lesson.xp,
      completedLessonIds: alreadyRewarded ? progress.completedLessonIds : [...progress.completedLessonIds, lesson.id],
      evidenceByLessonId: {
        ...progress.evidenceByLessonId,
        [lesson.id]: {
          text: draft.text.trim(),
          url: draft.url.trim(),
          updatedAt: now,
          submittedAt: now,
        },
      },
    };
    const nextLevel = getBuddyLevel(nextProgress.xp);
    saveProgress(nextProgress);
    setProgress(nextProgress);
    setSelectedLessonId("");
    if (alreadyRewarded) setToast(t("lesson.evidenceSubmitted"));
    else setReward({ xp: lesson.xp, levelUp: nextLevel.level > oldLevel.level ? nextLevel.level : 0 });
  };

  const updateAccounts = (next: UserAccount[]) => {
    saveAccounts(next);
    setAccounts(next);
    setToast(t("admin.roleUpdated"));
  };

  if (sessionRestoring) {
    return (
      <main className="auth-screen" data-testid="session-restoring">
        <section className="auth-panel"><div className="auth-card"><div className="auth-heading"><span className="auth-icon">夸</span><div><h2>{t("auth.restoring")}</h2><p>{t("auth.restoringHint")}</p></div></div></div></section>
      </main>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        accounts={accounts}
        onLogin={handleLoggedIn}
        onRegistered={(account) => {
          const next = [...loadAccounts().filter((item) => item.id !== account.id), account];
          setAccounts(next);
          handleLoggedIn(account);
        }}
      />
    );
  }

  if (!progress) {
    return (
      <main className="auth-screen" data-testid="session-restoring">
        <section className="auth-panel"><div className="auth-card"><div className="auth-heading"><span className="auth-icon">夸</span><div><h2>{t("auth.restoring")}</h2><p>{t("auth.restoringHint")}</p></div></div></div></section>
      </main>
    );
  }

  const emptyMembership = freeMembershipState();
  const currentMembership = membership ?? (productionMode ? emptyMembership.membership : loadMembershipSnapshot(user.id));
  const currentAiDecision = aiDecision ?? (productionMode ? emptyMembership.aiDecision : getUserAiDecision(user.id));
  const runDeepSeekCoach = async (input: DeepSeekCoachRequest): Promise<DeepSeekCoachResponse | null> => {
    try {
      const result = productionMode
        ? await productionDeepSeekCoach(input)
        : localCoachPreview(input, consumeAiToolRun(user.id));
      setAiDecision(result.aiDecision);
      return result;
    } catch (reason) {
      void refreshMembership(user.id).catch(() => undefined);
      const code = productionErrorCode(reason);
      if (code === "MEMBERSHIP_REQUIRED" || code === "AI_QUOTA_EXHAUSTED" || (reason instanceof ProductionApiError && reason.status === 403)) {
        setShowMembershipGate(true);
      } else {
        setToast(reason instanceof ProductionApiError && reason.status === 401 ? t("service.sessionExpired") : t("service.unavailable"));
      }
      return null;
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-lockup" onClick={() => setView("home")} aria-label={t("nav.homeAria")}>
          <span className="brand-orb"><img src={qingmiBuddy} alt="" /></span>
          <span>
            <strong>{t("brand.name")}</strong>
            <small>{t("brand.sub")}</small>
          </span>
        </button>

        <nav className="desktop-nav" aria-label={t("nav.main")}>
          <NavButton active={view === "home"} icon={<Home />} label={t("nav.today")} onClick={() => setView("home")} />
          <NavButton active={view === "course"} icon={<BookOpen />} label={t("nav.course")} onClick={() => setView("course")} />
          <NavButton active={view === "journey"} icon={<Map />} label={t("nav.journey")} onClick={() => setView("journey")} />
          <NavButton active={view === "buddy"} icon={<Sparkles />} label={t("nav.buddy")} onClick={() => setView("buddy")} />
          <NavButton active={view === "membership"} icon={<Crown />} label={t("nav.membership")} onClick={() => setView("membership")} />
          {user.role === "admin" && (
            <NavButton active={view === "admin"} icon={<UsersRound />} label={t("nav.admin")} onClick={() => setView("admin")} />
          )}
        </nav>

        <div className="topbar-actions">
          <LanguageSwitcher compact />
          <MembershipStatusButton membership={currentMembership} onClick={() => setView("membership")} />
          <button className="xp-pill" onClick={() => setView("buddy")}>
            <Zap size={15} /> {progress?.xp ?? 0} <span>{t("common.xp")}</span>
          </button>
          <button className="profile-button" onClick={() => setView("profile")} aria-label={t("nav.profileAria")}>
            <span>{user.name.slice(0, 1)}</span>
            <div><b>{user.name}</b><small>{roleLabel(user.role)}</small></div>
          </button>
          <button className="menu-button" onClick={() => setMobileMenu((open) => !open)} aria-label={t("nav.menu")}>
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {mobileMenu && (
        <div className="mobile-menu-card">
          <button onClick={() => setView("home")}><Home />{t("nav.todayFull")}</button>
          <button onClick={() => setView("course")}><BookOpen />{t("nav.courseFull")}</button>
          <button onClick={() => setView("journey")}><Map />{t("nav.journey")}</button>
          <button onClick={() => setView("buddy")}><Sparkles />{t("nav.buddyFull")}</button>
          <button onClick={() => setView("membership")}><Crown />{t("nav.membership")}</button>
          {user.role === "admin" && <button onClick={() => setView("admin")}><UsersRound />{t("nav.admin")}</button>}
          <button onClick={() => setView("profile")}><CircleUserRound />{t("nav.profile")}</button>
        </div>
      )}

      <main className={selectedLesson ? "app-main learning-main" : "app-main"}>
        {selectedLesson ? (
          <LessonDialog
            key={selectedLesson.id}
            userId={user.id}
            lesson={selectedLesson}
            completed={completed.includes(selectedLesson.id)}
            legacyCompleted={Boolean(progress?.completedLessonIds.includes(selectedLesson.id))}
            evidence={progress?.evidenceByLessonId[selectedLesson.id] ?? null}
            aiDecision={currentAiDecision}
            canPractice={currentMembership.benefits.canStartLearning}
            onClose={() => setSelectedLessonId("")}
            onSaveDraft={(draft) => saveEvidenceDraft(selectedLesson, draft)}
            onComplete={(draft) => completeLesson(selectedLesson, draft)}
            onRunCoach={runDeepSeekCoach}
            onMembershipRequired={() => setShowMembershipGate(true)}
          />
        ) : view === "home" ? (
          <Dashboard
            user={user}
            progress={progress}
            completed={completed}
            buddyLevel={buddyLevel}
            nextLesson={nextLesson}
            progressPercent={progressPercent}
            onOpenLesson={openLesson}
            onNavigate={setView}
          />
        ) : view === "course" ? (
          <CourseCenter
            completed={completed}
            progressPercent={progressPercent}
            onOpenLesson={openLesson}
          />
        ) : view === "journey" ? (
          <JourneyMap completed={completed} onOpenLesson={openLesson} />
        ) : view === "buddy" ? (
          <BuddyRoom progress={progress} completed={completed} />
        ) : view === "membership" ? (
          <MembershipPage
            user={user}
            membership={currentMembership}
            aiDecision={currentAiDecision}
            onMembershipChanged={() => refreshMembership(user.id)}
            onToast={setToast}
          />
        ) : view === "admin" ? (
          <RoleAdmin
            currentUser={user}
            accounts={accounts}
            onChange={updateAccounts}
            onMembershipChanged={() => refreshMembership(user.id)}
            onToast={setToast}
          />
        ) : view === "profile" ? (
          <ProfilePage
            user={user}
            progress={progress}
            membership={currentMembership}
            aiDecision={currentAiDecision}
            onMembership={() => setView("membership")}
            onLogout={handleLogout}
            onReset={() => {
              const next = resetProgress(user.id);
              setProgress(next);
              setToast(t("profile.resetDone"));
            }}
          />
        ) : null}
      </main>

      {!selectedLesson && <nav className={user.role === "admin" ? "bottom-nav admin-nav" : "bottom-nav"} aria-label={t("nav.mobile")}>
        <NavButton active={view === "home"} icon={<Home />} label={t("nav.today")} onClick={() => setView("home")} />
        <NavButton active={view === "course"} icon={<BookOpen />} label={t("nav.course")} onClick={() => setView("course")} />
        <NavButton active={view === "journey"} icon={<Map />} label={t("nav.mapShort")} onClick={() => setView("journey")} />
        <NavButton active={view === "buddy"} icon={<Sparkles />} label={t("nav.buddy")} onClick={() => setView("buddy")} />
        {user.role === "admin" && <NavButton active={view === "admin"} icon={<UsersRound />} label={t("nav.adminShort")} onClick={() => setView("admin")} />}
        <NavButton active={view === "profile"} icon={<CircleUserRound />} label={t("nav.mine")} onClick={() => setView("profile")} />
      </nav>}
      {reward && <RewardDialog reward={reward} onClose={() => setReward(null)} />}
      {showMembershipGate && (
        <MembershipGate
          user={user}
          membership={currentMembership}
          aiDecision={currentAiDecision}
          onClose={() => setShowMembershipGate(false)}
          onMembershipChanged={() => {
            refreshMembership(user.id);
            setShowMembershipGate(false);
          }}
          onToast={setToast}
        />
      )}
      {toast && <div className="toast"><Check size={18} />{toast}</div>}
    </div>
  );
}

function LanguageSwitcher({ compact = false, inverted = false }: { compact?: boolean; inverted?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const current = localeOptions.find((item) => item.id === locale) ?? localeOptions[0];
  return (
    <label className={`language-switcher${compact ? " compact" : ""}${inverted ? " inverted" : ""}`} title={t("language.change")}>
      <Globe2 aria-hidden="true" />
      <span className="language-current" aria-hidden="true">{compact ? current.short : current.label}</span>
      <span className="sr-only">{t("language.label")}</span>
      <select data-testid="language-selector" value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)} aria-label={t("language.change")}>
        {localeOptions.map((option) => <option key={option.id} value={option.id}>{option.label} · {option.short}</option>)}
      </select>
      <ChevronDown aria-hidden="true" />
    </label>
  );
}

function membershipName(tier: MembershipTier, t: (key: string, vars?: Record<string, string | number>) => string) {
  return tier === "pro" ? t("membership.proName") : tier === "max" ? t("membership.maxName") : t("membership.freeName");
}

function formatMembershipDate(value: string | null, locale: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function MembershipStatusButton({ membership, onClick }: { membership: MembershipSnapshot; onClick: () => void }) {
  const { t, locale } = useI18n();
  const detail = membership.tier === "free"
    ? t("membership.viewPlans")
    : membership.expiresAt
      ? t("membership.until", { date: formatMembershipDate(membership.expiresAt, locale) })
      : t("membership.active");
  return (
    <button
      className={`membership-status-pill ${membership.tier}`}
      data-testid="membership-status"
      data-membership-tier={membership.tier}
      data-membership-expires-at={membership.expiresAt ?? ""}
      onClick={onClick}
    >
      <Crown />
      <span><b>{membershipName(membership.tier, t)}</b><small>{detail}</small></span>
    </button>
  );
}

function MembershipPage({
  user,
  membership,
  aiDecision,
  onMembershipChanged,
  onToast,
}: {
  user: UserAccount;
  membership: MembershipSnapshot;
  aiDecision: AiUsageDecision;
  onMembershipChanged: () => void | Promise<void>;
  onToast: (message: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="page membership-page">
      <PageIntro kicker="KUAKUA MEMBERSHIP" title={t("membership.title")} description={t("membership.description")} />
      <MembershipPanel user={user} membership={membership} aiDecision={aiDecision} onMembershipChanged={onMembershipChanged} onToast={onToast} />
    </div>
  );
}

function MembershipGate({
  user,
  membership,
  aiDecision,
  onClose,
  onMembershipChanged,
  onToast,
}: {
  user: UserAccount;
  membership: MembershipSnapshot;
  aiDecision: AiUsageDecision;
  onClose: () => void;
  onMembershipChanged: () => void;
  onToast: (message: string) => void;
}) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLElement>(null);
  useEscape(onClose);
  useDialogFocus(dialogRef);
  return (
    <div className="modal-backdrop membership-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="membership-gate" role="dialog" aria-modal="true" aria-labelledby="membership-gate-title" data-testid="membership-gate">
        <button className="dialog-close membership-close" onClick={onClose} aria-label={t("common.close")}><X /></button>
        <header className="membership-gate-hero">
          <span><Crown />{t("membership.gateKicker")}</span>
          <h1 id="membership-gate-title">{t("membership.gateTitle")}</h1>
          <p>{t("membership.gateDesc")}</p>
        </header>
        <MembershipPanel user={user} membership={membership} aiDecision={aiDecision} onMembershipChanged={onMembershipChanged} onToast={onToast} compact />
      </section>
    </div>
  );
}

function MembershipPanel({
  user,
  membership,
  aiDecision,
  onMembershipChanged,
  onToast,
  compact = false,
}: {
  user: UserAccount;
  membership: MembershipSnapshot;
  aiDecision: AiUsageDecision;
  onMembershipChanged: () => void;
  onToast: (message: string) => void;
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const [selectedPlanId, setSelectedPlanId] = useState<MembershipPlanId>("pro-monthly");
  const [payerName, setPayerName] = useState(user.name);
  const [paymentReference, setPaymentReference] = useState("");
  const productionMode = productionApiEnabled();
  const localPaymentPreview = isLocalPreviewHost();
  const paymentEnabled = productionMode || localPaymentPreview;
  const [orders, setOrders] = useState<PaymentOrder[]>(() => productionMode ? [] : loadPaymentOrders().filter((order) => order.userId === user.id));
  const [paymentQrUrl, setPaymentQrUrl] = useState(() => localPaymentPreview ? `${import.meta.env.BASE_URL}__local/company-payment-qr.png` : "");
  const [paymentQrError, setPaymentQrError] = useState("");
  const [paymentServiceError, setPaymentServiceError] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemFeedback, setRedeemFeedback] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const selectedPlan = MEMBERSHIP_PLANS[selectedPlanId];
  const referenceIsValid = !productionMode || paymentReference.trim().length >= 4;
  const currentAiText = aiDecision.mode === "unlimited"
    ? t("membership.aiUnlimited")
    : aiDecision.mode === "metered"
      ? t("membership.aiRemaining", { count: aiDecision.remainingRuns ?? 0 })
      : t("membership.aiBlocked");

  useEffect(() => {
    if (!productionMode) {
      setOrders(loadPaymentOrders().filter((order) => order.userId === user.id));
      return;
    }
    let cancelled = false;
    let objectUrl = "";
    setPaymentQrUrl("");
    setPaymentServiceError("");
    setPaymentQrError("");
    void productionPaymentOrders()
      .then((nextOrders) => {
        if (!cancelled) setOrders(nextOrders);
      })
      .catch(() => {
        if (!cancelled) setPaymentServiceError(t("payment.ordersUnavailable"));
      });
    void productionPaymentQrObjectUrl()
      .then((nextQrUrl) => {
        objectUrl = nextQrUrl;
        if (cancelled) {
          URL.revokeObjectURL(nextQrUrl);
          return;
        }
        setPaymentQrUrl(nextQrUrl);
      })
      .catch(() => {
        if (!cancelled) setPaymentQrError(t("payment.qrUnavailable"));
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [productionMode, t, user.id]);

  const submitPayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!paymentEnabled) {
      onToast(t("payment.unavailable"));
      return;
    }
    if (payerName.trim().length < 2 || !referenceIsValid || paymentBusy) return;
    setPaymentBusy(true);
    setPaymentServiceError("");
    try {
      if (productionMode) {
        await productionCreatePaymentOrder({
          planId: selectedPlanId,
          payerName: payerName.trim(),
          paymentReference: paymentReference.trim(),
        });
        setOrders(await productionPaymentOrders());
      } else {
        createPaymentOrder({ userId: user.id, planId: selectedPlanId, payerName, paymentReference });
        setOrders(loadPaymentOrders().filter((item) => item.userId === user.id));
      }
      setPaymentReference("");
      onToast(t("payment.submitted"));
    } catch (reason) {
      const message = productionErrorCode(reason) === "PAYMENT_REFERENCE_EXISTS"
        ? t("payment.duplicate")
        : t("payment.error");
      setPaymentServiceError(message);
      onToast(message);
    } finally {
      setPaymentBusy(false);
    }
  };

  const submitRedemption = async (event: FormEvent) => {
    event.preventDefault();
    if (!paymentEnabled) {
      onToast(t("payment.unavailable"));
      return;
    }
    if (!redeemCode.trim()) return;
    setRedeemBusy(true);
    try {
      if (productionMode) {
        await productionRedeemCode(redeemCode);
      } else {
        const result = await redeemMembershipCode({ userId: user.id, presentedCode: redeemCode, allowDemoCode: true });
        if (!result.ok) {
          const failureKey = result.reason === "already_redeemed"
            ? "redeem.used"
            : result.reason === "expired" || result.reason === "revoked"
              ? "redeem.expired"
              : result.reason === "not_found"
                ? "redeem.notFound"
                : "redeem.invalid";
          setRedeemFeedback(t(failureKey));
          return;
        }
      }
      setRedeemCode("");
      setRedeemFeedback(t("redeem.success"));
      onToast(t("redeem.success"));
      await onMembershipChanged();
    } catch (reason) {
      const code = productionErrorCode(reason);
      const failureKey = code === "REDEMPTION_CODE_USED"
        ? "redeem.used"
        : code === "REDEMPTION_CODE_EXPIRED" || code === "REDEMPTION_CODE_REVOKED"
          ? "redeem.expired"
          : code === "REDEMPTION_CODE_NOT_FOUND"
            ? "redeem.notFound"
            : code.startsWith("INVALID_")
              ? "redeem.invalid"
              : "redeem.error";
      setRedeemFeedback(t(failureKey));
    } finally {
      setRedeemBusy(false);
    }
  };

  return (
    <div className={compact ? "membership-panel compact" : "membership-panel"}>
      <section className={`membership-current ${membership.tier}`}>
        <span className="membership-current-icon"><Crown /></span>
        <div>
          <small>{t("membership.current")}</small>
          <h2>{membershipName(membership.tier, t)}</h2>
          <p>{membership.tier === "free" ? t("membership.freeDesc") : membership.expiresAt ? t("membership.until", { date: formatMembershipDate(membership.expiresAt, locale) }) : t("membership.active")}</p>
        </div>
        <em>{currentAiText}</em>
      </section>

      <section className="membership-pricing" data-testid="membership-pricing">
        <header><span>MEMBERSHIP PASSES</span><h2>{t("membership.pricingTitle")}</h2><p>{t("membership.pricingDesc")}</p></header>
        <div className="plan-grid">
          {membershipPlanList.map((plan) => (
            <PlanCard key={plan.id} plan={plan} selected={selectedPlanId === plan.id} onSelect={() => setSelectedPlanId(plan.id)} />
          ))}
        </div>
      </section>

      <div className="membership-checkout-grid">
        <section className="enterprise-payment-card" data-testid="enterprise-payment-code">
          <div className="payment-card-copy">
            <span><QrCode />{t("payment.account")}</span>
            <h2>{t("payment.title")}</h2>
            <p>{t("payment.description")}</p>
            <div className="payment-selected-plan"><small>{t("payment.selected")}</small><b>{membershipName(selectedPlan.tier, t)} · ¥{selectedPlan.priceFen / 100}/{selectedPlan.billingPeriod === "month" ? t("membership.month") : t("membership.year")}</b></div>
            <p className="enterprise-benefit"><Gift />{t("payment.enterpriseDiscount")}</p>
          </div>
          {paymentQrUrl ? (
            <a className="payment-qr-frame" href={paymentQrUrl} target="_blank" rel="noreferrer" aria-label={t("payment.openQr")}>
              <img src={paymentQrUrl} alt={t("payment.qrAlt")} />
              <span>{t("payment.openQr")}<ArrowRight /></span>
            </a>
          ) : (
            <div className="payment-qr-frame disabled payment-qr-locked" aria-label={!paymentEnabled ? t("payment.unavailable") : paymentQrError || t("payment.loadingQr")}>
              {!paymentEnabled || paymentQrError ? <LockKeyhole aria-hidden="true" /> : <QrCode aria-hidden="true" />}
              <span>{!paymentEnabled ? t("payment.unavailable") : paymentQrError || t("payment.loadingQr")}</span>
            </div>
          )}
        </section>

        <section className="payment-order-card">
          <div className="checkout-heading"><ReceiptText /><span><small>MANUAL REVIEW</small><h2>{t("payment.submitTitle")}</h2></span></div>
          <p className="payment-preview-warning"><ShieldCheck />{t(productionMode ? "payment.liveWarning" : "payment.previewWarning")}</p>
          <form onSubmit={submitPayment}>
            <label><span>{t("payment.payer")}</span><input data-testid="payment-payer-input" value={payerName} onChange={(event) => setPayerName(event.target.value)} maxLength={80} placeholder={t("payment.payerPlaceholder")} required /></label>
            <label><span>{t("payment.reference")}</span><input data-testid="payment-reference-input" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} minLength={productionMode ? 4 : undefined} maxLength={80} placeholder={t("payment.referencePlaceholder")} required={productionMode} /></label>
            <button data-testid="payment-submit" className="primary-button payment-submit" disabled={!paymentEnabled || paymentBusy || (productionMode && !paymentQrUrl) || payerName.trim().length < 2 || !referenceIsValid}><WalletCards />{!paymentEnabled ? t("payment.unavailable") : paymentBusy ? t("payment.submitting") : t("payment.submit")}</button>
          </form>
          {paymentServiceError && <p className="redeem-feedback" role="alert">{paymentServiceError}</p>}
          {orders.length > 0 && <div className="user-orders"><span>{t("payment.orders")}</span>{orders.slice(0, 3).map((order) => <p key={order.id}><b>¥{order.amountFen / 100}</b><em className={order.status}>{t(`payment.status.${order.status}`)}</em><small>{new Date(order.createdAt).toLocaleDateString(locale)}</small></p>)}</div>}
        </section>
      </div>

      <section className="redeem-card">
        <div className="redeem-copy"><span><Gift /></span><div><small>ENTERPRISE BENEFIT</small><h2>{t("redeem.title")}</h2><p>{t("redeem.description")}</p></div></div>
        <form onSubmit={submitRedemption}>
          <input data-testid="redeem-code-input" value={redeemCode} onChange={(event) => { setRedeemCode(event.target.value); setRedeemFeedback(""); }} placeholder={t("redeem.placeholder")} autoCapitalize="characters" />
          <button data-testid="redeem-code-submit" disabled={!paymentEnabled || redeemBusy || !redeemCode.trim()}>{!paymentEnabled ? t("payment.unavailable") : redeemBusy ? t("redeem.checking") : t("redeem.submit")}<ArrowRight /></button>
        </form>
        {redeemFeedback && <p className="redeem-feedback" data-testid="redeem-code-feedback" role="status">{redeemFeedback}</p>}
      </section>
    </div>
  );
}

function PlanCard({ plan, selected, onSelect }: { plan: MembershipPlan; selected: boolean; onSelect: () => void }) {
  const { t } = useI18n();
  const isMax = plan.tier === "max";
  const period = plan.billingPeriod === "month" ? t("membership.month") : t("membership.year");
  const benefits = isMax
    ? [t("membership.maxBenefitCourse"), t("membership.maxBenefitAi"), t("membership.maxBenefitPriority")]
    : [t("membership.proBenefitCourse"), t("membership.proBenefitAi", { count: PRO_AI_MONTHLY_RUN_LIMIT }), t("membership.proBenefitGrowth")];
  return (
    <button className={`plan-card ${plan.tier}${selected ? " selected" : ""}`} data-testid={`plan-${plan.id}`} onClick={onSelect} type="button">
      <span className="plan-card-top"><em>{plan.tier.toUpperCase()}</em>{plan.billingPeriod === "year" && <b>{t("membership.bestValue")}</b>}{selected && <CheckCircle2 />}</span>
      <span className="plan-price"><small>¥</small><strong>{plan.priceFen / 100}</strong><em>/{period}</em></span>
      <span className="plan-name">{membershipName(plan.tier, t)} · {plan.billingPeriod === "month" ? t("membership.monthly") : t("membership.yearly")}</span>
      <span className="plan-benefits">{benefits.map((benefit) => <span key={benefit}><Check />{benefit}</span>)}</span>
      <span className="plan-select">{selected ? t("membership.selected") : t("membership.select")}<ArrowRight /></span>
    </button>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={active ? "nav-button active" : "nav-button"} onClick={onClick} aria-current={active ? "page" : undefined}>
      {icon}<span>{label}</span>
    </button>
  );
}

function AuthScreen({
  accounts,
  onLogin,
  onRegistered,
}: {
  accounts: UserAccount[];
  onLogin: (account: UserAccount) => void;
  onRegistered: (account: UserAccount) => void;
}) {
  const { t } = useI18n();
  const demoAccessEnabled = isLocalPreviewHost();
  const productionMode = productionApiEnabled();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        const account = productionMode
          ? await productionLogin(email.trim(), password)
          : await authenticate(email, password);
        if (!account) throw new Error(t("auth.errorLogin"));
        onLogin(account);
      } else {
        if (name.trim().length < 2) throw new Error(t("auth.errorName"));
        if (password.length < (productionMode ? 10 : 8)) throw new Error(t(productionMode ? "auth.errorPasswordProduction" : "auth.errorPassword"));
        const account = productionMode
          ? await productionRegister({ name: name.trim(), email: email.trim(), password })
          : await registerAccount({ name, email, password });
        onRegistered(account);
      }
    } catch (reason) {
      const code = productionErrorCode(reason);
      const message = code === "INVALID_CREDENTIALS" || code === "ACCOUNT_DISABLED" || (reason instanceof ProductionApiError && reason.status === 401)
        ? t("auth.errorLogin")
        : code === "EMAIL_EXISTS" || code === "EMAIL_ALREADY_EXISTS" || code === "EMAIL_IN_USE" || code === "INVALID_EMAIL"
          ? t(code === "INVALID_EMAIL" ? "auth.errorEmail" : "auth.errorEmailExists")
          : code === "INVALID_PASSWORD"
            ? t("auth.errorPasswordProduction")
          : reason instanceof ProductionApiError
            ? t("service.unavailable")
            : reason instanceof Error
              ? reason.message
              : t("auth.errorGeneric");
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const enterDemo = (id: string) => {
    const account = accounts.find((item) => item.id === id && item.active);
    if (account) onLogin(account);
  };

  return (
    <main className="auth-screen">
      <div className="auth-language"><LanguageSwitcher /></div>
      <section className="auth-story">
        <div className="auth-brand"><span className="mini-sun" />{t("brand.name")} <small>happykua</small></div>
        <div className="auth-copy">
          <span className="eyebrow light"><Sparkles size={15} />{t("auth.eyebrow")}</span>
          <h1>{t("auth.titleLead")}<br /><span>{t("auth.titleAccent")}</span></h1>
          <p>{t("auth.description")}</p>
        </div>
        <div className="auth-mascot">
          <span className="orbit-label label-one">{t("auth.orbitInsight")}</span>
          <span className="orbit-label label-two">{t("auth.orbitProduct")}</span>
          <span className="orbit-label label-three">{t("auth.orbitAction")}</span>
          <div className="mascot-halo" />
          <img src={qingmiBuddy} alt="背着知识书包的晴幂学习伙伴小晴" />
        </div>
        <div className="auth-proof">
          <span><b>8</b> {t("auth.proofStages")}</span><span><b>32</b> {t("auth.proofLessons")}</span><span><b>1</b> {t("auth.proofWork")}</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-heading">
            <span className="auth-icon">夸</span>
            <div><h2>{mode === "login" ? t("auth.welcome") : t("auth.joinTitle")}</h2><p>{mode === "login" ? t("auth.loginHint") : t("auth.joinHint")}</p></div>
          </div>
          <div className="auth-tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>{t("auth.login")}</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>{t("auth.register")}</button>
          </div>
          <form onSubmit={submit} className="auth-form">
            {mode === "register" && (
              <label><span>{t("auth.name")}</span><input dir="auto" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("auth.namePlaceholder")} autoComplete="name" required /></label>
            )}
            <label><span>{t("auth.email")}</span><input dir="ltr" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required /></label>
            <label>
              <span>{t("auth.password")}</span>
              <div className="password-field"><input dir="ltr" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "register" ? productionMode ? 10 : 8 : undefined} maxLength={128} placeholder={mode === "register" ? t(productionMode ? "auth.passwordNewProduction" : "auth.passwordNew") : t("auth.passwordEnter")} autoComplete={mode === "login" ? "current-password" : "new-password"} required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={t("auth.passwordToggle")}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" disabled={busy}>{busy ? t("auth.entering") : mode === "login" ? t("auth.enterSpace") : t("auth.create")}<ArrowRight /></button>
          </form>

          {demoAccessEnabled && <><div className="demo-divider"><span>{t("auth.try")}</span></div>
            <div className="demo-buttons">
              <button onClick={() => enterDemo("demo-learner")}><GraduationCap /><span><b>{t("auth.demoLearner")}</b><small>{t("auth.demoLearnerSub")}</small></span><ChevronRight /></button>
              <button onClick={() => enterDemo("demo-admin")}><ShieldCheck /><span><b>{t("auth.demoAdmin")}</b><small>{t("auth.demoAdminSub")}</small></span><ChevronRight /></button>
            </div></>}
          <p className="local-auth-note"><LockKeyhole />{t(productionMode ? "auth.productionNote" : "auth.localNote")}</p>
        </div>
        <p className="auth-footer">{t("auth.footer")}</p>
      </section>
    </main>
  );
}

function Dashboard({
  user,
  progress,
  completed,
  buddyLevel,
  nextLesson,
  progressPercent,
  onOpenLesson,
  onNavigate,
}: {
  user: UserAccount;
  progress: LearningProgress;
  completed: string[];
  buddyLevel: ReturnType<typeof getBuddyLevel>;
  nextLesson: (Lesson & { stageId: string; stageTitle: string }) | null;
  progressPercent: number;
  onOpenLesson: (lesson: Lesson) => void;
  onNavigate: (view: AppView) => void;
}) {
  const { t, localizeStage, localizeLesson, localizeBuddy } = useI18n();
  const completedCount = completed.length;
  const displayLevel = localizeBuddy(buddyLevel);
  const savedPoint = loadLearningPoint(user.id);
  const savedLesson = savedPoint ? allLessons.find((lesson) => lesson.id === savedPoint.lessonId) ?? null : null;
  const focusLesson = savedLesson && !completed.includes(savedLesson.id) ? savedLesson : nextLesson;
  const displayFocusLesson = focusLesson ? localizeLesson(focusLesson) : null;
  const focusPhase = savedLesson?.id === focusLesson?.id ? savedPoint?.phase ?? "concept" : "concept";
  const latestEvidenceEntry = Object.entries(progress.evidenceByLessonId)
    .filter(([, item]) => Boolean(item?.submittedAt))
    .sort(([, left], [, right]) => Date.parse(right?.submittedAt ?? "") - Date.parse(left?.submittedAt ?? ""))
    .at(0);
  const latestEvidenceLesson = latestEvidenceEntry
    && localDateKey(new Date(latestEvidenceEntry[1]?.submittedAt ?? "")) === localDateKey()
    ? allLessons.find((lesson) => lesson.id === latestEvidenceEntry[0])
    : undefined;
  const praiseReason = latestEvidenceLesson ? "evidence" : savedPoint ? "phase" : completedCount > 0 ? "progress" : progress.streak > 1 ? "streak" : "welcome";
  const praiseText = latestEvidenceLesson
    ? t("dashboard.praiseEvidence", { title: localizeLesson(latestEvidenceLesson).title })
    : savedPoint && savedLesson
      ? t("dashboard.praisePhase", { title: localizeLesson(savedLesson).title, phase: t(`learning.phase.${savedPoint.phase}`) })
      : completedCount > 0
      ? t("dashboard.praiseProgress", { count: completedCount })
      : progress.streak > 1
        ? t("dashboard.praiseStreak", { count: progress.streak })
        : t("dashboard.praiseWelcome");
  const focusStage = focusLesson
    ? courseStages.find((stage) => stage.lessons.some((lesson) => lesson.id === focusLesson.id))
    : null;

  return (
    <div className="page dashboard-page dashboard-vnext">
      <section className="progress-praise" data-testid="progress-praise" data-praise-reason={praiseReason} aria-label={t("dashboard.praise")}>
        <div className="praise-buddy"><img src={qingmiBuddy} alt="" /><Sparkles /></div>
        <div><span>{t("dashboard.praise")}</span><p>{praiseText}</p></div>
        <small><Flame />{t("dashboard.streak", { count: progress.streak })}</small>
      </section>

      <section className="today-focus">
        <div className="today-focus-copy">
          <span className="eyebrow">{timeGreeting(t)}，{user.name}</span>
          <h1>{displayFocusLesson ? t("dashboard.focusTitle") : t("dashboard.capstone")}</h1>
          <p>{displayFocusLesson?.summary ?? t("dashboard.focusComplete")}</p>
          {focusLesson && displayFocusLesson ? (
            <button className="primary-button focus-cta" onClick={() => onOpenLesson(focusLesson)}>
              <Play />{savedLesson?.id === focusLesson.id ? t("dashboard.resumePhase", { phase: t(`learning.phase.${focusPhase}`) }) : t("dashboard.startStep")}<ArrowRight />
            </button>
          ) : (
            <button className="primary-button focus-cta" onClick={() => onNavigate("journey")}><Trophy />{t("dashboard.capstone")}<ArrowRight /></button>
          )}
        </div>
        <aside className="focus-task">
          <div className="focus-task-head">
            <span>{focusStage ? `${localizeStage(focusStage).number} · ${localizeStage(focusStage).title}` : t("dashboard.journeyTitle")}</span>
            <b>{progressPercent}%</b>
          </div>
          <ProgressBar value={progressPercent} />
          <div className="focus-output"><Target /><span><small>{t("lesson.outcome")}</small><b>{displayFocusLesson?.deliverable ?? t("dashboard.focusComplete")}</b></span></div>
          <div className="focus-buddy-level"><img src={qingmiBuddy} alt="" /><span><small>Lv.{buddyLevel.level} · {displayLevel.name}</small><b>{progress.xp} {t("common.xp")}</b></span></div>
        </aside>
      </section>

      <section className="learning-loop-preview" aria-labelledby="learning-loop-title">
        <div className="section-heading-row compact-heading"><div><span className="section-kicker">ONE LESSON · ONE OUTPUT</span><h2 id="learning-loop-title">{t("learning.loopTitle")}</h2></div><button className="text-button" onClick={() => onNavigate("course")}>{t("dashboard.browse")}<ChevronRight /></button></div>
        <div className="four-step-preview">
          {([
            ["concept", <Lightbulb />, t("learning.phase.concept"), t("learning.phase.conceptHint")],
            ["learn", <BookOpen />, t("learning.phase.learn"), t("learning.phase.learnHint")],
            ["practice", <BrainCircuit />, t("learning.phase.practice"), t("learning.phase.practiceHint")],
            ["workbench", <FolderOpen />, t("learning.phase.workbench"), t("learning.phase.workbenchHint")],
          ] as const).map(([id, icon, title, hint], index) => <article key={id} className={focusPhase === id ? "active" : ""}><span>{icon}</span><div><small>0{index + 1}</small><b>{title}</b><p>{hint}</p></div></article>)}
        </div>
      </section>

      <section className="journey-peek">
        <div><span className="section-kicker">STRATEGY → GLOBAL</span><h2>{t("dashboard.journeyTitle")}</h2></div>
        <div className="journey-peek-track">{courseStages.map((stage) => {
          const displayStage = localizeStage(stage);
          const done = stage.lessons.filter((lesson) => completed.includes(lesson.id)).length;
          return <button key={stage.id} onClick={() => onNavigate("course")} className={done === stage.lessons.length ? "done" : done > 0 ? "current" : ""}><span>{done === stage.lessons.length ? <Check /> : stage.number}</span><b>{displayStage.title}</b><small>{done}/4</small></button>;
        })}</div>
      </section>
    </div>
  );
}

function LanguageCoverageNotice({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={compact ? "language-coverage-notice compact" : "language-coverage-notice"} role="note"><Globe2 aria-hidden="true" /><p>{text}</p></div>;
}

function CourseCenter({ completed, progressPercent, onOpenLesson }: { completed: string[]; progressPercent: number; onOpenLesson: (lesson: Lesson) => void }) {
  const { t, locale, localizeStage, localizeImmortal, localizeLesson } = useI18n();
  const nextLesson = allLessons.find((lesson) => !completed.includes(lesson.id)) ?? allLessons[0];
  const displayNextLesson = localizeLesson(nextLesson);
  return (
    <div className="page course-page course-vnext">
      <header className="course-vnext-head">
        <div><span className="section-kicker">THE SOLO COMPANY PRODUCT JOURNEY</span><h1>{t("course.title")}</h1><p>{t("course.description")}</p></div>
        <div className="course-progress-compact"><b>{progressPercent}%</b><ProgressBar value={progressPercent} /><small>{t("course.progressDone", { done: completed.length, total: allLessons.length })}</small></div>
      </header>
      {locale !== "zh-CN" && <LanguageCoverageNotice text={t("course.languageCoverage")} />}
      <button className="course-next-card" onClick={() => onOpenLesson(nextLesson)}><span><Play /></span><div><small>{t("course.startRoute")}</small><b>{displayNextLesson.title}</b><p>{displayNextLesson.deliverable}</p></div><ArrowRight /></button>

      <section className="course-loop-strip"><div><span className="section-kicker">HOW EACH LESSON WORKS</span><h2>{t("learning.loopTitle")}</h2></div><ol><li><Lightbulb /><span><b>{t("learning.phase.concept")}</b><small>{t("learning.phase.conceptHint")}</small></span></li><li><BookOpen /><span><b>{t("learning.phase.learn")}</b><small>{t("learning.phase.learnHint")}</small></span></li><li><BrainCircuit /><span><b>{t("learning.phase.practice")}</b><small>{t("learning.phase.practiceHint")}</small></span></li><li><FolderOpen /><span><b>{t("learning.phase.workbench")}</b><small>{t("learning.phase.workbenchHint")}</small></span></li></ol></section>

      <section className="stage-accordion" aria-labelledby="stage-list-title">
        <div className="stage-accordion-heading"><span className="section-kicker">8 STAGES · STRATEGY TO GLOBAL</span><h2 id="stage-list-title">{t("course.orchestrate")}</h2><p>{t("course.orchestrateDesc")}</p></div>
        {courseStages.map((stage, index) => {
          const displayStage = localizeStage(stage);
          const immortal = immortalByStage[stage.id] ? localizeImmortal(immortalByStage[stage.id]) : undefined;
          const done = stage.lessons.filter((lesson) => completed.includes(lesson.id)).length;
          const guide = moduleGuides[stage.id];
          const shouldOpen = done > 0 && done < stage.lessons.length || (done === 0 && courseStages.slice(0, index).every((item) => item.lessons.every((lesson) => completed.includes(lesson.id))));
          return <details className="stage-disclosure" key={stage.id} open={shouldOpen}>
            <summary><span className="stage-disclosure-number">{done === 4 ? <Check /> : stage.number}</span><div><small>{displayStage.weeks} · {immortal?.domain}</small><h3>{displayStage.title}</h3><p>{displayStage.subtitle}</p></div><em>{done}/4</em><ChevronDown /></summary>
            <div className="stage-disclosure-body">
              {immortal && <div className="stage-question"><Compass /><span><small>{t("course.keyQuestion")}</small><b>{immortal.keyQuestion}</b></span></div>}
              <div className="lesson-list compact-lessons">{displayStage.lessons.map((lesson, lessonIndex) => {
                const doneLesson = completed.includes(lesson.id);
                return <button key={lesson.id} className={doneLesson ? "lesson-row completed" : "lesson-row"} onClick={() => onOpenLesson(lesson)}><span className="lesson-index">{doneLesson ? <Check /> : `${stage.number}.${lessonIndex + 1}`}</span><div><b>{lesson.title}</b><small>{lesson.duration} · {lesson.deliverable}</small></div><span className="lesson-action">{doneLesson ? t("common.completed") : t("common.start")}<ChevronRight /></span></button>;
              })}</div>
              {guide && <details className="reading-disclosure"><summary><LibraryBig />{t("course.coreReading")}<ChevronDown /></summary><div>{guide.books.map((book) => <a href={book.sourceUrl} target="_blank" rel="noreferrer" key={book.originalTitle}><b>{locale === "zh-CN" ? book.title : book.originalTitle}</b><small>{book.author}</small><ExternalLink /></a>)}</div></details>}
            </div>
          </details>;
        })}
      </section>

      <details className="methods-disclosure"><summary><Layers3 /><span><b>{methodUi[locale].title}</b><small>{methodUi[locale].description}</small></span><ChevronDown /></summary><MethodStack locale={locale} /></details>
    </div>
  );
}

function MethodStack({ locale }: { locale: ReturnType<typeof useI18n>["locale"] }) {
  const ui = methodUi[locale];
  const icons: Record<string, ReactNode> = {
    yc: <Target />,
    "jason-cohen": <BadgeCheck />,
    "shape-up": <Layers3 />,
    para: <LibraryBig />,
  };

  return (
    <section className="method-stack" aria-labelledby="method-stack-title">
      <div className="method-stack-heading">
        <div><span className="section-kicker">{ui.eyebrow}</span><h2 id="method-stack-title">{ui.title}</h2></div>
        <p>{ui.description}</p>
      </div>
      <div className="method-card-track">
        {methodFrameworks.map((framework) => {
          const method = localizeMethod(framework, locale);
          return (
            <article className={`method-card method-${framework.id}`} key={framework.id}>
              <div className="method-card-top"><span>{icons[framework.id]}</span><small>{framework.index} · {framework.label}</small></div>
              <h3>{method.name}</h3>
              <p>{method.thesis}</p>
              <div className="method-practices"><small>{ui.principles}</small><ul>{method.practices.map((practice) => <li key={practice}><Check />{practice}</li>)}</ul></div>
              <div className="method-output"><small>{ui.output}</small><b>{method.output}</b></div>
              <div className="method-card-footer">
                <span><small>{ui.stages}</small><b>{framework.stages.join(" · ")}</b></span>
                <div>{framework.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" title={`${ui.source}: ${source.label}`}><ExternalLink />{source.label}</a>)}</div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="solo-workbench">
        <div className="solo-workbench-intro"><span className="section-kicker">{ui.workbenchEyebrow}</span><h3>{ui.workbenchTitle}</h3><p>{ui.workbenchDescription}</p><b>{ui.loop}</b></div>
        <div className="workbench-lanes">
          {workbenchLanes.map((lane, index) => (
            <article key={lane.id}><span>{lane.code}</span><em>{`0${index + 1}`}</em><h4>{lane.title[locale]}</h4><p>{lane.description[locale]}</p></article>
          ))}
        </div>
      </div>
    </section>
  );
}

function JourneyMap({ completed, onOpenLesson }: { completed: string[]; onOpenLesson: (lesson: Lesson) => void }) {
  const { t, localizeStage } = useI18n();
  const displayStages = courseStages.map(localizeStage);
  const capstoneRequirements = [
    { label: displayStages[0].deliverable, stageIds: ["identity"] },
    { label: displayStages[1].deliverable, stageIds: ["research"] },
    { label: `${displayStages[2].title} · ${displayStages[3].title}`, stageIds: ["product", "design"] },
    { label: displayStages[4].deliverable, stageIds: ["build"] },
    { label: displayStages[5].deliverable, stageIds: ["launch"] },
    { label: displayStages[6].deliverable, stageIds: ["growth"] },
    { label: displayStages[7].deliverable, stageIds: ["opc"] },
  ];

  return (
    <div className="page journey-page">
      <PageIntro kicker="PRODUCT · BUSINESS · OPERATIONS" title={t("journey.title")} description={t("journey.description")} />
      <div className="journey-layout">
        <div className="journey-track">
          {courseStages.map((stage, index) => {
            const displayStage = localizeStage(stage);
            const done = stage.lessons.filter((lesson) => completed.includes(lesson.id)).length;
            const isComplete = done === stage.lessons.length;
            const next = stage.lessons.find((lesson) => !completed.includes(lesson.id));
            return (
              <article key={stage.id} className={isComplete ? "journey-node complete" : done > 0 ? "journey-node active" : "journey-node"} style={{ "--stage-color": stage.color } as React.CSSProperties}>
                <div className="journey-marker">{isComplete ? <Check /> : stage.number}</div>
                <div className="journey-content">
                  <div className="journey-meta"><span>{stage.number} · {displayStage.weeks}</span><span>{t("journey.lessonCount", { count: done })}</span></div>
                  <h2>{displayStage.title}</h2><p>{displayStage.outcome}</p>
                  <div className="journey-output"><Trophy /><span><small>{t("journey.takeAway")}</small><b>{displayStage.deliverable}</b></span></div>
                  {next && <button className="text-button" onClick={() => onOpenLesson(next)}>{done > 0 ? t("journey.continue") : index === 0 ? t("journey.begin") : t("journey.view")}<ArrowRight /></button>}
                </div>
              </article>
            );
          })}
        </div>
        <aside className="capstone-card">
          <span className="section-kicker">CAPSTONE · {t("journey.capstone")}</span>
          <h2>{t("journey.capstoneTitle")}</h2>
          <p>{t("journey.capstoneDesc")}</p>
          <div className="capstone-checks">
            {capstoneRequirements.map((requirement, index) => {
              const done = requirement.stageIds.every((stageId) => {
                const stage = courseStages.find((item) => item.id === stageId);
                return stage?.lessons.every((lesson) => completed.includes(lesson.id));
              });
              return <span key={requirement.label} className={done ? "done" : ""}>{done ? <Check /> : <span>{index + 1}</span>}{requirement.label}</span>;
            })}
          </div>
          <div className="capstone-score"><b>{Math.round((completed.length / allLessons.length) * 100)}</b><span>{t("journey.maturity")}</span></div>
        </aside>
      </div>
    </div>
  );
}

function BuddyRoom({ progress, completed }: { progress: LearningProgress; completed: string[] }) {
  const { t, localizeBuddy, localizeStage } = useI18n();
  const rawLevel = getBuddyLevel(progress.xp);
  const level = localizeBuddy(rawLevel);
  const currentIndex = buddyLevels.findIndex((item) => item.level === level.level);
  const nextLevel = buddyLevels[currentIndex + 1];
  const knowledgeDomains = courseStages.map((stage) => ({
    name: localizeStage(stage).title,
    value: Math.round((stage.lessons.filter((lesson) => completed.includes(lesson.id)).length / stage.lessons.length) * 100),
    color: stage.color,
  }));

  return (
    <div className="page buddy-page">
      <PageIntro kicker="QINGMI KNOWLEDGE BUDDY" title={t("buddy.title")} description={t("buddy.description")} />
      <section className="buddy-lab">
        <div className="buddy-showcase">
          <div className="knowledge-particles">{eightImmortals.map((item, index) => <span key={item.stageId} style={{ "--i": index } as React.CSSProperties}>{item.glyph}</span>)}</div>
          <div className="showcase-glow" />
          <img src={qingmiBuddy} alt="知识伙伴小晴" />
          <div className="showcase-level"><small>{t("buddy.currentForm")}</small><b>Lv.{level.level} · {level.name}</b><span>{level.note}</span></div>
        </div>
        <div className="buddy-data">
          <span className="section-kicker">KNOWLEDGE ABSORPTION</span><h2>{t("buddy.nutrition")}</h2><p>{t("buddy.nutritionDesc")}</p>
          <div className="domain-bars">
            {knowledgeDomains.map((domain) => <div key={domain.name}><span><b>{domain.name}</b><em>{domain.value}%</em></span><div className="domain-track"><i style={{ width: `${domain.value}%`, background: domain.color }} /></div></div>)}
          </div>
          <div className="xp-explain"><Zap /><div><b>{t("buddy.absorbed", { count: progress.xp })}</b><span>{nextLevel ? t("buddy.next", { count: Math.max(0, nextLevel.min - progress.xp), level: localizeBuddy(nextLevel).name }) : t("buddy.max")}</span></div></div>
        </div>
      </section>

      <section className="level-road">
        <div className="section-heading-row"><div><span className="section-kicker">7 GROWTH FORMS</span><h2>{t("buddy.forms")}</h2></div></div>
        <div className="level-grid">
          {buddyLevels.map((item) => {
            const unlocked = progress.xp >= item.min;
            const displayItem = localizeBuddy(item);
            return <article key={item.level} className={unlocked ? "level-card unlocked" : "level-card"}><span className="level-dot">{unlocked ? <Sparkles /> : <LockKeyhole />}</span><small>LEVEL {item.level}</small><h3>{displayItem.name}</h3><p>{displayItem.note}</p><b>{item.min}+ {t("common.xp")}</b></article>;
          })}
        </div>
      </section>

      <section className="growth-rules">
        <div><Sparkles /><h3>{t("buddy.ruleReturn")}</h3><p>{t("buddy.ruleReturnDesc")}</p></div>
        <div><BookOpen /><h3>{t("buddy.ruleLesson")}</h3><p>{t("buddy.ruleLessonDesc")}</p></div>
        <div><Trophy /><h3>{t("buddy.ruleWork")}</h3><p>{t("buddy.ruleWorkDesc")}</p></div>
      </section>
    </div>
  );
}

function RoleAdmin({
  currentUser,
  accounts,
  onChange,
  onMembershipChanged,
  onToast,
}: {
  currentUser: UserAccount;
  accounts: UserAccount[];
  onChange: (accounts: UserAccount[]) => void;
  onMembershipChanged: () => void;
  onToast: (message: string) => void;
}) {
  const { t, roleLabel, roleDescription } = useI18n();
  const [operationsRevision, setOperationsRevision] = useState(0);
  const [enterpriseName, setEnterpriseName] = useState("");
  const [codeCount, setCodeCount] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const progressList = loadAllProgress();
  if (currentUser.role !== "admin") {
    return <div className="page"><div className="locked-panel"><LockKeyhole /><h1>{t("admin.locked")}</h1><p>{t("admin.currentRole", { role: roleLabel(currentUser.role) })}</p></div></div>;
  }
  if (productionApiEnabled()) {
    return <ProductionRoleAdmin currentUser={currentUser} onMembershipChanged={onMembershipChanged} onToast={onToast} />;
  }
  const activeCount = accounts.filter((item) => item.active).length;
  const learnerCount = accounts.filter((item) => item.role === "learner").length;
  const paymentOrders = loadPaymentOrders();
  const pendingOrders = paymentOrders.filter((order) => order.status === "pending");
  const redemptionCodes = loadRedemptionCodes();
  const averageProgress = accounts.length
    ? Math.round(progressList.reduce((sum, item) => sum + evidencedLessonIds(item).length / allLessons.length, 0) / accounts.length * 100)
    : 0;

  const patchAccount = (id: string, patch: Partial<UserAccount>) => {
    onChange(accounts.map((account) => account.id === id ? { ...account, ...patch } : account));
  };

  const reviewOrder = (orderId: string, approve: boolean) => {
    const reviewed = reviewPaymentOrder(orderId, currentUser.id, approve);
    if (!reviewed) return;
    setOperationsRevision((value) => value + 1);
    onMembershipChanged();
    onToast(approve ? t("admin.paymentApproved") : t("admin.paymentRejected"));
  };

  const generateCodes = async (event: FormEvent) => {
    event.preventDefault();
    setGeneratingCodes(true);
    const batch = await createEnterpriseRedemptionCodes({ enterpriseName, count: codeCount });
    setGeneratedCodes(batch.rawCodes);
    setGeneratingCodes(false);
    setOperationsRevision((value) => value + 1);
    onToast(t("admin.codesCreated", { count: batch.rawCodes.length }));
  };

  void operationsRevision;

  return (
    <div className="page admin-page">
      <PageIntro kicker="LOCAL ROLE MANAGEMENT" title={t("admin.title")} description={t("admin.description")} />
      <div className="admin-stats">
        <StatCard icon={<UsersRound />} value={`${accounts.length}`} label={t("admin.localAccounts")} tone="blue" />
        <StatCard icon={<ShieldCheck />} value={`${activeCount}`} label={t("admin.activeAccounts")} tone="green" />
        <StatCard icon={<GraduationCap />} value={`${learnerCount}`} label={t("admin.learners")} tone="gold" />
        <StatCard icon={<BarChart3 />} value={`${averageProgress}%`} label={t("admin.avgProgress")} tone="coral" />
      </div>
      <section className="admin-membership-grid">
        <article className="admin-payment-panel">
          <header><span><ReceiptText /></span><div><small>PAYMENT REVIEW</small><h2>{t("admin.paymentReview")}</h2><p>{t("admin.paymentReviewDesc")}</p></div><em>{pendingOrders.length}</em></header>
          <div className="admin-order-list">
            {pendingOrders.length === 0 ? <p className="admin-empty"><CheckCircle2 />{t("admin.noPendingPayments")}</p> : pendingOrders.map((order) => {
              const account = accounts.find((item) => item.id === order.userId);
              const plan = MEMBERSHIP_PLANS[order.planId];
              return <div className="admin-order" data-testid="admin-payment-order" key={order.id}><div><b>{account?.name ?? order.userId}</b><small>{order.payerName} · ¥{order.amountFen / 100} · {membershipName(plan.tier, t)}</small><em>{order.paymentReference || t("admin.noReference")}</em></div><span><button data-testid="admin-reject-payment" onClick={() => reviewOrder(order.id, false)}>{t("admin.reject")}</button><button data-testid="admin-approve-payment" onClick={() => reviewOrder(order.id, true)}><Check />{t("admin.approve")}</button></span></div>;
            })}
          </div>
        </article>
        <article className="admin-code-panel">
          <header><span><Gift /></span><div><small>ENTERPRISE CODES</small><h2>{t("admin.enterpriseCodes")}</h2><p>{t("admin.enterpriseCodesDesc")}</p></div><em>{redemptionCodes.filter((code) => code.status === "issued" && code.campaignId !== "local-qa-demo").length}</em></header>
          <form onSubmit={generateCodes}>
            <label><span>{t("admin.enterpriseName")}</span><input data-testid="enterprise-name-input" value={enterpriseName} onChange={(event) => setEnterpriseName(event.target.value)} placeholder={t("admin.enterpriseNamePlaceholder")} maxLength={100} required /></label>
            <label><span>{t("admin.codeSeats")}</span><input data-testid="enterprise-code-count" type="number" min={1} max={100} value={codeCount} onChange={(event) => setCodeCount(Number(event.target.value))} /></label>
            <button data-testid="enterprise-code-generate" className="primary-button" disabled={generatingCodes || enterpriseName.trim().length < 2}><Gift />{generatingCodes ? t("admin.generating") : t("admin.generateCodes")}</button>
          </form>
          {generatedCodes.length > 0 && <div className="generated-code-batch"><div><b>{t("admin.generatedCodes")}</b><button onClick={() => navigator.clipboard?.writeText(generatedCodes.join("\n"))}><Clipboard />{t("admin.copyAll")}</button></div><textarea data-testid="generated-enterprise-codes" readOnly value={generatedCodes.join("\n")} /><p><ShieldCheck />{t("admin.codeSecurity")}</p></div>}
        </article>
      </section>
      <section className="admin-table-card">
        <div className="admin-table-heading"><div><h2>{t("admin.accountList")}</h2><p>{t("admin.roleImpact")}</p></div><span><ShieldCheck />{t("admin.leastPrivilege")}</span></div>
        <div className="account-table">
          <div className="account-row account-header"><span>{t("admin.user")}</span><span>{t("admin.learningProgress")}</span><span>{t("admin.role")}</span><span>{t("admin.status")}</span></div>
          {accounts.map((account) => {
            const accountProgress = progressList.find((item) => item.userId === account.id);
            const done = accountProgress ? evidencedLessonIds(accountProgress).length : 0;
            const self = account.id === currentUser.id;
            return (
              <div className="account-row" key={account.id}>
                <div className="account-identity"><span>{account.name.slice(0, 1)}</span><div><b>{account.name}{self && <em>{t("admin.currentAccount")}</em>}</b><small>{account.email}</small><small className="account-membership"><Crown />{membershipName(loadMembershipSnapshot(account.id).tier, t)}</small></div></div>
                <div className="account-progress"><span>{done}/32 {t("common.lessons")}</span><ProgressBar value={(done / 32) * 100} /></div>
                <label className="select-wrap"><span className="sr-only">{account.name} · {t("admin.role")}</span><select value={account.role} disabled={self} onChange={(event) => patchAccount(account.id, { role: event.target.value as UserRole })}><option value="learner">{roleLabel("learner")}</option><option value="mentor">{roleLabel("mentor")}</option><option value="admin">{roleLabel("admin")}</option></select></label>
                <button className={account.active ? "status-toggle on" : "status-toggle"} disabled={self} onClick={() => patchAccount(account.id, { active: !account.active })}><span />{account.active ? t("admin.enabled") : t("admin.disabled")}</button>
              </div>
            );
          })}
        </div>
      </section>
      <section className="role-cards">
        {(["learner", "mentor", "admin"] as UserRole[]).map((role) => <article key={role}><span className={`role-icon ${role}`}>{role === "learner" ? <GraduationCap /> : role === "mentor" ? <BadgeCheck /> : <ShieldCheck />}</span><div><h3>{roleLabel(role)}</h3><p>{roleDescription(role)}</p></div></article>)}
      </section>
    </div>
  );
}

function ProductionRoleAdmin({
  currentUser,
  onMembershipChanged,
  onToast,
}: {
  currentUser: UserAccount;
  onMembershipChanged: () => void | Promise<void>;
  onToast: (message: string) => void;
}) {
  const { t, locale } = useI18n();
  const [pendingOrders, setPendingOrders] = useState<PaymentOrder[]>([]);
  const [issuedCodeCount, setIssuedCodeCount] = useState(0);
  const [enterpriseName, setEnterpriseName] = useState("");
  const [codeCount, setCodeCount] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState("");
  const [reviewingOrderId, setReviewingOrderId] = useState("");
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const requestRef = useRef(0);

  const reloadOperations = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const [orders, availableCodes] = await Promise.all([
        productionAdminPaymentOrders("pending"),
        productionAdminCodeCount(),
      ]);
      if (requestId !== requestRef.current) return;
      setPendingOrders(orders);
      setIssuedCodeCount(availableCodes);
      setServiceError("");
    } catch {
      if (requestId === requestRef.current) setServiceError(t("admin.serviceError"));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reloadOperations();
    return () => {
      requestRef.current += 1;
    };
  }, [reloadOperations]);

  const reviewOrder = async (orderId: string, approve: boolean) => {
    if (reviewingOrderId) return;
    setReviewingOrderId(orderId);
    setServiceError("");
    try {
      await productionAdminReviewOrder(orderId, approve);
      setPendingOrders((current) => current.filter((order) => order.id !== orderId));
      if (approve) await onMembershipChanged();
      onToast(approve ? t("admin.paymentApproved") : t("admin.paymentRejected"));
    } catch {
      setServiceError(t("admin.serviceError"));
      void reloadOperations();
    } finally {
      setReviewingOrderId("");
    }
  };

  const generateCodes = async (event: FormEvent) => {
    event.preventDefault();
    if (generatingCodes || enterpriseName.trim().length < 2) return;
    setGeneratingCodes(true);
    setServiceError("");
    try {
      const codes = await productionAdminGenerateCodes({ enterpriseName: enterpriseName.trim(), count: codeCount });
      setGeneratedCodes(codes);
      setIssuedCodeCount((current) => current + codes.length);
      onToast(t("admin.codesCreated", { count: codes.length }));
    } catch {
      setServiceError(t("admin.serviceError"));
    } finally {
      setGeneratingCodes(false);
    }
  };

  return (
    <div className="page admin-page">
      <PageIntro kicker="PRODUCTION OPERATIONS" title={t("admin.productionTitle")} description={t("admin.productionDescription")} />
      <div className="admin-stats">
        <StatCard icon={<ShieldCheck />} value={currentUser.name} label={t("admin.currentOperator")} tone="blue" />
        <StatCard icon={<ReceiptText />} value={`${pendingOrders.length}`} label={t("admin.pendingPayments")} tone="gold" />
        <StatCard icon={<Gift />} value={`${issuedCodeCount}`} label={t("admin.availableCodes")} tone="green" />
        <StatCard icon={loading ? <Clock3 /> : <BadgeCheck />} value={loading ? "…" : t("admin.connected")} label={t("admin.productionService")} tone="coral" />
      </div>
      {serviceError && <p className="form-error" role="alert">{serviceError} <button type="button" onClick={() => void reloadOperations()}>{t("admin.retry")}</button></p>}
      <section className="admin-membership-grid">
        <article className="admin-payment-panel">
          <header><span><ReceiptText /></span><div><small>PAYMENT REVIEW</small><h2>{t("admin.paymentReview")}</h2><p>{t("admin.paymentReviewDesc")}</p></div><em>{pendingOrders.length}</em></header>
          <div className="admin-order-list">
            {loading ? <p className="admin-empty"><Clock3 />{t("admin.loading")}</p> : pendingOrders.length === 0 ? <p className="admin-empty"><CheckCircle2 />{t("admin.noPendingPayments")}</p> : pendingOrders.map((order) => {
              const plan = MEMBERSHIP_PLANS[order.planId];
              return <div className="admin-order" data-testid="admin-payment-order" key={order.id}><div><b>{order.payerName}</b><small>{order.userId} · ¥{order.amountFen / 100} · {plan ? membershipName(plan.tier, t) : order.planId}</small><em>{order.paymentReference || t("admin.noReference")} · {new Date(order.createdAt).toLocaleDateString(locale)}</em></div><span><button data-testid="admin-reject-payment" disabled={Boolean(reviewingOrderId)} onClick={() => void reviewOrder(order.id, false)}>{t("admin.reject")}</button><button data-testid="admin-approve-payment" disabled={Boolean(reviewingOrderId)} onClick={() => void reviewOrder(order.id, true)}><Check />{reviewingOrderId === order.id ? t("admin.reviewing") : t("admin.approve")}</button></span></div>;
            })}
          </div>
        </article>
        <article className="admin-code-panel">
          <header><span><Gift /></span><div><small>ENTERPRISE CODES</small><h2>{t("admin.enterpriseCodes")}</h2><p>{t("admin.enterpriseCodesDesc")}</p></div><em>{issuedCodeCount}</em></header>
          <form onSubmit={generateCodes}>
            <label><span>{t("admin.enterpriseName")}</span><input data-testid="enterprise-name-input" value={enterpriseName} onChange={(event) => setEnterpriseName(event.target.value)} placeholder={t("admin.enterpriseNamePlaceholder")} maxLength={100} required /></label>
            <label><span>{t("admin.codeSeats")}</span><input data-testid="enterprise-code-count" type="number" min={1} max={100} value={codeCount} onChange={(event) => setCodeCount(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} /></label>
            <button data-testid="enterprise-code-generate" className="primary-button" disabled={generatingCodes || enterpriseName.trim().length < 2}><Gift />{generatingCodes ? t("admin.generating") : t("admin.generateCodes")}</button>
          </form>
          {generatedCodes.length > 0 && <div className="generated-code-batch"><div><b>{t("admin.generatedCodes")}</b><button onClick={() => navigator.clipboard?.writeText(generatedCodes.join("\n"))}><Clipboard />{t("admin.copyAll")}</button></div><textarea data-testid="generated-enterprise-codes" readOnly value={generatedCodes.join("\n")} /><p><ShieldCheck />{t("admin.codeSecurity")}</p></div>}
        </article>
      </section>
    </div>
  );
}

function ProfilePage({
  user,
  progress,
  membership,
  aiDecision,
  onMembership,
  onLogout,
  onReset,
}: {
  user: UserAccount;
  progress: LearningProgress;
  membership: MembershipSnapshot;
  aiDecision: AiUsageDecision;
  onMembership: () => void;
  onLogout: () => void;
  onReset: () => void;
}) {
  const { t, roleLabel } = useI18n();
  const [confirmReset, setConfirmReset] = useState(false);
  const evidencedCount = evidencedLessonIds(progress).length;
  return (
    <div className="page profile-page">
      <PageIntro kicker="YOUR SPACE" title={t("profile.title")} description={t("profile.description")} />
      <div className="profile-layout">
        <section className="profile-card">
          <div className="profile-avatar">{user.name.slice(0, 1)}<span><Sparkles /></span></div>
          <h2>{user.name}</h2><p>{user.email}</p><span className={`role-badge ${user.role}`}>{roleLabel(user.role)}</span>
          <div className="profile-numbers"><div><b>{progress.xp}</b><span>{t("common.xp")}</span></div><div><b>{evidencedCount}</b><span>{t("dashboard.statLessons")}</span></div><div><b>{progress.streak}</b><span>{t("dashboard.statStreak")}</span></div></div>
          <button className="outline-button full" onClick={onLogout}><LogOut />{t("profile.logout")}</button>
        </section>
        <div className="profile-settings">
          <section className={`setting-card membership-setting ${membership.tier}`}><div className="setting-icon gold"><Crown /></div><div><h3>{membershipName(membership.tier, t)}</h3><p>{membership.tier === "free" ? t("membership.freeDesc") : aiDecision.mode === "unlimited" ? t("membership.aiUnlimited") : t("membership.aiRemaining", { count: aiDecision.remainingRuns ?? 0 })}</p></div><button onClick={onMembership}>{membership.tier === "free" ? t("membership.select") : t("membership.viewPlans")}</button></section>
          <section className="setting-card"><div className="setting-icon blue"><KeyRound /></div><div><h3>{t("profile.identity")}</h3><p>{t("profile.identityDesc", { role: roleLabel(user.role) })}</p></div><BadgeCheck /></section>
          <section className="setting-card"><div className="setting-icon coral"><LockKeyhole /></div><div><h3>{t("profile.storage")}</h3><p>{t(productionApiEnabled() ? "profile.productionStorageDesc" : "profile.storageDesc")}</p></div><span className="preview-badge">{productionApiEnabled() ? "LIVE" : "PREVIEW"}</span></section>
          <section className="setting-card danger"><div className="setting-icon"><RotateCcw /></div><div><h3>{t("profile.restart")}</h3><p>{t("profile.restartDesc")}</p></div>{confirmReset ? <div className="confirm-actions"><button onClick={() => setConfirmReset(false)}>{t("common.cancel")}</button><button onClick={() => { onReset(); setConfirmReset(false); }}>{t("profile.confirmClear")}</button></div> : <button className="danger-button" onClick={() => setConfirmReset(true)}>{t("profile.clear")}</button>}</section>
        </div>
      </div>
    </div>
  );
}

const learningPhases: { id: LearningPhase; labelKey: string; hintKey: string; icon: ReactNode; protected: boolean }[] = [
  { id: "concept", labelKey: "learning.phase.concept", hintKey: "learning.phase.conceptHint", icon: <Lightbulb />, protected: false },
  { id: "learn", labelKey: "learning.phase.learn", hintKey: "learning.phase.learnHint", icon: <BookOpen />, protected: false },
  { id: "practice", labelKey: "learning.phase.practice", hintKey: "learning.phase.practiceHint", icon: <BrainCircuit />, protected: true },
  { id: "workbench", labelKey: "learning.phase.workbench", hintKey: "learning.phase.workbenchHint", icon: <FolderOpen />, protected: true },
];

function LessonDialog({
  userId,
  lesson,
  completed,
  legacyCompleted,
  evidence,
  aiDecision,
  canPractice,
  onClose,
  onSaveDraft,
  onComplete,
  onRunCoach,
  onMembershipRequired,
}: {
  userId: string;
  lesson: Lesson;
  completed: boolean;
  legacyCompleted: boolean;
  evidence: LearningProgress["evidenceByLessonId"][string] | null;
  aiDecision: AiUsageDecision;
  canPractice: boolean;
  onClose: () => void;
  onSaveDraft: (draft: LessonEvidenceDraft) => void;
  onComplete: (draft: LessonEvidenceDraft) => void;
  onRunCoach: (input: DeepSeekCoachRequest) => Promise<DeepSeekCoachResponse | null>;
  onMembershipRequired: () => void;
}) {
  const { t, locale, localizeLesson, localizeStage } = useI18n();
  const storedPoint = loadLearningPoint(userId);
  const storedPhase = storedPoint?.lessonId === lesson.id ? storedPoint.phase : "concept";
  const [phase, setPhase] = useState<LearningPhase>(!canPractice && (storedPhase === "practice" || storedPhase === "workbench") ? "learn" : storedPhase);
  const [evidenceText, setEvidenceText] = useState(evidence?.text ?? "");
  const [evidenceUrl, setEvidenceUrl] = useState(evidence?.url ?? "");
  const [draftSaved, setDraftSaved] = useState(false);
  const stage = courseStages.find((item) => item.lessons.some((candidate) => candidate.id === lesson.id));
  const displayLesson = localizeLesson(lesson);
  const displayStage = stage ? localizeStage(stage) : undefined;
  const moduleGuide = stage ? moduleGuides[stage.id] : undefined;
  const guide = lessonGuides[lesson.id];
  const draft = { text: evidenceText, url: evidenceUrl };
  const evidenceLength = evidenceText.trim().length;
  const validUrl = evidenceUrlIsValid(evidenceUrl);
  const canSubmit = evidenceCanSubmit(draft);
  const canSaveDraft = !completed && Boolean(evidenceText.trim() || evidenceUrl.trim());
  const currentPhaseIndex = learningPhases.findIndex((item) => item.id === phase);
  const goToPhase = (nextPhase: LearningPhase) => {
    const target = learningPhases.find((item) => item.id === nextPhase);
    if (target?.protected && !canPractice) {
      onMembershipRequired();
      return;
    }
    setPhase(nextPhase);
    saveLearningPoint(userId, lesson.id, nextPhase);
    window.requestAnimationFrame(resetScrollPosition);
  };
  useEffect(() => {
    const effectivePhase = !canPractice && (phase === "practice" || phase === "workbench") ? "learn" : phase;
    if (effectivePhase !== phase) setPhase(effectivePhase);
    saveLearningPoint(userId, lesson.id, effectivePhase);
  }, [canPractice, lesson.id, phase, userId]);
  return (
    <section className="learning-route" data-testid="learning-route" aria-labelledby="lesson-title">
      <header className="learning-route-header">
        <button data-testid="learning-back" className="learning-back" onClick={onClose}><ChevronRight />{t("learning.back")}</button>
        <div className="learning-route-language"><LanguageSwitcher compact /></div>
      </header>
      <div className="learning-title-block">
        <div className="lesson-breadcrumb"><span>{displayStage?.number} · {displayStage?.title}</span><ChevronRight /><span>{t("lesson.practical")}</span></div>
        <h1 id="lesson-title">{displayLesson.title}</h1>
        <p>{displayLesson.summary}</p>
        <div className="learning-outcome"><Trophy /><span><small>{t("lesson.outcome")}</small><b>{displayLesson.deliverable}</b></span></div>
      </div>
      {locale !== "zh-CN" && <LanguageCoverageNotice text={t("lesson.masterLanguageNotice")} compact />}
      <nav className="learning-phase-nav" aria-label={t("learning.phaseNav")}>
        {learningPhases.map((item, index) => <button data-testid={`learning-phase-${item.id}`} key={item.id} className={phase === item.id ? "active" : ""} aria-current={phase === item.id ? "step" : undefined} onClick={() => goToPhase(item.id)}><span>{phase === item.id ? item.icon : index + 1}</span><div><b>{t(item.labelKey)}</b><small>{t(item.hintKey)}</small></div>{item.protected && !canPractice && <LockKeyhole />}</button>)}
      </nav>
      <div className="learning-phase-panel" data-testid="learning-phase-panel">
        {phase === "concept" && guide && <ConceptStep lesson={displayLesson} guide={guide} />}
        {phase === "learn" && guide && moduleGuide && <LearnStep lesson={displayLesson} guide={guide} moduleGuide={moduleGuide} foreignLocale={locale !== "zh-CN"} />}
        {phase === "practice" && guide && <DeepSeekPracticeStep lesson={displayLesson} guide={guide} aiDecision={aiDecision} onRunCoach={onRunCoach} />}
        {phase === "workbench" && <LocalHarnessStep lesson={displayLesson} />}
        {phase === "workbench" && <section className="lesson-submit-zone">
          <div className="practice-box"><span><Target />{t("lesson.yourProject")}</span><p>{displayLesson.practice}</p></div>
          <div className="deliverable-box"><span><Trophy />{t("lesson.saveEvidence")}</span><b>{displayLesson.deliverable}</b></div>
          <section className={completed ? "evidence-form submitted" : "evidence-form"}>
              <header><span><BadgeCheck /></span><div><h3>{t("lesson.evidenceTitle")}</h3><p>{t("lesson.evidenceDesc")}</p></div></header>
              {legacyCompleted && !completed && <div className="evidence-state legacy"><RotateCcw />{t("lesson.legacyEvidence")}</div>}
              {completed && <div className="evidence-state complete"><CheckCircle2 />{t("lesson.evidenceSubmitted")}</div>}
              <label htmlFor={`evidence-text-${lesson.id}`}>
                <span>{t("lesson.evidenceText")}</span>
                <textarea data-testid="evidence-text" id={`evidence-text-${lesson.id}`} maxLength={2000} value={evidenceText} onChange={(event) => { setEvidenceText(event.target.value); setDraftSaved(false); }} placeholder={t("lesson.evidencePlaceholder")} />
                <small className={evidenceLength >= 20 ? "valid" : ""}>{t("lesson.evidenceCount", { count: evidenceLength })}</small>
              </label>
              <label htmlFor={`evidence-url-${lesson.id}`}>
                <span>{t("lesson.evidenceUrl")}</span>
                <input data-testid="evidence-url" id={`evidence-url-${lesson.id}`} type="url" maxLength={500} value={evidenceUrl} onChange={(event) => { setEvidenceUrl(event.target.value); setDraftSaved(false); }} placeholder={t("lesson.evidenceUrlPlaceholder")} aria-invalid={!validUrl} />
                {!validUrl && <small className="error">{t("lesson.evidenceUrlError")}</small>}
              </label>
              <div className="evidence-form-actions">
                <span><ShieldCheck />{t("lesson.evidenceLocal")}</span>
                {!completed && <button data-testid="save-evidence-draft" className="outline-button" disabled={!canSaveDraft} onClick={() => { onSaveDraft(draft); setDraftSaved(true); }}><NotebookPen />{t("lesson.saveDraft")}</button>}
              </div>
              <p className="evidence-save-status" aria-live="polite">{draftSaved ? t("lesson.draftSaved") : ""}</p>
          </section>
          <div className="evidence-submit-row"><span><small>{t("lesson.markNote")}</small><b>{completed ? t("lesson.evidenceSubmitted") : t("lesson.earn", { xp: lesson.xp })}</b></span><button data-testid="submit-evidence" className={completed ? "primary-button completed-button" : "primary-button"} disabled={!canSubmit} onClick={() => onComplete(draft)}>{completed ? <><Check />{t("lesson.updateEvidence")}</> : <>{t("lesson.submitEvidence")} <Sparkles /></>}</button></div>
        </section>}
      </div>
      <footer className="learning-route-footer">
        <button className="outline-button" disabled={currentPhaseIndex === 0} onClick={() => goToPhase(learningPhases[Math.max(0, currentPhaseIndex - 1)].id)}>{t("learning.previous")}</button>
        <span>{currentPhaseIndex + 1} / {learningPhases.length}</span>
        {currentPhaseIndex < learningPhases.length - 1 && <button data-testid="learning-next" className="primary-button" onClick={() => goToPhase(learningPhases[currentPhaseIndex + 1].id)}>{t("learning.next")}<ArrowRight /></button>}
      </footer>
    </section>
  );
}

function ConceptStep({ lesson, guide }: { lesson: Lesson; guide: (typeof lessonGuides)[string] }) {
  const { t, locale } = useI18n();
  const concept = locale === "zh-CN" ? guide.keyConcept : t("lesson.intlConcept");
  const detail = locale === "zh-CN" ? guide.conceptDetail : t("lesson.intlConceptDetail");
  const objectives = lesson.objectives.slice(0, 3);
  const checks = locale === "zh-CN" ? guide.quickCheck : [
    { question: t("lesson.intlCheck1"), answer: t("lesson.intlAnswer1") },
    { question: t("lesson.intlCheck2"), answer: t("lesson.intlAnswer2") },
  ];
  return <article className="concept-step">
    <span className="section-kicker">01 · CORE IDEA</span><h2>{concept}</h2><p className="concept-lead">{detail}</p>
    <div className="concept-points">{objectives.map((objective, index) => <div key={objective}><span>0{index + 1}</span><p>{objective}</p></div>)}</div>
    <aside className="concept-warning"><Lightbulb /><span><small>{t("lesson.pitfall")}</small><p>{locale === "zh-CN" ? guide.pitfall : t("lesson.intlPitfall")}</p></span></aside>
    <section className="concept-check"><h3><CheckCircle2 />{t("lesson.quickCheck")}</h3>{checks.map((item, index) => <details key={item.question}><summary><span>{index + 1}</span>{item.question}<ChevronDown /></summary><p>{item.answer}</p></details>)}</section>
  </article>;
}

function LearnStep({ lesson, guide, moduleGuide, foreignLocale }: { lesson: Lesson; guide: (typeof lessonGuides)[string]; moduleGuide: (typeof moduleGuides)[string]; foreignLocale: boolean }) {
  const { t, locale } = useI18n();
  const methodName = locale === "zh-CN" ? guide.methodName : t("lesson.intlMethod");
  const methodSteps = locale === "zh-CN" ? guide.methodSteps.slice(0, 3) : [t("lesson.intlStep1"), t("lesson.intlStep2"), t("lesson.intlStep3")];
  return <article className="learn-step">
    {foreignLocale && <span className="master-language-badge"><Globe2 />{t("lesson.chineseOriginal")}</span>}
    <section className="learn-method"><div><span className="section-kicker">02 · METHOD</span><h2>{methodName}</h2></div><ol>{methodSteps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol></section>
    <section className="learn-case"><span className="section-kicker">ONE DEEP CASE</span><h2>{guide.workedExample.title}</h2><div><article><small>{t("learning.caseSituation")}</small><p>{guide.workedExample.situation}</p></article><article><small>{t("learning.caseAnalysis")}</small><p>{guide.workedExample.analysis}</p></article><article><small>{t("learning.caseDecision")}</small><p>{guide.workedExample.decision}</p></article></div><aside><Target /><span><small>{t("lesson.yourProject")}</small><b>{lesson.practice}</b></span></aside></section>
    <div className="learn-library">
      <details><summary><LibraryBig /><span><b>{t("lesson.booksTitle")}</b><small>{moduleGuide.books.length} · {t("course.coreReading")}</small></span><ChevronDown /></summary><BookShelfPanel moduleGuide={moduleGuide} /></details>
      <details><summary><CirclePlay /><span><b>{t("lesson.videoTitle")}</b><small>{moduleGuide.videos.length} {t("course.videoCount", { count: moduleGuide.videos.length })}</small></span><ChevronDown /></summary><VideoPanel moduleGuide={moduleGuide} /></details>
      <details><summary><BookMarked /><span><b>{t("lesson.sourcesTitle")}</b><small>{lesson.sources.length} sources</small></span><ChevronDown /></summary><SourcesPanel lesson={lesson} moduleGuide={moduleGuide} /></details>
    </div>
  </article>;
}

function DeepSeekPracticeStep({ lesson, guide, aiDecision, onRunCoach }: { lesson: Lesson; guide: (typeof lessonGuides)[string]; aiDecision: AiUsageDecision; onRunCoach: (input: DeepSeekCoachRequest) => Promise<DeepSeekCoachResponse | null> }) {
  const { t } = useI18n();
  const [material, setMaterial] = useState("");
  const [result, setResult] = useState<DeepSeekCoachResponse | null>(null);
  const [running, setRunning] = useState(false);
  const runCoach = async () => {
    if (running || material.trim().length < 30) return;
    setRunning(true);
    try {
      const response = await onRunCoach({ requestId: createRequestId(), lessonId: lesson.id, lessonTitle: lesson.title, goal: guide.aiLab.goal, material: material.trim(), criteria: guide.aiLab.criteria.slice(0, 6) });
      if (response) setResult(response);
    } finally {
      setRunning(false);
    }
  };
  const usageText = aiDecision.mode === "unlimited" ? t("membership.aiUnlimited") : t("membership.aiRemaining", { count: aiDecision.remainingRuns ?? 0 });
  return <article className="deepseek-practice" data-testid="deepseek-practice">
    <header><div><span className="section-kicker">03 · DEEPSEEK COACH</span><h2>{guide.aiLab.role}</h2><p>{guide.aiLab.goal}</p></div><em className={`ai-usage-badge ${aiDecision.mode}`}><Crown />{usageText}</em></header>
    <aside className="coach-privacy"><ShieldCheck /><p><b>{t("learning.coachPrivacyTitle")}</b>{t("learning.coachPrivacy")}</p></aside>
    <label className="coach-material" htmlFor={`coach-material-${lesson.id}`}><span>{t("learning.coachMaterial")}</span><textarea data-testid="coach-material" id={`coach-material-${lesson.id}`} value={material} onChange={(event) => setMaterial(event.target.value)} placeholder={t("learning.coachPlaceholder")} /><small>{material.trim().length} / 30 {t("learning.minimum")}</small></label>
    <div className="coach-criteria"><span>{t("learning.coachChecks")}</span>{guide.aiLab.criteria.map((criterion) => <em key={criterion}><Check />{criterion}</em>)}</div>
    <button data-testid="coach-submit" className="primary-button coach-submit" disabled={running || material.trim().length < 30} onClick={() => void runCoach()}><Sparkles />{running ? t("learning.coachRunning") : t("learning.coachStart")}</button>
    {result && <section className="coach-result" data-testid="coach-result" aria-live="polite">
      <div className="coach-ack"><Sparkles /><p>{result.answer.acknowledgement}</p><small>{result.model}</small></div>
      <div className="coach-feedback-grid"><section><h3><CheckCircle2 />{t("learning.strengths")}</h3><ul>{result.answer.strengths.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3><Target />{t("learning.gaps")}</h3><ul>{result.answer.gaps.map((item) => <li key={item}>{item}</li>)}</ul></section></div>
      {result.answer.rubric && <div className="coach-rubric">{result.answer.rubric.map((item) => <div className={item.status} key={item.label}><span>{item.status === "met" ? <Check /> : item.status === "partial" ? <Clock3 /> : <X />}</span><p><b>{item.label}</b><small>{item.note}</small></p></div>)}</div>}
      {result.answer.improvedDraft && <details className="coach-draft"><summary><FileText />{t("learning.improvedDraft")}<ChevronDown /></summary><p>{result.answer.improvedDraft}</p></details>}
      <div className="coach-question"><MessageSquareText /><span><small>{t("learning.oneQuestion")}</small><b>{result.answer.questions[0]}</b></span></div>
      <div className="coach-next-action"><ArrowRight /><span><small>{t("learning.nextAction")}</small><b>{result.answer.nextAction}</b></span></div>
    </section>}
  </article>;
}

function LocalHarnessStep({ lesson }: { lesson: Lesson }) {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [workspacePath, setWorkspacePath] = useState("");
  const [copied, setCopied] = useState<"task" | "command" | "">("");
  const mergeFiles = (incoming: File[]) => {
    const byPath = new globalThis.Map(files.map((file) => [file.webkitRelativePath || file.name, file] as const));
    incoming.forEach((file) => byPath.set(file.webkitRelativePath || file.name, file));
    setFiles([...byPath.values()].slice(0, 80));
  };
  const secretPattern = /(^|\/)(\.env($|\.)|.*(?:secret|credential|private[-_]?key|\.pem$|\.p12$))/i;
  const safeFiles = files.filter((file) => !secretPattern.test(file.webkitRelativePath || file.name));
  const excludedFiles = files.filter((file) => secretPattern.test(file.webkitRelativePath || file.name));
  const harnessReady = safeFiles.length > 0;
  const fileList = safeFiles.map((file) => `- ${file.webkitRelativePath || file.name}`).join("\n") || `- ${t("learning.harnessNoFiles")}`;
  const taskSpec = `${t("learning.harnessTaskTitle")}\n\n${t("learning.harnessWorkspace")}: ${workspacePath.trim() || t("learning.harnessChooseInApp")}\n${t("learning.harnessLesson")}: ${lesson.title}\n${t("learning.harnessGoal")}: ${lesson.practice}\n${t("learning.harnessOutput")}: ${lesson.deliverable}\n\n${t("learning.harnessAllowedFiles")}\n${fileList}\n\n${t("learning.harnessRules")}\n1. ${t("learning.harnessRuleInspect")}\n2. ${t("learning.harnessRulePlan")}\n3. ${t("learning.harnessRuleEdit")}\n4. ${t("learning.harnessRuleVerify")}\n5. ${t("learning.harnessRuleDiff")}`;
  const copyText = async (kind: "task" | "command", value: string) => {
    await navigator.clipboard?.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(""), 1800);
  };
  const fileInputHandler = (event: React.ChangeEvent<HTMLInputElement>) => mergeFiles(Array.from(event.currentTarget.files ?? []));
  return <article className="harness-step" data-testid="harness-step">
    <header><span className="section-kicker">04 · LOCAL FILE HARNESS</span><h2>{t("learning.harnessTitle")}</h2><p>{t("learning.harnessIntro")}</p></header>
    <aside className="harness-safety"><ShieldCheck /><div><b>{t("learning.harnessSafetyTitle")}</b><p>{t("learning.harnessSafety")}</p></div></aside>
    <section className="harness-picker"><div><label className="outline-button"><FileText />{t("learning.selectFiles")}<input data-testid="harness-file-input" type="file" multiple onChange={fileInputHandler} /></label><label className="outline-button"><FolderOpen />{t("learning.selectFolder")}<input type="file" multiple {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} onChange={fileInputHandler} /></label></div><small>{t("learning.fileLocalOnly")}</small></section>
    <label className="harness-path"><span>{t("learning.workspacePath")}</span><input value={workspacePath} onChange={(event) => setWorkspacePath(event.target.value)} placeholder="D:\\my-project" /><small>{t("learning.workspacePathHint")}</small></label>
    <section className="harness-selected" data-testid="harness-selected-files"><header><b>{t("learning.selectedFiles")}</b><span>{safeFiles.length}</span></header>{safeFiles.length ? <ul>{safeFiles.map((file) => <li key={`${file.webkitRelativePath || file.name}-${file.size}`}><FileText /><span><b>{file.webkitRelativePath || file.name}</b><small>{Math.max(1, Math.round(file.size / 1024))} KB</small></span></li>)}</ul> : <p>{t("learning.harnessNoFiles")}</p>}{excludedFiles.length > 0 && <aside><LockKeyhole />{t("learning.secretExcluded", { count: excludedFiles.length })}</aside>}</section>
    <section className="harness-task"><div><span><Clipboard />{t("learning.harnessTask")}</span><button data-testid="harness-copy-task" disabled={!harnessReady} onClick={() => void copyText("task", taskSpec)}>{copied === "task" ? <ClipboardCheck /> : <Clipboard />}{copied === "task" ? t("learning.copied") : t("learning.copyTask")}</button></div><pre data-testid="harness-task-spec">{taskSpec}</pre></section>
    <section className="harness-launch"><div><span><b>{t("learning.launchHarness")}</b><small>{t("learning.launchHint")}</small></span><code>dsh --profile web</code></div><button disabled={!harnessReady} onClick={() => void copyText("command", "dsh --profile web")}>{copied === "command" ? <ClipboardCheck /> : <Clipboard />}{t("learning.copyCommand")}</button>{harnessReady ? <a data-testid="harness-open" href="http://127.0.0.1:3080/" target="_blank" rel="noreferrer"><ExternalLink />{t("learning.openHarness")}</a> : <span data-testid="harness-open" className="harness-open-disabled" aria-disabled="true"><LockKeyhole />{t("learning.openHarness")}</span>}</section>
  </article>;
}

function BookShelfPanel({ moduleGuide }: { moduleGuide: (typeof moduleGuides)[string] }) {
  const { t } = useI18n();
  return (
    <div className="course-panel book-panel">
      <header className="panel-intro"><span className="section-kicker">ORIGINAL EDITORIAL SUMMARY</span><h2>{t("lesson.booksTitle")}</h2><p>{moduleGuide.bookContext}</p><small>以下均为夸夸学习 AI 原创教学提炼，不替代原书；书名入口指向作者或出版社页面。</small></header>
      <div className="book-deep-list">
        {moduleGuide.books.map((item, index) => (
          <article className="book-deep-card" key={item.originalTitle}>
            <div className="book-cover" aria-hidden="true"><span>CORE<br />BOOK</span><b>0{index + 1}</b><em>{item.year}</em></div>
            <div className="book-card-content">
              <div className="book-title-row"><div><span>核心书 {index + 1}</span><h2>{item.title}</h2><p>{item.originalTitle}</p><small>{item.author} · {item.year}</small></div><a href={item.sourceUrl} target="_blank" rel="noreferrer">正版 / 官方信息 <ExternalLink /></a></div>
              <p className="book-reason"><Lightbulb />{item.reason}</p>
              <div className="book-columns"><section><h3>主要内容</h3><ul>{item.mainContents.map((point) => <li key={point}>{point}</li>)}</ul></section><section><h3>三条核心观点</h3><ol>{item.keyViews.map((point) => <li key={point}>{point}</li>)}</ol></section></div>
              <section className="book-application"><h3><NotebookPen />核心应用</h3><div>{item.applications.map((point, pointIndex) => <span key={point}><b>{pointIndex + 1}</b>{point}</span>)}</div></section>
              <section className="book-case"><span>书中方法 · 原创转化案例</span><h3>{item.teachingCase.title}</h3><p>{item.teachingCase.story}</p><b>{item.teachingCase.takeaway}</b></section>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function VideoPanel({ moduleGuide }: { moduleGuide: (typeof moduleGuides)[string] }) {
  const { t } = useI18n();
  return (
    <div className="course-panel video-panel">
      <header className="panel-intro"><span className="section-kicker">WATCH · PAUSE · APPLY</span><h2>{t("lesson.videoTitle")}</h2><p>原创微课可直接播放；第三方视频使用原站播放器或官方页面，并保留发布者、时长与来源。</p></header>
      <div className="video-grid">
        {moduleGuide.videos.map((item) => <article className="video-card" key={`${item.publisher}-${item.title}`}>
          <div className="video-frame">
            {item.kind === "original" && item.src && <video controls preload="metadata"><source src={item.src} type="video/mp4" />你的浏览器暂不支持视频播放。</video>}
            {item.kind === "youtube" && item.youtubeId && <iframe src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}`} title={item.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />}
            {item.kind === "link" && <a className="video-link-fallback" href={item.sourceUrl} target="_blank" rel="noreferrer"><CirclePlay /><span>前往官方页面观看</span><ExternalLink /></a>}
          </div>
          <div className="video-copy"><div><span className={item.kind === "original" ? "original" : "external"}>{item.kind === "original" ? "夸夸原创" : "外部公开课"}</span><small>{item.duration}</small></div><h3>{item.title}</h3><b>{item.publisher}</b><p>{item.description}</p>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">查看原始发布页 <ExternalLink /></a>}</div>
        </article>)}
      </div>
      <div className="copyright-note"><ShieldCheck /><p><b>内容使用说明</b> 外部视频内容归原发布者所有，本站不下载、不剪切、不去除署名。若原站限制嵌入，请点击原始发布页观看。</p></div>
    </div>
  );
}

function SourcesPanel({ lesson, moduleGuide }: { lesson: Lesson; moduleGuide: (typeof moduleGuides)[string] }) {
  const { t } = useI18n();
  return (
    <div className="course-panel sources-panel">
      <header className="panel-intro"><span className="section-kicker">SOURCES & READING</span><h2>{t("lesson.sourcesTitle")}</h2><p>课程先用原创中文讲义帮助你行动，再把重要概念连接回作者、出版社与权威机构。</p></header>
      <div className="source-library">
        <section><h3><LibraryBig />本模块核心书</h3>{moduleGuide.books.map((item) => <a href={item.sourceUrl} target="_blank" rel="noreferrer" key={item.originalTitle}><span><b>{item.title}</b><small>{item.author} · {item.year}</small></span><ExternalLink /></a>)}</section>
        <section><h3><BookMarked />本节一手资料</h3>{lesson.sources.map((item) => <a href={item.url} target="_blank" rel="noreferrer" key={item.url}><span><b>{item.label}</b><small>原始页面 / 官方机构</small></span><ExternalLink /></a>)}</section>
      </div>
      <section className="editorial-policy"><FileText /><div><h3>夸夸学习 AI 内容编辑原则</h3><ul><li>不提供盗版书、整书复述或大段受版权保护原文。</li><li>观点摘要结合多来源后重新组织为课程语言，并明确应用边界。</li><li>教学案例用于练习推理，不冒充真实客户业绩；学员须以自身证据替换假设。</li><li>AI 只辅助结构、反方检查与角色练习，不可生成虚假访谈替代真人研究。</li></ul></div></section>
    </div>
  );
}

function RewardDialog({ reward, onClose }: { reward: { xp: number; levelUp: number }; onClose: () => void }) {
  const { t, localizeBuddy } = useI18n();
  const level = reward.levelUp ? buddyLevels.find((item) => item.level === reward.levelUp) : undefined;
  const dialogRef = useRef<HTMLElement>(null);
  useEscape(onClose);
  useDialogFocus(dialogRef);
  return (
    <div className="modal-backdrop reward-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="reward-dialog" role="dialog" aria-modal="true" aria-labelledby="reward-title">
        <div className="reward-burst"><Sparkles /></div><img src={qingmiBuddy} alt={t("nav.buddyFull")} /><span>{t("reward.success")}</span><h2 id="reward-title">{t("reward.title", { xp: reward.xp })}</h2><p>{level ? t("reward.levelUp", { level: localizeBuddy(level).name }) : t("reward.growth")}</p><button className="primary-button" onClick={onClose}>{t("reward.continue")} <ArrowRight /></button>
      </section>
    </div>
  );
}

function PageIntro({ kicker, title, description, children }: { kicker: string; title: string; description: string; children?: ReactNode }) {
  return <section className="page-intro"><div><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{description}</p></div>{children}</section>;
}

function StatCard({ icon, value, label, tone }: { icon: ReactNode; value: string; label: string; tone: string }) {
  return <article className={`stat-card ${tone}`}><span>{icon}</span><div><b>{value}</b><small>{label}</small></div></article>;
}

function ProgressBar({ value }: { value: number }) {
  const { t } = useI18n();
  const current = Math.round(clamp(value));
  return <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={current} aria-label={t("common.progress", { value: current })}><span style={{ width: `${current}%` }} /></div>;
}

function timeGreeting(t: (key: string) => string) {
  const hour = new Date().getHours();
  if (hour < 6) return t("greeting.late");
  if (hour < 11) return t("greeting.morning");
  if (hour < 14) return t("greeting.noon");
  if (hour < 18) return t("greeting.afternoon");
  return t("greeting.evening");
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
}

function useDialogFocus(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    focusable()[0]?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", trapFocus);
    return () => {
      dialog.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [ref]);
}

export default App;
