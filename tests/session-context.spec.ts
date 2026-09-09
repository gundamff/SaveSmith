import { describe, expect, it } from 'vitest'
import { currentSlotLabel, windowTitle } from '@host/sessionContext'

describe('windowTitle', () => {
  it('is the app name on the library', () => {
    expect(windowTitle('SaveSmith', null)).toBe('SaveSmith')
  })

  it('prefixes the current game when editing', () => {
    expect(windowTitle('SaveSmith', '混沌兵团')).toBe('混沌兵团 — SaveSmith')
  })
})

describe('currentSlotLabel', () => {
  const slots = [
    { id: '0', title: '军团甲 · 第 3 天' },
    { id: '1' }
  ]

  it('is null before a slot is loaded', () => {
    expect(currentSlotLabel(slots, null)).toBeNull()
  })

  it('prefers the slot title', () => {
    expect(currentSlotLabel(slots, '0')).toBe('军团甲 · 第 3 天')
  })

  it('falls back to the slot id', () => {
    expect(currentSlotLabel(slots, '1')).toBe('1')
  })
})
