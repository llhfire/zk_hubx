// 新建报价单时默认填充的功能清单模板（约 20 项）
// 覆盖企业级软件常见模块，PM 可在此基础上增删改
import type { FeatureModule } from './types';

let seq = 0;
function id(): string {
  seq += 1;
  return `df-${seq}`;
}

/** 重置 id 计数器，测试用 */
export function resetFeatureIdSeq(): void { seq = 0; }

export function buildDefaultFeatureList(): FeatureModule[] {
  seq = 0;
  return [
    {
      id: id(), name: '用户端-首页展示', sort: 1,
      subFeatures: [
        { id: id(), name: '品牌 Banner 轮播', description: '顶部轮播图/视频，支持后台配置' },
        { id: id(), name: '快捷入口导航', description: '设置核心快捷入口，自定义图标链接' },
        { id: id(), name: '热点内容推荐', description: '最新资讯、热门产品手动推荐' },
      ],
    },
    {
      id: id(), name: '用户端-产品中心', sort: 2,
      subFeatures: [
        { id: id(), name: '产品分类导航', description: '按产品类型多级分类' },
        { id: id(), name: '产品详情展示', description: '多SKU规格/参数/收藏/微信转发' },
        { id: id(), name: '产品搜索与筛选', description: '关键词/分类/模糊搜索与筛选' },
      ],
    },
    {
      id: id(), name: '用户端-会员中心', sort: 3,
      subFeatures: [
        { id: id(), name: '注册/登录', description: '手机验证码+微信授权登录' },
        { id: id(), name: '会员等级与权益', description: '会员等级体系与权益配置' },
        { id: id(), name: '积分商城', description: '积分获取与兑换' },
      ],
    },
    {
      id: id(), name: '用户端-订单交易', sort: 4,
      subFeatures: [
        { id: id(), name: '购物车', description: '商品加入购物车、数量修改、删除' },
        { id: id(), name: '订单创建与支付', description: '选择地址、确认订单、微信/支付宝支付' },
        { id: id(), name: '订单列表与详情', description: '按状态查看全部/待付款/待发货/已完成订单' },
      ],
    },
    {
      id: id(), name: '管理后台-基础配置', sort: 5,
      subFeatures: [
        { id: id(), name: '用户管理', description: '用户列表、详情查看、封禁/解封操作' },
        { id: id(), name: '角色权限管理', description: '角色创建、菜单权限分配、数据权限配置' },
      ],
    },
    {
      id: id(), name: '管理后台-内容管理', sort: 6,
      subFeatures: [
        { id: id(), name: 'Banner 管理', description: '轮播图增删改查、排序、上下线' },
        { id: id(), name: '资讯管理', description: '新闻/公告发布、编辑、上下线' },
      ],
    },
    {
      id: id(), name: '管理后台-数据报表', sort: 7,
      subFeatures: [
        { id: id(), name: '用户统计看板', description: '注册量、活跃用户、留存率趋势图' },
        { id: id(), name: '订单统计看板', description: '订单量、GMV、客单价趋势图' },
      ],
    },
  ];
}
