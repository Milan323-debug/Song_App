import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  FlatList,
  Dimensions,
  Animated,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ActionSheetIOS,
  Platform,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Alert,
  Share,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import COLORS from '../../constants/colors'
import { useAuthStore } from '../../store/authStore'
import usePlayerStore from '../../store/playerStore'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { API } from '../../constants/api'
import AddCircleButton from '../../components/AddCircleButton'
import { DEFAULT_ARTWORK_URL, DEFAULT_ARTWORK_BG, DEFAULT_PROFILE_IMAGE } from '../../constants/artwork'

const { width: SCREEN_W } = Dimensions.get('window')
const H_PAD = 14
const GAP = 10
// Keep two-column width at original value (do not reduce horizontal size)
const TWO_COL_W = Math.round((SCREEN_W - H_PAD * 2 - GAP) / 2)
// (see-section items use TWO_COL_W directly)
// smaller hero for a more compact, Spotify-like look
const HERO_W = Math.round(SCREEN_W * 0.46)
const HERO_H = Math.round(HERO_W * 0.9)
const RECENTS_KEY = 'recentHistory_v1'

// Small presentational components (memoized)
const Pill = React.memo(({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
    accessibilityRole="button"
    accessibilityState={{ selected: !!active }}
  >
    <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>{label}</Text>
  </TouchableOpacity>
))

const SmallRowCard = React.memo(({ item, onPress, onLongPress }) => (
  <TouchableOpacity
    style={styles.smallRow}
    onPress={() => onPress(item)}
    onLongPress={() => onLongPress && onLongPress(item)}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={`${item.title} by ${item.subtitle}`}
  >
  <View style={styles.thumbWrap}><Image source={{ uri: item.image || DEFAULT_ARTWORK_URL }} style={styles.thumb} /></View>
    <View style={styles.rowMeta}>
      <Text numberOfLines={1} style={styles.rowTitle}>{item.title}</Text>
      <Text numberOfLines={1} style={styles.rowSub}>{item.subtitle}</Text>
    </View>
  </TouchableOpacity>
))

const HeroCard = React.memo(({ item, onPress }) => (
  <TouchableOpacity style={styles.heroCard} onPress={() => onPress(item)} activeOpacity={0.92} accessibilityRole="button">
  <Image source={{ uri: item.image || DEFAULT_ARTWORK_URL }} style={styles.heroImg} />
    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.heroOverlay} />
    <View style={styles.heroLabel}>
      <Text numberOfLines={1} style={styles.heroTitle}>{item.title}</Text>
      <Text numberOfLines={1} style={styles.heroDesc}>{item.subtitle}</Text>
    </View>
  </TouchableOpacity>
))

// Grid-style card used in "See what others made" — match main grid cardSmall styling
const SeeGridCard = React.memo(({ item, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={() => onPress && onPress(item)}
    style={[styles.seeCard]}
    accessibilityRole="button"
  >
    <View style={styles.seeImgWrap}>
      <Image
        source={{ uri: item.image || 'https://picsum.photos/seed/album/300/300' }}
        style={styles.seeImg}
        resizeMode="cover"
      />
      <View style={styles.seeOverlaySimple} />
      {item.special && (
        <View style={styles.seeBadge}><Ionicons name="heart" size={14} color={COLORS.primary} /></View>
      )}
      
    </View>

    {/* copy same typography/weights as main grid for visual consistency */}
    <Text numberOfLines={1} style={styles.seeCardTitle}>{item.title}</Text>
    <Text numberOfLines={1} style={styles.seeCardSub}>{item.subtitle}</Text>
  </TouchableOpacity>
))

function Skeleton({ w, h, style }) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 700, useNativeDriver: false }),
      ])
    ).start()
  }, [anim])
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.06)'] })
  return <Animated.View style={[{ width: w, height: h, borderRadius: 8, backgroundColor: bg }, style]} />
}

export default function Home() {
  const router = useRouter()
  const { token } = useAuthStore()
  const authUser = useAuthStore(s => s.user)
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const isPlaying = usePlayerStore(s => s.isPlaying)
  const playTrack = usePlayerStore(s => s.playTrack)
  const togglePlay = usePlayerStore(s => s.togglePlay)

  const [tab, setTab] = useState('All')
  // Search overlay state
  const [searchVisible, setSearchVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const [trending, setTrending] = useState([])
  const [searchResults, setSearchResults] = useState({ songs: [], playlists: [], artists: [] })
  const [searchLoading, setSearchLoading] = useState(false)
  const [allSongs, setAllSongs] = useState([])
  const [allSongsLoading, setAllSongsLoading] = useState(false)
  const [allSongsPage, setAllSongsPage] = useState(1)
  const ALL_SONGS_PAGE_SIZE = 50
  const [allSongsHasMore, setAllSongsHasMore] = useState(true)
  const [allSongsLoadingMore, setAllSongsLoadingMore] = useState(false)
  const [likedSet, setLikedSet] = useState(new Set())
  const [playlistModalVisibleHome, setPlaylistModalVisibleHome] = useState(false)
  const [homePlaylists, setHomePlaylists] = useState([])
  const [homePlaylistsLoading, setHomePlaylistsLoading] = useState(false)
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState(null)
  const [songMenuVisibleHome, setSongMenuVisibleHome] = useState(false)
  const [selectedSongForMenu, setSelectedSongForMenu] = useState(null)
  const [searchPage, setSearchPage] = useState({ songs: 1, playlists: 1, artists: 1 })
  const abortRef = useRef(null)
  const allSongsAbortRef = useRef(null)
  const debounceRef = useRef(null)
  const searchAnim = useRef(new Animated.Value(0)).current
  const RECENTS_SEARCH_KEY = 'search_recents_v1'
  const [gridItems, setGridItems] = useState([])
  const [featured, setFeatured] = useState([])
  const [recents, setRecents] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // *Important refs for animations / pager*
  const scrollY = useRef(new Animated.Value(0)).current
  const scrollXRef = useRef(new Animated.Value(0))           // <<--- fixed: create scrollXRef
  const heroPagerRef = useRef(null)
  const [heroIndex, setHeroIndex] = useState(0)

  useEffect(() => { fetchData(); loadRecents(); }, [])

  // load recent searches + trending on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENTS_SEARCH_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        setRecentSearches(Array.isArray(parsed) ? parsed.slice(0, 8) : [])
      } catch (e) { setRecentSearches([]) }

      // trending suggestions (local/stubbed — avoid network call)
      setTrending(['chill', 'workout', 'lofi', 'indie', 'focus', 'study', 'sleep', 'jazz'])
    })()
  }, [])

  // fetch all songs when search overlay opens (or once)
  // paginated fetch for All songs (initial load + load more on scroll)
  const fetchAllSongs = useCallback(async (page = 1, reset = false) => {
    // if not resetting and we already have items for page 1, skip
    if (!reset && page === 1 && allSongs.length) return

    // decide which loading flag to use
    if (page === 1) setAllSongsLoading(true)
    else setAllSongsLoadingMore(true)

    try {
      if (allSongsAbortRef.current) {
        try { allSongsAbortRef.current.abort() } catch (e) {}
      }
      const controller = new AbortController()
      allSongsAbortRef.current = controller

      // request a bounded page of songs; backend is expected to support ?limit & ?page
      const url = `api/songs?limit=${ALL_SONGS_PAGE_SIZE}&page=${page}`
      const res = await fetch(API(url), { signal: controller.signal })
      const json = await res.json()
      const items = Array.isArray(json.songs) ? json.songs : (Array.isArray(json) ? json : (json.items || []))

      if (page === 1) {
        setAllSongs(items)
      } else {
        setAllSongs((cur) => Array.isArray(items) && items.length ? [...cur, ...items] : cur)
      }

      // if returned items are fewer than page size, assume no more pages
      if (!Array.isArray(items) || items.length < ALL_SONGS_PAGE_SIZE) setAllSongsHasMore(false)
      else setAllSongsHasMore(true)

      setAllSongsPage(page)

      // also load liked set for current user on first page so we can show checkmarks
      if (page === 1) {
        try {
          if (token) {
            const lr = await fetch(API('api/user/liked'), { headers: { Authorization: `Bearer ${token}` } })
            if (lr.ok) {
              const lj = await lr.json()
              const list = Array.isArray(lj.songs) ? lj.songs : (Array.isArray(lj) ? lj : [])
              setLikedSet(new Set(list.map(s => String(s._id || s.id))))
            }
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      if (e.name === 'AbortError') return
      console.warn('fetchAllSongs error', e)
    } finally {
      allSongsAbortRef.current = null
      setAllSongsLoading(false)
      setAllSongsLoadingMore(false)
    }
  }, [allSongs.length, token])

  // trigger fetch when overlay opens
  useEffect(() => {
    if (searchVisible) fetchAllSongs(1, true)
    else {
      // cancel if closing
      if (allSongsAbortRef.current) {
        try { allSongsAbortRef.current.abort() } catch (e) {}
        allSongsAbortRef.current = null
      }
    }
  }, [searchVisible, fetchAllSongs])

  const loadMoreAllSongs = useCallback(() => {
    if (!allSongsHasMore || allSongsLoading || allSongsLoadingMore) return
    fetchAllSongs(allSongsPage + 1)
  }, [allSongsHasMore, allSongsLoading, allSongsLoadingMore, allSongsPage, fetchAllSongs])

  // save a recent search term
  const saveRecentSearch = useCallback(async (q) => {
    if (!q) return
    try {
      const raw = await AsyncStorage.getItem(RECENTS_SEARCH_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      const filtered = (parsed || []).filter(s => s !== q)
      filtered.unshift(q)
      const next = filtered.slice(0, 12)
      await AsyncStorage.setItem(RECENTS_SEARCH_KEY, JSON.stringify(next))
      setRecentSearches(next)
    } catch (e) { }
  }, [])

  // cancel any ongoing search
  const cancelOngoingSearch = useCallback(() => {
    if (abortRef.current) {
      try { abortRef.current.abort() } catch (e) {}
      abortRef.current = null
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  // perform search locally (no API call). This mirrors the "Your Songs" screen
  // behavior: filter the locally-fetched `allSongs` array and update results.
  const performSearch = useCallback((q) => {
    if (!q) {
      setSearchResults({ songs: [], playlists: [], artists: [] })
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    try {
      const query = String(q || '').trim().toLowerCase()
      if (!query) {
        setSearchResults({ songs: [], playlists: [], artists: [] })
        setSearchLoading(false)
        return
      }

      const matches = (allSongs || []).filter((item) => {
        const title = String(item.title || item.name || '').toLowerCase()
        const artist = String(item.artist || item.subtitle || item.user?.username || '').toLowerCase()
        return title.includes(query) || artist.includes(query)
      })

      // keep results bounded
      setSearchResults((prev) => ({ ...prev, songs: matches.slice(0, 200) }))
    } catch (e) {
      // swallow errors and fallback to empty results (no network warnings)
      console.warn('local search error', e)
      setSearchResults({ songs: [], playlists: [], artists: [] })
    } finally {
      setSearchLoading(false)
    }
  }, [allSongs])

  // toggle like for a song (home overlay)
  const toggleLikeHome = useCallback(async (song) => {
    // optimistic UI update: flip local liked state immediately
    if (!token) return Alert.alert('Not signed in')
    const key = String(song._id || song.id)
    setLikedSet((cur) => {
      const next = new Set(Array.from(cur))
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

    try {
      const res = await fetch(API(`api/songs/${song._id}/like`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        // revert optimistic change on failure
        setLikedSet((cur) => {
          const next = new Set(Array.from(cur))
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
        throw new Error(json?.error || json?.message || 'Failed to toggle like')
      }

      // reconcile with server's truth if provided
      if (typeof json?.liked !== 'undefined') {
        const liked = json.liked === true
        setLikedSet((cur) => {
          const next = new Set(Array.from(cur))
          if (liked) next.add(key); else next.delete(key)
          return next
        })
      }
    } catch (e) {
      console.warn('toggleLikeHome', e)
      // user already saw optimistic change; notify on error
      Alert.alert('Error', 'Could not update liked state')
    }
  }, [token])

  const fetchHomePlaylists = useCallback(async () => {
    if (!token) return
    setHomePlaylistsLoading(true)
    try {
      const res = await fetch(API('api/playlists/mine'), { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const j = await res.json()
      const list = Array.isArray(j.playlists) ? j.playlists : []
      setHomePlaylists(list)
    } catch (e) { console.warn('fetchHomePlaylists', e) } finally {
      setHomePlaylistsLoading(false)
    }
  }, [token])

  // Open playlist modal and lazily fetch user's playlists only when modal is shown
  const openAddToPlaylistFromHome = (song) => {
    setSelectedSongForPlaylist(song)
    setPlaylistModalVisibleHome(true)
  }

  // When the playlist modal becomes visible, fetch playlists if we don't have them yet
  useEffect(() => {
    if (playlistModalVisibleHome && (!homePlaylists || homePlaylists.length === 0) && token) {
      fetchHomePlaylists()
    }
  }, [playlistModalVisibleHome, homePlaylists.length, token, fetchHomePlaylists])

  const openSongMenuHome = async (song) => {
    setSelectedSongForMenu(song)
    setSongMenuVisibleHome(true)
  }

  const shareSongHome = async (song) => {
    try {
      await Share.share({ message: `${song.title || song.name} — ${song.artist || ''}\n${song.url || ''}` })
    } catch (e) {
      console.warn('shareSongHome failed', e)
      Alert.alert('Share failed', 'Could not share this song')
    }
  }

  const handleAddToPlaylistHome = async (playlistId) => {
    if (!playlistId || !selectedSongForPlaylist || !token) return
    try {
      const pr = await fetch(API(`api/playlists/${playlistId}`))
      const pj = await pr.json()
      const existing = Array.isArray(pj.playlist?.songs) ? pj.playlist.songs.map(s => s._id || s) : []
      const next = Array.from(new Set([...existing, String(selectedSongForPlaylist._id)]))
      const upr = await fetch(API(`api/playlists/${playlistId}`), {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ songs: next })
      })
      if (!upr.ok) throw new Error('Failed to update playlist')
      setPlaylistModalVisibleHome(false); setSelectedSongForPlaylist(null)
      Alert.alert('Added', 'Song added to playlist')
    } catch (e) { console.warn('handleAddToPlaylistHome', e); Alert.alert('Error', 'Failed to add song to playlist') }
  }

  // debounced handler with instant local filtering from `allSongs`.
  // Shows immediate matches from the local All Songs list while a debounced
  // server search runs and replaces/augments results when it completes.
  const onChangeSearch = useCallback((text) => {
    setSearchQuery(text)

    // immediate local filtering (fast, instant feedback)
    try {
      const q = String(text || '').trim().toLowerCase()
      if (!q) {
        // clear results when empty
        setSearchResults({ songs: [], playlists: [], artists: [] })
      } else if (allSongs && allSongs.length) {
        const localMatches = allSongs.filter((item) => {
          const title = String(item.title || item.name || '').toLowerCase()
          const artist = String(item.artist || item.subtitle || item.user?.username || '').toLowerCase()
          return title.includes(q) || artist.includes(q)
        })
        // show a bounded number of local matches to keep UI snappy
        setSearchResults((prev) => ({ ...prev, songs: localMatches.slice(0, 50) }))
      }

      // debounce the network search
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        performSearch(text)
      }, 300)
    } catch (e) {
      console.warn('onChangeSearch error', e)
    }
  }, [performSearch, allSongs])

  // open search: focus is applied via ref in SearchView
  const openSearch = useCallback(() => { setSearchVisible(true); setTimeout(() => Keyboard.dismiss(), 0) }, [])
  const closeSearch = useCallback(() => { setSearchVisible(false); setSearchQuery(''); cancelOngoingSearch() }, [cancelOngoingSearch])

  // animate overlay entry
  useEffect(() => {
    Animated.timing(searchAnim, { toValue: searchVisible ? 1 : 0, duration: 220, useNativeDriver: true }).start()
  }, [searchVisible])

  const loadRecents = async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENTS_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      // Defensive: only accept recent entries that are objects and contain an id or title
      const valid = Array.isArray(parsed)
        ? parsed
            .filter((it) => it && typeof it === 'object' && (it.id || it._id || it.title))
            .map((it) => ({ id: it.id || it._id || it.title, title: it.title || it.name || it.id, image: it.image || it.artworkUrl || null, subtitle: it.subtitle || '' }))
        : []
      setRecents(valid.slice(0, 8))
    } catch (e) {
      setRecents([])
    }
  }

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(API('api/playlists'))
      const json = await res.json()
      // prefer json.playlists array but accept either shape
      const rawList = Array.isArray(json.playlists) ? json.playlists : (Array.isArray(json) ? json : [])

      // filter to public playlists created by users. Some APIs use different flags
      const publicList = rawList.filter(pl => {
        if (!pl) return false
        const hasUser = !!(pl.user || pl.owner || pl.createdBy)
        const isPublicFlag = pl.isPublic === true || pl.public === true || pl.visibility === 'public' || pl.access === 'public'
        // allow if creator exists; prefer explicit public flag but allow when no private flag
        const noPrivateFlag = pl.private === false || pl.isPrivate === false || pl.visibility === undefined
        return hasUser && (isPublicFlag || noPrivateFlag)
      })

      const pickImage = pl => {
        if (!pl) return null
        if (pl.imageUrl) return pl.imageUrl
        if (pl.artworkUrl) return pl.artworkUrl
        if (pl.image && (pl.image.secure_url || pl.image.url)) return pl.image.secure_url || pl.image.url
        if (Array.isArray(pl.images) && pl.images.length) return pl.images[0].secure_url || pl.images[0].url
        if (Array.isArray(pl.songs) && pl.songs.length) return pl.songs[0]?.artworkUrl || pl.songs[0]?.artwork?.secure_url || pl.songs[0]?.artwork?.url || null
        return null
      }

      // keep only those with artwork
      const withImages = publicList.map(pl => ({ source: pl, image: pickImage(pl) })).filter(x => x.image)
      const mapped = withImages.map((g, idx) => ({
        id: g.source._id || g.source.id || `p${idx}`,
        title: g.source.title || g.source.name || 'Untitled',
        subtitle: g.source.user?.username || g.source.user?.name || g.source.owner?.name || 'Unknown',
        image: g.image,
        raw: g.source,
      }))

      // use up to first 6 grid items as featured (previous behavior) so hero rail shows multiple cards
      const grid = mapped
      const weekday = new Date().toLocaleString('en-US', { weekday: 'long' })
      // Keep original playlist id and raw data so hero taps navigate correctly to the playlist
      const featuredItems = grid.slice(0, 6).map((g, i) => ({
        ...g,
        id: g.id || `h${i}`,
        title: i === 0 ? `New Music ${weekday}` : g.title,
      }))

      // if nothing found, fall back to placeholders
      setGridItems(grid.length ? grid : Array.from({ length: 8 }).map((_, i) => ({ id: `g${i}`, title: `Playlist ${i+1}`, subtitle: `Curator ${i+1}`, image: `https://picsum.photos/seed/album${i}/300/300` })))
      setFeatured(featuredItems.length ? featuredItems : [
        { id: 'f1', title: `New Music ${weekday}`, subtitle: 'Latest releases', image: `https://picsum.photos/seed/${weekday.toLowerCase()}/400/200` },
        { id: 'f2', title: 'Release Radar', subtitle: 'Fresh picks', image: 'https://picsum.photos/seed/radar/400/200' },
      ])
    } catch (e) {
      console.warn('Home fetch error', e)
      setGridItems(Array.from({ length: 8 }).map((_, i) => ({ id: `g${i}`, title: `Playlist ${i+1}`, subtitle: `Curator ${i+1}`, image: `https://picsum.photos/seed/album${i}/300/300` })))
      setFeatured([
        { id: 'h1', title: 'New Music Friday', subtitle: 'Latest releases', image: `https://picsum.photos/seed/nmf/800/800` },
        { id: 'h2', title: 'Release Radar', subtitle: 'Fresh picks', image: `https://picsum.photos/seed/radar/800/800` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    await loadRecents()
    setRefreshing(false)
  }, [])

  const saveRecent = useCallback(async (item) => {
    try {
      const raw = await AsyncStorage.getItem(RECENTS_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      const key = item.id || item._id || item.title
      const filtered = (parsed || []).filter(x => String(x.id || x._id || x.title) !== String(key))
      filtered.unshift({ id: key, title: item.title, image: item.image, subtitle: item.subtitle })
      const next = filtered.slice(0, 8)
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next))
      setRecents(next)
    } catch (e) { /* ignore */ }
  }, [])

  const onPressSmall = useCallback(async (item) => {
    await saveRecent(item)
    const pid = item.raw?._id || item.id || item._id
    if (pid) router.push(`/Playlists/${pid}`)
    else if (item.track) playTrack && playTrack(item.track)
  }, [router, playTrack, saveRecent])

  const onPressHero = useCallback(async (item) => {
    await saveRecent(item)
    const pid = item.raw?._id || item.id || item._id
    if (pid) router.push(`/Playlists/${pid}`)
  }, [router, saveRecent])

  const onLongPressItem = useCallback((item) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({
        options: ['Cancel', 'Add to playlist', 'Share'],
        cancelButtonIndex: 0
      }, (i) => {
        if (i === 1) { /* add to playlist */ }
        if (i === 2) { /* share */ }
      })
    } else {
      alert('Actions: Add to playlist · Share')
    }
  }, [])

  // hero index tracking using momentum end
  const onHeroMomentum = (ev) => {
    const x = ev.nativeEvent.contentOffset.x
    const idx = Math.round(x / (HERO_W + 12))
    setHeroIndex(idx)
  }

  // header shrink/fade mapping
  const headerTranslate = scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, -38], extrapolate: 'clamp' })
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0.0], extrapolate: 'clamp' })
  const headerTitleScale = scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.86], extrapolate: 'clamp' })

  // break top grid into pairs for rendering without nested vertical lists
  const topItems = gridItems.slice(0, 8)
  const rows = []
  for (let i = 0; i < topItems.length; i += 2) rows.push([topItems[i], topItems[i + 1] || null])
  const mainGridItems = gridItems.slice(8)

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.bgLayer, { opacity: 1 }]} pointerEvents="none">
        <LinearGradient colors={[COLORS.background, '#051617', '#050205']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Animated.FlatList used so we can attach onScroll to scrollY for header animations */}
      <Animated.FlatList
        ListHeaderComponent={() => (
          <Animated.View style={{ transform: [{ translateY: headerTranslate }] }}>
            <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ scale: headerTitleScale }] }]}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => router.push('/Profile')} style={styles.avatarWrap}>
                  <Image source={ (authUser?.profileImage || authUser?.avatar) ? { uri: authUser?.profileImage || authUser?.avatar } : DEFAULT_PROFILE_IMAGE } style={styles.avatar} />
                </TouchableOpacity>
                <View style={styles.chipsRow}>
                  <Pill label="All" active={tab === 'All'} onPress={() => setTab('All')} />
                  <Pill label="Music" active={tab === 'Music'} onPress={() => setTab('Music')} />
                  <Pill label="Podcasts" active={tab === 'Podcasts'} onPress={() => setTab('Podcasts')} />
                </View>
              </View>
              <TouchableOpacity onPress={openSearch} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Open search"><Ionicons name="search" size={18} color={COLORS.textPrimary} /></TouchableOpacity>
            </Animated.View>

            {/* top compact grid (render as rows to avoid nested vertical lists) */}
            <View style={styles.compactGrid}>
              {rows.map((pair, idx) => (
                <View key={`r${idx}`} style={styles.rowPair}>
                  <SmallRowCard item={pair[0]} onPress={onPressSmall} onLongPress={onLongPressItem} />
                  {pair[1] ? <SmallRowCard item={pair[1]} onPress={onPressSmall} onLongPress={onLongPressItem} /> : <View style={{ width: TWO_COL_W }} />}
                </View>
              ))}
            </View>

            {/* Big heading */}
            <View style={styles.sectionHeader}>
              <Text style={styles.bigTitle}>It&apos;s New Music {new Date().toLocaleString('en-US', { weekday: 'long' })}!</Text>
            </View>

            {/* Hero pager (horizontal) */}
            <View style={styles.heroWrapper}>
              {loading ? (
                <FlatList
                  horizontal
                  data={[1, 2]}
                  keyExtractor={(i) => String(i)}
                  showsHorizontalScrollIndicator={false}
                  renderItem={() => <Skeleton w={HERO_W} h={HERO_H} style={{ marginLeft: H_PAD }} />}
                />
              ) : (
                <FlatList
                  ref={heroPagerRef}
                  horizontal
                  pagingEnabled
                  decelerationRate="fast"
                  snapToAlignment="start"
                  snapToInterval={HERO_W + 12}
                  showsHorizontalScrollIndicator={false}
                  data={featured}
                  keyExtractor={i => i.id}
                  renderItem={({ item }) => <HeroCard item={item} onPress={onPressHero} />}
                  onMomentumScrollEnd={onHeroMomentum}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollXRef.current } } }], // <<-- wired scrollXRef here
                    { useNativeDriver: false }
                  )}
                  scrollEventThrottle={16}
                  contentContainerStyle={{ paddingLeft: H_PAD }}
                />
              )}

              {/* dots indicator */}
              <View style={styles.dotsRow}>
                {(featured || []).map((_, i) => <View key={i} style={[styles.dot, i === heroIndex ? styles.dotActive : null]} />)}
              </View>
            </View>

            {/* recents horizontal list */}
            {recents && recents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recently played</Text>
                <FlatList
                  data={recents}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(i) => i.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.recentItem} onPress={() => onPressSmall(item)}>
                      <View style={styles.recentArtwork}><Image source={{ uri: item.image || DEFAULT_ARTWORK_URL }} style={styles.recentImage} /></View>
                      <Text numberOfLines={1} style={styles.recentTitle}>{item.title}</Text>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={{ paddingLeft: H_PAD }}
                />
              </View>
            )}

            
          </Animated.View>
        )}
        data={mainGridItems}
        keyExtractor={i => i.id}
        renderItem={({ item, index }) => (
          <View style={styles.row2}>
            <TouchableOpacity
              style={styles.cardSmall}
              onPress={() => onPressSmall(item)}
              onLongPress={() => onLongPressItem && onLongPressItem(item)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`${item.title} by ${item.subtitle}`}
            >
              <Image source={{ uri: item.image || DEFAULT_ARTWORK_URL }} style={styles.cardSmallImg} />
              <Text numberOfLines={1} style={styles.cardSmallTitle}>{item.title}</Text>
            </TouchableOpacity>
            {mainGridItems[index + 1] ? (
              <TouchableOpacity
                style={styles.cardSmall}
                onPress={() => onPressSmall(mainGridItems[index + 1])}
                onLongPress={() => onLongPressItem && onLongPressItem(mainGridItems[index + 1])}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel={`${mainGridItems[index + 1].title} by ${mainGridItems[index + 1].subtitle}`}
              >
                <Image source={{ uri: mainGridItems[index + 1].image || DEFAULT_ARTWORK_URL }} style={styles.cardSmallImg} />
                <Text numberOfLines={1} style={styles.cardSmallTitle}>{mainGridItems[index + 1].title}</Text>
              </TouchableOpacity>
            ) : <View style={{ width: TWO_COL_W }} />}
          </View>
        )}
        ListFooterComponent={<>
          <View style={styles.seeSection}>
            <Text style={styles.seeTitle}>See what others made</Text>
            <FlatList
              data={gridItems}
              keyExtractor={(i) => String(i.id)}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              // IMPORTANT: do not add horizontal padding here — parent `seeSection`
              // already provides `paddingHorizontal: H_PAD` so items align with the top grid
              columnWrapperStyle={{ justifyContent: 'space-between' }}
                contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
              renderItem={({ item }) => (
                <View style={{ width: TWO_COL_W, marginBottom: GAP }}>
                  <SeeGridCard item={item} onPress={onPressSmall} />
                </View>
              )}
            />
          </View>
          <View style={{ height: 120 }} />
        </>}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 180 }}
      />

      {/* Search overlay (full-screen, animated) */}
      {searchVisible && (
        <Animated.View style={[styles.searchOverlay, { opacity: searchAnim }]} pointerEvents="auto">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.searchContainer}>
            <View style={styles.searchTopRow}>
              <TouchableOpacity onPress={closeSearch} accessibilityRole="button" accessibilityLabel="Close search" style={styles.searchBack}>
                <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Animated.View style={[styles.searchInputWrap, { transform: [{ scale: searchAnim.interpolate({ inputRange: [0,1], outputRange: [0.98, 1] }) }] }] }>
                <View style={{ flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 10, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <Ionicons name="search" size={18} color={'rgba(255,255,255,0.6)'} style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search songs, playlists, artists"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={[styles.searchInput, { backgroundColor: 'transparent', paddingHorizontal: 0 }]}
                    value={searchQuery}
                    onChangeText={onChangeSearch}
                    accessible
                    accessibilityLabel="Search input"
                    autoFocus
                  />
                  {!!searchQuery && (
                    <TouchableOpacity onPress={() => { setSearchQuery(''); performSearch('') }} accessibilityRole="button" accessibilityLabel="Clear search" style={{ paddingLeft: 8 }}>
                      <Ionicons name="close" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
              <TouchableOpacity onPress={() => { setSearchQuery(''); performSearch('') }} accessibilityRole="button" accessibilityLabel="Clear search" style={styles.searchClear}>
                <Text style={{ color: COLORS.primary }}>Clear</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchBody}>
              {searchQuery.trim().length === 0 ? (
                // show recents and trending
                <View>
                  {recentSearches.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.searchSectionTitle}>Recent searches</Text>
                      <View style={styles.recentRow}>
                        {recentSearches.map((s) => (
                          <TouchableOpacity key={s} onPress={() => { setSearchQuery(s); performSearch(s); saveRecentSearch(s) }} style={styles.recentPill} accessibilityRole="button" accessibilityLabel={`Recent search ${s}`}>
                            <Text style={styles.recentPillText}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  <View>
                    <Text style={styles.searchSectionTitle}>Trending</Text>
                    <View style={styles.recentRow}>
                      {trending.map((t) => (
                        <TouchableOpacity key={String(t)} onPress={() => { setSearchQuery(t); performSearch(t); saveRecentSearch(t) }} style={styles.recentPill} accessibilityRole="button" accessibilityLabel={`Trending ${t}`}>
                          <Text style={styles.recentPillText}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {/* All songs list (fetches when overlay opens) */}
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.searchSectionTitle}>All songs</Text>
                    {allSongsLoading ? (
                      <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />
                    ) : (
                      <FlatList
                        data={allSongs}
                        keyExtractor={(i) => String(i.id || i._id || i.title)}
                        style={{ maxHeight: 360 }}
                        showsVerticalScrollIndicator={true}
                        onEndReached={() => { loadMoreAllSongs() }}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={() => (
                          allSongsLoadingMore ? <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} /> : null
                        )}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            onPress={async () => {
                              await saveRecentSearch(item.title || item.name || item._id)
                              // play immediately using player store; use allSongs as queue
                              try {
                                const idx = (allSongs || []).findIndex(s => String(s._id || s.id) === String(item._id || item.id))
                                playTrack && playTrack(item, allSongs || [item], idx >= 0 ? idx : 0)
                              } catch (e) { console.warn('play from allSongs failed', e) }
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Song ${item.title || item.name}`}
                          >
                            <Image source={{ uri: item.artworkUrl || item.image || item.cover || DEFAULT_ARTWORK_URL }} style={{ width: 56, height: 56, borderRadius: 6, backgroundColor: DEFAULT_ARTWORK_BG }} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text numberOfLines={1} style={styles.resultRowTitle}>{item.title || item.name}</Text>
                              <Text numberOfLines={1} style={styles.resultRowSub}>{item.artist || item.subtitle || ''}</Text>
                            </View>
                            <AddCircleButton isAdded={likedSet.has(String(item._id || item.id))} onPress={() => toggleLikeHome(item)} size={30} />
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); openSongMenuHome(item) }} style={{ paddingLeft: 10, paddingRight: 6 }}>
                              <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                      />
                    )}
                  </View>
                </View>
              ) : (
                // show sectioned results: Songs / Playlists / Artists
                <View>
                  {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.searchSectionTitle}>Songs</Text>
                    <FlatList
                      data={searchResults.songs}
                      keyExtractor={(i) => String(i.id || i._id || i.trackId || i.title)}
                        renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={async () => {
                            await saveRecentSearch(searchQuery)
                            // play from the filtered results
                            try {
                              const list = searchResults?.songs || []
                              const idx = list.findIndex(s => String(s._id || s.id || s.trackId) === String(item._id || item.id || item.trackId))
                              playTrack && playTrack(item, list.length ? list : [item], idx >= 0 ? idx : 0)
                            } catch (e) { console.warn('play from searchResults failed', e) }
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Song ${item.title}`}
                        >
                          <Image source={{ uri: item.artworkUrl || item.image || item.cover || DEFAULT_ARTWORK_URL }} style={{ width: 56, height: 56, borderRadius: 6, backgroundColor: DEFAULT_ARTWORK_BG }} />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text numberOfLines={1} style={styles.resultRowTitle}>{item.title || item.name}</Text>
                            <Text numberOfLines={1} style={styles.resultRowSub}>{item.artist || item.subtitle || ''}</Text>
                          </View>
                          <AddCircleButton isAdded={likedSet.has(String(item._id || item.id))} onPress={() => toggleLikeHome(item)} size={30} />
                          <TouchableOpacity onPress={(e) => { e.stopPropagation(); openSongMenuHome(item) }} style={{ paddingLeft: 10, paddingRight: 6 }}>
                            <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textSecondary} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      )}
                      onEndReached={() => { /* implement per-section pagination if API supports */ }}
                      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                      scrollEnabled={false}
                    />
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.searchSectionTitle}>Playlists</Text>
                    <FlatList
                      data={searchResults.playlists}
                      keyExtractor={(i) => String(i.id || i._id)}
                      renderItem={({ item }) => (
                        <TouchableOpacity onPress={async () => { await saveRecentSearch(searchQuery); const pid = item._id || item.id; if (pid) router.push(`/Playlists/${pid}`) }} style={styles.resultRow} accessibilityRole="button" accessibilityLabel={`Playlist ${item.title}`}>
                          <Text numberOfLines={1} style={styles.resultRowTitle}>{item.title}</Text>
                          <Text numberOfLines={1} style={styles.resultRowSub}>{item.subtitle || item.user?.username}</Text>
                        </TouchableOpacity>
                      )}
                      onEndReached={() => { /* load more playlists */ }}
                      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                      scrollEnabled={false}
                    />
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.searchSectionTitle}>Artists</Text>
                    <FlatList
                      data={searchResults.artists}
                      keyExtractor={(i) => String(i.id || i._id)}
                      renderItem={({ item }) => (
                        <TouchableOpacity onPress={async () => { await saveRecentSearch(searchQuery); const aid = item._id || item.id; if (aid) router.push(`/Artists/${aid}`) }} style={styles.resultRow} accessibilityRole="button" accessibilityLabel={`Artist ${item.name}`}>
                          <Text numberOfLines={1} style={styles.resultRowTitle}>{item.name || item.title}</Text>
                          <Text numberOfLines={1} style={styles.resultRowSub}>{item.subtitle || ''}</Text>
                        </TouchableOpacity>
                      )}
                      onEndReached={() => { /* load more artists */ }}
                      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                      scrollEnabled={false}
                    />
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
      {/* Home: Song options modal (Add to playlist, Share) */}
      <Modal visible={songMenuVisibleHome} transparent animationType="fade" onRequestClose={() => { setSongMenuVisibleHome(false); setSelectedSongForMenu(null) }}>
        <TouchableWithoutFeedback onPress={() => { setSongMenuVisibleHome(false); setSelectedSongForMenu(null) }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: COLORS.cardBackground, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Song Actions</Text>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={() => { openAddToPlaylistFromHome(selectedSongForMenu); setSongMenuVisibleHome(false) }}>
                  <Ionicons name="add" size={20} color={COLORS.textPrimary} />
                  <Text style={{ color: COLORS.textPrimary, marginLeft: 12, fontSize: 16 }}>Add to Playlist</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={() => { shareSongHome(selectedSongForMenu); setSongMenuVisibleHome(false) }}>
                  <Ionicons name="share-social" size={20} color={COLORS.textPrimary} />
                  <Text style={{ color: COLORS.textPrimary, marginLeft: 12, fontSize: 16 }}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }} onPress={() => { setSongMenuVisibleHome(false); setSelectedSongForMenu(null) }}>
                  <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Home: Playlist selection modal (when adding from Home) */}
      <Modal visible={playlistModalVisibleHome} transparent animationType="fade" onRequestClose={() => setPlaylistModalVisibleHome(false)}>
        <TouchableWithoutFeedback onPress={() => setPlaylistModalVisibleHome(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: COLORS.cardBackground, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%' }}>
                <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Select Playlist</Text>
                {homePlaylistsLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 12 }} />
                ) : (homePlaylists && homePlaylists.length ? (
                  <FlatList
                    data={homePlaylists}
                    keyExtractor={(p) => String(p._id || p.id)}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={{ paddingVertical: 12 }} onPress={() => handleAddToPlaylistHome(item._id || item.id)}>
                        <Text style={{ color: COLORS.textPrimary, fontSize: 16 }}>{item.title || item.name}</Text>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{(item.songs?.length || 0)} songs</Text>
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <View style={{ paddingVertical: 12 }}>
                    <Text style={{ color: COLORS.textSecondary }}>You don't have any playlists yet.</Text>
                  </View>
                ))}
                <TouchableOpacity style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }} onPress={() => setPlaylistModalVisibleHome(false)}>
                  <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  )
}

// Styles (compact / Spotify-like)
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  bgLayer: { ...StyleSheet.absoluteFillObject },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, paddingTop: 12, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarWrap: { width: 42, height: 42, borderRadius: 22, overflow: 'hidden', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  avatar: { width: '100%', height: '100%' },
  chipsRow: { flexDirection: 'row', alignItems: 'center' },
  pill: { marginRight: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  pillInactive: { backgroundColor: 'transparent' },
  pillActive: { borderWidth: 1.5, borderColor: COLORS.primary },
  pillText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#fff', fontWeight: '800' },
  iconBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },

  // tighter compact grid for top playlists (squized)
  compactGrid: { paddingHorizontal: H_PAD, marginTop: 4, marginBottom: 4 },
  rowPair: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  smallRow: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, flexDirection: 'row', alignItems: 'center', padding: 6, width: TWO_COL_W },
  thumbWrap: { width: 46, height: 46, borderRadius: 8, overflow: 'hidden', marginRight: 8 },
  thumb: { width: '100%', height: '100%' },
  rowMeta: { flex: 1 },
  rowTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 13 },
  rowSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },

  sectionHeader: { paddingHorizontal: H_PAD, marginTop: 8, marginBottom: 4 },
  bigTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '900' },

  heroWrapper: { paddingVertical: 6 },
  heroCard: { width: HERO_W, height: HERO_H, borderRadius: 12, overflow: 'hidden', marginRight: 12 },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  heroLabel: { position: 'absolute', left: 12, bottom: 12 },
  heroTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  heroDesc: { color: 'rgba(255,255,255,0.85)', marginTop: 4, fontSize: 11 },

  dotsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: H_PAD, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)', marginRight: 6 },
  dotActive: { backgroundColor: COLORS.primary },

  section: { paddingVertical: 8, paddingTop: 12 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', paddingLeft: H_PAD, marginBottom: 8 },
  recentItem: { marginRight: 12, width: 110, paddingLeft: H_PAD },
  recentArtwork: { width: 110, height: 110, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)' },
  recentImage: { width: '100%', height: '100%' },
  recentTitle: { color: COLORS.textPrimary, marginTop: 8, width: 110, fontSize: 12 },

  row2: { flexDirection: 'row', paddingHorizontal: H_PAD, justifyContent: 'space-between', marginBottom: 12 },
  cardSmall: {
    width: TWO_COL_W,
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 }
    })
  },
  // reduce vertical height (keep horizontal width intact)
  // reduce vertical height more to make cards shorter while preserving width
  cardSmallImg: { width: '100%', height: Math.round(TWO_COL_W * 0.62), borderRadius: 10, resizeMode: 'cover', backgroundColor: 'rgba(0, 81, 92, 0.91)' },
  cardSmallTitle: { color: COLORS.textPrimary, fontWeight: '700', marginTop: 6, fontSize: 13 },

  miniContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, pointerEvents: 'box-none' },
  miniBar: { height: 64, borderRadius: 12, backgroundColor: '#6b1f2a', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  miniLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  miniImg: { width: 52, height: 52, borderRadius: 6 },
  miniTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  miniSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  miniRight: { flexDirection: 'row', alignItems: 'center' },
  miniProgressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 6, borderRadius: 2, overflow: 'hidden' },
  miniProgress: { height: 3, backgroundColor: COLORS.primary, width: '20%' },

  // See others section
  seeSection: { paddingHorizontal: H_PAD, marginTop: 0, marginBottom: 14, paddingTop: 12 },
  seeTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '900', marginBottom: 14 },
  seeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  seeCard: { width: TWO_COL_W, borderRadius: 10, overflow: 'hidden', backgroundColor: 'transparent' },
  // MATCH the main grid card's image aspect ratio so rows align visually.
  // Using same aspect multiplier as cardSmallImg: ~0.62 (keeps height consistent)
  seeImgWrap: { width: TWO_COL_W, height: Math.round(TWO_COL_W * 0.62), borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)' },
  seeImg: { width: '100%', height: '100%', borderRadius: 0 },
  seeOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  seeOverlaySimple: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.36)' },
  seeBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.36)', padding: 6, borderRadius: 8 },
  seeCardTitle: { color: COLORS.textPrimary, fontWeight: '800', marginTop: 8, fontSize: 15 },
  seeCardSub: { color: COLORS.textSecondary, marginTop: 4, fontSize: 12, opacity: 0.95 },

  // Search overlay styles
  searchOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(4,8,10,0.96)', zIndex: 60 },
  searchContainer: { flex: 1, paddingTop: 44 },
  searchTopRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: H_PAD },
  searchBack: { paddingRight: 12 },
  searchInputWrap: { flex: 1, marginRight: 8 },
  searchInput: { height: 44, borderRadius: 10, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.04)', color: COLORS.textPrimary },
  searchClear: { paddingLeft: 6 },
  searchBody: { paddingHorizontal: H_PAD, paddingTop: 12 },
  searchSectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap' },
  recentPill: { backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  recentPillText: { color: COLORS.textPrimary },
  resultRow: { paddingVertical: 8 },
  resultRowTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  resultRowSub: { color: COLORS.textSecondary, marginTop: 2, fontSize: 12 },

  // tighten up the main grid cards so everything feels compact and balanced
  thumb: { width: '100%', height: '100%', backgroundColor: 'rgba(0, 81, 92, 0.91)' },
  recentImage: { width: '100%', height: '100%', backgroundColor: 'rgba(0, 81, 92, 0.91)' },
  cardSmallImg: { width: '100%', height: Math.round(TWO_COL_W * 0.62), borderRadius: 10, resizeMode: 'cover', backgroundColor: 'rgba(0, 81, 92, 0.91)' },
})
