<script setup lang="ts">
defineProps<{ modelValue?: number | null; readonly?: boolean }>()
const emit = defineEmits<{ update: [value: number] }>()

function pick(v: number, current?: number | null, readonly?: boolean) {
  if (readonly) return
  emit('update', current === v ? 0 : v)
}
</script>

<template>
  <div class="flex items-center gap-1.5">
    <button
      v-for="v in [1, 2, 3, 4, 5]"
      :key="v"
      type="button"
      class="star-btn"
      :class="{ on: (modelValue ?? 0) >= v }"
      @click="pick(v, modelValue, readonly)"
    >
      ★
    </button>
  </div>
</template>

<style scoped>
.star-btn {
  background: none;
  border: none;
  padding: 2px;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: rgba(154, 136, 113, 0.45);
  transition: color 0.12s ease, transform 0.08s ease;
}
.star-btn.on {
  color: var(--oxblood);
  mix-blend-mode: multiply;
}
.star-btn:active {
  transform: scale(0.85);
}
</style>
