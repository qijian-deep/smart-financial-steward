import type {
  FundConfig,
  MonthlyIncome,
  DepositAllocation,
  SimulationResult,
  MonthlyData
} from '../types'
import { fundDataLoader } from './FundDataLoader'

// 事件类型定义
type EventKey = 'resultChange' | string

// 事件数据映射
type EventDataMap = {
  resultChange: SimulationResult | null
}

class SimulationEngine {
  // 属性
  private fundConfigs: FundConfig[] = []
  private monthlyIncomes: MonthlyIncome[] = []
  private monthlyExpenses: number = 0
  private yearExtExpenses: number[] = []
  private depositAllocations: DepositAllocation[] = []
  private initialBalance: number = 0
  private mockStartDate: string = ''
  private mockEndDate: string = ''

  // 模拟结果
  private simulationResult: SimulationResult | null = null

  // 事件监听器
  private listeners: Map<EventKey, Set<(data: unknown) => void>> = new Map()

  // ==================== 事件监听 ====================

  /**
   * 添加监听器，返回取消订阅函数
   * @param eventKey 事件标识
   * @param listener 监听器函数
   */
  public subscribe<K extends EventKey>(
    eventKey: K,
    listener: (data: K extends keyof EventDataMap ? EventDataMap[K] : unknown) => void
  ): () => void {
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, new Set())
    }

    const eventListeners = this.listeners.get(eventKey)!
    eventListeners.add(listener as (data: unknown) => void)

    // 如果是 resultChange 事件，立即触发一次当前数据
    if (eventKey === 'resultChange') {
      listener(this.simulationResult as K extends keyof EventDataMap ? EventDataMap[K] : unknown)
    }

    return () => {
      eventListeners.delete(listener as (data: unknown) => void)
    }
  }

  /**
   * 通知指定事件的所有监听器
   * @param eventKey 事件标识
   * @param data 事件数据
   */
  private notifyListeners<K extends EventKey>(
    eventKey: K,
    data: K extends keyof EventDataMap ? EventDataMap[K] : unknown
  ): void {
    const eventListeners = this.listeners.get(eventKey)
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data))
    }
  }

  // ==================== Getters ====================
  getFundConfigs(): FundConfig[] {
    return this.fundConfigs
  }

  getMonthlyIncomes(): MonthlyIncome[] {
    return this.monthlyIncomes
  }

  getMonthlyExpenses(): number {
    return this.monthlyExpenses
  }

  getYearExtExpenses(): number[] {
    return this.yearExtExpenses
  }

  getDepositAllocations(): DepositAllocation[] {
    return this.depositAllocations
  }

  getInitialBalance(): number {
    return this.initialBalance
  }

  getMockStartDate(): string {
    return this.mockStartDate
  }

  getMockEndDate(): string {
    return this.mockEndDate
  }

  getSimulationResult(): SimulationResult | null {
    return this.simulationResult
  }

  // ==================== Setters ====================
  setFundConfigs(configs: FundConfig[]): void {
    this.fundConfigs = configs
  }

  setMonthlyIncomes(incomes: MonthlyIncome[]): void {
    this.monthlyIncomes = incomes
  }

  setMonthlyExpenses(expenses: number): void {
    this.monthlyExpenses = expenses
  }

  setYearExtExpenses(expenses: number[]): void {
    this.yearExtExpenses = expenses
  }

  setDepositAllocations(allocations: DepositAllocation[]): void {
    this.depositAllocations = allocations
  }

  setInitialBalance(balance: number): void {
    this.initialBalance = balance
  }

  setMockStartDate(date: string): void {
    this.mockStartDate = date
  }

  setMockEndDate(date: string): void {
    this.mockEndDate = date
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取指定月份的月收入
   */
  private getMonthlyIncomeForMonth(month: string): number {
    return this.monthlyIncomes
      .filter(income => month >= income.startDate && month <= income.endDate)
      .reduce((sum, income) => sum + income.income, 0)
  }

  /**
   * 获取年额外支出的月平均值
   */
  private getMonthlyExtExpense(): number {
    if (this.yearExtExpenses.length === 0) return 0
    const total = this.yearExtExpenses.reduce((sum, exp) => sum + exp, 0)
    return total / 12
  }

  /**
   * 获取指定月份的基金净值增长率
   */
  private getFundGrowthRate(fundCode: string, month: string): number {
    const fundData = fundDataLoader.getFundDataByCode(fundCode)
    if (!fundData || !fundData.data) return 1

    const navData = fundData.data[month]
    if (navData) {
      return navData.growthRate
    }

    // 如果当月没有数据，查找最近的有数据的月份
    const [year, monthNum] = month.split('-').map(Number)
    for (let i = 1; i <= 12; i++) {
      let searchMonth = monthNum - i
      let searchYear = year
      if (searchMonth <= 0) {
        searchMonth += 12
        searchYear--
      }
      const searchKey = `${searchYear}-${searchMonth.toString().padStart(2, '0')}`
      if (fundData.data[searchKey]) {
        return fundData.data[searchKey].growthRate
      }
    }

    return 1
  }

  /**
   * 计算指定月份的基金收益
   */
  private calculateFundIncomeForMonth(
    month: string,
    fundAssets: Map<string, number>
  ): { totalIncome: number; updatedAssets: Map<string, number>; fundDetails: import('../types').FundMonthlyData[] } {
    let totalIncome = 0
    const updatedAssets = new Map(fundAssets)
    const fundDetails: import('../types').FundMonthlyData[] = []

    for (const config of this.fundConfigs) {
      if (month < config.startDate || month > config.endDate) continue

      const fundCode = config.fundCode
      const monthlyInvestment = config.investmentAmount
      const growthRate = this.getFundGrowthRate(fundCode, month)

      // 月初基金资产 + 当月定投
      const monthStartAssets = updatedAssets.get(fundCode) || 0
      const monthEndAssets = (monthStartAssets + monthlyInvestment) * growthRate

      // 当月收益 = 月末资产 - 月初资产 - 定投金额
      const monthIncome = monthEndAssets - monthStartAssets - monthlyInvestment
      totalIncome += monthIncome

      updatedAssets.set(fundCode, monthEndAssets)

      // 获取基金名称
      const fundData = fundDataLoader.getFundDataByCode(fundCode)
      const fundName = fundData?.name || fundCode

      // 计算基金增长金额
      const fundGrowthAmount = monthEndAssets - monthStartAssets

      // 保存基金详情
      fundDetails.push({
        fundCode,
        fundName,
        startAssets: monthStartAssets,
        endAssets: monthEndAssets,
        growthRate,
        growthAmount: fundGrowthAmount,
        investmentAmount: monthlyInvestment
      })
    }

    return { totalIncome, updatedAssets, fundDetails }
  }

  /**
   * 计算指定月份的存款收益
   */
  private calculateDepositIncomeForMonth(month: string): number {
    let totalIncome = 0

    for (const allocation of this.depositAllocations) {
      if (month < allocation.startDate || month > allocation.endDate) continue

      // 月利率 = 年利率 / 12
      const monthlyRate = allocation.annualInterestRate / 100 / 12
      // 当月收益 = 存款金额 * 月利率
      const monthIncome = allocation.amount * monthlyRate
      totalIncome += monthIncome
    }

    return totalIncome
  }

  /**
   * 获取月份列表
   */
  private getMonthList(): string[] {
    const months: string[] = []
    const startDate = new Date(this.mockStartDate + '-01')
    const endDate = new Date(this.mockEndDate + '-01')

    let currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      months.push(`${year}-${month.toString().padStart(2, '0')}`)
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return months
  }

  // ==================== 核心计算方法 ====================

  /**
   * 执行计算
   */
  calculate(): SimulationResult | null {
    if (!this.mockStartDate || !this.mockEndDate) {
      console.warn('模拟开始时间或结束时间未设置')
      return null
    }

    const months = this.getMonthList()
    const monthlyData: MonthlyData[] = []

    // 累计投入（初始余额）
    let cumulativeInvestment = this.initialBalance
    // 基金资产记录（按基金code）
    let fundAssets = new Map<string, number>()
    // 上月总资产
    let lastMonthTotalAssets = this.initialBalance

    for (let i = 0; i < months.length; i++) {
      const month = months[i]

      // 当月月收入
      const monthlyIncome = this.getMonthlyIncomeForMonth(month)
      // 当月额外支出
      const monthlyExtExpense = this.getMonthlyExtExpense()

      // 计算当月累计投入
      if (i === 0) {
        // 第一个月：初始余额 + 月收入 - 月支出 - 年额外支出/12
        cumulativeInvestment = this.initialBalance + monthlyIncome - this.monthlyExpenses - monthlyExtExpense
      } else {
        // 后续月份：上月累计 + 月收入 - 月支出 - 年额外支出/12
        cumulativeInvestment += monthlyIncome - this.monthlyExpenses - monthlyExtExpense
      }

      // 月初资产 = 上月总资产 + 本月新投入
      const startAssets = lastMonthTotalAssets + (i === 0 ? cumulativeInvestment - this.initialBalance : monthlyIncome - this.monthlyExpenses - monthlyExtExpense)

      // 计算基金收益
      const { totalIncome: fundIncome, updatedAssets, fundDetails } = this.calculateFundIncomeForMonth(month, fundAssets)
      fundAssets = updatedAssets

      // 计算存款收益
      const depositIncome = this.calculateDepositIncomeForMonth(month)

      // 总资产 = 累计投入 + 基金收益 + 存款收益
      const totalAssets = cumulativeInvestment + fundIncome + depositIncome

      // 月末资产
      const endAssets = totalAssets

      // 计算增长率和增长金额
      const growthAmount = endAssets - startAssets
      const growthRate = startAssets > 0 ? endAssets / startAssets : 1

      monthlyData.push({
        month,
        cumulativeInvestment,
        totalAssets,
        fundIncome,
        depositIncome,
        startAssets,
        endAssets,
        growthRate,
        growthAmount,
        fundDetails
      })

      // 更新上月总资产
      lastMonthTotalAssets = totalAssets
    }

    // 计算总收益
    const firstMonth = monthlyData[0]
    const lastMonth = monthlyData[monthlyData.length - 1]
    const totalInvestment = lastMonth.cumulativeInvestment
    const finalAssets = lastMonth.totalAssets
    const totalReturnAmount = finalAssets - totalInvestment
    const totalReturnPercent = totalInvestment > 0 ? (totalReturnAmount / totalInvestment) * 100 : 0

    // 计算最大回撤
    let maxDrawdownAmount = 0
    let maxDrawdownPercent = 0
    let maxDrawdownMonth = ''
    let peak = 0

    for (let i = 0; i < monthlyData.length; i++) {
      const data = monthlyData[i]
      if (data.totalAssets > peak) {
        peak = data.totalAssets
      }
      const drawdown = peak - data.totalAssets
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0
      if (drawdown > maxDrawdownAmount) {
        maxDrawdownAmount = drawdown
        maxDrawdownPercent = drawdownPercent
        maxDrawdownMonth = data.month
      }
    }

    this.simulationResult = {
      monthlyData,
      totalReturn: {
        amount: totalReturnAmount,
        percent: totalReturnPercent
      },
      maxDrawdown: {
        amount: maxDrawdownAmount,
        percent: maxDrawdownPercent,
        month: maxDrawdownMonth
      }
    }
    this.notifyListeners('resultChange', this.simulationResult)
    return this.simulationResult
  }
}

// 导出单例实例
export const simulationEngine = new SimulationEngine()
