from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd


DIFFICULTY_COLUMNS = [f"Q6{letter}" for letter in "abcdefgh"]
AWARENESS_COLUMNS = [
    "aware_youth_station",
    "aware_baozu",
    "aware_rent_filing",
    "aware_registration",
    "aware_permit",
    "aware_employment",
    "aware_social_security",
]
CORE_COLUMNS = ["response_id", "S0", "S1", "S2", "S3", "S4", "S5", "Q2", "Q3", "Q14", "Q15"]
SUSPICIOUS_PII_COLUMNS = {"name", "姓名", "phone", "手机号", "身份证号", "id_card", "精确住址", "address"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="青享沪上问卷质量检查与描述分析")
    parser.add_argument("--input", type=Path, help="匿名化问卷CSV")
    parser.add_argument("--output", type=Path, required=True, help="输出目录")
    parser.add_argument("--data-status", choices=["real", "synthetic"], required=True)
    parser.add_argument("--smoke-test", action="store_true", help="使用内存模拟数据验证管线")
    return parser.parse_args()


def read_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"找不到输入文件：{path}")
    for encoding in ("utf-8-sig", "utf-8", "gb18030"):
        try:
            return pd.read_csv(path, encoding=encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("无法识别CSV编码，请导出为UTF-8 CSV")


def smoke_dataframe() -> pd.DataFrame:
    rows = []
    for index in range(1, 13):
        row = {
            "response_id": f"SYN{index:03d}",
            "duration_sec": 260 + index * 7,
            "S0": 1,
            "S1": 1 + index % 4,
            "S2": 1 + index % 5,
            "S3": 1,
            "S4": 1 + index % 6,
            "S5": 1 + index % 6,
            "Q2": 1 + index % 7,
            "Q3": 1 if index % 3 else 0,
            "Q4": 1 + index % 7 if index % 3 else np.nan,
            "Q5": "1;2;7" if index % 3 else np.nan,
            "Q7": 1 + index % 5 if index % 3 else np.nan,
            "Q8": "1;2" if index % 3 else np.nan,
            "Q9": 1 + index % 5 if index % 3 else np.nan,
            "Q10": "找不到官方入口;不知道自己是否符合条件",
            "Q11": "提供官方入口;生成材料清单",
            "Q12": "官方来源;明确更新时间",
            "Q13": "政策过期;错误判断资格",
            "Q14": 1 + index % 5,
            "Q15": index % 2,
            "Q16": "SYNTHETIC ONLY",
        }
        for offset, column in enumerate(AWARENESS_COLUMNS):
            row[column] = (index + offset) % 5
        for offset, column in enumerate(DIFFICULTY_COLUMNS):
            row[column] = 1 + (index + offset) % 5 if index % 3 else np.nan
        rows.append(row)
    return pd.DataFrame(rows)


def require_columns(df: pd.DataFrame, columns: Iterable[str]) -> None:
    missing = [column for column in columns if column not in df.columns]
    if missing:
        raise ValueError(f"缺少必需字段：{', '.join(missing)}")


def reject_pii_columns(df: pd.DataFrame) -> None:
    found = sorted(set(df.columns) & SUSPICIOUS_PII_COLUMNS)
    if found:
        raise ValueError(f"输入疑似包含直接个人标识字段，请先匿名化：{', '.join(found)}")


def add_quality_flags(df: pd.DataFrame) -> pd.DataFrame:
    output = df.copy()
    flags: list[list[str]] = [[] for _ in range(len(output))]

    duplicate_mask = output["response_id"].duplicated(keep=False)
    for idx in np.flatnonzero(duplicate_mask.to_numpy()):
        flags[idx].append("duplicate_response_id")

    if "duration_sec" in output.columns:
        duration = pd.to_numeric(output["duration_sec"], errors="coerce")
        for idx in np.flatnonzero((duration < 120).fillna(False).to_numpy()):
            flags[idx].append("very_short_duration_review")

    missing_core = output[CORE_COLUMNS].isna().any(axis=1)
    for idx in np.flatnonzero(missing_core.to_numpy()):
        flags[idx].append("missing_core_field")

    inconsistent_skip = (pd.to_numeric(output["Q3"], errors="coerce") == 0) & output.get("Q4", pd.Series(index=output.index)).notna()
    for idx in np.flatnonzero(inconsistent_skip.fillna(False).to_numpy()):
        flags[idx].append("skip_logic_inconsistent")

    output["quality_flags"] = [";".join(row) for row in flags]
    numeric_difficulty = output.reindex(columns=DIFFICULTY_COLUMNS).apply(pd.to_numeric, errors="coerce")
    valid_counts = numeric_difficulty.notna().sum(axis=1)
    output["difficulty_mean"] = numeric_difficulty.mean(axis=1).where(valid_counts >= 4)
    return output


def frequency_table(series: pd.Series, variable: str) -> pd.DataFrame:
    counts = series.fillna("MISSING").astype(str).value_counts(dropna=False).rename("n").to_frame()
    counts["percent"] = counts["n"] / counts["n"].sum() * 100
    counts.insert(0, "variable", variable)
    counts.insert(1, "value", counts.index)
    return counts.reset_index(drop=True)


def multiselect_table(series: pd.Series, variable: str) -> pd.DataFrame:
    values = []
    for item in series.dropna().astype(str):
        values.extend(part.strip() for part in item.replace("；", ";").split(";") if part.strip())
    if not values:
        return pd.DataFrame(columns=["variable", "option", "n", "percent_of_respondents"])
    counts = pd.Series(values).value_counts().rename("n").to_frame()
    counts["percent_of_respondents"] = counts["n"] / max(series.notna().sum(), 1) * 100
    counts.insert(0, "variable", variable)
    counts.insert(1, "option", counts.index)
    return counts.reset_index(drop=True)


def analyze(df: pd.DataFrame, output_dir: Path, status: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    checked = add_quality_flags(df)
    consented = checked[pd.to_numeric(checked["S0"], errors="coerce") == 1].copy()
    core = consented[pd.to_numeric(consented["S3"], errors="coerce") == 1].copy()

    profile = pd.concat([frequency_table(core[column], column) for column in ["S1", "S2", "S4", "S5", "Q2", "Q3", "Q14"]])
    awareness = pd.concat([frequency_table(core[column], column) for column in AWARENESS_COLUMNS])

    difficulty_rows = []
    for column in DIFFICULTY_COLUMNS:
        values = pd.to_numeric(core[column], errors="coerce")
        difficulty_rows.append({
            "item": column,
            "valid_n": int(values.notna().sum()),
            "mean": values.mean(),
            "median": values.median(),
            "share_4_or_5": (values >= 4).mean() * 100,
        })

    multi = pd.concat([multiselect_table(core[column], column) for column in ["Q5", "Q8", "Q10", "Q11", "Q12", "Q13"]])
    quality_counts = checked["quality_flags"].replace("", "none").value_counts().to_dict()

    checked.to_csv(output_dir / "quality_checked_rows.csv", index=False, encoding="utf-8-sig")
    profile.to_csv(output_dir / "sample_profile.csv", index=False, encoding="utf-8-sig", float_format="%.1f")
    awareness.to_csv(output_dir / "service_awareness.csv", index=False, encoding="utf-8-sig", float_format="%.1f")
    pd.DataFrame(difficulty_rows).to_csv(output_dir / "difficulty_items.csv", index=False, encoding="utf-8-sig", float_format="%.1f")
    multi.to_csv(output_dir / "multiselect_summary.csv", index=False, encoding="utf-8-sig", float_format="%.1f")

    report = {
        "data_status": status,
        "input_rows": len(df),
        "consented_rows": len(consented),
        "core_coming_to_shanghai_rows": len(core),
        "quality_flag_combinations": quality_counts,
        "warning": "SYNTHETIC DATA - NOT FOR RESEARCH CONCLUSIONS" if status == "synthetic" else None,
    }
    (output_dir / "quality_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    title = "# 问卷分析摘要（模拟数据烟雾测试）" if status == "synthetic" else "# 问卷分析摘要"
    lines = [
        title,
        "",
        f"- 数据状态：`{status.upper()}`",
        f"- 输入答卷：{len(df)}",
        f"- 同意参与：{len(consented)}",
        f"- 核心来沪青年样本：{len(core)}",
        f"- 存在任一质量标记：{int((checked['quality_flags'] != '').sum())}",
        "",
    ]
    if status == "synthetic":
        lines.extend(["> 警告：本结果仅用于验证代码，不得进入报告、图表或参赛材料。", ""])
    lines.extend([
        "## 下一步人工复核",
        "",
        "- 检查质量标记，不得仅凭答题时长自动删除。",
        "- 核对跳题、样本招募渠道和便利抽样偏差。",
        "- 确认量表分布后再计算维度得分。",
        "- 所有百分比和正文数字在报告中统一保留1位小数。",
    ])
    (output_dir / "analysis_summary.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    args = parse_args()
    if args.smoke_test and args.data_status != "synthetic":
        raise ValueError("烟雾测试必须指定 --data-status synthetic")
    if not args.smoke_test and args.data_status == "synthetic":
        raise ValueError("外部模拟数据尚未开放，请使用 --smoke-test")
    if not args.smoke_test and not args.input:
        raise ValueError("正式分析必须提供 --input")

    df = smoke_dataframe() if args.smoke_test else read_csv(args.input)
    reject_pii_columns(df)
    require_columns(df, CORE_COLUMNS + DIFFICULTY_COLUMNS + AWARENESS_COLUMNS)
    analyze(df, args.output, args.data_status)
    print(f"Analysis complete: {args.output.resolve()}")


if __name__ == "__main__":
    main()
