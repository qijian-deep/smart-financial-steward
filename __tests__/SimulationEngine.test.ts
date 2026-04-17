import { describe, it, expect, beforeEach, vi } from 'vitest'
import { simulationEngine } from '../src/services/SimulationEngine'
import type { FundConfig, MonthlyIncome, DepositAllocation } from '../src/types'
import { mockData } from './mockData'

// 将 mockData 转换为按月份索引的数据格式
// mockData 包含从 2021-03 到 2022-02 的数据
const mockFundData: Record<string, { startNav: number; endNav: number; growthRate: number; startDate: string; endDate: string }> = {}
const months = ['2021-03', '2021-04', '2021-05', '2021-06', '2021-07', '2021-08', '2021-09', '2021-10', '2021-11', '2021-12', '2022-01', '2022-02', '2022-03']
mockData.forEach((item, index) => {
  if (months[index]) {
    mockFundData[months[index]] = {
      startNav: item.startNav,
      endNav: item.endNav,
      growthRate: item.growthRate,
      startDate: item.startDate,
      endDate: item.endDate
    }
  }
})

// Mock FundDataLoader
vi.mock('../src/services/FundDataLoader', () => ({
  fundDataLoader: {
    getFundDataByCode: vi.fn((code: string) => ({
      code,
      name: `基金${code}`,
      data: mockFundData
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
      // 设置模拟日期范围 - 使用mockData中的前3个月
      simulationEngine.setMockStartDate('2021-03')
      simulationEngine.setMockEndDate('2021-05')
      // 设置初始余额
      simulationEngine.setInitialBalance(10000)
      // 设置月支出
      simulationEngine.setMonthlyExpenses(5000)
    })

    it('应该正确计算单只基金的收益', () => {
      // 设置基金配置 - 单只基金
      const fundConfigs: FundConfig[] = [
        { fundCode: '519702', investmentAmount: 5000, startDate: '2021-03', endDate: '2021-05' }
      ]
      simulationEngine.setFundConfigs(fundConfigs)

      // 设置月收入
      const monthlyIncomes: MonthlyIncome[] = [
        { income: 10000, startDate: '2021-03', endDate: '2021-05' }
      ]
      simulationEngine.setMonthlyIncomes(monthlyIncomes)

      // 执行计算
      const result = simulationEngine.calculate()

      // 验证结果
      expect(result).not.toBeNull()
      expect(result!.monthlyData).toHaveLength(3)

      // 获取mockData中的实际增长率
      const marchGrowthRate = mockFundData['2021-03'].growthRate
      const aprilGrowthRate = mockFundData['2021-04'].growthRate
      const mayGrowthRate = mockFundData['2021-05'].growthRate

      // 验证第一个月的数据 (2021-03)
      const firstMonth = result!.monthlyData[0]
      expect(firstMonth.month).toBe('2021-03')
      // 第一个月累计投入 = 初始余额 + 月收入 - 月支出 = 10000 + 10000 - 5000 = 15000
      expect(firstMonth.cumulativeInvestment).toBe(15000)
      // 验证总资产 = 累计投入 + 基金市值 - 累计定投
      // 第一个月：基金市值 = 5000 * growthRate, 累计定投 = 5000
      // totalAssets = 15000 + 5000 * marchGrowthRate - 5000 = 10000 + 5000 * marchGrowthRate
      const expectedFirstMonthFundValue = 5000 * marchGrowthRate
      const expectedFirstMonthAssets = 15000 + expectedFirstMonthFundValue - 5000
      expect(firstMonth.totalAssets).toBeCloseTo(expectedFirstMonthAssets, 0)

      // 验证第二个月的数据 (2021-04)
      const secondMonth = result!.monthlyData[1]
      expect(secondMonth.month).toBe('2021-04')
      // 第二个月累计投入 = 第一个月累计投入 + 月收入 - 月支出 = 15000 + 10000 - 5000 = 20000
      expect(secondMonth.cumulativeInvestment).toBe(20000)
      // 第二个月基金市值 = (上个月基金市值 + 本月定投) * growthRate
      const expectedSecondMonthFundValue = (expectedFirstMonthFundValue + 5000) * aprilGrowthRate
      // 总资产 = 累计投入 + 基金市值 - 累计定投(10000)
      const expectedSecondMonthAssets = 20000 + expectedSecondMonthFundValue - 10000
      expect(secondMonth.totalAssets).toBeCloseTo(expectedSecondMonthAssets, 0)

      // 验证第三个月的数据 (2021-05)
      const thirdMonth = result!.monthlyData[2]
      expect(thirdMonth.month).toBe('2021-05')
      // 第三个月累计投入 = 第二个月累计投入 + 月收入 - 月支出 = 20000 + 10000 - 5000 = 25000
      expect(thirdMonth.cumulativeInvestment).toBe(25000)
      // 验证基金收益被计算
      const expectedThirdMonthFundValue = (expectedSecondMonthFundValue + 5000) * mayGrowthRate
      const expectedThirdMonthAssets = 25000 + expectedThirdMonthFundValue - 15000
      expect(thirdMonth.totalAssets).toBeCloseTo(expectedThirdMonthAssets, 0)

      // // 验证总收益和最大回撤存在
      // expect(result!.totalReturn).toBeDefined()
      // console.log('result!.maxDrawdown', result!.maxDrawdown);

      // expect(result!.maxDrawdown.percent).toBe(0.25)

      // // 验证基金明细
      // expect(firstMonth.fundDetails).toHaveLength(1)
      // expect(firstMonth.fundDetails[0].fundCode).toBe('519702')
      // expect(firstMonth.fundDetails[0].fundName).toBe('基金519702')
    })

    // it('应该正确计算多个月的累计投入', () => {
    //   const fundConfigs: FundConfig[] = [
    //     { fundCode: '519702', investmentAmount: 3000, startDate: '2015-01', endDate: '2015-03' }
    //   ]
    //   simulationEngine.setFundConfigs(fundConfigs)

    //   const monthlyIncomes: MonthlyIncome[] = [
    //     { income: 8000, startDate: '2015-01', endDate: '2015-03' }
    //   ]
    //   simulationEngine.setMonthlyIncomes(monthlyIncomes)

    //   const result = simulationEngine.calculate()

    //   // 第一个月：10000 + 8000 - 5000 = 13000
    //   expect(result!.monthlyData[0].cumulativeInvestment).toBe(13000)
    //   // 第二个月：13000 + 8000 - 5000 = 16000
    //   expect(result!.monthlyData[1].cumulativeInvestment).toBe(16000)
    //   // 第三个月：16000 + 8000 - 5000 = 19000
    //   expect(result!.monthlyData[2].cumulativeInvestment).toBe(19000)
    // })
  })

  describe('基于真实mock数据的测试', () => {
    beforeEach(() => {
      // 设置模拟日期范围为 2021-03 到 2021-05（使用mockData中的前3个月数据）
      simulationEngine.setMockStartDate('2021-03')
      simulationEngine.setMockEndDate('2021-05')
      // 设置初始余额
      simulationEngine.setInitialBalance(10000)
      // 设置月支出
      simulationEngine.setMonthlyExpenses(5000)
    })

    it('应该正确计算基于真实基金数据的收益', () => {
      // 设置基金配置 - 使用真实mock数据
      const fundConfigs: FundConfig[] = [
        { fundCode: '519702', investmentAmount: 5000, startDate: '2021-03', endDate: '2021-05' }
      ]
      simulationEngine.setFundConfigs(fundConfigs)

      // 设置月收入
      const monthlyIncomes: MonthlyIncome[] = [
        { income: 10000, startDate: '2021-03', endDate: '2021-05' }
      ]
      simulationEngine.setMonthlyIncomes(monthlyIncomes)

      // 执行计算
      const result = simulationEngine.calculate()

      // 验证结果
      expect(result).not.toBeNull()
      expect(result!.monthlyData).toHaveLength(3)

      // 获取mockData中的实际增长率
      const marchGrowthRate = mockFundData['2021-03'].growthRate // 约 1.0055
      const aprilGrowthRate = mockFundData['2021-04'].growthRate // 约 1.0055
      const mayGrowthRate = mockFundData['2021-05'].growthRate // 约 1.0055

      // 验证第一个月的数据 (2021-03)
      const firstMonth = result!.monthlyData[0]
      expect(firstMonth.month).toBe('2021-03')
      // 第一个月累计投入 = 初始余额 + 月收入 - 月支出 = 10000 + 10000 - 5000 = 15000
      expect(firstMonth.cumulativeInvestment).toBe(15000)
      // 验证总资产 = 累计投入 + 基金市值 - 累计定投
      // 第一个月：基金市值 = 5000 * growthRate, 累计定投 = 5000
      // totalAssets = 15000 + 5000 * marchGrowthRate - 5000 = 10000 + 5000 * marchGrowthRate
      const expectedFirstMonthFundValue = 5000 * marchGrowthRate
      const expectedFirstMonthAssets = 15000 + expectedFirstMonthFundValue - 5000
      expect(firstMonth.totalAssets).toBeCloseTo(expectedFirstMonthAssets, 0)

      // 验证第二个月的数据 (2021-04)
      const secondMonth = result!.monthlyData[1]
      expect(secondMonth.month).toBe('2021-04')
      // 第二个月累计投入 = 第一个月累计投入 + 月收入 - 月支出 = 15000 + 10000 - 5000 = 20000
      expect(secondMonth.cumulativeInvestment).toBe(20000)
      // 第二个月基金市值 = (上个月基金市值 + 本月定投) * growthRate
      const expectedSecondMonthFundValue = (expectedFirstMonthFundValue + 5000) * aprilGrowthRate
      // 总资产 = 累计投入 + 基金市值 - 累计定投(10000)
      const expectedSecondMonthAssets = 20000 + expectedSecondMonthFundValue - 10000
      expect(secondMonth.totalAssets).toBeCloseTo(expectedSecondMonthAssets, 0)

      // 验证第三个月的数据 (2021-05)
      const thirdMonth = result!.monthlyData[2]
      expect(thirdMonth.month).toBe('2021-05')
      // 第三个月累计投入 = 第二个月累计投入 + 月收入 - 月支出 = 20000 + 10000 - 5000 = 25000
      expect(thirdMonth.cumulativeInvestment).toBe(25000)
      // 验证基金收益被计算
      const expectedThirdMonthFundValue = (expectedSecondMonthFundValue + 5000) * mayGrowthRate
      const expectedThirdMonthAssets = 25000 + expectedThirdMonthFundValue - 15000
      expect(thirdMonth.totalAssets).toBeCloseTo(expectedThirdMonthAssets, 0)
    })

    it('应该正确处理多个月的真实基金数据', () => {
      // 设置更长的日期范围 2021-03 到 2021-08（6个月）
      simulationEngine.setMockStartDate('2021-03')
      simulationEngine.setMockEndDate('2021-08')

      const fundConfigs: FundConfig[] = [
        { fundCode: '519702', investmentAmount: 3000, startDate: '2021-03', endDate: '2021-08' }
      ]
      simulationEngine.setFundConfigs(fundConfigs)

      const monthlyIncomes: MonthlyIncome[] = [
        { income: 8000, startDate: '2021-03', endDate: '2021-08' }
      ]
      simulationEngine.setMonthlyIncomes(monthlyIncomes)

      const result = simulationEngine.calculate()

      expect(result).not.toBeNull()
      expect(result!.monthlyData).toHaveLength(6)

      // 验证每个月的数据都存在
      const expectedMonths = ['2021-03', '2021-04', '2021-05', '2021-06', '2021-07', '2021-08']
      expectedMonths.forEach((month, index) => {
        expect(result!.monthlyData[index].month).toBe(month)
      })

      // 验证累计投入逐月增加
      for (let i = 1; i < result!.monthlyData.length; i++) {
        expect(result!.monthlyData[i].cumulativeInvestment).toBeGreaterThan(
          result!.monthlyData[i - 1].cumulativeInvestment
        )
      }

      // 验证总收益被正确计算
      expect(result!.totalReturn.amount).toBeDefined()
      expect(result!.totalReturn.percent).toBeDefined()
    })
  })

  // describe('两只基金 + 月收入 + 月支出', () => {
  //   beforeEach(() => {
  //     simulationEngine.setMockStartDate('2015-01')
  //     simulationEngine.setMockEndDate('2015-03')
  //     simulationEngine.setInitialBalance(10000)
  //     simulationEngine.setMonthlyExpenses(5000)
  //   })

  //   it('应该正确计算两只基金的总收益', () => {
  //     // 设置两只基金
  //     const fundConfigs: FundConfig[] = [
  //       { fundCode: '519702', investmentAmount: 3000, startDate: '2015-01', endDate: '2015-03' },
  //       { fundCode: '000001', investmentAmount: 2000, startDate: '2015-01', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setFundConfigs(fundConfigs)

  //     // 设置月收入
  //     const monthlyIncomes: MonthlyIncome[] = [
  //       { income: 12000, startDate: '2015-01', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setMonthlyIncomes(monthlyIncomes)

  //     // 执行计算
  //     const result = simulationEngine.calculate()

  //     // 验证结果
  //     expect(result).not.toBeNull()
  //     expect(result!.monthlyData).toHaveLength(3)

  //     // 验证第一个月的数据
  //     const firstMonth = result!.monthlyData[0]
  //     // 第一个月累计投入 = 10000 + 12000 - 5000 = 17000
  //     expect(firstMonth.cumulativeInvestment).toBe(17000)

  //     // 验证两只基金的明细
  //     expect(firstMonth.fundDetails).toHaveLength(2)
  //     expect(firstMonth.fundDetails[0].fundCode).toBe('519702')
  //     expect(firstMonth.fundDetails[1].fundCode).toBe('000001')
  //     expect(firstMonth.fundDetails[0].investmentAmount).toBe(3000)
  //     expect(firstMonth.fundDetails[1].investmentAmount).toBe(2000)

  //     // 验证总资产大于累计投入（因为有收益）
  //     expect(firstMonth.totalAssets).toBeGreaterThan(firstMonth.cumulativeInvestment)
  //   })

  //   it('应该正确处理不同时间段的基金配置', () => {
  //     // 第一只基金从1月开始，第二只基金从2月开始
  //     const fundConfigs: FundConfig[] = [
  //       { fundCode: '519702', investmentAmount: 5000, startDate: '2015-01', endDate: '2015-03' },
  //       { fundCode: '000001', investmentAmount: 3000, startDate: '2015-02', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setFundConfigs(fundConfigs)

  //     const monthlyIncomes: MonthlyIncome[] = [
  //       { income: 10000, startDate: '2015-01', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setMonthlyIncomes(monthlyIncomes)

  //     const result = simulationEngine.calculate()

  //     // 第一个月只有第一只基金
  //     expect(result!.monthlyData[0].fundDetails).toHaveLength(1)
  //     expect(result!.monthlyData[0].fundDetails[0].fundCode).toBe('519702')

  //     // 第二个月开始有两只基金
  //     expect(result!.monthlyData[1].fundDetails).toHaveLength(2)
  //   })
  // })

  // describe('两只基金 + 存款 + 月收入 + 月支出', () => {
  //   beforeEach(() => {
  //     simulationEngine.setMockStartDate('2015-01')
  //     simulationEngine.setMockEndDate('2015-03')
  //     simulationEngine.setInitialBalance(10000)
  //     simulationEngine.setMonthlyExpenses(5000)
  //   })

  //   it('应该正确计算基金和存款的总收益', () => {
  //     // 设置两只基金
  //     const fundConfigs: FundConfig[] = [
  //       { fundCode: '519702', investmentAmount: 3000, startDate: '2015-01', endDate: '2015-03' },
  //       { fundCode: '000001', investmentAmount: 2000, startDate: '2015-01', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setFundConfigs(fundConfigs)

  //     // 设置存款配置 - 年利率 3%
  //     const depositAllocations: DepositAllocation[] = [
  //       { amount: 50000, startDate: '2015-01', endDate: '2015-03', annualInterestRate: 3 }
  //     ]
  //     simulationEngine.setDepositAllocations(depositAllocations)

  //     // 设置月收入
  //     const monthlyIncomes: MonthlyIncome[] = [
  //       { income: 12000, startDate: '2015-01', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setMonthlyIncomes(monthlyIncomes)

  //     // 执行计算
  //     const result = simulationEngine.calculate()

  //     // 验证结果
  //     expect(result).not.toBeNull()

  //     // 验证存款收益被计算
  //     const firstMonth = result!.monthlyData[0]
  //     // 月利率 = 3% / 12 = 0.25%，存款收益 = 50000 * 0.25% = 125
  //     expect(firstMonth.depositIncome).toBeCloseTo(125, 0)

  //     // 总资产 = 累计投入 + 基金收益 + 存款收益
  //     expect(firstMonth.totalAssets).toBe(
  //       firstMonth.cumulativeInvestment + firstMonth.fundIncome + firstMonth.depositIncome
  //     )
  //   })

  //   it('应该正确处理多个存款配置', () => {
  //     const fundConfigs: FundConfig[] = [
  //       { fundCode: '519702', investmentAmount: 2000, startDate: '2015-01', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setFundConfigs(fundConfigs)

  //     // 设置两个存款
  //     const depositAllocations: DepositAllocation[] = [
  //       { amount: 30000, startDate: '2015-01', endDate: '2015-03', annualInterestRate: 3 },
  //       { amount: 20000, startDate: '2015-01', endDate: '2015-03', annualInterestRate: 2 }
  //     ]
  //     simulationEngine.setDepositAllocations(depositAllocations)

  //     const monthlyIncomes: MonthlyIncome[] = [
  //       { income: 10000, startDate: '2015-01', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setMonthlyIncomes(monthlyIncomes)

  //     const result = simulationEngine.calculate()

  //     // 验证存款收益是两个存款收益之和
  //     const firstMonth = result!.monthlyData[0]
  //     // 第一个存款月收益 = 30000 * 0.25% = 75
  //     // 第二个存款月收益 = 20000 * 0.1667% = 33.33
  //     // 总存款收益 ≈ 108.33
  //     expect(firstMonth.depositIncome).toBeCloseTo(108.33, 0)
  //   })

  //   it('应该正确处理不同时间段的存款配置', () => {
  //     const fundConfigs: FundConfig[] = [
  //       { fundCode: '519702', investmentAmount: 2000, startDate: '2015-01', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setFundConfigs(fundConfigs)

  //     // 存款从2月开始
  //     const depositAllocations: DepositAllocation[] = [
  //       { amount: 50000, startDate: '2015-02', endDate: '2015-03', annualInterestRate: 3 }
  //     ]
  //     simulationEngine.setDepositAllocations(depositAllocations)

  //     const monthlyIncomes: MonthlyIncome[] = [
  //       { income: 10000, startDate: '2015-01', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setMonthlyIncomes(monthlyIncomes)

  //     const result = simulationEngine.calculate()

  //     // 第一个月没有存款收益
  //     expect(result!.monthlyData[0].depositIncome).toBe(0)

  //     // 第二个月开始有存款收益
  //     expect(result!.monthlyData[1].depositIncome).toBeGreaterThan(0)
  //   })
  // })

  // describe('边界情况', () => {
  //   it('当没有设置日期时应该返回 null', () => {
  //     simulationEngine.setMockStartDate('')
  //     simulationEngine.setMockEndDate('')

  //     const result = simulationEngine.calculate()
  //     expect(result).toBeNull()
  //   })

  //   it('当没有基金配置时应该只计算现金部分', () => {
  //     simulationEngine.setMockStartDate('2015-01')
  //     simulationEngine.setMockEndDate('2015-03')
  //     simulationEngine.setInitialBalance(10000)
  //     simulationEngine.setMonthlyExpenses(5000)
  //     simulationEngine.setFundConfigs([])

  //     const monthlyIncomes: MonthlyIncome[] = [
  //       { income: 10000, startDate: '2015-01', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setMonthlyIncomes(monthlyIncomes)

  //     const result = simulationEngine.calculate()

  //     expect(result).not.toBeNull()
  //     expect(result!.monthlyData[0].fundIncome).toBe(0)
  //     expect(result!.monthlyData[0].fundDetails).toHaveLength(0)
  //   })

  //   it('应该正确计算总收益和最大回撤', () => {
  //     simulationEngine.setMockStartDate('2015-01')
  //     simulationEngine.setMockEndDate('2015-03')
  //     simulationEngine.setInitialBalance(10000)
  //     simulationEngine.setMonthlyExpenses(5000)

  //     const fundConfigs: FundConfig[] = [
  //       { fundCode: '519702', investmentAmount: 5000, startDate: '2015-01', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setFundConfigs(fundConfigs)

  //     const monthlyIncomes: MonthlyIncome[] = [
  //       { income: 10000, startDate: '2015-01', endDate: '2015-03' }
  //     ]
  //     simulationEngine.setMonthlyIncomes(monthlyIncomes)

  //     const result = simulationEngine.calculate()

  //     // 验证总收益
  //     expect(result!.totalReturn.amount).toBeDefined()
  //     expect(result!.totalReturn.percent).toBeDefined()

  //     // 验证最大回撤
  //     expect(result!.maxDrawdown.amount).toBeDefined()
  //     expect(result!.maxDrawdown.percent).toBeDefined()
  //     expect(result!.maxDrawdown.month).toBeDefined()

  //     // 最大回撤百分比应该在 0-100 之间
  //     expect(result!.maxDrawdown.percent).toBeGreaterThanOrEqual(0)
  //     expect(result!.maxDrawdown.percent).toBeLessThanOrEqual(100)
  //   })
  // })
})
