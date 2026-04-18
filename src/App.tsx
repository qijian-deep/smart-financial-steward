import './App.css'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { fundDataLoader } from './services/FundDataLoader'
import { simulationEngine } from './services/SimulationEngine'
import { InputSection } from './components/InputSection'
import { OutputSection } from './components/OutputSection'
import type { SimulationResult, FundConfig, MonthlyIncome, DepositAllocation, SimulationParams, IncomeSegment } from './types'

// localStorage key
const STORAGE_KEY = 'smartFinancialSteward_inputData'

// 从 localStorage 加载数据（独立函数，不依赖 React）
function loadInputDataFromStorage(): {
  fundConfigs: FundConfig[] | null
  monthlyIncomes: MonthlyIncome[] | null
  monthlyExpenses: number | null
  yearExtExpenses: number[] | null
  depositAllocations: DepositAllocation[] | null
  initialBalance: number | null
  mockStartDate: string | null
  mockEndDate: string | null
} {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      const parsed = JSON.parse(savedData)
      return {
        fundConfigs: parsed.fundConfigs || null,
        monthlyIncomes: parsed.monthlyIncomes || null,
        monthlyExpenses: parsed.monthlyExpenses !== undefined ? parsed.monthlyExpenses : null,
        yearExtExpenses: parsed.yearExtExpenses || null,
        depositAllocations: parsed.depositAllocations || null,
        initialBalance: parsed.initialBalance !== undefined ? parsed.initialBalance : null,
        mockStartDate: parsed.mockStartDate || null,
        mockEndDate: parsed.mockEndDate || null
      }
    }
  } catch (error) {
    console.error('Failed to load data from localStorage:', error)
  }
  return {
    fundConfigs: null,
    monthlyIncomes: null,
    monthlyExpenses: null,
    yearExtExpenses: null,
    depositAllocations: null,
    initialBalance: null,
    mockStartDate: null,
    mockEndDate: null
  }
}

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
    startDate: '2016-03',
    endDate: '2026-03',
    shiftYears: 10
  })

  // 标记是否已经加载过 localStorage 数据
  const hasLoadedFromStorage = useRef(false)

  // 初始化
  useEffect(() => {
    // 只加载一次 localStorage 数据
    if (!hasLoadedFromStorage.current) {
      const savedData = loadInputDataFromStorage()
      
      // 应用加载的数据
      if (savedData.fundConfigs) simulationEngine.setFundConfigs(savedData.fundConfigs)
      if (savedData.monthlyIncomes) simulationEngine.setMonthlyIncomes(savedData.monthlyIncomes)
      if (savedData.monthlyExpenses !== null) simulationEngine.setMonthlyExpenses(savedData.monthlyExpenses)
      if (savedData.yearExtExpenses) simulationEngine.setYearExtExpenses(savedData.yearExtExpenses)
      if (savedData.depositAllocations) simulationEngine.setDepositAllocations(savedData.depositAllocations)
      if (savedData.initialBalance !== null) simulationEngine.setInitialBalance(savedData.initialBalance)
      if (savedData.mockStartDate) simulationEngine.setMockStartDate(savedData.mockStartDate)
      if (savedData.mockEndDate) simulationEngine.setMockEndDate(savedData.mockEndDate)
      
      // 如果没有保存的数据，则使用默认值
      const hasAnySavedData = Object.values(savedData).some(v => v !== null)
      if (!hasAnySavedData) {
        // 初始化 simulationEngine 的默认日期
        simulationEngine.setMockStartDate('2016-03')
        simulationEngine.setMockEndDate('2026-03')
        // 初始化默认月收入
        simulationEngine.setMonthlyIncomes([{ income: 10000, startDate: '2016-03', endDate: '2026-03' }])
        // 初始化默认月支出
        simulationEngine.setMonthlyExpenses(5000)
        // 初始化默认初始余额
        simulationEngine.setInitialBalance(10000)
      }
      
      hasLoadedFromStorage.current = true
      forceUpdate({})
    }

    // 订阅模拟引擎的结果变化
    const unsubscribeResult = simulationEngine.subscribe('resultChange', (result) => {
      setSimulationResult(result)
    })

    // 订阅基金数据加载器
    const unsubscribeFunds = fundDataLoader.subscribe('allFundsLoaded', () => {
      const funds = fundDataLoader.getAllLoadedFunds()
      // 自动添加基金配置（如果没有的话）
      if (funds.length > 0 && simulationEngine.getFundConfigs().length === 0) {
        const startDate = simulationEngine.getMockStartDate() || '2016-03'
        const endDate = simulationEngine.getMockEndDate() || '2026-03'
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

  // 保存数据到 localStorage
  const saveToLocalStorage = useCallback(() => {
    const data = getSimulationData()
    const dataToSave = {
      fundConfigs: data.fundConfigs,
      monthlyIncomes: data.monthlyIncomes,
      monthlyExpenses: data.monthlyExpenses,
      yearExtExpenses: data.yearExtExpenses,
      depositAllocations: data.depositAllocations,
      initialBalance: data.initialBalance,
      mockStartDate: data.mockStartDate,
      mockEndDate: data.mockEndDate
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  }, [])

  // 设置器方法
  const setFundConfigs = useCallback((configs: FundConfig[]) => {
    simulationEngine.setFundConfigs(configs)
    forceUpdate({})
    saveToLocalStorage()
  }, [saveToLocalStorage])

  const setMonthlyIncomes = useCallback((incomes: MonthlyIncome[]) => {
    simulationEngine.setMonthlyIncomes(incomes)
    forceUpdate({})
    saveToLocalStorage()
  }, [saveToLocalStorage])

  const setMonthlyExpenses = useCallback((value: number) => {
    simulationEngine.setMonthlyExpenses(value)
    forceUpdate({})
    saveToLocalStorage()
  }, [saveToLocalStorage])

  const setYearExtExpenses = useCallback((expenses: number[]) => {
    simulationEngine.setYearExtExpenses(expenses)
    forceUpdate({})
    saveToLocalStorage()
  }, [saveToLocalStorage])

  const setDepositAllocations = useCallback((allocations: DepositAllocation[]) => {
    simulationEngine.setDepositAllocations(allocations)
    forceUpdate({})
    saveToLocalStorage()
  }, [saveToLocalStorage])

  const setInitialBalance = useCallback((value: number) => {
    simulationEngine.setInitialBalance(value)
    forceUpdate({})
    saveToLocalStorage()
  }, [saveToLocalStorage])

  const setMockDateRange = useCallback((startDate: string, endDate: string) => {
    simulationEngine.setMockStartDate(startDate)
    simulationEngine.setMockEndDate(endDate)
    forceUpdate({})
    saveToLocalStorage()
  }, [saveToLocalStorage])

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
  }, [simulationResult])

  const data = getSimulationData()

  // 默认数据
  const defaultData = {
    fundConfigs: [] as FundConfig[],
    monthlyIncomes: [{ income: 10000, startDate: '2016-03', endDate: '2026-03' }] as MonthlyIncome[],
    monthlyExpenses: 5000,
    yearExtExpenses: [] as number[],
    depositAllocations: [] as DepositAllocation[],
    initialBalance: 10000,
    mockStartDate: '2016-03',
    mockEndDate: '2026-03'
  }

  const renderData = {
    fundConfigs: data.fundConfigs.length > 0 ? data.fundConfigs : defaultData.fundConfigs,
    monthlyIncomes: data.monthlyIncomes.length > 0 ? data.monthlyIncomes : defaultData.monthlyIncomes,
    monthlyExpenses: data.monthlyExpenses || defaultData.monthlyExpenses,
    yearExtExpenses: data.yearExtExpenses.length > 0 ? data.yearExtExpenses : defaultData.yearExtExpenses,
    depositAllocations: data.depositAllocations.length > 0 ? data.depositAllocations : defaultData.depositAllocations,
    initialBalance: data.initialBalance,
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
          // Future view
          shiftYears={simulationParams.shiftYears}
          setShiftYears={(value) => setSimulationParams(prev => ({ ...prev, shiftYears: value }))}
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
