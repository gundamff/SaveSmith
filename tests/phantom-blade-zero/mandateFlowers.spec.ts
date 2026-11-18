import { describe, expect, it } from 'vitest'
import {
  listMissedMandateFlowers,
  restoreMissedMandateFlowers
} from '../../src/games/phantom-blade-zero/model/mandateFlowers'

function flower(n: number, ownerVisible: false | undefined, destroyed = false) {
  const hidden = `quest.不灭侠胆.隐藏目标点${n}`
  const actor: Record<string, unknown> = {
    ComponentsOwnerActorInfo: [{ OwnerVisible: ownerVisible }],
    ComponentInfoJson: { EventTag: ownerVisible === false ? [hidden] : [`pz.不灭侠胆.帮助正道解脱${n}`] }
  }
  if (ownerVisible === undefined) {
    actor.ComponentsOwnerActorInfo = [{}]
  }
  if (destroyed) actor.HasDestory = true
  return actor
}

function pipeline(actor: Record<string, unknown>, extraTags: string[] = []) {
  return {
    EventPipeline: {
      GlobalTags: [`quest.不灭侠胆.隐藏目标点6`, 'pz.不灭侠胆.护法表演2', ...extraTags],
      LevelActor: actor
    }
  }
}

describe('missed mandate memory flowers', () => {
  it('restores a hidden leader flower and its identical slot', () => {
    const hidden = pipeline(flower(6, false))
    const source = { name: 'AutoSave0', document: structuredClone(hidden), dirty: false }
    const mirror = { name: 'AutoSave1', document: structuredClone(hidden), dirty: false }
    const other = {
      name: 'ManualSave1',
      document: pipeline(flower(6, undefined)),
      dirty: false
    }
    const result = restoreMissedMandateFlowers([source, mirror, other], 'AutoSave0')
    expect(result.leaders).toEqual([6])
    const actor = (source.document.EventPipeline as { LevelActor: Record<string, unknown> }).LevelActor
    expect(actor.ComponentsOwnerActorInfo).toEqual([{}])
    expect(actor.ComponentInfoJson).toEqual({ EventTag: ['pz.不灭侠胆.帮助正道解脱6'] })
    const tags = (source.document.EventPipeline as { GlobalTags: string[] }).GlobalTags
    expect(tags).toContain('pz.不灭侠胆.帮助正道解脱6')
    expect(tags).toContain('quest.不灭侠胆.隐藏目标点6')
    expect(tags).toContain('pz.不灭侠胆.护法表演2')
    expect(mirror.dirty).toBe(true)
    expect(JSON.stringify(mirror.document)).toBe(JSON.stringify(source.document))
    expect(other.dirty).toBe(false)
  })

  it('skips destroyed flowers, leaders outside 1..6, and already-success tags', () => {
    const document = {
      EventPipeline: {
        GlobalTags: [] as string[],
        Gone: flower(1, false, true),
        Weird: flower(7, false),
        Done: flower(2, undefined)
      }
    }
    expect(listMissedMandateFlowers(document)).toEqual([])
    const slot = { name: 'AutoSave0', document, dirty: false }
    expect(restoreMissedMandateFlowers([slot], 'AutoSave0').leaders).toEqual([])
    expect(slot.dirty).toBe(false)
  })

  it('edits EventTag stored as a JSON string', () => {
    const actor = {
      ComponentsOwnerActorInfo: [{ OwnerVisible: false, Keep: 1 }],
      ComponentInfoJson: JSON.stringify({ EventTag: ['quest.不灭侠胆.隐藏目标点1'], Keep: true })
    }
    const document = { EventPipeline: { GlobalTags: [] as string[], LevelActor: actor } }
    expect(listMissedMandateFlowers(document)).toEqual([1])
    restoreMissedMandateFlowers([{ name: 'ManualSave1', document, dirty: false }], 'ManualSave1')
    const info = JSON.parse(actor.ComponentInfoJson) as { EventTag: string[]; Keep: boolean }
    expect(info).toEqual({ EventTag: ['pz.不灭侠胆.帮助正道解脱1'], Keep: true })
    expect(actor.ComponentsOwnerActorInfo).toEqual([{ Keep: 1 }])
  })
})