(function () {
  "use strict";

  var API_BASE = "https://www.happykua.com/kuakua-ai-api";
  var PLATFORM_URL = "https://happykua.com/kuakua-ai/";
  var MAX_CHARS = 12000;
  var accountData = null;
  var activeKey = null;
  var activeVariant = 0;
  var lastTrigger = null;
  var lastAttempt = null;
  var attemptsByPractice = {};
  var activeRequestController = null;
  var modalSession = 0;
  var inFlight = false;
  var completedWithoutResult = false;
  var roleplay = { persona: "polite", turns: [] };

  var practices = {
    "mirror-audit": {
      title: "方案照镜子",
      lessonId: "lesson2-mirror-audit",
      placeholder: "粘贴脱敏后的未签约方案片段。建议至少包含：客户背景、你理解的诉求、拟交付内容、当前进展、是否报价，以及客户原话。",
      criteria: [
        "清楚区分客户可追溯事实、创作者推断和仍然缺失的信息",
        "检查是否把感兴趣或礼貌认同误当成采购进展",
        "检查是否太早展示方案或太早报价",
        "把未来假设改为过去行为问题",
        "识别客户现有替代方案与切换成本",
        "给出一段可直接替换的确认需求式开头"
      ],
      basePrompt: "你是一名客户开发教练，精通《妈妈测试》和专业服务的确认需求纪律。我会粘贴一份写给客户的未签约方案。请做三步照镜子：第一，提取客户、诉求、拟交付，并把内容逐项标成客户事实、我的假设或缺失信息；第二，只根据我提供的材料整理客户信息，标注已知、推断、缺失，不得假装联网查证；第三，用四条纪律体检：是否把感兴趣当进展、是否太早展示或报价、是否问未来而非过去、是否绕过现有替代。输出体检报告、证据缺口、三条追问、可直接替换的开头和15分钟下一步。客户名须脱敏，不编造事实。",
      variants: [
        { label: "引导我补全", mode: "ask", focus: "先用问题引导我补齐客户原话、过去行为、替代方案和下一步承诺，再给体检结论。" },
        { label: "四纪律红队", mode: "challenge", focus: "以最严格的反方视角找出所有假性进展和未经证实的方案假设，不要被漂亮表达迷惑。" },
        { label: "按标准评审", mode: "review", focus: "逐条给出达标、部分达标、缺失，并提供一段不推销、不早报价的可用改写稿。" }
      ]
    },
    "guide-audit": {
      title: "无诱导提纲体检",
      lessonId: "lesson2-guide-audit",
      placeholder: "粘贴你准备问潜在客户的 5—10 个问题。例如：您觉得我们的方案怎么样？您会考虑购买吗？",
      criteria: [
        "逐题识别恭维诱导、概念讨论、未来预测和推销暗示",
        "把问题改成带具体时间点的过去行为问题",
        "覆盖触发、过程、替代、代价和结果",
        "不在问题中暗示产品答案",
        "补出关于真实承诺、付款与反证的追问"
      ],
      basePrompt: "你是一名《妈妈测试》访谈教练。我会给你一组潜在客户访谈问题。请逐题判断它是否会诱导恭维、让客户讨论概念、换来未来预测，或暗中推销方案；说明污染类型和风险；把每题改成询问过去真实行为的中文问题；最后按触发、过程、替代、代价、结果重排成一份无诱导提纲，并补上真实承诺与反证追问。不要替客户回答，也不要假设客户一定有痛点。",
      variants: [
        { label: "引导我补全", mode: "ask", focus: "先指出提纲还缺哪些对象、场景与决策信息，再给一组最少但关键的补问。" },
        { label: "诱导问题红队", mode: "challenge", focus: "逐题挑错，尤其抓出披着开放题外衣的推销、未来预测和索取认同。" },
        { label: "生成干净提纲", mode: "review", focus: "输出可直接访谈的干净版本；每题附一句为什么这样问，并控制在10题以内。" }
      ]
    },
    "evidence-card": {
      title: "客户证据卡",
      lessonId: "lesson2-evidence-card",
      placeholder: "粘贴一段脱敏后的访谈转写。尽量保留时间码、说话人或段落编号，便于回到原文核对。",
      criteria: [
        "只从转写原文提取，不编造客户观点或数字",
        "事实、痛点、代价与反证分栏",
        "每个结论附原话、时间码或段落位置",
        "明确区分客户原话、分析者解释与未知项",
        "识别说了但没做、前后矛盾和现有替代",
        "给出下一次最值得追问的证据缺口"
      ],
      basePrompt: "你是一名严谨的客户研究证据编辑。我会粘贴访谈转写。请只依据原文提取四栏：事实（真实发生过的）、痛点（客户明确表达的烦恼）、代价（时间、金钱、风险或机会损失）、反证（说了没做、矛盾、已有替代或不痛）。每条必须附能回到原文的短引文及时间码或段落位置；再单列分析者推断和未知项。找不到证据就写缺失，不得补写客户态度、数字或购买结论。最后给出三条下一次追问。",
      variants: [
        { label: "四栏萃取", mode: "ask", focus: "优先形成事实、痛点、代价、反证四栏，并用问题提醒我补充缺失的转写位置。" },
        { label: "证据真实性红队", mode: "challenge", focus: "专门找出把解释写成事实、把赞美写成需求、把未来意愿写成购买证据的地方。" },
        { label: "生成证据卡", mode: "review", focus: "输出结构化证据卡、原文位置、可信度判断、未知项和下一步追问。" }
      ]
    },
    "difficult-customer": {
      title: "难搞客户连续陪练",
      lessonId: "lesson2-difficult-customer",
      placeholder: "输入你这一轮要问客户的问题。不要先介绍产品，尽量问过去发生过的具体事情。",
      criteria: [
        "先按选定客户人设真实回应，不主动替学习者完善产品",
        "点评问题是否询问过去行为而非未来预测",
        "检查是否问到触发、替代、代价、阻碍和承诺",
        "发现推销、诱导或太早报价时明确指出",
        "每轮只推进一个最关键追问"
      ],
      basePrompt: "你是潜在客户兼《妈妈测试》访谈陪练。请按我选择的人设回应，并保持适度保留，不主动把需求、预算或决策链全说出来。我只负责提问。每轮先用客户口吻回答本轮问题，再点评我的问题质量：是否在问过去行为、是否诱导或推销、遗漏了哪项证据；最后只给一个更好的下一问。不得虚构成交，不要因为我提到方案就顺着夸。",
      variants: [
        { label: "真实客户陪练", mode: "ask", focus: "以客户回答为主，点评简短，让我通过连续追问自己挖出事实。" },
        { label: "高压追问红队", mode: "challenge", focus: "客户更谨慎、更少主动披露；严格指出我的诱导、推销和太早报价。" },
        { label: "逐轮评分", mode: "review", focus: "每轮按过去行为、具体性、中立性、证据推进四项简评，并给一个下一问。" }
      ],
      personas: [
        { id: "polite", label: "客套型", description: "总说挺好，但不主动给行动和时间表。" },
        { id: "delay", label: "拖延型", description: "总说忙，真实阻碍需要慢慢问出来。" },
        { id: "price", label: "爽快问价型", description: "很快问价格，测试你会不会太早报价。" }
      ]
    },
    "clue-map": {
      title: "替代方案线索地图",
      lessonId: "lesson2-clue-map",
      placeholder: "粘贴多条脱敏客户原话，每条尽量带编号。例如：Q03｜我们现在用 Excel 和微信群，每周五让助理汇总。",
      criteria: [
        "把原话归到软件工具、人工外包、表格文档、什么都不做四类",
        "每个归类附原话编号，不确定就标未知",
        "识别频率、成本、摩擦和切换阻力",
        "区分最痛凑合点与最容易进入的切口",
        "列出仍缺失的证据和下一轮追问",
        "不把AI推断写成客户结论"
      ],
      basePrompt: "你是一名客户替代方案研究助手。我会给你客户原话。请按四类归类：现有软件或工具、人工或外包、表格或文档凑合、什么都不做。每条都附原话编号；无法确定就标未知。然后比较各类的发生频率、时间或金钱成本、最烦步骤与切换阻力；分别指出最痛的凑合点、最容易验证的切入点和仍缺失的证据；最后给出三条下一轮追问。不得把推断写成客户事实。",
      variants: [
        { label: "引导我补全", mode: "ask", focus: "先检查原话是否足够归类，针对缺少频率、成本或决策信息的地方提出补问。" },
        { label: "切入点红队", mode: "challenge", focus: "挑战我最想做的切入点，检查它是否真的比现有替代明显更好、切换成本是否被忽略。" },
        { label: "生成一页地图", mode: "review", focus: "输出四类地图、最痛凑合点、低成本切口、证据缺口和7天验证动作。" }
      ]
    }
  };

  var modal = document.getElementById("coachModal");
  var title = document.getElementById("coachTitle");
  var account = document.getElementById("coachAccount");
  var tabs = document.getElementById("coachPromptTabs");
  var promptLabel = document.getElementById("coachPromptLabel");
  var promptText = document.getElementById("coachPromptText");
  var copyPromptButton = document.getElementById("coachCopyPrompt");
  var personaSection = document.getElementById("coachPersonaSection");
  var personaSelect = document.getElementById("coachPersonaSelect");
  var historyBox = document.getElementById("roleplayHistory");
  var inputHeading = document.getElementById("coachInputHeading");
  var material = document.getElementById("coachMaterial");
  var charCount = document.getElementById("coachCharCount");
  var clearButton = document.getElementById("coachClear");
  var resetButton = document.getElementById("coachResetRoleplay");
  var submitButton = document.getElementById("coachSubmit");
  var message = document.getElementById("coachMessage");
  var result = document.getElementById("coachResult");

  function practicePrompt(config, index) {
    var variant = config.variants[index || 0];
    return config.basePrompt + "\n\n本轮重点：" + variant.focus + "\n\n验收标准：\n- " + config.criteria.join("\n- ");
  }

  function copyText(text, button) {
    var done = function () {
      if (!button) return;
      var old = button.textContent;
      button.textContent = "已复制";
      window.setTimeout(function () { button.textContent = old; }, 1600);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text); done();
    }
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); } catch (ignore) {}
    area.remove();
  }

  function requestId() {
    var random = "";
    if (window.crypto && window.crypto.getRandomValues) {
      var values = new Uint32Array(2);
      window.crypto.getRandomValues(values);
      random = values[0].toString(36) + values[1].toString(36);
    } else {
      random = Math.random().toString(36).slice(2);
    }
    return "l2-" + Date.now().toString(36) + "-" + random.slice(0, 18);
  }

  function ApiError(status, code, text) {
    this.name = "ApiError";
    this.status = status;
    this.code = code || "API_ERROR";
    this.message = text || "服务请求失败";
  }
  ApiError.prototype = Object.create(Error.prototype);

  async function api(path, options, timeoutMs, suppliedController) {
    var controller = suppliedController || new AbortController();
    var timedOut = false;
    var timer = window.setTimeout(function () { timedOut = true; controller.abort(); }, timeoutMs || 15000);
    try {
      var response = await fetch(API_BASE + path, Object.assign({
        credentials: "include",
        headers: { Accept: "application/json" },
        signal: controller.signal
      }, options || {}));
      var payload = await response.json().catch(function () { return null; });
      if (!response.ok || !payload || !payload.ok) {
        var error = payload && payload.error ? payload.error : {};
        throw new ApiError(response.status, error.code, error.message || ("服务请求失败（" + response.status + "）"));
      }
      return payload.data;
    } catch (error) {
      if (error && error.name === "AbortError") {
        if (!timedOut) throw new ApiError(0, "REQUEST_CANCELLED", "本次页面请求已停止显示；服务端可能仍在处理，再次打开本练习会复用同一请求编号。");
        throw new ApiError(0, "REQUEST_TIMEOUT", "DeepSeek 响应仍在处理中，请使用同一请求编号重试。");
      }
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, "NETWORK_ERROR", "暂时无法连接 DeepSeek 服务，请检查网络后重试。");
    } finally {
      window.clearTimeout(timer);
    }
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function addAccountAction(label, callback) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.marginLeft = "10px";
    button.style.padding = "6px 9px";
    button.style.borderRadius = "8px";
    button.style.background = "#172033";
    button.style.color = "#fff";
    button.style.cursor = "pointer";
    button.addEventListener("click", callback);
    account.appendChild(button);
  }

  function accountStatusText() {
    if (!accountData) return "账号状态待确认";
    var tier = accountData.membership && accountData.membership.tier;
    var usage = accountData.aiUsage || {};
    if (tier === "max" || usage.mode === "unlimited") return "Max 会员 · AI 不限量";
    if (tier === "pro") return "PRO 会员 · 本期剩余 " + String(usage.remainingRuns == null ? "—" : usage.remainingRuns) + " 次";
    return "免费用户 · 可查看和复制提示词，运行 AI 需成为会员";
  }

  function updateInlineStatus(text) {
    document.querySelectorAll("[data-ds-status]").forEach(function (node) { node.textContent = text; });
  }

  function renderAccount() {
    account.classList.remove("is-error");
    clearNode(account);
    account.appendChild(document.createTextNode(accountStatusText()));
    var tier = accountData && accountData.membership && accountData.membership.tier;
    if (tier === "free") {
      addAccountAction("查看会员方案", function () { window.open(PLATFORM_URL, "_blank", "noopener"); });
    } else {
      addAccountAction("刷新权益", refreshAccount);
    }
    updateInlineStatus(accountStatusText().replace(" 会员", ""));
  }

  function renderSignedOut() {
    accountData = null;
    account.classList.add("is-error");
    clearNode(account);
    account.appendChild(document.createTextNode("尚未登录。登录平台后回到本页刷新，即可使用会员额度。"));
    addAccountAction("去登录", function () { window.open(PLATFORM_URL, "_blank", "noopener"); });
    addAccountAction("我已登录，刷新", refreshAccount);
    updateInlineStatus("未登录 · 提示词可复制");
  }

  async function refreshAccount() {
    account.classList.remove("is-error");
    account.textContent = "正在检查账号与会员权益…";
    try {
      accountData = await api("/me", { method: "GET" }, 15000);
      renderAccount();
    } catch (error) {
      if (error.status === 401) renderSignedOut();
      else {
        accountData = null;
        account.classList.add("is-error");
        account.textContent = error.message + " 提示词仍可复制。";
        addAccountAction("重试", refreshAccount);
        updateInlineStatus("账号状态待确认");
      }
    }
  }

  function renderTabs(config) {
    clearNode(tabs);
    config.variants.forEach(function (variant, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = variant.label;
      button.classList.toggle("active", index === activeVariant);
      button.addEventListener("click", function () {
        activeVariant = index;
        delete attemptsByPractice[activeKey];
        completedWithoutResult = false;
        renderTabs(config);
        renderPrompt(config);
        lastAttempt = null;
      });
      tabs.appendChild(button);
    });
  }

  function hasUnresolvedRequest() {
    return Boolean(lastAttempt && lastAttempt.awaitingResolution);
  }

  function renderPrompt(config) {
    promptLabel.textContent = config.variants[activeVariant].label + " · 完整提示词";
    promptText.textContent = practicePrompt(config, activeVariant);
  }

  function renderPersonas(config) {
    clearNode(personaSelect);
    (config.personas || []).forEach(function (persona) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = persona.label;
      button.title = persona.description;
      button.classList.toggle("active", roleplay.persona === persona.id);
      button.addEventListener("click", function () {
        roleplay.persona = persona.id;
        roleplay.turns = [];
        delete attemptsByPractice[activeKey];
        completedWithoutResult = false;
        renderPersonas(config);
        renderHistory();
        lastAttempt = null;
      });
      personaSelect.appendChild(button);
    });
  }

  function personaDescription(config) {
    var found = (config.personas || []).filter(function (item) { return item.id === roleplay.persona; })[0];
    return found ? found.label + "：" + found.description : "客套型";
  }

  function renderHistory() {
    clearNode(historyBox);
    historyBox.hidden = roleplay.turns.length === 0;
    roleplay.turns.forEach(function (turn, index) {
      var row = document.createElement("div");
      row.className = "roleplay-turn";
      var label = document.createElement("b");
      label.textContent = "第 " + String(index + 1) + " 轮";
      var text = document.createElement("div");
      text.textContent = "我：" + turn.learner + "\n客户：" + turn.customer;
      text.style.whiteSpace = "pre-wrap";
      row.appendChild(label);
      row.appendChild(text);
      historyBox.appendChild(row);
    });
  }

  function openPractice(key, trigger) {
    var config = practices[key];
    if (!config) return;
    modalSession += 1;
    activeKey = key;
    lastAttempt = attemptsByPractice[key] || null;
    activeVariant = lastAttempt ? lastAttempt.variantIndex : 0;
    completedWithoutResult = false;
    lastTrigger = trigger || document.activeElement;
    title.textContent = config.title;
    material.value = lastAttempt ? lastAttempt.learnerText : "";
    material.placeholder = config.placeholder;
    charCount.textContent = String(material.value.length) + " / " + MAX_CHARS;
    message.textContent = lastAttempt ? "上次请求状态尚未确认。再次提交会复用原请求编号，不会创建新的计费请求。" : "";
    message.className = "coach-message";
    result.hidden = true;
    clearNode(result);
    renderTabs(config);
    renderPrompt(config);
    var isRoleplay = Boolean(config.personas);
    personaSection.hidden = !isRoleplay;
    resetButton.hidden = !isRoleplay;
    inputHeading.textContent = isRoleplay ? "3. 输入你这一轮的问题" : "2. 粘贴脱敏材料";
    if (isRoleplay) {
      roleplay.turns = lastAttempt && lastAttempt.roleplayTurns ? lastAttempt.roleplayTurns.slice() : [];
      renderPersonas(config);
      renderHistory();
    }
    setFormBusy(false);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("ds-open");
    window.setTimeout(function () { material.focus(); }, 80);
    refreshAccount();
  }

  function closePractice() {
    modalSession += 1;
    if (activeRequestController) activeRequestController.abort();
    if (lastAttempt && activeKey) attemptsByPractice[activeKey] = lastAttempt;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ds-open");
    material.value = "";
    roleplay.turns = [];
    message.textContent = "";
    result.hidden = true;
    clearNode(result);
    if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
  }

  function buildRoleplayMaterial(config, learnerText) {
    var lines = ["【客户人设】", personaDescription(config), "", "【截至当前的对话】"];
    if (!roleplay.turns.length) lines.push("尚未开始。这是第一轮。");
    roleplay.turns.forEach(function (turn, index) {
      lines.push("第" + String(index + 1) + "轮｜学习者：" + turn.learner);
      lines.push("第" + String(index + 1) + "轮｜客户：" + turn.customer);
    });
    lines.push("", "【学习者本轮问题】", learnerText, "", "【输出约定】", "acknowledgement 先写客户口吻的真实回答；strengths 和 gaps 点评问题；questions 只给一个更好的下一问；nextAction 给本轮训练动作。");
    return lines.join("\n");
  }

  function addResultList(parent, heading, items) {
    if (!Array.isArray(items) || !items.length) return;
    var block = document.createElement("div");
    block.className = "result-block";
    var h = document.createElement("h4");
    h.textContent = heading;
    var list = document.createElement("ul");
    items.forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    block.appendChild(h);
    block.appendChild(list);
    parent.appendChild(block);
  }

  function addResultText(parent, heading, text) {
    if (!text) return;
    var block = document.createElement("div");
    block.className = "result-block";
    var h = document.createElement("h4");
    h.textContent = heading;
    var p = document.createElement("p");
    p.textContent = text;
    block.appendChild(h);
    block.appendChild(p);
    parent.appendChild(block);
  }

  function answerAsText(answer, model) {
    var lines = ["DeepSeek 课程陪练", "模型：" + (model || "DeepSeek"), "", "具体肯定", answer.acknowledgement || ""];
    [["已经做对", answer.strengths], ["证据缺口", answer.gaps], ["继续追问", answer.questions]].forEach(function (entry) {
      if (Array.isArray(entry[1]) && entry[1].length) lines.push("", entry[0], entry[1].map(function (x) { return "- " + x; }).join("\n"));
    });
    if (answer.improvedDraft) lines.push("", "可用改写", answer.improvedDraft);
    if (answer.nextAction) lines.push("", "15分钟下一步", answer.nextAction);
    return lines.join("\n");
  }

  function renderResult(data, config, learnerText) {
    clearNode(result);
    var answer = data.answer || {};
    var h = document.createElement("h3");
    h.textContent = "DeepSeek 课程反馈";
    var ack = document.createElement("div");
    ack.className = "result-ack";
    ack.textContent = answer.acknowledgement || "已完成本轮分析。";
    result.appendChild(h);
    result.appendChild(ack);
    addResultList(result, "已经做对", answer.strengths);
    addResultList(result, "证据缺口", answer.gaps);
    addResultList(result, "继续追问", answer.questions);
    if (Array.isArray(answer.rubric) && answer.rubric.length) {
      var rubricBlock = document.createElement("div");
      rubricBlock.className = "result-block";
      var rubricTitle = document.createElement("h4");
      rubricTitle.textContent = "标准检查";
      var rubricList = document.createElement("div");
      rubricList.className = "rubric-list";
      answer.rubric.forEach(function (item) {
        var row = document.createElement("div");
        row.className = "rubric-row " + (item.status || "partial");
        var b = document.createElement("b");
        b.textContent = item.label || "检查项";
        var span = document.createElement("span");
        span.textContent = item.note || "";
        row.appendChild(b);
        row.appendChild(span);
        rubricList.appendChild(row);
      });
      rubricBlock.appendChild(rubricTitle);
      rubricBlock.appendChild(rubricList);
      result.appendChild(rubricBlock);
    }
    addResultText(result, "可直接使用的改写", answer.improvedDraft);
    addResultText(result, "15 分钟下一步", answer.nextAction);
    var toolbar = document.createElement("div");
    toolbar.className = "result-toolbar";
    var model = document.createElement("span");
    model.textContent = "模型：" + (data.model || "DeepSeek");
    var copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "复制完整反馈";
    copy.addEventListener("click", function () { copyText(answerAsText(answer, data.model), copy); });
    toolbar.appendChild(model);
    toolbar.appendChild(copy);
    result.appendChild(toolbar);
    result.hidden = false;

    if (config.personas) {
      roleplay.turns.push({ learner: learnerText, customer: answer.acknowledgement || "（客户未给出有效回应）" });
      renderHistory();
      material.value = "";
      charCount.textContent = "0 / " + MAX_CHARS;
      material.placeholder = "继续追问。请用上轮客户回答里的一个具体词，问过去行为或现有替代。";
    }
  }

  function setError(error, allowRetry) {
    message.className = "coach-message is-error";
    clearNode(message);
    var text = error.message || "练习提交失败。";
    if (error.status === 401) text = "请先登录夸夸学习平台，再回到本页刷新账号状态。";
    if (error.status === 403) text = error.message || "使用真实 DeepSeek 需要 PRO 或 Max 会员。";
    message.appendChild(document.createTextNode(text));
    if (error.status === 401 || error.status === 403) {
      var link = document.createElement("a");
      link.href = PLATFORM_URL;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = error.status === 401 ? " 去登录" : " 查看会员方案";
      message.appendChild(link);
    }
    if (allowRetry && lastAttempt) {
      var retry = document.createElement("button");
      retry.type = "button";
      retry.className = "retry-button";
      retry.textContent = "按同一请求编号重试";
      retry.addEventListener("click", function () { submitAttempt(lastAttempt); });
      message.appendChild(document.createElement("br"));
      message.appendChild(retry);
    }
  }

  function setFormBusy(busy) {
    var lockRequestInputs = busy || hasUnresolvedRequest();
    material.disabled = lockRequestInputs;
    clearButton.disabled = lockRequestInputs;
    resetButton.disabled = lockRequestInputs;
    submitButton.disabled = busy;
    tabs.querySelectorAll("button").forEach(function (button) { button.disabled = lockRequestInputs; });
    personaSelect.querySelectorAll("button").forEach(function (button) { button.disabled = lockRequestInputs; });
  }

  async function submitAttempt(attempt) {
    if (inFlight) return;
    inFlight = true;
    attempt.awaitingResolution = true;
    lastAttempt = attempt;
    attemptsByPractice[attempt.practiceKey] = attempt;
    var requestSession = modalSession;
    var requestKey = attempt.practiceKey;
    var controller = new AbortController();
    activeRequestController = controller;
    setFormBusy(true);
    submitButton.textContent = "DeepSeek 正在分析…";
    message.className = "coach-message";
    message.textContent = "正在调用真实 DeepSeek。复杂材料可能需要约 60 秒，请勿重复点击。";
    try {
      var data = await api("/ai/coach", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(attempt.payload)
      }, 70000, controller);
      delete attemptsByPractice[requestKey];
      attempt.awaitingResolution = false;
      if (requestSession !== modalSession || activeKey !== requestKey) {
        if (activeKey === requestKey && lastAttempt && lastAttempt.payload.requestId === attempt.payload.requestId) {
          lastAttempt = null;
          completedWithoutResult = true;
          message.className = "coach-message is-error";
          message.textContent = "该请求已完成，但结果窗口已被关闭。为避免重复扣费，请先修改材料或清空后再发起新请求。";
        }
        return;
      }
      message.textContent = "";
      renderResult(data, attempt.config, attempt.learnerText);
      lastAttempt = null;
      completedWithoutResult = false;
      if (data.aiUsage) {
        accountData = accountData || { membership: { tier: data.aiUsage.mode === "unlimited" ? "max" : "pro" } };
        accountData.aiUsage = data.aiUsage;
        renderAccount();
      } else {
        refreshAccount();
      }
    } catch (error) {
      if (requestSession !== modalSession || activeKey !== requestKey) return;
      if (error.code === "AI_REQUEST_ALREADY_COMPLETED") {
        delete attemptsByPractice[requestKey];
        attempt.awaitingResolution = false;
        lastAttempt = null;
        completedWithoutResult = true;
        setError(new ApiError(409, error.code, "该请求已在服务器完成。为避免再次扣费，请先修改材料或点击清空，再开始一轮新练习。"), false);
        refreshAccount();
        return;
      }
      var retryable = error.code === "AI_REQUEST_IN_PROGRESS" || error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
      if (!retryable) {
        delete attemptsByPractice[requestKey];
        attempt.awaitingResolution = false;
        lastAttempt = null;
      }
      setError(error, retryable);
      if (error.status === 401) renderSignedOut();
    } finally {
      if (activeRequestController === controller) activeRequestController = null;
      inFlight = false;
      setFormBusy(false);
      if (requestSession === modalSession && activeKey === requestKey) {
        submitButton.textContent = "提交给真实 DeepSeek";
      }
    }
  }

  function submitCurrent() {
    var config = practices[activeKey];
    if (!config) return;
    if (completedWithoutResult) {
      setError(new ApiError(409, "COMPLETED_WITHOUT_RESULT", "上一请求已完成。请先修改材料、切换提示角度或点击清空，再开始新的计费请求。"), false);
      return;
    }
    if (lastAttempt) {
      submitAttempt(lastAttempt);
      return;
    }
    var learnerText = material.value.trim();
    if (!config.personas && learnerText.length < 20) {
      setError(new ApiError(400, "MATERIAL_TOO_SHORT", "请至少粘贴 20 个字的真实材料，再提交练习。"), false);
      material.focus();
      return;
    }
    if (config.personas && learnerText.length < 2) {
      setError(new ApiError(400, "QUESTION_TOO_SHORT", "请输入这一轮要问客户的完整问题。"), false);
      material.focus();
      return;
    }
    var tier = accountData && accountData.membership && accountData.membership.tier;
    if (tier === "free") {
      setError(new ApiError(403, "MEMBERSHIP_REQUIRED", "提示词可以免费复制；运行真实 DeepSeek 需要 PRO 或 Max 会员。"), false);
      return;
    }
    var requestMaterial = config.personas ? buildRoleplayMaterial(config, learnerText) : learnerText;
    var variant = config.variants[activeVariant];
    lastAttempt = {
      practiceKey: activeKey,
      config: config,
      learnerText: learnerText,
      variantIndex: activeVariant,
      roleplayTurns: roleplay.turns.slice(),
      payload: {
        requestId: requestId(),
        lessonId: config.lessonId,
        lessonTitle: "第2课｜" + config.title,
        goal: practicePrompt(config, activeVariant),
        material: requestMaterial,
        criteria: config.criteria,
        mode: variant.mode
      }
    };
    submitAttempt(lastAttempt);
  }

  document.addEventListener("click", function (event) {
    var launch = event.target.closest && event.target.closest(".ds-launch");
    if (launch) {
      openPractice(launch.getAttribute("data-practice"), launch);
      return;
    }
    var copyButton = event.target.closest && event.target.closest("[data-copy-practice]");
    if (copyButton) {
      var config = practices[copyButton.getAttribute("data-copy-practice")];
      if (config) copyText(practicePrompt(config, 0), copyButton);
      return;
    }
    var copyAll = event.target.closest && event.target.closest("#copyAllPrompts");
    if (copyAll) {
      var all = Object.keys(practices).map(function (key, index) {
        return "【" + String(index + 1) + "｜" + practices[key].title + "】\n" + practicePrompt(practices[key], 0);
      }).join("\n\n====================\n\n");
      copyText(all, copyAll);
    }
  });
  document.querySelectorAll("[data-coach-close]").forEach(function (node) { node.addEventListener("click", closePractice); });
  copyPromptButton.addEventListener("click", function () {
    var config = practices[activeKey];
    if (config) copyText(practicePrompt(config, activeVariant), copyPromptButton);
  });
  material.addEventListener("input", function () {
    charCount.textContent = String(material.value.length) + " / " + MAX_CHARS;
    delete attemptsByPractice[activeKey];
    lastAttempt = null;
    completedWithoutResult = false;
  });
  clearButton.addEventListener("click", function () {
    material.value = "";
    charCount.textContent = "0 / " + MAX_CHARS;
    message.textContent = "";
    message.className = "coach-message";
    result.hidden = true;
    clearNode(result);
    delete attemptsByPractice[activeKey];
    lastAttempt = null;
    completedWithoutResult = false;
    material.focus();
  });
  resetButton.addEventListener("click", function () {
    roleplay.turns = [];
    renderHistory();
    material.value = "";
    charCount.textContent = "0 / " + MAX_CHARS;
    result.hidden = true;
    clearNode(result);
    message.textContent = "对话已重置。";
    delete attemptsByPractice[activeKey];
    lastAttempt = null;
    completedWithoutResult = false;
  });
  submitButton.addEventListener("click", submitCurrent);
  window.addEventListener("keydown", function (event) {
    if (!modal.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closePractice();
    }
  }, true);

  updateInlineStatus("正在检查账号…");
  refreshAccount();
  window.qingmiDeepSeek = {
    open: openPractice,
    close: closePractice,
    practices: Object.keys(practices),
    accountStatus: function () { return accountStatusText(); }
  };
})();
