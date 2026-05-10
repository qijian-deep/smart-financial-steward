import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import './index.css'
import App from './App'
import InvestmentReturns from './components/InvestmentReturns'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <div style={{ padding: '12px 24px', background: '#f6f8fa', borderBottom: '1px solid #e4e7ec', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Link to="/" style={{ fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}>投资模拟</Link>
        <Link to="/returns" style={{ fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}>投资收益</Link>
      </div>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/returns" element={<InvestmentReturns />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
