# `src` 目录说明（供 Agent 快速浏览）

前端源码根目录：React + TypeScript 的「智能财务规划助手」单页应用。业务流为加载基金净值 → 配置收支与定投 → `SimulationEngine` 按月模拟 → `OutputSection` 图表与指标展示。持久化主要用 `localStorage`。

---

## 目录

| 路径 | 简介 |
|------|------|
| `src/` | 应用入口、根组件、全局与页面样式、领域类型与工具。 |
| `src/components/` | 可复用 UI：左侧参数表单、右侧结果与图表。 |
| `src/services/` | 无 UI 的领域服务：基金加载与存储、财务模拟引擎（单例式导出）。 |
| `src/types/` | TypeScript 接口：基金数据、模拟参数、月度结果、图表用类型等。 |
| `src/utils/` | 纯函数工具：原始净值序列 → 按月聚合与指标计算。 |

---

## 文件

| 文件 | 简介 |
|------|------|
| `main.tsx` | React 18 `createRoot` 挂载点；引入全局样式并渲染 `App`。 |
| `App.tsx` | 根组件：协调 `FundDataLoader` / `SimulationEngine`、读写 `localStorage`（输入快照与基金列表）、基金代码加载、重置缓存、将状态下发给 `InputSection` / `OutputSection`。开发时把 loader/engine 挂到 `window` 便于调试。 |
| `App.css` | 应用壳与布局样式（深色主背景、标题区、容器、重置按钮等）。 |
| `index.css` | 全局 CSS 变量、浅色/深色 `prefers-color-scheme`、基础排版与链接样式。 |
| `components/InputSection.tsx` | 左侧表单：基金代码加载、多基金定投配置（含预设存取）、分段月收入、月/年支出、存款、初始现金、模拟日期区间、未来视图平移年数、「计算」触发。 |
| `components/OutputSection.tsx` | 右侧输出：历史/未来切换、基于 `@antv/g2plot` 的资产曲线、回撤与收益等摘要展示（消费 `SimulationResult`）。 |
| `services/FundDataLoader.ts` | 通过动态脚本拉取外部行情页、读取 `window` 上的净值数据，经 `fundDataProcessor` 转成 `LoadedFundData`；维护已加载基金列表与 `allFundsLoaded` 订阅；与 `FundStorage` 联动持久化代码列表。 |
| `services/FundStorage.ts` | `localStorage` 中基金代码列表的增删查（与 loader 使用的 key 一致）。 |
| `services/SimulationEngine.ts` | 核心模拟器：持有基金/收入/支出/存款/日期等状态，`calculate()` 生成 `SimulationResult`（含月度资产、总收益、最大回撤等），`resultChange` 事件通知 UI。 |
| `types/index.ts` | 全项目共享类型：`FundNavData`、`FundConfig`、`MonthlyIncome`、`DepositAllocation`、`SimulationResult`、`SimulationParams` 等；末尾含部分历史/兼容类型声明。 |
| `utils/fundDataProcessor.ts` | 净值原始点按年月分组、月初月末净值、增长率与分红等字段的组装，供 loader 与模拟逻辑使用。 |

---

## Agent 阅读顺序建议

1. `types/index.ts` — 数据形状  
2. `services/SimulationEngine.ts` — 业务规则与计算入口  
3. `services/FundDataLoader.ts` + `utils/fundDataProcessor.ts` — 外部数据如何进场  
4. `App.tsx` — 状态与持久化边界  
5. `components/InputSection.tsx` / `OutputSection.tsx` — 交互与展示  
