export type CourseSource = {
  label: string;
  url: string;
};

export type Lesson = {
  id: string;
  title: string;
  duration: string;
  xp: number;
  summary: string;
  objectives: string[];
  practice: string;
  deliverable: string;
  sources: CourseSource[];
};

export type CourseStage = {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  weeks: string;
  color: string;
  outcome: string;
  deliverable: string;
  lessons: Lesson[];
};

const source = {
  opc: {
    label: "晴幂科技 OPC 超级个体实践框架",
    url: "https://happykua.com/",
  },
  strategyzerProfile: {
    label: "Strategyzer · Customer Profile",
    url: "https://www.strategyzer.com/library/the-customer-profile",
  },
  strategyzerTest: {
    label: "Strategyzer · Testing Your Business Model",
    url: "https://assets.strategyzer.com/assets/resources/testing-your-business-model-a-reference-guide.pdf",
  },
  designKit: {
    label: "Design Council · The Double Diamond",
    url: "https://www.designcouncil.org.uk/resources/the-double-diamond/",
  },
  nngHeuristics: {
    label: "Nielsen Norman Group · 10 Usability Heuristics",
    url: "https://www.nngroup.com/articles/ten-usability-heuristics/",
  },
  wcag: {
    label: "W3C · Web Content Accessibility Guidelines 2.2",
    url: "https://www.w3.org/TR/WCAG22/",
  },
  figmaSystem: {
    label: "Figma · Components, styles and shared libraries",
    url: "https://www.figma.com/best-practices/components-styles-and-shared-libraries/",
  },
  mdn: {
    label: "MDN · Learn Web Development",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
  },
  mdnPublish: {
    label: "MDN · Your First Website",
    url: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web",
  },
  githubActions: {
    label: "GitHub Docs · Actions",
    url: "https://docs.github.com/en/actions",
  },
  webVitals: {
    label: "web.dev · Core Web Vitals",
    url: "https://web.dev/articles/vitals",
  },
  seo: {
    label: "Google Search Central · SEO Starter Guide",
    url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
  },
  analytics: {
    label: "Google Analytics · Events",
    url: "https://support.google.com/analytics/answer/9356037?hl=en",
  },
  ycLaunch: {
    label: "Y Combinator · How to Launch (Again and Again)",
    url: "https://www.ycombinator.com/library/6i-how-to-launch-again-and-again",
  },
  openaiPrompting: {
    label: "OpenAI · Prompt Engineering Guide",
    url: "https://developers.openai.com/api/docs/guides/prompt-engineering",
  },
  pipl: {
    label: "中国人大网 · 个人信息保护法",
    url: "https://flk.npc.gov.cn/detail?fileId=&id=ff8081817b6472a3017b656cc2040044&title=%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E4%B8%AA%E4%BA%BA%E4%BF%A1%E6%81%AF%E4%BF%9D%E6%8A%A4%E6%B3%95&type=",
  },
  sbaResearch: {
    label: "U.S. Small Business Administration · Market research and competitive analysis",
    url: "https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis",
  },
  govUkUsers: {
    label: "GOV.UK · Start by learning user needs",
    url: "https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs",
  },
  doubleDiamond: {
    label: "Design Council · The Double Diamond",
    url: "https://www.designcouncil.org.uk/resources/the-double-diamond/",
  },
  owasp: {
    label: "OWASP · Application Security Verification Standard",
    url: "https://owasp.org/www-project-application-security-verification-standard/",
  },
  aigcLabel: {
    label: "国家网信办 · 人工智能生成合成内容标识办法",
    url: "https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm",
  },
  genAiRules: {
    label: "中国政府网 · 生成式人工智能服务管理暂行办法",
    url: "https://www.gov.cn/zhengce/zhengceku/202307/content_6891752.htm",
  },
  icpGuide: {
    label: "工信部门 · 互联网信息服务备案指南",
    url: "https://hunca.miit.gov.cn/bsfw/bszn/art/2024/art_7ef0d8bd3b0d433ba4b9b277f883f74d.html",
  },
  monetizingInnovation: {
    label: "Wiley · Monetizing Innovation",
    url: "https://www.wiley-vch.de/en/areas-interest/finance-economics-law/business-management-13ba/business-society-13ba7/monetizing-innovation-978-1-119-24086-0",
  },
  spinSelling: {
    label: "McGraw Hill · SPIN Selling",
    url: "https://www.mheducation.com/highered/mhp/product/spin-selling.html",
  },
  winWithoutPitching: {
    label: "Win Without Pitching · The Manifesto",
    url: "https://www.winwithoutpitching.com/books/the-win-without-pitching-manifesto/",
  },
  tradeExportPlan: {
    label: "International Trade Administration · Develop an Export Plan",
    url: "https://www.trade.gov/develop-export-plan",
  },
  tradeMarkets: {
    label: "International Trade Administration · Selecting International Markets",
    url: "https://www.trade.gov/selecting-international-markets",
  },
  tradeVideos: {
    label: "International Trade Administration · How to Export Videos",
    url: "https://www.trade.gov/how-export-videos",
  },
  w3cI18n: {
    label: "W3C · Getting Started with Internationalization",
    url: "https://www.w3.org/International/i18n-drafts/getting-started/index.html",
  },
  stripeCurrencies: {
    label: "Stripe Docs · Supported Currencies",
    url: "https://docs.stripe.com/currencies",
  },
  edpbTerritorial: {
    label: "EDPB · GDPR Territorial Scope Guidelines",
    url: "https://www.edpb.europa.eu/documents/guideline/guidelines-32018-on-the-territorial-scope-of-the-gdpr-article-3-version-adopted_en",
  },
  cacCrossborder: {
    label: "国家网信办 · 促进和规范数据跨境流动规定",
    url: "https://www.cac.gov.cn/2024-03/22/c_1712776612187994.htm",
  },
  oecdVat: {
    label: "OECD · VAT Digital Toolkits",
    url: "https://www.oecd.org/content/oecd/en/topics/sub-issues/vat-policy-and-administration/vat-digital-toolkits.html",
  },
  ycEssential: {
    label: "Y Combinator · Essential Startup Advice",
    url: "https://www.ycombinator.com/blog/ycs-essential-startup-advice/",
  },
  pgIdeas: {
    label: "Paul Graham · How to Get Startup Ideas",
    url: "https://paulgraham.com/startupideas.html",
  },
  pgDontScale: {
    label: "Paul Graham · Do Things That Don't Scale",
    url: "https://paulgraham.com/ds.html",
  },
  jasonPmf: {
    label: "Jason Cohen · The Roadmap to Product/Market Fit",
    url: "https://longform.asmartbear.com/product-market-fit-formula/",
  },
  jasonValidation: {
    label: "Jason Cohen · Who Said They'd Actually Buy?",
    url: "https://longform.asmartbear.com/customer-validation/",
  },
  jasonSlc: {
    label: "Jason Cohen · Simple, Lovable, Complete",
    url: "https://longform.asmartbear.com/slc/",
  },
  jasonNeeds: {
    label: "Jason Cohen · The Needs Stack",
    url: "https://longform.asmartbear.com/needs-stack/",
  },
  jasonProfit: {
    label: "Jason Cohen · Profitable on Day One",
    url: "https://longform.asmartbear.com/ramen-profitable/",
  },
  gettingReal: {
    label: "37signals · Getting Real",
    url: "https://basecamp.com/gettingreal",
  },
  shapeBoundaries: {
    label: "Ryan Singer · Set Boundaries (Shape Up)",
    url: "https://basecamp.com/shapeup/1.2-chapter-03",
  },
  shapeBreadboard: {
    label: "Ryan Singer · Breadboarding (Shape Up)",
    url: "https://basecamp.com/shapeup/1.3-chapter-04",
  },
  shapeBets: {
    label: "Ryan Singer · Bets, Not Backlogs (Shape Up)",
    url: "https://basecamp.com/shapeup/2.1-chapter-07",
  },
  shapeProgress: {
    label: "Ryan Singer · Show Progress (Shape Up)",
    url: "https://basecamp.com/shapeup/3.4-chapter-13",
  },
  para: {
    label: "Tiago Forte · The PARA Method",
    url: "https://fortelabs.com/blog/para/",
  },
};

export const courseStages: CourseStage[] = [
  {
    id: "identity",
    number: "01",
    eyebrow: "定盘仙 · 先选战场，再学工具",
    title: "战略定位与个体商业设计",
    subtitle: "把你的经验、能力和资源，收拢成一个能被市场理解的超级个体方向。",
    weeks: "第 1 周",
    color: "#1557e8",
    outcome: "说清楚为谁解决什么问题，以及为什么由你来做。",
    deliverable: "《一页超级个体商业画布》+ 30 秒定位陈述",
    lessons: [
      {
        id: "identity-01",
        title: "超级个体不是单打独斗",
        duration: "18 分钟",
        xp: 40,
        summary: "理解 OPC（一人公司）的核心：一个责任主体，连接 AI、伙伴和专业服务网络完成交付。",
        objectives: ["区分自由职业、个人 IP 与 OPC", "识别必须由你承担的三类责任", "画出自己的协作网络"],
        practice: "列出你当前能独立负责的 3 个结果，以及可以交给 AI 或伙伴的 5 项任务。",
        deliverable: "OPC 责任与协作边界图",
        sources: [source.opc],
      },
      {
        id: "identity-02",
        title: "能力盘点：从会什么到能交付什么",
        duration: "24 分钟",
        xp: 45,
        summary: "不再罗列技能，而是用真实经历、可复用方法和证据描述你的能力。",
        objectives: ["建立经历—方法—成果三层能力表", "识别可迁移优势", "找到最小可信证明"],
        practice: "选择一个你做成过的项目，写清背景、动作、结果、证据和可复用方法。",
        deliverable: "个人能力证据清单",
        sources: [source.opc],
      },
      {
        id: "identity-03",
        title: "选择一个值得做 12 周的问题",
        duration: "26 分钟",
        xp: 50,
        summary: "用 YC 的“窄而深”问题与 Jason Cohen 的个人—市场—客户匹配，筛选一个能在 12 周内获得真实证据的方向。",
        objectives: ["建立机会评分卡", "排查个人/市场/客户匹配", "把大赛道缩成可验证问题"],
        practice: "为 3 个候选方向按六项标准打分，并写出淘汰理由。",
        deliverable: "机会选择评分卡",
        sources: [source.strategyzerProfile, source.ycEssential, source.pgIdeas, source.jasonPmf, source.opc],
      },
      {
        id: "identity-04",
        title: "写出第一版个体商业假设",
        duration: "28 分钟",
        xp: 55,
        summary: "把目标用户、关键问题、解决方式、渠道和收入写成可以被证伪的假设。",
        objectives: ["区分事实与假设", "写出可验证的价值承诺", "确定本周期唯一北极星成果"],
        practice: "用一句话完成：我帮助___，在___场景下，通过___，更快得到___。",
        deliverable: "一页超级个体商业画布",
        sources: [source.strategyzerTest, source.opc],
      },
    ],
  },
  {
    id: "research",
    number: "02",
    eyebrow: "探潮仙 · 不要猜用户",
    title: "市场调研与客户洞察",
    subtitle: "从二手资料到真实访谈，找出用户已经在付出时间或金钱解决的问题。",
    weeks: "第 2–3 周",
    color: "#a93224",
    outcome: "用证据描述客户、替代方案和最值得切入的机会。",
    deliverable: "《10 人访谈洞察报告》+ 市场机会地图",
    lessons: [
      {
        id: "research-01",
        title: "先做桌面研究：规模、趋势与边界",
        duration: "30 分钟",
        xp: 55,
        summary: "建立可靠来源清单，用自上而下与自下而上两种方法估算机会，不把搜索结果当结论。",
        objectives: ["区分 TAM、SAM、SOM", "判断来源可信度与时效", "记录数据口径和日期"],
        practice: "为选定方向找到 5 个一手来源，标注口径、发布日期和可支持的判断。",
        deliverable: "桌面研究证据表",
        sources: [source.sbaResearch, source.designKit, source.strategyzerTest],
      },
      {
        id: "research-02",
        title: "用户访谈：问过去，不问想象",
        duration: "36 分钟",
        xp: 60,
        summary: "围绕最近一次真实行为追问触发、过程、替代方案、成本和结果，减少礼貌性答案。",
        objectives: ["写出不诱导的访谈提纲", "追问具体行为与事实", "保留原话和反例"],
        practice: "完成 3 次 30 分钟访谈，只记录事实、原话与解释；单列时间、资料、介绍、意向金或付款等承诺，并排除礼貌称赞。",
        deliverable: "访谈记录、购买证据与礼貌称赞排除表",
        sources: [source.govUkUsers, source.designKit, source.jasonValidation, source.strategyzerProfile],
      },
      {
        id: "research-03",
        title: "竞品不是名单，是替代方案",
        duration: "28 分钟",
        xp: 50,
        summary: "把软件、人工服务、表格、拖延和“不做”都视为竞争方案，比较用户实际付出的代价。",
        objectives: ["识别直接与间接竞品", "建立统一比较维度", "找到未被满足的关键任务"],
        practice: "完成 6 个替代方案的体验，记录价格、承诺、路径、优势和明显缺口。",
        deliverable: "替代方案竞争地图",
        sources: [source.strategyzerProfile, source.jasonNeeds],
      },
      {
        id: "research-04",
        title: "把碎片信息合成机会判断",
        duration: "32 分钟",
        xp: 65,
        summary: "用共同任务、痛点强度、现有投入和触达难度聚类，不用一张虚构画像掩盖差异。",
        objectives: ["完成访谈主题聚类", "识别高频高痛任务", "写出证据、反证与未知项"],
        practice: "把至少 30 条观察归为 5–8 个主题，为每个主题保留一条反例。",
        deliverable: "10 人访谈洞察报告",
        sources: [source.designKit, source.strategyzerProfile],
      },
    ],
  },
  {
    id: "product",
    number: "03",
    eyebrow: "造物仙 · 先验证价值，再堆功能",
    title: "产品定义与最小验证",
    subtitle: "把洞察变成价值主张、产品路径和最小可行实验。",
    weeks: "第 4–5 周",
    color: "#6541c9",
    outcome: "让真实用户用行为证明产品是否值得继续。",
    deliverable: "产品需求简报 + 可点击原型 + 首轮验证结论",
    lessons: [
      {
        id: "product-01",
        title: "从客户任务写出价值主张",
        duration: "30 分钟",
        xp: 55,
        summary: "把客户要完成的任务、阻力和期待，与产品提供的减负和收益一一对应。",
        objectives: ["完成客户任务/痛点/收益地图", "避免无依据功能清单", "形成单一核心承诺"],
        practice: "删除所有不能对应访谈证据的功能，只保留解决最高优先级任务的能力。",
        deliverable: "价值主张画布",
        sources: [source.strategyzerProfile, source.jasonNeeds],
      },
      {
        id: "product-02",
        title: "MVP、SLC 与 MPV1：首版必须完整",
        duration: "34 分钟",
        xp: 60,
        summary: "对照 YC MVP、Jason Cohen 的 SLC 与 37signals 的完整小产品：缩小范围，但完整完成一个客户任务。",
        objectives: ["识别价值、可用性、可行性、商业四类风险", "选择首版标准并写清不做项", "保证一个用户结果端到端完整"],
        practice: "为最大风险设计一个 7 天实验；删掉一半范围，但保留从触发到结果的完整路径，并提前写下失败条件。",
        deliverable: "首版标准选择器、完整任务清单与 MVP 实验卡",
        sources: [source.strategyzerTest, source.ycEssential, source.jasonSlc, source.gettingReal],
      },
      {
        id: "product-03",
        title: "产品路径：让用户抵达第一个价值时刻",
        duration: "32 分钟",
        xp: 55,
        summary: "从触发到结果画出关键步骤，优先减少首次使用中的等待、判断和重复输入。",
        objectives: ["定义激活时刻", "绘制主流程与异常路径", "为每一步写出用户问题"],
        practice: "把主流程压缩到 5 个关键步骤，并解释每一步为什么不能删。",
        deliverable: "核心用户旅程图",
        sources: [source.designKit, source.nngHeuristics],
      },
      {
        id: "product-04",
        title: "写一份能直接开工的产品简报",
        duration: "38 分钟",
        xp: 70,
        summary: "用 Shape Up Pitch 把问题、时间胃口、粗粒度解法、风险洞和不做项放进同一份可下注的决策文档。",
        objectives: ["明确本版时间胃口与不做项", "暴露风险洞与未知", "把形容词改成验收条件"],
        practice: "写一份一页 Pitch，邀请未参与者复述问题、解法、Rabbit Holes 与 No-gos，记录所有理解偏差。",
        deliverable: "一页 Shape Up Pitch / PRD Lite",
        sources: [source.strategyzerTest, source.analytics, source.doubleDiamond, source.shapeBoundaries, source.shapeBets],
      },
    ],
  },
  {
    id: "design",
    number: "04",
    eyebrow: "焕颜仙 · 把信任设计出来",
    title: "品牌与界面设计",
    subtitle: "从信息结构到视觉系统，让产品清楚、可信、易用并具备自己的记忆点。",
    weeks: "第 6 周",
    color: "#765700",
    outcome: "产出可复用设计系统和覆盖关键任务的高保真界面。",
    deliverable: "品牌一页纸 + UI 组件库 + 关键页面原型",
    lessons: [
      {
        id: "design-01",
        title: "品牌不是 Logo，是稳定的选择规则",
        duration: "26 分钟",
        xp: 45,
        summary: "定义品牌承诺、人格、语气、证据和禁区，让内容、产品和服务表达一致。",
        objectives: ["写出品牌一句话承诺", "建立语气与用词规则", "选定一个可被记住的视觉母题"],
        practice: "为同一条产品信息写出“应该这样说”和“绝不这样说”各 3 版。",
        deliverable: "品牌一页纸",
        sources: [source.opc],
      },
      {
        id: "design-02",
        title: "信息架构与低保真线框",
        duration: "34 分钟",
        xp: 55,
        summary: "先用 Shape Up Breadboard 画出关键元素、连接与动作，再验证结构、优先级和路径，最后才进入视觉细节。",
        objectives: ["完成关键元素与连接图", "设计全局导航", "画出移动端优先线框"],
        practice: "先画 Breadboard，再用灰阶完成首页、核心任务页和结果页，让 3 位用户完成指定任务。",
        deliverable: "关键路径低保真原型",
        sources: [source.designKit, source.nngHeuristics, source.shapeBreadboard],
      },
      {
        id: "design-03",
        title: "建立能落地的视觉与组件系统",
        duration: "40 分钟",
        xp: 65,
        summary: "用颜色、字体、间距、圆角和组件状态形成设计语言，减少每个页面重新决定。",
        objectives: ["建立设计 token", "覆盖按钮/表单/卡片完整状态", "让设计与代码命名一致"],
        practice: "只使用自己的 token 和组件，重建一个关键页面并检查是否出现例外值。",
        deliverable: "最小设计系统 v1",
        sources: [source.figmaSystem],
      },
      {
        id: "design-04",
        title: "可用性、无障碍与信任检查",
        duration: "36 分钟",
        xp: 65,
        summary: "检查反馈、错误恢复、对比度、键盘操作、移动端触达和敏感操作确认。",
        objectives: ["应用十项可用性启发式", "完成基础 WCAG 检查", "识别误导性设计和信任缺口"],
        practice: "用键盘和手机完成一次完整任务，记录所有卡点并按严重度排序。",
        deliverable: "可用性与无障碍问题单",
        sources: [source.nngHeuristics, source.wcag],
      },
    ],
  },
  {
    id: "build",
    number: "05",
    eyebrow: "巧筑仙 · 能开发，也能安全上线",
    title: "AI 技术开发与上线发布",
    subtitle: "理解技术骨架，用规格驱动 AI 开发，再以测试、权限、监控和回退守住真实交付。",
    weeks: "第 7–9 周",
    color: "#08715f",
    outcome: "独立完成一个有正式地址、可维护、可监控、可恢复的 Web 产品。",
    deliverable: "线上产品 v1 + 技术说明 + 发布与回退手册",
    lessons: [
      {
        id: "build-01",
        title: "理解 Web 产品的最小技术地图",
        duration: "38 分钟",
        xp: 60,
        summary: "看懂浏览器、前端、API、数据库、身份认证、文件存储和域名之间如何协作。",
        objectives: ["描述一次请求的完整路径", "判断静态站与全栈应用差异", "画出自己的系统边界"],
        practice: "为你的产品画出用户端、服务端、数据与第三方服务四层架构图。",
        deliverable: "最小系统架构图",
        sources: [source.mdn],
      },
      {
        id: "build-02",
        title: "把需求变成 AI 能执行的开发规格",
        duration: "42 分钟",
        xp: 70,
        summary: "先定一到两周时间胃口，再提供目标、约束、接口、参考和验收，让 AI 在固定时间、可变范围内完成产品切片。",
        objectives: ["写出任务上下文包", "按 Appetite 塑形可验证切片", "设置停止、熔断与人工确认点"],
        practice: "选择一个功能，写出时间胃口、输入、状态、异常、响应式、可访问性验收与可砍范围。",
        deliverable: "AI 开发任务规格与个人下注卡",
        sources: [source.openaiPrompting, source.mdn, source.shapeBoundaries],
      },
      {
        id: "build-03",
        title: "数据、登录、权限与版本安全线",
        duration: "36 分钟",
        xp: 60,
        summary: "身份必须在服务端验证，权限遵循最小必要；敏感信息不进前端、日志和代码库，所有变化可追踪。",
        objectives: ["区分认证与授权", "建立角色权限矩阵", "用版本控制保护数据与代码变化"],
        practice: "为学员、教练、管理员列出读写删权限，并把一个功能拆成 3 个可独立验证的提交。",
        deliverable: "角色权限矩阵与可回溯代码仓库",
        sources: [source.pipl, source.owasp, source.githubActions],
      },
      {
        id: "build-04",
        title: "测试、部署、监控与回退",
        duration: "44 分钟",
        xp: 75,
        summary: "用 Hill Chart 区分“仍在弄清楚”与“已经知道怎么做”，再围绕关键故事、真实设备和错误状态建立发布门禁。",
        objectives: ["用山丘图暴露未知风险", "配置域名、HTTPS 与自动发布", "建立监控、降级和回退路径"],
        practice: "画出风险山丘图，把产品发布到正式地址，用无痕窗口和手机完成全流程，并模拟一次失败回退。",
        deliverable: "正式域名、发布证据与故障处理手册",
        sources: [source.githubActions, source.webVitals, source.mdnPublish, source.owasp, source.icpGuide, source.shapeProgress],
      },
    ],
  },
  {
    id: "launch",
    number: "06",
    eyebrow: "点金仙 · 把价值变成健康收入",
    title: "商业化与客户成功",
    subtitle: "从产品化报价、首批线索、诊断式销售到合同、交付、续费，完成最小收入闭环。",
    weeks: "第 10 周",
    color: "#a92f5c",
    outcome: "能清楚报价、获得有效会面、完成成交并持续兑现客户结果。",
    deliverable: "产品化报价 + 30 人线索池 + 销售脚本 + 客户成功 Playbook",
    lessons: [
      {
        id: "launch-01",
        title: "从能力到商品：报价、套餐与单位经济",
        duration: "34 分钟",
        xp: 60,
        summary: "围绕客户结果定义套餐与价值锚点，并按 Jason Cohen 的真实利润原则，把创始人时间与替代成本计入健康毛利。",
        objectives: ["把能力包装成可购买结果", "设计基础/主推/共创三档", "计入创始人时间算真实单位经济"],
        practice: "为一个真实服务写三档报价，测算获客、工具、伙伴、创始人时间、替代成本与贡献毛利。",
        deliverable: "一页产品化报价单与单位经济表",
        sources: [source.monetizingInnovation, source.strategyzerProfile, source.jasonProfit, source.opc],
      },
      {
        id: "launch-02",
        title: "创始人亲自卖：找到前 30 个客户",
        duration: "32 分钟",
        xp: 55,
        summary: "实践 YC / Paul Graham 的“做不可规模化的事”：创始人亲自招募、服务并理解前 30 位客户，再决定自动化什么。",
        objectives: ["定义首批客户筛选标准", "完成高触感人工触达", "从人工服务识别可规模化模式"],
        practice: "建立 30 人线索池，完成首轮 10 次个性化触达，并逐条记录回应和下一步。",
        deliverable: "30 人线索池与三触点外联序列",
        sources: [source.winWithoutPitching, source.ycLaunch, source.pgDontScale, source.opc],
      },
      {
        id: "launch-03",
        title: "诊断式销售：提问、演示、异议与谈判",
        duration: "38 分钟",
        xp: 65,
        summary: "用情境、问题、影响和期望收益帮助客户看清改变价值，只演示与决策有关的第一个价值时刻。",
        objectives: ["掌握 SPIN 问题树", "把展示变成共同诊断", "用战术同理心处理异议而非急于降价"],
        practice: "与 AI 完成三轮客户角色对练，只有问清影响、成功标准、预算与决策链后才能提案。",
        deliverable: "30 分钟销售会脚本与异议库",
        sources: [source.spinSelling, source.winWithoutPitching],
      },
      {
        id: "launch-04",
        title: "成交不是结束：合同、启动、交付与续费",
        duration: "30 分钟",
        xp: 60,
        summary: "把承诺写进范围、验收、变更、付款和数据边界，并用启动会、首个价值时刻和健康度复盘推动复购。",
        objectives: ["建立合同与风险检查点", "缩短 Time-to-Value", "用留存、复购和客户集中度判断商业健康"],
        practice: "为一份模拟订单完成合同问题清单、启动会、交付里程碑、变更机制与 30 天复盘。",
        deliverable: "从签约到续费的客户成功 Playbook",
        sources: [source.opc, source.jasonPmf, source.pipl, source.aigcLabel, source.genAiRules],
      },
    ],
  },
  {
    id: "growth",
    number: "07",
    eyebrow: "链主仙 · 从能人走向经营系统",
    title: "OPC 系统与运营增长",
    subtitle: "把经验沉淀为知识资产、交付 SOP、人机伙伴协作与可持续经营节奏。",
    weeks: "第 11 周",
    color: "#9e4a00",
    outcome: "让业务不再只依赖本人在线，并让每次交付增加下一次增长的资产。",
    deliverable: "知识资产地图 + 交付 SOP + Who 矩阵 + OPC 经营驾驶舱",
    lessons: [
      {
        id: "growth-01",
        title: "资产化：把一次交付变成可重复卖的知识产品",
        duration: "30 分钟",
        xp: 50,
        summary: "用 PARA 按行动组织知识：当前项目优先、经营责任可见、资源随用随取、完成项归档，再提炼模板、案例与评分规准。",
        objectives: ["建立 Projects / Areas / Resources / Archives", "建立版本、所有者与适用边界", "用复用次数衡量资产价值"],
        practice: "把一个项目材料归入 PARA，再筛出 10 项候选资产，为价值最高的 5 项补齐输入、输出、样例、验收和版本。",
        deliverable: "PARA 个人知识工作台与资产地图",
        sources: [source.opc, source.para, source.figmaSystem, source.openaiPrompting],
      },
      {
        id: "growth-02",
        title: "系统化：把“我会做”写成别人能交付的 SOP",
        duration: "32 分钟",
        xp: 55,
        summary: "用触发、输入、步骤、质量门、异常、记录和责任人描述一条端到端流程，不把关键判断藏在创始人脑中。",
        objectives: ["识别值得系统化的高频流程", "设置正常与异常路径", "让另一位伙伴按 SOP 完成并回传偏差"],
        practice: "选择一条客户交付流程写成 SOP，邀请非作者试运行一次，用偏差完成 v2。",
        deliverable: "端到端交付 SOP 与质量检查表",
        sources: [source.opc, source.para, source.strategyzerTest],
      },
      {
        id: "growth-03",
        title: "协同化：AI、伙伴与专家的 Who 矩阵",
        duration: "38 分钟",
        xp: 65,
        summary: "按风险、频率、可逆性和专业资质，把任务分给本人、AI、伙伴或专家，并为每次交接写清权限和验收。",
        objectives: ["保留链主必须承担的判断", "为 AI 设置评估与数据边界", "为伙伴定义成果、节点和升级路径"],
        practice: "把一个高频交付拆成四类角色节点，为每个节点写输入、输出、权限、证据和失败升级。",
        deliverable: "Who 矩阵与伙伴服务协议卡",
        sources: [source.opc, source.gettingReal, source.openaiPrompting, source.pipl],
      },
      {
        id: "growth-04",
        title: "链主经营：周复盘、月迭代、季度下注",
        duration: "36 分钟",
        xp: 65,
        summary: "把 Shape Up 的 Bet 与 Hill Chart 用于个人公司：用现金、客户结果、交付容量与资产复用管理节奏，每周期只做有边界的下注。",
        objectives: ["建立个人公司六指标驾驶舱", "用 Hill Chart 复盘未知而非忙碌", "每周期只选择一个主下注"],
        practice: "完成周复盘与月度经营会，为下一周期确定 1 个主下注、3 个护栏指标、风险山丘与停止项。",
        deliverable: "个人公司经营驾驶舱、Hill Chart 与 12 周下注卡",
        sources: [source.analytics, source.shapeBets, source.shapeProgress, source.strategyzerTest, source.opc],
      },
    ],
  },
  {
    id: "opc",
    number: "08",
    eyebrow: "远航仙 · 先赢一个市场，再谈全球",
    title: "出海与全球化经营",
    subtitle: "从市场选择、本地化、定价支付到隐私合规与渠道冷启动，完成一次低风险单市场试航。",
    weeks: "第 12 周",
    color: "#1a2838",
    outcome: "做出一个能在目标国家被理解、被购买、被合规交付的出海版本。",
    deliverable: "单市场出海作战书 + 本地化样板 + 全球化毕业发布",
    lessons: [
      {
        id: "opc-01",
        title: "选择第一个海外市场：只打一口井",
        duration: "34 分钟",
        xp: 60,
        summary: "用需求信号、支付能力、可触达性、竞争强度、语言文化、监管成本和自身优势比较候选市场。",
        objectives: ["建立国家机会评分卡", "区分顺手接单与主动出海", "确定一个细分人群和一个进入假设"],
        practice: "比较 3 个候选国家，每项判断附来源、日期和不确定性，最后只选 1 个试航市场。",
        deliverable: "海外市场评分卡与进入假设",
        sources: [source.tradeExportPlan, source.tradeMarkets, source.tradeVideos],
      },
      {
        id: "opc-02",
        title: "从翻译到本地化：重做价值抵达路径",
        duration: "38 分钟",
        xp: 70,
        summary: "本地化不只换语言，还包括场景、案例、信任信号、日期姓名格式、客服方式和跨文化沟通。",
        objectives: ["区分国际化与本地化", "用当地用户验证核心承诺", "建立品牌不变项与市场可变项"],
        practice: "完成目标市场落地页，邀请 5 位当地或熟悉当地文化的用户做理解测试。",
        deliverable: "本地化落地页与文化适配清单",
        sources: [source.w3cI18n, source.tradeMarkets, source.wcag],
      },
      {
        id: "opc-03",
        title: "海外定价、支付与税务链路",
        duration: "32 分钟",
        xp: 60,
        summary: "同时设计展示币种、收款币种、结算币种、退款、拒付、平台费、汇兑和数字服务税务适用性。",
        objectives: ["画清跨境资金流", "用当地购买力和价值重新定价", "识别支付、税务和合同的专家复核点"],
        practice: "为一个真实订单计算从标价到到账的全链成本，并模拟支付失败、退款和争议处理。",
        deliverable: "跨境定价表与资金流风险图",
        sources: [source.stripeCurrencies, source.oecdVat, source.tradeExportPlan],
      },
      {
        id: "opc-04",
        title: "合规冷启动：完成一次单市场试航",
        duration: "45 分钟",
        xp: 100,
        summary: "把中国数据出境义务、目标市场隐私规则、合同知识产权、渠道伙伴尽调与售后责任放进试航门禁。",
        objectives: ["建立跨境数据与隐私适用性清单", "设计当地伙伴和渠道冷启动", "用真实线索、交易或明确拒绝完成毕业答辩"],
        practice: "面向目标市场完成 20 次精准触达、5 次访谈或演示、1 次真实付费/意向金，或形成有证据的停止决定。",
        deliverable: "单市场试航报告与全球化毕业作品",
        sources: [source.cacCrossborder, source.edpbTerritorial, source.tradeMarkets, source.opc],
      },
    ],
  },
];

export const allLessons = courseStages.flatMap((stage) =>
  stage.lessons.map((lesson) => ({ ...lesson, stageId: stage.id, stageTitle: stage.title })),
);

export const totalXp = allLessons.reduce((total, lesson) => total + lesson.xp, 0);

export const praiseMessages = [
  "你愿意把问题看清楚，这已经超过了大多数只急着找答案的人。",
  "今天的你不是来刷进度的，你是在为未来的自己增加一种选择。",
  "你对真实结果的坚持，很适合成为一个有作品的超级个体。",
  "你已经在行动了。小步但真实，永远比完美但没发生更有力量。",
  "你的经验不是零散经历，它正在被你整理成可以反复创造价值的方法。",
  "你认真完成的每一个小练习，都会变成下一次判断更快、更稳的底气。",
  "你有把复杂事情变清楚的能力，今天再给它一次被看见的机会。",
  "不需要一次改变全部。你今天愿意推进一小步，就值得被好好夸赞。",
  "你正在建立的不是一门技能，而是一套能带你穿过变化的能力系统。",
  "能持续学习、持续交付、持续复盘的人，本身就是稀缺资源。",
  "你的好奇心正在喂饱小晴，也正在把你带向更宽的可能。",
  "你选择回来继续，这份稳定比偶尔的爆发更值得庆祝。",
];

export const buddyLevels = [
  { level: 1, name: "初见伙伴", min: 0, max: 149, note: "开始收藏第一个问题" },
  { level: 2, name: "好奇芽", min: 150, max: 349, note: "能把经验整理成方法" },
  { level: 3, name: "求知星", min: 350, max: 699, note: "开始用证据理解市场" },
  { level: 4, name: "实践派", min: 700, max: 1099, note: "能把想法做成产品" },
  { level: 5, name: "创造者", min: 1100, max: 1599, note: "完成上线与真实交付" },
  { level: 6, name: "超级个体", min: 1600, max: 1899, note: "拥有自己的经营闭环" },
  { level: 7, name: "链主伙伴", min: 1900, max: Number.POSITIVE_INFINITY, note: "连接人与 AI 共同成长" },
];

export function getBuddyLevel(xp: number) {
  return buddyLevels.find((item) => xp >= item.min && xp <= item.max) ?? buddyLevels[0];
}

export function getDailyPraise(userId: string, date: string) {
  const seed = `${userId}-${date}`
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  return praiseMessages[seed % praiseMessages.length];
}
