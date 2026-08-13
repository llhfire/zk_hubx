import { useState } from 'react';
import { Button, Card, DatePicker, Descriptions, Empty, Form, Grid, Input, InputNumber, Message, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Tooltip, Typography, Upload } from '@arco-design/web-react';
import { IconDelete, IconDownload, IconEdit, IconEye, IconPlus, IconUpload } from '@arco-design/web-react/icon';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';
import type { UploadItem } from '@arco-design/web-react/es/Upload';
import { useEmployee } from '../employee';
import { downloadAttachment, mapUploadFilesToAttachments, type ContractModAttachment } from '../contracts/contractModification';
import type { ProjectDailyReport } from './mockData';
import type { ProjectTeamRow } from './ProjectDetailWorkspace';
import { CURRENT_LOGIN_USER } from '../../currentUser';

const FormItem = Form.Item;
const TabPane = Tabs.TabPane;
const { Text } = Typography;
type CostCategory = '差旅成本' | '推广成本' | '商务成本' | '第三方费用';
type DashboardCategory = '人工成本' | CostCategory;
type CostTabKey = 'overview' | 'labor' | 'travel' | 'promotion' | 'business' | 'comprehensive';
type RankingFilter = '岗位' | '住宿费' | '交通' | '推广' | '商务返点';
type CostStatus = '待确认' | '已核算';
interface ProjectCostItem { id: string; category: CostCategory; subcategory: string; name: string; amount: number; expenseDate: string; handler: string; status: CostStatus; remark: string; attachments: ContractModAttachment[]; }
interface LaborSummaryRow { key: string; employee: string; role: string; totalHours: number; hourlyRate: number; totalCost: number; }
interface LaborNatureSummaryRow extends LaborSummaryRow { workNature: string; }
interface ManualLaborEntry { id: string; date: string; personName: string; position: string; hours: number; workNature: string; workContent: string; riskFeedback: string; }
interface LaborInputItem { id: string; employeeId?: string; hours?: number; workNature?: string; workContent: string; }
interface ProjectCostPanelProps {
  projectName: string;
  projectNo: string;
  contractAmount?: number;
  projectStartDate: string;
  projectEndDate: string;
  teamRows: ProjectTeamRow[];
  dailyReports: ProjectDailyReport[];
  reimbursementItems: Array<{ id: string; expenseType: string; reimbursementAmount: string; applicant: string; createTime: string; status: string }>;
}

const COST_CATEGORIES: CostCategory[] = ['差旅成本', '推广成本', '商务成本', '第三方费用'];
const COST_SUBCATEGORIES: Record<CostCategory, string[]> = {
  差旅成本: ['交通', '高速', '油费', '住宿', '出差补贴'],
  推广成本: ['百度', '抖音', '小红书', '视频号', '其他投流'],
  商务成本: ['商务差旅', '商务接待', '商务返点'],
  第三方费用: ['服务器', '云服务', 'Token', '第三方软件', '其他'],
};
const SAMPLE_COST_ITEMS: ProjectCostItem[] = [
  { id: 'sample-travel-traffic', category: '差旅成本', subcategory: '交通', name: '重庆客户现场往返交通', amount: 1860, expenseDate: '2026-05-08', handler: '王五', status: '已核算', remark: '高铁及市内交通', attachments: [] },
  { id: 'sample-travel-traffic-air', category: '差旅成本', subcategory: '交通', name: '北京客户拜访往返机票', amount: 3260, expenseDate: '2026-05-14', handler: '李四', status: '已核算', remark: '往返机票及机场交通', attachments: [] },
  { id: 'sample-travel-traffic-city', category: '差旅成本', subcategory: '交通', name: '上海驻场市内交通', amount: 1120, expenseDate: '2026-05-21', handler: '赵六', status: '已核算', remark: '驻场期间打车费用', attachments: [] },
  { id: 'sample-travel-highway', category: '差旅成本', subcategory: '高速', name: '客户现场高速通行费', amount: 420, expenseDate: '2026-05-09', handler: '王五', status: '已核算', remark: '', attachments: [] },
  { id: 'sample-travel-fuel', category: '差旅成本', subcategory: '油费', name: '项目车辆加油', amount: 680, expenseDate: '2026-05-10', handler: '赵六', status: '已核算', remark: '', attachments: [] },
  { id: 'sample-travel-hotel', category: '差旅成本', subcategory: '住宿', name: '重庆出差住宿费', amount: 2480, expenseDate: '2026-05-10', handler: '王五', status: '已核算', remark: '4 晚', attachments: [] },
  { id: 'sample-travel-hotel-beijing', category: '差旅成本', subcategory: '住宿', name: '北京客户拜访住宿费', amount: 1980, expenseDate: '2026-05-15', handler: '李四', status: '已核算', remark: '3 晚', attachments: [] },
  { id: 'sample-travel-hotel-shanghai', category: '差旅成本', subcategory: '住宿', name: '上海项目驻场住宿费', amount: 4360, expenseDate: '2026-05-22', handler: '赵六', status: '已核算', remark: '7 晚', attachments: [] },
  { id: 'sample-travel-subsidy', category: '差旅成本', subcategory: '出差补贴', name: '出差餐补及补贴', amount: 960, expenseDate: '2026-05-11', handler: '王五', status: '已核算', remark: '', attachments: [] },
  { id: 'sample-business-dinner', category: '商务成本', subcategory: '商务接待', name: '客户需求沟通晚宴', amount: 3200, expenseDate: '2026-05-15', handler: '王五', status: '已核算', remark: '客户 4 人', attachments: [] },
  { id: 'sample-business-reception', category: '商务成本', subcategory: '商务差旅', name: '客户接待及茶歇', amount: 1280, expenseDate: '2026-05-16', handler: '李四', status: '已核算', remark: '', attachments: [] },
  { id: 'sample-business-negotiation', category: '商务成本', subcategory: '商务返点', name: '合同谈判场地及资料', amount: 860, expenseDate: '2026-05-20', handler: '李四', status: '已核算', remark: '', attachments: [] },
  { id: 'sample-business-rebate-channel', category: '商务成本', subcategory: '商务返点', name: '渠道合作返点', amount: 5200, expenseDate: '2026-05-23', handler: '钱七', status: '已核算', remark: '按阶段回款核算', attachments: [] },
  { id: 'sample-business-rebate-partner', category: '商务成本', subcategory: '商务返点', name: '合作伙伴项目返点', amount: 3600, expenseDate: '2026-05-28', handler: '钱七', status: '已核算', remark: '项目签约返点', attachments: [] },
  { id: 'sample-promotion-baidu', category: '推广成本', subcategory: '百度', name: '百度搜索投流', amount: 6800, expenseDate: '2026-05-06', handler: '钱七', status: '已核算', remark: '品牌词与行业词', attachments: [] },
  { id: 'sample-promotion-douyin', category: '推广成本', subcategory: '抖音', name: '抖音信息流投放', amount: 9800, expenseDate: '2026-05-12', handler: '钱七', status: '已核算', remark: '小程序线索投放', attachments: [] },
  { id: 'sample-promotion-xhs', category: '推广成本', subcategory: '小红书', name: '小红书内容加热', amount: 4200, expenseDate: '2026-05-18', handler: '钱七', status: '已核算', remark: '', attachments: [] },
  { id: 'sample-promotion-video', category: '推广成本', subcategory: '视频号', name: '视频号直播间投流', amount: 3600, expenseDate: '2026-05-22', handler: '钱七', status: '已核算', remark: '', attachments: [] },
  { id: 'sample-comprehensive-server', category: '第三方费用', subcategory: '服务器', name: '生产环境服务器', amount: 4600, expenseDate: '2026-05-05', handler: '张三', status: '已核算', remark: '项目环境按月分摊', attachments: [] },
  { id: 'sample-comprehensive-cloud', category: '第三方费用', subcategory: '云服务', name: '对象存储与数据库', amount: 2380, expenseDate: '2026-05-05', handler: '张三', status: '已核算', remark: '', attachments: [] },
  { id: 'sample-comprehensive-token', category: '第三方费用', subcategory: 'Token', name: 'AI 模型 Token 消耗', amount: 1680, expenseDate: '2026-05-24', handler: '张三', status: '已核算', remark: '开发与测试环境', attachments: [] },
  { id: 'sample-comprehensive-third-party', category: '第三方费用', subcategory: '第三方软件', name: '设计及协作软件订阅', amount: 1980, expenseDate: '2026-05-02', handler: '赵六', status: '已核算', remark: '', attachments: [] },
  { id: 'sample-comprehensive-test-server', category: '第三方费用', subcategory: '服务器', name: '测试环境服务器扩容', amount: 2860, expenseDate: '2026-05-18', handler: '王五', status: '已核算', remark: '测试环境临时扩容', attachments: [] },
  { id: 'sample-comprehensive-monitoring', category: '第三方费用', subcategory: '第三方软件', name: '日志监控服务订阅', amount: 1280, expenseDate: '2026-05-26', handler: '王五', status: '已核算', remark: '项目监控与告警服务', attachments: [] },
];
const COST_COLORS: Record<DashboardCategory, string> = {
  人工成本: '#2f66e9',
  推广成本: '#7c3aed',
  差旅成本: '#dd7400',
  商务成本: '#0f9788',
  第三方费用: '#64748b',
};
const RANKING_FILTERS: RankingFilter[] = ['岗位', '住宿费', '交通', '推广', '商务返点'];
const WORK_NATURE_OPTIONS = ['需求分析', '原型设计', '系统设计', '功能开发', '接口开发', 'Bug修复', '联调测试', '部署发布', '项目管理', '客户沟通', '其他'];
const formatCurrency = (value: number) => `¥${Math.trunc(value).toLocaleString('zh-CN')}`;
const formatOverviewCurrency = formatCurrency;
const parseAmount = (value: string) => Number.isFinite(Number(value.replace(/,/g, ''))) ? Math.trunc(Number(value.replace(/,/g, ''))) : 0;
const getMockHourlyRate = (name: string) => 500 + Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 501;
const formatLocalDate = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

function renderCostPieLabel({ cx, cy, midAngle, outerRadius, name, percent }: { cx: number; cy: number; midAngle: number; outerRadius: number; name: string; percent: number }) {
  const angle = -midAngle * Math.PI / 180;
  const insideX = cx + outerRadius * 0.58 * Math.cos(angle);
  const insideY = cy + outerRadius * 0.58 * Math.sin(angle);
  const edgeX = cx + outerRadius * Math.cos(angle);
  const edgeY = cy + outerRadius * Math.sin(angle);
  const bendX = cx + (outerRadius + 16) * Math.cos(angle);
  const bendY = cy + (outerRadius + 16) * Math.sin(angle);
  const rightSide = Math.cos(angle) >= 0;
  const labelX = bendX + (rightSide ? 18 : -18);
  const fontSize = percent < 0.08 ? 9 : 11;
  return <g pointerEvents="none">
    <text x={insideX} y={insideY} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={600}>
      {(percent * 100).toFixed(1)}%
    </text>
    <polyline points={`${edgeX},${edgeY} ${bendX},${bendY} ${labelX},${bendY}`} fill="none" stroke="#94a3b8" strokeWidth="1" />
    <text x={labelX + (rightSide ? 4 : -4)} y={bendY} fill="#475569" textAnchor={rightSide ? 'start' : 'end'} dominantBaseline="central" fontSize="12">
      {name}
    </text>
  </g>;
}

function countWorkdays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    if (date.getDay() !== 0 && date.getDay() !== 6) count += 1;
  }
  return count;
}

export function ProjectCostPanel({ projectName, projectNo, contractAmount, projectStartDate, projectEndDate, teamRows, dailyReports, reimbursementItems }: ProjectCostPanelProps) {
  const { employees } = useEmployee();
  const [form] = Form.useForm();
  const [editorId, setEditorId] = useState<string | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [laborEditorVisible, setLaborEditorVisible] = useState(false);
  const [manualLaborEntries, setManualLaborEntries] = useState<ManualLaborEntry[]>([]);
  const [laborInputItems, setLaborInputItems] = useState<LaborInputItem[]>([{ id: 'labor-input-1', workContent: '' }]);
  const [activeTab, setActiveTab] = useState<CostTabKey>('overview');
  const [laborRoleFilter, setLaborRoleFilter] = useState('all');
  const [laborView, setLaborView] = useState<'person' | 'nature'>('person');
  const [selectedLaborRow, setSelectedLaborRow] = useState<LaborSummaryRow | null>(null);
  const [selectedLaborMonth, setSelectedLaborMonth] = useState('all');
  const [laborDetailStartDate, setLaborDetailStartDate] = useState('');
  const [laborDetailEndDate, setLaborDetailEndDate] = useState('');
  const [selectedCostItem, setSelectedCostItem] = useState<ProjectCostItem | null>(null);
  const [timeDimension, setTimeDimension] = useState<'日' | '月' | '年'>('月');
  const [rankingFilter, setRankingFilter] = useState<RankingFilter>('岗位');
  const [items, setItems] = useState<ProjectCostItem[]>(() => [...SAMPLE_COST_ITEMS, ...reimbursementItems.filter(item => item.status === '已报销').map(item => ({
    id: `reimbursement-${item.id}`, category: '差旅成本', subcategory: item.expenseType || '交通', name: item.expenseType || '项目报销', amount: parseAmount(item.reimbursementAmount), expenseDate: item.createTime.slice(0, 10), handler: item.applicant, status: '已核算', remark: '来源：项目报销记录', attachments: [],
  }))]);

  const workdays = countWorkdays(projectStartDate, projectEndDate);
  const employeeRateMap = new Map(employees.map(employee => [employee.name, employee.standardHourlyRate]));
  const expectedLaborRows = teamRows.flatMap(row => row.members.map(member => {
    const hourlyRate = employeeRateMap.get(member) ?? 0;
    const hours = workdays * 8 * row.allocation / 100;
    return { key: `${row.id}-${member}`, member, role: row.role, hourlyRate, hours, cost: hours * hourlyRate };
  }));
  const allLaborRecords = [...dailyReports, ...manualLaborEntries];
  const getRecordWorkNature = (report: ProjectDailyReport | ManualLaborEntry) => {
    if ('workNature' in report && report.workNature) return report.workNature;
    const content = report.workContent || '';
    if (/需求|梳理|分析/.test(content)) return '需求分析';
    if (/原型/.test(content)) return '原型设计';
    if (/设计|架构/.test(content)) return '系统设计';
    if (/Bug|修复|问题/.test(content)) return 'Bug修复';
    if (/测试|联调|验收/.test(content)) return '联调测试';
    if (/部署|上线|发布/.test(content)) return '部署发布';
    if (/沟通|客户|会议/.test(content)) return '客户沟通';
    return '功能开发';
  };
  const selectedLaborRecords = selectedLaborRow
    ? allLaborRecords
      .filter(report => report.personName === selectedLaborRow.employee && (laborView === 'nature' ? getRecordWorkNature(report) === (selectedLaborRow as LaborNatureSummaryRow).workNature : report.position === selectedLaborRow.role))
      .sort((left, right) => right.date.localeCompare(left.date))
    : [];
  const laborMonthOptions = Array.from(new Set(selectedLaborRecords.map(report => report.date.slice(0, 7))))
    .sort((left, right) => right.localeCompare(left));
  const monthFilteredLaborRecords = selectedLaborMonth === 'all'
    ? selectedLaborRecords
    : selectedLaborRecords.filter(report => report.date.startsWith(selectedLaborMonth));
  const visibleLaborRecords = monthFilteredLaborRecords.filter(report => (!laborDetailStartDate || report.date >= laborDetailStartDate) && (!laborDetailEndDate || report.date <= laborDetailEndDate));
  const visibleLaborHours = visibleLaborRecords.reduce((total, report) => total + report.hours, 0);
  const laborRows = allLaborRecords.reduce<LaborSummaryRow[]>((rows, report) => {
    const key = `${report.personName}-${report.position}`;
    const current = rows.find(row => row.key === key);
    if (current) {
      current.totalHours += report.hours;
      current.totalCost = Math.trunc(current.totalHours * current.hourlyRate);
    } else {
      const hourlyRate = getMockHourlyRate(report.personName);
      rows.push({ key, employee: report.personName, role: report.position, totalHours: report.hours, hourlyRate, totalCost: Math.trunc(report.hours * hourlyRate) });
    }
    return rows;
  }, []);
  const laborRoleOptions = Array.from(new Set(laborRows.map(row => row.role))).map(value => ({ label: value, value }));
  const visibleLaborRows = laborRoleFilter === 'all' ? laborRows : laborRows.filter(row => row.role === laborRoleFilter);
  const laborNatureRows = allLaborRecords.reduce<LaborNatureSummaryRow[]>((rows, report) => {
    const workNature = getRecordWorkNature(report);
    const key = `${report.personName}-${workNature}`;
    const current = rows.find(row => row.key === key);
    if (current) { current.totalHours += report.hours; current.totalCost = Math.trunc(current.totalHours * current.hourlyRate); }
    else { const hourlyRate = getMockHourlyRate(report.personName); rows.push({ key, employee: report.personName, role: report.position, workNature, totalHours: report.hours, hourlyRate, totalCost: Math.trunc(report.hours * hourlyRate) }); }
    return rows;
  }, []);
  const activeLaborRows = laborView === 'person' ? visibleLaborRows : laborNatureRows;
  const activeLaborHours = activeLaborRows.reduce((sum, row) => sum + row.totalHours, 0);
  const activeLaborCost = activeLaborRows.reduce((sum, row) => sum + row.totalCost, 0);
  const expectedLaborCost = expectedLaborRows.reduce((sum, row) => sum + row.cost, 0);
  const actualLaborCost = laborRows.reduce((sum, row) => sum + row.totalCost, 0);
  const otherExpectedCost = items.reduce((sum, item) => sum + item.amount, 0);
  const otherActualCost = items.filter(item => item.status === '已核算').reduce((sum, item) => sum + item.amount, 0);
  const expectedTotalCost = expectedLaborCost + otherExpectedCost;
  const actualTotalCost = actualLaborCost + otherActualCost;
  const expectedProfit = contractAmount == null ? null : contractAmount - expectedTotalCost;
  const actualProfit = contractAmount == null ? null : contractAmount - actualTotalCost;
  const expectedMargin = contractAmount ? expectedProfit! / contractAmount * 100 : null;
  const actualMargin = contractAmount ? actualProfit! / contractAmount * 100 : null;
  const tabCategoryMap: Record<Exclude<CostTabKey, 'overview'>, DashboardCategory> = {
    labor: '人工成本', travel: '差旅成本', promotion: '推广成本', business: '商务成本', comprehensive: '第三方费用',
  };
  const categoryTabMap: Record<DashboardCategory, CostTabKey> = {
    人工成本: 'labor', 差旅成本: 'travel', 推广成本: 'promotion', 商务成本: 'business', 第三方费用: 'comprehensive',
  };
  const activeCategory = activeTab === 'overview' ? '人工成本' : tabCategoryMap[activeTab];
  const openLaborEditor = () => {
    setLaborInputItems([{ id: `labor-input-${Date.now()}`, workContent: '' }]);
    setLaborEditorVisible(true);
  };
  const updateLaborInputItem = (id: string, patch: Partial<LaborInputItem>) => {
    setLaborInputItems(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
  };
  const saveLaborEntries = () => {
    const invalidItem = laborInputItems.find(item => !item.employeeId || !item.hours || !item.workNature || !item.workContent.trim());
    if (invalidItem) {
      Message.warning('请完整填写每一项的员工、工时、工作性质和工作内容');
      return;
    }
    const date = formatLocalDate(new Date());
    setManualLaborEntries(current => [...current, ...laborInputItems.flatMap((item, index) => {
      const employee = employees.find(currentEmployee => currentEmployee.id === item.employeeId);
      return employee ? [{
        id: `manual-labor-${Date.now()}-${index}`,
        date,
        personName: employee.name,
        position: employee.position,
        hours: item.hours!,
        workNature: item.workNature!,
        workContent: item.workContent.trim(),
        riskFeedback: '',
      }] : [];
    })]);
    setLaborEditorVisible(false);
    Message.success(`已新增 ${laborInputItems.length} 项工时`);
  };
  const closeEditor = () => { setEditorVisible(false); setEditorId(null); form.resetFields(); };
  const openNew = () => {
    setEditorId(null);
    setEditorVisible(true);
    form.resetFields();
    form.setFieldsValue({
      category: activeCategory === '人工成本' ? '差旅成本' : activeCategory,
      expenseDate: formatLocalDate(new Date()),
      handler: CURRENT_LOGIN_USER.name,
    });
  };
  const openEdit = (item: ProjectCostItem) => {
    setEditorId(item.id);
    setEditorVisible(true);
    form.setFieldsValue({
      ...item,
      attachments: item.attachments.map(file => ({ uid: file.id, name: file.name, status: 'done' })),
    });
  };
  const saveItem = () => form.validate().then(values => {
    const existingAttachments = editorId ? items.find(item => item.id === editorId)?.attachments ?? [] : [];
    const attachments = ((values.attachments ?? []) as UploadItem[]).map(file => existingAttachments.find(existing => existing.id === file.uid) ?? mapUploadFilesToAttachments([file])[0]);
    const next: ProjectCostItem = { id: editorId ?? `project-cost-${Date.now()}`, category: values.category, subcategory: values.subcategory, name: values.name.trim(), amount: Math.trunc(Number(values.amount)), expenseDate: values.expenseDate, handler: values.handler, status: '已核算', remark: values.remark?.trim() ?? '', attachments };
    setItems(current => editorId ? current.map(item => item.id === editorId ? next : item) : [next, ...current]);
    Message.success(editorId ? '开支项已更新' : '开支项已新增'); closeEditor();
  });
  const dashboardRows: Array<{ category: DashboardCategory; amount: number }> = [
    { category: '人工成本', amount: actualLaborCost },
    ...(['推广成本', '差旅成本', '商务成本', '第三方费用'] as CostCategory[]).map(category => ({ category, amount: items.filter(item => item.category === category && item.status === '已核算').reduce((sum, item) => sum + item.amount, 0) })),
  ];
  const costCompositionRows = dashboardRows
    .map(row => ({
      ...row,
      label: row.category,
      percentage: actualTotalCost ? row.amount / actualTotalCost * 100 : 0,
    }))
    .sort((left, right) => right.amount - left.amount);
  const roleRankingRows = laborRows.reduce<Array<{ id: string; name: string; category: DashboardCategory; amount: number }>>((rows, row) => {
    const current = rows.find(item => item.id === row.role);
    if (current) current.amount += row.totalCost;
    else rows.push({ id: row.role, name: row.role, category: '人工成本', amount: row.totalCost });
    return rows;
  }, []);
  const costRankingRows = items
    .filter(item => item.status === '已核算')
    .filter(item => {
      if (rankingFilter === '住宿费') return item.category === '差旅成本' && item.subcategory === '住宿';
      if (rankingFilter === '交通') return item.category === '差旅成本' && item.subcategory === '交通';
      if (rankingFilter === '推广') return item.category === '推广成本';
      if (rankingFilter === '商务返点') return item.category === '商务成本' && item.subcategory === '商务返点';
      return false;
    })
    .map(item => ({ id: item.id, name: item.name, category: item.category as DashboardCategory, amount: item.amount }));
  const expenseRankingRows = (rankingFilter === '岗位' ? roleRankingRows : costRankingRows)
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 8);
  const maxRankingAmount = expenseRankingRows[0]?.amount ?? 0;
  const exportCostSummary = () => {
    const rows = [['项目序号', '项目名称', '项目编号', '费用大类', '费用小类/岗位', '金额', '发生日期', '经办人', '说明'],
      ...laborRows.map((row, index) => [String(index + 1), projectName, projectNo, '人工成本', row.role, String(Math.trunc(row.totalCost)), '', row.employee, `总工时：${row.totalHours}`]),
      ...items.map((item, index) => [String(laborRows.length + index + 1), projectName, projectNo, item.category, item.subcategory, String(Math.trunc(item.amount)), item.expenseDate, item.handler, item.remark])];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${projectNo || projectName}-成本总表.csv`; link.click(); URL.revokeObjectURL(url);
    Message.success('成本总表已导出');
  };

  const renderExpenseTab = (category: CostCategory, title: string, splitIntoTabs = false) => {
    const categoryItems = items.filter(item => item.category === category);
    const supportsDetailView = category === '差旅成本' || category === '推广成本' || category === '商务成本' || category === '第三方费用';
    const categoryTotal = categoryItems.reduce((sum, item) => sum + item.amount, 0);
    const subgroupRows = categoryItems.reduce<Array<{ name: string; amount: number }>>((rows, item) => {
      const current = rows.find(row => row.name === item.subcategory);
      if (current) current.amount += item.amount; else rows.push({ name: item.subcategory, amount: item.amount });
      return rows;
    }, []);
    const periodRows = categoryItems.reduce<Array<{ period: string; amount: number; count: number }>>((rows, item) => {
      const period = timeDimension === '年' ? item.expenseDate.slice(0, 4) : timeDimension === '月' ? item.expenseDate.slice(0, 7) : item.expenseDate;
      const current = rows.find(row => row.period === period);
      if (current) { current.amount += item.amount; current.count += 1; } else rows.push({ period, amount: item.amount, count: 1 });
      return rows;
    }, []).sort((a, b) => b.period.localeCompare(a.period));
    const summarySection = <div className="project-cost-section project-cost-detail-section">
      <div className="project-cost-detail-heading"><span>分类汇总</span><strong>{title}</strong><small>按费用小类统计</small></div>
      <Table rowKey="name" pagination={false} data={subgroupRows} noDataElement={<Empty description={`暂无${title}数据`} />} columns={[{ title: '费用小类', dataIndex: 'name' }, { title: '金额', dataIndex: 'amount', sorter: (left, right) => left.amount - right.amount, defaultSortOrder: 'descend', render: (value: number) => <strong>{formatCurrency(value)}</strong> }, { title: '占比', dataIndex: 'amount', render: (value: number) => `${categoryTotal ? (value / categoryTotal * 100).toFixed(1) : '0.0'}%` }]} />
    </div>;
    const detailSection = <div className="project-cost-section">
      <div className="project-cost-section-header">
        <div className="project-cost-section-title">{title}明细</div>
        <Space size="mini">
          <Button size="small" icon={<IconUpload />}>导入</Button>
          <Button size="small" icon={<IconDownload />}>导出</Button>
        </Space>
      </div>
      <Table rowKey="id" pagination={false} data={categoryItems} noDataElement={<Empty description={`暂无${title}数据`} />} scroll={{ x: 1040 }} columns={[
        { title: '费用小类', dataIndex: 'subcategory', width: 112 }, { title: '开支项目', dataIndex: 'name', width: 150 }, { title: '金额', dataIndex: 'amount', width: 120, sorter: (left: ProjectCostItem, right: ProjectCostItem) => left.amount - right.amount, defaultSortOrder: 'descend', render: (value: number) => <strong className="project-cost-amount">{formatCurrency(value)}</strong> }, { title: '发生日期', dataIndex: 'expenseDate', width: 112 },
        ...(category === '第三方费用' ? [] : [{ title: '经办人', dataIndex: 'handler', width: 96 }]),
        ...(supportsDetailView ? [] : [
          { title: '核算状态', dataIndex: 'status', width: 96, render: (value: CostStatus) => <Tag color={value === '已核算' ? 'green' : 'orange'}>{value}</Tag> },
          { title: '付款凭证/附件', dataIndex: 'attachments', width: 180, render: (files: ContractModAttachment[]) => files.length ? <Space size="mini" wrap>{files.map(file => <Button key={file.id} type="text" size="mini" onClick={() => downloadAttachment(file)}>{file.name}</Button>)}</Space> : '-' },
          { title: '说明', dataIndex: 'remark', width: 160, render: (value: string) => value || '-' },
        ]),
        { title: '操作', width: supportsDetailView ? 124 : 88, fixed: 'right' as const, render: (_: unknown, item: ProjectCostItem) => <Space size="mini">{supportsDetailView && <Tooltip content="查看"><Button type="text" size="small" icon={<IconEye />} aria-label="查看" onClick={() => setSelectedCostItem(item)} /></Tooltip>}<Tooltip content="编辑"><Button type="text" size="small" icon={<IconEdit />} aria-label="编辑" onClick={() => openEdit(item)} /></Tooltip><Popconfirm title="确认删除该开支项吗？" onOk={() => { setItems(current => current.filter(cost => cost.id !== item.id)); Message.success('开支项已删除'); }}><Tooltip content="删除"><Button type="text" size="small" status="danger" icon={<IconDelete />} aria-label="删除" /></Tooltip></Popconfirm></Space> },
      ]} />
    </div>;
    const periodSection = <div className="project-cost-section">
      <div className="project-cost-period-header"><div className="project-cost-period-title">按{timeDimension}统计</div><Space size="mini">{(['日', '月', '年'] as const).map(dimension => <Button key={dimension} size="small" type={timeDimension === dimension ? 'primary' : 'secondary'} onClick={() => setTimeDimension(dimension)}>按{dimension === '日' ? '天' : dimension}</Button>)}</Space></div><Table rowKey="period" pagination={false} data={periodRows} columns={[{ title: timeDimension, dataIndex: 'period' }, { title: '笔数', dataIndex: 'count' }, { title: '金额', dataIndex: 'amount', sorter: (left, right) => left.amount - right.amount, defaultSortOrder: 'descend', render: (value: number) => formatCurrency(value) }]} />
    </div>;
    if (splitIntoTabs) return <Tabs defaultActiveTab="statistics">
      <TabPane key="statistics" title="统计"><Space direction="vertical" size={16} style={{ width: '100%' }}>{summarySection}{periodSection}</Space></TabPane>
      <TabPane key="details" title="明细">{detailSection}</TabPane>
    </Tabs>;
    return <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {summarySection}{detailSection}{periodSection}
    </Space>;
  };

  return <div className="project-cost-panel">
    <Tabs
      activeTab={activeTab}
      onChange={(key) => setActiveTab(key as CostTabKey)}
      className="project-cost-tabs"
      extra={activeTab === 'labor'
        ? <Button type="primary" size="small" icon={<IconPlus />} onClick={openLaborEditor}>新增工时</Button>
        : (['travel', 'promotion', 'business', 'comprehensive'] as CostTabKey[]).includes(activeTab)
          ? <Button type="primary" size="small" icon={<IconPlus />} onClick={openNew}>新增开支</Button>
          : null}
    >
      <TabPane key="overview" title="概览">
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div className="project-cost-summary">
            <Card bordered={false} className="project-cost-metric-card is-contract"><div className="project-cost-metric-label"><span />合同金额</div><strong>{contractAmount == null ? '-' : formatOverviewCurrency(contractAmount)}</strong><small>项目合同含税总金额</small></Card>
            <Card bordered={false} className="project-cost-metric-card is-estimated"><div className="project-cost-metric-label"><span />预计总成本</div><strong>{formatOverviewCurrency(expectedTotalCost)}</strong><small>预算成本占合同额 {contractAmount ? `${(expectedTotalCost / contractAmount * 100).toFixed(1)}%` : '-'}</small></Card>
            <Card bordered={false} className="project-cost-metric-card is-actual"><div className="project-cost-metric-label"><span />实际消耗</div><strong>{formatOverviewCurrency(actualTotalCost)}</strong><small>含实际人工 {formatOverviewCurrency(actualLaborCost)}</small></Card>
            <Card bordered={false} className={`project-cost-metric-card ${expectedProfit != null && expectedProfit < 0 ? 'is-loss' : 'is-profit'}`}><div className="project-cost-metric-label"><span />项目利润</div><strong>{expectedProfit == null ? '-' : formatOverviewCurrency(expectedProfit)}</strong><small>预计利润率 {expectedMargin == null ? '-' : `${expectedMargin.toFixed(1)}%`} · 实际 {actualMargin == null ? '-' : `${actualMargin.toFixed(1)}%`}</small></Card>
          </div>
          {contractAmount == null && <div className="project-cost-notice">当前项目未关联合同，暂不计算利润与利润率。</div>}
          <div className="project-cost-insight-grid">
            <Card className="project-cost-composition-card" title="成本构成">
              <div className="project-cost-composition-content">
                <div className="project-cost-donut-wrap">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={costCompositionRows} dataKey="amount" nameKey="label" cx="50%" cy="50%" innerRadius={0} outerRadius={108} startAngle={90} endAngle={-270} paddingAngle={0} label={renderCostPieLabel} labelLine={false} isAnimationActive animationDuration={800} animationEasing="ease-out" onClick={(_, index) => setActiveTab(categoryTabMap[costCompositionRows[index].category])}>
                        {costCompositionRows.map(row => <Cell key={row.category} fill={COST_COLORS[row.category]} stroke="#fff" strokeWidth={2} />)}
                      </Pie>
                      <ChartTooltip formatter={(value: number) => formatOverviewCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="project-cost-composition-legend">{costCompositionRows.map(row => <button type="button" key={row.category} onClick={() => setActiveTab(categoryTabMap[row.category])}><i style={{ background: COST_COLORS[row.category] }} /><span>{row.label}</span><strong>{formatOverviewCurrency(row.amount)}</strong><em>{row.percentage.toFixed(1)}%</em></button>)}</div>
              </div>
            </Card>
            <Card className="project-cost-ranking-card" title="费用明细排行" extra={<Text type="secondary">按已核算金额排序</Text>}>
              <Space size="mini" wrap style={{ marginBottom: 16 }}>
                {RANKING_FILTERS.map(filter => (
                  <Button key={filter} size="small" type={rankingFilter === filter ? 'primary' : 'secondary'} onClick={() => setRankingFilter(filter)}>
                    {filter}
                  </Button>
                ))}
              </Space>
              {expenseRankingRows.length ? <div className="project-cost-ranking-list">{expenseRankingRows.map((row, index) => <button type="button" key={row.id} onClick={() => setActiveTab(categoryTabMap[row.category])}><span className={`project-cost-rank-index${index < 3 ? ' is-top' : ''}`}>{index + 1}</span><div><div className="project-cost-rank-name"><span>{row.name}</span><strong>{formatOverviewCurrency(row.amount)}</strong></div><div className="project-cost-rank-bar"><i style={{ width: `${maxRankingAmount ? row.amount / maxRankingAmount * 100 : 0}%`, background: COST_COLORS[row.category] }} /></div><small>{row.category}</small></div></button>)}</div> : <Empty description="暂无已核算费用" />}
            </Card>
          </div>
        </Space>
      </TabPane>
      <TabPane key="labor" title="人工成本">
        <div className="project-cost-section">
          <Tabs activeTab={laborView} onChange={value => { setLaborView(value as 'person' | 'nature'); setLaborRoleFilter('all'); }}>
            <TabPane key="person" title="按人员" />
            <TabPane key="nature" title="按工作性质" />
          </Tabs>
          <div className="project-cost-section-header" style={{ marginTop: 15 }}>
            <Space size={20}><Text type="secondary">总工时 <strong style={{ color: 'var(--color-text-1)' }}>{activeLaborHours} 小时</strong></Text><Text type="secondary">总成本 <strong className="project-cost-amount">{formatCurrency(activeLaborCost)}</strong></Text></Space>
            <Space>
              {laborView === 'person' && <Select value={laborRoleFilter} options={[{ label: '全部', value: 'all' }, ...laborRoleOptions]} onChange={setLaborRoleFilter} style={{ width: 160 }} />}
              <Button icon={<IconDownload />} onClick={exportCostSummary}>导出费用明细</Button>
            </Space>
          </div>
          <Table rowKey="key" pagination={false} data={activeLaborRows} noDataElement={<Empty description="暂无项目日报工时数据" />} columns={[
            { title: '员工', dataIndex: 'employee' },
            laborView === 'person' ? { title: '岗位', dataIndex: 'role' } : { title: '工作性质', dataIndex: 'workNature' },
            { title: '总工时', dataIndex: 'totalHours', sorter: (left: LaborSummaryRow, right: LaborSummaryRow) => left.totalHours - right.totalHours, render: (value: number) => `${value} 小时` },
            { title: '总成本', dataIndex: 'totalCost', sorter: (left: LaborSummaryRow, right: LaborSummaryRow) => left.totalCost - right.totalCost, defaultSortOrder: 'descend', render: (value: number) => <strong className="project-cost-amount">{formatCurrency(value)}</strong> },
            { title: '操作', width: 120, render: (_: unknown, row: LaborSummaryRow) => <Button type="text" size="small" onClick={() => { setSelectedLaborMonth('all'); setLaborDetailStartDate(''); setLaborDetailEndDate(''); setSelectedLaborRow(row); }}>查看日报</Button> },
          ]} />
        </div>
      </TabPane>
      <TabPane key="travel" title="差旅成本">{renderExpenseTab('差旅成本', '差旅成本', true)}</TabPane>
      <TabPane key="promotion" title="推广成本">{renderExpenseTab('推广成本', '推广成本', true)}</TabPane>
      <TabPane key="business" title="商务成本">{renderExpenseTab('商务成本', '商务成本', true)}</TabPane>
      <TabPane key="comprehensive" title="第三方费用">{renderExpenseTab('第三方费用', '第三方费用', true)}</TabPane>
    </Tabs>
    <Modal title={selectedCostItem ? `${selectedCostItem.category}详情` : '开支详情'} visible={Boolean(selectedCostItem)} footer={null} onCancel={() => setSelectedCostItem(null)} style={{ width: 680 }}>
      {selectedCostItem && <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <Descriptions
          border
          column={2}
          data={[
            { label: '费用小类', value: selectedCostItem.subcategory },
            { label: '金额', value: formatCurrency(selectedCostItem.amount) },
            { label: '开支项目', value: selectedCostItem.name },
            { label: '发生日期', value: selectedCostItem.expenseDate },
            { label: '经办人', value: selectedCostItem.handler },
            { label: '核算状态', value: <Tag color={selectedCostItem.status === '已核算' ? 'green' : 'orange'}>{selectedCostItem.status}</Tag> },
            { label: '说明', value: selectedCostItem.remark || '-' },
          ]}
        />
        <div><Text type="secondary">付款凭证/附件</Text><div style={{ marginTop: 8 }}>{selectedCostItem.attachments.length ? <Space wrap>{selectedCostItem.attachments.map(file => <Button key={file.id} type="text" size="small" onClick={() => downloadAttachment(file)}>{file.name}</Button>)}</Space> : '-'}</div></div>
      </Space>}
    </Modal>
    <Modal title={selectedLaborRow ? `${selectedLaborRow.employee}的日报明细` : '日报明细'} visible={Boolean(selectedLaborRow)} footer={null} onCancel={() => setSelectedLaborRow(null)} style={{ width: 920, maxWidth: 'calc(100vw - 32px)' }}>
      <div className="project-daily-detail-toolbar">
        <div className="project-daily-detail-months">
          <Button size="small" type={selectedLaborMonth === 'all' ? 'primary' : 'secondary'} onClick={() => setSelectedLaborMonth('all')}>全部</Button>
          {laborMonthOptions.map(month => (
            <Button key={month} size="small" type={selectedLaborMonth === month ? 'primary' : 'secondary'} onClick={() => setSelectedLaborMonth(month)}>
              {Number(month.slice(5))}月
            </Button>
          ))}
        </div>
      </div>
      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker value={laborDetailStartDate || undefined} placeholder="开始日期" onChange={value => setLaborDetailStartDate((value as string) || '')} style={{ width: 160 }} />
        <span style={{ color: 'var(--color-text-3)' }}>至</span>
        <DatePicker value={laborDetailEndDate || undefined} placeholder="结束日期" onChange={value => setLaborDetailEndDate((value as string) || '')} style={{ width: 160 }} />
        <Button onClick={() => { setLaborDetailStartDate(''); setLaborDetailEndDate(''); }}>重置日期</Button>
      </Space>
      <Table
        rowKey="id"
        pagination={false}
        scroll={{ y: 440 }}
        data={visibleLaborRecords}
        noDataElement={<Empty description="当前筛选条件下暂无日报明细" />}
        columns={[
          { title: '日期', dataIndex: 'date', width: 120 },
          { title: '岗位', dataIndex: 'position', width: 140 },
          { title: '工时', dataIndex: 'hours', width: 100, render: (value: number) => `${value} 小时` },
          { title: '工作性质', dataIndex: 'workNature', width: 130, render: (value: string) => value || '-' },
          { title: '工作内容', dataIndex: 'workContent' },
        ]}
      />
      <div className="project-daily-detail-total">
        <div><span>日报记录</span><strong>{visibleLaborRecords.length}</strong><small>条</small></div>
        <div><span>总工时</span><strong>{visibleLaborHours}</strong><small>小时</small></div>
      </div>
    </Modal>
    <Modal title="新增工时" visible={laborEditorVisible} onOk={saveLaborEntries} onCancel={() => setLaborEditorVisible(false)} style={{ width: 760 }} maskClosable={false} okText="保存">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {laborInputItems.map((item, index) => <Card key={item.id} size="small" title={`工时项 ${index + 1}`} extra={laborInputItems.length > 1 ? <Button type="text" size="mini" status="danger" icon={<IconDelete />} onClick={() => setLaborInputItems(current => current.filter(currentItem => currentItem.id !== item.id))}>删除</Button> : null}>
          <Grid.Row gutter={16}>
            <Grid.Col span={10}>
              <div style={{ marginBottom: 6 }}>员工</div>
              <Select showSearch value={item.employeeId} onChange={value => updateLaborInputItem(item.id, { employeeId: value })} placeholder="请选择员工" options={employees.map(employee => ({ label: `${employee.name}（${employee.position}）`, value: employee.id }))} />
            </Grid.Col>
            <Grid.Col span={6}>
              <div style={{ marginBottom: 6 }}>工时（小时）</div>
              <InputNumber min={0.5} precision={1} step={0.5} value={item.hours} onChange={value => updateLaborInputItem(item.id, { hours: value ?? undefined })} placeholder="请输入工时" style={{ width: '100%' }} />
            </Grid.Col>
            <Grid.Col span={8}>
              <div style={{ marginBottom: 6 }}>工作性质</div>
              <Select value={item.workNature} onChange={value => updateLaborInputItem(item.id, { workNature: value })} placeholder="请选择工作性质" options={WORK_NATURE_OPTIONS.map(value => ({ label: value, value }))} />
            </Grid.Col>
          </Grid.Row>
          <div style={{ marginTop: 12, marginBottom: 6 }}>工作内容</div>
          <Input.TextArea value={item.workContent} onChange={value => updateLaborInputItem(item.id, { workContent: value })} placeholder="请输入具体工作内容" rows={2} maxLength={300} showWordLimit />
        </Card>)}
        <Button type="outline" long icon={<IconPlus />} onClick={() => setLaborInputItems(current => [...current, { id: `labor-input-${Date.now()}`, workContent: '' }])}>新增一项</Button>
      </Space>
    </Modal>
    <Modal title={editorId ? '编辑开支项' : '新增开支项'} visible={editorVisible} onOk={saveItem} onCancel={closeEditor} style={{ width: 620 }} maskClosable={false}><Form form={form} layout="vertical">
      <Grid.Row gutter={16}><Grid.Col span={12}><FormItem label="费用大类" field="category" rules={[{ required: true, message: '请选择费用大类' }]}><Select options={COST_CATEGORIES.map(value => ({ label: value, value }))} onChange={() => form.setFieldValue('subcategory', undefined)} /></FormItem></Grid.Col><Grid.Col span={12}><FormItem shouldUpdate noStyle>{values => <FormItem label="费用小类" field="subcategory" rules={[{ required: true, message: '请选择费用小类' }]}><Select options={(COST_SUBCATEGORIES[values.category as CostCategory] ?? []).map(value => ({ label: value, value }))} /></FormItem>}</FormItem></Grid.Col></Grid.Row>
      <FormItem label="开支项目" field="name" rules={[{ required: true, message: '请填写开支项目' }]}><Input placeholder="如：重庆出差住宿费" /></FormItem>
      <Grid.Row gutter={16}><Grid.Col span={12}><FormItem label="金额" field="amount" rules={[{ required: true, message: '请填写金额' }]}><InputNumber min={1} precision={0} prefix="¥" style={{ width: '100%' }} /></FormItem></Grid.Col><Grid.Col span={12}><FormItem label="发生日期" field="expenseDate" rules={[{ required: true, message: '请选择发生日期' }]}><DatePicker style={{ width: '100%' }} /></FormItem></Grid.Col></Grid.Row>
      <FormItem label="经办人" field="handler" rules={[{ required: true, message: '请选择经办人' }]}><Select showSearch options={employees.map(employee => ({ label: employee.name, value: employee.name }))} /></FormItem>
      <FormItem label="说明" field="remark"><Input.TextArea rows={3} maxLength={200} showWordLimit /></FormItem>
      <FormItem label="附件" field="attachments" triggerPropName="fileList">
        <Upload
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar"
          multiple
          autoUpload={false}
          tip="支持上传文档、表格、图片、压缩包等附件，可多选"
        >
          <Button icon={<IconUpload />}>选择附件</Button>
        </Upload>
      </FormItem>
    </Form></Modal>
  </div>;
}
