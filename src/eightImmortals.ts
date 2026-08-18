export type ImmortalProfile = {
  stageId: string;
  number: string;
  name: string;
  glyph: string;
  domain: string;
  mission: string;
  keyQuestion: string;
  opcAsset: string;
};

export const eightImmortals: ImmortalProfile[] = [
  {
    stageId: "identity",
    number: "第一仙",
    name: "定盘仙",
    glyph: "定",
    domain: "战略与商业模式",
    mission: "选择值得投入的战场，把个人优势变成可验证的商业假设。",
    keyQuestion: "我为什么做、为谁做、凭什么赢？",
    opcAsset: "战略一页纸与 12 周主下注",
  },
  {
    stageId: "research",
    number: "第二仙",
    name: "探潮仙",
    glyph: "探",
    domain: "市场与客户洞察",
    mission: "用一手证据辨认需求潮汐，不拿搜索热度代替客户事实。",
    keyQuestion: "谁正在为什么问题付出真实成本？",
    opcAsset: "市场证据库与访谈洞察图",
  },
  {
    stageId: "product",
    number: "第三仙",
    name: "造物仙",
    glyph: "造",
    domain: "产品与最小验证",
    mission: "把洞察做成客户能使用、愿意承诺并可快速迭代的产品。",
    keyQuestion: "最小用什么证明价值成立？",
    opcAsset: "产品简报、MVP 与验证记录",
  },
  {
    stageId: "design",
    number: "第四仙",
    name: "焕颜仙",
    glyph: "焕",
    domain: "品牌、内容与体验",
    mission: "让价值被看懂、被信任、被记住，并在每个触点保持一致。",
    keyQuestion: "用户为什么愿意相信并继续行动？",
    opcAsset: "品牌语言、体验规范与组件系统",
  },
  {
    stageId: "build",
    number: "第五仙",
    name: "巧筑仙",
    glyph: "筑",
    domain: "AI 技术与上线发布",
    mission: "用规格、评估和发布门禁，把 AI 变成可靠的生产伙伴。",
    keyQuestion: "怎样让想法安全上线且可继续维护？",
    opcAsset: "任务合同、代码资产与发布手册",
  },
  {
    stageId: "launch",
    number: "第六仙",
    name: "点金仙",
    glyph: "金",
    domain: "商业化与客户成功",
    mission: "把能力变成可报价产品，完成从线索、成交到续费的价值交换。",
    keyQuestion: "客户为什么付费，怎样持续兑现结果？",
    opcAsset: "报价单、销售脚本与客户成功手册",
  },
  {
    stageId: "growth",
    number: "第七仙",
    name: "链主仙",
    glyph: "链",
    domain: "OPC 系统与运营增长",
    mission: "把经验变成资产、流程和伙伴网络，让一人公司持续复利。",
    keyQuestion: "怎样让业务不只依赖本人在线？",
    opcAsset: "资产地图、协作协议与经营驾驶舱",
  },
  {
    stageId: "opc",
    number: "第八仙",
    name: "远航仙",
    glyph: "航",
    domain: "出海与全球化",
    mission: "以一个国家、一个细分人群、一次真实成交完成低风险试航。",
    keyQuestion: "先去哪、改什么、怎样合规收款与交付？",
    opcAsset: "单市场出海作战书与合规清单",
  },
];

export const immortalByStage = Object.fromEntries(
  eightImmortals.map((item) => [item.stageId, item]),
) as Record<string, ImmortalProfile>;

export const qingmiEightContract = [
  "角色",
  "目标",
  "受众",
  "输入",
  "约束",
  "步骤",
  "输出",
  "验收",
];
