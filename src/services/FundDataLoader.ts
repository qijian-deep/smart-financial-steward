import type { LoadedFundData } from '../types'
import { processFundData } from '../utils/fundDataProcessor'
import { FundStorage } from './FundStorage'

declare global {
  interface Window {
    Data_netWorthTrend?: Array<{ x: number; y: number }>
    fS_name?: string
  }
}

// 事件类型定义
type EventKey = 'allFundsLoaded' | string

// 事件数据映射
type EventDataMap = {
  allFundsLoaded: LoadedFundData[]
}

class FundDataLoader {
  private allLoadedFunds: LoadedFundData[] = []
  private listeners: Map<EventKey, Set<(data: unknown) => void>> = new Map()

  /**
   * 添加监听器，返回取消订阅函数
   * @param eventKey 事件标识
   * @param listener 监听器函数
   */
  public subscribe<K extends EventKey>(
    eventKey: K,
    listener: (data: K extends keyof EventDataMap ? EventDataMap[K] : unknown) => void
  ): () => void {
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, new Set())
    }

    const eventListeners = this.listeners.get(eventKey)!
    eventListeners.add(listener as (data: unknown) => void)

    // 如果是 allFundsLoaded 事件，立即触发一次当前数据
    if (eventKey === 'allFundsLoaded') {
      listener(this.allLoadedFunds as K extends keyof EventDataMap ? EventDataMap[K] : unknown)
    }

    return () => {
      eventListeners.delete(listener as (data: unknown) => void)
    }
  }

  /**
   * 通知指定事件的所有监听器
   * @param eventKey 事件标识
   * @param data 事件数据
   */
  private notifyListeners<K extends EventKey>(
    eventKey: K,
    data: K extends keyof EventDataMap ? EventDataMap[K] : unknown
  ): void {
    const eventListeners = this.listeners.get(eventKey)
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data))
    }
  }

  /**
   * 获取所有已加载的基金的数据
   */
  public getAllLoadedFunds(): LoadedFundData[] {
    return this.allLoadedFunds
  }

  /**
   * 根据基金code获取基金的数据
   */
  public getFundDataByCode(fundCode: string): LoadedFundData | undefined {
    return this.allLoadedFunds.find(f => f.code === fundCode)
  }

  /**
   * 将fundCode保存到localstorage中
   */
  public saveToLocalStorage(fundCode: string): void {
    FundStorage.addFundCode(fundCode)
  }

  /**
   * 往allLoadedFunds中添加新的基金数据，重复的code会覆盖
   */
  private addLoadedFund(data: LoadedFundData): void {
    const existingIndex = this.allLoadedFunds.findIndex(f => f.code === data.code)
    if (existingIndex > -1) {
      this.allLoadedFunds[existingIndex] = data
    } else {
      this.allLoadedFunds.push(data)
    }
    this.notifyListeners('allFundsLoaded', this.allLoadedFunds)
  }

  /**
   * 根据基金code加载基金数据
   */
  public async loadFundData(fundCode: string): Promise<void> {
    if (!fundCode) return

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://fund.eastmoney.com/pingzhongdata/${fundCode}.js`
      script.async = true

      const timeout = setTimeout(() => {
        if (script.parentNode) {
          document.head.removeChild(script)
        }
        reject(new Error('加载超时，请检查基金代码是否正确'))
      }, 10000)

      script.onload = () => {
        clearTimeout(timeout)
        if (typeof window.Data_netWorthTrend !== 'undefined') {
          const monthlyData = processFundData(window.Data_netWorthTrend)
          const fundName = typeof window.fS_name !== 'undefined' ? window.fS_name : fundCode

          const loadedFundData: LoadedFundData = {
            code: fundCode,
            name: fundName,
            data: monthlyData
          }

          this.addLoadedFund(loadedFundData)

          // console.log('monthlyData:', monthlyData)
          // console.log('loadedFundData:', loadedFundData)

          resolve()
        } else {
          reject(new Error('未找到基金数据'))
        }

        if (script.parentNode) {
          document.head.removeChild(script)
        }
      }

      script.onerror = () => {
        clearTimeout(timeout)
        if (script.parentNode) {
          document.head.removeChild(script)
        }
        reject(new Error('加载失败，请检查基金代码'))
      }

      document.head.appendChild(script)
    })
  }

  /**
   * 从localStorage加载所有基金
   */
  public async loadAllStoredFundsFromLocalStorage(): Promise<void> {
    const codes = FundStorage.getFundCodes()
    if (codes.length === 0) return

    const loadedCodes: string[] = []

    for (const code of codes) {
      try {
        await this.loadFundData(code)
        loadedCodes.push(code)
      } catch (error) {
        console.warn(`基金 ${code} 加载失败:`, error)
      }
    }

    // 更新localStorage，只保留成功加载的
    const currentCodes = FundStorage.getFundCodes()
    const validCodes = currentCodes.filter(code => loadedCodes.includes(code))
    FundStorage.saveFundCodes(validCodes)
  }
}

// 导出单例实例
export const fundDataLoader = new FundDataLoader()
