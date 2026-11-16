import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  // Every test must explicitly mock its requests; never reach the backend or providers.
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Unmocked network request blocked')),
  )
})
afterEach(() => {
  cleanup()
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
