# 数据分析

## 原则

- 所有脚本只读取`05_匿名化数据`中的副本，不直接修改原始数据。
- 正式运行必须显式指定`--data-status real`。
- 烟雾测试使用内存模拟数据，并在输出中标注`SYNTHETIC`。
- 质量标记不自动等于删除；剔除决定及理由必须记录。
- 便利样本只作探索性结论。

## 问卷分析

```powershell
python analyze_questionnaire.py --input ..\05_匿名化数据\questionnaire.csv --output output --data-status real
```

烟雾测试：

```powershell
python analyze_questionnaire.py --output smoke_output --smoke-test --data-status synthetic
```

## 可用性测试分析

待真实测试表结构确认后使用`analyze_usability.py`。输入每行代表一个参与者的一种工具结果，至少包含：

`participant_id, tool, task, time_sec, success, condition_correct, material_correct, source_found, severe_errors, confidence, ease, trust`
