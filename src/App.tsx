import './App.css'
import { useEffect } from 'react'
import { useFundData } from './hooks/useFundData'
import { useSimulation } from './hooks/useSimulation'
import { InputSection } from './components/InputSection'
import { OutputSection } from './components/OutputSection'
import type { SimulationParams, IncomeSegment, Fund, Deposit } from './types'

function App() {
  // 基金数据加载
  const {
    fundCodeInput, setFundCodeInput,
    loadedFundData,
    fundLoading, fundError,
    loadFundData
  } = useFundData()

  // 模拟计算 - 传入加载的基金数据
  const {
    incomeSegments, setIncomeSegments, addIncomeSegment,
    monthlyExpense, setMonthlyExpense,
    extraExpenses, setExtraExpenses, addExtraExpense,
    funds, setFunds, addFund,
    deposits, setDeposits, addDeposit,
    currentAccount, setCurrentAccount,
    simulationParams, setSimulationParams,
    simulationResult, shiftToFuture,
    triggerCalculation
  } = useSimulation(loadedFundData)

  // 页面初始化后自动加载基金数据
  useEffect(() => {
    // 延迟一点执行，确保页面已经渲染
    const timer = setTimeout(() => {
      if (fundCodeInput && !loadedFundData && !fundLoading) {
        loadFundData()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // 当加载完基金数据后，自动添加到基金配置中
  useEffect(() => {
    if (loadedFundData && funds.length === 0) {
      // 自动添加一个基金配置，使用加载的基金代码
      setFunds([{
        id: 1,
        fundCode: loadedFundData.code,
        monthlyAmount: 5000,
        startDate: simulationParams.startDate,
        endDate: simulationParams.endDate
      }])
    }
  }, [loadedFundData, funds.length, simulationParams.startDate, simulationParams.endDate, setFunds])

  // 当模拟参数的开始/结束日期变化时，同步到所有配置
  const handleSimulationParamsChange = (newParams: SimulationParams) => {
    setSimulationParams(newParams)

    // 同步到收入配置
    setIncomeSegments((segments: IncomeSegment[]) =>
      segments.map((s: IncomeSegment) => ({
        ...s,
        startDate: newParams.startDate,
        endDate: newParams.endDate
      }))
    )

    // 同步到基金配置
    setFunds((fundList: Fund[]) =>
      fundList.map((f: Fund) => ({
        ...f,
        startDate: newParams.startDate,
        endDate: newParams.endDate
      }))
    )

    // 同步到存款配置
    setDeposits((depositList: Deposit[]) =>
      depositList.map((d: Deposit) => ({
        ...d,
        date: newParams.startDate
      }))
    )
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
          loadedFundData={loadedFundData}
          loadFundData={loadFundData}
          // Simulation params
          simulationParams={simulationParams}
          setSimulationParams={handleSimulationParamsChange}
          // Income
          incomeSegments={incomeSegments}
          setIncomeSegments={setIncomeSegments}
          addIncomeSegment={addIncomeSegment}
          // Expense
          monthlyExpense={monthlyExpense}
          setMonthlyExpense={setMonthlyExpense}
          // Extra expenses
          extraExpenses={extraExpenses}
          setExtraExpenses={setExtraExpenses}
          addExtraExpense={addExtraExpense}
          // Funds
          funds={funds}
          setFunds={setFunds}
          addFund={addFund}
          // Deposits
          deposits={deposits}
          setDeposits={setDeposits}
          addDeposit={addDeposit}
          // Current account
          currentAccount={currentAccount}
          setCurrentAccount={setCurrentAccount}
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
