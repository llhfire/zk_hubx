import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { TodoItem } from './types';
import { useApprovals } from '../approvals/ApprovalContext';

const STORAGE_KEY = 'hubx-todo-center-v1';

const initialTodos: TodoItem[] = [
  {
    id: 'todo-quotation-approval',
    source: 'approval',
    sourceId: 'approval-quotation-001',
    module: '报价审批',
    title: '武汉智联数字化平台项目报价待审批',
    content: '报价金额 ¥680,000，发起人：钱七。',
    assigneeId: '1',
    assigneeName: '张三',
    status: 'pending',
    priority: 'high',
    createdAt: '2026-07-28 09:20',
    deadline: '2026-07-29 09:20',
    route: '/approvals',
  },
  {
    id: 'todo-tech-evaluation',
    source: 'technical_evaluation',
    sourceId: 'quote-tech-001',
    module: '技术评估',
    title: '智能客服系统报价技术评估',
    content: '请完成技术方案评估并上传技术评估文件。',
    assigneeId: '1',
    assigneeName: '张三',
    status: 'in_progress',
    priority: 'high',
    createdAt: '2026-07-29 08:30',
    deadline: '2026-07-29 18:00',
    route: '/leads/1',
  },
  {
    id: 'todo-lead-followup',
    source: 'lead_followup',
    sourceId: 'lead-3',
    module: '线索跟进',
    title: 'ABC贸易公司跟进即将到期',
    content: '计划跟进客户报价反馈和决策时间。',
    assigneeId: '1',
    assigneeName: '张三',
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-07-29 09:00',
    deadline: '2026-07-29 15:00',
    route: '/leads/3',
  },
  {
    id: 'todo-daily-report',
    source: 'daily_report',
    sourceId: 'daily-report-20260729',
    module: '日报',
    title: '提交今日日报',
    content: '请在下班前提交 2026-07-29 工作日报。',
    assigneeId: '1',
    assigneeName: '张三',
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-07-29 09:00',
    deadline: '2026-07-29 18:30',
    route: '/dailyreport/list',
  },
  {
    id: 'todo-project-task',
    source: 'project_task',
    sourceId: 'project-task-001',
    module: '项目任务',
    title: '配送机器人现场需求整理',
    content: '整理现场问题及厂商对接事项。',
    assigneeId: '1',
    assigneeName: '张三',
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-07-29 09:30',
    deadline: '2026-07-30 12:00',
    route: '/projects/1',
  },
  {
    id: 'todo-wecom-approval',
    source: 'wecom_approval',
    sourceId: 'wecom-trip-001',
    module: '企业微信审批',
    title: '钱七客户现场出差申请待审批',
    content: '该事项需前往企业微信审批，HubX 仅同步展示。',
    assigneeId: '1',
    assigneeName: '张三',
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-07-29 09:10',
    deadline: '2026-07-30 09:10',
    route: '/approvals',
    external: true,
  },
  {
    id: 'todo-completed-demo',
    source: 'approval',
    sourceId: 'approval-contract-002',
    module: '合同审批',
    title: '武汉软艺合同变更审批',
    content: '合同审批已处理完成。',
    assigneeId: '1',
    assigneeName: '张三',
    status: 'completed',
    priority: 'high',
    createdAt: '2026-07-28 11:00',
    completedAt: '2026-07-28 14:30',
    route: '/contracts/1',
  },
];

interface TodoContextValue {
  todos: TodoItem[];
  activeTodos: TodoItem[];
  activeCount: number;
  createTodo: (todo: TodoItem) => void;
  snoozeTodo: (id: string, until: string) => void;
  openTodo: (id: string) => void;
}

const TodoContext = createContext<TodoContextValue | null>(null);

function loadTodos(): TodoItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : initialTodos;
  } catch {
    return initialTodos;
  }
}

export function TodoProvider({ children }: PropsWithChildren) {
  const { records: approvalRecords } = useApprovals();
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    setTodos((current) => current.map((item) => {
      if (item.source !== 'approval') return item;
      const approval = approvalRecords.find((record) => record.id === item.sourceId);
      if (!approval) return item;
      if (approval.status === 'approved' || approval.status === 'rejected') {
        return item.status === 'completed' ? item : {
          ...item,
          status: 'completed',
          completedAt: approval.updatedAt,
          snoozedUntil: undefined,
        };
      }
      if (approval.status === 'withdrawn' || approval.status === 'invalidated') {
        return item.status === 'canceled' ? item : {
          ...item,
          status: 'canceled',
          canceledAt: approval.updatedAt,
          snoozedUntil: undefined,
        };
      }
      return item;
    }));
  }, [approvalRecords]);

  const snoozeTodo = useCallback((id: string, until: string) => {
    setTodos((current) => current.map((item) => item.id === id ? { ...item, snoozedUntil: until } : item));
  }, []);

  const createTodo = useCallback((todo: TodoItem) => {
    setTodos((current) => [todo, ...current]);
  }, []);

  const openTodo = useCallback((id: string) => {
    setTodos((current) => current.map((item) => item.id === id && item.status === 'pending'
      ? { ...item, status: 'in_progress' }
      : item));
  }, []);

  const activeTodos = useMemo(
    () => todos.filter((item) => item.status === 'pending' || item.status === 'in_progress'),
    [todos],
  );

  const value = useMemo(() => ({
    todos,
    activeTodos,
    activeCount: activeTodos.length,
    createTodo,
    snoozeTodo,
    openTodo,
  }), [activeTodos, createTodo, openTodo, snoozeTodo, todos]);

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

export function useTodos() {
  const context = useContext(TodoContext);
  if (!context) throw new Error('useTodos must be used within TodoProvider');
  return context;
}
