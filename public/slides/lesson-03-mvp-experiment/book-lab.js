(function () {
  "use strict";

  var STORAGE_KEY = "kuakua-ai.lesson3.book-lab.v1";
  var ACCOUNT_URL = "https://www.happykua.com/kuakua-ai-api/me";
  var SCHEMA_VERSION = 1;
  var MAX_STORAGE_CHARS = 50000;
  var activeTool = "click";
  var draggedStepId = null;
  var saveTimer = null;
  var toastTimer = null;
  var labAccess = "checking";

  function initialState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      projectName: "",
      updatedAt: "",
      click: {
        customer: "", customerKind: "evidence",
        problem: "", problemKind: "evidence",
        advantage: "", advantageKind: "judgment",
        competitors: "", competitorsKind: "evidence",
        approach: "", approachKind: "judgment",
        differentiators: "", differentiatorsKind: "judgment",
        evidence: ""
      },
      story: { trigger: "", firstValue: "", ttfv: "", firstValueStepId: "", steps: [] },
      shape: { appetite: 7, people: 1, problem: "", solution: "", rabbits: "", noGos: "", scope: [] },
      test: { assumptions: [], lockedId: "", lockMode: "auto", hypothesis: "", experiment: "", metric: "", sample: "", pass: "", watch: "", fail: "", guardrail: "" }
    };
  }

  function cleanText(value, max) {
    return typeof value === "string" ? value.slice(0, max || 800) : "";
  }

  function normalize(raw) {
    var fresh = initialState();
    if (!raw || raw.schemaVersion !== SCHEMA_VERSION || typeof raw !== "object") return fresh;
    fresh.projectName = cleanText(raw.projectName, 60);
    ["click", "story", "shape", "test"].forEach(function (key) {
      if (raw[key] && typeof raw[key] === "object") Object.keys(fresh[key]).forEach(function (field) {
        if (typeof fresh[key][field] === "string") fresh[key][field] = cleanText(raw[key][field], 800);
        else if (typeof fresh[key][field] === "number") fresh[key][field] = Number(raw[key][field]) || fresh[key][field];
      });
    });
    if (Array.isArray(raw.story && raw.story.steps)) {
      fresh.story.steps = raw.story.steps.slice(0, 12).map(function (step, index) {
        return { id: cleanText(step.id, 60) || ("step-" + index), text: cleanText(step.text, 120), lane: step.lane === "later" ? "later" : "release" };
      }).filter(function (step) { return step.text; });
      fresh.story.firstValueStepId = cleanText(raw.story.firstValueStepId, 60);
    }
    if (Array.isArray(raw.shape && raw.shape.scope)) {
      fresh.shape.scope = raw.shape.scope.slice(0, 12).map(function (item, index) {
        return { id: cleanText(item.id, 60) || ("scope-" + index), text: cleanText(item.text, 120), effort: [1, 2, 3, 5].indexOf(Number(item.effort)) >= 0 ? Number(item.effort) : 1, included: item.included !== false };
      }).filter(function (item) { return item.text; });
    }
    if (Array.isArray(raw.test && raw.test.assumptions)) {
      fresh.test.assumptions = raw.test.assumptions.slice(0, 12).map(function (item, index) {
        var type = ["desirability", "feasibility", "viability"].indexOf(item.type) >= 0 ? item.type : "desirability";
        return { id: cleanText(item.id, 60) || ("assumption-" + index), text: cleanText(item.text, 180), type: type, impact: clampNumber(item.impact, 1, 5, 3), evidence: clampNumber(item.evidence, 0, 5, 2) };
      }).filter(function (item) { return item.text; });
      fresh.test.lockedId = cleanText(raw.test.lockedId, 60);
    }
    fresh.updatedAt = cleanText(raw.updatedAt, 60);
    return fresh;
  }

  function clampNumber(value, min, max, fallback) {
    var number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function loadState() {
    try {
      var text = localStorage.getItem(STORAGE_KEY);
      if (!text || text.length > MAX_STORAGE_CHARS) return initialState();
      return normalize(JSON.parse(text));
    } catch (error) {
      return initialState();
    }
  }

  var state = loadState();

  function pathParts(path) { return String(path || "").split(".").filter(Boolean); }
  function getPath(path) {
    return pathParts(path).reduce(function (value, key) { return value && value[key]; }, state);
  }
  function setPath(path, value) {
    var parts = pathParts(path);
    var target = state;
    parts.slice(0, -1).forEach(function (key) { target = target[key]; });
    target[parts[parts.length - 1]] = value;
  }
  function filled(value) { return typeof value === "string" ? value.trim().length > 1 : Boolean(value); }
  function uid(prefix) { return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7); }

  function saveState() {
    if (labAccess !== "member") {
      var previewStatus = document.getElementById("saveStatus");
      if (previewStatus) previewStatus.textContent = "内容预览 · 会员登录后可填写和保存";
      return;
    }
    state.updatedAt = new Date().toISOString();
    try {
      var text = JSON.stringify(state);
      if (text.length > MAX_STORAGE_CHARS) throw new Error("too large");
      localStorage.setItem(STORAGE_KEY, text);
      var status = document.getElementById("saveStatus");
      if (status) status.textContent = "已自动保存到当前浏览器 · " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } catch (error) {
      var fallback = document.getElementById("saveStatus");
      if (fallback) fallback.textContent = "本地空间不足，本次仅保留在页面内";
    }
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveState, 220);
  }

  function showToast(text) {
    var toast = document.getElementById("labToast");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }

  function setInteractionAccess(enabled) {
    document.querySelectorAll("#projectName,.top-actions button,.tool-panel input,.tool-panel textarea,.tool-panel select,.tool-panel button").forEach(function (node) {
      node.disabled = !enabled;
    });
  }

  function renderLabAccess(status, detail) {
    labAccess = status;
    document.body.dataset.labAccess = status;
    document.body.classList.toggle("book-lab-locked", status !== "member");
    setInteractionAccess(status === "member");
    var gate = document.getElementById("labAccessGate");
    var title = document.getElementById("labAccessTitle");
    var message = document.getElementById("labAccessMessage");
    var retry = document.getElementById("labAccessRetry");
    var action = document.getElementById("labAccessAction");
    gate.classList.toggle("is-member", status === "member");
    retry.hidden = status === "checking" || status === "member";
    action.hidden = status === "checking" || status === "member";
    if (status === "member") {
      title.textContent = detail === "max" ? "Max 会员工作台已解锁" : "PRO 会员工作台已解锁";
      message.textContent = "可以填写、自动保存、导出任务书，并使用当前会员额度进入 DeepSeek 会审。";
      saveState();
    } else if (status === "free") {
      title.textContent = "免费用户当前为内容预览";
      message.textContent = "你可以浏览四本书与全部画布；填写、保存、导出和 AI 训练需要成为 PRO 或 Max 会员。";
      retry.textContent = "我已开通，重新核验";
      action.textContent = "查看会员方案";
    } else if (status === "signed-out") {
      title.textContent = "登录后核验学习权益";
      message.textContent = "内容保持可见；登录有效 PRO 或 Max 账号后即可开始四本书实操。";
      retry.textContent = "我已登录，重新核验";
      action.textContent = "登录 / 成为会员";
    } else if (status === "error") {
      title.textContent = "暂时无法确认会员权益";
      message.textContent = detail || "请检查网络后重试。为避免绕过学习权限，当前只开放内容预览。";
      retry.textContent = "重新核验";
      action.textContent = "打开夸夸学习";
    } else {
      title.textContent = "正在核验学习权益";
      message.textContent = "四本书内容可以浏览；填写、保存、AI 会审和导出需要有效 PRO 或 Max 会员。";
    }
  }

  async function refreshLabAccess() {
    renderLabAccess("checking");
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, 12000);
    try {
      var response = await fetch(ACCOUNT_URL, { credentials: "include", headers: { Accept: "application/json" }, signal: controller.signal });
      var payload = await response.json().catch(function () { return null; });
      if (response.status === 401) { renderLabAccess("signed-out"); return; }
      if (!response.ok || !payload || !payload.ok) throw new Error(payload && payload.error && payload.error.message ? payload.error.message : "会员服务暂时不可用");
      var tier = payload.data && payload.data.membership && payload.data.membership.tier;
      renderLabAccess(tier === "pro" || tier === "max" ? "member" : "free", tier);
    } catch (error) {
      if (error && error.name === "AbortError") renderLabAccess("error", "会员核验超时，请重试。当前只开放内容预览。");
      else renderLabAccess("error", error && error.message ? error.message : "会员服务暂时不可用");
    } finally {
      window.clearTimeout(timer);
    }
  }

  function sourceLabel(kind) {
    return kind === "evidence" ? "真实证据" : kind === "judgment" ? "用户判断" : "待验证";
  }

  function foundingHypothesis() {
    var c = state.click;
    if (![c.customer, c.problem, c.advantage, c.approach, c.competitors, c.differentiators].every(filled)) return "请先填写客户、问题、优势、方案、替代和差异。";
    return "我们的独特优势是「" + c.advantage.trim() + "」。基于此，如果我们帮助「" + c.customer.trim() + "」解决「" + c.problem.trim() + "」，采用「" + c.approach.trim() + "」，他们会优先于「" + c.competitors.trim() + "」选择我们，因为「" + c.differentiators.trim() + "」。";
  }

  function clickReady() {
    var c = state.click;
    return [c.customer, c.problem, c.advantage, c.competitors, c.approach, c.differentiators, c.evidence].every(filled);
  }

  function releaseSteps() { return state.story.steps.filter(function (step) { return step.lane === "release"; }); }
  function laterSteps() { return state.story.steps.filter(function (step) { return step.lane === "later"; }); }
  function storyReady() {
    var release = releaseSteps();
    return filled(state.story.trigger) && filled(state.story.firstValue) && filled(state.story.ttfv) && release.length >= 3 && release.length <= 7 && release.some(function (step) { return step.id === state.story.firstValueStepId; });
  }
  function storySentence() {
    var release = releaseSteps();
    if (!release.length) return "先添加 3—7 个用户动作，再指定其中一个首个价值时刻。";
    return release.map(function (step, index) { return String(index + 1) + ". " + step.text + (step.id === state.story.firstValueStepId ? "【首个价值】" : ""); }).join(" → ");
  }

  function capacityData() {
    var capacity = clampNumber(state.shape.appetite, 1, 14, 7) * clampNumber(state.shape.people, 1, 5, 1);
    var used = state.shape.scope.filter(function (item) { return item.included; }).reduce(function (sum, item) { return sum + Number(item.effort || 1); }, 0);
    return { capacity: capacity, used: used, over: used > capacity };
  }
  function shapeReady() {
    var capacity = capacityData();
    return [state.shape.problem, state.shape.solution, state.shape.rabbits, state.shape.noGos].every(filled) && state.shape.scope.some(function (item) { return item.included; }) && !capacity.over;
  }
  function shapeSentence() {
    if (![state.shape.problem, state.shape.solution].every(filled)) return "请补齐 Problem、Solution、Rabbit Holes 与 No-gos。";
    return "用 " + state.shape.appetite + " 天 Appetite 解决「" + state.shape.problem.trim() + "」。粗粒度方案：「" + state.shape.solution.trim() + "」；主要风险洞：「" + (state.shape.rabbits.trim() || "待补") + "」；明确不做：「" + (state.shape.noGos.trim() || "待补") + "」。";
  }

  function riskScore(item) { return Number(item.impact) * (6 - Number(item.evidence)); }
  function sortedAssumptions() {
    return state.test.assumptions.slice().sort(function (a, b) { return riskScore(b) - riskScore(a); });
  }
  function lockedAssumption() {
    var found = state.test.assumptions.filter(function (item) { return item.id === state.test.lockedId; })[0];
    return found || sortedAssumptions()[0] || null;
  }
  function testReady() {
    return state.test.assumptions.length > 0 && [state.test.hypothesis, state.test.experiment, state.test.metric, state.test.sample, state.test.pass, state.test.watch, state.test.fail, state.test.guardrail].every(filled);
  }
  function testSentence() {
    if (![state.test.hypothesis, state.test.experiment, state.test.metric].every(filled)) return "先锁定一项最高风险假设，并预写实验、指标与三档阈值。";
    return "我们相信「" + state.test.hypothesis.trim() + "」。未来 7 天用「" + state.test.experiment.trim() + "」测试，观察「" + state.test.metric.trim() + "」；通过线「" + (state.test.pass.trim() || "待补") + "」，观察区「" + (state.test.watch.trim() || "待补") + "」，停止线「" + (state.test.fail.trim() || "待补") + "」。";
  }

  function readiness() { return { click: clickReady(), story: storyReady(), shape: shapeReady(), test: testReady() }; }
  function toolHasContent(tool) {
    if (tool === "click") return Object.keys(state.click).some(function (key) { return key.indexOf("Kind") < 0 && filled(state.click[key]); });
    if (tool === "story") return filled(state.story.trigger) || filled(state.story.firstValue) || state.story.steps.length > 0;
    if (tool === "shape") return [state.shape.problem, state.shape.solution, state.shape.rabbits, state.shape.noGos].some(filled) || state.shape.scope.length > 0;
    return state.test.assumptions.length > 0 || [state.test.hypothesis, state.test.experiment, state.test.metric].some(filled);
  }

  function applyFields() {
    document.getElementById("projectName").value = state.projectName;
    document.querySelectorAll("[data-field]").forEach(function (node) {
      var value = getPath(node.getAttribute("data-field"));
      if (node.type === "checkbox") node.checked = Boolean(value);
      else node.value = value == null ? "" : String(value);
    });
  }

  function renderClick() {
    var output = document.getElementById("foundingHypothesis");
    output.textContent = foundingHypothesis();
    var missing = ["customer", "problem", "advantage", "competitors", "approach", "differentiators", "evidence"].filter(function (key) { return !filled(state.click[key]); });
    var gate = document.getElementById("clickGate");
    gate.textContent = missing.length ? ("还缺 " + missing.length + " 项关键信息") : "门槛通过：假设完整，并保留证据来源";
    gate.classList.toggle("ready", missing.length === 0);
    document.getElementById("storyCarry").textContent = clickReady() ? foundingHypothesis() : "创始假设尚未形成；你仍可先画路径，但它会被标记为待验证。";
  }

  function storyCard(step, laneSteps) {
    var article = document.createElement("article");
    article.className = "story-card" + (step.id === state.story.firstValueStepId ? " first-value" : "");
    article.draggable = true;
    article.setAttribute("data-step-id", step.id);
    var position = laneSteps.indexOf(step);
    article.innerHTML = '<div><p></p><small></small></div><div class="story-card-actions">' +
      '<button type="button" data-step-action="prev" aria-label="向前移动">←</button>' +
      '<button type="button" data-step-action="next" aria-label="向后移动">→</button>' +
      '<button type="button" class="value-toggle' + (step.id === state.story.firstValueStepId ? " active" : "") + '" data-step-action="value">◎ 首值</button>' +
      '<button type="button" data-step-action="lane">' + (step.lane === "release" ? "移到以后" : "进入首版") + '</button>' +
      '<button type="button" class="remove-step" data-step-action="remove" aria-label="删除动作">×</button></div>';
    article.querySelector("p").textContent = step.text;
    article.querySelector("small").textContent = (step.lane === "release" ? "首版动作 " : "以后再做 ") + String(position + 1);
    article.addEventListener("dragstart", function () { draggedStepId = step.id; });
    article.addEventListener("dragend", function () { draggedStepId = null; });
    return article;
  }

  function renderStory() {
    var release = releaseSteps();
    var later = laterSteps();
    var releaseLane = document.getElementById("releaseLane");
    var laterLane = document.getElementById("laterLane");
    releaseLane.innerHTML = "";
    laterLane.innerHTML = "";
    release.forEach(function (step) { releaseLane.appendChild(storyCard(step, release)); });
    later.forEach(function (step) { laterLane.appendChild(storyCard(step, later)); });
    document.getElementById("storyOutput").textContent = storySentence();
    var gate = document.getElementById("storyGate");
    var requirements = [];
    if (!filled(state.story.trigger)) requirements.push("触发");
    if (!filled(state.story.firstValue)) requirements.push("价值定义");
    if (!filled(state.story.ttfv)) requirements.push("抵达时间");
    if (release.length < 3 || release.length > 7) requirements.push("3—7 步首版路径");
    if (!release.some(function (step) { return step.id === state.story.firstValueStepId; })) requirements.push("首值标记");
    gate.textContent = requirements.length ? ("还需补齐：" + requirements.join("、")) : "门槛通过：路径完整、首值可观察、范围有切割线";
    gate.classList.toggle("ready", requirements.length === 0);
    document.getElementById("shapeCarry").textContent = storyReady() ? (state.story.trigger + " → " + storySentence() + "；目标首值：" + state.story.firstValue + "（" + state.story.ttfv + "）") : "首版切片尚未形成。";
  }

  function syncScope(force) {
    var release = releaseSteps();
    if (!force && state.shape.scope.length) return;
    var old = {};
    state.shape.scope.forEach(function (item) { old[item.id] = item; });
    state.shape.scope = release.map(function (step) {
      return old[step.id] || { id: step.id, text: step.text, effort: 1, included: true };
    });
    if (!filled(state.shape.problem) && filled(state.click.problem)) state.shape.problem = state.click.problem;
    if (!filled(state.shape.solution) && release.length) state.shape.solution = release.map(function (step) { return step.text; }).join(" → ");
  }

  function renderShape() {
    var appetite = clampNumber(state.shape.appetite, 1, 14, 7);
    var people = clampNumber(state.shape.people, 1, 5, 1);
    state.shape.appetite = appetite;
    state.shape.people = people;
    document.getElementById("appetiteDays").textContent = String(appetite);
    var data = capacityData();
    var pct = Math.min(100, Math.round(data.used / Math.max(1, data.capacity) * 100));
    document.getElementById("capacityBar").style.width = pct + "%";
    document.getElementById("capacityLabel").textContent = data.used + " / " + data.capacity + " 点";
    document.getElementById("capacityHint").textContent = data.over ? "超出 Appetite：先删范围，不加时间" : "范围仍在容量内";
    document.querySelector(".capacity-meter").classList.toggle("over", data.over);
    var scope = document.getElementById("scopeItems");
    scope.innerHTML = "";
    if (!state.shape.scope.length) {
      var empty = document.createElement("div");
      empty.className = "scope-empty";
      empty.textContent = "先在 Story Map 完成首版路径，再点击“重新同步”。";
      scope.appendChild(empty);
    } else {
      state.shape.scope.forEach(function (item) {
        var row = document.createElement("div");
        row.className = "scope-item";
        row.setAttribute("data-scope-id", item.id);
        row.innerHTML = '<span></span><select aria-label="粗颗粒工作量"><option value="1">1 点</option><option value="2">2 点</option><option value="3">3 点</option><option value="5">5 点</option></select><label><input type="checkbox">进入本次</label>';
        row.querySelector("span").textContent = item.text;
        row.querySelector("select").value = String(item.effort);
        row.querySelector("input").checked = item.included;
        scope.appendChild(row);
      });
    }
    document.getElementById("shapeOutput").textContent = shapeSentence();
    var requirements = [];
    [["problem", "Problem"], ["solution", "Solution"], ["rabbits", "Rabbit Holes"], ["noGos", "No-gos"]].forEach(function (pair) { if (!filled(state.shape[pair[0]])) requirements.push(pair[1]); });
    if (!state.shape.scope.some(function (item) { return item.included; })) requirements.push("首版工作");
    if (data.over) requirements.push("容量降到 Appetite 内");
    var gate = document.getElementById("shapeGate");
    gate.textContent = requirements.length ? ("还需补齐：" + requirements.join("、")) : "门槛通过：rough、solved、bounded，且没有超过 Appetite";
    gate.classList.toggle("ready", requirements.length === 0);
    document.getElementById("testCarry").textContent = shapeReady() ? shapeSentence() : "有界 Pitch 尚未形成。";
  }

  function typeLabel(type) { return type === "desirability" ? "吸引力" : type === "feasibility" ? "可行性" : "盈利性"; }

  function renderTest() {
    var sorted = sortedAssumptions();
    var lockIsValid = state.test.assumptions.some(function (item) { return item.id === state.test.lockedId; });
    if (sorted.length && (state.test.lockMode !== "manual" || !lockIsValid)) {
      state.test.lockedId = sorted[0].id;
      state.test.lockMode = "auto";
    }
    var locked = lockedAssumption();
    var recommended = sorted[0] || null;
    var matrix = document.getElementById("matrixStage");
    matrix.querySelectorAll(".matrix-dot").forEach(function (node) { node.remove(); });
    sorted.forEach(function (item, index) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "matrix-dot" + (recommended && item.id === recommended.id ? " top-risk" : "") + (locked && item.id === locked.id ? " locked" : "");
      dot.style.left = (5 + item.evidence / 5 * 88) + "%";
      dot.style.bottom = (5 + (item.impact - 1) / 4 * 84) + "%";
      dot.textContent = String(index + 1);
      dot.setAttribute("data-title", item.text + "｜风险分 " + riskScore(item));
      dot.setAttribute("data-lock-assumption", item.id);
      dot.setAttribute("aria-label", "锁定假设：" + item.text);
      matrix.appendChild(dot);
    });
    var list = document.getElementById("assumptionList");
    list.innerHTML = "";
    if (!sorted.length) {
      var empty = document.createElement("div"); empty.className = "assumption-empty"; empty.textContent = "先加入 2—5 项假设，系统会自动突出高影响、低证据项。"; list.appendChild(empty);
    } else {
      sorted.forEach(function (item, index) {
        var row = document.createElement("article");
        row.className = "assumption-item" + (recommended && item.id === recommended.id ? " top-risk" : "") + (locked && item.id === locked.id ? " locked" : "");
        row.setAttribute("data-assumption-id", item.id);
        row.innerHTML = '<b></b><div><p></p><small></small></div><div class="assumption-actions"><button type="button" data-lock-assumption="' + item.id + '">锁定</button><button type="button" data-remove-assumption="' + item.id + '" aria-label="删除假设">×</button></div>';
        row.querySelector("b").textContent = String(index + 1);
        row.querySelector("p").textContent = item.text;
        row.querySelector("small").textContent = typeLabel(item.type) + " · 影响 " + item.impact + " · 证据 " + item.evidence + " · 风险分 " + riskScore(item) + (recommended && item.id === recommended.id ? " · 系统优先" : "");
        if (locked && item.id === locked.id) row.querySelector("[data-lock-assumption]").textContent = "已锁定";
        list.appendChild(row);
      });
    }
    document.getElementById("riskLock").textContent = locked ? ((state.test.lockMode === "manual" ? "手动锁定：" : "自动优先：") + locked.text) : "尚未锁定最高风险";
    document.getElementById("testOutput").textContent = testSentence();
    var requirements = [];
    if (!state.test.assumptions.length) requirements.push("风险假设");
    [["hypothesis", "唯一假设"], ["experiment", "实验"], ["metric", "行为指标"], ["sample", "匹配样本"], ["pass", "通过线"], ["watch", "观察区"], ["fail", "停止线"], ["guardrail", "诚信护栏"]].forEach(function (pair) { if (!filled(state.test[pair[0]])) requirements.push(pair[1]); });
    var gate = document.getElementById("testGate");
    gate.textContent = requirements.length ? ("还需补齐：" + requirements.join("、")) : "门槛通过：一次一项假设，行为指标与三档阈值均已预写";
    gate.classList.toggle("ready", requirements.length === 0);
  }

  function renderProgress() {
    var ready = readiness();
    var tools = ["click", "story", "shape", "test"];
    var count = tools.filter(function (tool) { return ready[tool]; }).length;
    var pct = count * 25;
    document.getElementById("progressNumber").textContent = pct + "%";
    document.getElementById("progressLabel").textContent = count + " / 4 已达标";
    document.getElementById("progressOrbit").style.setProperty("--progress", (pct * 3.6) + "deg");
    tools.forEach(function (tool) {
      var badge = document.querySelector('[data-tool-state="' + tool + '"]');
      badge.classList.remove("done", "progressing");
      if (ready[tool]) { badge.textContent = "已达标"; badge.classList.add("done"); }
      else if (toolHasContent(tool)) { badge.textContent = "进行中"; badge.classList.add("progressing"); }
      else badge.textContent = "未开始";
    });
  }

  function renderAll() {
    renderClick();
    renderStory();
    renderShape();
    renderTest();
    renderProgress();
  }

  function switchTool(tool, scroll) {
    if (["click", "story", "shape", "test"].indexOf(tool) < 0) return;
    activeTool = tool;
    document.body.setAttribute("data-active-tool", tool);
    document.querySelectorAll("[data-tool-panel]").forEach(function (panel) {
      var active = panel.getAttribute("data-tool-panel") === tool;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    document.querySelectorAll("[data-tool]").forEach(function (button) {
      var active = button.getAttribute("data-tool") === tool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (tool === "shape") { syncScope(false); applyFields(); renderShape(); }
    if (scroll) document.getElementById("bookWorkspace").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateFromField(node) {
    var value;
    if (node.type === "checkbox") value = node.checked;
    else if (node.type === "number" || node.type === "range") value = Number(node.value);
    else value = node.value;
    setPath(node.getAttribute("data-field"), value);
    renderAll();
    scheduleSave();
  }

  function moveStep(stepId, action) {
    var step = state.story.steps.filter(function (item) { return item.id === stepId; })[0];
    if (!step) return;
    if (action === "remove") {
      state.story.steps = state.story.steps.filter(function (item) { return item.id !== stepId; });
      if (state.story.firstValueStepId === stepId) state.story.firstValueStepId = "";
    } else if (action === "value") {
      state.story.firstValueStepId = state.story.firstValueStepId === stepId ? "" : stepId;
    } else if (action === "lane") {
      step.lane = step.lane === "release" ? "later" : "release";
      if (step.lane === "later" && state.story.firstValueStepId === step.id) state.story.firstValueStepId = "";
    } else {
      var sameLane = state.story.steps.filter(function (item) { return item.lane === step.lane; });
      var laneIndex = sameLane.indexOf(step);
      var target = action === "prev" ? laneIndex - 1 : laneIndex + 1;
      if (target >= 0 && target < sameLane.length) {
        var globalA = state.story.steps.indexOf(step);
        var globalB = state.story.steps.indexOf(sameLane[target]);
        var temp = state.story.steps[globalA]; state.story.steps[globalA] = state.story.steps[globalB]; state.story.steps[globalB] = temp;
      }
    }
    renderAll(); scheduleSave();
  }

  function markdownFor(tool) {
    var project = state.projectName.trim() || "未命名首版产品";
    if (tool === "click") {
      var c = state.click;
      return ["# 《Click》创始假设罗盘｜" + project, "", "## 证据", c.evidence || "待补", "", "## 六个象限", "- 客户（" + sourceLabel(c.customerKind) + "）：" + (c.customer || "待补"), "- 问题（" + sourceLabel(c.problemKind) + "）：" + (c.problem || "待补"), "- 优势（" + sourceLabel(c.advantageKind) + "）：" + (c.advantage || "待补"), "- 替代（" + sourceLabel(c.competitorsKind) + "）：" + (c.competitors || "待补"), "- 方案（" + sourceLabel(c.approachKind) + "）：" + (c.approach || "待补"), "- 差异（" + sourceLabel(c.differentiatorsKind) + "）：" + (c.differentiators || "待补"), "", "## Foundation / Founding Hypothesis", foundingHypothesis()].join("\n");
    }
    if (tool === "story") {
      return ["# 《User Story Mapping》首版切片地图｜" + project, "", "- 触发：" + (state.story.trigger || "待补"), "- 首个价值：" + (state.story.firstValue || "待补"), "- 抵达时间：" + (state.story.ttfv || "待补"), "", "## Release 1", releaseSteps().map(function (step, index) { return String(index + 1) + ". " + step.text + (step.id === state.story.firstValueStepId ? "【首个价值】" : ""); }).join("\n") || "待补", "", "## Later / 暂不做", laterSteps().map(function (step) { return "- " + step.text; }).join("\n") || "暂无"].join("\n");
    }
    if (tool === "shape") {
      var cap = capacityData();
      return ["# 《Shape Up》范围熔炉｜" + project, "", "- Appetite：" + state.shape.appetite + " 天 × " + state.shape.people + " 人", "- 容量：" + cap.used + " / " + cap.capacity + " 点", "", "## Problem", state.shape.problem || "待补", "", "## Solution", state.shape.solution || "待补", "", "## Rabbit Holes", state.shape.rabbits || "待补", "", "## No-gos", state.shape.noGos || "待补", "", "## 本次范围", state.shape.scope.filter(function (item) { return item.included; }).map(function (item) { return "- " + item.text + "（" + item.effort + " 点）"; }).join("\n") || "待补"].join("\n");
    }
    var locked = lockedAssumption();
    return ["# 《Testing Business Ideas》7 天证据实验室｜" + project, "", "## 最高风险", locked ? (locked.text + "（" + typeLabel(locked.type) + "，风险分 " + riskScore(locked) + "）") : "待补", "", "## Test Card", "- 假设：" + (state.test.hypothesis || "待补"), "- 实验：" + (state.test.experiment || "待补"), "- 对象：" + (state.test.sample || "待补"), "- 行为指标：" + (state.test.metric || "待补"), "- 通过线：" + (state.test.pass || "待补"), "- 观察区：" + (state.test.watch || "待补"), "- 停止线：" + (state.test.fail || "待补"), "- 诚信护栏：" + (state.test.guardrail || "待补")].join("\n");
  }

  function allMarkdown() {
    return ["# 第三课｜首版产品任务书", "", "项目：" + (state.projectName.trim() || "未命名"), "更新时间：" + (state.updatedAt || new Date().toISOString()), "", "---", "", markdownFor("click"), "", "---", "", markdownFor("story"), "", "---", "", markdownFor("shape"), "", "---", "", markdownFor("test"), "", "---", "", "## 决策提醒", "AI 推断不能自动升级为客户证据。第 7 天只做一个决定：继续、调整或停止。"].join("\n");
  }

  function copyText(text, message) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast(message || "已复制"); }).catch(function () { fallbackCopy(text, message); });
    } else fallbackCopy(text, message);
  }
  function fallbackCopy(text, message) {
    var area = document.createElement("textarea"); area.value = text; area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove(); showToast(message || "已复制");
  }
  function downloadMarkdown() {
    saveState();
    var blob = new Blob([allMarkdown()], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var safeName = (state.projectName.trim() || "首版产品").replace(/[\\/:*?"<>|]+/g, "-");
    a.href = url; a.download = safeName + "_第三课四本书任务书.md"; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    showToast("任务书已生成");
  }

  document.addEventListener("input", function (event) {
    var field = event.target.closest && event.target.closest("[data-field]");
    if (field) updateFromField(field);
    if (event.target.id === "projectName") { state.projectName = event.target.value.slice(0, 60); scheduleSave(); }
  });
  document.addEventListener("change", function (event) {
    var field = event.target.closest && event.target.closest("[data-field]");
    if (field) updateFromField(field);
    var scopeRow = event.target.closest && event.target.closest("[data-scope-id]");
    if (scopeRow) {
      var item = state.shape.scope.filter(function (entry) { return entry.id === scopeRow.getAttribute("data-scope-id"); })[0];
      if (item) { item.effort = Number(scopeRow.querySelector("select").value); item.included = scopeRow.querySelector("input").checked; renderAll(); scheduleSave(); }
    }
  });
  document.addEventListener("click", function (event) {
    var tab = event.target.closest && event.target.closest("[data-tool]"); if (tab) { switchTool(tab.getAttribute("data-tool"), true); return; }
    var jump = event.target.closest && event.target.closest("[data-jump-tool]"); if (jump) { switchTool(jump.getAttribute("data-jump-tool"), true); return; }
    var next = event.target.closest && event.target.closest("[data-next-tool]"); if (next) { switchTool(next.getAttribute("data-next-tool"), true); return; }
    var stepButton = event.target.closest && event.target.closest("[data-step-action]"); if (stepButton) { var card = stepButton.closest("[data-step-id]"); if (card) moveStep(card.getAttribute("data-step-id"), stepButton.getAttribute("data-step-action")); return; }
    var lock = event.target.closest && event.target.closest("[data-lock-assumption]"); if (lock) { state.test.lockedId = lock.getAttribute("data-lock-assumption"); state.test.lockMode = "manual"; var item = lockedAssumption(); if (item) state.test.hypothesis = item.text; applyFields(); renderAll(); scheduleSave(); return; }
    var remove = event.target.closest && event.target.closest("[data-remove-assumption]"); if (remove) { var id = remove.getAttribute("data-remove-assumption"); state.test.assumptions = state.test.assumptions.filter(function (item) { return item.id !== id; }); if (state.test.lockedId === id) { state.test.lockedId = ""; state.test.lockMode = "auto"; } renderAll(); scheduleSave(); return; }
    var copy = event.target.closest && event.target.closest("[data-copy-tool]"); if (copy) { copyText(markdownFor(copy.getAttribute("data-copy-tool")), "本书成果已复制"); return; }
  });
  document.addEventListener("click", function (event) {
    var ai = event.target.closest && event.target.closest("[data-tool-ai]");
    if (ai) ai.setAttribute("data-material", markdownFor(ai.getAttribute("data-tool-ai")).slice(0, 12000));
  }, true);

  document.getElementById("stepComposer").addEventListener("submit", function (event) {
    event.preventDefault();
    var input = document.getElementById("newStoryStep"); var text = input.value.trim(); if (!text) return;
    if (state.story.steps.length >= 12) { showToast("最多保留 12 个动作；请先合并或删除后再添加"); return; }
    state.story.steps.push({ id: uid("step"), text: text.slice(0, 100), lane: "release" }); input.value = ""; renderAll(); scheduleSave();
  });
  ["releaseLane", "laterLane"].forEach(function (id) {
    var lane = document.getElementById(id);
    lane.addEventListener("dragover", function (event) { event.preventDefault(); });
    lane.addEventListener("drop", function (event) { event.preventDefault(); if (!draggedStepId) return; var step = state.story.steps.filter(function (item) { return item.id === draggedStepId; })[0]; if (step) { step.lane = lane.getAttribute("data-lane"); if (step.lane === "later" && state.story.firstValueStepId === step.id) state.story.firstValueStepId = ""; renderAll(); scheduleSave(); } });
  });
  document.getElementById("syncScope").addEventListener("click", function () { syncScope(true); applyFields(); renderAll(); scheduleSave(); showToast("已从首版路径重新同步"); });
  document.getElementById("assumptionComposer").addEventListener("submit", function (event) {
    event.preventDefault();
    var input = document.getElementById("newAssumption"); var text = input.value.trim(); if (!text) return;
    if (state.test.assumptions.length >= 12) { showToast("最多保留 12 项假设；请先合并或删除后再添加"); return; }
    state.test.assumptions.push({ id: uid("assumption"), text: text.slice(0, 160), type: document.getElementById("newAssumptionType").value, impact: Number(document.getElementById("newAssumptionImpact").value), evidence: Number(document.getElementById("newAssumptionEvidence").value) });
    input.value = ""; renderAll(); scheduleSave();
  });
  document.getElementById("copyAll").addEventListener("click", function () { copyText(allMarkdown(), "完整任务书已复制"); });
  document.getElementById("exportAll").addEventListener("click", downloadMarkdown);
  document.getElementById("finishProject").addEventListener("click", downloadMarkdown);
  document.getElementById("resetAll").addEventListener("click", function () {
    if (!window.confirm("确定清空当前浏览器里的四本书草稿吗？此操作无法撤销。")) return;
    localStorage.removeItem(STORAGE_KEY); state = initialState(); applyFields(); renderAll(); switchTool("click", true); saveState(); showToast("草稿已清空");
  });
  document.getElementById("labAccessRetry").addEventListener("click", refreshLabAccess);

  applyFields();
  syncScope(false);
  applyFields();
  renderAll();
  switchTool(activeTool, false);
  saveState();
  refreshLabAccess();

  window.qingmiBookLab = {
    toolCount: 4,
    tools: ["click", "story", "shape", "test"],
    switchTool: switchTool,
    readiness: readiness,
    markdown: allMarkdown,
    storageKey: STORAGE_KEY,
    state: function () { return JSON.parse(JSON.stringify(state)); },
    access: function () { return labAccess; },
    refreshAccess: refreshLabAccess
  };
})();
