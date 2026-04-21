import './App.css'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { fundDataLoader } from './services/FundDataLoader'
import { FundStorage } from './services/FundStorage'
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

  // 本地状态，用于强制重新渲染 InputSection
  const [localFundConfigs, setLocalFundConfigs] = useState<FundConfig[]>([])
  const [localMonthlyIncomes, setLocalMonthlyIncomes] = useState<MonthlyIncome[]>([])
  const [localMonthlyExpenses, setLocalMonthlyExpenses] = useState<number>(5000)
  const [localYearExtExpenses, setLocalYearExtExpenses] = useState<number[]>([])
  const [localDepositAllocations, setLocalDepositAllocations] = useState<DepositAllocation[]>([])
  const [localInitialBalance, setLocalInitialBalance] = useState<number>(10000)
  const [localMockStartDate, setLocalMockStartDate] = useState<string>('2016-03')
  const [localMockEndDate, setLocalMockEndDate] = useState<string>('2026-03')

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
        setLocalMockStartDate('2016-03')
        setLocalMockEndDate('2026-03')
        // 初始化默认月收入
        simulationEngine.setMonthlyIncomes([{ income: 10000, startDate: '2016-03', endDate: '2026-03' }])
        setLocalMonthlyIncomes([{ income: 10000, startDate: '2016-03', endDate: '2026-03' }])
        // 初始化默认月支出
        simulationEngine.setMonthlyExpenses(5000)
        setLocalMonthlyExpenses(5000)
        // 初始化默认初始余额
        simulationEngine.setInitialBalance(10000)
        setLocalInitialBalance(10000)
      }

      hasLoadedFromStorage.current = true
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
        const newConfig = {
          fundCode: funds[0].code,
          investmentAmount: 5000,
          startDate,
          endDate
        }
        simulationEngine.setFundConfigs([newConfig])
        setLocalFundConfigs([newConfig])
      }
    })

    ;(window as any).fundDataLoader = fundDataLoader
    ;(window as any).simulationEngine = simulationEngine

    // 页面初始化后合并默认基金代码，并批量加载
    const timer = setTimeout(() => {
      FundStorage.ensureDefaultFundCodes()
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
    setLocalFundConfigs(configs)
    saveToLocalStorage()
  }, [saveToLocalStorage])

  const setMonthlyIncomes = useCallback((incomes: MonthlyIncome[]) => {
    simulationEngine.setMonthlyIncomes(incomes)
    setLocalMonthlyIncomes(incomes)
    saveToLocalStorage()
  }, [saveToLocalStorage])

  const setMonthlyExpenses = useCallback((value: number) => {
    simulationEngine.setMonthlyExpenses(value)
    setLocalMonthlyExpenses(value)
    saveToLocalStorage()
  }, [saveToLocalStorage])

  const setYearExtExpenses = useCallback((expenses: number[]) => {
    simulationEngine.setYearExtExpenses(expenses)
    setLocalYearExtExpenses(expenses)
    saveToLocalStorage()
  }, [saveToLocalStorage])

  const setDepositAllocations = useCallback((allocations: DepositAllocation[]) => {
    simulationEngine.setDepositAllocations(allocations)
    setLocalDepositAllocations(allocations)
    saveToLocalStorage()
  }, [saveToLocalStorage])

  const setInitialBalance = useCallback((value: number) => {
    simulationEngine.setInitialBalance(value)
    setLocalInitialBalance(value)
    saveToLocalStorage()
  }, [saveToLocalStorage])

  const setMockDateRange = useCallback((startDate: string, endDate: string) => {
    simulationEngine.setMockStartDate(startDate)
    simulationEngine.setMockEndDate(endDate)
    setLocalMockStartDate(startDate)
    setLocalMockEndDate(endDate)

    // 模拟区间变更后，同步到各基金定投与月收入段的起止年月
    const syncedFunds = simulationEngine.getFundConfigs().map((c) => ({
      ...c,
      startDate,
      endDate
    }))
    simulationEngine.setFundConfigs(syncedFunds)
    setLocalFundConfigs(syncedFunds)

    const prevIncomes = simulationEngine.getMonthlyIncomes()
    const syncedIncomes =
      prevIncomes.length > 0
        ? prevIncomes.map((i) => ({ ...i, startDate, endDate }))
        : [{ income: 10000, startDate, endDate }]
    simulationEngine.setMonthlyIncomes(syncedIncomes)
    setLocalMonthlyIncomes(syncedIncomes)

    saveToLocalStorage()
  }, [saveToLocalStorage])

  // 重置所有缓存
  const resetCache = useCallback(() => {
    // 删除 localStorage 中的缓存
    localStorage.removeItem('smart_financial_steward_fund_codes')
    localStorage.removeItem('smartFinancialSteward_inputData')
    localStorage.removeItem('smartfinancialsteward_fund_config_presets')

    // 重置 simulationEngine
    simulationEngine.setFundConfigs([])
    simulationEngine.setMonthlyIncomes([{ income: 10000, startDate: '2016-03', endDate: '2026-03' }])
    simulationEngine.setMonthlyExpenses(5000)
    simulationEngine.setYearExtExpenses([])
    simulationEngine.setDepositAllocations([])
    simulationEngine.setInitialBalance(10000)
    simulationEngine.setMockStartDate('2016-03')
    simulationEngine.setMockEndDate('2026-03')

    // 重置本地状态
    setLocalFundConfigs([])
    setLocalMonthlyIncomes([{ income: 10000, startDate: '2016-03', endDate: '2026-03' }])
    setLocalMonthlyExpenses(5000)
    setLocalYearExtExpenses([])
    setLocalDepositAllocations([])
    setLocalInitialBalance(10000)
    setLocalMockStartDate('2016-03')
    setLocalMockEndDate('2026-03')

    alert('缓存已重置')
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
    if (localMonthlyIncomes.length === 0) return []

    return localMonthlyIncomes.map((income, index) => ({
      id: index,
      name: `收入阶段 ${index + 1}`,
      startDate: income.startDate,
      endDate: income.endDate,
      monthlyIncome: income.income
    }))
  }, [localMonthlyIncomes])

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
    fundConfigs: localFundConfigs.length > 0 ? localFundConfigs : defaultData.fundConfigs,
    monthlyIncomes: localMonthlyIncomes.length > 0 ? localMonthlyIncomes : defaultData.monthlyIncomes,
    monthlyExpenses: localMonthlyExpenses ?? defaultData.monthlyExpenses,
    yearExtExpenses: localYearExtExpenses.length > 0 ? localYearExtExpenses : defaultData.yearExtExpenses,
    depositAllocations: localDepositAllocations.length > 0 ? localDepositAllocations : defaultData.depositAllocations,
    initialBalance: localInitialBalance,
    mockStartDate: localMockStartDate || defaultData.mockStartDate,
    mockEndDate: localMockEndDate || defaultData.mockEndDate
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>智能财务规划助手</h1>
        <button className="reset-cache-btn" onClick={resetCache}>
          重置缓存
        </button>
      </div>

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
