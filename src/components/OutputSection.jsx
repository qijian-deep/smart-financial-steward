import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceDot
} from 'recharts'

export function OutputSection({
  simulationResult,
  shiftToFuture,
  simulationParams,
  incomeSegments
}) {
  const [activeView, setActiveView] = useState('history')

  const chartData = useMemo(() => {
    if (!simulationResult) return null
    return activeView === 'history'
      ? simulationResult.monthlyData
      : shiftToFuture(simulationResult, simulationParams.shiftYears)?.monthlyData
  }, [activeView, simulationResult, shiftToFuture, simulationParams.shiftYears])

  const maxDrawdownPoint = useMemo(() => {
    if (!chartData || !simulationResult?.maxDrawdown?.month) return null
    const targetMonth = activeView === 'history'
      ? simulationResult.maxDrawdown.month
      : (() => {
          const [year, month] = simulationResult.maxDrawdown.month.split('-')
          const newYear = parseInt(year) + simulationParams.shiftYears
          return `${newYear}-${month}`
        })()
    return chartData.find(item => item.month === targetMonth)
  }, [chartData, simulationResult, activeView, simulationParams.shiftYears])

  const hasNegativeBalance = useMemo(() => {
    return simulationResult?.monthlyData?.some(item => item.currentBalance < 0)
  }, [simulationResult])

  return (
    <div className="output-section">
      {/* 视图切换 */}
      <div className="view-toggle">
        <button
          className={activeView === 'history' ? 'active' : ''}
          onClick={() => setActiveView('history')}
        >
          历史视图
        </button>
        <button
          className={activeView === 'future' ? 'active' : ''}
          onClick={() => setActiveView('future')}
        >
          未来视图
        </button>
      </div>

      {/* 图表输出 */}
      <div className="chart-container">
        {chartData && (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `${(value / 10000).toFixed(1)}万`} />
              <Tooltip
                formatter={(value) => [`${(value / 10000).toFixed(2)}万元`, '']}
                labelFormatter={(label) => `日期: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalAssets"
                name="组合总资产"
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="totalInvestment"
                name="累计投入"
                stroke="#82ca9d"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 6 }}
              />
              {maxDrawdownPoint && (
                <ReferenceDot
                  x={maxDrawdownPoint.month}
                  y={maxDrawdownPoint.totalAssets}
                  r={6}
                  fill="red"
                  label="最大回撤"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="stats-cards">
        {activeView === 'history' && simulationResult && (
          <>
            <div className="card">
              <h3>期末资产</h3>
              <p>{(simulationResult.monthlyData[simulationResult.monthlyData.length - 1].totalAssets / 10000).toFixed(2)}万</p>
            </div>
            <div className="card">
              <h3>总收益</h3>
              <p>{(simulationResult.totalReturn.amount / 10000).toFixed(2)}万 / {simulationResult.totalReturn.percent.toFixed(2)}%</p>
            </div>
            <div className="card">
              <h3>最大回撤</h3>
              <p>-{simulationResult.maxDrawdown.percent.toFixed(2)}%（发生在{simulationResult.maxDrawdown.month}）</p>
            </div>
            <div className="card">
              <h3>最大亏损金额</h3>
              <p>{(simulationResult.maxDrawdown.amount / 10000).toFixed(2)}万</p>
            </div>
          </>
        )}
        {activeView === 'future' && (
          <div className="card future-note">
            <p>数据为历史平移，仅供参考</p>
          </div>
        )}
      </div>

      {/* 净值增长数据 */}
      {activeView === 'history' && simulationResult && (
        <div className="nav-growth-data" style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9em' }}>每月净值增长数据</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.8em' }}>
            {simulationResult.monthlyData.map((data, idx) => (
              <div key={idx} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{data.month}</div>
                <div>初: {data.startNav?.toFixed(4)}</div>
                <div>末: {data.endNav?.toFixed(4)}</div>
                <div style={{ color: data.navGrowth >= 1 ? '#4caf50' : '#f44336' }}>
                  增长: {(data.navGrowth * 100 - 100).toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 风险提示 */}
      {activeView === 'history' && simulationResult && (
        <div className="risk-tips">
          <h3>风险提示</h3>
          {simulationResult.maxDrawdown.amount > incomeSegments[0]?.monthlyIncome * 3 && (
            <p className="risk-tip">
              历史上曾亏损{(simulationResult.maxDrawdown.amount / 10000).toFixed(2)}万，相当于{Math.round(simulationResult.maxDrawdown.amount / incomeSegments[0].monthlyIncome)}个月收入，请确认能承受
            </p>
          )}
          {simulationResult.totalReturn.amount < 0 && (
            <p className="risk-tip">
              定投结束时仍亏损，建议延长定投时间
            </p>
          )}
          {hasNegativeBalance && (
            <p className="risk-tip">
              活期某月为负，定投总额超可支配收入，建议降低金额
            </p>
          )}
        </div>
      )}

      {/* 免责声明 */}
      <div className="disclaimer">
        <p>以上计算结果仅供参考，不构成任何投资建议。市场有风险，决策需谨慎。</p>
      </div>
    </div>
  )
}
