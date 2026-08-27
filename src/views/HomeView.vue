<script setup lang="ts">
import { useLibrary } from '../stores/library'
import Bookshelf from '../components/Bookshelf.vue'
import BorrowCard from '../components/BorrowCard.vue'

const lib = useLibrary()

function monthGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return '夜深了，灯还亮着'
  if (h < 11) return '晨光正好，宜翻检目录'
  if (h < 14) return '午后安坐，宜取一卷'
  if (h < 19) return '暮色渐合，宜续一集'
  return '晚风入馆，宜览旧藏'
}
</script>

<template>
  <div>
    <header class="vault-header">
      <div class="plate-frame">
        <h1 class="gold-text m-0 text-[26px] font-black" style="letter-spacing: 0.35em">
          见闻录
        </h1>
      </div>
      <p class="press mt-4 mb-0 text-[13px]" style="color: var(--ink-soft); letter-spacing: 0.5em">
        凡 有 见 闻 · 皆 成 条 目
      </p>
      <p class="mt-1 mb-0 text-[11px]" style="color: var(--ink-faint); letter-spacing: 0.28em">
        {{ monthGreeting() }}
      </p>
    </header>

    <section class="page pt-1">
      <div class="flex gap-2">
        <RouterLink
          to="/search"
          class="grain-card flex flex-1 items-center justify-between px-4 py-3"
          style="text-decoration: none; color: inherit"
        >
          <span class="text-[14px]" style="letter-spacing: 0.18em; color: var(--ink-soft)"
            >检索全库，或手工登一件藏品……</span
          >
          <span class="stamp-seal" style="width: 26px; height: 26px; font-size: 13px">检</span>
        </RouterLink>

        <RouterLink
          to="/batch"
          class="grain-card flex w-[120px] shrink-0 flex-col items-center justify-center gap-1 px-3 py-2 text-center"
          style="text-decoration: none; color: inherit"
        >
          <span class="stamp-seal" style="width: 30px; height: 30px; font-size: 13px">盘</span>
          <span class="text-[12px]" style="letter-spacing: 0.2em; color: var(--ink-soft)"
            >批量盘点</span
          >
        </RouterLink>
      </div>

      <div class="mt-6">
        <Bookshelf />
      </div>

      <div v-if="lib.recent.length" class="mt-7 mb-3 flex items-baseline justify-between">
        <h2 class="press m-0 text-[16px] font-bold">近期归档</h2>
        <RouterLink to="/shelf" class="text-[12px]" style="color: var(--ink-faint)"
          >全部 →</RouterLink
        >
      </div>

      <div v-if="lib.recent.length" class="flex flex-col gap-2.5">
        <BorrowCard v-for="x in lib.recent" :key="x.item.id" :item="x.item" :entry="x.entry" />
      </div>
      <div
        v-else
        class="grain-card ruled mt-6 flex flex-col items-center gap-2 px-6 py-9 text-center"
        style="color: var(--ink-faint)"
      >
        <span class="stamp-seal" style="width: 52px; height: 52px; font-size: 22px">空</span>
        <p class="m-0 text-[13.5px]">馆内尚无藏品。去检索台找一件，或亲手写一张登记卡。</p>
        <RouterLink to="/search" class="btn btn-ghost mt-1 !py-2 !text-[13px]"
          >前往检索台</RouterLink
        >
      </div>
    </section>
  </div>
</template>
