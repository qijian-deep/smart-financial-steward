import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceDot
} from 'recharts'
import type { SimulationResult, SimulationParams, IncomeSegment, MonthlyData } from '../types'

interface OutputSectionProps {
  simulationResult: SimulationResult | null
  shiftToFuture: (historyResult: SimulationResult | null, shiftYears: number) => SimulationResult | null
  simulationParams: SimulationParams
  incomeSegments: IncomeSegment[]
}

export function OutputSection({
  simulationResult,
  shiftToFuture,
  simulationParams,
  incomeSegments
}: OutputSectionProps) {
  const [activeView, setActiveView] = useState<'history' | 'future'>('history')

  const chartData = useMemo<MonthlyData[] | null>(() => {
    if (!simulationResult) return null
    const data = activeView === 'history'
      ? simulationResult.monthlyData
      : shiftToFuture(simulationResult, simulationParams.shiftYears)?.monthlyData || null
    // 映射字段名以兼容图表，并计算总收益金额
    return data?.map(item => {
      const totalInvestment = item.cumulativeInvestment
      const totalAssets = item.totalAssets
      const profitAmount = totalAssets - totalInvestment
      return {
        ...item,
        totalInvestment: 0, // 累计投入的收益基准线为0
        totalAssets: profitAmount, // 组合总收益金额
        _originalTotalAssets: totalAssets, // 保留原始值用于tooltip显示
        _originalTotalInvestment: totalInvestment
      }
    }) || null
  }, [activeView, simulationResult, shiftToFuture, simulationParams.shiftYears])

  const maxDrawdownPoint = useMemo<MonthlyData | null>(() => {
    if (!chartData || !simulationResult?.maxDrawdown?.month) return null
    const targetMonth = activeView === 'history'
      ? simulationResult.maxDrawdown.month
      : (() => {
          const [year, month] = simulationResult.maxDrawdown.month.split('-')
          const newYear = parseInt(year) + simulationParams.shiftYears
          return `${newYear}-${month}`
        })()
    return chartData.find(item => item.month === targetMonth) || null
  }, [chartData, simulationResult, activeView, simulationParams.shiftYears])

  const hasNegativeBalance = useMemo<boolean>(() => {
    // 检查是否有负增长（资产减少）
    return simulationResult?.monthlyData?.some(item => item.growthAmount < 0) || false
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
              <YAxis tickFormatter={(value: number) => `${(value / 10000).toFixed(0)}万`} />
              <Tooltip
                formatter={(value, name, props) => {
                  const data = props.payload
                  if (name === '成本基准线') {
                    return [`0万 (累计投入${(data._originalTotalInvestment / 10000).toFixed(2)}万元)`, name]
                  }
                  return [`${(Number(value) / 10000).toFixed(2)}万 (总资产${(data._originalTotalAssets / 10000).toFixed(2)}万元)`, name]
                }}
                labelFormatter={(label) => `日期: ${String(label)}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalAssets"
                name="总收益金额"
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="totalInvestment"
                name="成本基准线"
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

      {/* 每月资产增长数据 */}
      {activeView === 'history' && simulationResult && (
        <div className="asset-growth-data" style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9em' }}>每月资产增长数据</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', fontSize: '0.8em' }}>
            {simulationResult.monthlyData.map((data, idx) => (
              <div key={idx} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1em' }}>{data.month}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  <div>月初资产: {(data.startAssets / 10000).toFixed(2)}万</div>
                  <div>月末资产: {(data.endAssets / 10000).toFixed(2)}万</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: data.growthRate >= 1 ? '#4caf50' : '#f44336' }}>
                    增长率: {(data.growthRate * 100 - 100).toFixed(2)}%
                  </span>
                  <span style={{ color: data.growthAmount >= 0 ? '#4caf50' : '#f44336' }}>
                    增长额: {(data.growthAmount / 10000).toFixed(2)}万
                  </span>
                </div>
                {data.fundDetails && data.fundDetails.length > 0 && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>基金明细:</div>
                    {data.fundDetails.map((fund, fundIdx) => (
                      <div key={fundIdx} style={{ marginBottom: '0.25rem', paddingLeft: '0.5rem' }}>
                        <div>
                          {fund.fundName} ({fund.fundCode}):
                          <span style={{ color: fund.growthRate >= 1 ? '#4caf50' : '#f44336' }}>
                            增长率 {(fund.growthRate * 100 - 100).toFixed(2)}%
                          </span>
                          <span style={{ color: fund.growthAmount >= 0 ? '#4caf50' : '#f44336', marginLeft: '0.5rem' }}>
                            增长额 {(fund.growthAmount / 10000).toFixed(2)}万
                          </span>
                        </div>
                        <div style={{ fontSize: '0.9em', color: 'rgba(255,255,255,0.6)' }}>
                          月初: {(fund.startAssets / 10000).toFixed(2)}万 → 月末: {(fund.endAssets / 10000).toFixed(2)}万 (定投: {(fund.investmentAmount / 10000).toFixed(2)}万)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 风险提示 */}
      {activeView === 'history' && simulationResult && (
        <div className="risk-tips">
          <h3>风险提示</h3>
          {simulationResult.maxDrawdown.amount > (incomeSegments[0]?.monthlyIncome || 0) * 3 && (
            <p className="risk-tip">
              历史上曾亏损{(simulationResult.maxDrawdown.amount / 10000).toFixed(2)}万，相当于{Math.round(simulationResult.maxDrawdown.amount / (incomeSegments[0]?.monthlyIncome || 1))}个月收入，请确认能承受
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
