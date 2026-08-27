<script setup lang="ts">
import { computed } from 'vue'
import { cloudReady } from '../lib/cloud'
import { KIND_META, KIND_ORDER } from '../lib/types'
import { useLibrary } from '../stores/library'
import BorrowCard from '../components/BorrowCard.vue'

const lib = useLibrary()

const total = computed(() => Object.keys(lib.entries).length)
const done = computed(() => lib.entryList.filter((x) => x.entry.status === 'done').length)
const ratedFive = computed(() => lib.entryList.filter((x) => x.entry.rating === 5).length)

const spines = computed(() => {
  const counts = KIND_ORDER.map((k) => ({ kind: k, n: lib.countByKind[k] ?? 0 }))
  const max = Math.max(1, ...counts.map((c) => c.n))
  return counts.map((c) => ({ ...c, h: c.n === 0 ? 8 : 18 + Math.round((c.n / max) * 96) }))
})
function clearAll() {
  if (window.confirm('确定清空全部本地藏品与登记记录？此操作不可撤销。')) {
    lib.resetAll()
  }
}
</script>

<template>
  <div class="page">
    <header class="vault-header !pt-4 !pb-4">
      <h1 class="press m-0 text-[21px] font-black">我的藏书室</h1>
      <p class="mt-2 mb-0 text-[11.5px]" style="color: var(--ink-faint); letter-spacing: 0.3em">
        MY PRIVATE ARCHIVE
      </p>
    </header>

    <div class="grid grid-cols-3 gap-3">
      <div class="grain-card px-3 py-4 text-center">
        <p class="press m-0 text-[24px] font-black">{{ total }}</p>
        <p class="m-0 mt-1 text-[11.5px]" style="letter-spacing: 0.25em; color: var(--ink-faint)">藏 品</p>
      </div>
      <div class="grain-card px-3 py-4 text-center">
        <p class="press m-0 text-[24px] font-black">{{ done }}</p>
        <p class="m-0 mt-1 text-[11.5px]" style="letter-spacing: 0.25em; color: var(--ink-faint)">完 读 完 看</p>
      </div>
      <div class="grain-card px-3 py-4 text-center">
        <p class="press m-0 text-[24px] font-black" style="color: var(--oxblood)">{{ ratedFive }}</p>
        <p class="m-0 mt-1 text-[11.5px]" style="letter-spacing: 0.25em; color: var(--ink-faint)">五 星 之 作</p>
      </div>
    </div>

    <section class="grain-card mt-5 px-4 py-5">
      <div class="mb-4 flex items-baseline justify-between">
        <h2 class="press m-0 text-[15px] font-bold">九屉馆藏分布</h2>
        <span class="text-[11px]" style="color: var(--ink-faint)">书脊越高，藏品越多</span>
      </div>
      <div class="flex items-end justify-between gap-2" style="height: 150px">
        <RouterLink
          v-for="s in spines"
          :key="s.kind"
          :to="`/kind/${s.kind}`"
          class="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
          style="text-decoration: none"
        >
          <span
            class="w-full rounded-t-sm transition-all"
            :style="{
              height: s.h + 'px',
              background:
                s.n === 0
                  ? 'var(--paper-deep)'
                  : 'linear-gradient(180deg, var(--gold), var(--walnut))',
              boxShadow: s.n === 0 ? 'none' : 'inset -2px 0 3px rgba(0,0,0,.35)',
            }"
          ></span>
          <span class="text-[10px]" style="color: var(--ink-faint)">{{ KIND_META[s.kind].glyph }}</span>
        </RouterLink>
      </div>
    </section>

    <section class="grain-card mt-5 flex items-center gap-3 px-4 py-4">
      <span class="stamp-seal shrink-0" style="width: 40px; height: 40px; font-size: 15px">享</span>
      <div class="min-w-0 flex-1">
        <p class="m-0 text-[14px] font-semibold">把藏书室分享给朋友</p>
        <p v-if="cloudReady()" class="m-0 mt-0.5 text-[12px]" style="color: var(--ink-soft)">
          云端已就绪：生成你的专属主页链接（下个迭代开放）
        </p>
        <p v-else class="m-0 mt-0.5 text-[12px]" style="color: var(--ink-faint)">
          待 Supabase 云端接入后，即可领取一张可供分享的私人主页
        </p>
      </div>
      <button class="btn btn-ghost shrink-0 !py-1.5 !text-[12px]" disabled>即将开放</button>
    </section>

    <div class="mt-7 mb-3">
      <h2 class="press m-0 text-[16px] font-bold">全部登记册</h2>
    </div>

    <div v-if="lib.entryList.length" class="flex flex-col gap-2.5">
      <BorrowCard v-for="x in lib.entryList" :key="x.item.id" :item="x.item" :entry="x.entry" />
    </div>
    <p
      v-else
      class="ruled grain-card mt-1 px-6 py-9 text-center text-[13px]"
      style="color: var(--ink-faint)"
    >
      登记册还是空白。世界上有那么多好东西等着被你盖章。
    </p>

    <div class="mt-10 text-center">
      <button
        class="btn btn-ghost !text-[12px]"
        style="color: var(--ink-faint)"
        @click="clearAll"
      >
        清空本馆藏品
      </button>
    </div>
  </div>
</template>
