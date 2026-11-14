import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n' // guest-facing play flow only for now — see src/i18n/index.js
import App from './App.jsx'
import { startAutoLabel } from './utils/autoLabel'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

startAutoLabel() // links each form label to its field for screen readers (no visual change)
