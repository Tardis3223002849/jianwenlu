<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { KIND_META, statusLabel } from '../lib/types'
import type { CatalogItem, Entry } from '../lib/types'

const props = defineProps({
  item: { type: Object as PropType<CatalogItem>, required: true },
  entry: { type: Object as PropType<Entry>, required: false, default: undefined },
})

const meta = computed(() => KIND_META[props.item.kind])
const sub = computed(
  () =>
    [props.item.year, props.item.creator].filter(Boolean).join(' · ') ||
    props.item.originalTitle ||
    '',
)
</script>

<template>
  <RouterLink
    :to="`/item/${item.id}`"
    class="grain-card flex items-stretch gap-3 overflow-hidden p-2.5"
    style="text-decoration: none; color: inherit"
  >
    <div class="poster-box w-[68px] shrink-0 self-stretch min-h-[92px]">
      <img
        v-if="item.posterUrl"
        :src="item.posterUrl"
        :alt="item.title"
        loading="lazy"
        class="h-full w-full object-cover"
      />
      <div
        v-else
        class="flex h-full min-h-[92px] items-center justify-center text-2xl font-bold"
        style="color: var(--ink-faint)"
      >
        {{ meta.glyph }}
      </div>
    </div>
    <div class="flex min-w-0 flex-1 flex-col justify-between py-0.5">
      <div>
        <div class="flex items-center gap-1.5">
          <span
            class="stamp-seal shrink-0"
            style="width: 20px; height: 20px; font-size: 11px"
            >{{ meta.glyph }}</span
          >
          <p class="press truncate text-[15px] font-semibold">{{ item.title }}</p>
        </div>
        <p class="mt-1 truncate text-xs" style="color: var(--ink-soft)">{{ sub }}</p>
      </div>
      <div class="flex items-center justify-between">
        <span
          v-if="entry"
          class="chip !text-[11px]"
          >{{ statusLabel(item.kind, entry.status) }}</span
        >
        <span
          v-else-if="!entry"
          class="text-[11px]"
          style="color: var(--ink-faint)"
          >未登记</span
        >
        <span
          v-if="entry && entry.rating"
          class="text-[11px]"
          style="color: var(--oxblood)"
          >{{ '★'.repeat(entry.rating) }}</span
        >
      </div>
    </div>
  </RouterLink>
</template>
