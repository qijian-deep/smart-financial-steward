import { useState, useCallback, useMemo } from 'react'
import { generateFundNavData } from '../utils/fundUtils'

const defaultFundNavData = generateFundNavData()

export function useSimulation(loadedFundData = null) {
  const [incomeSegments, setIncomeSegments] = useState([
    { id: 1, monthlyIncome: 10000, startDate: '2015-01', endDate: '2015-03' }
  ])
  const [monthlyExpense, setMonthlyExpense] = useState(5000)
  const [extraExpenses, setExtraExpenses] = useState([])
  const [funds, setFunds] = useState([])
  const [deposits, setDeposits] = useState([])
  const [currentAccount, setCurrentAccount] = useState({ initialBalance: 10000, annualRate: 0 })
  const [simulationParams, setSimulationParams] = useState({
    startDate: '2015-01',
    endDate: '2015-03',
    shiftYears: 0
  })

  // 合并默认基金数据和加载的基金数据
  const fundNavData = useMemo(() => {
    const data = { ...defaultFundNavData }
    if (loadedFundData && loadedFundData.data) {
      data[loadedFundData.code] = loadedFundData.data
    }
    return data
  }, [loadedFundData])

  const getMonthlyIncome = useCallback((date, segments) => {
    const segment = segments.find(s => date >= s.startDate && date <= s.endDate)
    return segment ? segment.monthlyIncome : 0
  }, [])

  // 获取月初和月末净值
  const getMonthNavs = useCallback((month, fundCode) => {
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

    // 打印2015年1月的数据
    if (month === '2015-01') {
      console.log('2015年1月第一天净值:', startNavData.startNav, '时间:', startNavData.startDate)
      console.log('2015年1月最后一天净值:', endNavData.endNav, '时间:', endNavData.endDate)
    }

    return {
      startNav: startNavData.startNav,
      endNav: endNavData.endNav
    }
  }, [fundNavData])

  const simulationResult = useMemo(() => {
    const months = []
    let currentDate = new Date(simulationParams.startDate + '-01')
    const endDate = new Date(simulationParams.endDate + '-01')

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      months.push(`${year}-${month.toString().padStart(2, '0')}`)
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    // 状态记录
    let initialBalance = currentAccount.initialBalance  // 初始余额（保持不变）
    let fundAssets = 0  // 基金资产（会随净值变化）
    
    const monthlyData = []
    let maxDrawdown = { percent: 0, amount: 0, month: '' }
    let previousTotal = currentAccount.initialBalance

    months.forEach((month, index) => {
      // 1. 月初基金资产 = 上月末结转
      const monthStartFundAssets = fundAssets

      // 2. 月收入和支出
      const income = getMonthlyIncome(month, incomeSegments)
      const expense = monthlyExpense + extraExpenses.reduce((sum, exp) => sum + exp.amount / 12, 0)
      const netIncome = income - expense

      // 3. 定投金额（从可支配收入中扣除，加入基金资产）
      let totalFundInvestment = 0
      funds.forEach(fund => {
        if (month >= fund.startDate && month <= fund.endDate) {
          totalFundInvestment += fund.monthlyAmount
        }
      })

      // 4. 计算净值增长率
      let navGrowth = 1
      let startNav = 1
      let endNav = 1
      
      // 如果有基金配置，获取净值增长率
      if (funds.length > 0) {
        const navs = {}
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
      
      // 5. 计算月末基金资产 = (月初基金资产 + 定投金额) * 净值增长率
      fundAssets = (monthStartFundAssets + totalFundInvestment) * navGrowth
      
      // 6. 计算月末总资产 = 初始余额 + 基金资产
      const totalAssets = initialBalance + fundAssets

      // 7. 累计投入
      const monthIndex = index + 1
      const cumulativeInvestment = currentAccount.initialBalance + totalFundInvestment * monthIndex

      // 8. 当月收益
      const monthStartTotalAssets = initialBalance + monthStartFundAssets
      const monthlyReturn = totalAssets - (monthStartTotalAssets + netIncome)

      // 9. 计算基金资产和活期余额（用于展示）
      const totalFundAssets = fundAssets
      const currentBalance = initialBalance

      // 10. 最大回撤
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

  const shiftToFuture = useCallback((historyResult, shiftYears) => {
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
    simulationResult, shiftToFuture
  }
}
