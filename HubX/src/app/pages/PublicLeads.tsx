import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
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
  Tag,
  Grid,
  Tooltip,
  Upload,
} from '@arco-design/web-react';
import { IconSearch, IconPlus, IconEye, IconUserAdd, IconDelete, IconUpload } from '@arco-design/web-react/icon';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { CompanyEntityInfoModal } from './company-entity/CompanyEntityInfoModal';
import {
  companyEntityPermissions,
  findCompanyEntityByName,
  type CompanyEntityRecord,
} from './company-entity/companyEntityData';

const FormItem = Form.Item;
const Title = Typography.Title;

// Custom wrapper for ReactQuill to work with Arco Design Form
function RichTextEditor({ value = '', onChange, ...props }: any) {
  const quillRef = useRef<ReactQuill>(null);

  return (
    <div style={{ marginBottom: 42 }}>
      <ReactQuill
        ref={quillRef}
        value={value}
        onChange={onChange}
        {...props}
      />
    </div>
  );
}

export function PublicLeads() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [trashVisible, setTrashVisible] = useState(false);
  const [customTagVisible, setCustomTagVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState(['APP', '小程序', '管理系统', '官网', '电商系统', 'CMS', 'OA系统']);
  const [form] = Form.useForm();
  const [trashForm] = Form.useForm();
  const [customTagForm] = Form.useForm();
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompanyEntity, setSelectedCompanyEntity] = useState<CompanyEntityRecord | null>(null);

  const customerList = [
    { id: '1', name: '北京科技有限公司', contact: '张经理', phone: '13800138000' },
    { id: '2', name: '上海商贸公司', contact: '李总', phone: '13900139000' },
    { id: '3', name: '深圳电商公司', contact: '王总', phone: '13600136000' },
    { id: '4', name: '广州金融公司', contact: '赵经理', phone: '13700137000' },
  ];

  const publicLeads = [
    {
      key: '1',
      id: 'LS001',
      name: '某餐饮连锁小程序开发',
      source: '百度推广',
      keyword: '小程序开发',
      contact: '陈经理',
      phone: '138****8888',
      level: '高',
      tags: ['小程序', '餐饮'],
      entity: '中科软艺',
      status: '需求调研',
      createTime: '2026-04-08 10:30',
    },
    {
      key: '2',
      id: 'LS002',
      name: '物流管理系统定制',
      source: '抖音',
      keyword: '物流系统',
      contact: '刘总',
      phone: '139****9999',
      level: '中',
      tags: ['管理系统', '物流'],
      entity: '软艺信息',
      status: '初步沟通',
      createTime: '2026-04-08 14:20',
    },
    {
      key: '3',
      id: 'LS003',
      name: '教育APP开发需求',
      source: '小红书',
      keyword: '教育APP',
      contact: '王老师',
      phone: '136****6666',
      level: '高',
      tags: ['APP', '教育'],
      entity: '中科集团',
      status: '方案报价',
      createTime: '2026-04-07 16:45',
    },
    {
      key: '4',
      id: 'LS004',
      name: '企业官网建设',
      source: '微信推广',
      keyword: '官网建设',
      contact: '李主管',
      phone: '137****7777',
      level: '低',
      tags: ['官网', '企业'],
      entity: '中科软艺',
      status: '未联系',
      createTime: '2026-04-07 09:15',
    },
    {
      key: '5',
      id: 'LS005',
      name: '电商平台开发',
      source: '百度推广',
      keyword: '电商系统',
      contact: '张总',
      phone: '135****5555',
      level: '高',
      tags: ['电商', '平台'],
      entity: '软艺信息',
      status: '合同洽谈',
      createTime: '2026-04-06 11:30',
    },
  ];

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

  // --- Column definitions with visual hierarchy ---
  const columns = [
    {
      title: '线索ID',
      dataIndex: 'id',
      width: 100,
      render: (text: string) => (
        <span style={{ fontSize: 12, color: 'hsl(220 8% 55%)', fontFamily: 'monospace' }}>{text}</span>
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
    {
      title: '线索名称',
      dataIndex: 'name',
      width: 200,
      render: (text: string, record: any) => (
        <Button
          type="text"
          size="mini"
          style={{ padding: 0, fontWeight: 500 }}
          onClick={() => navigate(`/leads/${record.key}?from=public`, { state: { from: 'public' } })}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 120,
      render: (source: string) => <Badge status="default" text={source} />,
    },
    {
      title: '推广关键词',
      dataIndex: 'keyword',
      width: 120,
      render: (text: string) => (
        <span style={{ color: 'hsl(220 10% 45%)' }}>{text}</span>
      ),
    },
    {
      title: '联系人',
      dataIndex: 'contact',
      width: 100,
      render: (text: string) => (
        <span style={{ color: 'hsl(220 10% 35%)' }}>{text}</span>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 120,
      render: (text: string) => (
        <span style={{ color: 'hsl(220 8% 55%)', fontSize: 13 }}>{text}</span>
      ),
    },
    {
      title: '意向等级',
      dataIndex: 'level',
      width: 100,
      render: (level: string) => {
        const statusMap = {
          高: 'error',
          中: 'warning',
          低: 'default',
        };
        return <Badge status={statusMap[level as keyof typeof statusMap]} text={level} />;
      },
    },
    {
      title: '意向标签',
      dataIndex: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <Space size={4}>
          {tags.map((tag, index) => (
            <Tag key={index} color="arcoblue" style={{ fontSize: 12 }}>
              {tag}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '客户状态',
      dataIndex: 'status',
      width: 120,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          '未联系': 'gray',
          '未接通': 'orangered',
          '初步沟通': 'blue',
          '需求调研': 'cyan',
          '方案报价': 'purple',
          '合同洽谈': 'orange',
          '已签单': 'green',
          '已终止': 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 160,
      render: (text: string) => (
        <span style={{ color: 'hsl(220 8% 55%)', fontSize: 13 }}>{text}</span>
      ),
    },
    {
      title: '操作',
      width: 130,
      fixed: 'right' as const,
      render: (_, record: any) => (
        <Space size={0}>
          <Tooltip key={`tooltip-view-${record.key}`} content="查看详情">
            <Button
              type="text"
              icon={<IconEye />}
              size="small"
              onClick={() => navigate(`/leads/${record.key}?from=public`, { state: { from: 'public' } })}
            />
          </Tooltip>
          <Tooltip key={`tooltip-claim-${record.key}`} content="认领线索">
            <Button
              type="text"
              icon={<IconUserAdd />}
              size="small"
              onClick={() => {
                Message.success('线索认领成功');
              }}
            />
          </Tooltip>
          <Tooltip key={`tooltip-trash-${record.key}`} content="丢弃垃圾线索">
            <Button
              type="text"
              icon={<IconDelete />}
              size="small"
              style={{ color: 'hsl(0 60% 55%)' }}
              onClick={() => setTrashVisible(true)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleCreateLead = () => {
    form.setFieldValue('tags', selectedTags);
    form.validate()
      .then((values) => {
        console.log(values);
        Message.success('线索创建成功');
        setVisible(false);
        form.resetFields();
        setSelectedTags([]);
      })
      .catch((err) => {
        console.log('表单验证失败:', err);
      });
  };

  const handleTrashLead = () => {
    trashForm.validate()
      .then((values) => {
        console.log(values);
        Message.success('垃圾线索已丢弃');
        setTrashVisible(false);
        trashForm.resetFields();
      })
      .catch((err) => {
        console.log('表单验证失败:', err);
      });
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    customTagForm.validate().then((values) => {
      const newTag = values.tagName.trim();
      if (newTag && !availableTags.includes(newTag)) {
        setAvailableTags([...availableTags, newTag]);
        setSelectedTags([...selectedTags, newTag]);
        Message.success('标签添加成功');
      } else if (availableTags.includes(newTag)) {
        Message.warning('标签已存在');
      }
      setCustomTagVisible(false);
      customTagForm.resetFields();
    });
  };

  return (
    <div>
      {/* Page label — subtle, not giant heading */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(220 8% 55%)', letterSpacing: '0.025em', textTransform: 'uppercase' }}>
          公海线索池
        </div>
        <Button type="primary" icon={<IconPlus />} onClick={() => setVisible(true)}>
          新建线索
        </Button>
      </div>

      <Card
        style={{
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xs)',
          border: '1px solid hsl(220 12% 88%)',
        }}
      >
        {/* Search & Filter Bar */}
        <div className="flex gap-3" style={{ marginBottom: 16 }}>
          <Input
            style={{ width: 240 }}
            placeholder="搜索线索名称、联系人"
            prefix={<IconSearch />}
          />
          <Select placeholder="线索来源" style={{ width: 160 }} allowClear>
            <Select.Option key="source-baidu" value="baidu">百度推广</Select.Option>
            <Select.Option key="source-douyin" value="douyin">抖音</Select.Option>
            <Select.Option key="source-xiaohongshu" value="xiaohongshu">小红书</Select.Option>
            <Select.Option key="source-wechat" value="wechat">微信推广</Select.Option>
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
          data={publicLeads}
          scroll={{ x: 1400 }}
          pagination={{
            total: 50,
            pageSize: 10,
            showTotal: true,
            showJumper: true,
          }}
        />
      </Card>

      {/* ---- Create Lead Modal ---- */}
      <Modal
        title="新建线索"
        visible={visible}
        onOk={handleCreateLead}
        onCancel={() => {
          setVisible(false);
          form.resetFields();
          setSelectedTags([]);
        }}
        style={{ width: 800 }}
      >
        <Form form={form} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={24}>
              <FormItem label="线索名称" field="name" rules={[{ required: true, message: '请输入线索名称' }]}>
                <Input placeholder="请输入线索名称" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={8}>
              <FormItem label="联系人" field="contact" rules={[{ required: true, message: '请输入联系人' }]}>
                <Input placeholder="请输入联系人姓名" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="联系电话" field="phone" rules={[{ required: true, message: '请输入联系电话' }]}>
                <Input placeholder="请输入手机号" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="联系人微信" field="wechat">
                <Input placeholder="请输入微信号" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={8}>
              <FormItem label="线索来源" field="source" rules={[{ required: true, message: '请选择线索来源' }]}>
                <Select placeholder="请选择">
                  <Select.Option key="baidu" value="baidu">百度推广</Select.Option>
                  <Select.Option key="douyin" value="douyin">抖音</Select.Option>
                  <Select.Option key="xiaohongshu" value="xiaohongshu">小红书</Select.Option>
                  <Select.Option key="wechat" value="wechat">微信推广</Select.Option>
                  <Select.Option key="other" value="other">其他</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="推广关键词" field="keyword">
                <Input placeholder="请输入推广关键词" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="客户主体" field="customerId">
                <Select
                  placeholder="请输入客户名称搜索"
                  showSearch
                  allowClear
                  filterOption={(inputValue, option) => {
                    const customer = customerList.find(c => c.id === option.props?.value);
                    if (!customer) return false;
                    const searchText = `${customer.name} ${customer.contact} ${customer.phone}`.toLowerCase();
                    return searchText.indexOf(inputValue.toLowerCase()) >= 0;
                  }}
                >
                  {customerList.map((customer) => (
                    <Select.Option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.contact} - {customer.phone}
                    </Select.Option>
                  ))}
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={8}>
              <FormItem label="意向等级" field="level" rules={[{ required: true, message: '请选择意向等级' }]}>
                <Select placeholder="请选择">
                  <Select.Option key="high" value="high">高</Select.Option>
                  <Select.Option key="medium" value="medium">中</Select.Option>
                  <Select.Option key="low" value="low">低</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="对接主体" field="entity" rules={[{ required: true, message: '请选择对接主体' }]}>
                <Select placeholder="请选择">
                  <Select.Option key="zkry" value="中科软艺">中科软艺</Select.Option>
                  <Select.Option key="ryxx" value="软艺信息">软艺信息</Select.Option>
                  <Select.Option key="zkjt" value="中科集团">中科集团</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={8}>
              <FormItem label="客户状态" field="status" rules={[{ required: true, message: '请选择客户状态' }]}>
                <Select placeholder="请选择">
                  <Select.Option key="status-1" value="未联系">未联系</Select.Option>
                  <Select.Option key="status-2" value="未接通">未接通</Select.Option>
                  <Select.Option key="status-3" value="初步沟通">初步沟通</Select.Option>
                  <Select.Option key="status-4" value="需求调研">需求调研</Select.Option>
                  <Select.Option key="status-5" value="方案报价">方案报价</Select.Option>
                  <Select.Option key="status-6" value="合同洽谈">合同洽谈</Select.Option>
                  <Select.Option key="status-7" value="已签单">已签单</Select.Option>
                  <Select.Option key="status-8" value="已终止">已终止</Select.Option>
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={24}>
              <FormItem label="意向标签" field="tags">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {availableTags.map((tag) => (
                    <Tag
                      key={tag}
                      checkable
                      checked={selectedTags.includes(tag)}
                      onClick={() => handleTagClick(tag)}
                      style={{ cursor: 'pointer' }}
                    >
                      {tag}
                    </Tag>
                  ))}
                  <Button
                    size="small"
                    type="dashed"
                    icon={<IconPlus />}
                    onClick={() => setCustomTagVisible(true)}
                  >
                    新增标签
                  </Button>
                </div>
              </FormItem>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row gutter={16}>
            <Grid.Col span={24}>
              <FormItem label="客户需求梗概" field="requirement">
                <Input.TextArea
                  placeholder="请输入客户需求描述"
                  rows={6}
                  maxLength={1000}
                  showWordLimit
                />
              </FormItem>
              <FormItem label="附件上传" field="attachments">
                <Upload
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                  drag
                  tip="支持上传图片、PDF、Word、Excel等文件"
                >
                  <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <IconUpload style={{ fontSize: 32, color: 'var(--color-text-3)' }} />
                    <div style={{ marginTop: 8, color: 'var(--color-text-2)' }}>
                      点击或拖拽文件到此处上传
                    </div>
                  </div>
                </Upload>
              </FormItem>
            </Grid.Col>
          </Grid.Row>
        </Form>
      </Modal>

      {/* ---- Trash Lead Modal ---- */}
      <Modal
        title="丢弃垃圾线索"
        visible={trashVisible}
        onOk={handleTrashLead}
        onCancel={() => {
          setTrashVisible(false);
          trashForm.resetFields();
        }}
        style={{ width: 480 }}
      >
        <Form form={trashForm} layout="vertical">
          <FormItem
            label="丢弃原因"
            field="reason"
            rules={[{ required: true, message: '请填写丢弃原因' }]}
          >
            <Input.TextArea
              placeholder="请详细说明该线索为垃圾线索的原因，如：重复线索、虚假信息、无效联系方式等"
              rows={4}
            />
          </FormItem>
        </Form>
      </Modal>

      {/* ---- Custom Tag Modal ---- */}
      <Modal
        title="新增标签"
        visible={customTagVisible}
        onOk={handleAddCustomTag}
        onCancel={() => {
          setCustomTagVisible(false);
          customTagForm.resetFields();
        }}
        style={{ width: 400 }}
      >
        <Form form={customTagForm} layout="vertical">
          <FormItem
            label="标签名称"
            field="tagName"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input placeholder="请输入标签名称，如：物联网、区块链等" maxLength={10} />
          </FormItem>
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
