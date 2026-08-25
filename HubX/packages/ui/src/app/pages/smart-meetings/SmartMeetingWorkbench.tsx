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
import { Button, Space, Tag, Typography, Spin, Result, Message, Card } from '@arco-design/web-react';
import { IconSave, IconSend, IconDelete, IconCheck, IconUndo, IconArchive, IconCopy, IconBrush } from '@arco-design/web-react/icon';
import { useSmartMeeting } from './SmartMeetingContext';
import { viewMinute, type ViewerContext } from './accessControl';
import { canTransition, canEditFields } from './minuteStateMachine';
import { buildVersion } from './versioning';
import { diffActionItemsToTodo } from './actionItemSync';
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

const { Title, Text } = Typography;

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

export function SmartMeetingWorkbench() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getById, createMinute, updateMinute, deleteDraft } = useSmartMeeting();
  const { createTodo } = useTodos();

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
      await updateMinute(created.id, (m) => ({
        ...m, refs, coreDecisions, contentMarkdown, actionItems, source,
      }));
      Message.success('纪要已创建');
      navigate(`/smart-meetings/${created.id}`, { replace: true });
    } else if (id) {
      await updateMinute(id, (m) => ({
        ...m, title, meetingTime, organizerId, reviewerId, attendeeIds,
        refs, coreDecisions, contentMarkdown, actionItems, source, polishPreview,
      }));
      Message.success('已保存');
    }
  }, [isNew, id, title, meetingTime, organizerId, reviewerId, attendeeIds, refs, coreDecisions, contentMarkdown, actionItems, source, polishPreview, createMinute, updateMinute, navigate]);

  // 状态迁移
  const doTransition = useCallback(async (action: MinuteAction, extra?: Partial<SmartMinute>) => {
    if (!id) return;
    const now = new Date().toISOString();
    await updateMinute(id, (m) => {
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

    await handleSave();
    await doTransition('submit');
    Message.success('已提交确认');
    setSubmitVisible(false);
  }, [title, meetingTime, reviewerId, handleSave, doTransition]);

  // 确认（含 TODO 同步）
  const handleConfirm = useCallback(async () => {
    if (!id) return;
    await handleSave();

    // TODO 同步：diffActionItemsToTodo → 写入 TodoContext
    const todoOps = diffActionItemsToTodo(minute?.actionItems ?? [], actionItems);
    for (const op of todoOps) {
      if (op.op === 'create') {
        createTodo(op.item);
      }
      // update / softCancel 暂不处理（需 TodoContext 扩展 updateTodo / cancelTodo）
    }

    await doTransition('confirm');
    Message.success('已确认');
    setConfirmVisible(false);
  }, [id, handleSave, minute?.actionItems, actionItems, doTransition, createTodo]);

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

  // === 渲染 ===

  // Guard: 新建模式直接渲染
  if (!isNew && !minute) {
    return <Result status="404" subTitle="纪要不存在" />;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* 页头：标题 + 状态 + 按钮组 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Title heading={5} style={{ margin: 0 }}>
              {isNew ? '新建纪要' : title || '未命名纪要'}
            </Title>
            {!isNew && (
              <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>
            )}
            {minute?.adminSource && (
              <Tag size="small" color="cyan">来自行政会议</Tag>
            )}
          </div>

          <Space size={8}>
            {/* 版本历史 */}
            {!isNew && (
              <Button size="small" onClick={() => setVersionDrawerVisible(true)}>
                版本历史 ({minute?.versions.length ?? 0})
              </Button>
            )}

            {/* 复制 */}
            {(status === 'confirmed' || status === 'archived') && (
              <Button size="small" icon={<IconCopy />} onClick={handleCopy}>复制</Button>
            )}

            {/* 撤回 */}
            {canDo('withdraw') && (
              <Button size="small" icon={<IconUndo />} onClick={() => setWithdrawVisible(true)}>撤回修改</Button>
            )}

            {/* 归档 */}
            {canDo('archive') && (
              <Button size="small" icon={<IconArchive />} onClick={() => setArchiveVisible(true)}>归档</Button>
            )}

            {/* 删除 */}
            {canDo('delete') && (
              <Button size="small" status="danger" icon={<IconDelete />} onClick={handleDelete}>删除</Button>
            )}

            {/* 保存 */}
            {!isReadonly && (
              <Button size="small" type="secondary" icon={<IconSave />} onClick={handleSave}>保存</Button>
            )}

            {/* 提交确认 */}
            {canDo('submit') && (
              <Button size="small" type="primary" icon={<IconSend />} onClick={() => setSubmitVisible(true)}>提交确认</Button>
            )}

            {/* 确认 */}
            {canDo('confirm') && (
              <Button size="small" type="primary" icon={<IconCheck />} onClick={() => setConfirmVisible(true)}>确认</Button>
            )}

            {/* 驳回 */}
            {canDo('reject') && (
              <Button size="small" status="danger" onClick={() => setRejectVisible(true)}>驳回</Button>
            )}

            {/* AI 润色 */}
            {!isReadonly && status === 'draft' && (
              <Button size="small" icon={<IconBrush />} onClick={handlePolish}>AI 润色</Button>
            )}
          </Space>
        </div>

        {/* 来源会议取消提示 */}
        {minute?.adminSource?.sourceStatus === 'cancelled' && (
          <div style={{ marginTop: 8, padding: '6px 12px', background: 'var(--orange-50)', borderRadius: 6, fontSize: 13, color: 'var(--orange-600)' }}>
            ⚠ 来源行政会议已取消
          </div>
        )}
        {minute?.adminSource?.sourceStatus === 'deleted' && (
          <div style={{ marginTop: 8, padding: '6px 12px', background: 'var(--red-50)', borderRadius: 6, fontSize: 13, color: 'var(--red-600)' }}>
            ⚠ 来源行政会议已删除
          </div>
        )}
      </Card>

      {/* 面板区域 */}
      <SourcePanel source={source} canSee={minuteView?.canSeeSourceText ?? true} readonly={isReadonly} onImport={setSource} />
      <MetaPanel
        title={title} meetingTime={meetingTime} attendeeIds={attendeeIds}
        organizerId={organizerId} reviewerId={reviewerId} refs={refs}
        readonly={isReadonly}
        onTitleChange={setTitle} onTimeChange={setMeetingTime}
        onAttendeesChange={setAttendeeIds} onOrganizerChange={setOrganizerId}
        onReviewerChange={setReviewerId} onRefsChange={setRefs}
      />
      <DecisionsPanel decisions={coreDecisions} readonly={isReadonly} onChange={setCoreDecisions} />
      <ContentPanel
        contentMarkdown={contentMarkdown} polishPreview={polishPreview}
        readonly={isReadonly}
        onContentChange={setContentMarkdown} onPolishRequest={handlePolish}
        onPolishAccept={handlePolishAccept} onPolishDiscard={handlePolishDiscard}
      />
      <ActionItemsPanel
        actionItems={actionItems}
        readonly={isReadonly}
        confirmedReadonly={status === 'confirmed' || status === 'archived'}
        onChange={setActionItems}
      />

      {/* 版本抽屉 */}
      <VersionDrawer
        visible={versionDrawerVisible}
        versions={minute?.versions ?? []}
        onClose={() => setVersionDrawerVisible(false)}
      />

      {/* 流程弹窗 */}
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
    </div>
  );
}
