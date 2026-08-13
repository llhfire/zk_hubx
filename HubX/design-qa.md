# 成本核算概览设计验收

## 验收范围

- 实现页面：`src/app/pages/project-management/ProjectCostPanel.tsx`
- 样式文件：`src/styles/globals.css`
- 参考图 1：`/var/folders/qr/b71lb3y55jx2gr26ttbr4z540000gn/T/codex-clipboard-a4a5eb45-fa20-472a-a149-09b5ab7d06fb.png`
- 参考图 2：`/var/folders/qr/b71lb3y55jx2gr26ttbr4z540000gn/T/codex-clipboard-53ee140a-5dc4-4b1b-b998-aef89ff42087.png`

## 验收环境

- 页面：`http://localhost:5175/project-cost-accounting`
- 视口：1440 × 1100
- 状态：成本核算独立页，默认“概览”Tab

## 视觉对比证据

- 最终顶部截图：`cost-overview-final-top.png`
- 最终下部截图：`cost-overview-final-lower.png`
- 顶部参考对比：`cost-overview-qa-top.png`
- 下部参考对比：`cost-overview-qa-lower.png`

## 验收结论

- 顶部合同金额、预计总成本、实际消耗、项目利润已统一为强化指标卡布局。
- 概览已移除成本分类看板，保留成本构成与费用明细排行。
- 已增加成本构成环形图、中心总额及可点击图例。
- 已增加费用明细排行、金额比例条及分类跳转。
- 已补充差旅、商务、推广、综合成本的完整二级分类示例数据；综合成本覆盖房租、设备、管理、人资、财务、服务器、云服务、Token 与第三方软件。
- 人工成本页已补充正常工时、加班工时、工资、补贴四类成本项说明，金额仍按日报工时和员工薪资动态计算。
- 人工成本页已改为“费用项”筛选：全部、正常工资、加班工资、补贴，并展示费用项、金额、经办人、费用事由、发生日期、单据类型、操作。
- 人工成本页已增加“新增费用”弹窗；正常工资使用工资表单据，示例覆盖 06 月、07 月工资，加班工资与补贴均已补充示例记录。
- 点击成本分类卡片可切换到对应成本 Tab。
- 浏览器控制台无错误。
- `vite build` 通过，`git diff --check` 通过。

## 对比历史

1. 初版完成指标卡、分类卡、成本构成和费用排行。
2. 宽屏与窄内容区检查后改为自适应网格，避免卡片溢出。
3. 对照参考图调整分类顺序为人工、推广、差旅、商务、综合。
4. 最终复查交互、控制台和构建结果。

final result: passed

---

# 项目基础信息线索摘要模块验收（2026-08-07）

## 验收范围

- 实现页面：`src/app/pages/project-management/ProjectDetailWorkspace.tsx`
- 参考图：`/var/folders/qr/b71lb3y55jx2gr26ttbr4z540000gn/T/codex-clipboard-48ab6466-2cf9-48ce-b67b-327bd47b4182.png`
- 验收页面：`http://localhost:5175/projects/1`

## 视觉与数据对比

- 线索摘要已放在“基础信息”Tab 最上方，项目信息紧随其后。
- 保留参考图的两列布局，“初始信息及需求”独占整行。
- 字段覆盖线索来源、客资成本、客户称呼、联系电话/微信、创建人、优化师、归属人、协助人、初始需求、创建时间和下次跟进时间。
- 所有内容来自项目关联的线索详情 profile，缺失值统一显示“-”。
- 联系电话和微信相同时去重，不重复显示。
- 实际页面截图与参考图对比后，布局层级、字段顺序和内容密度一致。
- 浏览器控制台无错误；`vite build` 和 `git diff --check` 通过。

final result: passed
