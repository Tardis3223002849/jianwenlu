import type { CatalogItem, Kind } from './types'

const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN as string | undefined

export function tmdbReady(): boolean {
  return !!TMDB_TOKEN
}

const TIMEOUT = 6000

async function fetchTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

function toItem(
  id: string,
  kind: Kind,
  title: string,
  originalTitle: string,
  year: string,
  posterUrl: string,
  synopsis: string,
  source: 'manual' | 'tmdb',
  extra: Partial<CatalogItem> = {},
): CatalogItem {
  return {
    id,
    kind,
    title,
    originalTitle,
    year,
    posterUrl,
    synopsis,
    source,
    externalId: id,
    ...extra,
  }
}

interface AniListMedia {
  id: number
  type: string
  title?: { romaji?: string | null; native?: string | null; english?: string | null; chinese?: string | null }
  coverImage?: { large?: string | null }
  startDate?: { year?: number | null }
  description?: string | null
  episodes?: number | null
  averageScore?: number | null
}

interface AniListPage {
  data?: {
    Page?: {
      media?: AniListMedia[]
    }
  }
}

async function anilist(query: string, type: string): Promise<AniListMedia[]> {
  const gql = `query ($q: String, $t: MediaType) {
    Page(page: 1, perPage: 24) {
      media(search: $q, type: $t, isAdult: false, sort: POPULARITY_DESC) {
        id type title { romaji native english chinese }
        coverImage { large }
        startDate { year }
        description
        episodes
      }
    }
  }`
  const res = await fetchTimeout('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables: { q: query || null, t: type } }),
  })
  if (!res.ok) throw new Error(`AniList ${res.status}`)
  const data = (await res.json()) as AniListPage
  return data.data?.Page?.media ?? []
}

export async function searchAnilist(query: string): Promise<CatalogItem[]> {
  const [anime, manga] = await Promise.allSettled([
    anilist(query, 'ANIME'),
    anilist(query, 'MANGA'),
  ])
  const out: CatalogItem[] = []
  for (const r of [anime, manga]) {
    if (r.status !== 'fulfilled') continue
    for (const m of r.value) {
      const kind: Kind = m.type === 'ANIME' ? 'anime' : 'novel'
      const title = m.title?.chinese || m.title?.native || m.title?.romaji || ''
      if (!title) continue
      const desc = (m.description || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').slice(0, 200)
      out.push(
        toItem(
          `anilist-${m.id}`,
          kind,
          title,
          m.title?.romaji || m.title?.english || '',
          m.startDate?.year ? String(m.startDate.year) : '',
          m.coverImage?.large || '',
          desc,
          'manual',
          { totalEpisodes: m.episodes ?? undefined },
        ),
      )
    }
  }
  const seen = new Set<string>()
  return out.filter((x) => {
    const k = `${x.kind}-${x.title}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export type AniSort = 'POPULARITY_DESC' | 'SCORE_DESC' | 'TRENDING_DESC'

export async function browseAnilist(
  type: 'ANIME' | 'MANGA',
  sort: AniSort = 'POPULARITY_DESC',
  page = 1,
): Promise<CatalogItem[]> {
  const gql = `query ($t: MediaType, $s: [MediaSort], $p: Int) {
    Page(page: $p, perPage: 30) {
      media(type: $t, isAdult: false, sort: $s) {
        id type title { romaji native chinese }
        coverImage { large }
        startDate { year }
        description
        episodes
      }
    }
  }`
  const res = await fetchTimeout('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables: { t: type, s: sort, p: page } }),
  })
  if (!res.ok) throw new Error(`AniList ${res.status}`)
  const data = (await res.json()) as AniListPage
  const kind: Kind = type === 'ANIME' ? 'anime' : 'novel'
  return (data.data?.Page?.media ?? [])
    .map((m) => {
      const title = m.title?.chinese || m.title?.native || m.title?.romaji || ''
      if (!title) return null
      const desc = (m.description || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').slice(0, 160)
      return toItem(
        `anilist-${m.id}`,
        kind,
        title,
        m.title?.romaji || m.title?.english || '',
        m.startDate?.year ? String(m.startDate.year) : '',
        m.coverImage?.large || '',
        desc,
        'manual',
        { totalEpisodes: m.episodes ?? undefined },
      )
    })
    .filter((x): x is CatalogItem => x !== null)
}

interface ITunesTrack {
  trackId: number
  collectionId?: number
  trackName?: string
  collectionName?: string
  artistName?: string
  primaryGenreName?: string
  releaseDate?: string
  artworkUrl100?: string
  kind?: string
}

function iTunesKind(kind?: string): Kind | null {
  if (kind === 'tv-episode') return 'tv'
  return null
}

export async function searchItunes(query: string): Promise<CatalogItem[]> {
  const url = new URL('https://itunes.apple.com/search')
  url.searchParams.set('term', query)
  url.searchParams.set('limit', '24')
  url.searchParams.set('country', 'CN')
  const res = await fetchTimeout(url.toString())
  if (!res.ok) throw new Error(`iTunes ${res.status}`)
  const j = (await res.json()) as { results?: ITunesTrack[] }
  const out: CatalogItem[] = []
  for (const r of j.results ?? []) {
    const kind = iTunesKind(r.kind)
    if (!kind) continue
    const title = r.trackName || r.collectionName || ''
    if (!title) continue
    out.push(
      toItem(
        `itunes-${r.trackId ?? r.collectionId}`,
        kind,
        title,
        '',
        r.releaseDate ? r.releaseDate.slice(0, 4) : '',
        r.artworkUrl100?.replace('100x100', '300x300') || '',
        r.primaryGenreName || '',
        'manual',
        { creator: r.artistName || '' },
      ),
    )
  }
  return out.slice(0, 12)
}

export async function searchTmdb(query: string): Promise<CatalogItem[]> {
  if (!TMDB_TOKEN || !query.trim()) return []
  const url = new URL('https://api.themoviedb.org/3/search/multi')
  url.searchParams.set('query', query)
  url.searchParams.set('language', 'zh-CN')
  url.searchParams.set('include_adult', 'false')
  const isV4 = TMDB_TOKEN.startsWith('eyJ')
  const headers: Record<string, string> = {}
  if (isV4) {
    headers['Authorization'] = `Bearer ${TMDB_TOKEN}`
  } else {
    url.searchParams.set('api_key', TMDB_TOKEN)
  }
  const res = await fetchTimeout(url.toString(), { headers })
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  interface T {
    media_type?: string
    id: number
    title?: string
    name?: string
    original_title?: string
    original_name?: string
    release_date?: string
    first_air_date?: string
    poster_path?: string | null
    overview?: string | null
  }
  const data = (await res.json()) as { results?: T[] }
  const out: CatalogItem[] = []
  for (const r of data.results ?? []) {
    let kind: Kind | null = null
    if (r.media_type === 'movie') kind = 'movie'
    else if (r.media_type === 'tv') kind = 'tv'
    if (!kind) continue
    const date = r.release_date || r.first_air_date || ''
    out.push(
      toItem(
        `tmdb-${r.id}`,
        kind,
        r.title || r.name || '',
        r.original_title || r.original_name || '',
        date ? date.slice(0, 4) : '',
        r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : '',
        r.overview || '',
        'tmdb',
      ),
    )
  }
  return out.slice(0, 12)
}
