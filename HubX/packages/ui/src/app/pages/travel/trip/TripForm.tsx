import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Button,
  Input,
  Checkbox,
  Select,
  Grid,
  Space,
  Typography,
  Message,
  Divider,
  Tag,
} from '@arco-design/web-react';
import {
  IconSave,
  IconSend,
  IconPlus,
  IconClose,
} from '@arco-design/web-react/icon';
import type { Trip, TransportMode, AccommodationType } from '../types';
import { createTrip } from '../travel-api';
import { TravelRuleEngine } from '../components/TravelRuleEngine';
import { PageHeader, PageShell } from '@/app/components/ui';

const { Text } = Typography;
const { Option } = Select;
const { Row, Col } = Grid;

const transportModes = [
  { value: 'high_speed_rail', label: '高铁' },
  { value: 'bullet_train', label: '动车' },
  { value: 'airplane', label: '飞机' },
  { value: 'self_drive', label: '自驾' },
  { value: 'bus', label: '大巴' },
  { value: 'ferry', label: '轮船' },
  { value: 'other', label: '其他' },
];

export function TripForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    // 基本信息
    customerId: '',
    customerName: '',
    projectId: '',
    projectName: '',
    purpose: '',
    // 行程信息
    destinations: [] as string[],
    destinationInput: '',
    startDate: '',
    endDate: '',
    transportModes: [] as TransportMode[],
    // 住宿信息
    accommodationIntent: 'hotel' as AccommodationType,
    // 费用预估
    estimatedTransportCost: 0,
    estimatedAccommodationCost: 0,
    estimatedMealCost: 0,
    estimatedOtherCost: 0,
    // 借款
    needLoan: false,
    loanAmount: 0,
    loanReason: '',
    // AI 验证相关
    department: '',
    companions: [] as string[],
    companionInput: '',
    hasApprovalScreenshot: false,
  });

  // 计算天数
  const calculateDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  // 计算预计总费用
  const calculateTotal = () => {
    return form.estimatedTransportCost + form.estimatedAccommodationCost + form.estimatedMealCost + form.estimatedOtherCost;
  };

  // 添加目的地
  const handleAddDestination = () => {
    if (form.destinationInput.trim() && !form.destinations.includes(form.destinationInput.trim())) {
      setForm({
        ...form,
        destinations: [...form.destinations, form.destinationInput.trim()],
        destinationInput: '',
      });
    }
  };

  // 删除目的地
  const handleRemoveDestination = (index: number) => {
    setForm({
      ...form,
      destinations: form.destinations.filter((_, i) => i !== index),
    });
  };

  // 切换交通方式
  const handleToggleTransport = (mode: TransportMode) => {
    setForm({
      ...form,
      transportModes: form.transportModes.includes(mode)
        ? form.transportModes.filter(m => m !== mode)
        : [...form.transportModes, mode],
    });
  };

  // 添加同行人
  const handleAddCompanion = () => {
    if (form.companionInput.trim() && !form.companions.includes(form.companionInput.trim())) {
      setForm({
        ...form,
        companions: [...form.companions, form.companionInput.trim()],
        companionInput: '',
      });
    }
  };

  // 删除同行人
  const handleRemoveCompanion = (index: number) => {
    setForm({
      ...form,
      companions: form.companions.filter((_, i) => i !== index),
    });
  };

  // 保存草稿
  const handleSaveDraft = async () => {
    if (!form.destinations.length || !form.startDate || !form.endDate) {
      Message.error('请填写目的地和日期');
      return;
    }
    setLoading(true);
    try {
      await createTrip({
        ...form,
        days: calculateDays(),
        estimatedTotalCost: calculateTotal(),
        status: 'draft',
      });
      Message.success('草稿已保存');
      navigate('/travel/trips');
    } catch (error) {
      Message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 提交申请
  const handleSubmit = async () => {
    if (!form.purpose.trim()) {
      Message.error('请填写出差目的');
      return;
    }
    if (!form.destinations.length) {
      Message.error('请添加目的地');
      return;
    }
    if (!form.startDate || !form.endDate) {
      Message.error('请选择出差日期');
      return;
    }
    if (form.needLoan && form.loanAmount <= 0) {
      Message.error('请填写借款金额');
      return;
    }
    setLoading(true);
    try {
      await createTrip({
        ...form,
        days: calculateDays(),
        estimatedTotalCost: calculateTotal(),
        status: 'pending',
      });
      Message.success('出差申请已提交');
      navigate('/travel/trips');
    } catch (error) {
      Message.error('提交失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell breadcrumbs={[{ label: '差旅管理', to: '/travel/trips' }, { label: '出差申请', to: '/travel/trips' }, { label: '新建出差申请' }]}>
      <PageHeader title="新建出差申请" description="填写关联对象、行程安排、费用预估与借款需求，保存草稿或提交审批。" />

      {/* 主体：表单左侧 + AI右侧 */}
      <Row gutter={16}>
        {/* 左侧：表单（2/3） */}
        <Col span={16}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {/* 基本信息 */}
            <Card title="基本信息">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 8 }}><Text>关联客户</Text></div>
                    <Input
                      placeholder="选择客户（可选）"
                      value={form.customerName}
                      onChange={(value) => setForm({ ...form, customerName: value })}
                    />
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 8 }}><Text>关联项目</Text></div>
                    <Input
                      placeholder="选择项目（可选）"
                      value={form.projectName}
                      onChange={(value) => setForm({ ...form, projectName: value })}
                    />
                  </Col>
                </Row>
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Text>出差目的</Text> <Text type="error">*</Text>
                  </div>
                  <Input.TextArea
                    placeholder="请填写出差目的"
                    rows={3}
                    value={form.purpose}
                    onChange={(value) => setForm({ ...form, purpose: value })}
                  />
                </div>
                <div>
                  <div style={{ marginBottom: 8 }}><Text>所属部门</Text></div>
                  <Select
                    placeholder="选择部门"
                    value={form.department}
                    onChange={(value) => setForm({ ...form, department: value })}
                    style={{ width: '100%' }}
                  >
                    <Option value="技术部">技术部</Option>
                    <Option value="销售部">销售部</Option>
                    <Option value="市场部">市场部</Option>
                    <Option value="行政部">行政部</Option>
                    <Option value="财务部">财务部</Option>
                    <Option value="人力资源部">人力资源部</Option>
                    <Option value="产品部">产品部</Option>
                    <Option value="运营部">运营部</Option>
                  </Select>
                </div>
              </Space>
            </Card>

            {/* 行程信息 */}
            <Card title="行程信息">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Text>目的地</Text> <Text type="error">*</Text>
                  </div>
                  <Space>
                    <Input
                      placeholder="输入目的地"
                      value={form.destinationInput}
                      onChange={(value) => setForm({ ...form, destinationInput: value })}
                      onPressEnter={handleAddDestination}
                      style={{ width: 300 }}
                    />
                    <Button onClick={handleAddDestination}>添加</Button>
                  </Space>
                  {form.destinations.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Space wrap>
                        {form.destinations.map((dest, index) => (
                          <Tag
                            key={index}
                            closable
                            onClose={() => handleRemoveDestination(index)}
                          >
                            {dest}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                </div>
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ marginBottom: 8 }}>
                      <Text>出发日期</Text> <Text type="error">*</Text>
                    </div>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(value) => setForm({ ...form, startDate: value })}
                    />
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: 8 }}>
                      <Text>返回日期</Text> <Text type="error">*</Text>
                    </div>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(value) => setForm({ ...form, endDate: value })}
                    />
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: 8 }}><Text>出差天数</Text></div>
                    <Input
                      value={calculateDays() ? `${calculateDays()}天` : ''}
                      disabled
                      placeholder="自动计算"
                    />
                  </Col>
                </Row>
                <div>
                  <div style={{ marginBottom: 8 }}><Text>交通方式</Text></div>
                  <Checkbox.Group
                    value={form.transportModes}
                    onChange={(values) => setForm({ ...form, transportModes: values as TransportMode[] })}
                  >
                    <Space wrap>
                      {transportModes.map((mode) => (
                        <Checkbox key={mode.value} value={mode.value}>
                          {mode.label}
                        </Checkbox>
                      ))}
                    </Space>
                  </Checkbox.Group>
                </div>
                <div>
                  <div style={{ marginBottom: 8 }}><Text>同行人员</Text></div>
                  <Space>
                    <Input
                      placeholder="输入同行人姓名"
                      value={form.companionInput}
                      onChange={(value) => setForm({ ...form, companionInput: value })}
                      onPressEnter={handleAddCompanion}
                      style={{ width: 300 }}
                    />
                    <Button onClick={handleAddCompanion}>添加</Button>
                  </Space>
                  {form.companions.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Space wrap>
                        {form.companions.map((name, index) => (
                          <Tag
                            key={index}
                            closable
                            onClose={() => handleRemoveCompanion(index)}
                          >
                            {name}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                </div>
                <Checkbox
                  checked={form.hasApprovalScreenshot}
                  onChange={(checked) => setForm({ ...form, hasApprovalScreenshot: checked })}
                >
                  已上传审批截图
                </Checkbox>
              </Space>
            </Card>

            {/* 住宿信息 */}
            <Card title="住宿信息">
              <div>
                <div style={{ marginBottom: 8 }}><Text>住宿方式意向</Text></div>
                <Select
                  value={form.accommodationIntent}
                  onChange={(value) => setForm({ ...form, accommodationIntent: value as AccommodationType })}
                  style={{ width: '100%' }}
                >
                  <Option value="hotel">酒店</Option>
                  <Option value="dormitory">公司宿舍</Option>
                  <Option value="none">无住宿</Option>
                </Select>
              </div>
            </Card>

            {/* 费用预估 */}
            <Card title="费用预估">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 8 }}><Text>预计交通费</Text></div>
                    <Input
                      type="number"
                      placeholder="¥0"
                      value={form.estimatedTransportCost || ''}
                      onChange={(value) => setForm({ ...form, estimatedTransportCost: Number(value) })}
                    />
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 8 }}><Text>预计住宿费</Text></div>
                    <Input
                      type="number"
                      placeholder="¥0"
                      value={form.estimatedAccommodationCost || ''}
                      onChange={(value) => setForm({ ...form, estimatedAccommodationCost: Number(value) })}
                    />
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 8 }}><Text>预计餐饮费</Text></div>
                    <Input
                      type="number"
                      placeholder="¥0"
                      value={form.estimatedMealCost || ''}
                      onChange={(value) => setForm({ ...form, estimatedMealCost: Number(value) })}
                    />
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 8 }}><Text>预计其他费用</Text></div>
                    <Input
                      type="number"
                      placeholder="¥0"
                      value={form.estimatedOtherCost || ''}
                      onChange={(value) => setForm({ ...form, estimatedOtherCost: Number(value) })}
                    />
                  </Col>
                </Row>
                <Divider />
                <div style={{ textAlign: 'right' }}>
                  <div><Text type="secondary">预计总费用</Text></div>
                  <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{calculateTotal().toLocaleString()}</div>
                </div>
              </Space>
            </Card>
          </Space>
        </Col>

        {/* 右侧：AI 合规检查（1/3） */}
        <Col span={8}>
          <div style={{ position: 'sticky', top: 16 }}>
            <TravelRuleEngine
              destinationCity={form.destinations[0] || ''}
              department={form.department}
              travelDays={calculateDays()}
              companions={form.companions}
              transportType={form.transportModes[0] || ''}
              hasApprovalScreenshot={form.hasApprovalScreenshot}
            />
          </div>
        </Col>
      </Row>

      {/* 借款申请 */}
      <Card title="借款申请" style={{ maxWidth: 800 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Checkbox
            checked={form.needLoan}
            onChange={(checked) => setForm({ ...form, needLoan: checked })}
          >
            需要借款
          </Checkbox>
          {form.needLoan && (
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text>借款金额</Text> <Text type="error">*</Text>
                </div>
                <Input
                  type="number"
                  placeholder="¥0"
                  value={form.loanAmount || ''}
                  onChange={(value) => setForm({ ...form, loanAmount: Number(value) })}
                />
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}><Text>借款理由</Text></div>
                <Input
                  placeholder="请填写借款理由"
                  value={form.loanReason}
                  onChange={(value) => setForm({ ...form, loanReason: value })}
                />
              </Col>
            </Row>
          )}
        </Space>
      </Card>

      {/* 操作按钮 */}
      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={() => navigate('/travel/trips')}>取消</Button>
          <Button
            icon={<IconSave />}
            onClick={handleSaveDraft}
            loading={loading}
          >
            保存草稿
          </Button>
          <Button
            type="primary"
            icon={<IconSend />}
            onClick={handleSubmit}
            loading={loading}
          >
            提交申请
          </Button>
        </Space>
      </div>
    </PageShell>
  );
}
