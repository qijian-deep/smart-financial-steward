import { useState, useCallback } from 'react'
import type { LoadedFundData, FundNavData } from '../types'

declare global {
  interface Window {
    Data_netWorthTrend?: Array<{ x: number; y: number }>
    fS_name?: string
  }
}

export function useFundData() {
  const [fundCodeInput, setFundCodeInput] = useState<string>('519702')
  const [loadedFundData, setLoadedFundData] = useState<LoadedFundData | null>(null)
  const [fundLoading, setFundLoading] = useState<boolean>(false)
  const [fundError, setFundError] = useState<string | null>(null)

  const loadFundData = useCallback(async () => {
    if (!fundCodeInput) return

    setFundLoading(true)
    setFundError(null)

    try {
      const script = document.createElement('script')
      script.src = `https://fund.eastmoney.com/pingzhongdata/${fundCodeInput}.js`
      script.async = true

      const timeout = setTimeout(() => {
        setFundError('加载超时，请检查基金代码是否正确')
        setFundLoading(false)
        if (script.parentNode) {
          document.head.removeChild(script)
        }
      }, 10000)

      script.onload = () => {
        clearTimeout(timeout)
        if (typeof window.Data_netWorthTrend !== 'undefined') {
          const monthlyData: Record<string, FundNavData> = {}
          const trendData = window.Data_netWorthTrend

          // 先将所有数据按年月分组
          const groupedByMonth: Record<string, Array<{
            year: number
            month: number
            day: number
            nav: number
            timestamp: number
          }>> = {}
          
          trendData?.forEach(item => {
            const date = new Date(item.x)
            const year = date.getFullYear()
            const month = date.getMonth() + 1
            const day = date.getDate()
            const key = `${year}-${month.toString().padStart(2, '0')}`
            
            if (!groupedByMonth[key]) {
              groupedByMonth[key] = []
            }
            
            // 存储 [年, 月, 日, 净值]
            groupedByMonth[key].push({
              year,
              month,
              day,
              nav: item.y,
              timestamp: item.x
            })
          })

          // 处理每个月的数据，找出1号和最后一天
          Object.keys(groupedByMonth).forEach(key => {
            const monthData = groupedByMonth[key]
            
            // 按日期排序
            monthData.sort((a, b) => a.day - b.day)
            
            // 获取1号的数据（月初净值）
            const firstDayOfMonth = monthData.find(d => d.day === 1)
            // 如果没有1号的数据，使用第一天
            const startDay = firstDayOfMonth || monthData[0]
            
            // 获取最后一天的数据（月末净值）
            const lastDay = monthData[monthData.length - 1]
            
            monthlyData[key] = {
              // 月初净值（1号，如果没有则用第一天）
              startNav: startDay.nav,
              startDate: `${startDay.year}-${startDay.month.toString().padStart(2, '0')}-${startDay.day.toString().padStart(2, '0')}`,
              // 月末净值（最后一天）
              endNav: lastDay.nav,
              endDate: `${lastDay.year}-${lastDay.month.toString().padStart(2, '0')}-${lastDay.day.toString().padStart(2, '0')}`,
              // 保留所有数据供参考
              allData: monthData
            }
          })

          const fundName = typeof window.fS_name !== 'undefined' ? window.fS_name : fundCodeInput

          const loadedData: LoadedFundData = {
            code: fundCodeInput,
            name: fundName,
            data: monthlyData
          }
          console.log('monthlyData:', monthlyData)
          console.log('loadedFundData:', loadedData)
          setLoadedFundData(loadedData)
        } else {
          setFundError('未找到基金数据')
        }
        setFundLoading(false)
        if (script.parentNode) {
          document.head.removeChild(script)
        }
      }

      script.onerror = () => {
        clearTimeout(timeout)
        setFundError('加载失败，请检查基金代码')
        setFundLoading(false)
        if (script.parentNode) {
          document.head.removeChild(script)
        }
      }

      document.head.appendChild(script)
    } catch (error) {
      setFundError('加载出错: ' + (error instanceof Error ? error.message : String(error)))
      setFundLoading(false)
    }
  }, [fundCodeInput])

  return {
    fundCodeInput,
    setFundCodeInput,
    loadedFundData,
    fundLoading,
    fundError,
    loadFundData
  }
}
