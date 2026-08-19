import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isMobile, initMobileChrome } from './lib/mobile'

// روی اندروید کلاس is-mobile اضافه می‌شود تا ناحیه‌ی امن و تنظیمات لمسی فعال شوند
if (isMobile) {
  document.body.classList.add('is-mobile')
  void initMobileChrome()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
