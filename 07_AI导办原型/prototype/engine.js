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
      sections: [["导办结论", items]],
      warning,
      sourceIds: sourceIds || SOURCE_BY_INTENT[intent] || []
    };
  }

  function answer(text, hintIntent) {
    const query = String(text || "").trim();
    const intent = hintIntent || detectIntent(query);
    if (!query) return null;

    if (/身份证号|身份证照片|证件照片|上传.*证件|帮我查资格|帮我申请/.test(query)) {
      return response(intent || "residence_permit", "隐私与代办边界", "停止输入敏感信息", "high", [
        "本研究原型不需要、也不会收集姓名、身份证号、证件照片、精确住址或政务账号。",
        "本原型不受理申请、不查询个人资格，也不保存输入；请只在上海官方平台或线下窗口提交材料。"
      ], "请勿把任何真实证件信息粘贴到本页面。", SOURCE_BY_INTENT[intent] || ["SRC-RES-RULES"]);
    }

    if (/保证.*政策|政策.*今天.*有效|永久准确/.test(query)) {
      return response(intent || "residence_permit", "政策时效核验", "必须再次核验", "high", [
        "不能保证政策永久有效。当前知识库标注来源、发布日期、有效期和最近核验日期。",
        "提交申请前应重新打开官方页面；动态房源、入口和区级项目规则必须以当日官方信息为准。"
      ], "本原型提供办事准备支持，不替代官方最终解释。", SOURCE_BY_INTENT[intent] || ["SRC-RES-RULES", "SRC-RENT-FILING"]);
    }

    if (intent === "youth_housing") {
      if (/空房|名额|一定能|一定.*免费|一定不超过|月租|条件一样|小红书|帖子/.test(query)) {
        return response(intent, "青年安居实时核验", "动态信息", "high", [
          "青年驿站房源、名额、入住规则和具体项目价格会变化，官方新闻不能直接作为个人资格结论。",
          "不同区、不同项目的条件不一定相同；请进入当前官方平台，按项目名称核对对象、日期、材料、价格和申请入口。",
          "社交平台内容只可作为线索，不能替代官方规则。"
        ], "不承诺有房、符合资格或固定价格。", SOURCE_BY_INTENT[intent]);
      }
      return response(intent, "青年安居信息核验", "动态信息", "medium", [
        "先明确毕业、求职、实习或初就业阶段，再核对预计入住时间、通勤范围和具体项目规则。",
        "2026年官方信息显示青年驿站最长免费住宿时长和保租房专项供给有所扩展，但个人资格与实时房源仍需在当前平台确认。"
      ], "政策供给信息不等于个人审批结果。", SOURCE_BY_INTENT[intent]);
    }

    if (intent === "rent_filing") {
      if (/中介|经纪机构/.test(query)) {
        return response(intent, "经纪机构成交的备案主体", "可核验", "low", ["通过房地产经纪机构订立住房租赁合同的，应由房地产经纪机构通过住房租赁平台完成网签备案。", "承租人可向经纪机构核验办理状态和备案通知书。"], "不要另找不明商业代办。", SOURCE_BY_INTENT[intent]);
      }
      if (/长租公寓|租赁企业|企业出租/.test(query)) {
        return response(intent, "住房租赁企业的备案主体", "可核验", "low", ["住房租赁企业出租房屋的，应由住房租赁企业通过住房租赁平台完成网签备案。", "承租人应核验合同主体、办理状态和电子凭证。"], "具体房源和合同真实性仍需自行核验。", SOURCE_BY_INTENT[intent]);
      }
      if (/提前解除|注销/.test(query)) {
        return response(intent, "提前解除后的备案注销", "按情形办理", "medium", ["租赁合同提前解除或终止时，可由租赁双方提交网签备案申请书和身份证明办理注销。", "一方不配合的，另一方可依法单方申请并作书面承诺；不得伪造事实或材料。"], "到期会自动注销，提前解除才需按规则申请。", SOURCE_BY_INTENT[intent]);
      }
      if (/超过三年|多久.*有效|永久/.test(query)) {
        return response(intent, "备案期限", "需留意期限", "medium", ["网签备案应有明确起止日期；备案有效期超过3年的，需要重新备案。", "同一房屋或部位备案间隔少于2个月的，应到区租赁中心或社区受理中心说明情况。"], "以合同和官方系统记录为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/跨区|全市通办/.test(query)) {
        return response(intent, "备案通办范围", "可办理", "low", ["区租赁中心和社区事务受理服务中心为租赁当事人提供网签备案全市通办服务。", "部分特殊房屋权属情形需要通过线下服务窗口办理。"], "出发前可拨打官方咨询热线确认窗口。", SOURCE_BY_INTENT[intent]);
      }
      if (/多久办结|当场/.test(query)) {
        return response(intent, "备案办结要求", "正常情形", "low", ["现行操作规定要求，对符合网签备案条件的提供当场办结服务。", "材料不全、系统核验或特殊权属情形可能需要补充处理，不能承诺所有情况当场完成。"], "以实际受理和系统反馈为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/凭证|备案完成|结果/.test(query)) {
        return response(intent, "备案办理结果", "可下载凭证", "low", ["办理完成后取得住房租赁合同备案通知书。", "租赁当事人可通过随申办移动端下载备案通知书电子证照。"], "备案通知书不等于居住登记凭证或居住证。", SOURCE_BY_INTENT[intent]);
      }
      if (/所有材料|零材料|不用交/.test(query)) {
        return response(intent, "线上材料核验", "不可绝对免交", "medium", ["线上办理时，能够通过数据共享或电子证照调取的材料可免于提交。", "这不代表所有申请人、所有情形都零材料，仍应以申请页面校验结果为准。"], "不要在非官方页面上传证件。", SOURCE_BY_INTENT[intent]);
      }
      if (/随申办|网上|线上/.test(query)) {
        return response(intent, "线上网签备案", "入口需实时核验", "low", ["自行成交可通过一网通办门户、随申办移动端的“我要租房”或“不见面办理”入口办理。", "通过经纪机构或住房租赁企业成交时，办理主体由相应机构或企业承担。"], "入口名称可能更新，请从官方平台搜索事项名称。", SOURCE_BY_INTENT[intent]);
      }
      if (/关系|居住登记/.test(query)) {
        return response(intent, "备案与居住登记的关系", "两个独立事项", "medium", ["住房租赁网签备案和居住登记不是同一事项，也不会自动同时完成。", "按现行居住证细则，租赁住房办理居住登记时可提交住房租赁合同或者住房租赁合同备案证明。"], "不要把旧规则中的前置关系机械套用到现行细则。", SOURCE_BY_INTENT[intent]);
      }
      return response(intent, "住房租赁合同网签备案", "先确认交易方式", "medium", ["自行成交可线上或到区租赁中心、社区受理中心办理；线下由双方提交申请书、身份证明和房屋权属证明。", "经纪机构成交由经纪机构办理，住房租赁企业出租由企业办理。"], "特殊权属和异常备案情形需线下核验。", SOURCE_BY_INTENT[intent]);
    }

    if (intent === "residence_permit") {
      if (/社保.*6个月|连续.*社保|登记未满半年.*社保/.test(query)) {
        return response(intent, "社保连续缴纳视同情形", "仍需官方核验", "medium", ["已办理居住登记的境内来沪人员，申领前6个月连续在上海缴纳且当月仍在缴纳社会保险的，可视作办理居住登记满半年。", "仍需符合合法稳定就业、合法稳定住所、连续就读条件之一，并由官方审核。"], "仅凭社保信息不能保证获批。", SOURCE_BY_INTENT[intent]);
      }
      if (/没办|未办理.*登记/.test(query)) {
        return response(intent, "居住证前置条件", "前提未满足", "high", ["申领居住证前应先办理居住登记。", "完成居住登记后，按满半年规则或现行细则规定的连续社保视同情形核验。"], "不能跳过居住登记直接作出获批判断。", SOURCE_BY_INTENT[intent]);
      }
      if (/三个月|未满半年/.test(query)) {
        return response(intent, "登记时间核验", "需补充社保情形", "high", ["登记未满半年时，通常尚未满足时间要求。", "如已登记且申领前6个月连续在沪缴纳、当月仍缴纳社保，可按现行细则核验视同满半年情形。"], "三个月登记不能直接推出一定可以或一定不可以。", SOURCE_BY_INTENT[intent]);
      }
      if (/一定|满半年.*就/.test(query)) {
        return response(intent, "居住证资格边界", "仍需条件核验", "high", ["登记满半年只是时间条件。", "还需符合合法稳定就业、合法稳定住所、连续就读条件之一，并由官方审核。"], "本原型不保证审批结果。", SOURCE_BY_INTENT[intent]);
      }
      if (/哪里|在哪|渠道/.test(query)) {
        return response(intent, "居住证申领渠道", "官方渠道", "low", ["可在全市任一社区事务受理服务中心办理。", "已上线事项也可通过一网通办、随申办的“居住证办理一件事”办理。"], "入口和开放状态以当日官方页面为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/带什么|材料/.test(query)) {
        return response(intent, "居住证线下材料", "按情形准备", "medium", ["线下需填写《上海市居住证申请表》，并提供本人居民身份证或者户口簿。", "现住址与登记地址不一致时，还需按居住情形提供相应居住证明。"], "请只向官方窗口提交真实材料。", SOURCE_BY_INTENT[intent]);
      }
      if (/地址.*不同|住址.*变化|地址.*变化/.test(query)) {
        return response(intent, "居住信息变更", "30日内办理", "medium", ["持证人居住地址或其他登记信息变动的，应自变动之日起30日内办理信息变更。", "申领时现住址与登记地址不一致的，应提供现住址居住证明。"], "办理渠道和材料以官方事项页为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/不通过|原因/.test(query)) {
        return response(intent, "未通过处理", "应说明理由", "medium", ["对不符合申领条件的，官方应通过社区受理中心书面告知或一网通办平台告知，并说明理由。"], "本原型不能承诺复核或申诉结果。", SOURCE_BY_INTENT[intent]);
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
        return response(intent, "居住证条件核验", "条件之一", "medium", ["合法稳定就业、合法稳定住所、连续就读属于三类条件之一。", "还需满足登记时间或连续社保视同条件，并由官方审核。"], "不能把单一情形表述为全部申请人必然符合。", SOURCE_BY_INTENT[intent]);
      }
      return response(intent, "上海市居住证申领", "需情境核验", "medium", ["先核验是否已办理居住登记，以及登记满半年或连续社保视同情形。", "再核验合法稳定就业、合法稳定住所、连续就读条件之一，并通过官方渠道申请。"], "本原型不作最终资格认定。", SOURCE_BY_INTENT[intent]);
    }

    if (intent === "residence_registration") {
      if (/违法建筑|违法居住/.test(query)) {
        return response(intent, "不予办理情形", "不予办理", "high", ["居住在违法建筑或者存在违法居住行为的，不予办理居住登记和居住证。"], "不得寻找规避审核的方法。", SOURCE_BY_INTENT[intent]);
      }
      if (/酒店|没有稳定住所|无稳定住所/.test(query)) {
        return response(intent, "住所条件待核验", "需人工咨询", "high", ["现有信息不足以确认属于可办理居住登记的合法居住情形。", "请联系社区事务受理服务中心或12345说明实际住所类型，不要编造替代证明。"], "本原型不作确定资格判断。", SOURCE_BY_INTENT[intent]);
      }
      if (/学校宿舍|单位宿舍|集体宿舍/.test(query)) {
        return response(intent, "集体宿舍居住登记", "可准备材料", "low", ["居住在单位、学校集体宿舍的，应提供单位或学校人事、保卫部门出具的集体宿舍证明。", "线下还需按要求填写登记表并提供本人居民身份证或户口簿。"], "证明格式先向单位或学校确认。", SOURCE_BY_INTENT[intent]);
      }
      if (/姐姐|近亲属|亲属/.test(query)) {
        return response(intent, "近亲属住房居住登记", "需关系材料", "medium", ["需按自购或租赁情形提供不动产权证明、住房租赁合同或备案证明。", "还需提供亲属关系证明，或按现行规则填写亲属关系承诺书。"], "朋友不当然属于细则所列近亲属。", SOURCE_BY_INTENT[intent]);
      }
      if (/自己买|自购|本人住房/.test(query)) {
        return response(intent, "自有住房居住登记", "可准备材料", "low", ["居住在本人自购住房的，提供相应不动产权证明。", "线下还需填写登记表并提供本人居民身份证或户口簿。"], "最终以官方材料核验为准。", SOURCE_BY_INTENT[intent]);
      }
      if (/租了房|租房|市场租赁/.test(query)) {
        return response(intent, "租赁住房居住登记", "按现行规则准备", "medium", ["居住在租赁住房的，现行细则允许提供住房租赁合同或者房屋管理部门出具的住房租赁合同备案证明。", "近亲属租赁住房还需亲属关系证明或承诺书；线下另需登记表和身份证明。"], "网签备案与居住登记是独立事项，不应沿用已废止规则作绝对前置判断。", SOURCE_BY_INTENT[intent]);
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
        return response(intent, "居住登记信息变更", "需办理变更", "medium", ["居住登记信息发生变化时，应办理信息变更并按现居住情形提供相关证明。"], "不要继续使用与实际居住不一致的信息。", SOURCE_BY_INTENT[intent]);
      }
      if (/材料不全/.test(query)) {
        return response(intent, "材料补正", "一次性告知", "medium", ["线下材料不齐全时，社区事务受理服务中心应一次性告知需要补齐的内容并退还材料。"], "不能保证可在现场即时补齐。", SOURCE_BY_INTENT[intent]);
      }
      if (/一回事|区别/.test(query)) {
        return response(intent, "居住登记与居住证", "两个不同事项", "medium", ["居住登记完成后取得登记凭证；居住证需另行申领。", "登记时间或连续社保视同情形是居住证申领条件的一部分。"], "两者不能混为一谈。", SOURCE_BY_INTENT[intent]);
      }
      return response(intent, "居住登记办理准备", "需确认居住情形", "medium", ["先确认属于本人或近亲属自购住房、租赁住房，还是单位或学校集体宿舍。", "按对应情形准备居住证明；线下办理还需登记表和本人居民身份证或户口簿。"], "请勿在本原型上传真实证件。", SOURCE_BY_INTENT[intent]);
    }

    return null;
  }

  return { detectIntent, answer, sourceByIntent: SOURCE_BY_INTENT };
});
