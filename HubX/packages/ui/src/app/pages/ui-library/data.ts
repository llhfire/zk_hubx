export interface FoundationRow {
  key: string;
  category: string;
  components: string;
  rule: string;
}

export const foundationRows = [
  { key: 'action', category: '操作', components: 'Button、Dropdown、Tooltip', rule: '从设计系统选择；主操作每个操作区最多一个。' },
  { key: 'input', category: '录入', components: 'Input、Select、DatePicker、Form', rule: '优先使用设计系统组件；受控值与筛选条件保持清晰。' },
  { key: 'display', category: '展示', components: 'SectionCard、DataTable、DescriptionsCard、SectionTabs', rule: '容器、表格、字段区、页签一律走设计系统。' },
  { key: 'status', category: '状态', components: 'Tag → StatusTag、Badge、Progress → ProgressBar、Alert → AlertBanner', rule: '状态色只由 StatusTag 的 tone 表达，页面只提供 StatusMap；不只依赖颜色传递状态。' },
  { key: 'feedback', category: '反馈', components: 'Message、Notification、Modal、Drawer、confirmAction', rule: '短反馈用 Message；复杂任务用 Drawer；二次确认走 confirmAction。' },
];

export interface ModuleRow {
  key: string;
  category: string;
  component: string;
  purpose: string;
  source: string;
}

export const moduleRows = [
  { key: 'money', category: '原子', component: 'MoneyText', purpose: '金额展示唯一入口：格式、空值、万单位、数字字体', source: 'design-system/primitives/MoneyText.tsx' },
  { key: 'status', category: '原子', component: 'StatusTag', purpose: '状态/类别的唯一出口：9 个 tone，业务域只提供 StatusMap；可点击、可关闭', source: 'design-system/primitives/StatusTag.tsx' },
  { key: 'grade', category: '原子', component: 'GradeTag', purpose: 'S/A/B/C 只显示字母，未定显示 ?', source: 'design-system/primitives/GradeTag.tsx' },
  { key: 'date', category: '原子', component: 'DateText', purpose: '日期与区间，单行不折行', source: 'design-system/primitives/DateText.tsx' },
  { key: 'countdown', category: '原子', component: 'CountdownTag', purpose: '余 X 天 / 逾期 X 天，不塞日期', source: 'design-system/primitives/CountdownTag.tsx' },
  { key: 'identifier', category: '原子', component: 'IdentifierText', purpose: '编号/账号单行省略 + 悬停完整值', source: 'design-system/primitives/IdentifierText.tsx' },
  { key: 'entity-link', category: '原子', component: 'EntityLink', purpose: '关联对象名称跳转，按稳定 ID', source: 'design-system/primitives/EntityLink.tsx' },
  { key: 'icons', category: '原子', component: 'FollowUpIcon / TrashLeadIcon / WeChatIcon', purpose: '跟进、回收站、企业微信图标', source: 'design-system/primitives/icons/' },
  { key: 'resolve-status', category: '原子', component: 'resolveStatus', purpose: '从 StatusMap 取值，缺映射时回退「未定义」中性灰', source: 'design-system/primitives/StatusTag.tsx' },
  { key: 'tone-vars', category: '原子', component: 'STATUS_TONE_VARS', purpose: '状态色但不是标签时（进度条、强调条、金额）取 fg/bg/border', source: 'design-system/primitives/StatusTag.tsx' },
  { key: 'grade-tone', category: '原子', component: 'GRADE_TONE', purpose: '等级 → tone 的映射（S 是 success，不是 danger）', source: 'design-system/primitives/GradeTag.tsx' },
  { key: 'shell', category: '骨架', component: 'PageShell', purpose: '统一面包屑、页面纵向节奏和内容起点（本页即由它包裹）', source: 'design-system/layout/PageShell.tsx' },
  { key: 'header', category: '骨架', component: 'PageHeader', purpose: '普通列表、配置和看板页头', source: 'design-system/layout/PageHeader.tsx' },
  { key: 'breadcrumb', category: '骨架', component: 'PageBreadcrumb', purpose: '二级及以上页面层级导航', source: 'design-system/layout/PageBreadcrumb.tsx' },
  { key: 'section', category: '骨架', component: 'SectionCard', purpose: '区块卡片，主操作固定在标题行右侧；替代全部 Arco Card', source: 'design-system/layout/SectionCard.tsx' },
  { key: 'section-tabs', category: '骨架', component: 'SectionTabs', purpose: '分区页签：统一激活态、数量表达和页签内容承载', source: 'design-system/layout/SectionTabs.tsx' },
  { key: 'detail-header', category: '骨架', component: 'DetailHeader', purpose: '详情页头：返回、标题、状态、单号、步骤、操作', source: 'design-system/layout/DetailHeader.tsx' },
  { key: 'workspace', category: '骨架', component: 'SplitLayout / SplitLayoutMain / SplitLayoutAside', purpose: '长流程详情的 70:30 主辅工作区', source: 'design-system/layout/SplitLayout.tsx' },
  { key: 'table', category: '展示', component: 'DataTable', purpose: '表格唯一入口：rowKey、空态、工具栏、加载', source: 'design-system/data-display/DataTable.tsx' },
  { key: 'metrics', category: '展示', component: 'MetricGrid', purpose: '一排摘要指标', source: 'design-system/data-display/MetricGrid.tsx' },
  { key: 'metric-card', category: '展示', component: 'MetricCard', purpose: '两行指标卡：标签一行 + 值一行', source: 'design-system/data-display/MetricCard.tsx' },
  { key: 'descriptions', category: '展示', component: 'DescriptionsCard', purpose: '字段区，长字段自动整行', source: 'design-system/data-display/DescriptionsCard.tsx' },
  { key: 'empty', category: '展示', component: 'EmptyState', purpose: '空态：说明 + 引导操作', source: 'design-system/data-display/EmptyState.tsx' },
  { key: 'progress', category: '展示', component: 'ProgressBar', purpose: '比例进度，去掉装饰性圆环', source: 'design-system/data-display/ProgressBar.tsx' },
  { key: 'file-list', category: '展示', component: 'FileList', purpose: '文件行：身份在左、元数据在下、图标操作在右', source: 'design-system/data-display/FileList.tsx' },
  { key: 'filter', category: '录入', component: 'FilterBar', purpose: '搜索、筛选与批量动作排列', source: 'design-system/forms/FilterBar.tsx' },
  { key: 'form-grid', category: '录入', component: 'FormGrid', purpose: '字段网格，替代手写 Row/Col', source: 'design-system/forms/FormGrid.tsx' },
  { key: 'form-section', category: '录入', component: 'FormSection', purpose: '字段分组标题与内容', source: 'design-system/forms/FormSection.tsx' },
  { key: 'upload', category: '录入', component: 'UploadPanel', purpose: '拖拽上传区：边框、点击面积、拖入反馈', source: 'design-system/forms/UploadPanel.tsx' },
  { key: 'rich-text', category: '录入', component: 'RichTextEditor', purpose: '富文本编辑器', source: 'design-system/forms/RichTextEditor.tsx' },
  { key: 'ordered-state-picker', category: '录入', component: 'OrderedStatePicker', purpose: '按固定顺序选择状态/等级，空值统一为 undefined', source: 'design-system/forms/OrderedStatePicker.tsx' },
  { key: 'user-picker', category: '录入', component: 'UserPicker', purpose: '按姓名、工号或部门搜索系统用户，值始终为稳定 ID', source: 'design-system/forms/UserPicker.tsx' },
  { key: 'confirm', category: '反馈', component: 'confirmAction / ConfirmModal', purpose: '二次确认，危险操作使用危险语义色', source: 'design-system/feedback/ConfirmModal.tsx' },
  { key: 'alert', category: '反馈', component: 'AlertBanner', purpose: '可临时关闭的提醒，关闭不等于已处理；替代全部 Arco Alert', source: 'design-system/feedback/AlertBanner.tsx' },
  { key: 'async', category: '反馈', component: 'AsyncState', purpose: '加载 / 失败 / 无权限三态', source: 'design-system/feedback/AsyncState.tsx' },
  { key: 'overview', category: '业务', component: 'ProcessOverview', purpose: '长周期业务对象的身份、操作与流程', source: 'design-system/business/ProcessOverview.tsx' },
  { key: 'process-stepper', category: '业务', component: 'ProcessStepper', purpose: '指挥栏横向流程条：节点、状态、快捷详情', source: 'design-system/business/ProcessStepper.tsx' },
  { key: 'process-panel-section', category: '业务', component: 'ProcessPanelSection', purpose: '业务过程侧栏页签的动作栏与内容间距', source: 'design-system/business/ProcessPanelSection.tsx' },
  { key: 'record-card', category: '业务', component: 'ProcessRecordCard', purpose: '业务过程区的报价、合同、资料、出差等记录摘要', source: 'design-system/business/ProcessRecordCard.tsx' },
  { key: 'document-viewer', category: '业务', component: 'DocumentViewerModal', purpose: '全屏文件阅读器，单页/双页切换', source: 'design-system/business/DocumentViewerModal.tsx' },
  { key: 'approval-flow', category: '业务', component: 'ApprovalFlow', purpose: '审批流：节点、审批人、时间、意见；同一「已驳回」全站同色', source: 'design-system/business/ApprovalFlow.tsx' },
  { key: 'feature-workload-matrix', category: '业务', component: 'FeatureWorkloadMatrix', purpose: '报价研发工时矩阵：端、模块、子功能、岗位工时与合计', source: 'design-system/business/FeatureWorkloadMatrix.tsx' },
  { key: 'risk-radar-grid', category: '业务', component: 'RiskRadarGrid', purpose: '风控体检指标：结果、风险边界与解释文本', source: 'design-system/business/RiskRadarGrid.tsx' },
  { key: 'role-rate-grid', category: '业务', component: 'RoleRateGrid', purpose: '岗位人天、日均成本和岗位小计的统一编辑网格', source: 'design-system/business/RoleRateGrid.tsx' },
  { key: 'evaluation-workload-table', category: '业务', component: 'EvaluationWorkloadTable', purpose: '在线人天评估表：端分组、岗位列操作、选择、备注与操作', source: 'design-system/business/EvaluationWorkloadTable.tsx' },
  { key: 'workload-numeric-input', category: '业务', component: 'WorkloadNumericInput', purpose: '评估表数字输入：光标步进、WASD/方向键漫游与错误态', source: 'design-system/business/WorkloadNumericInput.tsx' },
  { key: 'dormitory-room-board', category: '业务', component: 'DormitoryRoomBoard', purpose: '宿舍楼层、房间、床位房态矩阵与入住/退宿动作', source: 'design-system/business/DormitoryRoomBoard.tsx' },
  { key: 'payment-progress', category: '业务', component: 'PaymentProgress', purpose: '回款进度：已回款、合同总额、待回款与比例的统一摘要', source: 'design-system/business/PaymentProgress.tsx' },
  { key: 'payment-amount-summary', category: '业务', component: 'PaymentAmountSummary', purpose: '金额列紧凑摘要：合同总额与待收金额', source: 'design-system/business/PaymentAmountSummary.tsx' },
  { key: 'payment-schedule-rail', category: '业务', component: 'PaymentScheduleRail', purpose: '回款期次：按比例显示每期已收、待收与逾期状态', source: 'design-system/business/PaymentScheduleRail.tsx' },
  { key: 'payment-plan-table', category: '业务', component: 'PaymentPlanTable', purpose: '合同回款计划的统一列骨架，按受限开关显示比例、触发条件和回款状态', source: 'design-system/business/PaymentPlanTable.tsx' },
  { key: 'file-archive-panel', category: '业务', component: 'FileArchivePanel', purpose: '归档批次、文件列表和预览/下载/删除动作的统一结构', source: 'design-system/business/FileArchivePanel.tsx' },
  { key: 'document-action-row', category: '业务', component: 'DocumentActionRow', purpose: '主文档身份、版本元数据与在线查看/下载等主要动作', source: 'design-system/business/DocumentActionRow.tsx' },
];
