(function () {
  "use strict";

  const K = window.QINGXIANG_KNOWLEDGE;
  const state = { intent: null, context: {} };
  const messages = document.getElementById("messages");
  const planTitle = document.getElementById("planTitle");
  const planContent = document.getElementById("planContent");
  const riskBadge = document.getElementById("riskBadge");
  const printButton = document.getElementById("printButton");
  const feedbackButton = document.getElementById("feedbackButton");
  const dialog = document.getElementById("feedbackDialog");

  function source(id) { return K.sources.find(item => item.id === id); }

  function addMessage(role, html) {
    const item = document.createElement("div");
    item.className = `message ${role}`;
    item.innerHTML = html;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }

  function addOptions(options) {
    const row = document.createElement("div");
    row.className = "option-row";
    options.forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option.label;
      button.addEventListener("click", () => option.action(option.value));
      row.appendChild(button);
    });
    messages.lastElementChild.appendChild(row);
  }

  function detectIntent(text) {
    return window.QingxiangEngine.detectIntent(text);
  }

  function begin(text) {
    addMessage("user", `<p>${escapeHtml(text)}</p>`);
    const direct = window.QingxiangEngine.answer(text, state.intent);
    if (direct) {
      renderPlan({
        ...direct,
        sources: direct.sourceIds.map(source).filter(Boolean)
      });
      addMessage("assistant", `<h3>${escapeHtml(direct.title)}</h3><p>${escapeHtml(direct.sections[0][1][0])}</p>`);
      return;
    }
    const intent = detectIntent(text);
    state.intent = intent;
    state.context = {};
    if (!intent) {
      addMessage("assistant", "<h3>我还不确定您要办理哪项服务</h3><p>请选择最接近的事项，我会继续为您梳理。</p>");
      addOptions([
        { label: "居住登记", value: "residence_registration", action: chooseIntent },
        { label: "居住证", value: "residence_permit", action: chooseIntent },
        { label: "租赁备案", value: "rent_filing", action: chooseIntent },
        { label: "青年安居", value: "youth_housing", action: chooseIntent }
      ]);
      return;
    }
    routeIntent(intent);
  }

  function chooseIntent(intent) {
    state.intent = intent;
    addMessage("user", `<p>${labelForIntent(intent)}</p>`);
    routeIntent(intent);
  }

  function routeIntent(intent) {
    if (intent === "residence_registration") askResidenceType();
    if (intent === "residence_permit") askRegistrationDuration();
    if (intent === "rent_filing") askTransactionType();
    if (intent === "youth_housing") showYouthHousing();
  }

  function askResidenceType() {
    addMessage("assistant", "<h3>您目前住在哪里？</h3><p>不同居住方式需要提供不同的居住证明。请选择最符合实际情况的一项，无须填写具体地址。</p>");
    addOptions([
      { label: "市场化租赁住房", value: "rental", action: showRegistration },
      { label: "本人或近亲属住房", value: "owned", action: showRegistration },
      { label: "单位或学校集体宿舍", value: "dorm", action: showRegistration },
      { label: "还没有稳定住所", value: "unstable", action: showRegistration }
    ]);
  }

  function showRegistration(type) {
    state.context.residenceType = type;
    const map = {
      rental: {
        label: "市场化租赁住房",
        material: "住房租赁合同或者房屋管理部门出具的住房租赁合同备案证明；如属于近亲属租赁住房，还需提供亲属关系证明或填写亲属关系承诺书。",
        warning: "按照现行细则，租赁住房可使用住房租赁合同或备案证明。网签备案是另一项独立业务，是否需要办理取决于租赁交易方式和后续办事要求。"
      },
      owned: {
        label: "本人或近亲属住房",
        material: "相应不动产权证明；居住在近亲属住房的，还需提供亲属关系证明或填写亲属关系承诺书。",
        warning: "近亲属的具体范围以现行实施细则为准；承诺书的填写方式请以官方办理页面或受理窗口的提示为准。"
      },
      dorm: {
        label: "单位或学校集体宿舍",
        material: "单位或学校人事、保卫部门出具的集体宿舍证明。",
        warning: "证明的开具部门和格式可能受单位或学校内部流程影响，建议提前向所在单位或学校确认。"
      },
      unstable: {
        label: "尚无稳定住所",
        material: "当前信息不足以证明在沪合法稳定住所并实际居住。",
        warning: "仅凭现有信息还无法判断您是否符合登记条件。建议先明确实际居住安排，再咨询社区事务受理服务中心或拨打12345。"
      }
    };
    const item = map[type];
    addMessage("user", `<p>${item.label}</p>`);
    const src = source("SRC-RES-RULES");
    const high = type === "unstable";
    renderPlan({
      title: "居住登记准备清单",
      risk: high ? "建议咨询官方渠道" : "可以开始准备",
      riskClass: high ? "high" : "low",
      sections: [
        ["当前情况", [high ? "现有信息不足，暂时无法生成完整的办理清单。" : "境内来沪人员应当在上海有合法稳定住所并实际居住。根据您选择的居住方式，需要准备以下住所证明。"]],
        ["核心证明", [item.material]],
        ["线下办理补充", ["到社区事务受理服务中心办理时，还需填写《居住登记信息表》，并提供本人居民身份证或户口簿。请勿在本页面输入证件信息。"]],
        ["办理渠道", ["社区事务受理服务中心", "一网通办或随申办相关入口；具体入口和材料要求以官方事项页为准"]],
        ["后续提醒", ["材料齐全并完成登记后，可以取得居住登记凭证。", "居住登记有效期为一年。登记信息发生变化或凭证到期时，请按官方规定办理变更或重新登记。"]]
      ],
      warning: item.warning,
      sources: [src, source("SRC-RES-SERVICE")]
    });
    addMessage("assistant", `<h3>已生成${item.label}的准备清单</h3><p>${high ? "建议先通过官方渠道确认住所要求。" : "请先确认住所证明是否齐全，再进入官方平台办理。"}</p>`);
  }

  function askRegistrationDuration() {
    addMessage("assistant", "<h3>请确认居住登记和社保情况</h3><p>通常需要办理居住登记满半年。按照现行细则，已经办理居住登记，且申领前6个月在上海连续缴纳社保、申领当月仍在缴纳的，也可视为满足半年要求。</p>");
    addOptions([
      { label: "已登记满半年", value: "yes", action: showPermit },
      { label: "未满半年，但连续缴社保6个月", value: "social_security", action: showPermit },
      { label: "已登记但未满半年", value: "not_yet", action: showPermit },
      { label: "还未办理居住登记", value: "no", action: showPermit },
      { label: "不确定", value: "unknown", action: showPermit }
    ]);
  }

  function showPermit(status) {
    const src = source("SRC-RES-RULES");
    const eligibleToPrepare = status === "yes" || status === "social_security";
    const summary = {
      yes: "已满足“居住登记满半年”这一时间前提，还需符合合法稳定就业、合法稳定住所、连续就读条件之一。",
      social_security: "如已办理居住登记，且申领前6个月在上海连续缴纳社保、申领当月仍在缴纳，可按现行细则视为满足“登记满半年”的要求；社保状态和其他条件仍需由官方审核。",
      not_yet: "目前尚未满足通常所说的“居住登记满半年”要求；如果在上海连续缴纳社保，可以进一步对照现行细则确认。",
      no: "应先根据实际居住情况完成居住登记，再计算是否已满半年。",
      unknown: "目前无法确认登记时间是否符合要求，请查看登记凭证，或通过随申办、社区事务受理服务中心查询。"
    }[status];
    renderPlan({
      title: "上海市居住证申领条件",
      risk: eligibleToPrepare ? "还需确认其他条件" : "条件尚未满足或不明确",
      riskClass: eligibleToPrepare ? "medium" : "high",
      sections: [
        ["当前情况", [summary]],
        ["主要申请条件", ["离开常住户口所在地，并在上海办理居住登记满半年；或者已经办理居住登记，且申领前6个月连续在沪缴纳社保、申领当月仍在缴纳，可按现行细则视为登记满半年。", "同时还需符合合法稳定就业、合法稳定住所或连续就读条件之一。"]],
        ["办理渠道", ["社区事务受理服务中心", "一网通办平台"]],
        ["线下办理提示", ["线下还需填写《上海市居住证申请表》，并提供本人居民身份证或户口簿。", "现居住地址与登记地址不一致时，还需按规定提供相应的居住证明。"]]
      ],
      warning: "本工具只能帮助您梳理申请条件，无法判断您是否符合合法稳定就业、合法稳定住所或连续就读的具体要求。最终结果以官方审核为准。",
      sources: [src]
    });
    addMessage("assistant", `<h3>登记时间情况已梳理</h3><p>${summary}</p>`);
  }

  function askTransactionType() {
    addMessage("assistant", "<h3>您的租赁合同是通过哪种方式签订的？</h3><p>房东和承租人自行签约、通过房地产经纪机构签约，或由住房租赁企业出租，办理网签备案的主体各不相同。</p>");
    addOptions([
      { label: "房东与承租人自行成交", value: "self", action: showFiling },
      { label: "通过房地产经纪机构", value: "agency", action: showFiling },
      { label: "由住房租赁企业出租", value: "company", action: showFiling },
      { label: "不确定", value: "unknown", action: showFiling }
    ]);
  }

  function showFiling(type) {
    const content = {
      self: ["可以通过一网通办门户、随申办移动端办理，也可以前往区住房租赁服务中心或社区事务受理服务中心。", "线下办理通常需要租赁双方提交申请书、身份证明和房屋权属证明。线上办理时，部分材料可以通过数据共享或电子证照调取，无须重复提交。"],
      agency: ["通过房地产经纪机构订立住房租赁合同的，应由房地产经纪机构办理网签备案。", "请向经纪机构确认办理进度，并通过官方渠道查看备案结果。"],
      company: ["住房租赁企业出租房屋的，应由住房租赁企业通过住房租赁平台完成网签备案。", "请向出租企业确认备案状态和电子凭证。"],
      unknown: ["当前无法确定应由谁办理。", "先查看租赁合同签约主体，并向房东、经纪机构或出租企业确认交易方式；必要时咨询区租赁中心或社区受理中心。"]
    }[type];
    renderPlan({
      title: "住房租赁合同网签备案",
      risk: type === "unknown" ? "需确认交易方式" : "可继续准备",
      riskClass: type === "unknown" ? "high" : "low",
      sections: [
        ["办理主体与方式", content],
        ["办理结果", ["完成后取得住房租赁合同备案通知书，可在随申办移动端按官方方式下载电子证照。"]],
        ["与后续事项的关系", ["租赁住房时，备案证明可以作为办理居住登记所需的合法居住证明之一。"]]
      ],
      warning: "房屋权属特殊或备案状态异常时，可能需要到线下窗口办理。确认房源和合同真实有效后，再提交材料。",
      sources: [source("SRC-RENT-FILING"), source("SRC-RES-RULES")]
    });
    addMessage("assistant", "<h3>已整理网签备案办理路径</h3><p>请确认签约方式和办理主体，再通过官方入口办理。</p>");
  }

  function showYouthHousing() {
    renderPlan({
      title: "青年安居信息查询",
      risk: "动态信息，请实时确认",
      riskClass: "medium",
      sections: [
        ["可以关注的服务", ["青年驿站等短期求职住宿", "保障性租赁住房毕业季专项", "青年人才公寓和区级安居项目"]],
        ["可以提前整理的信息", ["目前处于毕业、求职、实习还是刚参加工作阶段", "预计入住时间和居住时长", "工作或求职区域以及通勤需求", "是否符合具体项目公布的申请对象和材料要求"]],
        ["查询提示", ["房源、名额、入住规则和申请入口会随时调整。", "请通过当前官方平台或项目运营方、官方咨询渠道确认，不要直接依据社交平台上的旧帖申请。"]]
      ],
      warning: "官方新闻只能用于了解政策背景，不能代替具体项目的申请规则。本工具暂不推荐具体房源，也不判断个人资格。",
      sources: [source("SRC-YOUTH-STATION"), source("SRC-YOUTH-HOUSING")]
    });
    addMessage("assistant", "<h3>青年安居信息更新较快</h3><p>我可以帮您整理查询步骤，但能否申请仍要以当前项目页面公布的条件和房源为准。</p>");
  }

  function renderPlan(data) {
    planTitle.textContent = data.title;
    riskBadge.textContent = data.risk;
    riskBadge.className = `risk-badge ${data.riskClass}`;
    planContent.className = "plan-content";
    const sections = data.sections.map(([title, items]) => `
      <section class="plan-section"><h3>${title}</h3><ul>${items.map(item => `<li>${item}</li>`).join("")}</ul></section>
    `).join("");
    const sources = data.sources.map(item => `
      <a class="source-link" href="${item.url}" target="_blank" rel="noreferrer">${item.issuer}：${item.title}（信息核验日期：${item.verified}）</a>
    `).join("");
    planContent.innerHTML = `${sections}<div class="warning">${data.warning}</div><section class="plan-section"><h3>官方来源</h3>${sources}</section>`;
    printButton.disabled = false;
    feedbackButton.disabled = false;
  }

  function reset() {
    state.intent = null;
    state.context = {};
    messages.innerHTML = "";
    addMessage("assistant", "<h3>您好，我是青享沪上</h3><p>请告诉我您想办理什么，或从上方选择一个常见事项。我只会询问与办理有关的情况，无须提供真实证件信息。</p>");
    planTitle.textContent = "请选择办理事项";
    riskBadge.textContent = "等待开始";
    riskBadge.className = "risk-badge neutral";
    planContent.className = "plan-content empty-state";
    planContent.innerHTML = "<p>选择常见事项或描述您的需求后，这里会显示办理建议和准备清单。</p>";
    printButton.disabled = true;
    feedbackButton.disabled = true;
  }

  function labelForIntent(intent) {
    return { residence_registration: "居住登记", residence_permit: "上海市居住证", rent_filing: "住房租赁合同网签备案", youth_housing: "青年安居服务" }[intent];
  }

  function escapeHtml(text) {
    return text.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  document.getElementById("queryForm").addEventListener("submit", event => {
    event.preventDefault();
    const input = document.getElementById("queryInput");
    const value = input.value.trim();
    if (!value) return;
    begin(value);
    input.value = "";
  });

  document.querySelectorAll("[data-query]").forEach(button => button.addEventListener("click", () => begin(button.dataset.query)));
  document.getElementById("resetButton").addEventListener("click", reset);
  printButton.addEventListener("click", () => window.print());
  feedbackButton.addEventListener("click", () => dialog.showModal());
  document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.target).classList.add("active");
  }));

  document.getElementById("sourceList").innerHTML = K.sources.map(item => `
    <article class="source-item">
      <div><h3>${item.title}</h3><p>${item.issuer} · ${item.published === "页面动态更新" ? item.published : `发布日期：${item.published}`} · 信息核验日期：${item.verified}</p><p>${item.scope}</p></div>
      <a href="${item.url}" target="_blank" rel="noreferrer">打开官方页面</a>
    </article>
  `).join("");

  reset();
})();
