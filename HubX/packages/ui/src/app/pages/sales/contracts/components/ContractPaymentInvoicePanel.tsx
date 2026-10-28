import {
  Button,
  Form,
  FormGrid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tooltip,
} from '@/design-system';
import { IconDelete, IconEdit, IconPlus } from '@/design-system';
import type { FormInstance } from '@/design-system';
import {
  collectionIncludesPeriod,
  getCollectionPeriods,
  type CollectionLedgerEntry,
} from '../../../../../services/collectionMutations';
import type { Contract } from '../types';
import { computePlanStatusRows, PLAN_STATUS_META } from '../paymentUtils';
import {
  DataTable,
  EmptyState,
  MetricGrid,
  MoneyText,
  PaymentPlanTable,
  SectionCard,
  StatusTag,
} from '@/design-system';

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

function contractWithCollections(contract: Contract, collections: CollectionLedgerEntry[]): Contract {
  return {
    ...contract,
    collectionRecords: collections.filter((record) => record.contractId === contract.id),
  };
}

export function hasActiveInvoiceForPlan(input: {
  contractId: string;
  period: number;
  collections: CollectionLedgerEntry[];
  invoiceRecords: PaymentInvoiceRecord[];
}): boolean {
  const collectionIds = new Set(input.collections
    .filter((record) => record.contractId === input.contractId && collectionIncludesPeriod(record, input.period))
    .map((record) => record.id));
  return input.invoiceRecords
    .filter((invoice) => collectionIds.has(invoice.collectionId))
    .reduce((sum, invoice) => sum + invoice.amount, 0) > 0;
}

export function getSelectablePaymentPlans(input: {
  contract: Contract;
  collections: CollectionLedgerEntry[];
  editingCollectionId?: string;
}) {
  const collections = input.collections.filter((record) => record.id !== input.editingCollectionId);
  return computePlanStatusRows(contractWithCollections(input.contract, collections))
    .filter((row) => row.allocated < row.plan.amount);
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

  const planStatusTags = (contract: Contract, period: number) => {
    const meta = planStatus(contract, period);
    const invoiced = hasActiveInvoiceForPlan({ contractId: contract.id, period, collections, invoiceRecords });
    return (
      <Space size={4} wrap>
        <StatusTag meta={meta} />
        {invoiced && <StatusTag tone="info">已开票</StatusTag>}
      </Space>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <MetricGrid
          items={[
            {
              key: 'contract',
              label: '合同标的额',
              value: contractAmount > 0 ? <MoneyText value={contractAmount} /> : '-',
            },
            {
              key: 'received',
              label: '已到账',
              value: receivedAmount > 0 ? <MoneyText value={receivedAmount} /> : '-',
              tone: 'success',
            },
            {
              key: 'receivable',
              label: '待回款',
              value: contractAmount > 0 ? <MoneyText value={Math.max(0, contractAmount - receivedAmount)} /> : '-',
            },
          ]}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <SectionCard title="回款期次（计划）">
          <PaymentPlanTable
            data={mainContract?.current.paymentPlans ?? []}
            showPercentage
            showCondition
            conditionWidth={160}
            renderStatus={(row) => mainContract ? planStatusTags(mainContract, row.period) : null}
          />
        </SectionCard>
      </div>

      {supplementContracts.map((supplement) => (
        <div key={supplement.id} style={{ marginBottom: 12 }}>
          <SectionCard title={`补充合同回款计划 · ${supplement.current.contractName}`}>
            <PaymentPlanTable
              data={supplement.current.paymentPlans ?? []}
              showPercentage
              showCondition
              conditionWidth={180}
              renderStatus={(row) => planStatusTags(supplement, row.period)}
              rowKeyPrefix={supplement.id}
            />
          </SectionCard>
        </div>
      ))}

      <SectionCard
        title="实收台账"
        extra={<Button type="primary" size="small" icon={<IconPlus />} disabled={!mainContract} onClick={onAddCollection}>新增实收</Button>}
      >
        {collections.length ? (
          <DataTable
            columns={[
              { title: '到账日期', dataIndex: 'date', width: 120 },
              { title: '金额', dataIndex: 'amount', width: 120, render: (value: number) => <MoneyText value={value} /> },
              { title: '方式', dataIndex: 'method', width: 120 },
              { title: '期次', width: 140, render: (_: unknown, record: CollectionLedgerEntry) => {
                const periods = getCollectionPeriods(record);
                return periods.length ? periods.map((period) => period === 'other' ? '其他' : `第${period}期`).join('、') : '-';
              } },
              { title: '说明', dataIndex: 'note' },
              { title: '开票状态', width: 100, render: (_: unknown, record: CollectionLedgerEntry) => {
                const records = invoiceRecords.filter((item) => item.collectionId === record.id);
                const validAmount = records.reduce((sum, item) => sum + item.amount, 0);
                return (
                  <StatusTag tone={validAmount > 0 ? 'success' : records.length ? 'warning' : 'neutral'}>
                    {validAmount > 0 ? '已开票' : records.length ? '已冲红' : '未开票'}
                  </StatusTag>
                );
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
            emptyDescription="暂无实收记录"
          />
        ) : <EmptyState description="暂无实收记录" />}
      </SectionCard>

      <div style={{ marginTop: 12 }}>
        <SectionCard title="开票与红冲记录">
          <DataTable
            rowKey="id"
            pagination={false}
            data={invoiceRecords}
            emptyDescription="暂无开票记录"
            columns={[
              { title: '发票号码', dataIndex: 'invoiceNo', width: 180 },
              { title: '关联实收', dataIndex: 'collectionId', width: 150 },
              { title: '金额', dataIndex: 'amount', width: 120, render: (value: number) => <MoneyText value={value} tone={value < 0 ? 'danger' : 'default'} /> },
              { title: '日期', dataIndex: 'issuedAt', width: 120 },
              { title: '状态', dataIndex: 'status', width: 90, render: (value: string) => <StatusTag tone={value === 'valid' ? 'success' : 'danger'}>{value === 'valid' ? '有效' : '已冲红'}</StatusTag> },
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
        </SectionCard>
      </div>
    </div>
  );
}

interface CollectionRecordModalProps {
  visible: boolean;
  editing: boolean;
  form: FormInstance;
  contracts?: Contract[];
  collections?: CollectionLedgerEntry[];
  editingCollectionId?: string;
  onOk: () => void;
  onCancel: () => void;
}

export function CollectionRecordModal({
  visible,
  editing,
  form,
  contracts = [],
  collections = [],
  editingCollectionId,
  onOk,
  onCancel,
}: CollectionRecordModalProps) {
  return (
    <Modal title={editing ? '编辑实收记录' : '新增实收记录'} visible={visible} onOk={onOk} onCancel={onCancel} okText="保存" cancelText="取消" style={{ width: 560 }}>
      <Form form={form} layout="vertical">
        <FormGrid columns={2}>
          <Form.Item label="到账日期" field="date" rules={[{ required: true }]}><Input type="date" /></Form.Item>
          <Form.Item label="到账金额" field="amount" rules={[{ required: true }]}><InputNumber min={0.01} prefix="¥" style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="关联合同" field="contractId" rules={[{ required: true, message: '请选择关联合同' }]}>
              <Select onChange={() => form.setFieldValue('periods', [])}>
                {contracts.map((contract) => (
                  <Select.Option key={contract.id} value={contract.id}>{contract.kind === 'supplement' ? '补充协议 · ' : ''}{contract.current.contractName}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          <Form.Item label="到账方式" field="method" rules={[{ required: true }]}><Select><Select.Option value="银行汇款">银行汇款</Select.Option><Select.Option value="支付宝">支付宝</Select.Option><Select.Option value="现金">现金</Select.Option></Select></Form.Item>
        </FormGrid>
        <Form.Item noStyle shouldUpdate={(previous, current) => previous.contractId !== current.contractId}>
          {(values) => {
            const contract = contracts.find((item) => item.id === values.contractId) ?? contracts[0];
            const selectablePlans = contract ? getSelectablePaymentPlans({ contract, collections, editingCollectionId }) : [];
            return (
              <Form.Item label="回款期次（可多选）" field="periods" rules={[{ required: true, message: '请选择至少一个回款期次' }]}>
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="可选择两期或多期合并登记"
                  onChange={(selected) => {
                    const next = selected as string[];
                    if (next.at(-1) === 'other') form.setFieldValue('periods', ['other']);
                    else if (next.includes('other')) form.setFieldValue('periods', next.filter((item) => item !== 'other'));
                  }}
                >
                  {selectablePlans.map(({ plan, allocated }) => (
                    <Select.Option key={plan.period} value={String(plan.period)}>
                      {plan.periodName || `第${plan.period}期`} · 待收 <MoneyText value={plan.amount - allocated} />
                    </Select.Option>
                  ))}
                  <Select.Option value="other">其他款项</Select.Option>
                </Select>
              </Form.Item>
            );
          }}
        </Form.Item>
        <Form.Item label="说明" field="note"><Input.TextArea placeholder="填写到账凭证或备注" /></Form.Item>
      </Form>
    </Modal>
  );
}
