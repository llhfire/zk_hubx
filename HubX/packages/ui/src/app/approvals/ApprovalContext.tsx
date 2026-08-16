import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { ApprovalRecord, ApprovalTypeDefinition } from './types';

const STORAGE_KEY = 'hubx-approval-management-v1';

const initialTypes: ApprovalTypeDefinition[] = [
  {
    id: 'type-quotation',
    code: 'QUOTATION',
    name: '报价审批',
    businessModule: '报价管理',
    description: '报价资料提交后的业务审批',
    templateName: '报价默认审批流程',
    enabled: true,
    connected: true,
    usedCount: 8,
    updatedAt: '2026-07-29 09:30',
  },
  {
    id: 'type-contract',
    code: 'CONTRACT',
    name: '合同审批',
    businessModule: '合同管理',
    description: '合同新建、变更和作废统一审批',
    templateName: '合同默认审批流程',
    enabled: true,
    connected: true,
    usedCount: 12,
    updatedAt: '2026-07-29 09:35',
  },
];

const initialRecords: ApprovalRecord[] = [
  {
    id: 'approval-quotation-001',
    approvalNo: 'BJSP-20260729001',
    source: 'hubx',
    typeCode: 'QUOTATION',
    typeName: '报价审批',
    title: '武汉智联数字化平台项目报价',
    applicant: '钱七',
    applicantId: '5',
    businessOwner: '钱七',
    currentApprover: '张三',
    status: 'approving',
    overdue: true,
    amount: 680000,
    createdAt: '2026-07-28 09:20',
    updatedAt: '2026-07-29 09:20',
    route: '/leads/1',
    handledBy: [],
    nodes: [
      { id: 'n1', name: '总经理审批', strategy: '单人审批', approvers: ['张三'], status: 'pending' },
    ],
  },
  {
    id: 'approval-contract-001',
    approvalNo: 'HTSP-20260729001',
    source: 'hubx',
    typeCode: 'CONTRACT',
    typeName: '合同审批',
    title: '中科软通软件服务合同',
    applicant: '张三',
    applicantId: '1',
    businessOwner: '张三',
    currentApprover: '徐强',
    status: 'approving',
    amount: 520000,
    createdAt: '2026-07-29 10:10',
    updatedAt: '2026-07-29 10:10',
    route: '/contracts/6',
    handledBy: [],
    nodes: [
      { id: 'n1', name: '总经理审批', strategy: '单人审批', approvers: ['徐强'], status: 'pending' },
    ],
  },
  {
    id: 'approval-contract-002',
    approvalNo: 'HTSP-20260728003',
    source: 'hubx',
    typeCode: 'CONTRACT',
    typeName: '合同审批',
    title: '武汉软艺合同变更审批',
    applicant: '钱七',
    applicantId: '5',
    businessOwner: '钱七',
    handledBy: ['张三'],
    status: 'approved',
    amount: 360000,
    createdAt: '2026-07-28 11:00',
    updatedAt: '2026-07-28 14:30',
    route: '/contracts/1',
    nodes: [
      { id: 'n1', name: '总经理审批', strategy: '单人审批', approvers: ['张三'], status: 'approved', comment: '同意', operatedAt: '2026-07-28 14:30' },
    ],
  },
  {
    id: 'wecom-leave-001',
    approvalNo: 'QJ-20260729018',
    source: 'wecom',
    typeCode: 'WECOM_LEAVE',
    typeName: '请假',
    title: '李四请假申请',
    applicant: '李四',
    applicantId: '2',
    status: 'approved',
    createdAt: '2026-07-28 16:20',
    updatedAt: '2026-07-29 08:40',
    nodes: [],
  },
  {
    id: 'wecom-trip-001',
    approvalNo: 'CC-20260729005',
    source: 'wecom',
    typeCode: 'WECOM_TRIP',
    typeName: '出差',
    title: '钱七客户现场出差申请',
    applicant: '钱七',
    applicantId: '5',
    status: 'approving',
    createdAt: '2026-07-29 09:10',
    updatedAt: '2026-07-29 09:10',
    nodes: [],
  },
];

interface ApprovalState {
  types: ApprovalTypeDefinition[];
  records: ApprovalRecord[];
}

interface ApprovalContextValue extends ApprovalState {
  saveType: (definition: ApprovalTypeDefinition) => void;
  deleteType: (id: string) => boolean;
  toggleType: (id: string, enabled: boolean) => void;
  decideApproval: (id: string, decision: 'approve' | 'reject', comment: string) => void;
}

const ApprovalContext = createContext<ApprovalContextValue | null>(null);

function loadState(): ApprovalState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { types: initialTypes, records: initialRecords, ...JSON.parse(raw) } : { types: initialTypes, records: initialRecords };
  } catch {
    return { types: initialTypes, records: initialRecords };
  }
}

export function ApprovalProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ApprovalState>(loadState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const saveType = useCallback((definition: ApprovalTypeDefinition) => {
    setState((current) => {
      const exists = current.types.some((item) => item.id === definition.id);
      return {
        ...current,
        types: exists
          ? current.types.map((item) => item.id === definition.id ? definition : item)
          : [definition, ...current.types],
      };
    });
  }, []);

  const deleteType = useCallback((id: string) => {
    const target = state.types.find((item) => item.id === id);
    if (!target || target.usedCount > 0) return false;
    setState((current) => ({ ...current, types: current.types.filter((item) => item.id !== id) }));
    return true;
  }, [state.types]);

  const toggleType = useCallback((id: string, enabled: boolean) => {
    setState((current) => ({
      ...current,
      types: current.types.map((item) => item.id === id ? { ...item, enabled, updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }) } : item),
    }));
  }, []);

  const decideApproval = useCallback((id: string, decision: 'approve' | 'reject', comment: string) => {
    const operatedAt = new Date().toLocaleString('zh-CN', { hour12: false });
    setState((current) => ({
      ...current,
      records: current.records.map((record) => {
        if (record.id !== id || record.source !== 'hubx' || record.status !== 'approving') return record;
        return {
          ...record,
          status: decision === 'approve' ? 'approved' : 'rejected',
          overdue: false,
          currentApprover: undefined,
          handledBy: [...(record.handledBy ?? []), '张三'],
          updatedAt: operatedAt,
          nodes: record.nodes.map((node) => node.status === 'pending'
            ? { ...node, status: decision === 'approve' ? 'approved' : 'rejected', comment: comment || '同意', operatedAt }
            : node),
        };
      }),
    }));
  }, []);

  const value = useMemo(() => ({ ...state, saveType, deleteType, toggleType, decideApproval }), [state, saveType, deleteType, toggleType, decideApproval]);
  return <ApprovalContext.Provider value={value}>{children}</ApprovalContext.Provider>;
}

export function useApprovals() {
  const context = useContext(ApprovalContext);
  if (!context) throw new Error('useApprovals must be used within ApprovalProvider');
  return context;
}

