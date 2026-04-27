import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const hasController = Boolean(navigator.serviceWorker.controller)
  let isRefreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hasController || isRefreshing) {
      return
    }
    isRefreshing = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => registration.update())
      .catch(() => {
        // Offline support is best-effort; the app remains usable without registration.
      })
  })
}
