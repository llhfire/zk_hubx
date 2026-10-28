import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { StatusMap } from '..';
import {
  AsyncState,
  CountdownTag,
  Eye,
  GradeTag,
  NotePencil,
  StatusTag,
  Trash,
  resolveStatus,
  PageHeader,
  PageShell,
  SectionTabs,
  Space,
  FeatureWorkloadMatrix,
  RiskRadarGrid,
  MetricGrid,
  ProcessOverview,
  ProcessPanelSection,
  ProcessRecordCard,
  ProcessStepper,
  RoleRateGrid,
  EvaluationWorkloadTable,
  WorkloadNumericInput,
  DormitoryRoomBoard,
  SplitLayout,
  SplitLayoutAside,
  SplitLayoutMain,
  FormSection,
  FormGrid,
  OrderedStatePicker,
  WeChatIcon,
  DescriptionsCard,
  DocumentActionRow,
  EmptyState,
  FileList,
  ProgressBar,
  FileArchivePanel,
  RichTextEditor,
  UploadPanel,
  PaymentProgress,
  PaymentAmountSummary,
  PaymentScheduleRail,
  PaymentPlanTable,
  UserPicker,
} from '..';

function renderInRouter(element: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(
    createElement(MemoryRouter, { initialEntries: ['/projects/1'] }, element),
  );
}

describe('HubX 设计系统基础组件', () => {
  test('page icons are exported from the design-system entry', () => {
    const markup = renderInRouter(
      createElement(Space, null, createElement(Eye), createElement(NotePencil), createElement(Trash)),
    );

    expect(markup.match(/<svg/g)).toHaveLength(3);
  });

  test('AsyncState exposes loading text without page-level spinner markup', () => {
    const markup = renderInRouter(
      createElement(AsyncState, { status: 'loading', loadingText: '正在加载合同详情…' }),
    );

    expect(markup).toContain('hubx-async-state');
    expect(markup).toContain('正在加载合同详情…');
  });

  test('AsyncState exposes forbidden and retryable error states', () => {
    const forbidden = renderInRouter(
      createElement(AsyncState, { status: 'forbidden', forbiddenText: '您没有权限查看此报价单' }),
    );
    const error = renderInRouter(
      createElement(AsyncState, {
        status: 'error',
        errorText: '报价单加载失败',
        onRetry: () => undefined,
      }),
    );

    expect(forbidden).toContain('您没有权限查看此报价单');
    expect(error).toContain('报价单加载失败');
    expect(error).toContain('重试');
  });

  test('FormGrid exposes registered uneven field templates', () => {
    const markup = renderInRouter(
      createElement(FormGrid, { template: '2-1-1' }, createElement('div', null, '字段')),
    );

    expect(markup).toContain('hubx-form-grid--template-2-1-1');
  });

  test('FormGrid marks the four-column row used by the project drawer', () => {
    const markup = renderInRouter(
      createElement(FormGrid, { columns: 4 }, createElement('div', null, '字段')),
    );

    expect(markup).toContain('hubx-form-grid--4');
  });

  test('RichTextEditor marks editable and read-only surfaces', () => {
    const editable = renderInRouter(createElement(RichTextEditor, { defaultValue: '<p>说明</p>' }));
    const readOnly = renderInRouter(createElement(RichTextEditor, { readOnly: true, defaultValue: '<p>说明</p>' }));

    expect(editable).toContain('hubx-rich-text');
    expect(editable).not.toContain('hubx-rich-text--readonly');
    expect(readOnly).toContain('hubx-rich-text--readonly');
  });

  test('UploadPanel keeps drop content in component classes', () => {
    const markup = renderInRouter(
      createElement(UploadPanel, { hint: '点击或拖拽', description: '支持 PDF' }),
    );

    expect(markup).toContain('hubx-upload-panel__content');
    expect(markup).toContain('hubx-upload-panel__description');
    expect(markup).toContain('点击或拖拽');
  });

  test('OrderedStatePicker keeps option order, stable values and current selection', () => {
    const markup = renderInRouter(
      createElement(OrderedStatePicker, {
        value: 'A',
        options: [
          { value: 'S', label: 'S' },
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
        ],
      }),
    );

    expect(markup).toContain('hubx-ordered-state-picker');
    expect(markup).toContain('aria-label="选择状态"');
    expect(markup).toContain('aria-checked="true"');
    expect(markup.indexOf('>S</span>')).toBeLessThan(markup.indexOf('>A</span>'));
    expect(markup.indexOf('>A</span>')).toBeLessThan(markup.indexOf('>B</span>'));
  });

  test('UserPicker exposes a searchable stable-ID contract and normalizes empty values', () => {
    const markup = renderInRouter(
      createElement(UserPicker, {
        value: null,
        options: [{ id: 'employee-1', name: '张三', jobNumber: 'E001', department: '销售部' }],
        allowClear: true,
      }),
    );

    expect(markup).toContain('hubx-user-picker');
    expect(markup).toContain('aria-label="选择系统用户"');
    expect(markup).toContain('搜索姓名、工号或部门');
    expect(markup).not.toContain('value="employee-1"');
  });

  test('PageShell renders linked ancestors and the current breadcrumb item', () => {
    const markup = renderInRouter(
      createElement(
        PageShell,
        {
          breadcrumbs: [
            { label: '项目管理', to: '/projects' },
            { label: '项目列表', to: '/projects' },
            { label: 'A公司CRM系统开发' },
          ],
        },
        createElement('div', null, '页面内容'),
      ),
    );

    expect(markup).toContain('aria-label="页面层级"');
    expect(markup).toContain('href="/projects"');
    expect(markup).toContain('A公司CRM系统开发');
    expect(markup).toContain('hubx-page-shell__content');
  });

  test('PageHeader keeps title, description and actions in one semantic header', () => {
    const markup = renderInRouter(
      createElement(PageHeader, {
        title: '客户管理',
        description: '统一页面说明',
        actions: createElement('button', null, '新建客户'),
      }),
    );

    expect(markup).toContain('<header');
    expect(markup).toContain('<h1');
    expect(markup).toContain('统一页面说明');
    expect(markup).toContain('新建客户');
  });

  test('SectionTabs keeps counts as part of the shared tab vocabulary', () => {
    const markup = renderInRouter(
      createElement(SectionTabs, {
        activeKey: 'pending',
        onChange: () => undefined,
        items: [
          { key: 'all', label: '全部', count: 12 },
          { key: 'pending', label: '待处理', count: 3 },
        ],
      }),
    );

    expect(markup).toContain('hubx-section-tabs');
    expect(markup).toContain('hubx-section-tabs__count');
    expect(markup).toContain('待处理');
    expect(markup).toContain('aria-selected="true"');
  });

  test('SectionTabs exposes only line/card variants so pages never pass Arco tab types directly', () => {
    const line = renderInRouter(
      createElement(SectionTabs, {
        activeKey: 'a',
        onChange: () => undefined,
        items: [{ key: 'a', label: '概览' }, { key: 'b', label: '明细' }],
      }),
    );
    expect(line).toContain('hubx-section-tabs--line');

    const card = renderInRouter(
      createElement(SectionTabs, {
        activeKey: 'a',
        onChange: () => undefined,
        variant: 'card',
        items: [{ key: 'a', label: '跟进' }, { key: 'b', label: '资料' }],
      }),
    );
    expect(card).toContain('hubx-section-tabs--card');
    expect(card).toContain('arco-tabs-card');
  });

  test('SectionTabs supports an uncontrolled default so pages need not own tab state', () => {
    const markup = renderInRouter(
      createElement(SectionTabs, {
        defaultActiveKey: 'b',
        items: [{ key: 'a', label: '概览' }, { key: 'b', label: '明细' }],
      }),
    );

    // 默认页签由组件内部持有，页面不再写 useState 或 defaultActiveTab
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('明细');
  });

  test('SectionTabs countTone colours emphasis counts without page-level badge markup', () => {
    const markup = renderInRouter(
      createElement(SectionTabs, {
        activeKey: 'overdue',
        onChange: () => undefined,
        variant: 'card',
        items: [
          { key: 'all', label: '全部', count: 12 },
          { key: 'overdue', label: '逾期', count: 3, countTone: 'danger' },
        ],
      }),
    );

    expect(markup).toContain('hubx-section-tabs__count--danger');
    // 中性计数不带修饰类，避免所有数字都被着色
    expect(markup).toContain('hubx-section-tabs__count">12');
  });

  test('FormSection supports a leading step marker without page-level header markup', () => {
    const markup = renderInRouter(
      createElement(
        FormSection,
        { leading: createElement('span', null, '1'), title: '事由与归属', description: '填写业务归属' },
        createElement('input', { 'aria-label': '目的' }),
      ),
    );

    expect(markup).toContain('hubx-form-section__leading');
    expect(markup).toContain('事由与归属');
    expect(markup).toContain('填写业务归属');
  });

  test('ProcessOverview and MetricGrid expose the shared long-flow structure', () => {
    const overview = renderInRouter(
      createElement(ProcessOverview, {
        identifier: 'PRJ-001',
        title: '示例项目',
        currentStep: 1,
        steps: [
          { key: 'start', title: '立项' },
          { key: 'delivery', title: '交付', description: '进行中' },
          { key: 'accept', title: '验收' },
        ],
      }),
    );
    const metrics = renderInRouter(
      createElement(MetricGrid, {
        items: [
          { key: 'owner', label: '负责人', value: '张三' },
          { key: 'risk', label: '风险', value: '1 项', tone: 'danger' },
        ],
      }),
    );

    expect(overview).toContain('hubx-process-overview');
    expect(overview).toContain('流程进度');
    expect(overview).toContain('进行中');
    expect(metrics).toContain('hubx-process-metric--danger');
    expect(metrics).toContain('负责人');
  });

  test('PaymentProgress exposes payment amounts and a bounded percentage', () => {
    const markup = renderInRouter(
      createElement(PaymentProgress, { received: 120000, total: 200000 }),
    );
    const compactMarkup = renderInRouter(
      createElement(PaymentProgress, { received: 120000, total: 200000, size: 'small', showAmounts: false }),
    );

    expect(markup).toContain('hubx-payment-progress');
    expect(markup).toContain('回款进度');
    expect(markup).toContain('已回款');
    expect(markup).toContain('待回款');
    expect(markup).toContain('60%');
    expect(compactMarkup).not.toContain('已回款');
    expect(compactMarkup).toContain('60%');
  });

  test('PaymentAmountSummary keeps contract totals concise for dense tables', () => {
    const markup = renderInRouter(
      createElement(PaymentAmountSummary, { size: 'small', total: 1200000, receivable: 720000 }),
    );

    expect(markup).toContain('合同额');
    expect(markup).toContain('待收');
    expect(markup).toContain('¥120.0万');
    expect(markup).toContain('¥72.0万');
    expect(markup).not.toContain('已收');
  });

  test('PaymentScheduleRail maps installment ratio and partial payment to accessible segments', () => {
    const markup = renderInRouter(
      createElement(PaymentScheduleRail, {
        items: [
          { id: 'p1', label: '首付款', percentage: 30, amount: 300000, allocated: 300000, status: 'paid' },
          { id: 'p2', label: '验收款', percentage: 30, amount: 300000, allocated: 120000, status: 'partial' },
          { id: 'p3', label: '尾款', percentage: 40, amount: 400000, allocated: 0, status: 'overdue' },
        ],
      }),
    );

    expect(markup).toContain('hubx-payment-schedule-rail');
    expect(markup).toContain('hubx-payment-schedule-rail__segment--paid');
    expect(markup).toContain('hubx-payment-schedule-rail__segment--partial');
    expect(markup).toContain('<linearGradient');
    expect(markup).toContain('var(--ds-tone-info-fg)');
    expect(markup).toContain('var(--ds-tone-neutral-border)');
    expect(markup).toContain('hubx-payment-schedule-rail__segment--overdue');
    expect(markup).toContain('aria-label="回款计划，共 3 期"');
    expect(markup).not.toContain('首付款 · 30%');
    expect(markup).not.toContain('验收款 · 30%');
  });

  test('PaymentPlanTable keeps contract-plan columns behind explicit options', () => {
    const markup = renderInRouter(
      createElement(PaymentPlanTable, {
        data: [{ period: 1, amount: 100000, percentage: 30, expectedDate: '2026-05-20', condition: '合同生效' }],
        showPercentage: true,
        showCondition: true,
        renderStatus: () => '待收款',
      }),
    );

    expect(markup).toContain('期次');
    expect(markup).toContain('触发条件');
    expect(markup).toContain('回款状态');
    expect(markup).toContain('合同生效');
    expect(markup).toContain('hubx-payment-plan-table');
    expect(markup).toContain('770');
  });

  test('FileArchivePanel owns archive batches and file actions', () => {
    const markup = renderInRouter(
      createElement(FileArchivePanel, {
        title: '合同归档',
        description: '终稿文件与归档记录',
        entries: [{
          key: 'archive-1',
          title: 'V2 归档',
          timestamp: '2026-04-12 14:30',
          files: [{ key: 'file-1', name: '合同盖章件.pdf', meta: 'PDF · 2.4MB' }],
        }],
      }),
    );

    expect(markup).toContain('hubx-file-archive');
    expect(markup).toContain('V2 归档');
    expect(markup).toContain('合同盖章件.pdf');
    expect(markup).toContain('hubx-file-list');
  });

  test('FileList labels file actions with the file name for accessible disambiguation', () => {
    const markup = renderInRouter(
      createElement(FileList, {
        items: [{
          key: 'file-1',
          name: '合同盖章件.pdf',
          onPreview: () => {},
          onDownload: () => {},
          onDelete: () => {},
        }],
      }),
    );

    expect(markup).toContain('aria-label="查看 合同盖章件.pdf"');
    expect(markup).toContain('aria-label="下载 合同盖章件.pdf"');
    expect(markup).toContain('aria-label="删除 合同盖章件.pdf"');
    expect(markup).toContain('hubx-file-list__body');
  });

  test('MetricGrid 固定列数写在网格上，空进度不显示数值行', () => {
    const grid = renderToStaticMarkup(createElement(MetricGrid, {
      columns: 4,
      items: [{ key: 'hours', label: '本月工时投入', value: '15951.4h', detail: '全员有效工时' }],
    }));
    expect(grid).toContain('hubx-process-metrics__grid--columns-4');
    expect(grid).toContain('hubx-process-metric__detail');

    const inline = renderToStaticMarkup(createElement(ProgressBar, { percent: 30, showValue: false, size: 'small' }));
    expect(inline).toContain('hubx-progress--small');
    expect(inline).not.toContain('hubx-progress__value');

    const circle = renderToStaticMarkup(createElement(ProgressBar, { variant: 'circle', percent: 67, diameter: 72 }));
    expect(circle).toContain('hubx-progress-circle');
    expect(circle).toContain('width:72px');
  });

  test('DescriptionsCard 把长字段放到整行，空文件列表走 EmptyState', () => {
    const fields = renderToStaticMarkup(createElement(DescriptionsCard, {
      bare: true,
      columns: 1,
      items: [
        { key: 'owner', label: '负责人', value: '张三' },
        { key: 'scope', label: '服务范围', long: true, value: '中台数据接入' },
      ],
    }));
    expect(fields).toContain('hubx-descriptions--1');
    expect(fields).toContain('hubx-descriptions--long');
    expect(fields).not.toContain('hubx-section-card');

    const empty = renderToStaticMarkup(createElement(EmptyState, { description: '侧栏里还没有附件' }));
    expect(empty).toContain('hubx-empty-state');
    expect(empty).toContain('侧栏里还没有附件');
  });

  test('DocumentActionRow exposes the primary-document variant and actions slot', () => {
    const markup = renderInRouter(
      createElement(DocumentActionRow, {
        context: '合同终稿',
        name: '软件服务合同-V3.docx',
        meta: '在线编辑版 · V3',
        variant: 'quiet',
        actions: createElement('button', null, '在线查看'),
      }),
    );

    expect(markup).toContain('hubx-document-action-row');
    expect(markup).toContain('hubx-document-action-row--quiet');
    expect(markup).toContain('合同终稿');
    expect(markup).toContain('软件服务合同-V3.docx');
    expect(markup).toContain('在线查看');
  });

  test('ProcessOverview can render an identity header without a progress bar', () => {
    const markup = renderInRouter(
      createElement(ProcessOverview, {
        identifier: 'PRJ-002',
        title: '交付计划',
        actions: createElement('button', null, '重新配置'),
      }),
    );

    expect(markup).toContain('PRJ-002');
    expect(markup).toContain('重新配置');
    expect(markup).toContain('hubx-process-overview--without-steps');
    expect(markup).not.toContain('流程进度');
    expect(markup).not.toContain('hubx-process-overview__steps');
  });

  test('SplitLayout exposes the shared 70:30 content regions', () => {
    const markup = renderInRouter(
      createElement(
        SplitLayout,
        null,
        createElement(SplitLayoutMain, null, '主工作区'),
        createElement(SplitLayoutAside, null, '业务过程区'),
      ),
    );

    expect(markup).toContain('hubx-process-workspace__main');
    expect(markup).toContain('hubx-process-workspace__aside');
    expect(markup).toContain('<aside');
  });

  test('ProcessRecordCard keeps title, status, identifier, summary and action in one record', () => {
    const markup = renderInRouter(
      createElement(ProcessRecordCard, {
        title: '客户管理系统报价',
        tags: createElement('span', null, '待报价'),
        identifier: 'QT-2026-18',
        summary: createElement('span', null, '报价 ¥68,000'),
        actions: createElement('button', null, '进入工作台'),
      }),
    );

    expect(markup).toContain('<article');
    expect(markup).toContain('hubx-process-record-card__title');
    expect(markup).toContain('QT-2026-18');
    expect(markup).toContain('报价 ¥68,000');
    expect(markup).toContain('进入工作台');
  });

  test('ProcessRecordCard exposes a details slot for rich process notes', () => {
    const markup = renderInRouter(
      createElement(ProcessRecordCard, {
        title: '会议纪要',
        details: createElement('p', null, '记录正文'),
      }),
    );

    expect(markup).toContain('hubx-process-record-card__details');
    expect(markup).toContain('记录正文');
  });

  test('ProcessPanelSection owns process-tab action spacing and content slots', () => {
    const markup = renderInRouter(
      createElement(
        ProcessPanelSection,
        { actions: createElement('button', null, '新增记录') },
        createElement('div', null, '记录列表'),
      ),
    );

    expect(markup).toContain('hubx-process-panel-section');
    expect(markup).toContain('hubx-process-panel-section__actions');
    expect(markup).toContain('hubx-process-panel-section__content');
    expect(markup).toContain('记录列表');
  });

  test('ProcessRecordCard exposes an accessible whole-card action when clickable', () => {
    const markup = renderInRouter(
      createElement(ProcessRecordCard, {
        title: '长沙出差申请',
        onClick: () => undefined,
        ariaLabel: '展开长沙出差详情',
      }),
    );

    expect(markup).toContain('hubx-process-record-card--interactive');
    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('aria-label="展开长沙出差详情"');
  });

  test('FeatureWorkloadMatrix keeps workload rows, merged groups and totals in one business component', () => {
    const markup = renderInRouter(
      createElement(FeatureWorkloadMatrix, {
        endpoints: [{ key: 'web', name: 'Web 端', platforms: ['PC'] }],
        modules: [{ key: 'account', endpointKey: 'web', name: '账号', subFeatures: [{ key: 'login', name: '登录' }] }],
        roles: [{ key: 'fe', name: '前端', dailyRate: 1200 }],
        units: [{ subFeatureKeys: ['login'], totalDays: 2, workloads: { fe: 2 } }],
      }),
    );

    expect(markup).toContain('hubx-feature-workload-matrix');
    expect(markup).toContain('Web 端');
    expect(markup).toContain('登录');
    expect(markup).toContain('研发人天合计');
    expect(markup).toContain('¥2,400');
  });

  test('FeatureWorkloadMatrix can reuse the same structure for risk-only read models', () => {
    const markup = renderInRouter(
      createElement(FeatureWorkloadMatrix, {
        endpoints: [{ key: 'admin', name: '管理后台' }],
        modules: [{ key: 'audit', endpointKey: 'admin', name: '审计', subFeatures: [{ key: 'log', name: '操作日志' }] }],
        roles: [{ key: 'qa', name: '测试工程师' }],
        units: [{ subFeatureKeys: ['log'], totalDays: 1, workloads: { qa: 1 }, risk: createElement(StatusTag, { tone: 'warning' }, '中') }],
        showSummary: false,
        showRiskColumn: true,
      }),
    );

    expect(markup).toContain('管理后台');
    expect(markup).toContain('风险');
    expect(markup).toContain('中');
    expect(markup).not.toContain('研发人天合计');
  });

  test('RiskRadarGrid keeps risk semantics with a stable label/value/detail hierarchy', () => {
    const markup = renderInRouter(
      createElement(RiskRadarGrid, {
        items: [{ key: 'margin', label: '毛利率', value: '32.5%', detail: '高于风控底线', tone: 'safe' }],
      }),
    );

    expect(markup).toContain('hubx-risk-radar-grid');
    expect(markup).toContain('hubx-risk-radar-card--safe');
    expect(markup).toContain('毛利率');
    expect(markup).toContain('32.5%');
    expect(markup).toContain('高于风控底线');
  });

  test('ProcessStepper exposes horizontal status semantics without page-level markup', () => {
    const markup = renderInRouter(
      createElement(ProcessStepper, {
        nodes: [
          { key: 'review', index: 1, title: '商务审核', subtitle: '李四', status: 'approved', statusLabel: '已通过' },
          { key: 'stamp', index: '印', title: '企业公章', subtitle: '印章管理员', status: 'active', statusLabel: '待盖章' },
        ],
      }),
    );

    expect(markup).toContain('hubx-process-stepper');
    expect(markup).toContain('hubx-process-stepper__node--approved');
    expect(markup).toContain('hubx-process-stepper__node--active');
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain('待盖章');
  });

  test('RoleRateGrid keeps editable cost inputs and formatted subtotals together', () => {
    const markup = renderInRouter(
      createElement(RoleRateGrid, {
        items: [{ key: 'fe', name: '前端开发', days: 2.5, dailyRate: 800 }],
        readonly: true,
      }),
    );

    expect(markup).toContain('hubx-role-rate-grid');
    expect(markup).toContain('前端开发');
    expect(markup).toContain('2.5 人天');
    expect(markup).toContain('¥2,000');
  });

  test('EvaluationWorkloadTable owns endpoint grouping and workload cell slots', () => {
    const markup = renderInRouter(
      createElement(EvaluationWorkloadTable, {
        rows: [
          { key: 'row-1', endpointKey: 'web', endpointName: 'Web 端', platforms: ['PC'], moduleName: '账号', subFeatures: ['登录'], granularity: '单项', totalDays: 1.5 },
          { key: 'row-2', endpointKey: 'web', endpointName: 'Web 端', platforms: ['PC'], moduleName: '账号', subFeatures: ['角色'], granularity: '单项', totalDays: 2 },
        ],
        roles: [{ key: 'fe', name: '前端开发' }],
        renderWorkloadCell: () => '1.5',
      }),
    );

    expect(markup).toContain('hubx-evaluation-workload-table');
    expect(markup).toContain('rowspan="2"');
    expect(markup).toContain('Web 端');
    expect(markup).toContain('前端开发');
    expect(markup).toContain('1.5');
  });

  test('WorkloadNumericInput exposes the shared fill navigation contract', () => {
    const markup = renderToStaticMarkup(
      createElement(WorkloadNumericInput, {
        value: 1.5,
        unitId: 'row-1',
        roleKey: 'fe',
        rowIds: ['row-1', 'row-2'],
        roleKeys: ['fe'],
        fillRef: { current: null },
        onChangeValue: () => undefined,
      }),
    );

    expect(markup).toContain('hubx-workload-numeric-input');
    expect(markup).toContain('data-fill="row-1-fe"');
    expect(markup).toContain('value="1.5"');
  });

  test('DormitoryRoomBoard keeps room filters, bed states and actions in one business component', () => {
    const markup = renderInRouter(
      createElement(DormitoryRoomBoard, {
        floors: [{
          key: 'floor-1',
          label: '1F 楼层',
          roomCount: 1,
          bedCount: 2,
          occupiedCount: 1,
          rooms: [{
            key: 'room-101',
            roomNumber: '101',
            roomTypeKey: 'double',
            roomTypeLabel: '双人间',
            facilities: ['空调'],
            beds: [
              { key: 'bed-1', label: '1号床', occupied: true, occupantName: '张三', stayLabel: '长期员工' },
              { key: 'bed-2', label: '2号床', occupied: false },
            ],
          }],
        }],
        statusFilter: 'all',
        onStatusFilterChange: () => undefined,
        roomTypeFilter: 'all',
        onRoomTypeFilterChange: () => undefined,
      }),
    );

    expect(markup).toContain('hubx-dormitory-room-board');
    expect(markup).toContain('1F 楼层');
    expect(markup).toContain('101 室');
    expect(markup).toContain('张三');
    expect(markup).toContain('点击办理入住');
  });

  test('WeChatIcon renders the shared SVG asset at the requested size', () => {
    const markup = renderInRouter(createElement(WeChatIcon, { size: 14 }));

    expect(markup).toContain('hubx-wechat-icon');
    expect(markup).toContain('width="14"');
    expect(markup).toContain('height="14"');
    expect(markup).toContain('aria-hidden="true"');
  });
});

describe('StatusTag 是状态与分类的唯一出口', () => {
  test('九个 tone 各自渲染对应语义类，分类色不复用状态色', async () => {
    for (const tone of ['neutral', 'info', 'success', 'warning', 'danger', 'purple', 'cyan', 'pink', 'gold'] as const) {
      const markup = renderToStaticMarkup(createElement(StatusTag, { tone }, tone));
      expect(markup).toContain(`hubx-status-tag--${tone}`);
    }
  });

  test('meta 优先于 tone 与 children，未定义状态退回中性灰', async () => {
    const markup = renderToStaticMarkup(
      createElement(StatusTag, { tone: 'danger', meta: { label: '已归档', tone: 'success' }, children: '忽略' }),
    );
    expect(markup).toContain('hubx-status-tag--success');
    expect(markup).toContain('已归档');
    expect(markup).not.toContain('忽略');

    const map: StatusMap<'a'> = { a: { label: 'A', tone: 'info' } };
    expect(resolveStatus(map, 'unknown')).toEqual({ label: '未定义', tone: 'neutral' });
  });

  test('列表默认是 small，default 才用 22px 基线', () => {
    const small = renderToStaticMarkup(createElement(StatusTag, { tone: 'info' }, '需求调研'));
    expect(small).toContain('hubx-status-tag--small');

    const emphasized = renderToStaticMarkup(createElement(StatusTag, { tone: 'info', size: 'default' }, '需求调研'));
    expect(emphasized).not.toContain('hubx-status-tag--small');
    expect(emphasized).toContain('需求调研');
  });

  test('可点击标签带 role=button 与交互类，可关闭标签渲染关闭按钮', async () => {
    const clickable = renderToStaticMarkup(
      createElement(StatusTag, { onClick: () => undefined }, '快捷筛选'),
    );
    expect(clickable).toContain('role="button"');
    expect(clickable).toContain('tabindex="0"');
    expect(clickable).toContain('hubx-status-tag--interactive');

    const closable = renderToStaticMarkup(
      createElement(StatusTag, { onClose: () => undefined }, '已选条件'),
    );
    expect(closable).toContain('hubx-status-tag__close');
    expect(closable).toContain('aria-label="移除"');
  });
});

describe('等级与倒计时保持内容宽度', () => {
  test('GradeTag 只渲染一个字母，未定是问号', () => {
    expect(renderToStaticMarkup(createElement(GradeTag, { grade: 's' }))).toContain('>S<');
    expect(renderToStaticMarkup(createElement(GradeTag, { grade: null }))).toContain('>?<');
  });

  test('CountdownTag 用相对天数，空值不是 0 天', () => {
    expect(renderToStaticMarkup(createElement(CountdownTag, { days: 12 }))).toContain('余 12 天');
    expect(renderToStaticMarkup(createElement(CountdownTag, { days: 3 }))).toContain('hubx-countdown--warning');
    expect(renderToStaticMarkup(createElement(CountdownTag, { days: -5 }))).toContain('逾期 5 天');
    expect(renderToStaticMarkup(createElement(CountdownTag, { days: null }))).toContain('>—<');
    expect(renderToStaticMarkup(createElement(CountdownTag, { days: null }))).not.toContain('0 天');
  });
});
