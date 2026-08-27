export type Kind =
  | 'movie'
  | 'tv'
  | 'musical'
  | 'play'
  | 'drama'
  | 'novel'
  | 'prose'
  | 'poetry'
  | 'anime'

export interface KindMeta {
  label: string
  glyph: string
  creatorLabel: string
  episodic: boolean
  verb: 'watch' | 'read'
}

export const KIND_ORDER: Kind[] = [
  'movie',
  'tv',
  'musical',
  'play',
  'drama',
  'novel',
  'prose',
  'poetry',
  'anime',
]

export const KIND_META: Record<Kind, KindMeta> = {
  movie: { label: '电影', glyph: '影', creatorLabel: '导演', episodic: false, verb: 'watch' },
  tv: { label: '电视剧', glyph: '剧', creatorLabel: '主创', episodic: true, verb: 'watch' },
  musical: { label: '音乐剧', glyph: '乐', creatorLabel: '主创', episodic: false, verb: 'watch' },
  play: { label: '话剧', glyph: '话', creatorLabel: '主创', episodic: false, verb: 'watch' },
  drama: { label: '戏剧', glyph: '戏', creatorLabel: '主创', episodic: false, verb: 'watch' },
  novel: { label: '小说', glyph: '书', creatorLabel: '作者', episodic: false, verb: 'read' },
  prose: { label: '散文', glyph: '文', creatorLabel: '作者', episodic: false, verb: 'read' },
  poetry: { label: '诗歌', glyph: '诗', creatorLabel: '作者', episodic: false, verb: 'read' },
  anime: { label: '动漫', glyph: '漫', creatorLabel: '制作组', episodic: true, verb: 'watch' },
}

export type SourceId = 'manual' | 'tmdb'

export interface CatalogItem {
  id: string
  kind: Kind
  title: string
  originalTitle?: string
  year?: string
  posterUrl?: string
  creator?: string
  synopsis?: string
  totalEpisodes?: number
  source: SourceId
  externalId?: string
}

export type EntryStatus = 'wish' | 'active' | 'done' | 'dropped'

export const STATUS_ORDER: EntryStatus[] = ['wish', 'active', 'done', 'dropped']

export interface Entry {
  id: string
  itemId: string
  status: EntryStatus
  rating?: number | null
  review?: string
  episodes?: number[]
  createdAt: string
  updatedAt: string
  finishedAt?: string
}

export function statusLabel(kind: Kind, status: EntryStatus): string {
  const v = KIND_META[kind].verb
  switch (status) {
    case 'wish':
      return `想${v === 'read' ? '读' : '看'}`
    case 'active':
      return v === 'read' ? '在读' : '在看'
    case 'done':
      return v === 'read' ? '已读' : '看完'
    case 'dropped':
      return '搁置'
  }
}

export function uid(): string {
  return crypto.randomUUID()
}

export function nowISO(): string {
  return new Date().toISOString()
}
