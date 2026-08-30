// Mock react-quill to avoid 'document is not defined' in non-DOM test environment
import { vi } from 'vitest'
vi.mock('react-quill', () => ({ default: () => null }))
import { createElement } from 'react'
import { describe, expect, test } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProjectDetail360 } from '../ProjectDetail360'
import { ContractsProvider, useContracts } from '../contracts/ContractsContext'
import { buildInitialContracts } from '../contracts/mockData'
import { ProjectProvider } from '../project-management/ProjectContext'
import { CollectionProvider } from '@/app/collections/CollectionContext'
import { QuotationProvider } from '../quotation/QuotationContext'
import { initialProjects } from '../project-management/mockData'
import { PROJECT_LIST } from '../project-management/projectMockData'

function renderProjectDetail360Markup(path = '/projects/1') {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(
        QuotationProvider,
        null,
        createElement(
          ContractsProvider,
          null,
          createElement(
            ProjectProvider,
            null,
            createElement(
              CollectionProvider,
              null,
              createElement(
                Routes,
                null,
                createElement(Route, {
                  path: '/projects/:id',
                  element: createElement(ProjectDetail360),
                }),
              ),
            ),
          ),
        ),
      ),
    ),
  )
}

describe('ProjectDetail360 重构（对齐线索详情结构）', () => {
  test('A公司项目渲染统一流程概览、指标网格与 70:30 主体结构', () => {
    const markup = renderProjectDetail360Markup('/projects/1')

    // 头部控制台
    expect(markup).toContain('A公司CRM系统开发')
    expect(markup).toContain('PRJ202605001')
    // 统一指标网格
    expect(markup).toContain('hubx-process-metrics__grid')
    expect(markup).toContain('客户')
    expect(markup).toContain('A公司')
    expect(markup).toContain('工时')
    expect(markup).toContain('方案设计')
    expect(markup).toContain('回款结项')
    expect(markup).not.toContain('售前签约')
    expect(markup.match(/project-stage-popover__trigger/g)).toHaveLength(5)
    // 档案卡
    expect(markup).toContain('最新进展')
    // 主 Tab（域 3/4/1：团队与工时、回款与发票、项目动态等）
    expect(markup).toContain('基础信息')
    expect(markup).toContain('合同信息')
    expect(markup).toContain('回款与发票')
    expect(markup).toContain('团队与工时')
    expect(markup).not.toContain('项目日报')
    expect(markup).toContain('任务管理')
    expect(markup).toContain('项目动态')
    expect(markup).toContain('精选活动')
    expect(markup).toContain('仅看大事记')
    // 右侧次级 Tab：合同与售前采用紧凑名称，具体信息在页签内容呈现
    expect(markup).toContain('跟进')
    expect(markup).toContain('报价')
    expect(markup).toContain('合同')
    expect(markup).toContain('售前')
    expect(markup).toContain('会议纪要')
    expect(markup).toContain('演示')
    expect(markup).toContain('资料')
    expect(markup).toContain('出差')
    expect(markup).toContain('报销')
    // 行动栏
    expect(markup).toContain('登记跟进')
    expect(markup).toContain('甘特图')
  })

  test('华信 OA 项目渲染统一后的数据口径', () => {
    const markup = renderProjectDetail360Markup('/projects/3')

    expect(markup).toContain('华信科技内部OA流程优化')
    expect(markup).toContain('华信科技')
  })

  test('基础信息使用三列摘要，并将长文本字段放在独立行', () => {
    const markup = renderProjectDetail360Markup('/projects/prod-112?main=basic')

    expect(markup).toContain('project-basic-information__grid')
    expect(markup).toContain('arco-descriptions-layout-inline-horizontal')
    expect(markup).toContain('project-basic-information__long-list')
    expect(markup.match(/project-basic-information__long-row/g)).toHaveLength(4)
    expect(markup).toContain('重庆绮算法科技有限公司')
    expect(markup).toContain('风险备注')
  })

  test('帕奇宠 C 端一期展示完整项目口径和当前终验风险', () => {
    const markup = renderProjectDetail360Markup('/projects/prod-112')

    expect(markup).toContain('帕奇宠C端一期')
    expect(markup).toContain('PRJ-112')
    expect(markup).toContain('重庆绮算法科技有限公司')
    expect(markup).toContain('2.0k / 2.2k')
    expect(markup).toContain('P0 0 · P1 2')
    expect(markup).toContain('终验功能清单待甲方返回最终审查结论')
    expect(markup).toContain('甲方正在审查一期终验功能清单')
  })

  test('URL 可直接定位报价 Tab，并展示关联线索的报价空态', () => {
    const markup = renderProjectDetail360Markup('/projects/1?side=quotation')

    expect(markup).toContain('新建报价')
    expect(markup).toContain('暂无报价记录')
  })

  test('默认打开项目动态、跟进和大事记，URL 可关闭大事记筛选', () => {
    const defaultMarkup = renderProjectDetail360Markup('/projects/1')
    const allMarkup = renderProjectDetail360Markup('/projects/1?main=activity&side=follow&major=false')

    expect(defaultMarkup).toContain('精选活动')
    expect(defaultMarkup).toContain('写跟进')
    expect(defaultMarkup).toContain('aria-checked="true"')
    expect(defaultMarkup).not.toContain('快速记录关键进展')
    expect(allMarkup).toContain('aria-checked="false"')
  })

  test('项目不存在时输出兜底空态', () => {
    const markup = renderProjectDetail360Markup('/projects/999')

    expect(markup).toContain('项目不存在')
  })
})

describe('项目数据层统一（PROJECT_LIST 唯一事实源）', () => {
  test('initialProjects 与 PROJECT_LIST 同源且关联键对齐', () => {
    expect(initialProjects).toHaveLength(PROJECT_LIST.length)

    const p1 = initialProjects.find((p) => p.id === '1')
    expect(p1?.leadId).toBe('lead-1')
    expect(p1?.contractId).toBe('1')

    const p3 = initialProjects.find((p) => p.id === '3')
    expect(p3?.leadId).toBe('lead-9')
    expect(p3?.contractId).toBe('9')

    // 所有 contractId 在合同域都有对应合同
    const contracts = buildInitialContracts()
    PROJECT_LIST.forEach((item) => {
      if (item.contractId) {
        expect(contracts.some((c) => c.id === item.contractId)).toBe(true)
      }
    })
  })

  test('详情域台账共享 mock 按 projectId 提供数据', async () => {
    const { getMeetingsByProjectId, getConfirmationsByProjectId, getDemoEnvsByProjectId } = await import('../project-management/projectMockData')

    expect(getMeetingsByProjectId('1').length).toBeGreaterThan(0)
    expect(getConfirmationsByProjectId('1').length).toBeGreaterThan(0)
    expect(getDemoEnvsByProjectId('1').length).toBeGreaterThan(0)
    expect(getMeetingsByProjectId('999')).toEqual([])
  })
})

// 引用 useContracts 防止 tree-shake 误报（ContractsProvider 导出校验）
void useContracts
