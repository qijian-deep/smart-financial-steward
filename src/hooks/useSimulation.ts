import { useState, useCallback, useMemo } from 'react'
import type {
  IncomeSegment,
  ExtraExpense,
  Fund,
  Deposit,
  CurrentAccount,
  SimulationParams,
  SimulationResult,
  MonthlyData,
  MaxDrawdown,
  LoadedFundData,
  MonthNavs
} from '../types'

export function useSimulation(loadedFundData: LoadedFundData | null = null) {
  const [incomeSegments, setIncomeSegments] = useState<IncomeSegment[]>([
    { id: 1, monthlyIncome: 10000, startDate: '2015-01', endDate: '2015-03' }
  ])
  const [monthlyExpense, setMonthlyExpense] = useState<number>(5000)
  const [extraExpenses, setExtraExpenses] = useState<ExtraExpense[]>([])
  const [funds, setFunds] = useState<Fund[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [currentAccount, setCurrentAccount] = useState<CurrentAccount>({ initialBalance: 10000, annualRate: 0 })
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    startDate: '2015-01',
    endDate: '2015-03',
    shiftYears: 0
  })

  // 计算触发状态 - 用于控制何时重新计算
  const [calculationTrigger, setCalculationTrigger] = useState<number>(0)

  // 合并默认基金数据和加载的基金数据
  const fundNavData = useMemo(() => {
    const data: Record<string, Record<string, { startNav: number; endNav: number }>> = {}
    if (loadedFundData && loadedFundData.data) {
      data[loadedFundData.code] = loadedFundData.data
    }
    return data
  }, [loadedFundData])

  const getMonthlyIncome = useCallback((date: string, segments: IncomeSegment[]) => {
    const segment = segments.find(s => date >= s.startDate && date <= s.endDate)
    return segment ? segment.monthlyIncome : 0
  }, [])

  // 获取月初和月末净值
  const getMonthNavs = useCallback((month: string, fundCode: string): MonthNavs | null => {
    const fundData = fundNavData[fundCode]
    if (!fundData) return null

    // 获取当月数据
    let startNavData = fundData[month]

    // 如果当月没有数据，往后查找
    if (!startNavData) {
      const [year, monthNum] = month.split('-').map(Number)
      let searchYear = year, searchMonth = monthNum
      for (let i = 0; i < 12; i++) {
        searchMonth++
        if (searchMonth > 12) { searchMonth = 1; searchYear++ }
        const searchKey = `${searchYear}-${searchMonth.toString().padStart(2, '0')}`
        if (fundData[searchKey]) { startNavData = fundData[searchKey]; break }
      }
    }

    if (!startNavData) return null

    // 获取下月数据作为月末净值
    const [year, monthNum] = month.split('-').map(Number)
    let nextYear = year, nextMonth = monthNum + 1
    if (nextMonth > 12) { nextMonth = 1; nextYear++ }
    const nextMonthKey = `${nextYear}-${nextMonth.toString().padStart(2, '0')}`

    let endNavData = fundData[nextMonthKey]

    // 如果下月没有数据，往后查找
    if (!endNavData) {
      let searchYear = nextYear, searchMonth = nextMonth
      for (let i = 0; i < 12; i++) {
        searchMonth++
        if (searchMonth > 12) { searchMonth = 1; searchYear++ }
        const searchKey = `${searchYear}-${searchMonth.toString().padStart(2, '0')}`
        if (fundData[searchKey]) { endNavData = fundData[searchKey]; break }
      }
    }

    // 如果没有下月数据，使用当月数据作为月末净值
    if (!endNavData) endNavData = startNavData

    return {
      startNav: startNavData.startNav,
      endNav: endNavData.endNav
    }
  }, [fundNavData])

  // 执行计算的核心函数
  const performCalculation = useCallback((): SimulationResult => {
    const months: string[] = []
    let currentDate = new Date(simulationParams.startDate + '-01')
    const endDate = new Date(simulationParams.endDate + '-01')

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      months.push(`${year}-${month.toString().padStart(2, '0')}`)
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    // 状态记录
    let initialBalance = currentAccount.initialBalance
    let fundAssets = 0

    const monthlyData: MonthlyData[] = []
    let maxDrawdown: MaxDrawdown = { percent: 0, amount: 0, month: '' }
    let previousTotal = currentAccount.initialBalance

    months.forEach((month, index) => {
      const monthStartFundAssets = fundAssets

      const income = getMonthlyIncome(month, incomeSegments)
      const expense = monthlyExpense + extraExpenses.reduce((sum, exp) => sum + exp.amount / 12, 0)

      let totalFundInvestment = 0
      funds.forEach(fund => {
        if (month >= fund.startDate && month <= fund.endDate) {
          totalFundInvestment += fund.monthlyAmount
        }
      })

      let navGrowth = 1
      let startNav = 1
      let endNav = 1

      if (funds.length > 0) {
        const navs: Record<string, MonthNavs | null> = {}
        funds.forEach(fund => {
          const nav = getMonthNavs(month, fund.fundCode)
          if (nav) navs[fund.fundCode] = nav
        })

        if (Object.keys(navs).length > 0) {
          const firstFund = funds[0]
          startNav = navs[firstFund.fundCode]?.startNav || 1
          endNav = navs[firstFund.fundCode]?.endNav || 1
          navGrowth = endNav / startNav
        }
      }

      fundAssets = (monthStartFundAssets + totalFundInvestment) * navGrowth
      const totalAssets = initialBalance + fundAssets

      const monthIndex = index + 1
      const cumulativeInvestment = currentAccount.initialBalance + totalFundInvestment * monthIndex

      const monthStartTotalAssets = initialBalance + monthStartFundAssets
      const monthlyReturn = totalAssets - (monthStartTotalAssets + (income - expense))

      const totalFundAssets = fundAssets
      const currentBalance = initialBalance

      if (totalAssets < previousTotal) {
        const drawdownAmount = previousTotal - totalAssets
        const drawdownPercent = (drawdownAmount / previousTotal) * 100
        if (drawdownPercent > maxDrawdown.percent) {
          maxDrawdown = { percent: drawdownPercent, amount: drawdownAmount, month }
        }
      }
      previousTotal = Math.max(previousTotal, totalAssets)

      monthlyData.push({
        month,
        totalAssets,
        totalInvestment: cumulativeInvestment,
        fundAssets: totalFundAssets,
        currentBalance,
        monthlyReturn,
        monthStartTotalAssets,
        income,
        startNav,
        endNav,
        navGrowth
      })
    })

    const finalAssets = monthlyData[monthlyData.length - 1]?.totalAssets || 0
    const finalTotalInvestment = monthlyData[monthlyData.length - 1]?.totalInvestment || currentAccount.initialBalance
    const totalReturnAmount = finalAssets - finalTotalInvestment
    const totalReturnPercent = finalTotalInvestment > 0 ? (totalReturnAmount / finalTotalInvestment) * 100 : 0

    return {
      monthlyData,
      totalReturn: { amount: totalReturnAmount, percent: totalReturnPercent },
      maxDrawdown
    }
  }, [incomeSegments, monthlyExpense, extraExpenses, funds, currentAccount, simulationParams, getMonthlyIncome, getMonthNavs])

  // 当 calculationTrigger 变化时执行计算
  const simulationResult = useMemo<SimulationResult | null>(() => {
    if (calculationTrigger === 0) return null
    return performCalculation()
  }, [calculationTrigger, performCalculation])

  // 触发计算的函数
  const triggerCalculation = useCallback(() => {
    setCalculationTrigger(prev => prev + 1)
  }, [])

  const shiftToFuture = useCallback((historyResult: SimulationResult | null, shiftYears: number): SimulationResult | null => {
    if (!historyResult) return null
    const shiftedData = historyResult.monthlyData.map(item => {
      const [year, month] = item.month.split('-')
      const newYear = parseInt(year) + shiftYears
      return { ...item, month: `${newYear}-${month}` }
    })
    return { ...historyResult, monthlyData: shiftedData }
  }, [])

  const addIncomeSegment = useCallback(() => {
    const newId = incomeSegments.length + 1
    setIncomeSegments([...incomeSegments, { id: newId, monthlyIncome: 10000, startDate: '2015-01', endDate: '2015-03' }])
  }, [incomeSegments])

  const addFund = useCallback(() => {
    const newId = funds.length + 1
    setFunds([...funds, { id: newId, fundCode: '', monthlyAmount: 1000, startDate: '2015-01', endDate: '2015-03' }])
  }, [funds])

  const addDeposit = useCallback(() => {
    const newId = deposits.length + 1
    setDeposits([...deposits, { id: newId, amount: 10000, date: '2015-01', annualRate: 2.5, term: 12 }])
  }, [deposits])

  const addExtraExpense = useCallback(() => {
    const newId = extraExpenses.length + 1
    setExtraExpenses([...extraExpenses, { id: newId, amount: 5000 }])
  }, [extraExpenses])

  return {
    incomeSegments, setIncomeSegments, addIncomeSegment,
    monthlyExpense, setMonthlyExpense,
    extraExpenses, setExtraExpenses, addExtraExpense,
    funds, setFunds, addFund,
    deposits, setDeposits, addDeposit,
    currentAccount, setCurrentAccount,
    simulationParams, setSimulationParams,
    simulationResult, shiftToFuture,
    triggerCalculation
  }
}
