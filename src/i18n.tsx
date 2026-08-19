import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { CourseStage, Lesson } from "./courseData";
import type { ImmortalProfile } from "./eightImmortals";
import type { UserRole } from "./storage";
import { readLocalValue, writeLocalValue } from "./safeStorage";

export type Locale = "zh-CN" | "en" | "es" | "hi" | "ar";

export const localeOptions: { id: Locale; label: string; short: string; dir: "ltr" | "rtl" }[] = [
  { id: "zh-CN", label: "简体中文", short: "ZH", dir: "ltr" },
  { id: "en", label: "English", short: "EN", dir: "ltr" },
  { id: "es", label: "Español", short: "ES", dir: "ltr" },
  { id: "hi", label: "हिन्दी", short: "HI", dir: "ltr" },
  { id: "ar", label: "العربية", short: "AR", dir: "rtl" },
];

const LOCALE_STORAGE_KEY = "kuakua-ai.locale.v1";
const localeIndex: Record<Locale, number> = { "zh-CN": 0, en: 1, es: 2, hi: 3, ar: 4 };
type MessageTuple = readonly [string, string, string, string, string];

const messages: Record<string, MessageTuple> = {
  "meta.title": ["夸夸学习 AI · 超级个体产品全流程", "KuaKua AI · The Solo Company Product Journey", "KuaKua AI · Ruta de producto para empresas individuales", "KuaKua AI · एकल कंपनी उत्पाद यात्रा", "KuaKua AI · رحلة منتج الشركة الفردية"],
  "meta.description": ["从战略到出海，完成一个能卖、能交付、能复盘的超级个体业务。", "From strategy to global launch, build a solo business that sells, delivers and learns.", "De la estrategia a la expansión global: crea un negocio individual que vende, entrega y aprende.", "रणनीति से वैश्विक लॉन्च तक—ऐसा एकल व्यवसाय बनाएँ जो बेचता, डिलीवर करता और सीखता है।", "من الاستراتيجية إلى الانطلاق العالمي: ابنِ عملاً فردياً يبيع وينفّذ ويتعلّم."],
  "language.label": ["语言", "Language", "Idioma", "भाषा", "اللغة"],
  "language.change": ["切换语言", "Change language", "Cambiar idioma", "भाषा बदलें", "تغيير اللغة"],
  "brand.name": ["夸夸学习 AI", "KuaKua Learning AI", "KuaKua Aprendizaje IA", "KuaKua लर्निंग AI", "KuaKua AI للتعلّم"],
  "brand.sub": ["晴幂科技 · happykua", "Qingmi Tech · happykua", "Qingmi Tech · happykua", "Qingmi Tech · happykua", "Qingmi Tech · happykua"],
  "nav.today": ["今日", "Today", "Hoy", "आज", "اليوم"],
  "nav.course": ["课程", "Courses", "Cursos", "पाठ्यक्रम", "الدورات"],
  "nav.journey": ["成长地图", "Journey", "Ruta", "यात्रा", "المسار"],
  "nav.buddy": ["小晴", "Xiaoqing", "Xiaoqing", "श्याओछिंग", "شياوتشينغ"],
  "nav.admin": ["角色管理", "Roles", "Roles", "भूमिकाएँ", "الأدوار"],
  "nav.profile": ["个人中心", "Profile", "Perfil", "प्रोफ़ाइल", "الملف الشخصي"],
  "nav.todayFull": ["今日学习", "Today's learning", "Aprendizaje de hoy", "आज की सीख", "تعلّم اليوم"],
  "nav.courseFull": ["课程中心", "Course studio", "Centro de cursos", "पाठ्यक्रम केंद्र", "مركز الدورات"],
  "nav.buddyFull": ["知识伙伴小晴", "Knowledge buddy Xiaoqing", "Compañera Xiaoqing", "ज्ञान साथी श्याओछिंग", "رفيقة المعرفة شياوتشينغ"],
  "nav.menu": ["打开导航菜单", "Open navigation menu", "Abrir menú", "नेविगेशन खोलें", "فتح قائمة التنقل"],
  "nav.main": ["主导航", "Main navigation", "Navegación principal", "मुख्य नेविगेशन", "التنقل الرئيسي"],
  "nav.mobile": ["移动端主导航", "Mobile navigation", "Navegación móvil", "मोबाइल नेविगेशन", "تنقل الهاتف"],
  "nav.mapShort": ["地图", "Journey", "Ruta", "यात्रा", "المسار"],
  "nav.adminShort": ["管理", "Admin", "Admin", "एडमिन", "الإدارة"],
  "nav.mine": ["我的", "Me", "Yo", "मैं", "حسابي"],
  "nav.homeAria": ["回到首页", "Back to home", "Volver al inicio", "होम पर लौटें", "العودة للرئيسية"],
  "nav.profileAria": ["打开个人中心", "Open profile", "Abrir perfil", "प्रोफ़ाइल खोलें", "فتح الملف الشخصي"],
  "nav.membership": ["会员", "Membership", "Membresía", "सदस्यता", "العضوية"],
  "common.xp": ["知识值", "Knowledge XP", "XP de conocimiento", "ज्ञान XP", "نقاط المعرفة"],
  "common.completed": ["已完成", "Completed", "Completado", "पूर्ण", "مكتمل"],
  "common.start": ["开始学习", "Start lesson", "Empezar", "सीखना शुरू करें", "ابدأ الدرس"],
  "common.close": ["关闭", "Close", "Cerrar", "बंद करें", "إغلاق"],
  "common.cancel": ["取消", "Cancel", "Cancelar", "रद्द करें", "إلغاء"],
  "common.preview": ["预览版", "Preview", "Vista previa", "प्रीव्यू", "نسخة تجريبية"],
  "common.lessons": ["课节", "lessons", "lecciones", "पाठ", "درساً"],
  "common.days": ["{count} 天", "{count} days", "{count} días", "{count} दिन", "{count} أيام"],
  "common.progress": ["完成 {value}%", "{value}% complete", "{value}% completado", "{value}% पूर्ण", "اكتمل {value}%"],
  "service.unavailable": ["服务暂时不可用，请稍后重试", "The service is temporarily unavailable. Please try again.", "El servicio no está disponible temporalmente. Inténtalo de nuevo.", "सेवा अभी उपलब्ध नहीं है। कृपया फिर प्रयास करें।", "الخدمة غير متاحة مؤقتاً. حاول مجدداً."],
  "service.sessionExpired": ["登录已过期，请重新登录", "Your session expired. Please sign in again.", "Tu sesión caducó. Inicia sesión de nuevo.", "आपका सत्र समाप्त हो गया। फिर से साइन इन करें।", "انتهت جلسة الدخول. سجّل الدخول مجدداً."],

  "membership.title": ["选择你的成长通行证", "Choose your growth pass", "Elige tu pase de crecimiento", "अपना ग्रोथ पास चुनें", "اختر بطاقة نموك"],
  "membership.description": ["免费浏览完整课程地图；成为会员后开始 32 节实战学习，并按会员等级使用 AI 陪练。", "Browse the full curriculum for free. Members unlock 32 practical lessons and AI coaching by tier.", "Explora gratis todo el plan. Los miembros desbloquean 32 lecciones y práctica con IA.", "पूरा पाठ्यक्रम मुफ्त देखें। सदस्य 32 व्यावहारिक पाठ और स्तर के अनुसार AI अभ्यास खोलते हैं।", "تصفّح المنهج كاملاً مجاناً. تفتح العضوية 32 درساً عملياً وتدريب الذكاء حسب الفئة."],
  "membership.gateKicker": ["会员学习空间", "Member learning studio", "Estudio para miembros", "सदस्य लर्निंग स्टूडियो", "استوديو تعلّم الأعضاء"],
  "membership.gateTitle": ["课程都看得到，开始学习需要会员", "Everything is visible; membership starts the learning", "Todo está visible; la membresía inicia el aprendizaje", "सब कुछ दिखता है; सीखना सदस्यता से शुरू होता है", "كل المحتوى ظاهر؛ وتبدأ الدراسة بالعضوية"],
  "membership.gateDesc": ["你仍可浏览 8 个阶段、32 节课和全部书单。开通 PRO 或 Max 后即可进入课程、提交作品并训练 AI 工具。", "You can still browse all 8 stages, 32 lessons and reading lists. PRO or Max unlocks lessons, evidence and AI tools.", "Puedes ver las 8 etapas, 32 lecciones y lecturas. PRO o Max abre las clases, entregas y herramientas de IA.", "आप 8 चरण, 32 पाठ और सभी पुस्तकें देख सकते हैं। PRO या Max पाठ, काम जमा करना और AI टूल खोलता है।", "يمكنك تصفّح المراحل الثماني و32 درساً والكتب. تفتح PRO أو Max الدروس والأعمال وأدوات الذكاء."],
  "membership.current": ["当前会员", "Current membership", "Membresía actual", "वर्तमान सदस्यता", "العضوية الحالية"],
  "membership.freeName": ["免费会员", "Free", "Gratis", "मुफ्त", "مجانية"],
  "membership.proName": ["PRO 会员", "PRO", "PRO", "PRO", "PRO"],
  "membership.maxName": ["Max 会员", "Max", "Max", "Max", "Max"],
  "membership.freeDesc": ["完整目录可见，学习与 AI 工具尚未开通。", "Full catalogue visible; lessons and AI tools are locked.", "Catálogo visible; clases y herramientas de IA bloqueadas.", "पूरा कैटलॉग दिखता है; पाठ और AI टूल बंद हैं।", "الفهرس كامل ظاهر؛ الدروس وأدوات الذكاء غير مفعّلة."],
  "membership.viewPlans": ["查看套餐", "View plans", "Ver planes", "प्लान देखें", "عرض الباقات"],
  "membership.until": ["有效期至 {date}", "Valid until {date}", "Válido hasta {date}", "{date} तक मान्य", "صالح حتى {date}"],
  "membership.active": ["会员权益已生效", "Membership active", "Membresía activa", "सदस्यता सक्रिय", "العضوية فعّالة"],
  "membership.aiBlocked": ["AI 陪练未开通", "AI coaching locked", "Práctica IA bloqueada", "AI अभ्यास बंद", "تدريب الذكاء غير مفعّل"],
  "membership.aiRemaining": ["本月 AI 剩余 {count} 次", "{count} AI runs left this month", "Quedan {count} usos de IA este mes", "इस माह {count} AI उपयोग शेष", "تبقّى {count} استخداماً للذكاء هذا الشهر"],
  "membership.aiUnlimited": ["AI 工具不限量", "Unlimited AI tools", "IA sin límite", "असीमित AI टूल", "أدوات ذكاء بلا حدود"],
  "membership.pricingTitle": ["一个会员，学习全部内容", "One pass, the complete learning journey", "Un pase para todo el recorrido", "एक पास, पूरी सीखने की यात्रा", "بطاقة واحدة لكل رحلة التعلّم"],
  "membership.pricingDesc": ["PRO 适合稳定训练，Max 适合高频使用 AI 的个人与团队。", "PRO supports steady practice; Max is for high-frequency AI work.", "PRO es para práctica constante; Max para uso intensivo de IA.", "PRO नियमित अभ्यास के लिए, Max उच्च आवृत्ति AI काम के लिए।", "PRO للتدريب المنتظم وMax للاستخدام المكثف للذكاء."],
  "membership.month": ["月", "month", "mes", "माह", "شهر"],
  "membership.year": ["年", "year", "año", "वर्ष", "سنة"],
  "membership.monthly": ["月度会员", "Monthly", "Mensual", "मासिक", "شهري"],
  "membership.yearly": ["年度会员", "Annual", "Anual", "वार्षिक", "سنوي"],
  "membership.bestValue": ["更划算", "Best value", "Mejor valor", "बेहतर मूल्य", "الأفضل قيمة"],
  "membership.select": ["选择套餐", "Choose plan", "Elegir plan", "प्लान चुनें", "اختر الباقة"],
  "membership.selected": ["已选择", "Selected", "Seleccionado", "चुना गया", "تم الاختيار"],
  "membership.proBenefitCourse": ["学习全部 32 节课程", "All 32 practical lessons", "Las 32 lecciones prácticas", "सभी 32 व्यावहारिक पाठ", "جميع الدروس العملية الـ32"],
  "membership.proBenefitAi": ["每月 {count} 次 AI 工具训练", "{count} AI training runs monthly", "{count} prácticas de IA al mes", "हर माह {count} AI अभ्यास", "{count} تدريب ذكاء شهرياً"],
  "membership.proBenefitGrowth": ["作品证据与成长记录", "Evidence and growth tracking", "Evidencia y seguimiento", "काम का प्रमाण और प्रगति", "أدلة العمل وتتبع النمو"],
  "membership.maxBenefitCourse": ["学习全部课程与更新", "All lessons and future updates", "Todas las clases y actualizaciones", "सभी पाठ और अपडेट", "كل الدروس والتحديثات"],
  "membership.maxBenefitAi": ["AI 工具不限量使用", "Unlimited AI tools", "Herramientas IA ilimitadas", "असीमित AI टूल", "أدوات ذكاء بلا حدود"],
  "membership.maxBenefitPriority": ["适合高频训练与团队主理人", "For power users and team leads", "Para uso intensivo y líderes", "गहन उपयोग और टीम लीड के लिए", "للاستخدام المكثف وقادة الفرق"],

  "payment.account": ["晴幂科技 · 企业收款", "Qingmi Tech · Company payment", "Qingmi Tech · Cobro empresarial", "Qingmi Tech · कंपनी भुगतान", "Qingmi Tech · تحصيل الشركة"],
  "payment.title": ["微信扫码付款", "Pay with WeChat", "Paga con WeChat", "WeChat से भुगतान", "ادفع عبر WeChat"],
  "payment.description": ["请核对收款账户“晴幂科技”，按已选套餐金额付款。", "Confirm the Qingmi Tech account and pay the selected plan amount.", "Confirma la cuenta Qingmi Tech y paga el importe del plan.", "Qingmi Tech खाते की पुष्टि कर चुने प्लान की राशि दें।", "تحقق من حساب Qingmi Tech وادفع قيمة الباقة المختارة."],
  "payment.selected": ["当前选择", "Selected plan", "Plan elegido", "चुना प्लान", "الباقة المختارة"],
  "payment.enterpriseDiscount": ["企业购买可获专属兑换码；每个兑换码开通半年 PRO。", "Enterprise purchases receive dedicated six-month PRO codes.", "Las empresas reciben códigos PRO exclusivos por seis meses.", "कंपनी खरीद पर छह माह के PRO कोड मिलते हैं।", "تحصل الشركات على رموز PRO مخصصة لستة أشهر."],
  "payment.openQr": ["打开收款码大图", "Open full payment code", "Abrir código completo", "पूरा भुगतान कोड खोलें", "افتح رمز الدفع كاملاً"],
  "payment.qrAlt": ["晴幂科技企业微信收款码", "Qingmi Tech WeChat payment code", "Código de pago WeChat de Qingmi Tech", "Qingmi Tech WeChat भुगतान कोड", "رمز دفع WeChat لشركة Qingmi Tech"],
  "payment.submitTitle": ["提交付款信息", "Submit payment details", "Enviar datos del pago", "भुगतान विवरण जमा करें", "أرسل بيانات الدفع"],
  "payment.previewWarning": ["当前为本地预览审核流程。正式收款上线前须接通服务端订单核验；未确认官方订单通道前请勿付款。", "This is a local preview workflow. Server-side order verification is required before live payments; do not pay until the official order channel is confirmed.", "Este flujo es una vista previa local. Se requiere verificación del servidor antes de aceptar pagos reales.", "यह स्थानीय प्रीव्यू है। वास्तविक भुगतान से पहले सर्वर ऑर्डर सत्यापन जरूरी है; आधिकारिक चैनल की पुष्टि के बिना भुगतान न करें।", "هذا مسار معاينة محلي. يلزم تحقق خادمي قبل الدفع الحقيقي؛ لا تدفع قبل تأكيد قناة الطلب الرسمية."],
  "payment.liveWarning": ["扫码付款后请填写付款凭证号并提交；管理员核对企业账户到账后开通会员，不会自动到账开通。", "After scanning, enter the payment reference and submit it. Membership is activated after an administrator manually verifies the company account; activation is not automatic.", "Tras pagar, introduce la referencia y envíala. Un administrador activará la membresía después de verificar manualmente la cuenta empresarial.", "स्कैन कर भुगतान के बाद संदर्भ संख्या भरकर भेजें। कंपनी खाते में भुगतान की मैनुअल जाँच के बाद सदस्यता सक्रिय होगी।", "بعد المسح والدفع، أدخل رقم المرجع وأرسله. تُفعّل العضوية بعد تحقق المسؤول يدوياً من حساب الشركة."],
  "payment.loadingQr": ["正在安全加载企业收款码…", "Securely loading the company payment code…", "Cargando de forma segura el código de pago…", "कंपनी भुगतान कोड सुरक्षित रूप से लोड हो रहा है…", "جارٍ تحميل رمز دفع الشركة بأمان…"],
  "payment.qrUnavailable": ["企业收款码暂时无法加载，请稍后重试", "The company payment code could not be loaded. Please try again later.", "No se pudo cargar el código de pago. Inténtalo más tarde.", "कंपनी भुगतान कोड लोड नहीं हो सका। बाद में फिर प्रयास करें।", "تعذّر تحميل رمز دفع الشركة. حاول لاحقاً."],
  "payment.ordersUnavailable": ["暂时无法读取付款申请记录，请稍后刷新", "Payment request history could not be loaded. Please refresh later.", "No se pudo cargar el historial de pagos. Actualiza más tarde.", "भुगतान अनुरोध इतिहास लोड नहीं हुआ। बाद में रिफ्रेश करें।", "تعذّر تحميل سجل طلبات الدفع. حدّث لاحقاً."],
  "payment.payer": ["付款人姓名", "Payer name", "Nombre del pagador", "भुगतानकर्ता का नाम", "اسم الدافع"],
  "payment.payerPlaceholder": ["用于人工核对到账", "For manual payment matching", "Para verificar el pago", "भुगतान मिलान के लिए", "لمطابقة الدفعة يدوياً"],
  "payment.reference": ["付款凭证号（至少 4 位）", "Payment reference (at least 4 characters)", "Referencia de pago (mínimo 4 caracteres)", "भुगतान संदर्भ (कम से कम 4 अक्षर)", "مرجع الدفع (4 أحرف على الأقل)"],
  "payment.referencePlaceholder": ["必填，用于人工核对到账", "Required for manual payment matching", "Obligatorio para verificar manualmente el pago", "मैनुअल भुगतान मिलान के लिए आवश्यक", "مطلوب لمطابقة الدفعة يدوياً"],
  "payment.submit": ["我已付款，提交审核", "I paid — submit for review", "Ya pagué — enviar a revisión", "मैंने भुगतान किया—समीक्षा भेजें", "دفعت — أرسل للمراجعة"],
  "payment.submitting": ["正在提交…", "Submitting…", "Enviando…", "जमा हो रहा है…", "جارٍ الإرسال…"],
  "payment.submitted": ["付款申请已提交，等待人工核对", "Payment request submitted for review", "Solicitud enviada para revisión", "भुगतान अनुरोध समीक्षा में भेजा गया", "أُرسل طلب الدفع للمراجعة"],
  "payment.unavailable": ["正式订单服务接通后开放", "Available after the official order service is connected", "Disponible al conectar el servicio oficial de pedidos", "आधिकारिक ऑर्डर सेवा जुड़ने पर उपलब्ध", "يتاح بعد ربط خدمة الطلبات الرسمية"],
  "payment.duplicate": ["该支付凭证已关联其他订单，请核对后重试", "This payment reference is already linked to another order", "Esta referencia ya está vinculada a otro pedido", "यह भुगतान संदर्भ दूसरे ऑर्डर से जुड़ा है", "مرجع الدفع مرتبط بطلب آخر"],
  "payment.error": ["付款申请暂未提交成功，请核对信息后重试", "The payment request was not submitted. Check the details and try again.", "No se envió la solicitud. Revisa los datos e inténtalo de nuevo.", "भुगतान अनुरोध जमा नहीं हुआ। विवरण जाँचकर फिर प्रयास करें।", "لم يُرسل طلب الدفع. تحقق من البيانات وحاول مجدداً."],
  "payment.orders": ["我的付款申请", "My payment requests", "Mis solicitudes", "मेरे भुगतान अनुरोध", "طلبات الدفع الخاصة بي"],
  "payment.status.pending": ["待审核", "Pending", "Pendiente", "लंबित", "قيد المراجعة"],
  "payment.status.approved": ["已开通", "Approved", "Aprobado", "स्वीकृत", "مقبول"],
  "payment.status.rejected": ["未通过", "Rejected", "Rechazado", "अस्वीकृत", "مرفوض"],

  "redeem.title": ["企业兑换码", "Enterprise redemption code", "Código empresarial", "कंपनी रिडेम्प्शन कोड", "رمز استبدال للشركات"],
  "redeem.description": ["输入企业赠送的兑换码，立即获得半年 PRO 会员能力。", "Enter an enterprise code to unlock six months of PRO.", "Introduce un código empresarial para obtener seis meses de PRO.", "कंपनी कोड डालकर छह माह PRO पाएँ।", "أدخل رمز الشركة لتحصل على PRO لستة أشهر."],
  "redeem.placeholder": ["KUAKUA-PRO-6M-XXXX", "KUAKUA-PRO-6M-XXXX", "KUAKUA-PRO-6M-XXXX", "KUAKUA-PRO-6M-XXXX", "KUAKUA-PRO-6M-XXXX"],
  "redeem.submit": ["兑换半年 PRO", "Redeem 6 months PRO", "Canjear 6 meses PRO", "6 माह PRO रिडीम करें", "استبدل 6 أشهر PRO"],
  "redeem.checking": ["正在核验…", "Checking…", "Verificando…", "जाँच हो रही है…", "جارٍ التحقق…"],
  "redeem.success": ["兑换成功，半年 PRO 已生效", "Redeemed — six months of PRO is active", "Canjeado: seis meses de PRO activos", "रिडीम सफल—छह माह PRO सक्रिय", "تم الاستبدال وتفعيل PRO لستة أشهر"],
  "redeem.invalid": ["兑换码格式无效", "Invalid redemption code", "Código no válido", "अमान्य कोड", "رمز غير صالح"],
  "redeem.notFound": ["兑换码不存在或已失效", "Code not found or inactive", "El código no existe o está inactivo", "कोड नहीं मिला या निष्क्रिय है", "الرمز غير موجود أو غير فعّال"],
  "redeem.used": ["兑换码已被使用", "Code already redeemed", "Código ya utilizado", "कोड पहले उपयोग हो चुका है", "تم استخدام الرمز"],
  "redeem.expired": ["兑换码已过期或被停用", "Code expired or revoked", "Código caducado o revocado", "कोड समाप्त या रद्द है", "انتهت صلاحية الرمز أو أُلغي"],
  "redeem.error": ["兑换服务暂时不可用，请稍后重试", "Redemption is temporarily unavailable. Please try again.", "El canje no está disponible temporalmente. Inténtalo de nuevo.", "रिडेम्प्शन सेवा अभी उपलब्ध नहीं है। फिर प्रयास करें।", "خدمة الاستبدال غير متاحة مؤقتاً. حاول مجدداً."],

  "role.learner": ["学员", "Learner", "Estudiante", "शिक्षार्थी", "متعلّم"],
  "role.mentor": ["成长教练", "Growth mentor", "Mentor de crecimiento", "ग्रोथ मेंटर", "مرشد نمو"],
  "role.admin": ["平台管理员", "Platform admin", "Administrador", "प्लेटफ़ॉर्म एडमिन", "مدير المنصة"],
  "role.learnerDesc": ["学习课程、完成练习、积累知识值", "Learn, practise and build knowledge XP", "Aprende, practica y acumula XP", "सीखें, अभ्यास करें और ज्ञान XP बनाएँ", "تعلّم وطبّق واجمع نقاط المعرفة"],
  "role.mentorDesc": ["体验学习路径；正式评审台将在服务端版本开放", "Explore the learning path; formal review requires the future server edition", "Explora la ruta; la revisión formal requiere la futura versión con servidor", "सीखने की राह देखें; औपचारिक समीक्षा भविष्य के सर्वर संस्करण में होगी", "استكشف مسار التعلم؛ تتطلب المراجعة الرسمية النسخة الخادمة القادمة"],
  "role.adminDesc": ["管理本设备的用户状态与角色", "Manage local users, access and roles", "Gestiona usuarios, acceso y roles", "स्थानीय उपयोगकर्ता और भूमिकाएँ प्रबंधित करें", "يدير المستخدمين والصلاحيات والأدوار"],

  "auth.eyebrow": ["晴幂科技 OPC 超级个体成长平台", "Qingmi OPC School for Solo Builders", "Escuela OPC de creadores independientes", "Qingmi OPC एकल निर्माता अकादमी", "مدرسة Qingmi OPC لصنّاع الأعمال الفردية"],
  "auth.titleLead": ["让每一次学习，", "Turn every lesson", "Haz que cada lección", "हर सीख को", "حوّل كل درس"],
  "auth.titleAccent": ["都长成一个真实作品。", "into something real.", "se convierta en algo real.", "एक वास्तविक काम में बदलें।", "إلى عمل حقيقي."],
  "auth.description": ["从市场调研、产品设计、界面设计、技术开发，到上线发布、运营增长与出海。12 周，完成一个真正属于你的微产品。", "From research and product design to engineering, launch, growth and global expansion. Ship your own micro-product in 12 weeks.", "De investigación y producto a tecnología, lanzamiento, crecimiento y expansión global. Publica tu microproducto en 12 semanas.", "रिसर्च और प्रोडक्ट डिज़ाइन से टेक, लॉन्च, ग्रोथ और वैश्विक विस्तार तक। 12 सप्ताह में अपना माइक्रो-प्रोडक्ट लॉन्च करें।", "من البحث وتصميم المنتج إلى التقنية والإطلاق والنمو والتوسع العالمي. أطلق منتجك المصغّر خلال 12 أسبوعاً."],
  "auth.orbitInsight": ["洞察力", "Insight", "Perspectiva", "अंतर्दृष्टि", "بصيرة"],
  "auth.orbitProduct": ["产品力", "Product craft", "Producto", "उत्पाद कौशल", "حرفة المنتج"],
  "auth.orbitAction": ["行动力", "Momentum", "Impulso", "क्रियाशीलता", "زخم"],
  "auth.proofStages": ["个阶段", "stages", "etapas", "चरण", "مراحل"],
  "auth.proofLessons": ["节实战课", "practical lessons", "lecciones prácticas", "व्यावहारिक पाठ", "درساً عملياً"],
  "auth.proofWork": ["个上线作品", "shipped product", "producto publicado", "लॉन्च किया उत्पाद", "منتج منشور"],
  "auth.welcome": ["欢迎回来", "Welcome back", "Bienvenido de nuevo", "वापसी पर स्वागत है", "مرحباً بعودتك"],
  "auth.joinTitle": ["开始你的成长旅程", "Start your builder journey", "Empieza tu recorrido", "अपनी निर्माता यात्रा शुरू करें", "ابدأ رحلة البناء"],
  "auth.loginHint": ["小晴已经准备好今天的夸赞了", "Xiaoqing has today's encouragement ready", "Xiaoqing tiene listo tu elogio de hoy", "श्याओछिंग आज की हौसला-अफ़ज़ाई के साथ तैयार है", "شياوتشينغ جهّزت لك تشجيع اليوم"],
  "auth.joinHint": ["新账号默认获得学员角色", "New accounts start as learners", "Las cuentas nuevas empiezan como estudiantes", "नए खाते शिक्षार्थी के रूप में शुरू होते हैं", "تبدأ الحسابات الجديدة بدور متعلّم"],
  "auth.login": ["登录", "Sign in", "Entrar", "साइन इन", "تسجيل الدخول"],
  "auth.register": ["注册", "Create account", "Crear cuenta", "खाता बनाएँ", "إنشاء حساب"],
  "auth.name": ["怎么称呼你", "What should we call you?", "¿Cómo te llamamos?", "हम आपको क्या कहें?", "كيف نناديك؟"],
  "auth.namePlaceholder": ["你的名字", "Your name", "Tu nombre", "आपका नाम", "اسمك"],
  "auth.email": ["邮箱", "Email", "Correo", "ईमेल", "البريد الإلكتروني"],
  "auth.password": ["密码", "Password", "Contraseña", "पासवर्ड", "كلمة المرور"],
  "auth.passwordNew": ["至少 8 位", "At least 8 characters", "Mínimo 8 caracteres", "कम से कम 8 अक्षर", "8 أحرف على الأقل"],
  "auth.passwordNewProduction": ["至少 10 位", "At least 10 characters", "Mínimo 10 caracteres", "कम से कम 10 अक्षर", "10 أحرف على الأقل"],
  "auth.passwordEnter": ["输入密码", "Enter password", "Introduce tu contraseña", "पासवर्ड दर्ज करें", "أدخل كلمة المرور"],
  "auth.passwordToggle": ["显示或隐藏密码", "Show or hide password", "Mostrar u ocultar contraseña", "पासवर्ड दिखाएँ या छिपाएँ", "إظهار أو إخفاء كلمة المرور"],
  "auth.errorLogin": ["邮箱或密码不正确，或账号已停用", "Email or password is incorrect, or the account is disabled", "El correo o la contraseña no son correctos, o la cuenta está desactivada", "ईमेल या पासवर्ड गलत है, या खाता निष्क्रिय है", "البريد أو كلمة المرور غير صحيحة، أو الحساب معطّل"],
  "auth.errorName": ["请填写至少 2 个字的称呼", "Please enter a name with at least 2 characters", "Escribe un nombre de al menos 2 caracteres", "कम से कम 2 अक्षरों का नाम लिखें", "أدخل اسماً من حرفين على الأقل"],
  "auth.errorEmail": ["请输入有效的邮箱地址", "Enter a valid email address", "Introduce un correo válido", "एक मान्य ईमेल पता दर्ज करें", "أدخل بريداً إلكترونياً صالحاً"],
  "auth.errorEmailExists": ["这个邮箱已经注册，可以直接登录", "This email is already registered. You can sign in instead.", "Este correo ya está registrado. Puedes iniciar sesión.", "यह ईमेल पहले से पंजीकृत है। आप साइन इन कर सकते हैं।", "هذا البريد مسجّل بالفعل. يمكنك تسجيل الدخول."],
  "auth.errorPassword": ["密码至少需要 8 位", "Password must be at least 8 characters", "La contraseña debe tener al menos 8 caracteres", "पासवर्ड कम से कम 8 अक्षर का होना चाहिए", "يجب ألا تقل كلمة المرور عن 8 أحرف"],
  "auth.errorPasswordProduction": ["密码需要 10–128 位", "Password must be 10–128 characters", "La contraseña debe tener entre 10 y 128 caracteres", "पासवर्ड 10–128 अक्षरों का होना चाहिए", "يجب أن تتكون كلمة المرور من 10 إلى 128 حرفاً"],
  "auth.errorGeneric": ["暂时无法完成，请重试", "We couldn't complete that. Please try again.", "No se pudo completar. Inténtalo de nuevo.", "यह पूरा नहीं हो सका। फिर कोशिश करें।", "تعذّر الإكمال. حاول مجدداً."],
  "auth.entering": ["正在进入…", "Entering…", "Entrando…", "प्रवेश हो रहा है…", "جارٍ الدخول…"],
  "auth.enterSpace": ["进入学习空间", "Enter learning studio", "Entrar al estudio", "लर्निंग स्टूडियो में जाएँ", "ادخل مساحة التعلّم"],
  "auth.create": ["创建账号", "Create account", "Crear cuenta", "खाता बनाएँ", "إنشاء حساب"],
  "auth.try": ["或先体验", "Or explore first", "O explora primero", "या पहले देखें", "أو استكشف أولاً"],
  "auth.demoLearner": ["学员体验", "Learner demo", "Demo estudiante", "लर्नर डेमो", "تجربة المتعلّم"],
  "auth.demoLearnerSub": ["课程、成长、伙伴", "Courses, growth, buddy", "Cursos, progreso y compañera", "पाठ्यक्रम, विकास, साथी", "الدورات والنمو والرفيقة"],
  "auth.demoAdmin": ["管理员体验", "Admin demo", "Demo administrador", "एडमिन डेमो", "تجربة المدير"],
  "auth.demoAdminSub": ["用户与角色管理", "Users and role management", "Usuarios y roles", "उपयोगकर्ता और भूमिकाएँ", "إدارة المستخدمين والأدوار"],
  "auth.localNote": ["当前为本地演示身份系统，账号与进度只保存在此浏览器。", "This preview stores demo accounts and progress only in this browser.", "Esta versión guarda cuentas y progreso solo en este navegador.", "यह प्रीव्यू खाते और प्रगति केवल इस ब्राउज़र में रखता है।", "تحفظ هذه النسخة الحسابات والتقدم داخل هذا المتصفح فقط."],
  "auth.productionNote": ["账号、会员与付款申请由夸夸学习 AI 服务安全管理；学习作品仍保存在当前设备。", "Your account, membership and payment requests are securely managed by KuaKua AI; learning work remains on this device.", "KuaKua AI gestiona de forma segura tu cuenta, membresía y pagos; el trabajo de aprendizaje permanece en este dispositivo.", "खाता, सदस्यता और भुगतान अनुरोध KuaKua AI सुरक्षित रूप से संभालता है; सीखने का काम इस डिवाइस पर रहता है।", "تدير KuaKua AI الحساب والعضوية وطلبات الدفع بأمان؛ وتبقى أعمال التعلّم على هذا الجهاز."],
  "auth.restoring": ["正在恢复你的学习空间", "Restoring your learning studio", "Restaurando tu espacio de aprendizaje", "आपका लर्निंग स्टूडियो बहाल हो रहा है", "جارٍ استعادة مساحة تعلّمك"],
  "auth.restoringHint": ["正在安全核验登录与会员状态…", "Securely checking your sign-in and membership…", "Verificando de forma segura tu sesión y membresía…", "आपका लॉगिन और सदस्यता सुरक्षित रूप से जाँचे जा रहे हैं…", "جارٍ التحقق بأمان من الدخول والعضوية…"],
  "auth.footer": ["晴幂科技 · OPC 链主实践体系 · KuaKua AI", "Qingmi Tech · OPC Builder System · KuaKua AI", "Qingmi Tech · Sistema OPC · KuaKua AI", "Qingmi Tech · OPC बिल्डर सिस्टम · KuaKua AI", "Qingmi Tech · نظام OPC · KuaKua AI"],

  "dashboard.eyebrow": ["今天也在成为更好的超级个体", "One thoughtful step toward your solo company", "Un paso consciente hacia tu empresa individual", "अपने एकल उद्यम की ओर एक सार्थक कदम", "خطوة واعية نحو شركتك الفردية"],
  "dashboard.heroLine": ["把一个想法，再推进一小步。", "Move one idea a little closer to real.", "Acerca una idea un poco más a la realidad.", "एक विचार को वास्तविकता के थोड़ा और करीब लाएँ।", "قرّب فكرة واحدة خطوة أخرى من الواقع."],
  "dashboard.description": ["这不是一套只需要“看完”的课程。你会用 12 周，把市场证据变成一个可以上线、可以运营的真实产品。", "This is not a watch-and-forget course. In 12 weeks, turn market evidence into a product you can ship and operate.", "No es un curso para mirar y olvidar. En 12 semanas, convierte evidencia de mercado en un producto real.", "यह देखकर भूल जाने वाला कोर्स नहीं है। 12 सप्ताह में बाज़ार के प्रमाण को वास्तविक उत्पाद में बदलें।", "ليست دورة للمشاهدة والنسيان. خلال 12 أسبوعاً حوّل دليل السوق إلى منتج حقيقي قابل للإطلاق والتشغيل."],
  "dashboard.continue": ["继续：{title}", "Continue: {title}", "Continuar: {title}", "जारी रखें: {title}", "تابع: {title}"],
  "dashboard.capstone": ["查看毕业成果", "View capstone", "Ver proyecto final", "अंतिम परियोजना देखें", "عرض مشروع التخرّج"],
  "dashboard.browse": ["浏览完整课程", "Explore the full curriculum", "Explorar el currículo", "पूरा पाठ्यक्रम देखें", "استكشف المنهج كاملاً"],
  "dashboard.orbitInsight": ["+ 洞察", "+ Insight", "+ Insight", "+ अंतर्दृष्टि", "+ بصيرة"],
  "dashboard.orbitWork": ["+ 作品", "+ Work", "+ Obra", "+ काम", "+ عمل"],
  "dashboard.orbitPractice": ["+ 实践", "+ Practice", "+ Práctica", "+ अभ्यास", "+ تطبيق"],
  "dashboard.praise": ["今日夸赞", "Today's encouragement", "Elogio de hoy", "आज की हौसला-अफ़ज़ाई", "تشجيع اليوم"],
  "dashboard.streak": ["{count} 天连续见面", "A {count}-day streak", "Racha de {count} días", "{count} दिन की निरंतरता", "سلسلة من {count} أيام"],
  "dashboard.replay": ["再听一次", "Read again", "Leer de nuevo", "फिर पढ़ें", "اقرأ مجدداً"],
  "dashboard.absorbing": ["小晴正在吸收知识", "Xiaoqing is absorbing knowledge", "Xiaoqing está absorbiendo conocimiento", "श्याओछिंग ज्ञान आत्मसात कर रही है", "شياوتشينغ تمتص المعرفة"],
  "dashboard.current": ["当前 · {level}", "Current · {level}", "Actual · {level}", "वर्तमान · {level}", "الحالي · {level}"],
  "dashboard.next": ["距 {level} 还差 {count}", "{count} XP to {level}", "Faltan {count} XP para {level}", "{level} तक {count} XP", "تبقّى {count} للوصول إلى {level}"],
  "dashboard.max": ["已到达最高等级", "Highest level reached", "Nivel máximo alcanzado", "सर्वोच्च स्तर प्राप्त", "وصلت إلى أعلى مستوى"],
  "dashboard.statLessons": ["已完成课节", "Lessons completed", "Lecciones completadas", "पूर्ण पाठ", "الدروس المكتملة"],
  "dashboard.statProgress": ["全程完成度", "Curriculum progress", "Progreso total", "पाठ्यक्रम प्रगति", "تقدم المنهج"],
  "dashboard.statStreak": ["连续上线", "Learning streak", "Racha de aprendizaje", "सीखने की निरंतरता", "سلسلة التعلّم"],
  "dashboard.statStages": ["已通关阶段", "Stages mastered", "Etapas superadas", "पूर्ण चरण", "المراحل المجتازة"],
  "dashboard.journeyTitle": ["一条从问题到真实产品的路", "A path from problem to real product", "Del problema a un producto real", "समस्या से वास्तविक उत्पाद तक", "من المشكلة إلى منتج حقيقي"],
  "dashboard.journeyDesc": ["每个阶段都有明确成果；看完不算，做出来才算。", "Every stage produces evidence. Watching is not finishing—shipping is.", "Cada etapa produce evidencia. Ver no es terminar; publicar sí.", "हर चरण प्रमाण बनाता है। देखना पूरा करना नहीं—बनाना है।", "كل مرحلة تنتج دليلاً. المشاهدة ليست إنجازاً؛ الإطلاق هو الإنجاز."],
  "dashboard.viewMap": ["查看成长地图", "View journey map", "Ver la ruta", "यात्रा मानचित्र देखें", "عرض خريطة المسار"],
  "dashboard.stageDone": ["{count}/4 完成", "{count}/4 complete", "{count}/4 completadas", "{count}/4 पूर्ण", "{count}/4 مكتمل"],
  "dashboard.opcLabel": ["晴幂科技 OPC 链主方法", "Qingmi OPC Orchestrator Method", "Método Qingmi OPC", "Qingmi OPC ऑर्केस्ट्रेटर पद्धति", "منهج Qingmi لإدارة OPC"],
  "dashboard.opcTitle": ["你不需要成为所有工种的专家，但要会定义、连接、验收，并承担结果。", "You do not need to master every craft. Define, connect, verify—and own the outcome.", "No necesitas dominar cada oficio. Define, conecta, valida y asume el resultado.", "हर कौशल का विशेषज्ञ होना ज़रूरी नहीं। परिभाषित करें, जोड़ें, सत्यापित करें—और परिणाम की जिम्मेदारी लें।", "لست مضطراً لإتقان كل حرفة. حدّد واربط وتحقّق وتحمّل مسؤولية النتيجة."],
  "dashboard.opcReal": ["真实项目贯穿", "One real project", "Un proyecto real", "एक वास्तविक प्रोजेक्ट", "مشروع حقيقي"],
  "dashboard.opcCollab": ["AI 与伙伴协作", "AI + human collaboration", "Colaboración IA + personas", "AI + मानव सहयोग", "تعاون الذكاء والبشر"],
  "dashboard.opcEvidence": ["以证据通关", "Evidence to advance", "Avanza con evidencia", "प्रमाण से आगे बढ़ें", "تقدّم بالدليل"],
  "dashboard.opcShip": ["作品公开上线", "Ship in public", "Publica en abierto", "सार्वजनिक लॉन्च", "أطلق للعامة"],

  "course.title": ["从一个想法，到一门真实生意", "From one idea to a real solo company", "De una idea a una empresa individual real", "एक विचार से वास्तविक एकल कंपनी तक", "من فكرة إلى شركة فردية حقيقية"],
  "course.description": ["沿着战略、调研、产品、设计、开发、成交、运营与出海的完整路径，做出一个能上线、能卖、能交付、能复盘的真实产品。", "Follow the complete path through strategy, research, product, design, engineering, sales, operations and global expansion—then ship something real.", "Recorre estrategia, investigación, producto, diseño, tecnología, ventas, operaciones y expansión global hasta publicar algo real.", "रणनीति, रिसर्च, प्रोडक्ट, डिज़ाइन, इंजीनियरिंग, बिक्री, संचालन और वैश्विक विस्तार की पूरी राह पर वास्तविक उत्पाद लॉन्च करें।", "اتبع المسار الكامل من الاستراتيجية والبحث والمنتج والتصميم والتقنية إلى البيع والتشغيل والتوسع العالمي، ثم أطلق منتجاً حقيقياً."],
  "course.totalProgress": ["总进度", "Overall progress", "Progreso total", "कुल प्रगति", "التقدم الكلي"],
  "course.progressDone": ["{done} / {total} 课节完成", "{done} / {total} lessons complete", "{done} / {total} lecciones completadas", "{done} / {total} पाठ पूर्ण", "اكتمل {done} من {total} درساً"],
  "course.books": ["次核心书精读", "guided book studies", "lecturas guiadas", "निर्देशित पुस्तक अध्ययन", "قراءة كتاب موجّهة"],
  "course.lectures": ["份深度讲义", "deep lesson guides", "guías en profundidad", "गहन गाइड", "دليلاً معمّقاً"],
  "course.coaches": ["个 AI 陪练", "AI coaching labs", "laboratorios con IA", "AI कोचिंग लैब", "مختبراً تدريبياً بالذكاء الاصطناعي"],
  "course.videos": ["支原创微课", "original micro-lessons", "microlecciones originales", "मूल माइक्रो-पाठ", "دروس مصغّرة أصلية"],
  "course.editionTitle": ["超级个体产品全流程 · 2026 中文内容版", "Solo Company Product System · 2026 interface preview", "Sistema de producto individual · Vista previa 2026", "एकल कंपनी उत्पाद प्रणाली · 2026 इंटरफ़ेस प्रीव्यू", "نظام منتج الشركة الفردية · معاينة واجهة 2026"],
  "course.editionDesc": ["不是先记一套新名词，而是用八段连续的产品工作，把问题、产品、客户、收入与经营系统真正连起来。", "No new vocabulary to memorise: eight connected product stages link the problem, product, customer, revenue and operating system.", "No hay jerga que memorizar: ocho etapas conectan problema, producto, cliente, ingresos y operación.", "नई शब्दावली याद नहीं करनी—आठ जुड़े चरण समस्या, उत्पाद, ग्राहक, राजस्व और संचालन को जोड़ते हैं।", "لا مصطلحات جديدة للحفظ؛ ثماني مراحل مترابطة تصل المشكلة بالمنتج والعميل والإيراد ونظام التشغيل."],
  "course.editionChip": ["8 个阶段 · 32 课 · 24 次精读", "8 stages · 32 lessons · 24 readings", "8 etapas · 32 lecciones · 24 lecturas", "8 चरण · 32 पाठ · 24 अध्ययन", "8 مراحل · 32 درساً · 24 قراءة"],
  "course.languageCoverage": ["", "The interface, course map and method preview are translated. Full lesson guides, book notes, cases, AI labs, videos and source notes remain in Simplified Chinese.", "La interfaz, el mapa y la vista previa del método están traducidos. Las guías completas, notas de libros, casos, laboratorios de IA, vídeos y fuentes siguen en chino simplificado.", "इंटरफ़ेस, कोर्स मैप और विधि प्रीव्यू अनूदित हैं। पूरी गाइड, पुस्तक नोट्स, केस, AI लैब, वीडियो और स्रोत अभी सरलीकृत चीनी में हैं।", "تمت ترجمة الواجهة وخريطة الدورة ومعاينة المنهج. أما الأدلة الكاملة وملاحظات الكتب والحالات ومختبرات الذكاء والفيديو والمصادر فما زالت بالصينية المبسطة."],
  "course.orchestrate": ["一张完整的产品经营地图", "One complete product-and-business map", "Un mapa completo de producto y negocio", "एक संपूर्ण उत्पाद और व्यवसाय मानचित्र", "خريطة متكاملة للمنتج والعمل"],
  "course.orchestrateDesc": ["每个阶段都以上一阶段的真实产出为输入；走完之后，你拥有的不是知识清单，而是一套能上线、能成交、能交付、能复盘、能出海的个人公司系统。", "Each stage begins with real evidence from the previous one. Finish with a solo-company system that can ship, sell, deliver, learn and expand globally.", "Cada etapa parte de evidencia real de la anterior. Termina con un sistema que publica, vende, entrega, aprende y se expande.", "हर चरण पिछले चरण के वास्तविक प्रमाण से शुरू होता है। अंत में आपके पास लॉन्च, बिक्री, डिलीवरी, सीखने और विस्तार की व्यवस्था होगी।", "تبدأ كل مرحلة بدليل حقيقي من سابقتها، وتنتهي بنظام شركة فردية يطلق ويبيع وينفّذ ويتعلّم ويتوسع."],
  "course.routeStrategy": ["战略", "Strategy", "Estrategia", "रणनीति", "استراتيجية"],
  "course.routeProduct": ["产品", "Product", "Producto", "उत्पाद", "منتج"],
  "course.routeRevenue": ["收入", "Revenue", "Ingresos", "राजस्व", "إيراد"],
  "course.routeGlobal": ["出海", "Global", "Global", "वैश्विक", "عالمي"],
  "course.contractTitle": ["OPC 链主总纲", "OPC orchestration charter", "Carta de orquestación OPC", "OPC ऑर्केस्ट्रेशन चार्टर", "ميثاق إدارة OPC"],
  "course.contractValue": ["定义结果 · 连接 AI 与伙伴 · 验收证据 · 沉淀资产", "Define outcomes · Connect AI and people · Verify evidence · Compound assets", "Define resultados · Conecta IA y personas · Verifica evidencia · Acumula activos", "परिणाम परिभाषित करें · AI और लोगों को जोड़ें · प्रमाण जाँचें · संपत्ति बनाएँ", "حدّد النتائج · صِل الذكاء بالبشر · تحقّق من الدليل · راكم الأصول"],
  "course.contractHint": ["每次 AI 陪练都使用同一份可验收的任务合同", "Every AI coaching lab uses the same verifiable task contract", "Cada laboratorio de IA usa el mismo contrato de tarea verificable", "हर AI कोचिंग अभ्यास एक ही सत्यापन योग्य टास्क कॉन्ट्रैक्ट उपयोग करता है", "يستخدم كل تدريب بالذكاء الاصطناعي عقد مهمة واحداً قابلاً للتحقق"],
  "course.statusPassed": ["已通关", "Mastered", "Superada", "उत्तीर्ण", "مجتاز"],
  "course.statusLearning": ["学习中", "In progress", "En curso", "जारी", "قيد التعلّم"],
  "course.statusReady": ["可开始", "Ready", "Lista", "तैयार", "جاهز"],
  "course.keyQuestion": ["关键业务问题", "Critical business question", "Pregunta de negocio clave", "मुख्य व्यावसायिक प्रश्न", "سؤال العمل الحاسم"],
  "course.asset": ["沉淀为 OPC 资产", "OPC asset created", "Activo OPC creado", "बनाई गई OPC संपत्ति", "أصل OPC الناتج"],
  "course.productPhase": ["完整产品路径", "Product journey", "Ruta de producto", "उत्पाद यात्रा", "رحلة المنتج"],
  "course.startRoute": ["直接开始下一步", "Start the next real step", "Empieza el siguiente paso real", "अगला वास्तविक कदम शुरू करें", "ابدأ الخطوة الحقيقية التالية"],
  "course.coreReading": ["本模块 3 本核心书", "3 essential books for this stage", "3 libros esenciales de esta etapa", "इस चरण की 3 मुख्य पुस्तकें", "3 كتب أساسية لهذه المرحلة"],
  "course.guideCount": ["4 份讲义", "4 guides", "4 guías", "4 गाइड", "4 أدلة"],
  "course.coachCount": ["4 个 AI 陪练", "4 AI labs", "4 laboratorios IA", "4 AI लैब", "4 مختبرات ذكاء"],
  "course.videoCount": ["{count} 个视频", "{count} videos", "{count} vídeos", "{count} वीडियो", "{count} فيديو"],
  "course.deliverable": ["阶段通关成果", "Stage evidence", "Evidencia de etapa", "चरण का प्रमाण", "دليل المرحلة"],

  "journey.title": ["一条完整产品链路，不是一张知识清单", "A complete product journey—not a knowledge checklist", "Una ruta completa de producto, no una lista de conocimientos", "एक संपूर्ण उत्पाद यात्रा—ज्ञान की सूची नहीं", "رحلة منتج كاملة، لا قائمة معلومات"],
  "journey.description": ["每一步都为下一步提供真实输入。一路走完，你手里会有产品、客户证据、收入闭环、运营系统和一份单市场出海结论。", "Every step creates real input for the next. Finish with a product, customer evidence, a revenue loop, an operating system and a one-market expansion decision.", "Cada paso alimenta el siguiente. Termina con producto, evidencia de clientes, ingresos, sistema operativo y una decisión internacional.", "हर कदम अगले के लिए वास्तविक इनपुट बनाता है। अंत में उत्पाद, ग्राहक प्रमाण, राजस्व चक्र, संचालन प्रणाली और एक बाज़ार का निर्णय होगा।", "تنتج كل خطوة مدخلاً حقيقياً لما بعدها. وتنتهي بمنتج ودليل عملاء ودورة إيراد ونظام تشغيل وقرار توسع في سوق واحد."],
  "journey.lessonCount": ["{count}/4 课节", "{count}/4 lessons", "{count}/4 lecciones", "{count}/4 पाठ", "{count}/4 دروس"],
  "journey.takeAway": ["你会带走", "What you will carry forward", "Lo que te llevas", "आप क्या साथ ले जाएँगे", "ما ستحمله معك"],
  "journey.continue": ["继续这个阶段", "Continue this stage", "Continuar esta etapa", "यह चरण जारी रखें", "تابع هذه المرحلة"],
  "journey.begin": ["从这里开始", "Start here", "Empieza aquí", "यहाँ से शुरू करें", "ابدأ من هنا"],
  "journey.view": ["查看课程", "View lessons", "Ver lecciones", "पाठ देखें", "عرض الدروس"],
  "journey.capstone": ["毕业作品", "Capstone", "Proyecto final", "अंतिम परियोजना", "مشروع التخرّج"],
  "journey.capstoneTitle": ["一个能卖、能交付、能复盘、能出海的真实微业务", "A real micro-business that can sell, deliver, learn and expand globally", "Un micronegocio real que vende, entrega, aprende y se expande", "एक वास्तविक माइक्रो-बिज़नेस जो बेचता, डिलीवर करता, सीखता और विश्व स्तर पर बढ़ता है", "عمل مصغّر حقيقي يبيع وينفّذ ويتعلّم ويتوسع عالمياً"],
  "journey.capstoneDesc": ["不是概念稿，也不以虚构增长数据毕业。它要有真实地址、真实客户信号、经营系统和首站市场的扩大或停止决定。", "Not a concept deck or invented metrics. It needs a real URL, real customer signals, an operating system and a go/stop decision for its first market.", "No es un concepto ni métricas inventadas. Necesita URL real, señales de clientes, sistema operativo y decisión de avanzar o parar.", "यह कॉन्सेप्ट डेक या बनावटी आँकड़े नहीं है। इसे वास्तविक URL, ग्राहक संकेत, संचालन प्रणाली और आगे बढ़ने या रुकने का निर्णय चाहिए।", "ليس عرضاً نظرياً ولا أرقاماً مختلقة. يحتاج إلى رابط حقيقي وإشارات عملاء ونظام تشغيل وقرار توسّع أو توقف."],
  "journey.maturity": ["当前作品成熟度", "Current venture maturity", "Madurez actual", "वर्तमान उद्यम परिपक्वता", "نضج المشروع الحالي"],

  "buddy.title": ["这是小晴，也是你的成长镜子", "Meet Xiaoqing—your mirror for growth", "Xiaoqing: tu espejo de crecimiento", "श्याओछिंग—आपके विकास का आईना", "شياوتشينغ: مرآة نموّك"],
  "buddy.description": ["完成真实学习任务，小晴就会吸收对应知识。成长值只奖励一次，不靠重复点击刷出来。", "Complete real work and Xiaoqing absorbs that knowledge. XP is earned once through evidence, never through repeated clicks.", "Completa trabajo real y Xiaoqing absorbe ese conocimiento. El XP se gana una sola vez con evidencia.", "वास्तविक काम पूरा करें और श्याओछिंग उस ज्ञान को आत्मसात करेगी। XP प्रमाण से एक बार मिलता है।", "أنجز عملاً حقيقياً فتمتص شياوتشينغ معرفته. تُكتسب النقاط مرة واحدة بالدليل، لا بالنقر المتكرر."],
  "buddy.currentForm": ["当前形态", "Current form", "Forma actual", "वर्तमान रूप", "الشكل الحالي"],
  "buddy.nutrition": ["小晴的完整产品能力图", "Xiaoqing's full product capability map", "Mapa completo de capacidades de Xiaoqing", "श्याओछिंग का संपूर्ण उत्पाद क्षमता मानचित्र", "خريطة قدرات المنتج الكاملة لشياوتشينغ"],
  "buddy.nutritionDesc": ["八种能力不是看课时长，而是来自你完成的练习、作品、成交、经营与出海行动。", "These capabilities grow from completed practice, products, sales, operations and global action—not watch time.", "Crecen con práctica, productos, ventas, operaciones y acción global; no con tiempo de pantalla.", "ये क्षमताएँ अभ्यास, उत्पाद, बिक्री, संचालन और वैश्विक कार्रवाई से बढ़ती हैं—देखने के समय से नहीं।", "تنمو هذه القدرات من التطبيق والمنتجات والمبيعات والتشغيل والعمل العالمي، لا من وقت المشاهدة."],
  "buddy.absorbed": ["{count} 知识值已吸收", "{count} knowledge XP absorbed", "{count} XP absorbidos", "{count} ज्ञान XP आत्मसात", "تم امتصاص {count} نقطة معرفة"],
  "buddy.next": ["再获得 {count} 点，成长为「{level}」", "Earn {count} more to become {level}", "Consigue {count} más para llegar a {level}", "{level} बनने के लिए {count} और पाएँ", "اكسب {count} إضافية لتصبح {level}"],
  "buddy.max": ["已经成长为最高等级「链主伙伴」", "The highest growth form is unlocked", "Has desbloqueado el nivel máximo", "सर्वोच्च विकास रूप खुल गया है", "تم فتح أعلى مرحلة نمو"],
  "buddy.forms": ["小晴的七种成长形态", "Xiaoqing's seven growth forms", "Las siete formas de crecimiento", "श्याओछिंग के सात विकास रूप", "أشكال نمو شياوتشينغ السبعة"],
  "buddy.ruleReturn": ["每天回来", "Return each day", "Vuelve cada día", "हर दिन लौटें", "عُد كل يوم"],
  "buddy.ruleReturnDesc": ["得到一条不虚构成绩、只属于今天的真诚夸赞。", "Receive honest encouragement for today—without invented achievements.", "Recibe un elogio sincero, sin logros inventados.", "आज के लिए सच्चा प्रोत्साहन पाएँ—बनावटी उपलब्धियों के बिना।", "احصل على تشجيع صادق لليوم، بلا إنجازات مختلقة."],
  "buddy.ruleLesson": ["完成课节", "Complete lessons", "Completa lecciones", "पाठ पूरे करें", "أكمل الدروس"],
  "buddy.ruleLessonDesc": ["每节只奖励一次知识值，完成比重复点击更重要。", "Each lesson rewards XP once. Completion matters more than clicking.", "Cada lección da XP una vez. Completar importa más que hacer clic.", "हर पाठ एक बार XP देता है। पूरा करना क्लिक करने से अधिक महत्वपूर्ण है।", "يمنح كل درس نقاطاً مرة واحدة. الإنجاز أهم من النقر."],
  "buddy.ruleWork": ["交付作品", "Ship the work", "Publica el trabajo", "काम डिलीवर करें", "أنجز العمل"],
  "buddy.ruleWorkDesc": ["阶段成果把知识变成可展示、可复用的能力证据。", "Stage outcomes turn knowledge into visible, reusable evidence.", "Los resultados convierten conocimiento en evidencia reutilizable.", "चरण परिणाम ज्ञान को दृश्यमान, पुनः उपयोग योग्य प्रमाण बनाते हैं।", "تحوّل نتائج المراحل المعرفة إلى دليل مرئي قابل لإعادة الاستخدام."],

  "admin.title": ["用户与角色管理", "Users & roles", "Usuarios y roles", "उपयोगकर्ता और भूमिकाएँ", "المستخدمون والأدوار"],
  "admin.description": ["管理本设备演示账号的角色和启用状态。真实生产环境需要迁移到服务端身份与权限系统。", "Manage roles and access for demo accounts on this device. Production requires a server-side identity system.", "Gestiona roles y acceso de las cuentas de prueba. Producción requiere identidad en servidor.", "इस डिवाइस के डेमो खातों की भूमिका और पहुँच प्रबंधित करें। प्रोडक्शन में सर्वर पहचान प्रणाली चाहिए।", "أدر أدوار ووصول الحسابات التجريبية. يتطلب الإنتاج نظام هوية على الخادم."],
  "admin.locked": ["只有平台管理员可以查看角色管理", "Only platform admins can manage roles", "Solo los administradores pueden gestionar roles", "केवल प्लेटफ़ॉर्म एडमिन भूमिकाएँ प्रबंधित कर सकते हैं", "يمكن لمدير المنصة فقط إدارة الأدوار"],
  "admin.currentRole": ["当前身份是{role}。", "Your current role is {role}.", "Tu rol actual es {role}.", "आपकी वर्तमान भूमिका {role} है।", "دورك الحالي هو {role}."],
  "admin.localAccounts": ["本地账号", "Local accounts", "Cuentas locales", "स्थानीय खाते", "حسابات محلية"],
  "admin.activeAccounts": ["启用账号", "Active accounts", "Cuentas activas", "सक्रिय खाते", "حسابات نشطة"],
  "admin.learners": ["学员角色", "Learners", "Estudiantes", "शिक्षार्थी", "متعلّمون"],
  "admin.avgProgress": ["平均进度", "Average progress", "Progreso medio", "औसत प्रगति", "متوسط التقدم"],
  "admin.accountList": ["账号列表", "Account directory", "Directorio de cuentas", "खाता सूची", "دليل الحسابات"],
  "admin.roleImpact": ["角色变更会立即影响导航与管理权限。", "Role changes immediately affect navigation and admin access.", "Los cambios de rol afectan de inmediato al acceso.", "भूमिका परिवर्तन तुरंत नेविगेशन और एडमिन पहुँच पर लागू होते हैं।", "تؤثر تغييرات الدور فوراً في التنقل والصلاحيات."],
  "admin.leastPrivilege": ["最小必要权限", "Least-privilege access", "Acceso mínimo necesario", "न्यूनतम आवश्यक पहुँच", "أقل صلاحية لازمة"],
  "admin.user": ["用户", "User", "Usuario", "उपयोगकर्ता", "المستخدم"],
  "admin.learningProgress": ["学习进度", "Learning progress", "Progreso", "सीखने की प्रगति", "تقدم التعلّم"],
  "admin.role": ["角色", "Role", "Rol", "भूमिका", "الدور"],
  "admin.status": ["状态", "Status", "Estado", "स्थिति", "الحالة"],
  "admin.currentAccount": ["当前账号", "Current", "Actual", "वर्तमान", "الحالي"],
  "admin.enabled": ["已启用", "Enabled", "Activa", "सक्रिय", "نشط"],
  "admin.disabled": ["已停用", "Disabled", "Desactivada", "निष्क्रिय", "معطّل"],
  "admin.roleUpdated": ["用户角色已更新", "User role updated", "Rol actualizado", "उपयोगकर्ता भूमिका अपडेट हुई", "تم تحديث دور المستخدم"],
  "admin.paymentReview": ["会员付款审核", "Membership payment review", "Revisión de pagos", "सदस्य भुगतान समीक्षा", "مراجعة مدفوعات العضوية"],
  "admin.paymentReviewDesc": ["核对企业收款到账后，手工开通对应套餐。", "Verify the company payment, then activate the selected plan.", "Verifica el cobro y activa el plan elegido.", "कंपनी भुगतान जाँचकर चुना प्लान सक्रिय करें।", "تحقق من وصول الدفعة ثم فعّل الباقة."],
  "admin.noPendingPayments": ["暂无待审核付款", "No pending payments", "No hay pagos pendientes", "कोई लंबित भुगतान नहीं", "لا توجد دفعات معلّقة"],
  "admin.noReference": ["未填写凭证号", "No payment reference", "Sin referencia", "कोई भुगतान संदर्भ नहीं", "لا يوجد مرجع دفع"],
  "admin.reject": ["拒绝", "Reject", "Rechazar", "अस्वीकार", "رفض"],
  "admin.approve": ["确认到账并开通", "Confirm and activate", "Confirmar y activar", "पुष्टि कर सक्रिय करें", "أكد وفعّل"],
  "admin.paymentApproved": ["已确认到账并开通会员", "Payment approved and membership activated", "Pago aprobado y membresía activada", "भुगतान स्वीकृत और सदस्यता सक्रिय", "تم قبول الدفع وتفعيل العضوية"],
  "admin.paymentRejected": ["付款申请已标记为未通过", "Payment request rejected", "Solicitud de pago rechazada", "भुगतान अनुरोध अस्वीकृत", "تم رفض طلب الدفع"],
  "admin.enterpriseCodes": ["企业半年 PRO 兑换码", "Enterprise six-month PRO codes", "Códigos PRO empresariales de seis meses", "कंपनी छह-माह PRO कोड", "رموز PRO للشركات لمدة ستة أشهر"],
  "admin.enterpriseCodesDesc": ["按企业购买席位生成一次性兑换码。", "Create one-time codes for purchased enterprise seats.", "Crea códigos únicos para plazas empresariales.", "खरीदी कंपनी सीटों के लिए एकबारगी कोड बनाएँ।", "أنشئ رموزاً أحادية الاستخدام لمقاعد الشركات."],
  "admin.enterpriseName": ["企业名称", "Enterprise name", "Nombre de empresa", "कंपनी का नाम", "اسم الشركة"],
  "admin.enterpriseNamePlaceholder": ["例如：某某科技", "Example: Acme Ltd.", "Ejemplo: Acme S.L.", "उदाहरण: Acme Ltd.", "مثال: شركة Acme"],
  "admin.codeSeats": ["兑换码数量", "Number of codes", "Número de códigos", "कोड की संख्या", "عدد الرموز"],
  "admin.generateCodes": ["生成兑换码", "Generate codes", "Generar códigos", "कोड बनाएँ", "إنشاء الرموز"],
  "admin.generating": ["正在生成…", "Generating…", "Generando…", "बन रहे हैं…", "جارٍ الإنشاء…"],
  "admin.generatedCodes": ["本批兑换码（仅本次显示）", "New codes (shown once)", "Códigos nuevos (una sola vez)", "नए कोड (एक बार दिखेंगे)", "الرموز الجديدة (تظهر مرة واحدة)"],
  "admin.copyAll": ["复制全部", "Copy all", "Copiar todo", "सभी कॉपी करें", "نسخ الكل"],
  "admin.codeSecurity": ["平台只保存兑换码指纹；请立即复制并通过企业交付渠道发送。", "Only code fingerprints are stored. Copy now and deliver through the enterprise channel.", "Solo se guardan huellas. Copia ahora y entrega por el canal empresarial.", "केवल कोड फिंगरप्रिंट सहेजे जाते हैं। अभी कॉपी कर कंपनी चैनल से भेजें।", "تُحفظ بصمات الرموز فقط. انسخها الآن وأرسلها عبر قناة الشركة."],
  "admin.codesCreated": ["已生成 {count} 个企业兑换码", "Created {count} enterprise codes", "Se crearon {count} códigos", "{count} कंपनी कोड बनाए गए", "تم إنشاء {count} رمزاً للشركات"],
  "admin.productionTitle": ["会员与企业权益运营台", "Membership & enterprise operations", "Operaciones de membresía y empresas", "सदस्यता और कंपनी संचालन", "عمليات العضوية والشركات"],
  "admin.productionDescription": ["实时审核付款申请，并生成仅显示一次的企业半年 PRO 兑换码。", "Review live payment requests and generate one-time enterprise six-month PRO codes.", "Revisa pagos en vivo y genera códigos PRO empresariales de seis meses que se muestran una sola vez.", "लाइव भुगतान अनुरोध जाँचें और एक बार दिखने वाले छह-माह PRO कंपनी कोड बनाएँ।", "راجع طلبات الدفع الفعلية وأنشئ رموز PRO للشركات لمدة ستة أشهر تظهر مرة واحدة."],
  "admin.currentOperator": ["当前管理员", "Current administrator", "Administrador actual", "वर्तमान एडमिन", "المدير الحالي"],
  "admin.pendingPayments": ["待审核付款", "Pending payments", "Pagos pendientes", "लंबित भुगतान", "الدفعات المعلقة"],
  "admin.availableCodes": ["未兑换企业码", "Available enterprise codes", "Códigos empresariales disponibles", "उपलब्ध कंपनी कोड", "رموز الشركات المتاحة"],
  "admin.productionService": ["生产会员服务", "Production membership service", "Servicio de membresía", "प्रोडक्शन सदस्यता सेवा", "خدمة العضوية الإنتاجية"],
  "admin.connected": ["已连接", "Connected", "Conectado", "कनेक्टेड", "متصل"],
  "admin.loading": ["正在读取实时数据…", "Loading live data…", "Cargando datos en vivo…", "लाइव डेटा लोड हो रहा है…", "جارٍ تحميل البيانات الفعلية…"],
  "admin.reviewing": ["正在处理…", "Processing…", "Procesando…", "प्रोसेस हो रहा है…", "جارٍ المعالجة…"],
  "admin.serviceError": ["运营服务暂时不可用，请刷新后重试", "The operations service is temporarily unavailable. Refresh and try again.", "El servicio no está disponible temporalmente. Actualiza e inténtalo de nuevo.", "ऑपरेशंस सेवा अभी उपलब्ध नहीं है। रिफ्रेश कर फिर प्रयास करें।", "خدمة العمليات غير متاحة مؤقتاً. حدّث وحاول مجدداً."],
  "admin.retry": ["重新加载", "Reload", "Recargar", "फिर लोड करें", "إعادة التحميل"],

  "profile.title": ["个人中心", "Your space", "Tu espacio", "आपका स्थान", "مساحتك"],
  "profile.description": ["查看身份、学习数据与当前演示环境说明。", "View your identity, learning data and preview environment.", "Consulta tu identidad, datos y entorno de prueba.", "अपनी पहचान, सीखने के आँकड़े और प्रीव्यू वातावरण देखें।", "اطّلع على هويتك وبيانات التعلّم وبيئة المعاينة."],
  "profile.logout": ["退出登录", "Sign out", "Cerrar sesión", "साइन आउट", "تسجيل الخروج"],
  "profile.identity": ["身份与角色", "Identity & role", "Identidad y rol", "पहचान और भूमिका", "الهوية والدور"],
  "profile.identityDesc": ["当前角色：{role}。普通注册账号默认为学员，管理员可在角色管理中调整。", "Current role: {role}. New accounts begin as learners; admins can change roles.", "Rol actual: {role}. Las cuentas nuevas comienzan como estudiantes.", "वर्तमान भूमिका: {role}। नए खाते शिक्षार्थी के रूप में शुरू होते हैं।", "الدور الحالي: {role}. تبدأ الحسابات الجديدة كمتعلّمين."],
  "profile.storage": ["数据存储说明", "Data storage", "Almacenamiento de datos", "डेटा संग्रह", "تخزين البيانات"],
  "profile.storageDesc": ["当前公开预览版将账号散列与学习进度保存在本浏览器，不会同步到其他设备，也不适合作为正式账号系统。", "This public preview stores account hashes and progress in this browser. It does not sync and is not a production identity system.", "Esta versión guarda cuentas y progreso en el navegador. No sincroniza ni sustituye un sistema real.", "यह प्रीव्यू खाते और प्रगति इस ब्राउज़र में रखता है। यह सिंक या प्रोडक्शन पहचान प्रणाली नहीं है।", "تحفظ هذه المعاينة الحسابات والتقدم في المتصفح، ولا تزامنها ولا تصلح كنظام هوية إنتاجي."],
  "profile.productionStorageDesc": ["账号、会员、订单和 AI 用量保存在服务端；当前课程作品与知识值保存在本设备。", "Account, membership, orders and AI usage are stored on the server; course work and Knowledge XP remain on this device.", "La cuenta, membresía, pedidos y uso de IA se guardan en el servidor; el trabajo del curso permanece en este dispositivo.", "खाता, सदस्यता, ऑर्डर और AI उपयोग सर्वर पर हैं; पाठ्यक्रम का काम और XP इस डिवाइस पर रहते हैं।", "يُحفظ الحساب والعضوية والطلبات واستخدام الذكاء على الخادم؛ وتبقى أعمال الدورة والنقاط على هذا الجهاز."],
  "profile.restart": ["重新开始学习", "Restart learning", "Reiniciar aprendizaje", "सीखना फिर शुरू करें", "إعادة بدء التعلّم"],
  "profile.restartDesc": ["清空当前账号在此设备上的知识值、连续天数和课节完成记录。", "Clear this account's XP, streak and completed lessons on this device.", "Borra el XP, la racha y las lecciones completadas en este dispositivo.", "इस डिवाइस पर इस खाते का XP, निरंतरता और पूर्ण पाठ मिटाएँ।", "امسح نقاط هذا الحساب وسلسلة الأيام والدروس المكتملة على هذا الجهاز."],
  "profile.clear": ["清空进度", "Clear progress", "Borrar progreso", "प्रगति मिटाएँ", "مسح التقدم"],
  "profile.confirmClear": ["确认清空", "Confirm clear", "Confirmar", "मिटाना पुष्टि करें", "تأكيد المسح"],
  "profile.resetDone": ["学习记录已重新开始", "Learning progress restarted", "Progreso reiniciado", "सीखने की प्रगति फिर शुरू हुई", "تمت إعادة بدء التقدم"],

  "lesson.tabLecture": ["深度讲义", "Method preview", "Vista del método", "विधि प्रीव्यू", "معاينة المنهج"],
  "lesson.tabBooks": ["核心书架", "Core books", "Libros", "मुख्य पुस्तकें", "الكتب الأساسية"],
  "lesson.tabCase": ["案例拆解", "Case study", "Caso", "केस स्टडी", "دراسة حالة"],
  "lesson.tabAi": ["AI 陪练", "AI coach", "Coach IA", "AI कोच", "مدرب الذكاء"],
  "lesson.aiChecking": ["正在核验权益…", "Checking access…", "Verificando acceso…", "एक्सेस जाँचा जा रहा है…", "جارٍ التحقق من الصلاحية…"],
  "lesson.tabVideo": ["视频课", "Video", "Vídeo", "वीडियो", "فيديو"],
  "lesson.tabSources": ["资料来源", "Sources", "Fuentes", "स्रोत", "المصادر"],
  "lesson.practical": ["实战课节", "Practical lesson", "Lección práctica", "व्यावहारिक पाठ", "درس عملي"],
  "lesson.explainer": ["{duration} 讲解", "{duration} guided lesson", "Guía de {duration}", "{duration} निर्देशित पाठ", "شرح لمدة {duration}"],
  "lesson.practiceTime": ["约 60–120 分钟实作", "60–120 min applied work", "60–120 min de práctica", "60–120 मिनट व्यावहारिक काम", "60–120 دقيقة تطبيق عملي"],
  "lesson.outcome": ["完成后带走", "Evidence you will create", "Evidencia que crearás", "आपका बनाया प्रमाण", "الدليل الذي ستنشئه"],
  "lesson.contentNav": ["课程内容", "Lesson content", "Contenido", "पाठ सामग्री", "محتوى الدرس"],
  "lesson.yourProject": ["现在轮到你的真实项目", "Now apply it to your real project", "Ahora aplícalo a tu proyecto real", "अब इसे अपने वास्तविक प्रोजेक्ट पर लागू करें", "طبّقه الآن على مشروعك الحقيقي"],
  "lesson.saveEvidence": ["保存为能力证据", "Save as capability evidence", "Guárdalo como evidencia", "क्षमता प्रमाण के रूप में सहेजें", "احفظه كدليل قدرة"],
  "lesson.masterLanguageNotice": ["", "Language note: the interface and method preview are translated; the complete learning content in the other five tabs is the Simplified Chinese master edition.", "Nota de idioma: la interfaz y el método están traducidos; el contenido completo de las otras cinco pestañas corresponde a la edición maestra en chino simplificado.", "भाषा सूचना: इंटरफ़ेस और विधि प्रीव्यू अनूदित हैं; अन्य पाँच टैब की पूरी सामग्री सरलीकृत चीनी मास्टर संस्करण में है।", "ملاحظة اللغة: تمت ترجمة الواجهة ومعاينة المنهج؛ والمحتوى الكامل في علامات التبويب الخمس الأخرى هو النسخة الصينية المبسطة."],
  "lesson.chineseOriginal": ["中文原文", "Simplified Chinese master content", "Contenido maestro en chino simplificado", "सरलीकृत चीनी मास्टर सामग्री", "المحتوى الأصلي بالصينية المبسطة"],
  "lesson.evidenceTitle": ["提交本课作品证据", "Submit evidence for this lesson", "Envía la evidencia de esta lección", "इस पाठ का प्रमाण जमा करें", "أرسل دليل هذا الدرس"],
  "lesson.evidenceDesc": ["写清你做了什么、依据什么、下一步如何验收。至少 20 个字符；链接可选。", "State what you made, the evidence behind it and how the next step will be verified. At least 20 characters; link optional.", "Explica qué creaste, la evidencia y cómo validarás el siguiente paso. Mínimo 20 caracteres; enlace opcional.", "क्या बनाया, उसका प्रमाण और अगली जाँच लिखें। कम से कम 20 अक्षर; लिंक वैकल्पिक।", "اكتب ما أنجزته ودليله وكيف ستتحقق من الخطوة التالية. 20 حرفاً على الأقل؛ الرابط اختياري."],
  "lesson.evidenceText": ["作品说明", "Evidence statement", "Descripción de la evidencia", "प्रमाण विवरण", "وصف الدليل"],
  "lesson.evidencePlaceholder": ["例如：我完成了目标客户访谈稿，依据 3 次真实访谈整理了共同问题；下一步将用 5 位目标用户测试。", "Example: I completed the interview brief using three real interviews and will test it with five target users next.", "Ejemplo: completé el guion con tres entrevistas reales y lo probaré con cinco usuarios objetivo.", "उदाहरण: मैंने तीन वास्तविक इंटरव्यू से ब्रीफ़ बनाया और अब पाँच लक्षित उपयोगकर्ताओं के साथ जाँचूँगा।", "مثال: أنجزت ملخص المقابلات استناداً إلى ثلاث مقابلات حقيقية وسأختبره مع خمسة مستخدمين مستهدفين."],
  "lesson.evidenceUrl": ["作品链接（可选）", "Evidence link (optional)", "Enlace de evidencia (opcional)", "प्रमाण लिंक (वैकल्पिक)", "رابط الدليل (اختياري)"],
  "lesson.evidenceUrlPlaceholder": ["https://… 仅支持 http / https", "https://… http / https only", "https://… solo http / https", "https://… केवल http / https", "https://… يدعم http / https فقط"],
  "lesson.evidenceUrlError": ["链接必须以 http:// 或 https:// 开头", "Use a valid http:// or https:// link", "Usa un enlace válido http:// o https://", "मान्य http:// या https:// लिंक दें", "استخدم رابطاً صالحاً يبدأ بـ http:// أو https://"],
  "lesson.evidenceCount": ["{count}/20 最少字符", "{count}/20 minimum characters", "{count}/20 caracteres mínimos", "{count}/20 न्यूनतम अक्षर", "{count}/20 الحد الأدنى للحروف"],
  "lesson.saveDraft": ["保存草稿", "Save draft", "Guardar borrador", "ड्राफ्ट सहेजें", "حفظ المسودة"],
  "lesson.draftSaved": ["作品草稿已保存在本浏览器", "Evidence draft saved in this browser", "Borrador guardado en este navegador", "प्रमाण ड्राफ्ट इस ब्राउज़र में सहेजा गया", "حُفظت مسودة الدليل في هذا المتصفح"],
  "lesson.submitEvidence": ["提交证据并完成本课", "Submit evidence and complete", "Enviar evidencia y completar", "प्रमाण जमा कर पाठ पूरा करें", "أرسل الدليل وأكمل الدرس"],
  "lesson.updateEvidence": ["更新已提交证据", "Update submitted evidence", "Actualizar evidencia enviada", "जमा प्रमाण अपडेट करें", "حدّث الدليل المرسل"],
  "lesson.evidenceSubmitted": ["证据已提交，可继续完善", "Evidence submitted; you can keep improving it", "Evidencia enviada; puedes seguir mejorándola", "प्रमाण जमा है; आप इसे बेहतर कर सकते हैं", "تم إرسال الدليل ويمكنك مواصلة تحسينه"],
  "lesson.legacyEvidence": ["这节课有历史 XP 记录但尚无作品证据；补交后计入进度，不会重复奖励。", "This lesson has legacy XP but no evidence. Add evidence to restore progress; XP will not be awarded twice.", "Esta lección tiene XP anterior pero no evidencia. Añádela para recuperar el progreso sin duplicar XP.", "इस पाठ का पुराना XP है पर प्रमाण नहीं। प्रमाण जोड़ने पर प्रगति लौटेगी, XP दोबारा नहीं मिलेगा।", "لهذا الدرس نقاط سابقة بلا دليل. أضف الدليل لاستعادة التقدم دون تكرار النقاط."],
  "lesson.evidenceLocal": ["仅保存在本浏览器 · 学员自证 · 尚未经过导师审核", "Stored only in this browser · learner-submitted · not mentor-reviewed", "Solo en este navegador · enviado por el alumno · sin revisión del mentor", "केवल इस ब्राउज़र में · शिक्षार्थी द्वारा जमा · मेंटर समीक्षा नहीं", "محفوظ في هذا المتصفح فقط · مقدّم من المتعلم · غير مراجع من المرشد"],
  "lesson.attest": ["我已完成真实项目任务，而不只是浏览内容", "I completed the real project task—not just the content", "Completé la tarea real, no solo el contenido", "मैंने वास्तविक कार्य पूरा किया है—केवल सामग्री नहीं देखी", "أنجزت مهمة المشروع الحقيقية، ولم أكتفِ بالمحتوى"],
  "lesson.attestSub": ["并已保存“{deliverable}”作为可复用证据", "I saved “{deliverable}” as reusable evidence", "Guardé «{deliverable}» como evidencia reutilizable", "मैंने “{deliverable}” को पुनः उपयोग योग्य प्रमाण के रूप में सहेजा", "حفظت «{deliverable}» كدليل قابل لإعادة الاستخدام"],
  "lesson.markNote": ["完成真实练习后再标记", "Mark complete after real practice", "Marca al terminar la práctica", "वास्तविक अभ्यास के बाद पूरा चिह्नित करें", "علّم كمكتمل بعد التطبيق الحقيقي"],
  "lesson.absorbed": ["小晴已经吸收了这份知识", "Xiaoqing has absorbed this knowledge", "Xiaoqing ha absorbido este conocimiento", "श्याओछिंग ने यह ज्ञान आत्मसात कर लिया है", "استوعبت شياوتشينغ هذه المعرفة"],
  "lesson.earn": ["完成可获得 {xp} 知识值", "Complete to earn {xp} knowledge XP", "Completa para ganar {xp} XP", "पूरा करके {xp} ज्ञान XP पाएँ", "أكمل لتحصل على {xp} نقطة معرفة"],
  "lesson.completeButton": ["完成学习，让小晴成长", "Complete and grow Xiaoqing", "Completa y haz crecer a Xiaoqing", "पूरा करें और श्याओछिंग को बढ़ाएँ", "أكمل وساعد شياوتشينغ على النمو"],
  "lesson.youLearn": ["这节课真正解决什么", "What this lesson actually solves", "Qué resuelve esta lección", "यह पाठ वास्तव में क्या हल करता है", "ما الذي يحلّه هذا الدرس فعلاً"],
  "lesson.coreConcept": ["核心概念", "Core concept", "Concepto central", "मुख्य अवधारणा", "المفهوم الأساسي"],
  "lesson.method": ["跟做方法", "Applied method", "Método aplicado", "व्यावहारिक विधि", "طريقة التطبيق"],
  "lesson.pitfall": ["常见误区", "Common pitfall", "Error habitual", "आम गलती", "خطأ شائع"],
  "lesson.quickCheck": ["先确认你真的理解了", "Check your understanding", "Comprueba tu comprensión", "अपनी समझ जाँचें", "تحقّق من فهمك"],
  "lesson.booksTitle": ["不是书单，是可直接应用的核心书架", "Not a reading list—an applied core library", "No es una lista: es una biblioteca aplicada", "पढ़ने की सूची नहीं—व्यावहारिक मुख्य पुस्तकालय", "ليست قائمة قراءة، بل مكتبة تطبيقية"],
  "lesson.caseTitle": ["先看完整闭环，再做自己的项目", "See the full loop, then build your own", "Observa el ciclo completo y luego crea el tuyo", "पूरा चक्र देखें, फिर अपना बनाएँ", "شاهد الدورة كاملة ثم ابنِ مشروعك"],
  "lesson.videoTitle": ["带着任务看，不把播放完成当作学习", "Watch with a task—playing to the end is not learning", "Mira con una tarea: terminar el vídeo no es aprender", "काम के साथ देखें—वीडियो खत्म करना सीखना नहीं है", "شاهد بهدف، فإكمال الفيديو ليس تعلّماً"],
  "lesson.sourcesTitle": ["继续阅读与来源边界", "Further reading and source boundaries", "Lecturas y límites de las fuentes", "आगे पढ़ें और स्रोत सीमाएँ", "قراءات إضافية وحدود المصادر"],
  "lesson.genericSummary": ["", "Apply “{title}” to a real venture decision, record the evidence and leave with a reusable operating asset.", "Aplica «{title}» a una decisión real, registra la evidencia y crea un activo reutilizable.", "“{title}” को वास्तविक उद्यम निर्णय पर लागू करें, प्रमाण दर्ज करें और पुनः उपयोग योग्य संपत्ति बनाएँ।", "طبّق «{title}» على قرار حقيقي، وسجّل الدليل وأنشئ أصلاً قابلاً لإعادة الاستخدام."],
  "lesson.genericObjective1": ["", "Frame the decision this lesson must improve", "Define la decisión que esta lección debe mejorar", "उस निर्णय को परिभाषित करें जिसे यह पाठ बेहतर करेगा", "حدّد القرار الذي يجب أن يحسّنه هذا الدرس"],
  "lesson.genericObjective2": ["", "Separate current evidence from assumptions", "Separa la evidencia actual de las suposiciones", "मौजूदा प्रमाण को धारणाओं से अलग करें", "افصل الدليل الحالي عن الافتراضات"],
  "lesson.genericObjective3": ["", "Create one asset you can verify and reuse", "Crea un activo verificable y reutilizable", "एक सत्यापन योग्य, पुनः उपयोग योग्य संपत्ति बनाएँ", "أنشئ أصلاً قابلاً للتحقق وإعادة الاستخدام"],
  "lesson.genericPractice": ["", "Use your current project: state the decision, attach at least one real signal, make the next move and note what would change your mind.", "Usa tu proyecto: define la decisión, añade una señal real, decide el siguiente paso y anota qué te haría cambiar de opinión.", "अपने प्रोजेक्ट में निर्णय लिखें, कम से कम एक वास्तविक संकेत जोड़ें, अगला कदम तय करें और बताएँ कि कौन-सा प्रमाण निर्णय बदलेगा।", "استخدم مشروعك: اكتب القرار وأرفق إشارة حقيقية وحدّد الخطوة التالية وما الدليل الذي قد يغيّر رأيك."],
  "lesson.genericDeliverable": ["", "Applied evidence · {title}", "Evidencia aplicada · {title}", "व्यावहारिक प्रमाण · {title}", "دليل تطبيقي · {title}"],
  "lesson.intlConcept": ["", "Evidence before confidence", "Evidencia antes que certeza", "आत्मविश्वास से पहले प्रमाण", "الدليل قبل الثقة"],
  "lesson.intlConceptDetail": ["", "Treat this lesson as a decision system. Start with a real situation, mark what is known and unknown, then choose the smallest action that can generate stronger evidence.", "Trata esta lección como un sistema de decisión: parte de una situación real, separa lo conocido de lo desconocido y elige la acción mínima que genere mejor evidencia.", "इस पाठ को निर्णय प्रणाली की तरह उपयोग करें। वास्तविक स्थिति से शुरू करें, ज्ञात और अज्ञात अलग करें, फिर बेहतर प्रमाण देने वाला सबसे छोटा कदम चुनें।", "تعامل مع الدرس كنظام قرار: ابدأ بموقف حقيقي، وافصل المعلوم عن المجهول، ثم اختر أصغر خطوة تنتج دليلاً أقوى."],
  "lesson.intlMethod": ["", "Evidence-to-action loop", "Ciclo de evidencia a acción", "प्रमाण-से-कार्रवाई चक्र", "حلقة الدليل إلى الفعل"],
  "lesson.intlStep1": ["", "Write the decision in one clear sentence.", "Escribe la decisión en una frase clara.", "निर्णय को एक स्पष्ट वाक्य में लिखें।", "اكتب القرار في جملة واضحة."],
  "lesson.intlStep2": ["", "Attach one source, observation or customer signal.", "Añade una fuente, observación o señal del cliente.", "एक स्रोत, अवलोकन या ग्राहक संकेत जोड़ें।", "أرفق مصدراً أو ملاحظة أو إشارة من عميل."],
  "lesson.intlStep3": ["", "Choose the smallest next action and its acceptance test.", "Elige la acción mínima y su prueba de aceptación.", "सबसे छोटा अगला कदम और उसकी स्वीकृति जाँच चुनें।", "اختر أصغر خطوة تالية واختبار قبولها."],
  "lesson.intlPitfall": ["", "Do not let polished AI wording turn an assumption into a fact. Keep sources, dates and uncertainty visible.", "No permitas que una redacción pulida por IA convierta una suposición en un hecho. Mantén visibles fuentes, fechas e incertidumbre.", "सुसज्जित AI भाषा को धारणा को तथ्य न बनाने दें। स्रोत, तारीख और अनिश्चितता स्पष्ट रखें।", "لا تدع صياغة الذكاء المصقولة تحوّل الافتراض إلى حقيقة. أبقِ المصادر والتواريخ وعدم اليقين ظاهرة."],
  "lesson.intlCheck1": ["", "What decision will change after this lesson?", "¿Qué decisión cambiará después de esta lección?", "इस पाठ के बाद कौन-सा निर्णय बदलेगा?", "ما القرار الذي سيتغيّر بعد هذا الدرس؟"],
  "lesson.intlAnswer1": ["", "Name one decision—not a broad ambition—and identify who owns it.", "Nombra una decisión concreta e identifica quién la asume.", "एक ठोस निर्णय लिखें—व्यापक महत्वाकांक्षा नहीं—और उसका मालिक बताएँ।", "اذكر قراراً واحداً محدداً، لا طموحاً عاماً، وحدّد المسؤول عنه."],
  "lesson.intlCheck2": ["", "Which evidence is real today, and which part is still an assumption?", "¿Qué evidencia es real hoy y qué sigue siendo una suposición?", "आज कौन-सा प्रमाण वास्तविक है और क्या अभी धारणा है?", "ما الدليل الحقيقي اليوم، وما الذي لا يزال افتراضاً؟"],
  "lesson.intlAnswer2": ["", "Label each claim as observed, sourced or assumed, with a date where possible.", "Etiqueta cada afirmación como observada, documentada o supuesta, con fecha si es posible.", "हर दावे को देखा हुआ, स्रोत-समर्थित या धारणा के रूप में चिह्नित करें; संभव हो तो तारीख जोड़ें।", "صنّف كل ادعاء إلى ملاحظ أو موثّق أو مفترض، وأضف التاريخ حيث أمكن."],

  "praise.day": ["DAY {count} · 今日份夸赞", "DAY {count} · TODAY'S ENCOURAGEMENT", "DÍA {count} · ELOGIO DE HOY", "दिन {count} · आज की हौसला-अफ़ज़ाई", "اليوم {count} · تشجيع اليوم"],
  "praise.welcome": ["{name}，很高兴你今天回来了。", "{name}, we are glad you came back today.", "{name}, nos alegra que hayas vuelto hoy.", "{name}, आज आपके लौटने की खुशी है।", "{name}، سعداء بعودتك اليوم."],
  "praise.accept": ["收下夸赞，开始今天", "Take it in and begin", "Recíbelo y empieza", "इसे स्वीकारें और शुरू करें", "تقبّل التشجيع وابدأ"],
  "praise.note": ["小晴每天只送一次，但你随时可以回来再看。", "Xiaoqing offers one each day, and you can revisit it anytime.", "Xiaoqing ofrece uno al día; puedes volver cuando quieras.", "श्याओछिंग हर दिन एक देती है; आप कभी भी फिर पढ़ सकते हैं।", "تقدّم شياوتشينغ رسالة يومية واحدة، ويمكنك العودة إليها متى شئت."],
  "reward.success": ["知识吸收成功", "Knowledge absorbed", "Conocimiento absorbido", "ज्ञान आत्मसात हुआ", "تم استيعاب المعرفة"],
  "reward.title": ["小晴获得 +{xp} 知识值", "Xiaoqing gained +{xp} knowledge XP", "Xiaoqing obtuvo +{xp} XP", "श्याओछिंग ने +{xp} ज्ञान XP पाया", "كسبت شياوتشينغ +{xp} نقطة معرفة"],
  "reward.levelUp": ["太棒了！小晴已经成长为「{level}」。", "Wonderful—Xiaoqing has grown into {level}.", "¡Genial! Xiaoqing ha crecido hasta {level}.", "बहुत बढ़िया—श्याओछिंग अब {level} बन गई है।", "رائع! تطورت شياوتشينغ إلى {level}."],
  "reward.growth": ["你的真实行动，正在变成小晴和你的共同成长。", "Your real action is becoming shared growth for you and Xiaoqing.", "Tu acción real se convierte en crecimiento compartido con Xiaoqing.", "आपकी वास्तविक कार्रवाई आपके और श्याओछिंग के साझा विकास में बदल रही है।", "يتحوّل عملك الحقيقي إلى نمو مشترك لك ولشياوتشينغ."],
  "reward.continue": ["继续成长", "Keep growing", "Seguir creciendo", "बढ़ते रहें", "واصل النمو"],

  "greeting.late": ["夜深了", "Still building", "Sigues creando", "अभी भी निर्माण जारी", "ما زلت تبني"],
  "greeting.morning": ["早上好", "Good morning", "Buenos días", "सुप्रभात", "صباح الخير"],
  "greeting.noon": ["中午好", "Good afternoon", "Buenas tardes", "नमस्कार", "مساء الخير"],
  "greeting.afternoon": ["下午好", "Good afternoon", "Buenas tardes", "नमस्कार", "مساء الخير"],
  "greeting.evening": ["晚上好", "Good evening", "Buenas noches", "शुभ संध्या", "مساء الخير"],
};

const lessonIds = [
  "identity-01", "identity-02", "identity-03", "identity-04",
  "research-01", "research-02", "research-03", "research-04",
  "product-01", "product-02", "product-03", "product-04",
  "design-01", "design-02", "design-03", "design-04",
  "build-01", "build-02", "build-03", "build-04",
  "launch-01", "launch-02", "launch-03", "launch-04",
  "growth-01", "growth-02", "growth-03", "growth-04",
  "opc-01", "opc-02", "opc-03", "opc-04",
] as const;

const lessonTitleSets: Record<Exclude<Locale, "zh-CN">, string[]> = {
  en: [
    "A solo company is not a solo act", "From skills to deliverable capability", "Choose one problem worth 12 weeks", "Write your first solo-business hypothesis",
    "Desk research: size, signals and boundaries", "Interview past behaviour, not imagined intent", "Competitors are alternatives, not a list", "Turn fragmented evidence into an opportunity thesis",
    "Build a value proposition from the customer job", "Define an MVP by the cost of learning", "Design the path to first value", "Write a product brief your team can build from",
    "A brand is a stable decision system—not a logo", "Information architecture and low-fidelity flows", "Build a usable visual and component system", "Test usability, accessibility and trust",
    "The minimum technical map of a web product", "Turn needs into an AI-executable build spec", "Data, sign-in, permissions and version safety", "Test, deploy, monitor and roll back",
    "From capability to offer: pricing, packages and economics", "Founder-led sales: find the first 30 customers", "Diagnostic selling: questions, demos, objections and negotiation", "The sale is the start: contract, onboarding, delivery and renewal",
    "Productise one delivery into a reusable knowledge asset", "Turn 'I know how' into an executable SOP", "The Who matrix for AI, partners and experts", "Operate as orchestrator: weekly review, monthly iteration, quarterly bets",
    "Choose the first overseas market: drill one well", "Beyond translation: rebuild the path to value", "Global pricing, payment and tax flows", "A compliant cold start: complete one-market pilot",
  ],
  es: [
    "Una empresa individual no significa trabajar solo", "De habilidades a capacidad entregable", "Elige un problema que merezca 12 semanas", "Escribe tu primera hipótesis de negocio individual",
    "Investigación de escritorio: tamaño, señales y límites", "Entrevista conductas pasadas, no intenciones imaginadas", "La competencia son alternativas, no una lista", "Convierte evidencia fragmentada en una tesis de oportunidad",
    "Crea la propuesta de valor desde la tarea del cliente", "Define el MVP por el coste de aprender", "Diseña el camino al primer valor", "Escribe un brief de producto listo para construir",
    "La marca es un sistema de decisiones, no un logotipo", "Arquitectura de información y flujos de baja fidelidad", "Crea un sistema visual y de componentes utilizable", "Prueba usabilidad, accesibilidad y confianza",
    "El mapa técnico mínimo de un producto web", "Convierte necesidades en una especificación ejecutable por IA", "Datos, acceso, permisos y seguridad de versiones", "Prueba, despliega, monitoriza y revierte",
    "De capacidad a oferta: precio, paquetes y economía", "Ventas del fundador: encuentra los primeros 30 clientes", "Venta diagnóstica: preguntas, demo, objeciones y negociación", "La venta es el inicio: contrato, alta, entrega y renovación",
    "Convierte una entrega en un activo de conocimiento", "Convierte «sé hacerlo» en un SOP ejecutable", "Matriz Who para IA, socios y expertos", "Opera como orquestador: revisión semanal, iteración mensual y apuestas trimestrales",
    "Elige el primer mercado exterior: perfora un solo pozo", "Más allá de traducir: rediseña el camino al valor", "Precio, pagos e impuestos globales", "Arranque conforme: completa un piloto en un mercado",
  ],
  hi: [
    "एकल कंपनी का अर्थ अकेले काम करना नहीं", "कौशल से डिलीवर करने योग्य क्षमता तक", "12 सप्ताह के योग्य एक समस्या चुनें", "अपनी पहली एकल-व्यवसाय परिकल्पना लिखें",
    "डेस्क रिसर्च: आकार, संकेत और सीमाएँ", "कल्पना नहीं, पिछले व्यवहार पर इंटरव्यू करें", "प्रतियोगी सूची नहीं, विकल्प हैं", "बिखरे प्रमाण को अवसर परिकल्पना में बदलें",
    "ग्राहक के काम से मूल्य प्रस्ताव बनाएँ", "सीखने की लागत से MVP परिभाषित करें", "पहले मूल्य तक का मार्ग डिज़ाइन करें", "निर्माण-योग्य प्रोडक्ट ब्रीफ़ लिखें",
    "ब्रांड एक स्थिर निर्णय प्रणाली है—लोगो नहीं", "सूचना संरचना और लो-फिडेलिटी फ्लो", "उपयोगी विज़ुअल और कंपोनेंट सिस्टम बनाएँ", "उपयोगिता, पहुँच और भरोसे की जाँच करें",
    "वेब प्रोडक्ट का न्यूनतम तकनीकी मानचित्र", "ज़रूरतों को AI-निष्पादन योग्य स्पेक में बदलें", "डेटा, साइन-इन, अनुमति और वर्ज़न सुरक्षा", "टेस्ट, डिप्लॉय, मॉनिटर और रोलबैक",
    "क्षमता से ऑफ़र: मूल्य, पैकेज और इकॉनॉमिक्स", "संस्थापक-नेतृत्व वाली बिक्री: पहले 30 ग्राहक", "डायग्नॉस्टिक सेलिंग: प्रश्न, डेमो, आपत्ति और वार्ता", "बिक्री शुरुआत है: अनुबंध, ऑनबोर्डिंग, डिलीवरी और नवीनीकरण",
    "एक डिलीवरी को पुनः उपयोग योग्य ज्ञान संपत्ति बनाएँ", "‘मुझे आता है’ को निष्पादन योग्य SOP बनाएँ", "AI, साझेदार और विशेषज्ञों की Who मैट्रिक्स", "ऑर्केस्ट्रेटर संचालन: साप्ताहिक समीक्षा, मासिक सुधार, तिमाही दाँव",
    "पहला विदेशी बाज़ार चुनें: एक ही कुआँ खोदें", "अनुवाद से आगे: मूल्य का मार्ग पुनर्निर्मित करें", "वैश्विक मूल्य, भुगतान और कर प्रवाह", "अनुपालक शुरुआत: एक-बाज़ार पायलट पूरा करें",
  ],
  ar: [
    "الشركة الفردية لا تعني العمل وحيداً", "من المهارة إلى قدرة قابلة للتسليم", "اختر مشكلة تستحق 12 أسبوعاً", "اكتب فرضية عملك الفردي الأولى",
    "البحث المكتبي: الحجم والإشارات والحدود", "اسأل عن السلوك الماضي لا النوايا المتخيّلة", "المنافسون بدائل، لا قائمة أسماء", "حوّل الأدلة المتناثرة إلى أطروحة فرصة",
    "ابنِ عرض القيمة من مهمة العميل", "عرّف المنتج الأولي بتكلفة التعلّم", "صمّم الطريق إلى القيمة الأولى", "اكتب موجز منتج جاهزاً للبناء",
    "العلامة نظام قرار ثابت، وليست شعاراً", "هندسة المعلومات والتدفقات الأولية", "ابنِ نظاماً بصرياً ونظام مكوّنات قابلاً للتطبيق", "اختبر سهولة الاستخدام وإتاحة الوصول والثقة",
    "الخريطة التقنية الدنيا لمنتج ويب", "حوّل الاحتياجات إلى مواصفات قابلة لتنفيذ الذكاء الاصطناعي", "البيانات وتسجيل الدخول والصلاحيات وأمان الإصدارات", "اختبر وانشر وراقب وتراجع بأمان",
    "من القدرة إلى العرض: التسعير والباقات والاقتصاد", "مبيعات يقودها المؤسس: أول 30 عميلاً", "البيع التشخيصي: الأسئلة والعرض والاعتراض والتفاوض", "البيع هو البداية: العقد والتهيئة والتسليم والتجديد",
    "حوّل تسليماً واحداً إلى أصل معرفي متكرر", "حوّل «أعرف كيف» إلى إجراء قابل للتنفيذ", "مصفوفة من يفعل ماذا للذكاء والشركاء والخبراء", "شغّل كقائد منظومة: مراجعة أسبوعية وتطوير شهري ورهانات فصلية",
    "اختر أول سوق خارجي: احفر بئراً واحدة", "أبعد من الترجمة: أعد بناء طريق القيمة", "التسعير والدفع والضرائب عالمياً", "بداية ملتزمة: نفّذ تجربة في سوق واحد",
  ],
};

type StageTuple = readonly [
  title: string,
  subtitle: string,
  outcome: string,
  deliverable: string,
  immortalName: string,
  domain: string,
  keyQuestion: string,
  asset: string,
];

const stageSets: Record<Exclude<Locale, "zh-CN">, Record<string, StageTuple>> = {
  en: {
    identity: ["Strategy & Solo-Business Design", "Turn experience, capability and resources into a direction the market can understand.", "State whose problem you solve, what result you create and why you can win.", "One-page solo-business canvas + 30-second positioning", "The Strategist", "Strategy & business model", "Why this, for whom, and why us?", "Strategy one-pager + 12-week bet"],
    research: ["Market Research & Customer Insight", "Use desk research and real interviews to find problems people already pay to solve.", "Describe customers, alternatives and the best entry point with evidence.", "10-interview insight report + opportunity map", "The Explorer", "Market & customer insight", "Who pays a real cost for this problem?", "Evidence library + insight map"],
    product: ["Product Definition & Minimum Validation", "Turn evidence into an offer users can understand, try and commit to.", "Validate the smallest solution that creates a measurable first value.", "Product brief + clickable MVP + test record", "The Maker", "Product & minimum validation", "What is the smallest proof that value exists?", "Product brief + MVP + validation log"],
    design: ["Brand & Interface Design", "Make the value clear, credible and consistent across every touchpoint.", "Create an experience users can understand, trust and continue using.", "Brand language + interface system + usability report", "The Storyteller", "Brand, content & experience", "Why will users trust us and keep going?", "Brand language + experience system"],
    build: ["AI Engineering & Release", "Use specs, AI and release gates to ship a safe, maintainable product.", "Deploy a working product with access control, tests, monitoring and rollback.", "Live product + repository + release runbook", "The Builder", "AI engineering & launch", "How do we ship safely and keep maintaining?", "Task contracts + code + release runbook"],
    launch: ["Monetisation & Customer Success", "Package capability into an offer and close the loop from lead to renewal.", "Win real commitments and deliver measurable customer success.", "Pricing + sales playbook + first-customer success plan", "The Closer", "Revenue & customer success", "Why will customers pay, and how do we keep the promise?", "Offer + sales script + success playbook"],
    growth: ["OPC Systems & Growth Operations", "Turn delivery into assets, SOPs, partner protocols and a weekly operating rhythm.", "Build a company system that compounds without depending on you being online.", "Asset map + SOP library + operator dashboard", "The Orchestrator", "OPC systems & growth", "How does the business work without me always present?", "Asset map + collaboration system + dashboard"],
    opc: ["Global Expansion & International Operations", "Enter one country, one niche and one real transaction before scaling.", "Complete a compliant one-market pilot and decide whether to expand or stop.", "One-market expansion plan + localisation and compliance checklist", "The Navigator", "Global expansion", "Where first, what changes, and how do we collect and deliver compliantly?", "One-market launch book + compliance checklist"],
  },
  es: {
    identity: ["Estrategia y diseño del negocio individual", "Convierte experiencia, capacidades y recursos en una dirección que el mercado entienda.", "Explica para quién resuelves qué problema y por qué puedes ganar.", "Lienzo de negocio de una página + posicionamiento de 30 segundos", "El Estratega", "Estrategia y modelo de negocio", "¿Por qué esto, para quién y por qué nosotros?", "Estrategia de una página + apuesta de 12 semanas"],
    research: ["Investigación de mercado y clientes", "Usa investigación y entrevistas reales para encontrar problemas por los que ya se paga.", "Describe clientes, alternativas y el mejor punto de entrada con evidencia.", "Informe de 10 entrevistas + mapa de oportunidad", "El Explorador", "Mercado y cliente", "¿Quién paga un coste real por este problema?", "Biblioteca de evidencia + mapa de insights"],
    product: ["Definición de producto y validación mínima", "Convierte evidencia en una oferta que se pueda entender, probar y elegir.", "Valida la solución mínima que crea un primer valor medible.", "Brief de producto + MVP clicable + registro de pruebas", "El Creador", "Producto y validación", "¿Cuál es la prueba mínima de que existe valor?", "Brief + MVP + registro de validación"],
    design: ["Diseño de marca e interfaz", "Haz que el valor sea claro, creíble y coherente en cada punto de contacto.", "Crea una experiencia que se comprenda, inspire confianza y mantenga la acción.", "Lenguaje de marca + sistema de interfaz + informe de usabilidad", "El Narrador", "Marca, contenido y experiencia", "¿Por qué confiarán y seguirán los usuarios?", "Lenguaje de marca + sistema de experiencia"],
    build: ["Ingeniería con IA y publicación", "Usa especificaciones, IA y controles para publicar un producto seguro y mantenible.", "Despliega con acceso, pruebas, monitorización y reversión.", "Producto publicado + repositorio + manual de lanzamiento", "El Constructor", "Tecnología IA y lanzamiento", "¿Cómo publicamos con seguridad y mantenemos el producto?", "Contratos de tarea + código + manual"],
    launch: ["Monetización y éxito del cliente", "Convierte capacidad en oferta y cierra el ciclo de oportunidad a renovación.", "Consigue compromisos reales y resultados medibles.", "Precios + playbook de ventas + plan de éxito", "El Negociador", "Ingresos y éxito del cliente", "¿Por qué pagará el cliente y cómo cumplimos?", "Oferta + guion de ventas + playbook de éxito"],
    growth: ["Sistemas OPC y operaciones de crecimiento", "Convierte entregas en activos, SOP, acuerdos y ritmo operativo.", "Crea un sistema que crece sin depender de que estés siempre conectado.", "Mapa de activos + biblioteca SOP + panel operativo", "El Orquestador", "Sistemas OPC y crecimiento", "¿Cómo funciona el negocio sin mi presencia constante?", "Mapa de activos + sistema de colaboración + panel"],
    opc: ["Expansión global y operaciones internacionales", "Entra en un país, un nicho y una transacción real antes de escalar.", "Completa un piloto conforme y decide si expandir o parar.", "Plan de un mercado + lista de localización y cumplimiento", "El Navegante", "Expansión global", "¿Dónde primero, qué cambia y cómo cobramos y entregamos legalmente?", "Plan de entrada + lista de cumplimiento"],
  },
  hi: {
    identity: ["रणनीति और एकल-व्यवसाय डिज़ाइन", "अनुभव, क्षमता और संसाधनों को बाज़ार की समझ में आने वाली दिशा में बदलें।", "स्पष्ट करें कि किसकी कौन-सी समस्या हल करते हैं और क्यों जीत सकते हैं।", "एक-पृष्ठ व्यवसाय कैनवस + 30-सेकंड पोज़िशनिंग", "रणनीतिकार", "रणनीति और बिज़नेस मॉडल", "यह क्यों, किसके लिए, और हम क्यों?", "एक-पृष्ठ रणनीति + 12-सप्ताह का मुख्य दाँव"],
    research: ["बाज़ार रिसर्च और ग्राहक अंतर्दृष्टि", "रिसर्च और वास्तविक इंटरव्यू से वे समस्याएँ खोजें जिनके लिए लोग भुगतान करते हैं।", "प्रमाण से ग्राहक, विकल्प और सर्वोत्तम प्रवेश बिंदु बताएँ।", "10 इंटरव्यू रिपोर्ट + अवसर मानचित्र", "अन्वेषक", "बाज़ार और ग्राहक अंतर्दृष्टि", "इस समस्या के लिए कौन वास्तविक कीमत चुका रहा है?", "प्रमाण पुस्तकालय + अंतर्दृष्टि मानचित्र"],
    product: ["प्रोडक्ट परिभाषा और न्यूनतम सत्यापन", "प्रमाण को ऐसी पेशकश में बदलें जिसे लोग समझें, आज़माएँ और चुनें।", "मापने योग्य पहले मूल्य का न्यूनतम समाधान जाँचें।", "प्रोडक्ट ब्रीफ़ + क्लिक योग्य MVP + टेस्ट रिकॉर्ड", "निर्माता", "प्रोडक्ट और न्यूनतम सत्यापन", "मूल्य का सबसे छोटा प्रमाण क्या है?", "प्रोडक्ट ब्रीफ़ + MVP + सत्यापन लॉग"],
    design: ["ब्रांड और इंटरफ़ेस डिज़ाइन", "हर टचपॉइंट पर मूल्य को स्पष्ट, विश्वसनीय और सुसंगत बनाएँ।", "ऐसा अनुभव बनाएँ जिसे उपयोगकर्ता समझें, भरोसा करें और जारी रखें।", "ब्रांड भाषा + इंटरफ़ेस सिस्टम + उपयोगिता रिपोर्ट", "कथाकार", "ब्रांड, सामग्री और अनुभव", "उपयोगकर्ता भरोसा कर आगे क्यों बढ़ेंगे?", "ब्रांड भाषा + अनुभव प्रणाली"],
    build: ["AI इंजीनियरिंग और रिलीज़", "स्पेसिफिकेशन, AI और रिलीज़ गेट से सुरक्षित, रखरखाव योग्य उत्पाद लॉन्च करें।", "एक्सेस, टेस्ट, मॉनिटरिंग और रोलबैक सहित कार्यशील उत्पाद डिप्लॉय करें।", "लाइव प्रोडक्ट + रिपॉज़िटरी + रिलीज़ रनबुक", "निर्माता इंजीनियर", "AI तकनीक और लॉन्च", "सुरक्षित लॉन्च और निरंतर रखरखाव कैसे करें?", "टास्क कॉन्ट्रैक्ट + कोड + रिलीज़ रनबुक"],
    launch: ["मुद्रीकरण और ग्राहक सफलता", "क्षमता को ऑफ़र में पैकेज कर लीड से नवीनीकरण तक चक्र पूरा करें।", "वास्तविक प्रतिबद्धता पाएँ और मापने योग्य ग्राहक सफलता दें।", "मूल्य + बिक्री प्लेबुक + ग्राहक सफलता योजना", "सौदा-कर्ता", "राजस्व और ग्राहक सफलता", "ग्राहक भुगतान क्यों करेगा, और हम वादा कैसे निभाएँगे?", "ऑफ़र + बिक्री स्क्रिप्ट + सफलता प्लेबुक"],
    growth: ["OPC सिस्टम और ग्रोथ संचालन", "डिलीवरी को संपत्ति, SOP, साझेदार प्रोटोकॉल और संचालन लय में बदलें।", "ऐसा सिस्टम बनाएँ जो आपकी निरंतर उपस्थिति के बिना बढ़े।", "संपत्ति मानचित्र + SOP पुस्तकालय + संचालन डैशबोर्ड", "ऑर्केस्ट्रेटर", "OPC सिस्टम और विकास", "मेरे हमेशा ऑनलाइन हुए बिना व्यवसाय कैसे चले?", "संपत्ति मानचित्र + सहयोग प्रणाली + डैशबोर्ड"],
    opc: ["वैश्विक विस्तार और अंतरराष्ट्रीय संचालन", "स्केल से पहले एक देश, एक समूह और एक वास्तविक लेनदेन में प्रवेश करें।", "एक अनुपालक बाज़ार पायलट पूरा कर विस्तार या रुकने का निर्णय लें।", "एक-बाज़ार योजना + स्थानीयकरण और अनुपालन सूची", "नाविक", "वैश्विक विस्तार", "पहले कहाँ, क्या बदले, और भुगतान व डिलीवरी अनुपालक कैसे हों?", "एक-बाज़ार लॉन्च बुक + अनुपालन सूची"],
  },
  ar: {
    identity: ["الاستراتيجية وتصميم العمل الفردي", "حوّل الخبرة والقدرات والموارد إلى اتجاه يفهمه السوق.", "وضّح لمن تحل المشكلة وما النتيجة ولماذا يمكنك الفوز.", "لوحة عمل من صفحة واحدة + تموضع في 30 ثانية", "الاستراتيجي", "الاستراتيجية ونموذج العمل", "لماذا هذا، ولمن، ولماذا نحن؟", "استراتيجية صفحة واحدة + رهان 12 أسبوعاً"],
    research: ["بحث السوق وفهم العميل", "استخدم البحث والمقابلات الحقيقية لاكتشاف مشكلات يدفع الناس لحلها.", "صِف العملاء والبدائل وأفضل نقطة دخول بالدليل.", "تقرير 10 مقابلات + خريطة فرصة", "المستكشف", "السوق وفهم العميل", "من يدفع كلفة حقيقية بسبب هذه المشكلة؟", "مكتبة أدلة + خريطة رؤى"],
    product: ["تعريف المنتج والاختبار الأدنى", "حوّل الدليل إلى عرض يمكن فهمه وتجربته والالتزام به.", "اختبر أصغر حل يخلق قيمة أولى قابلة للقياس.", "موجز منتج + نموذج قابل للنقر + سجل اختبار", "الصانع", "المنتج والاختبار", "ما أصغر دليل يثبت وجود القيمة؟", "موجز + نموذج أولي + سجل اختبار"],
    design: ["تصميم العلامة والواجهة", "اجعل القيمة واضحة وموثوقة ومتسقة في كل نقطة اتصال.", "أنشئ تجربة يفهمها المستخدم ويثق بها ويواصل استخدامها.", "لغة علامة + نظام واجهة + تقرير قابلية الاستخدام", "الراوي", "العلامة والمحتوى والتجربة", "لماذا سيثق المستخدم ويواصل؟", "لغة العلامة + نظام التجربة"],
    build: ["هندسة الذكاء الاصطناعي والإطلاق", "استخدم المواصفات والذكاء وبوابات الإطلاق لنشر منتج آمن قابل للصيانة.", "انشر منتجاً عاملاً بصلاحيات واختبارات ومراقبة وتراجع آمن.", "منتج حي + مستودع + دليل إطلاق", "البنّاء", "تقنية الذكاء والإطلاق", "كيف نطلق بأمان ونواصل الصيانة؟", "عقود مهام + شيفرة + دليل إطلاق"],
    launch: ["تحقيق الإيراد ونجاح العميل", "حوّل القدرة إلى عرض وأغلق الحلقة من العميل المحتمل إلى التجديد.", "احصل على التزام حقيقي وقدّم نجاحاً قابلاً للقياس.", "تسعير + دليل مبيعات + خطة نجاح العميل", "صانع الصفقات", "الإيراد ونجاح العميل", "لماذا يدفع العميل وكيف نفي بالوعد؟", "عرض + نص مبيعات + دليل نجاح"],
    growth: ["أنظمة OPC وعمليات النمو", "حوّل التنفيذ إلى أصول وإجراءات واتفاقات وإيقاع تشغيل.", "ابنِ نظاماً يتراكم من دون اعتماد دائم على وجودك.", "خريطة أصول + مكتبة إجراءات + لوحة تشغيل", "قائد المنظومة", "أنظمة OPC والنمو", "كيف يعمل المشروع من دون حضوري الدائم؟", "خريطة أصول + نظام تعاون + لوحة"],
    opc: ["التوسع العالمي والعمليات الدولية", "ادخل بلداً واحداً وشريحة واحدة وصفقة حقيقية قبل التوسع.", "أنجز تجربة ملتزمة في سوق واحد وقرّر التوسع أو التوقف.", "خطة سوق واحد + قائمة توطين وامتثال", "الملاح", "التوسع العالمي", "أين نبدأ، وما الذي يتغير، وكيف نقبض ونسلّم بامتثال؟", "دليل إطلاق سوق واحد + قائمة امتثال"],
  },
};

const weeks: Record<string, MessageTuple> = {
  identity: ["第 1 周", "Week 1", "Semana 1", "सप्ताह 1", "الأسبوع 1"],
  research: ["第 2–3 周", "Weeks 2–3", "Semanas 2–3", "सप्ताह 2–3", "الأسبوعان 2–3"],
  product: ["第 4–5 周", "Weeks 4–5", "Semanas 4–5", "सप्ताह 4–5", "الأسبوعان 4–5"],
  design: ["第 6 周", "Week 6", "Semana 6", "सप्ताह 6", "الأسبوع 6"],
  build: ["第 7–8 周", "Weeks 7–8", "Semanas 7–8", "सप्ताह 7–8", "الأسبوعان 7–8"],
  launch: ["第 9–10 周", "Weeks 9–10", "Semanas 9–10", "सप्ताह 9–10", "الأسبوعان 9–10"],
  growth: ["第 11 周", "Week 11", "Semana 11", "सप्ताह 11", "الأسبوع 11"],
  opc: ["第 12 周", "Week 12", "Semana 12", "सप्ताह 12", "الأسبوع 12"],
};

const contractFields: Record<Locale, string[]> = {
  "zh-CN": ["角色", "目标", "受众", "输入", "约束", "步骤", "输出", "验收"],
  en: ["Role", "Goal", "Audience", "Inputs", "Constraints", "Steps", "Output", "Acceptance"],
  es: ["Rol", "Meta", "Audiencia", "Entradas", "Límites", "Pasos", "Salida", "Validación"],
  hi: ["भूमिका", "लक्ष्य", "दर्शक", "इनपुट", "सीमाएँ", "चरण", "आउटपुट", "स्वीकृति"],
  ar: ["الدور", "الهدف", "الجمهور", "المدخلات", "القيود", "الخطوات", "المخرجات", "القبول"],
};

const buddyForms: Record<Locale, [string, string][]> = {
  "zh-CN": [["知识萌芽", "开始对世界保持好奇"], ["探索学徒", "能把问题拆成下一步"], ["洞察行者", "开始用证据校准判断"], ["产品造物者", "能把洞察做成作品"], ["增长协作者", "能连接伙伴放大价值"], ["OPC 经营者", "把经验变成可复用系统"], ["链主伙伴", "能定义、连接、验收并负责"]],
  en: [["Knowledge Sprout", "Curiosity has begun"], ["Exploration Apprentice", "Turns problems into next steps"], ["Insight Pathfinder", "Calibrates judgement with evidence"], ["Product Maker", "Turns insight into shipped work"], ["Growth Collaborator", "Connects people to amplify value"], ["OPC Operator", "Turns experience into systems"], ["Orchestrator Partner", "Defines, connects, verifies and owns"]],
  es: [["Brote de conocimiento", "La curiosidad ha comenzado"], ["Aprendiz explorador", "Convierte problemas en próximos pasos"], ["Guía de insights", "Calibra decisiones con evidencia"], ["Creador de producto", "Convierte insights en trabajo publicado"], ["Colaborador de crecimiento", "Conecta personas para ampliar valor"], ["Operador OPC", "Convierte experiencia en sistemas"], ["Socio orquestador", "Define, conecta, valida y responde"]],
  hi: [["ज्ञान अंकुर", "जिज्ञासा शुरू हो गई है"], ["अन्वेषण प्रशिक्षु", "समस्याओं को अगले कदम में बदलता है"], ["अंतर्दृष्टि पथिक", "प्रमाण से निर्णय सुधारता है"], ["प्रोडक्ट निर्माता", "अंतर्दृष्टि को उत्पाद बनाता है"], ["ग्रोथ सहयोगी", "लोगों को जोड़कर मूल्य बढ़ाता है"], ["OPC संचालक", "अनुभव को सिस्टम में बदलता है"], ["ऑर्केस्ट्रेटर साथी", "परिभाषित, जोड़ता, जाँचता और जिम्मेदारी लेता है"]],
  ar: [["برعم المعرفة", "بدأ الفضول بالنمو"], ["متدرّب الاستكشاف", "يحوّل المشكلة إلى خطوة تالية"], ["مستكشف الرؤى", "يضبط الحكم بالدليل"], ["صانع المنتج", "يحوّل الرؤية إلى عمل منشور"], ["شريك النمو", "يربط الناس لمضاعفة القيمة"], ["مشغّل OPC", "يحوّل الخبرة إلى أنظمة"], ["شريك المنظومة", "يحدّد ويربط ويتحقق ويتحمّل المسؤولية"]],
};

const praiseSets: Record<Locale, string[]> = {
  "zh-CN": [],
  en: ["You chose evidence over guessing today. That is real builder progress.", "A small, honest step beats a perfect plan that never ships.", "Your experience is becoming a method you can reuse and share.", "Returning today is proof that you can build with consistency."],
  es: ["Hoy elegiste evidencia en lugar de suposiciones. Eso es progreso real.", "Un paso pequeño y honesto supera a un plan perfecto que nunca se publica.", "Tu experiencia se está convirtiendo en un método reutilizable.", "Volver hoy demuestra que puedes construir con constancia."],
  hi: ["आज आपने अनुमान के बजाय प्रमाण चुना—यही वास्तविक प्रगति है।", "एक छोटा सच्चा कदम उस पूर्ण योजना से बेहतर है जो कभी लॉन्च न हो।", "आपका अनुभव पुनः उपयोग योग्य विधि बन रहा है।", "आज लौटना साबित करता है कि आप निरंतर निर्माण कर सकते हैं।"],
  ar: ["اخترت اليوم الدليل بدلاً من التخمين. هذا تقدّم حقيقي.", "خطوة صغيرة صادقة أفضل من خطة مثالية لا تُطلق.", "تتحوّل خبرتك إلى منهج يمكن تكراره ومشاركته.", "عودتك اليوم دليل على قدرتك على البناء باستمرار."],
};

function interpolate(value: string, variables?: Record<string, string | number>) {
  if (!variables) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(variables[key] ?? `{${key}}`));
}

function stableHash(value: string) {
  return Array.from(value).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

type I18nValue = {
  locale: Locale;
  direction: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  formatNumber: (value: number) => string;
  localizeLesson: (lesson: Lesson) => Lesson;
  localizeStage: (stage: CourseStage) => CourseStage;
  localizeImmortal: (immortal: ImmortalProfile) => ImmortalProfile;
  localizeBuddy: (level: { level: number; name: string; note: string }) => { level: number; name: string; note: string };
  localizePraise: (praise: string) => string;
  roleLabel: (role: UserRole) => string;
  roleDescription: (role: UserRole) => string;
  contractFields: string[];
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = readLocalValue(LOCALE_STORAGE_KEY);
    return localeOptions.some((item) => item.id === saved) ? saved as Locale : "zh-CN";
  });

  useEffect(() => {
    const html = document.documentElement;
    const direction = locale === "ar" ? "rtl" : "ltr";
    html.lang = locale;
    html.dir = direction;
    writeLocalValue(LOCALE_STORAGE_KEY, locale);
    document.title = messages["meta.title"][localeIndex[locale]];
    document.querySelector('meta[name="description"]')?.setAttribute("content", messages["meta.description"][localeIndex[locale]]);

    if (locale === "en" || locale === "es") {
      void Promise.all([import("@fontsource-variable/manrope/wght.css"), import("@fontsource-variable/newsreader/wght.css")]);
    } else if (locale === "hi") {
      void Promise.all([import("@fontsource-variable/noto-sans-devanagari/wght.css"), import("@fontsource-variable/noto-serif-devanagari/wght.css")]);
    } else {
      void Promise.all([import("@fontsource-variable/noto-sans-arabic/wght.css"), import("@fontsource-variable/noto-kufi-arabic/wght.css")]);
    }
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const index = localeIndex[locale];
    const t = (key: string, variables?: Record<string, string | number>) => interpolate(messages[key]?.[index] ?? messages[key]?.[0] ?? key, variables);
    const localizeLesson = (lesson: Lesson): Lesson => {
      if (locale === "zh-CN") return lesson;
      const titleIndex = lessonIds.indexOf(lesson.id as (typeof lessonIds)[number]);
      const minutes = lesson.duration.match(/\d+/)?.[0] ?? lesson.duration;
      const duration = locale === "hi" ? `${minutes} मिनट` : locale === "ar" ? `${minutes} دقيقة` : `${minutes} min`;
      const title = titleIndex >= 0 ? lessonTitleSets[locale][titleIndex] : lesson.title;
      return {
        ...lesson,
        title,
        duration,
        summary: t("lesson.genericSummary", { title }),
        objectives: [t("lesson.genericObjective1"), t("lesson.genericObjective2"), t("lesson.genericObjective3")],
        practice: t("lesson.genericPractice"),
        deliverable: t("lesson.genericDeliverable", { title }),
      };
    };
    const localizeStage = (stage: CourseStage): CourseStage => {
      if (locale === "zh-CN") return stage;
      const copy = stageSets[locale][stage.id];
      if (!copy) return { ...stage, lessons: stage.lessons.map(localizeLesson) };
      return {
        ...stage,
        title: copy[0], subtitle: copy[1], outcome: copy[2], deliverable: copy[3],
        eyebrow: `${copy[4]} · ${copy[5]}`,
        weeks: weeks[stage.id]?.[index] ?? stage.weeks,
        lessons: stage.lessons.map(localizeLesson),
      };
    };
    const localizeImmortal = (immortal: ImmortalProfile): ImmortalProfile => {
      if (locale === "zh-CN") return immortal;
      const copy = stageSets[locale][immortal.stageId];
      if (!copy) return immortal;
      const ordinal = ["identity", "research", "product", "design", "build", "launch", "growth", "opc"].indexOf(immortal.stageId) + 1;
      return {
        ...immortal,
        number: locale === "es" ? `Inmortal ${ordinal}` : locale === "hi" ? `अमर ${ordinal}` : locale === "ar" ? `الخالد ${ordinal}` : `Immortal ${ordinal}`,
        name: copy[4], domain: copy[5], keyQuestion: copy[6], opcAsset: copy[7],
        mission: copy[1],
      };
    };
    const roleLabel = (role: UserRole) => t(`role.${role}`);
    const roleDescription = (role: UserRole) => t(`role.${role}Desc`);
    const localizeBuddy = (level: { level: number; name: string; note: string }) => {
      const form = buddyForms[locale][Math.max(0, level.level - 1)];
      return form ? { ...level, name: form[0], note: form[1] } : level;
    };
    const localizePraise = (praise: string) => {
      if (locale === "zh-CN") return praise;
      const list = praiseSets[locale];
      return list[Math.abs(stableHash(praise)) % list.length];
    };
    return {
      locale,
      direction: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      t,
      formatNumber: (number) => new Intl.NumberFormat(locale).format(number),
      localizeLesson,
      localizeStage,
      localizeImmortal,
      localizeBuddy,
      localizePraise,
      roleLabel,
      roleDescription,
      contractFields: contractFields[locale],
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
