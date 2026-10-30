import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  createApp,
  createRenderer,
  createSSRApp,
  computed,
  defineComponent,
  h,
  nextTick,
  ref,
  type Component,
  type PropType,
  type Ref
} from 'vue'
import { renderToString } from '@vue/server-renderer'
import { ElMessage } from 'element-plus'
import { describe, expect, it, vi } from 'vitest'
import { setLocale, t } from '../../src/host/i18n'
import type { PhantomBladeZeroState } from '../../src/games/phantom-blade-zero/parse'
import {
  createSaveModel,
  type PbzEditableSlot
} from '../../src/games/phantom-blade-zero/model/saveModel'
import AddItemDialog from '../../src/games/phantom-blade-zero/views/AddItemDialog.vue'
import InventoryCategoryTab from '../../src/games/phantom-blade-zero/views/InventoryCategoryTab.vue'
import {
  useAddItemDialogController,
  useInventoryCategoryController
} from '../../src/games/phantom-blade-zero/views/itemViewController'
import { usePbzEditor } from '../../src/games/phantom-blade-zero/views/inject'
import {
  reconcileSlotSelection,
  requestSlotSelection
} from '../../src/games/phantom-blade-zero/views/slotSelection'
import { pbzViews } from '../../src/games/phantom-blade-zero/views'

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() }
}))

const SRC = join(__dirname, '../../src')

function source(relativePath: string): string {
  const path = join(SRC, relativePath)
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function slot(name: string, dirty = false): PbzEditableSlot {
  return {
    name,
    dirty,
    document: {
      Player: { Dust: 10 },
      Inventory: {
        InventoryInfos: {
          Weapon_Material_01: { CurrentAmount: 2, MaxAmount: 3 }
        }
      }
    }
  }
}

function stateWith(model = createSaveModel([slot('AutoSave1')])): PhantomBladeZeroState {
  return {
    relativePath: 'PBZSaveGame.sav',
    container: { outerHeader: new Uint8Array(), directoryBlock: new Uint8Array(), slots: [] },
    model
  }
}

interface MemoryNode {
  type: string
  props: Record<string, unknown>
  children: MemoryNode[]
  parent: MemoryNode | null
  text: string
}

function memoryNode(type: string, text = ''): MemoryNode {
  return { type, props: {}, children: [], parent: null, text }
}

const memoryRenderer = createRenderer<MemoryNode, MemoryNode>({
  patchProp(element, key, _previous, next) {
    if (next === null || next === undefined) delete element.props[key]
    else element.props[key] = next
  },
  insert(child, parent, anchor) {
    child.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index < 0) parent.children.push(child)
    else parent.children.splice(index, 0, child)
  },
  remove(child) {
    const parent = child.parent
    if (!parent) return
    const index = parent.children.indexOf(child)
    if (index >= 0) parent.children.splice(index, 1)
    child.parent = null
  },
  createElement(type) {
    return memoryNode(type)
  },
  createText(text) {
    return memoryNode('#text', text)
  },
  createComment(text) {
    return memoryNode('#comment', text)
  },
  setText(node, text) {
    node.text = text
  },
  setElementText(node, text) {
    node.text = text
    node.children = []
  },
  parentNode(node) {
    return node.parent
  },
  nextSibling(node) {
    const parent = node.parent
    if (!parent) return null
    return parent.children[parent.children.indexOf(node) + 1] ?? null
  },
  querySelector() {
    return null
  },
  setScopeId() {},
  cloneNode(node) {
    return {
      ...node,
      props: { ...node.props },
      children: [...node.children],
      parent: null
    }
  },
  insertStaticContent(content, parent, anchor) {
    const node = memoryNode('#static', content)
    node.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index < 0) parent.children.push(node)
    else parent.children.splice(index, 0, node)
    return [node, node]
  }
})

const DialogStub = defineComponent({
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    return () => h('dialog-stub', {
      open: props.modelValue,
      onUpdateModelValue: (value: boolean) => emit('update:modelValue', value)
    }, props.modelValue ? [slots.default?.(), slots.footer?.()] : [])
  }
})

const SelectStub = defineComponent({
  props: { modelValue: { type: String, default: null }, remoteMethod: Function },
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    return () => h('select-stub', {
      value: props.modelValue,
      onUpdateModelValue: (value: string) => emit('update:modelValue', value),
      onSearch: (query: string) => props.remoteMethod?.(query)
    }, slots.default?.())
  }
})

const InputNumberStub = defineComponent({
  props: { modelValue: Number },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('input-number-stub', {
      value: props.modelValue,
      onUpdateModelValue: (value: number) => emit('update:modelValue', value)
    })
  }
})

const ButtonStub = defineComponent({
  setup(_, { attrs, slots }) {
    return () => h('button-stub', attrs, slots.default?.())
  }
})

const TableStub = defineComponent({
  props: { data: { type: Array, default: () => [] } },
  setup(props) {
    return () => h('table-stub', { data: props.data }, JSON.stringify(props.data))
  }
})

const AlertStub = defineComponent({
  props: { title: String },
  setup(props) {
    return () => h('alert-stub', { title: props.title }, props.title)
  }
})

const PassThroughStub = defineComponent({
  setup(_, { slots }) {
    return () => h('passthrough-stub', null, slots.default?.())
  }
})

function mountMemory(component: Component, state: PhantomBladeZeroState): {
  root: MemoryNode
  rev: Ref<number>
  mutateCount: () => number
} {
  const root = memoryNode('root')
  const rev = ref(0)
  let mutations = 0
  const app = memoryRenderer.createApp(component)
  app.provide(Symbol.for('v-scx'), { modules: new Set<string>() })
  app.provide('savesmithState', () => state)
  app.provide('savesmithMutate', (fn: (value: unknown) => unknown) => {
    mutations++
    fn(state)
    rev.value++
  })
  app.provide('savesmithRev', rev)
  app.component('ElDialog', DialogStub)
  app.component('ElSelect', SelectStub)
  app.component('ElInputNumber', InputNumberStub)
  app.component('ElButton', ButtonStub)
  app.component('ElTable', TableStub)
  app.component('ElAlert', AlertStub)
  for (const name of [
    'ElForm',
    'ElFormItem',
    'ElInput',
    'ElOption',
    'ElEmpty',
    'ElTableColumn'
  ]) {
    app.component(name, PassThroughStub)
  }
  app.mount(root)
  return { root, rev, mutateCount: () => mutations }
}

function findNode(root: MemoryNode, type: string): MemoryNode {
  if (root.type === type) return root
  for (const child of root.children) {
    const found = findNodeOrNull(child, type)
    if (found) return found
  }
  throw new Error(`Missing memory node: ${type}`)
}

function findNodeOrNull(root: MemoryNode, type: string): MemoryNode | null {
  if (root.type === type) return root
  for (const child of root.children) {
    const found = findNodeOrNull(child, type)
    if (found) return found
  }
  return null
}

function nodeText(root: MemoryNode): string {
  return root.text + root.children.map(nodeText).join('')
}

function findButton(root: MemoryNode, label: string): MemoryNode {
  const visit = (node: MemoryNode): MemoryNode | null => {
    if (node.type === 'button-stub' && nodeText(node).includes(label)) return node
    for (const child of node.children) {
      const found = visit(child)
      if (found) return found
    }
    return null
  }
  const found = visit(root)
  if (!found) throw new Error(`Missing button: ${label}`)
  return found
}

function emit(node: MemoryNode, event: string, value?: unknown): void {
  const handler = node.props[event]
  if (typeof handler !== 'function') throw new Error(`Missing event ${event} on ${node.type}`)
  handler(value)
}

function runtimeSlot(
  name: string,
  traversingAmount = 2,
  materialId = 'Weapon_Material_01'
): PbzEditableSlot {
  const record = (amount: number, maxAmount: number) => ({
    CurrentAmount: amount,
    MaxAmount: maxAmount,
    FirstAddTime: '2026.10.30-18.20.30',
    DirtyTime: '2026.10.30-18.20.30',
    AcquiredCycle: 1
  })
  return {
    name,
    dirty: false,
    document: {
      Player: { Dust: 10 },
      Inventory: {
        InventoryInfos: {
          Item_Traversing: record(traversingAmount, 99),
          [materialId]: record(2, 3)
        }
      }
    }
  }
}

function inventoryInfos(editable: PbzEditableSlot): Record<string, Record<string, unknown>> {
  return (editable.document.Inventory as Record<string, Record<string, unknown>>).InventoryInfos
}

const AddControllerHarness = defineComponent({
  props: {
    modelValue: { type: Boolean, required: true },
    category: { type: String as PropType<'weapon-material' | 'consumable'>, required: true },
    slot: { type: Object as PropType<PbzEditableSlot>, required: true }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const open = computed({
      get: () => props.modelValue,
      set: (value: boolean) => emit('update:modelValue', value)
    })
    const controller = useAddItemDialogController(props, open)
    return () => h('dialog-stub', { open: open.value }, open.value ? [
      h('select-stub', {
        value: controller.selectedId.value,
        draft: controller.selectedId.value ?? '__empty__',
        onUpdateModelValue: (value: string) => {
          controller.selectedId.value = value
        }
      }),
      h('input-number-stub', {
        value: controller.amount.value,
        onUpdateModelValue: (value: number) => {
          controller.amount.value = value
        }
      }),
      h('button-stub', { onClick: controller.confirmAdd }, t('pbz.resources.confirm'))
    ] : [])
  }
})

const InventoryControllerHarness = defineComponent({
  props: {
    category: { type: String as PropType<'weapon-material' | 'consumable'>, required: true },
    slot: { type: Object as PropType<PbzEditableSlot>, required: true }
  },
  setup(props) {
    const controller = useInventoryCategoryController(props)
    return () => h('inventory-stub', null, [
      h('button-stub', null, t('pbz.resources.addItem')),
      h('table-stub', { data: controller.rows.value }, JSON.stringify(controller.rows.value))
    ])
  }
})

function mountAddDialog(state: PhantomBladeZeroState, initialSlot: PbzEditableSlot) {
  const open = ref(false)
  const activeSlot = ref(initialSlot)
  const Root = defineComponent({
    setup() {
      return () => h(AddControllerHarness, {
        modelValue: open.value,
        'onUpdate:modelValue': (value: boolean) => {
          open.value = value
        },
        category: 'consumable',
        slot: activeSlot.value
      })
    }
  })
  return { ...mountMemory(Root, state), open, activeSlot }
}

async function openAddDialog(root: MemoryNode, open: Ref<boolean>): Promise<void> {
  open.value = true
  await nextTick()
  expect(findNode(root, 'dialog-stub').props.open).toBe(true)
}

function fillAddDialog(root: MemoryNode, id: string, amount: number): void {
  emit(findNode(root, 'select-stub'), 'onUpdateModelValue', id)
  emit(findNode(root, 'input-number-stub'), 'onUpdateModelValue', amount)
}

describe('usePbzEditor', () => {
  it('throws PBZ_EDITOR_INJECT when provide is missing', () => {
    const app = createApp({ setup() { return () => null } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(() => app.runWithContext(() => usePbzEditor())).toThrow('PBZ_EDITOR_INJECT')
      expect(warn.mock.calls.map(([message]) => message)).toEqual([
        '[Vue warn]: injection "savesmithState" not found.',
        '[Vue warn]: injection "savesmithMutate" not found.',
        '[Vue warn]: injection "savesmithRev" not found.'
      ])
    } finally {
      warn.mockRestore()
    }
  })

  it('tracks the latest state and markDirty calls mutate exactly once', () => {
    let current = stateWith()
    const next = stateWith()
    let mutateCount = 0
    const app = createApp({ setup() { return () => null } })
    app.provide('savesmithState', () => current)
    app.provide('savesmithMutate', (fn: (value: unknown) => unknown) => {
      mutateCount++
      current = fn(current) as PhantomBladeZeroState
    })
    app.provide('savesmithRev', { value: 0 })

    app.runWithContext(() => {
      const editor = usePbzEditor()
      expect(editor.save).toBe(current)
      current = next
      expect(editor.save).toBe(next)
      editor.markDirty(() => {
        current.model.slots[0]!.dirty = true
      })
      expect(mutateCount).toBe(1)
      expect(current.model.slots[0]!.dirty).toBe(true)
    })
  })
})

describe('PBZ slot selection', () => {
  it('does nothing and does not confirm when selecting the current slot', () => {
    const model = createSaveModel([slot('AutoSave1'), slot('ManualSave2')])
    model.selectedSlotName = 'AutoSave1'
    const confirm = vi.fn(() => true)

    expect(requestSlotSelection(model, 'AutoSave1', confirm)).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
    expect(model.selectedSlotName).toBe('AutoSave1')
  })

  it('switches directly from a clean slot', () => {
    const model = createSaveModel([slot('AutoSave1'), slot('ManualSave2')])
    model.selectedSlotName = 'AutoSave1'
    const confirm = vi.fn(() => true)

    expect(requestSlotSelection(model, 'ManualSave2', confirm)).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
    expect(model.selectedSlotName).toBe('ManualSave2')
  })

  it('confirms before leaving a dirty slot and retains its edits', () => {
    const dirty = slot('AutoSave1', true)
    ;(dirty.document.Player as Record<string, unknown>).Dust = 88
    const model = createSaveModel([dirty, slot('ManualSave2')])
    model.selectedSlotName = dirty.name
    const confirm = vi.fn(() => true)

    expect(requestSlotSelection(model, 'ManualSave2', confirm)).toBe(true)
    expect(confirm).toHaveBeenCalledOnce()
    expect(confirm.mock.calls[0]![0]).toMatch(/保留|retain/i)
    expect(model.selectedSlotName).toBe('ManualSave2')
    expect(dirty.dirty).toBe(true)
    expect((dirty.document.Player as Record<string, unknown>).Dust).toBe(88)
  })

  it('keeps the current slot and selector value when dirty switch is cancelled', () => {
    const dirty = slot('AutoSave1', true)
    const model = createSaveModel([dirty, slot('ManualSave2')])
    model.selectedSlotName = dirty.name

    expect(requestSlotSelection(model, 'ManualSave2', () => false)).toBe(false)
    expect(model.selectedSlotName).toBe('AutoSave1')
    expect(dirty.dirty).toBe(true)
  })

  it('restores a still-valid local selection into a clean replacement model', () => {
    const model = createSaveModel([
      slot('AutoSave1'),
      slot('ManualSave2')
    ])

    expect(reconcileSlotSelection(model, 'ManualSave2')).toBe('ManualSave2')
    expect(model.selectedSlotName).toBe('ManualSave2')
    expect(model.slots.every(({ dirty }) => !dirty)).toBe(true)
  })

  it('falls back when the local selection no longer exists', () => {
    const model = createSaveModel([slot('AutoSave1')])

    expect(reconcileSlotSelection(model, 'ManualSave2')).toBe('AutoSave1')
    expect(model.selectedSlotName).toBe('AutoSave1')
  })
})

describe('PBZ item view runtime behavior', () => {
  it('mounts the actual SFCs with the Element Plus event controls wired', async () => {
    setLocale('zh')
    const editable = runtimeSlot('AutoSave1')
    const state = stateWith(createSaveModel([editable]))
    const app = createSSRApp(defineComponent({
      setup() {
        return () => h('div', null, [
          h(AddItemDialog, {
            modelValue: true,
            'onUpdate:modelValue': () => {},
            category: 'consumable',
            slot: editable
          }),
          h(InventoryCategoryTab, {
            category: 'weapon-material',
            slot: editable
          })
        ])
      }
    }))
    app.provide('savesmithState', () => state)
    app.provide('savesmithMutate', (fn: (value: unknown) => unknown) => fn(state))
    app.provide('savesmithRev', ref(0))
    app.component('ElDialog', DialogStub)
    app.component('ElSelect', SelectStub)
    app.component('ElInputNumber', InputNumberStub)
    app.component('ElButton', ButtonStub)
    app.component('ElTable', TableStub)
    app.component('ElAlert', AlertStub)
    for (const name of [
      'ElForm',
      'ElFormItem',
      'ElInput',
      'ElOption',
      'ElEmpty',
      'ElTableColumn'
    ]) {
      app.component(name, PassThroughStub)
    }

    const html = await renderToString(app)

    expect(html).toContain('select-stub')
    expect(html).toContain('input-number-stub')
    expect(html).toContain('确认添加')
    expect(html).toContain('铸造金属')
  })

  it('closes after a successful existing-item add without creating a duplicate key', async () => {
    setLocale('zh')
    const editable = runtimeSlot('AutoSave1')
    const state = stateWith(createSaveModel([editable]))
    const mounted = mountAddDialog(state, editable)

    await openAddDialog(mounted.root, mounted.open)
    fillAddDialog(mounted.root, 'Item_Traversing', 3)
    emit(findButton(mounted.root, '确认添加'), 'onClick')
    await nextTick()

    const infos = inventoryInfos(editable)
    expect(mounted.open.value).toBe(false)
    expect(infos.Item_Traversing).toMatchObject({ CurrentAmount: 5, MaxAmount: 99 })
    expect(Object.keys(infos).filter((id) => id === 'Item_Traversing')).toHaveLength(1)
    expect(mounted.mutateCount()).toBe(1)
  })

  it('keeps the dialog open and displays a model overflow error', async () => {
    setLocale('zh')
    vi.mocked(ElMessage.error).mockClear()
    const editable = runtimeSlot('AutoSave1')
    const state = stateWith(createSaveModel([editable]))
    const mounted = mountAddDialog(state, editable)

    await openAddDialog(mounted.root, mounted.open)
    fillAddDialog(mounted.root, 'Item_Traversing', 98)
    emit(findButton(mounted.root, '确认添加'), 'onClick')
    await nextTick()

    expect(mounted.open.value).toBe(true)
    expect(inventoryInfos(editable).Item_Traversing).toMatchObject({ CurrentAmount: 2 })
    expect(vi.mocked(ElMessage.error)).toHaveBeenCalledOnce()
    expect(vi.mocked(ElMessage.error).mock.calls[0]![0]).toEqual(expect.any(String))
  })

  it('recomputes and renders catalog rows after an explicit host locale switch', async () => {
    setLocale('zh')
    const editable = runtimeSlot('AutoSave1')
    const state = stateWith(createSaveModel([editable]))
    const Root = defineComponent({
      setup() {
        return () => h(InventoryControllerHarness, {
          category: 'weapon-material',
          slot: editable
        })
      }
    })
    const { root } = mountMemory(Root, state)
    const table = findNode(root, 'table-stub')
    const zhRows = table.props.data as Array<{ name: string }>

    expect(zhRows[0]!.name).toBe('铸造金属')
    expect(nodeText(root)).toContain('添加物品')

    setLocale('en')
    await nextTick()
    const enRows = table.props.data as Array<{ name: string }>

    expect(enRows).not.toBe(zhRows)
    expect(enRows[0]!.name).toBe('铸造金属')
    expect(nodeText(root)).toContain('Add item')
  })

  it('closes and resets a draft when the selected slot prop changes', async () => {
    setLocale('zh')
    const first = runtimeSlot('AutoSave1')
    const second = runtimeSlot('ManualSave2')
    const state = stateWith(createSaveModel([first, second]))
    const mounted = mountAddDialog(state, first)

    await openAddDialog(mounted.root, mounted.open)
    fillAddDialog(mounted.root, 'Item_Traversing', 4)
    mounted.activeSlot.value = second
    await nextTick()

    expect(mounted.open.value).toBe(false)
    expect(inventoryInfos(first).Item_Traversing).toMatchObject({ CurrentAmount: 2 })
    expect(inventoryInfos(second).Item_Traversing).toMatchObject({ CurrentAmount: 2 })

    await openAddDialog(mounted.root, mounted.open)
    expect(findNode(mounted.root, 'select-stub').props.draft).toBe('__empty__')
    expect(findNode(mounted.root, 'input-number-stub').props.value).toBe(1)
    fillAddDialog(mounted.root, 'Item_Traversing', 1)
    emit(findButton(mounted.root, '确认添加'), 'onClick')
    await nextTick()

    expect(inventoryInfos(first).Item_Traversing).toMatchObject({ CurrentAmount: 2 })
    expect(inventoryInfos(second).Item_Traversing).toMatchObject({ CurrentAmount: 3 })
  })
})

describe('PBZ views', () => {
  it('registers the single resources view', () => {
    expect(pbzViews).toHaveLength(1)
    expect(pbzViews[0]).toMatchObject({ id: 'resources', labelKey: 'pbz.tabs.resources' })
  })

  it('integrates named weapon-material and consumable category tabs', () => {
    const text = source('games/phantom-blade-zero/views/ResourcesTab.vue')
    expect(text).toMatch(/InventoryCategoryTab/)
    expect(text).toMatch(/weapon-material/)
    expect(text).toMatch(/consumable/)
    expect(text).toMatch(/projectResources/)
    expect(text).toMatch(/setDust/)
    expect(text).toMatch(/markDirty/)
  })

  it('projects and filters existing category rows through catalog names', () => {
    const component = source('games/phantom-blade-zero/views/InventoryCategoryTab.vue')
    const text = source('games/phantom-blade-zero/views/itemViewController.ts')
    expect(text).toMatch(/projectInventory/)
    expect(text).toMatch(/pbzItemName/)
    expect(text).toMatch(/getPbzItem/)
    expect(text).toMatch(/setInventoryAmount/)
    expect(text).toMatch(/markDirty/)
    expect(text).toMatch(/item\.zh/)
    expect(text).toMatch(/item\.en/)
    expect(component).toMatch(/AddItemDialog/)
    expect(component).toMatch(/useInventoryCategoryController/)
    expect(component).toMatch(/@update:model-value/)
  })

  it('searches the category catalog and adds through the model mutator', () => {
    const component = source('games/phantom-blade-zero/views/AddItemDialog.vue')
    const text = source('games/phantom-blade-zero/views/itemViewController.ts')
    expect(text).toMatch(/searchPbzItems/)
    expect(text).toMatch(/addInventoryItem/)
    expect(text).toMatch(/maxAmount/)
    expect(text).toMatch(/markDirty/)
    expect(text).toMatch(/Number\.isSafeInteger/)
    expect(component).toMatch(/useAddItemDialogController/)
    expect(component).toMatch(/v-model="selectedId"/)
    expect(component).toMatch(/@click="confirmAdd"/)
  })

  it('keeps the add dialog open and reports model errors', () => {
    const text = source('games/phantom-blade-zero/views/itemViewController.ts')
    expect(text).toMatch(
      /try\s*{[\s\S]*markDirty[\s\S]*open\.value\s*=\s*false[\s\S]*catch[\s\S]*ElMessage\.error/
    )
  })

  it('keeps PBZ item components away from documents and filesystem APIs', () => {
    for (const file of [
      'ResourcesTab.vue',
      'InventoryCategoryTab.vue',
      'AddItemDialog.vue',
      'itemViewController.ts'
    ]) {
      const text = source(`games/phantom-blade-zero/views/${file}`)
      expect(text, file).not.toMatch(
        /(?:\.document\b|\[['"]document['"]\])\s*(?:=|\.|\[)/
      )
      expect(text, file).not.toMatch(/@tauri|node:fs|from\s+['"]fs['"]/)
      expect(text, file).not.toMatch(
        /v-model\s*=\s*["'][^"']*(document|save|model)/
      )
    }
  })

  it('switches slots outside markDirty and limits options to editable model slots', () => {
    const text = readFileSync(
      join(SRC, 'games/phantom-blade-zero/views/ResourcesTab.vue'),
      'utf8'
    )
    expect(text).toMatch(/requestSlotSelection/)
    expect(text).toMatch(/selectedSlotName/)
    expect(text).toMatch(/model\.slots/)
    expect(text).toMatch(/AutoSave|isEditableSlotName/)
    expect(text).not.toMatch(/markDirty\([^)]*requestSlotSelection/s)
  })

  it('reconciles local slot selection on editor revision without marking dirty', () => {
    const text = readFileSync(
      join(SRC, 'games/phantom-blade-zero/views/ResourcesTab.vue'),
      'utf8'
    )
    expect(text).toMatch(/watch\s*\(/)
    expect(text).toMatch(/editor\.rev/)
    expect(text).toMatch(/reconcileSlotSelection/)
    expect(text).not.toMatch(
      /markDirty\([^)]*reconcileSlotSelection/s
    )
  })
})
