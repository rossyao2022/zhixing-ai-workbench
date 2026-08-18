import { FormEvent, ReactNode, RefObject, useEffect, useRef, useState } from "react";
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
  Clipboard,
  ClipboardCheck,
  Compass,
  FileText,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  GraduationCap,
  Globe2,
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
  Quote,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Target,
  Trophy,
  UserPlus,
  UsersRound,
  Video,
  X,
  Zap,
} from "lucide-react";
import qingmiBuddy from "./assets/brand/qingmi-buddy-v2.webp";
import {
  allLessons,
  buddyLevels,
  courseStages,
  getBuddyLevel,
  getDailyPraise,
  type CourseStage,
  type Lesson,
} from "./courseData";
import { lessonGuides, moduleGuides } from "./learningContent";
import { eightImmortals, immortalByStage } from "./eightImmortals";
import { localeOptions, useI18n } from "./i18n";
import { localizeMethod, methodFrameworks, methodUi, workbenchLanes } from "./methodLibrary";
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

type AppView = "home" | "course" | "journey" | "buddy" | "admin" | "profile";

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

function App() {
  const { t, roleLabel } = useI18n();
  const initialSession = loadSession();
  const [accounts, setAccounts] = useState<UserAccount[]>(loadAccounts);
  const [sessionUserId, setSessionUserId] = useState(initialSession);
  const [progress, setProgress] = useState<LearningProgress | null>(() =>
    initialSession ? loadProgress(initialSession) : null,
  );
  const [view, setView] = useState<AppView>("home");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [showPraise, setShowPraise] = useState(false);
  const [reward, setReward] = useState<{ xp: number; levelUp: number } | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");

  const user = accounts.find((account) => account.id === sessionUserId) ?? null;
  const today = localDateKey();
  const praise = user ? getDailyPraise(user.id, today) : "";

  useEffect(() => {
    if (!sessionUserId) {
      setProgress(null);
      return;
    }
    const account = accounts.find((item) => item.id === sessionUserId);
    if (!account || !account.active) {
      clearSession();
      setSessionUserId("");
      setProgress(null);
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
      setShowPraise(current.lastPraiseDate !== today);
    } else {
      setProgress(current);
    }
  }, [accounts, sessionUserId, today]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMobileMenu(false);
  }, [view]);

  useEffect(() => {
    if (!sessionUserId) return;
    window.requestAnimationFrame(resetScrollPosition);
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId || showPraise) return;
    resetScrollPosition();
    const frame = window.requestAnimationFrame(resetScrollPosition);
    const timer = window.setTimeout(resetScrollPosition, 60);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [sessionUserId, showPraise]);

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
  const openLesson = (lesson: Lesson) => setSelectedLessonId(lesson.id);

  const handleLoggedIn = (account: UserAccount) => {
    resetScrollPosition();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    saveSession(account.id);
    setSessionUserId(account.id);
    setProgress(loadProgress(account.id));
    setView("home");
  };

  const handleLogout = () => {
    clearSession();
    setSessionUserId("");
    setProgress(null);
    setView("home");
  };

  const saveEvidenceDraft = (lesson: Lesson, draft: LessonEvidenceDraft) => {
    if (!progress) return;
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
          {user.role === "admin" && (
            <NavButton active={view === "admin"} icon={<UsersRound />} label={t("nav.admin")} onClick={() => setView("admin")} />
          )}
        </nav>

        <div className="topbar-actions">
          <LanguageSwitcher compact />
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
          {user.role === "admin" && <button onClick={() => setView("admin")}><UsersRound />{t("nav.admin")}</button>}
          <button onClick={() => setView("profile")}><CircleUserRound />{t("nav.profile")}</button>
        </div>
      )}

      <main className="app-main">
        {view === "home" && (
          <Dashboard
            user={user}
            progress={progress!}
            completed={completed}
            praise={praise}
            buddyLevel={buddyLevel}
            nextLesson={nextLesson}
            progressPercent={progressPercent}
            onOpenLesson={openLesson}
            onNavigate={setView}
            onPraise={() => setShowPraise(true)}
          />
        )}
        {view === "course" && (
          <CourseCenter
            completed={completed}
            progressPercent={progressPercent}
            onOpenLesson={openLesson}
          />
        )}
        {view === "journey" && (
          <JourneyMap completed={completed} onOpenLesson={openLesson} />
        )}
        {view === "buddy" && (
          <BuddyRoom progress={progress!} completed={completed} />
        )}
        {view === "admin" && (
          <RoleAdmin
            currentUser={user}
            accounts={accounts}
            onChange={updateAccounts}
          />
        )}
        {view === "profile" && (
          <ProfilePage
            user={user}
            progress={progress!}
            onLogout={handleLogout}
            onReset={() => {
              const next = resetProgress(user.id);
              setProgress(next);
              setToast(t("profile.resetDone"));
            }}
          />
        )}
      </main>

      <nav className={user.role === "admin" ? "bottom-nav admin-nav" : "bottom-nav"} aria-label={t("nav.mobile")}>
        <NavButton active={view === "home"} icon={<Home />} label={t("nav.today")} onClick={() => setView("home")} />
        <NavButton active={view === "course"} icon={<BookOpen />} label={t("nav.course")} onClick={() => setView("course")} />
        <NavButton active={view === "journey"} icon={<Map />} label={t("nav.mapShort")} onClick={() => setView("journey")} />
        <NavButton active={view === "buddy"} icon={<Sparkles />} label={t("nav.buddy")} onClick={() => setView("buddy")} />
        {user.role === "admin" && <NavButton active={view === "admin"} icon={<UsersRound />} label={t("nav.adminShort")} onClick={() => setView("admin")} />}
        <NavButton active={view === "profile"} icon={<CircleUserRound />} label={t("nav.mine")} onClick={() => setView("profile")} />
      </nav>

      {selectedLesson && (
        <LessonDialog
          key={selectedLesson.id}
          lesson={selectedLesson}
          completed={completed.includes(selectedLesson.id)}
          legacyCompleted={Boolean(progress?.completedLessonIds.includes(selectedLesson.id))}
          evidence={progress?.evidenceByLessonId[selectedLesson.id] ?? null}
          onClose={() => setSelectedLessonId("")}
          onSaveDraft={(draft) => saveEvidenceDraft(selectedLesson, draft)}
          onComplete={(draft) => completeLesson(selectedLesson, draft)}
        />
      )}
      {showPraise && user && (
        <PraiseDialog user={user} praise={praise} streak={progress?.streak ?? 1} onClose={() => {
          setShowPraise(false);
          window.requestAnimationFrame(resetScrollPosition);
        }} />
      )}
      {reward && <RewardDialog reward={reward} onClose={() => setReward(null)} />}
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
        const account = await authenticate(email, password);
        if (!account) throw new Error(t("auth.errorLogin"));
        onLogin(account);
      } else {
        if (name.trim().length < 2) throw new Error(t("auth.errorName"));
        if (password.length < 8) throw new Error(t("auth.errorPassword"));
        const account = await registerAccount({ name, email, password });
        onRegistered(account);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("auth.errorGeneric"));
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
              <div className="password-field"><input dir="ltr" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "register" ? t("auth.passwordNew") : t("auth.passwordEnter")} autoComplete={mode === "login" ? "current-password" : "new-password"} required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={t("auth.passwordToggle")}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" disabled={busy}>{busy ? t("auth.entering") : mode === "login" ? t("auth.enterSpace") : t("auth.create")}<ArrowRight /></button>
          </form>

          <div className="demo-divider"><span>{t("auth.try")}</span></div>
          <div className="demo-buttons">
            <button onClick={() => enterDemo("demo-learner")}><GraduationCap /><span><b>{t("auth.demoLearner")}</b><small>{t("auth.demoLearnerSub")}</small></span><ChevronRight /></button>
            <button onClick={() => enterDemo("demo-admin")}><ShieldCheck /><span><b>{t("auth.demoAdmin")}</b><small>{t("auth.demoAdminSub")}</small></span><ChevronRight /></button>
          </div>
          <p className="local-auth-note"><LockKeyhole />{t("auth.localNote")}</p>
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
  praise,
  buddyLevel,
  nextLesson,
  progressPercent,
  onOpenLesson,
  onNavigate,
  onPraise,
}: {
  user: UserAccount;
  progress: LearningProgress;
  completed: string[];
  praise: string;
  buddyLevel: ReturnType<typeof getBuddyLevel>;
  nextLesson: (Lesson & { stageId: string; stageTitle: string }) | null;
  progressPercent: number;
  onOpenLesson: (lesson: Lesson) => void;
  onNavigate: (view: AppView) => void;
  onPraise: () => void;
}) {
  const { t, localizeStage, localizeImmortal, localizeLesson, localizeBuddy, localizePraise } = useI18n();
  const completedCount = completed.length;
  const currentLevelIndex = buddyLevels.findIndex((item) => item.level === buddyLevel.level);
  const nextLevel = buddyLevels[currentLevelIndex + 1];
  const levelProgress = nextLevel
    ? clamp(((progress.xp - buddyLevel.min) / (nextLevel.min - buddyLevel.min)) * 100)
    : 100;
  const displayLevel = localizeBuddy(buddyLevel);
  const displayNextLevel = nextLevel ? localizeBuddy(nextLevel) : null;
  const displayNextLesson = nextLesson ? localizeLesson(nextLesson) : null;

  return (
    <div className="page dashboard-page">
      <section className="dashboard-hero">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={15} />{t("dashboard.eyebrow")}</span>
          <h1>{timeGreeting(t)}，{user.name}<br /><span>{t("dashboard.heroLine")}</span></h1>
          <p>{t("dashboard.description")}</p>
          <div className="hero-actions">
            {nextLesson && displayNextLesson ? (
              <button className="primary-button" onClick={() => onOpenLesson(nextLesson)}><Play />{t("dashboard.continue", { title: displayNextLesson.title })}<ArrowRight /></button>
            ) : (
              <button className="primary-button" onClick={() => onNavigate("journey")}><Trophy />{t("dashboard.capstone")}<ArrowRight /></button>
            )}
            <button className="text-button" onClick={() => onNavigate("course")}>{t("dashboard.browse")} <ChevronRight /></button>
          </div>
        </div>
        <div className={`hero-buddy level-${buddyLevel.level}`}>
          <div className="buddy-orbit orbit-a"><span>{t("dashboard.orbitInsight")}</span></div>
          <div className="buddy-orbit orbit-b"><span>{t("dashboard.orbitWork")}</span></div>
          <div className="buddy-orbit orbit-c"><span>{t("dashboard.orbitPractice")}</span></div>
          <div className="buddy-glow" />
          <img src={qingmiBuddy} alt={`${t("nav.buddyFull")} · ${displayLevel.name}`} />
          <div className="buddy-level-card">
            <span>Lv.{buddyLevel.level}</span><div><b>{displayLevel.name}</b><small>{displayLevel.note}</small></div>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <button className="praise-card" onClick={onPraise}>
          <div className="praise-top"><span><Star />{t("dashboard.praise")}</span><small>{t("dashboard.streak", { count: progress.streak })}</small></div>
          <blockquote>“{localizePraise(praise)}”</blockquote>
          <div className="praise-sign">— {t("nav.buddy")} <span>{t("dashboard.replay")} <ChevronRight /></span></div>
        </button>

        <article className="level-progress-card">
          <div className="card-heading"><div><span className="section-kicker">KNOWLEDGE BUDDY</span><h2>{t("dashboard.absorbing")}</h2></div><button className="round-link" onClick={() => onNavigate("buddy")} aria-label={t("nav.buddyFull")}><ArrowRight /></button></div>
          <div className="knowledge-meter">
            <div className="meter-number"><b>{progress.xp}</b><span>{t("common.xp")}</span></div>
            <div className="meter-main"><ProgressBar value={levelProgress} /><div><span>{t("dashboard.current", { level: displayLevel.name })}</span><span>{nextLevel && displayNextLevel ? t("dashboard.next", { level: displayNextLevel.name, count: Math.max(0, nextLevel.min - progress.xp) }) : t("dashboard.max")}</span></div></div>
          </div>
        </article>
      </section>

      <section className="quick-stats">
        <StatCard icon={<BookOpen />} value={`${completedCount}/32`} label={t("dashboard.statLessons")} tone="blue" />
        <StatCard icon={<Target />} value={`${progressPercent}%`} label={t("dashboard.statProgress")} tone="coral" />
        <StatCard icon={<Flame />} value={t("common.days", { count: progress.streak })} label={t("dashboard.statStreak")} tone="gold" />
        <StatCard icon={<Layers3 />} value={`${courseStages.filter((stage) => stage.lessons.every((lesson) => completed.includes(lesson.id))).length}/8`} label={t("dashboard.statStages")} tone="green" />
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <div><span className="section-kicker">12-WEEK JOURNEY</span><h2>{t("dashboard.journeyTitle")}</h2><p>{t("dashboard.journeyDesc")}</p></div>
          <button className="outline-button" onClick={() => onNavigate("journey")}>{t("dashboard.viewMap")} <ArrowRight /></button>
        </div>
        <div className="stage-strip">
          {courseStages.map((stage) => {
            const displayStage = localizeStage(stage);
            const count = stage.lessons.filter((lesson) => completed.includes(lesson.id)).length;
            return (
              <button key={stage.id} className="stage-mini" onClick={() => onNavigate("course")} style={{ "--stage-color": stage.color } as React.CSSProperties}>
                <span>{immortalByStage[stage.id]?.glyph ?? stage.number}</span><div><small>{stage.number} · {displayStage.weeks}</small><b>{displayStage.title}</b><em>{t("dashboard.stageDone", { count })}</em></div><ChevronRight />
              </button>
            );
          })}
        </div>
      </section>

      <section className="opc-banner">
        <div className="opc-mark"><Orbit /></div>
        <div><span>{t("dashboard.opcLabel")}</span><h2>{t("dashboard.opcTitle")}</h2></div>
        <div className="opc-points"><span><Check />{t("dashboard.opcReal")}</span><span><Check />{t("dashboard.opcCollab")}</span><span><Check />{t("dashboard.opcEvidence")}</span><span><Check />{t("dashboard.opcShip")}</span></div>
      </section>
    </div>
  );
}

function LanguageCoverageNotice({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={compact ? "language-coverage-notice compact" : "language-coverage-notice"} role="note"><Globe2 aria-hidden="true" /><p>{text}</p></div>;
}

function CourseCenter({ completed, progressPercent, onOpenLesson }: { completed: string[]; progressPercent: number; onOpenLesson: (lesson: Lesson) => void }) {
  const { t, locale, localizeStage, localizeImmortal, localizeLesson, contractFields } = useI18n();
  const nextLesson = allLessons.find((lesson) => !completed.includes(lesson.id)) ?? allLessons[0];
  const displayNextLesson = localizeLesson(nextLesson);
  return (
    <div className="page course-page">
      <PageIntro kicker="THE SOLO COMPANY PRODUCT JOURNEY" title={t("course.title")} description={t("course.description")}>
        <div className="overall-progress"><div><b>{progressPercent}%</b><span>{t("course.totalProgress")}</span></div><ProgressBar value={progressPercent} /><small>{t("course.progressDone", { done: completed.length, total: allLessons.length })}</small></div>
      </PageIntro>

      {locale !== "zh-CN" && <LanguageCoverageNotice text={t("course.languageCoverage")} />}

      <div className="course-principles">
        <span><BookMarked /><b>24</b> {t("course.books")}</span><span><FileText /><b>32</b> {t("course.lectures")}</span><span><BrainCircuit /><b>32</b> {t("course.coaches")}</span><span><CirclePlay /><b>3</b> {t("course.videos")}</span>
      </div>

      <section className="course-editor-note">
        <span><LibraryBig /></span>
        <div><b>{t("course.editionTitle")}</b><p>{t("course.editionDesc")}</p></div>
        <span className="edition-chip">{t("course.editionChip")}</span>
      </section>

      <button className="course-start-shortcut" onClick={() => onOpenLesson(nextLesson)}>
        <span><Play /></span><div><small>{t("course.startRoute")}</small><b>{displayNextLesson.title}</b></div><ArrowRight />
      </button>

      <MethodStack locale={locale} />

      <section className="immortal-system">
        <div className="immortal-system-heading">
          <div><span className="section-kicker">PRODUCT COMPANY OS · 8 STAGES</span><h2>{t("course.orchestrate")}</h2><p>{t("course.orchestrateDesc")}</p></div>
          <div className="immortal-route-line"><span>{t("course.routeStrategy")}</span><i /><span>{t("course.routeProduct")}</span><i /><span>{t("course.routeRevenue")}</span><i /><span>{t("course.routeGlobal")}</span></div>
        </div>
        <div className="immortal-grid">
          {eightImmortals.map((immortal) => {
            const displayImmortal = localizeImmortal(immortal);
            const stage = courseStages.find((item) => item.id === immortal.stageId)!;
            const displayStage = localizeStage(stage);
            const done = stage.lessons.filter((lesson) => completed.includes(lesson.id)).length;
            return (
              <article key={immortal.stageId} className="immortal-card" style={{ "--immortal-color": stage.color } as React.CSSProperties}>
                <div className="immortal-seal">{displayImmortal.glyph}</div>
                <div className="immortal-card-copy"><small>{stage.number} · {displayStage.weeks} · {t("dashboard.stageDone", { count: done })}</small><h3>{displayStage.title}</h3><b>{displayImmortal.domain}</b><p>{displayImmortal.keyQuestion}</p></div>
              </article>
            );
          })}
        </div>
        <div className="dual-eight-contract">
          <div><Orbit /><span><small>{t("course.contractTitle")}</small><b>{t("course.contractValue")}</b></span></div>
          <div className="contract-fields"><small>{t("course.contractHint")}</small><p>{contractFields.map((item, index) => <span key={index}><em>{index + 1}</em>{item}</span>)}</p></div>
        </div>
      </section>

      <div className="stage-list">
        {courseStages.map((stage, index) => (
          <StageCourseCard key={stage.id} stage={stage} index={index} completed={completed} onOpenLesson={onOpenLesson} />
        ))}
      </div>
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

function StageCourseCard({ stage, index, completed, onOpenLesson }: { stage: CourseStage; index: number; completed: string[]; onOpenLesson: (lesson: Lesson) => void }) {
  const { t, locale, localizeStage, localizeImmortal } = useI18n();
  const displayStage = localizeStage(stage);
  const count = stage.lessons.filter((lesson) => completed.includes(lesson.id)).length;
  const percent = Math.round((count / stage.lessons.length) * 100);
  const guide = moduleGuides[stage.id];
  const immortal = immortalByStage[stage.id] ? localizeImmortal(immortalByStage[stage.id]) : undefined;
  return (
    <section className="stage-card" style={{ "--stage-color": stage.color } as React.CSSProperties}>
      <div className="stage-card-side"><span className="stage-big-glyph">{immortal?.glyph ?? stage.number}</span><span className="stage-side-number">{stage.number}</span><div className="stage-line" /><small>{displayStage.weeks}</small><span className="stage-status">{percent === 100 ? t("course.statusPassed") : index === 0 || count > 0 ? t("course.statusLearning") : t("course.statusReady")}</span></div>
      <div className="stage-card-main">
        <div className="stage-card-heading"><div><span>{stage.number} · {displayStage.weeks} · {t("course.productPhase")}</span><h2>{displayStage.title}</h2><p>{displayStage.subtitle}</p></div><div className="stage-ring" style={{ "--value": `${percent * 3.6}deg` } as React.CSSProperties}><b>{percent}%</b></div></div>
        {immortal && <div className="immortal-brief"><span><Compass /><small>{t("course.keyQuestion")}</small><b>{immortal.keyQuestion}</b></span><span><Layers3 /><small>{t("course.asset")}</small><b>{immortal.opcAsset}</b></span></div>}
        <div className="lesson-list">
          {displayStage.lessons.map((lesson, lessonIndex) => {
            const done = completed.includes(lesson.id);
            return (
              <button key={lesson.id} className={done ? "lesson-row completed" : "lesson-row"} onClick={() => onOpenLesson(lesson)}>
                <span className="lesson-index">{done ? <Check /> : `${stage.number}.${lessonIndex + 1}`}</span>
                <div><b>{lesson.title}</b><small>{lesson.duration} · {lesson.xp} {t("common.xp")}</small></div>
                <span className="lesson-action">{done ? t("common.completed") : t("common.start")}<ChevronRight /></span>
              </button>
            );
          })}
        </div>
        {guide && (
          <div className="stage-resource-shelf">
            <div className="resource-shelf-title"><LibraryBig /><span><small>CORE READING</small><b>{t("course.coreReading")}</b></span></div>
            <div className="resource-book-chips">
              {guide.books.map((item, bookIndex) => <span key={item.originalTitle}><em>{bookIndex + 1}</em><b>{locale === "zh-CN" ? item.title.replace(/[《》]/g, "") : item.originalTitle}</b><small>{item.author.split("、")[0]}</small></span>)}
            </div>
            <div className="resource-counts"><span><FileText />{t("course.guideCount")}</span><span><BrainCircuit />{t("course.coachCount")}</span><span><Video />{t("course.videoCount", { count: guide.videos.length })}</span></div>
          </div>
        )}
        <div className="stage-deliverable"><Trophy /><div><span>{t("course.deliverable")}</span><b>{displayStage.deliverable}</b></div></div>
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

function RoleAdmin({ currentUser, accounts, onChange }: { currentUser: UserAccount; accounts: UserAccount[]; onChange: (accounts: UserAccount[]) => void }) {
  const { t, roleLabel, roleDescription } = useI18n();
  const progressList = loadAllProgress();
  if (currentUser.role !== "admin") {
    return <div className="page"><div className="locked-panel"><LockKeyhole /><h1>{t("admin.locked")}</h1><p>{t("admin.currentRole", { role: roleLabel(currentUser.role) })}</p></div></div>;
  }
  const activeCount = accounts.filter((item) => item.active).length;
  const learnerCount = accounts.filter((item) => item.role === "learner").length;
  const averageProgress = accounts.length
    ? Math.round(progressList.reduce((sum, item) => sum + evidencedLessonIds(item).length / allLessons.length, 0) / accounts.length * 100)
    : 0;

  const patchAccount = (id: string, patch: Partial<UserAccount>) => {
    onChange(accounts.map((account) => account.id === id ? { ...account, ...patch } : account));
  };

  return (
    <div className="page admin-page">
      <PageIntro kicker="LOCAL ROLE MANAGEMENT" title={t("admin.title")} description={t("admin.description")} />
      <div className="admin-stats">
        <StatCard icon={<UsersRound />} value={`${accounts.length}`} label={t("admin.localAccounts")} tone="blue" />
        <StatCard icon={<ShieldCheck />} value={`${activeCount}`} label={t("admin.activeAccounts")} tone="green" />
        <StatCard icon={<GraduationCap />} value={`${learnerCount}`} label={t("admin.learners")} tone="gold" />
        <StatCard icon={<BarChart3 />} value={`${averageProgress}%`} label={t("admin.avgProgress")} tone="coral" />
      </div>
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
                <div className="account-identity"><span>{account.name.slice(0, 1)}</span><div><b>{account.name}{self && <em>{t("admin.currentAccount")}</em>}</b><small>{account.email}</small></div></div>
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

function ProfilePage({ user, progress, onLogout, onReset }: { user: UserAccount; progress: LearningProgress; onLogout: () => void; onReset: () => void }) {
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
          <section className="setting-card"><div className="setting-icon blue"><KeyRound /></div><div><h3>{t("profile.identity")}</h3><p>{t("profile.identityDesc", { role: roleLabel(user.role) })}</p></div><BadgeCheck /></section>
          <section className="setting-card"><div className="setting-icon coral"><LockKeyhole /></div><div><h3>{t("profile.storage")}</h3><p>{t("profile.storageDesc")}</p></div><span className="preview-badge">PREVIEW</span></section>
          <section className="setting-card danger"><div className="setting-icon"><RotateCcw /></div><div><h3>{t("profile.restart")}</h3><p>{t("profile.restartDesc")}</p></div>{confirmReset ? <div className="confirm-actions"><button onClick={() => setConfirmReset(false)}>{t("common.cancel")}</button><button onClick={() => { onReset(); setConfirmReset(false); }}>{t("profile.confirmClear")}</button></div> : <button className="danger-button" onClick={() => setConfirmReset(true)}>{t("profile.clear")}</button>}</section>
        </div>
      </div>
    </div>
  );
}

type LessonTab = "lecture" | "books" | "case" | "ai" | "video" | "sources";

const lessonTabs: { id: LessonTab; labelKey: string; icon: ReactNode }[] = [
  { id: "lecture", labelKey: "lesson.tabLecture", icon: <FileText /> },
  { id: "books", labelKey: "lesson.tabBooks", icon: <LibraryBig /> },
  { id: "case", labelKey: "lesson.tabCase", icon: <Lightbulb /> },
  { id: "ai", labelKey: "lesson.tabAi", icon: <BrainCircuit /> },
  { id: "video", labelKey: "lesson.tabVideo", icon: <CirclePlay /> },
  { id: "sources", labelKey: "lesson.tabSources", icon: <BookMarked /> },
];

function LessonDialog({
  lesson,
  completed,
  legacyCompleted,
  evidence,
  onClose,
  onSaveDraft,
  onComplete,
}: {
  lesson: Lesson;
  completed: boolean;
  legacyCompleted: boolean;
  evidence: LearningProgress["evidenceByLessonId"][string] | null;
  onClose: () => void;
  onSaveDraft: (draft: LessonEvidenceDraft) => void;
  onComplete: (draft: LessonEvidenceDraft) => void;
}) {
  const { t, locale, direction, localizeLesson, localizeStage } = useI18n();
  const dialogRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<LessonTab>("lecture");
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
  useEscape(onClose);
  useDialogFocus(dialogRef);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="lesson-dialog" role="dialog" aria-modal="true" aria-labelledby="lesson-title">
        <button className="dialog-close" onClick={onClose} aria-label={t("common.close")}><X /></button>
        <div className="lesson-dialog-language"><LanguageSwitcher compact inverted /></div>
        <div className="lesson-dialog-top">
          <div className="lesson-breadcrumb"><span>{displayStage?.number} · {displayStage?.title}</span><ChevronRight /><span>{t("lesson.practical")}</span></div>
          <div className="lesson-meta"><span>{t("lesson.explainer", { duration: displayLesson.duration })}</span><span>{t("lesson.practiceTime")}</span><span><Zap />{lesson.xp} {t("common.xp")}</span></div>
          <h1 id="lesson-title">{displayLesson.title}</h1><p>{displayLesson.summary}</p>
          <div className="lesson-outcome-line"><Trophy /><span><small>{t("lesson.outcome")}</small><b>{displayLesson.deliverable}</b></span></div>
        </div>
        {locale !== "zh-CN" && <LanguageCoverageNotice text={t("lesson.masterLanguageNotice")} compact />}
        <nav className="lesson-tabbar" aria-label={t("lesson.contentNav")} role="tablist">
          {lessonTabs.map((item) => <button id={`lesson-tab-${item.id}`} role="tab" aria-controls={`lesson-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)} onKeyDown={(event) => { const currentIndex = lessonTabs.findIndex((candidate) => candidate.id === item.id); const forwardKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight"; const backwardKey = direction === "rtl" ? "ArrowRight" : "ArrowLeft"; const nextIndex = event.key === forwardKey ? (currentIndex + 1) % lessonTabs.length : event.key === backwardKey ? (currentIndex - 1 + lessonTabs.length) % lessonTabs.length : -1; if (nextIndex >= 0) { event.preventDefault(); const next = lessonTabs[nextIndex].id; setTab(next); window.requestAnimationFrame(() => document.getElementById(`lesson-tab-${next}`)?.focus()); } }} aria-selected={tab === item.id}>{item.icon}<span>{t(item.labelKey)}</span>{item.id === "books" && <em>3</em>}{item.id === "video" && <em>{moduleGuide?.videos.length ?? 0}</em>}</button>)}
        </nav>
        <div className="lesson-dialog-body" id={`lesson-panel-${tab}`} role="tabpanel" aria-labelledby={`lesson-tab-${tab}`}>
          {tab === "lecture" ? <LecturePanel lesson={displayLesson} guide={guide} /> : (
            <div className={locale === "zh-CN" ? "master-content" : "master-content foreign-locale"} lang="zh-CN" dir="ltr">
              {locale !== "zh-CN" && <span className="master-language-badge"><Globe2 />{t("lesson.chineseOriginal")}</span>}
              {tab === "books" && moduleGuide && <BookShelfPanel moduleGuide={moduleGuide} />}
              {tab === "case" && moduleGuide && <CasePanel lesson={displayLesson} moduleGuide={moduleGuide} guide={guide} />}
              {tab === "ai" && guide && <AiCoachPanel lesson={displayLesson} guide={guide} />}
              {tab === "video" && moduleGuide && <VideoPanel moduleGuide={moduleGuide} />}
              {tab === "sources" && moduleGuide && <SourcesPanel lesson={displayLesson} moduleGuide={moduleGuide} />}
            </div>
          )}
          <section className="lesson-submit-zone">
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
          </section>
        </div>
        <div className="lesson-dialog-footer"><div><small>{t("lesson.markNote")}</small><b>{completed ? t("lesson.evidenceSubmitted") : t("lesson.earn", { xp: lesson.xp })}</b></div><button data-testid="submit-evidence" className={completed ? "primary-button completed-button" : "primary-button"} disabled={!canSubmit} onClick={() => onComplete(draft)}>{completed ? <><Check />{t("lesson.updateEvidence")}</> : <>{t("lesson.submitEvidence")} <Sparkles /></>}</button></div>
      </section>
    </div>
  );
}

function LecturePanel({ lesson, guide }: { lesson: Lesson; guide: (typeof lessonGuides)[string] | undefined }) {
  const { t, locale } = useI18n();
  if (!guide) return null;
  const concept = locale === "zh-CN" ? guide.keyConcept : t("lesson.intlConcept");
  const conceptDetail = locale === "zh-CN" ? guide.conceptDetail : t("lesson.intlConceptDetail");
  const methodName = locale === "zh-CN" ? guide.methodName : t("lesson.intlMethod");
  const methodSteps = locale === "zh-CN" ? guide.methodSteps : [t("lesson.intlStep1"), t("lesson.intlStep2"), t("lesson.intlStep3")];
  const pitfall = locale === "zh-CN" ? guide.pitfall : t("lesson.intlPitfall");
  const quickCheck = locale === "zh-CN" ? guide.quickCheck : [
    { question: t("lesson.intlCheck1"), answer: t("lesson.intlAnswer1") },
    { question: t("lesson.intlCheck2"), answer: t("lesson.intlAnswer2") },
  ];
  return (
    <div className="course-panel lecture-panel">
      <section className="lesson-lead-grid">
        <div><span className="section-kicker">YOU WILL LEARN</span><h2>{t("lesson.youLearn")}</h2><ul className="objective-list">{lesson.objectives.map((objective) => <li key={objective}><Check />{objective}</li>)}</ul></div>
        <aside><Quote /><p>{concept}</p><small>{t("lesson.coreConcept")}</small></aside>
      </section>
      <article className="lecture-chapter"><div className="chapter-number">01</div><div><span>{t("lesson.coreConcept")}</span><h2>{concept}</h2><p>{conceptDetail}</p></div></article>
      <article className="lecture-chapter method-chapter"><div className="chapter-number">02</div><div><span>{t("lesson.method")}</span><h2>{methodName}</h2><ol>{methodSteps.map((step, index) => <li key={step}><b>{index + 1}</b><span>{step}</span></li>)}</ol></div></article>
      <article className="lecture-warning"><Lightbulb /><div><span>{t("lesson.pitfall")}</span><p>{pitfall}</p></div></article>
      <section className="quick-check"><div><CheckCircle2 /><span><small>QUICK CHECK</small><h2>{t("lesson.quickCheck")}</h2></span></div>{quickCheck.map((item, index) => <details key={item.question}><summary><span>{index + 1}</span>{item.question}<ChevronRight /></summary><p>{item.answer}</p></details>)}</section>
    </div>
  );
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

function CasePanel({ lesson, moduleGuide, guide }: { lesson: Lesson; moduleGuide: (typeof moduleGuides)[string]; guide: (typeof lessonGuides)[string] | undefined }) {
  const { t } = useI18n();
  return (
    <div className="course-panel case-panel">
      <header className="panel-intro"><span className="section-kicker">CASE-BASED LEARNING</span><h2>{t("lesson.caseTitle")}</h2><p>案例用于解释方法如何改变决策，均为课程原创教学案例，不冒充真实企业数据。</p></header>
      <section className="module-case-card"><div className="case-label"><span>模块综合案例</span><b>CASE 0{moduleGuide.stageId === "identity" ? 1 : courseStages.findIndex((item) => item.id === moduleGuide.stageId) + 1}</b></div><h2>{moduleGuide.moduleCase.title}</h2><p>{moduleGuide.moduleCase.context}</p><div className="case-moves">{moduleGuide.moduleCase.moves.map((move, index) => <div key={move}><span>{index + 1}</span><p>{move}</p></div>)}</div><div className="case-result"><Trophy /><span><small>结果</small><b>{moduleGuide.moduleCase.result}</b></span></div></section>
      {guide && <section className="worked-example"><span className="section-kicker">THIS LESSON</span><h2>{guide.workedExample.title}</h2><div className="example-flow"><article><span>情境</span><p>{guide.workedExample.situation}</p></article><ArrowRight /><article><span>分析</span><p>{guide.workedExample.analysis}</p></article><ArrowRight /><article><span>决定</span><p>{guide.workedExample.decision}</p></article></div></section>}
      <section className="case-transfer"><NotebookPen /><div><b>迁移到你的项目</b><p>用同样的“情境—证据—判断—决定”结构重写「{lesson.deliverable}」，案例数字不可直接复制。</p></div></section>
    </div>
  );
}

function AiCoachPanel({ lesson, guide }: { lesson: Lesson; guide: (typeof lessonGuides)[string] }) {
  const [context, setContext] = useState("");
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);
  const runCoach = () => {
    const clean = context.trim();
    const structuralNotes = [
      clean.length < 80 ? "材料偏短：请补充对象、最近一次具体事件与可核查证据。" : "材料长度足以开始结构审查。",
      /\d|次|天|周|元|人/.test(clean) ? "已发现数量或时间线索，请确认每个数字都有范围与来源。" : "尚未发现时间、数量或阈值，建议增加至少一个可观察标准。",
      /证据|记录|访谈|数据|链接|作品/.test(clean) ? "已出现证据词，请在正式对话中要求 AI 逐条引用。" : "尚未说明证据来源，需防止 AI 把推断写成事实。",
    ];
    setGenerated(`${guide.aiLab.prompt}\n\n【我的真实项目材料】\n${clean || "（请先在此补充真实材料）"}\n\n【本地结构预检】\n- ${structuralNotes.join("\n- ")}`);
    setCopied(false);
  };
  const copyPrompt = async () => {
    if (!generated) return;
    await navigator.clipboard?.writeText(generated);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="course-panel ai-panel">
      <header className="ai-panel-hero"><div><span><BrainCircuit />AI INTERACTIVE LAB</span><h2>{guide.aiLab.role}</h2><p>{guide.aiLab.goal}</p></div><div className="ai-privacy"><ShieldCheck /><span><b>本地生成，不上传材料</b><small>此预览版不调用外部模型；生成可复制的专业陪练提示与结构检查。</small></span></div></header>
      <div className="ai-workspace">
        <section><label htmlFor={`ai-context-${lesson.id}`}>粘贴你的真实项目材料</label><textarea id={`ai-context-${lesson.id}`} value={context} onChange={(event) => setContext(event.target.value)} placeholder={`例如：目标客户、最近一次具体项目、已有证据、限制与“${lesson.deliverable}”草稿……`} /><div className="ai-criteria"><span>本次教练会检查</span>{guide.aiLab.criteria.map((criterion) => <em key={criterion}><Check />{criterion}</em>)}</div><button className="primary-button ai-run" onClick={runCoach}><Sparkles />生成陪练任务</button></section>
        <section className={generated ? "ai-output ready" : "ai-output"} aria-live="polite"><div className="ai-output-head"><span><MessageSquareText />陪练提示词</span><button disabled={!generated} onClick={copyPrompt}>{copied ? <ClipboardCheck /> : <Clipboard />}{copied ? "已复制" : "复制到 AI"}</button></div>{generated ? <pre>{generated}</pre> : <div className="ai-empty"><BrainCircuit /><p>补充真实材料后，小晴会生成这节课专属的对练任务。</p><small>它会提醒证据缺口，但不会替你虚构客户、数据或经历。</small></div>}</section>
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

function PraiseDialog({ user, praise, streak, onClose }: { user: UserAccount; praise: string; streak: number; onClose: () => void }) {
  const { t, localizePraise } = useI18n();
  const dialogRef = useRef<HTMLElement>(null);
  useEscape(onClose);
  useDialogFocus(dialogRef);
  return (
    <div className="modal-backdrop praise-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="praise-dialog" role="dialog" aria-modal="true" aria-labelledby="praise-title">
        <button className="dialog-close light-close" onClick={onClose} aria-label={t("common.close")}><X /></button>
        <div className="praise-rays" />
        <div className="praise-mascot"><img src={qingmiBuddy} alt="小晴" /></div>
        <span className="praise-date">{t("praise.day", { count: streak })}</span>
        <h1 id="praise-title">{t("praise.welcome", { name: user.name })}</h1>
        <blockquote>“{localizePraise(praise)}”</blockquote>
        <button className="praise-accept" onClick={onClose}>{t("praise.accept")} <Sparkles /></button>
        <small>{t("praise.note")}</small>
      </section>
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
