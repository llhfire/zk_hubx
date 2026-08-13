import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type {
  DeliveryLog,
  EmployeeBinding,
  MessageChannel,
  NotificationRule,
  SmsConfig,
  SyncDiff,
  SyncPolicy,
  WeComConfig,
} from './types';
import { getMessageModuleRoute } from './messageRoutes';

const STORAGE_KEY = 'hubx-integration-message-center-v1';

const defaultWeComConfig: WeComConfig = {
  enabled: true,
  mockMode: true,
  corpId: '',
  agentId: '',
  contactSecret: '',
  appSecret: '',
  autoSync: true,
  syncTime: '02:00',
};

const defaultSmsConfig: SmsConfig = {
  enabled: true,
  mockMode: true,
  provider: 'aliyun',
  signName: 'HubX',
  templateCode: 'SMS_DEMO_NOTICE',
  accessKeyConfigured: false,
  escalationHours: 24,
  dailyLimit: 500,
  employeeDailyLimit: 3,
  fallbackOnWeComFailure: true,
};

const defaultRules: NotificationRule[] = [
  { id: 'rule-lead-assigned', name: '线索分配提醒', module: '线索与客户', event: '线索分配/转移', recipients: ['业务负责人', '被指派员工'], channels: ['in_app', 'wecom'], priority: 'medium', enabled: true },
  { id: 'rule-followup-overdue', name: '线索跟进逾期', module: '线索与客户', event: '跟进计划逾期', recipients: ['业务负责人', '直属上级'], channels: ['in_app', 'wecom', 'sms'], priority: 'high', enabled: true, escalationHours: 24 },
  { id: 'rule-tech-evaluation', name: '报价技术评估指派', module: '报价与技术评估', event: '技术评估人被指派', recipients: ['被指派员工'], channels: ['in_app', 'wecom'], priority: 'high', enabled: true },
  { id: 'rule-quotation-approval', name: '报价审批及结果', module: '报价与技术评估', event: '提交/通过/驳回/撤回', recipients: ['当前审批人', '业务发起人'], channels: ['in_app', 'wecom'], priority: 'high', enabled: true, escalationHours: 24 },
  { id: 'rule-contract-approval', name: '合同审批及结果', module: '合同', event: '提交/通过/驳回/撤回', recipients: ['当前审批人', '业务发起人', '业务负责人'], channels: ['in_app', 'wecom'], priority: 'high', enabled: true, escalationHours: 24 },
  { id: 'rule-project-task', name: '项目任务指派与逾期', module: '项目与交付', event: '任务指派/转派/逾期', recipients: ['被指派员工', '项目负责人'], channels: ['in_app', 'wecom'], priority: 'medium', enabled: true },
  { id: 'rule-finance', name: '财务事项待处理', module: '回款、发票和费用', event: '待处理/通过/驳回/逾期', recipients: ['当前审批人', '业务发起人'], channels: ['in_app', 'wecom'], priority: 'high', enabled: true },
  { id: 'rule-report-mention', name: '日报评论与提及', module: '日报与协作', event: '评论/@提及/退回', recipients: ['被提及员工', '日报提交人'], channels: ['in_app', 'wecom'], priority: 'low', enabled: true },
  { id: 'rule-employee-change', name: '员工组织变更', module: '员工与组织', event: '入职/转正/调岗/离职/同步异常', recipients: ['员工本人', '部门负责人', '系统管理员'], channels: ['in_app', 'wecom'], priority: 'medium', enabled: true },
];

const initialLogs: DeliveryLog[] = [
  {
    id: 'delivery-demo-1',
    eventId: 'quotation.tech_evaluation.assigned:quote-20260728',
    title: '报价技术评估待处理',
    content: '您已被指派为「智能客服系统」报价技术评估人，请及时处理。',
    module: '报价与技术评估',
    recipientId: '2',
    recipientName: '李四',
    channel: 'in_app',
    priority: 'high',
    status: 'success',
    createdAt: '2026-07-28 10:30:00',
    route: '/leads/1',
    read: false,
  },
  {
    id: 'delivery-demo-2',
    eventId: 'quotation.tech_evaluation.assigned:quote-20260728',
    title: '报价技术评估待处理',
    content: '您已被指派为「智能客服系统」报价技术评估人，请及时处理。',
    module: '报价与技术评估',
    recipientId: '2',
    recipientName: '李四',
    channel: 'wecom',
    priority: 'high',
    status: 'success',
    createdAt: '2026-07-28 10:30:01',
    route: '/leads/1',
  },
  {
    id: 'delivery-demo-3',
    eventId: 'contract.approval.timeout:contract-001',
    title: '合同审批超时提醒',
    content: '「XX公司软件服务合同」已超过 24 小时未处理。',
    module: '合同',
    recipientId: '15',
    recipientName: '徐强',
    channel: 'sms',
    priority: 'high',
    status: 'skipped',
    reason: '模拟模式：未达到短信升级条件',
    createdAt: '2026-07-28 09:00:00',
    route: '/contracts',
  },
];

const defaultSyncPolicy: SyncPolicy = {
  syncMethods: ['scheduled', 'callback', 'manual'],
  matchOrder: ['wecomUserId', 'phone', 'email'],
  conflictAction: 'manual',
  sameNameAutoMerge: false,
  disabledEmployeeAction: 'mark_resigned',
  preserveHistory: true,
};

interface PersistedState {
  wecomConfig: WeComConfig;
  smsConfig: SmsConfig;
  bindings: EmployeeBinding[];
  rules: NotificationRule[];
  logs: DeliveryLog[];
  syncPolicy: SyncPolicy;
  syncHistory: { id: string; time: string; summary: string; status: string }[];
}

const defaultState: PersistedState = {
  wecomConfig: defaultWeComConfig,
  smsConfig: defaultSmsConfig,
  bindings: [],
  rules: defaultRules,
  logs: initialLogs,
  syncPolicy: defaultSyncPolicy,
  syncHistory: [],
};

function loadState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    return defaultState;
  }
}

interface IntegrationContextValue extends PersistedState {
  syncPreview: SyncDiff[];
  unreadMessages: DeliveryLog[];
  setWeComConfig: (config: WeComConfig) => void;
  setSmsConfig: (config: SmsConfig) => void;
  setSyncPolicy: (policy: SyncPolicy) => void;
  previewSync: () => void;
  applySync: () => void;
  updateRule: (rule: NotificationRule) => void;
  addRule: (rule: NotificationRule) => void;
  simulateRule: (rule: NotificationRule) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteLogs: (ids: string[]) => void;
}

const IntegrationContext = createContext<IntegrationContextValue | null>(null);

export function IntegrationProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<PersistedState>(loadState);
  const [syncPreview, setSyncPreview] = useState<SyncDiff[]>([]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setWeComConfig = useCallback((wecomConfig: WeComConfig) => {
    const safeConfig = {
      ...wecomConfig,
      contactSecret: wecomConfig.contactSecret ? '••••••••' : '',
      appSecret: wecomConfig.appSecret ? '••••••••' : '',
    };
    setState((current) => ({ ...current, wecomConfig: safeConfig }));
  }, []);
  const setSmsConfig = useCallback((smsConfig: SmsConfig) => setState((current) => ({ ...current, smsConfig })), []);
  const setSyncPolicy = useCallback((syncPolicy: SyncPolicy) => setState((current) => ({ ...current, syncPolicy })), []);

  const previewSync = useCallback(() => {
    setSyncPreview([
      { id: 'sync-1', employeeId: '2', name: '李四', phone: '138****8002', department: '技术部', position: '后端开发', wecomUserId: 'lisi', action: 'update', detail: '邮箱、职位将以企业微信资料更新' },
      { id: 'sync-2', name: '陈晨', phone: '139****2026', department: '产品部', position: '产品助理', wecomUserId: 'chenchen', action: 'create', detail: '企业微信新增成员，将创建 HubX 员工' },
      { id: 'sync-3', employeeId: '6', name: '孙八', phone: '138****8006', department: '华东区', position: '销售', wecomUserId: 'sunba', action: 'disable', detail: '企业微信成员已停用，将标记为已离职' },
      { id: 'sync-4', name: '张伟', phone: '138****0011', department: '人事部', position: '人事', wecomUserId: 'zhangwei-02', action: 'conflict', detail: '姓名重复且手机号不一致，需要人工确认绑定' },
    ]);
  }, []);

  const applySync = useCallback(() => {
    if (syncPreview.length === 0) return;
    const time = new Date().toLocaleString('zh-CN', { hour12: false });
    const applied = syncPreview.filter((item) => item.action !== 'conflict');
    setState((current) => {
      const bindings = [...current.bindings];
      applied.forEach((item) => {
        if (!item.employeeId) return;
        const next: EmployeeBinding = {
          employeeId: item.employeeId,
          wecomUserId: item.wecomUserId,
          wecomDepartmentId: item.department,
          source: 'wecom',
          bindingStatus: 'bound',
          syncStatus: 'synced',
          lastSyncedAt: time,
        };
        const index = bindings.findIndex((binding) => binding.employeeId === item.employeeId);
        if (index >= 0) bindings[index] = next;
        else bindings.push(next);
      });
      return {
        ...current,
        bindings,
        syncHistory: [
          { id: `history-${Date.now()}`, time, summary: `新增 1、更新 1、停用 1、冲突 1`, status: '部分成功' },
          ...current.syncHistory,
        ],
      };
    });
    setSyncPreview((items) => items.filter((item) => item.action === 'conflict'));
  }, [syncPreview]);

  const updateRule = useCallback((rule: NotificationRule) => {
    setState((current) => ({ ...current, rules: current.rules.map((item) => item.id === rule.id ? rule : item) }));
  }, []);

  const addRule = useCallback((rule: NotificationRule) => {
    setState((current) => ({ ...current, rules: [rule, ...current.rules] }));
  }, []);

  const simulateRule = useCallback((rule: NotificationRule) => {
    const time = new Date().toLocaleString('zh-CN', { hour12: false });
    const recipientName = rule.recipients[0] || '张三';
    const logs = rule.channels.map((channel: MessageChannel, index) => ({
      id: `delivery-${Date.now()}-${index}`,
      eventId: `${rule.id}:simulation`,
      title: `${rule.name}（模拟）`,
      content: `${rule.event}已触发，接收对象：${rule.recipients.join('、')}`,
      module: rule.module,
      recipientId: 'simulation-user',
      recipientName,
      channel,
      priority: rule.priority,
      status: channel === 'sms' && rule.priority !== 'high' ? 'skipped' as const : 'success' as const,
      reason: channel === 'sms' && rule.priority !== 'high' ? '短信仅用于高优先级或超时升级' : undefined,
      createdAt: time,
      read: false,
      route: getMessageModuleRoute(rule.module),
    }));
    setState((current) => ({ ...current, logs: [...logs, ...current.logs] }));
  }, []);

  const markRead = useCallback((id: string) => {
    setState((current) => ({ ...current, logs: current.logs.map((log) => log.id === id ? { ...log, read: true } : log) }));
  }, []);
  const markAllRead = useCallback(() => {
    setState((current) => ({ ...current, logs: current.logs.map((log) => log.channel === 'in_app' ? { ...log, read: true } : log) }));
  }, []);
  const deleteLogs = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setState((current) => ({ ...current, logs: current.logs.filter((log) => !idSet.has(log.id)) }));
  }, []);

  const unreadMessages = useMemo(
    () => state.logs.filter((log) => log.channel === 'in_app' && log.status === 'success' && !log.read),
    [state.logs],
  );

  const value = useMemo(() => ({
    ...state,
    syncPreview,
    unreadMessages,
    setWeComConfig,
    setSmsConfig,
    setSyncPolicy,
    previewSync,
    applySync,
    updateRule,
    addRule,
    simulateRule,
    markRead,
    markAllRead,
    deleteLogs,
  }), [state, syncPreview, unreadMessages, setWeComConfig, setSmsConfig, setSyncPolicy, previewSync, applySync, updateRule, addRule, simulateRule, markRead, markAllRead, deleteLogs]);

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
}

export function useIntegration() {
  const context = useContext(IntegrationContext);
  if (!context) throw new Error('useIntegration must be used within IntegrationProvider');
  return context;
}
