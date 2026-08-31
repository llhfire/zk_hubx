import { useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  Button,
  Card,
  Form,
  Input,
  Message,
  Modal,
  Result,
  Select,
  Space,
  Typography,
} from '@arco-design/web-react';
import {
  IconBold,
  IconItalic,
  IconLeft,
  IconOrderedList,
  IconRedo,
  IconUndo,
  IconUnorderedList,
} from '@arco-design/web-react/icon';
import { initialProjects } from '../project-management/mockData';
import { useContracts } from './ContractsContext';
import { contractTemplates, renderContractDocument } from './templates';
import { PageShell } from '@/app/components/ui';
import type { ContractFormData, ContractVersionAttachment } from './types';
import { createDocxBlob } from '../../documents/wordExport';

const Title = Typography.Title;
const FormItem = Form.Item;

interface ReturnTarget {
  pathname: string;
  state?: Record<string, unknown>;
}

export function ContractDocumentPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getById, saveDraft, saveDocumentPreviewVersion } = useContracts();
  const contract = getById(id);
  const [formData, setFormData] = useState<ContractFormData | null>(contract?.current ?? null);
  const [documentHtml, setDocumentHtml] = useState(() => (
    contract ? renderContractDocument(contract.current) : ''
  ));
  const documentEditorRef = useRef<HTMLDivElement>(null);
  const documentEditedRef = useRef(false);
  const [submitVisible, setSubmitVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitForm] = Form.useForm();

  const routeReturnTarget = (location.state as {
    contractPreviewReturn?: ReturnTarget;
  } | null)?.contractPreviewReturn;
  const createNewVersion = (location.state as { createNewVersion?: boolean } | null)?.createNewVersion;
  const project = contract
    ? initialProjects.find((item) => item.id === contract.projectId || item.contractId === contract.id)
    : undefined;
  const returnTarget = routeReturnTarget ?? (
    project ? { pathname: `/projects/${project.id}` } : { pathname: '/projects' }
  );
  const projectIdFromReturnTarget = returnTarget.pathname.match(/^\/projects\/([^/]+)$/)?.[1];

  if (!contract || !formData) {
    return (
      <PageShell breadcrumbs={[{ label: '合同管理', to: '/contracts' }, { label: '合同列表', to: '/contracts' }, { label: '合同不存在' }]}>
      <Result
        status="404"
        title="合同不存在"
        subTitle="该合同可能已被删除，或链接有误。"
        extra={<Button type="primary" onClick={() => navigate('/contracts')}>返回合同列表</Button>}
      />
      </PageShell>
    );
  }

  const isReadonly = contract.status !== 'draft';

  const getLatestFormData = (): ContractFormData => {
    if (!documentEditedRef.current || !documentEditorRef.current) return formData;
    const latestFormData = {
      ...formData,
      customContractHtml: documentEditorRef.current.innerHTML,
    };
    setFormData(latestFormData);
    setDocumentHtml(latestFormData.customContractHtml);
    documentEditedRef.current = false;
    return latestFormData;
  };

  const handleBack = () => {
    saveDraft(contract.id, getLatestFormData());
    navigate(`/contracts/${contract.id}/edit`, {
      state: { contractEditorReturn: returnTarget, createNewVersion },
      replace: true,
    });
  };

  const handleTemplateChange = (templateId: string) => {
    const nextFormData = { ...formData, templateId, customContractHtml: undefined };
    setFormData(nextFormData);
    setDocumentHtml(renderContractDocument(nextFormData));
    documentEditedRef.current = false;
  };

  const runEditorCommand = (command: string) => {
    documentEditorRef.current?.focus();
    document.execCommand(command);
    documentEditedRef.current = true;
  };

  const openSubmitModal = () => {
    const latestFormData = getLatestFormData();
    if (!latestFormData.contractName || latestFormData.totalAmount <= 0) {
      Message.error('请完善合同名称和合同金额');
      return;
    }
    submitForm.resetFields();
    setSubmitVisible(true);
  };

  const createGeneratedAttachment = async (latestFormData: ContractFormData): Promise<ContractVersionAttachment> => {
    const documentContent = latestFormData.customContractHtml || renderContractDocument(latestFormData);
    const file = await createDocxBlob(documentContent, latestFormData.contractName || contract.contractNo);
    return {
      id: `generated-contract-${Date.now()}`,
      name: `${contract.contractNo}-${latestFormData.contractName || '合同正文'}.docx`,
      size: `${Math.max(1, Math.ceil(file.size / 1024))} KB`,
      url: URL.createObjectURL(file),
    };
  };

  const confirmSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const values = await submitForm.validate();
      const latestFormData = getLatestFormData();
      saveDocumentPreviewVersion(contract.id, {
        formData: latestFormData,
        projectId: projectIdFromReturnTarget,
        createNewVersion,
        changeSummary: values.changeSummary.trim(),
        attachment: await createGeneratedAttachment(latestFormData),
      });
      setSubmitVisible(false);
      submitForm.resetFields();
      Message.success('合同版本已生成');
      navigate(returnTarget.pathname, { state: returnTarget.state, replace: true });
    } catch (error) {
      if (error instanceof Error) Message.error(error.message || '合同版本生成失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      breadcrumbs={[
        { label: '合同管理', to: '/contracts' },
        { label: '合同列表', to: '/contracts' },
        { label: formData.contractName || contract.contractNo, to: `/contracts/${contract.id}` },
        { label: '合同预览' },
      ]}
    >
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="text" icon={<IconLeft />} onClick={handleBack}>返回编辑</Button>
          <Title heading={4} style={{ margin: 0 }}>{formData.contractName || '未命名合同'}</Title>
        </Space>
        <Select
          value={formData.templateId}
          onChange={handleTemplateChange}
          style={{ width: 220 }}
          disabled={isReadonly}
        >
          {contractTemplates.map((template) => (
            <Select.Option key={template.id} value={template.id}>{template.name}</Select.Option>
          ))}
        </Select>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        {!isReadonly && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              minHeight: 44,
              padding: '6px 12px',
              borderBottom: '1px solid var(--color-border-2)',
            }}
          >
            {[
              { command: 'undo', icon: <IconUndo />, title: '撤销' },
              { command: 'redo', icon: <IconRedo />, title: '重做' },
              { command: 'bold', icon: <IconBold />, title: '加粗' },
              { command: 'italic', icon: <IconItalic />, title: '斜体' },
              { command: 'insertOrderedList', icon: <IconOrderedList />, title: '有序列表' },
              { command: 'insertUnorderedList', icon: <IconUnorderedList />, title: '无序列表' },
            ].map((item) => (
              <Button
                key={item.command}
                type="text"
                size="small"
                icon={item.icon}
                title={item.title}
                style={{ width: 32 }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runEditorCommand(item.command)}
              />
            ))}
          </div>
        )}
        <div
          style={{
            minHeight: 'calc(100vh - 260px)',
            padding: 24,
            overflow: 'auto',
            background: 'var(--color-fill-1)',
          }}
        >
          <div
            ref={documentEditorRef}
            contentEditable={!isReadonly}
            suppressContentEditableWarning
            onInput={() => { documentEditedRef.current = true; }}
            onBlur={() => saveDraft(contract.id, getLatestFormData())}
            style={{
              maxWidth: 900,
              minHeight: 1060,
              margin: '0 auto',
              padding: '56px 64px',
              background: 'var(--color-bg-2)',
              boxShadow: '0 1px 4px rgb(0 0 0 / 12%)',
              outline: 'none',
            }}
            dangerouslySetInnerHTML={{ __html: documentHtml }}
          />
        </div>
      </Card>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingTop: 24,
          marginTop: 24,
          borderTop: '1px solid var(--color-border-2)',
        }}
      >
        <Button type="primary" onClick={openSubmitModal} disabled={isReadonly}>提交</Button>
      </div>

      <Modal
        title="提交合同版本"
        visible={submitVisible}
        onOk={confirmSubmit}
        onCancel={() => {
          setSubmitVisible(false);
          submitForm.resetFields();
        }}
        maskClosable={false}
        okButtonProps={{ loading: submitting, disabled: submitting }}
        cancelButtonProps={{ disabled: submitting }}
      >
        <Form form={submitForm} layout="vertical">
          <FormItem
            label="修改说明"
            field="changeSummary"
            rules={[{ required: true, message: '请输入修改说明' }]}
          >
            <Input.TextArea rows={4} maxLength={500} showWordLimit placeholder="请说明本次合同修改内容" />
          </FormItem>
        </Form>
      </Modal>
    </div>
    </PageShell>
  );
}
