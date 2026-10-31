import { Chart, SectionCard } from '@/design-system';

const TREND = [
  { month: '01', receivable: 120, collected: 96, cost: 72 },
  { month: '02', receivable: 138, collected: 110, cost: 84 },
  { month: '03', receivable: 152, collected: 118, cost: 96 },
  { month: '04', receivable: 176, collected: 140, cost: 104 },
  { month: '05', receivable: 164, collected: 132, cost: 118 },
  { month: '06', receivable: 196, collected: 158, cost: 126 },
];

const COST_MIX = [
  { name: '人工', value: 42 },
  { name: '差旅', value: 18 },
  { name: '推广', value: 16 },
  { name: '商务', value: 14 },
  { name: '第三方', value: 10 },
];

const FUNNEL = [
  { stage: '公海线索', count: 450 },
  { stage: '已认领', count: 320 },
  { stage: '初步沟通', count: 240 },
  { stage: '方案报价', count: 120 },
];

const RADAR = [
  { subject: '覆盖', 小红书: 82, 抖音: 64 },
  { subject: '时效', 小红书: 74, 抖音: 88 },
  { subject: '质量', 小红书: 68, 抖音: 52 },
  { subject: '成本', 小红书: 58, 抖音: 76 },
  { subject: '转化', 小红书: 71, 抖音: 60 },
];

/**
 * 图表实样。
 *
 * 页面只从这里取图表：`recharts` 本身不进页面，颜色、刻度字号、Tooltip 卡片
 * 都由 `Chart` 的默认值统一。类别色用 `Chart.series(i)`（位置即语义），
 * 状态色用 `Chart.tone.*`（与 StatusTag 同源）。
 */
export function ChartDemos() {
  return (
    <SectionCard title="图表" description="一个入口：recharts 只在设计系统内部出现，页面拿到的刻度、网格、Tooltip 和色板已经统一。">
      <div className="ui-library-preview">
        <div className="ui-library-preview__label">折线 · 状态色用 Chart.tone（应收 / 实收 / 累计成本）</div>
        <div className="ui-library-size-stage ui-library-size-stage--chart">
          <Chart.Canvas height={240}>
            <Chart.LineChart data={TREND} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <Chart.Grid />
              <Chart.XAxis dataKey="month" />
              <Chart.YAxis />
              <Chart.Tooltip />
              <Chart.Legend />
              <Chart.Line dataKey="receivable" name="应收" stroke={Chart.tone.primary} strokeWidth={2} dot={false} />
              <Chart.Line dataKey="collected" name="实收" stroke={Chart.tone.success} strokeWidth={2} dot={false} />
              <Chart.Line dataKey="cost" name="累计成本" stroke={Chart.tone.danger} strokeWidth={2} dot={false} />
            </Chart.LineChart>
          </Chart.Canvas>
        </div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">饼图 · 类别色用 Chart.series(i)，位置即语义</div>
        <div className="ui-library-demo-row">
          <div className="ui-library-size-stage ui-library-size-stage--chart-third">
            <Chart.Canvas height={220}>
              <Chart.PieChart>
                <Chart.Pie data={COST_MIX} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} label={(row) => `${row.name} ${row.value}%`}>
                  {COST_MIX.map((row, index) => <Chart.Cell key={row.name} fill={Chart.series(index)} />)}
                </Chart.Pie>
                <Chart.Tooltip />
              </Chart.PieChart>
            </Chart.Canvas>
          </div>
          <div className="ui-library-size-stage ui-library-size-stage--chart-third">
            <Chart.Canvas height={220}>
              <Chart.RadarChart data={RADAR}>
                <Chart.PolarGrid />
                <Chart.PolarAngleAxis dataKey="subject" />
                <Chart.PolarRadiusAxis />
                <Chart.Radar name="小红书" dataKey="小红书" stroke={Chart.series(0)} fill={Chart.series(0)} />
                <Chart.Radar name="抖音" dataKey="抖音" stroke={Chart.series(1)} fill={Chart.series(1)} />
                <Chart.Legend />
                <Chart.Tooltip />
              </Chart.RadarChart>
            </Chart.Canvas>
          </div>
        </div>
        <div className="ui-library-demo-caption-line">
          索引必须来自固定类别顺序：某个类别缺数据时，后面所有类别不能集体串色。扇区缝隙用
          <span className="ui-library-code-path">Chart.SURFACE</span>，压在色块上的文字用
          <span className="ui-library-code-path">Chart.ON_SERIES</span>，都不要写 #fff。
        </div>
      </div>

      <div className="ui-library-preview">
        <div className="ui-library-preview__label">柱状 · 高度由调用点决定，宽度永远撑满</div>
        <div className="ui-library-size-stage ui-library-size-stage--chart">
          <Chart.Canvas height={220}>
            <Chart.BarChart data={FUNNEL}>
              <Chart.Grid />
              <Chart.XAxis dataKey="stage" />
              <Chart.YAxis />
              <Chart.Tooltip />
              <Chart.Legend />
              <Chart.Bar dataKey="count" name="线索数" fill={Chart.tone.primary} />
            </Chart.BarChart>
          </Chart.Canvas>
        </div>
        <div className="ui-library-demo-caption-line">
          <span className="ui-library-code-path">{'<Chart.Canvas height={280}>'}</span> 是默认高度；
          外层已定高时用 <span className="ui-library-code-path">height="100%"</span>。
          深色主题下色板与刻度一起换，写死 hex 的图表不会。
        </div>
      </div>
    </SectionCard>
  );
}
