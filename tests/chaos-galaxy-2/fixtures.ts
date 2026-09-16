import { serializeEs3Binary } from '../../src/games/chaos-galaxy-2/model/es3-binary'

export function encodeMinimalCampaign(): Uint8Array {
  return serializeEs3Binary([
    { key: 'PlayerName', settings: 9, kind: 'string', value: 'TestPlayer' },
    { key: 'RealYear', settings: 10, kind: 'int', value: 2026 }
  ])
}

export function encodeMinimalConfig(): Uint8Array {
  return serializeEs3Binary([{ key: 'Volume', settings: 1, kind: 'int', value: 80 }])
}
