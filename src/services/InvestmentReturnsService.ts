import type { InvestmentItem } from '../types'

const STORAGE_KEY = 'smartFinancialSteward_returnsData'

class InvestmentReturnsService {
  private investmentItems: InvestmentItem[] = []

  constructor() {
    this.investmentItems = this.loadFromStorage()
  }

  getItems() {
    return this.investmentItems
  }

  saveItems(items: InvestmentItem[]) {
    this.investmentItems = items
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('Failed to save investment returns data:', error)
    }
  }

  loadFromStorage(): InvestmentItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          id: item.id,
          principal: Number(item.principal) || 0,
          currentAmount: Number(item.currentAmount) || 0
        }))
      }
    } catch (error) {
      console.error('Failed to load investment returns data:', error)
    }
    return []
  }
}

export const investmentReturnsService = new InvestmentReturnsService()
