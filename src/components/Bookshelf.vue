<script setup lang="ts">
import { computed } from 'vue'
import { KIND_META, KIND_ORDER, type Kind } from '../lib/types'
import { useLibrary } from '../stores/library'

const lib = useLibrary()

const SPINE_COLORS: Record<Kind, string> = {
  movie: '#7a3b2e',
  tv: '#2f4a3c',
  musical: '#5b3a55',
  play: '#8a6d3b',
  drama: '#24425a',
  novel: '#3e3a58',
  prose: '#3c5a4a',
  poetry: '#4a3b5a',
  anime: '#2f4f4f',
}

const shelves = computed(() =>
  KIND_ORDER.map((k) => {
    const rows = lib.entryList.filter((x) => x.item.kind === k)
    return { kind: k, rows }
  }),
)

function spineWidth(title: string): string {
  const w = title.length * 11
  return `${Math.min(26, Math.max(15, w))}px`
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <section v-for="s in shelves" :key="s.kind" class="shelf-unit">
      <div class="flex items-center justify-between">
        <RouterLink :to="`/kind/${s.kind}`" class="shelf-label">
          <span>{{ KIND_META[s.kind].glyph }}</span>
          <span>{{ KIND_META[s.kind].label }}架</span>
          <span class="opacity-70">{{ s.rows.length }} 册</span>
        </RouterLink>
        <RouterLink
          v-if="s.rows.length"
          :to="`/item/${s.rows[s.rows.length - 1].item.id}`"
          class="text-[11px]"
          style="color: var(--ink-faint)"
          >最后一册 →</RouterLink
        >
      </div>

      <div class="shelf-plank">
        <div v-if="s.rows.length" class="books-rack">
          <RouterLink
            v-for="x in s.rows"
            :key="x.item.id"
            :to="`/item/${x.item.id}`"
            class="book-spine"
            :class="{ done: x.entry.status === 'done' }"
            :style="{
              width: spineWidth(x.item.title),
              background: SPINE_COLORS[s.kind],
            }"
          >
            <span class="spine-text">{{ x.item.title }}</span>
          </RouterLink>
        </div>
        <div v-else class="books-rack empty">
          <span class="shelf-empty">此架尚空 · 待一册入藏</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.shelf-unit {
  border: 1px solid var(--line);
  border-radius: 4px;
  background: linear-gradient(165deg, rgba(255, 244, 214, 0.55), transparent 55%), var(--paper-deep);
  padding: 10px;
  box-shadow: 0 8px 14px -12px rgba(52, 40, 27, 0.55);
}

.shelf-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: linear-gradient(var(--walnut), var(--walnut-deep));
  color: var(--gold-bright);
  font-size: 12px;
  letter-spacing: 0.22em;
  padding: 4px 12px;
  border-radius: 3px;
  text-decoration: none;
  box-shadow: 0 2px 0 rgba(52, 40, 27, 0.6);
  text-indent: 0.22em;
}

.shelf-plank {
  margin-top: 8px;
  padding: 12px 10px;
  border-radius: 3px;
  background:
    linear-gradient(0deg, rgba(0, 0, 0, 0.12), transparent 40%, rgba(0, 0, 0, 0.05)),
    repeating-linear-gradient(90deg, transparent 0 38px, rgba(0, 0, 0, 0.06) 38px 40px),
    linear-gradient(#7d5c3b, #6a4d31);
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.4),
    inset 0 -2px 3px rgba(0, 0, 0, 0.3),
    0 3px 5px -3px rgba(0, 0, 0, 0.5);
}

.books-rack {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  min-height: 92px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.books-rack.empty {
  align-items: center;
  justify-content: center;
  min-height: 60px;
}

.book-spine {
  position: relative;
  flex-shrink: 0;
  height: 84px;
  border-radius: 2px 2px 3px 3px;
  text-decoration: none;
  box-shadow:
    inset -2px 0 2px rgba(0, 0, 0, 0.22),
    inset 2px 0 1px rgba(255, 255, 255, 0.14),
    0 2px 3px -1px rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease;
}

.book-spine:active {
  transform: translateY(2px) scale(0.97);
}

.book-spine::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 3px;
  border-radius: 2px;
  background: rgba(242, 232, 213, 0.75);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
}

.spine-text {
  writing-mode: vertical-rl;
  font-size: 11px;
  letter-spacing: 0.14em;
  color: rgba(247, 234, 210, 0.94);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
  max-height: 68px;
  overflow: hidden;
  white-space: nowrap;
}

.book-spine.done {
  opacity: 0.86;
}

.book-spine.done .spine-text {
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-color: rgba(247, 234, 210, 0.55);
}

.shelf-empty {
  font-size: 12px;
  letter-spacing: 0.3em;
  color: rgba(242, 232, 213, 0.7);
  text-indent: 0.3em;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.4);
}
</style>
