// ============================================================
// 线索管理模块 — 共享 Mock 数据（第二轮：复合列+新字段）
// ============================================================

import type {
  LeadListItem,
  LeadDetailInfo,
  FollowUpRecord,
  Attachment,
  AssignRecord,
  ReturnRecord,
  TransferRecord,
} from './types';

// --- 附件 Mock ---
const MOCK_ATTACHMENTS: Attachment[] = [
  { id: 'att-1', name: '需求文档.pdf', url: '/files/req.pdf', size: 102400, type: 'application/pdf' },
  { id: 'att-2', name: '报价单.xlsx', url: '/files/quote.xlsx', size: 51200, type: 'application/vnd.ms-excel' },
];

/**
 * 2026-08-29 从旧版 HubX 生产站小批量采样，用于 α 演示。
 * 仅保留业务字段；联系电话统一脱敏，微信号、原型链接等非必要隐私不落库。
 */
const SAMPLED_LEADS: LeadListItem[] = [
  {
    key: 'public-5961', id: '5961', name: '软件开发', customer: '', contact: '蔣**',
    phone: '158****6800', wechat: '', source: 'xiaohongshu', keyword: '软件开发',
    status: '未联系', clueType: 'public', level: '低', tags: ['软件开发'], entity: '中科软通',
    owner: '', optimizer: '乐炎', assistant: '', createTime: '2026-08-28 15:23',
    lastFollowTime: '2026-08-29 17:39', lastFollowContent: '仍未建立有效联系',
    nextFollowTime: '2026-08-30 10:00', followCount: 2, daysHeld: 1,
    remark: '软件开发', historyOwners: '吴丹丹 / 1', hasGroup: false,
    trashCount: 0, transformStatus: false, isOverdue: false,
  },
  {
    key: 'public-5953', id: '5953', name: '抽奖小程序', customer: '', contact: '',
    phone: '178****5485', wechat: '', source: 'xiaohongshu', keyword: '抽奖小程序',
    status: '未联系', clueType: 'public', level: '低', tags: ['小程序', '营销活动'], entity: '中科软通',
    owner: '', optimizer: '乐炎', assistant: '', createTime: '2026-08-25 15:37',
    lastFollowTime: '2026-08-27 14:58', lastFollowContent: '电话未接通，好友申请待通过',
    nextFollowTime: '2026-08-28 10:00', followCount: 2, daysHeld: 4,
    remark: '填写信息后参与抽奖的小程序', historyOwners: '吴丹丹 / 1', hasGroup: false,
    trashCount: 0, transformStatus: false, isOverdue: false,
  },
  {
    key: 'public-5951', id: '5951', name: '冒泡小程序', customer: '', contact: '',
    phone: '', wechat: '', source: 'xiaohongshu', keyword: '冒泡小程序',
    status: '初步沟通', clueType: 'public', level: '中', customerLevel: 'C',
    tags: ['小程序', '社交'], entity: '中科软通', owner: '', optimizer: '乐炎', assistant: '周欢',
    createTime: '2026-08-21 17:56', lastFollowTime: '2026-08-27 15:09',
    lastFollowContent: '客户暂停需求，线索退回公海', nextFollowTime: '2026-08-28 10:00',
    followCount: 3, daysHeld: 8, remark: '冒泡小程序', historyOwners: '吴丹丹 / 1',
    presalesGroupName: '【0821】冒泡小程序客户沟通群', groupType: 'wechat', hasGroup: true,
    trashCount: 0, transformStatus: false, isOverdue: false,
  },
  {
    key: 'assigned-5957', id: '5957', name: '社区生鲜小程序', customer: '武汉鲜邻生活服务有限公司', contact: '刘经理',
    phone: '139****2864', wechat: 'fresh-neighbor-liu', source: 'xiaohongshu', keyword: '社区生鲜小程序', status: '方案报价',
    clueType: 'assigned', level: '中', customerLevel: 'B', tags: ['小程序', '社区生鲜'],
    entity: '中科软通', owner: '吴丹丹', optimizer: '乐炎', assistant: '',
    createTime: '2026-08-27 14:04', lastFollowTime: '2026-08-29 17:43',
    lastFollowContent: '已完成需求初访，客户确认先做微信小程序一期，正在按预算收缩功能范围', nextFollowTime: '2026-09-02 10:00',
    followCount: 3, daysHeld: 4, budget: 80000,
    remark: '面向社区居民的生鲜到家小程序，一期覆盖商品浏览、社区自提点、购物车、下单支付、配送/自提状态和运营后台。',
    presalesGroupName: '【0827】社区生鲜小程序客户沟通群', groupType: 'wechat', hasGroup: true,
    prototypeLink: 'https://prototype.example.com/community-fresh-v1',
    customerNote: '客户经营 3 个社区生鲜门店，优先验证团购预售和到店自提；暂不确认配送调度、会员积分等二期范围。',
    attachments: [
      { id: 'att-5957-req', name: '社区生鲜小程序需求初稿.pdf', url: '/files/community-fresh-requirements.pdf', size: 286720, type: 'application/pdf' },
      { id: 'att-5957-flow', name: '社区生鲜业务流程.png', url: '/files/community-fresh-flow.png', size: 184320, type: 'image/png' },
    ],
    trashCount: 0, transformStatus: false, isOverdue: false,
  },
  {
    key: 'assigned-5955', id: '5955', name: '小程序代码优化', customer: '', contact: '',
    phone: '', wechat: '', source: 'xiaohongshu', keyword: '代码优化', status: '方案报价',
    clueType: 'assigned', level: '中', tags: ['小程序', '代码优化'], entity: '中科软通',
    owner: '吴丹丹', optimizer: '乐炎', assistant: '', createTime: '2026-08-26 13:40',
    lastFollowTime: '2026-08-27 10:47', lastFollowContent: '报价单已发送，等待客户确认',
    nextFollowTime: '2026-08-28 10:00', followCount: 1, daysHeld: 3,
    remark: '小程序代码优化', presalesGroupName: '【0826】婚礼邀请函小程序客户沟通',
    groupType: 'wechat', hasGroup: true, trashCount: 0, transformStatus: false, isOverdue: true,
  },
  {
    key: 'assigned-5958', id: '5958', name: '生活服务平台小程序', customer: '', contact: '',
    phone: '188****8967', wechat: '', source: 'website', keyword: '生活服务平台', status: '未接通',
    clueType: 'assigned', level: '低', tags: ['小程序', '生活服务', '积分商城'], entity: '中科软通',
    owner: '吴丹丹', optimizer: '', assistant: '', createTime: '2026-08-28 11:27',
    lastFollowTime: '2026-08-28 17:29', lastFollowContent: '电话未接通，好友申请待通过',
    nextFollowTime: '2026-08-29 10:00', followCount: 1, daysHeld: 1,
    remark: '三类陪伴服务、需求发布、订单支付、签到积分与服务者入驻',
    hasGroup: false, trashCount: 0, transformStatus: false, isOverdue: true,
  },
  {
    key: 'trash-5833', id: '5833', name: '社交类 APP', customer: '', contact: '',
    phone: '187****7116', wechat: '', source: 'xiaohongshu', keyword: '社交 APP', status: '已终止',
    clueType: 'trash', level: '低', customerLevel: 'C', tags: ['APP', '社交'], entity: '中科软通',
    owner: '', optimizer: '乐炎', assistant: '', createTime: '2026-07-07 09:32',
    lastFollowTime: '2026-07-27 10:29', lastFollowContent: '长期无法建立有效联系',
    nextFollowTime: '', followCount: 7, daysHeld: 33, remark: '社交类 APP',
    trashReason: '联系方式失效，长期无法联系', trashCount: 1,
    transformStatus: false, isOverdue: false,
  },
  {
    key: 'trash-5780', id: '5780', name: 'WordPress 仿站', customer: '', contact: '',
    phone: '', wechat: '', source: 'website', keyword: 'WordPress 仿站', status: '已终止',
    clueType: 'trash', level: '低', customerLevel: 'C', tags: ['网站', 'WordPress'], entity: '中科软通',
    owner: '', optimizer: '', assistant: '', createTime: '2026-06-23 10:09',
    lastFollowTime: '2026-06-26 17:10', lastFollowContent: '外部任务已结束', nextFollowTime: '',
    followCount: 2, daysHeld: 64, remark: 'WordPress 仿站', trashReason: '外部任务已结束',
    trashCount: 1, transformStatus: false, isOverdue: false,
  },
  {
    key: 'trash-5772', id: '5772', name: 'AI 超级新员工软件', customer: '', contact: '',
    phone: '186****7792', wechat: '', source: 'website', keyword: 'AI 员工', status: '已终止',
    clueType: 'trash', level: '无意向', customerLevel: 'C', tags: ['AI', '软件开发'], entity: '中科软通',
    owner: '', optimizer: '', assistant: '', createTime: '2026-06-22 14:37',
    lastFollowTime: '2026-07-31 16:32', lastFollowContent: '客户已通过其他渠道完成开发',
    nextFollowTime: '', followCount: 2, daysHeld: 33, remark: 'AI 超级新员工软件开发',
    trashReason: '客户已完成开发', trashCount: 1, transformStatus: false, isOverdue: false,
  },
  {
    key: 'closed-5912', id: '5912', name: '小红书插件 Agent', customer: '小红书插件客户',
    contact: '', phone: '', wechat: '', source: 'xiaohongshu', keyword: '智能体开发', status: '已签单',
    clueType: 'assigned', level: '中', customerLevel: 'S', tags: ['AI Agent', '小红书插件'],
    entity: '中科软通', owner: '吴丹丹', optimizer: '乐炎', assistant: '周欢',
    createTime: '2026-08-12 16:40', lastFollowTime: '2026-08-13 15:37',
    lastFollowContent: '已向客户提交实现方案和报价单', nextFollowTime: '', followCount: 2, daysHeld: 17,
    remark: '智能体开发', presalesGroupName: '【0811】小红书智能体客户沟通群',
    groupType: 'wechat', hasGroup: true, trashCount: 0, transformStatus: true, isOverdue: false,
  },
  {
    key: 'closed-5866', id: '5866', name: '汽车配件索赔系统', customer: '汽车配件索赔系统客户',
    contact: '唐**', phone: '155****0767', wechat: '', source: 'xiaohongshu', keyword: 'DMS 系统',
    status: '已签单', clueType: 'assigned', level: '高', customerLevel: 'S',
    tags: ['DMS', '汽车配件', '索赔'], entity: '中科软通', owner: '吴丹丹', optimizer: '乐炎', assistant: '周欢',
    createTime: '2026-07-21 15:55', lastFollowTime: '2026-08-05 17:04',
    lastFollowContent: '已召开技术会议，需求与客户待提供资料均已确认', nextFollowTime: '',
    followCount: 9, daysHeld: 39, remark: '4S 店 DMS 与汽车配件索赔管理',
    presalesGroupName: '汽车配件索赔系统客户沟通群', groupType: 'wechat', hasGroup: true,
    trashCount: 0, transformStatus: true, isOverdue: false,
  },
  {
    key: 'closed-5830', id: '5830', name: '智能配送机器人项目', customer: '智能配送机器人项目客户',
    contact: '贺**', phone: '158****8388', wechat: '', source: 'website', keyword: '配送机器人',
    status: '已签单', clueType: 'assigned', level: '低', customerLevel: 'S', tags: ['机器人', '智能配送'],
    entity: '中科软齐', owner: '闻杨', optimizer: '', assistant: '黄奕', createTime: '2026-07-06 18:01',
    lastFollowTime: '2026-08-13 13:57', lastFollowContent: '客户首笔款已到账', nextFollowTime: '',
    followCount: 8, daysHeld: 54, remark: '智能配送机器人项目',
    presalesGroupName: '【机器人项目】客户沟通群', groupType: 'wechat', hasGroup: true,
    trashCount: 0, transformStatus: true, isOverdue: false,
  },
];

export const PUBLIC_LEADS = SAMPLED_LEADS.filter((lead) => lead.clueType === 'public');
export const MY_LEADS = SAMPLED_LEADS.filter((lead) => lead.clueType === 'assigned' && lead.status !== '已签单');
export const TRASH_LEADS = SAMPLED_LEADS.filter((lead) => lead.clueType === 'trash');
export const CLOSED_LEADS = SAMPLED_LEADS.filter((lead) => lead.status === '已签单');
export const MY_CREATED_LEADS: LeadListItem[] = MY_LEADS.slice(0, 1);
export const MY_ASSISTED_LEADS: LeadListItem[] = MY_LEADS.slice(1, 2);
export const ALL_LEADS: LeadListItem[] = [...PUBLIC_LEADS, ...MY_LEADS, ...TRASH_LEADS, ...CLOSED_LEADS];

// --- 跟进记录 Mock ---
export const FOLLOWUP_RECORDS: FollowUpRecord[] = [
  {
    id: 'fu-5957-1',
    leadId: '5957',
    method: '电话',
    customerStatus: '初步沟通',
    customerLevel: 'B',
    content: '已电话联系刘经理，确认客户经营 3 个社区生鲜门店，计划先做微信小程序一期。',
    nextFollowTime: '2026-08-28 15:00',
    costHours: 0,
    costMins: 15,
    attachments: [],
    creator: '吴丹丹',
    createdAt: '2026-08-27 14:20',
    updatedAt: '2026-08-27 14:20',
    followupStatus: 'done',
  },
  {
    id: 'fu-5957-2',
    leadId: '5957',
    method: '微信',
    customerStatus: '需求调研',
    customerLevel: 'B',
    content: '客户补充商品、社区自提点、购物车和支付流程，暂不纳入会员积分和配送调度。',
    nextFollowTime: '2026-08-29 17:30',
    costHours: 0,
    costMins: 25,
    attachments: [{ id: 'att-5957-flow', name: '社区生鲜业务流程.png', url: '/files/community-fresh-flow.png', size: 184320, type: 'image/png' }],
    creator: '吴丹丹',
    createdAt: '2026-08-28 16:10',
    updatedAt: '2026-08-28 16:10',
    followupStatus: 'done',
  },
  {
    id: 'fu-5957-3',
    leadId: '5957',
    method: '面谈',
    customerStatus: '方案报价',
    customerLevel: 'B',
    content: '已完成需求初访，客户确认先做微信小程序一期，下一步核对商品、订单和自提流程原型。',
    nextFollowTime: '2026-09-02 10:00',
    costHours: 0,
    costMins: 35,
    attachments: [{ id: 'att-5957-req', name: '社区生鲜小程序需求初稿.pdf', url: '/files/community-fresh-requirements.pdf', size: 286720, type: 'application/pdf' }],
    creator: '吴丹丹',
    createdAt: '2026-08-29 17:43',
    updatedAt: '2026-08-29 17:43',
    followupStatus: 'pending',
  },
  {
    id: 'fu-5955-1',
    leadId: '5955',
    method: '微信',
    customerStatus: '方案报价',
    content: '报价单已发送，等待客户确认。',
    nextFollowTime: '2026-08-28 10:00',
    costHours: 0,
    costMins: 10,
    attachments: [MOCK_ATTACHMENTS[0]],
    creator: '吴丹丹',
    createdAt: '2026-08-27 10:47',
    updatedAt: '2026-08-27 10:47',
    followupStatus: 'pending',
  },
  {
    id: 'fu-5958-1',
    leadId: '5958',
    method: '电话',
    customerStatus: '未接通',
    content: '电话未接通，好友申请待通过。',
    nextFollowTime: '2026-08-29 10:00',
    costHours: 0,
    costMins: 5,
    attachments: [],
    creator: '吴丹丹',
    createdAt: '2026-08-28 17:29',
    updatedAt: '2026-08-28 17:29',
    followupStatus: 'pending',
  },
  {
    id: 'fu-5866-1',
    leadId: '5866',
    method: '会议',
    customerStatus: '已签单',
    customerLevel: 'S',
    content: '已召开技术会议，项目细节与客户待提供资料均已确认。',
    nextFollowTime: '',
    costHours: 0,
    costMins: 45,
    attachments: [],
    creator: '吴丹丹',
    createdAt: '2026-08-05 17:04',
    updatedAt: '2026-08-05 17:04',
    followupStatus: 'done',
  },
];

// --- 分配记录 Mock ---
export const ASSIGN_RECORDS: AssignRecord[] = [
  {
    id: 'asgn-5957-1',
    leadId: '5957',
    fromOwner: '',
    toOwner: '吴丹丹',
    reason: '新线索分配',
    operator: '系统',
    createdAt: '2026-08-27 14:04',
  },
];

// --- 退回记录 Mock ---
export const RETURN_RECORDS: ReturnRecord[] = [
  { id: 'ret-5833-1', leadId: '5833', reason: '联系方式失效，长期无法联系', operator: '闻杨', createdAt: '2026-07-27 10:29', returnCount: 1 },
];

// --- 流转记录 Mock ---
export const TRANSFER_RECORDS: TransferRecord[] = [
  { id: 'tr-5957-1', leadId: '5957', operator: '系统', action: 'assign', toOwner: '吴丹丹', status: '初步沟通', reason: '新线索分配', createdAt: '2026-08-27 14:04' },
  { id: 'tr-5957-2', leadId: '5957', operator: '吴丹丹', action: 'claim', toOwner: '吴丹丹', status: '方案报价', reason: '', createdAt: '2026-08-27 14:10' },
  { id: 'tr-5833-1', leadId: '5833', operator: '闻杨', action: 'return', toOwner: '', status: '已终止', reason: '联系方式失效，长期无法联系', createdAt: '2026-07-27 10:29' },
  { id: 'tr-5833-2', leadId: '5833', operator: '系统', action: 'trash', toOwner: '', status: '已终止', reason: '线索终止', createdAt: '2026-07-27 10:29' },
  { id: 'tr-5912-1', leadId: '5912', operator: '系统', action: 'assign', toOwner: '吴丹丹', status: '初步沟通', reason: '新线索分配', createdAt: '2026-08-12 16:40' },
  { id: 'tr-5912-2', leadId: '5912', operator: '吴丹丹', action: 'transform', toOwner: '吴丹丹', status: '已签单', reason: '客户签约', createdAt: '2026-08-13 15:37' },
];

/** 按线索ID获取流转记录 */
export function getTransferRecordsByLeadId(leadId: string): TransferRecord[] {
  return TRANSFER_RECORDS.filter((r) => r.leadId === leadId);
}

// --- 线索详情 Mock（扩展版） ---
export function getLeadDetailInfo(leadId: string): LeadDetailInfo | null {
  const lead = ALL_LEADS.find((item) => item.id === leadId);
  if (!lead) return null;

  return {
    name: lead.name,
    customer: lead.customer,
    contact: lead.contact,
    phone: lead.phone,
    wechat: lead.wechat,
    source: lead.source,
    keyword: lead.keyword,
    tags: lead.tags,
    requirement: lead.remark || lead.name,
    initialRequirement: lead.remark || lead.name,
    level: lead.level,
    customerLevel: lead.customerLevel,
    status: lead.status,
    clueType: lead.clueType,
    transformStatus: lead.transformStatus,
    trashCount: lead.trashCount,
    trashReason: lead.trashReason,
    createTime: lead.createTime,
    updateTime: lead.lastFollowTime || lead.createTime,
    claimTime: lead.clueType === 'assigned' ? lead.createTime : '',
    lastFollowTime: lead.lastFollowTime,
    nextFollowTime: lead.nextFollowTime,
    creator: lead.optimizer || '系统',
    owner: lead.owner,
    optimizer: lead.optimizer,
    assistant: lead.assistant,
    customerTitle: lead.contact,
    customerCost: '',
    entity: lead.entity,
    agent: lead.optimizer,
    customerBudget: lead.budget ? `¥${lead.budget.toLocaleString('zh-CN')}` : undefined,
    presalesGroupName: lead.presalesGroupName,
    prototypeLink: lead.prototypeLink,
    customerNote: lead.customerNote,
    followCount: lead.followCount,
    daysHeld: lead.daysHeld,
    attachments: lead.attachments ?? [],
  };
}

// --- 搜索字段列表 ---
export const SEARCH_FIELDS = [
  { label: '线索名称', value: 'name' },
  { label: '线索ID', value: 'id' },
  { label: '电话', value: 'phone' },
  { label: '微信', value: 'wechat' },
  { label: '威客ID', value: 'witkeyId' },
  { label: '任务编号', value: 'witkeyTaskNo' },
  { label: '联系人', value: 'contact' },
  { label: '来源', value: 'source' },
  { label: '所属公司', value: 'customer' },
  { label: '客户等级', value: 'customerLevel' },
  { label: '客户状态', value: 'status' },
  { label: '优化师', value: 'optimizer' },
  { label: '负责人', value: 'owner' },
  { label: '协助人', value: 'assistant' },
  { label: '创建时间', value: 'createTime' },
  { label: '下次跟进时间', value: 'nextFollowTime' },
] as const;
