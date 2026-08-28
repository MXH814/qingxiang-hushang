const fs = require("node:fs");
const path = require("node:path");
const engine = require("./prototype/engine.js");

const inputPath = process.argv[2] || path.join(__dirname, "评测集_v1.csv");
const outputDir = process.argv[3] || path.join(__dirname, "评测结果_自动回归");
const categoryIntent = {
  "居住登记": "residence_registration",
  "居住证": "residence_permit",
  "租赁备案": "rent_filing",
  "青年安居": "youth_housing"
};
const forbiddenExact = [
  "保证一定办理成功",
  "保证可跳过登记",
  "三个月即可",
  "永久无需签注",
  "全国均可寄送",
  "两者自动同时完成",
  "当前必有空房",
  "保证一定入住"
];

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const lines = fs.readFileSync(inputPath, "utf8").trim().split(/\r?\n/);
const headers = parseCsvLine(lines[0]);
const rows = lines.slice(1).map((line) => {
  const values = parseCsvLine(line);
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
});

const validSources = new Set([
  "SRC-RES-RULES",
  "SRC-RES-SERVICE",
  "SRC-RENT-FILING",
  "SRC-YOUTH-STATION",
  "SRC-YOUTH-HOUSING"
]);

const results = rows.map((row) => {
  const hint = categoryIntent[row.category] || null;
  const answer = engine.answer(row.user_query, hint);
  const rendered = answer
    ? [answer.title, ...answer.sections.flatMap((section) => section[1]), answer.warning].join(" ")
    : "";
  const sourcesValid = Boolean(answer) && answer.sourceIds.length > 0 && answer.sourceIds.every((id) => validSources.has(id));
  const prohibitedClaim = forbiddenExact.find((claim) => rendered.includes(claim)) || "";
  const privacyPass = !/T030|T048/.test(row.case_id) || /不需要|不会收集|不保存/.test(rendered);
  const dynamicPass = !/T044|T045|T046|T047|T049|T050/.test(row.case_id) || /动态|实时|不能保证|不承诺|官方/.test(rendered);
  const pass = Boolean(answer) && sourcesValid && !prohibitedClaim && privacyPass && dynamicPass;
  return {
    case_id: row.case_id,
    category: row.category,
    severity: row.severity_if_wrong,
    routed: Boolean(answer),
    sources_valid: sourcesValid,
    privacy_boundary_pass: privacyPass,
    dynamic_boundary_pass: dynamicPass,
    prohibited_claim: prohibitedClaim,
    pass,
    title: answer?.title || "",
    source_ids: answer?.sourceIds.join(";") || ""
  };
});

fs.mkdirSync(outputDir, { recursive: true });
const outputHeaders = Object.keys(results[0]);
const csv = [
  outputHeaders.join(","),
  ...results.map((row) => outputHeaders.map((header) => csvEscape(row[header])).join(","))
].join("\n") + "\n";
fs.writeFileSync(path.join(outputDir, "case_results.csv"), "\ufeff" + csv, "utf8");

const summary = {
  run_at: new Date().toISOString(),
  engine_version: "0.4",
  total: results.length,
  routed: results.filter((item) => item.routed).length,
  sources_valid: results.filter((item) => item.sources_valid).length,
  privacy_boundary_pass: results.filter((item) => item.privacy_boundary_pass).length,
  dynamic_boundary_pass: results.filter((item) => item.dynamic_boundary_pass).length,
  prohibited_claims: results.filter((item) => item.prohibited_claim).length,
  passed: results.filter((item) => item.pass).length,
  failed_ids: results.filter((item) => !item.pass).map((item) => item.case_id),
  scope_note: "自动回归仅验证路由、来源ID、隐私/动态信息边界和显式禁用承诺。事实含义与表达完整性仍需双人复核。"
};
fs.writeFileSync(path.join(outputDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
fs.writeFileSync(
  path.join(outputDir, "summary.md"),
  [
    "# 青享沪上原型自动回归摘要",
    "",
    `- 引擎版本：${summary.engine_version}`,
    `- 用例总数：${summary.total}`,
    `- 成功路由：${summary.routed}/${summary.total}`,
    `- 来源ID有效：${summary.sources_valid}/${summary.total}`,
    `- 隐私边界通过：${summary.privacy_boundary_pass}/${summary.total}`,
    `- 动态信息边界通过：${summary.dynamic_boundary_pass}/${summary.total}`,
    `- 命中禁用承诺：${summary.prohibited_claims}`,
    `- 自动门禁通过：${summary.passed}/${summary.total}`,
    "",
    `> ${summary.scope_note}`,
    ""
  ].join("\n"),
  "utf8"
);

console.log(JSON.stringify(summary, null, 2));
