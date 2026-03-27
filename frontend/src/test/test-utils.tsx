/* eslint-disable react-refresh/only-export-components */
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '../contexts/ThemeContext'
import type { ReactElement } from 'react'

interface AllTheProvidersProps {
  children: React.ReactNode
}

import { Provider } from '../components/ui/provider'

function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <Provider>
      <ThemeProvider>{children}</ThemeProvider>
    </Provider>
  )
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
