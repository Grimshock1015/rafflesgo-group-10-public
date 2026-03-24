import App from './App.tsx'
import { configureApiAuth } from './lib/api-auth.ts'
import { BrowserRouter } from 'react-router-dom'
import ReactDOM from 'react-dom/client'
import React from 'react'
import { ThemeProvider } from './contexts/ThemeContext.tsx'

// Import unified theme system
import './assets/style/main.css'
import { Provider } from './components/ui/provider.tsx'
import { Toaster } from './components/ui/toaster.tsx'

// Configure API client to include Firebase auth tokens
configureApiAuth()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Provider>
          <App />
          <Toaster />
        </Provider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)
