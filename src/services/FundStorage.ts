const STORAGE_KEY = 'smart_financial_steward_fund_codes'

export class FundStorage {
  /**
   * 获取存储的基金代码数组
   */
  static getFundCodes(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const codes = JSON.parse(stored)
        if (Array.isArray(codes)) {
          return codes
        }
      }
    } catch (error) {
      console.error('读取基金代码失败:', error)
    }
    return []
  }

  /**
   * 保存基金代码数组
   */
  static saveFundCodes(codes: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(codes))
    } catch (error) {
      console.error('保存基金代码失败:', error)
    }
  }

  /**
   * 添加基金代码
   */
  static addFundCode(code: string): void {
    const codes = this.getFundCodes()
    if (!codes.includes(code)) {
      codes.push(code)
      this.saveFundCodes(codes)
    }
  }

  /**
   * 移除基金代码
   */
  static removeFundCode(code: string): void {
    const codes = this.getFundCodes()
    const index = codes.indexOf(code)
    if (index > -1) {
      codes.splice(index, 1)
      this.saveFundCodes(codes)
    }
  }

  /**
   * 检查基金代码是否已存在
   */
  static hasFundCode(code: string): boolean {
    return this.getFundCodes().includes(code)
  }

  /**
   * 清空所有基金代码
   */
  static clearFundCodes(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('清空基金代码失败:', error)
    }
  }
}
