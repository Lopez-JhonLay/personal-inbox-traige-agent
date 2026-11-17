import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { ToastViewport } from '../components/ui/ToastViewport'
import { clearToasts } from '../notifications/toasts'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  clearToasts()
  render(createElement(ToastViewport))
  // Every test must explicitly mock its requests; never reach the backend or providers.
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Unmocked network request blocked')),
  )
})
afterEach(() => {
  cleanup()
  clearToasts()
})

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value(this: HTMLDialogElement) {
    this.open = true
    this.querySelector<HTMLButtonElement>('button')?.focus()
  },
})
Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  configurable: true,
  value(this: HTMLDialogElement) {
    this.open = false
  },
})
