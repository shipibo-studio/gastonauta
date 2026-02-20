import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Make vitest globals available
declare global {
  const describe: typeof import('vitest').describe
  const it: typeof import('vitest').it
  const expect: typeof import('vitest').expect
  const beforeEach: typeof import('vitest').beforeEach
  const vi: typeof import('vitest').vi
}
