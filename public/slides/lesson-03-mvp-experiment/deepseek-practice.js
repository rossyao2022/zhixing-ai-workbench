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
    "evidence-to-value": {
      title: "证据变成价值主张",
      lessonId: "lesson3-evidence-value",
      placeholder: "粘贴脱敏客户证据卡：目标客户与场景、客户原话或过去行为、现有替代与代价、期待结果、候选机制。建议给证据编号 E01、E02。",
      criteria: [
        "核心判断能追溯到用户提供的证据编号或原话",
        "只聚焦一个具体客户、触发场景和关键任务",
        "承诺是可观察结果，不是智能、高效等空泛形容词",
        "产品机制与任务、痛点或收益之间有清楚对应",
        "证据、推断和未知明确分开",
        "不编造频率、金额、购买意愿或客户结论"
      ],
      basePrompt: "你是证据到价值主张教练。只使用我提供的证据，不得生成客户原话、频率、金额或购买意愿。先提取一个具体客户、触发场景、关键任务、阻碍代价、现有替代与期待进展，再核对候选机制。无证据的承诺标为待验证，删除智能、专业、高效、一站式等空泛词。完整作品放入 improvedDraft，依次写客户与场景、核心任务、证据链、一句价值承诺、机制对应、未知项和下一验证。acknowledgement 写总判断；strengths、gaps、questions 写关键项；nextAction 写15分钟动作。",
      variants: [
        { label: "引导我补全", mode: "ask", focus: "先找缺失的客户、场景、过去行为、替代与代价证据，再给带待验证标记的暂定版本。" },
        { label: "证据越界红队", mode: "challenge", focus: "逐句追问证据在哪里，删除无法追溯的承诺，指出最强反例和最危险跳步。" },
        { label: "按画布评审", mode: "review", focus: "按客户任务、痛点收益、结果可观察、机制可信和聚焦程度评审，输出最终一页价值主张卡。" }
      ]
    },
    "scope-halver": {
      title: "首版范围砍半",
      lessonId: "lesson3-scope-halver",
      placeholder: "粘贴：唯一目标用户、一个必须完成的任务、7天时间/资源限制、候选功能清单、当前端到端路径、可人工完成部分，以及安全/隐私/付款底线。",
      criteria: [
        "至少一半候选工作进入延后或人工替代",
        "每个保留项直接服务首个价值或必要底线",
        "一位用户仍能端到端完成一个任务",
        "人工或Wizard of Oz部分对用户诚实透明",
        "安全、隐私、付款正确性和失败恢复不被删除",
        "明确写出本版No-gos并适配时间限制"
      ],
      basePrompt: "你是产品范围锤。目标不是砍成残缺演示，而是在时间限制内完整解决一个客户任务。逐项归为必须保留、可人工完成、本版不做；原则上至少删除或后置一半工作，不得靠拆小条目伪造降幅。不能删除诚信、安全、隐私、付款正确性和失败恢复底线。完整结果放入 improvedDraft，写原范围、保留范围、降幅判断、五步以内任务链、人工替代、No-gos与风险洞。acknowledgement 判断是否真正砍半；strengths、gaps、questions 写关键取舍；nextAction 写15分钟删减动作。",
      variants: [
        { label: "引导找核心", mode: "ask", focus: "先补齐客户任务、时间限制和每项必要理由，再提出第一轮保留、人工与延后建议。" },
        { label: "砍半红队", mode: "challenge", focus: "默认每项都可以删；只有能证明保护首个价值或安全底线时才允许保留。" },
        { label: "完整性评审", mode: "review", focus: "检查真实范围降幅，并验收入口、关键处理、结果、兜底构成的端到端闭环。" }
      ]
    },
    "version-selector": {
      title: "选择正确的首版标准",
      lessonId: "lesson3-version-selector",
      placeholder: "粘贴：最高风险假设、风险类型、使用对象、是否收费/公开、是否重复使用、品牌/隐私/合规风险、时间预算与当前候选首版。",
      criteria: [
        "推荐能够回答当前最高风险假设",
        "没有把功能少直接等同于MVP",
        "面向真实用户时保留完整客户任务",
        "品牌、隐私和不可逆风险影响版本选择",
        "说明为什么不是另外三种标准",
        "准确区分原型、MVP、SLC与Jason Fried的MPV1"
      ],
      basePrompt: "你是首版标准选择器。按四种定义判断：原型用于测试理解、流程或交互；MVP用最低成本回答最高风险问题，真实用户应能完成核心任务；SLC来自Jason Cohen，要求Simple、Lovable、Complete；MPV1来自Jason Fried，指Maximally Proud Version 1，范围窄但团队愿意负责且自豪地正式交付。完整分析放入 improvedDraft，包含主推荐、四者比较、未选择理由、不可妥协质量底线、本版边界和升级触发条件。acknowledgement写结论；strengths、gaps、questions写依据与缺口；nextAction写15分钟动作。",
      variants: [
        { label: "引导我判断", mode: "ask", focus: "通过最高风险、用户对象、是否收费、重复使用和不可逆风险，帮助确定主选择与低成本备选。" },
        { label: "反对当前选择", mode: "challenge", focus: "分别站在另外三种标准立场反驳当前选择，抓出概念偷换、过度开发与质量借口。" },
        { label: "四标准评审", mode: "review", focus: "按学习效率、任务完整、用户体验、可信风险和时间限制评分，给出最终推荐。" }
      ]
    },
    "first-value-path": {
      title: "五步抵达首个价值",
      lessonId: "lesson3-first-value-path",
      placeholder: "粘贴：目标用户与触发、进入前状态、期望结果、当前使用步骤、你认为的首个价值时刻、必要信任/安全步骤，以及等待、错误、权限和退出情况。",
      criteria: [
        "首个价值是可观察结果而非注册或页面事件",
        "主路径不超过五个关键动作",
        "每一步都有不可删除的价值或边界理由",
        "必要的知情、权限、安全与信任步骤被保留",
        "等待、错误、权限和退出都有恢复方式",
        "包含价值达成率、所需时间与下一行为指标"
      ],
      basePrompt: "你是首个价值路径教练。首个价值必须描述用户发生了什么可观察变化，不能用注册、浏览页面或看完介绍代替。把入口到价值压缩为最多五步；每步写用户动作、系统反馈、价值证据与失败恢复。删除、后置或人工替代不必要输入，但不删知情、权限、安全和信任步骤。完整路径放入 improvedDraft，包含首个价值定义、五步路径、删除清单、异常恢复、价值达成率/时长/下一行为指标和375px手机验收脚本。acknowledgement写判断；strengths、gaps、questions写有效步骤与路障；nextAction写15分钟动作。",
      variants: [
        { label: "引导定义价值", mode: "ask", focus: "先把模糊结果改成可观察行为，补齐触发、结果证据和关键异常，再压缩路径。" },
        { label: "路径删减红队", mode: "challenge", focus: "逐步追问为什么不能删，重点攻击前置注册、重复输入、等待、教程和无价值选择。" },
        { label: "激活指标评审", mode: "review", focus: "按价值可观察、五步以内、反馈及时、错误可恢复和手机可完成验收。" }
      ]
    },
    "experiment-pitch": {
      title: "7天实验与一页Pitch",
      lessonId: "lesson3-seven-day-pitch",
      placeholder: "粘贴：客户证据与价值承诺、首版标准、唯一最高风险假设、目标用户与渠道、实验形态、7天时间预算、主指标/基线、风险洞与明确不做项。",
      criteria: [
        "一次只测试一个主要假设",
        "主指标是实际使用、支付、复用等行为证据",
        "通过、观察、失败三档阈值在实验前写定",
        "包含停止条件和实验后继续/修改/停止决策",
        "样本与目标用户匹配且七天内可执行",
        "隐私、人工交付和收费方式透明",
        "Pitch包含Problem、Appetite、Solution、Rabbit Holes与No-gos"
      ],
      basePrompt: "你是7天产品实验教练兼Shape Up Pitch编辑。一次只验证一个最高风险假设，优先使用预约、实际使用、支付或复用证据，不能用点赞或口头愿意购买替代。开始前写通过、观察、失败三档阈值和停止条件。完整结果放入 improvedDraft：先写7天实验卡，含假设、对象、D1-D7动作、主指标、护栏、三档阈值、记录、伦理风险与决策；再写一页Pitch，含Problem、Appetite、Solution、五步路径、Rabbit Holes、No-gos。不得补造基线或用户数据。acknowledgement写可执行性；strengths、gaps、questions写基础与污染风险；nextAction写15分钟启动动作。",
      variants: [
        { label: "引导补齐实验", mode: "ask", focus: "先补最高风险、行为指标、样本、阈值与伦理边界，再生成可以当天启动的实验草案。" },
        { label: "阈值红队", mode: "challenge", focus: "尝试证明实验无法区分成功失败，重点攻击虚荣指标、样本错配和实验后改阈值。" },
        { label: "Pitch会审", mode: "review", focus: "检查实验卡与Pitch能否由未参与者直接执行、复述并据此做继续、修改或停止决策。" }
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
    return "l3-" + Date.now().toString(36) + "-" + random.slice(0, 18);
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
        lessonTitle: "第3课｜" + config.title,
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
