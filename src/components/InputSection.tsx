import { useMemo, useState, useEffect } from 'react'
import { fundDataLoader } from '../services/FundDataLoader'
import type {
  LoadedFundData,
  SimulationParams,
  IncomeSegment,
  ExtraExpense,
  Fund,
  Deposit,
  CurrentAccount,
  AvailableFund
} from '../types'

interface InputSectionProps {
  // Fund data
  fundCodeInput: string
  setFundCodeInput: (value: string) => void
  fundLoading: boolean
  fundError: string | null
  loadFundData: () => void
  // Simulation params
  simulationParams: SimulationParams
  setSimulationParams: (params: SimulationParams) => void
  // Income
  incomeSegments: IncomeSegment[]
  setIncomeSegments: (segments: IncomeSegment[]) => void
  addIncomeSegment: () => void
  // Expense
  monthlyExpense: number
  setMonthlyExpense: (value: number) => void
  // Extra expenses
  extraExpenses: ExtraExpense[]
  setExtraExpenses: (expenses: ExtraExpense[]) => void
  addExtraExpense: () => void
  // Funds
  funds: Fund[]
  setFunds: (funds: Fund[]) => void
  addFund: () => void
  // Deposits
  deposits: Deposit[]
  setDeposits: (deposits: Deposit[]) => void
  addDeposit: () => void
  // Current account
  currentAccount: CurrentAccount
  setCurrentAccount: (account: CurrentAccount) => void
  // Calculation
  onCalculate: () => void
}

export function InputSection({
  // Fund data
  fundCodeInput, setFundCodeInput, fundLoading, fundError, loadFundData,
  // Simulation params
  simulationParams, setSimulationParams,
  // Income
  incomeSegments, setIncomeSegments, addIncomeSegment,
  // Expense
  monthlyExpense, setMonthlyExpense,
  // Extra expenses
  extraExpenses, setExtraExpenses, addExtraExpense,
  // Funds
  funds, setFunds, addFund,
  // Deposits
  deposits, setDeposits, addDeposit,
  // Current account
  currentAccount, setCurrentAccount,
  // Calculation
  onCalculate
}: InputSectionProps) {
  // 直接从 FundDataLoader 获取数据，保持完全同步
  const [allLoadedFunds, setAllLoadedFunds] = useState<LoadedFundData[]>(fundDataLoader.getAllLoadedFunds())

  useEffect(() => {
    // 订阅 FundDataLoader 的数据变化
    const unsubscribe = fundDataLoader.subscribe('allFundsLoaded', (funds) => {
      setAllLoadedFunds([...funds])
    })
    return unsubscribe
  }, [])

  // 合并内置基金和已加载的基金
  const availableFunds = useMemo<AvailableFund[]>(() => {
    // 使用所有已加载的基金
    return allLoadedFunds.map((fund: LoadedFundData) => ({
      code: fund.code,
      name: fund.name,
      type: '加载的基金'
    }))
  }, [allLoadedFunds])

  return (
    <div className="input-section">
      {/* 模拟参数 */}
      <div className="section">
        <h2>模拟参数</h2>
        <div className="form-group">
          <label>基金代码</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={fundCodeInput}
              onChange={(e) => setFundCodeInput(e.target.value)}
              placeholder="输入基金代码，如519702"
              style={{ flex: 1 }}
            />
            <button
              onClick={loadFundData}
              disabled={fundLoading}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #646cff',
                background: fundLoading ? '#ccc' : '#646cff',
                color: 'white',
                fontSize: '0.9em',
                cursor: fundLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {fundLoading ? '加载中...' : '加载'}
            </button>
          </div>
          {fundError && <p style={{ color: '#ff5722', fontSize: '0.8em', marginTop: '0.25rem' }}>{fundError}</p>}
          {allLoadedFunds.length > 0 && <p style={{ color: '#4caf50', fontSize: '0.8em', marginTop: '0.25rem' }}>已加载 {allLoadedFunds.length} 个基金</p>}
        </div>

        <div className="form-group">
          <label>模拟开始日期</label>
          <input
            type="date"
            value={simulationParams.startDate + '-01'}
            onChange={(e) => {
              const dateValue = e.target.value
              const yearMonth = dateValue.substring(0, 7)
              setSimulationParams({ ...simulationParams, startDate: yearMonth })
            }}
            style={{
              fontSize: '16px',
              minHeight: '44px',
              padding: '0.5rem',
              borderRadius: '8px',
              border: '1px solid #ccc',
              width: '100%',
              WebkitAppearance: 'none'
            }}
          />
        </div>
        <div className="form-group">
          <label>模拟结束日期</label>
          <input
            type="date"
            value={simulationParams.endDate + '-01'}
            onChange={(e) => {
              const dateValue = e.target.value
              const yearMonth = dateValue.substring(0, 7)
              setSimulationParams({ ...simulationParams, endDate: yearMonth })
            }}
            style={{
              fontSize: '16px',
              minHeight: '44px',
              padding: '0.5rem',
              borderRadius: '8px',
              border: '1px solid #ccc',
              width: '100%',
              WebkitAppearance: 'none'
            }}
          />
        </div>
        <div className="form-group">
          <label>推移年份</label>
          <input
            type="number"
            value={simulationParams.shiftYears}
            onChange={(e) => setSimulationParams({ ...simulationParams, shiftYears: parseInt(e.target.value) || 0 })}
            min="0"
          />
        </div>
      </div>

      {/* 收入配置 */}
      <div className="section">
        <h2>收入配置</h2>
        {incomeSegments.map(segment => (
          <div key={segment.id} className="sub-section">
            <div className="form-group">
              <label>月收入</label>
              <input
                type="number"
                value={segment.monthlyIncome}
                onChange={(e) => {
                  const newSegments = incomeSegments.map(s =>
                    s.id === segment.id ? { ...s, monthlyIncome: parseFloat(e.target.value) || 0 } : s
                  )
                  setIncomeSegments(newSegments)
                }}
              />
            </div>
            <div className="form-group">
              <label>生效开始日期</label>
              <input
                type="month"
                value={segment.startDate}
                onChange={(e) => {
                  const newSegments = incomeSegments.map(s =>
                    s.id === segment.id ? { ...s, startDate: e.target.value } : s
                  )
                  setIncomeSegments(newSegments)
                }}
              />
            </div>
            <div className="form-group">
              <label>生效结束日期</label>
              <input
                type="month"
                value={segment.endDate}
                onChange={(e) => {
                  const newSegments = incomeSegments.map(s =>
                    s.id === segment.id ? { ...s, endDate: e.target.value } : s
                  )
                  setIncomeSegments(newSegments)
                }}
              />
            </div>
          </div>
        ))}
        <button className="add-button" onClick={addIncomeSegment}>+ 添加收入段</button>
      </div>

      {/* 支出配置 */}
      <div className="section">
        <h2>支出配置</h2>
        <div className="form-group">
          <label>月支出</label>
          <input
            type="number"
            value={monthlyExpense}
            onChange={(e) => setMonthlyExpense(parseFloat(e.target.value) || 0)}
          />
        </div>
        <h3>年额外支出</h3>
        {extraExpenses.map(expense => (
          <div key={expense.id} className="sub-section">
            <div className="form-group">
              <label>金额</label>
              <input
                type="number"
                value={expense.amount}
                onChange={(e) => {
                  const newExpenses = extraExpenses.map(item =>
                    item.id === expense.id ? { ...item, amount: parseFloat(e.target.value) || 0 } : item
                  )
                  setExtraExpenses(newExpenses)
                }}
              />
            </div>
          </div>
        ))}
        <button className="add-button" onClick={addExtraExpense}>+ 添加额外支出</button>
      </div>

      {/* 基金配置 */}
      <div className="section">
        <h2>基金配置</h2>
        {funds.map(fund => (
          <div key={fund.id} className="sub-section">
            <div className="form-group">
              <label>基金名称</label>
              <select
                value={fund.fundCode}
                onChange={(e) => {
                  const newFunds = funds.map(f =>
                    f.id === fund.id ? { ...f, fundCode: e.target.value } : f
                  )
                  console.log('newFunds', newFunds)
                  setFunds(newFunds)
                }}
              >
                {availableFunds.length === 0 ? (
                  <option value="">请先加载基金</option>
                ) : (
                  availableFunds.map(f => (
                    <option key={f.code} value={f.code}>{f.name}</option>
                  ))
                )}
              </select>
            </div>
            <div className="form-group">
              <label>每月定投金额</label>
              <input
                type="number"
                value={fund.monthlyAmount}
                onChange={(e) => {
                  const newFunds = funds.map(f =>
                    f.id === fund.id ? { ...f, monthlyAmount: parseFloat(e.target.value) || 0 } : f
                  )
                  setFunds(newFunds)
                }}
              />
            </div>
            <div className="form-group">
              <label>定投开始日期</label>
              <input
                type="month"
                value={fund.startDate}
                onChange={(e) => {
                  const newFunds = funds.map(f =>
                    f.id === fund.id ? { ...f, startDate: e.target.value } : f
                  )
                  setFunds(newFunds)
                }}
              />
            </div>
            <div className="form-group">
              <label>定投结束日期</label>
              <input
                type="month"
                value={fund.endDate}
                onChange={(e) => {
                  const newFunds = funds.map(f =>
                    f.id === fund.id ? { ...f, endDate: e.target.value } : f
                  )
                  setFunds(newFunds)
                }}
              />
            </div>
          </div>
        ))}
        <button className="add-button" onClick={addFund}>+ 添加基金</button>
      </div>

      {/* 存款配置 */}
      <div className="section">
        <h2>存款配置</h2>
        {deposits.map(deposit => (
          <div key={deposit.id} className="sub-section">
            <div className="form-group">
              <label>存款金额</label>
              <input
                type="number"
                value={deposit.amount}
                onChange={(e) => {
                  const newDeposits = deposits.map(d =>
                    d.id === deposit.id ? { ...d, amount: parseFloat(e.target.value) || 0 } : d
                  )
                  setDeposits(newDeposits)
                }}
              />
            </div>
            <div className="form-group">
              <label>存入日期</label>
              <input
                type="month"
                value={deposit.date}
                onChange={(e) => {
                  const newDeposits = deposits.map(d =>
                    d.id === deposit.id ? { ...d, date: e.target.value } : d
                  )
                  setDeposits(newDeposits)
                }}
              />
            </div>
            <div className="form-group">
              <label>年利率(%)</label>
              <input
                type="number"
                value={deposit.annualRate}
                onChange={(e) => {
                  const newDeposits = deposits.map(d =>
                    d.id === deposit.id ? { ...d, annualRate: parseFloat(e.target.value) || 0 } : d
                  )
                  setDeposits(newDeposits)
                }}
              />
            </div>
            <div className="form-group">
              <label>期限(月)</label>
              <input
                type="number"
                value={deposit.term}
                onChange={(e) => {
                  const newDeposits = deposits.map(d =>
                    d.id === deposit.id ? { ...d, term: parseInt(e.target.value) || 0 } : d
                  )
                  setDeposits(newDeposits)
                }}
              />
            </div>
          </div>
        ))}
        <button className="add-button" onClick={addDeposit}>+ 添加存款</button>
      </div>

      {/* 活期配置 */}
      <div className="section">
        <h2>活期配置</h2>
        <div className="form-group">
          <label>初始余额</label>
          <input
            type="number"
            value={currentAccount.initialBalance}
            onChange={(e) => setCurrentAccount({ ...currentAccount, initialBalance: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="form-group">
          <label>年利率(%)</label>
          <input
            type="number"
            value={currentAccount.annualRate}
            onChange={(e) => setCurrentAccount({ ...currentAccount, annualRate: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      {/* 计算按钮 */}
      <div className="section" style={{ textAlign: 'center', padding: '2rem', background: '#f0f7ff', borderRadius: '12px', marginTop: '1rem' }}>
        <button
          onClick={onCalculate}
          style={{
            padding: '1rem 3rem',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            background: '#646cff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(100, 108, 255, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#535bf2'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(100, 108, 255, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#646cff'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 108, 255, 0.3)'
          }}
        >
          开始计算
        </button>
        <p style={{ marginTop: '0.75rem', color: '#666', fontSize: '0.9rem' }}>
          配置完成后点击计算按钮查看结果
        </p>
      </div>
    </div>
  )
}
