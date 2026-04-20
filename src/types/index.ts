// 基金数据类型
export interface FundNavData {
  startNav: number
  startDate: string
  endNav: number
  endDate: string
  growthRate: number
  totalDividend: number // 累计分红金额（从持有开始到当前月份）
  allData: Array<{
    year: number
    month: number
    day: number
    nav: number
    timestamp: number
  }>
}

export interface LoadedFundData {
  code: string
  name: string
  data: Record<string, FundNavData>
}

// 基金配置类型
export interface FundConfig {
  fundCode: string // 基金代码
  investmentAmount: number // 每月投资金额
  startDate: string // 开始日期
  endDate: string // 结束日期
  takeProfitRate?: number // 止盈率（%），当基金收益率达到或超过此值时自动赎回盈利部分
  takeProfitReinvestPeriod?: number // 止盈收益重投入分期（月），止盈赎回的资金分多少个月重新投入
}

// 月收入类型
export interface MonthlyIncome {
  income: number
  startDate: string
  endDate: string
}

// 存款配置类型
export interface DepositAllocation {
  amount: number // 存款金额
  startDate: string // 开始日期
  endDate: string // 结束日期
  annualInterestRate: number // 年利率
}

// 基金月度数据
export interface FundMonthlyData {
  fundCode: string // 基金代码
  fundName: string // 基金名称
  startAssets: number // 开始资产金额
  endAssets: number // 结束资产金额
  growthRate: number // 增长率
  growthAmount: number // 增长金额
  investmentAmount: number // 投资金额
  dividendIncome: number // 分红收益（累计分红金额 × 持有份额）
}

// 月度数据类型
export interface MonthlyData {
  // 月份
  month: string
  // 累计投资金额
  cumulativeInvestment: number
  // 总资产
  totalAssets: number
  // 基金收益
  fundIncome: number
  // 存款收益
  depositIncome: number
  // 资产增长数据
  // 开始资产金额
  startAssets: number
  // 结束资产金额
  endAssets: number
  // 增长率
  growthRate: number
  // 增长金额
  growthAmount: number
  // 基金月度数据详情
  fundDetails: FundMonthlyData[]
}

// 收益返回类型
export interface TotalReturn {
  amount: number
  percent: number
  annualizedReturn: number // 年化收益率
  irr: number // 定投IRR（内部收益率）
}

// 最大回撤类型
export interface MaxDrawdown {
  amount: number
  percent: number
  month: string
}

// 模拟结果类型
export interface SimulationResult {
  // 月度数据
  monthlyData: MonthlyData[]
  // 总资产
  totalReturn: TotalReturn
  // 最大回撤
  maxDrawdown: MaxDrawdown
}

// 可用基金类型（下拉框用）
export interface AvailableFund {
  code: string
  name: string
  type: string
}

// 旧的类型（为了兼容，暂时保留）
export interface IncomeSegment {
  id: number
  monthlyIncome: number
  startDate: string
  endDate: string
}

export interface ExtraExpense {
  id: number
  amount: number
}

export interface Fund {
  id: number
  fundCode: string
  monthlyAmount: number
  startDate: string
  endDate: string
}

export interface Deposit {
  id: number
  amount: number
  date: string
  annualRate: number
  term: number
}

export interface CurrentAccount {
  initialBalance: number
  annualRate: number
}

export interface SimulationParams {
  startDate: string
  endDate: string
  shiftYears: number
}

export interface MaxDrawdown {
  percent: number
  amount: number
  month: string
}

export interface TotalReturn {
  amount: number
  percent: number
}

export interface MonthNavs {
  startNav: number
  endNav: number
}
