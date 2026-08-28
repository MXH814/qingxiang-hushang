from __future__ import annotations

import argparse
import math
from pathlib import Path

import pandas as pd


REQUIRED = [
    "participant_id", "tool", "task", "time_sec", "success",
    "condition_correct", "material_correct", "source_found",
    "severe_errors", "confidence", "ease", "trust",
]
TOOLS = {"web", "ai"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="青享沪上配对可用性测试分析")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def exact_two_sided_sign_p(positive: int, negative: int) -> float:
    n = positive + negative
    if n == 0:
        return 1.0
    k = min(positive, negative)
    tail = sum(math.comb(n, i) for i in range(k + 1)) / (2 ** n)
    return min(1.0, 2 * tail)


def main() -> None:
    args = parse_args()
    df = pd.read_csv(args.input, encoding="utf-8-sig")
    missing = [column for column in REQUIRED if column not in df.columns]
    if missing:
        raise ValueError(f"缺少字段：{', '.join(missing)}")
    if not set(df["tool"].dropna().unique()).issubset(TOOLS):
        raise ValueError("tool只能为web或ai")
    if df.duplicated(["participant_id", "tool"]).any():
        raise ValueError("每名参与者每种工具只能有一行")

    wide = df.pivot(index="participant_id", columns="tool")
    complete_ids = wide.dropna(subset=[("time_sec", "web"), ("time_sec", "ai")]).index
    paired = df[df["participant_id"].isin(complete_ids)].copy()
    args.output.mkdir(parents=True, exist_ok=True)

    numeric = ["time_sec", "condition_correct", "material_correct", "source_found", "severe_errors", "confidence", "ease", "trust"]
    summary = paired.groupby("tool")[numeric].agg(["count", "mean", "median", "std"])
    summary.to_csv(args.output / "tool_descriptives.csv", encoding="utf-8-sig", float_format="%.2f")

    diffs = pd.DataFrame(index=complete_ids)
    for metric in numeric:
        diffs[metric] = wide.loc[complete_ids, (metric, "ai")] - wide.loc[complete_ids, (metric, "web")]
    diffs.to_csv(args.output / "paired_differences_ai_minus_web.csv", encoding="utf-8-sig", float_format="%.2f")

    sign_rows = []
    for metric in numeric:
        values = diffs[metric].dropna()
        positive = int((values > 0).sum())
        negative = int((values < 0).sum())
        sign_rows.append({
            "metric": metric,
            "paired_n": len(values),
            "positive": positive,
            "negative": negative,
            "ties": int((values == 0).sum()),
            "median_difference_ai_minus_web": values.median(),
            "exact_sign_test_p_excluding_ties": exact_two_sided_sign_p(positive, negative),
        })
    pd.DataFrame(sign_rows).to_csv(args.output / "paired_sign_tests.csv", index=False, encoding="utf-8-sig", float_format="%.3f")

    success = paired.pivot(index="participant_id", columns="tool", values="success").dropna()
    success_table = pd.crosstab(success["web"], success["ai"])
    success_table.to_csv(args.output / "paired_success_crosstab.csv", encoding="utf-8-sig")

    print(f"Paired participants: {len(complete_ids)}")
    print(f"Analysis complete: {args.output.resolve()}")


if __name__ == "__main__":
    main()
