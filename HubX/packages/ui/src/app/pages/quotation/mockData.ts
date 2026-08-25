import type { Quote, FeatureModule, EvalSheet, QuoteTimelineEvent } from './types';

// 功能清单：和昇塑料制品-微官网项目
function buildFeatureList(): FeatureModule[] {
  return [
    // ─── 用户端（微信小程序）─────────────────────────
    {
      id: 'm1', name: '首页展示', sort: 1, endpointId: 'ep-1',
      subFeatures: [
        { id: 'm1-1', name: '品牌 Banner 轮播', description: '顶部轮播图/视频，支持后台配置' },
        { id: 'm1-2', name: '快捷入口导航', description: '设置核心快捷入口，自定义图标链接' },
        { id: 'm1-3', name: '热点内容推荐', description: '最新资讯、热门产品手动推荐' },
        { id: 'm1-4', name: '市场行业分类入口', description: '行业分类与解决方案跳转' },
      ],
    },
    {
      id: 'm2', name: '产品中心', sort: 2, endpointId: 'ep-1',
      subFeatures: [
        { id: 'm2-1', name: '产品分类导航', description: '按产品类型多级分类' },
        { id: 'm2-2', name: '创新产品推荐', description: '展示创新产品与热门标签' },
        { id: 'm2-3', name: '产品详情展示', description: '多SKU规格/参数/收藏/微信转发' },
        { id: 'm2-4', name: '产品搜索', description: '关键词/分类/模糊搜索与筛选' },
      ],
    },
    {
      id: 'm3', name: '会员中心', sort: 3, endpointId: 'ep-1',
      subFeatures: [
        { id: 'm3-1', name: '注册/登录', description: '手机验证码+微信授权登录' },
        { id: 'm3-2', name: '会员等级体系', description: '会员等级与权益配置' },
        { id: 'm3-3', name: '积分商城', description: '积分获取与兑换' },
      ],
    },
    {
      id: 'm4', name: '订单交易', sort: 4, endpointId: 'ep-1',
      subFeatures: [
        { id: 'm4-1', name: '购物车', description: '商品加入购物车、数量修改、删除' },
        { id: 'm4-2', name: '订单创建与支付', description: '选择地址、确认订单、微信/支付宝支付' },
        { id: 'm4-3', name: '订单列表与详情', description: '按状态查看全部/待付款/待发货/已完成订单' },
      ],
    },
    // ─── 管理后台（PC Web端）─────────────────────────
    {
      id: 'm5', name: '用户管理', sort: 5, endpointId: 'ep-2',
      subFeatures: [
        { id: 'm5-1', name: '用户列表', description: '用户列表、详情查看、封禁/解封操作' },
        { id: 'm5-2', name: '角色权限管理', description: '角色创建、菜单权限分配、数据权限配置' },
      ],
    },
    {
      id: 'm6', name: '内容管理', sort: 6, endpointId: 'ep-2',
      subFeatures: [
        { id: 'm6-1', name: 'Banner 管理', description: '轮播图增删改查、排序、上下线' },
        { id: 'm6-2', name: '资讯管理', description: '新闻/公告发布、编辑、上下线' },
      ],
    },
    {
      id: 'm7', name: '数据报表', sort: 7, endpointId: 'ep-2',
      subFeatures: [
        { id: 'm7-1', name: '用户统计看板', description: '注册量、活跃用户、留存率趋势图' },
        { id: 'm7-2', name: '订单统计看板', description: '订单量、GMV、客单价趋势图' },
      ],
    },
  ];
}

// 罗总人天评估：动态岗位列 + 切片粒度
function buildEvalSheet(): EvalSheet {
  const activeRoles = [
    { key: 'pm_days', name: '产品经理' },
    { key: 'ui_days', name: 'UI设计师' },
    { key: 'fe_days', name: '前端开发' },
    { key: 'be_days', name: '后端开发' },
    { key: 'qa_days', name: '测试工程师' },
  ];
  const evaluationUnits = [
    // ─── 用户端 ───
    {
      id: 'u1', granularity: 'MODULE_PACK' as const, moduleName: '首页展示', moduleId: 'm1', boundSubFeatureIds: ['m1-1', 'm1-2', 'm1-3', 'm1-4'],
      manualWorkload: { pm_days: 0.5, ui_days: 0.8, fe_days: 1.0, be_days: 0.8, qa_days: 0.5 },
      totalDays: 3.6, riskLevel: 'LOW' as const, techRemark: '常规企业微官网组件',
    },
    {
      id: 'u2', granularity: 'SUB_GROUP' as const, moduleName: '产品中心', moduleId: 'm2', boundSubFeatureIds: ['m2-1', 'm2-2'],
      groupName: '浏览展示',
      manualWorkload: { pm_days: 0.3, ui_days: 0.5, fe_days: 0.5, be_days: 0.4, qa_days: 0.3 },
      totalDays: 2.0, riskLevel: 'LOW' as const, techRemark: '基础展示与筛选',
    },
    {
      id: 'u3', granularity: 'SINGLE' as const, moduleName: '产品中心', moduleId: 'm2', boundSubFeatureIds: ['m2-3'],
      groupName: '产品详情展示',
      manualWorkload: { pm_days: 0.5, ui_days: 0.8, fe_days: 1.5, be_days: 2.0, qa_days: 0.8 },
      totalDays: 5.6, riskLevel: 'MEDIUM' as const, techRemark: '涉及多规格参数联动',
    },
    {
      id: 'u4', granularity: 'SINGLE' as const, moduleName: '产品中心', moduleId: 'm2', boundSubFeatureIds: ['m2-4'],
      groupName: '产品搜索',
      manualWorkload: { pm_days: 0.2, ui_days: 0.2, fe_days: 0.5, be_days: 0.6, qa_days: 0.2 },
      totalDays: 1.7, riskLevel: 'LOW' as const, techRemark: '基础分词匹配',
    },
    {
      id: 'u5', granularity: 'SUB_GROUP' as const, moduleName: '会员中心', moduleId: 'm3', boundSubFeatureIds: ['m3-2', 'm3-3'],
      groupName: '会员权益与积分',
      manualWorkload: { pm_days: 0.5, ui_days: 0.6, fe_days: 1.2, be_days: 1.5, qa_days: 0.6 },
      totalDays: 4.4, riskLevel: 'MEDIUM' as const, techRemark: '等级与积分规则可配置',
    },
    {
      id: 'u6', granularity: 'SINGLE' as const, moduleName: '会员中心', moduleId: 'm3', boundSubFeatureIds: ['m3-1'],
      groupName: '注册/登录',
      manualWorkload: { pm_days: 0.3, ui_days: 0.3, fe_days: 0.8, be_days: 1.2, qa_days: 0.4 },
      totalDays: 3.0, riskLevel: 'HIGH' as const, techRemark: 'PM 已确认暂不对接 ERP，仅做手机号与微信授权',
    },
    {
      id: 'u7', granularity: 'SUB_GROUP' as const, moduleName: '订单交易', moduleId: 'm4', boundSubFeatureIds: ['m4-1', 'm4-2'],
      groupName: '购物与支付',
      manualWorkload: { pm_days: 0.5, ui_days: 0.6, fe_days: 1.0, be_days: 1.5, qa_days: 0.5 },
      totalDays: 4.1, riskLevel: 'MEDIUM' as const, techRemark: '支付对接微信/支付宝',
    },
    {
      id: 'u8', granularity: 'SINGLE' as const, moduleName: '订单交易', moduleId: 'm4', boundSubFeatureIds: ['m4-3'],
      groupName: '订单列表与详情',
      manualWorkload: { pm_days: 0.2, ui_days: 0.3, fe_days: 0.5, be_days: 0.6, qa_days: 0.3 },
      totalDays: 1.9, riskLevel: 'LOW' as const, techRemark: '标准列表与详情页',
    },
    // ─── 管理后台 ───
    {
      id: 'u9', granularity: 'SINGLE' as const, moduleName: '用户管理', moduleId: 'm5', boundSubFeatureIds: ['m5-1'],
      groupName: '用户列表',
      manualWorkload: { pm_days: 0.2, ui_days: 0.3, fe_days: 0.5, be_days: 0.8, qa_days: 0.3 },
      totalDays: 2.1, riskLevel: 'LOW' as const, techRemark: '标准CRUD',
    },
    {
      id: 'u10', granularity: 'SINGLE' as const, moduleName: '用户管理', moduleId: 'm5', boundSubFeatureIds: ['m5-2'],
      groupName: '角色权限管理',
      manualWorkload: { pm_days: 0.3, ui_days: 0.2, fe_days: 0.5, be_days: 1.0, qa_days: 0.3 },
      totalDays: 2.3, riskLevel: 'MEDIUM' as const, techRemark: 'RBAC 权限模型',
    },
    {
      id: 'u11', granularity: 'SINGLE' as const, moduleName: '内容管理', moduleId: 'm6', boundSubFeatureIds: ['m6-1'],
      groupName: 'Banner 管理',
      manualWorkload: { pm_days: 0.1, ui_days: 0.2, fe_days: 0.3, be_days: 0.4, qa_days: 0.2 },
      totalDays: 1.2, riskLevel: 'LOW' as const, techRemark: '标准图片管理',
    },
    {
      id: 'u12', granularity: 'SINGLE' as const, moduleName: '内容管理', moduleId: 'm6', boundSubFeatureIds: ['m6-2'],
      groupName: '资讯管理',
      manualWorkload: { pm_days: 0.1, ui_days: 0.2, fe_days: 0.3, be_days: 0.4, qa_days: 0.2 },
      totalDays: 1.2, riskLevel: 'LOW' as const, techRemark: '富文本编辑器',
    },
    {
      id: 'u13', granularity: 'SINGLE' as const, moduleName: '数据报表', moduleId: 'm7', boundSubFeatureIds: ['m7-1'],
      groupName: '用户统计看板',
      manualWorkload: { pm_days: 0.2, ui_days: 0.3, fe_days: 0.5, be_days: 0.6, qa_days: 0.2 },
      totalDays: 1.8, riskLevel: 'LOW' as const, techRemark: 'ECharts 图表',
    },
    {
      id: 'u14', granularity: 'SINGLE' as const, moduleName: '数据报表', moduleId: 'm7', boundSubFeatureIds: ['m7-2'],
      groupName: '订单统计看板',
      manualWorkload: { pm_days: 0.2, ui_days: 0.3, fe_days: 0.5, be_days: 0.6, qa_days: 0.2 },
      totalDays: 1.8, riskLevel: 'LOW' as const, techRemark: 'ECharts 图表',
    },
  ];
  return {
    id: 'EV-20260814-001', evaluator: '罗总', activeRoles, evaluationUnits,
    manualWorkDays: 20, techSolutionNote: '微信小程序(Uni-App) + Vue3 管理后台 + Java SpringBoot + MySQL + 阿里云 ECS/RDS',
  };
}

function buildTimeline(): QuoteTimelineEvent[] {
  return [
    { id: 'tl-m1', action: 'create', actorName: '张产品', actorRole: '产品经理', time: '2026-08-14 09:10' },
    { id: 'tl-m2', action: 'submit_feature_list', actorName: '张产品', actorRole: '产品经理', time: '2026-08-14 10:00' },
    { id: 'tl-m5', action: 'submit_eval', actorName: '罗总', actorRole: '技术负责人', time: '2026-08-14 15:30' },
    { id: 'tl-m6', action: 'assign_to_sales', actorName: '张产品', actorRole: '产品经理', time: '2026-08-14 16:10' },
  ];
}

function buildQuote(): Quote {
  return {
    id: 'q1',
    quoteNo: 'QT-2026-1',
    version: 'v1.0',
    status: 'pending_quote',
    leadId: 'lead-1',
    basicInfo: {
      projectName: 'A公司CRM系统开发',
      projectType: '企业管理',
      creatorName: '张产品',
      techEvaluatorName: '罗总',
      requirementDesc: 'CRM 客户管理系统，含销售跟进、客户管理、报价流程、商机看板等模块，覆盖销售端与管理后台。',
      customerName: 'A公司',
      customerContact: '刘经理',
      customerPhone: '13800138000',
      quoteValidityDays: 30,
      industry: '企业服务',
    },
    endpointConfigs: [
      { id: 'ep-1', name: '用户端', platforms: ['wechat'] },
      { id: 'ep-2', name: '管理后台', platforms: ['pcweb'] },
    ],
    featureList: buildFeatureList(),
    evalSheet: buildEvalSheet(),
    salesAddedRoles: [
      { id: 'ar1', roleName: '项目经理 (PMO)', headcount: 1, days: 5, dailyRate: 1500, subtotal: 7500, reason: '客户要求每周现场汇报与进度把控' },
      { id: 'ar2', roleName: '驻场运维保障', headcount: 1, days: 2, dailyRate: 800, subtotal: 1600, reason: '上线首周现场保障' },
    ],
    frontendConfig: { platforms: [] },
    backendConfig: { services: [], language: '' },
    travelOnsite: {
      enableTravel: true,
      travelSubtotal: 8600,
      enableOnsite: true,
      onsiteSubtotal: 16000,
      travelDetails: [
        { location: '北京', headcount: 2, days: 3, transportFee: 1200, hotelFeePerDay: 350, allowancePerDay: 100 },
        { location: '上海', headcount: 1, days: 2, transportFee: 800, hotelFeePerDay: 400, allowancePerDay: 100 },
      ],
      onsiteDetails: [
        { location: '客户现场（北京）', headcount: 1, days: 20, serviceFeePerDay: 800 },
      ],
    },
    otherCosts: [
      { id: 'c1', name: '阿里云服务器及 OSS', amount: 2000, note: '客户自费或代采' },
      { id: 'c2', name: '域名与 SSL 证书', amount: 500, note: '年度费用' },
      { id: 'c3', name: '短信包', amount: 300, note: '验证码短信' },
    ],
    summary: {
      totalLaborDays: 34.7,
      projectWorkDays: 20,
      grandTotalPrice: 0,
      paymentTerms: [
        { stage: '合同签订首付款', percent: 50, amount: 0 },
        { stage: '系统交付款', percent: 40, amount: 0 },
        { stage: '验收尾款', percent: 10, amount: 0 },
      ],
      taxIncluded: true,
      warrantyYears: 1,
    },
    auditNodes: [
      { auditorId: 'huangyi', auditorName: '黄奕', role: '销售部负责人', status: 'PENDING' },
      { auditorId: 'luo', auditorName: '罗总', role: '技术部负责人', status: 'PENDING' },
      { auditorId: 'min', auditorName: '闵总', role: '企业决策层', status: 'PENDING' },
    ],
    stampNode: { stamperName: '黄海', status: 'LOCKED' },
    timeline: buildTimeline(),
    deadline: '2026-08-16 18:00',
    salesOwnerName: '张三',
    ccSalesNames: ['张三'],
    createdAt: '2026-08-14 09:10',
    updatedAt: '2026-08-14 16:10',
  };
}

/** 阶段一样例：PM 正在整理功能清单 */
function buildDraftQuote(): Quote {
  return {
    id: 'q2',
    quoteNo: 'QT-2026-2',
    version: 'v1.0',
    status: 'draft',
    leadId: 'lead-2',
    basicInfo: {
      projectName: 'B公司小程序定制开发',
      projectType: '小程序定制',
      creatorName: '张产品',
      techEvaluatorName: '罗总',
      requirementDesc: 'B公司业务小程序定制开发，含首页展示、订单流程与运营后台。',
      customerName: 'B公司',
      customerContact: '陈总',
      customerPhone: '13900139000',
      quoteValidityDays: 30,
    },
    endpointConfigs: [
      { id: 'ep-1', name: '用户端', platforms: ['wechat'] },
    ],
    featureList: [
      {
        id: 'n1', name: '预约挂号', sort: 1, endpointId: 'ep-1',
        subFeatures: [
          { id: 'n1-1', name: '科室与医生列表', description: '按科室层级展示医生排班与号源余量' },
          { id: 'n1-2', name: '号源锁定与支付', description: '选号后锁定 15 分钟，超时释放' },
        ],
      },
      {
        id: 'n2', name: '报告查询', sort: 2, endpointId: 'ep-1',
        subFeatures: [
          { id: 'n2-1', name: '检验报告列表', description: '按时间倒序展示，支持 PDF 预览' },
        ],
      },
    ],
    salesAddedRoles: [],
    frontendConfig: { platforms: [] },
    backendConfig: { services: [], language: '' },
    travelOnsite: { enableTravel: false, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0, travelDetails: [], onsiteDetails: [] },
    otherCosts: [],
    auditNodes: [
      { auditorId: 'huangyi', auditorName: '黄奕', role: '销售部负责人', status: 'PENDING' },
      { auditorId: 'luo', auditorName: '罗总', role: '技术部负责人', status: 'PENDING' },
      { auditorId: 'min', auditorName: '闵总', role: '企业决策层', status: 'PENDING' },
    ],
    stampNode: { stamperName: '黄海', status: 'LOCKED' },
    timeline: [
      { id: 'tl-n1', action: 'create', actorName: '张产品', actorRole: '产品经理', time: '2026-08-14 14:00' },
      { id: 'tl-n2', action: 'submit_feature_list', actorName: '张产品', actorRole: '产品经理', time: '2026-08-14 15:00' },
    ],
    deadline: '2026-08-18 18:00',
    salesOwnerName: '张三',
    ccSalesNames: ['张三'],
    createdAt: '2026-08-14 14:00',
    updatedAt: '2026-08-14 16:30',
  };
}

export const initialQuotes: Quote[] = [buildQuote(), buildDraftQuote()];
