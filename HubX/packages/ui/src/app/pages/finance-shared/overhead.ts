/**
 * 公摊率接缝 — 精益交付 & 运营费用共用
 *
 * α 占位常量：OVERHEAD_RATE = 35 元/工时
 * 运营费用模块 `hourlyOverheadRate(month)` 落地后，本文件改为转调该公式。
 * 阶段 D 改 `contractCostData.getHourlyOpCost` 时也走此接缝。
 */

export const OVERHEAD_RATE = 35;
