// 基金数据类型
export interface FundNavData {
  startNav: number
  startDate: string
  endNav: number
  endDate: string
  growthRate: number
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
  fundCode: string
  investmentAmount: number
  startDate: string
  endDate: string
}

// 月收入类型
export interface MonthlyIncome {
  income: number
  startDate: string
  endDate: string
}

// 存款配置类型
export interface DepositAllocation {
  amount: number
  startDate: string
  endDate: string
  annualInterestRate: number
}

// 基金月度数据
export interface FundMonthlyData {
  fundCode: string
  fundName: string
  startAssets: number
  endAssets: number
  growthRate: number
  growthAmount: number
  investmentAmount: number
}

// 月度数据类型
export interface MonthlyData {
  month: string
  cumulativeInvestment: number
  totalAssets: number
  fundIncome: number
  depositIncome: number
  // 资产增长数据
  startAssets: number
  endAssets: number
  growthRate: number
  growthAmount: number
  fundDetails: FundMonthlyData[]
  // 兼容旧代码的字段
  totalInvestment?: number
  currentBalance?: number
  startNav?: number
  endNav?: number
  navGrowth?: number
}

// 收益返回类型
export interface TotalReturn {
  amount: number
  percent: number
}

// 最大回撤类型
export interface MaxDrawdown {
  amount: number
  percent: number
  month: string
}

// 模拟结果类型
export interface SimulationResult {
  monthlyData: MonthlyData[]
  totalReturn: TotalReturn
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
