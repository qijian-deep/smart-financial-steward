import { useMemo, useState } from 'react'
import { investmentReturnsService } from '../services/InvestmentReturnsService'
import type { InvestmentItem } from '../types'

function formatCurrency(value: number) {
  return value.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 })
}

function formatPercentage(value: number) {
  return `${value.toFixed(2)} %`
}

export default function InvestmentReturns() {
  const [items, setItems] = useState<InvestmentItem[]>(investmentReturnsService.getItems())
  const [newPrincipal, setNewPrincipal] = useState<string>('0')
  const [newCurrentAmount, setNewCurrentAmount] = useState<string>('0')

  const totalPrincipal = useMemo(() => items.reduce((sum, item) => sum + item.principal, 0), [items])
  const totalCurrent = useMemo(() => items.reduce((sum, item) => sum + item.currentAmount, 0), [items])
  const returnsPercent = useMemo(() => {
    if (totalPrincipal <= 0) return 0
    return ((totalCurrent / totalPrincipal - 1) * 100)
  }, [totalCurrent, totalPrincipal])

  const saveItems = (nextItems: InvestmentItem[]) => {
    setItems(nextItems)
    investmentReturnsService.saveItems(nextItems)
  }

  const handleAddItem = () => {
    const principal = Number(newPrincipal)
    const currentAmount = Number(newCurrentAmount)
    if (principal <= 0 || currentAmount < 0) return

    const nextItem: InvestmentItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      principal,
      currentAmount: currentAmount || principal
    }

    saveItems([...items, nextItem])
    setNewPrincipal('0')
    setNewCurrentAmount(String(principal))
  }

  const handleUpdateItem = (id: string, field: 'principal' | 'currentAmount', value: number) => {
    const nextItems = items.map((item) => item.id === id ? { ...item, [field]: value } : item)
    saveItems(nextItems)
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <h1>投资收益</h1>
      <section style={{ marginBottom: 24, padding: 20, border: '1px solid #e5e7eb', borderRadius: 12, background: '#ffffff' }}>
        <h2 style={{ marginBottom: 16 }}>投资金额</h2>
        <div style={{ display: 'grid', gap: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ width: 120 }}>投资本金（元）</label>
            <input
              type="number"
              value={newPrincipal}
              min={0}
              step={100}
              onChange={(event) => setNewPrincipal(event.target.value)}
              style={{ flex: 1, padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ width: 120 }}>当前金额（元）</label>
            <input
              type="number"
              value={newCurrentAmount}
              min={0}
              step={100}
              onChange={(event) => setNewCurrentAmount(event.target.value)}
              style={{ flex: 1, padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }}
            />
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            style={{ width: 120, padding: '10px 16px', border: 'none', borderRadius: 8, background: '#2563eb', color: '#ffffff', cursor: 'pointer' }}
          >
            + 添加投资项
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 14, color: '#6b7280' }}>输入后点击“+ 添加投资项”即可创建条目。当前金额默认与本金一致。</div>
        </div>
      </section>

      <section style={{ marginBottom: 24, padding: 20, border: '1px solid #e5e7eb', borderRadius: 12, background: '#ffffff' }}>
        <h2 style={{ marginBottom: 16 }}>已添加的投资项</h2>
        {items.length === 0 ? (
          <div style={{ color: '#6b7280' }}>当前还没有投资项，请先添加一项。</div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {items.map((item) => (
              <div key={item.id} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 10, background: '#f9fafb' }}>
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, color: '#374151' }}>投资本金（元）</label>
                    <input
                      type="number"
                      value={item.principal}
                      min={0}
                      step={100}
                      onChange={(event) => handleUpdateItem(item.id, 'principal', Number(event.target.value))}
                      style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, color: '#374151' }}>当前金额（元）</label>
                    <input
                      type="number"
                      value={item.currentAmount}
                      min={0}
                      step={100}
                      onChange={(event) => handleUpdateItem(item.id, 'currentAmount', Number(event.target.value))}
                      style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>本金：{formatCurrency(item.principal)}</div>
                  <div>当前：{formatCurrency(item.currentAmount)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ padding: 20, border: '1px solid #e5e7eb', borderRadius: 12, background: '#f8fafc' }}>
        <h2 style={{ marginBottom: 16 }}>投资收益</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#111827' }}>
            <span>总投资本金</span>
            <strong>{formatCurrency(totalPrincipal)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#111827' }}>
            <span>总当前金额</span>
            <strong>{formatCurrency(totalCurrent)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#111827', fontSize: 18 }}>
            <span>收益率</span>
            <strong>{formatPercentage(returnsPercent)}</strong>
          </div>
        </div>
      </section>
    </div>
  )
}
