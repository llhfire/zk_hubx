import type { Customer, CustomerSummary } from './types';

const at = '2026-08-31T09:00:00.000Z';

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'customer-pawkey', kind: 'enterprise', name: '重庆绮算法科技有限公司', creditCode: '91500103MACP4W9E6X', industry: '宠物服务', scale: '20-99人', address: '重庆市渝中区时代天街 18 号', source: '小红书', ownerId: 'sales-huangyi', ownerName: '黄奕', level: 'S', active: true,
    contacts: [
      { id: 'pawkey-contact-product', name: '陈女士', position: '产品负责人', phone: '13800005942', wechat: 'pawkey_product', email: 'product@pawkey.cn', birthday: '09-18', isPrimary: true, active: true, referenced: true, createdAt: '2026-04-12T10:00:00.000Z' },
      { id: 'pawkey-contact-tech', name: '周工', position: '技术负责人', phone: '13900005942', email: 'tech@pawkey.cn', birthday: '12-06', isPrimary: false, active: true, referenced: true, createdAt: '2026-05-08T10:00:00.000Z' },
    ],
    invoiceProfile: { title: '重庆绮算法科技有限公司', taxNo: '91500103MACP4W9E6X', bankName: '招商银行重庆时代天街支行', bankAccount: '1234567890123456', address: '重庆市渝中区时代天街 18 号', phone: '023-68885942', updatedAt: at }, invoiceHistory: [], createdAt: '2026-04-12T10:00:00.000Z', updatedAt: at,
  },
  {
    id: 'lead-5912', kind: 'enterprise', name: '小红书插件客户', creditCode: '91420100MA4K59120A', industry: '软件和信息技术服务', scale: '20-99人', address: '武汉市洪山区光谷大道 77 号', source: '小红书', ownerId: 'sales-zhangsan', ownerName: '张三', level: 'S', active: true,
    contacts: [{ id: 'contact-5912', name: '赵经理', position: '运营负责人', phone: '13800005912', email: 'zhao@example.cn', birthday: '09-07', isPrimary: true, active: true, referenced: true, createdAt: '2026-08-12T09:00:00.000Z' }], invoiceProfile: { title: '小红书插件客户', taxNo: '91420100MA4K59120A', bankName: '中国银行武汉光谷支行', bankAccount: '420000005912', address: '武汉市洪山区光谷大道 77 号', phone: '027-87585912', updatedAt: at }, invoiceHistory: [], createdAt: '2026-08-12T09:00:00.000Z', updatedAt: at,
  },
  {
    id: 'lead-5866', kind: 'enterprise', name: '汽车配件索赔系统客户', creditCode: '91420100MA4K58660B', industry: '汽车服务', scale: '100-499人', address: '武汉经济技术开发区车城大道 16 号', source: '小红书', ownerId: 'sales-zhangsan', ownerName: '张三', level: 'S', active: true,
    contacts: [{ id: 'contact-5866', name: '唐经理', position: '信息化负责人', phone: '15500000767', birthday: '11-20', isPrimary: true, active: true, referenced: true, createdAt: '2026-07-21T09:00:00.000Z' }], invoiceHistory: [], createdAt: '2026-07-21T09:00:00.000Z', updatedAt: at,
  },
  {
    id: 'lead-5830', kind: 'enterprise', name: '智能配送机器人项目客户', creditCode: '91420100MA4K58300C', industry: '机器人', scale: '100-499人', address: '武汉市江夏区智能制造产业园', source: '官网', ownerId: 'sales-lisi', ownerName: '李四', level: 'S', active: true,
    contacts: [{ id: 'contact-5830', name: '贺经理', position: '项目负责人', phone: '15800008388', isPrimary: true, active: true, referenced: true, createdAt: '2026-07-06T09:00:00.000Z' }], invoiceHistory: [], createdAt: '2026-07-06T09:00:00.000Z', updatedAt: at,
  },
  {
    id: 'customer-44', kind: 'individual', name: '林女士', industry: '个人服务', source: '转介绍', ownerId: 'sales-zhangsan', ownerName: '张三', level: 'B', active: true,
    contacts: [{ id: 'contact-44', name: '林女士', phone: '18600000044', birthday: '08-31', isPrimary: true, active: true, createdAt: '2026-04-29T09:00:00.000Z' }], invoiceHistory: [], createdAt: '2026-04-29T09:00:00.000Z', updatedAt: at,
  },
];

export const CUSTOMERS: CustomerSummary[] = INITIAL_CUSTOMERS.map((customer) => {
  const contact = customer.contacts.find((item) => item.isPrimary);
  return { key: customer.id, name: customer.name, type: customer.kind === 'enterprise' ? '企业' : '个人', industry: customer.industry ?? '-', scale: customer.scale ?? '-', contact: contact?.name ?? '-', phone: contact?.phone ?? '-', level: `${customer.level}级`, status: '待合作', contractCount: 0, contractAmount: '-', receivable: '-', createTime: customer.createdAt.slice(0, 10) };
});

export type { CustomerSummary } from './types';
