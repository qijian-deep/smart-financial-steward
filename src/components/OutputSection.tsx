import { useState, useMemo, useEffect, useRef } from 'react'
import { Line } from '@antv/g2plot'
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
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<Line | null>(null)

  const chartData = useMemo<MonthlyData[] | null>(() => {
    if (!simulationResult) return null
    const data = activeView === 'history'
      ? simulationResult.monthlyData
      : shiftToFuture(simulationResult, simulationParams.shiftYears)?.monthlyData || null
    return data || null
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

  // 初始化并更新图表
  useEffect(() => {
    if (!chartRef.current || !chartData || chartData.length === 0) return

    // 准备图表数据
    const lineData = chartData.flatMap(item => [
      {
        month: item.month,
        value: item.totalAssets / 10000,
        type: '组合总资产'
      },
      {
        month: item.month,
        value: item.cumulativeInvestment / 10000,
        type: '累计投入'
      }
    ])

    // 如果图表已存在，先销毁
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    // 创建新图表
    const line = new Line(chartRef.current, {
      data: lineData,
      xField: 'month',
      yField: 'value',
      seriesField: 'type',
      smooth: true,
      animation: false,
      color: ['#1677ff', '#52c41a'],
      lineStyle: {
        lineWidth: 3,
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowBlur: 10,
        shadowOffsetY: 5
      },

      label: false,
      tooltip: {
        formatter: (datum) => {
          return {
            name: datum.type,
            value: `${datum.value.toFixed(2)}万元`
          }
        },
        domStyles: {
          'g2-tooltip': {
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '12px 16px',
            fontSize: '14px'
          }
        }
      },
      legend: {
        position: 'top-right',
        itemSpacing: 20,
        itemName: {
          style: {
            fontSize: 14,
            fill: '#595959'
          }
        },
        marker: {
          symbol: 'circle',
          style: {
            r: 5
          }
        }
      },
      xAxis: {
        label: {
          style: {
            fill: '#8c8c8c',
            fontSize: 12
          },
          rotate: 45,
          autoRotate: true
        },
        line: {
          style: {
            stroke: '#f0f0f0'
          }
        },
        tickLine: {
          style: {
            stroke: '#f0f0f0'
          }
        },
        grid: {
          line: {
            style: {
              stroke: '#f5f5f5',
              lineDash: [4, 4]
            }
          }
        }
      },
      yAxis: {
        label: {
          style: {
            fill: '#8c8c8c',
            fontSize: 12
          },
          formatter: (v) => `${v}万`
        },
        line: {
          style: {
            stroke: '#f0f0f0'
          }
        },
        tickLine: {
          style: {
            stroke: '#f0f0f0'
          }
        },
        grid: {
          line: {
            style: {
              stroke: '#f5f5f5',
              lineDash: [4, 4]
            }
          }
        }
      },
      annotations: maxDrawdownPoint ? [
        {
          type: 'point',
          position: [maxDrawdownPoint.month, maxDrawdownPoint.totalAssets / 10000],
          style: {
            fill: '#ff4d4f',
            stroke: '#fff',
            lineWidth: 2,
            r: 6
          }
        }
      ] : []
    })

    line.render()
    chartInstanceRef.current = line

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [chartData, maxDrawdownPoint])

  const hasNegativeBalance = useMemo<boolean>(() => {
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
      <div className="chart-container" style={{ background: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {chartData ? (
          <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
        ) : (
          <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bfbfbf' }}>
            暂无数据，请先运行模拟
          </div>
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
              <h3>总投入</h3>
              <p>{(simulationResult.monthlyData[simulationResult.monthlyData.length - 1].cumulativeInvestment / 10000).toFixed(2)}万</p>
            </div>
            <div className="card">
              <h3>总收益</h3>
              <p>{(simulationResult.totalReturn.amount / 10000).toFixed(2)}万 / {simulationResult.totalReturn.percent.toFixed(2)}%</p>
            </div>
            <div className="card">
              <h3>年化收益</h3>
              <p>{simulationResult.totalReturn.annualizedReturn.toFixed(2)}%</p>
            </div>
            <div className="card">
              <h3>内部收益率(IRR)</h3>
              <p>{simulationResult.totalReturn.irr.toFixed(2)}%</p>
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

      {/* 风险提示 */}
      {activeView === 'history' && simulationResult && (
        <div className="risk-tips">
          <h3>风险提示</h3>
          {(() => {
            // 获取最大回撤发生月份的对应收入
            const drawdownMonth = simulationResult.maxDrawdown.month
            console.log('drawdownMonth', drawdownMonth)
            console.log('incomeSegments', incomeSegments)
            console.log('simulationResult.maxDrawdown', simulationResult.maxDrawdown)
            const monthIncome = incomeSegments.find(seg => 
              drawdownMonth >= seg.startDate && drawdownMonth <= seg.endDate
            )?.monthlyIncome || incomeSegments[0]?.monthlyIncome || 0
            console.log('monthIncome', monthIncome)
            return simulationResult.maxDrawdown.amount > monthIncome && monthIncome > 0 && (
              <p className="risk-tip">
                历史上曾亏损{(simulationResult.maxDrawdown.amount / 10000).toFixed(2)}万，相当于{Math.round(simulationResult.maxDrawdown.amount / monthIncome)}个月收入，请确认能承受
              </p>
            )
          })()}
          {/* {simulationResult.totalReturn.amount < 0 && (
            <p className="risk-tip">
              定投结束时仍亏损，建议延长定投时间
            </p>
          )} */}
          {/* {hasNegativeBalance && (
            <p className="risk-tip">
              活期某月为负，定投总额超可支配收入，建议降低金额
            </p>
          )} */}
        </div>
      )}

      {/* 免责声明 */}
      <div className="disclaimer">
        <p>以上计算结果仅供参考，不构成任何投资建议。市场有风险，决策需谨慎。</p>
      </div>
    </div>
  )
}
