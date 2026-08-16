import { createElement } from 'react'
import { describe, expect, test } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getRecentWorkRecordLabels, getRecentWorkRecords, SalesDailyTemplate } from '@/app/pages/daily-report/SalesDailyTemplate'
import type { DailyReport } from '@/app/pages/daily-report/types'
import { GeneralDailyTemplate } from '@/app/pages/daily-report/GeneralDailyTemplate'
import { includeSelectedAttributionOption } from '@/app/pages/daily-report/WorkAttributionSelector'
import { mockReminderData } from '@/app/reminders/mockData'

function renderSalesFirstFrame() {
  return renderToStaticMarkup(
    createElement(SalesDailyTemplate, {
      userId: 'user-sales-zhangsan',
      date: new Date('2026-05-22T09:00:00.000Z'),
      onChange: () => {},
    }),
  )
}

function renderGeneralFirstFrame() {
  return renderToStaticMarkup(
    createElement(GeneralDailyTemplate, {
      onChange: () => {},
    }),
  )
}

describe('daily report modal initial frame', () => {
  test('sales 首帧应直接显示统一工作归属结构', () => {
    const markup = renderSalesFirstFrame()

    expect(markup).toContain('工作归属')
    expect(markup).toContain('售前线索')
    expect(markup).toContain('选择售前线索')
    expect(markup).toContain('工作性质')
  })

  test('general 首帧应直接包含基础结构', () => {
    const markup = renderGeneralFirstFrame()

    expect(markup).toContain('任务明细')
    expect(markup).toContain('添加任务明细')
    expect(markup).toContain('工作归属')
    expect(markup).toContain('今日总结')
  })

  test('sales/general 首帧切换时 general 不应残留 sales 关联对象', () => {
    renderSalesFirstFrame()
    const generalMarkup = renderGeneralFirstFrame()

    expect(generalMarkup).not.toContain('A公司CRM系统开发需求')
  })

  test('最近记录按工作归属、项目、工作性质组合去重', () => {
    const report = {
      id: 'report-1',
      userId: 'user-sales-zhangsan',
      templateType: 'sales',
      createdAt: '2026-07-30T18:00:00.000Z',
      content: {
        'work-items': [
          { id: '1', type: 'lead', workAttributionCategory: 'software-presales', relationName: 'CRM项目', workNature: '需求沟通', content: '', hours: 1 },
          { id: '2', type: 'lead', workAttributionCategory: 'software-presales', relationName: 'CRM项目', workNature: '需求沟通', content: '', hours: 2 },
        ],
      },
    } as DailyReport

    expect(getRecentWorkRecordLabels([report], 'user-sales-zhangsan')).toEqual([
      '软件售前/CRM项目/需求沟通',
    ])
    expect(getRecentWorkRecords([report], 'user-sales-zhangsan')[0].item.relationName).toBe('CRM项目')
  })

  test('最近记录按最新时间排序且最多返回 5 个', () => {
    const reports = Array.from({ length: 6 }, (_, index) => ({
      id: `report-${index}`,
      userId: 'user-sales-zhangsan',
      templateType: 'sales',
      createdAt: `2026-07-${String(25 + index).padStart(2, '0')}T18:00:00.000Z`,
      content: {
        'work-items': [{
          id: `work-${index}`,
          type: 'lead',
          workAttributionCategory: 'software-presales',
          relationName: `项目${index + 1}`,
          workNature: '需求沟通',
          content: '',
          hours: 1,
        }],
      },
    })) as DailyReport[]

    expect(getRecentWorkRecordLabels(reports, 'user-sales-zhangsan')).toEqual([
      '软件售前/项目6/需求沟通',
      '软件售前/项目5/需求沟通',
      '软件售前/项目4/需求沟通',
      '软件售前/项目3/需求沟通',
      '软件售前/项目2/需求沟通',
    ])
  })

  test('历史项目不在当前选项中时仍保留项目名称', () => {
    expect(includeSelectedAttributionOption(
      [{ id: 'project-1', name: '当前项目', keyword: '当前项目' }],
      { relationId: 'project-history', relationName: '历史项目' },
    )).toEqual([
      { id: 'project-history', name: '历史项目', keyword: '历史项目' },
      { id: 'project-1', name: '当前项目', keyword: '当前项目' },
    ])
  })

  test('新增工作详情也显示最近记录', () => {
    const recentReport = {
      id: 'recent-report',
      userId: 'user-sales-zhangsan',
      templateType: 'sales',
      createdAt: '2026-07-30T18:00:00.000Z',
      content: {
        'work-items': [{
          id: 'recent-work',
          type: 'lead',
          workAttributionCategory: 'software-presales',
          relationId: 'project-history',
          relationName: '历史项目',
          workNature: '需求沟通',
          content: '',
          hours: 1,
        }],
      },
    } as DailyReport
    const markup = renderToStaticMarkup(
      createElement(SalesDailyTemplate, {
        userId: 'user-sales-zhangsan',
        date: new Date('2026-07-31T09:00:00.000Z'),
        recentReports: [recentReport],
        initialContent: {
          'work-items': [
            { id: 'work-1', type: 'lead', content: '', hours: 0 },
            { id: 'work-2', type: 'lead', content: '', hours: 0 },
          ],
        },
        onChange: () => {},
      }),
    )

    expect(markup.match(/最近记录：/g)).toHaveLength(2)
  })

  test('示例数据提供 5 个不同的最近记录', () => {
    const labels = getRecentWorkRecordLabels(
      mockReminderData.dailyReports,
      mockReminderData.currentUserId,
    )

    expect(labels).toHaveLength(5)
    expect(new Set(labels).size).toBe(5)
  })
})
