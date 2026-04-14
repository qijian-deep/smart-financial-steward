import { describe, it, expect, beforeEach, vi } from 'vitest'
import { simulationEngine } from '../src/services/SimulationEngine'
import type { FundConfig, MonthlyIncome, DepositAllocation } from '../src/types'

// Mock FundDataLoader
vi.mock('../src/services/FundDataLoader', () => ({
  fundDataLoader: {
    getFundDataByCode: vi.fn((code: string) => ({
      code,
      name: `基金${code}`,
      data: {
        '2015-01': { startNav: 1.0, endNav: 2, growthRate: 2 },
        '2015-02': { startNav: 2, endNav: 1.5, growthRate: 0.75 },
        '2015-03': { startNav: 1.5, endNav: 4.5, growthRate: 3 },
      }
    })),
    subscribe: vi.fn(),
    getAllLoadedFunds: vi.fn(() => []),
    loadFundData: vi.fn(),
    saveToLocalStorage: vi.fn(),
    loadAllStoredFundsFromLocalStorage: vi.fn()
  }
}))

describe('SimulationEngine.calculate', () => {
  beforeEach(() => {
    // 重置 simulationEngine 的状态
    simulationEngine.setFundConfigs([])
    simulationEngine.setMonthlyIncomes([])
    simulationEngine.setMonthlyExpenses(0)
    simulationEngine.setYearExtExpenses([])
    simulationEngine.setDepositAllocations([])
    simulationEngine.setInitialBalance(0)
    simulationEngine.setMockStartDate('')
    simulationEngine.setMockEndDate('')
  })

  describe('单只基金 + 月收入 + 月支出', () => {
    beforeEach(() => {
      // 设置模拟日期范围
      simulationEngine.setMockStartDate('2015-01')
      simulationEngine.setMockEndDate('2015-03')
      // 设置初始余额
      simulationEngine.setInitialBalance(10000)
      // 设置月支出
      simulationEngine.setMonthlyExpenses(5000)
    })

    it('应该正确计算单只基金的收益', () => {
      // 设置基金配置 - 单只基金
      const fundConfigs: FundConfig[] = [
        { fundCode: '519702', investmentAmount: 5000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setFundConfigs(fundConfigs)

      // 设置月收入
      const monthlyIncomes: MonthlyIncome[] = [
        { income: 10000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setMonthlyIncomes(monthlyIncomes)

      // 执行计算
      const result = simulationEngine.calculate()

      // 验证结果
      expect(result).not.toBeNull()
      expect(result!.monthlyData).toHaveLength(3)

      // 验证第一个月的数据
      const firstMonth = result!.monthlyData[0]
      expect(firstMonth.month).toBe('2015-01')
      // 第一个月累计投入 = 初始余额 + 月收入 - 月支出 = 10000 + 10000 - 5000 = 15000
      expect(firstMonth.cumulativeInvestment).toBe(15000)
      // 验证基金收益被计算
      expect(firstMonth.fundIncome).not.toBe(0)

      // 验证总收益和最大回撤存在
      expect(result!.totalReturn).toBeDefined()
      console.log('result!.maxDrawdown', result!.maxDrawdown);
      
      expect(result!.maxDrawdown.percent).toBe(0.25)

      // 验证基金明细
      expect(firstMonth.fundDetails).toHaveLength(1)
      expect(firstMonth.fundDetails[0].fundCode).toBe('519702')
      expect(firstMonth.fundDetails[0].fundName).toBe('基金519702')
    })

    it('应该正确计算多个月的累计投入', () => {
      const fundConfigs: FundConfig[] = [
        { fundCode: '519702', investmentAmount: 3000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setFundConfigs(fundConfigs)

      const monthlyIncomes: MonthlyIncome[] = [
        { income: 8000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setMonthlyIncomes(monthlyIncomes)

      const result = simulationEngine.calculate()

      // 第一个月：10000 + 8000 - 5000 = 13000
      expect(result!.monthlyData[0].cumulativeInvestment).toBe(13000)
      // 第二个月：13000 + 8000 - 5000 = 16000
      expect(result!.monthlyData[1].cumulativeInvestment).toBe(16000)
      // 第三个月：16000 + 8000 - 5000 = 19000
      expect(result!.monthlyData[2].cumulativeInvestment).toBe(19000)
    })
  })

  describe('两只基金 + 月收入 + 月支出', () => {
    beforeEach(() => {
      simulationEngine.setMockStartDate('2015-01')
      simulationEngine.setMockEndDate('2015-03')
      simulationEngine.setInitialBalance(10000)
      simulationEngine.setMonthlyExpenses(5000)
    })

    it('应该正确计算两只基金的总收益', () => {
      // 设置两只基金
      const fundConfigs: FundConfig[] = [
        { fundCode: '519702', investmentAmount: 3000, startDate: '2015-01', endDate: '2015-03' },
        { fundCode: '000001', investmentAmount: 2000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setFundConfigs(fundConfigs)

      // 设置月收入
      const monthlyIncomes: MonthlyIncome[] = [
        { income: 12000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setMonthlyIncomes(monthlyIncomes)

      // 执行计算
      const result = simulationEngine.calculate()

      // 验证结果
      expect(result).not.toBeNull()
      expect(result!.monthlyData).toHaveLength(3)

      // 验证第一个月的数据
      const firstMonth = result!.monthlyData[0]
      // 第一个月累计投入 = 10000 + 12000 - 5000 = 17000
      expect(firstMonth.cumulativeInvestment).toBe(17000)

      // 验证两只基金的明细
      expect(firstMonth.fundDetails).toHaveLength(2)
      expect(firstMonth.fundDetails[0].fundCode).toBe('519702')
      expect(firstMonth.fundDetails[1].fundCode).toBe('000001')
      expect(firstMonth.fundDetails[0].investmentAmount).toBe(3000)
      expect(firstMonth.fundDetails[1].investmentAmount).toBe(2000)

      // 验证总资产大于累计投入（因为有收益）
      expect(firstMonth.totalAssets).toBeGreaterThan(firstMonth.cumulativeInvestment)
    })

    it('应该正确处理不同时间段的基金配置', () => {
      // 第一只基金从1月开始，第二只基金从2月开始
      const fundConfigs: FundConfig[] = [
        { fundCode: '519702', investmentAmount: 5000, startDate: '2015-01', endDate: '2015-03' },
        { fundCode: '000001', investmentAmount: 3000, startDate: '2015-02', endDate: '2015-03' }
      ]
      simulationEngine.setFundConfigs(fundConfigs)

      const monthlyIncomes: MonthlyIncome[] = [
        { income: 10000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setMonthlyIncomes(monthlyIncomes)

      const result = simulationEngine.calculate()

      // 第一个月只有第一只基金
      expect(result!.monthlyData[0].fundDetails).toHaveLength(1)
      expect(result!.monthlyData[0].fundDetails[0].fundCode).toBe('519702')

      // 第二个月开始有两只基金
      expect(result!.monthlyData[1].fundDetails).toHaveLength(2)
    })
  })

  describe('两只基金 + 存款 + 月收入 + 月支出', () => {
    beforeEach(() => {
      simulationEngine.setMockStartDate('2015-01')
      simulationEngine.setMockEndDate('2015-03')
      simulationEngine.setInitialBalance(10000)
      simulationEngine.setMonthlyExpenses(5000)
    })

    it('应该正确计算基金和存款的总收益', () => {
      // 设置两只基金
      const fundConfigs: FundConfig[] = [
        { fundCode: '519702', investmentAmount: 3000, startDate: '2015-01', endDate: '2015-03' },
        { fundCode: '000001', investmentAmount: 2000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setFundConfigs(fundConfigs)

      // 设置存款配置 - 年利率 3%
      const depositAllocations: DepositAllocation[] = [
        { amount: 50000, startDate: '2015-01', endDate: '2015-03', annualInterestRate: 3 }
      ]
      simulationEngine.setDepositAllocations(depositAllocations)

      // 设置月收入
      const monthlyIncomes: MonthlyIncome[] = [
        { income: 12000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setMonthlyIncomes(monthlyIncomes)

      // 执行计算
      const result = simulationEngine.calculate()

      // 验证结果
      expect(result).not.toBeNull()

      // 验证存款收益被计算
      const firstMonth = result!.monthlyData[0]
      // 月利率 = 3% / 12 = 0.25%，存款收益 = 50000 * 0.25% = 125
      expect(firstMonth.depositIncome).toBeCloseTo(125, 0)

      // 总资产 = 累计投入 + 基金收益 + 存款收益
      expect(firstMonth.totalAssets).toBe(
        firstMonth.cumulativeInvestment + firstMonth.fundIncome + firstMonth.depositIncome
      )
    })

    it('应该正确处理多个存款配置', () => {
      const fundConfigs: FundConfig[] = [
        { fundCode: '519702', investmentAmount: 2000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setFundConfigs(fundConfigs)

      // 设置两个存款
      const depositAllocations: DepositAllocation[] = [
        { amount: 30000, startDate: '2015-01', endDate: '2015-03', annualInterestRate: 3 },
        { amount: 20000, startDate: '2015-01', endDate: '2015-03', annualInterestRate: 2 }
      ]
      simulationEngine.setDepositAllocations(depositAllocations)

      const monthlyIncomes: MonthlyIncome[] = [
        { income: 10000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setMonthlyIncomes(monthlyIncomes)

      const result = simulationEngine.calculate()

      // 验证存款收益是两个存款收益之和
      const firstMonth = result!.monthlyData[0]
      // 第一个存款月收益 = 30000 * 0.25% = 75
      // 第二个存款月收益 = 20000 * 0.1667% = 33.33
      // 总存款收益 ≈ 108.33
      expect(firstMonth.depositIncome).toBeCloseTo(108.33, 0)
    })

    it('应该正确处理不同时间段的存款配置', () => {
      const fundConfigs: FundConfig[] = [
        { fundCode: '519702', investmentAmount: 2000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setFundConfigs(fundConfigs)

      // 存款从2月开始
      const depositAllocations: DepositAllocation[] = [
        { amount: 50000, startDate: '2015-02', endDate: '2015-03', annualInterestRate: 3 }
      ]
      simulationEngine.setDepositAllocations(depositAllocations)

      const monthlyIncomes: MonthlyIncome[] = [
        { income: 10000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setMonthlyIncomes(monthlyIncomes)

      const result = simulationEngine.calculate()

      // 第一个月没有存款收益
      expect(result!.monthlyData[0].depositIncome).toBe(0)

      // 第二个月开始有存款收益
      expect(result!.monthlyData[1].depositIncome).toBeGreaterThan(0)
    })
  })

  describe('边界情况', () => {
    it('当没有设置日期时应该返回 null', () => {
      simulationEngine.setMockStartDate('')
      simulationEngine.setMockEndDate('')

      const result = simulationEngine.calculate()
      expect(result).toBeNull()
    })

    it('当没有基金配置时应该只计算现金部分', () => {
      simulationEngine.setMockStartDate('2015-01')
      simulationEngine.setMockEndDate('2015-03')
      simulationEngine.setInitialBalance(10000)
      simulationEngine.setMonthlyExpenses(5000)
      simulationEngine.setFundConfigs([])

      const monthlyIncomes: MonthlyIncome[] = [
        { income: 10000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setMonthlyIncomes(monthlyIncomes)

      const result = simulationEngine.calculate()

      expect(result).not.toBeNull()
      expect(result!.monthlyData[0].fundIncome).toBe(0)
      expect(result!.monthlyData[0].fundDetails).toHaveLength(0)
    })

    it('应该正确计算总收益和最大回撤', () => {
      simulationEngine.setMockStartDate('2015-01')
      simulationEngine.setMockEndDate('2015-03')
      simulationEngine.setInitialBalance(10000)
      simulationEngine.setMonthlyExpenses(5000)

      const fundConfigs: FundConfig[] = [
        { fundCode: '519702', investmentAmount: 5000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setFundConfigs(fundConfigs)

      const monthlyIncomes: MonthlyIncome[] = [
        { income: 10000, startDate: '2015-01', endDate: '2015-03' }
      ]
      simulationEngine.setMonthlyIncomes(monthlyIncomes)

      const result = simulationEngine.calculate()

      // 验证总收益
      expect(result!.totalReturn.amount).toBeDefined()
      expect(result!.totalReturn.percent).toBeDefined()

      // 验证最大回撤
      expect(result!.maxDrawdown.amount).toBeDefined()
      expect(result!.maxDrawdown.percent).toBeDefined()
      expect(result!.maxDrawdown.month).toBeDefined()

      // 最大回撤百分比应该在 0-100 之间
      expect(result!.maxDrawdown.percent).toBeGreaterThanOrEqual(0)
      expect(result!.maxDrawdown.percent).toBeLessThanOrEqual(100)
    })
  })
})
