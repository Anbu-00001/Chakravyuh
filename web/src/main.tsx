import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './tailwind.generated.css'
import './index.css'
import { App } from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary variant="app">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
