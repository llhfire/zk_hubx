// 生产站项目快照
// 来源：https://www.zkhubx.com/adminapi/project
// 抓取时间：2026-08-29（共 36 条）；登录令牌未落盘，原型链接和手机号已脱敏。

export interface ProductionProjectTag {
  name: string;
  widget_type?: string;
  color?: string;
  status?: number;
}

export interface ProductionRelationPerson {
  id: number;
  realname: string;
}

export interface ProductionProjectRecord {
  used_work_hours: number | string | null;
  pro_priority_text: ProductionProjectTag | string | null;
  pro_status_text: ProductionProjectTag | string | null;
  business_line_text: ProductionProjectTag | string | null;
  relation_person_text: ProductionRelationPerson[] | null;
  id: number;
  name: string;
  pro_priority: number | string | null;
  pro_status: number | string | null;
  company_id: number | string | null;
  business_line: number | string | null;
  relation_person: string | null;
  total_process: number | string | null;
  start_time: string | null;
  end_time: string | null;
  project_remark: string | null;
  last_record: string | null;
  last_time: string | null;
  last_user_id: number | string | null;
  delete_time: string | null;
  update_time: string | null;
  create_time: string;
  leader_realname: string | null;
  leader_id: number | string | null;
  saleor_realname: string | null;
  saleor_id: number | string | null;
  company_name: string | null;
}

export const PRODUCTION_PROJECT_SNAPSHOT: ProductionProjectRecord[] = [
  {
    "used_work_hours": 155.5,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": null,
    "id": 126,
    "name": "小红书插件Agent",
    "pro_priority": 1,
    "pro_status": 2,
    "company_id": 1,
    "business_line": 1,
    "relation_person": null,
    "total_process": 0,
    "start_time": null,
    "end_time": null,
    "project_remark": "0814 接到通知 已签合同",
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-08-15 08:44:10",
    "create_time": "2026-08-14 17:57:31",
    "leader_realname": "牛一",
    "leader_id": 73,
    "saleor_realname": null,
    "saleor_id": null,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 53,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 29,
        "realname": "吴丹丹"
      }
    ],
    "id": 125,
    "name": "智能配送机器人项目",
    "pro_priority": 1,
    "pro_status": 2,
    "company_id": 5,
    "business_line": 1,
    "relation_person": "29",
    "total_process": 0,
    "start_time": "2026-08-10",
    "end_time": "2026-09-30",
    "project_remark": "配送机器人项目",
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-08-07 18:45:09",
    "create_time": "2026-08-07 18:45:09",
    "leader_realname": "牛一",
    "leader_id": 73,
    "saleor_realname": "黄奕",
    "saleor_id": 35,
    "company_name": "中科网联"
  },
  {
    "used_work_hours": 32,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "自运营",
      "widget_type": "tag",
      "color": "#e2787e",
      "status": 1
    },
    "relation_person_text": null,
    "id": 124,
    "name": "中科GEO优化平台",
    "pro_priority": 2,
    "pro_status": 2,
    "company_id": 5,
    "business_line": 3,
    "relation_person": null,
    "total_process": 55,
    "start_time": "2026-07-20",
    "end_time": "2026-09-30",
    "project_remark": "GEO优化系统",
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-08-01 18:34:38",
    "create_time": "2026-08-01 18:34:38",
    "leader_realname": "吴雪双",
    "leader_id": 30,
    "saleor_realname": null,
    "saleor_id": null,
    "company_name": "中科网联"
  },
  {
    "used_work_hours": 103.5,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": null,
    "id": 123,
    "name": "汽车配件索赔管理系统",
    "pro_priority": 2,
    "pro_status": 2,
    "company_id": 3,
    "business_line": 1,
    "relation_person": null,
    "total_process": 0,
    "start_time": "2026-08-03",
    "end_time": "2026-08-28",
    "project_remark": "提前看下需要的服务器配置，海外站点新加坡\r\n要求：\r\n1、多语言\r\n2、配件价格不同国家定价\r\n3、工时价格配置，针对不同配件\r\n4、配件热销排序，H5界面商品展示可设置前几位商品\r\n销售提供的产品原型\r\n前端:[链接已脱敏]\r\n后端：[链接已脱敏]",
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-08-01 18:28:44",
    "create_time": "2026-08-01 18:28:44",
    "leader_realname": "陈孟春",
    "leader_id": 85,
    "saleor_realname": "吴丹丹",
    "saleor_id": 29,
    "company_name": "中科软通"
  },
  {
    "used_work_hours": 892,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "自研",
      "widget_type": "tag",
      "color": "#43dfa4",
      "status": 1
    },
    "relation_person_text": null,
    "id": 122,
    "name": "AIGC电商平台",
    "pro_priority": 1,
    "pro_status": 2,
    "company_id": 1,
    "business_line": 2,
    "relation_person": null,
    "total_process": 10,
    "start_time": "2026-07-11",
    "end_time": "2026-08-31",
    "project_remark": null,
    "last_record": "1、AIGC工具功能相对比较清晰，原型基本完成；\r\n2、云视频管家参考的功能看不到，所以只能通过调研和摸索进行，计划下周一跟客户对一遍；再进行调整；\r\n3、目前确定现已电商为主，漫剧工能先往后靠；",
    "last_time": 1784977451,
    "last_user_id": 35,
    "delete_time": null,
    "update_time": "2026-07-11 17:39:01",
    "create_time": "2026-07-11 17:39:01",
    "leader_realname": "闵权",
    "leader_id": 37,
    "saleor_realname": "黄奕",
    "saleor_id": 35,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 774,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 35,
        "realname": "黄奕"
      }
    ],
    "id": 121,
    "name": "中铁信息化",
    "pro_priority": 1,
    "pro_status": 2,
    "company_id": 5,
    "business_line": 1,
    "relation_person": "35",
    "total_process": 90,
    "start_time": "2026-06-18",
    "end_time": null,
    "project_remark": "3.1 首期款:合同签订后 15 个工作日内,甲方向乙方支付50%,即人民币¥:11500 元 \n3.2 二期款:乙方 2 个月以内,完成产品功能开发测试版上线,甲乙双方共同对项目验收结束后,15 个工作日内, 甲方向乙方支付技术服务费的40%,即人民币¥: 9200 元(大写): ,服务器一年租赁费用为人民币¥:10903. 65 元，合计人民币¥ :20103.65元\n3.3 尾款:系统上架到正式环境,乙方交付源码给甲方,培训甲方人员使用,运行 2 周后, 15 个工作日内,甲方向乙方支付技术服务费的 10%,即人民币¥:2300 元",
    "last_record": "考勤机已迁移到系统",
    "last_time": 1787810049,
    "last_user_id": 42,
    "delete_time": null,
    "update_time": "2026-08-06 09:14:51",
    "create_time": "2026-07-02 11:59:19",
    "leader_realname": "杨培豪",
    "leader_id": 42,
    "saleor_realname": "郭豪杰",
    "saleor_id": 34,
    "company_name": "中科网联"
  },
  {
    "used_work_hours": 0,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": "-",
    "relation_person_text": null,
    "id": 118,
    "name": "深圳云管",
    "pro_priority": 1,
    "pro_status": 2,
    "company_id": 3,
    "business_line": null,
    "relation_person": null,
    "total_process": 70,
    "start_time": "2025-05-10",
    "end_time": "2026-08-31",
    "project_remark": null,
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-06-23 15:16:28",
    "create_time": "2026-06-23 15:16:28",
    "leader_realname": "罗承成",
    "leader_id": 36,
    "saleor_realname": null,
    "saleor_id": null,
    "company_name": "中科软通"
  },
  {
    "used_work_hours": 514,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": "-",
    "relation_person_text": null,
    "id": 117,
    "name": "宜宾云管",
    "pro_priority": 1,
    "pro_status": 2,
    "company_id": 3,
    "business_line": null,
    "relation_person": null,
    "total_process": 80,
    "start_time": "2025-03-10",
    "end_time": "2026-09-10",
    "project_remark": null,
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-06-23 15:15:43",
    "create_time": "2026-06-23 15:15:43",
    "leader_realname": "罗承成",
    "leader_id": 36,
    "saleor_realname": null,
    "saleor_id": null,
    "company_name": "中科软通"
  },
  {
    "used_work_hours": 0,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "验收中",
      "widget_type": "tag",
      "color": "#48a1e5",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": null,
    "id": 116,
    "name": "高卡追溯",
    "pro_priority": 2,
    "pro_status": 4,
    "company_id": 3,
    "business_line": 1,
    "relation_person": null,
    "total_process": 90,
    "start_time": "2025-08-12",
    "end_time": "2026-07-10",
    "project_remark": null,
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-06-23 14:10:29",
    "create_time": "2026-06-23 14:10:29",
    "leader_realname": "罗承成",
    "leader_id": 36,
    "saleor_realname": null,
    "saleor_id": null,
    "company_name": "中科软通"
  },
  {
    "used_work_hours": 204,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "验收中",
      "widget_type": "tag",
      "color": "#48a1e5",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": null,
    "id": 115,
    "name": "峰璟汽车数据采集",
    "pro_priority": 2,
    "pro_status": 4,
    "company_id": 3,
    "business_line": 1,
    "relation_person": null,
    "total_process": 80,
    "start_time": "2026-05-05",
    "end_time": "2026-07-10",
    "project_remark": null,
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-06-23 14:11:06",
    "create_time": "2026-06-23 14:09:13",
    "leader_realname": "罗承成",
    "leader_id": 36,
    "saleor_realname": null,
    "saleor_id": null,
    "company_name": "中科软通"
  },
  {
    "used_work_hours": 3875.7,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": null,
    "id": 113,
    "name": "重庆宠物B端项目",
    "pro_priority": 1,
    "pro_status": 2,
    "company_id": 3,
    "business_line": 1,
    "relation_person": null,
    "total_process": 40,
    "start_time": "2026-05-25",
    "end_time": "2026-07-20",
    "project_remark": null,
    "last_record": "7月25日，平板端APP、B端APP、C端APP完成bug修复及80%UI还原。24日正式版已封版。",
    "last_time": 1784973593,
    "last_user_id": 62,
    "delete_time": null,
    "update_time": "2026-08-21 14:42:21",
    "create_time": "2026-06-08 23:46:14",
    "leader_realname": "陈周伟",
    "leader_id": 62,
    "saleor_realname": "黄奕",
    "saleor_id": 35,
    "company_name": "中科软通"
  },
  {
    "used_work_hours": 2045.5,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": null,
    "id": 112,
    "name": "帕奇宠C端一期",
    "pro_priority": 1,
    "pro_status": 2,
    "company_id": 3,
    "business_line": 1,
    "relation_person": null,
    "total_process": 98,
    "start_time": "2026-06-08",
    "end_time": "2026-07-31",
    "project_remark": "一期项目为产品设计和系统架构设计。",
    "last_record": "甲方审查功能清单。",
    "last_time": 1785577650,
    "last_user_id": 41,
    "delete_time": null,
    "update_time": "2026-07-24 09:38:36",
    "create_time": "2026-06-05 19:35:46",
    "leader_realname": "何江奇",
    "leader_id": 41,
    "saleor_realname": "黄奕",
    "saleor_id": 35,
    "company_name": "中科软通"
  },
  {
    "used_work_hours": 366.6,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": null,
    "id": 111,
    "name": "福彩小程序",
    "pro_priority": 1,
    "pro_status": 2,
    "company_id": 3,
    "business_line": 1,
    "relation_person": null,
    "total_process": 99,
    "start_time": "2026-05-23",
    "end_time": "2026-06-10",
    "project_remark": "新疆福彩项目",
    "last_record": "保障福彩的项目维护，持续三个月\r\n小程序首页公告内容增加1条，首页分享活动 卡片文案更换，商品核验的验证码改成了9位数",
    "last_time": 1784195999,
    "last_user_id": 61,
    "delete_time": null,
    "update_time": "2026-06-05 10:24:32",
    "create_time": "2026-06-05 10:14:40",
    "leader_realname": "杨培豪",
    "leader_id": 42,
    "saleor_realname": "吴丹丹",
    "saleor_id": 29,
    "company_name": "中科软通"
  },
  {
    "used_work_hours": 297,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "验收中",
      "widget_type": "tag",
      "color": "#48a1e5",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 35,
        "realname": "黄奕"
      }
    ],
    "id": 74,
    "name": "重庆宠物医护驻场一期",
    "pro_priority": 1,
    "pro_status": 4,
    "company_id": 3,
    "business_line": 1,
    "relation_person": "35",
    "total_process": 100,
    "start_time": "2026-04-30",
    "end_time": "2026-06-02",
    "project_remark": "",
    "last_record": "1、用户刘总已对一期项目签章验收。",
    "last_time": 1784542502,
    "last_user_id": 62,
    "delete_time": null,
    "update_time": "2026-07-25 19:05:24",
    "create_time": "2026-04-30 09:38:45",
    "leader_realname": "陈周伟",
    "leader_id": 62,
    "saleor_realname": "吴丹丹",
    "saleor_id": 29,
    "company_name": "中科软通"
  },
  {
    "used_work_hours": 440.5,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 35,
        "realname": "黄奕"
      }
    ],
    "id": 76,
    "name": "智能酒店（建筑电气综合平台）",
    "pro_priority": 1,
    "pro_status": 2,
    "company_id": 1,
    "business_line": 1,
    "relation_person": "35",
    "total_process": 40,
    "start_time": "2026-04-23",
    "end_time": null,
    "project_remark": "",
    "last_record": "用户提供自用智能空开和已用酒店项目供数据导入获取。仅供演示，不要做其他操作。",
    "last_time": 1781608156,
    "last_user_id": 62,
    "delete_time": null,
    "update_time": "2026-07-25 19:05:36",
    "create_time": "2026-04-23 09:38:45",
    "leader_realname": "陈周伟",
    "leader_id": 62,
    "saleor_realname": "郭豪杰",
    "saleor_id": 34,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 0,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "搁置",
      "widget_type": "tag",
      "color": "#d68585",
      "status": 1
    },
    "business_line_text": {
      "name": "自运营",
      "widget_type": "tag",
      "color": "#e2787e",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 70,
        "realname": "王超"
      }
    ],
    "id": 77,
    "name": "目明舒(代运营)",
    "pro_priority": 2,
    "pro_status": 5,
    "company_id": 1,
    "business_line": 3,
    "relation_person": "70",
    "total_process": 10,
    "start_time": null,
    "end_time": null,
    "project_remark": "",
    "last_record": "应客户要求，暂停项目运营",
    "last_time": 1780624006,
    "last_user_id": 41,
    "delete_time": null,
    "update_time": "2026-06-05 09:33:46",
    "create_time": "2026-04-20 09:38:45",
    "leader_realname": "周雷",
    "leader_id": 63,
    "saleor_realname": "闵权",
    "saleor_id": 37,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 14,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "自研",
      "widget_type": "tag",
      "color": "#43dfa4",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 75,
        "realname": "姚珂"
      }
    ],
    "id": 78,
    "name": "短剧工作台（内部）",
    "pro_priority": 1,
    "pro_status": 2,
    "company_id": 1,
    "business_line": 2,
    "relation_person": "75",
    "total_process": 0,
    "start_time": "2026-04-13",
    "end_time": null,
    "project_remark": "",
    "last_record": "5月8日：重新设计UI中。",
    "last_time": 1778808886,
    "last_user_id": 41,
    "delete_time": null,
    "update_time": "2026-06-09 19:37:28",
    "create_time": "2026-04-15 09:38:45",
    "leader_realname": "姚珂",
    "leader_id": 75,
    "saleor_realname": "OA助手",
    "saleor_id": 25,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 902.8,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "自研",
      "widget_type": "tag",
      "color": "#43dfa4",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 42,
        "realname": "杨培豪"
      },
      {
        "id": 44,
        "realname": "董政锦"
      }
    ],
    "id": 79,
    "name": "HubX（内部）",
    "pro_priority": 2,
    "pro_status": 2,
    "company_id": 1,
    "business_line": 2,
    "relation_person": "44,42",
    "total_process": 30,
    "start_time": "2026-04-10",
    "end_time": "2026-08-31",
    "project_remark": "",
    "last_record": "有关项目成本的梳理，测算，预测。用事前预测，事中监督推演，事后总结的模式来进行产品设计。可以查看一个业务单（线索和项目的合并概念）的生命周期中的成本和收入情况。从而驱动业务进行推进。",
    "last_time": 1785577591,
    "last_user_id": 41,
    "delete_time": null,
    "update_time": "2026-07-31 15:26:28",
    "create_time": "2026-04-12 09:38:45",
    "leader_realname": "陈孟春",
    "leader_id": 85,
    "saleor_realname": "OA助手",
    "saleor_id": 25,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 183,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "验收中",
      "widget_type": "tag",
      "color": "#48a1e5",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 67,
        "realname": "饶来安"
      },
      {
        "id": 77,
        "realname": "刘小敏"
      }
    ],
    "id": 80,
    "name": "珠宝首饰",
    "pro_priority": 2,
    "pro_status": 4,
    "company_id": 1,
    "business_line": 1,
    "relation_person": "64,67,77",
    "total_process": 95,
    "start_time": "2026-04-10",
    "end_time": "2026-05-25",
    "project_remark": "已开始需求分析，需与客户确认问题。",
    "last_record": "用户要求下周一提供代码源文件给他注册专利权。已回复用户，未完成验收和未收到验收款，不能提供代码。",
    "last_time": 1782027777,
    "last_user_id": 62,
    "delete_time": null,
    "update_time": null,
    "create_time": "2026-04-10 09:38:45",
    "leader_realname": "陈周伟",
    "leader_id": 62,
    "saleor_realname": "吴丹丹",
    "saleor_id": 29,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 17.5,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "验收中",
      "widget_type": "tag",
      "color": "#48a1e5",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 46,
        "realname": "王进"
      },
      {
        "id": 67,
        "realname": "饶来安"
      },
      {
        "id": 69,
        "realname": "黄同智"
      }
    ],
    "id": 82,
    "name": "三元顶呱呱修色服务中心项目",
    "pro_priority": 2,
    "pro_status": 4,
    "company_id": 1,
    "business_line": 1,
    "relation_person": "64,67,69,46",
    "total_process": 95,
    "start_time": "2026-03-25",
    "end_time": "2026-04-30",
    "project_remark": "4月23日出体验版（若备案过出正式版）。",
    "last_record": "6月9日，和用户沟通清楚了，将屏蔽的用户信息、联系地址等内容放出后。功能正常试用后，并同步对现有的业务做二期优化。",
    "last_time": 1781005205,
    "last_user_id": 62,
    "delete_time": null,
    "update_time": null,
    "create_time": "2026-03-25 09:38:45",
    "leader_realname": "陈周伟",
    "leader_id": 62,
    "saleor_realname": "黄奕",
    "saleor_id": 35,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 973.7,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 44,
        "realname": "董政锦"
      },
      {
        "id": 68,
        "realname": "何波"
      },
      {
        "id": 74,
        "realname": "柯磊"
      }
    ],
    "id": 88,
    "name": "智能家居",
    "pro_priority": 2,
    "pro_status": 2,
    "company_id": 1,
    "business_line": 1,
    "relation_person": "64,68,44,74",
    "total_process": 90,
    "start_time": "2026-03-11",
    "end_time": null,
    "project_remark": "预计4月15日出测试版。5月上旬出正式版。",
    "last_record": "6月9日：目前由陈冲负责智慧光迅WiFi设备和中控屏的调试，由李健负责主导；测试完毕后尝试找客户回款；",
    "last_time": 1780998739,
    "last_user_id": 35,
    "delete_time": null,
    "update_time": null,
    "create_time": "2026-03-11 09:38:45",
    "leader_realname": "陈周伟",
    "leader_id": 62,
    "saleor_realname": "郭豪杰",
    "saleor_id": 34,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 0,
    "pro_priority_text": {
      "name": "低",
      "widget_type": "tag",
      "color": "#8fb9c7",
      "status": 1
    },
    "pro_status_text": {
      "name": "搁置",
      "widget_type": "tag",
      "color": "#d68585",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 44,
        "realname": "董政锦"
      },
      {
        "id": 62,
        "realname": "陈周伟"
      },
      {
        "id": 74,
        "realname": "柯磊"
      }
    ],
    "id": 93,
    "name": "心理咨询小程序",
    "pro_priority": 3,
    "pro_status": 5,
    "company_id": 1,
    "business_line": 1,
    "relation_person": "62,44,74",
    "total_process": 0,
    "start_time": "2026-01-28",
    "end_time": null,
    "project_remark": "",
    "last_record": "开发中",
    "last_time": 1778808895,
    "last_user_id": 63,
    "delete_time": null,
    "update_time": null,
    "create_time": "2026-01-28 09:38:45",
    "leader_realname": "周雷",
    "leader_id": 63,
    "saleor_realname": "郭豪杰",
    "saleor_id": 34,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 55.3,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "验收中",
      "widget_type": "tag",
      "color": "#48a1e5",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 62,
        "realname": "陈周伟"
      },
      {
        "id": 65,
        "realname": "付琳"
      },
      {
        "id": 70,
        "realname": "王超"
      }
    ],
    "id": 90,
    "name": "微电网boss端及电视端apk",
    "pro_priority": 2,
    "pro_status": 4,
    "company_id": 1,
    "business_line": 1,
    "relation_person": "62,65,70",
    "total_process": 95,
    "start_time": "2026-01-26",
    "end_time": "2026-03-11",
    "project_remark": "",
    "last_record": "6月9日：客户测一下，没问题就走验收单盖章流程",
    "last_time": 1780998759,
    "last_user_id": 35,
    "delete_time": null,
    "update_time": "2026-06-05 11:19:00",
    "create_time": "2026-01-26 09:38:45",
    "leader_realname": "周雷",
    "leader_id": 63,
    "saleor_realname": "闵权",
    "saleor_id": 37,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 0,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "验收中",
      "widget_type": "tag",
      "color": "#48a1e5",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 63,
        "realname": "周雷"
      },
      {
        "id": 66,
        "realname": "秦垚玲"
      },
      {
        "id": 74,
        "realname": "柯磊"
      }
    ],
    "id": 91,
    "name": "微电网支付宝小程序复刻",
    "pro_priority": 2,
    "pro_status": 4,
    "company_id": 1,
    "business_line": 1,
    "relation_person": "63,66,74",
    "total_process": 95,
    "start_time": null,
    "end_time": null,
    "project_remark": "",
    "last_record": "6月9日：客户验收单盖章流程走完了，等盖章后回执给黄奕",
    "last_time": 1780998510,
    "last_user_id": 35,
    "delete_time": null,
    "update_time": null,
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "陈周伟",
    "leader_id": 62,
    "saleor_realname": "闵权",
    "saleor_id": 37,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 0,
    "pro_priority_text": "-",
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": "-",
    "relation_person_text": [
      {
        "id": 66,
        "realname": "秦垚玲"
      },
      {
        "id": 76,
        "realname": "尹章潇"
      }
    ],
    "id": 84,
    "name": "深圳云管",
    "pro_priority": 0,
    "pro_status": 2,
    "company_id": 1,
    "business_line": null,
    "relation_person": "66,76",
    "total_process": 0,
    "start_time": null,
    "end_time": null,
    "project_remark": "",
    "last_record": "深圳运管需求改造，账单、申请流程、对接粤政易、数据更换",
    "last_time": 1778808890,
    "last_user_id": 36,
    "delete_time": null,
    "update_time": null,
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "罗承成",
    "leader_id": 36,
    "saleor_realname": "OA助手",
    "saleor_id": 25,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 147,
    "pro_priority_text": "-",
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": "-",
    "relation_person_text": [
      {
        "id": 66,
        "realname": "秦垚玲"
      },
      {
        "id": 70,
        "realname": "王超"
      },
      {
        "id": 72,
        "realname": "田光明"
      }
    ],
    "id": 86,
    "name": "宜宾多云非信创",
    "pro_priority": 0,
    "pro_status": 2,
    "company_id": 1,
    "business_line": null,
    "relation_person": "66,70,72",
    "total_process": 0,
    "start_time": null,
    "end_time": null,
    "project_remark": "",
    "last_record": "项目列表、资源台账、账单核对、功能优化",
    "last_time": 1778808891,
    "last_user_id": 36,
    "delete_time": null,
    "update_time": null,
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "罗承成",
    "leader_id": 36,
    "saleor_realname": "OA助手",
    "saleor_id": 25,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 7,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "验收中",
      "widget_type": "tag",
      "color": "#48a1e5",
      "status": 1
    },
    "business_line_text": "-",
    "relation_person_text": [
      {
        "id": 66,
        "realname": "秦垚玲"
      },
      {
        "id": 76,
        "realname": "尹章潇"
      }
    ],
    "id": 87,
    "name": "南智云",
    "pro_priority": 1,
    "pro_status": 4,
    "company_id": 1,
    "business_line": null,
    "relation_person": "66,76",
    "total_process": 100,
    "start_time": "2025-11-30",
    "end_time": "2026-07-30",
    "project_remark": "",
    "last_record": "南智云用户、账单隔离",
    "last_time": 1778808891,
    "last_user_id": 36,
    "delete_time": null,
    "update_time": "2026-06-24 17:42:30",
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "罗承成",
    "leader_id": 36,
    "saleor_realname": "OA助手",
    "saleor_id": 25,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 1,
    "pro_priority_text": "-",
    "pro_status_text": {
      "name": "催款中",
      "widget_type": "tag",
      "color": "#fd5d08",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 66,
        "realname": "秦垚玲"
      },
      {
        "id": 72,
        "realname": "田光明"
      }
    ],
    "id": 97,
    "name": "微电网小程序支付切换",
    "pro_priority": 0,
    "pro_status": 7,
    "company_id": 1,
    "business_line": 1,
    "relation_person": "66,72",
    "total_process": 95,
    "start_time": "2025-12-25",
    "end_time": "2025-12-29",
    "project_remark": "",
    "last_record": "6月4日：目前责任人是王超，今天已跟杨晶晶会议。后续由王超和田光明共同完成。",
    "last_time": 1780629524,
    "last_user_id": 41,
    "delete_time": null,
    "update_time": null,
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "黄奕",
    "leader_id": 35,
    "saleor_realname": "闵权",
    "saleor_id": 37,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 54,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "验收中",
      "widget_type": "tag",
      "color": "#48a1e5",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 44,
        "realname": "董政锦"
      },
      {
        "id": 73,
        "realname": "牛一"
      }
    ],
    "id": 96,
    "name": "物业管理系统小程序",
    "pro_priority": 2,
    "pro_status": 4,
    "company_id": 1,
    "business_line": 1,
    "relation_person": "44,73",
    "total_process": 95,
    "start_time": null,
    "end_time": "2026-03-13",
    "project_remark": "差个支付接口（需要客户的appid和密钥以及配置支付回调）。",
    "last_record": "6月9号：物业的还是要坚持按照合同走，那两个问题改好了就付钱",
    "last_time": 1780998473,
    "last_user_id": 35,
    "delete_time": null,
    "update_time": null,
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "陈周伟",
    "leader_id": 62,
    "saleor_realname": "黄奕",
    "saleor_id": 35,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 8,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "自研",
      "widget_type": "tag",
      "color": "#43dfa4",
      "status": 1
    },
    "relation_person_text": null,
    "id": 108,
    "name": "移民项目（内部）",
    "pro_priority": 2,
    "pro_status": 2,
    "company_id": 1,
    "business_line": 2,
    "relation_person": null,
    "total_process": 60,
    "start_time": null,
    "end_time": "2026-05-22",
    "project_remark": null,
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-05-15 13:54:19",
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "OA助手",
    "leader_id": 25,
    "saleor_realname": null,
    "saleor_id": null,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 5,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": null,
    "id": 107,
    "name": "峰璟汽车",
    "pro_priority": 2,
    "pro_status": 2,
    "company_id": 1,
    "business_line": 1,
    "relation_person": null,
    "total_process": 0,
    "start_time": null,
    "end_time": null,
    "project_remark": null,
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-05-15 10:50:44",
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "OA助手",
    "leader_id": 25,
    "saleor_realname": null,
    "saleor_id": null,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 0.8,
    "pro_priority_text": {
      "name": "高",
      "widget_type": "tag",
      "color": "#fd6868",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "自研",
      "widget_type": "tag",
      "color": "#43dfa4",
      "status": 1
    },
    "relation_person_text": null,
    "id": 106,
    "name": "官网调整（内部）",
    "pro_priority": 1,
    "pro_status": 2,
    "company_id": 1,
    "business_line": 2,
    "relation_person": null,
    "total_process": 0,
    "start_time": null,
    "end_time": null,
    "project_remark": null,
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-05-15 10:50:24",
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "OA助手",
    "leader_id": 25,
    "saleor_realname": null,
    "saleor_id": null,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 13.5,
    "pro_priority_text": {
      "name": "中",
      "widget_type": "tag",
      "color": "#33db7c",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": null,
    "id": 104,
    "name": "建筑电气综合平台",
    "pro_priority": 2,
    "pro_status": 2,
    "company_id": 1,
    "business_line": 1,
    "relation_person": null,
    "total_process": 0,
    "start_time": null,
    "end_time": null,
    "project_remark": null,
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-05-15 10:48:41",
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "OA助手",
    "leader_id": 25,
    "saleor_realname": null,
    "saleor_id": null,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 1043.5,
    "pro_priority_text": {
      "name": "低",
      "widget_type": "tag",
      "color": "#8fb9c7",
      "status": 1
    },
    "pro_status_text": {
      "name": "进行中",
      "widget_type": "tag",
      "color": "#1cc41c",
      "status": 1
    },
    "business_line_text": {
      "name": "自研",
      "widget_type": "tag",
      "color": "#43dfa4",
      "status": 1
    },
    "relation_person_text": null,
    "id": 103,
    "name": "其它工作",
    "pro_priority": 3,
    "pro_status": 2,
    "company_id": 1,
    "business_line": 2,
    "relation_person": null,
    "total_process": 50,
    "start_time": "2026-03-01",
    "end_time": "2027-05-30",
    "project_remark": "日报中其他工作项，汇总到这里。不属于某个项目，属于杂项汇总",
    "last_record": null,
    "last_time": null,
    "last_user_id": null,
    "delete_time": null,
    "update_time": "2026-05-15 10:35:55",
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "OA助手",
    "leader_id": 25,
    "saleor_realname": "OA助手",
    "saleor_id": 25,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 9,
    "pro_priority_text": "-",
    "pro_status_text": {
      "name": "搁置",
      "widget_type": "tag",
      "color": "#d68585",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 25,
        "realname": "OA助手"
      }
    ],
    "id": 101,
    "name": "AI记忆工具",
    "pro_priority": 0,
    "pro_status": 5,
    "company_id": 1,
    "business_line": 1,
    "relation_person": "25",
    "total_process": 0,
    "start_time": "2025-11-01",
    "end_time": "2025-11-03",
    "project_remark": "",
    "last_record": "审核完毕，等待抽时间调试上线；",
    "last_time": 1778808898,
    "last_user_id": 35,
    "delete_time": null,
    "update_time": null,
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "黄奕",
    "leader_id": 35,
    "saleor_realname": "OA助手",
    "saleor_id": 25,
    "company_name": "中科软齐"
  },
  {
    "used_work_hours": 0,
    "pro_priority_text": "-",
    "pro_status_text": {
      "name": "催款中",
      "widget_type": "tag",
      "color": "#fd5d08",
      "status": 1
    },
    "business_line_text": {
      "name": "外包",
      "widget_type": "tag",
      "color": "#7d8fe8",
      "status": 1
    },
    "relation_person_text": [
      {
        "id": 70,
        "realname": "王超"
      }
    ],
    "id": 99,
    "name": "鼎信电表",
    "pro_priority": 0,
    "pro_status": 7,
    "company_id": 1,
    "business_line": 1,
    "relation_person": "70",
    "total_process": 0,
    "start_time": "2025-11-06",
    "end_time": "2025-11-08",
    "project_remark": "",
    "last_record": "6月9日：客户验收单盖章流程走完了，等盖章后回执给黄奕",
    "last_time": 1780998772,
    "last_user_id": 35,
    "delete_time": null,
    "update_time": null,
    "create_time": "2025-10-01 09:38:45",
    "leader_realname": "黄奕",
    "leader_id": 35,
    "saleor_realname": "闵权",
    "saleor_id": 37,
    "company_name": "中科软齐"
  }
];

