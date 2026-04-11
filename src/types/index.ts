// 基金数据类型
export interface FundNavData {
  startNav: number
  startDate: string
  endNav: number
  endDate: string
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

// 收入段类型
export interface IncomeSegment {
  id: number
  monthlyIncome: number
  startDate: string
  endDate: string
}

// 额外支出类型
export interface ExtraExpense {
  id: number
  amount: number
}

// 基金配置类型
export interface Fund {
  id: number
  fundCode: string
  monthlyAmount: number
  startDate: string
  endDate: string
}

// 存款类型
export interface Deposit {
  id: number
  amount: number
  date: string
  annualRate: number
  term: number
}

// 活期账户类型
export interface CurrentAccount {
  initialBalance: number
  annualRate: number
}

// 模拟参数类型
export interface SimulationParams {
  startDate: string
  endDate: string
  shiftYears: number
}

// 月度数据类型
export interface MonthlyData {
  month: string
  totalAssets: number
  totalInvestment: number
  fundAssets: number
  currentBalance: number
  monthlyReturn: number
  monthStartTotalAssets: number
  income: number
  startNav: number
  endNav: number
  navGrowth: number
}

// 最大回撤类型
export interface MaxDrawdown {
  percent: number
  amount: number
  month: string
}

// 总收益类型
export interface TotalReturn {
  amount: number
  percent: number
}

// 模拟结果类型
export interface SimulationResult {
  monthlyData: MonthlyData[]
  totalReturn: TotalReturn
  maxDrawdown: MaxDrawdown
}

// 可用基金类型
export interface AvailableFund {
  code: string
  name: string
  type: string
}

// 月份净值类型
export interface MonthNavs {
  startNav: number
  endNav: number
}
