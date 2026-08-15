export type TodoSource =
  | 'approval'
  | 'technical_evaluation'
  | 'lead_followup'
  | 'daily_report'
  | 'project_task'
  | 'wecom_approval'
  | 'customer_communication'
  | 'quotation';

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
  deadline?: string;
  completedAt?: string;
  canceledAt?: string;
  snoozedUntil?: string;
  route: string;
  external?: boolean;
}
