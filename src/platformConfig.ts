export type KnowledgeClassification = "公开" | "内部" | "受限";

export type Tenant = {
  id: string;
  displayName: string;
  shortName: string;
  platformName: string;
  accent: "forest" | "teal" | "blue" | "violet";
  brandTagline: string;
  enabledMethodologyPackIds: string[];
  enabledKnowledgeSourceIds: string[];
};

export type MethodologyPack = {
  id: string;
  name: string;
  summary: string;
  stages: Array<{ id: string; name: string; outcome: string }>;
};

export type LearningTask = {
  id: string;
  title: string;
  kind: "学习" | "实操" | "复盘" | "评审";
  duration: string;
  status: "已完成" | "进行中" | "待开始";
  workId?: string;
  evidenceRequirement?: string;
};

export type ProgramModule = {
  id: string;
  title: string;
  summary: string;
  status: "已完成" | "进行中" | "待开始";
  tasks: LearningTask[];
};

export type Program = {
  id: string;
  tenantId: string;
  name: string;
  cohortName: string;
  methodologyPackId: string;
  progress: number;
  currentModuleId: string;
  modules: ProgramModule[];
};

export type Evidence = {
  id: string;
  tenantId: string;
  programId: string;
  taskId: string;
  title: string;
  type: "作品" | "过程记录" | "反馈" | "评审";
  summary: string;
  source: string;
  createdAt: string;
  reviewStatus: "已验证" | "待评审" | "需补充";
  visibleTo: string[];
};

export type Milestone = {
  id: string;
  programId: string;
  name: string;
  description: string;
  requiredEvidenceTypes: Evidence["type"][];
  reviewerRequired: boolean;
  certificateName: string;
};

export type KnowledgeSourcePolicy = {
  id: string;
  name: string;
  provider: "飞书" | "ima" | "自定义";
  classification: KnowledgeClassification;
  visibleRoles: string[];
  owner: string;
  version: string;
  allowAiRetrieval: boolean;
  allowExternalCitation: boolean;
  updatedAt: string;
};

export const tenants: Tenant[] = [
  {
    id: "zhixing-tech",
    displayName: "知行科技",
    shortName: "知行",
    platformName: "知行 AI",
    accent: "forest",
    brandTagline: "让学习形成真实成果",
    enabledMethodologyPackIds: ["ai-growth-practice"],
    enabledKnowledgeSourceIds: ["kb-feishu-product", "kb-ima-personal", "kb-custom-playbook"],
  },
  {
    id: "sample-growth-org",
    displayName: "示例成长机构",
    shortName: "示例机构",
    platformName: "成长工作台",
    accent: "blue",
    brandTagline: "从课程走向可验证的能力",
    enabledMethodologyPackIds: ["workplace-ai-foundation"],
    enabledKnowledgeSourceIds: ["kb-feishu-product", "kb-custom-playbook"],
  },
];

export const methodologyPacks: MethodologyPack[] = [
  {
    id: "ai-growth-practice",
    name: "AI 成长实践模型",
    summary: "从建立稳定状态，到熟练协作，再到用真实项目形成影响力。",
    stages: [
      { id: "m1", name: "建立状态", outcome: "形成可持续的学习与工作节奏" },
      { id: "m2", name: "掌握协作", outcome: "能把 AI 用进日常任务" },
      { id: "m3", name: "完成作品", outcome: "产出可展示、可复盘的真实成果" },
      { id: "m4", name: "通过评审", outcome: "用证据说明能力与改进" },
      { id: "m5", name: "扩大影响", outcome: "把方法迁移到新的业务场景" },
    ],
  },
  {
    id: "workplace-ai-foundation",
    name: "职场 AI 基础模型",
    summary: "以高频办公任务为入口，完成从理解到独立交付的训练。",
    stages: [
      { id: "s1", name: "理解任务", outcome: "清楚描述目标与约束" },
      { id: "s2", name: "协同完成", outcome: "在帮助下完成一次交付" },
      { id: "s3", name: "独立交付", outcome: "稳定完成真实工作成果" },
    ],
  },
];

export const programs: Program[] = [
  {
    id: "program-ai-creator-01",
    tenantId: "zhixing-tech",
    name: "AI 创作与工作提效训练营",
    cohortName: "2026 秋季实践班",
    methodologyPackId: "ai-growth-practice",
    progress: 46,
    currentModuleId: "module-02",
    modules: [
      {
        id: "module-01",
        title: "建立 AI 协作基础",
        summary: "理解任务、给出上下文，并判断结果是否可信。",
        status: "已完成",
        tasks: [
          { id: "task-01", title: "认识 AI 的能力边界", kind: "学习", duration: "18 分钟", status: "已完成" },
          { id: "task-02", title: "把模糊需求说清楚", kind: "实操", duration: "30 分钟", status: "已完成", evidenceRequirement: "提交一份经过两轮改进的任务说明" },
        ],
      },
      {
        id: "module-02",
        title: "完成一件真实作品",
        summary: "在专注工作区完成海报任务，并保存过程依据。",
        status: "进行中",
        tasks: [
          { id: "task-03", title: "风格统一与商用检查", kind: "学习", duration: "16 分钟", status: "进行中" },
          { id: "task-04", title: "完成课程主题海报", kind: "实操", duration: "45 分钟", status: "待开始", workId: "website", evidenceRequirement: "保存最终作品、关键选择和来源说明" },
          { id: "task-05", title: "同伴反馈与改进", kind: "评审", duration: "20 分钟", status: "待开始", evidenceRequirement: "至少记录一条反馈及对应修改" },
        ],
      },
      {
        id: "module-03",
        title: "迁移到工作场景",
        summary: "把已验证的方法应用到新的业务任务。",
        status: "待开始",
        tasks: [
          { id: "task-06", title: "选择一个真实业务问题", kind: "实操", duration: "60 分钟", status: "待开始", evidenceRequirement: "提交问题、成果和复盘" },
        ],
      },
    ],
  },
  {
    id: "program-workplace-foundation",
    tenantId: "sample-growth-org",
    name: "职场 AI 基础训练",
    cohortName: "通用示例班",
    methodologyPackId: "workplace-ai-foundation",
    progress: 22,
    currentModuleId: "sample-module-01",
    modules: [
      {
        id: "sample-module-01",
        title: "从一个日常任务开始",
        summary: "选择高频任务并完成第一次协作交付。",
        status: "进行中",
        tasks: [
          { id: "sample-task-01", title: "整理一次会议结论", kind: "实操", duration: "30 分钟", status: "进行中", evidenceRequirement: "提交整理前后的内容与核对说明" },
        ],
      },
    ],
  },
];

export const initialEvidence: Evidence[] = [
  {
    id: "evidence-task-02",
    tenantId: "zhixing-tech",
    programId: "program-ai-creator-01",
    taskId: "task-02",
    title: "客户需求说明改进记录",
    type: "过程记录",
    summary: "记录了从一句模糊需求到目标、受众、限制条件完整说明的两轮改进。",
    source: "专注工作区 · 历史版本",
    createdAt: "08-08 16:20",
    reviewStatus: "已验证",
    visibleTo: ["本人", "讲师", "机构管理员"],
  },
  {
    id: "evidence-peer-feedback",
    tenantId: "zhixing-tech",
    programId: "program-ai-creator-01",
    taskId: "task-02",
    title: "第一次任务说明反馈",
    type: "反馈",
    summary: "同伴确认目标已经清楚，并建议补充输出尺寸和使用场景。",
    source: "同伴反馈",
    createdAt: "08-08 17:05",
    reviewStatus: "已验证",
    visibleTo: ["本人", "讲师"],
  },
];

export const milestones: Milestone[] = [
  {
    id: "milestone-first-delivery",
    programId: "program-ai-creator-01",
    name: "完成第一次真实交付",
    description: "提交一件作品、一份过程记录和一条反馈，并通过讲师评审。",
    requiredEvidenceTypes: ["作品", "过程记录", "反馈", "评审"],
    reviewerRequired: true,
    certificateName: "AI 实践阶段证明",
  },
];

export const knowledgeSourcePolicies: KnowledgeSourcePolicy[] = [
  {
    id: "kb-feishu-product",
    name: "产品与课程白皮书",
    provider: "飞书",
    classification: "内部",
    visibleRoles: ["学员", "讲师", "机构管理员"],
    owner: "产品负责人",
    version: "v2.3",
    allowAiRetrieval: true,
    allowExternalCitation: false,
    updatedAt: "今天 09:20",
  },
  {
    id: "kb-ima-personal",
    name: "个人学习资料",
    provider: "ima",
    classification: "受限",
    visibleRoles: ["本人"],
    owner: "内容创建者",
    version: "自动同步",
    allowAiRetrieval: true,
    allowExternalCitation: false,
    updatedAt: "今天 08:45",
  },
  {
    id: "kb-custom-playbook",
    name: "业务实践手册",
    provider: "自定义",
    classification: "内部",
    visibleRoles: ["学员", "讲师"],
    owner: "知识库管理员",
    version: "v1.8",
    allowAiRetrieval: true,
    allowExternalCitation: true,
    updatedAt: "昨天 17:30",
  },
];

export const defaultTenantId = "zhixing-tech";

export function getTenant(tenantId: string) {
  return tenants.find((tenant) => tenant.id === tenantId) ?? tenants[0];
}

export function getProgramForTenant(tenantId: string) {
  return programs.find((program) => program.tenantId === tenantId) ?? programs[0];
}

export function getMethodologyForProgram(program: Program) {
  return methodologyPacks.find((pack) => pack.id === program.methodologyPackId) ?? methodologyPacks[0];
}

export function milestoneProgress(milestone: Milestone, evidence: Evidence[]) {
  const present = new Set(evidence.map((item) => item.type));
  const completed = milestone.requiredEvidenceTypes.filter((type) => present.has(type));
  return {
    completed,
    missing: milestone.requiredEvidenceTypes.filter((type) => !present.has(type)),
    isUnlocked: completed.length === milestone.requiredEvidenceTypes.length,
  };
}
