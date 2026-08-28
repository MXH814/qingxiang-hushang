(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  if (root) root.QingxiangEngine = engine;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SOURCE_BY_INTENT = {
    residence_registration: ["SRC-RES-RULES", "SRC-RES-SERVICE"],
    residence_permit: ["SRC-RES-RULES"],
    rent_filing: ["SRC-RENT-FILING", "SRC-RES-RULES"],
    youth_housing: ["SRC-YOUTH-STATION", "SRC-YOUTH-HOUSING"]
  };

  function detectIntent(text) {
    if (/租赁|租房.*备案|网签/.test(text)) return "rent_filing";
    if (/(登记.{0,10}(未满|不到).{0,6}半年.*社保|社保.{0,8}(连续|缴).{0,8}(6|六)个?月|登记满半年.*(申请|申领))/.test(text)) return "residence_permit";
    if (/居住证/.test(text)) return "residence_permit";
    if (/居住登记|登记凭证|宿舍.*登记/.test(text)) return "residence_registration";
    if (/青年驿站|保租房|人才公寓|安居|短期住宿/.test(text)) return "youth_housing";
    return null;
  }

  function response(intent, title, risk, riskClass, items, warning, sourceIds) {
    return {
      intent,
      title,
      risk,
      riskClass,
      sections: [["办理提示", items]],
      warning,
      sourceIds: sourceIds || SOURCE_BY_INTENT[intent] || []
    };
  }

  function answer(text, hintIntent) {
    const query = String(text || "").trim();
    const intent = hintIntent || detectIntent(query);
    if (!query) return null;

    if (/身份证号|身份证照片|证件照片|上传.*证件|帮我查资格|帮我申请/.test(query)) {
      return response(intent || "residence_permit", "请保护个人信息", "请停止输入敏感信息", "high", [
        "本工具不需要姓名、身份证号、证件照片、详细住址或政务账号等个人信息。",
        "本工具不受理申请、不查询个人资格，也不会保存输入内容。请只在上海官方平台或线下窗口提交办事材料。"
      ], "请勿在本页面输入任何真实证件信息。", SOURCE_BY_INTENT[intent] || ["SRC-RES-RULES"]);
    }

    if (/保证.*政策|政策.*今天.*有效|永久准确/.test(query)) {
      return response(intent || "residence_permit", "请确认政策是否更新", "需要再次确认", "high", [
        "政策和办事要求可能调整。知识库已标注信息来源、发布日期、有效期和最近一次核验日期。",
        "提交申请前，请重新打开官方页面。房源、申请入口和区级项目规则等动态信息，应以当天发布的官方内容为准。"
      ], "本工具只能协助您做好办事准备，具体要求以官方解释为准。", SOURCE_BY_INTENT[intent] || ["SRC-RES-RULES", "SRC-RENT-FILING"]);
    }

    if (intent === "youth_housing") {
      if (/空房|名额|一定能|一定.*免费|一定不超过|月租|条件一样|小红书|帖子/.test(query)) {
        return response(intent, "青年安居信息查询", "信息随时可能更新", "high", [
          "青年驿站的房源、名额、入住规则和具体项目价格会随时调整。官方新闻可以帮助了解政策背景，但不能用来判断个人是否符合申请条件。",
          "不同区、不同项目的要求可能不同。请进入当前官方平台，按项目名称确认申请对象、开放日期、所需材料、价格和申请入口。",
          "社交平台内容可以作为查找线索，但申请时仍应以官方规则为准。"
        ], "不承诺有房、符合资格或固定价格。", SOURCE_BY_INTENT[intent]);
      }
      return response(intent, "青年安居信息查询", "信息随时可能更新", "medium", [
        "先确认自己目前处于毕业、求职、实习还是刚参加工作阶段，再根据预计入住时间和通勤范围查看具体项目规则。",
        "2026年官方信息显示，青年驿站最长免费住宿时间和保租房专项供给有所增加，但个人是否符合条件、当前是否有房，仍需在官方平台确认。"
      ], "相关政策扩大了服务供给，但不代表个人申请一定会通过。", SOURCE_BY_INTENT[intent]);
    }

    if (intent === "rent_filing") {
      if (/中介|经纪机构/.test(query)) {
        return response(intent, "通过经纪机构签约", "办理主体已明确", "low", ["通过房地产经纪机构订立住房租赁合同的，应由房地产经纪机构通过住房租赁平台完成网签备案。", "承租人可以向经纪机构确认办理进度和备案通知书。"], "请勿委托来源不明的商业代办。", SOURCE_BY_INTENT[intent]);
      }
      if (/长租公寓|租赁企业|企业出租/.test(query)) {
        return response(intent, "由住房租赁企业出租", "办理主体已明确", "low", ["住房租赁企业出租房屋的，应由住房租赁企业通过住房租赁平台完成网签备案。", "承租人应确认合同主体、办理进度和电子凭证。"], "仍需自行确认房源和合同真实有效。", SOURCE_BY_INTENT[intent]);
      }
      if (/提前解除|注销/.test(query)) {
        return response(intent, "提前解约后如何注销备案", "按实际情况办理", "medium", ["租赁合同提前解除或终止时，可由租赁双方提交网签备案申请书和身份证明办理注销。", "一方不配合的，另一方可以依法单方申请并作出书面承诺，但不得伪造事实或材料。"], "备案到期后会自动注销；只有提前解除或终止合同时，才需要按规定申请注销。", SOURCE_BY_INTENT[intent]);
      }
      if (/超过三年|多久.*有效|永久/.test(query)) {
        return response(intent, "备案期限", "需留意期限", "medium", ["网签备案应有明确起止日期；备案有效期超过3年的，需要重新备案。", "同一房屋或部位备案间隔少于2个月的，应到区租赁中心或社区受理中心说明情况。"], "以合同和官方系统记录为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/跨区|全市通办/.test(query)) {
        return response(intent, "网签备案可以全市通办", "可以办理", "low", ["区租赁中心和社区事务受理服务中心为租赁双方提供网签备案全市通办服务。", "房屋权属情况特殊时，可能需要到线下服务窗口办理。"], "前往窗口前，可以拨打官方咨询热线确认受理地点。", SOURCE_BY_INTENT[intent]);
      }
      if (/多久办结|当场/.test(query)) {
        return response(intent, "网签备案办理时间", "符合条件可当场办结", "low", ["按照现行操作规定，符合网签备案条件的，应当提供当场办结服务。", "材料不全、系统需要进一步确认或房屋权属情况特殊时，可能需要补充处理，因此并非所有申请都能当场完成。"], "具体办理进度以受理窗口或系统反馈为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/凭证|备案完成|结果/.test(query)) {
        return response(intent, "备案办理结果", "可下载凭证", "low", ["办理完成后取得住房租赁合同备案通知书。", "租赁当事人可通过随申办移动端下载备案通知书电子证照。"], "备案通知书不等于居住登记凭证或居住证。", SOURCE_BY_INTENT[intent]);
      }
      if (/所有材料|零材料|不用交/.test(query)) {
        return response(intent, "线上办理需要哪些材料", "以页面提示为准", "medium", ["线上办理时，能够通过数据共享或电子证照调取的材料，可以免于重复提交。", "这并不代表所有人都无须提交材料，具体要求仍以申请页面的提示为准。"], "请勿在非官方页面上传证件。", SOURCE_BY_INTENT[intent]);
      }
      if (/随申办|网上|线上/.test(query)) {
        return response(intent, "线上办理网签备案", "请确认当前入口", "low", ["租赁双方自行签约的，可以通过一网通办门户，或随申办移动端的“我要租房”“不见面办理”等入口办理。", "通过经纪机构或住房租赁企业签约的，应由相应机构或企业办理。"], "入口名称可能调整，建议在官方平台搜索事项全称。", SOURCE_BY_INTENT[intent]);
      }
      if (/关系|居住登记/.test(query)) {
        return response(intent, "网签备案与居住登记的关系", "两项业务需要分别办理", "medium", ["住房租赁合同网签备案和居住登记不是同一项业务，完成其中一项不会自动完成另一项。", "按照现行居住证细则，租赁住房办理居住登记时，可以提交住房租赁合同或住房租赁合同备案证明。"], "请以现行细则为准，不要继续套用已经废止的旧规则。", SOURCE_BY_INTENT[intent]);
      }
      return response(intent, "住房租赁合同网签备案", "请先确认签约方式", "medium", ["租赁双方自行签约的，可以在线办理，也可以到区住房租赁服务中心或社区事务受理服务中心办理；线下通常由双方提交申请书、身份证明和房屋权属证明。", "通过经纪机构签约的，由经纪机构办理；由住房租赁企业出租的，由该企业办理。"], "房屋权属特殊或备案状态异常时，可能需要到线下窗口进一步确认。", SOURCE_BY_INTENT[intent]);
    }

    if (intent === "residence_permit") {
      if (/社保.*6个月|连续.*社保|登记未满半年.*社保/.test(query)) {
        return response(intent, "连续缴纳社保如何计算", "还需确认其他条件", "medium", ["已经办理居住登记的境内来沪人员，如果申领前6个月在上海连续缴纳社保，且申领当月仍在缴纳，可以视为办理居住登记满半年。", "此外，还需符合合法稳定就业、合法稳定住所或连续就读条件之一，并由官方审核。"], "仅凭社保信息无法判断申请一定会通过。", SOURCE_BY_INTENT[intent]);
      }
      if (/没办|未办理.*登记/.test(query)) {
        return response(intent, "请先办理居住登记", "尚未满足申请条件", "high", ["申领居住证前，应当先办理居住登记。", "完成居住登记后，再确认是否登记满半年，或是否符合现行细则中有关连续缴纳社保的规定。"], "未办理居住登记时，无法直接申请居住证。", SOURCE_BY_INTENT[intent]);
      }
      if (/三个月|未满半年/.test(query)) {
        return response(intent, "居住登记时间还未满半年", "请继续确认社保情况", "high", ["居住登记未满半年时，通常还不符合时间要求。", "如果已经办理居住登记，且申领前6个月在上海连续缴纳社保、申领当月仍在缴纳，可以按照现行细则确认是否视为登记满半年。"], "仅凭登记三个月这一项信息，还不能判断是否符合申请条件。", SOURCE_BY_INTENT[intent]);
      }
      if (/一定|满半年.*就/.test(query)) {
        return response(intent, "登记满半年不等于一定符合条件", "还需确认其他条件", "high", ["居住登记满半年只满足了时间要求。", "还需符合合法稳定就业、合法稳定住所或连续就读条件之一，并由官方审核。"], "本工具无法保证申请结果。", SOURCE_BY_INTENT[intent]);
      }
      if (/哪里|在哪|渠道/.test(query)) {
        return response(intent, "居住证申领渠道", "官方渠道", "low", ["可在全市任一社区事务受理服务中心办理。", "已上线事项也可通过一网通办、随申办的“居住证办理一件事”办理。"], "入口和开放状态以当日官方页面为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/带什么|材料/.test(query)) {
        return response(intent, "居住证线下办理材料", "根据实际情况准备", "medium", ["线下办理时，需要填写《上海市居住证申请表》，并提供本人居民身份证或户口簿。", "现住址与登记地址不一致时，还需根据当前居住情况提供相应的居住证明。"], "请只向官方受理窗口提交真实材料。", SOURCE_BY_INTENT[intent]);
      }
      if (/地址.*不同|住址.*变化|地址.*变化/.test(query)) {
        return response(intent, "居住信息变更", "30日内办理", "medium", ["持证人居住地址或其他登记信息变动的，应自变动之日起30日内办理信息变更。", "申领时现住址与登记地址不一致的，应提供现住址居住证明。"], "办理渠道和材料以官方事项页为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/不通过|原因/.test(query)) {
        return response(intent, "申请未通过怎么办", "应当告知理由", "medium", ["申请不符合条件的，相关部门应通过社区事务受理服务中心书面告知，或通过一网通办平台告知，并说明理由。"], "本工具无法判断复核或申诉结果。", SOURCE_BY_INTENT[intent]);
      }
      if (/快递|领取/.test(query)) {
        return response(intent, "居住证领取", "两种方式", "low", ["可以选择线下领取或快递送证，快递仅限上海市范围。", "领取时按现行规则出示受理回执或本人居民身份证。"], "具体配送费用和状态以办理页面为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/签注/.test(query)) {
        return response(intent, "居住证签注", "每年一次", "medium", ["居住证每年签注一次，应在签注期限届满前30日内办理。", "逾期后功能和居住年限计算可能受影响。"], "请留意电子证照或官方提醒。", SOURCE_BY_INTENT[intent]);
      }
      if (/丢|遗失|损坏/.test(query)) {
        return response(intent, "居住证补领", "及时办理", "medium", ["居住证丢失可办理挂失，并凭有效身份证件办理补领；损坏难以辨认可办理换领。"], "不要重新注册或向非官方代办提交证件。", SOURCE_BY_INTENT[intent]);
      }
      if (/稳定工作|连续就读|稳定住所|读书/.test(query)) {
        return response(intent, "居住证申请条件", "三类条件满足其一", "medium", ["合法稳定就业、合法稳定住所和连续就读是三类不同的申请条件，符合其中一类即可。", "此外，还需满足居住登记时间要求，或符合连续缴纳社保的相关规定，并由官方审核。"], "满足其中一项，并不代表一定符合全部申请条件。", SOURCE_BY_INTENT[intent]);
      }
      return response(intent, "上海市居住证申领", "请逐项确认申请条件", "medium", ["先确认是否已经办理居住登记，以及是否登记满半年或符合连续缴纳社保的相关规定。", "再确认是否符合合法稳定就业、合法稳定住所或连续就读条件之一，然后通过官方渠道申请。"], "本工具无法判断最终申请资格，具体结果以官方审核为准。", SOURCE_BY_INTENT[intent]);
    }

    if (intent === "residence_registration") {
      if (/违法建筑|违法居住/.test(query)) {
        return response(intent, "不予办理的情况", "不予办理", "high", ["居住在违法建筑内，或者存在违法居住行为的，不予办理居住登记和居住证。"], "请勿尝试以虚假信息或材料规避审核。", SOURCE_BY_INTENT[intent]);
      }
      if (/酒店|没有稳定住所|无稳定住所/.test(query)) {
        return response(intent, "住所情况需要进一步确认", "建议咨询官方渠道", "high", ["现有信息不足，暂时无法确认当前住所是否符合居住登记要求。", "请联系社区事务受理服务中心或拨打12345，如实说明住所类型，不要编造证明材料。"], "本工具无法据此判断您是否符合登记条件。", SOURCE_BY_INTENT[intent]);
      }
      if (/学校宿舍|单位宿舍|集体宿舍/.test(query)) {
        return response(intent, "集体宿舍居住登记", "可准备材料", "low", ["居住在单位、学校集体宿舍的，应提供单位或学校人事、保卫部门出具的集体宿舍证明。", "线下还需按要求填写登记表并提供本人居民身份证或户口簿。"], "证明格式先向单位或学校确认。", SOURCE_BY_INTENT[intent]);
      }
      if (/姐姐|近亲属|亲属/.test(query)) {
        return response(intent, "居住在近亲属住房", "需要亲属关系材料", "medium", ["根据住房是自有还是租赁，提供不动产权证明、住房租赁合同或备案证明。", "还需提供亲属关系证明，或按照现行规则填写亲属关系承诺书。"], "朋友通常不在细则所列的近亲属范围内，具体以现行规定为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/自己买|自购|本人住房/.test(query)) {
        return response(intent, "居住在本人自有住房", "可以准备材料", "low", ["居住在本人自购住房的，需要提供相应的不动产权证明。", "线下办理时，还需填写登记表，并提供本人居民身份证或户口簿。"], "具体材料要求以官方事项页或受理窗口为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/租了房|租房|市场租赁/.test(query)) {
        return response(intent, "居住在租赁住房", "按现行规定准备材料", "medium", ["居住在租赁住房的，按照现行细则，可以提供住房租赁合同，或房屋管理部门出具的住房租赁合同备案证明。", "如果居住在近亲属租赁的住房内，还需提供亲属关系证明或承诺书；线下办理时另需登记表和身份证明。"], "网签备案和居住登记是两项独立业务，请以现行规定为准，不要继续套用已经废止的旧规则。", SOURCE_BY_INTENT[intent]);
      }
      if (/网上|线上|随申办/.test(query)) {
        return response(intent, "居住登记线上渠道", "可在线办理", "low", ["居住登记已可通过一网通办、随申办的“居住证办理一件事”全流程线上办理。", "也可到全市任一社区事务受理服务中心办理。"], "具体入口和材料以当日页面为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/得到什么|凭证|结果/.test(query)) {
        return response(intent, "居住登记结果", "取得登记凭证", "low", ["材料齐全并完成登记后，取得《居住登记凭证》。", "它与《上海市居住证》不是同一证件。"], "登记凭证有效期一年。", SOURCE_BY_INTENT[intent]);
      }
      if (/多久过期|有效期/.test(query)) {
        return response(intent, "居住登记有效期", "一年", "medium", ["《居住登记凭证》有效期一年，逾期需重新办理。"], "地址或登记信息变化时应及时办理变更。", SOURCE_BY_INTENT[intent]);
      }
      if (/搬家|地址变/.test(query)) {
        return response(intent, "变更居住登记信息", "需要办理变更", "medium", ["居住登记信息发生变化时，应当办理信息变更，并根据目前的居住情况提供相关证明。"], "请及时更新与实际居住情况不一致的信息。", SOURCE_BY_INTENT[intent]);
      }
      if (/材料不全/.test(query)) {
        return response(intent, "材料不齐怎么办", "窗口应一次性告知", "medium", ["线下办理时，如果材料不齐全，社区事务受理服务中心应当一次性告知需要补齐的内容，并退还申请材料。"], "部分材料可能无法当场补齐，建议按告知内容准备后再次办理。", SOURCE_BY_INTENT[intent]);
      }
      if (/一回事|区别/.test(query)) {
        return response(intent, "居住登记和居住证有什么区别", "两项业务需要分别办理", "medium", ["完成居住登记后取得的是居住登记凭证；上海市居住证需要另行申领。", "居住登记时间，或符合连续缴纳社保的相关规定，是申领居住证的条件之一。"], "居住登记凭证不等于上海市居住证。", SOURCE_BY_INTENT[intent]);
      }
      return response(intent, "居住登记办理准备", "请先确认居住方式", "medium", ["先确认目前居住在本人或近亲属自购住房、租赁住房，还是单位或学校集体宿舍。", "根据居住方式准备相应证明；线下办理时，还需登记表和本人居民身份证或户口簿。"], "请勿在本页面输入或上传真实证件信息。", SOURCE_BY_INTENT[intent]);
    }

    return null;
  }

  return { detectIntent, answer, sourceByIntent: SOURCE_BY_INTENT };
});
