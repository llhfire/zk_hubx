import React, { useState, useEffect } from 'react';
import { Button, Divider, Input, Modal, Space } from '@/design-system';
import {
  IconApps,
  IconArrowRight,
  IconCheckCircle,
  IconCheckCircleFill,
  IconFile,
  IconThunderbolt,
} from '@/design-system';
import type { QuoteFlowMode } from '../../quotation/types';
import './SelectQuoteModeModal.css';
import { StatusTag } from '@/design-system';

export interface SelectQuoteModeModalContentProps {
  leadName: string;
  customerName?: string;
  contactName?: string;
  contactPhone?: string;
  flowMode: QuoteFlowMode;
  setFlowMode: (mode: QuoteFlowMode) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const SelectQuoteModeModalContent: React.FC<SelectQuoteModeModalContentProps> = ({
  leadName,
  customerName,
  contactName,
  contactPhone,
  flowMode,
  setFlowMode,
  projectName,
  setProjectName,
  submitting = false,
  onCancel,
  onConfirm,
}) => {
  return (
    <div className="select-quote-mode-modal-content">
      {/* 弹窗头部 */}
      <div className="select-quote-mode-modal__header">
        <div className="select-quote-mode-modal__header-icon">
          <IconThunderbolt />
        </div>
        <div>
          <div className="select-quote-mode-modal__header-title">选择报价工作台流转模式</div>
          <div className="select-quote-mode-modal__header-desc">
            根据项目协同场景与团队分工，选择最适合的报价评估流转机制
          </div>
        </div>
      </div>

      <Divider style={{ margin: '14px 0 16px' }} />

      {/* 顶部关联线索上下文条 */}
      <div className="select-quote-mode-modal__context-banner">
        <div className="select-quote-mode-modal__context-item">
          <span className="label">目标线索</span>
          <span className="value" title={leadName || '未指定线索'}>
            {leadName || '未指定线索'}
          </span>
        </div>
        <Divider type="vertical" style={{ height: 24 }} />
        <div className="select-quote-mode-modal__context-item">
          <span className="label">客户主体</span>
          <span className="value" title={customerName || '未关联企业'}>
            {customerName || '未关联企业客户'}
          </span>
        </div>
        <Divider type="vertical" style={{ height: 24 }} />
        <div className="select-quote-mode-modal__context-item">
          <span className="label">对接人</span>
          <span className="value">
            {contactName ? `${contactName}${contactPhone ? ` · ${contactPhone}` : ''}` : '暂无联系人'}
          </span>
        </div>
      </div>

      {/* 左右双模式高亮卡片选择器 */}
      <div className="select-quote-mode-cards" role="radiogroup" aria-label="报价工作台模式">
        {/* 卡片 1：在线数据表单协作模式 */}
        <div
          className={`select-quote-mode-card ${flowMode === 'online' ? 'is-selected is-online' : ''}`}
          onClick={() => setFlowMode('online')}
          role="radio"
          aria-checked={flowMode === 'online'}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFlowMode('online');
            }
          }}
        >
          <div className="select-quote-mode-card__badge-row">
            <div className="select-quote-mode-card__icon-box icon-box--online">
              <IconApps style={{ fontSize: 'var(--text-xl)', color: 'var(--color-white)' }} />
            </div>
            <StatusTag size="small" tone="info" style={{ fontWeight: 600 }}>
              推荐 · 数字化协同
            </StatusTag>
          </div>

          <div className="select-quote-mode-card__title">在线表单协作模式</div>
          <div className="select-quote-mode-card__desc">
            全流程线上结构化拆解功能模块、工时单价与多角色商务测算
          </div>

          <div className="select-quote-mode-card__features">
            <div className="select-quote-mode-card__feature-item">
              <IconCheckCircle className="check-icon" />
              <span>多端同步覆盖配置（Web、Pad、App、小程序）</span>
            </div>
            <div className="select-quote-mode-card__feature-item">
              <IconCheckCircle className="check-icon" />
              <span>多工种人天实时填报，毛利税费动态穿透核算</span>
            </div>
            <div className="select-quote-mode-card__feature-item">
              <IconCheckCircle className="check-icon" />
              <span>多版本实时即时比对、内审流转与在线报价单生成</span>
            </div>
          </div>

          <div className="select-quote-mode-card__footer">
            <span className="scene-label">适用场景：</span>
            <span>常规项目、标准定制研发、商务与技术线上即时协同</span>
          </div>

          {flowMode === 'online' && (
            <div className="select-quote-mode-card__check-indicator">
              <IconCheckCircleFill />
            </div>
          )}
        </div>

        {/* 卡片 2：Excel 文件流转模式 */}
        <div
          className={`select-quote-mode-card ${flowMode === 'file' ? 'is-selected is-file' : ''}`}
          onClick={() => setFlowMode('file')}
          role="radio"
          aria-checked={flowMode === 'file'}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFlowMode('file');
            }
          }}
        >
          <div className="select-quote-mode-card__badge-row">
            <div className="select-quote-mode-card__icon-box icon-box--file">
              <IconFile style={{ fontSize: 'var(--text-xl)', color: 'var(--color-white)' }} />
            </div>
            <StatusTag size="small" tone="purple" style={{ fontWeight: 600 }}>
              离线评估 · 外部协作
            </StatusTag>
          </div>

          <div className="select-quote-mode-card__title">Excel 文件流转模式</div>
          <div className="select-quote-mode-card__desc">
            导出官方标准清单模板离线评估，线下汇总后回传解析入库
          </div>

          <div className="select-quote-mode-card__features">
            <div className="select-quote-mode-card__feature-item">
              <IconCheckCircle className="check-icon" />
              <span>一键导出官方标准《功能清单与工时评估表.xlsx》</span>
            </div>
            <div className="select-quote-mode-card__feature-item">
              <IconCheckCircle className="check-icon" />
              <span>外部专家/供应商团队线下填报，契合传统办公流程</span>
            </div>
            <div className="select-quote-mode-card__feature-item">
              <IconCheckCircle className="check-icon" />
              <span>回传 Excel 一键智能解析入库，自动核算人天与成本</span>
            </div>
          </div>

          <div className="select-quote-mode-card__footer">
            <span className="scene-label">适用场景：</span>
            <span>复杂超大清单、外包协作、客户已有详细离线需求表</span>
          </div>

          {flowMode === 'file' && (
            <div className="select-quote-mode-card__check-indicator is-file">
              <IconCheckCircleFill />
            </div>
          )}
        </div>
      </div>

      {/* 方案名称微调输入栏 */}
      <div className="select-quote-mode-modal__form-box">
        <span className="select-quote-mode-modal__form-label">拟建方案名称</span>
        <Input
          size="small"
          value={projectName}
          onChange={setProjectName}
          placeholder="请输入方案名称（默认沿用线索项目名）"
          style={{ flex: 1 }}
          allowClear
        />
      </div>

      {/* 自定义底部操作栏 */}
      <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--color-border-2)' }}>
        <div className="select-quote-mode-modal__footer">
          <div className="select-quote-mode-modal__footer-status">
            <span>当前已选：</span>
            <StatusTag tone={flowMode === 'online' ? 'info' : 'purple'} size="small">
              {flowMode === 'online' ? '在线表单协作模式' : 'Excel 文件流转模式'}
            </StatusTag>
          </div>
          <Space size={10}>
            <Button onClick={onCancel} disabled={submitting}>
              取消
            </Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={onConfirm}
              icon={<IconArrowRight />}
            >
              确认并进入报价流程
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
};

export interface SelectQuoteModeModalProps {
  visible: boolean;
  leadName: string;
  customerName?: string;
  contactName?: string;
  contactPhone?: string;
  defaultFlowMode?: QuoteFlowMode;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (payload: { flowMode: QuoteFlowMode; projectName: string }) => Promise<void> | void;
}

export const SelectQuoteModeModal: React.FC<SelectQuoteModeModalProps> = ({
  visible,
  leadName,
  customerName,
  contactName,
  contactPhone,
  defaultFlowMode = 'online',
  submitting = false,
  onCancel,
  onSubmit,
}) => {
  const [flowMode, setFlowMode] = useState<QuoteFlowMode>(defaultFlowMode);
  const [projectName, setProjectName] = useState<string>(leadName || '');
  const [internalSubmitting, setInternalSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setFlowMode(defaultFlowMode || 'online');
      setProjectName(leadName || '');
    }
  }, [visible, defaultFlowMode, leadName]);

  const handleConfirm = async () => {
    try {
      setInternalSubmitting(true);
      await onSubmit({
        flowMode,
        projectName: projectName.trim() || leadName || '未命名报价方案',
      });
    } finally {
      setInternalSubmitting(false);
    }
  };

  const isBusy = submitting || internalSubmitting;

  return (
    <Modal
      className="select-quote-mode-modal"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      title={null}
      style={{ width: 700 }}
    >
      <SelectQuoteModeModalContent
        leadName={leadName}
        customerName={customerName}
        contactName={contactName}
        contactPhone={contactPhone}
        flowMode={flowMode}
        setFlowMode={setFlowMode}
        projectName={projectName}
        setProjectName={setProjectName}
        submitting={isBusy}
        onCancel={onCancel}
        onConfirm={handleConfirm}
      />
    </Modal>
  );
};
