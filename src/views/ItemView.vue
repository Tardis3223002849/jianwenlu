<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  KIND_META,
  STATUS_ORDER,
  statusLabel,
  type EntryStatus,
} from '../lib/types'
import { useLibrary } from '../stores/library'
import StampRating from '../components/StampRating.vue'

const route = useRoute()
const router = useRouter()
const lib = useLibrary()

const id = String(route.params.id ?? '')
const item = ref(lib.getItem(id))
const entry = ref<ReturnType<typeof lib.entryOf> | null>(null)

onMounted(() => {
  if (item.value) entry.value = lib.entryOf(id)
})

const meta = computed(() => (item.value ? KIND_META[item.value.kind] : null))
const episodic = computed(() => !!meta.value?.episodic)

const totalEps = computed(() => item.value?.totalEpisodes ?? 0)
const watchedCount = computed(() => entry.value?.episodes?.length ?? 0)
const pct = computed(() =>
  totalEps.value ? Math.round((watchedCount.value / totalEps.value) * 100) : 0,
)
const epList = computed(() => Array.from({ length: Math.max(totalEps.value, 0) }, (_, i) => i + 1))
const epOverflow = computed(() => totalEps.value > 120)

function setTotal(raw: string) {
  const n = parseInt(raw, 10)
  if (!Number.isNaN(n)) lib.setTotalEpisodes(id, n)
}

function removeThis() {
  if (confirm('确定将这件藏品从登记册中注销吗？')) {
    lib.removeEntry(id)
    router.back()
  }
}

const sourceName: Record<string, string> = {
  tmdb: 'TMDB 馆际调档',
  manual: '馆员手录',
}
</script>

<template>
  <div v-if="item && meta && entry" class="page">
    <header class="flex items-center gap-3 pt-2 pb-4">
      <a href="#" class="text-[13px]" style="color: var(--ink-faint)" @click.prevent="router.back()">← 返回</a>
    </header>

    <article class="grain-card relative overflow-hidden">
      <div class="perfo"></div>

      <div
        v-if="entry.status === 'done'"
        class="stamp-seal absolute z-10"
        style="top: 18px; right: 14px; width: 64px; height: 64px; font-size: 15px; line-height: 1.15; flex-direction: column"
      >
        <span>入 藏</span>
        <span style="font-size: 9px; letter-spacing: 0.08em">{{ entry.finishedAt }}</span>
      </div>

      <div class="p-4">
        <p class="m-0 mb-3 text-[11px]" style="letter-spacing: 0.4em; color: var(--ink-faint)">
          见 闻 录 · 登 记 卡
        </p>

        <div class="flex gap-4">
          <div class="poster-box w-[104px] shrink-0 self-stretch min-h-[148px]">
            <img
              v-if="item.posterUrl"
              :src="item.posterUrl"
              :alt="item.title"
              class="h-full w-full object-cover"
            />
            <div
              v-else
              class="flex h-full min-h-[148px] items-center justify-center text-4xl font-bold"
              style="color: var(--ink-faint)"
            >
              {{ meta.glyph }}
            </div>
          </div>

          <dl class="m-0 min-w-0 flex-1 text-[13.5px] leading-relaxed">
            <dt class="label !mt-0">题 名</dt>
            <dd class="press m-0 text-[16.5px] font-bold">{{ item.title }}</dd>

            <template v-if="item.originalTitle">
              <dt class="label">原 题</dt>
              <dd class="m-0" style="color: var(--ink-soft)">{{ item.originalTitle }}</dd>
            </template>

            <dt class="label">年 份 · {{ meta.creatorLabel }}</dt>
            <dd class="m-0" style="color: var(--ink-soft)">
              {{ [item.year || '—', item.creator || '—'].join('　') }}
            </dd>

            <dt class="label">归 屉 / 来 源</dt>
            <dd class="m-0 flex items-center gap-2">
              <span class="chip"><b>{{ meta.glyph }}</b> {{ meta.label }}屉</span>
              <span class="chip">{{ sourceName[item.source] ?? '馆藏' }}</span>
            </dd>
          </dl>
        </div>

        <p
          v-if="item.synopsis"
          class="mt-3 mb-0 border-t pt-3 text-[13px] leading-6"
          style="border-color: var(--line-faint); color: var(--ink-soft)"
        >
          {{ item.synopsis }}
        </p>
      </div>
    </article>

    <section class="mt-6">
      <span class="label !mt-0">登 记 状 态</span>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="s in STATUS_ORDER"
          :key="s"
          class="btn !px-0 !text-[12.5px]"
          :class="{ 'btn-ghost': entry.status !== s }"
          @click="lib.setStatus(id, s as EntryStatus)"
        >
          {{ statusLabel(item.kind, s) }}
        </button>
      </div>
    </section>

    <section v-if="episodic" class="mt-6 grain-card p-4">
      <div class="mb-2 flex items-baseline justify-between">
        <span class="text-[14px] font-bold" style="letter-spacing: 0.15em">逐集点收</span>
        <span class="text-[12px]" style="color: var(--ink-faint)">
          已看 {{ watchedCount }}<template v-if="totalEps"> / {{ totalEps }}（{{ pct }}%）</template><template v-else>集</template>
        </span>
      </div>
      <div v-if="totalEps" class="mb-3 h-[5px] overflow-hidden rounded-full" style="background: var(--paper-deep)">
        <div
          class="h-full rounded-full transition-all"
          :style="{ width: pct + '%', background: 'linear-gradient(90deg, var(--gold), var(--oxblood))' }"
        ></div>
      </div>
      <input
        class="input mb-3 max-w-[130px] !bg-transparent"
        :placeholder="totalEps ? `共 ${totalEps} 集` : '共几集？填一下'"
        inputmode="numeric"
        @change="setTotal(($event.target as HTMLInputElement).value)"
      />
      <div v-if="!epOverflow" class="flex flex-wrap gap-1.5">
        <button
          v-for="n in epList"
          :key="n"
          type="button"
          class="ep-cell"
          :class="{ on: entry.episodes?.includes(n) }"
          @click="lib.toggleEpisode(id, n)"
        >
          {{ n }}
        </button>
      </div>
      <p v-else class="m-0 text-[12.5px]" style="color: var(--ink-faint)">
        该部超过 120 集，暂以进度记之——点按下方进度条右端可改为手动统计。
      </p>
    </section>

    <section class="mt-6 grain-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[14px] font-bold" style="letter-spacing: 0.15em">钤 分</span>
        <StampRating :model-value="entry.rating" @update="(v) => lib.setRating(id, v)" />
      </div>
      <span class="label">观 感 / 摘 句</span>
      <textarea
        class="input ruled min-h-[110px] resize-y !bg-transparent"
        style="line-height: 26px"
        placeholder="写几句观感，或摘一句触动你的话……（失焦即存）"
        :value="entry.review ?? ''"
        @change="lib.setReview(id, ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </section>

    <section class="mt-8 mb-2 text-center">
      <button class="btn btn-ghost !text-[12.5px]" style="color: var(--oxblood)" @click="removeThis">
        注销这张登记卡
      </button>
    </section>
  </div>

  <div v-else class="page pt-16 text-center" style="color: var(--ink-faint)">
    <p class="text-[15px]">目录中没有这件藏品，可能已被移出。</p>
    <RouterLink to="/" class="btn btn-ghost mt-3 !py-2 !text-[13px]">回到大厅</RouterLink>
  </div>
</template>

<style scoped>
.ep-cell {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1.5px solid var(--line);
  background: rgba(255, 251, 238, 0.65);
  color: var(--ink-soft);
  font-size: 12.5px;
  font-family: var(--serif);
  cursor: pointer;
  transition: all 0.1s ease;
}
.ep-cell.on {
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.35), transparent 60%), var(--oxblood);
  border-color: #6e2323;
  color: #f7ead2;
  mix-blend-mode: multiply;
  transform: rotate(-8deg);
}
</style>
