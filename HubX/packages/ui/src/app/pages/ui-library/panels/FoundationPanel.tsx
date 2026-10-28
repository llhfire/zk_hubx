import {
  AlertBanner,
  Button,
  DataTable,
  DatePicker,
  IconDownload,
  IconPlus,
  IconRefresh,
  IconSearch,
  Input,
  SectionCard,
  SectionTabs,
  Select,
  Space,
  StatusTag,
  Switch,
  Typography,
} from '@/design-system';
import { DEMO_STATUS } from '../demos/fixtures';
import { FormDemos } from '../demos/FormDemos';
import { PrimitiveDemos } from '../demos/PrimitiveDemos';
import { foundationRows } from '../data';

const { Text } = Typography;

/**
 * 基础 UI：单一值 / 单一输入，不含业务语义。
 * 这一层是字典，页面取到的是「一个值怎么写」和「一个控件长什么样」。
 */
function ValuesAndControls() {
  return (
    <div className="ui-library-section-stack">
      <PrimitiveDemos />
      <SectionCard title="按钮与状态" description="主操作每区最多一个；状态色只由 StatusTag 的 tone 表达。">
        <div className="ui-library-preview">
          <Space wrap>
            <Button type="primary" icon={<IconPlus />}>主操作</Button>
            <Button icon={<IconDownload />}>次操作</Button>
            <Button type="text" icon={<IconRefresh />}>刷新</Button>
            <Button status="danger">危险操作</Button>
            {(Object.keys(DEMO_STATUS) as Array<keyof typeof DEMO_STATUS>).map((key) => (
              <StatusTag key={key} meta={DEMO_STATUS[key]} />
            ))}
            <StatusTag tone="cyan">分类色</StatusTag>
            <StatusTag tone="pink">分类色</StatusTag>
            <StatusTag tone="gold">分类色</StatusTag>
          </Space>
        </div>
        <div className="ui-library-preview">
          <div className="ui-library-preview__label">筛选控件</div>
          <Space wrap>
            <Input prefix={<IconSearch />} placeholder="搜索名称或编号" style={{ width: 240 }} />
            <Select placeholder="选择状态" style={{ width: 160 }} options={['全部', '进行中', '已完成']} />
            <DatePicker style={{ width: 180 }} />
            <Space><Switch defaultChecked /><Text>仅看待处理</Text></Space>
          </Space>
        </div>
      </SectionCard>
    </div>
  );
}

/** 分类速查：基础层不逐一实样，只给「哪类结构只能走设计系统」的判定规则。 */
function FoundationIndex() {
  return (
    <SectionCard title="基础层速查" description="按类别判定该用哪个出口；组合用法见「模块组件」。">
      <DataTable
        rowKey="key"
        pagination={false}
        data={foundationRows}
        columns={[
          { title: '类别', dataIndex: 'category', width: 100 },
          { title: '组件', dataIndex: 'components', width: 260 },
          { title: '使用规则', dataIndex: 'rule' },
        ]}
      />
    </SectionCard>
  );
}

export interface FoundationPanelProps {
  group: string;
  onGroupChange: (group: string) => void;
}

export function FoundationPanel({ group, onGroupChange }: FoundationPanelProps) {
  return (
    <div className="ui-library-section-stack">
      <AlertBanner tone="info">
        这一层只放单值组件与录入控件：金额、状态、等级、日期、标识、图标、输入、选择、上传。
        组合结构（卡片、表格、字段区、页签、二次确认）在「模块组件」，页面骨架在「页面框架」。
      </AlertBanner>
      <SectionTabs
        size="small"
        activeKey={group}
        onChange={onGroupChange}
        items={[
          { key: 'values', label: '值展示', count: 7, content: <ValuesAndControls /> },
          { key: 'forms', label: '录入控件', content: <FormDemos /> },
          { key: 'index', label: '基础层速查', content: <FoundationIndex /> },
        ]}
      />
    </div>
  );
}
