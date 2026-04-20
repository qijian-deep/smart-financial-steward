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
  // 属性定义
  // 基金配置
  private fundConfigs: FundConfig[] = []
  // 月收入
  private monthlyIncomes: MonthlyIncome[] = []
  // 月支出
  private monthlyExpenses: number = 0
  // 年扩展支出
  private yearExtExpenses: number[] = []
  // 存款配置
  private depositAllocations: DepositAllocation[] = []
  // 初始资产金额
  private initialBalance: number = 0
  // 模拟开始日期
  private mockStartDate: string = ''
  // 模拟结束日期
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
   * 获取指定月份的基金累计分红
   */
  private getFundTotalDividend(fundCode: string, month: string): number {
    const fundData = fundDataLoader.getFundDataByCode(fundCode)
    if (!fundData || !fundData.data) return 0

    const navData = fundData.data[month]
    if (navData) {
      return navData.totalDividend || 0
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
        return fundData.data[searchKey].totalDividend || 0
      }
    }

    return 0
  }

  /**
   * 获取指定月份当月是否有分红（返回当月分红金额，不是累计）
   */
  private getFundMonthlyDividend(fundCode: string, month: string): number {
    const fundData = fundDataLoader.getFundDataByCode(fundCode)
    if (!fundData || !fundData.data) return 0

    const navData = fundData.data[month]
    if (!navData || !navData.allData) return 0

    // 从 allData 中查找是否有分红数据
    let monthlyDividend = 0
    for (const dayData of navData.allData) {
      // 需要从原始数据中获取 unitMoney，但 dayData 中没有这个字段
      // 所以我们通过比较相邻月份的总分红来计算当月分红
    }

    // 通过比较当前月和上月的累计分红来计算当月分红
    const currentTotalDividend = navData.totalDividend || 0
    const [year, monthNum] = month.split('-').map(Number)
    let prevMonth = monthNum - 1
    let prevYear = year
    if (prevMonth <= 0) {
      prevMonth = 12
      prevYear--
    }
    const prevKey = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`
    const prevNavData = fundData.data[prevKey]
    const prevTotalDividend = prevNavData?.totalDividend || 0

    // 当月分红 = 当前累计分红 - 上月累计分红
    return currentTotalDividend - prevTotalDividend
  }

  /**
   * 计算指定月份的基金收益
   */
  private calculateFundIncomeForMonth(
    month: string,
    fundAssets: Map<string, number>,
    fundShares: Map<string, number> = new Map(), // 持有份额
    fundCosts: Map<string, number> = new Map(), // 累计投入成本（用于计算止盈）
    bondFundAssets: Map<string, number> = new Map() // 债券基金资产（用于存放止盈赎回的资金）
  ): { totalIncome: number; totalDividendIncome: number; updatedAssets: Map<string, number>; updatedFundCosts: Map<string, number>; updatedBondFundAssets: Map<string, number>; fundDetails: import('../types').FundMonthlyData[]; takeProfitRedemptions: Map<string, number>; takeProfitToBondFund: number } {
    let totalIncome = 0
    let totalDividendIncome = 0
    const updatedAssets = new Map(fundAssets)
    const updatedFundCosts = new Map(fundCosts)
    const updatedBondFundAssets = new Map(bondFundAssets)
    const fundDetails: import('../types').FundMonthlyData[] = []
    const takeProfitRedemptions = new Map<string, number>() // 记录止盈赎回金额
    let takeProfitToBondFund = 0 // 记录转入债券基金的金额

    // 先找出第一支债券基金（如果有的话）
    let firstBondFundCode: string | null = null
    for (const config of this.fundConfigs) {
      const fundData = fundDataLoader.getFundDataByCode(config.fundCode)
      const fundName = fundData?.name || ''
      if (fundName.includes('债券')) {
        firstBondFundCode = config.fundCode
        break
      }
    }

    // 先计算债券基金的增长（如果有止盈转入的资金）
    let bondFundIncome = 0
    if (firstBondFundCode && updatedBondFundAssets.has(firstBondFundCode)) {
      const bondFundStartValue = updatedBondFundAssets.get(firstBondFundCode) || 0
      if (bondFundStartValue > 0) {
        const bondFundGrowthRate = this.getFundGrowthRate(firstBondFundCode, month)
        const bondFundEndValue = bondFundStartValue * bondFundGrowthRate
        const bondFundMonthIncome = bondFundEndValue - bondFundStartValue
        bondFundIncome = bondFundMonthIncome
        updatedBondFundAssets.set(firstBondFundCode, bondFundEndValue)
      }
    }

    for (const config of this.fundConfigs) {
      if (month < config.startDate || month > config.endDate) continue

      const fundCode = config.fundCode
      const monthlyInvestment = config.investmentAmount
      const growthRate = this.getFundGrowthRate(fundCode, month)
      const totalDividend = this.getFundTotalDividend(fundCode, month)

      // 获取当月分红金额（不是累计）
      const monthlyDividend = this.getFundMonthlyDividend(fundCode, month)

      // 获取当前净值（用于计算份额）
      const fundData = fundDataLoader.getFundDataByCode(fundCode)
      const currentNav = fundData?.data?.[month]?.endNav || 1

      // 月初基金资产 + 当月定投
      const monthStartAssets = updatedAssets.get(fundCode) || 0
      const monthStartCost = updatedFundCosts.get(fundCode) || 0

      // 更新累计投入成本（加上当月定投）
      const monthEndCost = monthStartCost + monthlyInvestment

      // 计算增长后的资产（未考虑止盈前）
      const monthEndAssetsBeforeTakeProfit = (monthStartAssets + monthlyInvestment) * growthRate

      // 计算当前收益率
      const currentReturnRate = monthEndCost > 0 ? (monthEndAssetsBeforeTakeProfit - monthEndCost) / monthEndCost : 0

      // 检查是否达到止盈条件
      let monthEndAssets = monthEndAssetsBeforeTakeProfit
      let takeProfitAmount = 0
      const takeProfitRate = config.takeProfitRate

      if (takeProfitRate !== undefined && takeProfitRate > 0 && currentReturnRate >= takeProfitRate / 100) {
        // 达到止盈率，全部赎回（整个基金资产）
        takeProfitAmount = monthEndAssetsBeforeTakeProfit
        if (takeProfitAmount > 0) {
          monthEndAssets = 0 // 赎回后资产为0
          updatedFundCosts.set(fundCode, 0) // 成本清零
          takeProfitRedemptions.set(fundCode, takeProfitAmount)

          // 处理赎回的资金：如果有债券基金，转入第一支债券基金；否则按1.5%年化计算收益
          if (firstBondFundCode) {
            // 转入债券基金（累加到已有的债券基金资产上）
            const currentBondFundValue = updatedBondFundAssets.get(firstBondFundCode) || 0
            updatedBondFundAssets.set(firstBondFundCode, currentBondFundValue + takeProfitAmount)
            takeProfitToBondFund += takeProfitAmount
          } else {
            // 没有债券基金，按1.5%年化计算收益（这里只是记录，实际收益计算在存款收益中处理）
          }
        } else {
          updatedFundCosts.set(fundCode, monthEndCost)
        }
      } else {
        updatedFundCosts.set(fundCode, monthEndCost)
      }

      // 当月收益 = 月末资产 - 月初资产（即基金增长额，包含定投的增长）
      const monthIncome = monthEndAssets - monthStartAssets
      totalIncome += monthIncome

      // 计算分红收益 = 当月分红金额 × 持有份额
      // 持有份额 = 月初资产 / 分红前净值（使用月初资产计算，因为分红不改变份额）
      const startNav = fundData?.data?.[month]?.startNav || currentNav
      const shares = monthStartAssets / startNav
      const dividendIncome = monthlyDividend * shares
      totalDividendIncome += dividendIncome



      updatedAssets.set(fundCode, monthEndAssets)

      // 获取基金名称
      const fundName = fundData?.name || fundCode

      // 保存基金详情
      fundDetails.push({
        fundCode,
        fundName,
        startAssets: monthStartAssets,
        endAssets: monthEndAssets,
        growthRate,
        growthAmount: monthIncome,
        investmentAmount: monthlyInvestment,
        dividendIncome
      })
    }

    // 将债券基金收益加入总收入
    totalIncome += bondFundIncome

    return { totalIncome, totalDividendIncome, updatedAssets, updatedFundCosts, updatedBondFundAssets, fundDetails, takeProfitRedemptions, takeProfitToBondFund }
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

    // 累计可支配收入（初始余额 + 每月结余）
    let cumulativeDisposableIncome = this.initialBalance
    // 累计投入（实际投入到基金的金额）
    let cumulativeInvestment = this.initialBalance
    // 基金资产记录（按基金code）
    let fundAssets = new Map<string, number>()
    // 基金累计投入成本记录（按基金code，用于计算止盈）
    let fundCosts = new Map<string, number>()
    // 债券基金资产记录（用于存放止盈赎回的资金）
    let bondFundAssets = new Map<string, number>()
    // 无债券基金时的止盈赎回资金（按1.5%年化计息）
    let takeProfitCashWithoutBondFund = 0
    // 累计止盈赎回金额（不含转入债券基金的部分）
    let cumulativeTakeProfitRedemptions = 0
    // 累计定投金额
    let totalFundInvestment = 0
    // 累计分红收益
    let cumulativeDividendIncome = 0
    // 上月总资产
    let lastMonthTotalAssets = this.initialBalance

    // 先检查是否有债券基金
    let hasBondFund = false
    for (const config of this.fundConfigs) {
      const fundData = fundDataLoader.getFundDataByCode(config.fundCode)
      const fundName = fundData?.name || ''
      if (fundName.includes('债券')) {
        hasBondFund = true
        break
      }
    }

    for (let i = 0; i < months.length; i++) {
      const month = months[i]

      // 当月月收入
      const monthlyIncome = this.getMonthlyIncomeForMonth(month)
      // 当月额外支出
      const monthlyExtExpense = this.getMonthlyExtExpense()
      // 当月可支配收入（月收入 - 月支出 - 额外支出）
      const monthlyDisposableIncome = monthlyIncome - this.monthlyExpenses - monthlyExtExpense

      // 计算当月累计可支配收入
      if (i === 0) {
        cumulativeDisposableIncome = this.initialBalance + monthlyDisposableIncome
      } else {
        cumulativeDisposableIncome += monthlyDisposableIncome
      }

      // 计算当月定投金额
      const monthFundInvestment = this.fundConfigs
        .filter(config => month >= config.startDate && month <= config.endDate)
        .reduce((sum, config) => sum + config.investmentAmount, 0)
      totalFundInvestment += monthFundInvestment

      // 累计投入 = 累计可支配收入（因为定投是从可支配收入中支出的）
      cumulativeInvestment = cumulativeDisposableIncome

      // 月初资产 = 上月总资产
      const startAssets = lastMonthTotalAssets

      // 计算无债券基金时的止盈赎回资金收益（1.5%年化）
      let takeProfitCashIncome = 0
      if (!hasBondFund && takeProfitCashWithoutBondFund > 0) {
        // 月利率 = 1.5% / 12
        const monthlyRate = 0.015 / 12
        takeProfitCashIncome = takeProfitCashWithoutBondFund * monthlyRate
        cumulativeDividendIncome += takeProfitCashIncome
      }

      // 计算基金收益（返回基金增长额和分红收益）
      const { totalIncome: fundGrowthAmount, totalDividendIncome, updatedAssets, updatedFundCosts, updatedBondFundAssets, fundDetails, takeProfitRedemptions, takeProfitToBondFund } = this.calculateFundIncomeForMonth(month, fundAssets, new Map(), fundCosts, bondFundAssets)
      fundAssets = updatedAssets
      fundCosts = updatedFundCosts
      bondFundAssets = updatedBondFundAssets

      // 累加止盈赎回金额（不含转入债券基金的部分）
      let monthTakeProfitRedemption = 0
      for (const amount of takeProfitRedemptions.values()) {
        monthTakeProfitRedemption += amount
      }
      // 减去转入债券基金的部分，因为这部分已经计入债券基金资产
      monthTakeProfitRedemption -= takeProfitToBondFund
      if (!hasBondFund) {
        // 如果没有债券基金，将止盈赎回资金加入计息本金
        takeProfitCashWithoutBondFund += monthTakeProfitRedemption
      }
      cumulativeTakeProfitRedemptions += monthTakeProfitRedemption

      // 累加当月分红收益
      cumulativeDividendIncome += totalDividendIncome

      // 计算存款收益
      const depositIncome = this.calculateDepositIncomeForMonth(month)

      // 计算基金总市值（普通基金）
      let totalFundValue = 0
      for (const value of fundAssets.values()) {
        totalFundValue += value
      }

      // 计算债券基金市值
      let totalBondFundValue = 0
      for (const value of bondFundAssets.values()) {
        totalBondFundValue += value
      }

      // 现金部分 = 累计投入 - 累计定投金额（未被投资到基金的部分）
      const cashValue = cumulativeInvestment - totalFundInvestment

      // 总资产 = 普通基金市值 + 债券基金市值 + 现金 + 存款收益 + 累计分红收益 + 累计止盈赎回金额（不含债券基金部分）
      // 注意：基金总市值已经包含了定投本金和收益，止盈赎回金额类似分红已取出
      const totalAssets = totalFundValue + totalBondFundValue + cashValue + depositIncome + cumulativeDividendIncome + cumulativeTakeProfitRedemptions

      // 月末资产
      const endAssets = totalAssets

      // 计算增长率和增长金额
      const growthAmount = endAssets - startAssets
      const growthRate = startAssets > 0 ? endAssets / startAssets : 1

      monthlyData.push({
        month,
        cumulativeInvestment,
        totalAssets,
        fundIncome: fundGrowthAmount,
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

    // 计算年化收益率（基于期末资产和期初投入的时间加权）
    const monthsCount = monthlyData.length
    const yearsCount = monthsCount / 12
    const annualizedReturn = yearsCount > 0 && totalInvestment > 0
      ? (Math.pow(finalAssets / totalInvestment, 1 / yearsCount) - 1) * 100
      : 0

    // 计算定投IRR（内部收益率）
    const calculateIRR = (): number => {
      if (monthsCount === 0 || totalInvestment === 0) return 0

      // 构建现金流数组
      // 第0期：投入（负）
      // 第1期到第n-2期：投入（负）
      // 第n-1期：投入（负）+ 期末资产（正）
      const cashFlows: number[] = []
      
      for (let i = 0; i < monthsCount; i++) {
        const currInvestment = monthlyData[i].cumulativeInvestment
        const prevInvestment = i > 0 ? monthlyData[i - 1].cumulativeInvestment : 0
        const monthInvestment = currInvestment - prevInvestment
        
        if (i === monthsCount - 1) {
          // 最后一期：期末资产 - 本期投入
          cashFlows.push(finalAssets - monthInvestment)
        } else {
          // 其他期：负的投入
          cashFlows.push(-monthInvestment)
        }
      }

      // 使用二分法求解月IRR（更稳定）
      let low = -0.99
      let high = 10.0
      let mid = 0
      
      const calcNPV = (r: number): number => {
        let npv = 0
        for (let i = 0; i < cashFlows.length; i++) {
          npv += cashFlows[i] / Math.pow(1 + r, i)
        }
        return npv
      }

      // 检查是否有解
      const npvLow = calcNPV(low)
      const npvHigh = calcNPV(high)
      
      if (npvLow * npvHigh > 0) {
        // 无解或多个解，使用简单估算
        // 使用时间加权收益率近似
        return annualizedReturn
      }

      // 二分法求解
      for (let iter = 0; iter < 100; iter++) {
        mid = (low + high) / 2
        const npv = calcNPV(mid)
        
        if (Math.abs(npv) < 1e-6) break
        
        if (npv > 0) {
          low = mid
        } else {
          high = mid
        }
      }

      // 将月IRR转换为年IRR
      const monthlyIRR = mid
      const annualIRR = (Math.pow(1 + monthlyIRR, 12) - 1) * 100
      
      return annualIRR
    }

    const irr = calculateIRR()

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
        percent: totalReturnPercent,
        annualizedReturn,
        irr
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
