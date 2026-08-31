import { vi } from 'vitest'
import { createElement } from 'react'
import { describe, expect, test } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProjectDetail } from '../ProjectDetail'
import { ContractsProvider } from '../contracts/ContractsContext'
import { EmployeeProvider } from '../employee'
import { ProjectProvider } from '../project-management/ProjectContext'

function renderProjectDetailMarkup(path = '/projects/1') {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(
        EmployeeProvider,
        null,
        createElement(
          ContractsProvider,
          null,
          createElement(
            ProjectProvider,
            null,
            createElement(
              Routes,
              null,
              createElement(Route, {
                path: '/projects/:id',
                element: createElement(ProjectDetail),
              }),
            ),
          ),
        ),
      ),
    ),
  )
}

describe('ProjectDetail summary card navigation', () => {
  test('外部 OA 流程优化项目展示关联的合同与报价信息', () => {
    const markup = renderProjectDetailMarkup('/projects/3')

    expect(markup).toContain('内部OA流程优化')
    expect(markup).toContain('【华信科技内部OA流程优化需求】')
    expect(markup).toContain('业务线')
    expect(markup).toContain('外包')
    expect(markup).toContain('合同信息')
    expect(markup).toContain('回款与发票')
    expect(markup).toContain('报价')
  })

  test('交付进度卡输出进入甘特图页的链接', () => {
    const markup = renderProjectDetailMarkup()

    expect(markup).toContain('/projects/1/delivery')
    expect(markup).toContain('交付进度')
  })

  test('只有交付进度卡带甘特图页面链接', () => {
    const markup = renderProjectDetailMarkup()
    const deliveryLinks = markup.match(/\/projects\/1\/delivery/g) ?? []

    expect(deliveryLinks).toHaveLength(1)
    expect(markup).toContain('负责人')
    expect(markup).toContain('交付时间')
    expect(markup).toContain('总工时')
  })

  test('甘特图链接包裹的是交付进度卡而不是其他摘要卡', () => {
    const markup = renderProjectDetailMarkup()
    const deliveryLinkMatch = markup.match(
      /<a[^>]*href="\/projects\/1\/delivery"[^>]*>([\s\S]*?)<\/a>/,
    )

    expect(deliveryLinkMatch?.[1]).toContain('交付进度')
    expect(deliveryLinkMatch?.[1]).not.toContain('负责人')
    expect(deliveryLinkMatch?.[1]).not.toContain('交付时间')
    expect(deliveryLinkMatch?.[1]).not.toContain('总工时')
  })

  test('右侧选项卡包含报价合同记录演示并移除成果预览', () => {
    const markup = renderProjectDetailMarkup()
    const followTabIndex = markup.indexOf('>跟进<')
    const quotationTabIndex = markup.indexOf('>报价<')
    const contractRecordTabIndex = markup.indexOf('>合同记录<')
    const demoTabIndex = markup.indexOf('>演示<')
    const documentsTabIndex = markup.indexOf('>资料<')

    expect(followTabIndex).toBeGreaterThan(-1)
    expect(quotationTabIndex).toBeGreaterThan(followTabIndex)
    expect(contractRecordTabIndex).toBeGreaterThan(quotationTabIndex)
    expect(demoTabIndex).toBeGreaterThan(contractRecordTabIndex)
    expect(documentsTabIndex).toBeGreaterThan(demoTabIndex)
    expect(markup).not.toContain('>成果预览<')
  })
})
