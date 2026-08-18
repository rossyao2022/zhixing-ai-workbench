import type { Locale } from "./i18n";

type LocalizedCopy = Record<Locale, string>;
type LocalizedList = Record<Locale, string[]>;

export type MethodFramework = {
  id: "yc" | "jason-cohen" | "shape-up" | "para";
  index: string;
  label: string;
  authors: string;
  stages: string[];
  name: LocalizedCopy;
  thesis: LocalizedCopy;
  practices: LocalizedList;
  output: LocalizedCopy;
  sources: { label: string; url: string }[];
};

export const methodFrameworks: MethodFramework[] = [
  {
    id: "yc",
    index: "01",
    label: "CUSTOMER EVIDENCE",
    authors: "Y Combinator · Paul Graham",
    stages: ["01", "02", "03", "06"],
    name: {
      "zh-CN": "用客户证据启动",
      en: "Start with customer evidence",
      es: "Empieza con evidencia del cliente",
      hi: "ग्राहक प्रमाण से शुरुआत",
      ar: "ابدأ بأدلة العملاء",
    },
    thesis: {
      "zh-CN": "先上线、亲自接触早期客户，找到少数真正离不开产品的人；产品市场匹配之前，不用规模掩盖未知。",
      en: "Launch, recruit early customers yourself, and find a small group who truly need the product before scaling.",
      es: "Publica, consigue personalmente a los primeros clientes y encuentra un grupo pequeño que necesite el producto antes de escalar.",
      hi: "लॉन्च करें, शुरुआती ग्राहक स्वयं खोजें और विस्तार से पहले ऐसे छोटे समूह को पाएं जिसे उत्पाद सच में चाहिए।",
      ar: "أطلق المنتج، وابحث بنفسك عن العملاء الأوائل، وحدد مجموعة صغيرة تحتاجه فعلاً قبل التوسع.",
    },
    practices: {
      "zh-CN": ["立即上线一个可验证版本", "创始人亲自找到前 10–100 位客户", "用发布—访谈—改进形成证据循环"],
      en: ["Ship a testable version now", "Personally recruit the first 10–100 customers", "Run a ship–talk–learn evidence loop"],
      es: ["Publica ya una versión comprobable", "Consigue personalmente los primeros 10–100 clientes", "Repite publicar–hablar–aprender"],
      hi: ["अभी परीक्षण योग्य संस्करण जारी करें", "पहले 10–100 ग्राहक स्वयं खोजें", "लॉन्च–बात–सीख चक्र चलाएं"],
      ar: ["أطلق نسخة قابلة للاختبار الآن", "استقطب أول 10–100 عميل بنفسك", "كرر دورة الإطلاق والحوار والتعلم"],
    },
    output: {
      "zh-CN": "客户原话、真实行为与付费证据",
      en: "Customer words, behavior and payment evidence",
      es: "Palabras, conducta y evidencia de pago",
      hi: "ग्राहक के शब्द, व्यवहार और भुगतान प्रमाण",
      ar: "كلمات العميل وسلوكه ودليل الدفع",
    },
    sources: [
      { label: "YC · Essential Startup Advice", url: "https://www.ycombinator.com/blog/ycs-essential-startup-advice/" },
      { label: "Paul Graham · Do Things That Don't Scale", url: "https://paulgraham.com/ds.html" },
    ],
  },
  {
    id: "jason-cohen",
    index: "02",
    label: "BUSINESS REALITY",
    authors: "Jason Cohen · A Smart Bear",
    stages: ["01", "02", "03", "06"],
    name: {
      "zh-CN": "让商业判断过真",
      en: "Make the business case real",
      es: "Haz real el caso de negocio",
      hi: "व्यवसाय की सच्चाई जाँचें",
      ar: "اختبر حقيقة العمل",
    },
    thesis: {
      "zh-CN": "把个人、市场、客户与产品匹配连起来；首版要简单、讨喜且完整，并把创始人时间算进真实利润。",
      en: "Connect founder, market, customer and product fit; ship something simple, lovable and complete, then count founder time in profit.",
      es: "Conecta el encaje personal, de mercado, cliente y producto; entrega algo simple, atractivo y completo, incluyendo tu tiempo en el beneficio.",
      hi: "संस्थापक, बाज़ार, ग्राहक और उत्पाद फिट जोड़ें; सरल, प्रिय और पूर्ण संस्करण बनाएं और अपने समय को लाभ में गिनें।",
      ar: "اربط ملاءمة المؤسس والسوق والعميل والمنتج؛ وقدّم نسخة بسيطة ومحبوبة ومتكاملة واحسب وقتك ضمن الربح.",
    },
    practices: {
      "zh-CN": ["排查个人—市场—客户匹配", "用 SLC 完整解决一个任务", "以付费、留存和真实利润校验价值"],
      en: ["Audit founder–market–customer fit", "Complete one job with an SLC", "Validate with payment, retention and true profit"],
      es: ["Audita el encaje fundador–mercado–cliente", "Completa una tarea con un SLC", "Valida con pago, retención y beneficio real"],
      hi: ["संस्थापक–बाज़ार–ग्राहक फिट जाँचें", "SLC से एक काम पूरा करें", "भुगतान, रिटेंशन और वास्तविक लाभ से जाँचें"],
      ar: ["راجع ملاءمة المؤسس والسوق والعميل", "أنجز مهمة واحدة عبر SLC", "تحقق بالدفع والاحتفاظ والربح الحقيقي"],
    },
    output: {
      "zh-CN": "PMF 路线图、SLC 边界与真实损益底线",
      en: "PMF roadmap, SLC boundary and true profit floor",
      es: "Ruta PMF, límites SLC y umbral de beneficio real",
      hi: "PMF रोडमैप, SLC सीमा और वास्तविक लाभ स्तर",
      ar: "خارطة PMF وحدود SLC والحد الأدنى للربح الحقيقي",
    },
    sources: [
      { label: "Jason Cohen · PMF Roadmap", url: "https://longform.asmartbear.com/product-market-fit-formula/" },
      { label: "Jason Cohen · Simple, Lovable, Complete", url: "https://longform.asmartbear.com/slc/" },
    ],
  },
  {
    id: "shape-up",
    index: "03",
    label: "SCOPED EXECUTION",
    authors: "Jason Fried · Ryan Singer · 37signals",
    stages: ["03", "04", "05", "07"],
    name: {
      "zh-CN": "用边界完成产品",
      en: "Finish products through constraints",
      es: "Termina productos mediante límites",
      hi: "सीमाओं से उत्पाद पूरा करें",
      ar: "أنهِ المنتج عبر القيود",
    },
    thesis: {
      "zh-CN": "小团队把限制当作优势：先定时间胃口，再塑形解法、标出风险洞与不做项；固定时间、可变范围。",
      en: "Small teams turn constraints into leverage: set an appetite, shape the solution, expose risks and no-gos, then vary scope—not time.",
      es: "Los equipos pequeños convierten límites en ventaja: fija el apetito, da forma a la solución, expón riesgos y ajusta el alcance, no el tiempo.",
      hi: "छोटी टीम सीमाओं को लाभ बनाती है: समय-सीमा तय करें, समाधान आकार दें, जोखिम दिखाएं और समय नहीं, दायरा बदलें।",
      ar: "تحوّل الفرق الصغيرة القيود إلى ميزة: حدد شهية الوقت، وشكّل الحل، واكشف المخاطر، وغيّر النطاق لا الوقت.",
    },
    practices: {
      "zh-CN": ["用 Appetite 代替虚假工期估算", "Pitch 写清问题、解法、风险洞与 No-gos", "用 Hill Chart 区分未知与执行"],
      en: ["Use appetite instead of false estimates", "Pitch the problem, solution, rabbit holes and no-gos", "Use a Hill Chart to separate unknowns from execution"],
      es: ["Usa apetito, no estimaciones falsas", "Define problema, solución, riesgos y no-gos", "Separa incógnitas y ejecución con Hill Chart"],
      hi: ["झूठे अनुमान की जगह appetite तय करें", "समस्या, समाधान, जोखिम और no-gos लिखें", "Hill Chart से अज्ञात और निष्पादन अलग करें"],
      ar: ["استخدم شهية الوقت بدلاً من التقديرات الوهمية", "حدد المشكلة والحل والمخاطر وما لن يُنفذ", "افصل المجهول عن التنفيذ بمخطط التل"],
    },
    output: {
      "zh-CN": "1–2 周个人下注卡、粗粒度方案与风险山丘图",
      en: "A 1–2 week solo bet, rough solution and risk Hill Chart",
      es: "Una apuesta individual de 1–2 semanas, solución aproximada y Hill Chart",
      hi: "1–2 सप्ताह का एकल दांव, मोटा समाधान और जोखिम Hill Chart",
      ar: "رهان فردي لأسبوع أو أسبوعين وحل أولي ومخطط مخاطر",
    },
    sources: [
      { label: "Ryan Singer · Shape Up", url: "https://basecamp.com/shapeup" },
      { label: "37signals · Getting Real", url: "https://basecamp.com/gettingreal" },
    ],
  },
  {
    id: "para",
    index: "04",
    label: "KNOWLEDGE COMPOUNDING",
    authors: "Tiago Forte · Building a Second Brain",
    stages: ["02", "05", "07", "08"],
    name: {
      "zh-CN": "把交付沉淀为资产",
      en: "Turn delivery into reusable assets",
      es: "Convierte entregas en activos reutilizables",
      hi: "डिलीवरी को पुन: उपयोगी संपत्ति बनाएं",
      ar: "حوّل التسليم إلى أصول قابلة لإعادة الاستخدام",
    },
    thesis: {
      "zh-CN": "知识按行动组织，而不是按学科囤积：当前项目优先，长期责任可见，资源随用随取，完成项及时归档。",
      en: "Organise knowledge for action, not collection: prioritise current projects, keep responsibilities visible, retrieve resources and archive completed work.",
      es: "Organiza el conocimiento para actuar: prioriza proyectos, mantén visibles las responsabilidades, recupera recursos y archiva lo terminado.",
      hi: "ज्ञान को संग्रह नहीं, कार्रवाई के लिए व्यवस्थित करें: प्रोजेक्ट, जिम्मेदारियाँ, संसाधन और अभिलेख स्पष्ट रखें।",
      ar: "نظّم المعرفة للعمل لا للتكديس: قدّم المشاريع الحالية، وأظهر المسؤوليات، واسترجع الموارد، وأرشف المنجز.",
    },
    practices: {
      "zh-CN": ["Projects 承载当前成果", "Areas 守住长期经营责任", "Resources 与 Archives 形成可检索资产库"],
      en: ["Projects hold current outcomes", "Areas protect ongoing responsibilities", "Resources and Archives form a retrievable asset base"],
      es: ["Projects contiene resultados actuales", "Areas protege responsabilidades continuas", "Resources y Archives forman una base recuperable"],
      hi: ["Projects में वर्तमान परिणाम रखें", "Areas में दीर्घ जिम्मेदारियाँ रखें", "Resources और Archives को खोज योग्य बनाएं"],
      ar: ["تضم Projects النتائج الحالية", "تحمي Areas المسؤوليات المستمرة", "تشكّل Resources وArchives قاعدة قابلة للاسترجاع"],
    },
    output: {
      "zh-CN": "项目证据、模板、SOP、案例与版本归档",
      en: "Project evidence, templates, SOPs, cases and version archive",
      es: "Evidencia, plantillas, SOP, casos y archivo de versiones",
      hi: "प्रोजेक्ट प्रमाण, टेम्पलेट, SOP, केस और संस्करण अभिलेख",
      ar: "أدلة المشاريع والقوالب وإجراءات التشغيل والحالات وأرشيف الإصدارات",
    },
    sources: [
      { label: "Tiago Forte · PARA", url: "https://fortelabs.com/blog/para/" },
      { label: "Forte Labs · PARA for organisations", url: "https://fortelabs.com/blog/team-knowledge-management-how-to-use-para-in-your-organization/" },
    ],
  },
];

export const methodUi: Record<Locale, {
  eyebrow: string;
  title: string;
  description: string;
  principles: string;
  output: string;
  source: string;
  stages: string;
  workbenchEyebrow: string;
  workbenchTitle: string;
  workbenchDescription: string;
  loop: string;
}> = {
  "zh-CN": {
    eyebrow: "SOLO COMPANY METHOD STACK",
    title: "四套方法，合成一套个人公司操作系统",
    description: "不是抄文章，也不是多记几个名词。每套方法只负责它最擅长的一段，并被改造成课程练习、证据与经营资产。",
    principles: "本课采用",
    output: "转化成你的产出",
    source: "阅读一手原文",
    stages: "应用阶段",
    workbenchEyebrow: "ONE-PERSON WORKBENCH",
    workbenchTitle: "每学一课，都进入同一个经营工作台",
    workbenchDescription: "知识不再散落在笔记里。当前成果、长期责任、可复用资源和历史证据各归其位，下一次交付可以直接调用。",
    loop: "课程 → 练习 → 真实证据 → 模板 / SOP → 下一次复用",
  },
  en: {
    eyebrow: "SOLO COMPANY METHOD STACK", title: "Four methods, one solo-company operating system", description: "Each framework does the job it is best at, then becomes a course exercise, evidence and an operating asset.", principles: "Use in this course", output: "Your resulting asset", source: "Read the primary source", stages: "Stages", workbenchEyebrow: "ONE-PERSON WORKBENCH", workbenchTitle: "Every lesson enters one operating workbench", workbenchDescription: "Keep current outcomes, ongoing responsibilities, reusable resources and historical evidence ready for the next delivery.", loop: "Lesson → practice → evidence → template / SOP → reuse",
  },
  es: {
    eyebrow: "MÉTODOS PARA UNA EMPRESA INDIVIDUAL", title: "Cuatro métodos, un sistema operativo individual", description: "Cada marco hace lo que mejor sabe y se convierte en práctica, evidencia y activo operativo.", principles: "Aplicación", output: "Activo resultante", source: "Leer fuente primaria", stages: "Etapas", workbenchEyebrow: "BANCO DE TRABAJO INDIVIDUAL", workbenchTitle: "Cada lección entra en un único espacio operativo", workbenchDescription: "Mantén resultados, responsabilidades, recursos y evidencia listos para la siguiente entrega.", loop: "Lección → práctica → evidencia → plantilla / SOP → reutilizar",
  },
  hi: {
    eyebrow: "SOLO COMPANY METHOD STACK", title: "चार तरीके, एक एकल-कंपनी संचालन तंत्र", description: "हर फ्रेमवर्क अपना सर्वश्रेष्ठ काम करता है और अभ्यास, प्रमाण व संचालन संपत्ति बनता है।", principles: "इस पाठ में उपयोग", output: "आपकी संपत्ति", source: "मूल स्रोत पढ़ें", stages: "चरण", workbenchEyebrow: "ONE-PERSON WORKBENCH", workbenchTitle: "हर पाठ एक ही संचालन कार्यस्थल में", workbenchDescription: "वर्तमान परिणाम, जिम्मेदारियाँ, संसाधन और प्रमाण अगली डिलीवरी के लिए तैयार रखें।", loop: "पाठ → अभ्यास → प्रमाण → टेम्पलेट / SOP → पुन: उपयोग",
  },
  ar: {
    eyebrow: "حزمة منهجيات الشركة الفردية", title: "أربع منهجيات ونظام تشغيل واحد", description: "تؤدي كل منهجية ما تتقنه ثم تتحول إلى تمرين ودليل وأصل تشغيلي.", principles: "يُستخدم في الدرس", output: "الأصل الناتج", source: "اقرأ المصدر الأصلي", stages: "المراحل", workbenchEyebrow: "مساحة عمل الفرد الواحد", workbenchTitle: "كل درس يدخل مساحة تشغيل واحدة", workbenchDescription: "اجعل النتائج والمسؤوليات والموارد والأدلة جاهزة للتسليم التالي.", loop: "درس ← تطبيق ← دليل ← قالب / إجراء ← إعادة استخدام",
  },
};

export const workbenchLanes = [
  {
    id: "projects",
    code: "NOW",
    title: { "zh-CN": "当前项目", en: "Projects", es: "Proyectos", hi: "प्रोजेक्ट", ar: "المشاريع" } as LocalizedCopy,
    description: { "zh-CN": "未来 12 周唯一成果、最大未知与当前下注。", en: "The one 12-week outcome, biggest unknown and current bet.", es: "El único resultado de 12 semanas, la mayor incógnita y la apuesta actual.", hi: "12 सप्ताह का एक परिणाम, सबसे बड़ा अज्ञात और वर्तमान दांव।", ar: "نتيجة الأسابيع الاثني عشر والمجهول الأكبر والرهان الحالي." } as LocalizedCopy,
  },
  {
    id: "areas",
    code: "RUN",
    title: { "zh-CN": "经营责任区", en: "Areas", es: "Áreas", hi: "क्षेत्र", ar: "المجالات" } as LocalizedCopy,
    description: { "zh-CN": "客户、产品、现金、交付、合规与个人能量的健康底线。", en: "Health floors for customers, product, cash, delivery, compliance and energy.", es: "Mínimos saludables de clientes, producto, caja, entrega, cumplimiento y energía.", hi: "ग्राहक, उत्पाद, नकदी, डिलीवरी, अनुपालन और ऊर्जा की न्यूनतम सेहत।", ar: "حدود صحة العملاء والمنتج والنقد والتسليم والامتثال والطاقة." } as LocalizedCopy,
  },
  {
    id: "resources",
    code: "LIBRARY",
    title: { "zh-CN": "可复用资源", en: "Resources", es: "Recursos", hi: "संसाधन", ar: "الموارد" } as LocalizedCopy,
    description: { "zh-CN": "调研原文、提示词、组件、模板、报价单与检查表。", en: "Research, prompts, components, templates, offers and checklists.", es: "Investigación, prompts, componentes, plantillas, ofertas y listas.", hi: "रिसर्च, प्रॉम्प्ट, घटक, टेम्पलेट, ऑफर और चेकलिस्ट।", ar: "الأبحاث والموجهات والمكونات والقوالب والعروض وقوائم الفحص." } as LocalizedCopy,
  },
  {
    id: "archives",
    code: "ASSETS",
    title: { "zh-CN": "证据与资产", en: "Archives", es: "Archivos", hi: "अभिलेख", ar: "الأرشيف" } as LocalizedCopy,
    description: { "zh-CN": "已上线版本、真实反馈、成交案例、SOP 与复盘结论。", en: "Shipped versions, feedback, sales cases, SOPs and retrospectives.", es: "Versiones publicadas, feedback, ventas, SOP y retrospectivas.", hi: "लॉन्च संस्करण, प्रतिक्रिया, बिक्री केस, SOP और समीक्षा।", ar: "الإصدارات المنشورة والملاحظات وحالات البيع والإجراءات والمراجعات." } as LocalizedCopy,
  },
];

export function localizeMethod(framework: MethodFramework, locale: Locale) {
  return {
    ...framework,
    name: framework.name[locale],
    thesis: framework.thesis[locale],
    practices: framework.practices[locale],
    output: framework.output[locale],
  };
}
