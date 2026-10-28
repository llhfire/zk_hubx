import type { Grade, StatusMap, StatusMeta, StatusTone } from '@/design-system';

/** 状态色示例：页面只提供映射表，颜色由 StatusTag 的 tone 决定。 */
export const DEMO_STATUS: StatusMap<'running' | 'done' | 'pending' | 'risk'> = {
  running: { label: '进行中', tone: 'info' },
  done: { label: '已完成', tone: 'success' },
  pending: { label: '待处理', tone: 'warning' },
  risk: { label: '有风险', tone: 'danger' },
};

export const librarySteps = [
  { key: 'intake', title: '需求接入' },
  { key: 'confirm', title: '方案确认' },
  { key: 'execute', title: '执行交付', description: '进行中' },
  { key: 'accept', title: '客户验收' },
  { key: 'close', title: '结项归档' },
];

/** 线索步骤的语义色。步骤多时用同一 tone 系列，不靠颜色区分相邻步骤。 */
export const DEMO_STAGE: Record<string, StatusMeta> = {
  需求调研: { label: '需求调研', tone: 'info' },
  初步沟通: { label: '初步沟通', tone: 'neutral' },
  方案报价: { label: '方案报价', tone: 'purple' },
};

export const matureListRows = [
  { key: 'lead-0826-01', name: '海淀智检中台升级', contact: '秦知遥', stage: '需求调研', level: 'S', priority: '高', nextAt: '08-29 10:30' },
  { key: 'lead-0826-02', name: '松澜供应链移动端', contact: '冯予安', stage: '初步沟通', level: 'A', priority: '中', nextAt: '09-02 14:15' },
  { key: 'lead-0826-03', name: '云栖园区访客系统', contact: '唐屿川', stage: '方案报价', level: 'B', priority: '低', nextAt: '09-05 09:40' },
];

export const ALL_TONES: StatusTone[] = ['neutral', 'info', 'success', 'warning', 'danger', 'purple', 'cyan', 'pink', 'gold'];

export const GRADE_SAMPLES: Array<Grade | undefined> = ['S', 'A', 'B', 'C', undefined];

export const DEMO_FILES = [
  { key: 'f1', name: '合同扫描件-2026-0412.pdf', meta: 'PDF · 2.4MB · 张伟 04-12 上传', onPreview: () => undefined, onDownload: () => undefined, onDelete: () => undefined },
  { key: 'f2', name: '需求确认书-v3.docx', meta: 'DOCX · 386KB · 李娜 04-15 上传', onPreview: () => undefined, onDownload: () => undefined },
  { key: 'f3', name: '验收单.pdf', meta: '已归档，不可删除', onDownload: () => undefined, onDelete: () => undefined, deleteDisabledReason: '已归档文件不可删除' },
];

