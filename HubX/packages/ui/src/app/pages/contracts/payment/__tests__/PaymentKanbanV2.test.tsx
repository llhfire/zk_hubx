import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { CollectionProvider } from '@/app/collections/CollectionContext';
import { ContractsProvider } from '../../ContractsContext';
import { PaymentKanbanV2 } from '../../PaymentKanbanV2';
import PaymentDashboard from '../PaymentDashboard';

describe('PaymentKanbanV2', () => {
  it('渲染统一指标、主工作区和业务侧栏', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/contracts/payments'] },
        createElement(
          CollectionProvider,
          null,
          createElement(
            ContractsProvider,
            null,
            createElement(PaymentKanbanV2),
          ),
        ),
      ),
    );

    expect(markup).toContain('hubx-process-metrics');
    expect(markup).toContain('hubx-process-workspace__main');
    expect(markup).toContain('hubx-process-workspace__aside');
    expect(markup).toContain('回款队列');
    expect(markup).toContain('今日优先处理');
    expect(markup).toContain('90天现金流节奏');
  });
});

describe('PaymentDashboard', () => {
  function renderDashboard(path: string) {
    return renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: [path] },
        createElement(
          CollectionProvider,
          null,
          createElement(
            ContractsProvider,
            null,
            createElement(PaymentDashboard),
          ),
        ),
      ),
    );
  }

  it('默认以回款合同泳道作为首页页签', () => {
    const markup = renderDashboard('/contracts/payments');

    expect(markup).toContain('回款合同泳道');
    expect(markup).toContain('正常回款');
    expect(markup).toContain('即将到期');
    expect(markup).toContain('已逾期');
    expect(markup).toContain('卡点阻塞');
    expect(markup).toContain('已结清');
  });

  it('保留行动队列和回款预测页签', () => {
    const markup = renderDashboard('/contracts/payments?tab=actions');

    expect(markup).toContain('首页');
    expect(markup).toContain('行动队列');
    expect(markup).toContain('回款预测');
    expect(markup).toContain('回款行动队列');
  });
});
