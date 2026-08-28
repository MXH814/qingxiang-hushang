from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd


METRICS = [
    "issuer_visible",
    "publish_date_visible",
    "effective_period_visible",
    "audience_visible",
    "eligibility_visible",
    "identity_branches_visible",
    "materials_visible",
    "steps_visible",
    "channels_visible",
    "offline_fallback_visible",
    "time_limit_visible",
    "result_visible",
    "cost_visible",
    "consultation_visible",
    "faq_or_example_visible",
    "direct_online_entry_visible",
    "update_or_expiry_visible",
    "cross_service_relation_visible",
    "mobile_channel_visible",
    "risk_or_ineligible_visible",
    "plain_language_summary_visible",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_csv", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()

    frame = pd.read_csv(args.input_csv)
    missing = [column for column in METRICS if column not in frame]
    if missing:
        raise ValueError(f"Missing audit fields: {missing}")
    for column in METRICS:
        values = set(frame[column].dropna().unique())
        if not values.issubset({0, 1}):
            raise ValueError(f"{column} contains non-binary values: {values}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    field_coverage = (
        frame[METRICS]
        .mean()
        .mul(100)
        .round(1)
        .rename("coverage_percent")
        .reset_index()
        .rename(columns={"index": "field"})
        .sort_values(["coverage_percent", "field"])
    )
    field_coverage.to_csv(args.output_dir / "field_coverage.csv", index=False, encoding="utf-8-sig")

    page_coverage = frame[["page_id", "journey", "page_type", "title"]].copy()
    page_coverage["fields_present"] = frame[METRICS].sum(axis=1)
    page_coverage["field_count"] = len(METRICS)
    page_coverage["coverage_percent"] = (page_coverage["fields_present"] / len(METRICS) * 100).round(1)
    page_coverage.to_csv(args.output_dir / "page_coverage.csv", index=False, encoding="utf-8-sig")

    journey_coverage = (
        frame.groupby("journey")[METRICS]
        .max()
        .sum(axis=1)
        .rename("bundle_fields_present")
        .to_frame()
    )
    journey_coverage["field_count"] = len(METRICS)
    journey_coverage["bundle_coverage_percent"] = (
        journey_coverage["bundle_fields_present"] / len(METRICS) * 100
    ).round(1)
    journey_coverage["pages_needed"] = frame.groupby("journey").size()
    journey_coverage.reset_index().to_csv(
        args.output_dir / "journey_bundle_coverage.csv", index=False, encoding="utf-8-sig"
    )

    weakest = field_coverage.head(6)
    summary = [
        "# 官方页面字段审计结果摘要",
        "",
        f"- 审计页面：{len(frame)}个；服务旅程：{frame['journey'].nunique()}条；字段：{len(METRICS)}项。",
        "- 统计为公开页面字段是否出现，不代表部门服务质量排名。",
        "- 单页覆盖与旅程组合覆盖分别计算，用于识别信息分散和跨页查找成本。",
        "",
        "## 覆盖较弱字段",
        "",
    ]
    for row in weakest.itertuples(index=False):
        summary.append(f"- `{row.field}`：{row.coverage_percent:.1f}%")
    summary.extend(
        [
            "",
            "## 可复核判断",
            "",
            "1. 规范性文件通常能完整呈现效力、条件和风险边界，但较少提供直接办理入口和咨询渠道。",
            "2. 一网通办事项页行动入口和咨询较强，但部分身份分支和跨事项关系需要回到规范性文件或解读页理解。",
            "3. 青年安居新闻和活动页能说明政策供给、阶段与渠道，却未形成统一的个人资格、材料、实时房源和申请入口页面。",
            "4. 因此，导办原型应把来源类型分层展示，并把“政策概览”和“个人可办理结论”严格区分。",
        ]
    )
    (args.output_dir / "analysis_summary.md").write_text("\n".join(summary) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
