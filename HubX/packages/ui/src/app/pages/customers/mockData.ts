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
    key: '1',
    name: '北京科技有限公司',
    type: '企业',
    industry: '互联网',
    scale: '100-500人',
    contact: '张经理',
    phone: '138****1111',
    level: 'A级',
    status: '合作中',
    contractCount: 3,
    contractAmount: '180万',
    receivable: '30万',
    createTime: '2025-06-15',
  },
  {
    key: '2',
    name: '上海商贸公司',
    type: '企业',
    industry: '零售',
    scale: '50-100人',
    contact: '李总',
    phone: '139****2222',
    level: 'B级',
    status: '跟进中',
    contractCount: 1,
    contractAmount: '45万',
    receivable: '15万',
    createTime: '2025-08-20',
  },
  {
    key: '3',
    name: '深圳电商公司',
    type: '企业',
    industry: '电商',
    scale: '500-1000人',
    contact: '王总',
    phone: '136****3333',
    level: 'A级',
    status: '合作中',
    contractCount: 5,
    contractAmount: '320万',
    receivable: '80万',
    createTime: '2025-03-10',
  },
  {
    key: '4',
    name: '广州金融公司',
    type: '企业',
    industry: '金融',
    scale: '1000人以上',
    contact: '赵经理',
    phone: '137****4444',
    level: 'S级',
    status: '合作中',
    contractCount: 8,
    contractAmount: '680万',
    receivable: '120万',
    createTime: '2024-11-05',
  },
  {
    key: '5',
    name: '成都教育机构',
    type: '机构',
    industry: '教育',
    scale: '100-500人',
    contact: '周主任',
    phone: '135****5555',
    level: 'B级',
    status: '跟进中',
    contractCount: 0,
    contractAmount: '0',
    receivable: '0',
    createTime: '2026-02-12',
  },
];
