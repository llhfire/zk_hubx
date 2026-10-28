import { useState } from 'react';
import {
  Button,
  CountdownTag,
  DataTable,
  DateText,
  DescriptionsCard,
  EmptyState,
  EntityLink,
  FileList,
  GradeTag,
  IconArrowRight,
  IconPlus,
  IconSearch,
  IdentifierText,
  Input,
  MetricCard,
  MetricGrid,
  MoneyText,
  ProgressBar,
  SectionCard,
  Select,
  StatusTag,
} from '@/design-system';
import { DEMO_FILES, DEMO_STAGE, matureListRows } from './fixtures';

export function DataDisplayDemos() {
  return (
    <SectionCard title="展示组件" description="表格、指标、字段区、空态、进度、文件行 —— 页面不再直接拼 Arco 的同名组件。">
      <div className="ui-library-preview">
        <div className="ui-library-preview__label">DataTable — 工具栏 / 操作列 / 说明 / 空态</div>
        <DataTable
          rowKey="key"
          pagination={false}
          caption="共 3 条"
          toolbar={<><Input prefix={<IconSearch />} placeholder="搜索线索" style={{ width: 200 }} /><Select placeholder="当前步骤" style={{ width: 140 }} options={['初步沟通', '需求调研', '方案报价']} /></>}
          actions={<Button type="primary" icon={<IconPlus />}>新建线索</Button>}
          data={matureListRows}
          columns={[
            { title: '线索名称', dataIndex: 'name', width: 220 },
            { title: '联系人', dataIndex: 'contact', width: 110 },
            { title: '当前步骤', dataIndex: 'stage', width: 120, render: (value: string) => <StatusTag meta={DEMO_STAGE[value] ?? { label: value, tone: 'neutral' }} /> },
            { title: '等级', width: 80, render: (_: unknown, record: typeof matureListRows[number]) => <GradeTag grade={record.level} /> },
          ]}
        />
        <div className="ui-library-demo-spacer" />
        <DataTable
          rowKey="key"
          pagination={false}
          data={[]}
          emptyDescription="当前筛选条件下没有线索"
          emptyAction={<Button type="primary" size="small">清除筛选</Button>}
          columns={[{ title: '线索名称', dataIndex: 'name' }]}
        />
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">MetricCard — 4 列业务行，单元格最小 160px，整行 880px</div>
        <div className="ui-library-size-stage ui-library-size-stage--metrics">
          <MetricCard label="本月回款" value={<MoneyText value={486000} variant="compact" />} suffix={<StatusTag tone="success" size="small">+12%</StatusTag>} detail="对比上月同期" />
          <MetricCard label="待回款" value={<MoneyText value={234500} variant="compact" />} tone="warning" detail="3 笔逾期" />
          <MetricCard label="逾期金额" value={<MoneyText value={38200} variant="compact" />} tone="danger" badge={<StatusTag tone="danger" size="small">需处理</StatusTag>} />
          <MetricCard label="在用项目" value={18} suffix="个" icon={<IconArrowRight />} />
        </div>
        <div className="ui-library-demo-caption-line">
          卡片填满所在单元格，自身不设最大宽度。空值由调用方传入，不把缺数渲染成 0。
        </div>
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-preview__label">MetricGrid — 列表页 4 项摘要，占满内容区</div>
        <MetricGrid
          columns={4}
          items={[
            { key: 'active', label: '活跃项目', value: '43 个', detail: '外包 28 · 自研 8 · 自运营 2' },
            { key: 'warning', label: '健康度预警', value: '21 个', detail: '工期延期或缺陷积压', tone: 'danger' },
            { key: 'assign', label: '待确认指派', value: '1 个', detail: '等待指派项目经理', tone: 'warning' },
            { key: 'hours', label: '本月工时投入', value: '15951.4h', detail: '全员有效工时' },
          ]}
        />
        <div className="ui-library-demo-caption-line">
          单元格约 240px 以上时，说明保持一行。不传 columns 时最小 160px 自动换行；768px 以下固定列也收成 2 列。
        </div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">DescriptionsCard — 短字段网格 + 长字段整行</div>
        <DescriptionsCard
          title="合同信息"
          extra={<Button size="mini">编辑</Button>}
          columns={3}
          items={[
            { key: 'no', label: '合同编号', value: <IdentifierText value="HT-2026-0412" /> },
            { key: 'customer', label: '客户', value: <EntityLink to="/customers">海淀智检科技有限公司</EntityLink> },
            { key: 'amount', label: '合同金额', value: <MoneyText value={320000} /> },
            { key: 'signed', label: '签订日期', value: <DateText value="2026-04-12" /> },
            { key: 'owner', label: '负责人', value: '张三' },
            { key: 'status', label: '状态', value: <StatusTag tone="info">执行中</StatusTag> },
            { key: 'scope', label: '服务范围', long: true, value: '中台数据接入、质检规则引擎、移动端巡检、报表看板四个模块的定制开发与一年期运维；含两次现场培训。' },
            { key: 'remark', label: '备注', long: true, value: '回款按 30% / 40% / 30% 三期执行，验收后 15 个工作日内结清尾款。' },
          ]}
        />
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-preview__label">无外框形态（侧栏 320px，不再包一层卡片）</div>
        <div className="ui-library-size-stage ui-library-size-stage--aside">
          <DescriptionsCard
            bare
            columns={1}
            items={[
              { key: 'created', label: '创建时间', value: <DateText value="2026-04-12 09:30" mode="datetime" /> },
              { key: 'deadline', label: '剩余工期', value: <CountdownTag days={18} /> },
            ]}
          />
        </div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">ProgressBar — 卡片内条形，整组不超过 720px</div>
        <div className="ui-library-size-stage ui-library-size-stage--progress">
          <div>
            <div className="ui-library-demo-caption">size=small · 轨道 4px</div>
            <ProgressBar percent={42} label="需求调研" size="small" />
          </div>
          <div>
            <div className="ui-library-demo-caption">size=default · 轨道 6px</div>
            <ProgressBar percent={65} label="开发实施" />
          </div>
          <div>
            <div className="ui-library-demo-caption">size=large · 轨道 8px</div>
            <ProgressBar percent={100} label="已验收" size="large" tone="success" />
          </div>
        </div>
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-demo-row">
          <div className="ui-library-demo-cell">
            <span className="ui-library-demo-caption">160px 表格列 · 无数值行</span>
            <div className="ui-library-size-stage ui-library-size-stage--progress-cell">
              <ProgressBar percent={30} showValue={false} tone="danger" size="small" />
            </div>
          </div>
          <div className="ui-library-demo-cell">
            <span className="ui-library-demo-caption">160px 表格列 · 带逾期说明</span>
            <div className="ui-library-size-stage ui-library-size-stage--progress-cell">
              <ProgressBar percent={78} label="回款" size="small" tone="warning" valueText="78%" />
            </div>
          </div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">环形 · 默认 96px</span><ProgressBar variant="circle" percent={67} /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">环形 · success</span><ProgressBar variant="circle" percent={100} tone="success" valueText="100%" /></div>
          <div className="ui-library-demo-cell"><span className="ui-library-demo-caption">环形 · 72px</span><ProgressBar variant="circle" percent={24} tone="warning" diameter={72} /></div>
        </div>
        <div className="ui-library-demo-row">
          {(['purple', 'cyan', 'pink', 'gold'] as const).map((tone) => (
            <div key={tone} className="ui-library-demo-cell">
              <span className="ui-library-demo-caption">{tone}</span>
              <div className="ui-library-size-stage ui-library-size-stage--progress-cell">
                <ProgressBar percent={tone === 'purple' ? 80 : tone === 'cyan' ? 60 : tone === 'pink' ? 40 : 20} tone={tone} showValue={false} size="small" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">EmptyState — 说明 + 引导操作，在所在容器里居中</div>
        <EmptyState description="还没有报价记录" action={<Button type="primary" icon={<IconPlus />}>新建报价</Button>} />
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-preview__label">侧栏空态 · 320px</div>
        <div className="ui-library-size-stage ui-library-size-stage--aside">
          <EmptyState description="侧栏里还没有附件" />
        </div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">FileList — 身份在左、元数据在下、图标操作在右</div>
        <FileList items={DEMO_FILES} />
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-preview__label">窄附件区 360px · 长文件名省略</div>
        <div className="ui-library-size-stage ui-library-size-stage--file">
          <FileList
            items={[{
              key: 'long',
              name: '海淀智检中台升级-需求确认书-最终盖章版-2026-0412.pdf',
              meta: 'PDF · 2.4MB · 张伟 04-12 上传',
              onPreview: () => undefined,
              onDownload: () => undefined,
            }]}
          />
        </div>
        <div className="ui-library-demo-spacer" />
        <FileList items={[]} emptyDescription="暂无附件" />
      </div>
    </SectionCard>
  );
}
