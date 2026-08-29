/**
 * 智能会议工作台
 *
 * 设计规约见 smart-meetings-ui-design.md §4：
 * - 路由守卫：loading → 404 → 权限 → 正常渲染
 * - 状态驱动按钮组
 * - 嵌入所有面板
 *
 * 路由：/smart-meetings/new（新建）和 /smart-meetings/:id（查看/编辑）
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button, Card, Descriptions, Message, Result, Space, Spin, Tabs, Tag, Typography } from '@arco-design/web-react';
import { IconSave, IconSend, IconDelete, IconCheck, IconUndo, IconArchive, IconCopy, IconBrush } from '@arco-design/web-react/icon';
import {
  PageShell,
  ProcessMetricGrid,
  ProcessOverview,
  ProcessWorkspace,
  ProcessWorkspaceAside,
  ProcessWorkspaceMain,
} from '@/app/components/ui';
import { useSmartMeeting } from './SmartMeetingContext';
import { viewMinute, type ViewerContext } from './accessControl';
import { buildVersion } from './versioning';
import { diffActionItemsToTodo, isActionItemSyncable } from './actionItemSync';
import { useTodos } from '../../todos/TodoContext';
import type { SmartMinute, MinuteAction, BusinessRef, ActionItem, MinuteSourceText } from './types';
import { MOCK_USERS } from './mockData';

import { SourcePanel } from './panels/SourcePanel';
import { MetaPanel } from './panels/MetaPanel';
import { DecisionsPanel } from './panels/DecisionsPanel';
import { ContentPanel } from './panels/ContentPanel';
import { ActionItemsPanel } from './panels/ActionItemsPanel';
import { VersionDrawer } from './panels/VersionDrawer';
import { ConfirmFlowModals } from './panels/ConfirmFlowModals';
import './smartMeetingWorkbench.css';

const { Text } = Typography;
const { TabPane } = Tabs;

/** 默认查看者（α 模拟登录） */
const VIEWER: ViewerContext = {
  userId: 'user_zhang',
  isAdmin: true,
  canViewBiz: () => true,
};

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending_review: '待确认',
  confirmed: '已确认',
  archived: '已归档',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'gray',
  pending_review: 'orange',
  confirmed: 'blue',
  archived: 'default',
};

const PROCESS_STEPS = [
  { key: 'draft', title: '整理草稿', description: '沉淀来源与正文' },
  { key: 'pending_review', title: '待确认', description: '确认人审核' },
  { key: 'confirmed', title: '已确认', description: '同步行动项' },
  { key: 'archived', title: '已归档', description: '留存版本' },
];

const STATUS_STEP: Record<string, number> = {
  draft: 0,
  pending_review: 1,
  confirmed: 2,
  archived: 3,
};

const STATUS_TASK: Record<string, string> = {
  draft: '补齐会议来源、元信息、核心决议、正文和行动项，完成后提交确认。',
  pending_review: '确认人核对纪要内容与行动项；可确认或填写意见后驳回。',
  confirmed: '纪要已生效，行动项已进入同步链；需要修改时先撤回。',
  archived: '纪要已归档并保持只读，可继续查看正文和版本历史。',
};

const WORKSPACE_LABEL: Record<string, string> = {
  prepare: '会议整理',
  content: '纪要内容',
  actions: '行动事项',
};

function userName(userId: string): string {
  return MOCK_USERS.find((user) => user.id === userId)?.name || userId || '-';
}

function formatMeetingTime(value: string): string {
  if (!value) return '待填写';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

export function SmartMeetingWorkbench() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getById, createMinute, updateMinute, deleteDraft, loading } = useSmartMeeting();
  const { todos, createTodo, updateTodo, cancelTodo } = useTodos();

  const isNew = !id || id === 'new';
  const minute = id ? getById(id) : undefined;

  // 本地编辑状态
  const [title, setTitle] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [organizerId, setOrganizerId] = useState(VIEWER.userId);
  const [reviewerId, setReviewerId] = useState('');
  const [refs, setRefs] = useState<BusinessRef[]>([]);
  const [coreDecisions, setCoreDecisions] = useState<string[]>([]);
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [source, setSource] = useState<MinuteSourceText | null>(null);
  const [polishPreview, setPolishPreview] = useState<string | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState('prepare');

  // UI 状态
  const [versionDrawerVisible, setVersionDrawerVisible] = useState(false);
  const [submitVisible, setSubmitVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [rejectVisible, setRejectVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [archiveVisible, setArchiveVisible] = useState(false);

  // 从已有纪要初始化
  useEffect(() => {
    if (minute && !isNew) {
      setTitle(minute.title);
      setMeetingTime(minute.meetingTime);
      setAttendeeIds([...minute.attendeeIds]);
      setOrganizerId(minute.organizerId);
      setReviewerId(minute.reviewerId);
      setRefs([...minute.refs]);
      setCoreDecisions([...minute.coreDecisions]);
      setContentMarkdown(minute.contentMarkdown);
      setActionItems([...minute.actionItems]);
      setSource(minute.source);
      setPolishPreview(minute.polishPreview);
    }
  }, [minute, isNew]);

  // 权限计算
  const currentMinute: SmartMinute | null = minute ?? (isNew ? {
    id: 'new', title, meetingTime, organizerId, reviewerId, attendeeIds,
    status: 'draft' as const, refs, coreDecisions, contentMarkdown, actionItems,
    source, versions: [], adminSource: null, polishPreview,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  } : null);

  const minuteView = currentMinute ? viewMinute(currentMinute, VIEWER) : null;
  const isReadonly = !minuteView?.canEdit;
  const status = currentMinute?.status ?? 'draft';

  // 可用动作
  const availableActions: MinuteAction[] = minuteView?.canTransitionTo ?? [];
  const canDo = (action: MinuteAction) => availableActions.includes(action);

  // 保存
  const handleSave = useCallback(async () => {
    if (isNew) {
      const created = await createMinute({
        title, meetingTime, organizerId, reviewerId, attendeeIds,
      });
      const updated = await updateMinute(created.id, (m) => ({
        ...m, refs, coreDecisions, contentMarkdown, actionItems, source,
      }));
      Message.success('纪要已创建');
      navigate(`/smart-meetings/${created.id}`, { replace: true });
      return updated;
    } else if (id) {
      const updated = await updateMinute(id, (m) => ({
        ...m, title, meetingTime, organizerId, reviewerId, attendeeIds,
        refs, coreDecisions, contentMarkdown, actionItems, source, polishPreview,
      }));
      Message.success('已保存');
      return updated;
    }
    return null;
  }, [isNew, id, title, meetingTime, organizerId, reviewerId, attendeeIds, refs, coreDecisions, contentMarkdown, actionItems, source, polishPreview, createMinute, updateMinute, navigate]);

  // 状态迁移
  const doTransition = useCallback(async (action: MinuteAction, extra?: Partial<SmartMinute>, targetId = id) => {
    if (!targetId) return;
    const now = new Date().toISOString();
    await updateMinute(targetId, (m) => {
      let next = { ...m, ...extra, updatedAt: now };
      switch (action) {
        case 'submit':
          next.status = 'pending_review';
          break;
        case 'confirm':
          next.status = 'confirmed';
          next = { ...next, versions: [...next.versions, buildVersion(next, 'confirm', now)] };
          break;
        case 'reject':
          break;
        case 'withdraw':
          next.status = 'draft';
          next = { ...next, versions: [...next.versions, buildVersion(next, 'withdraw_edit', now)] };
          break;
        case 'archive':
          next.status = 'archived';
          break;
        case 'delete':
          break;
      }
      return next;
    });
  }, [id, updateMinute]);

  // 提交
  const handleSubmit = useCallback(async () => {
    const errors: string[] = [];
    if (!title.trim()) errors.push('请填写会议主题');
    if (!meetingTime) errors.push('请选择会议时间');
    if (!reviewerId) errors.push('请选择确认人');
    if (errors.length > 0) { Message.warning(errors[0]); return; }

    const saved = await handleSave();
    if (!saved) return;
    await doTransition('submit', undefined, saved.id);
    Message.success('已提交确认');
    setSubmitVisible(false);
  }, [title, meetingTime, reviewerId, handleSave, doTransition]);

  // 确认（含 TODO 同步）
  const handleConfirm = useCallback(async () => {
    if (!id) return;
    await handleSave();

    // TODO 同步：稳定 actionItemId 保证重复确认不重复创建。
    const nextMinute: SmartMinute = {
      ...(minute ?? currentMinute!),
      actionItems,
      title,
      meetingTime,
      refs,
      contentMarkdown,
      coreDecisions,
    };
    const todoOps = diffActionItemsToTodo(
      nextMinute,
      todos,
      () => `todo-smart-meeting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      new Date().toISOString(),
    );
    for (const op of todoOps) {
      if (op.op === 'create') {
        createTodo(op.item);
      } else if (op.op === 'update') {
        updateTodo(op.id, op.patch);
      } else {
        cancelTodo(op.id);
      }
    }

    await doTransition('confirm');
    Message.success('已确认');
    setConfirmVisible(false);
  }, [id, handleSave, minute, currentMinute, actionItems, title, meetingTime, refs, contentMarkdown, coreDecisions, todos, doTransition, createTodo, updateTodo, cancelTodo]);

  // 驳回
  const handleReject = useCallback(async (reason: string) => {
    await doTransition('reject', { updatedAt: new Date().toISOString() });
    Message.info('已驳回');
    setRejectVisible(false);
  }, [doTransition]);

  // 撤回
  const handleWithdraw = useCallback(async () => {
    await handleSave();
    await doTransition('withdraw');
    Message.success('已撤回为草稿');
    setWithdrawVisible(false);
  }, [handleSave, doTransition]);

  // 归档
  const handleArchive = useCallback(async () => {
    await doTransition('archive');
    Message.success('已归档');
    setArchiveVisible(false);
  }, [doTransition]);

  // 删除
  const handleDelete = useCallback(async () => {
    if (!id) return;
    await deleteDraft(id);
    Message.success('已删除');
    navigate('/smart-meetings', { replace: true });
  }, [id, deleteDraft, navigate]);

  // AI 润色（α 模拟）
  const handlePolish = useCallback(() => {
    const preview = `（AI 润色预览）\n\n${contentMarkdown}\n\n---\n以上内容经 AI 润色优化，核心含义不变。`;
    setPolishPreview(preview);
  }, [contentMarkdown]);

  const handlePolishAccept = useCallback(() => {
    if (polishPreview) {
      setContentMarkdown(polishPreview.replace(/\n\n---\n以上内容经 AI 润色优化.*$/, ''));
      setPolishPreview(null);
      Message.success('已采用 AI 润色');
    }
  }, [polishPreview]);

  const handlePolishDiscard = useCallback(() => {
    setPolishPreview(null);
  }, []);

  // 复制 Markdown
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(contentMarkdown).then(() => {
      Message.success('已复制到剪贴板');
    });
  }, [contentMarkdown]);

  if (!isNew && loading) {
    return (
      <PageShell breadcrumbs={[{ label: '智能会议' }, { label: '纪要列表', to: '/smart-meetings' }, { label: '加载中' }]}>
        <Card className="smart-meeting-workbench__state"><Spin size={40} /></Card>
      </PageShell>
    );
  }

  if (!isNew && !minute) {
    return (
      <PageShell breadcrumbs={[{ label: '智能会议' }, { label: '纪要列表', to: '/smart-meetings' }, { label: '未找到' }]}>
        <Card className="smart-meeting-workbench__state">
          <Result
            status="404"
            title="纪要不存在"
            subTitle="该会议纪要不存在或已被删除。"
            extra={<Button type="primary" onClick={() => navigate('/smart-meetings')}>返回纪要列表</Button>}
          />
        </Card>
      </PageShell>
    );
  }

  if (minuteView && !minuteView.visible) {
    return (
      <PageShell breadcrumbs={[{ label: '智能会议' }, { label: '纪要列表', to: '/smart-meetings' }, { label: '无权查看' }]}>
        <Card className="smart-meeting-workbench__state">
          <Result status="403" title="无权查看此纪要" subTitle="请联系会议整理人或管理员获取权限。" />
        </Card>
      </PageShell>
    );
  }

  const activeMinute = currentMinute!;
  const openActionCount = actionItems.filter((item) => item.status === 'pending').length;
  const syncReadyCount = actionItems.filter(isActionItemSyncable).length;
  const completedActionCount = actionItems.filter((item) => item.status === 'completed').length;
  const sourceStatus = source
    ? source.parseStatus === 'parsed' ? '已解析' : source.parseStatus === 'partial' ? '部分解析' : '已导入'
    : '未导入';
  const checklist = [
    { label: '会议主题', done: Boolean(title.trim()) },
    { label: '会议时间', done: Boolean(meetingTime) },
    { label: '确认人', done: Boolean(reviewerId) },
    { label: '纪要正文', done: Boolean(contentMarkdown.trim()) },
    { label: '行动项可同步', done: actionItems.length === 0 || syncReadyCount === actionItems.length },
  ];

  return (
    <PageShell
      className="smart-meeting-workbench"
      breadcrumbs={[
        { label: '智能会议' },
        { label: '纪要列表', to: '/smart-meetings' },
        { label: isNew ? '新建纪要' : title || activeMinute.id },
      ]}
    >
      <ProcessOverview
        identifier={isNew ? 'NEW' : activeMinute.id}
        title={isNew ? '新建会议纪要' : title || '未命名纪要'}
        tags={(
          <>
            <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>
            {activeMinute.adminSource && <Tag color="cyan">来自行政会议</Tag>}
            <Tag color={isReadonly ? 'gray' : 'green'}>{isReadonly ? '只读' : '可编辑'}</Tag>
          </>
        )}
        actions={(
          <>
            {!isNew && <Button size="small" onClick={() => setVersionDrawerVisible(true)}>版本历史 ({activeMinute.versions.length})</Button>}
            {(status === 'confirmed' || status === 'archived') && <Button size="small" icon={<IconCopy />} onClick={handleCopy}>复制</Button>}
            {!isReadonly && status === 'draft' && <Button size="small" icon={<IconBrush />} onClick={handlePolish}>AI 润色</Button>}
            {!isReadonly && <Button size="small" type="secondary" icon={<IconSave />} onClick={handleSave}>保存</Button>}
            {canDo('withdraw') && <Button size="small" icon={<IconUndo />} onClick={() => setWithdrawVisible(true)}>撤回修改</Button>}
            {canDo('archive') && <Button size="small" icon={<IconArchive />} onClick={() => setArchiveVisible(true)}>归档</Button>}
            {canDo('reject') && <Button size="small" status="danger" onClick={() => setRejectVisible(true)}>驳回</Button>}
            {canDo('submit') && <Button size="small" type="primary" icon={<IconSend />} onClick={() => setSubmitVisible(true)}>提交确认</Button>}
            {canDo('confirm') && <Button size="small" type="primary" icon={<IconCheck />} onClick={() => setConfirmVisible(true)}>确认</Button>}
            {!isNew && canDo('delete') && <Button size="small" type="text" status="danger" icon={<IconDelete />} onClick={handleDelete}>删除</Button>}
          </>
        )}
        steps={PROCESS_STEPS}
        currentStep={STATUS_STEP[status] ?? 0}
      />

      <ProcessMetricGrid
        items={[
          { key: 'time', label: '会议时间', value: formatMeetingTime(meetingTime) },
          { key: 'attendees', label: '参会人数', value: `${attendeeIds.length} 人`, detail: attendeeIds.map(userName).join('、') || '待添加' },
          { key: 'decisions', label: '核心决议', value: `${coreDecisions.length} 项`, tone: coreDecisions.length > 0 ? 'success' : 'neutral' },
          { key: 'actions', label: '行动事项', value: `${openActionCount} 待办`, detail: `${syncReadyCount} 项同步就绪`, tone: openActionCount > 0 ? 'warning' : 'neutral' },
          { key: 'refs', label: '业务关联', value: `${refs.length} 项`, detail: refs.map((ref) => ref.displaySnapshot).join('、') || '未关联' },
          { key: 'versions', label: '版本留痕', value: `${activeMinute.versions.length} 版`, detail: `文本源${sourceStatus}` },
        ]}
      />

      {activeMinute.adminSource?.sourceStatus === 'cancelled' && (
        <div className="smart-meeting-workbench__source-alert smart-meeting-workbench__source-alert--warning">来源行政会议已取消，纪要继续保留。</div>
      )}
      {activeMinute.adminSource?.sourceStatus === 'deleted' && (
        <div className="smart-meeting-workbench__source-alert smart-meeting-workbench__source-alert--danger">来源行政会议已删除，纪要继续保留。</div>
      )}

      <ProcessWorkspace>
        <ProcessWorkspaceMain>
          <Card className="smart-meeting-workbench__tabs-card">
            <Tabs activeTab={activeWorkspace} onChange={setActiveWorkspace}>
              <TabPane key="prepare" title="会议整理">
                <div className="smart-meeting-workbench__tab-panel smart-meeting-workbench__main-stack">
                  <SourcePanel source={source} canSee={minuteView?.canSeeSourceText ?? true} readonly={isReadonly} onImport={setSource} />
                  <MetaPanel
                    title={title} meetingTime={meetingTime} attendeeIds={attendeeIds}
                    organizerId={organizerId} reviewerId={reviewerId} refs={refs}
                    readonly={isReadonly}
                    onTitleChange={setTitle} onTimeChange={setMeetingTime}
                    onAttendeesChange={setAttendeeIds} onOrganizerChange={setOrganizerId}
                    onReviewerChange={setReviewerId} onRefsChange={setRefs}
                  />
                </div>
              </TabPane>
              <TabPane key="content" title="纪要内容">
                <div className="smart-meeting-workbench__tab-panel smart-meeting-workbench__main-stack">
                  <DecisionsPanel decisions={coreDecisions} readonly={isReadonly} onChange={setCoreDecisions} />
                  <ContentPanel
                    contentMarkdown={contentMarkdown} polishPreview={polishPreview}
                    readonly={isReadonly}
                    onContentChange={setContentMarkdown} onPolishRequest={handlePolish}
                    onPolishAccept={handlePolishAccept} onPolishDiscard={handlePolishDiscard}
                  />
                </div>
              </TabPane>
              <TabPane key="actions" title={`行动事项 (${actionItems.length})`}>
                <div className="smart-meeting-workbench__tab-panel smart-meeting-workbench__main-stack">
                  <ActionItemsPanel
                    actionItems={actionItems}
                    readonly={isReadonly}
                    confirmedReadonly={status === 'confirmed' || status === 'archived'}
                    onChange={setActionItems}
                  />
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </ProcessWorkspaceMain>

        <ProcessWorkspaceAside>
          <Card title="当前处理" size="small">
            <Space direction="vertical" size={12} className="smart-meeting-workbench__aside-stack">
              <div>
                <Text type="secondary">当前阶段</Text>
                <div className="smart-meeting-workbench__aside-value"><Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag></div>
              </div>
              <Text>{STATUS_TASK[status]}</Text>
              <div>
                <Text type="secondary">当前工作区</Text>
                <div className="smart-meeting-workbench__aside-value">{WORKSPACE_LABEL[activeWorkspace]}</div>
              </div>
              <div>
                <Text type="secondary">编辑权限</Text>
                <div className="smart-meeting-workbench__aside-value">{isReadonly ? '当前为只读状态' : '可继续编辑并保存'}</div>
              </div>
            </Space>
          </Card>

          <Card title="会议角色" size="small">
            <Descriptions column={1} data={[
              { label: '整理人', value: userName(organizerId) },
              { label: '确认人', value: reviewerId ? userName(reviewerId) : '待选择' },
              { label: '参会人', value: attendeeIds.map(userName).join('、') || '待添加' },
              { label: '会议时间', value: formatMeetingTime(meetingTime) },
            ]} />
          </Card>

          <Card title="业务关联" size="small">
            {refs.length > 0 ? (
              <div className="smart-meeting-workbench__tag-list">
                {refs.map((ref) => <Tag key={`${ref.kind}-${ref.id}`} color="arcoblue">{ref.displaySnapshot}</Tag>)}
              </div>
            ) : <Text type="secondary">暂未关联线索、合同、项目或业务单。</Text>}
          </Card>

          <Card title="提交检查" size="small">
            <div className="smart-meeting-workbench__checklist">
              {checklist.map((item) => (
                <div key={item.label} className="smart-meeting-workbench__check-row">
                  <Text>{item.label}</Text>
                  <Tag color={item.done ? 'green' : 'orange'}>{item.done ? '已完成' : '待补充'}</Tag>
                </div>
              ))}
            </div>
          </Card>

          <Card title="行动项摘要" size="small">
            <Descriptions column={1} data={[
              { label: '行动项总数', value: `${actionItems.length} 项` },
              { label: '待完成', value: `${openActionCount} 项` },
              { label: '已完成', value: `${completedActionCount} 项` },
              { label: '同步就绪', value: `${syncReadyCount} 项` },
            ]} />
          </Card>
        </ProcessWorkspaceAside>
      </ProcessWorkspace>

      <VersionDrawer visible={versionDrawerVisible} versions={activeMinute.versions} onClose={() => setVersionDrawerVisible(false)} />
      <ConfirmFlowModals
        submitVisible={submitVisible} onSubmitConfirm={handleSubmit} onSubmitCancel={() => setSubmitVisible(false)}
        confirmVisible={confirmVisible} onConfirmOk={handleConfirm} onConfirmCancel={() => setConfirmVisible(false)}
        rejectVisible={rejectVisible} onRejectOk={handleReject} onRejectCancel={() => setRejectVisible(false)}
        withdrawVisible={withdrawVisible} onWithdrawOk={handleWithdraw} onWithdrawCancel={() => setWithdrawVisible(false)}
        archiveVisible={archiveVisible} onArchiveOk={handleArchive} onArchiveCancel={() => setArchiveVisible(false)}
        validateForSubmit={() => {
          const errors: string[] = [];
          if (!title.trim()) errors.push('请填写会议主题');
          if (!meetingTime) errors.push('请选择会议时间');
          if (!reviewerId) errors.push('请选择确认人');
          return errors;
        }}
      />
    </PageShell>
  );
}
