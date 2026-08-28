import { describe, it, expect } from 'vitest'
import { statusMeta } from './views/catalog.js'
import { ProgressStatus } from './game.js'

describe('statusMeta', () => {
  it('maps each progress status to a label pair', () => {
    expect(statusMeta(ProgressStatus.NOT_STARTED)).toEqual({
      statusLabel: 'Не начат',
      actionLabel: 'Начать',
    })
    expect(statusMeta(ProgressStatus.IN_PROGRESS)).toEqual({
      statusLabel: 'В процессе',
      actionLabel: 'Продолжить',
    })
    expect(statusMeta(ProgressStatus.COMPLETED)).toEqual({
      statusLabel: 'Решён',
      actionLabel: 'Решён',
    })
  })

  it('falls back to not_started for an unknown status', () => {
    expect(statusMeta('bogus')).toEqual(
      statusMeta(ProgressStatus.NOT_STARTED),
    )
  })
})
