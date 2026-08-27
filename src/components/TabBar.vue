<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const tabs = [
  { to: '/', glyph: '厅', label: '大厅' },
  { to: '/search', glyph: '检', label: '检索' },
  { to: '/categories', glyph: '类', label: '分类' },
  { to: '/shelf', glyph: '藏', label: '藏书室' },
]
</script>

<template>
  <div class="tabbar">
    <RouterLink
      v-for="t in tabs"
      :key="t.to"
      :to="t.to"
      class="tab-item"
      :class="{ active: route.path === t.to }"
    >
      <span class="tab-glyph">{{ t.glyph }}</span>
      <span>{{ t.label }}</span>
    </RouterLink>
  </div>
</template>
