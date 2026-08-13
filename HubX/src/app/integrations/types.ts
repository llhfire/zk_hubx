export type MessageChannel = 'in_app' | 'wecom' | 'sms';
export type MessagePriority = 'high' | 'medium' | 'low';

export interface WeComConfig {
  enabled: boolean;
  mockMode: boolean;
  corpId: string;
  agentId: string;
  contactSecret: string;
  appSecret: string;
  autoSync: boolean;
  syncTime: string;
}

export interface SmsConfig {
  enabled: boolean;
  mockMode: boolean;
  provider: 'aliyun';
  signName: string;
  templateCode: string;
  accessKeyConfigured: boolean;
  escalationHours: number;
  dailyLimit: number;
  employeeDailyLimit: number;
  fallbackOnWeComFailure: boolean;
}

export interface EmployeeBinding {
  employeeId: string;
  wecomUserId?: string;
  wecomDepartmentId?: string;
  source: 'wecom' | 'hubx';
  bindingStatus: 'bound' | 'pending' | 'conflict';
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncedAt?: string;
}

export interface SyncDiff {
  id: string;
  employeeId?: string;
  name: string;
  phone: string;
  department: string;
  position: string;
  wecomUserId: string;
  action: 'create' | 'update' | 'disable' | 'conflict';
  detail: string;
}

export interface SyncPolicy {
  syncMethods: Array<'scheduled' | 'callback' | 'manual'>;
  matchOrder: Array<'wecomUserId' | 'phone' | 'email'>;
  conflictAction: 'manual' | 'skip';
  sameNameAutoMerge: boolean;
  disabledEmployeeAction: 'mark_resigned' | 'mark_disabled';
  preserveHistory: boolean;
}

export interface NotificationRule {
  id: string;
  name: string;
  module: string;
  event: string;
  recipients: string[];
  channels: MessageChannel[];
  priority: MessagePriority;
  enabled: boolean;
  escalationHours?: number;
}

export interface DeliveryLog {
  id: string;
  eventId: string;
  title: string;
  content: string;
  module: string;
  recipientId: string;
  recipientName: string;
  channel: MessageChannel;
  priority: MessagePriority;
  status: 'success' | 'failed' | 'skipped';
  reason?: string;
  createdAt: string;
  read?: boolean;
  route?: string;
}
