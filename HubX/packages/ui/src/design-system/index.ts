/**
 * ZK HubX 设计系统 —— 唯一导出入口。
 *
 * 规则见 docs/design-system/设计系统规范.md：
 * 页面只能从这里引用 UI 组件，不得直接引用分类子目录，也不得再引用已取消的
 * `app/components/ui`。
 */

/* ---------- primitives ---------- */
export { MoneyText, type MoneyTextProps, type MoneyVariant, type MoneyTone } from './primitives/MoneyText';
export { StatusTag, resolveStatus, STATUS_TONE_VARS, type StatusTagProps, type StatusMeta, type StatusMap, type StatusTone } from './primitives/StatusTag';
export { GradeTag, type GradeTagProps, type Grade } from './primitives/GradeTag';
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

/* ---------- feedback ---------- */
export { confirmAction, ConfirmModal, type ConfirmActionOptions, type ConfirmModalProps } from './feedback/ConfirmModal';
export { AlertBanner, type AlertBannerProps, type AlertTone } from './feedback/AlertBanner';
export { AsyncState, type AsyncStateProps, type AsyncStatus } from './feedback/AsyncState';

/* ---------- business ---------- */
export { ProcessOverview, type ProcessOverviewStep } from './business/ProcessOverview';
export { ProcessRecordCard, type ProcessRecordCardProps } from './business/ProcessRecordCard';
export { DocumentViewerModal, type DocumentViewerModalProps } from './business/DocumentViewerModal';
