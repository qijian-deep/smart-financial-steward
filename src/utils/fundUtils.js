// 生成2015-2026年的基金历史净值数据（作为519702的默认数据）
export function generateFundNavData() {
  const data = {}
  let currentNav = 1.0

  const marketPhases = [
    { years: [2015], trend: -0.1, volatility: 0.15 },
    { years: [2016], trend: 0.05, volatility: 0.12 },
    { years: [2017], trend: 0.2, volatility: 0.08 },
    { years: [2018], trend: -0.15, volatility: 0.18 },
    { years: [2019, 2020], trend: 0.15, volatility: 0.1 },
    { years: [2021], trend: 0.25, volatility: 0.12 },
    { years: [2022], trend: -0.2, volatility: 0.2 },
    { years: [2023, 2024, 2025, 2026], trend: 0.1, volatility: 0.1 }
  ]

  for (let year = 2015; year <= 2026; year++) {
    const phase = marketPhases.find(p => p.years.includes(year))
    const annualTrend = phase ? phase.trend : 0
    const monthlyVolatility = phase ? phase.volatility : 0.1
    const monthlyTrend = Math.pow(1 + annualTrend, 1 / 12) - 1

    for (let month = 1; month <= 12; month++) {
      const key = `${year}-${month.toString().padStart(2, '0')}`
      if (!data['519702']) data['519702'] = {}

      const randomFactor = 1 + (Math.random() - 0.5) * 2 * monthlyVolatility
      currentNav = currentNav * (1 + monthlyTrend) * randomFactor
      currentNav = Math.max(currentNav, 0.3)

      data['519702'][key] = {
        nav: parseFloat(currentNav.toFixed(4)),
        date: `${year}-${month.toString().padStart(2, '0')}-01`
      }
    }
  }
  return data
}

// 内置基金列表
export const builtinFunds = [
  { code: "519702", name: "519702", type: "混合型" }
]
