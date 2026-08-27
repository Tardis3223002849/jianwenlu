<script setup lang="ts">
import TabBar from './components/TabBar.vue'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive include="SearchView,CategoriesView">
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
  <TabBar />
</template>
