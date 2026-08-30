/**
 * 客户域 mock 数据
 *
 * 从 Customers.tsx 内联数组原样提取，供全局搜索 searchIndex 使用。
 * Customers.tsx 改为 import 本模块，渲染行为零变化。
 */

export interface CustomerSummary {
  key: string;
  name: string;
  type: string;
  industry: string;
  scale: string;
  contact: string;
  phone: string;
  level: string;
  status: string;
  contractCount: number;
  contractAmount: string;
  receivable: string;
  createTime: string;
}

export const CUSTOMERS: CustomerSummary[] = [
  {
    key: 'customer-44',
    name: '示例客户',
    type: '个人',
    industry: '通信',
    scale: '100-500人',
    contact: '-',
    phone: '-',
    level: 'B类',
    status: '未合作',
    contractCount: 0,
    contractAmount: '-',
    receivable: '-',
    createTime: '2026-04-29',
  },
  {
    key: 'lead-5912',
    name: '小红书插件客户',
    type: '企业',
    industry: '软件和信息技术服务',
    scale: '-',
    contact: '-',
    phone: '-',
    level: 'S级',
    status: '合作中',
    contractCount: 1,
    contractAmount: '-',
    receivable: '-',
    createTime: '2026-08-12',
  },
  {
    key: 'lead-5866',
    name: '汽车配件索赔系统客户',
    type: '企业',
    industry: '汽车服务',
    scale: '-',
    contact: '唐**',
    phone: '155****0767',
    level: 'S级',
    status: '合作中',
    contractCount: 1,
    contractAmount: '-',
    receivable: '-',
    createTime: '2026-07-21',
  },
  {
    key: 'lead-5830',
    name: '智能配送机器人项目客户',
    type: '企业',
    industry: '机器人',
    scale: '-',
    contact: '贺**',
    phone: '158****8388',
    level: 'S级',
    status: '合作中',
    contractCount: 1,
    contractAmount: '-',
    receivable: '-',
    createTime: '2026-07-06',
  },
  {
    key: 'lead-5957',
    name: '社区生鲜小程序客户',
    type: '企业',
    industry: '社区零售',
    scale: '-',
    contact: '-',
    phone: '-',
    level: 'B级',
    status: '跟进中',
    contractCount: 0,
    contractAmount: '-',
    receivable: '-',
    createTime: '2026-08-27',
  },
];
