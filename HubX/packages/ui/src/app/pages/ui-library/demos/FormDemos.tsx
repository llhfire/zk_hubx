import { useState } from 'react';
import {
  Button,
  DatePicker,
  Divider,
  FilterBar,
  FormGrid,
  FormSection,
  IconSearch,
  Input,
  OrderedStatePicker,
  RichTextEditor,
  SectionCard,
  Select,
  StatusTag,
  UploadPanel,
  UserPicker,
} from '@/design-system';

export function FormDemos() {
  const [note, setNote] = useState('<p>需求确认：两周内完成数据接入方案。</p>');
  const [demoGrade, setDemoGrade] = useState('A');
  const [demoUser, setDemoUser] = useState<string | undefined>();

  return (
    <SectionCard title="录入组件" description="筛选区、字段网格、字段分组、状态/用户选择、拖拽上传、富文本编辑器。">
      <div className="ui-library-preview">
        <div className="ui-library-preview__label">FilterBar — 列表工具栏占满内容区</div>
        <FilterBar actions={<><Button>重置</Button><Button type="primary">查询</Button></>}>
          <Input className="ui-library-field--search" prefix={<IconSearch />} placeholder="搜索客户" />
          <Select className="ui-library-field--filter" placeholder="客户等级" options={['S', 'A', 'B', 'C']} />
          <DatePicker className="ui-library-field--date" />
        </FilterBar>
        <div className="ui-library-demo-caption">搜索 240、筛选 140、日期 200。员工列表整条约 1143px，组件不设最大宽度。</div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">FormSection + FormGrid — 弹窗 / 抽屉 760px</div>
        <div className="ui-library-size-stage ui-library-size-stage--form">
          <FormSection
            leading={<StatusTag size="small" tone="info">1</StatusTag>}
            title="基本信息"
            description="客户与合同的基础字段。"
            extra={<Button size="mini" type="text">展开全部</Button>}
          >
            <FormGrid columns={2}>
              <div><div className="ui-library-demo-caption">客户名称</div><Input placeholder="请输入客户名称" /></div>
              <div><div className="ui-library-demo-caption">客户等级</div><Select placeholder="请选择" options={['S', 'A', 'B', 'C']} /></div>
              <div><div className="ui-library-demo-caption">联系人</div><Input placeholder="请输入联系人" /></div>
              <div><div className="ui-library-demo-caption">签约日期</div><DatePicker /></div>
            </FormGrid>
          </FormSection>
          <Divider />
          <FormSection title="三列">
            <FormGrid columns={3}>
              <div><div className="ui-library-demo-caption">columns=3</div><Input placeholder="字段一" /></div>
              <div><div className="ui-library-demo-caption">&nbsp;</div><Input placeholder="字段二" /></div>
              <div><div className="ui-library-demo-caption">&nbsp;</div><Input placeholder="字段三" /></div>
            </FormGrid>
          </FormSection>
          <Divider />
          <FormSection title="四列">
            <FormGrid columns={4}>
              <div><div className="ui-library-demo-caption">columns=4</div><Input placeholder="UI" /></div>
              <div><div className="ui-library-demo-caption">&nbsp;</div><Input placeholder="前端" /></div>
              <div><div className="ui-library-demo-caption">&nbsp;</div><Input placeholder="后端" /></div>
              <div><div className="ui-library-demo-caption">&nbsp;</div><Input placeholder="测试" /></div>
            </FormGrid>
          </FormSection>
          <Divider />
          <FormSection title="不等宽模板">
            <FormGrid template="2-1-1">
              <div><div className="ui-library-demo-caption">template=2-1-1 主字段</div><Input placeholder="主要字段占两份宽度" /></div>
              <div><div className="ui-library-demo-caption">辅助字段</div><Input placeholder="字段二" /></div>
              <div><div className="ui-library-demo-caption">辅助字段</div><Input placeholder="字段三" /></div>
            </FormGrid>
          </FormSection>
        </div>
        <div className="ui-library-demo-caption">员工弹窗外宽 760、内容区 720，双列 352。实样舞台取外宽，双列 372。视口 640px 以下，三列、四列和不等宽模板收成两列；480px 以下全部收成一列。</div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">UploadPanel — 占满父级，表单实样跟 760 弹窗走</div>
        <div className="ui-library-size-stage ui-library-size-stage--form">
          <UploadPanel hint="点击或拖拽合同扫描件到此处" description="支持 PDF / JPG，单个不超过 20MB" />
        </div>
        <div className="ui-library-demo-caption">知识库和项目页的上传区可以更宽，组件本身不设最大宽度。</div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">RichTextEditor — 表单编辑区 760，编辑区至少 160px</div>
        <div className="ui-library-size-stage ui-library-size-stage--editor">
          <RichTextEditor value={note} onChange={setNote} placeholder="填写需求说明" />
        </div>
        <div className="ui-library-demo-spacer" />
        <div className="ui-library-demo-caption">可编辑时编辑区至少 120px。合同模板页是 420px。只读详情不套最小高度。当前值：{note}</div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">OrderedStatePicker — 固定顺序的状态/等级选择</div>
        <OrderedStatePicker
          ariaLabel="示例客户等级"
          value={demoGrade}
          onChange={(value) => setDemoGrade(value ?? 'A')}
          options={[
            { value: 'S', label: 'S', tone: 'success' },
            { value: 'A', label: 'A', tone: 'info' },
            { value: 'B', label: 'B', tone: 'neutral' },
            { value: 'C', label: 'C', tone: 'neutral' },
          ]}
        />
        <div className="ui-library-demo-caption">当前等级：{demoGrade}；业务值按 options 的稳定 value 保存。</div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">UserPicker — 表单控件 320×32，保存稳定 ID</div>
        <div className="ui-library-size-stage ui-library-size-stage--control">
          <UserPicker
            value={demoUser}
            onChange={setDemoUser}
            allowClear
            options={[
              { id: 'employee-zhang-san', name: '张三', jobNumber: 'E001', department: '销售部' },
              { id: 'employee-li-si', name: '李四', jobNumber: 'E002', department: '技术部' },
              { id: 'employee-wang-wu', name: '王五', jobNumber: 'E003', department: '交付部' },
            ]}
          />
        </div>
        <div className="ui-library-demo-caption">控件高 32，宽 320。当前 ID：{demoUser ?? '未选择'}；空值统一为 undefined。</div>
      </div>
    </SectionCard>
  );
}
