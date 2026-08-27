<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { KIND_META, KIND_ORDER, type CatalogItem, type Kind } from '../lib/types'
import { SEED_CATALOG } from '../lib/catalog'
import { browseAnilist, type AniSort } from '../lib/sources'
import { useLibrary } from '../stores/library'
import SelectCard from '../components/SelectCard.vue'
import { coverFor } from '../lib/covers'

defineOptions({ name: 'CategoriesView' })

const lib = useLibrary()
const online = ref<Record<string, CatalogItem[]>>({})
const loading = ref(false)
const lastRefresh = ref('')
let refreshSeq = 0

// Poster URLs resolved from online sources (cache avoids refetching on every render)
const posterMap = ref<Record<string, string>>({})

// Per-kind rotation offset so each refresh shows a different batch
const batchOffset = ref<Record<string, number>>({})
KIND_ORDER.forEach((k) => (batchOffset.value[k] = 0))

const SORTS: Array<{ label: string; sort: AniSort }> = [
  { label: '热度榜', sort: 'POPULARITY_DESC' },
  { label: '评分榜', sort: 'SCORE_DESC' },
  { label: '新番趋势', sort: 'TRENDING_DESC' },
]
let sortIdx = 0
let page = 1
const sortLabel = ref(SORTS[0].label)

interface Row {
  kind: Kind
  items: CatalogItem[]
}

function toSeedItem(k: Kind, s: (typeof SEED_CATALOG)[Kind][number], i: number): CatalogItem {
  return {
    id: `seed-${k}-${i}`,
    kind: k,
    title: s.title,
    originalTitle: s.originalTitle || '',
    year: s.year || '',
    creator: s.creator || '',
    synopsis: s.synopsis || '',
    totalEpisodes: s.totalEpisodes,
    posterUrl: posterMap.value[`seed-${k}-${i}`] || undefined,
    source: 'manual' as const,
  }
}

const BATCH = 9

const sections = computed<Row[]>(() =>
  KIND_ORDER.map((k) => {
    const pool = SEED_CATALOG[k]
    const start = batchOffset.value[k] % pool.length
    const items: CatalogItem[] = []
    for (let n = 0; n < BATCH; n++) {
      const idx = (start + n) % pool.length
      items.push(toSeedItem(k, pool[idx], idx))
    }
    return { kind: k, items: [...items, ...(online.value[k] ?? [])] }
  }),
)

// Lazily resolve real poster URLs for the currently visible seed batch.
let coversHydrated = false
async function hydrateCovers() {
  if (coversHydrated) return
  coversHydrated = true
  const targets = sections.value.flatMap((sec) =>
    sec.items.filter((it) => !it.posterUrl && it.id.startsWith('seed-')),
  )
  await Promise.all(
    targets.map(async (it) => {
      const url = await coverFor(it)
      if (url) posterMap.value[it.id] = url
    }),
  )
}

function ownedBy(item: CatalogItem): boolean {
  return Object.values(lib.items).some(
    (x) => x.kind === item.kind && x.title === item.title,
  )
}

function findOwned(item: CatalogItem): string | undefined {
  const it = Object.values(lib.items).find((x) => x.kind === item.kind && x.title === item.title)
  return it?.id
}

async function refresh() {
  const seq = ++refreshSeq
  loading.value = true
  sortIdx = (sortIdx + 1) % SORTS.length
  const cur = SORTS[sortIdx]
  sortLabel.value = cur.label
  page = (page % 4) + 1
  // Rotate each kind to a new batch so previously shown works don't reappear
  KIND_ORDER.forEach((k) => {
    batchOffset.value[k] = (batchOffset.value[k] + BATCH) % SEED_CATALOG[k].length
  })
  const next: Record<string, CatalogItem[]> = {}
  const jobs: Array<[string, Promise<CatalogItem[]>]> = [
    ['anime', browseAnilist('ANIME', cur.sort, page)],
    ['novel', browseAnilist('MANGA', cur.sort, page)],
  ]
  await Promise.all(
    jobs.map(async ([k, p]) => {
      try {
        next[k] = await p
      } catch {
        next[k] = []
      }
    }),
  )
  if (seq !== refreshSeq) return
  online.value = next
  loading.value = false
  lastRefresh.value = new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function pressItem(item: CatalogItem) {
  const owned = findOwned(item)
  if (owned) {
    if (
      window.confirm(
        `「${item.title}」已在馆藏中（看完）。确定取消入藏、移出登记册吗？`,
      )
    ) {
      lib.removeEntry(owned)
    }
  } else {
    const id = lib.upsertItem(item)
    lib.setStatus(id, 'done')
  }
}

const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function episodesOf(item: CatalogItem): number[] {
  const owned = findOwned(item)
  if (!owned) return []
  const e = Object.values(lib.entries).find((x) => x.itemId === owned)
  return e?.episodes ?? []
}

function watchedCountOf(item: CatalogItem): number {
  return episodesOf(item).length
}

function toggleEpisode(item: CatalogItem, n: number) {
  const owned = findOwned(item)
  const id = owned ?? lib.upsertItem(item)
  const cur = episodesOf(item)
  // Prefix-style: tapping episode n selects 1..n; tapping again rolls back to n-1
  if (cur.includes(n)) {
    lib.setEpisodes(id, cur.filter((x) => x < n))
  } else {
    lib.setEpisodes(id, Array.from({ length: n }, (_, i) => i + 1))
  }
  const eps = episodesOf(item)
  const total = item.totalEpisodes ?? 0
  if (total > 0 && eps.length >= total) lib.setStatus(id, 'done')
  else if (eps.length > 0) lib.setStatus(id, 'active')
}

function markAllEpisodes(item: CatalogItem) {
  const id = lib.upsertItem(item)
  const total = item.totalEpisodes ?? 0
  const eps = Array.from({ length: total }, (_, i) => i + 1)
  lib.setEpisodes(id, eps)
  lib.setStatus(id, 'done')
}

function clearEpisodes(item: CatalogItem) {
  const owned = findOwned(item)
  if (!owned) return
  lib.setEpisodes(owned, [])
  lib.setStatus(owned, 'wish')
}

onMounted(() => {
  refresh()
  hydrateCovers()
})
</script>

<template>
  <div class="page pb-28">
    <header class="vault-header !pt-4 !pb-5">
      <h1 class="press m-0 text-[21px] font-black">分类 · 经典推荐</h1>
      <p class="mt-2 mb-0 text-[11.5px]" style="color: var(--ink-faint); letter-spacing: 0.3em">
        CATEGORIES & CLASSICS
      </p>
    </header>

    <div class="mb-3 flex items-center justify-between">
      <span class="text-[12.5px]" style="color: var(--ink-soft)">
        点击卡片即入藏（默认看完）· 再点弹窗取消 · <span v-if="loading" style="color: var(--ink-faint)"
          >刷新中…</span
        ><span v-else-if="lastRefresh" style="color: var(--ink-faint)"
          >{{ sortLabel }} · 榜单 {{ lastRefresh }}</span
        >
      </span>
      <button
        class="btn btn-ghost !py-1.5 !px-3 !text-[12px]"
        :disabled="loading"
        @click="refresh"
      >
        刷 新
      </button>
    </div>

    <section
      v-for="sec in sections"
      :key="sec.kind"
      class="cat-block"
    >
      <div class="flex items-center justify-between">
        <h2 class="press m-0 flex items-center gap-2 text-[15.5px] font-bold">
          <span
            class="stamp-seal"
            style="width: 24px; height: 24px; font-size: 12px"
            >{{ KIND_META[sec.kind].glyph }}</span
          >
          {{ KIND_META[sec.kind].label }}
          <span
            v-if="online[sec.kind]?.length"
            class="chip !px-1.5 !py-0 !text-[9.5px]"
            style="color: var(--ink-faint)"
            >+{{ online[sec.kind].length }} 在线</span
          >
        </h2>
        <RouterLink
          :to="`/kind/${sec.kind}?view=browse`"
          class="text-[11.5px]"
          style="color: var(--ink-faint)"
          >全库挑选 →</RouterLink
        >
      </div>

      <div class="mt-2 grid grid-cols-3 gap-2">
        <div
          v-for="it in sec.items.slice(0, 9)"
          :key="it.id"
          class="item-wrap"
        >
          <SelectCard
            :item="it"
            :owned="ownedBy(it)"
            :watched-count="episodesOf(it).length"
            @press="pressItem"
          />
          <div
            v-if="KIND_META[sec.kind].episodic || (it.totalEpisodes ?? 0) > 0"
            class="mt-1 flex items-center justify-between"
          >
            <button
              class="btn btn-ghost !py-0.5 !px-2.5 !text-[11px]"
              @click.stop="toggleExpand(it.id)"
            >
              {{ expandedId === it.id ? '收起点收 ▲' : KIND_META[sec.kind].episodic ? '逐集点收 ▼' : '逐卷点收 ▼' }}
            </button>
            <span
              v-if="ownedBy(it)"
              class="text-[10.5px]"
              style="color: var(--ink-soft)"
            >{{ watchedCountOf(it) }}/{{ it.totalEpisodes || '?' }} {{ KIND_META[sec.kind].episodic ? '集' : '卷' }}</span>
          </div>

          <div
            v-if="expandedId === it.id"
            class="mt-1.5 rounded-sm border p-2.5"
            style="border-color: var(--line); background: rgba(255, 251, 238, 0.5)"
          >
            <template v-if="(it.totalEpisodes ?? 0) > 0">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="n in it.totalEpisodes"
                  :key="n"
                  type="button"
                  class="ep-cell"
                  :class="{ on: episodesOf(it).includes(n) }"
                  @click="toggleEpisode(it, n)"
                >
                  {{ n }}
                </button>
              </div>
              <div class="mt-2 flex gap-2">
                <button class="btn !py-1 !px-3 !text-[11.5px]" @click="markAllEpisodes(it)">
                  {{ KIND_META[sec.kind].episodic ? '全部看完' : '全卷读完' }}
                </button>
                <button
                  class="btn btn-ghost !py-1 !px-3 !text-[11.5px]"
                  @click="clearEpisodes(it)"
                >
                  清空点收
                </button>
              </div>
            </template>
            <p
              v-else
              class="m-0 text-[11.5px]"
              style="color: var(--ink-faint)"
            >
              {{ KIND_META[sec.kind].episodic ? '集数未知，可到详情页登记总集数后点收。' : '卷数未知，可到详情页登记后点收。' }}
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cat-block {
  border: 1px solid var(--line);
  border-radius: 5px;
  background: linear-gradient(165deg, rgba(255, 244, 214, 0.5), transparent 55%), var(--paper-deep);
  padding: 12px;
  margin-bottom: 14px;
  box-shadow: 0 8px 14px -12px rgba(52, 40, 27, 0.55);
}
.item-wrap {
  border: 1px solid var(--line-faint);
  border-radius: 5px;
  padding: 6px;
  background: rgba(255, 252, 240, 0.35);
  min-height: 120px; /* Ensure consistent height for grid items */
}
.ep-cell {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1.5px solid var(--line);
  background: rgba(255, 251, 238, 0.65);
  color: var(--ink-soft);
  font-size: 11.5px;
  font-family: var(--serif);
  cursor: pointer;
  transition: all 0.1s ease;
}
.ep-cell.on {
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.3), transparent 60%), var(--oxblood);
  border-color: #6e2323;
  color: #f7ead2;
  mix-blend-mode: multiply;
  transform: rotate(-8deg);
}
</style>
