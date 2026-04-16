import type { FundNavData } from '../types'

/**
 * 原始基金净值数据项
 */
export interface RawFundDataItem {
  x: number  // 时间戳
  y: number  // 净值
}

/**
 * 按月分组的数据项
 */
export interface GroupedMonthData {
  year: number
  month: number
  day: number
  nav: number
  timestamp: number
}

/**
 * 将原始基金数据按年月分组
 * @param trendData 原始基金净值趋势数据
 * @returns 按年月分组的数据对象
 */
export function groupDataByMonth(
  trendData: RawFundDataItem[]
): Record<string, GroupedMonthData[]> {
  const groupedByMonth: Record<string, GroupedMonthData[]> = {}

  trendData?.forEach(item => {
    const date = new Date(item.x)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const key = `${year}-${month.toString().padStart(2, '0')}`

    if (!groupedByMonth[key]) {
      groupedByMonth[key] = []
    }

    groupedByMonth[key].push({
      year,
      month,
      day,
      nav: item.y,
      timestamp: item.x
    })
  })

  return groupedByMonth
}

/**
 * 对单月数据按日期排序
 * @param monthData 单月数据数组
 * @returns 排序后的数据数组
 */
export function sortMonthDataByDay(
  monthData: GroupedMonthData[]
): GroupedMonthData[] {
  return [...monthData].sort((a, b) => a.day - b.day)
}

/**
 * 获取月初净值数据（优先1号，否则取第一天）
 * @param monthData 排序后的单月数据
 * @returns 月初数据项
 */
export function getMonthStartData(
  monthData: GroupedMonthData[]
): GroupedMonthData {
  const firstDayOfMonth = monthData.find(d => d.day === 1)
  return firstDayOfMonth || monthData[0]
}

/**
 * 获取月末净值数据（最后一天）
 * @param monthData 排序后的单月数据
 * @returns 月末数据项
 */
export function getMonthEndData(
  monthData: GroupedMonthData[]
): GroupedMonthData {
  return monthData[monthData.length - 1]
}

/**
 * 构建 FundNavData 对象
 * @param startDay 月初数据
 * @param endDay 月末数据
 * @param allData 当月所有数据
 * @returns FundNavData 对象
 */
export function buildFundNavData(
  startDay: GroupedMonthData,
  endDay: GroupedMonthData,
  allData: GroupedMonthData[]
): FundNavData {
  return {
    startNav: startDay.nav,
    startDate: `${startDay.year}-${startDay.month.toString().padStart(2, '0')}-${startDay.day.toString().padStart(2, '0')}`,
    endNav: endDay.nav,
    endDate: `${endDay.year}-${endDay.month.toString().padStart(2, '0')}-${endDay.day.toString().padStart(2, '0')}`,
    growthRate: startDay.nav !== 0 ? endDay.nav / startDay.nav : 1,
    allData
  }
}

/**
 * 处理单月数据，生成 FundNavData
 * @param monthData 单月原始数据
 * @returns 处理后的 FundNavData
 */
export function processMonthData(
  monthData: GroupedMonthData[]
): FundNavData {
  const sortedData = sortMonthDataByDay(monthData)
  const startDay = getMonthStartData(sortedData)
  const endDay = getMonthEndData(sortedData)

  return buildFundNavData(startDay, endDay, sortedData)
}

/**
 * 获取前一个月的key
 * @param currentKey 当前月份key (格式: YYYY-MM)
 * @returns 前一个月的key
 */
function getPreviousMonthKey(currentKey: string): string | null {
  const [year, month] = currentKey.split('-').map(Number)
  if (month === 1) {
    return `${year - 1}-12`
  }
  return `${year}-${(month - 1).toString().padStart(2, '0')}`
}

/**
 * 处理所有基金数据
 * @param trendData 原始基金净值趋势数据
 * @returns 按年月索引的 FundNavData 对象
 */
export function processFundData(
  trendData: RawFundDataItem[]
): Record<string, FundNavData> {
  const groupedByMonth = groupDataByMonth(trendData)
  const monthlyData: Record<string, FundNavData> = {}

  // 获取所有月份key并排序
  const sortedKeys = Object.keys(groupedByMonth).sort()

  sortedKeys.forEach(key => {
    const monthData = groupedByMonth[key]
    const sortedData = sortMonthDataByDay(monthData)
    const startDay = getMonthStartData(sortedData)
    const endDay = getMonthEndData(sortedData)

    let actualStartNav = startDay.nav
    let actualStartDate = `${startDay.year}-${startDay.month.toString().padStart(2, '0')}-${startDay.day.toString().padStart(2, '0')}`

    // 尝试使用前一个月的endNav作为当前月的startNav
    const prevKey = getPreviousMonthKey(key)
    if (prevKey && monthlyData[prevKey]) {
      actualStartNav = monthlyData[prevKey].endNav
      actualStartDate = monthlyData[prevKey].endDate
    }

    // 计算growthRate: 如果使用了前一个月的endNav作为startNav，则使用实际startNav计算
    const growthRate = actualStartNav !== 0 ? endDay.nav / actualStartNav : 1

    monthlyData[key] = {
      startNav: actualStartNav,
      startDate: actualStartDate,
      endNav: endDay.nav,
      endDate: `${endDay.year}-${endDay.month.toString().padStart(2, '0')}-${endDay.day.toString().padStart(2, '0')}`,
      growthRate,
      allData: sortedData
    }
  })

  return monthlyData
}
