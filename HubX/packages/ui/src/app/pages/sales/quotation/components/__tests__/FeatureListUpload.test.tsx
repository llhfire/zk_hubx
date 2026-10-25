import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FeatureListUpload } from '../FeatureListUpload';
import type { FeatureModule } from '../../types';

describe('FeatureListUpload 功能清单导入与模板组件', () => {
  it('1. 空清单状态：渲染上传按钮、下载模板下拉及引导说明', () => {
    const markup = renderToStaticMarkup(
      createElement(FeatureListUpload, {
        onParsed: vi.fn(),
        initialModules: [],
      })
    );

    expect(markup).toContain('上传并解析 Excel 清单');
    expect(markup).toContain('下载标准模板');
    expect(markup).toContain('尚未导入功能清单');
    expect(markup).toContain('支持列名：模块 / 子功能 / 描述（可选：备注、端）');
  });

  it('2. 传入初始清单时：渲染两级模块结构、子功能名称与统计', () => {
    const initialModules: FeatureModule[] = [
      {
        id: 'mod-1',
        name: '客户会员管理',
        sort: 1,
        endpointId: '微信小程序',
        subFeatures: [
          { id: 'sub-1', name: '微信手机号授权', description: '一键授权获取手机号并静默登录' },
          { id: 'sub-2', name: '会员积分与等级', description: '消费累计积分与阶梯等级权益' },
        ],
      },
      {
        id: 'mod-2',
        name: '订单结算中心',
        sort: 2,
        endpointId: '管理后台',
        subFeatures: [
          { id: 'sub-3', name: '聚合支付扫码', description: '微信/支付宝聚合收款码收单' },
        ],
      },
    ];

    const markup = renderToStaticMarkup(
      createElement(FeatureListUpload, {
        onParsed: vi.fn(),
        initialModules,
      })
    );

    expect(markup).toContain('客户会员管理');
    expect(markup).toContain('微信小程序');
    expect(markup).toContain('微信手机号授权');
    expect(markup).toContain('一键授权获取手机号并静默登录');
    expect(markup).toContain('订单结算中心');
    expect(markup).toContain('管理后台');
    expect(markup).toContain('确认导入并写入功能清单');
    expect(markup).toContain('共解析出 2 个模块');
  });
});
