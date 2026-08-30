import {
  Button,
  Card,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconDelete, IconEdit, IconPlus } from '@arco-design/web-react/icon';
import type { FormInstance } from '@arco-design/web-react/es/Form';
import type { CollectionLedgerEntry } from '@/services/collectionMutations';
import type { Contract } from '../contracts/types';
import { computePlanStatusRows, PLAN_STATUS_META } from '../contracts/paymentUtils';

const { Text } = Typography;

export interface PaymentInvoiceRecord {
  id: string;
  collectionId: string;
  invoiceNo: string;
  amount: number;
  issuedAt: string;
  status: 'valid' | 'red';
  originalInvoiceId?: string;
}

interface ContractPaymentInvoicePanelProps {
  mainContract?: Contract;
  supplementContracts: Contract[];
  contractAmount: number;
  receivedAmount: number;
  collections: CollectionLedgerEntry[];
  invoiceRecords: PaymentInvoiceRecord[];
  onAddCollection: () => void;
  onEditCollection: (record: CollectionLedgerEntry) => void;
  onDeleteCollection: (record: CollectionLedgerEntry) => void;
  onIssueInvoice: (record: CollectionLedgerEntry) => void;
  onRedInvoice: (invoice: PaymentInvoiceRecord) => void;
  onCorrectInvoice: (invoice: PaymentInvoiceRecord) => void;
  onDeleteInvoice: (invoice: PaymentInvoiceRecord) => void;
}

function money(value: number) {
  return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

function contractWithCollections(contract: Contract, collections: CollectionLedgerEntry[]): Contract {
  return {
    ...contract,
    collectionRecords: collections.filter((record) => record.contractId === contract.id),
  };
}

export function ContractPaymentInvoicePanel({
  mainContract,
  supplementContracts,
  contractAmount,
  receivedAmount,
  collections,
  invoiceRecords,
  onAddCollection,
  onEditCollection,
  onDeleteCollection,
  onIssueInvoice,
  onRedInvoice,
  onCorrectInvoice,
  onDeleteInvoice,
}: ContractPaymentInvoicePanelProps) {
  const planStatus = (contract: Contract, period: number) => {
    const status = computePlanStatusRows(contractWithCollections(contract, collections))
      .find((item) => item.plan.period === period)?.status;
    return status ? PLAN_STATUS_META[status] : PLAN_STATUS_META.pending;
  };

  return (
    <div>
      <Grid.Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        <Grid.Col span={8}>
          <div style={{ padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 6, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>合同标的额</Text>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{contractAmount > 0 ? money(contractAmount) : '-'}</div>
          </div>
        </Grid.Col>
        <Grid.Col span={8}>
          <div style={{ padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 6, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>已到账</Text>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4, color: 'rgb(var(--success-6))' }}>{receivedAmount > 0 ? money(receivedAmount) : '-'}</div>
          </div>
        </Grid.Col>
        <Grid.Col span={8}>
          <div style={{ padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: 6, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>待回款</Text>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{contractAmount > 0 ? money(Math.max(0, contractAmount - receivedAmount)) : '-'}</div>
          </div>
        </Grid.Col>
      </Grid.Row>

      <Card size="small" title="回款期次（计划）" style={{ marginBottom: 12 }}>
        {mainContract?.current.paymentPlans?.length ? (
          <Table
            columns={[
              { title: '期次', dataIndex: 'period', width: 80, render: (_: unknown, row: { periodName?: string; period: number }) => row.periodName || `第${row.period}期` },
              { title: '金额', dataIndex: 'amount', width: 120, render: (value: number) => money(value) },
              { title: '已收状态', width: 100, render: (_: unknown, row: { period: number }) => { const meta = planStatus(mainContract, row.period); return <Tag color={meta.color}>{meta.label}</Tag>; } },
              { title: '比例', dataIndex: 'percentage', width: 80, render: (value: number) => `${value}%` },
              { title: '预计日期', dataIndex: 'expectedDate', width: 120 },
              { title: '触发条件', dataIndex: 'condition', width: 160 },
            ]}
            data={mainContract.current.paymentPlans}
            pagination={false}
            rowKey="period"
          />
        ) : <Empty description="暂无回款期次" />}
      </Card>

      {supplementContracts.map((supplement) => (
        <Card key={supplement.id} size="small" title={`补充合同回款计划 · ${supplement.current.contractName}`} style={{ marginBottom: 12 }}>
          <Table
            columns={[
              { title: '期次', width: 90, render: (_: unknown, row: { periodName?: string; period: number }) => row.periodName || `第${row.period}期` },
              { title: '金额', dataIndex: 'amount', width: 120, render: (value: number) => money(value) },
              { title: '已收状态', width: 100, render: (_: unknown, row: { period: number }) => { const meta = planStatus(supplement, row.period); return <Tag color={meta.color}>{meta.label}</Tag>; } },
              { title: '比例', dataIndex: 'percentage', width: 80, render: (value: number) => `${value}%` },
              { title: '预计日期', dataIndex: 'expectedDate', width: 120 },
              { title: '触发条件', dataIndex: 'condition', width: 180 },
            ]}
            data={supplement.current.paymentPlans ?? []}
            pagination={false}
            rowKey="period"
            noDataElement={<Empty description="暂无回款期次" />}
          />
        </Card>
      ))}

      <Card
        size="small"
        title="实收台账"
        extra={<Button type="primary" size="small" icon={<IconPlus />} disabled={!mainContract} onClick={onAddCollection}>新增实收</Button>}
      >
        {collections.length ? (
          <Table
            columns={[
              { title: '到账日期', dataIndex: 'date', width: 120 },
              { title: '金额', dataIndex: 'amount', width: 120, render: (value: number) => money(value) },
              { title: '方式', dataIndex: 'method', width: 120 },
              { title: '期次', dataIndex: 'period', width: 80, render: (value: number | 'other' | undefined) => (value === 'other' ? '其他' : value ? `第${value}期` : '-') },
              { title: '说明', dataIndex: 'note' },
              { title: '开票状态', width: 100, render: (_: unknown, record: CollectionLedgerEntry) => {
                const records = invoiceRecords.filter((item) => item.collectionId === record.id);
                const validAmount = records.reduce((sum, item) => sum + item.amount, 0);
                return <Tag color={validAmount > 0 ? 'green' : records.length ? 'orange' : 'gray'}>{validAmount > 0 ? '已开票' : records.length ? '已冲红' : '未开票'}</Tag>;
              } },
              { title: '操作', width: 176, fixed: 'right' as const, render: (_: unknown, record: CollectionLedgerEntry) => (
                <Space size={2}>
                  <Tooltip content="编辑实收"><Button className="hubx-icon-action" type="text" icon={<IconEdit />} onClick={() => onEditCollection(record)} /></Tooltip>
                  <Tooltip content="开票"><Button type="text" size="small" onClick={() => onIssueInvoice(record)}>开票</Button></Tooltip>
                  <Popconfirm title="确认删除该实收记录？" onOk={() => onDeleteCollection(record)}>
                    <Tooltip content="删除"><Button className="hubx-icon-action" type="text" status="danger" icon={<IconDelete />} /></Tooltip>
                  </Popconfirm>
                </Space>
              ) },
            ]}
            data={collections}
            pagination={false}
            rowKey="id"
          />
        ) : <Empty description="暂无实收记录" />}
      </Card>

      <Card size="small" title="开票与红冲记录" style={{ marginTop: 12 }}>
        <Table
          rowKey="id"
          pagination={false}
          data={invoiceRecords}
          noDataElement={<Empty description="暂无开票记录" />}
          columns={[
            { title: '发票号码', dataIndex: 'invoiceNo', width: 180 },
            { title: '关联实收', dataIndex: 'collectionId', width: 150 },
            { title: '金额', dataIndex: 'amount', width: 120, render: (value: number) => <Text style={{ color: value < 0 ? 'rgb(var(--danger-6))' : undefined }}>{money(value)}</Text> },
            { title: '日期', dataIndex: 'issuedAt', width: 120 },
            { title: '状态', dataIndex: 'status', width: 90, render: (value: string) => <Tag color={value === 'valid' ? 'green' : 'red'}>{value === 'valid' ? '有效' : '已红冲'}</Tag> },
            { title: '操作', width: 140, fixed: 'right' as const, render: (_: unknown, invoice: PaymentInvoiceRecord) => (
              <Space size={2}>
                {invoice.status === 'valid' && !invoiceRecords.some((item) => item.originalInvoiceId === invoice.id) && <Button type="text" size="small" status="danger" onClick={() => onRedInvoice(invoice)}>冲红</Button>}
                <Tooltip content="更正发票号码"><Button className="hubx-icon-action" type="text" icon={<IconEdit />} onClick={() => onCorrectInvoice(invoice)} /></Tooltip>
                <Popconfirm title="确认删除该开票记录？" onOk={() => onDeleteInvoice(invoice)}>
                  <Tooltip content="删除"><Button className="hubx-icon-action" type="text" status="danger" icon={<IconDelete />} /></Tooltip>
                </Popconfirm>
              </Space>
            ) },
          ]}
        />
      </Card>
    </div>
  );
}

interface CollectionRecordModalProps {
  visible: boolean;
  editing: boolean;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

export function CollectionRecordModal({ visible, editing, form, onOk, onCancel }: CollectionRecordModalProps) {
  return (
    <Modal title={editing ? '编辑实收记录' : '新增实收记录'} visible={visible} onOk={onOk} onCancel={onCancel} okText="保存" cancelText="取消" style={{ width: 560 }}>
      <Form form={form} layout="vertical">
        <Grid.Row gutter={16}>
          <Grid.Col span={12}><Form.Item label="到账日期" field="date" rules={[{ required: true }]}><Input type="date" /></Form.Item></Grid.Col>
          <Grid.Col span={12}><Form.Item label="到账金额" field="amount" rules={[{ required: true }]}><InputNumber min={0.01} prefix="¥" style={{ width: '100%' }} /></Form.Item></Grid.Col>
        </Grid.Row>
        <Grid.Row gutter={16}>
          <Grid.Col span={12}><Form.Item label="回款期次" field="period"><Select><Select.Option value="1">第1期</Select.Option><Select.Option value="2">第2期</Select.Option><Select.Option value="3">第3期</Select.Option><Select.Option value="other">其他</Select.Option></Select></Form.Item></Grid.Col>
          <Grid.Col span={12}><Form.Item label="到账方式" field="method" rules={[{ required: true }]}><Select><Select.Option value="银行汇款">银行汇款</Select.Option><Select.Option value="支付宝">支付宝</Select.Option><Select.Option value="现金">现金</Select.Option></Select></Form.Item></Grid.Col>
        </Grid.Row>
        <Form.Item label="说明" field="note"><Input.TextArea placeholder="填写到账凭证或备注" /></Form.Item>
      </Form>
    </Modal>
  );
}
