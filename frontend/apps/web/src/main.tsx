import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { setupApi } from './lib/setupApi'
import { applyTheme, initialResolvedTheme } from './providers/ThemeProvider'
import './styles/global.css'

setupApi()
applyTheme(initialResolvedTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
