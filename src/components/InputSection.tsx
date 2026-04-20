import { useMemo, useState, useEffect } from 'react'
import { fundDataLoader } from '../services/FundDataLoader'
import type {
  LoadedFundData,
  FundConfig,
  MonthlyIncome,
  DepositAllocation,
  AvailableFund
} from '../types'

// localStorage key for fund config presets
const FUND_CONFIG_PRESETS_KEY = 'smartfinancialsteward_fund_config_presets'

interface FundConfigPreset {
  name: string
  configs: FundConfig[]
  createdAt: string
}

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
  // Future view
  shiftYears: number
  setShiftYears: (value: number) => void
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
  // Future view
  shiftYears, setShiftYears,
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
  const updateFundConfig = (index: number, field: keyof FundConfig, value: string | number | null | undefined) => {
    const newConfigs = [...fundConfigs]
    newConfigs[index] = { ...newConfigs[index], [field]: value }
    setFundConfigs(newConfigs)
  }

  // 删除基金配置
  const removeFundConfig = (index: number) => {
    setFundConfigs(fundConfigs.filter((_, i) => i !== index))
  }

  // 保存和加载基金配置
  const [saveConfigName, setSaveConfigName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [savedConfigs, setSavedConfigs] = useState<FundConfigPreset[]>(() => {
    const saved = localStorage.getItem(FUND_CONFIG_PRESETS_KEY)
    return saved ? JSON.parse(saved) : []
  })
  const [selectedConfigName, setSelectedConfigName] = useState('')
  const [showLoadSelect, setShowLoadSelect] = useState(false)

  // 保存基金配置到localStorage
  const saveFundConfig = () => {
    if (!saveConfigName.trim()) return
    
    const newPreset: FundConfigPreset = {
      name: saveConfigName.trim(),
      configs: [...fundConfigs],
      createdAt: new Date().toISOString()
    }
    
    const updatedConfigs = [...savedConfigs.filter(c => c.name !== newPreset.name), newPreset]
    setSavedConfigs(updatedConfigs)
    localStorage.setItem(FUND_CONFIG_PRESETS_KEY, JSON.stringify(updatedConfigs))
    
    setSaveConfigName('')
    setShowSaveInput(false)
    alert(`基金配置"${newPreset.name}"已保存`)
  }

  // 从localStorage加载基金配置
  const loadFundConfig = () => {
    if (!selectedConfigName) return
    
    const preset = savedConfigs.find(c => c.name === selectedConfigName)
    if (preset) {
      setFundConfigs([...preset.configs])
      setSelectedConfigName('')
      setShowLoadSelect(false)
      alert(`基金配置"${preset.name}"已加载`)
    }
  }

  // 删除保存的基金配置
  const deleteSavedConfig = (name: string) => {
    const updatedConfigs = savedConfigs.filter(c => c.name !== name)
    setSavedConfigs(updatedConfigs)
    localStorage.setItem(FUND_CONFIG_PRESETS_KEY, JSON.stringify(updatedConfigs))
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
            type="text"
            inputMode="numeric"
            value={initialBalance}
            onChange={(e) => {
              const value = e.target.value
              // 允许空值或数字
              if (value === '' || /^\d*$/.test(value)) {
                setInitialBalance(value === '' ? 0 : Number(value))
              }
            }}
            onBlur={(e) => {
              // 失去焦点时，如果为空则设为0
              if (e.target.value === '') {
                setInitialBalance(0)
              }
            }}
          />
        </div>

        {/* 平移年份 */}
        <div className="form-group">
          <label>平移年份（未来视图）</label>
          <input
            type="number"
            value={shiftYears}
            onChange={(e) => setShiftYears(Number(e.target.value))}
            min={1}
            max={50}
            step={1}
          />
          <small style={{ color: '#666', fontSize: '12px' }}>未来视图将历史数据平移的年数</small>
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
                type="text"
                inputMode="numeric"
                value={income.income}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || /^\d*$/.test(value)) {
                    updateMonthlyIncome(index, 'income', value === '' ? 0 : Number(value))
                  }
                }}
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
            <button 
              onClick={() => removeMonthlyIncome(index)} 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                fontSize: '13px',
                color: '#ff4d4f',
                background: '#fff',
                border: '1px solid #ff4d4f',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ff4d4f'
                e.currentTarget.style.color = '#fff'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(255, 77, 79, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff'
                e.currentTarget.style.color = '#ff4d4f'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              删除
            </button>
          </div>
        ))}
        <button 
          onClick={addMonthlyIncome}
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            color: '#1677ff',
            background: '#fff',
            border: '1px dashed #1677ff',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '100%',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1677ff'
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.borderStyle = 'solid'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(22, 119, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff'
            e.currentTarget.style.color = '#1677ff'
            e.currentTarget.style.borderStyle = 'dashed'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          添加月收入
        </button>
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
        
        {/* 保存和加载按钮 */}
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowSaveInput(!showSaveInput)}
            disabled={fundConfigs.length === 0}
            style={{ 
              background: fundConfigs.length === 0 ? '#f5f5f5' : '#1677ff',
              color: fundConfigs.length === 0 ? '#bfbfbf' : '#fff',
              border: `1px solid ${fundConfigs.length === 0 ? '#d9d9d9' : '#1677ff'}`,
              borderRadius: '6px',
              padding: '6px 16px',
              fontSize: '14px',
              cursor: fundConfigs.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: fundConfigs.length === 0 ? 'none' : '0 2px 0 rgba(5, 145, 255, 0.1)'
            }}
            onMouseEnter={(e) => {
              if (fundConfigs.length > 0) {
                e.currentTarget.style.background = '#4096ff'
              }
            }}
            onMouseLeave={(e) => {
              if (fundConfigs.length > 0) {
                e.currentTarget.style.background = '#1677ff'
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            保存配置
          </button>
          <button 
            onClick={() => setShowLoadSelect(!showLoadSelect)}
            disabled={savedConfigs.length === 0}
            style={{ 
              background: savedConfigs.length === 0 ? '#f5f5f5' : '#fff',
              color: savedConfigs.length === 0 ? '#bfbfbf' : '#595959',
              border: `1px solid ${savedConfigs.length === 0 ? '#d9d9d9' : '#d9d9d9'}`,
              borderRadius: '6px',
              padding: '6px 16px',
              fontSize: '14px',
              cursor: savedConfigs.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              if (savedConfigs.length > 0) {
                e.currentTarget.style.color = '#1677ff'
                e.currentTarget.style.borderColor = '#1677ff'
              }
            }}
            onMouseLeave={(e) => {
              if (savedConfigs.length > 0) {
                e.currentTarget.style.color = '#595959'
                e.currentTarget.style.borderColor = '#d9d9d9'
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            加载配置
          </button>
        </div>

        {/* 保存配置输入框 */}
        {showSaveInput && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: '4px' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                value={saveConfigName}
                onChange={(e) => setSaveConfigName(e.target.value)}
                placeholder="输入配置名称"
                style={{ flex: 1 }}
              />
              <button 
                onClick={saveFundConfig}
                disabled={!saveConfigName.trim()}
                style={{ 
                  background: !saveConfigName.trim() ? '#f5f5f5' : '#1677ff',
                  color: !saveConfigName.trim() ? '#bfbfbf' : '#fff',
                  border: `1px solid ${!saveConfigName.trim() ? '#d9d9d9' : '#1677ff'}`,
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '14px',
                  cursor: !saveConfigName.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (saveConfigName.trim()) {
                    e.currentTarget.style.background = '#4096ff'
                  }
                }}
                onMouseLeave={(e) => {
                  if (saveConfigName.trim()) {
                    e.currentTarget.style.background = '#1677ff'
                  }
                }}
              >
                确认保存
              </button>
              <button 
                onClick={() => setShowSaveInput(false)}
                style={{ 
                  background: '#fff',
                  color: '#595959',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#1677ff'
                  e.currentTarget.style.borderColor = '#1677ff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#595959'
                  e.currentTarget.style.borderColor = '#d9d9d9'
                }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 加载配置选择框 */}
        {showLoadSelect && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: '4px' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <select
                value={selectedConfigName}
                onChange={(e) => setSelectedConfigName(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">选择配置</option>
                {savedConfigs.map(config => (
                  <option key={config.name} value={config.name}>
                    {config.name} ({config.configs.length}个基金, {new Date(config.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
              <button 
                onClick={loadFundConfig}
                disabled={!selectedConfigName}
                style={{ 
                  background: !selectedConfigName ? '#f5f5f5' : '#1677ff',
                  color: !selectedConfigName ? '#bfbfbf' : '#fff',
                  border: `1px solid ${!selectedConfigName ? '#d9d9d9' : '#1677ff'}`,
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '14px',
                  cursor: !selectedConfigName ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedConfigName) {
                    e.currentTarget.style.background = '#4096ff'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedConfigName) {
                    e.currentTarget.style.background = '#1677ff'
                  }
                }}
              >
                确认加载
              </button>
              <button 
                onClick={() => setShowLoadSelect(false)}
                style={{ 
                  background: '#fff',
                  color: '#595959',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#1677ff'
                  e.currentTarget.style.borderColor = '#1677ff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#595959'
                  e.currentTarget.style.borderColor = '#d9d9d9'
                }}
              >
                取消
              </button>
            </div>
            {/* 已保存配置列表 */}
            {savedConfigs.length > 0 && (
              <div style={{ fontSize: '0.85em', color: '#666' }}>
                <div style={{ marginBottom: '0.25rem', fontWeight: 'bold' }}>已保存的配置：</div>
                {savedConfigs.map(config => (
                  <div key={config.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}>
                    <span>{config.name} ({config.configs.length}个基金)</span>
                    <button 
                      onClick={() => deleteSavedConfig(config.name)}
                      style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        color: '#ff4d4f',
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: '#fff',
                        border: '1px solid #ff4d4f',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#ff4d4f'
                        e.currentTarget.style.color = '#fff'
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(255, 77, 79, 0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff'
                        e.currentTarget.style.color = '#ff4d4f'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
            <div className="form-group">
              <label>止盈率 (%)</label>
              <input
                type="number"
                value={config.takeProfitRate ?? ''}
                onChange={(e) => updateFundConfig(index, 'takeProfitRate', e.target.value === '' ? null : Number(e.target.value))}
                min={0}
                max={100}
                step={1}
                placeholder="不设置"
              />
            </div>
            <div className="form-group">
              <label>重投入分期（月）</label>
              <input
                type="number"
                value={config.takeProfitReinvestPeriod ?? ''}
                onChange={(e) => updateFundConfig(index, 'takeProfitReinvestPeriod', e.target.value === '' ? null : Number(e.target.value))}
                min={1}
                max={120}
                step={1}
                placeholder="不分期"
              />
            </div>
            <button 
              onClick={() => removeFundConfig(index)} 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                fontSize: '13px',
                color: '#ff4d4f',
                background: '#fff',
                border: '1px solid #ff4d4f',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ff4d4f'
                e.currentTarget.style.color = '#fff'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(255, 77, 79, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff'
                e.currentTarget.style.color = '#ff4d4f'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              删除
            </button>
          </div>
        ))}
        <button 
          onClick={addFundConfig} 
          disabled={availableFunds.length === 0}
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            color: availableFunds.length === 0 ? '#bfbfbf' : '#1677ff',
            background: '#fff',
            border: `1px dashed ${availableFunds.length === 0 ? '#d9d9d9' : '#1677ff'}`,
            borderRadius: '6px',
            cursor: availableFunds.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            width: '100%',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (availableFunds.length > 0) {
              e.currentTarget.style.background = '#1677ff'
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.borderStyle = 'solid'
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(22, 119, 255, 0.3)'
            }
          }}
          onMouseLeave={(e) => {
            if (availableFunds.length > 0) {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.color = '#1677ff'
              e.currentTarget.style.borderStyle = 'dashed'
              e.currentTarget.style.boxShadow = 'none'
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          添加基金配置
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
            <button 
              onClick={() => removeDepositAllocation(index)} 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                fontSize: '13px',
                color: '#ff4d4f',
                background: '#fff',
                border: '1px solid #ff4d4f',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ff4d4f'
                e.currentTarget.style.color = '#fff'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(255, 77, 79, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff'
                e.currentTarget.style.color = '#ff4d4f'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              删除
            </button>
          </div>
        ))}
        <button 
          onClick={addDepositAllocation}
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            color: '#1677ff',
            background: '#fff',
            border: '1px dashed #1677ff',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '100%',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1677ff'
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.borderStyle = 'solid'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(22, 119, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff'
            e.currentTarget.style.color = '#1677ff'
            e.currentTarget.style.borderStyle = 'dashed'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          添加存款配置
        </button>
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
