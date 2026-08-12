import { useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Database,
  Download,
  FileText,
  FolderGit2,
  GraduationCap,
  Grid2X2,
  HelpCircle,
  Home,
  LayoutDashboard,
  Lightbulb,
  ListFilter,
  LockKeyhole,
  Menu,
  MessageCircle,
  MonitorCog,
  Moon,
  MoreHorizontal,
  Palette,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Sun,
  Trophy,
  UserRound,
  Users,
  WalletCards,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import {
  initialActivities,
  initialCourses,
  initialWorks,
  tools,
  type Activity,
  type Course,
  type Work,
  type WorkStatus,
} from "./data";
import AdminConsole from "./AdminConsole";
import {
  defaultTenantId,
  getMethodologyForProgram,
  getProgramForTenant,
  getTenant,
  initialEvidence,
  knowledgeSourcePolicies,
  milestones,
  milestoneProgress,
  type Evidence,
  type Program,
  type Tenant,
} from "./platformConfig";
import learningJourneyIllustration from "./assets/illustrations/learning-journey-line-art.webp";
import {
  BrandIllustration,
  BrandMark,
  CourseGlyph,
  NavGlyph,
  PageHeading,
  ProductIcon,
  SourceGlyph,
  WorkIcon,
} from "./ui";
import todayDecisionsIllustration from "./assets/illustrations/today-decisions-line-art.webp";
import workPortfolioIllustration from "./assets/illustrations/work-portfolio-line-art.webp";
import toolsCreativeIllustration from "./assets/illustrations/tools-creative-line-art.webp";
import knowledgeHubsIllustration from "./assets/illustrations/knowledge-hubs-line-art.webp";
import rightsGrowthIllustration from "./assets/illustrations/rights-growth-line-art.webp";

type View =
  | "sms"
  | "activate"
  | "learning"
  | "classroom"
  | "sso"
  | "tool"
  | "player"
  | "market"
  | "courseDetail"
  | "myCourses"
  | "toolbox"
  | "toolDetail"
  | "rights"
  | "today"
  | "work"
  | "workDetail"
  | "activity"
  | "sources"
  | "portfolio"
  | "settings"
  | "admin"
  | "ops";

type Scene = "first" | "review" | "workspace" | "admin" | "ops";
type ThemeMode = "system" | "light" | "dark";
type ThemeAccent = "forest" | "teal" | "blue" | "violet";

const themeModes: ThemeMode[] = ["system", "light", "dark"];
const themeAccents: ThemeAccent[] = ["forest", "teal", "blue", "violet"];
const themeModeLabels: Record<ThemeMode, string> = {
  system: "跟随系统",
  light: "浅色",
  dark: "深色",
};
const themeAccentLabels: Record<ThemeAccent, string> = {
  forest: "知行绿",
  teal: "青黛",
  blue: "雾蓝",
  violet: "灰紫",
};

function storedThemeMode(): ThemeMode {
  const value = window.localStorage.getItem("zhixing-theme-mode") as ThemeMode | null;
  return value && themeModes.includes(value) ? value : "system";
}

function storedThemeAccent(): ThemeAccent {
  const value = window.localStorage.getItem("zhixing-theme-accent") as ThemeAccent | null;
  return value && themeAccents.includes(value) ? value : "forest";
}

function resolvedTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

function revealThemeChange(
  update: () => void,
  origin: { x: number; y: number } | undefined,
  animationsEnabled: boolean,
) {
  const documentWithTransition = document as ViewTransitionDocument;
  if (
    !origin ||
    !animationsEnabled ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !documentWithTransition.startViewTransition
  ) {
    update();
    return;
  }
  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
  const transition = documentWithTransition.startViewTransition(update);
  transition.ready
    .then(() =>
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0 at ${origin.x}px ${origin.y}px)`,
            `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
          ],
          opacity: [0.76, 1],
        },
        {
          duration: 620,
          easing: "cubic-bezier(.2,.8,.2,1)",
          pseudoElement: "::view-transition-new(root)",
        } as KeyframeAnimationOptions & { pseudoElement: string },
      ),
    )
    .catch(() => undefined);
}

const sceneLabels: Record<Scene, string> = {
  first: "上课准备",
  review: "课后复习",
  workspace: "工作台",
  admin: "机构管理",
  ops: "平台运营",
};

const statusTone: Record<WorkStatus, string> = {
  需要你: "attention",
  自动推进中: "success",
  等待外部: "warning",
  有风险: "danger",
  已完成: "neutral",
};

const workGuidance: Record<
  string,
  {
    why: string;
    request: string;
    options: string[];
    aiProgress: string[];
  }
> = {
  website: {
    why: "栏目顺序会影响首页结构，系统无法替你决定业务优先级。",
    request: "确认首页导航栏目的优先级，并补充最希望客户记住的一句话。",
    options: ["排列：产品 / 案例 / 定价 / 资源", "也可以直接选择 AI 推荐顺序"],
    aiProgress: ["保留三套首页结构方案", "收到决定后生成核心文案草稿"],
  },
  ppt: {
    why: "方案中的案例数据必须来自真实业务，AI 不能代替你确认客户材料。",
    request: "补充两个可公开使用的客户案例，或确认先用匿名案例占位。",
    options: ["上传案例资料", "选择“先用匿名案例”继续"],
    aiProgress: ["已完成 12 页方案初稿", "等待材料后补齐案例页与结论"],
  },
  research: {
    why: "三个研究方向都会产生不同后续工作，需要你选择当前最重要的目标。",
    request: "从产品定位、价格策略和获客渠道中选择一个优先研究方向。",
    options: ["查看三个方向的依据", "让 AI 按当前目标推荐一个方向"],
    aiProgress: ["已整理主要竞品差异", "选择后继续形成行动建议"],
  },
  manual: {
    why: "当前内容仍在正常推进，暂时不需要你介入。",
    request: "无需处理；如有新的写作要求，可以随时补充。",
    options: ["查看已完成章节", "补充写作要求"],
    aiProgress: ["正在生成示例与配图清单", "完成后会自动更新成果"],
  },
  market: {
    why: "数据清洗已经完成，系统正在形成结论。",
    request: "无需处理；你可以提前查看已清洗的数据与图表。",
    options: ["查看数据表", "补充希望重点回答的问题"],
    aiProgress: ["正在核对异常数据", "准备形成三条可执行洞察"],
  },
  mail: {
    why: "报价已经发出，目前结果取决于客户回复。",
    request: "暂时无需处理；超过约定时间后可以发送一次提醒。",
    options: ["查看已发送内容", "设置提醒时间"],
    aiProgress: ["持续等待授权邮件中的新回复", "收到回复后更新状态并提醒你"],
  },
  archive: {
    why: "所有素材已经完成分类并通过重复项检查。",
    request: "这件事已经完成，无需继续处理。",
    options: ["查看归档目录", "导出成果说明"],
    aiProgress: ["已归档 86 个素材", "成果和来源记录已保留"],
  },
};

const resolvedSummaries: Record<string, string> = {
  website: "导航优先级已确认，AI 正在继续生成首页结构和核心文案。",
  ppt: "案例处理方式已确认，AI 正在补齐案例页与方案结论。",
  research: "研究重点已经确认，AI 正在形成对应的行动建议。",
};

const courseLearningBlueprints: Record<
  string,
  { gains: string[]; chapters: string[] }
> = {
  design: {
    gains: ["建立可复用的 AI 设计方法", "完成一套真实项目作品", "理解商用风险与修正方式"],
    chapters: ["AI 设计入门与工具准备", "视觉表达与风格控制", "真实商业项目实战"],
  },
  ecommerce: {
    gains: ["提炼商品卖点与信息层级", "批量产出主图与活动素材", "建立电商视觉检查标准"],
    chapters: ["商品信息与卖点梳理", "主图、详情页与活动素材", "批量生产与质量验收"],
  },
  drama: {
    gains: ["把故事拆成可执行分镜", "维持角色与场景一致", "完成第一支 AI 漫剧"],
    chapters: ["故事、角色与视觉设定", "分镜与镜头连续性", "声音、字幕与成片包装"],
  },
  writing: {
    gains: ["从需求形成稳定选题", "用 AI 搭建结构并完成初稿", "通过数据和反馈复盘内容"],
    chapters: ["选题、受众与内容目标", "结构、撰写与人话修改", "发布、数据与内容复盘"],
  },
  reading: {
    gains: ["建立稳定的学习节奏", "把输入整理为可复习笔记", "把知识转化为行动"],
    chapters: ["设定可坚持的学习目标", "高效输入与笔记方法", "复习、实践与习惯固化"],
  },
  business: {
    gains: ["快速形成有证据的洞察", "搭建客户容易理解的方案", "完成可演示的商业提案"],
    chapters: ["问题定义与调研证据", "洞察、策略与方案结构", "视觉表达与汇报演练"],
  },
};

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(storedThemeMode);
  const [themeAccent, setThemeAccent] =
    useState<ThemeAccent>(storedThemeAccent);
  const [animationsEnabled, setAnimationsEnabled] = useState(
    () => window.localStorage.getItem("zhixing-animations") !== "off",
  );
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [view, setView] = useState<View>("sms");
  const [scene, setScene] = useState<Scene>("first");
  const [points, setPoints] = useState(1280);
  const [works, setWorks] = useState<Work[]>(initialWorks);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [selectedCourse, setSelectedCourse] = useState("design");
  const [selectedTool, setSelectedTool] = useState("ai-design");
  const [selectedWork, setSelectedWork] = useState("website");
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(
    null,
  );
  const [modal, setModal] = useState<
    "redeem" | "evidence" | "import" | "certificate" | null
  >(null);
  const [playerProgress, setPlayerProgress] = useState(62);
  const [lessonRewarded, setLessonRewarded] = useState(false);
  const [sources, setSources] = useState<Record<string, boolean>>({
    feishu: false,
    ima: false,
    custom: false,
    wps: false,
    files: false,
    mail: false,
  });
  const [filters, setFilters] = useState({ direction: "全部", level: "全部" });
  const [activityFilter, setActivityFilter] = useState("全部活动");
  const [workFilter, setWorkFilter] = useState<"全部" | WorkStatus>("全部");
  const [collapsed, setCollapsed] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [activeTenantId, setActiveTenantId] = useState(defaultTenantId);
  const [evidence, setEvidence] = useState<Evidence[]>(initialEvidence);

  const tenant = getTenant(activeTenantId);
  const activeProgram = getProgramForTenant(activeTenantId);

  const activeTheme =
    themeMode === "system" ? (systemDark ? "dark" : "light") : themeMode;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    document.documentElement.dataset.accent = themeAccent;
    document.documentElement.classList.toggle(
      "motion-reduced",
      !animationsEnabled,
    );
    document.documentElement.style.colorScheme = activeTheme;
    window.localStorage.setItem("zhixing-theme-mode", themeMode);
    window.localStorage.setItem("zhixing-theme-accent", themeAccent);
    window.localStorage.setItem(
      "zhixing-animations",
      animationsEnabled ? "on" : "off",
    );
  }, [activeTheme, animationsEnabled, themeAccent, themeMode]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

  const course =
    courses.find((item) => item.id === selectedCourse) ?? courses[0];
  const activeTool = tools.find((item) => item.id === selectedTool) ?? tools[0];
  const work = works.find((item) => item.id === selectedWork) ?? works[0];

  function notify(title: string, detail: string) {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 2800);
  }

  function changeThemeMode(
    next: ThemeMode,
    origin?: { x: number; y: number },
  ) {
    revealThemeChange(
      () => {
        document.documentElement.dataset.theme = resolvedTheme(next);
        setThemeMode(next);
      },
      origin,
      animationsEnabled,
    );
  }

  function changeThemeAccent(
    next: ThemeAccent,
    origin?: { x: number; y: number },
  ) {
    revealThemeChange(
      () => {
        document.documentElement.dataset.accent = next;
        setThemeAccent(next);
      },
      origin,
      animationsEnabled,
    );
  }

  function addActivity(
    title: string,
    detail: string,
    source: string,
    type: Activity["type"],
  ) {
    const now = new Date();
    setActivities((current) => [
      {
        id: Date.now(),
        time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        title,
        detail,
        source,
        type,
      },
      ...current,
    ]);
  }

  function switchScene(next: Scene) {
    setScene(next);
    if (next === "first") setView("sms");
    if (next === "review") setView("learning");
    if (next === "workspace") setView("today");
    if (next === "admin") setView("admin");
    if (next === "ops") setView("ops");
  }

  function redeemCourse() {
    if (course.owned) return;
    if (points < course.cost) {
      setModal(null);
      notify("积分不足", "继续完成课程或联系班主任补充权益。");
      return;
    }
    setPoints((value) => value - course.cost);
    setCourses((items) =>
      items.map((item) =>
        item.id === course.id ? { ...item, owned: true } : item,
      ),
    );
    addActivity(
      `兑换《${course.title}》`,
      `已使用 ${course.cost} 积分，课程已加入“我的课程”。`,
      "学习中心",
      "你的操作",
    );
    setModal(null);
    notify("兑换成功", `《${course.title}》已加入我的课程。`);
  }

  function finishLesson() {
    setPlayerProgress(92);
    setCourses((items) =>
      items.map((item) =>
        item.id === "design" ? { ...item, progress: 67 } : item,
      ),
    );
    if (!lessonRewarded) {
      setLessonRewarded(true);
      setPoints((value) => value + 30);
      addActivity(
        "完成第 3 课学习",
        "观看进度达到 90%，本课已自动完成并获得 30 积分。",
        "学习中心",
        "学习活动",
      );
      notify("本课已自动完成", "学习奖励 +30 积分，无需手动打卡。");
    }
  }

  function generateWork() {
    if (points < 20) {
      notify("积分不足", "当前余额不足以完成一次生成。");
      return;
    }
    if (!generated) {
      setPoints((value) => value - 20);
      setGenerated(true);
      const createdAt = new Date();
      setEvidence((items) => [
        {
          id: `evidence-${createdAt.getTime()}`,
          tenantId: activeTenantId,
          programId: activeProgram.id,
          taskId: "task-04",
          title: "课程主题海报 · 第一版",
          type: "作品",
          summary: "已保存最终画面、风格选择和生成记录，可继续提交讲师评审。",
          source: "AI 设计 · 专注工作区",
          createdAt: "刚刚",
          reviewStatus: "待评审",
          visibleTo: ["本人", "讲师", "机构管理员"],
        },
        ...items,
      ]);
      addActivity(
        "生成课堂海报作品",
        "课堂作品已自动保存到“我的作品”。",
        "AI 设计",
        "学习活动",
      );
      notify("作品与证据已保存", "已进入成长档案，下一步可补充反馈并提交评审。");
    } else notify("作品已保存", "可以返回课堂继续完成下一步。");
  }

  function resolveWork(id: string) {
    const target = works.find((item) => item.id === id);
    setWorks((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "自动推进中",
              summary:
                resolvedSummaries[id] ??
                "你的决定已经记录，AI 正在继续推进下一阶段。",
              next: "AI 继续完成下一阶段",
              updated: "刚刚",
            }
          : item,
      ),
    );
    addActivity(
      target ? `已完成：${target.next}` : "已确认工作方向",
      "决定和依据已经记录，AI 开始继续推进。",
      "知行 AI",
      "你的操作",
    );
    notify("已经继续推进", "这件事暂时不需要你，状态已自动更新。");
    setView("today");
  }

  const showShell = !["sms", "activate", "sso", "tool"].includes(view);

  return (
    <div className={`app-root ${animationsEnabled ? "" : "motion-off"}`}>
      {showShell ? (
        <>
          <Topbar
            points={points}
            scene={scene}
            tenant={tenant}
            activeTheme={activeTheme}
            onScene={switchScene}
            onQuickTheme={(origin) =>
              changeThemeMode(activeTheme === "dark" ? "light" : "dark", origin)
            }
            onSearch={() =>
              scene === "admin" || scene === "ops"
                ? notify("全局搜索", "输入名称、手机号后四位或业务编号即可查找。")
                : notify("知行 AI", "你可以问：今天有什么需要我？")
            }
          />
          <div className="shell">
            {scene !== "admin" && scene !== "ops" && (
              <Sidebar
                view={view}
                scene={scene}
                collapsed={collapsed}
                onCollapse={() => setCollapsed(!collapsed)}
                onNavigate={setView}
              />
            )}
            <main
              key={`${scene}-${view}`}
              className={`main-content ${collapsed ? "sidebar-collapsed" : ""} ${scene === "admin" || scene === "ops" ? "backend-main" : ""}`}
            >
              {view === "learning" && (
                <LearningHome
                  scene={scene}
                  points={points}
                  program={activeProgram}
                  onNavigate={setView}
                  onTool={(id) => {
                    setSelectedTool(id);
                    setView("toolDetail");
                  }}
                />
              )}
              {view === "classroom" && <Classroom onNavigate={setView} />}
              {view === "player" && (
                <Player
                  progress={playerProgress}
                  onFinish={finishLesson}
                  onNavigate={setView}
                />
              )}
              {view === "market" && (
                <Market
                  courses={courses}
                  filters={filters}
                  onFilter={setFilters}
                  onOpen={(id) => {
                    setSelectedCourse(id);
                    setView("courseDetail");
                  }}
                />
              )}
              {view === "courseDetail" && (
                <CourseDetail
                  course={course}
                  onBack={() => setView(course.owned ? "myCourses" : "market")}
                  onPrimary={() =>
                    course.owned ? setView("player") : setModal("redeem")
                  }
                />
              )}
              {view === "myCourses" && (
                <MyCourses
                  courses={courses.filter((item) => item.owned)}
                  program={activeProgram}
                  onPortfolio={() => setView("portfolio")}
                  onCertificate={() => setModal("certificate")}
                  onOpen={(id) => {
                    setSelectedCourse(id);
                    setView("courseDetail");
                  }}
                  onMarket={() => setView("market")}
                />
              )}
              {view === "toolbox" && (
                <Toolbox
                  points={points}
                  onOpen={(id) => {
                    setSelectedTool(id);
                    setView("toolDetail");
                  }}
                />
              )}
              {view === "toolDetail" && (
                <ToolDetail
                  tool={activeTool}
                  points={points}
                  onBack={() => setView("toolbox")}
                  onOpen={() => setView("sso")}
                  onCourse={() => {
                    setSelectedCourse(
                      activeTool.id === "ai-drama" ? "drama" : "design",
                    );
                    setView("courseDetail");
                  }}
                />
              )}
              {view === "rights" && (
                <Rights points={points} activities={activities} />
              )}
              {view === "today" && (
                <Today
                  works={works}
                  onOpen={(id) => {
                    setSelectedWork(id);
                    setView("workDetail");
                  }}
                  onResolve={resolveWork}
                  onAll={() => setView("work")}
                />
              )}
              {view === "work" && (
                <WorkList
                  works={works}
                  filter={workFilter}
                  onFilter={setWorkFilter}
                  onOpen={(id) => {
                    setSelectedWork(id);
                    setView("workDetail");
                  }}
                />
              )}
              {view === "workDetail" && (
                <WorkDetail
                  work={work}
                  program={activeProgram}
                  onBack={() => setView("work")}
                  onResolve={() => resolveWork(work.id)}
                  onEvidence={() => setModal("evidence")}
                />
              )}
              {view === "activity" && (
                <ActivityPage
                  activities={activities}
                  filter={activityFilter}
                  onFilter={setActivityFilter}
                />
              )}
              {view === "sources" && (
                <Sources
                  values={sources}
                  onToggle={(key) =>
                    setSources((value) => ({ ...value, [key]: !value[key] }))
                  }
                />
              )}
              {view === "portfolio" && (
                <GrowthPortfolio
                  tenant={tenant}
                  program={activeProgram}
                  evidence={evidence.filter((item) => item.tenantId === activeTenantId)}
                  onPractice={() => setView("classroom")}
                  onReview={() => {
                    const hasReview = evidence.some(
                      (item) => item.programId === activeProgram.id && item.type === "评审",
                    );
                    if (!hasReview) {
                      setEvidence((items) => [
                        {
                          id: `review-${Date.now()}`,
                          tenantId: activeTenantId,
                          programId: activeProgram.id,
                          taskId: "task-05",
                          title: "讲师阶段评审",
                          type: "评审",
                          summary: "作品方向清晰，建议补充一条真实使用反馈后完成本阶段。",
                          source: "讲师评审",
                          createdAt: "刚刚",
                          reviewStatus: "已验证",
                          visibleTo: ["本人", "讲师", "机构管理员"],
                        },
                        ...items,
                      ]);
                      notify("评审记录已加入", "成长档案与里程碑状态已经同步更新。" );
                    } else {
                      notify("已经提交过评审", "评审记录保留在成长档案中。" );
                    }
                  }}
                />
              )}
              {view === "settings" && (
                <SettingsPage
                  onNotify={notify}
                  themeMode={themeMode}
                  themeAccent={themeAccent}
                  animationsEnabled={animationsEnabled}
                  onThemeMode={changeThemeMode}
                  onThemeAccent={changeThemeAccent}
                  onAnimations={setAnimationsEnabled}
                  onClearHistory={() => {
                    setActivities([]);
                    notify(
                      "活动记录已清除",
                      "工作与学习活动已移除，知识库原文和课程进度不受影响。",
                    );
                  }}
                />
              )}
              {view === "admin" && (
                <AdminConsole role="academy" onNotify={notify} tenantId={activeTenantId} onTenantPreview={setActiveTenantId} />
              )}
              {view === "ops" && (
                <AdminConsole role="platform" onNotify={notify} tenantId={activeTenantId} onTenantPreview={setActiveTenantId} />
              )}
            </main>
          </div>
        </>
      ) : (
        <>
          {view === "sms" && <SmsPage onNext={() => setView("activate")} />}
          {view === "activate" && (
            <ActivatePage
              onDone={() => {
                setScene("first");
                setView("learning");
                notify("账号激活成功", "课程、积分与课堂工具已经准备好了。");
              }}
            />
          )}
          {view === "sso" && (
            <SsoPage
              tool={activeTool.name}
              onContinue={() => setView("tool")}
            />
          )}
          {view === "tool" && (
            <ToolCanvas
              points={points}
              generated={generated}
              onGenerate={generateWork}
              onBack={() => setView("classroom")}
            />
          )}
        </>
      )}

      {modal === "redeem" && (
        <RedeemModal
          course={course}
          points={points}
          onClose={() => setModal(null)}
          onConfirm={redeemCourse}
        />
      )}
      {modal === "evidence" && <EvidenceModal onClose={() => setModal(null)} />}
      {modal === "certificate" && (
        <CertificateModal
          onClose={() => setModal(null)}
          onNotify={notify}
        />
      )}
      {modal === "import" && (
        <ImportModal
          onClose={() => setModal(null)}
          onConfirm={() => {
            setModal(null);
            setPoints((value) => value + 1280);
            notify(
              "开户与权益发放完成",
              "3 名学员成功，1 条失败记录可修正后重试。",
            );
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={19} />
          <div>
            <b>{toast.title}</b>
            <span>{toast.detail}</span>
          </div>
        </div>
      )}
      {showShell && (
        <button
          className="chat-fab"
          aria-label="打开小白助手"
          title="打开小白助手"
          onClick={() => notify("小白助手", "你可以问我：“今天有什么需要我？”")}
        >
          <MessageCircle size={22} />
        </button>
      )}
    </div>
  );
}

function Topbar({
  points,
  scene,
  tenant,
  activeTheme,
  onScene,
  onQuickTheme,
  onSearch,
}: {
  points: number;
  scene: Scene;
  tenant: Tenant;
  activeTheme: "light" | "dark";
  onScene: (scene: Scene) => void;
  onQuickTheme: (origin: { x: number; y: number }) => void;
  onSearch: () => void;
}) {
  const managementMode = scene === "admin" || scene === "ops";
  const commandText =
    scene === "admin"
      ? "搜索学员、班级或操作记录"
      : scene === "ops"
        ? "搜索用户、组织、课程或账本"
        : "问知行 AI：今天有什么需要我？";
  return (
    <header className="topbar">
      <div className="brand">
        <BrandMark />
        <div>
          <b>{tenant.platformName}</b>
          <small>{tenant.displayName} · 学习与工作成长平台</small>
        </div>
      </div>
      <button className="command" onClick={onSearch}>
        <Search size={18} />
        <span>{commandText}</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="scene-picker">
        <span>切换视图</span>
        <select
          aria-label="切换产品视图"
          value={scene}
          onChange={(event) => onScene(event.target.value as Scene)}
        >
          {Object.entries(sceneLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <ChevronDown size={13} />
      </div>
      {managementMode ? (
        <div className="scope-pill">
          <ShieldCheck size={16} />
          <b>{scene === "admin" ? tenant.displayName : "全平台"}</b>
        </div>
      ) : (
        <div className="points-pill">
          <WalletCards size={16} />
          <b>{points.toLocaleString()}</b>
          <span>积分</span>
        </div>
      )}
      <button
        className="icon-btn theme-quick"
        aria-label={activeTheme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
        title={activeTheme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onQuickTheme({
            x: event.clientX || rect.left + rect.width / 2,
            y: event.clientY || rect.top + rect.height / 2,
          });
        }}
      >
        {activeTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <button className="icon-btn has-dot" aria-label="查看通知" title="查看通知">
        <Bell size={19} />
      </button>
      <button className="user-chip" aria-label="打开账号菜单">
        <span>王</span>
        <div>
          <b>王小明</b>
          <small>
            {scene === "admin"
              ? "机构管理员"
              : scene === "ops"
                ? "平台运营"
                : "学员"}
          </small>
        </div>
        <ChevronDown size={14} />
      </button>
    </header>
  );
}

function Sidebar({
  view,
  scene,
  collapsed,
  onCollapse,
  onNavigate,
}: {
  view: View;
  scene: Scene;
  collapsed: boolean;
  onCollapse: () => void;
  onNavigate: (view: View) => void;
}) {
  const groups =
    scene === "admin" || scene === "ops"
      ? [
          {
            label: "管理",
            items:
              scene === "admin"
                ? [["admin", "students", "学员与班级"]]
                : [
                    ["ops", "overview", "运营中心"],
                    ["rights", "ledger", "账本与对账"],
                  ],
          },
        ]
      : [
          {
            label: "主要入口",
            items: [
              ["today", "today", "今天"],
              ["learning", "learning", "学习首页"],
            ],
          },
          {
            label: "学习",
            items: [
              ["myCourses", "courses", "我的课程"],
              ["portfolio", "portfolio", "成长档案"],
              ["market", "market", "课程市场"],
              ["toolbox", "tools", "工具箱"],
              ["rights", "rights", "我的权益"],
            ],
          },
          {
            label: "工作",
            items: [
              ["work", "work", "工作"],
              ["activity", "activity", "活动"],
              ["sources", "sources", "数据源"],
            ],
          },
          { label: "系统", items: [["settings", "settings", "设置"]] },
        ];
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <nav>
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <small>{group.label}</small>
            {group.items.map(([key, icon, label]) => (
              <button
                key={String(key)}
                className={view === key ? "active" : ""}
                aria-label={String(label)}
                onClick={() => onNavigate(key as View)}
              >
                <NavGlyph name={String(icon)} />
                <span>{String(label)}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      {!collapsed && (scene === "first" || scene === "review") && (
        <div className="guide-card">
          <div className="guide-illus">
            <BookOpen size={31} />
            <Play size={18} />
          </div>
          <b>新手引导</b>
          <p>3 分钟了解知行 AI 如何陪你学习和工作</p>
          <button onClick={() => onNavigate("classroom")}>开始学习</button>
        </div>
      )}
      <button
        className="collapse-btn"
        onClick={onCollapse}
        aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
      >
        <Menu size={17} />
        <span>{collapsed ? "展开" : "收起侧边栏"}</span>
      </button>
    </aside>
  );
}

function LearningHome({
  scene,
  points,
  program,
  onNavigate,
  onTool,
}: {
  scene: Scene;
  points: number;
  program: Program;
  onNavigate: (view: View) => void;
  onTool: (id: string) => void;
}) {
  const classMode = scene === "first";
  return (
    <PageFrame
      aside={<LearningAside points={points} onNavigate={onNavigate} />}
    >
      <PageHeading title={classMode ? "晚上好，王小明" : "上午好，王小明"} />
      <section className="program-context-strip">
        <div>
          <span>当前训练计划</span>
          <b>{program.name}</b>
          <small>{program.cohortName}</small>
        </div>
        <div className="program-context-progress">
          <span><b>计划进度</b><strong>{program.progress}%</strong></span>
          <i><em style={{ width: `${program.progress}%` }} /></i>
        </div>
        <button onClick={() => onNavigate("portfolio")}>
          查看成长档案 <ArrowRight />
        </button>
      </section>
      <section className="hero-learning">
        <div className="hero-copy">
          <span className="hero-tag">
            {classMode ? "今晚有课" : "继续学习"}
          </span>
          <h2>
            {classMode
              ? "AI+设计实战 · 第 4 课"
              : "第 3 课 · 批量出图与风格统一"}
          </h2>
          <h3>{classMode ? "商用素材的版权边界" : "上次学到 26:35"}</h3>
          <p>
            {classMode
              ? "今天 19:00 · 上课安排以通知为准 · 李老师"
              : "AI+设计实战 · 本课已看 62%"}
          </p>
          {!classMode && (
            <div className="hero-progress">
              <i style={{ width: "62%" }} />
            </div>
          )}
          <button
            className="primary-light"
            onClick={() => onNavigate(classMode ? "classroom" : "player")}
          >
            {classMode ? "进入课堂" : "继续学习"}
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-art">
          <img src={learningJourneyIllustration} alt="" />
        </div>
      </section>
      <div className="section-head">
        <div>
          <h2>课堂工具</h2>
          <p>课上用过的工具，回家一样可以继续使用</p>
        </div>
        <button className="text-btn" onClick={() => onNavigate("toolbox")}>
          查看全部 <ArrowRight size={15} />
        </button>
      </div>
      <div className="tool-row">
        {tools.slice(0, 4).map((tool) => (
          <button
            className="tool-card"
            key={tool.id}
            onClick={() => onTool(tool.id)}
          >
            <ProductIcon kind={tool.id} tone={tool.color} />
            <div>
              <b>{tool.name}</b>
              <p>{tool.desc}</p>
              <small>约可使用 {Math.floor(points / tool.cost)} 次</small>
            </div>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
      <button className="rights-strip" onClick={() => onNavigate("rights")}>
        <ProductIcon kind="package" />
        <div>
          <b>基础学习包</b>
          <p>
            积分 {points.toLocaleString()} · 有效期至 2027-08-01 ·
            可用于全站课程与课堂工具
          </p>
        </div>
        <span>
          查看权益 <ArrowRight size={14} />
        </span>
      </button>
    </PageFrame>
  );
}

function LearningAside({
  points,
  onNavigate,
}: {
  points: number;
  onNavigate: (view: View) => void;
}) {
  return (
    <div className="aside-stack">
      <AsideCard title="我的学习">
        <div className="metric-list">
          <button onClick={() => onNavigate("myCourses")}>
            <BookOpen />
            <span>进行中课程</span>
            <b>2</b>
            <ArrowRight />
          </button>
          <button onClick={() => onNavigate("rights")}>
            <WalletCards />
            <span>积分余额</span>
            <b>{points.toLocaleString()}</b>
            <ArrowRight />
          </button>
          <button onClick={() => onNavigate("toolbox")}>
            <Grid2X2 />
            <span>可用工具</span>
            <b>4</b>
            <ArrowRight />
          </button>
        </div>
      </AsideCard>
      <AsideCard title="本周学习">
        <div className="week-ring">
          <span>
            3<small>天</small>
          </span>
        </div>
        <p className="center-muted">已学习 2 小时 35 分钟</p>
        <div className="mini-bars">
          {[38, 0, 66, 42, 0, 78, 0].map((h, i) => (
            <i key={i} style={{ height: `${Math.max(h, 5)}%` }} />
          ))}
        </div>
      </AsideCard>
      <AsideCard title="学习建议" icon={<Lightbulb size={18} />}>
        <p>先完成今天的课堂任务，再用 20 分钟复习上节课，学习效果会更稳定。</p>
      </AsideCard>
    </div>
  );
}

function Classroom({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <AsideCard title="课堂状态">
            <StatusLine label="签到" value="已完成" tone="green" />
            <StatusLine label="本节课" value="19:00–21:00" />
            <StatusLine label="课堂工具" value="AI 设计" />
            <StatusLine label="作品记录" value="0 / 1" />
          </AsideCard>
          <AsideCard title="需要帮助？" icon={<HelpCircle size={18} />}>
            <p>遇到账号或工具问题，请举手联系现场助教。</p>
            <button className="soft-button">联系助教</button>
          </AsideCard>
        </div>
      }
    >
      <button className="back-link" onClick={() => onNavigate("learning")}>
        <ArrowLeft size={16} />
        返回学习首页
      </button>
      <section className="class-banner">
        <div>
          <span className="live-tag">
            <span />
            正在上课
          </span>
          <h1>第 4 课 · 商用素材的版权边界</h1>
          <p>AI+设计实战（第 4 期 · 周末班）</p>
          <div className="class-meta">
            <span>
              <Clock3 />
              今天 19:00–21:00
            </span>
            <span>
              <Home />
              上课安排以通知为准
            </span>
            <span>
              <UserRound />
              李老师
            </span>
          </div>
        </div>
        <button onClick={() => onNavigate("sso")}>
          打开课堂工具：AI 设计 <ArrowRight size={17} />
        </button>
      </section>
      <section className="panel">
        <div className="section-head compact">
          <div>
            <h2>本节课要做的事</h2>
            <p>跟着老师完成下面三步即可</p>
          </div>
          <span className="progress-chip">0 / 3</span>
        </div>
        <div className="lesson-steps">
          {[
            "用 AI 设计生成一张课程主题海报",
            "对比三种版式，选出最适合商用的一版",
            "把成稿保存到本节课的作品记录",
          ].map((text, i) => (
            <div key={text}>
              <span>{i + 1}</span>
              <b>{text}</b>
              <small>
                {i === 0
                  ? "使用课堂指定工具完成"
                  : i === 1
                    ? "老师会讲解选择标准"
                    : "作品会自动保存到学习账号"}
              </small>
            </div>
          ))}
        </div>
      </section>
      <section className="panel course-note">
        <ProductIcon kind="ai-design" />
        <div>
          <b>课堂工具已经准备好</b>
          <p>
            使用知行 AI
            账号直接进入，不需要重新注册或登录；积分与作品会自动同步。
          </p>
        </div>
        <ShieldCheck size={28} />
      </section>
    </PageFrame>
  );
}

function Player({
  progress,
  onFinish,
  onNavigate,
}: {
  progress: number;
  onFinish: () => void;
  onNavigate: (view: View) => void;
}) {
  return (
    <PageFrame
      aside={
        <div className="course-directory">
          <div className="directory-head">
            <b>课程目录</b>
            <span>3 章 · 12 课</span>
            <div className="progress-line">
              <i style={{ width: "25%" }} />
            </div>
            <small>已完成 2 / 12</small>
          </div>
          {[
            "第 1 课 · 认识 AI 设计",
            "第 2 课 · 提示词与参考图",
            "第 3 课 · 批量出图与风格统一",
            "第 4 课 · 商用素材的版权边界",
            "第 5 课 · 真实项目练习",
          ].map((lesson, i) => (
            <button className={i === 2 ? "active" : ""} key={lesson}>
              <span>{i < 2 ? <Check size={13} /> : i + 1}</span>
              <div>
                <b>{lesson}</b>
                <small>
                  {i < 2 ? "已完成" : i === 2 ? "正在学习" : "未开始"}
                </small>
              </div>
            </button>
          ))}
        </div>
      }
    >
      <div className="breadcrumb">
        <button onClick={() => onNavigate("myCourses")}>我的课程</button>
        <span>/</span>
        <button>AI+设计实战</button>
        <span>/</span>
        <b>第 3 课</b>
      </div>
      <div className="video-player">
        <div className="video-stage">
          <span>第 3 课</span>
          <h2>批量出图与风格统一</h2>
          <p>一次生成多张 · 参数模板复用 · 常见翻车点修正</p>
          <button className="play-circle">
            <Pause size={23} />
          </button>
        </div>
        <div className="video-controls">
          <div className="play-progress">
            <i style={{ width: `${progress}%` }} />
          </div>
          <button>
            <Pause size={16} />
          </button>
          <span>{progress >= 90 ? "38:11" : "26:35"} / 42:18</span>
          <div />
          <button>1.0x</button>
          <button>高清</button>
          <button>全屏</button>
        </div>
      </div>
      <div className="resume-card">
        <div>
          <RefreshCw size={17} />
          <span>
            {progress >= 90
              ? "本课观看进度已达到 90%，已自动完成"
              : "上次学到 26:35，已自动续播"}
          </span>
        </div>
        <button onClick={onFinish}>
          {progress >= 90 ? "已完成" : "快进到本课结尾"}
        </button>
      </div>
      <section className="panel lesson-info">
        <h1>第 3 课 · 批量出图与风格统一</h1>
        <p>李老师 · 资深设计师　|　时长 42 分 18 秒　|　更新于 2026-07-12</p>
        <div className="separator" />
        <h3>本课介绍</h3>
        <p>
          本课讲解一次性产出多张图时如何锁定风格，从参数模板、参考图约束到批量导出的完整做法。
        </p>
        <h3>课程资料</h3>
        <div className="download-row">
          <button>
            <FileText />
            风格统一速查表 <span>PDF · 1.8 MB</span>
            <b>下载</b>
          </button>
          <button>
            <FolderGit2 />
            课堂参数模板包 <span>ZIP · 5.6 MB</span>
            <b>下载</b>
          </button>
        </div>
      </section>
    </PageFrame>
  );
}

function Market({
  courses,
  filters,
  onFilter,
  onOpen,
}: {
  courses: Course[];
  filters: { direction: string; level: string };
  onFilter: (value: { direction: string; level: string }) => void;
  onOpen: (id: string) => void;
}) {
  const filtered = courses.filter(
    (course) =>
      (filters.direction === "全部" ||
        course.direction === filters.direction) &&
      (filters.level === "全部" || course.level === filters.level),
  );
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <AsideCard title="选课提示" icon={<Lightbulb size={18} />}>
            <p>先完成一门正在学习的课程，再兑换相邻方向，学习效果更好。</p>
          </AsideCard>
        </div>
      }
    >
      <PageHeading title="课程市场" />
      <section className="filter-panel">
        <FilterRow
          label="学习方向"
          values={["全部", "AI+设计", "AI+电商", "AI+漫剧", "职场", "读书"]}
          selected={filters.direction}
          onSelect={(direction) => onFilter({ ...filters, direction })}
        />
        <FilterRow
          label="难度层级"
          values={["全部", "入门", "进阶"]}
          selected={filters.level}
          onSelect={(level) => onFilter({ ...filters, level })}
        />
      </section>
      <div className="course-grid">
        {filtered.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onOpen={() => onOpen(course.id)}
          />
        ))}
      </div>
    </PageFrame>
  );
}

function MyCourses({
  courses,
  program,
  onOpen,
  onMarket,
  onCertificate,
  onPortfolio,
}: {
  courses: Course[];
  program: Program;
  onOpen: (id: string) => void;
  onMarket: () => void;
  onCertificate: () => void;
  onPortfolio: () => void;
}) {
  const [tab, setTab] = useState<"进行中" | "已完成">("进行中");
  const visible = courses.filter((course) =>
    tab === "已完成" ? course.progress === 100 : course.progress < 100,
  );
  const resumeCourse =
    tab === "进行中"
      ? visible.find((course) => course.id === "design") ?? visible[0]
      : undefined;
  const completedCourse =
    tab === "已完成" ? visible.find((course) => course.progress === 100) : undefined;
  const remainingCourses = visible.filter(
    (course) => course.id !== resumeCourse?.id && course.id !== completedCourse?.id,
  );
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <AsideCard title="学习概览">
            <StatusLine label="进行中" value="2 门" tone="blue" />
            <StatusLine label="已完成" value="1 门" tone="green" />
            <StatusLine label="本周学习" value="2h 35m" />
          </AsideCard>
          <AsideCard title="下一步">
            <p>《AI+设计实战》第 3 课还剩约 16 分钟，今天完成最合适。</p>
          </AsideCard>
        </div>
      }
    >
      <div className="courses-page-heading">
        <PageHeading title="我的课程" />
        <button className="soft-action-button" onClick={onPortfolio}>
          <Trophy /> 查看成长档案
        </button>
      </div>
      <section className="program-summary-card">
        <div>
          <span>所属训练计划</span>
          <h2>{program.name}</h2>
          <p>{program.cohortName} · {program.modules.length} 个模块</p>
        </div>
        <div>
          <small>训练计划进度</small>
          <b>{program.progress}%</b>
          <i><em style={{ width: `${program.progress}%` }} /></i>
        </div>
      </section>
      <div className="tabs">
        <button
          className={tab === "进行中" ? "active" : ""}
          onClick={() => setTab("进行中")}
        >
          进行中
        </button>
        <button
          className={tab === "已完成" ? "active" : ""}
          onClick={() => setTab("已完成")}
        >
          已完成
        </button>
      </div>

      {resumeCourse && (
        <section className="resume-learning-card">
          <div className="resume-learning-main">
            <span className="resume-kicker">
              <RefreshCw /> 继续上次学习
            </span>
            <div className="resume-learning-title">
              <div>
                <small>{resumeCourse.direction} · {resumeCourse.level}</small>
                <h2>{resumeCourse.title}</h2>
                <p>下一步：第 3 课《批量出图与风格统一》· 剩余约 16 分钟</p>
              </div>
              <button className="primary-button" onClick={() => onOpen(resumeCourse.id)}>
                从 26:35 继续 <ArrowRight />
              </button>
            </div>
            <div className="dual-progress" aria-label="课程与当前章节进度">
              <div>
                <span><b>整门课程</b><strong>{resumeCourse.progress}%</strong></span>
                <i><em style={{ width: `${resumeCourse.progress}%` }} /></i>
                <small>已完成 2 章，正在学习第 3 章</small>
              </div>
              <div>
                <span><b>当前章节</b><strong>2 / 5</strong></span>
                <i><em style={{ width: "40%" }} /></i>
                <small>已完成概念与示例，下一步是实操</small>
              </div>
            </div>
          </div>
          <div className="resume-learning-next">
            <span>当前模块</span>
            {[
              ["概念讲解", "已完成"],
              ["风格统一示例", "已完成"],
              ["课堂实操", "下一步"],
              ["作品保存", "待开始"],
            ].map(([title, state], index) => (
              <div className={state === "下一步" ? "current" : ""} key={title}>
                <i>{state === "已完成" ? <Check /> : index + 1}</i>
                <b>{title}</b>
                <small>{state}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {completedCourse && (
        <section className="course-completion-card">
          <div className="completion-trophy"><Trophy /></div>
          <div>
            <span>已完成课程</span>
            <h2>{completedCourse.title}</h2>
            <p>你已完成 {completedCourse.lessons} 节课程，结业证书和作品记录已经生成。</p>
            <div className="completion-facts">
              <span><CheckCircle2 /> {completedCourse.lessons} / {completedCourse.lessons} 课时</span>
              <span><FileText /> 1 份结业证书</span>
              <span><Grid2X2 /> 3 件实操成果</span>
            </div>
          </div>
          <div className="completion-actions">
            <button onClick={() => onOpen(completedCourse.id)}>查看学习记录</button>
            <button className="primary-button" onClick={onCertificate}>
              查看结业证书 <ArrowRight />
            </button>
          </div>
        </section>
      )}

      {remainingCourses.length > 0 && (
        <div className="section-head compact course-more-head">
          <div>
            <h2>{tab === "进行中" ? "其他正在学习的课程" : "其他已完成课程"}</h2>
          </div>
        </div>
      )}
      <div className="course-grid">
        {remainingCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onOpen={() => onOpen(course.id)}
          />
        ))}
      </div>
      <button className="market-cta" onClick={onMarket}>
        <div>
          <Store size={21} />
          <span>
            <b>想学的方向还没有课？</b>
            <small>去课程市场看看更多课程</small>
          </span>
        </div>
        <ArrowRight />
      </button>
    </PageFrame>
  );
}

function CourseCard({
  course,
  onOpen,
}: {
  course: Course;
  onOpen: () => void;
}) {
  return (
    <button className="course-card" onClick={onOpen}>
      <div className={`course-cover ${course.cover}`}>
        <CourseGlyph kind={course.cover} />
        <span>{course.direction}</span>
        <b>{course.title}</b>
        <small>{course.teacher}</small>
      </div>
      <div className="course-body">
        <div className="course-tags">
          <span>{course.level}</span>
          <span>{course.lessons} 课时</span>
          {course.owned && <span className="owned">已拥有</span>}
        </div>
        <p>{course.description}</p>
        {course.owned ? (
          <>
            <div className="course-progress">
              <i style={{ width: `${course.progress}%` }} />
            </div>
            <div className="course-bottom">
              <span>已学 {course.progress}%</span>
              <b>
                {course.progress === 100 ? "查看课程" : "继续学习"}{" "}
                <ArrowRight />
              </b>
            </div>
          </>
        ) : (
          <div className="course-bottom">
            <span>
              <WalletCards />
              {course.cost.toLocaleString()} 积分
            </span>
            <b>
              查看详情 <ArrowRight />
            </b>
          </div>
        )}
      </div>
    </button>
  );
}

function CourseDetail({
  course,
  onBack,
  onPrimary,
}: {
  course: Course;
  onBack: () => void;
  onPrimary: () => void;
}) {
  const learningBlueprint =
    courseLearningBlueprints[course.id] ?? courseLearningBlueprints.design;
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <AsideCard title="课程信息">
            <StatusLine label="讲师" value={course.teacher} />
            <StatusLine label="方向" value={course.direction} />
            <StatusLine label="难度" value={course.level} />
            <StatusLine label="课时" value={`${course.lessons} 节`} />
          </AsideCard>
          <AsideCard title="相关工具">
            <div className="related-tool">
              <ProductIcon kind="ai-design" />
              <div>
                <b>AI 设计</b>
                <p>随课练习使用</p>
              </div>
            </div>
          </AsideCard>
        </div>
      }
    >
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} />
        返回
      </button>
      <section className="course-detail-hero">
        <div className={`course-detail-cover ${course.cover}`}>
          <CourseGlyph kind={course.cover} />
          <b>{course.direction}</b>
        </div>
        <div>
          <div className="course-tags">
            <span>{course.level}</span>
            <span>{course.lessons} 课时</span>
            {course.owned && <span className="owned">已拥有</span>}
          </div>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <div className="teacher-line">
            <span>李</span>
            <div>
              <b>{course.teacher}</b>
              <small>资深实战讲师</small>
            </div>
          </div>
          <button className="primary-button" onClick={onPrimary}>
            {course.owned
              ? course.progress
                ? "继续学习"
                : "开始学习"
              : `${course.cost.toLocaleString()} 积分兑换`}
            <ArrowRight size={17} />
          </button>
        </div>
      </section>
      <section className="course-decision-strip" aria-label="开始课程前的关键信息">
        <article>
          <Clock3 />
          <div><small>学习用时</small><b>约 {Math.max(6, Math.round(course.lessons * 0.75))} 小时</b></div>
        </article>
        <article>
          <BookOpen />
          <div><small>课程结构</small><b>{course.lessons} 课时 · 3 章</b></div>
        </article>
        <article>
          <WandSparkles />
          <div><small>随课实操</small><b>3 个真实任务</b></div>
        </article>
        <article>
          <GraduationCap />
          <div><small>学完成果</small><b>作品 + 结业记录</b></div>
        </article>
      </section>
      <div className="detail-columns">
        <section className="panel rich-content">
          <h2>你将学会</h2>
          <div className="gain-grid">
            {learningBlueprint.gains.map((text) => (
              <div key={text}>
                <CheckCircle2 />
                {text}
              </div>
            ))}
          </div>
          <h2>课程大纲</h2>
          {learningBlueprint.chapters.map((text, i) => (
            <div className="chapter" key={text}>
              <span>{i + 1}</span>
              <div>
                <b>第 {i + 1} 章 · {text}</b>
                <small>
                  {4 + i} 个课时 · 约 {90 + i * 20} 分钟
                </small>
              </div>
              <ChevronDown />
            </div>
          ))}
        </section>
      </div>
    </PageFrame>
  );
}

function Toolbox({
  points,
  onOpen,
}: {
  points: number;
  onOpen: (id: string) => void;
}) {
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <BrandIllustration
            src={toolsCreativeIllustration}
            alt="统一账号连接课程、工具与权益"
            compact
          />
          <AsideCard title="统一账号" icon={<ShieldCheck size={18} />}>
            <p>平台内工具无需重复注册，作品和积分会自动同步。</p>
          </AsideCard>
        </div>
      }
    >
      <PageHeading title="工具箱" />
      <div className="tool-grid">
        {tools.map((tool) => (
          <button
            className={`tool-large ${!tool.enabled ? "disabled" : ""}`}
            key={tool.id}
            onClick={() => onOpen(tool.id)}
          >
            <div className="tool-large-head">
              <ProductIcon kind={tool.id} tone={tool.color} />
              <span
                className={`status ${tool.enabled ? "success" : "neutral"}`}
              >
                {tool.enabled ? "可使用" : "未开通"}
              </span>
            </div>
            <h3>{tool.name}</h3>
            <p>{tool.desc}</p>
            <div className="separator" />
            <small>单次 {tool.cost} 积分</small>
            <b>
              {tool.enabled
                ? `约可用 ${Math.floor(points / tool.cost)} 次`
                : "查看开通方式"}{" "}
              <ArrowRight size={15} />
            </b>
          </button>
        ))}
      </div>
    </PageFrame>
  );
}

function ToolDetail({
  tool,
  points,
  onBack,
  onOpen,
  onCourse,
}: {
  tool: (typeof tools)[number];
  points: number;
  onBack: () => void;
  onOpen: () => void;
  onCourse: () => void;
}) {
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <AsideCard title="当前权益">
            <StatusLine
              label="状态"
              value={tool.enabled ? "可使用" : "未开通"}
              tone={tool.enabled ? "green" : "orange"}
            />
            <StatusLine label="单次消耗" value={`${tool.cost} 积分`} />
            <StatusLine
              label="当前余额"
              value={`${points.toLocaleString()} 积分`}
            />
            <StatusLine
              label="预计可用"
              value={
                tool.enabled ? `${Math.floor(points / tool.cost)} 次` : "—"
              }
            />
          </AsideCard>
        </div>
      }
    >
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} />
        返回工具箱
      </button>
      <section className="tool-detail-hero">
        <ProductIcon kind={tool.id} tone={tool.color} size="lg" />
        <div>
          <span className={`status ${tool.enabled ? "success" : "neutral"}`}>
            {tool.enabled ? "权益内可用" : "尚未开通"}
          </span>
          <h1>{tool.name}</h1>
          <p>
            {tool.desc}。使用知行 AI
            账号直接进入，作品、积分和使用记录自动同步。
          </p>
          <button
            className="primary-button"
            disabled={!tool.enabled}
            onClick={onOpen}
          >
            {tool.enabled ? "免登录进入工具" : "联系班主任开通"}
            <ArrowRight />
          </button>
        </div>
      </section>
      <section className="panel">
        <div className="section-head">
          <div>
            <h2>适合用来做什么</h2>
            <p>从课程练习到真实工作都能继续使用</p>
          </div>
        </div>
        <div className="use-grid">
          {[
            "课程海报与社群配图",
            "电商主图与详情页素材",
            "提案封面与信息图",
          ].map((text, i) => (
            <div key={text}>
              <span>{i + 1}</span>
              <b>{text}</b>
              <p>选择模板、补充内容，快速完成第一版。</p>
            </div>
          ))}
        </div>
      </section>
      <button className="related-course-card" onClick={onCourse}>
        <BookOpen />
        <div>
          <small>不会用？从课程开始</small>
          <b>{tool.course}</b>
          <p>查看关联课时和操作示例</p>
        </div>
        <ArrowRight />
      </button>
    </PageFrame>
  );
}

function Rights({
  points,
  activities,
}: {
  points: number;
  activities: Activity[];
}) {
  const ledger = activities.filter(
    (item) => item.type === "学习活动" || item.title.includes("兑换"),
  );
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <BrandIllustration
            src={rightsGrowthIllustration}
            alt="课程、工具与权益陪伴持续成长"
            compact
          />
          <AsideCard title="权益说明">
            <p>积分可以在课程兑换和课堂工具之间通用，不存在第二套余额。</p>
          </AsideCard>
          <AsideCard title="需要帮助？">
            <p>权益与报名信息不一致时，请联系课程服务人员。</p>
            <button className="soft-button">联系课程服务</button>
          </AsideCard>
        </div>
      }
    >
      <PageHeading title="我的权益" />
      <section className="rights-card">
        <div>
          <ProductIcon kind="package" />
          <div>
            <span className="status success">生效中</span>
            <h2>基础学习包</h2>
            <p>有效期至 2027-08-01（还剩 364 天）</p>
          </div>
        </div>
        <div>
          <small>积分余额</small>
          <b>{points.toLocaleString()}</b>
          <span>积分</span>
        </div>
        <div className="rights-scope">
          <small>可用范围</small>
          {["全站课程兑换", "AI 设计", "AI 电商", "AI 写作", "课堂助手"].map(
            (item) => (
              <span key={item}>
                <Check size={13} />
                {item}
              </span>
            ),
          )}
        </div>
      </section>
      <section className="panel ledger">
        <div className="section-head">
          <div>
            <h2>积分流水</h2>
            <p>每一笔获得与消耗都清楚可查</p>
          </div>
          <button className="filter-button">
            <ListFilter />
            筛选
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>事项</th>
              <th>来源</th>
              <th>积分变动</th>
              <th>余额</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>08-10 15:10</td>
              <td>完成课程学习</td>
              <td>学习中心</td>
              <td className="positive">+30</td>
              <td>{points.toLocaleString()}</td>
            </tr>
            <tr>
              <td>08-09 19:42</td>
              <td>AI 设计 · 生成课堂海报</td>
              <td>AI 设计</td>
              <td className="negative">-20</td>
              <td>1,250</td>
            </tr>
            {ledger.slice(0, 3).map((item) => (
              <tr key={item.id}>
                <td>08-08 {item.time}</td>
                <td>{item.title}</td>
                <td>{item.source}</td>
                <td className="positive">+30</td>
                <td>1,270</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageFrame>
  );
}

function Today({
  works,
  onOpen,
  onResolve,
  onAll,
}: {
  works: Work[];
  onOpen: (id: string) => void;
  onResolve: (id: string) => void;
  onAll: () => void;
}) {
  const attention = works.filter((item) => item.status === "需要你");
  const other = works.filter((item) => item.status !== "需要你");
  return (
    <PageFrame aside={<TodayAside />}>
      <PageHeading
        eyebrow="2026 年 8 月 10 日 · 星期一"
        title="早上好，王小明"
      />
      <div className="attention-head">
        <div>
          <Sparkles />
          <h2>
            {attention.length > 0 ? (
              <>
                今天需要你 <b>{attention.length}</b>
              </>
            ) : (
              "现在不需要你"
            )}
          </h2>
        </div>
        <button onClick={onAll}>
          查看全部工作 <ArrowRight />
        </button>
      </div>
      {attention.length > 0 ? (
        <div className="attention-grid">
          {attention.map((item) => (
            <article className={`attention-card ${item.accent}`} key={item.id}>
              <div className="card-top">
                <WorkIcon kind={item.id} tone={item.accent} />
                <span className="status attention">
                  {item.next.includes("补充")
                    ? "待你补充"
                    : item.next.includes("选择")
                      ? "请你决策"
                      : "需要确认"}
                </span>
              </div>
              <small>{item.stage}</small>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <div className="outcome">
                <Zap />
                <span>
                  <small>最新成果</small>
                  <b>{item.outcome}</b>
                </span>
              </div>
              <div className="card-actions">
                <button onClick={() => onOpen(item.id)}>查看依据</button>
                <button className="solid" onClick={() => onResolve(item.id)}>
                  {item.next}
                  <ArrowRight />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="attention-empty">
          <CheckCircle2 />
          <div>
            <b>其他工作正在正常推进</b>
            <p>有新决定时会在这里提醒你。</p>
          </div>
        </div>
      )}
      <div className="section-head other-head">
        <h2>其他工作</h2>
        <button className="text-btn" onClick={onAll}>
          管理全部工作 <ArrowRight />
        </button>
      </div>
      <div className="status-tabs" aria-label="其他工作状态摘要">
        <span className="active">
          自动推进中{" "}
          <b>{other.filter((i) => i.status === "自动推进中").length}</b>
        </span>
        <span>
          等待外部 <b>{other.filter((i) => i.status === "等待外部").length}</b>
        </span>
        <span>
          已完成 <b>{other.filter((i) => i.status === "已完成").length}</b>
        </span>
      </div>
      <div className="compact-work-list">
        {other.slice(0, 4).map((item) => (
          <button key={item.id} onClick={() => onOpen(item.id)}>
            <WorkIcon kind={item.id} tone={item.accent} />
            <div>
              <b>{item.title}</b>
              <p>{item.summary}</p>
            </div>
            <span className={`status ${statusTone[item.status]}`}>
              {item.status}
            </span>
            <div className="next">
              <small>下一步</small>
              <b>{item.next}</b>
            </div>
            <ArrowRight />
          </button>
        ))}
      </div>
    </PageFrame>
  );
}

function TodayAside() {
  return (
    <div className="aside-stack">
      <BrandIllustration
        src={todayDecisionsIllustration}
        alt="AI 整理工作并呈现需要决策的事项"
        compact
      />
      <AsideCard title="今日学习" icon={<GraduationCap size={18} />}>
        <b className="aside-emphasis">AI 电商视觉实战 · 第 12 课</b>
        <p>预计 20 分钟，接着昨天的进度往下走。</p>
      </AsideCard>
    </div>
  );
}

function WorkList({
  works,
  filter,
  onFilter,
  onOpen,
}: {
  works: Work[];
  filter: "全部" | WorkStatus;
  onFilter: (value: "全部" | WorkStatus) => void;
  onOpen: (id: string) => void;
}) {
  const visible =
    filter === "全部" ? works : works.filter((item) => item.status === filter);
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <BrandIllustration
            src={workPortfolioIllustration}
            alt="AI 编排多个项目并持续推进成果"
            compact
          />
          <AsideCard title="AI 建议关注" icon={<Sparkles size={18} />}>
            <p>
              产品官网还有一个结构问题需要确认，用户手册已经超过一天没有新进展。
            </p>
          </AsideCard>
        </div>
      }
    >
      <PageHeading title="我的工作" />
      <div className="work-toolbar">
        <div className="filter-chips">
          {(
            [
              "全部",
              "需要你",
              "自动推进中",
              "等待外部",
              "有风险",
              "已完成",
            ] as const
          ).map((item) => (
            <button
              className={filter === item ? "active" : ""}
              key={item}
              onClick={() => onFilter(item)}
            >
              {item}
              <b>
                {item === "全部"
                  ? works.length
                  : works.filter((work) => work.status === item).length}
              </b>
            </button>
          ))}
        </div>
        <span className="work-sort-note">按最近更新排序</span>
      </div>
      <div className="work-grid">
        {visible.map((item) => (
          <button
            className="work-card"
            key={item.id}
            onClick={() => onOpen(item.id)}
          >
            <div className="card-top">
              <WorkIcon kind={item.id} tone={item.accent} />
              <span className={`status ${statusTone[item.status]}`}>
                {item.status}
              </span>
            </div>
            <h3>{item.title}</h3>
            <small>当前阶段：{item.stage}</small>
            <p>{item.summary}</p>
            <div className="work-latest">
              <small>最新成果</small>
              <b>{item.outcome}</b>
            </div>
            <div className="work-card-bottom">
              <span>{item.updated}</span>
              <b>下一步：{item.next}</b>
              <ArrowRight />
            </div>
          </button>
        ))}
      </div>
    </PageFrame>
  );
}

function WorkDetail({
  work,
  program,
  onBack,
  onResolve,
  onEvidence,
}: {
  work: Work;
  program: Program;
  onBack: () => void;
  onResolve: () => void;
  onEvidence: () => void;
}) {
  const guidance = workGuidance[work.id] ?? {
    why: "当前状态来自已经连接的资料和最近一次结果。",
    request: work.next,
    options: ["查看当前成果", "补充新的要求"],
    aiProgress: [work.summary, `下一步：${work.next}`],
  };
  const needsAction = work.status === "需要你" || work.status === "有风险";
  const waiting = work.status === "等待外部";
  const complete = work.status === "已完成";
  const evidenceSource =
    work.id === "mail"
      ? "授权邮件"
      : work.id === "research"
        ? "ima 知识库"
        : work.id === "archive"
          ? "自定义知识库"
          : "飞书知识库";
  const recentlyResolved = work.status === "自动推进中" && work.updated === "刚刚";
  const linkedTask = program.modules
    .flatMap((module) => module.tasks.map((task) => ({ module, task })))
    .find(({ task }) => task.workId === work.id);
  const stateWhy = recentlyResolved
    ? "你的决定和当时的依据已经记录，系统已恢复自动推进。"
    : guidance.why;
  const userRequest = recentlyResolved
    ? "你的决定已记录，暂时不需要再处理。"
    : guidance.request;
  const stateOptions = recentlyResolved
    ? ["查看已记录的决定", "如有变化，可以重新补充要求"]
    : guidance.options;
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <AsideCard
            title={
              needsAction
                ? "为什么现在提醒我"
                : complete
                  ? "为什么判定已完成"
                  : "为什么显示这个状态"
            }
            icon={<Lightbulb size={18} />}
          >
            <p>{stateWhy}</p>
            <button className="text-btn" onClick={onEvidence}>
              查看完整依据 <ArrowRight />
            </button>
          </AsideCard>
          <AsideCard title="状态依据">
            <StatusLine label="主要来源" value={evidenceSource} />
            <StatusLine label="最后更新" value={work.updated} />
          </AsideCard>
        </div>
      }
    >
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} />
        返回工作列表
      </button>
      <div className="work-title">
        <div>
          <span className={`status ${statusTone[work.status]}`}>
            {work.status}
          </span>
          <h1>{work.title}</h1>
          <p>
            当前阶段：{work.stage}　·　更新于 {work.updated}
          </p>
        </div>
        <button className="icon-btn" aria-label="收藏这项工作" title="收藏">
          <Star />
        </button>
        <button className="icon-btn" aria-label="更多工作操作" title="更多操作">
          <MoreHorizontal />
        </button>
      </div>
      {linkedTask && (
        <section className="work-program-link">
          <GraduationCap />
          <div>
            <small>关联训练任务</small>
            <b>{program.name} · {linkedTask.module.title}</b>
            <p>{linkedTask.task.title}；完成后的成果和依据会进入成长档案。</p>
          </div>
          <span>{linkedTask.task.kind}</span>
        </section>
      )}
      <div className="work-facts" aria-label="工作当前事实">
        <div>
          <small>当前状态</small>
          <b className={`tone-${work.status === "有风险" ? "red" : work.status === "等待外部" ? "orange" : "green"}`}>
            {work.status}
          </b>
        </div>
        <div>
          <small>当前阶段</small>
          <b>{work.stage}</b>
        </div>
        <div>
          <small>最新成果</small>
          <b>{work.outcome}</b>
        </div>
        <div>
          <small>最后更新</small>
          <b>{work.updated}</b>
        </div>
      </div>
      <section className="detail-alert">
        {complete ? <CheckCircle2 /> : waiting ? <Clock3 /> : <CircleAlert />}
        <div>
          <b>当前情况</b>
          <p>{work.summary}</p>
        </div>
      </section>
      <section
        className={`detail-block ${needsAction ? "attention-block" : complete ? "complete-block" : "state-block"}`}
      >
        {needsAction ? (
          <UserRound />
        ) : complete ? (
          <CheckCircle2 />
        ) : waiting ? (
          <Clock3 />
        ) : (
          <Bot />
        )}
        <div>
          <b>
            {needsAction
              ? "需要你做"
              : complete
                ? "已经完成"
                : waiting
                  ? "正在等待"
                  : "暂时不需要你"}
          </b>
          <p>{userRequest}</p>
          <ul>
            {stateOptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        {needsAction && (
          <button onClick={onResolve}>
            去处理 <ArrowRight />
          </button>
        )}
      </section>
      <section className="detail-block">
        <Zap />
        <div>
          <b>最新成果</b>
          <p>{work.outcome}</p>
        </div>
        <button>
          查看成果 <ArrowRight />
        </button>
      </section>
      <section className="detail-block ai-block">
        <Bot />
        <div>
          <b>{complete ? "成果记录" : waiting ? "等待期间会继续做什么" : "AI 正在继续推进"}</b>
          <ul>
            {guidance.aiProgress.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <span className={`status ${statusTone[work.status]}`}>{work.status}</span>
      </section>
      <section className="detail-actions">
        <button onClick={onEvidence}>查看依据</button>
        {needsAction ? (
          <button className="primary-button" onClick={onResolve}>
            <WandSparkles />
            让 AI 帮我处理
          </button>
        ) : (
          <button className="primary-button" onClick={onEvidence}>
            {complete ? <FileText /> : <ShieldCheck />}
            {complete ? "查看成果记录" : "查看状态依据"}
          </button>
        )}
        <small>
          {needsAction
            ? "AI 会基于现有信息执行，并把结果与依据记录下来"
            : "状态发生变化时，系统会在“今天”提醒你"}
        </small>
      </section>
    </PageFrame>
  );
}

function ActivityPage({
  activities,
  filter,
  onFilter,
}: {
  activities: Activity[];
  filter: string;
  onFilter: (value: string) => void;
}) {
  const visible =
    filter === "全部活动"
      ? activities
      : activities.filter((item) => item.type === filter);
  return (
    <PageFrame>
      <PageHeading title="最近活动" />
      <div className="activity-toolbar">
        <div className="filter-chips">
          {["全部活动", "AI 执行", "你的操作", "外部反馈", "学习活动"].map(
            (item) => (
              <button
                className={filter === item ? "active" : ""}
                key={item}
                onClick={() => onFilter(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>
      </div>
      <div className="timeline">
        {visible.map((item) => (
          <div className="timeline-item" key={item.id}>
            <time>{item.time}</time>
            <span
              className={`timeline-dot ${item.type === "外部反馈" ? "teal" : item.type === "学习活动" ? "orange" : "blue"}`}
            />
            <article>
              <span
                className={`activity-icon ${item.type === "外部反馈" ? "green" : item.type === "学习活动" ? "orange" : "purple"}`}
              >
                {item.type === "外部反馈" ? (
                  <Users />
                ) : item.type === "学习活动" ? (
                  <GraduationCap />
                ) : (
                  <Sparkles />
                )}
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
              <span
                className={`status ${item.type === "外部反馈" ? "info" : item.type === "学习活动" ? "warning" : "success"}`}
              >
                {item.type}
              </span>
              <small>来源：{item.source}</small>
              <button>查看详情</button>
            </article>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}

function GrowthPortfolio({
  tenant,
  program,
  evidence,
  onPractice,
  onReview,
}: {
  tenant: Tenant;
  program: Program;
  evidence: Evidence[];
  onPractice: () => void;
  onReview: () => void;
}) {
  const methodology = getMethodologyForProgram(program);
  const milestone = milestones.find((item) => item.programId === program.id);
  const progress = milestone
    ? milestoneProgress(milestone, evidence.filter((item) => item.programId === program.id))
    : { completed: [], missing: [], isUnlocked: false };
  const currentModule =
    program.modules.find((item) => item.id === program.currentModuleId) ?? program.modules[0];
  const hasWork = evidence.some((item) => item.type === "作品");

  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <AsideCard title="档案可见范围" icon={<ShieldCheck size={18} />}>
            <p>你可以看到全部记录；讲师和机构管理员仅按训练计划授权查看。</p>
            <StatusLine label="所属租户" value={tenant.displayName} />
            <StatusLine label="当前计划" value={program.cohortName} />
          </AsideCard>
          <AsideCard title="证据说明" icon={<FileText size={18} />}>
            <p>成长档案只记录真实作品、过程依据、反馈和评审，不用虚构的能力分数代替成果。</p>
          </AsideCard>
        </div>
      }
    >
      <PageHeading
        eyebrow="PORTFOLIO"
        title="成长档案"
        subtitle="把课程、实操和真实工作形成的证据放在一起，清楚看到已经完成什么。"
      />

      <section className="portfolio-hero">
        <div>
          <span>{program.cohortName}</span>
          <h2>{program.name}</h2>
          <p>当前阶段：{currentModule.title} · {currentModule.summary}</p>
          <div className="portfolio-hero-progress">
            <i><em style={{ width: `${program.progress}%` }} /></i>
            <span>训练计划 {program.progress}%</span>
          </div>
        </div>
        <div className="portfolio-method">
          <small>采用方法</small>
          <b>{methodology.name}</b>
          <p>{methodology.summary}</p>
        </div>
      </section>

      <div className="portfolio-grid">
        <section className="panel evidence-panel">
          <div className="section-head compact">
            <div>
              <h2>成果与证据</h2>
              <p>{evidence.length} 条记录，按最近更新排序</p>
            </div>
            <button className="primary-button" onClick={onPractice}>
              继续实操 <ArrowRight />
            </button>
          </div>
          {evidence.length ? (
            <div className="evidence-list">
              {evidence.map((item) => (
                <article key={item.id}>
                  <span className={`evidence-type type-${item.type}`}>{item.type}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                    <small>{item.source} · {item.createdAt}</small>
                  </div>
                  <div className="evidence-review">
                    <b>{item.reviewStatus}</b>
                    <small>{item.visibleTo.join("、")}可见</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="human-empty-state">
              <FileText />
              <h3>还没有形成成果记录</h3>
              <p>完成一次课程实操后，作品和关键过程会自动保存在这里。</p>
              <button onClick={onPractice}>开始第一次实操</button>
            </div>
          )}
        </section>

        {milestone && (
          <section className={`panel milestone-card ${progress.isUnlocked ? "unlocked" : ""}`}>
            <div className="milestone-icon">
              {progress.isUnlocked ? <Trophy /> : <LockKeyhole />}
            </div>
            <span>当前里程碑</span>
            <h2>{milestone.name}</h2>
            <p>{milestone.description}</p>
            <div className="milestone-requirements">
              {milestone.requiredEvidenceTypes.map((type) => {
                const complete = progress.completed.includes(type);
                return (
                  <div className={complete ? "complete" : ""} key={type}>
                    {complete ? <CheckCircle2 /> : <span />}
                    <b>{type}</b>
                    <small>{complete ? "已具备" : "待补充"}</small>
                  </div>
                );
              })}
            </div>
            {progress.isUnlocked ? (
              <div className="certificate-ready">
                <CheckCircle2 />
                <div>
                  <b>{milestone.certificateName}已解锁</b>
                  <small>所有要求均有可核对的证据</small>
                </div>
              </div>
            ) : (
              <button disabled={!hasWork} onClick={onReview}>
                {hasWork ? "提交讲师评审" : "完成作品后提交评审"}
              </button>
            )}
          </section>
        )}
      </div>

      <section className="panel methodology-path">
        <div className="section-head compact">
          <div>
            <h2>成长路径</h2>
            <p>阶段名称与要求来自租户启用的方法论配置</p>
          </div>
        </div>
        <div>
          {methodology.stages.map((stage, index) => (
            <article className={index < 2 ? "complete" : index === 2 ? "current" : ""} key={stage.id}>
              <i>{index < 2 ? <Check /> : index + 1}</i>
              <b>{stage.name}</b>
              <small>{stage.outcome}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="panel portfolio-sources">
        <div className="section-head compact">
          <div>
            <h2>证据引用的数据来源</h2>
            <p>只展示当前租户已启用且允许 AI 检索的来源</p>
          </div>
        </div>
        <div>
          {knowledgeSourcePolicies
            .filter((source) => tenant.enabledKnowledgeSourceIds.includes(source.id) && source.allowAiRetrieval)
            .map((source) => (
              <article key={source.id}>
                <SourceGlyph kind={source.provider === "飞书" ? "feishu" : source.provider === "ima" ? "ima" : "custom"} />
                <div>
                  <b>{source.name}</b>
                  <small>{source.provider} · {source.version} · {source.classification}</small>
                </div>
                <span>{source.allowExternalCitation ? "可外部引用" : "仅内部引用"}</span>
              </article>
            ))}
        </div>
      </section>
    </PageFrame>
  );
}

function Sources({
  values,
  onToggle,
}: {
  values: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const primaryCards = [
    [
      "feishu",
      "飞书知识库",
      "同步知识空间、团队文档与课程资料，让 AI 基于组织知识回答和推进工作。",
      "首选连接",
    ],
    [
      "ima",
      "ima 知识库",
      "接入个人知识库、网页收藏与学习资料，让 AI 延续你的长期上下文。",
      "首选连接",
    ],
    [
      "custom",
      "自定义知识库",
      "通过文件导入、API 或同步服务，接入 Obsidian、LLM Wiki 等自建内容。",
      "可自建",
    ],
  ] as const;
  const cards = [
    ["wps", "WPS 云文档", "连接常用办公文档，补充方案、表格与汇报资料。", "可选连接"],
    ["files", "文件导入", "手动上传微信文件、PDF、Word 或表格；不会读取本机目录。", "手动导入"],
    [
      "mail",
      "邮件（可选）",
      "通过账号授权读取工作相关邮件，默认只读。",
      "未启用",
    ],
  ] as const;
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <BrandIllustration
            src={knowledgeHubsIllustration}
            alt="知识库与工作数据安全连接到统一工作台"
            compact
          />
          <AsideCard title="授权与信任" icon={<ShieldCheck size={18} />}>
            <CheckText
              title="只连接你明确授权的内容"
              text="网页端不会直接读取本机目录或软件。"
            />
            <CheckText
              title="你拥有绝对控制权"
              text="可随时暂停、删除任何数据源。"
            />
            <CheckText title="可选与最小化" text="只申请当前功能需要的权限。" />
          </AsideCard>
        </div>
      }
    >
      <PageHeading title="数据源" />
      <div className="source-featured-grid">
        {primaryCards.map(([key, name, desc, label]) => (
          <SourceCard
            key={key}
            sourceKey={key}
            name={name}
            description={desc}
            label={label}
            enabled={values[key]}
            featured
            onToggle={() => onToggle(key)}
          />
        ))}
      </div>
      <section className="source-governance-summary">
        <div>
          <ShieldCheck />
          <span>
            <b>谁能使用这些知识？</b>
            <small>连接状态和内容权限是两回事，权限由组织统一配置。</small>
          </span>
        </div>
        <div className="source-policy-chips">
          {knowledgeSourcePolicies.map((source) => (
            <span key={source.id}>
              <b>{source.name}</b>
              <small>{source.classification} · {source.visibleRoles.join("、")}可见 · {source.allowExternalCitation ? "可外部引用" : "仅内部引用"}</small>
            </span>
          ))}
        </div>
      </section>
      <div className="section-head source-secondary-head">
        <div>
          <h2>其他工作数据源</h2>
          <p>按需开启，用来补充项目执行记录</p>
        </div>
      </div>
      <div className="source-grid">
        {cards.map(([key, name, desc, label]) => (
          <SourceCard
            key={key}
            sourceKey={key}
            name={name}
            description={desc}
            label={label}
            enabled={values[key]}
            onToggle={() => onToggle(key)}
          />
        ))}
      </div>
    </PageFrame>
  );
}

function SourceCard({
  sourceKey,
  name,
  description,
  label,
  enabled,
  featured = false,
  onToggle,
}: {
  sourceKey: string;
  name: string;
  description: string;
  label: string;
  enabled: boolean;
  featured?: boolean;
  onToggle: () => void;
}) {
  return (
    <article className={`${featured ? "featured" : ""} source-${sourceKey}`}>
      <div className="source-head">
        <span className={`source-icon ${sourceKey}`}>
          <SourceGlyph kind={sourceKey} />
        </span>
        <span
          className={`status ${enabled ? "success" : featured ? "info" : "neutral"}`}
        >
          {enabled
            ? sourceKey === "custom"
              ? "已创建"
              : sourceKey === "files"
                ? "已导入"
                : "已连接"
            : label}
        </span>
      </div>
      <h3>{name}</h3>
      <p>{description}</p>
      <button className={enabled ? "connected" : ""} onClick={onToggle}>
        {enabled ? (
          <>
            <Check />
            {sourceKey === "custom"
              ? "已创建"
              : sourceKey === "files"
                ? "已导入"
                : "已连接"}
          </>
        ) : sourceKey === "custom" ? (
          "创建"
        ) : sourceKey === "files" ? (
          "导入"
        ) : featured || sourceKey === "wps" ? (
          "连接"
        ) : (
          "开启"
        )}
      </button>
    </article>
  );
}

function SettingsPage({
  onNotify,
  onClearHistory,
  themeMode,
  themeAccent,
  animationsEnabled,
  onThemeMode,
  onThemeAccent,
  onAnimations,
}: {
  onNotify: (title: string, detail: string) => void;
  onClearHistory: () => void;
  themeMode: ThemeMode;
  themeAccent: ThemeAccent;
  animationsEnabled: boolean;
  onThemeMode: (mode: ThemeMode, origin?: { x: number; y: number }) => void;
  onThemeAccent: (
    accent: ThemeAccent,
    origin?: { x: number; y: number },
  ) => void;
  onAnimations: (enabled: boolean) => void;
}) {
  const [toggles, setToggles] = useState({
    attention: true,
    course: true,
    weekly: false,
    knowledge: true,
  });
  const [confirmingClear, setConfirmingClear] = useState(false);
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <AsideCard title="数据由你掌控" icon={<LockKeyhole size={18} />}>
            <p>你可以随时断开知识库、删除导入资料或清除活动记录。</p>
            <button
              className="soft-button"
              onClick={() =>
                onNotify(
                  "隐私与授权",
                  "平台只使用你主动连接或导入的内容，并支持随时撤销。",
                )
              }
            >
              查看隐私说明
            </button>
          </AsideCard>
        </div>
      }
    >
      <PageHeading title="设置" />
      <section className="settings-panel appearance-panel">
        <h2>
          <Palette size={17} />
          外观与动效
        </h2>
        <div className="setting-row">
          <div>
            <b>显示主题</b>
            <p>可跟随设备，也可以固定使用浅色或深色。</p>
          </div>
          <div className="theme-switcher" role="group" aria-label="显示主题">
            {themeModes.map((mode) => (
              <button
                key={mode}
                className={themeMode === mode ? "active" : ""}
                aria-pressed={themeMode === mode}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  onThemeMode(mode, {
                    x: event.clientX || rect.left + rect.width / 2,
                    y: event.clientY || rect.top + rect.height / 2,
                  });
                }}
              >
                {mode === "system" ? (
                  <MonitorCog />
                ) : mode === "dark" ? (
                  <Moon />
                ) : (
                  <Sun />
                )}
                {themeModeLabels[mode]}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <div>
            <b>整套界面配色</b>
            <p>联动页面背景、导航、卡片、边框、主视觉和交互强调；风险、成功等业务色保持稳定。</p>
          </div>
          <div className="accent-switcher" role="group" aria-label="整套界面配色">
            {themeAccents.map((accent) => (
              <button
                key={accent}
                className={`${accent} ${themeAccent === accent ? "active" : ""}`}
                aria-label={themeAccentLabels[accent]}
                aria-pressed={themeAccent === accent}
                title={themeAccentLabels[accent]}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  onThemeAccent(accent, {
                    x: event.clientX || rect.left + rect.width / 2,
                    y: event.clientY || rect.top + rect.height / 2,
                  });
                }}
              >
                <i />
                <span>{themeAccentLabels[accent]}</span>
              </button>
            ))}
          </div>
        </div>
        <SettingToggle
          title="界面动画"
          text="关闭后会停用页面转场、悬浮反馈和主题扩散动画。"
          value={animationsEnabled}
          onChange={() => onAnimations(!animationsEnabled)}
        />
      </section>
      <section className="settings-panel">
        <h2>提醒</h2>
        <SettingToggle
          title="需要你介入时提醒"
          text="只有真正需要确认、补充或决策时通知你。"
          value={toggles.attention}
          onChange={() =>
            setToggles({ ...toggles, attention: !toggles.attention })
          }
        />
        <SettingToggle
          title="课程与开课提醒"
          text="开课前和已预约直播开始前提醒。"
          value={toggles.course}
          onChange={() => setToggles({ ...toggles, course: !toggles.course })}
        />
        <SettingToggle
          title="每周学习与工作总结"
          text="每周一生成上周回顾。"
          value={toggles.weekly}
          onChange={() => setToggles({ ...toggles, weekly: !toggles.weekly })}
        />
      </section>
      <section className="settings-panel">
        <h2>知识库与隐私</h2>
        <SettingToggle
          title="知识库同步"
          text="只同步你主动连接的知识库和导入资料。"
          value={toggles.knowledge}
          onChange={() =>
            setToggles({ ...toggles, knowledge: !toggles.knowledge })
          }
        />
        <div className="setting-row">
          <div>
            <b>清除活动记录</b>
            <p>移除工作与学习活动记录，不会删除知识库原文或课程进度。</p>
          </div>
          {confirmingClear ? (
            <div className="clear-confirm" role="group" aria-label="确认清除活动记录">
              <span>确定清除？</span>
              <button onClick={() => setConfirmingClear(false)}>取消</button>
              <button
                className="danger-outline"
                onClick={() => {
                  onClearHistory();
                  setConfirmingClear(false);
                }}
              >
                确认清除
              </button>
            </div>
          ) : (
            <button
              className="danger-outline"
              onClick={() => setConfirmingClear(true)}
            >
              清除记录
            </button>
          )}
        </div>
      </section>
    </PageFrame>
  );
}

function AdminPage({
  onImport,
  onNotify,
}: {
  onImport: () => void;
  onNotify: (title: string, detail: string) => void;
}) {
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <AsideCard title="本班概览">
            <StatusLine label="学员人数" value="44 人" />
            <StatusLine label="已激活" value="38 人" tone="green" />
            <StatusLine label="待激活" value="6 人" tone="orange" />
            <StatusLine label="平均完课" value="42%" />
          </AsideCard>
          <AsideCard title="需要关注" icon={<CircleAlert size={18} />}>
            <p>8 名学员学习时长明显偏低，3 名学员手机号校验失败。</p>
            <button className="soft-button">查看名单</button>
          </AsideCard>
        </div>
      }
    >
      <PageHeading
        title="AI 设计实战 · 第 5 期"
        subtitle="开班日期 2026-08-17 · 周末班 · 共 44 人"
      />
      <div className="admin-actions">
        <button className="primary-button" onClick={onImport}>
          <Plus />
          批量开户与发放权益
        </button>
        <button
          onClick={() => onNotify("导出任务已创建", "文件生成后会出现在通知中心。")}
        >
          <FileText />
          导出学员名单
        </button>
      </div>
      <div className="admin-stats">
        <StatCard
          label="账号激活率"
          value="86%"
          note="38 / 44 人"
          tone="green"
        />
        <StatCard
          label="首课登录率"
          value="79%"
          note="较上期 +6%"
          tone="blue"
        />
        <StatCard
          label="课程完课率"
          value="42%"
          note="本周 +8%"
          tone="purple"
        />
        <StatCard
          label="工具使用人数"
          value="35"
          note="本周活跃"
          tone="orange"
        />
      </div>
      <section className="panel table-panel">
        <div className="section-head">
          <h2>班级学员</h2>
          <div className="table-search">
            <Search />
            <input placeholder="搜索姓名或手机号" />
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>学员</th>
              <th>手机号</th>
              <th>账号状态</th>
              <th>课程进度</th>
              <th>积分余额</th>
              <th>最近学习</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["王小明", "138****6688", "已激活", "67%", "1,280", "今天 15:10"],
              ["林晓雨", "139****1032", "已激活", "54%", "920", "今天 11:42"],
              ["陈志远", "137****5290", "待激活", "0%", "1,280", "—"],
              ["赵可欣", "136****4407", "已激活", "28%", "760", "昨天 20:13"],
              ["黄文杰", "188****0912", "信息有误", "0%", "—", "—"],
            ].map((row) => (
              <tr key={row[0]}>
                <td>
                  <b>{row[0]}</b>
                </td>
                <td>{row[1]}</td>
                <td>
                  <span
                    className={`status ${row[2] === "已激活" ? "success" : row[2] === "待激活" ? "warning" : "danger"}`}
                  >
                    {row[2]}
                  </span>
                </td>
                <td>
                  <div className="table-progress">
                    <i style={{ width: row[3] }} />
                  </div>
                  {row[3]}
                </td>
                <td>{row[4]}</td>
                <td>{row[5]}</td>
                <td>
                  <button className="text-btn">查看</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageFrame>
  );
}

function OpsPage({
  onNotify,
}: {
  onNotify: (title: string, detail: string) => void;
}) {
  return (
    <PageFrame
      aside={
        <div className="aside-stack">
          <AsideCard title="今日待处理">
            <StatusLine label="课程待审核" value="3 门" tone="orange" />
            <StatusLine label="工具异常" value="1 项" tone="orange" />
            <StatusLine label="对账差异" value="2 条" tone="red" />
          </AsideCard>
          <AsideCard title="系统状态" icon={<ShieldCheck size={18} />}>
            <CheckText title="核心服务正常" text="最近检查：2 分钟前" />
            <CheckText title="昨日对账已完成" text="差异率 0.08%" />
          </AsideCard>
        </div>
      }
    >
      <PageHeading title="运营中心" />
      <div className="admin-stats">
        <StatCard label="在架课程" value="126" note="本周新增 8" tone="green" />
        <StatCard label="可用工具" value="12" note="1 项维护中" tone="blue" />
        <StatCard label="权益包" value="6" note="3 个生效中" tone="purple" />
        <StatCard
          label="昨日积分消耗"
          value="38,620"
          note="较前日 +12%"
          tone="orange"
        />
      </div>
      <div className="ops-grid">
        <OpsPanel
          title="课程上下架"
          rows={[
            ["AI+设计实战", "已上架"],
            ["AI 商业提案进阶", "待审核"],
            ["AI 漫剧从 0 到 1", "已上架"],
          ]}
          onNotify={onNotify}
        />
        <OpsPanel
          title="工具箱条目"
          rows={[
            ["AI 设计", "正常"],
            ["AI 电商", "正常"],
            ["AI 漫剧", "维护中"],
          ]}
          onNotify={onNotify}
        />
        <OpsPanel
          title="权益包"
          rows={[
            ["基础学习包", "生效中"],
            ["AI 设计强化包", "生效中"],
            ["直播陪跑包", "草稿"],
          ]}
          onNotify={onNotify}
        />
        <OpsPanel
          title="对账差异"
          rows={[
            ["AI 设计 · D2608100012", "差异 20"],
            ["AI 电商 · D2608100088", "差异 25"],
            ["昨日账本", "已完成"],
          ]}
          onNotify={onNotify}
        />
      </div>
    </PageFrame>
  );
}

function SmsPage({ onNext }: { onNext: () => void }) {
  return (
    <div className="standalone sms-page">
      <div className="brand standalone-brand">
        <BrandMark />
        <div>
          <b>知行 AI</b>
          <small>学习中心</small>
        </div>
      </div>
      <div className="phone-shell">
        <div className="phone-top">
          <span>20:18</span>
          <span>5G　▰</span>
        </div>
        <h3>信息</h3>
        <div className="message">
          <span className="sender">知行 AI</span>
          <p>
            王小明同学，你已报名 <b>AI+设计实战（第 4 期 · 周末班）</b>。
          </p>
          <p>
            开课时间：8 月 10 日 19:00
            <br />
            上课安排：以开课通知为准
          </p>
          <p>点击下方链接激活学习账号，上课当天可直接登录并使用课堂工具。</p>
          <button onClick={onNext}>
            激活学习账号 <ArrowRight />
          </button>
          <small>今天 20:18</small>
        </div>
      </div>
      <div className="story-caption">
        <span>01</span>
        <div>
          <b>报名完成后，立即成为知行 AI 用户</b>
          <p>课程、积分和课堂工具会一起进入同一个账号。</p>
        </div>
      </div>
    </div>
  );
}

function ActivatePage({ onDone }: { onDone: () => void }) {
  return (
    <div className="standalone activate-page">
      <div className="activate-intro">
        <div className="brand light">
          <BrandMark />
          <div>
            <b>知行 AI</b>
            <small>学习中心</small>
          </div>
        </div>
        <div className="activate-copy">
          <span className="hero-tag">你的课程已准备好</span>
          <h1>
            从一节线下课开始，
            <br />
            开启长期的 AI 学习旅程。
          </h1>
          <p>
            课程、工具和作品都保存在同一个账号里，课上没跟上的，回家可以继续。
          </p>
          <img
            src={learningJourneyIllustration}
            alt="成人学习者通过课程与 AI 工具持续成长"
          />
        </div>
        <div className="activate-benefits">
          <div>
            <BookOpen />
            <span>
              <b>专业课程体系</b>
              <small>循序渐进，学完还能继续复习</small>
            </span>
          </div>
          <div>
            <Grid2X2 />
            <span>
              <b>课堂工具随课用</b>
              <small>上课当堂完成第一件作品</small>
            </span>
          </div>
          <div>
            <WalletCards />
            <span>
              <b>一套积分全站通用</b>
              <small>课程兑换和工具使用共用余额</small>
            </span>
          </div>
        </div>
      </div>
      <div className="activate-form">
        <div>
          <span className="step-label">2 / 2　激活账号</span>
          <h2>欢迎加入知行 AI</h2>
          <p>确认报名信息并设置你的登录密码。</p>
          <label>
            手机号
            <input defaultValue="138 8888 6688" />
          </label>
          <label>
            短信验证码
            <div>
              <input defaultValue="286104" />
              <button>重新获取</button>
            </div>
          </label>
          <label>
            设置密码
            <input type="password" defaultValue="zhixing2026" />
          </label>
          <div className="grant-card">
            <ProductIcon kind="package" />
            <div>
              <b>本次激活将获得</b>
              <p>AI+设计实战 · 基础学习包 · 1,280 积分</p>
            </div>
            <CheckCircle2 />
          </div>
          <label className="agreement">
            <input type="checkbox" defaultChecked />
            我已阅读并同意服务协议与隐私说明
          </label>
          <button className="primary-button wide" onClick={onDone}>
            激活并进入学习首页 <ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}

function SsoPage({
  tool,
  onContinue,
}: {
  tool: string;
  onContinue: () => void;
}) {
  return (
    <div className="standalone sso-page">
      <div className="sso-card">
        <div className="sso-logos">
          <BrandMark />
          <i />
          <ProductIcon kind="ai-design" />
        </div>
        <span className="status success">账号已确认</span>
        <h2>正在以王小明的账号进入 {tool}…</h2>
        <p>你的学习账号在平台内的工具中通用，不需要重新注册或登录。</p>
        <div className="sso-progress">
          <i />
        </div>
        <div className="sso-facts">
          <span>
            <ShieldCheck />
            安全授权
          </span>
          <span>
            <WalletCards />
            积分同步
          </span>
          <span>
            <FolderGit2 />
            作品自动保存
          </span>
        </div>
        <button className="primary-button wide" onClick={onContinue}>
          立即继续 <ArrowRight />
        </button>
      </div>
    </div>
  );
}

function ToolCanvas({
  points,
  generated,
  onGenerate,
  onBack,
}: {
  points: number;
  generated: boolean;
  onGenerate: () => void;
  onBack: () => void;
}) {
  return (
    <div className="tool-app">
      <header>
        <button onClick={onBack}>
          <ArrowLeft />
          返回课堂
        </button>
        <div>
          <ProductIcon kind="ai-design" size="sm" />
          <b>AI 设计</b>
          <small>课堂实操工作区</small>
        </div>
        <div className="tool-lesson-progress" aria-label="课堂练习进度">
          <span><b>课堂练习</b><small>{generated ? "2 / 3" : "1 / 3"}</small></span>
          <i><em style={{ width: generated ? "66%" : "33%" }} /></i>
        </div>
        <span className="tool-user">
          王小明 · 积分 <b>{points.toLocaleString()}</b>
        </span>
      </header>
      <div className="tool-workspace">
        <aside>
          <b>AI 设计</b>
          {["智能生成", "我的作品", "品牌素材", "模板中心"].map((item, i) => (
            <button className={i === 0 ? "active" : ""} key={item}>
              {i === 0 ? (
                <Sparkles />
              ) : i === 1 ? (
                <Grid2X2 />
              ) : i === 2 ? (
                <FolderGit2 />
              ) : (
                <LayoutDashboard />
              )}
              {item}
            </button>
          ))}
          <div className="tool-task-guide">
            <span>当前任务</span>
            <h3>{generated ? "选择最适合商用的一版" : "生成第一版课程海报"}</h3>
            <p>{generated ? "先看信息是否完整，再比较版式。" : "补充主题和风格，完成右侧设置后生成。"}</p>
            <div className="tool-task-steps">
              <div className="done"><i><Check /></i><span><b>确认任务</b><small>已完成</small></span></div>
              <div className={generated ? "done" : "current"}><i>{generated ? <Check /> : 2}</i><span><b>生成第一版</b><small>{generated ? "已完成" : "正在进行"}</small></span></div>
              <div className={generated ? "current" : "locked"}><i>3</i><span><b>保存课堂作品</b><small>{generated ? "下一步" : "完成后解锁"}</small></span></div>
            </div>
            <div className="tool-help-ladder">
              <button><Play /> 看一个完整示例</button>
              <button><Bot /> 让 AI 用人话解释</button>
              <button><MessageCircle /> 联系现场助教</button>
            </div>
          </div>
        </aside>
        <main>
          <div className="canvas-title">
            <div>
              <h2>课程主题海报</h2>
              <p>AI+设计实战 · 第 4 课课堂练习</p>
            </div>
            <span className="status success">自动保存到学习账号</span>
          </div>
          <div className="design-canvas">
            {generated ? (
              <div className="poster-result">
                <span>知行 AI</span>
                <h1>
                  AI 设计
                  <br />
                  实战课堂
                </h1>
                <p>把灵感变成可以交付的作品</p>
                <small>2026 · 线下实战课</small>
              </div>
            ) : (
              <div className="empty-canvas">
                <Sparkles />
                <b>准备生成第一版海报</b>
                <p>完成右侧设置后点击“生成”</p>
              </div>
            )}
          </div>
        </main>
        <section className="generate-panel">
          <h3>生成设置</h3>
          <label>
            海报主题
            <input defaultValue="AI 设计实战课堂" />
          </label>
          <label>
            视觉风格
            <select defaultValue="clean">
              <option value="clean">简洁、现代、专业</option>
            </select>
          </label>
          <label>
            补充要求
            <textarea defaultValue="突出学习与实践，使用绿色品牌色" />
          </label>
          <button className="primary-button wide" onClick={onGenerate}>
            <WandSparkles />
            {generated ? "再生成一版" : "生成海报"}
          </button>
          <small>生成前会清楚告知消耗；每次 20 积分</small>
          <div className="generation-gate">
            <ShieldCheck />
            <div><b>完成当前步后自动解锁下一步</b><p>作品会保存到学习账号，无需手动上传。</p></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RedeemModal({
  course,
  points,
  onClose,
  onConfirm,
}: {
  course: Course;
  points: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div className="modal-icon">
        <BookOpen />
      </div>
      <h2>兑换课程</h2>
      <p>
        《{course.title}》 · {course.lessons} 课时 · {course.teacher}
      </p>
      <div className="calc">
        <span>
          当前积分<b>{points.toLocaleString()}</b>
        </span>
        <span>
          课程所需<b>- {course.cost.toLocaleString()}</b>
        </span>
        <span className="total">
          兑换后余额<b>{Math.max(points - course.cost, 0).toLocaleString()}</b>
        </span>
      </div>
      <small className="modal-note">
        兑换后课程会立即进入“我的课程”，可反复观看。
      </small>
      <div className="modal-actions">
        <button onClick={onClose}>暂不兑换</button>
        <button className="primary-button" onClick={onConfirm}>
          确认兑换
        </button>
      </div>
    </Modal>
  );
}

function CertificateModal({
  onClose,
  onNotify,
}: {
  onClose: () => void;
  onNotify: (title: string, detail: string) => void;
}) {
  return (
    <Modal onClose={onClose} wide>
      <div className="certificate-modal-head">
        <div>
          <span><Trophy /> 已完成</span>
          <h2>结业证书</h2>
          <p>学习成果可以下载、分享，也会长期保留在你的账号中。</p>
        </div>
        <span className="certificate-status"><ShieldCheck /> 可验证</span>
      </div>
      <div className="certificate-preview">
        <div className="certificate-brand">
          <BrandMark size={30} />
          <span>知行 AI 学习中心</span>
        </div>
        <small>CERTIFICATE OF COMPLETION</small>
        <p>特此证明</p>
        <h1>王小明</h1>
        <p>已完成课程</p>
        <h3>《AI 写作与内容增长》</h3>
        <div className="certificate-meta">
          <span><small>完成日期</small><b>2026 年 8 月 8 日</b></span>
          <span><small>课程记录</small><b>10 / 10 课时</b></span>
          <span><small>验证编号</small><b>ZX-26-0808-1042</b></span>
        </div>
        <div className="certificate-seal"><Check /> 100%</div>
      </div>
      <div className="certificate-actions">
        <button
          onClick={() => onNotify("姓名修改", "你可以修改证书姓名，原学习记录不会变更。")}
        >
          修改姓名
        </button>
        <div>
          <button
            onClick={() => onNotify("证书已准备", "PDF 证书已生成，可保存到本地。")}
          >
            <Download /> 下载 PDF
          </button>
          <button
            className="primary-button"
            onClick={() => onNotify("分享卡已生成", "可保存图片后发送到微信或作品集。")}
          >
            <Share2 /> 生成微信分享卡
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EvidenceModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} wide>
      <span className="evidence-pill">
        <ShieldCheck />
        基于以下真实活动判断
      </span>
      <h2>为什么提醒你处理“产品官网改版”？</h2>
      <div className="evidence-list">
        <div>
          <CircleAlert />
          <span>
            <b>当前阶段无法继续</b>
            <p>首页导航结构仍有 4 个模块的优先级未确认。</p>
          </span>
        </div>
        <div>
          <Clock3 />
          <span>
            <b>接近计划时间</b>
            <p>距离计划进入视觉设计阶段还剩 2 天。</p>
          </span>
        </div>
        <div>
          <MessageCircle />
          <span>
            <b>客户有新的反馈</b>
            <p>客户提出希望案例优先于资源展示。</p>
          </span>
        </div>
      </div>
      <div className="source-proof">
        <small>信息来源</small>
        <span>项目文档</span>
        <span>客户反馈</span>
        <span>AI 生成结果</span>
      </div>
      <div className="conclusion">
        <ShieldCheck />
        <div>
          <b>通俗结论</b>
          <p>如果现在不确认，后续视觉设计和内容制作都会延迟。</p>
        </div>
      </div>
      <div className="modal-actions">
        <button onClick={onClose}>知道了</button>
        <button className="primary-button">去处理</button>
      </div>
    </Modal>
  );
}

function ImportModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal onClose={onClose} wide>
      <span className="step-label">批量开户 · 第 3 步</span>
      <h2>确认名单并发放权益</h2>
      <p>已读取 4 条学员记录，请先处理失败项。</p>
      <div className="import-summary">
        <span>
          <b>4</b>导入记录
        </span>
        <span>
          <b>3</b>可开户
        </span>
        <span className="danger-text">
          <b>1</b>信息有误
        </span>
      </div>
      <div className="mini-table">
        <div>
          <b>王小明</b>
          <span>138****6688</span>
          <em>校验通过</em>
        </div>
        <div>
          <b>林晓雨</b>
          <span>139****1032</span>
          <em>校验通过</em>
        </div>
        <div>
          <b>陈志远</b>
          <span>137****5290</span>
          <em>校验通过</em>
        </div>
        <div className="error">
          <b>黄文杰</b>
          <span>188****091</span>
          <em>手机号格式错误</em>
        </div>
      </div>
      <label className="package-select">
        选择权益包
        <select defaultValue="base">
          <option value="base">基础学习包 · 365 天 · 1,280 积分</option>
        </select>
      </label>
      <div className="modal-actions">
        <button onClick={onClose}>返回修改</button>
        <button className="primary-button" onClick={onConfirm}>
          为 3 名学员开户并发放
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  children,
  onClose,
  wide = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="modal-mask"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className={`modal ${wide ? "wide" : ""}`}>
        <button className="modal-close" onClick={onClose} aria-label="关闭弹窗">
          <X />
        </button>
        {children}
      </div>
    </div>
  );
}

function PageFrame({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className={`page-frame ${aside ? "with-aside" : ""}`}>
      <div className="page-primary">{children}</div>
      {aside && <aside className="right-aside">{aside}</aside>}
    </div>
  );
}

function AsideCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="aside-card">
      <h3>
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function StatusLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="status-line">
      <span>{label}</span>
      <b className={tone ? `tone-${tone}` : ""}>{value}</b>
    </div>
  );
}

function FilterRow({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="filter-row">
      <span>{label}</span>
      <div>
        {values.map((value) => (
          <button
            className={selected === value ? "active" : ""}
            onClick={() => onSelect(value)}
            key={value}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckText({ title, text }: { title: string; text: string }) {
  return (
    <div className="check-text">
      <CheckCircle2 />
      <span>
        <b>{title}</b>
        <small>{text}</small>
      </span>
    </div>
  );
}

function SettingToggle({
  title,
  text,
  value,
  onChange,
}: {
  title: string;
  text: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <div className="setting-row">
      <div>
        <b>{title}</b>
        <p>{text}</p>
      </div>
      <button
        className={`switch ${value ? "on" : ""}`}
        onClick={onChange}
        role="switch"
        aria-checked={value}
        aria-label={title}
      >
        <i />
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <small>{label}</small>
      <b>{value}</b>
      <span>{note}</span>
    </article>
  );
}

function OpsPanel({
  title,
  rows,
  onNotify,
}: {
  title: string;
  rows: string[][];
  onNotify: (title: string, detail: string) => void;
}) {
  return (
    <section className="panel ops-panel">
      <div className="section-head compact">
        <h2>{title}</h2>
        <button className="text-btn">查看全部</button>
      </div>
      {rows.map((row) => (
        <div className="ops-row" key={row[0]}>
          <b>{row[0]}</b>
          <span
            className={`status ${row[1].includes("待") || row[1].includes("维护") || row[1].includes("差异") ? "warning" : row[1].includes("草稿") ? "neutral" : "success"}`}
          >
            {row[1]}
          </span>
          <button
            onClick={() => onNotify("操作已记录", `${row[0]} 的状态已更新。`)}
          >
            处理
          </button>
        </div>
      ))}
    </section>
  );
}

export default App;
