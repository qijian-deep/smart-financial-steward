import { useMemo, useState, useEffect } from 'react'
import { fundDataLoader } from '../services/FundDataLoader'
import type {
  LoadedFundData,
  FundConfig,
  MonthlyIncome,
  DepositAllocation,
  AvailableFund
} from '../types'

interface InputSectionProps {
  // Fund data
  fundCodeInput: string
  setFundCodeInput: (value: string) => void
  fundLoading: boolean
  fundError: string | null
  loadFundData: () => void
  // Simulation data
  fundConfigs: FundConfig[]
  setFundConfigs: (configs: FundConfig[]) => void
  monthlyIncomes: MonthlyIncome[]
  setMonthlyIncomes: (incomes: MonthlyIncome[]) => void
  monthlyExpenses: number
  setMonthlyExpenses: (value: number) => void
  yearExtExpenses: number[]
  setYearExtExpenses: (expenses: number[]) => void
  depositAllocations: DepositAllocation[]
  setDepositAllocations: (allocations: DepositAllocation[]) => void
  initialBalance: number
  setInitialBalance: (value: number) => void
  mockStartDate: string
  mockEndDate: string
  setMockDateRange: (startDate: string, endDate: string) => void
  // Calculation
  onCalculate: () => void
}

export function InputSection({
  // Fund data
  fundCodeInput, setFundCodeInput, fundLoading, fundError, loadFundData,
  // Simulation data
  fundConfigs, setFundConfigs,
  monthlyIncomes, setMonthlyIncomes,
  monthlyExpenses, setMonthlyExpenses,
  yearExtExpenses, setYearExtExpenses,
  depositAllocations, setDepositAllocations,
  initialBalance, setInitialBalance,
  mockStartDate, mockEndDate, setMockDateRange,
  // Calculation
  onCalculate
}: InputSectionProps) {
  // 直接从 FundDataLoader 获取数据，保持完全同步
  const [allLoadedFunds, setAllLoadedFunds] = useState<LoadedFundData[]>(fundDataLoader.getAllLoadedFunds())

  useEffect(() => {
    const unsubscribe = fundDataLoader.subscribe('allFundsLoaded', (funds) => {
      setAllLoadedFunds([...(funds as LoadedFundData[])])
    })
    return unsubscribe
  }, [])

  // 可用基金列表
  const availableFunds = useMemo<AvailableFund[]>(() => {
    return allLoadedFunds.map((fund: LoadedFundData) => ({
      code: fund.code,
      name: fund.name,
      type: '加载的基金'
    }))
  }, [allLoadedFunds])

  // 添加基金配置
  const addFundConfig = () => {
    const newConfig: FundConfig = {
      fundCode: availableFunds[0]?.code || '',
      investmentAmount: 5000,
      startDate: mockStartDate,
      endDate: mockEndDate
    }
    setFundConfigs([...fundConfigs, newConfig])
  }

  // 更新基金配置
  const updateFundConfig = (index: number, field: keyof FundConfig, value: string | number) => {
    const newConfigs = [...fundConfigs]
    newConfigs[index] = { ...newConfigs[index], [field]: value }
    setFundConfigs(newConfigs)
  }

  // 删除基金配置
  const removeFundConfig = (index: number) => {
    setFundConfigs(fundConfigs.filter((_, i) => i !== index))
  }

  // 添加月收入
  const addMonthlyIncome = () => {
    const newIncome: MonthlyIncome = {
      income: 10000,
      startDate: mockStartDate,
      endDate: mockEndDate
    }
    setMonthlyIncomes([...monthlyIncomes, newIncome])
  }

  // 更新月收入
  const updateMonthlyIncome = (index: number, field: keyof MonthlyIncome, value: string | number) => {
    const newIncomes = [...monthlyIncomes]
    newIncomes[index] = { ...newIncomes[index], [field]: value }
    setMonthlyIncomes(newIncomes)
  }

  // 删除月收入
  const removeMonthlyIncome = (index: number) => {
    setMonthlyIncomes(monthlyIncomes.filter((_, i) => i !== index))
  }

  // 添加存款配置
  const addDepositAllocation = () => {
    const newAllocation: DepositAllocation = {
      amount: 10000,
      startDate: mockStartDate,
      endDate: mockEndDate,
      annualInterestRate: 2.5
    }
    setDepositAllocations([...depositAllocations, newAllocation])
  }

  // 更新存款配置
  const updateDepositAllocation = (index: number, field: keyof DepositAllocation, value: string | number) => {
    const newAllocations = [...depositAllocations]
    newAllocations[index] = { ...newAllocations[index], [field]: value }
    setDepositAllocations(newAllocations)
  }

  // 删除存款配置
  const removeDepositAllocation = (index: number) => {
    setDepositAllocations(depositAllocations.filter((_, i) => i !== index))
  }

  return (
    <div className="input-section">
      {/* 模拟参数 */}
      <div className="section">
        <h2>模拟参数</h2>
        
        {/* 基金代码加载 */}
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
                border: 'none',
                background: fundLoading ? '#ccc' : '#4caf50',
                color: 'white',
                cursor: fundLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {fundLoading ? '加载中...' : '加载'}
            </button>
          </div>
          {fundError && <p style={{ color: '#ff5722', fontSize: '0.8em', marginTop: '0.25rem' }}>{fundError}</p>}
          {allLoadedFunds.length > 0 && <p style={{ color: '#4caf50', fontSize: '0.8em', marginTop: '0.25rem' }}>已加载 {allLoadedFunds.length} 个基金</p>}
        </div>

        {/* 时间范围 */}
        <div className="form-group">
          <label>模拟开始日期</label>
          <input
            type="month"
            value={mockStartDate}
            onChange={(e) => setMockDateRange(e.target.value, mockEndDate)}
          />
        </div>

        <div className="form-group">
          <label>模拟结束日期</label>
          <input
            type="month"
            value={mockEndDate}
            onChange={(e) => setMockDateRange(mockStartDate, e.target.value)}
          />
        </div>

        {/* 初始余额 */}
        <div className="form-group">
          <label>初始余额</label>
          <input
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(Number(e.target.value))}
            min={0}
            step={1000}
          />
        </div>
      </div>

      {/* 月收入配置 */}
      <div className="section">
        <h2>月收入配置</h2>
        {monthlyIncomes.map((income, index) => (
          <div key={index} className="config-item" style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            <div className="form-group">
              <label>月收入</label>
              <input
                type="number"
                value={income.income}
                onChange={(e) => updateMonthlyIncome(index, 'income', Number(e.target.value))}
                min={0}
                step={1000}
              />
            </div>
            <div className="form-group">
              <label>开始时间</label>
              <input
                type="month"
                value={income.startDate}
                onChange={(e) => updateMonthlyIncome(index, 'startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>结束时间</label>
              <input
                type="month"
                value={income.endDate}
                onChange={(e) => updateMonthlyIncome(index, 'endDate', e.target.value)}
              />
            </div>
            <button onClick={() => removeMonthlyIncome(index)} style={{ color: '#ff5722' }}>删除</button>
          </div>
        ))}
        <button onClick={addMonthlyIncome}>+ 添加月收入</button>
      </div>

      {/* 支出配置 */}
      <div className="section">
        <h2>支出配置</h2>
        <div className="form-group">
          <label>月支出</label>
          <input
            type="number"
            value={monthlyExpenses}
            onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
            min={0}
            step={1000}
          />
        </div>
      </div>

      {/* 基金配置 */}
      <div className="section">
        <h2>基金配置</h2>
        {fundConfigs.map((config, index) => (
          <div key={index} className="config-item" style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            <div className="form-group">
              <label>基金名称</label>
              <select
                value={config.fundCode}
                onChange={(e) => updateFundConfig(index, 'fundCode', e.target.value)}
              >
                {availableFunds.map(fund => (
                  <option key={fund.code} value={fund.code}>{fund.name} ({fund.code})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>每月定投金额</label>
              <input
                type="number"
                value={config.investmentAmount}
                onChange={(e) => updateFundConfig(index, 'investmentAmount', Number(e.target.value))}
                min={0}
                step={1000}
              />
            </div>
            <div className="form-group">
              <label>开始时间</label>
              <input
                type="month"
                value={config.startDate}
                onChange={(e) => updateFundConfig(index, 'startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>结束时间</label>
              <input
                type="month"
                value={config.endDate}
                onChange={(e) => updateFundConfig(index, 'endDate', e.target.value)}
              />
            </div>
            <button onClick={() => removeFundConfig(index)} style={{ color: '#ff5722' }}>删除</button>
          </div>
        ))}
        <button onClick={addFundConfig} disabled={availableFunds.length === 0}>
          + 添加基金配置
        </button>
      </div>

      {/* 存款配置 */}
      <div className="section">
        <h2>存款配置</h2>
        {depositAllocations.map((allocation, index) => (
          <div key={index} className="config-item" style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            <div className="form-group">
              <label>存款金额</label>
              <input
                type="number"
                value={allocation.amount}
                onChange={(e) => updateDepositAllocation(index, 'amount', Number(e.target.value))}
                min={0}
                step={1000}
              />
            </div>
            <div className="form-group">
              <label>年利率 (%)</label>
              <input
                type="number"
                value={allocation.annualInterestRate}
                onChange={(e) => updateDepositAllocation(index, 'annualInterestRate', Number(e.target.value))}
                min={0}
                step={0.1}
              />
            </div>
            <div className="form-group">
              <label>开始时间</label>
              <input
                type="month"
                value={allocation.startDate}
                onChange={(e) => updateDepositAllocation(index, 'startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>结束时间</label>
              <input
                type="month"
                value={allocation.endDate}
                onChange={(e) => updateDepositAllocation(index, 'endDate', e.target.value)}
              />
            </div>
            <button onClick={() => removeDepositAllocation(index)} style={{ color: '#ff5722' }}>删除</button>
          </div>
        ))}
        <button onClick={addDepositAllocation}>+ 添加存款配置</button>
      </div>

      {/* 计算按钮 */}
      <div className="section">
        <button 
          onClick={onCalculate}
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1.1rem',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          开始计算
        </button>
      </div>
    </div>
  )
}
