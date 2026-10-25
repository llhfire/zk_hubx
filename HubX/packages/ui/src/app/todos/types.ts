export type TodoSource =
  | 'approval'
  | 'technical_evaluation'
  | 'lead_followup'
  | 'daily_report'
  | 'project_task'
  | 'wecom_approval'
  | 'customer_communication'
  | 'quotation'
  | 'smart_meeting'
  | 'sales_opportunity';

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'canceled';
export type TodoPriority = 'high' | 'medium' | 'low';

export interface TodoItem {
  id: string;
  source: TodoSource;
  sourceId: string;
  module: string;
  title: string;
  content: string;
  assigneeId: string;
  assigneeName: string;
  status: TodoStatus;
  priority: TodoPriority;
  createdAt: string;
  /** 最近一次字段同步时间（智能会议纪要回写时写入） */
  updatedAt?: string;
  deadline?: string;
  completedAt?: string;
  canceledAt?: string;
  snoozedUntil?: string;
  route: string;
  external?: boolean;
}
