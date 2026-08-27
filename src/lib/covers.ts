import type { CatalogItem, Kind } from './types'
import { searchAnilist, searchTmdb, tmdbReady } from './sources'

const cache = new Map<string, string>()

function norm(s: string): string {
  return s.trim().toLowerCase()
}

export async function coverFor(item: CatalogItem): Promise<string> {
  const key = `${item.kind}|${item.title}`
  if (cache.has(key)) return cache.get(key) ?? ''
  try {
    let rows: CatalogItem[] = []
    if (item.kind === 'anime' || item.kind === 'novel') {
      rows = await searchAnilist(item.title)
    } else if (tmdbReady()) {
      rows = await searchTmdb(item.title)
    }
    const t = norm(item.title)
    const o = norm(item.originalTitle ?? '')
    const hit =
      rows.find(
        (r) =>
          norm(r.title) === t ||
          (!!o && norm(r.originalTitle ?? '') === o) ||
          norm(r.title).includes(t) ||
          (!!o && norm(r.originalTitle ?? '').includes(o)),
      ) ?? rows[0]
    const url = hit?.posterUrl ?? ''
    cache.set(key, url)
    return url
  } catch {
    cache.set(key, '')
    return ''
  }
}

export type { Kind }
