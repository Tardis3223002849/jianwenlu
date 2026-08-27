import { defineStore } from 'pinia'
import {
  nowISO,
  uid,
  type CatalogItem,
  type Entry,
  type EntryStatus,
  type Kind,
} from '../lib/types'

const STORAGE_KEY = 'wcl-library-v1'

interface PersistShape {
  items: Record<string, CatalogItem>
  entries: Record<string, Entry>
}

function load(): PersistShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PersistShape
      const items = parsed.items ?? {}
      // Migrate known misclassifications (Hamilton is a musical, not a movie)
      for (const id of Object.keys(items)) {
        const it = items[id]
        if (it.kind === 'movie' && (it.title === '汉密尔顿' || it.originalTitle === 'Hamilton')) {
          items[id] = { ...it, kind: 'musical' }
        }
      }
      return { items, entries: parsed.entries ?? {} }
    }
  } catch {
    /* corrupted storage falls through to empty */
  }
  return { items: {}, entries: {} }
}

function sameWork(a: CatalogItem, b: CatalogItem): boolean {
  if (a.source === b.source && a.externalId && a.externalId === b.externalId) return true
  return (
    a.kind === b.kind &&
    a.title.trim() === b.title.trim() &&
    (!!a.year || !!b.year ? (a.year ?? '') === (b.year ?? '') : false)
  )
}

export const useLibrary = defineStore('library', {
  state: (): PersistShape => load(),
  getters: {
    entryList(state): Array<{ item: CatalogItem; entry: Entry }> {
      return Object.values(state.entries)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((e) => ({ item: state.items[e.itemId], entry: e }))
        .filter((x) => x.item)
    },
    recent(state) {
      return Object.values(state.entries)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6)
        .map((e) => ({ item: state.items[e.itemId], entry: e }))
        .filter((x) => x.item)
    },
    countByKind(state): Record<Kind, number> {
      const out = {} as Record<Kind, number>
      for (const e of Object.values(state.entries)) {
        const item = state.items[e.itemId]
        if (item) out[item.kind] = (out[item.kind] ?? 0) + 1
      }
      return out
    },
  },
  actions: {
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: this.items, entries: this.entries }))
    },
    upsertItem(input: Omit<CatalogItem, 'id'> & { id?: string }): string {
      for (const it of Object.values(this.items)) {
        if (sameWork(it, input as CatalogItem)) {
          this.items[it.id] = { ...it, ...input, id: it.id }
          this.persist()
          return it.id
        }
      }
      const id = input.id ?? uid()
      this.items[id] = { ...input, id } as CatalogItem
      this.persist()
      return id
    },
    getItem(id: string): CatalogItem | undefined {
      return this.items[id]
    },
    entryOf(itemId: string): Entry {
      let e = Object.values(this.entries).find((x) => x.itemId === itemId)
      if (!e) {
        e = { id: uid(), itemId, status: 'wish', createdAt: nowISO(), updatedAt: nowISO() }
        this.entries[e.id] = e
        this.persist()
      }
      return e
    },
    setStatus(itemId: string, status: EntryStatus) {
      const e = this.entryOf(itemId)
      e.status = status
      e.updatedAt = nowISO()
      if (status === 'done') e.finishedAt = nowISO().slice(0, 10)
      this.persist()
    },
    setStatusMany(itemIds: string[], status: EntryStatus) {
      const stamp = nowISO()
      for (const id of itemIds) {
        const e = this.entryOf(id)
        e.status = status
        e.updatedAt = stamp
        if (status === 'done' && !e.finishedAt) e.finishedAt = stamp.slice(0, 10)
      }
      this.persist()
    },
    setRating(itemId: string, rating: number) {
      const e = this.entryOf(itemId)
      e.rating = e.rating === rating ? null : rating
      e.updatedAt = nowISO()
      this.persist()
    },
    setReview(itemId: string, review: string) {
      const e = this.entryOf(itemId)
      e.review = review
      e.updatedAt = nowISO()
      this.persist()
    },
    toggleEpisode(itemId: string, n: number) {
      const e = this.entryOf(itemId)
      e.episodes = e.episodes ?? []
      const i = e.episodes.indexOf(n)
      if (i >= 0) e.episodes.splice(i, 1)
      else {
        e.episodes.push(n)
        e.episodes.sort((a, b) => a - b)
      }
      e.updatedAt = nowISO()
      this.persist()
    },
    setTotalEpisodes(itemId: string, total: number) {
      const it = this.items[itemId]
      if (it) {
        it.totalEpisodes = Math.max(0, Math.min(total, 500))
        this.persist()
      }
    },
    setEpisodes(itemId: string, eps: number[]) {
      const e = this.entryOf(itemId)
      e.episodes = [...new Set(eps)].sort((a, b) => a - b)
      e.updatedAt = nowISO()
      this.persist()
    },
    removeEntry(itemId: string) {
      const e = Object.values(this.entries).find((x) => x.itemId === itemId)
      if (e) {
        delete this.entries[e.id]
        this.persist()
      }
    },
    resetAll() {
      this.items = {}
      this.entries = {}
      this.persist()
    },
  },
})
