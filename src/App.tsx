import './App.css'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { fundDataLoader } from './services/FundDataLoader'
import { simulationEngine } from './services/SimulationEngine'
import { InputSection } from './components/InputSection'
import { OutputSection } from './components/OutputSection'
import type { SimulationResult, FundConfig, MonthlyIncome, DepositAllocation, SimulationParams, IncomeSegment } from './types'

function App() {
  // 基金加载相关状态
  const [fundCodeInput, setFundCodeInput] = useState<string>('')
  const [fundLoading, setFundLoading] = useState<boolean>(false)
  const [fundError, setFundError] = useState<string | null>(null)

  // 模拟结果状态
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [, forceUpdate] = useState({})

  // 模拟参数状态
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    startDate: '2015-01',
    endDate: '2015-03',
    shiftYears: 10
  })

  // 初始化
  useEffect(() => {
    // 初始化 simulationEngine 的默认日期
    simulationEngine.setMockStartDate('2015-01')
    simulationEngine.setMockEndDate('2015-03')
    // 初始化默认月收入
    simulationEngine.setMonthlyIncomes([{ income: 10000, startDate: '2015-01', endDate: '2015-03' }])
    // 初始化默认月支出
    simulationEngine.setMonthlyExpenses(5000)
    // 初始化默认初始余额
    simulationEngine.setInitialBalance(10000)

    // 订阅模拟引擎的结果变化
    const unsubscribeResult = simulationEngine.subscribe('resultChange', (result) => {
      setSimulationResult(result)
    })

    // 订阅基金数据加载器
    const unsubscribeFunds = fundDataLoader.subscribe('allFundsLoaded', () => {
      const funds = fundDataLoader.getAllLoadedFunds()
      // 自动添加基金配置（如果没有的话）
      if (funds.length > 0 && simulationEngine.getFundConfigs().length === 0) {
        const startDate = simulationEngine.getMockStartDate() || '2015-01'
        const endDate = simulationEngine.getMockEndDate() || '2015-03'
        simulationEngine.setFundConfigs([{
          fundCode: funds[0].code,
          investmentAmount: 5000,
          startDate,
          endDate
        }])
        forceUpdate({})
      }
    })

    ;(window as any).fundDataLoader = fundDataLoader
    ;(window as any).simulationEngine = simulationEngine

    // 页面初始化后自动加载 localStorage 中的所有基金
    const timer = setTimeout(() => {
      fundDataLoader.loadAllStoredFundsFromLocalStorage()
    }, 500)

    return () => {
      clearTimeout(timer)
      unsubscribeResult()
      unsubscribeFunds()
    }
  }, [])

  // 加载基金数据
  const loadFundData = useCallback(async () => {
    if (!fundCodeInput) return

    setFundLoading(true)
    setFundError(null)

    try {
      await fundDataLoader.loadFundData(fundCodeInput)
      fundDataLoader.saveToLocalStorage(fundCodeInput)
    } catch (error) {
      setFundError(error instanceof Error ? error.message : '加载失败')
    } finally {
      setFundLoading(false)
    }
  }, [fundCodeInput])

  // 获取模拟数据
  const getSimulationData = useCallback(() => {
    return {
      fundConfigs: simulationEngine.getFundConfigs(),
      monthlyIncomes: simulationEngine.getMonthlyIncomes(),
      monthlyExpenses: simulationEngine.getMonthlyExpenses(),
      yearExtExpenses: simulationEngine.getYearExtExpenses(),
      depositAllocations: simulationEngine.getDepositAllocations(),
      initialBalance: simulationEngine.getInitialBalance(),
      mockStartDate: simulationEngine.getMockStartDate(),
      mockEndDate: simulationEngine.getMockEndDate()
    }
  }, [])

  // 设置器方法
  const setFundConfigs = useCallback((configs: FundConfig[]) => {
    simulationEngine.setFundConfigs(configs)
    forceUpdate({})
  }, [])

  const setMonthlyIncomes = useCallback((incomes: MonthlyIncome[]) => {
    simulationEngine.setMonthlyIncomes(incomes)
    forceUpdate({})
  }, [])

  const setMonthlyExpenses = useCallback((value: number) => {
    simulationEngine.setMonthlyExpenses(value)
    forceUpdate({})
  }, [])

  const setYearExtExpenses = useCallback((expenses: number[]) => {
    simulationEngine.setYearExtExpenses(expenses)
    forceUpdate({})
  }, [])

  const setDepositAllocations = useCallback((allocations: DepositAllocation[]) => {
    simulationEngine.setDepositAllocations(allocations)
    forceUpdate({})
  }, [])

  const setInitialBalance = useCallback((value: number) => {
    simulationEngine.setInitialBalance(value)
    forceUpdate({})
  }, [])

  const setMockDateRange = useCallback((startDate: string, endDate: string) => {
    simulationEngine.setMockStartDate(startDate)
    simulationEngine.setMockEndDate(endDate)
    forceUpdate({})
  }, [])

  // 触发计算
  const triggerCalculation = useCallback(() => {
    simulationEngine.calculate()
  }, [])

  // 将历史结果平移到未来
  const shiftToFuture = useCallback((historyResult: SimulationResult | null, shiftYears: number): SimulationResult | null => {
    if (!historyResult) return null
    
    const shiftedMonthlyData = historyResult.monthlyData.map(item => {
      const [year, month] = item.month.split('-')
      const newYear = parseInt(year) + shiftYears
      return {
        ...item,
        month: `${newYear}-${month}`
      }
    })

    return {
      ...historyResult,
      monthlyData: shiftedMonthlyData
    }
  }, [])

  // 收入分段（用于显示）
  const incomeSegments = useMemo<IncomeSegment[]>(() => {
    const data = getSimulationData()
    if (data.monthlyIncomes.length === 0) return []
    
    return data.monthlyIncomes.map((income, index) => ({
      id: index,
      name: `收入阶段 ${index + 1}`,
      startDate: income.startDate,
      endDate: income.endDate,
      monthlyIncome: income.income
    }))
  }, [])

  const data = getSimulationData()

  // 默认数据
  const defaultData = {
    fundConfigs: [] as FundConfig[],
    monthlyIncomes: [{ income: 10000, startDate: '2015-01', endDate: '2015-03' }] as MonthlyIncome[],
    monthlyExpenses: 5000,
    yearExtExpenses: [] as number[],
    depositAllocations: [] as DepositAllocation[],
    initialBalance: 10000,
    mockStartDate: '2015-01',
    mockEndDate: '2015-03'
  }

  const renderData = {
    fundConfigs: data.fundConfigs.length > 0 ? data.fundConfigs : defaultData.fundConfigs,
    monthlyIncomes: data.monthlyIncomes.length > 0 ? data.monthlyIncomes : defaultData.monthlyIncomes,
    monthlyExpenses: data.monthlyExpenses || defaultData.monthlyExpenses,
    yearExtExpenses: data.yearExtExpenses.length > 0 ? data.yearExtExpenses : defaultData.yearExtExpenses,
    depositAllocations: data.depositAllocations.length > 0 ? data.depositAllocations : defaultData.depositAllocations,
    initialBalance: data.initialBalance || defaultData.initialBalance,
    mockStartDate: data.mockStartDate || defaultData.mockStartDate,
    mockEndDate: data.mockEndDate || defaultData.mockEndDate
  }

  return (
    <div className="app">
      <h1>智能财务规划助手</h1>

      <div className="container">
        <InputSection
          // Fund data
          fundCodeInput={fundCodeInput}
          setFundCodeInput={setFundCodeInput}
          fundLoading={fundLoading}
          fundError={fundError}
          loadFundData={loadFundData}
          // Simulation data
          fundConfigs={renderData.fundConfigs}
          setFundConfigs={setFundConfigs}
          monthlyIncomes={renderData.monthlyIncomes}
          setMonthlyIncomes={setMonthlyIncomes}
          monthlyExpenses={renderData.monthlyExpenses}
          setMonthlyExpenses={setMonthlyExpenses}
          yearExtExpenses={renderData.yearExtExpenses}
          setYearExtExpenses={setYearExtExpenses}
          depositAllocations={renderData.depositAllocations}
          setDepositAllocations={setDepositAllocations}
          initialBalance={renderData.initialBalance}
          setInitialBalance={setInitialBalance}
          mockStartDate={renderData.mockStartDate}
          mockEndDate={renderData.mockEndDate}
          setMockDateRange={setMockDateRange}
          // Calculation
          onCalculate={triggerCalculation}
        />

        <OutputSection
          simulationResult={simulationResult}
          shiftToFuture={shiftToFuture}
          simulationParams={simulationParams}
          incomeSegments={incomeSegments}
        />
      </div>
    </div>
  )
}

export default App
