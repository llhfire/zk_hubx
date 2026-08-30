import { useMemo, useState } from 'react';
import { Alert, Badge, Button, DatePicker, Descriptions, Drawer, Form, Grid, Input, Message, Modal, Select, Space, Table, Tag, Upload } from '@arco-design/web-react';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import { useNavigate } from 'react-router';
import { useQuotation } from '../QuotationContext';
import { useContracts } from '../../contracts/ContractsContext';
import { buildQuoteDiff, buildSupplementImpact } from '../quoteDiff';
import type { Quote } from '../types';
import { advanceSigningPackage, buildQuoteComplianceArchive, complianceSummary } from '../../sales-compliance/complianceModel';
import type { ElectronicSigningPackage, ElectronicSigningStatus } from '../../sales-compliance/types';
import { useEmployee } from '../../employee/EmployeeContext';
import { QUOTE_STATUS_LABELS } from '../types';

const Row = Grid.Row;
const Col = Grid.Col;

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function QuoteGovernancePanel({ quote }: { quote: Quote }) {
  const navigate = useNavigate();
  const { quotes, updateQuote } = useQuotation();
  const { contracts } = useContracts();
  const { employees } = useEmployee();
  const [diffVisible, setDiffVisible] = useState(false);
  const [proxyVisible, setProxyVisible] = useState(false);
  const [signingVisible, setSigningVisible] = useState(false);
  const [complianceVisible, setComplianceVisible] = useState(false);
  const [proxyForm] = Form.useForm();
  const [signingForm] = Form.useForm();

  const previous = quote.previousQuoteId ? quotes.find((item) => item.id === quote.previousQuoteId) : undefined;
  const parentContract = quote.contractId ? contracts.find((item) => item.id === quote.contractId) : undefined;
  const linkedContract = contracts.find((item) => item.id === (quote.generatedContractId || quote.contractId));
  const diff = useMemo(() => previous ? buildQuoteDiff(previous, quote) : [], [previous, quote]);
  const compliance = useMemo(() => buildQuoteComplianceArchive(quote, linkedContract), [linkedContract, quote]);
  const summary = complianceSummary(compliance);
  const activeProxies = (quote.proxies ?? []).filter((item) => !item.revokedAt && new Date(item.endAt) >= new Date());

  const saveProxy = async () => {
    const values = await proxyForm.validate();
    if (['confirmed', 'voided'].includes(quote.status)) return Message.warning('终态报价不能设置代理');
    if (new Date(values.endAt) <= new Date(values.startAt)) return Message.warning('代理结束时间必须晚于开始时间');
    const overlapping = (quote.proxies ?? []).some((item) => !item.revokedAt && item.responsibility === values.responsibility && new Date(item.startAt) <= new Date(values.endAt) && new Date(item.endAt) >= new Date(values.startAt));
    if (overlapping) return Message.warning('同一职责已存在重叠代理时段');
    const principalName = values.responsibility === 'sales' ? quote.salesOwnerName : quote.basicInfo.techEvaluatorName;
    await updateQuote(quote.id, (current) => ({ ...current, proxies: [...(current.proxies ?? []), { id: `proxy-${Date.now()}`, responsibility: values.responsibility, principalName, proxyName: values.proxyName, startAt: values.startAt, endAt: values.endAt }], timeline: [...current.timeline, { id: `ev-${Date.now()}`, action: 'create_proxy', actorName: principalName, actorRole: values.responsibility === 'sales' ? '销售' : '技术评估', time: new Date().toISOString(), note: `${values.proxyName} 代理至 ${values.endAt}` }] }));
    setProxyVisible(false);
    Message.success('限时代理已设置，原责任人保持不变');
  };

  const createSigning = async () => {
    const values = await signingForm.validate();
    if (!['stamped', 'sent', 'confirmed'].includes(quote.status)) return Message.warning('内部用印完成后才能创建外部签署演示包');
    const signers = String(values.signers).split('\n').map((line, index) => {
      const [name, phone] = line.split(/[,，]/).map((item) => item.trim());
      return { id: `signer-${index + 1}`, name, phone, order: index + 1, status: 'waiting' as const };
    }).filter((item) => item.name && item.phone);
    if (!signers.length) return Message.warning('请至少填写一位签署人及手机号');
    const now = new Date().toISOString();
    const pkg: ElectronicSigningPackage = { id: `signing-${Date.now()}`, status: 'pending', signers, deadline: values.deadline, createdAt: now, updatedAt: now, evidence: [] };
    await updateQuote(quote.id, (current) => ({ ...current, signingPackage: pkg, timeline: [...current.timeline, { id: `ev-${Date.now()}`, action: 'create_signing_package', actorName: current.salesOwnerName, actorRole: '销售', time: now, note: '创建 α 电子签署演示包' }] }));
    setSigningVisible(false);
    Message.success('电子签署演示包已创建');
  };

  const advanceSigning = async (status: ElectronicSigningStatus) => {
    if (!quote.signingPackage) return;
    try {
      await updateQuote(quote.id, (current) => ({ ...current, signingPackage: advanceSigningPackage(current.signingPackage!, status), timeline: [...current.timeline, { id: `ev-${Date.now()}`, action: 'advance_signing', actorName: current.salesOwnerName, actorRole: '销售', time: new Date().toISOString(), note: `签署演示状态更新为 ${status}` }] }));
      Message.success('签署演示状态已更新');
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '状态更新失败');
    }
  };

  const uploadEvidence = async (files: UploadItem[]) => {
    const file = files.at(-1)?.originFile;
    if (!file || !quote.signingPackage) return;
    const evidence = { id: `sign-evidence-${Date.now()}`, name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, url: URL.createObjectURL(file), uploadedAt: new Date().toISOString() };
    await updateQuote(quote.id, (current) => ({ ...current, signingPackage: { ...current.signingPackage!, evidence: [...current.signingPackage!.evidence, evidence], updatedAt: new Date().toISOString() } }));
    Message.success('线下签署证据已保存，可真实预览或下载');
  };

  const exportArchive = (format: 'html' | 'json') => {
    if (format === 'json') return download(`${quote.quoteNo}-合规档案.json`, JSON.stringify({ quoteId: quote.id, generatedAt: new Date().toISOString(), summary, items: compliance }, null, 2), 'application/json;charset=utf-8');
    const rows = compliance.map((item) => `<tr><td>${item.label}</td><td>${item.status}</td><td>${item.source}</td><td>${item.detail}</td></tr>`).join('');
    download(`${quote.quoteNo}-合规档案.html`, `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${quote.quoteNo} 合规档案</title><body><h1>${quote.quoteNo} 销售合规档案</h1><p>生成时间：${new Date().toLocaleString('zh-CN')}</p><table border="1" cellspacing="0" cellpadding="8"><tr><th>证据</th><th>状态</th><th>来源</th><th>说明</th></tr>${rows}</table></body></html>`, 'text/html;charset=utf-8');
  };

  return <>
    <Space wrap className="quotation-workbench__related-actions">
      {previous && <Button size="small" onClick={() => setDiffVisible(true)}>版本差异</Button>}
      {quote.isSupplement && parentContract && <Button size="small" onClick={() => setDiffVisible(true)}>变更影响</Button>}
      {!['confirmed', 'voided'].includes(quote.status) && <Button size="small" onClick={() => { proxyForm.resetFields(); setProxyVisible(true); }}>设置代理</Button>}
      <Button size="small" onClick={() => { signingForm.resetFields(); setSigningVisible(true); }}>签署演示</Button>
      <Button size="small" onClick={() => setComplianceVisible(true)}>合规档案 <Badge count={summary.missing + summary.anomaly} /></Button>
    </Space>

    <Drawer title={quote.isSupplement ? '补充报价变更影响' : '重新报价版本差异'} visible={diffVisible} width={720} onCancel={() => setDiffVisible(false)} footer={null}>
      {previous && <Table rowKey="key" pagination={false} data={diff} columns={[{ title: '对比项', dataIndex: 'label', width: 120 }, { title: previous.quoteNo, dataIndex: 'before' }, { title: quote.quoteNo, dataIndex: 'after' }, { title: '结果', width: 90, render: (_: unknown, item: typeof diff[number]) => <Tag color={item.changed ? 'orange' : 'gray'}>{item.changed ? '有变化' : '一致'}</Tag> }]} />}
      {quote.isSupplement && parentContract && (() => { const impact = buildSupplementImpact(quote, parentContract); return <Descriptions column={1} data={[{ label: '当前有效合同额', value: `¥${impact.contractAmount.toLocaleString()}` }, { label: '本次变更额', value: `¥${impact.changeAmount.toLocaleString()}` }, { label: '变更后有效标的额', value: `¥${impact.effectiveAmount.toLocaleString()}` }, { label: '变更功能项', value: `${impact.featureCount} 项` }, { label: '工期影响', value: `${impact.scheduleChangeDays} 个工作日` }]} />; })()}
    </Drawer>

    <Modal title="设置限时代理" visible={proxyVisible} onCancel={() => setProxyVisible(false)} onOk={saveProxy} okText="确认代理">
      <Alert type="info" content="代理仅覆盖销售报价处理或技术评估，不覆盖审批、会签、盖章和合同审批；原责任人不变。" showIcon />
      <Form form={proxyForm} layout="vertical"><Form.Item label="代理职责" field="responsibility" rules={[{ required: true }]}><Select><Select.Option value="sales">销售报价处理</Select.Option><Select.Option value="technical_evaluation">技术评估</Select.Option></Select></Form.Item><Form.Item label="代理人" field="proxyName" rules={[{ required: true }]}><Select showSearch options={employees.map((item) => ({ value: item.name, label: `${item.name} · ${item.department}` }))} /></Form.Item><Row gutter={16}><Col span={12}><Form.Item label="开始时间" field="startAt" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item label="结束时间" field="endAt" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col></Row></Form>
      {activeProxies.length > 0 && <div><strong>当前代理</strong>{activeProxies.map((proxy) => <div key={proxy.id}><Space><Tag>{proxy.responsibility === 'sales' ? '销售' : '评估'}</Tag><span>{proxy.principalName} → {proxy.proxyName}</span><Button type="text" size="mini" status="danger" onClick={() => updateQuote(quote.id, (current) => ({ ...current, proxies: current.proxies?.map((item) => item.id === proxy.id ? { ...item, revokedAt: new Date().toISOString() } : item) }))}>撤销</Button></Space></div>)}</div>}
    </Modal>

    <Modal title="电子签署演示" visible={signingVisible} onCancel={() => setSigningVisible(false)} onOk={quote.signingPackage ? () => setSigningVisible(false) : createSigning} okText={quote.signingPackage ? '关闭' : '创建演示包'} style={{ width: 680 }}>
      <Alert type="warning" content="α 签署演示，不具有电子签名法律效力。系统不会生成或伪造个人签名。" showIcon />
      {!quote.signingPackage ? <Form form={signingForm} layout="vertical"><Form.Item label="签署人（每行：姓名,手机号）" field="signers" rules={[{ required: true }]}><Input.TextArea rows={4} placeholder={'陈女士,13800005942\n周工,13900005942'} /></Form.Item><Form.Item label="签署截止时间" field="deadline" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Form> : <Space direction="vertical" style={{ width: '100%' }}><Descriptions column={1} data={[{ label: '状态', value: <Tag>{quote.signingPackage.status}</Tag> }, { label: '截止时间', value: quote.signingPackage.deadline }, { label: '签署顺序', value: quote.signingPackage.signers.map((item) => `${item.order}. ${item.name} ${item.phone}`).join('；') }]} /><Space wrap>{quote.signingPackage.status === 'pending' && <Button onClick={() => advanceSigning('signing')}>开始签署</Button>}{quote.signingPackage.status === 'signing' && <><Button type="primary" onClick={() => advanceSigning('completed')}>模拟全部完成</Button><Button status="danger" onClick={() => advanceSigning('refused')}>模拟拒签</Button><Button onClick={() => advanceSigning('expired')}>标记过期</Button></>}{['pending', 'signing'].includes(quote.signingPackage.status) && <Button status="warning" onClick={() => advanceSigning('revoked')}>撤销演示包</Button>}</Space><Upload autoUpload={false} limit={5} multiple onChange={uploadEvidence} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"><Button>上传线下签署证据</Button></Upload>{quote.signingPackage.evidence.map((file) => <Space key={file.id}><span>{file.name}</span>{file.url && <Button type="text" size="mini" onClick={() => window.open(file.url, '_blank')}>预览</Button>}</Space>)}</Space>}
    </Modal>

    <Drawer title="销售合规档案" visible={complianceVisible} width={760} onCancel={() => setComplianceVisible(false)} footer={<Space><Button onClick={() => exportArchive('html')}>导出 HTML 摘要</Button><Button onClick={() => exportArchive('json')}>导出 JSON 元数据</Button></Space>}>
      <Alert type={summary.anomaly ? 'error' : summary.missing ? 'warning' : 'success'} content={`完整 ${summary.complete} 项，缺失 ${summary.missing} 项，异常 ${summary.anomaly} 项。档案由现有业务证据自动投影，不另设审批门槛。`} showIcon />
      <Table rowKey="key" pagination={false} data={compliance} columns={[{ title: '证据', dataIndex: 'label', width: 150 }, { title: '状态', width: 90, render: (_: unknown, item: typeof compliance[number]) => <Badge status={item.status === 'complete' ? 'success' : item.status === 'anomaly' ? 'error' : 'warning'} text={item.status === 'complete' ? '完整' : item.status === 'anomaly' ? '异常' : '缺失'} /> }, { title: '事实来源', dataIndex: 'source', width: 150 }, { title: '说明', dataIndex: 'detail' }, { title: '下钻', width: 80, render: (_: unknown, item: typeof compliance[number]) => item.route ? <Button type="text" size="mini" onClick={() => navigate(item.route!)}>查看</Button> : '—' }]} />
    </Drawer>
  </>;
}
