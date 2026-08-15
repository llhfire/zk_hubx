# 报价系统三个工作台流程重构计划

## 背景

当前工作台三（Stage3）中包含了前端配置、后端配置、基础岗位配置等步骤，这些数据应该在更早的阶段（工作台一、工作台二）就确定。需要重新梳理三个工作台的职责边界。

## 决策记录

| 决策项 | 结论 | 原因 |
|--------|------|------|
| 前端平台选型 | 工作台一（功能清单） | 平台选型是产品需求，不是商务配置 |
| 后端服务配置 | 工作台一（功能清单） | 同上 |
| 基础岗位配置 | 工作台二（技术评估） | 岗位需求由技术负责人根据项目复杂度确定 |
| 销售增项岗位 | 工作台三（报价配置） | 销售额外需要的人力是商务配置 |
| 报价汇总+付款方式 | 工作台三（报价配置） | 完整配置+提交审批 |
| 端与平台关系 | 一个端可选多个平台 | 如"用户端"可同时选微信小程序+H5+PC Web |
| 端列展示方式 | 合并单元格（rowspan）+ 平台用Tag竖排 | 节省宽度，视觉分组清晰 |

## 三个工作台职责

### 工作台一（产品经理 · 功能清单）

**现有功能（保持）：**
- 一级模块 + 二级子功能的 CRUD
- 功能描述与交互规则
- 评估截止时间设置

**新增功能：**
- 在一级模块之前增加**"端"列**
  - 端名称（如"用户端"、"管理后台"）
  - 每个端可配置多个适配平台（多选）
  - 平台选项：微信小程序、支付宝小程序、抖音小程序、iOS APP、Android APP、鸿蒙 APP、H5移动端、PC Web端、桌面应用、iPad端、Android平板端
- 端列在表格中用 rowspan 合并展示，同端的模块只显示一次端名称
- 平台用 Tag 组件竖排显示，每个平台一行

**数据结构变更：**
```typescript
// 新增：端配置
interface EndpointConfig {
  id: string;
  name: string;           // 端名称（如"用户端"）
  platforms: string[];    // 适配平台ID列表
}

// FeatureModule 新增字段
interface FeatureModule {
  id: string;
  name: string;
  sort: number;
  subFeatures: FeatureSubFeature[];
  endpointId: string;     // 关联的端ID
}
```

### 工作台二（技术负责人 · 人天评估）

**现有功能（保持）：**
- 动态岗位列管理（预设岗位 + 自定义岗位）
- 逐项工时录入
- 切片重组（打包/合并/拆分 + 寄存值机制）
- 手动核定工期 + 技术方案备注
- WASD导航 + 方向键+Tab填值

**新增显示：**
- 评估表格增加"端"列（在模块列之前）
  - 端列用 rowspan 合并同端的行
  - 端名称粗体，平台用 Tag 竖排显示
  - 只读展示，不可在此编辑

**移除：** 无（保持现有功能）

### 工作台三（销售 · 报价配置）

**精简为以下步骤：**

1. **技术评估摘要**（只读）
   - 展示工作台二的评估结果（岗位、人天、技术方案）
   - 展示技术人力成本

2. **销售增项岗位**
   - 添加/删除增项岗位
   - 配置：岗位名称、人数、天数、日均单价、增项事由
   - 自动计算小计

3. **出差与驻场配置**
   - 出差：开启/关闭、地点、人数、天数、交通费、住宿费、补贴
   - 驻场：开启/关闭、地点、人数、天数、服务费
   - 自动计算小计

4. **其他成本配置**
   - 添加/删除费用项（名称、金额、备注）
   - 预设快捷添加项

5. **报价汇总**
   - 自动计算：技术人力 + 销售增项 + 差旅 + 驻场 + 其他 = 总报价
   - 可视化占比分布

6. **付款方式配置**
   - 标准模板选择（50-40-10 / 30-40-20-10 / 全额预付）
   - 手动调整每阶段比例
   - 校验：比例合计 = 100%

7. **提交审批**
   - 硬校验：人天一致性、成本一致性、付款比例、金额>0
   - 进入三人会签流程

**移除：**
- Step2 前端配置（已移至工作台一）
- Step3 后端配置（已移至工作台一）
- Step4 基础岗位配置（已在工作台二）

## 数据流

```
工作台一（功能清单）
  输入: featureList（初始/草稿）
  新增: endpointConfigs（端+平台配置）
  编辑: 模块名/子功能名/描述/备注/端关联
  输出: featureList + endpointConfigs
  副作用: 初始化 evalSheet
  状态: draft → feature_confirmed

工作台二（技术评估）
  继承: featureList（只读，用于切片重组）
        endpointConfigs（只读，显示端列）
        evalSheet（初始逐项SINGLE）
  编辑: 岗位列/逐项工时/切片重组/核定工期/技术方案
  输出: evalSheet（完整评估表）
  状态: feature_confirmed → eval_completed

工作台三（报价配置）
  继承: evalSheet（只读展示）
  新增: salesAddedRoles + travelOnsite + otherCosts + summary
  输出: 完整报价单 → 提交审批
  状态: eval_completed → auditing
```

## 实施步骤

### Phase 1：工作台一增加端列 ✅ 已完成
1. ✅ 修改 `FeatureModule` 类型，增加 `endpointId` 字段
2. ✅ 新增 `EndpointConfig` 类型和 `PLATFORM_OPTIONS` 常量
3. ✅ 修改 `Stage1FeatureList.tsx`：
   - 顶部端配置区域（端名称编辑 + 平台多选 + 删除端）
   - 表格使用原生 HTML table + rowspan 实现端列合并
   - 端列底部"添加平台"Popover
   - 模块名称可编辑
   - "新增端"按钮在清单末尾新增端+空模块
   - "新增一级模块"改为下拉菜单选择端
   - "新增子功能"改为级联菜单（端→模块）
   - 浮动栏显示"端数 模块数 功能数"
4. ✅ 更新 `Quote` 类型，增加 `endpointConfigs` 字段
5. ✅ 更新 `defaultFeatures.ts`，为默认模块分配端
6. ✅ 更新 `mockData.ts`，清理旧字段，添加端配置
7. ✅ 更新 `LeadDetail.tsx`，创建模块时添加 `endpointId`

### Phase 2：工作台二增加端列显示 ✅ 已完成
1. ✅ 修改 `Stage2EvalSheet.tsx`：评估表格增加端列（只读显示）

### Phase 3：工作台三精简 ✅ 已完成
1. ✅ `Stage3WebAutomation.tsx` 已是简化版
2. ✅ 移除 `Stage3QuoteWizard` 引用

### Phase 4：测试与验证
1. 更新 `quoteFlow.test.ts` 中的相关测试
2. 验证端到端流程：功能清单 → 技术评估 → 报价配置 → 提交审批
3. 验证数据在三个工作台间的正确流转

## 影响范围

- `types.ts`：新增 EndpointConfig，修改 FeatureModule、Quote
- `Stage1FeatureList.tsx`：增加端配置区域和端列
- `Stage2EvalSheet.tsx`：增加端列显示
- `Stage3WebAutomation.tsx` / `Stage3QuoteWizard.tsx`：精简步骤
- `defaultFeatures.ts`：更新默认数据
- `quoteFlow.ts`：可能需要调整初始化逻辑
- `QuotationContext.tsx`：可能需要调整 createQuote 逻辑
