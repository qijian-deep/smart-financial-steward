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

export class SimulationEngine {
  private incomeSegments: IncomeSegment[] = [
    { id: 1, monthlyIncome: 10000, startDate: '2015-01', endDate: '2015-03' }
  ]
  private monthlyExpense: number = 5000
  private extraExpenses: ExtraExpense[] = []
  private funds: Fund[] = []
  private deposits: Deposit[] = []
  private currentAccount: CurrentAccount = { initialBalance: 10000, annualRate: 0 }
  private simulationParams: SimulationParams = {
    startDate: '2015-01',
    endDate: '2015-03',
    shiftYears: 0
  }
  
  private loadedFundData: LoadedFundData | null = null
  private simulationResult: SimulationResult | null = null

  // 回调函数
  private onResultChange?: (result: SimulationResult | null) => void

  constructor(options?: {
    onResultChange?: (result: SimulationResult | null) => void
  }) {
    if (options) {
      this.onResultChange = options.onResultChange
    }
  }

  // Getters
  getIncomeSegments(): IncomeSegment[] {
    return this.incomeSegments
  }

  getMonthlyExpense(): number {
    return this.monthlyExpense
  }

  getExtraExpenses(): ExtraExpense[] {
    return this.extraExpenses
  }

  getFunds(): Fund[] {
    return this.funds
  }

  getDeposits(): Deposit[] {
    return this.deposits
  }

  getCurrentAccount(): CurrentAccount {
    return this.currentAccount
  }

  getSimulationParams(): SimulationParams {
    return this.simulationParams
  }

  getSimulationResult(): SimulationResult | null {
    return this.simulationResult
  }

  // Setters
  setIncomeSegments(segments: IncomeSegment[]): void {
    this.incomeSegments = segments
  }

  setMonthlyExpense(value: number): void {
    this.monthlyExpense = value
  }

  setExtraExpenses(expenses: ExtraExpense[]): void {
    this.extraExpenses = expenses
  }

  setFunds(funds: Fund[]): void {
    this.funds = funds
  }

  setDeposits(deposits: Deposit[]): void {
    this.deposits = deposits
  }

  setCurrentAccount(account: CurrentAccount): void {
    this.currentAccount = account
  }

  setSimulationParams(params: SimulationParams): void {
    this.simulationParams = params
  }

  setLoadedFundData(data: LoadedFundData | null): void {
    this.loadedFundData = data
  }

  // 添加方法
  addIncomeSegment(): void {
    const newId = this.incomeSegments.length + 1
    this.incomeSegments = [...this.incomeSegments, { 
      id: newId, 
      monthlyIncome: 10000, 
      startDate: this.simulationParams.startDate, 
      endDate: this.simulationParams.endDate 
    }]
  }

  addFund(): void {
    const newId = this.funds.length + 1
    this.funds = [...this.funds, { 
      id: newId, 
      fundCode: this.loadedFundData?.code || '', 
      monthlyAmount: 1000, 
      startDate: this.simulationParams.startDate, 
      endDate: this.simulationParams.endDate 
    }]
  }

  addDeposit(): void {
    const newId = this.deposits.length + 1
    this.deposits = [...this.deposits, { 
      id: newId, 
      amount: 10000, 
      date: this.simulationParams.startDate, 
      annualRate: 2.5, 
      term: 12 
    }]
  }

  addExtraExpense(): void {
    const newId = this.extraExpenses.length + 1
    this.extraExpenses = [...this.extraExpenses, { id: newId, amount: 5000 }]
  }

  // 获取月收入
  private getMonthlyIncome(date: string): number {
    const segment = this.incomeSegments.find(s => date >= s.startDate && date <= s.endDate)
    return segment ? segment.monthlyIncome : 0
  }

  // 获取基金净值数据
  private getMonthNavs(month: string, fundCode: string): MonthNavs | null {
    if (!this.loadedFundData || !this.loadedFundData.data) return null
    
    const fundData = this.loadedFundData.code === fundCode ? this.loadedFundData.data : null
    if (!fundData) return null

    let startNavData = fundData[month]
    
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

    const [year, monthNum] = month.split('-').map(Number)
    let nextYear = year, nextMonth = monthNum + 1
    if (nextMonth > 12) { nextMonth = 1; nextYear++ }
    const nextMonthKey = `${nextYear}-${nextMonth.toString().padStart(2, '0')}`
    
    let endNavData = fundData[nextMonthKey]
    
    if (!endNavData) {
      let searchYear = nextYear, searchMonth = nextMonth
      for (let i = 0; i < 12; i++) {
        searchMonth++
        if (searchMonth > 12) { searchMonth = 1; searchYear++ }
        const searchKey = `${searchYear}-${searchMonth.toString().padStart(2, '0')}`
        if (fundData[searchKey]) { endNavData = fundData[searchKey]; break }
      }
    }

    if (!endNavData) endNavData = startNavData

    return {
      startNav: startNavData.startNav,
      endNav: endNavData.endNav
    }
  }

  // 执行计算
  calculate(): SimulationResult | null {
    const months: string[] = []
    let currentDate = new Date(this.simulationParams.startDate + '-01')
    const endDate = new Date(this.simulationParams.endDate + '-01')

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      months.push(`${year}-${month.toString().padStart(2, '0')}`)
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    let initialBalance = this.currentAccount.initialBalance
    let fundAssets = 0
    
    const monthlyData: MonthlyData[] = []
    let maxDrawdown: MaxDrawdown = { percent: 0, amount: 0, month: '' }
    let previousTotal = this.currentAccount.initialBalance

    months.forEach((month, index) => {
      const monthStartFundAssets = fundAssets

      const income = this.getMonthlyIncome(month)
      const expense = this.monthlyExpense + this.extraExpenses.reduce((sum, exp) => sum + exp.amount / 12, 0)

      let totalFundInvestment = 0
      this.funds.forEach(fund => {
        if (month >= fund.startDate && month <= fund.endDate) {
          totalFundInvestment += fund.monthlyAmount
        }
      })

      let navGrowth = 1
      let startNav = 1
      let endNav = 1
      
      if (this.funds.length > 0) {
        const navs: Record<string, MonthNavs | null> = {}
        this.funds.forEach(fund => {
          const nav = this.getMonthNavs(month, fund.fundCode)
          if (nav) navs[fund.fundCode] = nav
        })

        if (Object.keys(navs).length > 0) {
          const firstFund = this.funds[0]
          startNav = navs[firstFund.fundCode]?.startNav || 1
          endNav = navs[firstFund.fundCode]?.endNav || 1
          navGrowth = endNav / startNav
        }
      }
      
      fundAssets = (monthStartFundAssets + totalFundInvestment) * navGrowth
      const totalAssets = initialBalance + fundAssets

      const monthIndex = index + 1
      const cumulativeInvestment = this.currentAccount.initialBalance + totalFundInvestment * monthIndex

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
    const finalTotalInvestment = monthlyData[monthlyData.length - 1]?.totalInvestment || this.currentAccount.initialBalance
    const totalReturnAmount = finalAssets - finalTotalInvestment
    const totalReturnPercent = finalTotalInvestment > 0 ? (totalReturnAmount / finalTotalInvestment) * 100 : 0

    this.simulationResult = {
      monthlyData,
      totalReturn: { amount: totalReturnAmount, percent: totalReturnPercent },
      maxDrawdown
    }

    this.onResultChange?.(this.simulationResult)
    return this.simulationResult
  }

  // 平移到未来
  shiftToFuture(shiftYears: number): SimulationResult | null {
    if (!this.simulationResult) return null
    
    const shiftedData = this.simulationResult.monthlyData.map(item => {
      const [year, month] = item.month.split('-')
      const newYear = parseInt(year) + shiftYears
      return { ...item, month: `${newYear}-${month}` }
    })
    
    return { ...this.simulationResult, monthlyData: shiftedData }
  }
}
