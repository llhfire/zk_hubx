import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SelectQuoteModeModal,
  SelectQuoteModeModalContent,
} from '../components/SelectQuoteModeModal';

describe('SelectQuoteModeModal 选择报价工作台流转模式弹窗', () => {
  it('1. 基础信息架构与上下文横幅渲染（线索名、客户名、联系人）', () => {
    const markup = renderToStaticMarkup(
      createElement(SelectQuoteModeModalContent, {
        leadName: '智能工业巡检系统定制需求',
        customerName: '某大型能源电力集团',
        contactName: '陈总工',
        contactPhone: '13900001111',
        flowMode: 'online',
        setFlowMode: () => {},
        projectName: '智能工业巡检系统定制需求',
        setProjectName: () => {},
        onCancel: () => {},
        onConfirm: () => {},
      })
    );

    // 弹窗头部与副标题
    expect(markup).toContain('选择报价工作台流转模式');
    expect(markup).toContain('根据项目协同场景与团队分工，选择最适合的报价评估流转机制');

    // 上下文横幅
    expect(markup).toContain('目标线索');
    expect(markup).toContain('智能工业巡检系统定制需求');
    expect(markup).toContain('客户主体');
    expect(markup).toContain('某大型能源电力集团');
    expect(markup).toContain('对接人');
    expect(markup).toContain('陈总工 · 13900001111');
  });

  it('2. 渲染双模式对比卡片：在线表单协作（推荐）与 Excel 文件流转', () => {
    const markup = renderToStaticMarkup(
      createElement(SelectQuoteModeModalContent, {
        leadName: 'CRM研发需求',
        flowMode: 'online',
        setFlowMode: () => {},
        projectName: 'CRM研发需求',
        setProjectName: () => {},
        onCancel: () => {},
        onConfirm: () => {},
      })
    );

    // 卡片 1：在线表单协作模式
    expect(markup).toContain('在线表单协作模式');
    expect(markup).toContain('推荐 · 数字化协同');
    expect(markup).toContain('全流程线上结构化拆解功能模块、工时单价与多角色商务测算');
    expect(markup).toContain('多端同步覆盖配置（Web、Pad、App、小程序）');
    expect(markup).toContain('多工种人天实时填报，毛利税费动态穿透核算');
    expect(markup).toContain('常规项目、标准定制研发、商务与技术线上即时协同');

    // 卡片 2：Excel 文件流转模式
    expect(markup).toContain('Excel 文件流转模式');
    expect(markup).toContain('离线评估 · 外部协作');
    expect(markup).toContain('导出官方标准清单模板离线评估，线下汇总后回传解析入库');
    expect(markup).toContain('一键导出官方标准《功能清单与工时评估表.xlsx》');
    expect(markup).toContain('外部专家/供应商团队线下填报，契合传统办公流程');
    expect(markup).toContain('复杂超大清单、外包协作、客户已有详细离线需求表');
  });

  it('3. 默认选中模式渲染（高亮状态、徽标与当前已选标签）', () => {
    const markupOnline = renderToStaticMarkup(
      createElement(SelectQuoteModeModalContent, {
        leadName: 'CRM研发需求',
        flowMode: 'online',
        setFlowMode: () => {},
        projectName: 'CRM研发需求',
        setProjectName: () => {},
        onCancel: () => {},
        onConfirm: () => {},
      })
    );

    expect(markupOnline).toContain('is-selected is-online');
    expect(markupOnline).toContain('当前已选：');
    expect(markupOnline).toContain('在线表单协作模式');

    const markupFile = renderToStaticMarkup(
      createElement(SelectQuoteModeModalContent, {
        leadName: '巨型外协项目',
        flowMode: 'file',
        setFlowMode: () => {},
        projectName: '巨型外协项目',
        setProjectName: () => {},
        onCancel: () => {},
        onConfirm: () => {},
      })
    );

    expect(markupFile).toContain('is-selected is-file');
    expect(markupFile).toContain('Excel 文件流转模式');
  });

  it('4. 方案名称输入项与底部按钮操作区完整渲染', () => {
    const markup = renderToStaticMarkup(
      createElement(SelectQuoteModeModalContent, {
        leadName: 'MES车间管理系统一期',
        flowMode: 'online',
        setFlowMode: () => {},
        projectName: 'MES车间管理系统一期',
        setProjectName: () => {},
        onCancel: () => {},
        onConfirm: () => {},
      })
    );

    // 拟建方案名称输入
    expect(markup).toContain('拟建方案名称');
    expect(markup).toContain('MES车间管理系统一期');

    // 底部操作
    expect(markup).toContain('取消');
    expect(markup).toContain('确认并进入报价流程');
  });

  it('5. 验证外层 SelectQuoteModeModal 组件正常导出与实例化', () => {
    expect(SelectQuoteModeModal).toBeDefined();
    const element = createElement(SelectQuoteModeModal, {
      visible: false,
      leadName: '测试线索',
      onCancel: () => {},
      onSubmit: () => {},
    });
    expect(element).toBeDefined();
  });
});
