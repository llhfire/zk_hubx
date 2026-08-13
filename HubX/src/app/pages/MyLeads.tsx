import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Form,
  Message,
  Space,
  Typography,
  Tooltip,
  Alert,
} from '@arco-design/web-react';
import {
  IconSearch,
  IconEye,
  IconEdit,
  IconSwap,
  IconDelete,
  IconReply,
} from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router';
import { CompanyEntityInfoModal } from './company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from './company-entity/companyEntityData';
import { useReminders } from '@/app/reminders/ReminderContext';
import type { ReminderItem } from '@/app/reminders/types';

const Title = Typography.Title;

export function getLeadFollowupReminderBanner(reminders: ReminderItem[]) {
  const leadReminders = reminders.filter(
    (reminder) => reminder.type === 'lead_followup_overdue',
  );

  if (leadReminders.length === 0) {
    return null;
  }

  const firstReminder = leadReminders[0];
  const firstTargetPath =
    firstReminder.actionTarget.kind === 'route' ? firstReminder.actionTarget.path : null;

  return {
    count: leadReminders.length,
    firstLeadId: firstReminder.sourceId,
    firstTargetPath,
  };
}

export function MyLeads() {
  const navigate = useNavigate();
  const { reminders } = useReminders();
  const leadReminderBanner = getLeadFollowupReminderBanner(reminders);
  const [transferVisible, setTransferVisible] = useState(false);
  const [discardVisible, setDiscardVisible] = useState(false);
  const [trashVisible, setTrashVisible] = useState(false);
  const [form] = Form.useForm();
  const [discardForm] = Form.useForm();
  const [trashForm] = Form.useForm();
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);

  const myLeads = [
    {
      key: '1',
      id: 'LS001',
      entity: '中科软艺',
      name: '某科技公司APP开发需求',
      customer: '北京科技有限公司',
      contact: '张经理',
      phone: '138****1111',
      status: '需求调研',
      level: '高',
      nextFollow: '2026-04-10 14:00',
      lastFollow: '2小时前',
      followCount: 8,
      daysHeld: 15,
    },
    {
      key: '2',
      id: 'LS002',
      entity: '软艺信息',
      name: '企业管理系统定制',
      customer: '上海商贸公司',
      contact: '李总',
      phone: '139****2222',
      status: '方案报价',
      level: '中',
      nextFollow: '2026-04-11 10:00',
      lastFollow: '5小时前',
      followCount: 5,
      daysHeld: 8,
    },
    {
      key: '3',
      id: 'LS003',
      entity: '中科集团',
      name: '小程序开发项目',
      customer: '深圳电商公司',
      contact: '王总',
      phone: '136****3333',
      status: '合同洽谈',
      level: '高',
      nextFollow: '2026-04-09 16:00',
      lastFollow: '1天前',
      followCount: 12,
      daysHeld: 22,
    },
    {
      key: '4',
      id: 'LS004',
      entity: '中科软艺',
      name: '数据分析平台',
      customer: '广州金融公司',
      contact: '赵经理',
      phone: '137****4444',
      status: '初步沟通',
      level: '中',
      nextFollow: '2026-04-12 09:00',
      lastFollow: '2天前',
      followCount: 3,
      daysHeld: 5,
    },
  ];

  const statusMap = {
    未联系: 'default',
    未接通: 'warning',
    初步沟通: 'processing',
    需求调研: 'processing',
    方案报价: 'processing',
    合同洽谈: 'success',
    已签单: 'success',
    已终止: 'error',
  };

  const handleOpenCompanyEntity = (entityName: string) => {
    if (!companyEntityPermissions.view) {
      Message.warning('暂无权限查看公司主体详情');
      return;
    }

    const companyEntity = findCompanyEntityByName(entityName);
    if (!companyEntity) {
      Message.warning('未找到公司主体信息');
      return;
    }

    setSelectedCompanyEntity(companyEntity);
    setCompanyModalVisible(true);
  };

  const columns = [
    { title: '线索ID', dataIndex: 'id', width: 100 },
    {
      title: '线索名称',
      dataIndex: 'name',
      width: 200,
      render: (name: string, record: any) => (
        <a
          onClick={() => navigate(`/leads/${record.key}`, { state: { from: 'my' } })}
          style={{ color: 'rgb(var(--primary-6))' }}
        >
          {name}
        </a>
      ),
    },
    {
      title: '对接主体',
      dataIndex: 'entity',
      width: 120,
      render: (entity: string) => (
        <Button type="text" size="mini" onClick={() => handleOpenCompanyEntity(entity)}>
          {entity}
        </Button>
      ),
    },
    { title: '关联客户', dataIndex: 'customer', width: 150 },
    { title: '联系人', dataIndex: 'contact', width: 100 },
    { title: '手机号', dataIndex: 'phone', width: 120 },
    {
      title: '客户状态',
      dataIndex: 'status',
      width: 120,
      render: (status: string) => (
        <Badge
          status={statusMap[status as keyof typeof statusMap]}
          text={status}
        />
      ),
    },
    {
      title: '意向等级',
      dataIndex: 'level',
      width: 100,
      render: (level: string) => (
        <Badge status={level === '高' ? 'error' : 'warning'} text={level} />
      ),
    },
    { title: '下次跟进', dataIndex: 'nextFollow', width: 150 },
    { title: '最后跟进', dataIndex: 'lastFollow', width: 100 },
    { title: '跟进次数', dataIndex: 'followCount', width: 100 },
    { title: '持有天数', dataIndex: 'daysHeld', width: 100 },
    {
      title: '操作',
      width: 150,
      fixed: 'right' as const,
      render: (_, record: any) => (
        <Space key={`actions-${record.key}`} size="small">
          <Tooltip key={`tooltip-view-${record.key}`} content="查看详情">
            <Button
              type="text"
              icon={<IconEye />}
              size="mini"
              onClick={() => navigate(`/leads/${record.key}`, { state: { from: 'my' } })}
            />
          </Tooltip>
          <Tooltip key={`tooltip-follow-${record.key}`} content="添加跟进">
            <Button
              type="text"
              icon={<IconEdit />}
              size="mini"
            />
          </Tooltip>
          <Tooltip key={`tooltip-transfer-${record.key}`} content="转让线索">
            <Button
              type="text"
              icon={<IconSwap />}
              size="mini"
              onClick={() => setTransferVisible(true)}
            />
          </Tooltip>
          <Tooltip key={`tooltip-discard-${record.key}`} content="丢弃线索">
            <Button
              type="text"
              icon={<IconReply />}
              size="mini"
              status="warning"
              onClick={() => setDiscardVisible(true)}
            />
          </Tooltip>
          <Tooltip key={`tooltip-trash-${record.key}`} content="标记为垃圾">
            <Button
              type="text"
              icon={<IconDelete />}
              size="mini"
              status="danger"
              onClick={() => setTrashVisible(true)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Title heading={4}>我的线索</Title>
      </div>

      {leadReminderBanner ? (
        <Alert
          type="warning"
          closable={false}
          showIcon
          content={`当前有 ${leadReminderBanner.count} 条线索已超时未跟进，请尽快处理。`}
          style={{ marginBottom: 16, cursor: leadReminderBanner.firstTargetPath ? 'pointer' : 'default' }}
          onClick={() => {
            if (leadReminderBanner.firstTargetPath) {
              navigate(leadReminderBanner.firstTargetPath, { state: { from: 'my' } });
            }
          }}
        />
      ) : null}

      <Card>
        <div className="flex gap-4" style={{ marginBottom: 16 }}>
          <Input
            style={{ width: 240 }}
            placeholder="搜索线索名称、客户"
            prefix={<IconSearch />}
          />
          <Select placeholder="客户状态" style={{ width: 160 }} allowClear>
            <Select.Option key="status-1" value="未联系">未联系</Select.Option>
            <Select.Option key="status-2" value="未接通">未接通</Select.Option>
            <Select.Option key="status-3" value="初步沟通">初步沟通</Select.Option>
            <Select.Option key="status-4" value="需求调研">需求调研</Select.Option>
            <Select.Option key="status-5" value="方案报价">方案报价</Select.Option>
            <Select.Option key="status-6" value="合同洽谈">合同洽谈</Select.Option>
            <Select.Option key="status-7" value="已签单">已签单</Select.Option>
            <Select.Option key="status-8" value="已终止">已终止</Select.Option>
          </Select>
          <Select placeholder="意向等级" style={{ width: 160 }} allowClear>
            <Select.Option key="level-high" value="high">高</Select.Option>
            <Select.Option key="level-medium" value="medium">中</Select.Option>
            <Select.Option key="level-low" value="low">低</Select.Option>
          </Select>
          <Button type="primary">搜索</Button>
        </div>

        <Table
          columns={columns}
          data={myLeads}
          scroll={{ x: 1600 }}
          pagination={{
            total: 45,
            pageSize: 10,
            showTotal: true,
            showJumper: true,
          }}
        />
      </Card>

      <Modal
        title="转让线索"
        visible={transferVisible}
        onOk={() => {
          form.validate().then(() => {
            Message.success('线索转让成功');
            setTransferVisible(false);
            form.resetFields();
          });
        }}
        onCancel={() => {
          setTransferVisible(false);
          form.resetFields();
        }}
        style={{ width: 480 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="转让给"
            field="target"
            rules={[{ required: true, message: '请选择转让对象' }]}
          >
            <Select placeholder="请选择销售人员">
              <Select.Option key="user1" value="user1">李四</Select.Option>
              <Select.Option key="user2" value="user2">王五</Select.Option>
              <Select.Option key="user3" value="user3">赵六</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="转让原因" field="reason">
            <Input.TextArea placeholder="请输入转让原因（选填）" rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="丢弃线索"
        visible={discardVisible}
        onOk={() => {
          discardForm.validate().then(() => {
            Message.success('线索已丢回公海线索');
            setDiscardVisible(false);
            discardForm.resetFields();
          });
        }}
        onCancel={() => {
          setDiscardVisible(false);
          discardForm.resetFields();
        }}
        style={{ width: 480 }}
      >
        <Form form={discardForm} layout="vertical">
          <Form.Item
            label="丢弃原因"
            field="reason"
            rules={[{ required: true, message: '请填写丢弃原因' }]}
          >
            <Input.TextArea placeholder="请详细说明丢弃该线索的原因，以便其他人员参考" rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="标记为垃圾"
        visible={trashVisible}
        onOk={() => {
          trashForm.validate().then(() => {
            Message.success('线索已标记为垃圾');
            setTrashVisible(false);
            trashForm.resetFields();
          });
        }}
        onCancel={() => {
          setTrashVisible(false);
          trashForm.resetFields();
        }}
        style={{ width: 480 }}
      >
        <Form form={trashForm} layout="vertical">
          <Form.Item
            label="丢弃原因"
            field="reason"
            rules={[{ required: true, message: '请填写丢弃原因' }]}
          >
            <Input.TextArea placeholder="请详细说明将该线索标记为垃圾的原因" rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <CompanyEntityInfoModal
        visible={companyModalVisible}
        mode="view"
        defaultTab="files"
        record={selectedCompanyEntity}
        permissions={companyEntityPermissions}
        onCancel={() => setCompanyModalVisible(false)}
        onGoManage={() => navigate('/system/company')}
      />
    </div>
  );
}