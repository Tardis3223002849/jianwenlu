<script setup lang="ts">
import { computed, ref } from 'vue'
import { KIND_META, type CatalogItem } from '../lib/types'

const props = defineProps<{
  item: CatalogItem
  owned: boolean
  watchedCount?: number
}>()
const emit = defineEmits<{ press: [item: CatalogItem] }>()

const meta = computed(() => KIND_META[props.item.kind])
const episodic = computed(() => meta.value.episodic)
const total = computed(() => props.item.totalEpisodes ?? 0)
const hasProgress = computed(() => props.watchedCount !== undefined && props.watchedCount > 0)
const imgFailed = ref(false)
const showImg = computed(
  () => !!props.item.posterUrl && !imgFailed.value,
)
</script>

<template>
  <div
    class="select-card"
    :class="{ owned }"
    role="button"
    tabindex="0"
    @click="emit('press', item)"
  >
    <div class="select-poster">
      <img
        v-if="showImg"
        :src="item.posterUrl"
        :alt="item.title"
        loading="lazy"
        class="poster-img"
        @error="imgFailed = true"
      />
      <template v-else>
        <span class="poster-glyph">{{ meta.glyph }}</span>
        <span v-if="item.year" class="poster-year">{{ item.year }}</span>
      </template>
      <span v-if="owned" class="stamp-seal poster-stamp">已入藏</span>
    </div>
    <div class="min-w-0 flex-1">
      <p class="press truncate text-[13.5px] font-semibold">{{ item.title }}</p>
      <p class="truncate text-[10.5px]" style="color: var(--ink-faint)">
        {{ [item.creator, item.year].filter(Boolean).join(' · ') || '—' }}
      </p>
      <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
        <span
          v-if="episodic || total > 0"
          class="chip !px-1.5 !py-0 !text-[9.5px]"
          :style="total ? '' : 'color: var(--ink-faint)'"
          >{{ episodic ? `共 ${total || '?'} 集` : `共 ${total} 卷` }}</span
        >
        <span
          v-if="hasProgress"
          class="text-[10px]"
          style="color: var(--oxblood)"
          >已看 {{ watchedCount }}/{{ total }}</span
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: linear-gradient(160deg, rgba(255, 250, 235, 0.6), transparent 50%), var(--card);
  box-shadow: 0 2px 5px -3px rgba(52, 40, 27, 0.4);
  cursor: pointer;
  transition: box-shadow 0.12s ease, transform 0.08s ease;
}
.select-card:active {
  transform: scale(0.985);
}
.select-card.owned {
  box-shadow: 0 0 0 1.5px rgba(140, 47, 47, 0.55) inset;
  background: linear-gradient(160deg, rgba(140, 47, 47, 0.1), transparent 55%), var(--card);
}
.select-poster {
  position: relative;
  width: 44px;
  height: 58px;
  flex-shrink: 0;
  border-radius: 2px;
  border: 1px solid rgba(75, 56, 38, 0.35);
  background:
    linear-gradient(155deg, rgba(255, 244, 214, 0.55), transparent 55%),
    repeating-linear-gradient(0deg, transparent 0 7px, rgba(75, 56, 38, 0.05) 7px 8px),
    linear-gradient(180deg, #c9b68e, #b39a6d);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  box-shadow:
    inset 0 0 0 2px rgba(75, 56, 38, 0.12),
    2px 3px 4px -2px rgba(52, 40, 27, 0.5);
}
.poster-glyph {
  font-size: 18px;
  font-weight: 900;
  color: rgba(75, 56, 38, 0.85);
}
.poster-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 2px;
}
.poster-year {
  font-size: 7.5px;
  letter-spacing: 0.1em;
  color: rgba(75, 56, 38, 0.6);
}
.poster-stamp {
  position: absolute;
  right: -7px;
  bottom: -7px;
  width: 34px;
  height: 34px;
  font-size: 8.5px;
  letter-spacing: 0.05em;
}
</style>
