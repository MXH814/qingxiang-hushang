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
      addMessage("assistant", "<h3>还不能确定对应事项</h3><p>请选择最接近的方向。我不会在事项不明确时猜测。</p>");
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
    addMessage("assistant", "<h3>先确认居住情形</h3><p>不同居住方式对应不同的合法居住证明。请选择最接近的一项，不要输入具体地址。</p>");
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
        warning: "现行细则已允许在租赁情形下使用住房租赁合同或备案证明。网签备案仍是独立事项，是否需要办理应按租赁交易及后续服务要求核验。"
      },
      owned: {
        label: "本人或近亲属住房",
        material: "相应不动产权证明；居住在近亲属住房的，还需提供亲属关系证明或填写亲属关系承诺书。",
        warning: "近亲属范围以现行实施细则为准；线上、线下承诺书填写方式以官方办理页面提示为准。"
      },
      dorm: {
        label: "单位或学校集体宿舍",
        material: "单位或学校人事、保卫部门出具的集体宿舍证明。",
        warning: "证明开具部门和格式可能有单位/学校内部流程，请先向本单位或学校确认。"
      },
      unstable: {
        label: "尚无稳定住所",
        material: "当前信息不足以证明在沪合法稳定住所并实际居住。",
        warning: "本原型不能判断您是否符合登记条件。请先确认实际居住安排，并咨询社区事务受理服务中心或12345。"
      }
    };
    const item = map[type];
    addMessage("user", `<p>${item.label}</p>`);
    const src = source("SRC-RES-RULES");
    const high = type === "unstable";
    renderPlan({
      title: "居住登记准备清单",
      risk: high ? "需人工核验" : "可继续准备",
      riskClass: high ? "high" : "low",
      sections: [
        ["当前判断", [high ? "现有情形不足以形成办理准备清单。" : "境内来沪人员应在本市有合法稳定住所并实际居住；该情形对应的住所证明如下。"]],
        ["核心证明", [item.material]],
        ["线下办理补充", ["到社区事务受理服务中心办理时，还需填写《居住登记信息表》，并提供本人居民身份证或户口簿。请勿在本原型中上传。"]],
        ["办理渠道", ["社区事务受理服务中心", "一网通办/随申办相关入口；动态入口和材料以事项页为准"]],
        ["后续提醒", ["材料齐全并完成登记后可取得居住登记凭证。", "居住登记有效期一年，信息变化或到期时按官方规定办理变更/重新登记。"]]
      ],
      warning: item.warning,
      sources: [src, source("SRC-RES-SERVICE")]
    });
    addMessage("assistant", `<h3>已生成${item.label}情形的清单</h3><p>${high ? "当前应先咨询官方渠道确认住所条件。" : "请重点核验住所证明是否已经具备，再进入官方入口。"}</p>`);
  }

  function askRegistrationDuration() {
    addMessage("assistant", "<h3>先确认居住登记和社保情形</h3><p>通常需办理居住登记满半年；现行细则也规定，已办理居住登记且申领前6个月连续在沪缴纳、当月仍在缴纳社保的，可视作满足半年要求。</p>");
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
      social_security: "如已办理居住登记，且申领前6个月连续在上海缴纳、当月仍在缴纳社会保险，可按现行细则视作满足“登记满半年”；仍需由官方核验社保状态及其他条件。",
      not_yet: "尚未满足通常的“居住登记满半年”时间前提；如有连续在沪缴纳社保情形，可进一步按现行细则核验。",
      no: "应先根据实际居住情形完成居住登记，再计算满半年时间。",
      unknown: "无法确认关键时间前提，请通过登记凭证、随申办或受理中心核验。"
    }[status];
    renderPlan({
      title: "上海市居住证申领判断",
      risk: eligibleToPrepare ? "仍需条件核验" : "前提未满足/不明",
      riskClass: eligibleToPrepare ? "medium" : "high",
      sections: [
        ["当前判断", [summary]],
        ["官方核心条件", ["离开常住户口所在地，在上海办理居住登记满半年；或已登记且申领前6个月连续在沪缴纳、当月仍缴纳社保，按现行细则视作满半年。", "同时符合合法稳定就业、合法稳定住所、连续就读条件之一。"]],
        ["办理渠道", ["社区事务受理服务中心", "一网通办平台"]],
        ["线下办理提示", ["线下还需填写《上海市居住证申请表》，并提供本人居民身份证或户口簿。", "现居住地址与登记地址不一致时，需要按规定核验相应居住证明。"]]
      ],
      warning: "本原型只能帮助整理条件，不能认定您是否属于合法稳定就业、住所或连续就读。最终以官方审核为准。",
      sources: [src]
    });
    addMessage("assistant", `<h3>已完成时间前提判断</h3><p>${summary}</p>`);
  }

  function askTransactionType() {
    addMessage("assistant", "<h3>先确认租赁交易方式</h3><p>自行成交、通过房地产经纪机构、由住房租赁企业出租，对应的备案办理主体不同。</p>");
    addOptions([
      { label: "房东与承租人自行成交", value: "self", action: showFiling },
      { label: "通过房地产经纪机构", value: "agency", action: showFiling },
      { label: "由住房租赁企业出租", value: "company", action: showFiling },
      { label: "不确定", value: "unknown", action: showFiling }
    ]);
  }

  function showFiling(type) {
    const content = {
      self: ["可通过一网通办门户、随申办移动端，或区租赁中心/社区事务受理服务中心办理。", "线下通常由租赁双方提交申请书、身份证明和房屋权属证明材料。线上可按数据共享和电子证照规则免于提交部分材料。"],
      agency: ["通过房地产经纪机构订立住房租赁合同的，应由房地产经纪机构办理网签备案。", "请向经纪机构核验办理状态，并通过官方渠道查看备案结果。"],
      company: ["住房租赁企业出租房屋的，应由住房租赁企业通过住房租赁平台完成网签备案。", "请向出租企业核验备案状态和电子凭证。"],
      unknown: ["当前无法确定应由谁办理。", "先查看租赁合同签约主体，并向房东、经纪机构或出租企业确认交易方式；必要时咨询区租赁中心或社区受理中心。"]
    }[type];
    renderPlan({
      title: "住房租赁合同网签备案",
      risk: type === "unknown" ? "需确认交易方式" : "可继续准备",
      riskClass: type === "unknown" ? "high" : "low",
      sections: [
        ["办理主体与方式", content],
        ["办理结果", ["完成后取得住房租赁合同备案通知书，可在随申办移动端按官方方式下载电子证照。"]],
        ["与后续事项的关系", ["租赁住房情形下，备案证明是办理居住登记时用于证明合法居住的重要材料之一。"]]
      ],
      warning: "不同房屋权属和异常备案情形可能需要线下办理。不要在未核验房源和合同真实性时提交材料。",
      sources: [source("SRC-RENT-FILING"), source("SRC-RES-RULES")]
    });
    addMessage("assistant", "<h3>已生成备案办理路径</h3><p>请先确认交易方式和实际办理主体，再查看官方入口。</p>");
  }

  function showYouthHousing() {
    renderPlan({
      title: "青年安居信息核验",
      risk: "动态信息，必须实时核验",
      riskClass: "medium",
      sections: [
        ["可关注的服务", ["青年驿站/短期求职住宿", "保障性租赁住房毕业季专项", "青年人才公寓及区级安居项目"]],
        ["先准备的非敏感信息", ["毕业/求职/实习/初就业阶段", "预计入住时间和时长", "工作或求职区域与通勤需求", "是否满足具体项目公示的身份和材料要求"]],
        ["核验原则", ["房源、名额、入住规则和平台入口具有动态性。", "应进入当前官方平台或联系项目运营/官方咨询渠道确认，不依据社交平台旧帖申请。"]]
      ],
      warning: "官方新闻用于说明政策方向，不等于具体项目的个人资格规则。本原型暂不作房源推荐和资格判断。",
      sources: [source("SRC-YOUTH-STATION"), source("SRC-YOUTH-HOUSING")]
    });
    addMessage("assistant", "<h3>青年安居信息变化较快</h3><p>我可以帮助整理核验步骤，但不会依据新闻或旧页面承诺您一定符合某个项目。</p>");
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
      <a class="source-link" href="${item.url}" target="_blank" rel="noreferrer">${item.issuer}：${item.title}（核验于${item.verified}）</a>
    `).join("");
    planContent.innerHTML = `${sections}<div class="warning">${data.warning}</div><section class="plan-section"><h3>官方来源</h3>${sources}</section>`;
    printButton.disabled = false;
    feedbackButton.disabled = false;
  }

  function reset() {
    state.intent = null;
    state.context = {};
    messages.innerHTML = "";
    addMessage("assistant", "<h3>您好，我是青享沪上结构化导办原型</h3><p>请描述您想完成的事情，或选择上方常见事项。我只询问必要情形，不需要真实证件信息。</p>");
    planTitle.textContent = "等待选择事项";
    riskBadge.textContent = "未判断";
    riskBadge.className = "risk-badge neutral";
    planContent.className = "plan-content empty-state";
    planContent.innerHTML = "<p>选择常见事项或输入目标后，这里会生成结构化计划。</p>";
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
      <div><h3>${item.title}</h3><p>${item.issuer} · 发布：${item.published} · 核验：${item.verified}</p><p>${item.scope}</p></div>
      <a href="${item.url}" target="_blank" rel="noreferrer">打开官方页面</a>
    </article>
  `).join("");

  reset();
})();
