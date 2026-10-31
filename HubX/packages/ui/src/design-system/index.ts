/**
 * ZK HubX 设计系统 —— 唯一导出入口。
 *
 * 规则见 docs/design-system/设计系统规范.md：
 * 页面只能从这里引用 UI 组件，不得直接引用分类子目录，也不得再引用已取消的
 * `app/components/ui`。
 */

/* ---------- foundation controls ---------- */
export * from './foundation/controls';
export * from './foundation/icons';

/* ---------- primitives ---------- */
export { MoneyText, type MoneyTextProps, type MoneyVariant, type MoneyTone } from './primitives/MoneyText';
export { StatusTag, resolveStatus, STATUS_TONE_VARS, type StatusTagProps, type StatusMeta, type StatusMap, type StatusTone } from './primitives/StatusTag';
export { GradeTag, GRADE_TONE, type GradeTagProps, type Grade } from './primitives/GradeTag';
export { DateText, type DateTextProps, type DateInput } from './primitives/DateText';
export { CountdownTag, type CountdownTagProps } from './primitives/CountdownTag';
export { IdentifierText, type IdentifierTextProps } from './primitives/IdentifierText';
export { EntityLink, type EntityLinkProps } from './primitives/EntityLink';
export { FollowUpIcon, type FollowUpIconProps } from './primitives/icons/FollowUpIcon';
export { TrashLeadIcon, type TrashLeadIconProps } from './primitives/icons/TrashLeadIcon';
export { WeChatIcon, type WeChatIconProps } from './primitives/icons/WeChatIcon';

/* ---------- layout ---------- */
export { PageShell } from './layout/PageShell';
export { PageHeader } from './layout/PageHeader';
export { PageBreadcrumb, type PageBreadcrumbItem } from './layout/PageBreadcrumb';
export { SectionCard, type SectionCardProps } from './layout/SectionCard';
export { SectionTabs, type SectionTabItem, type SectionTabsProps } from './layout/SectionTabs';
export { DetailHeader, type DetailHeaderProps } from './layout/DetailHeader';
export { SplitLayout, SplitLayoutMain, SplitLayoutAside } from './layout/SplitLayout';

/* ---------- data-display ---------- */
export { DataTable, type DataTableProps } from './data-display/DataTable';
export { MetricGrid, type MetricItem, type MetricTone } from './data-display/MetricGrid';
export { MetricCard, type MetricCardProps, type MetricCardTone } from './data-display/MetricCard';
export { DescriptionsCard, type DescriptionItem, type DescriptionsCardProps } from './data-display/DescriptionsCard';
export { EmptyState, type EmptyStateProps } from './data-display/EmptyState';
export { ProgressBar, type ProgressBarProps, type ProgressTone } from './data-display/ProgressBar';
export { FileList, type FileListItem, type FileListProps } from './data-display/FileList';

/* ---------- forms ---------- */
export { FilterBar } from './forms/FilterBar';
export { FormSection, type FormSectionProps } from './forms/FormSection';
export { FormGrid, type FormGridProps } from './forms/FormGrid';
export { UploadPanel, type UploadPanelProps } from './forms/UploadPanel';
export { RichTextEditor, type RichTextEditorHandle, type RichTextEditorProps } from './forms/RichTextEditor';
export { OrderedStatePicker, type OrderedStateOption, type OrderedStatePickerProps } from './forms/OrderedStatePicker';
export { UserPicker, type UserPickerOption, type UserPickerProps } from './forms/UserPicker';

/* ---------- feedback ---------- */
export { confirmAction, ConfirmModal, type ConfirmActionOptions, type ConfirmModalProps } from './feedback/ConfirmModal';
export { AlertBanner, type AlertBannerProps, type AlertTone } from './feedback/AlertBanner';
export { AsyncState, type AsyncStateProps, type AsyncStatus } from './feedback/AsyncState';

/* ---------- charts ---------- */
export { Chart } from './charts';
export type { ChartTone, PieLabelRenderProps } from './charts';

/* ---------- business ---------- */
export { ProcessOverview, type ProcessOverviewStep } from './business/ProcessOverview';
export { ProcessStepper, type ProcessStepperProps, type ProcessStepperNode, type ProcessStepperStatus } from './business/ProcessStepper';
export { ProcessRecordCard, type ProcessRecordCardProps } from './business/ProcessRecordCard';
export { ProcessPanelSection, type ProcessPanelSectionProps } from './business/ProcessPanelSection';
export { DocumentViewerModal, type DocumentViewerModalProps } from './business/DocumentViewerModal';
export { ApprovalFlow, type ApprovalFlowProps, type ApprovalFlowNode, type ApprovalNodeStatus } from './business/ApprovalFlow';
export { FeatureWorkloadMatrix, type FeatureWorkloadMatrixProps, type FeatureWorkloadMatrixRole, type FeatureWorkloadMatrixEndpoint, type FeatureWorkloadMatrixModule, type FeatureWorkloadMatrixUnit } from './business/FeatureWorkloadMatrix';
export { RiskRadarGrid, type RiskRadarGridProps, type RiskRadarItem, type RiskRadarTone } from './business/RiskRadarGrid';
export { RoleRateGrid, type RoleRateGridProps, type RoleRateGridItem } from './business/RoleRateGrid';
export { EvaluationWorkloadTable, type EvaluationWorkloadTableProps, type EvaluationWorkloadTableRole, type EvaluationWorkloadTableRow } from './business/EvaluationWorkloadTable';
export { WorkloadNumericInput, type WorkloadNumericInputProps, type WorkloadNumericInputFillRef } from './business/WorkloadNumericInput';
export { DormitoryRoomBoard, type DormitoryRoomBoardProps, type DormitoryRoomBoardBed, type DormitoryRoomBoardFloor, type DormitoryRoomBoardRoom, type DormitoryRoomStatusFilter } from './business/DormitoryRoomBoard';
export { PaymentProgress, type PaymentProgressProps } from './business/PaymentProgress';
export { PaymentAmountSummary, type PaymentAmountSummaryProps } from './business/PaymentAmountSummary';
export { PaymentScheduleRail, type PaymentScheduleItem, type PaymentScheduleRailProps, type PaymentScheduleStatus } from './business/PaymentScheduleRail';
export { PaymentPlanTable, type PaymentPlanTableProps, type PaymentPlanTableRow } from './business/PaymentPlanTable';
export { FileArchivePanel, type FileArchiveEntry, type FileArchivePanelProps } from './business/FileArchivePanel';
export { DocumentActionRow, type DocumentActionRowProps, type DocumentActionRowVariant } from './business/DocumentActionRow';
