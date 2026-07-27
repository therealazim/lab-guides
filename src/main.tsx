import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Disable native scroll restoration for SPA navigation
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <svg className="grain-overlay" width="100%" height="100%">
        <filter id="grainFilter"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
        <rect width="100%" height="100%" filter="url(#grainFilter)"/>
      </svg>
      <div className="atmosphere" />
      <App />
    </HashRouter>
  </StrictMode>,
)
