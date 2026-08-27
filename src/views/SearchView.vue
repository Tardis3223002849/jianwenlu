<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  KIND_META,
  KIND_ORDER,
  type CatalogItem,
  type Kind,
} from '../lib/types'
import { SEED_CATALOG } from '../lib/catalog'
import { searchAnilist, searchItunes, searchTmdb, tmdbReady } from '../lib/sources'
import { useLibrary } from '../stores/library'

defineOptions({ name: 'SearchView' })

const router = useRouter()
const lib = useLibrary()

const tab = ref<'search' | 'manual'>('search')
const query = ref('')
const busy = ref(false)
const error = ref('')
const results = ref<CatalogItem[]>([])
const searched = ref(false)
const sourceNotes = ref<string[]>([])
const filterKind = ref<Kind | 'all'>('all')

const onlineReady = computed(() => tmdbReady())

const visibleResults = computed(() =>
  filterKind.value === 'all'
    ? results.value
    : results.value.filter((x) => x.kind === filterKind.value),
)

function sourceOf(item: CatalogItem): string {
  if (item.id.startsWith('tmdb-')) return 'TMDB'
  if (item.id.startsWith('itunes-')) return 'iTunes'
  if (item.id.startsWith('anilist-')) return 'AniList'
  return '馆藏'
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

const resultKinds = computed(() => {
  const s = new Set(results.value.map((x) => x.kind))
  return KIND_ORDER.filter((k) => s.has(k))
})

async function runSearch() {
  const seq = ++runSeq
  error.value = ''
  sourceNotes.value = []
  busy.value = true
  const ok: CatalogItem[] = []
  const failed: string[] = []
  const q = query.value.trim()
  if (!q) {
    results.value = []
    searched.value = false
    busy.value = false
    return
  }
  const jobs: Array<[string, Promise<CatalogItem[]>]> = [
    ['AniList', searchAnilist(q)],
    ['iTunes', searchItunes(q)],
  ]
  if (onlineReady.value) jobs.push(['TMDB', searchTmdb(q)])

  await Promise.all(
    jobs.map(async ([name, p]) => {
      try {
        const rows = await p
        ok.push(...rows)
      } catch {
        failed.push(name)
      }
    }),
  )
  if (seq !== runSeq) return
  // Local seed-catalog hits always included (works offline)
  for (const k of KIND_ORDER) {
    for (const s of SEED_CATALOG[k]) {
      if (s.title.includes(q) || (s.originalTitle ?? '').toLowerCase().includes(q.toLowerCase())) {
        ok.push({
          id: `seed-${k}-${SEED_CATALOG[k].indexOf(s)}`,
          kind: k,
          title: s.title,
          originalTitle: s.originalTitle || '',
          year: s.year || '',
          creator: s.creator || '',
          synopsis: s.synopsis || '',
          totalEpisodes: s.totalEpisodes,
          source: 'manual',
        })
      }
    }
  }
  results.value = ok.sort((a, b) => (b.year ?? '').localeCompare(a.year ?? ''))
  searched.value = true
  busy.value = false
  if (failed.length) {
    sourceNotes.value = [`${failed.join('、')} 数据源连接超时，已跳过`]
  }
  if (!ok.length && !failed.length) {
    error.value = '未检索到相关条目'
  }
}

let runSeq = 0
let debounceTimer: ReturnType<typeof setTimeout> | undefined

watch(query, () => {
  clearTimeout(debounceTimer)
  if (!query.value.trim()) {
    results.value = []
    searched.value = false
    return
  }
  debounceTimer = setTimeout(() => {
    runSearch()
  }, 500)
})

const mKind = ref<Kind>('novel')
const mTitle = ref('')
const mOriginal = ref('')
const mYear = ref('')
const mCreator = ref('')
const mTotal = ref<string>('')
const mSynopsis = ref('')

const creatorHint = computed(() => KIND_META[mKind.value].creatorLabel)

function registerManual() {
  if (!mTitle.value.trim()) return
  const id = lib.upsertItem({
    kind: mKind.value,
    title: mTitle.value.trim(),
    originalTitle: mOriginal.value.trim(),
    year: mYear.value.trim(),
    creator: mCreator.value.trim(),
    synopsis: mSynopsis.value.trim(),
    totalEpisodes: mTotal.value ? Number(mTotal.value) : undefined,
    source: 'manual',
  })
  router.push(`/item/${id}`)
}
</script>

<template>
  <div class="page">
    <header class="vault-header !pt-4 !pb-4">
      <h1 class="press m-0 text-[21px] font-black">检索台</h1>
      <p class="mt-2 mb-0 text-[11.5px]" style="color: var(--ink-faint); letter-spacing: 0.3em">
        SEARCH DESK
      </p>
    </header>

    <div class="mb-4 flex gap-2">
      <button
        class="btn flex-1 !py-2 !text-[13px]"
        :class="{ 'btn-ghost': tab !== 'search' }"
        @click="tab = 'search'"
      >
        馆际检索
      </button>
      <button
        class="btn flex-1 !py-2 !text-[13px]"
        :class="{ 'btn-ghost': tab !== 'manual' }"
        @click="tab = 'manual'"
      >
        手工登记卡
      </button>
    </div>

    <template v-if="tab === 'search'">
      <div class="flex items-center gap-2">
        <input
          v-model="query"
          class="input flex-1"
          placeholder="输入片名、剧名、书名、曲名……（输入即检索）"
        />
        <button
          v-if="query"
          class="btn btn-ghost shrink-0 !px-4 !py-2 !text-[12.5px]"
          type="button"
          @click="query = ''"
        >
          清 空
        </button>
      </div>
      <p
        v-if="busy"
        class="mt-2 mb-0 text-[11.5px]"
        style="color: var(--ink-faint)"
      >
        正在翻检各库……
      </p>

      <p
        v-if="sourceNotes.length"
        class="grain-card mt-3 mb-0 px-4 py-3 text-[12.5px]"
        style="color: var(--ink-faint)"
      >
        {{ sourceNotes[0] }}
      </p>
      <p
        v-else-if="!onlineReady"
        class="grain-card mt-3 mb-0 px-4 py-3 text-[12.5px]"
        style="color: var(--ink-faint)"
      >
        当前启用 AniList（动漫/漫画）与 iTunes（音乐）两库。影视库待配置 TMDB 后接入。
      </p>

      <p v-if="error" class="mt-3 text-[13px]" style="color: var(--oxblood)">{{ error }}</p>

      <div
        v-if="resultKinds.length"
        class="mt-4 flex flex-wrap gap-2"
      >
        <button
          class="chip cursor-pointer !text-[12px]"
          :class="{ '!border-[var(--oxblood)] !text-[var(--oxblood)]': filterKind === 'all' }"
          @click="filterKind = 'all'"
        >
          全部
        </button>
        <button
          v-for="k in resultKinds"
          :key="k"
          class="chip cursor-pointer !text-[12px]"
          :class="{ '!border-[var(--oxblood)] !text-[var(--oxblood)]': filterKind === k }"
          @click="filterKind = k"
        >
          {{ KIND_META[k].label }}
        </button>
      </div>

      <div v-if="visibleResults.length" class="mt-3 flex flex-col gap-2.5">
        <div
          v-for="r in visibleResults"
          :key="`${r.id}`"
          class="grain-card p-3"
          :class="{ owned: ownedBy(r) }"
          role="button"
          tabindex="0"
          @click="pressItem(r)"
        >
          <div class="flex gap-3">
            <div class="poster-box w-[64px] shrink-0 self-stretch min-h-[88px]">
              <img
                v-if="r.posterUrl"
                :src="r.posterUrl"
                :alt="r.title"
                loading="lazy"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full min-h-[88px] items-center justify-center text-xl font-bold"
                style="color: var(--ink-faint)"
              >
                {{ KIND_META[r.kind].glyph }}
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span class="chip shrink-0 !text-[10.5px]">{{ KIND_META[r.kind].label }}</span>
                <span class="chip shrink-0 !text-[10.5px]" style="color: var(--ink-faint)">{{
                  sourceOf(r)
                }}</span>
                <span
                  v-if="ownedBy(r)"
                  class="chip shrink-0 !text-[10.5px]"
                  style="border-color: rgba(140, 47, 47, 0.4); color: var(--oxblood)"
                  >已入藏</span
                >
              </div>
              <p class="press m-0 mt-1 truncate text-[15px] font-semibold">{{ r.title }}</p>
              <p class="m-0 mt-1 truncate text-[12px]" style="color: var(--ink-soft)">
                {{ [r.originalTitle, r.year, r.creator].filter(Boolean).join(' · ') }}
              </p>
              <p class="mt-1 mb-0 line-clamp-2 text-[12px]" style="color: var(--ink-faint)">
                {{ r.synopsis }}
              </p>
            </div>
          </div>

          <div
            v-if="KIND_META[r.kind].episodic || (r.totalEpisodes ?? 0) > 0"
            class="mt-2 flex items-center justify-between"
          >
            <button
              class="btn btn-ghost !py-0.5 !px-2.5 !text-[11px]"
              @click.stop="toggleExpand(r.id)"
            >
              {{ expandedId === r.id ? '收起点收 ▲' : KIND_META[r.kind].episodic ? '逐集点收 ▼' : '逐卷点收 ▼' }}
            </button>
            <span
              v-if="ownedBy(r)"
              class="text-[10.5px]"
              style="color: var(--ink-soft)"
              >{{ watchedCountOf(r) }}/{{ r.totalEpisodes || '?' }} {{ KIND_META[r.kind].episodic ? '集' : '卷' }}</span>
          </div>

          <div
            v-if="expandedId === r.id"
            class="mt-1.5 rounded-sm border p-2.5"
            style="border-color: var(--line); background: rgba(255, 251, 238, 0.5)"
          >
            <template v-if="(r.totalEpisodes ?? 0) > 0">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="n in r.totalEpisodes"
                  :key="n"
                  type="button"
                  class="ep-cell"
                  :class="{ on: episodesOf(r).includes(n) }"
                  @click.stop="toggleEpisode(r, n)"
                >
                  {{ n }}
                </button>
              </div>
              <div class="mt-2 flex gap-2">
                <button class="btn !py-1 !px-3 !text-[11.5px]" @click.stop="markAllEpisodes(r)">
                  {{ KIND_META[r.kind].episodic ? '全部看完' : '全卷读完' }}
                </button>
                <button
                  class="btn btn-ghost !py-1 !px-3 !text-[11.5px]"
                  @click.stop="clearEpisodes(r)"
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
              {{ KIND_META[r.kind].episodic ? '集数未知，可先登记此件，再到详情页登记总集数后点收。' : '卷数未知，可先登记此件，再到详情页登记后点收。' }}
            </p>
          </div>
        </div>
      </div>
      <p
        v-else-if="searched && !busy && !error"
        class="mt-6 text-center text-[13px]"
        style="color: var(--ink-faint)"
      >
        各库均无此名。试试手工登记卡？
      </p>
    </template>

    <template v-else>
      <form class="grain-card px-4 pb-5 pt-1" @submit.prevent="registerManual">
        <label class="label">类 别 屉</label>
        <select v-model="mKind" class="input !border-b !bg-transparent">
          <option v-for="k in KIND_ORDER" :key="k" :value="k">
            第{{ KIND_META[k].label }}屉 · {{ KIND_META[k].label }}
          </option>
        </select>

        <label class="label">题 名 *</label>
        <input v-model="mTitle" class="input" placeholder="中文名或自拟通称" />

        <label class="label">原 题</label>
        <input v-model="mOriginal" class="input" placeholder="原名、外文名或日文原题" />

        <label class="label">年 份</label>
        <input v-model="mYear" class="input" placeholder="如 1997" inputmode="numeric" />

        <label class="label">{{ creatorHint }}</label>
        <input v-model="mCreator" class="input" :placeholder="creatorHint" />

        <template v-if="KIND_META[mKind].episodic">
          <label class="label">总 集 数（选填）</label>
          <input v-model="mTotal" class="input" placeholder="共多少集" inputmode="numeric" />
        </template>

        <label class="label">简 介 / 备 注</label>
        <textarea
          v-model="mSynopsis"
          class="input ruled min-h-[90px] resize-y !bg-transparent"
          style="line-height: 26px"
        />

        <button class="btn mt-5 w-full" type="submit" :disabled="!mTitle.trim()">
          开 具 登 记 卡
        </button>
      </form>
    </template>
  </div>
</template>

<style scoped>
.grain-card.owned {
  box-shadow: 0 0 0 1.5px rgba(140, 47, 47, 0.45) inset;
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
