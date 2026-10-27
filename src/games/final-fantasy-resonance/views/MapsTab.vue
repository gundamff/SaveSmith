<script setup lang="ts">
import { computed } from 'vue'
import { t, locale } from '@host/i18n'
import { catalogLabel } from '../catalog/names'
import { setMapFlag } from '../model/saveModel'
import { useFfrEditor } from './inject'

const editor = useFfrEditor()

const rows = computed(() => {
  void editor.rev
  const loc = locale.value === 'zh' ? 'zh' : 'en'
  return editor.save.maps.map((m) => ({
    ...m,
    name: catalogLabel('map', m.mapId, loc)
  }))
})

function toggle(
  index: number,
  flag: 'bIsKnown' | 'bIsVisited' | 'bIsCleared',
  value: boolean
) {
  editor.markDirty(() => setMapFlag(editor.save, index, flag, value))
}
</script>

<template>
  <div class="ffr-maps" :data-ss-rev="editor.rev">
    <el-table :data="rows" stripe height="480">
      <el-table-column prop="name" :label="t('ffr.maps.name')" min-width="160" />
      <el-table-column :label="t('ffr.maps.known')" width="100">
        <template #default="{ row }">
          <el-switch
            :model-value="row.known"
            @change="(v: string | number | boolean) => toggle(row.index, 'bIsKnown', Boolean(v))"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.maps.visited')" width="100">
        <template #default="{ row }">
          <el-switch
            :model-value="row.visited"
            @change="(v: string | number | boolean) => toggle(row.index, 'bIsVisited', Boolean(v))"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.maps.cleared')" width="100">
        <template #default="{ row }">
          <el-switch
            :model-value="row.cleared"
            @change="(v: string | number | boolean) => toggle(row.index, 'bIsCleared', Boolean(v))"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
