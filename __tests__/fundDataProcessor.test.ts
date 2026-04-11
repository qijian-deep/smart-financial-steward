import { describe, it, expect } from 'vitest'
import {
  groupDataByMonth,
  sortMonthDataByDay,
  getMonthStartData,
  getMonthEndData,
  buildFundNavData,
  processMonthData,
  processFundData,
  type RawFundDataItem,
  type GroupedMonthData
} from '../src/utils/fundDataProcessor'

describe('fundDataProcessor', () => {
  // 测试数据 - 使用实际日期
  const mockRawData: RawFundDataItem[] = [
    // 2015年1月数据
    { x: new Date('2015-01-01').getTime(), y: 1.0 },
    { x: new Date('2015-01-02').getTime(), y: 1.01 },
    { x: new Date('2015-01-31').getTime(), y: 1.05 },
    // 2015年2月数据
    { x: new Date('2015-02-01').getTime(), y: 1.06 },
    { x: new Date('2015-02-28').getTime(), y: 1.08 },
  ]

  describe('groupDataByMonth', () => {
    it('应该将数据按年月正确分组', () => {
      const result = groupDataByMonth(mockRawData)

      expect(Object.keys(result)).toHaveLength(2)
      expect(result['2015-01']).toBeDefined()
      expect(result['2015-02']).toBeDefined()
    })

    it('应该正确提取年月日信息', () => {
      const result = groupDataByMonth(mockRawData)
      const janData = result['2015-01']

      expect(janData).toHaveLength(3)
      expect(janData[0]).toMatchObject({
        year: 2015,
        month: 1,
        day: 1,
        nav: 1.0
      })
    })

    it('应该处理空数组', () => {
      const result = groupDataByMonth([])
      expect(result).toEqual({})
    })

    it('应该处理 undefined', () => {
      const result = groupDataByMonth(undefined as unknown as RawFundDataItem[])
      expect(result).toEqual({})
    })
  })

  describe('sortMonthDataByDay', () => {
    it('应该按日期升序排序', () => {
      const unsorted: GroupedMonthData[] = [
        { year: 2015, month: 1, day: 15, nav: 1.5, timestamp: 1 },
        { year: 2015, month: 1, day: 1, nav: 1.0, timestamp: 2 },
        { year: 2015, month: 1, day: 10, nav: 1.3, timestamp: 3 }
      ]

      const result = sortMonthDataByDay(unsorted)

      expect(result[0].day).toBe(1)
      expect(result[1].day).toBe(10)
      expect(result[2].day).toBe(15)
    })

    it('不应该修改原数组', () => {
      const original: GroupedMonthData[] = [
        { year: 2015, month: 1, day: 15, nav: 1.5, timestamp: 1 },
        { year: 2015, month: 1, day: 1, nav: 1.0, timestamp: 2 }
      ]
      const originalCopy = [...original]

      sortMonthDataByDay(original)

      expect(original).toEqual(originalCopy)
    })
  })

  describe('getMonthStartData', () => {
    it('应该优先返回1号的数据', () => {
      const monthData: GroupedMonthData[] = [
        { year: 2015, month: 1, day: 5, nav: 1.05, timestamp: 1 },
        { year: 2015, month: 1, day: 1, nav: 1.0, timestamp: 2 },
        { year: 2015, month: 1, day: 10, nav: 1.1, timestamp: 3 }
      ]

      const result = getMonthStartData(monthData)

      expect(result.day).toBe(1)
      expect(result.nav).toBe(1.0)
    })

    it('没有1号数据时应该返回第一天', () => {
      const monthData: GroupedMonthData[] = [
        { year: 2015, month: 1, day: 5, nav: 1.05, timestamp: 1 },
        { year: 2015, month: 1, day: 3, nav: 1.03, timestamp: 2 },
        { year: 2015, month: 1, day: 10, nav: 1.1, timestamp: 3 }
      ]

      const result = getMonthStartData(monthData)

      expect(result.day).toBe(5)
      expect(result.nav).toBe(1.05)
    })
  })

  describe('getMonthEndData', () => {
    it('应该返回最后一天的数据', () => {
      const monthData: GroupedMonthData[] = [
        { year: 2015, month: 1, day: 1, nav: 1.0, timestamp: 1 },
        { year: 2015, month: 1, day: 15, nav: 1.05, timestamp: 2 },
        { year: 2015, month: 1, day: 31, nav: 1.1, timestamp: 3 }
      ]

      const result = getMonthEndData(monthData)

      expect(result.day).toBe(31)
      expect(result.nav).toBe(1.1)
    })
  })

  describe('buildFundNavData', () => {
    it('应该正确构建 FundNavData 对象', () => {
      const startDay: GroupedMonthData = {
        year: 2015, month: 1, day: 1, nav: 1.0, timestamp: 1
      }
      const endDay: GroupedMonthData = {
        year: 2015, month: 1, day: 31, nav: 1.1, timestamp: 2
      }
      const allData: GroupedMonthData[] = [startDay, endDay]

      const result = buildFundNavData(startDay, endDay, allData)

      expect(result).toMatchObject({
        startNav: 1.0,
        startDate: '2015-01-01',
        endNav: 1.1,
        endDate: '2015-01-31'
      })
      expect(result.allData).toHaveLength(2)
    })
  })

  describe('processMonthData', () => {
    it('应该正确处理单月数据', () => {
      const monthData: GroupedMonthData[] = [
        { year: 2015, month: 1, day: 5, nav: 1.05, timestamp: 1 },
        { year: 2015, month: 1, day: 1, nav: 1.0, timestamp: 2 },
        { year: 2015, month: 1, day: 31, nav: 1.1, timestamp: 3 }
      ]

      const result = processMonthData(monthData)

      expect(result.startNav).toBe(1.0)  // 1号的数据
      expect(result.endNav).toBe(1.1)    // 31号的数据
      expect(result.startDate).toBe('2015-01-01')
      expect(result.endDate).toBe('2015-01-31')
    })
  })

  describe('processFundData', () => {
    it('应该正确处理完整的基金数据', () => {
      const rawData: RawFundDataItem[] = [
        { x: new Date('2015-01-01').getTime(), y: 1.0 },
        { x: new Date('2015-01-15').getTime(), y: 1.05 },
        { x: new Date('2015-01-31').getTime(), y: 1.1 },
        { x: new Date('2015-02-01').getTime(), y: 1.11 },
        { x: new Date('2015-02-28').getTime(), y: 1.2 }
      ]

      const result = processFundData(rawData)

      expect(Object.keys(result)).toHaveLength(2)
      expect(result['2015-01']).toBeDefined()
      expect(result['2015-02']).toBeDefined()

      // 验证1月数据
      expect(result['2015-01'].startNav).toBe(1.0)
      expect(result['2015-01'].endNav).toBe(1.1)

      // 验证2月数据
      expect(result['2015-02'].startNav).toBe(1.11)
      expect(result['2015-02'].endNav).toBe(1.2)
    })

    it('应该处理跨年的数据', () => {
      const rawData: RawFundDataItem[] = [
        { x: new Date('2015-12-01').getTime(), y: 1.5 },
        { x: new Date('2015-12-31').getTime(), y: 1.6 },
        { x: new Date('2016-01-01').getTime(), y: 1.61 },
        { x: new Date('2016-01-31').getTime(), y: 1.7 }
      ]

      const result = processFundData(rawData)

      expect(result['2015-12']).toBeDefined()
      expect(result['2016-01']).toBeDefined()
      expect(result['2015-12'].startNav).toBe(1.5)
      expect(result['2016-01'].startNav).toBe(1.61)
    })

    it('应该处理空数据', () => {
      const result = processFundData([])
      expect(result).toEqual({})
    })
  })
})
