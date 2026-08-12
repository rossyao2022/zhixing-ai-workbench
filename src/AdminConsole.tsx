import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleDollarSign,
  ClipboardList,
  Cloud,
  Database,
  FileClock,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Grid2X2,
  KeyRound,
  Layers3,
  LayoutDashboard,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Users,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import { NavGlyph, ProductIcon } from "./ui";
import {
  getProgramForTenant,
  getTenant,
  knowledgeSourcePolicies,
  methodologyPacks,
  programs,
  tenants,
} from "./platformConfig";

type Role = "academy" | "platform";
type Notify = (title: string, detail: string) => void;

type Student = {
  id: string;
  name: string;
  phone: string;
  organization: string;
  className: string;
  status: "正常" | "待激活" | "已冻结" | "信息有误";
  progress: number;
  points: number;
  lastSeen: string;
};

const studentsSeed: Student[] = [
  {
    id: "U2400812",
    name: "王小明",
    phone: "138****6688",
    organization: "当前组织",
    className: "AI 设计 5 期",
    status: "正常",
    progress: 67,
    points: 1280,
    lastSeen: "今天 15:10",
  },
  {
    id: "U2400836",
    name: "林晓雨",
    phone: "139****1032",
    organization: "当前组织",
    className: "AI 设计 5 期",
    status: "正常",
    progress: 54,
    points: 920,
    lastSeen: "今天 11:42",
  },
  {
    id: "U2400881",
    name: "陈志远",
    phone: "137****5290",
    organization: "当前组织",
    className: "AI 设计 5 期",
    status: "待激活",
    progress: 0,
    points: 1280,
    lastSeen: "—",
  },
  {
    id: "U2400914",
    name: "赵可欣",
    phone: "136****4407",
    organization: "当前组织",
    className: "AI 电商 3 期",
    status: "正常",
    progress: 28,
    points: 760,
    lastSeen: "昨天 20:13",
  },
  {
    id: "U2400942",
    name: "黄文杰",
    phone: "188****0912",
    organization: "当前组织",
    className: "AI 电商 3 期",
    status: "信息有误",
    progress: 0,
    points: 0,
    lastSeen: "—",
  },
  {
    id: "U2401030",
    name: "许清禾",
    phone: "135****7821",
    organization: "其他组织",
    className: "AI 漫剧 2 期",
    status: "已冻结",
    progress: 42,
    points: 380,
    lastSeen: "08-03 18:22",
  },
];

const coursesSeed = [
  {
    id: "C001",
    title: "AI+设计实战",
    category: "AI+设计",
    lessons: 12,
    learners: 6820,
    completion: 46,
    status: "已上架",
    updated: "今天 10:20",
  },
  {
    id: "C002",
    title: "AI 电商视觉实战",
    category: "AI+电商",
    lessons: 18,
    learners: 2340,
    completion: 31,
    status: "已上架",
    updated: "昨天 17:40",
  },
  {
    id: "C003",
    title: "AI 漫剧从 0 到 1",
    category: "AI+漫剧",
    lessons: 16,
    learners: 1680,
    completion: 38,
    status: "已上架",
    updated: "08-08 14:05",
  },
  {
    id: "C004",
    title: "AI 商业提案进阶",
    category: "职场",
    lessons: 14,
    learners: 0,
    completion: 0,
    status: "待审核",
    updated: "08-09 09:32",
  },
  {
    id: "C005",
    title: "高效学习习惯养成课",
    category: "通识",
    lessons: 8,
    learners: 9240,
    completion: 64,
    status: "已下架",
    updated: "08-01 11:16",
  },
];

const toolSeed = [
  {
    id: "T01",
    name: "AI 设计",
    short: "设",
    color: "purple",
    status: "正常",
    users: 3580,
    calls: "8.6 万",
    cost: 20,
    scope: "基础学习包",
  },
  {
    id: "T02",
    name: "AI 电商",
    short: "商",
    color: "orange",
    status: "正常",
    users: 1942,
    calls: "3.2 万",
    cost: 25,
    scope: "电商学习包",
  },
  {
    id: "T03",
    name: "AI 漫剧",
    short: "剧",
    color: "blue",
    status: "维护中",
    users: 816,
    calls: "1.4 万",
    cost: 30,
    scope: "漫剧学习包",
  },
  {
    id: "T04",
    name: "AI 写作",
    short: "写",
    color: "green",
    status: "正常",
    users: 4250,
    calls: "12.8 万",
    cost: 15,
    scope: "基础学习包",
  },
];

const navByRole = {
  academy: [
    ["overview", "组织概览"],
    ["programs", "训练计划"],
    ["reviews", "成果评审"],
    ["students", "学员管理"],
    ["classes", "班级管理"],
    ["instructors", "讲师工作台"],
    ["batch", "批量开户"],
    ["usage", "学习与用量"],
    ["logs", "操作日志"],
  ],
  platform: [
    ["overview", "经营概览"],
    ["tenants", "租户与品牌"],
    ["methodologies", "方法论配置"],
    ["knowledge", "知识治理"],
    ["organization", "用户与组织"],
    ["courses", "课程管理"],
    ["tools", "工具管理"],
    ["rights", "权益包"],
    ["ledger", "积分账本"],
    ["reconcile", "对账中心"],
    ["permissions", "角色权限"],
    ["logs", "操作日志"],
  ],
} as const;

const titles: Record<string, string> = {
  overview: "运营总览",
  students: "学员管理",
  classes: "班级管理",
  batch: "批量开户",
  usage: "学习与工具用量",
  organization: "用户与组织",
  courses: "课程管理",
  tools: "工具管理",
  rights: "权益包管理",
  ledger: "积分账本",
  reconcile: "对账中心",
  permissions: "角色与权限",
  logs: "操作日志",
  programs: "训练计划",
  reviews: "成果评审",
  instructors: "讲师工作台",
  tenants: "租户与品牌",
  methodologies: "方法论配置",
  knowledge: "知识治理",
};

export default function AdminConsole({
  role,
  onNotify,
  tenantId,
  onTenantPreview,
}: {
  role: Role;
  onNotify: Notify;
  tenantId: string;
  onTenantPreview: (tenantId: string) => void;
}) {
  const [section, setSection] = useState("overview");
  const [students, setStudents] = useState(studentsSeed);
  const [courses, setCourses] = useState(coursesSeed);
  const [tools, setTools] = useState(toolSeed);
  const [dialog, setDialog] = useState<"batch" | "course" | "adjust" | null>(
    null,
  );
  const [student, setStudent] = useState<Student | null>(null);
  const activeTenant = getTenant(tenantId);

  useEffect(() => setSection("overview"), [role]);

  const nav = navByRole[role];
  const title =
    section === "overview"
      ? role === "academy"
        ? "组织概览"
        : "平台概览"
      : (titles[section] ?? titles.overview);
  const canExport = [
    "students",
    "classes",
    "usage",
    "organization",
    "courses",
    "ledger",
    "reconcile",
    "logs",
  ].includes(section);

  function toggleStudent(target: Student) {
    const next = target.status === "已冻结" ? "正常" : "已冻结";
    setStudents((items) =>
      items.map((item) =>
        item.id === target.id ? { ...item, status: next } : item,
      ),
    );
    setStudent((current) =>
      current?.id === target.id ? { ...current, status: next } : current,
    );
    onNotify(
      next === "已冻结" ? "账号已冻结" : "账号已解冻",
      `${target.name} 的账号状态已更新，操作已写入日志。`,
    );
  }

  function toggleCourse(id: string) {
    setCourses((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "已上架" ? "已下架" : "已上架" }
          : item,
      ),
    );
    onNotify("课程状态已更新", "新的上架状态已立即生效，并记录操作日志。");
  }

  function toggleTool(id: string) {
    setTools((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "正常" ? "维护中" : "正常" }
          : item,
      ),
    );
    onNotify("工具状态已更新", "学员端会同步显示最新可用状态。");
  }

  return (
    <div className="backend-shell">
      <aside className="backend-nav">
        <div className="backend-nav-head">
          <span className="console-mark">
            <NavGlyph name={role === "academy" ? "organization" : "overview"} />
          </span>
          <div>
            <b>{role === "academy" ? "机构管理台" : "平台运营台"}</b>
            <small>{role === "academy" ? activeTenant.displayName : "知行 AI 全局"}</small>
          </div>
        </div>
        <nav>
          {nav.map(([key, label]) => (
            <button
              key={key}
              className={section === key ? "active" : ""}
              aria-label={label}
              title={label}
              onClick={() => setSection(key)}
            >
              <NavGlyph name={key} />
              <span>{label}</span>
              {key === "reconcile" && <i>2</i>}
            </button>
          ))}
        </nav>
        <div className="backend-scope">
          <span>
            <ShieldCheck />
          </span>
          <div>
            <b>数据范围</b>
            <small>{role === "academy" ? `仅${activeTenant.displayName}` : "全部租户"}</small>
          </div>
          <ChevronDown />
        </div>
      </aside>
      <section className="backend-content">
        <header className="backend-page-head">
          <h1>{title}</h1>
          <div className="backend-head-actions">
            {canExport && (
              <button
                onClick={() =>
                  onNotify("导出任务已创建", "文件生成后会出现在通知中心。")
                }
              >
                <FileSpreadsheet />
                导出
              </button>
            )}
            {section === "students" && (
              <button className="primary" onClick={() => setDialog("batch")}>
                <Plus />
                批量开户
              </button>
            )}
            {section === "courses" && (
              <button className="primary" onClick={() => setDialog("course")}>
                <Plus />
                新建课程
              </button>
            )}
            {section === "ledger" && (
              <button className="primary" onClick={() => setDialog("adjust")}>
                <Plus />
                人工调账
              </button>
            )}
          </div>
        </header>
        {section === "overview" && (
          <Overview role={role} onSection={setSection} />
        )}
        {section === "programs" && <ProgramsPage tenantId={tenantId} onNotify={onNotify} />}
        {section === "reviews" && <ReviewsPage onNotify={onNotify} />}
        {section === "instructors" && <InstructorPage />}
        {section === "tenants" && <TenantsPage activeTenantId={tenantId} onNotify={onNotify} onPreview={onTenantPreview} />}
        {section === "methodologies" && <MethodologiesPage onNotify={onNotify} />}
        {section === "knowledge" && <KnowledgeGovernancePage onNotify={onNotify} />}
        {section === "students" && (
          <StudentsPage
            students={students.filter(
              (item) => item.organization === "当前组织",
            )}
            onOpen={setStudent}
            onToggle={toggleStudent}
          />
        )}
        {section === "classes" && <ClassesPage onNotify={onNotify} />}
        {section === "batch" && (
          <BatchPage onStart={() => setDialog("batch")} />
        )}
        {section === "usage" && <UsagePage />}
        {section === "organization" && <OrganizationPage />}
        {section === "courses" && (
          <CoursesPage courses={courses} onToggle={toggleCourse} />
        )}
        {section === "tools" && (
          <ToolsPage tools={tools} onToggle={toggleTool} />
        )}
        {section === "rights" && <RightsPage onNotify={onNotify} />}
        {section === "ledger" && <LedgerPage />}
        {section === "reconcile" && <ReconcilePage onNotify={onNotify} />}
        {section === "permissions" && <PermissionsPage />}
        {section === "logs" && <LogsPage role={role} />}
      </section>
      {student && (
        <StudentDrawer
          student={student}
          onClose={() => setStudent(null)}
          onToggle={() => toggleStudent(student)}
          onAdjust={() => {
            setStudent(null);
            setDialog("adjust");
          }}
        />
      )}
      {dialog && (
        <BackendDialog
          type={dialog}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            onNotify(
              dialog === "batch"
                ? "开户任务已创建"
                : dialog === "course"
                  ? "课程草稿已创建"
                  : "余额调整已完成",
              "操作结果与详细原因已写入后台操作日志。",
            );
          }}
        />
      )}
    </div>
  );
}

function Overview({
  role,
  onSection,
}: {
  role: Role;
  onSection: (section: string) => void;
}) {
  const academy = role === "academy";
  const stats = academy
    ? [
        ["本组织学员", "8,642", "本月新增 326", "green"],
        ["账号激活率", "86.4%", "较上月 +4.2%", "blue"],
        ["本周学习人数", "2,816", "活跃率 32.6%", "purple"],
        ["工具消耗", "18.6 万", "积分 · 本周", "orange"],
      ]
    : [
        ["平台注册用户", "186,420", "本月新增 7,284", "green"],
        ["昨日活跃", "21,680", "活跃率 11.6%", "blue"],
        ["在架课程", "126", "待审核 3 门", "purple"],
        ["昨日积分消耗", "38.6 万", "差异率 0.08%", "orange"],
      ];
  return (
    <>
      <div className="backend-stats">
        {stats.map(([label, value, note, tone]) => (
          <article className={tone} key={label}>
            <span>{label}</span>
            <b>{value}</b>
            <small>{note}</small>
            <i>
              <ArrowRight />
            </i>
          </article>
        ))}
      </div>
      <div className="backend-dashboard-grid">
        <section className="backend-panel trend-panel">
          <PanelHead
            title={academy ? "近 7 日学习活跃" : "近 7 日平台活跃"}
            sub="单位：人"
            action="查看明细"
          />
          <div className="trend-chart">
            <div className="trend-y">
              <span>30k</span>
              <span>20k</span>
              <span>10k</span>
              <span>0</span>
            </div>
            <div className="trend-bars">
              {[42, 55, 48, 68, 64, 78, 86].map((height, index) => (
                <div key={index}>
                  <i style={{ height: `${height}%` }} />
                  <span>
                    {
                      ["周二", "周三", "周四", "周五", "周六", "周日", "今天"][
                        index
                      ]
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="backend-panel todo-panel">
          <PanelHead title="需要处理" sub="按影响程度排序" />
          <Todo
            tone="red"
            title="2 条对账差异"
            text="外部工具上报与平台账本不一致"
            onClick={() => onSection("reconcile")}
          />
          <Todo
            tone="orange"
            title={academy ? "6 名学员待激活" : "3 门课程待审核"}
            text={
              academy ? "报名超过 24 小时仍未激活" : "内容与版权信息等待确认"
            }
            onClick={() => onSection(academy ? "students" : "courses")}
          />
          <Todo
            tone="blue"
            title="1 项工具维护中"
            text="AI 漫剧预计今天 18:00 恢复"
            onClick={() => onSection("tools")}
          />
        </section>
        <section className="backend-panel">
          <PanelHead title={academy ? "学习转化" : "用户增长漏斗"} sub="本月" />
          <div className="funnel">
            <div>
              <span>已开户</span>
              <b>{academy ? "1,286" : "7,284"}</b>
              <i style={{ width: "100%" }} />
            </div>
            <div>
              <span>已激活</span>
              <b>{academy ? "1,111" : "6,312"}</b>
              <i style={{ width: "86%" }} />
            </div>
            <div>
              <span>开始学习</span>
              <b>{academy ? "904" : "4,980"}</b>
              <i style={{ width: "68%" }} />
            </div>
            <div>
              <span>使用工具</span>
              <b>{academy ? "726" : "3,842"}</b>
              <i style={{ width: "53%" }} />
            </div>
          </div>
        </section>
        <section className="backend-panel">
          <PanelHead
            title={academy ? "热门课程" : "组织活跃排行"}
            sub="近 7 日"
            action="查看全部"
          />
          <div className="ranking">
            {(academy
              ? [
                  ["AI+设计实战", "1,862"],
                  ["AI 电商视觉实战", "1,240"],
                  ["AI 漫剧从 0 到 1", "886"],
                  ["AI 写作与内容增长", "724"],
                ]
              : [
                  ["总部", "3,826"],
                  ["分部 A", "2,940"],
                  ["分部 B", "2,164"],
                  ["分部 C", "1,980"],
                ]
            ).map((item, index) => (
              <div key={item[0]}>
                <em>{index + 1}</em>
                <span>{item[0]}</span>
                <b>{item[1]} 人</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function ProgramsPage({ tenantId, onNotify }: { tenantId: string; onNotify: Notify }) {
  const tenant = getTenant(tenantId);
  const tenantPrograms = programs.filter((program) => program.tenantId === tenantId);
  return (
    <div className="governance-stack">
      <section className="backend-context-banner">
        <div><GraduationCap /><span><small>当前组织</small><b>{tenant.displayName}</b></span></div>
        <p>训练计划把课程、实操任务、评审要求和里程碑串成一条可追踪的成长路径。</p>
        <button className="primary" onClick={() => onNotify("训练计划草稿已创建", "下一步配置模块、任务和证据要求。")}>新建训练计划</button>
      </section>
      {tenantPrograms.map((program) => (
        <section className="backend-panel program-config-card" key={program.id}>
          <div className="program-config-head">
            <div><span>进行中</span><h2>{program.name}</h2><p>{program.cohortName}</p></div>
            <button onClick={() => onNotify("已进入配置", "可调整模块、解锁条件与里程碑要求。")}>配置计划</button>
          </div>
          <div className="program-config-modules">
            {program.modules.map((module, index) => (
              <article className={module.status === "进行中" ? "active" : ""} key={module.id}>
                <i>{index + 1}</i><div><b>{module.title}</b><small>{module.tasks.length} 个任务 · {module.status}</small></div>
              </article>
            ))}
          </div>
          <div className="config-summary-row">
            <span><ClipboardList /> 实操任务 <b>{program.modules.flatMap((item) => item.tasks).filter((task) => task.kind === "实操").length}</b></span>
            <span><ShieldCheck /> 证据要求 <b>{program.modules.flatMap((item) => item.tasks).filter((task) => task.evidenceRequirement).length}</b></span>
            <span><PackageCheck /> 里程碑 <b>1</b></span>
          </div>
        </section>
      ))}
    </div>
  );
}

function ReviewsPage({ onNotify }: { onNotify: Notify }) {
  const rows = [
    ["王小明", "课程主题海报 · 第一版", "AI 创作与工作提效训练营", "作品 + 过程记录", "待评审"],
    ["林晓雨", "客户需求说明改进记录", "AI 创作与工作提效训练营", "过程记录 + 反馈", "需补充"],
    ["赵可欣", "电商活动主视觉", "AI 电商实战营", "作品 + 评审", "已通过"],
  ];
  return (
    <section className="backend-panel data-panel">
      <div className="review-summary">
        <div><span>待评审</span><b>8</b></div><div><span>需补充</span><b>3</b></div><div><span>本周已完成</span><b>24</b></div>
      </div>
      <table className="backend-table"><thead><tr><th>学员</th><th>成果</th><th>训练计划</th><th>证据</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row[0]}><td><b>{row[0]}</b></td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td><Status text={row[4]} /></td><td><button className="link-button" onClick={() => onNotify("评审已打开", "可以查看作品、过程记录和引用来源后给出结论。")}>查看证据</button></td></tr>)}</tbody>
      </table>
    </section>
  );
}

function InstructorPage() {
  return (
    <div className="instructor-grid">
      <section className="backend-panel instructor-focus"><span>今天最需要处理</span><h2>8 份成果等待评审</h2><p>其中 3 份会影响学员本周里程碑，建议优先处理。</p><button className="primary">开始评审</button></section>
      <section className="backend-panel"><PanelHead title="需要帮助的学员" sub="根据停滞与求助记录" />{[["林晓雨","实操停滞 2 天"],["陈志远","账号尚未激活"],["许清禾","证据连续两次需补充"]].map((item)=><div className="attention-person" key={item[0]}><span>{item[0].slice(0,1)}</span><div><b>{item[0]}</b><small>{item[1]}</small></div><button>查看</button></div>)}</section>
      <section className="backend-panel teaching-attention"><PanelHead title="教学 Attention" sub="只显示需要介入的事项" /><Todo tone="orange" title="模块 2 完成率偏低" text="当前班级有 11 人停在第一次实操" onClick={() => undefined} /><Todo tone="blue" title="明天进行阶段复盘" text="已整理常见问题和代表作品" onClick={() => undefined} /></section>
    </div>
  );
}

function TenantsPage({ activeTenantId, onNotify, onPreview }: { activeTenantId: string; onNotify: Notify; onPreview: (tenantId: string) => void }) {
  return (
    <div className="governance-stack">
      <section className="backend-context-banner">
        <div><Building2 /><span><small>平台租户</small><b>{tenants.length} 个示例配置</b></span></div>
        <p>品牌、方法论、训练计划和知识权限均由租户配置注入，组件不依赖机构名称。</p>
        <button className="primary" onClick={() => onNotify("租户向导已打开", "从品牌、角色与数据范围开始配置。")}>新建租户</button>
      </section>
      <div className="tenant-config-grid">
        {tenants.map((tenant) => {
          const program = getProgramForTenant(tenant.id);
          return <article className={`backend-panel tenant-config-card ${tenant.id === activeTenantId ? "active" : ""}`} key={tenant.id}>
            <div className={`tenant-brand-preview accent-${tenant.accent}`}><span>{tenant.shortName.slice(0,1)}</span><div><b>{tenant.platformName}</b><small>{tenant.brandTagline}</small></div></div>
            <div className="tenant-config-body"><span>{tenant.id === activeTenantId ? "当前示例租户" : "切换验证租户"}</span><h2>{tenant.displayName}</h2><p>训练计划：{program.name}</p><div><small>{tenant.enabledMethodologyPackIds.length} 套方法论</small><small>{tenant.enabledKnowledgeSourceIds.length} 个知识源</small></div></div>
            <button onClick={() => { onPreview(tenant.id); onNotify("已切换租户预览", `${tenant.displayName} 的品牌、训练计划和知识权限已生效。`); }}>{tenant.id === activeTenantId ? "正在预览" : "切换预览"} <ArrowRight /></button>
          </article>;
        })}
      </div>
    </div>
  );
}

function MethodologiesPage({ onNotify }: { onNotify: Notify }) {
  return (
    <div className="methodology-admin-grid">
      {methodologyPacks.map((pack) => <section className="backend-panel methodology-admin-card" key={pack.id}>
        <div className="methodology-admin-head"><span><Layers3 /></span><div><h2>{pack.name}</h2><p>{pack.summary}</p></div><button onClick={() => onNotify("方法论配置已打开", "阶段名称、完成条件和适用训练计划均可调整。")}>编辑</button></div>
        <div className="methodology-stage-list">{pack.stages.map((stage,index)=><article key={stage.id}><i>{index+1}</i><div><b>{stage.name}</b><small>{stage.outcome}</small></div></article>)}</div>
      </section>)}
    </div>
  );
}

function KnowledgeGovernancePage({ onNotify }: { onNotify: Notify }) {
  return (
    <section className="backend-panel data-panel knowledge-governance">
      <div className="knowledge-policy-note"><ShieldCheck /><div><b>检索与引用分开控制</b><p>允许 AI 检索不等于允许对外引用；回答仍需展示证据名称与可访问范围。</p></div><button className="primary" onClick={() => onNotify("知识源向导已打开", "请选择飞书知识库、ima 知识库或自定义知识库。")}>接入知识源</button></div>
      <table className="backend-table"><thead><tr><th>知识源</th><th>分级</th><th>可见角色</th><th>AI 检索</th><th>外部引用</th><th>责任人与版本</th><th>操作</th></tr></thead>
        <tbody>{knowledgeSourcePolicies.map((source)=><tr key={source.id}><td><div className="knowledge-source-cell"><Database /><div><b>{source.name}</b><small>{source.provider} · {source.updatedAt}</small></div></div></td><td><Status text={source.classification} /></td><td>{source.visibleRoles.join("、")}</td><td>{source.allowAiRetrieval ? "允许" : "关闭"}</td><td>{source.allowExternalCitation ? "允许" : "仅内部"}</td><td>{source.owner}<br/><small>{source.version}</small></td><td><button className="link-button" onClick={() => onNotify("权限规则已打开", "修改会生成新版本并记录操作者。")}>配置权限</button></td></tr>)}</tbody>
      </table>
    </section>
  );
}

function StudentsPage({
  students,
  onOpen,
  onToggle,
}: {
  students: Student[];
  onOpen: (student: Student) => void;
  onToggle: (student: Student) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () =>
      students.filter(
        (item) => item.name.includes(query) || item.phone.includes(query),
      ),
    [students, query],
  );
  return (
    <section className="backend-panel data-panel">
      <DataToolbar
        query={query}
        onQuery={setQuery}
        filters={["全部班级", "全部状态"]}
      />
      <table className="backend-table">
        <thead>
          <tr>
            <th>学员</th>
            <th>班级</th>
            <th>账号状态</th>
            <th>课程进度</th>
            <th>积分余额</th>
            <th>最近学习</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="person-cell">
                  <span>{item.name.slice(0, 1)}</span>
                  <div>
                    <b>{item.name}</b>
                    <small>
                      {item.phone} · {item.id}
                    </small>
                  </div>
                </div>
              </td>
              <td>{item.className}</td>
              <td>
                <Status text={item.status} />
              </td>
              <td>
                <div className="progress-cell">
                  <i>
                    <span style={{ width: `${item.progress}%` }} />
                  </i>
                  <b>{item.progress}%</b>
                </div>
              </td>
              <td>{item.points.toLocaleString()}</td>
              <td>{item.lastSeen}</td>
              <td>
                <div className="row-actions">
                  <button onClick={() => onOpen(item)}>查看</button>
                  <button onClick={() => onToggle(item)}>
                    {item.status === "已冻结" ? "解冻" : "冻结"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <TableFooter count={visible.length} />
    </section>
  );
}

function ClassesPage({ onNotify }: { onNotify: Notify }) {
  const rows = [
    ["AI 设计 5 期", "2026-08-17", "李老师", "44", "38", "42%", "进行中"],
    ["AI 电商 3 期", "2026-08-03", "周老师", "51", "49", "36%", "进行中"],
    ["AI 漫剧 2 期", "2026-07-12", "陈老师", "38", "38", "71%", "即将结课"],
    ["AI 设计 4 期", "2026-06-08", "李老师", "46", "46", "86%", "已结课"],
  ];
  return (
    <>
      <div className="backend-inline-actions">
        <div className="summary-pills">
          <span>
            本组织班级 <b>24</b>
          </span>
          <span>
            进行中 <b>8</b>
          </span>
          <span>
            本周开课 <b>3</b>
          </span>
        </div>
        <button
          className="primary"
          onClick={() =>
            onNotify("班级草稿已创建", "请继续补充课程、讲师与上课安排。")
          }
        >
          <Plus />
          新建班级
        </button>
      </div>
      <section className="backend-panel data-panel">
        <DataToolbar filters={["全部课程", "全部状态", "开课时间"]} />
        <table className="backend-table">
          <thead>
            <tr>
              <th>班级</th>
              <th>开课时间</th>
              <th>讲师</th>
              <th>学员</th>
              <th>已激活</th>
              <th>平均进度</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                <td>
                  <b>{row[0]}</b>
                </td>
                {row.slice(1, 6).map((cell, index) => (
                  <td key={`${row[0]}-${index}`}>{cell}</td>
                ))}
                <td>
                  <Status text={row[6]} />
                </td>
                <td>
                  <button className="link-button">管理班级</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function BatchPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="batch-layout">
      <section className="backend-panel batch-start">
        <div className="batch-steps">
          <span className="active">
            <b>1</b>上传名单
          </span>
          <i />
          <span>
            <b>2</b>校验数据
          </span>
          <i />
          <span>
            <b>3</b>发放权益
          </span>
          <i />
          <span>
            <b>4</b>完成
          </span>
        </div>
        <div className="upload-zone">
          <FileSpreadsheet />
          <h2>上传学员报名名单</h2>
          <p>支持 Excel 或 CSV，系统会自动校验手机号、重复账号和班级信息。</p>
          <button className="primary" onClick={onStart}>
            选择文件并继续
          </button>
          <small>单次最多 5,000 条 · 文件不超过 20 MB</small>
        </div>
        <div className="template-line">
          <div>
            <FileSpreadsheet />
            <span>
              <b>还没有标准名单？</b>
              <small>下载模板后按示例填写</small>
            </span>
          </div>
          <button>下载导入模板</button>
        </div>
      </section>
      <section className="backend-panel batch-history">
        <PanelHead title="最近导入任务" />
        <div className="history-item">
          <CheckCircle2 />
          <div>
            <b>AI 设计 5 期报名名单.xlsx</b>
            <small>今天 10:20 · 王老师</small>
          </div>
          <span>成功 43 / 失败 1</span>
          <button>查看结果</button>
        </div>
        <div className="history-item">
          <CheckCircle2 />
          <div>
            <b>AI 电商 3 期补录.csv</b>
            <small>08-08 16:42 · 林教务</small>
          </div>
          <span>成功 8 / 失败 0</span>
          <button>查看结果</button>
        </div>
      </section>
    </div>
  );
}

function UsagePage() {
  return (
    <>
      <div className="backend-stats small">
        <article className="green">
          <span>本周学习人数</span>
          <b>2,816</b>
          <small>较上周 +12.4%</small>
        </article>
        <article className="blue">
          <span>人均学习时长</span>
          <b>2h 18m</b>
          <small>较上周 +16m</small>
        </article>
        <article className="purple">
          <span>课程平均完课</span>
          <b>42.6%</b>
          <small>行业目标 50%</small>
        </article>
        <article className="orange">
          <span>工具调用次数</span>
          <b>8,642</b>
          <small>消耗 18.6 万积分</small>
        </article>
      </div>
      <div className="backend-dashboard-grid">
        <section className="backend-panel trend-panel">
          <PanelHead title="学习活跃趋势" sub="最近 14 天" />
          <div className="trend-chart tall">
            <div className="trend-y">
              <span>600</span>
              <span>400</span>
              <span>200</span>
              <span>0</span>
            </div>
            <div className="trend-bars">
              {[38, 46, 42, 55, 63, 52, 70, 64, 68, 74, 62, 80, 76, 88].map(
                (height, index) => (
                  <div key={index}>
                    <i style={{ height: `${height}%` }} />
                    <span>{index % 2 ? "" : `${index + 1}日`}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
        <section className="backend-panel">
          <PanelHead title="工具使用构成" sub="本周" />
          <div className="donut-wrap">
            <div className="donut">
              <span>
                8,642<small>总调用</small>
              </span>
            </div>
            <div className="legend">
              <span>
                <i className="purple" />
                AI 设计 <b>42%</b>
              </span>
              <span>
                <i className="orange" />
                AI 电商 <b>26%</b>
              </span>
              <span>
                <i className="blue" />
                AI 漫剧 <b>12%</b>
              </span>
              <span>
                <i className="green" />
                其他工具 <b>20%</b>
              </span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function OrganizationPage() {
  const organizations = [
    ["总部", "8,642", "12", "86.4%", "正常"],
    ["分部 A", "6,318", "9", "82.1%", "正常"],
    ["分部 B", "5,240", "8", "78.6%", "正常"],
    ["分部 C", "4,980", "7", "80.2%", "正常"],
    ["分部 D", "3,126", "5", "69.4%", "需关注"],
  ];
  return (
    <div className="org-layout">
      <section className="backend-panel org-tree">
        <PanelHead title="组织结构" action="新增组织" />
        <div className="org-count">
          <b>52</b>
          <span>个组织单元</span>
        </div>
        <div className="org-tree-body">
          <div className="org-structure">
            <button className="active">
              <Building2 />
              当前客户组织 <b>186,420</b>
            </button>
            <div className="org-branches">
              <button>
                <span />
                总部
              </button>
              <button>
                <span />
                分部 A
              </button>
              <button>
                <span />
                分部 B
              </button>
              <button>
                <span />
                分部 C
              </button>
              <button>
                <span />
                更多组织单元
              </button>
            </div>
          </div>
          <div className="org-users">
            <h4>用户组</h4>
            <button>
              <Users />
              学习用户 <b>164,820</b>
            </button>
            <button>
              <Users />
              成长用户 <b>20,680</b>
            </button>
            <button>
              <Users />
              内部账号 <b>920</b>
            </button>
          </div>
        </div>
      </section>
      <section className="backend-panel data-panel org-data-panel">
        <PanelHead title="组织单元" />
        <table className="backend-table">
          <thead>
            <tr>
              <th>组织单元</th>
              <th>学员数</th>
              <th>管理员</th>
              <th>激活率</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((row) => (
              <tr key={row[0]}>
                <td>
                  <b>{row[0]}</b>
                </td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
                <td>
                  <Status text={row[4]} />
                </td>
                <td>
                  <button className="link-button">配置范围</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function CoursesPage({
  courses,
  onToggle,
}: {
  courses: typeof coursesSeed;
  onToggle: (id: string) => void;
}) {
  return (
    <section className="backend-panel data-panel">
      <DataToolbar filters={["全部分类", "全部状态", "全部讲师"]} />
      <table className="backend-table">
        <thead>
          <tr>
            <th>课程</th>
            <th>分类</th>
            <th>课时</th>
            <th>学习人数</th>
            <th>完课率</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="course-admin-cell">
                  <span>
                    <BookOpen />
                  </span>
                  <div>
                    <b>{item.title}</b>
                    <small>{item.id}</small>
                  </div>
                </div>
              </td>
              <td>{item.category}</td>
              <td>{item.lessons}</td>
              <td>{item.learners.toLocaleString()}</td>
              <td>{item.completion}%</td>
              <td>
                <Status text={item.status} />
              </td>
              <td>{item.updated}</td>
              <td>
                <div className="row-actions">
                  <button>编辑</button>
                  <button onClick={() => onToggle(item.id)}>
                    {item.status === "已上架" ? "下架" : "上架"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <TableFooter count={courses.length} />
    </section>
  );
}

function ToolsPage({
  tools,
  onToggle,
}: {
  tools: typeof toolSeed;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <div className="tool-admin-grid">
        {tools.map((tool) => (
          <article className="backend-panel tool-admin-card" key={tool.id}>
            <div className="tool-admin-head">
              <ProductIcon kind={tool.name} tone={tool.color} />
              <div>
                <h3>{tool.name}</h3>
                <small>{tool.id} · 第三方接入</small>
              </div>
              <Status text={tool.status} />
            </div>
            <div className="tool-admin-metrics">
              <span>
                <small>本周用户</small>
                <b>{tool.users.toLocaleString()}</b>
              </span>
              <span>
                <small>本周调用</small>
                <b>{tool.calls}</b>
              </span>
              <span>
                <small>单次消耗</small>
                <b>{tool.cost} 积分</b>
              </span>
            </div>
            <div className="tool-admin-scope">
              <small>可用权益</small>
              <b>{tool.scope}</b>
            </div>
            <footer>
              <button>
                <Settings2 />
                配置
              </button>
              <button onClick={() => onToggle(tool.id)}>
                {tool.status === "正常" ? (
                  <>
                    <Wrench />
                    进入维护
                  </>
                ) : (
                  <>
                    <Check />
                    恢复服务
                  </>
                )}
              </button>
            </footer>
          </article>
        ))}
      </div>
      <div className="backend-note">
        <ShieldCheck />
        <div>
          <b>异常降级已启用</b>
          <p>
            单个工具不可用时不会影响学习平台，学员端将展示维护状态和预计恢复时间。
          </p>
        </div>
        <button>查看降级规则</button>
      </div>
    </>
  );
}

function RightsPage({ onNotify }: { onNotify: Notify }) {
  const items = [
    [
      "基础学习包",
      "365 天",
      "1,280",
      "3 门课程 · 4 个工具",
      "12,840",
      "生效中",
    ],
    [
      "AI 设计强化包",
      "180 天",
      "2,000",
      "2 门课程 · AI 设计",
      "4,260",
      "生效中",
    ],
    [
      "AI 电商成长包",
      "180 天",
      "1,680",
      "2 门课程 · AI 电商",
      "2,180",
      "生效中",
    ],
    ["直播陪跑包", "90 天", "800", "4 场直播 · 课堂助手", "0", "草稿"],
  ];
  return (
    <div className="rights-admin-grid">
      {items.map((item) => (
        <article className="backend-panel rights-admin-card" key={item[0]}>
          <header>
            <span>
              <PackageCheck />
            </span>
            <Status text={item[5]} />
          </header>
          <h3>{item[0]}</h3>
          <p>{item[3]}</p>
          <div>
            <span>
              <small>有效期</small>
              <b>{item[1]}</b>
            </span>
            <span>
              <small>初始积分</small>
              <b>{item[2]}</b>
            </span>
            <span>
              <small>已发放</small>
              <b>{item[4]}</b>
            </span>
          </div>
          <footer>
            <button>查看范围</button>
            <button
              onClick={() =>
                onNotify(
                  "权益包编辑已打开",
                  `${item[0]} 的变更将在确认后生效。`,
                )
              }
            >
              编辑权益包
            </button>
          </footer>
        </article>
      ))}
    </div>
  );
}

function LedgerPage() {
  const rows = [
    [
      "L2608101098",
      "今天 15:10",
      "王小明",
      "完成课程学习",
      "学习奖励",
      "+30",
      "1,280",
      "系统",
    ],
    [
      "L2608101072",
      "今天 14:42",
      "林晓雨",
      "AI 设计生成海报",
      "工具消耗",
      "-20",
      "920",
      "AI 设计",
    ],
    [
      "L2608101038",
      "今天 13:06",
      "陈志远",
      "基础学习包发放",
      "权益发放",
      "+1,280",
      "1,280",
      "王老师",
    ],
    [
      "L2608100984",
      "今天 11:28",
      "赵可欣",
      "异常消耗退回",
      "退款退回",
      "+25",
      "760",
      "系统",
    ],
    [
      "L2608100916",
      "今天 09:20",
      "许清禾",
      "人工余额调整",
      "人工调整",
      "-100",
      "380",
      "平台运营",
    ],
  ];
  return (
    <>
      <div className="ledger-summary">
        <div>
          <WalletCards />
          <span>
            <small>平台积分总余额</small>
            <b>2.84 亿</b>
          </span>
        </div>
        <div>
          <CircleDollarSign />
          <span>
            <small>今日发放</small>
            <b>186.4 万</b>
          </span>
        </div>
        <div>
          <Activity />
          <span>
            <small>今日消耗</small>
            <b>38.6 万</b>
          </span>
        </div>
        <div>
          <RefreshCw />
          <span>
            <small>今日退回</small>
            <b>1.2 万</b>
          </span>
        </div>
      </div>
      <section className="backend-panel data-panel">
        <DataToolbar filters={["全部变动类型", "全部来源", "今天"]} />
        <table className="backend-table">
          <thead>
            <tr>
              <th>流水号 / 时间</th>
              <th>用户</th>
              <th>事项</th>
              <th>类型</th>
              <th>变动</th>
              <th>余额</th>
              <th>操作来源</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                <td>
                  <b>{row[0]}</b>
                  <small className="cell-sub">{row[1]}</small>
                </td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
                <td>
                  <Status text={row[4]} />
                </td>
                <td
                  className={
                    row[5].startsWith("+")
                      ? "number-positive"
                      : "number-negative"
                  }
                >
                  {row[5]}
                </td>
                <td>{row[6]}</td>
                <td>{row[7]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableFooter count={12684} />
      </section>
    </>
  );
}

function ReconcilePage({ onNotify }: { onNotify: Notify }) {
  const [resolved, setResolved] = useState<string[]>([]);
  const rows = [
    [
      "D2608100012",
      "AI 设计",
      "U2400812",
      "平台扣减 40 / 工具上报 60",
      "20",
      "重复上报",
    ],
    [
      "D2608100088",
      "AI 电商",
      "U2400914",
      "平台扣减 25 / 工具上报 50",
      "25",
      "待确认",
    ],
  ];
  return (
    <>
      <div className="reconcile-hero">
        <div>
          <span>
            <CheckCircle2 />
          </span>
          <div>
            <b>昨日自动对账已完成</b>
            <p>共核对 286,420 笔用量，匹配率 99.92%</p>
          </div>
        </div>
        <div>
          <small>账本消耗</small>
          <b>386,420</b>
        </div>
        <div>
          <small>工具上报</small>
          <b>386,465</b>
        </div>
        <div>
          <small>差异</small>
          <b className="danger-text">45</b>
        </div>
        <button>
          <RefreshCw />
          重新对账
        </button>
      </div>
      <section className="backend-panel data-panel">
        <PanelHead
          title="差异清单"
          sub={`${Math.max(0, 2 - resolved.length)} 条待处理`}
          action="导出差异报表"
        />
        <table className="backend-table">
          <thead>
            <tr>
              <th>业务单号</th>
              <th>工具</th>
              <th>用户</th>
              <th>对账情况</th>
              <th>差异积分</th>
              <th>初步原因</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row[0]}
                className={resolved.includes(row[0]) ? "row-resolved" : ""}
              >
                {row.slice(0, 6).map((cell, index) => (
                  <td key={`${row[0]}-${index}`}>{index === 0 ? <b>{cell}</b> : cell}</td>
                ))}
                <td>
                  <button
                    className="link-button"
                    disabled={resolved.includes(row[0])}
                    onClick={() => {
                      setResolved((items) => [...items, row[0]]);
                      onNotify(
                        "差异已标记处理",
                        `${row[0]} 已进入复核，处理过程将保留记录。`,
                      );
                    }}
                  >
                    {resolved.includes(row[0]) ? "已处理" : "处理差异"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function PermissionsPage() {
  const roles = [
    ["平台超级管理员", "全局", "12", "全部管理权限", "高风险"],
    ["平台运营", "全局", "36", "课程、工具、权益、对账", "正常"],
    ["机构总部管理员", "所属机构", "18", "组织与学员汇总", "正常"],
    ["组织管理员", "所属组织", "104", "学员、班级、开户", "正常"],
    ["讲师", "本人课程", "286", "课程内容与学习数据", "正常"],
  ];
  return (
    <>
      <div className="permission-note">
        <ShieldCheck />
        <div>
          <b>最小权限原则</b>
          <p>
            角色只获得完成工作所需的权限；查看手机号、调整余额和冻结账号等敏感操作均留日志。
          </p>
        </div>
        <button>查看权限说明</button>
      </div>
      <section className="backend-panel data-panel">
        <PanelHead
          title="角色列表"
          sub="5 个系统角色"
          action="新建自定义角色"
        />
        <table className="backend-table">
          <thead>
            <tr>
              <th>角色</th>
              <th>数据范围</th>
              <th>成员数</th>
              <th>主要权限</th>
              <th>风险提示</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((row) => (
              <tr key={row[0]}>
                <td>
                  <div className="role-cell">
                    <span>
                      <KeyRound />
                    </span>
                    <b>{row[0]}</b>
                  </div>
                </td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
                <td>
                  <Status text={row[4]} />
                </td>
                <td>
                  <button className="link-button">配置权限</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="backend-panel permission-matrix">
        <PanelHead title="敏感权限矩阵" sub="抽查高风险能力" />
        <div className="matrix-row head">
          <b>角色</b>
          <span>查看完整手机号</span>
          <span>调整积分</span>
          <span>冻结账号</span>
          <span>导出学员</span>
          <span>管理权限</span>
        </div>
        {roles.slice(0, 4).map((role, index) => (
          <div className="matrix-row" key={role[0]}>
            <b>{role[0]}</b>
            {[0, 1, 2, 3, 4].map((col) => (
              <span key={col}>
                {index === 0 ||
                (index === 1 && col < 4) ||
                (index > 1 && col === 2) ? (
                  <Check />
                ) : (
                  "—"
                )}
              </span>
            ))}
          </div>
        ))}
      </section>
    </>
  );
}

function LogsPage({ role }: { role: Role }) {
  const rows =
    role === "academy"
      ? [
          [
            "今天 15:26:10",
            "王老师",
            "冻结账号",
            "学员 U2401030",
            "当前组织",
            "成功",
          ],
          [
            "今天 13:06:42",
            "王老师",
            "批量发放权益",
            "AI 设计 5 期 · 43 人",
            "当前组织",
            "成功",
          ],
          [
            "今天 11:18:05",
            "林教务",
            "导出学员名单",
            "AI 电商 3 期",
            "当前组织",
            "成功",
          ],
          [
            "昨天 17:42:18",
            "林教务",
            "修改班级",
            "AI 电商 3 期",
            "当前组织",
            "成功",
          ],
        ]
      : [
          [
            "今天 15:32:08",
            "平台运营·周宁",
            "调整积分",
            "用户 U2400914 · +25",
            "全局",
            "成功",
          ],
          [
            "今天 14:20:16",
            "课程运营·方然",
            "上架课程",
            "AI 商业提案进阶",
            "全局",
            "成功",
          ],
          [
            "今天 11:46:32",
            "平台运营·周宁",
            "处理对账差异",
            "D2608100012",
            "全局",
            "成功",
          ],
          [
            "昨天 20:12:44",
            "超级管理员",
            "修改角色权限",
            "平台运营",
            "全局",
            "成功",
          ],
        ];
  return (
    <section className="backend-panel data-panel">
      <DataToolbar filters={["全部操作类型", "全部操作人", "最近 7 天"]} />
      <table className="backend-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>操作人</th>
            <th>操作</th>
            <th>对象与内容</th>
            <th>数据范围</th>
            <th>结果</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td key={`${row[0]}-${index}`}>
                  {index === 2 ? (
                    <b>{cell}</b>
                  ) : index === 5 ? (
                    <Status text={cell} />
                  ) : (
                    cell
                  )}
                </td>
              ))}
              <td>
                <button className="link-button">查看记录</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <TableFooter count={role === "academy" ? 384 : 12684} />
    </section>
  );
}

function StudentDrawer({
  student,
  onClose,
  onToggle,
  onAdjust,
}: {
  student: Student;
  onClose: () => void;
  onToggle: () => void;
  onAdjust: () => void;
}) {
  return (
    <div
      className="backend-drawer-mask"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside className="backend-drawer">
        <header>
          <div className="person-cell large">
            <span>{student.name.slice(0, 1)}</span>
            <div>
              <h2>{student.name}</h2>
              <small>
                {student.phone} · {student.id}
              </small>
            </div>
          </div>
          <button onClick={onClose} aria-label="关闭学员详情">
            <X />
          </button>
        </header>
        <div className="drawer-status">
          <Status text={student.status} />
          <span>{student.organization}</span>
          <span>{student.className}</span>
        </div>
        <section>
          <h3>学习概览</h3>
          <div className="drawer-metrics">
            <span>
              <small>课程进度</small>
              <b>{student.progress}%</b>
            </span>
            <span>
              <small>积分余额</small>
              <b>{student.points.toLocaleString()}</b>
            </span>
            <span>
              <small>最近学习</small>
              <b>{student.lastSeen}</b>
            </span>
          </div>
        </section>
        <section>
          <h3>已开通权益</h3>
          <div className="drawer-right">
            <PackageCheck />
            <div>
              <b>基础学习包</b>
              <small>有效期至 2027-08-01 · 4 个工具</small>
            </div>
            <Status text="生效中" />
          </div>
        </section>
        <section>
          <h3>最近工具使用</h3>
          <div className="drawer-event">
            <ProductIcon kind="ai-design" />
            <div>
              <b>AI 设计 · 生成海报</b>
              <small>今天 14:42 · 消耗 20 积分</small>
            </div>
          </div>
          <div className="drawer-event">
            <BookOpen />
            <div>
              <b>完成第 2 课学习</b>
              <small>今天 10:30 · 获得 30 积分</small>
            </div>
          </div>
        </section>
        <footer>
          <button onClick={onAdjust}>调整权益</button>
          <button
            className={student.status === "已冻结" ? "primary" : "danger"}
            onClick={onToggle}
          >
            {student.status === "已冻结" ? "解冻账号" : "冻结账号"}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function BackendDialog({
  type,
  onClose,
  onConfirm,
}: {
  type: "batch" | "course" | "adjust";
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="backend-dialog-mask"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="backend-dialog">
        <header>
          <div>
            <span>
              {type === "batch" ? (
                <FileSpreadsheet />
              ) : type === "course" ? (
                <BookOpen />
              ) : (
                <WalletCards />
              )}
            </span>
            <div>
              <h2>
                {type === "batch"
                  ? "导入名单并发放权益"
                  : type === "course"
                    ? "新建课程"
                    : "人工调整积分"}
              </h2>
              <p>
                {type === "batch"
                  ? "将按已校验的 43 名学员继续，失败记录可修正后重试。"
                  : type === "course"
                    ? "先创建草稿，完善内容后再提交审核。"
                    : "敏感操作需要填写原因并进入操作日志。"}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="关闭对话框">
            <X />
          </button>
        </header>
        {type === "batch" ? (
          <>
            <div className="dialog-file">
              <FileSpreadsheet />
              <div>
                <b>AI 设计 5 期报名名单.xlsx</b>
                <small>44 条记录 · 43 条通过 · 1 条需修正</small>
              </div>
              <Status text="校验完成" />
            </div>
            <label>
              选择班级
              <select defaultValue="design">
                <option value="design">AI 设计 5 期</option>
              </select>
            </label>
            <label>
              发放权益包
              <select defaultValue="base">
                <option value="base">基础学习包 · 1,280 积分 · 365 天</option>
              </select>
            </label>
          </>
        ) : type === "course" ? (
          <>
            <label>
              课程名称
              <input placeholder="请输入课程名称" />
            </label>
            <div className="dialog-two">
              <label>
                课程方向
                <select>
                  <option>AI+设计</option>
                  <option>AI+电商</option>
                  <option>AI+漫剧</option>
                </select>
              </label>
              <label>
                讲师
                <select>
                  <option>李老师</option>
                  <option>周老师</option>
                </select>
              </label>
            </div>
            <label>
              课程简介
              <textarea placeholder="说明课程适合谁、能学到什么" />
            </label>
          </>
        ) : (
          <>
            <label>
              学员手机号或用户 ID
              <input defaultValue="U2400914" />
            </label>
            <div className="dialog-two">
              <label>
                调整方式
                <select>
                  <option>增加积分</option>
                  <option>扣减积分</option>
                </select>
              </label>
              <label>
                调整数量
                <input type="number" defaultValue="25" />
              </label>
            </div>
            <label>
              调整原因
              <textarea defaultValue="对账差异核实后退回" />
            </label>
            <div className="dialog-warning">
              <CircleAlert />
              本次操作不可直接撤销，如需更正请创建一笔反向调整。
            </div>
          </>
        )}
        <footer>
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={onConfirm}>
            {type === "batch"
              ? "为 43 名学员开户并发放"
              : type === "course"
                ? "创建课程草稿"
                : "确认调整并留痕"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function PanelHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: string;
}) {
  return (
    <div className="backend-panel-head">
      <div>
        <h2>{title}</h2>
        {sub && <span>{sub}</span>}
      </div>
      {action && (
        <button>
          {action}
          <ArrowRight />
        </button>
      )}
    </div>
  );
}

function Todo({
  tone,
  title,
  text,
  onClick,
}: {
  tone: string;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button className="todo-row" onClick={onClick}>
      <span className={tone}>
        <CircleAlert />
      </span>
      <div>
        <b>{title}</b>
        <small>{text}</small>
      </div>
      <ArrowRight />
    </button>
  );
}

function Status({ text }: { text: string }) {
  const positive = [
    "正常",
    "已上架",
    "生效中",
    "成功",
    "进行中",
    "校验完成",
  ].includes(text);
  const danger = ["已冻结", "信息有误", "高风险"].includes(text);
  const warning = [
    "待激活",
    "待审核",
    "维护中",
    "需关注",
    "即将结课",
    "人工调整",
    "工具消耗",
  ].includes(text);
  return (
    <span
      className={`backend-status ${positive ? "positive" : danger ? "danger" : warning ? "warning" : "neutral"}`}
    >
      <i />
      {text}
    </span>
  );
}

function DataToolbar({
  query = "",
  onQuery,
  filters = [],
}: {
  query?: string;
  onQuery?: (value: string) => void;
  filters?: string[];
}) {
  return (
    <div className="data-toolbar">
      <div className="data-search">
        <Search />
        <input
          value={query}
          onChange={(event) => onQuery?.(event.target.value)}
          placeholder="搜索名称、手机号或编号"
        />
      </div>
      <div>
        {filters.map((filter) => (
          <button key={filter}>
            <Filter />
            {filter}
            <ChevronDown />
          </button>
        ))}
        <button>
          <SlidersHorizontal />
          更多筛选
        </button>
      </div>
    </div>
  );
}

function TableFooter({ count }: { count: number }) {
  return (
    <div className="table-footer">
      <span>共 {count.toLocaleString()} 条记录</span>
      <div>
        <button disabled>上一页</button>
        <button className="active">1</button>
        <button>2</button>
        <button>3</button>
        <button>下一页</button>
      </div>
    </div>
  );
}

function BackendIcon({ children }: { children: ReactNode }) {
  return <span className="backend-icon">{children}</span>;
}
