import type { Contract, ContractFormData, PaymentPlanPeriodName } from './types';

type RecoveryRow = { name: PaymentPlanPeriodName; pct: number; amount: number; date: string; paid: boolean };
type RecoverySeed = { name: string; customer: string; sales: string; total: number; note: string; rows: RecoveryRow[] };

/** 0829 项目回款看板导入快照（来源：文档/数据/0829项目回款看板.html）。 */
const RECOVERY_BOARD_SEED: RecoverySeed[] = [
  { name: "中铁安全信息化平台", customer: "中国铁建电气化局集团有限公司", sales: "黄奕，郭豪杰", total: 23000, note: "0707 正在开发中", rows: [{name:'首付款',pct:50,amount:11500,date:'6/16',paid:true},{name:'二期款',pct:40,amount:9200,date:'7/23',paid:true},{name:'尾款',pct:10,amount:2300,date:'8/25',paid:false}] },
  { name: "宜宾政务云多云管理平台开发", customer: "梯度科技股份有限公司", sales: "罗承成", total: 456000, note: "罗承成跟进，项目开发中，进度80%", rows: [{name:'首付款',pct:32.8,amount:150000,date:'1/21',paid:true},{name:'二期款',pct:13.4,amount:61200,date:'2/9',paid:true},{name:'三期款',pct:27,amount:122400,date:'未排期',paid:false},{name:'四期款',pct:20,amount:91800,date:'未排期',paid:false},{name:'五期款',pct:7,amount:30600,date:'未排期',paid:false}] },
  { name: "深圳政务云多云管理平台开发", customer: "梯度科技股份有限公司", sales: "罗承成", total: 420000, note: "罗承成跟进，项目开发中，进度70%", rows: [{name:'首付款',pct:20,amount:84000,date:'2/9',paid:true},{name:'二期款',pct:30,amount:126000,date:'未排期',paid:false},{name:'三期款',pct:45,amount:189000,date:'未排期',paid:false},{name:'四期款',pct:5,amount:21000,date:'未排期',paid:false}] },
  { name: "配送机器人平台系统", customer: "星元之上（武汉）科技有限公司", sales: "黄奕，闵权", total: 300000, note: "0812客户支付首笔款", rows: [{name:'首付款',pct:30,amount:90000,date:'8/12',paid:true},{name:'二期款',pct:20,amount:60000,date:'9/18',paid:false},{name:'三期款',pct:40,amount:120000,date:'10/20',paid:false},{name:'四期款',pct:10,amount:30000,date:'10/20',paid:false}] },
  { name: "宠物医护B端项目二期", customer: "重庆绮算法科技有限公司", sales: "闵总，黄奕", total: 300000, note: "开发进度待确认", rows: [{name:'首付款',pct:40,amount:120000,date:'5/21',paid:true},{name:'二期款',pct:30,amount:90000,date:'未排期',paid:false},{name:'三期款',pct:20,amount:60000,date:'未排期',paid:false},{name:'验收款',pct:10,amount:30000,date:'未排期',paid:false}] },
  { name: "重庆宠物医护B端一期", customer: "重庆绮算法科技有限公司", sales: "闵总，黄奕", total: 170000, note: "0710 陈周伟反馈app已上架", rows: [{name:'首付款',pct:40,amount:68000,date:'',paid:true},{name:'二期款',pct:30,amount:51000,date:'',paid:true},{name:'三期款',pct:20,amount:34000,date:'7/22',paid:true},{name:'验收款',pct:10,amount:17000,date:'10/15',paid:false}] },
  { name: "智能家居管理系统项目", customer: "湖北洲语科技有限公司", sales: "黄奕", total: 88000, note: "客户先做智能酒店，导致智能家居延期", rows: [{name:'首付款',pct:30,amount:26400,date:'2/10',paid:true},{name:'二期款',pct:30,amount:26400,date:'4/24',paid:true},{name:'三期款',pct:30,amount:26400,date:'未排期',paid:false},{name:'尾款',pct:10,amount:8800,date:'未排期',paid:false}] },
  { name: "建筑电气综合管理系统（一期）", customer: "湖北洲语科技有限公司", sales: "黄奕", total: 80000, note: "客户提供测试环境，一直未提供到位", rows: [{name:'首付款',pct:60,amount:48000,date:'4/18',paid:true},{name:'二期款',pct:20,amount:16000,date:'未排期',paid:false},{name:'尾款',pct:20,amount:16000,date:'未排期',paid:false}] },
  { name: "微电网boss小程序和电视版apk", customer: "维网物联科技（武汉）有限公司", sales: "黄奕", total: 55000, note: "客户测试中，8月15日支付尾款", rows: [{name:'首付款',pct:50,amount:27500,date:'1/6',paid:true},{name:'二期款',pct:40,amount:22000,date:'8/19',paid:true},{name:'尾款',pct:10,amount:5500,date:'8/19',paid:true}] },
  { name: "小红书插件", customer: "上海贝拉知见文化传媒有限公司", sales: "吴丹丹", total: 24400, note: "0813客户支付首笔款", rows: [{name:'首付款',pct:50,amount:12200,date:'8/13',paid:true},{name:'二期款',pct:40,amount:9760,date:'9/13',paid:false},{name:'尾款',pct:10,amount:2440,date:'9/28',paid:false}] },
  { name: "鼎信电表接入", customer: "维网物联科技（武汉）有限公司", sales: "黄奕", total: 24000, note: "验收确认书已回执，8月15日支付尾款", rows: [{name:'首付款',pct:50,amount:12000,date:'9/17',paid:true},{name:'二期款',pct:25,amount:6000,date:'12/18',paid:true},{name:'三期款',pct:25,amount:6000,date:'8/19',paid:true}] },
  { name: "微电网用户端支付宝小程序", customer: "维网物联科技（武汉）有限公司", sales: "黄奕", total: 20000, note: "客户测试中，8月15日支付尾款", rows: [{name:'首付款',pct:50,amount:10000,date:'1/6',paid:true},{name:'验收款',pct:40,amount:8000,date:'',paid:true},{name:'尾款',pct:10,amount:2000,date:'',paid:true}] },
  { name: "汽车配件索赔管理系统", customer: "重庆诺信对外贸易发展有限公司", sales: "吴丹丹，周欢", total: 18000, note: "0731客户支付首笔款", rows: [{name:'首付款',pct:50,amount:9000,date:'7/31',paid:true},{name:'验收款',pct:40,amount:7200,date:'8/31',paid:false},{name:'尾款',pct:10,amount:1800,date:'9/15',paid:false}] },
  { name: "物业小程序项目", customer: "郧西县鑫宇物业管理有限公司", sales: "郭豪杰", total: 8000, note: "已全部回款", rows: [{name:'首付款',pct:30,amount:2400,date:'11/27',paid:true},{name:'二期款',pct:30,amount:2400,date:'',paid:true},{name:'三期款',pct:30,amount:2400,date:'8/14',paid:true},{name:'四期款',pct:10,amount:800,date:'8/19',paid:true}] },
  { name: "服装鞋类修色上门预约小程序", customer: "武汉市黄陂创艺复色信息咨询中心", sales: "黄奕", total: 8000, note: "0708 客户又不愿意支付额外费用，项目搁置", rows: [{name:'首付款',pct:50,amount:4000,date:'',paid:true},{name:'验收款',pct:50,amount:4000,date:'未排期',paid:false}] },
  { name: "建筑电气综合管理系统（二期）", customer: "湖北洲语科技有限公司", sales: "黄奕，郭豪杰", total: 120000, note: "一期还未交付，二期未开展", rows: [{name:'首付款',pct:60,amount:72000,date:'未排期',paid:false},{name:'二期款',pct:20,amount:24000,date:'未排期',paid:false},{name:'尾款',pct:20,amount:24000,date:'未排期',paid:false}] },
  { name: "南智云多云管开发", customer: "梯度科技股份有限公司", sales: "罗承成", total: 250000, note: "罗承成跟进，功能开发完成，客户验收中", rows: [{name:'首付款',pct:32,amount:80000,date:'1/13',paid:true},{name:'二期款',pct:13.6,amount:34000,date:'1/13',paid:true},{name:'三期款',pct:20.4,amount:51000,date:'未排期',paid:false},{name:'四期款',pct:30.6,amount:76500,date:'未排期',paid:false},{name:'五期款',pct:3.4,amount:8500,date:'未排期',paid:false}] },
  { name: "帕奇宠C端需求调研及原型设计", customer: "重庆绮算法科技有限公司", sales: "闵总，黄奕", total: 100000, note: "客户已付完款，交付结果待确认", rows: [{name:'全款',pct:100,amount:100000,date:'',paid:true}] },
  { name: "积分商城应用及电子集章互动游戏抽奖", customer: "北京世纪国彩信息技术有限公司", sales: "周欢，吴丹丹", total: 98000, note: "0710 客户已转需求变更费用7000元，并返利3000", rows: [{name:'首付款',pct:50,amount:49000,date:'5/22',paid:true},{name:'验收款',pct:40,amount:39200,date:'6/18',paid:true},{name:'尾款',pct:10,amount:9800,date:'10/15',paid:false}] },
  { name: "首饰珠宝小程序", customer: "南京一静文化科技有限公司", sales: "吴丹丹", total: 88000, note: "客户尾款已全额回款", rows: [{name:'首付款',pct:30,amount:26400,date:'',paid:true},{name:'二期款',pct:30,amount:26400,date:'',paid:true},{name:'验收款',pct:30,amount:26400,date:'7/17',paid:true},{name:'尾款',pct:10,amount:8800,date:'8/20',paid:true}] },
  { name: "峰璟汽车数据采集", customer: "河北登灏科技有限公司", sales: "罗承成", total: 50000, note: "罗承成跟进，目前项目在验收中，进度80%", rows: [{name:'首付款',pct:30,amount:15000,date:'',paid:true},{name:'二期款',pct:30,amount:15000,date:'未排期',paid:false},{name:'三期款',pct:30,amount:15000,date:'未排期',paid:false},{name:'四期款',pct:10,amount:5000,date:'未排期',paid:false}] },
  { name: "高卡产品溯源系统", customer: "河北登灏科技有限公司", sales: "罗承成", total: 50000, note: "罗承成跟进，目前项目在验收中，进度90%", rows: [{name:'首付款',pct:30,amount:15000,date:'',paid:true},{name:'二期款',pct:30,amount:15000,date:'',paid:true},{name:'三期款',pct:30,amount:15000,date:'未排期',paid:false},{name:'四期款',pct:10,amount:5000,date:'未排期',paid:false}] },
  { name: "DXF图纸表现与结构信息智能识读解析小模型", customer: "东莞市新一代人工智能产业技术研究院", sales: "牛一", total: 40800, note: "0707 已提供给客户正在测试中", rows: [{name:'首付款',pct:50,amount:20400,date:'6/6',paid:true},{name:'验收款',pct:40,amount:16320,date:'7/23',paid:true},{name:'尾款',pct:10,amount:4080,date:'7/21',paid:false}] },
  { name: "果蔬零售小程序(无支付)", customer: "兰飞", sales: "黄奕", total: 27000, note: "0708 小程序已提交备案，审核中", rows: [{name:'首付款',pct:30,amount:8100,date:'5/29',paid:true},{name:'二期款',pct:30,amount:8100,date:'6/23',paid:true},{name:'三期款',pct:30,amount:8100,date:'7/11',paid:true},{name:'验收款',pct:10,amount:2700,date:'10/12',paid:false}] },
  { name: "乐游商城小程序项目", customer: "商城县安顺达广告传媒有限公司", sales: "郭豪杰，黄奕", total: 20000, note: "6月1日转款10000，项目已结项", rows: [{name:'首付款',pct:50,amount:10000,date:'4/2',paid:true},{name:'二期款',pct:40,amount:8000,date:'6/1',paid:true},{name:'验收款',pct:10,amount:2000,date:'6/1',paid:true}] },
];

const CUTOFF_DATE = '2026-08-29';

function dateValue(value: string, paid: boolean): string {
  if (!value || value === '未排期') return paid ? CUTOFF_DATE : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})\/(\d{1,2})$/);
  return match ? `2026-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : '';
}

function buildForm(seed: RecoverySeed): ContractFormData {
  return {
    contractName: seed.name,
    productCategory: '软件开发',
    signingEntity: '中科软通',
    customerName: seed.customer,
    customerContact: '待补充',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerPostalCode: '',
    customerTaxNo: '',
    bankName: '',
    bankAccount: '',
    contractContent: `${seed.name}回款看板导入数据。备注：${seed.note}`,
    signDate: '2026-01-01',
    effectiveDate: '2026-01-01',
    endDate: '2026-12-31',
    paymentMethod: '对公',
    totalAmount: seed.total,
    rebateAmount: 0,
    paymentPlans: seed.rows.map((row, index) => ({
      period: index + 1,
      periodName: row.name,
      expectedDate: dateValue(row.date, row.paid),
      amount: row.amount,
      percentage: row.pct,
      amountType: 'percentage',
    })),
    templateId: 'software_sales',
  };
}

/** 将看板静态数据映射为合同读模型，供合同抽屉和独立实收台账共用。 */
export function buildRecoveryBoardContracts(): Contract[] {
  return RECOVERY_BOARD_SEED.map((seed, index) => {
    const id = `recovery-${String(index + 1).padStart(3, '0')}`;
    const formData = buildForm(seed);
    const collectionRecords = seed.rows.flatMap((row, rowIndex) => row.paid ? [{
      id: `${id}-collection-${rowIndex + 1}`,
      contractId: id,
      projectId: id,
      period: rowIndex + 1,
      amount: row.amount,
      date: dateValue(row.date, true),
      method: '银行汇款',
      note: `${row.name}到账（0829看板导入）`,
    }] : []);
    return {
      id,
      contractNo: `HT20260829${String(index + 1).padStart(3, '0')}`,
      dataSource: 'recovery-board' as const,
      status: 'archived' as const,
      kind: 'main' as const,
      projectId: id,
      customerId: `recovery-customer-${seed.customer}`,
      current: formData,
      versionHistory: [{ versionNo: 'V1', formData, renderedHtml: `<h1>${seed.name}</h1><p>数据来源：0829项目回款看板</p><p>${seed.note}</p>`, label: '0829看板数据导入', createdAt: CUTOFF_DATE, createdBy: seed.sales.split(/[，,]/)[0] || '数据导入' }],
      approvalFlow: [],
      approvedVersionNo: 'V1',
      approvedAt: CUTOFF_DATE,
      archivedScans: [],
      createdAt: CUTOFF_DATE,
      createdBy: seed.sales.split(/[，,]/)[0] || '数据导入',
      updatedAt: CUTOFF_DATE,
      receivedAmount: collectionRecords.reduce((sum, row) => sum + row.amount, 0),
      receivableAmount: Math.max(0, seed.total - collectionRecords.reduce((sum, row) => sum + row.amount, 0)),
      executionStatus: '履行中' as const,
      collectionRecords,
      paymentBlockers: [],
      dunningRecords: [],
    } satisfies Contract;
  });
}
