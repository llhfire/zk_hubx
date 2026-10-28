import { useState } from 'react';
import {
  AlertBanner,
  AsyncState,
  Button,
  ConfirmModal,
  Message,
  SectionCard,
  Space,
  confirmAction,
} from '@/design-system';

export function FeedbackDemos() {
  const [confirmVisible, setConfirmVisible] = useState(false);

  return (
    <SectionCard title="反馈组件" description="可关闭提醒、二次确认、加载 / 失败 / 无权限三态。">
      <div className="ui-library-preview">
        <div className="ui-library-preview__label">AlertBanner — 4 个状态色 / 标题 / 紧凑 / 可关闭</div>
        <div className="ui-library-demo-stack">
          <AlertBanner tone="info" title="口径说明">回款金额按实际到账日归集，不按合同签订日。</AlertBanner>
          <AlertBanner tone="warning" title="即将逾期">3 笔回款将在 5 天内到期。</AlertBanner>
          <AlertBanner tone="danger" title="数据不一致">报价总额与合同金额相差 ¥12,000，请核对后再提交。</AlertBanner>
          <AlertBanner tone="success">审批已通过，可以开始交付。</AlertBanner>
          <AlertBanner tone="warning" compact>紧凑形态：卡片内的一行说明，不占整段高度。</AlertBanner>
          <AlertBanner tone="info" closable>可关闭形态：关闭只收起当前会话，不代表已处理（M-001）。</AlertBanner>
        </div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">confirmAction / ConfirmModal — 二次确认</div>
        <Space wrap>
          <Button onClick={() => confirmAction({ title: '确认提交报价？', content: '提交后将进入审批流，审批期间不可修改。', onOk: () => { Message.success('已提交'); } })}>confirmAction · 默认</Button>
          <Button status="danger" onClick={() => confirmAction({ title: '删除该线索？', content: '删除后进入回收站，30 天内可恢复。', tone: 'danger', okText: '删除', onOk: () => { Message.success('已删除'); } })}>confirmAction · danger</Button>
          <Button onClick={() => setConfirmVisible(true)}>ConfirmModal · 受控</Button>
        </Space>
        <ConfirmModal
          visible={confirmVisible}
          title="作废该合同？"
          content="作废后关联回款计划一并失效，不可撤销。"
          tone="danger"
          okText="作废"
          onOk={() => { setConfirmVisible(false); Message.success('已作废'); }}
          onCancel={() => setConfirmVisible(false)}
        />
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">AsyncState — 加载 / 失败 / 无权限 / 就绪</div>
        <div className="ui-library-demo-grid">
          <div><div className="ui-library-demo-caption">loading + loadingText</div><AsyncState status="loading" loadingText="正在加载回款数据…" /></div>
          <div><div className="ui-library-demo-caption">error + onRetry</div><AsyncState status="error" errorText="回款数据加载失败" onRetry={() => Message.info('重试')} /></div>
          <div><div className="ui-library-demo-caption">forbidden</div><AsyncState status="forbidden" /></div>
          <div><div className="ui-library-demo-caption">ready</div><AsyncState status="ready">加载完成后渲染的真实内容。</AsyncState></div>
        </div>
      </div>
    </SectionCard>
  );
}
