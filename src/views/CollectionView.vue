<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { KIND_META, KIND_ORDER, type CatalogItem, type Kind } from '../lib/types'
import { browseAnilist } from '../lib/sources'
import { SEED_CATALOG } from '../lib/catalog'
import { useLibrary } from '../stores/library'
import BorrowCard from '../components/BorrowCard.vue'

const route = useRoute()
const lib = useLibrary()

const browseTab = ref<'mine' | 'browse'>(route.query.view === 'browse' ? 'browse' : 'mine')

const kind = computed<Kind | null>(() => {
  const k = route.params.kind as Kind
  return KIND_ORDER.includes(k) ? k : null
})

const meta = computed(() => (kind.value ? KIND_META[kind.value] : null))

const rows = computed(() =>
  kind.value ? lib.entryList.filter((x) => x.item.kind === kind.value) : [],
)

const browsing = ref(false)
const browseError = ref('')
const onlineRows = ref<CatalogItem[]>([])

const browseSource = computed(() => {
  if (kind.value === 'anime') return 'ANIME' as const
  if (kind.value === 'novel') return 'MANGA' as const
  return null
})

const seedRows = computed<CatalogItem[]>(() =>
  kind.value
    ? SEED_CATALOG[kind.value].map((s, i) => ({
        id: `seed-${kind.value}-${i}`,
        kind: kind.value!,
        title: s.title,
        originalTitle: s.originalTitle || '',
        year: s.year || '',
        creator: s.creator || '',
        synopsis: s.synopsis || '',
        totalEpisodes: s.totalEpisodes,
        source: 'manual' as const,
      }))
    : [],
)

const browseRows = computed(() => [...seedRows.value, ...onlineRows.value])

function ownedBy(item: CatalogItem): boolean {
  return Object.values(lib.items).some(
    (x) => x.kind === item.kind && x.title === item.title,
  )
}

function findOwned(item: CatalogItem): string | undefined {
  const it = Object.values(lib.items).find((x) => x.kind === item.kind && x.title === item.title)
  return it?.id
}

function pressRow(item: CatalogItem) {
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

async function loadBrowse() {
  if (browseSource.value === null) {
    onlineRows.value = []
    return
  }
  browseError.value = ''
  browsing.value = true
  try {
    onlineRows.value = await browseAnilist(browseSource.value)
  } catch {
    browseError.value = '在线排行数据源连接失败，已显示内置经典书目'
  } finally {
    browsing.value = false
  }
}

watch(browseTab, (v) => {
  if (v === 'browse' && !onlineRows.value.length && !browseError.value) loadBrowse()
})
</script>

<template>
  <div v-if="meta && kind" class="page pb-28">
    <header class="flex items-center gap-3 pt-2 pb-4">
      <RouterLink to="/" class="text-[13px]" style="color: var(--ink-faint)">← 大厅</RouterLink>
      <div class="h-4 w-px" style="background: var(--line)"></div>
      <h1 class="press m-0 flex items-center gap-2 text-[19px] font-black">
        <span class="stamp-seal" style="width: 30px; height: 30px; font-size: 16px">{{
          meta.glyph
        }}</span>
        {{ meta.label }}屉
      </h1>
      <span class="ml-auto chip">{{ rows.length }} 件已入藏</span>
    </header>

    <div class="mb-4 flex gap-2">
      <button
        class="btn flex-1 !py-2 !text-[13px]"
        :class="{ 'btn-ghost': browseTab !== 'mine' }"
        @click="browseTab = 'mine'"
      >
        我的馆藏
      </button>
      <button
        class="btn flex-1 !py-2 !text-[13px]"
        :class="{ 'btn-ghost': browseTab !== 'browse' }"
        @click="browseTab = 'browse'"
      >
        全库挑选（{{ browseRows.length }}）
      </button>
    </div>

    <template v-if="browseTab === 'mine'">
      <div v-if="rows.length" class="flex flex-col gap-2.5">
        <BorrowCard v-for="x in rows" :key="x.item.id" :item="x.item" :entry="x.entry" />
      </div>
      <div
        v-else
        class="grain-card ruled mt-10 flex flex-col items-center gap-3 px-6 py-12 text-center"
        style="color: var(--ink-faint)"
      >
        <span class="stamp-seal" style="width: 54px; height: 54px; font-size: 24px">虚</span>
        <p class="m-0 text-[14px]">此屉空空如也，去「全库挑选」直接勾选吧。</p>
        <button class="btn !py-2 !text-[13px]" @click="browseTab = 'browse'">
          去全库挑几册
        </button>
      </div>
    </template>

    <template v-else>
      <p class="mt-1 mb-3 text-[12.5px] leading-5" style="color: var(--ink-soft)">
        下面{{ seedRows.length }}件为{{ meta.label }}类经典藏书，{{ browseSource ? '动漫/漫画另附在线热门排行' : '' }}。点击即入藏（默认看完），再点弹窗取消。
      </p>

      <p v-if="browseError" class="mb-2 text-[12.5px]" style="color: var(--oxblood)">
        {{ browseError }}
      </p>
      <p v-if="browsing" class="mb-2 text-[12.5px]" style="color: var(--ink-faint)">
        正在搬运在线排行……
      </p>

      <div class="flex flex-col gap-2">
        <div
          v-for="r in browseRows"
          :key="r.id"
          class="grain-card flex cursor-pointer items-center gap-3 px-3 py-2.5"
          :class="{ owned: ownedBy(r) }"
          role="button"
          tabindex="0"
          @click="pressRow(r)"
        >
          <div class="poster-box h-12 w-9 shrink-0">
            <div
              class="flex h-full w-full items-center justify-center text-[13px] font-bold"
              style="color: var(--ink-faint)"
            >
              {{ meta.glyph }}
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="press m-0 truncate text-[14.5px] font-semibold">{{ r.title }}</p>
            <p class="m-0 mt-0.5 truncate text-[11.5px]" style="color: var(--ink-faint)">
              {{ [r.originalTitle, r.year, r.creator].filter(Boolean).join(' · ') || '—' }}
            </p>
            <p v-if="r.synopsis" class="m-0 mt-0.5 line-clamp-1 text-[11px]" style="color: var(--ink-faint)">
              {{ r.synopsis }}
            </p>
          </div>
          <span
            v-if="ownedBy(r)"
            class="chip shrink-0 !text-[10.5px]"
            style="border-color: rgba(140, 47, 47, 0.4); color: var(--oxblood)"
            >已入藏</span
          >
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.grain-card.owned {
  box-shadow: 0 0 0 1.5px rgba(140, 47, 47, 0.45) inset;
}
</style>
