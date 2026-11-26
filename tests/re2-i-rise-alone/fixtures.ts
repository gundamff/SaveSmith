import { encryptSaveDat } from '../../src/games/re2-i-rise-alone/crypto/aesEcb'

export function makePlainBag(): string {
  const manual = '11111111-1111-1111-1111-111111111111'
  const auto = '22222222-2222-2222-2222-222222222222'
  const slot = (id: string, name: string, data: Record<string, string>) =>
    JSON.stringify({
      Time: '1700000000000',
      Key: id,
      Round: 1,
      SavedName: name,
      isNew: false,
      isStart: true,
      is360: false,
      event360Key: '',
      Data: data
    })
  const bag = {
    _saveKeyStr: JSON.stringify([manual]),
    _autoSaveStr: JSON.stringify([auto]),
    CurKey: auto,
    [`${manual}_Data`]: slot(manual, '手动1', {
      property_Property_Money: '100',
      property_Property_Stamina: '5'
    }),
    [`${auto}_Data`]: slot(auto, '自动存档', {
      property_Property_Money: '200',
      property_Property_Stamina: '6',
      property_Property_Charm: '7',
      property_Property_Wisdom: '8',
      property_Property_Execution: '1',
      property_Property_Morality: '2',
      property_Property_Pressure: '10',
      property_Property_MMFavorability: '99'
    }),
    Language: 'Chinese'
  }
  return JSON.stringify(bag)
}

export function makeCipherFixture(): Uint8Array {
  return encryptSaveDat(new TextEncoder().encode(makePlainBag()))
}

export const MANUAL_SLOT_ID = '11111111-1111-1111-1111-111111111111'
export const AUTO_SLOT_ID = '22222222-2222-2222-2222-222222222222'