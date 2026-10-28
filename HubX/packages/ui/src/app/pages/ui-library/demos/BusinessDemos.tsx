import { useRef, useState } from 'react';
import {
  ApprovalFlow,
  Button,
  DocumentActionRow,
  DocumentViewerModal,
  DormitoryRoomBoard,
  EvaluationWorkloadTable,
  FeatureWorkloadMatrix,
  FileArchivePanel,
  IconArrowRight,
  Input,
  Message,
  MoneyText,
  PaymentAmountSummary,
  PaymentPlanTable,
  PaymentProgress,
  PaymentScheduleRail,
  ProcessOverview,
  ProcessPanelSection,
  ProcessRecordCard,
  ProcessStepper,
  RiskRadarGrid,
  RoleRateGrid,
  SectionCard,
  StatusTag,
  Tooltip,
  WorkloadNumericInput,
  type WorkloadNumericInputFillRef,
} from '@/design-system';
import { librarySteps } from './fixtures';

export function BusinessDemos() {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [demoWorkloads, setDemoWorkloads] = useState<Record<string, number>>({ 'eval-row-1-pm': 1.5, 'eval-row-1-fe': 2, 'eval-row-2-pm': 0.5, 'eval-row-2-fe': 1.5 });
  const demoFillRef = useRef<WorkloadNumericInputFillRef | null>(null);

  return (
    <SectionCard title="业务组件" description="业务步骤、流程记录卡、文件语义、文件阅读器与审批流。">
      <div className="ui-library-preview">
        <div className="ui-library-preview__label">PaymentProgress — 泳道卡片 240 / 表格列 150</div>
        <div className="ui-library-size-stage ui-library-size-stage--lane">
          <PaymentProgress received={186000} total={320000} size="small" />
        </div>
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-size-stage ui-library-size-stage--lane">
          <PaymentProgress received={320000} total={320000} tone="success" />
        </div>
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-size-stage ui-library-size-stage--progress-col">
          <PaymentProgress received={86000} total={320000} size="small" showAmounts={false} />
        </div>
        <div className="ui-library-demo-caption">回款泳道最小 220，卡片里用 small。收付款列表的进度列是 150。默认尺寸留给更宽的摘要。</div>
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-demo-row">
          <div className="ui-library-preview__label">PaymentAmountSummary — 合同列表金额列紧凑摘要</div>
          <div className="ui-library-size-stage ui-library-size-stage--amount">
            <PaymentAmountSummary size="small" total={1200000} receivable={720000} />
          </div>
        </div>
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-demo-row">
          <div className="ui-library-preview__label">PaymentScheduleRail — 按付款期次表达比例、已收、待收与逾期</div>
          <div className="ui-library-size-stage ui-library-size-stage--rail">
            <PaymentScheduleRail
              showLegend
              items={[
                { id: 'paid', label: '首付款', percentage: 30, amount: 360000, allocated: 360000, status: 'paid', expectedDate: '2026-04-10' },
                { id: 'partial', label: '二期款', percentage: 30, amount: 360000, allocated: 120000, status: 'partial', expectedDate: '2026-06-10' },
                { id: 'overdue', label: '三期款', percentage: 30, amount: 360000, allocated: 0, status: 'overdue', expectedDate: '2026-08-10' },
                { id: 'pending', label: '尾款', percentage: 10, amount: 120000, allocated: 0, status: 'pending', expectedDate: '2026-10-10' },
              ]}
            />
          </div>
        </div>
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-demo-row">
          <PaymentPlanTable
            data={[
              { period: 1, periodName: '首付款', amount: 96000, percentage: 30, expectedDate: '2026-05-20', condition: '合同生效后 5 个工作日' },
              { period: 2, periodName: '验收款', amount: 224000, percentage: 70, expectedDate: '2026-08-20', condition: '项目验收通过' },
            ]}
            showPercentage
            showCondition
            renderStatus={(row) => <StatusTag tone={row.period === 1 ? 'success' : 'warning'}>{row.period === 1 ? '已收款' : '待收款'}</StatusTag>}
          />
          <div className="ui-library-demo-caption">占满合同详情里的款项区。打开比例、触发条件和状态时，列宽合计 770，窄于父级就横向滚动。</div>
        </div>
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-demo-row">
          <FileArchivePanel
            title="合同归档"
            description="终稿文件与归档记录"
            action={<Button size="small" type="primary">补充归档</Button>}
            headerMeta={<StatusTag tone="success">当前终稿 V2</StatusTag>}
            entries={[
              {
                key: 'archive-1',
                title: 'V2 归档',
                badges: <><StatusTag tone="success" size="small">当前终稿</StatusTag><StatusTag tone="info" size="small">主归档</StatusTag></>,
                timestamp: '2026-04-12 14:30',
                meta: <><span>上传人：张三</span><span>备注：客户盖章扫描件</span></>,
                files: [
                  { key: 'archive-file-1', name: '合同盖章件-V2.pdf', meta: 'PDF · 2.4MB', onPreview: () => undefined, onDownload: () => undefined },
                  { key: 'archive-file-2', name: '客户盖章页.png', meta: 'PNG · 680KB', onPreview: () => undefined, onDownload: () => undefined },
                ],
              },
            ]}
          />
        </div>
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-preview__label">DocumentActionRow — 区块整行 / 侧栏弱化</div>
        <DocumentActionRow
          context="合同终稿"
          name="软件服务合同-V3.docx"
          meta="在线编辑版 · V3 · 2026-10-27"
          actions={<><Button type="primary" size="small">在线查看</Button><Button size="small">下载</Button></>}
        />
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-size-stage ui-library-size-stage--aside">
          <DocumentActionRow
            variant="quiet"
            context="报价文件"
            name="海淀智检中台升级-报价单-最终确认版-V2.pdf"
            meta="演示文件仅保留元数据"
            actions={<Button size="small">下载报价文件</Button>}
          />
        </div>
        <div className="ui-library-demo-caption">列表和页签里的主文档占满所在区块。报价记录放在约 320 的侧栏，长文件名换行，动作不收缩。视口 720px 以下，动作改到文件名下方。</div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">ProcessOverview — 身份 + 操作 + 业务步骤</div>
        <ProcessOverview
          identifier="DEMO-2026-001"
          title="长流程对象名称"
          tags={<><StatusTag tone="info">执行中</StatusTag><StatusTag tone="neutral">示例模块</StatusTag></>}
          actions={<><Button type="primary" size="small">登记进展</Button><Button size="small">查看记录</Button></>}
          steps={librarySteps}
          currentStep={2}
        />
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">ProcessRecordCard — 业务过程侧栏约 320</div>
        <div className="ui-library-size-stage ui-library-size-stage--aside">
          <ProcessRecordCard
            leading={<StatusTag tone="info" size="small">数据流转</StatusTag>}
            title="客户管理系统实施报价-海淀智检中台升级"
            tags={<><StatusTag tone="info" size="small">v1.0</StatusTag><StatusTag tone="warning" size="small">待报价</StatusTag></>}
            actions={<Tooltip content="进入工作台"><span className="hubx-process-record-card__indicator" aria-hidden="true"><IconArrowRight /></span></Tooltip>}
            onClick={() => undefined}
            ariaLabel="进入报价工作台"
            identifier="QT-2026-18"
            summary={<><span>人天 <strong>36.5</strong></span><span>报价 <strong>¥68,000</strong></span><span>2 端 · 7 模块</span></>}
          />
          <ProcessRecordCard
            muted
            leading={<StatusTag tone="neutral" size="small">已作废</StatusTag>}
            title="旧版报价（muted 形态）"
            identifier="QT-2026-09"
            summary={<span>已被 QT-2026-18 取代</span>}
          />
        </div>
        <div className="ui-library-demo-caption">项目详情侧栏实测约 348，过程区内容约 314。长标题换行。视口 768px 以下，标题和动作改成上下排。</div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">ProcessPanelSection — 侧栏页签动作栏</div>
        <div className="ui-library-size-stage ui-library-size-stage--aside">
          <ProcessPanelSection actions={<Button size="small" type="primary">新增记录</Button>}>
            <ProcessRecordCard
              title="侧栏过程记录"
              identifier="DEMO-PS-001"
              details="动作栏由组件统一对齐，记录内容继续复用 ProcessRecordCard。"
            />
          </ProcessPanelSection>
        </div>
        <div className="ui-library-demo-caption">动作靠右，内容占满侧栏。项目详情里这块约 314 宽。</div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">ApprovalFlow — 占满所在审批页签</div>
        <ApprovalFlow
          nodes={[
            { key: 'submit', title: '发起申请', status: 'approved', approver: '张三', time: '04-24 09:12', statusLabel: '已提交' },
            { key: 'biz', title: '商务审核', status: 'approved', approver: '李四', time: '04-24 14:30', comment: '金额与折扣符合报价口径' },
            { key: 'finance', title: '财务审核', status: 'rejected', approver: '王五', time: '04-25 10:05', comment: '回款比例低于 30%，请补充说明' },
            { key: 'gm', title: '总经理审批', status: 'skipped', approver: '赵六' },
          ]}
        />
        <div className="ui-library-demo-caption">节点竖线连接，意见在节点内换行。报价审批页签和线索审批回合都占满所在区域，组件不设最大宽度。</div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">ProcessStepper — 横向流程状态指挥条</div>
        <ProcessStepper
          nodes={[
            { key: 'review', index: 1, title: '商务审核', subtitle: '李四', status: 'approved', statusLabel: '已通过', tooltip: '金额与折扣符合报价口径' },
            { key: 'stamp', index: '印', title: '企业公章', subtitle: '印章管理员', status: 'active', statusLabel: '待盖章' },
            { key: 'deal', index: '终', title: '客户成交', subtitle: '商务闭环', status: 'pending', statusLabel: '待推进' },
          ]}
        />
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">FeatureWorkloadMatrix — 报价页签占满，表格最小 720</div>
        <FeatureWorkloadMatrix
          endpoints={[{ key: 'web', name: 'Web 端', platforms: ['PC', '浏览器'] }, { key: 'mobile', name: '移动端', platforms: ['iOS'] }]}
          modules={[
            { key: 'account', endpointKey: 'web', name: '账号与权限', subFeatures: [{ key: 'login', name: '登录' }, { key: 'role', name: '角色管理' }] },
            { key: 'dashboard', endpointKey: 'web', name: '数据看板', subFeatures: [{ key: 'overview', name: '总览看板' }] },
            { key: 'push', endpointKey: 'mobile', name: '消息中心', subFeatures: [{ key: 'notice', name: '消息推送' }] },
          ]}
          roles={[{ key: 'fe', name: '前端', dailyRate: 1200 }, { key: 'be', name: '后端', dailyRate: 1400 }]}
          units={[
            { subFeatureKeys: ['login'], totalDays: 3, workloads: { fe: 1.5, be: 1.5 } },
            { subFeatureKeys: ['role'], totalDays: 4, workloads: { fe: 2, be: 2 } },
            { subFeatureKeys: ['overview'], totalDays: 5, workloads: { fe: 2, be: 3 } },
            { subFeatureKeys: ['notice'], totalDays: 3, workloads: { fe: 1, be: 2 } },
          ]}
        />
        <div className="ui-library-demo-caption">岗位列不换行。内容区窄于 720 时，矩阵横向滚动，不压扁列宽。</div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">RiskRadarGrid — 风控指标 / 风险边界 / 解释文本</div>
        <RiskRadarGrid
          items={[
            { key: 'safe', label: '预估综合毛利率', value: '32.5%', detail: '符合公司基准收益指标', tone: 'safe' },
            { key: 'warning', label: '外部自费与代采项目', value: '¥12,800', detail: '共 2 项，需确认垫资条款', tone: 'warning' },
            { key: 'danger', label: '付款风险', value: '高', detail: '首付款低于风控底线', tone: 'danger' },
          ]}
        />
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">RoleRateGrid — 岗位人天 / 日均成本 / 岗位小计</div>
        <RoleRateGrid
          readonly
          items={[
            { key: 'pm', name: '产品经理', days: 4.5, dailyRate: 600 },
            { key: 'fe', name: '前端开发', days: 12.5, dailyRate: 800 },
            { key: 'qa', name: '测试工程师', days: 5, dailyRate: 500 },
          ]}
        />
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">EvaluationWorkloadTable — 评估表最小 1120，超高内部滚动</div>
        <EvaluationWorkloadTable
          rows={[
            { key: 'eval-row-1', endpointKey: 'web', endpointName: 'Web 端', platforms: [<StatusTag key="pc" size="small" tone="info">PC</StatusTag>], moduleName: '账号与权限', subFeatures: ['登录', '角色管理'], granularity: <StatusTag size="small">切片组</StatusTag>, totalDays: 3.5 },
            { key: 'eval-row-2', endpointKey: 'web', endpointName: 'Web 端', platforms: [<StatusTag key="pc" size="small" tone="info">PC</StatusTag>], moduleName: '数据看板', subFeatures: ['总览看板'], granularity: <StatusTag size="small">单项</StatusTag>, selectable: true, totalDays: 2 },
          ]}
          roles={[{ key: 'pm', name: '产品经理' }, { key: 'fe', name: '前端开发' }]}
          renderWorkloadCell={(row, role) => (
            <WorkloadNumericInput
              value={demoWorkloads[`${row.key}-${role.key}`]}
              unitId={row.key}
              roleKey={role.key}
              rowIds={['eval-row-1', 'eval-row-2']}
              roleKeys={['pm', 'fe']}
              fillRef={demoFillRef}
              onChangeValue={(unitId, roleKey, value) => setDemoWorkloads((current) => ({ ...current, [`${unitId}-${roleKey}`]: value }))}
            />
          )}
          renderTechRemark={() => <Input size="small" placeholder="架构/依赖说明" />}
        />
        <div className="ui-library-demo-caption">表格最小 1120，最大高度为视口减去 200。内容区更窄时横向滚动，表头吸顶。</div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">DormitoryRoomBoard — 楼层 / 房间 / 床位房态矩阵</div>
        <DormitoryRoomBoard
          floors={[
            {
              key: 'floor-1', label: '1F 楼层', roomCount: 2, bedCount: 4, occupiedCount: 2,
              rooms: [
                { key: 'room-101', roomNumber: '101', roomTypeKey: 'double', roomTypeLabel: '双人间', roomTypeTone: 'info', facilities: ['独立卫浴', '空调'], beds: [{ key: 'bed-101-1', label: '1号床', occupied: true, occupantName: '张三', stayLabel: '长期员工', stayTone: 'info' }, { key: 'bed-101-2', label: '2号床', occupied: false, onSelect: () => undefined }] },
                { key: 'room-102', roomNumber: '102', roomTypeKey: 'double', roomTypeLabel: '双人间', roomTypeTone: 'info', facilities: ['独立卫浴', 'WiFi'], maintenance: true, onMaintenance: () => undefined, beds: [{ key: 'bed-102-1', label: '1号床', occupied: true, occupantName: '李四', stayLabel: '出差借宿', stayTone: 'purple' }, { key: 'bed-102-2', label: '2号床', occupied: false }] },
              ],
            },
          ]}
          statusFilter="all"
          onStatusFilterChange={() => undefined}
          roomTypeFilter="all"
          onRoomTypeFilterChange={() => undefined}
        />
        <div className="ui-library-demo-caption">房间最小 280。宿舍页在 1440 下约两列、每间约 398。容器窄于 280 时收成一列，不再溢出。</div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">DocumentViewerModal — 全屏阅读器，支持一屏一页 / 横排两页</div>
        <Button icon={<IconArrowRight />} onClick={() => setViewerOpen(true)}>打开报价单阅读器</Button>
        <DocumentViewerModal
          visible={viewerOpen}
          title="ZK HubX 报价单 · QT-2026-18"
          content={<div><h2>报价单</h2><p>客户：海淀智检科技有限公司</p><p>项目：中台升级（数据接入、规则引擎、移动巡检、报表看板）</p><p>金额：<MoneyText value={68000} /></p></div>}
          onClose={() => setViewerOpen(false)}
          onDownload={() => Message.success('开始下载')}
        />
      </div>
    </SectionCard>
  );
}
