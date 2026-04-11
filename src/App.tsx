import './App.css'
import { useEffect, useRef, useState, useCallback } from 'react'
import { fundDataLoader } from './services/FundDataLoader'
import { SimulationEngine } from './services/SimulationEngine'
import { InputSection } from './components/InputSection'
import { OutputSection } from './components/OutputSection'
import type { SimulationResult, SimulationParams, IncomeSegment, Fund, Deposit } from './types'

function App() {
  // 使用 ref 存储类实例，避免重复创建
  const simulationEngineRef = useRef<SimulationEngine | null>(null)

  // 状态用于触发重新渲染
  const [fundCodeInput, setFundCodeInput] = useState<string>('')
  const [fundLoading, setFundLoading] = useState<boolean>(false)
  const [fundError, setFundError] = useState<string | null>(null)

  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [, forceUpdate] = useState({})

  // 初始化类实例
  useEffect(() => {
    // 订阅基金数据加载器
    const unsubscribe = fundDataLoader.subscribe('allFundsLoaded', () => {
      const funds = fundDataLoader.getAllLoadedFunds()
      // 同步第一个基金到模拟引擎
      if (funds.length > 0) {
        simulationEngineRef.current?.setLoadedFundData(funds[0])
        // 自动添加基金配置
        if (simulationEngineRef.current && simulationEngineRef.current.getFunds().length === 0) {
          simulationEngineRef.current.setFunds([{
            id: 1,
            fundCode: funds[0].code,
            monthlyAmount: 5000,
            startDate: simulationEngineRef.current.getSimulationParams().startDate,
            endDate: simulationEngineRef.current.getSimulationParams().endDate
          }])
          forceUpdate({})
        }
      }
    });
    (window as any).fundDataLoader = fundDataLoader

    // 创建模拟引擎
    simulationEngineRef.current = new SimulationEngine({
      onResultChange: (result) => setSimulationResult(result)
    })

    // 页面初始化后自动加载 localStorage 中的所有基金
    const timer = setTimeout(() => {
      fundDataLoader.loadAllStoredFundsFromLocalStorage()
    }, 500)

    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [])

  // 加载基金数据
  const loadFundData = useCallback(async () => {
    if (!fundCodeInput) return

    setFundLoading(true)
    setFundError(null)

    try {
      await fundDataLoader.loadFundData(fundCodeInput)
      // 保存到 localStorage
      fundDataLoader.saveToLocalStorage(fundCodeInput)
    } catch (error) {
      setFundError(error instanceof Error ? error.message : '加载失败')
    } finally {
      setFundLoading(false)
    }
  }, [fundCodeInput])

  // 获取模拟引擎的 getter 方法
  const getSimulationData = useCallback(() => {
    const engine = simulationEngineRef.current
    if (!engine) return null
    return {
      incomeSegments: engine.getIncomeSegments(),
      monthlyExpense: engine.getMonthlyExpense(),
      extraExpenses: engine.getExtraExpenses(),
      funds: engine.getFunds(),
      deposits: engine.getDeposits(),
      currentAccount: engine.getCurrentAccount(),
      simulationParams: engine.getSimulationParams()
    }
  }, [])

  // 设置器方法
  const setIncomeSegments = useCallback((segments: IncomeSegment[]) => {
    simulationEngineRef.current?.setIncomeSegments(segments)
    forceUpdate({})
  }, [])

  const setMonthlyExpense = useCallback((value: number) => {
    simulationEngineRef.current?.setMonthlyExpense(value)
    forceUpdate({})
  }, [])

  const setExtraExpenses = useCallback((expenses: { id: number; amount: number }[]) => {
    simulationEngineRef.current?.setExtraExpenses(expenses)
    forceUpdate({})
  }, [])

  const setFunds = useCallback((funds: Fund[]) => {
    simulationEngineRef.current?.setFunds(funds)
    forceUpdate({})
  }, [])

  const setDeposits = useCallback((deposits: Deposit[]) => {
    simulationEngineRef.current?.setDeposits(deposits)
    forceUpdate({})
  }, [])

  const setCurrentAccount = useCallback((account: { initialBalance: number; annualRate: number }) => {
    simulationEngineRef.current?.setCurrentAccount(account)
    forceUpdate({})
  }, [])

  const setSimulationParams = useCallback((params: SimulationParams) => {
    const engine = simulationEngineRef.current
    if (!engine) return

    engine.setSimulationParams(params)

    // 同步到所有配置
    engine.setIncomeSegments(
      engine.getIncomeSegments().map(s => ({
        ...s,
        startDate: params.startDate,
        endDate: params.endDate
      }))
    )

    engine.setFunds(
      engine.getFunds().map(f => ({
        ...f,
        startDate: params.startDate,
        endDate: params.endDate
      }))
    )

    engine.setDeposits(
      engine.getDeposits().map(d => ({
        ...d,
        date: params.startDate
      }))
    )

    forceUpdate({})
  }, [])

  // 添加方法
  const addIncomeSegment = useCallback(() => {
    simulationEngineRef.current?.addIncomeSegment()
    forceUpdate({})
  }, [])

  const addFund = useCallback(() => {
    simulationEngineRef.current?.addFund()
    forceUpdate({})
  }, [])

  const addDeposit = useCallback(() => {
    simulationEngineRef.current?.addDeposit()
    forceUpdate({})
  }, [])

  const addExtraExpense = useCallback(() => {
    simulationEngineRef.current?.addExtraExpense()
    forceUpdate({})
  }, [])

  // 触发计算
  const triggerCalculation = useCallback(() => {
    simulationEngineRef.current?.calculate()
  }, [])

  // 平移到未来
  const shiftToFuture = useCallback((result: SimulationResult | null, years: number) => {
    if (!simulationEngineRef.current || !result) return null
    return simulationEngineRef.current.shiftToFuture(years)
  }, [])

  const data = getSimulationData()

  // 默认数据，用于初始化时
  const defaultData = {
    incomeSegments: [{ id: 1, monthlyIncome: 10000, startDate: '2015-01', endDate: '2015-03' }],
    monthlyExpense: 5000,
    extraExpenses: [] as { id: number; amount: number }[],
    funds: [] as Fund[],
    deposits: [] as Deposit[],
    currentAccount: { initialBalance: 10000, annualRate: 0 },
    simulationParams: { startDate: '2015-01', endDate: '2015-03', shiftYears: 0 }
  }

  const renderData = data || defaultData

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
          // Simulation params
          simulationParams={renderData.simulationParams}
          setSimulationParams={setSimulationParams}
          // Income
          incomeSegments={renderData.incomeSegments}
          setIncomeSegments={setIncomeSegments}
          addIncomeSegment={addIncomeSegment}
          // Expense
          monthlyExpense={renderData.monthlyExpense}
          setMonthlyExpense={setMonthlyExpense}
          // Extra expenses
          extraExpenses={renderData.extraExpenses}
          setExtraExpenses={setExtraExpenses}
          addExtraExpense={addExtraExpense}
          // Funds
          funds={renderData.funds}
          setFunds={setFunds}
          addFund={addFund}
          // Deposits
          deposits={renderData.deposits}
          setDeposits={setDeposits}
          addDeposit={addDeposit}
          // Current account
          currentAccount={renderData.currentAccount}
          setCurrentAccount={setCurrentAccount}
          // Calculation
          onCalculate={triggerCalculation}
        />

        <OutputSection
          simulationResult={simulationResult}
          shiftToFuture={shiftToFuture}
          simulationParams={renderData.simulationParams}
          incomeSegments={renderData.incomeSegments}
        />
      </div>
    </div>
  )
}

export default App
