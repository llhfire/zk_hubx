import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Tag, Tooltip, Upload } from '@arco-design/web-react';
import { IconFullscreen, IconFullscreenExit, IconPlus, IconUpload } from '@arco-design/web-react/icon';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import { COMPANY_ENTITY_LIST, LEAD_SOURCE_LABEL, LEAD_SOURCE_LIST } from '../types';
import { initialEmployees } from '../../employee/mockData';
import './NewLeadModal.css';

const FormItem = Form.Item;

const DEFAULT_TAGS = ['APP', '小程序', 'B端', 'C端', '网站', '数据接口', '其他'];

export interface NewLeadFormValues {
  name: string;
  source: string;
  entity: string;
  acquisitionCost?: number;
  customerTitle?: string;
  phone?: string;
  wechat?: string;
  optimizer?: string;
  owner?: string;
  assistant?: string;
  initialRequirement: string;
  customerRemark?: string;
  keyword?: string;
  freelancerId?: string;
  taskNo?: string;
  tags?: string[];
  attachments?: UploadItem[];
}

interface NewLeadModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: NewLeadFormValues) => void | Promise<void>;
}

export function NewLeadModal({ visible, onCancel, onSubmit }: NewLeadModalProps) {
  const [form] = Form.useForm<NewLeadFormValues>();
  const [fullscreen, setFullscreen] = useState(false);
  const [availableTags, setAvailableTags] = useState(DEFAULT_TAGS);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');

  const employeeOptions = useMemo(
    () => initialEmployees
      .filter((employee) => employee.employmentStatus !== '已离职')
      .map((employee) => ({
        value: employee.name,
        label: `${employee.name} · ${employee.department}`,
      })),
    [],
  );

  useEffect(() => {
    if (!visible) return;
    form.resetFields();
    setFullscreen(false);
    setSelectedTags([]);
    setAddingTag(false);
    setNewTag('');
  }, [visible, form]);

  const handleCancel = () => {
    form.resetFields();
    setSelectedTags([]);
    onCancel();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validate();
      if (!values.phone?.trim() && !values.wechat?.trim()) {
        form.setFields({
          phone: { value: values.phone, error: { message: '联系电话和联系微信至少填写一项' } },
          wechat: { value: values.wechat, error: { message: '联系电话和联系微信至少填写一项' } },
        });
        return;
      }
      await onSubmit({ ...values, tags: selectedTags });
      form.resetFields();
      setSelectedTags([]);
    } catch {
      // Arco 会在相应字段展示校验信息。
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => current.includes(tag)
      ? current.filter((item) => item !== tag)
      : [...current, tag]);
  };

  const confirmNewTag = () => {
    const normalized = newTag.trim();
    if (!normalized) return;
    if (!availableTags.includes(normalized)) setAvailableTags((current) => [...current, normalized]);
    setSelectedTags((current) => current.includes(normalized) ? current : [...current, normalized]);
    setNewTag('');
    setAddingTag(false);
  };

  return (
    <Modal
      className={`new-lead-modal${fullscreen ? ' new-lead-modal--fullscreen' : ''}`}
      title={(
        <div className="new-lead-modal__header">
          <div className="new-lead-modal__heading">
            <span className="new-lead-modal__title">新建线索</span>
            <span className="new-lead-modal__subtitle">录入客户与需求，创建后进入公海线索池</span>
          </div>
          <Tooltip content={fullscreen ? '退出全屏' : '全屏填写'}>
            <Button
              className="new-lead-modal__fullscreen"
              type="text"
              htmlType="button"
              aria-label={fullscreen ? '退出全屏' : '全屏填写'}
              icon={fullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
              onClick={() => setFullscreen((value) => !value)}
            />
          </Tooltip>
        </div>
      )}
      visible={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="创建线索"
      cancelText="取消"
      maskClosable={false}
      style={fullscreen ? undefined : { width: 'calc(100vw - 32px)', maxWidth: 1040 }}
      alignCenter
      unmountOnExit
      footer={(cancelButtonNode, okButtonNode) => (
        <div className="new-lead-modal__footer">
          {cancelButtonNode}
          {okButtonNode}
        </div>
      )}
    >
      <Form form={form} layout="vertical" className="new-lead-form">
        <div className="new-lead-form__notice" role="note">
          <div>
            <strong>录入提示</strong>
            <span>带 * 的字段为必填项；联系电话和联系微信至少填写一项。</span>
          </div>
          <span className="new-lead-form__destination">创建后进入公海池</span>
        </div>

        <section className="new-lead-form__section">
          <div className="new-lead-form__section-heading">
            <span>01</span>
            <div><h3>基本信息</h3><p>确认线索名称、来源渠道和承接主体</p></div>
          </div>
          <div className="new-lead-form__grid">
            <FormItem
              className="new-lead-form__span-2"
              label="线索名称"
              field="name"
              required
              rules={[{ required: true, message: '请输入线索名称' }, { maxLength: 30, message: '最多输入 30 个字符' }]}
            >
              <Input autoFocus placeholder="如：华东零售门店小程序升级" maxLength={30} showWordLimit allowClear />
            </FormItem>
            <FormItem label="线索来源" field="source" required rules={[{ required: true, message: '请选择线索来源' }]}> 
              <Select placeholder="选择来源渠道" allowClear>
                {LEAD_SOURCE_LIST.map((source) => <Select.Option key={source} value={source}>{LEAD_SOURCE_LABEL[source]}</Select.Option>)}
              </Select>
            </FormItem>
            <FormItem label="对接主体" field="entity" required rules={[{ required: true, message: '请选择对接主体' }]}> 
              <Select placeholder="选择承接主体" allowClear>
                {COMPANY_ENTITY_LIST.map((entity) => <Select.Option key={entity} value={entity}>{entity}</Select.Option>)}
              </Select>
            </FormItem>
            <FormItem label="客资成本" field="acquisitionCost">
              <InputNumber placeholder="0.00" min={0} precision={2} prefix="¥" hideControl />
            </FormItem>
          </div>
        </section>

        <section className="new-lead-form__section">
          <div className="new-lead-form__section-heading">
            <span>02</span>
            <div><h3>联系人信息</h3><p>保留可触达方式，便于后续领取与首次跟进</p></div>
          </div>
          <div className="new-lead-form__grid new-lead-form__grid--three">
            <FormItem label="客户称呼" field="customerTitle">
              <Input placeholder="如：王总" allowClear />
            </FormItem>
            <FormItem label="联系电话" field="phone" rules={[{ match: /^$|^1\d{10}$/, message: '请输入正确的 11 位手机号' }]}> 
              <Input placeholder="11 位手机号" maxLength={11} allowClear />
            </FormItem>
            <FormItem label="联系微信" field="wechat">
              <Input placeholder="微信号或绑定手机号" allowClear />
            </FormItem>
          </div>
        </section>

        <section className="new-lead-form__section">
          <div className="new-lead-form__section-heading">
            <span>03</span>
            <div><h3>责任与需求</h3><p>明确协作人员，并保留客户最初表达</p></div>
          </div>
          <div className="new-lead-form__grid new-lead-form__grid--three">
            <FormItem label="优化师" field="optimizer">
              <Select placeholder="选择优化师" options={employeeOptions} showSearch allowClear />
            </FormItem>
            <FormItem label="归属人" field="owner">
              <Select placeholder="选择归属人" options={employeeOptions} showSearch allowClear />
            </FormItem>
            <FormItem label="协助人" field="assistant">
              <Select placeholder="选择协助人" options={employeeOptions} showSearch allowClear />
            </FormItem>
            <FormItem
              className="new-lead-form__span-all new-lead-form__textarea"
              label="初始信息及需求"
              field="initialRequirement"
              required
              rules={[{ required: true, message: '请输入初始信息及需求' }, { maxLength: 500, message: '最多输入 500 个字符' }]}
            >
              <Input.TextArea placeholder="请简要记录业务背景、目标功能、预算或期望交付时间" rows={4} maxLength={500} showWordLimit />
            </FormItem>
            <FormItem
              className="new-lead-form__span-all new-lead-form__textarea"
              label="客户其他备注"
              field="customerRemark"
              rules={[{ maxLength: 500, message: '最多输入 500 个字符' }]}
            >
              <Input.TextArea placeholder="补充沟通偏好、特殊事项或其他背景" rows={3} maxLength={500} showWordLimit />
            </FormItem>
          </div>
        </section>

        <section className="new-lead-form__section">
          <div className="new-lead-form__section-heading">
            <span>04</span>
            <div><h3>投放与附件</h3><p>补充渠道索引和原始资料，便于检索与追溯</p></div>
          </div>
          <div className="new-lead-form__grid new-lead-form__grid--three">
            <FormItem label="推广关键词" field="keyword">
              <Input placeholder="如：小程序定制" allowClear />
            </FormItem>
            <FormItem label="威客 ID" field="freelancerId">
              <Input placeholder="平台用户 ID" allowClear />
            </FormItem>
            <FormItem label="任务编号" field="taskNo">
              <Input placeholder="平台任务编号" allowClear />
            </FormItem>
            <FormItem className="new-lead-form__span-all new-lead-form__tags" label="意向标签" field="tags">
              <div className="new-lead-form__tag-list">
                {availableTags.map((tag) => (
                  <Tag key={tag} checkable checked={selectedTags.includes(tag)} onCheck={() => toggleTag(tag)}>{tag}</Tag>
                ))}
                {addingTag ? (
                  <Input
                    className="new-lead-form__tag-input"
                    size="mini"
                    autoFocus
                    value={newTag}
                    maxLength={10}
                    placeholder="标签名称"
                    onChange={setNewTag}
                    onPressEnter={confirmNewTag}
                    onBlur={confirmNewTag}
                  />
                ) : (
                  <Button size="mini" type="dashed" icon={<IconPlus />} onClick={() => setAddingTag(true)}>添加标签</Button>
                )}
              </div>
            </FormItem>
            <FormItem className="new-lead-form__span-all new-lead-form__upload" label="附件上传" field="attachments" triggerPropName="fileList">
              <Upload accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx" multiple limit={10} drag autoUpload={false}>
                <div className="new-lead-form__upload-content">
                  <IconUpload />
                  <div>点击或拖拽文件到此处上传</div>
                  <span>支持图片、PDF、Word、Excel，单个文件不超过 20MB</span>
                </div>
              </Upload>
            </FormItem>
          </div>
        </section>
      </Form>
    </Modal>
  );
}
