<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { KIND_META, statusLabel } from '../lib/types'
import { useLibrary } from '../stores/library'

const router = useRouter()
const lib = useLibrary()

const selected = ref<Set<string>>(new Set())

const allRows = computed(() => lib.entryList)

const rows = computed(() =>
  allRows.value.map((x) => ({ ...x, checked: selected.value.has(x.item.id) })),
)

const count = computed(() => selected.value.size)
const allChecked = computed(
  () => allRows.value.length > 0 && selected.value.size === allRows.value.length,
)

function toggleAll() {
  if (allChecked.value) selected.value = new Set()
  else selected.value = new Set(allRows.value.map((x) => x.item.id))
}

function toggle(id: string) {
  const s = new Set(selected.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selected.value = s
}

function markDone() {
  const ids = [...selected.value]
  if (!ids.length) return
  lib.setStatusMany(ids, 'done')
  selected.value = new Set()
  window.alert(`已将 ${ids.length} 件登记为看完`)
  router.push('/')
}
</script>

<template>
  <div class="page pb-28">
    <header class="flex items-center gap-3 pt-2 pb-1">
      <a href="#" class="text-[13px]" style="color: var(--ink-faint)" @click.prevent="router.back()">← 返回</a>
      <h1 class="press m-0 flex items-center gap-2 text-[19px] font-black">
        <span class="stamp-seal" style="width: 30px; height: 30px; font-size: 16px">盘</span>
        批量盘点
      </h1>
      <span class="ml-auto chip">{{ allRows.length }} 件 · 已选 {{ count }}</span>
    </header>

    <p class="mt-3 mb-4 text-[12.5px] leading-6" style="color: var(--ink-soft)">
      像图书馆点检馆藏一般：勾选你已观赏过的每一件，最后统一钤上「看完」之章。
    </p>

    <div class="mb-4 flex items-center justify-between">
      <button class="btn btn-ghost !py-1.5 !px-4 !text-[12.5px]" @click="toggleAll">
        {{ allChecked ? '取消全选' : '全选' }}
      </button>
      <span v-if="allRows.length" class="text-[11.5px]" style="color: var(--ink-faint)">
        {{ selected.size }} 件待登记
      </span>
    </div>

    <div v-if="rows.length" class="flex flex-col gap-2.5">
      <label
        v-for="x in rows"
        :key="x.item.id"
        class="grain-card flex cursor-pointer items-center gap-3 px-3 py-2.5"
        :class="{ 'ring-1': x.checked }"
        style="--tw-ring-color: rgba(140, 47, 47, 0.4)"
      >
        <input type="checkbox" class="cb" :checked="x.checked" @change="toggle(x.item.id)" />
        <div class="poster-box h-12 w-9 shrink-0">
          <img
            v-if="x.item.posterUrl"
            :src="x.item.posterUrl"
            :alt="x.item.title"
            loading="lazy"
            class="h-full w-full object-cover"
          />
          <div v-else class="flex h-full w-full items-center justify-center text-[13px] font-bold" style="color: var(--ink-faint)">
            {{ KIND_META[x.item.kind].glyph }}
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <p class="press m-0 truncate text-[14.5px] font-semibold">{{ x.item.title }}</p>
          <p class="m-0 mt-0.5 text-[11.5px]" style="color: var(--ink-faint)">
            {{ KIND_META[x.item.kind].label }} · {{ [x.item.year, x.item.creator].filter(Boolean).join(' · ') || '—' }}
          </p>
        </div>
        <span class="chip shrink-0 !text-[10.5px]">{{ statusLabel(x.item.kind, x.entry.status) }}</span>
      </label>
    </div>

    <p
      v-else
      class="grain-card ruled mt-6 px-6 py-10 text-center text-[13px]"
      style="color: var(--ink-faint)"
    >
      登记册还空着。先去检索台收几册，再来点检。
    </p>

    <div v-if="rows.length" class="batch-bar">
      <button class="btn w-full !py-3 !text-[14px]" :disabled="!count" @click="markDone">
        钤章完成 · 已选 {{ count }} 件
      </button>
    </div>
  </div>
</template>

<style scoped>
.cb {
  width: 22px;
  height: 22px;
  appearance: none;
  -webkit-appearance: none;
  border: 1.5px solid var(--walnut);
  border-radius: 3px;
  background: rgba(255, 251, 238, 0.7);
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
}
.cb:checked {
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.3), transparent 55%), var(--oxblood);
  border-color: #6e2323;
  mix-blend-mode: multiply;
}
.cb:checked::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f7ead2;
  font-size: 14px;
  font-weight: 700;
}
.batch-bar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(64px + env(safe-area-inset-bottom));
  width: 100%;
  max-width: 688px;
  padding: 0 16px;
  z-index: 30;
}
</style>
