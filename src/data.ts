export type WorkStatus = '需要你' | '自动推进中' | '等待外部' | '有风险' | '已完成'

export type Work = {
  id: string
  title: string
  stage: string
  status: WorkStatus
  summary: string
  outcome: string
  next: string
  updated: string
  accent: 'blue' | 'green' | 'purple' | 'orange'
}

export type Course = {
  id: string
  title: string
  direction: string
  level: string
  teacher: string
  lessons: number
  cost: number
  progress: number
  owned: boolean
  cover: string
  description: string
}

export type Activity = {
  id: number
  time: string
  title: string
  detail: string
  source: string
  type: 'AI 执行' | '你的操作' | '外部反馈' | '学习活动'
}

export const initialWorks: Work[] = [
  {
    id: 'website', title: '产品官网改版', stage: '结构设计', status: '需要你',
    summary: 'AI 已完成网站地图和首页结构，需要你确认四个栏目的优先级。',
    outcome: '网站地图 v1.2 · 首页结构草图', next: '确认导航栏目优先级', updated: '今天 10:30', accent: 'blue',
  },
  {
    id: 'ppt', title: '客户方案制作', stage: '内容制作', status: '需要你',
    summary: '初稿已完成，但缺少两个真实客户案例的数据。',
    outcome: '方案初稿 · 12 页', next: '补充案例资料', updated: '今天 09:20', accent: 'green',
  },
  {
    id: 'research', title: '竞品研究', stage: '分析研究', status: '需要你',
    summary: '主要竞品分析已经完成，需要你选择下一步重点方向。',
    outcome: '竞品对比报告 · 3 个建议方向', next: '选择重点方向', updated: '今天 08:45', accent: 'purple',
  },
  {
    id: 'manual', title: '用户手册编写', stage: '内容编写', status: '自动推进中',
    summary: 'AI 正在撰写章节内容并准备示例截图。', outcome: '完成 6 个章节', next: '生成示例与截图', updated: '昨天 16:20', accent: 'blue',
  },
  {
    id: 'market', title: '市场数据分析', stage: '数据分析', status: '自动推进中',
    summary: '最新市场数据已经清洗完毕，正在生成洞察。', outcome: '数据表与 4 张图表', next: '形成分析结论', updated: '昨天 15:40', accent: 'green',
  },
  {
    id: 'mail', title: '客户邮件回复整理', stage: '等待回复', status: '等待外部',
    summary: '报价邮件已经发出，正在等待客户确认。', outcome: '报价方案 v3', next: '等待客户回复', updated: '周五 11:05', accent: 'orange',
  },
  {
    id: 'archive', title: '品牌素材归档', stage: '归档', status: '已完成',
    summary: '所有品牌文件已经按渠道和用途完成整理。', outcome: '归档 86 个素材', next: '无需处理', updated: '周四 17:30', accent: 'purple',
  },
]

export const initialCourses: Course[] = [
  { id: 'design', title: 'AI+设计实战', direction: 'AI+设计', level: '入门', teacher: '李老师', lessons: 12, cost: 980, progress: 62, owned: true, cover: 'design', description: '从提示词、版式到商用版权，系统掌握 AI 设计的完整工作方法。' },
  { id: 'ecommerce', title: 'AI 电商视觉实战', direction: 'AI+电商', level: '进阶', teacher: '周老师', lessons: 18, cost: 1200, progress: 0, owned: false, cover: 'commerce', description: '围绕商品主图、详情页和活动素材，建立可复用的电商视觉生产流程。' },
  { id: 'drama', title: 'AI 漫剧从 0 到 1', direction: 'AI+漫剧', level: '入门', teacher: '陈老师', lessons: 16, cost: 880, progress: 0, owned: false, cover: 'drama', description: '学会故事拆解、角色一致性与分镜生成，完成第一支 AI 漫剧。' },
  { id: 'writing', title: 'AI 写作与内容增长', direction: '职场', level: '入门', teacher: '赵老师', lessons: 10, cost: 680, progress: 100, owned: true, cover: 'writing', description: '用 AI 完成选题、结构、撰写和复盘，让内容生产更稳定。' },
  { id: 'reading', title: '高效学习习惯养成课', direction: '读书', level: '入门', teacher: '林老师', lessons: 8, cost: 0, progress: 25, owned: true, cover: 'reading', description: '建立能长期坚持的学习节奏，让输入真正转化为能力。' },
  { id: 'business', title: 'AI 商业提案进阶', direction: '职场', level: '进阶', teacher: '吴老师', lessons: 14, cost: 1080, progress: 0, owned: false, cover: 'business', description: '从调研、洞察到方案表达，完成更有说服力的商业提案。' },
]

export const initialActivities: Activity[] = [
  { id: 1, time: '10:30', title: '客户方案初稿已整理', detail: '已合并会议纪要与知识库资料，形成 12 页方案初稿。', source: '飞书知识库', type: 'AI 执行' },
  { id: 2, time: '11:20', title: '品牌素材完成归档', detail: '86 个素材已按渠道和用途整理，可直接查找和复用。', source: '自定义知识库', type: 'AI 执行' },
  { id: 3, time: '11:25', title: '整理两个改进方向', detail: 'AI 正在核对客户反馈与现有方案的影响。', source: '知行 AI', type: 'AI 执行' },
  { id: 4, time: '13:40', title: '客户确认收到样稿', detail: '客户提出两项版式优化建议。', source: '外部反馈', type: '外部反馈' },
  { id: 5, time: '15:10', title: '完成第 2 课学习', detail: '课程进度已更新，获得 30 积分。', source: '学习中心', type: '学习活动' },
]

export const tools = [
  { id: 'ai-design', name: 'AI 设计', short: '设', cost: 20, enabled: true, color: 'purple', desc: '海报、主图与版式生成', course: 'AI+设计实战' },
  { id: 'ai-commerce', name: 'AI 电商', short: '商', cost: 25, enabled: true, color: 'orange', desc: '商品卖点与电商素材', course: 'AI 电商视觉实战' },
  { id: 'ai-writing', name: 'AI 写作', short: '写', cost: 15, enabled: true, color: 'blue', desc: '文案、提案与内容整理', course: 'AI 写作与内容增长' },
  { id: 'class-helper', name: '课堂助手', short: '课', cost: 15, enabled: true, color: 'green', desc: '课件、练习与复习提纲', course: '高效学习习惯养成课' },
  { id: 'ai-drama', name: 'AI 漫剧', short: '剧', cost: 30, enabled: false, color: 'rose', desc: '角色、分镜与短剧生成', course: 'AI 漫剧从 0 到 1' },
]
