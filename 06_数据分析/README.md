# 数据分析

## 原则

- 所有脚本只读取`05_匿名化数据`中的副本，不直接修改原始数据。
- 正式运行必须显式指定`--data-status real`。
- 烟雾测试使用内存模拟数据，并在输出中标注`SYNTHETIC`。
- 质量标记不自动等于删除；剔除决定及理由必须记录。
- 便利样本只作探索性结论。

## 真实调研公开汇总

`outputs/真实调研_20260828_公开汇总/`收录问卷、访谈、场景观察和任务测试的匿名聚合结果、统计摘要与图表。公开目录不包含逐人记录、联系方式、原始文本或其他可识别信息。

## 问卷分析

```powershell
python analyze_questionnaire.py --input ..\05_匿名化数据\questionnaire.csv --output output --data-status real
```

烟雾测试：

```powershell
python analyze_questionnaire.py --output smoke_output --smoke-test --data-status synthetic
```

## 可用性测试分析

可使用`analyze_usability.py`分析配对任务测试数据。输入每行代表一个参与者使用一种工具完成一项任务的结果，至少包含：

`participant_id, tool, task, time_sec, success, condition_correct, material_correct, source_found, severe_errors, confidence, ease, trust`
