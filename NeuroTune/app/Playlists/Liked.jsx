import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
  RefreshControl,
  TextInput,
  Animated,
} from 'react-native'
import COLORS from '../../constants/colors'
import { API_URL, API } from '../../constants/api'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import usePlayerStore from '../../store/playerStore'
// remove PlayerContainer from this screen to hide mini player
import ContextMenu from '../../components/ContextMenu'
import GradientBackground from '../../components/GradientBackground'
import { useAuthStore } from '../../store/authStore'
import Reanimated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate, Extrapolate } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
const AnimatedImage = Reanimated.createAnimatedComponent(Image)
const AnimatedFlatList = Reanimated.createAnimatedComponent(FlatList)
const AnimatedText = Reanimated.createAnimatedComponent(Text)
const AnimatedLinearGradient = Reanimated.createAnimatedComponent(LinearGradient)

// Liked Songs screen
// Assumptions: backend exposes an endpoint to GET liked songs and to remove a liked song.
// We'll try GET `${API_URL}api/users/liked` then fallback to `${API_URL}api/songs/liked` if 404.

export default function LikedSongs() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuTarget, setMenuTarget] = useState(null)
  const [menuAnim] = useState(new Animated.Value(0))
  const [refreshing, setRefreshing] = useState(false)
  const scrollYRef = useRef(null)
  const scrollY = useSharedValue(0)
  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState('Songs')
  const { token } = useAuthStore()
  const playTrack = usePlayerStore((s) => s.playTrack)
  const current = usePlayerStore((s) => s.current)
  const playerIsPlaying = usePlayerStore((s) => s.isPlaying)
  const pause = usePlayerStore((s) => s.pause)
  const resume = usePlayerStore((s) => s.resume)
  const navigation = useNavigation()

  useEffect(() => {
    fetchLiked()
  }, [])

  const onRefresh = async () => {
    try {
      setRefreshing(true)
      await fetchLiked()
    } catch (e) {
      console.warn('refresh liked', e)
    } finally {
      setRefreshing(false)
    }
  }

  const fetchLiked = async () => {
    setLoading(true)
    try {
      const res = await fetch(API('api/user/liked'), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) {
        // if unauthorized, return empty list; otherwise throw to be caught below
        if (res.status === 401) {
          setSongs([])
          return
        }
        const txt = await res.text()
        throw new Error(`GET /api/user/liked failed ${res.status}: ${txt?.slice?.(0,200)}`)
      }
      const json = await res.json()
      const list = Array.isArray(json.songs) ? json.songs : (Array.isArray(json) ? json : [])
      setSongs(list)
    } catch (e) {
      console.warn('fetchLiked', e)
      setSongs([])
    } finally {
      setLoading(false)
    }
  }

  const onPlay = useCallback(async (track) => {
    try {
      await playTrack(track, songs, songs.findIndex((s) => String(s._id) === String(track._id)))
    } catch (e) {
      console.warn('play error', e)
    }
  }, [playTrack, songs])

  const openMenu = (song) => {
    setMenuTarget(song)
    setMenuVisible(true)
    Animated.timing(menuAnim, { toValue: 1, duration: 240, useNativeDriver: true }).start()
  }

  const closeMenu = () => {
    Animated.timing(menuAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setMenuVisible(false)
      setMenuTarget(null)
    })
  }

  const removeFromLiked = async (song) => {
    try {
      if (!token) return Alert.alert('Not signed in')
      // Use new toggle endpoint
      const res = await fetch(API(`api/songs/${song._id}/like`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      let json = null
      try { json = await res.json() } catch (e) {
        const txt = await res.text();
        try { json = JSON.parse(txt) } catch (e2) { json = { error: txt } }
      }
      if (!res.ok) {
        throw new Error(json.error || json.message || 'Failed to toggle like')
      }
      // If the result indicates the song is now unliked, remove it from UI
      if (json.liked === false) {
        setSongs((cur) => cur.filter((s) => String(s._id) !== String(song._id)))
        Alert.alert('Removed', 'Song removed from Liked')
      } else {
        // If liked===true, ensure it exists in the list (rare for remove action)
        setSongs((cur) => {
          if (cur.some((s) => String(s._id) === String(song._id))) return cur
          return [song, ...cur]
        })
        Alert.alert('Added', 'Song added to Liked')
      }
    } catch (e) {
      console.warn('remove liked', e)
      Alert.alert('Error', 'Could not remove liked')
    } finally {
      closeMenu()
    }
  }

  const addToPlaylist = async (song) => {
    // For simplicity open a prompt or call appropriate endpoint
    Alert.alert('Add to Playlist', 'Not implemented in this demo')
    closeMenu()
  }

  const shareSong = async (song) => {
    try {
      await Share.share({ message: `${song.title} — ${song.artist}\n${song.url || ''}` })
    } catch (e) {}
    closeMenu()
  }

  const playNext = async (song) => {
    // Insert as next in queue; simple behaviour: play immediately after current by building new queue
    // For demo we'll just play the song
    await onPlay(song)
    closeMenu()
  }

  const renderItem = useCallback(({ item }) => {
    const isPlaying = current && current._id === item._id
    return (
      <TouchableOpacity onPress={() => onPlay(item)} onLongPress={() => openMenu(item)} style={styles.item} activeOpacity={0.8}>
        <Image source={{ uri: item.artworkUrl || item.imageUrl || item.cover }} style={[styles.artwork, isPlaying && styles.playingArtwork]} />
        <View style={styles.itemText}>
          <Text numberOfLines={1} style={[styles.title, isPlaying && styles.playingText]}>{item.title}</Text>
          <Text numberOfLines={1} style={styles.subtitle}>{item.artist || item.artists?.join(', ') || ''}</Text>
        </View>
        <Text style={styles.duration}>{formatDuration(item.duration || item.size)}</Text>
        <TouchableOpacity onPress={() => openMenu(item)} style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }, [onPlay, current])

  const keyExtractor = useCallback((i) => String(i._id || i.id || i.title), [])

  // Reanimated-driven header interpolation
  const HEADER_MAX = 220
  const HEADER_MIN = 80
  const HEADER_SCROLL = HEADER_MAX - HEADER_MIN

  const onScroll = useAnimatedScrollHandler((ev) => {
    scrollY.value = ev.contentOffset.y
  })

  const headerStyle = useAnimatedStyle(() => {
    const h = interpolate(scrollY.value, [0, HEADER_SCROLL], [HEADER_MAX, HEADER_MIN], Extrapolate.CLAMP)
    return { height: h }
  })

  const playButtonAnimatedStyle = useAnimatedStyle(() => {
    // place the play button lower (aligned near the title area) and move it with header collapse
    const top = interpolate(scrollY.value, [0, HEADER_SCROLL], [HEADER_MAX - 64, HEADER_MIN - 36], Extrapolate.CLAMP)
    // fade out the floating button as the collapsed header appears
    const opacity = interpolate(scrollY.value, [HEADER_SCROLL * 0.6, HEADER_SCROLL], [1, 0], Extrapolate.CLAMP)
    return { top, opacity }
  })

  // collapsed header animated style (fades in and slides down as header collapses)
  const collapsedHeaderStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [HEADER_SCROLL * 0.6, HEADER_SCROLL], [0, 1], Extrapolate.CLAMP)
    const opacity = progress
    const translateY = interpolate(progress, [0, 1], [-8, 0], Extrapolate.CLAMP)
    return { opacity, transform: [{ translateY }], zIndex: 60 }
  })

  // seam play button - appears at the seam (end of header / start of list)
  const seamPlayStyle = useAnimatedStyle(() => {
    // compute header height and position the button center at header bottom
    const headerH = interpolate(scrollY.value, [0, HEADER_SCROLL], [HEADER_MAX, HEADER_MIN], Extrapolate.CLAMP)
    const BUTTON_SIZE = 56
  // move the seam play higher so it sits more over the header
  const top = headerH - (BUTTON_SIZE / 2) - 20
    // appear slightly later so the floating play fully hides before seam shows
    const visible = interpolate(scrollY.value, [HEADER_SCROLL * 0.92, HEADER_SCROLL], [0, 1], Extrapolate.CLAMP)
    const scale = interpolate(scrollY.value, [HEADER_SCROLL * 0.92, HEADER_SCROLL], [0.95, 1], Extrapolate.CLAMP)
    return { opacity: visible, top, transform: [{ scale }], zIndex: 140 }
  })

  const titleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, HEADER_SCROLL], [1, 0], Extrapolate.CLAMP)
    const scale = interpolate(scrollY.value, [0, HEADER_SCROLL], [1, 0.92], Extrapolate.CLAMP)
    return { opacity, transform: [{ scale }] }
  })

  const headerImageStyle = useAnimatedStyle(() => {
    const s = interpolate(scrollY.value, [0, HEADER_SCROLL], [1, 0.7], Extrapolate.CLAMP)
    // move image up as header collapses so it gets hidden behind the collapsed header
    const translateY = interpolate(scrollY.value, [0, HEADER_SCROLL], [0, -Math.max(40, HEADER_SCROLL * 0.6)], Extrapolate.CLAMP)
    const opacity = interpolate(scrollY.value, [0, HEADER_SCROLL * 0.6, HEADER_SCROLL], [1, 0.6, 0], Extrapolate.CLAMP)
    return { transform: [{ scale: s }, { translateY }], opacity }
  })

  const searchBoxStyle = useAnimatedStyle(() => {
    // pin search box to the top of the header (so it doesn't overlap artwork)
    // allow a small upward shift when scrolling for a smooth effect
    const top = interpolate(scrollY.value, [0, HEADER_SCROLL], [16, 8], Extrapolate.CLAMP)
    const padding = interpolate(scrollY.value, [0, HEADER_SCROLL], [10, 6], Extrapolate.CLAMP)
    const opacity = interpolate(scrollY.value, [0, HEADER_SCROLL * 0.6, HEADER_SCROLL], [1, 0.95, 0.85], Extrapolate.CLAMP)
    return { position: 'absolute', left: 16, right: 16, top, paddingVertical: padding, opacity, zIndex: 50 }
  })

  const TAB_HEIGHT = 56
  const tabsAnimatedStyle = useAnimatedStyle(() => {
    const top = interpolate(scrollY.value, [0, HEADER_SCROLL], [HEADER_MAX - 36, HEADER_MIN - 36], Extrapolate.CLAMP)
    // hide tabs while header image is visible; fade/slide in as header collapses
    const opacity = interpolate(scrollY.value, [0, HEADER_SCROLL * 0.7, HEADER_SCROLL], [0, 0.3, 1], Extrapolate.CLAMP)
    const translateY = interpolate(scrollY.value, [0, HEADER_SCROLL], [8, 0], Extrapolate.CLAMP)
    return { position: 'absolute', left: 16, right: 16, top, opacity, transform: [{ translateY }] }
  })

  // filtering based on search text and active tab
  const filtered = useMemo(() => {
    const q = (searchText || '').trim().toLowerCase()
    let base = songs || []
    if (q) {
      base = base.filter(s => (s.title || '').toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q) || (s.album || '').toLowerCase().includes(q))
    }
    // simplistic tab logic: Songs => all, Artists => group by artist, Albums => group by album
    if (activeTab === 'Artists') {
      // group by artist and show unique artist entries
      const seen = new Set()
      return base.reduce((acc, s) => {
        const key = (s.artist || s.artists?.[0] || '').toLowerCase()
        if (!seen.has(key)) { seen.add(key); acc.push({ ...s, title: s.artist || s.artists?.[0] || 'Unknown Artist' }) }
        return acc
      }, [])
    }
    if (activeTab === 'Albums') {
      const seen = new Set()
      return base.reduce((acc, s) => {
        const key = (s.album || s.albumName || s.collection || '').toLowerCase()
        if (!seen.has(key)) { seen.add(key); acc.push({ ...s, title: s.album || s.albumName || s.collection || 'Unknown Album' }) }
        return acc
      }, [])
    }
    return base
  }, [songs, searchText, activeTab])

  const playAll = useCallback(async () => {
    if (!songs || songs.length === 0) return
    const first = songs[0]
    // if something is playing, pause it
    if (playerIsPlaying) {
      await pause()
      return
    }
    // if nothing playing but the first track is loaded, resume it
    if (current && String(current._id) === String(first._id)) {
      await resume()
      return
    }
    // otherwise start playing the first track
    await onPlay(first)
  }, [songs, onPlay, current, playerIsPlaying, pause, resume])

  if (loading) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={COLORS.primary} /></View>

  return (
    <GradientBackground variant="teal" bottomDark={true}>
      <View style={[styles.container, { backgroundColor: 'transparent' }]}> 
        {/* header overlay - positioned absolute so list scrolls under it */}
        <Reanimated.View style={[styles.header, headerStyle]} >
          <AnimatedImage source={{ uri: songs[0]?.artworkUrl || songs[0]?.imageUrl }} style={[styles.headerImage, headerImageStyle]} />
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerSubtitle}>Your favorites in one place</Text>
            <AnimatedText style={[styles.headerTitle, titleAnimatedStyle]}>Liked Songs</AnimatedText>
          </View>
          <Reanimated.View style={[styles.playAllContainer, playButtonAnimatedStyle]} pointerEvents={undefined}>
            <TouchableOpacity style={styles.playAll} onPress={playAll}>
              {current && String(current._id) === String(songs[0]?._id) && playerIsPlaying ? (
                <Ionicons name="pause" size={22} color={COLORS.black} />
              ) : (
                <Ionicons name="play" size={22} color={COLORS.black} />
              )}
            </TouchableOpacity>
          </Reanimated.View>

          {/* search box - animated */}
          <Reanimated.View style={[styles.searchBoxWrap, searchBoxStyle]}>
            <View style={styles.searchInner}>
              <Ionicons name="search" size={18} color={'rgba(255,255,255,0.7)'} style={styles.searchIcon} />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search liked songs, artists, albums"
                placeholderTextColor={'rgba(255,255,255,0.7)'}
                style={styles.searchInput}
                underlineColorAndroid="transparent"
              />
            </View>
          </Reanimated.View>
        </Reanimated.View>

        <AnimatedFlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: HEADER_MAX + 24, paddingBottom: 140 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        />
        
        {/* Collapsed header (shows when scrolled up) */}
        <AnimatedLinearGradient
          // darker vertical gradient: cardBackground -> inputBackground -> background
          colors={[COLORS.cardBackground, COLORS.inputBackground]}
          locations={[0, 0.8]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.collapsedHeader, collapsedHeaderStyle]}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.collapsedTitle}>Liked Songs</Text>
        </AnimatedLinearGradient>

        {/* seam play button: appears centered at the header/list seam when collapsed */}
        <Reanimated.View style={[styles.seamPlayContainer, seamPlayStyle]} pointerEvents="box-none">
          <TouchableOpacity style={styles.seamPlayButton} onPress={playAll} activeOpacity={0.85}>
            {playerIsPlaying ? (
              <Ionicons name="pause" size={22} color={COLORS.black} />
            ) : (
              <Ionicons name="play" size={22} color={COLORS.black} />
            )}
          </TouchableOpacity>
        </Reanimated.View>
        <ContextMenu
          menuVisible={menuVisible}
          closeMenu={closeMenu}
          menuAnim={menuAnim}
          menuTarget={menuTarget}
          playNext={playNext}
          removeFromLiked={removeFromLiked}
          addToPlaylist={addToPlaylist}
          shareSong={shareSong}
        />

        {/* dark bottom overlay to reduce brightness and emulate Spotify-style footer */}
        <View pointerEvents="none" style={styles.bottomDark} />
      </View>
    </GradientBackground>
  )
}

function formatDuration(d) {
  if (!d) return ''
  const s = Math.floor((d/1000) % 60)
  const m = Math.floor((d/1000/60) % 60)
  return `${m}:${s.toString().padStart(2,'0')}`
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    // increase paddingTop so the search bar can sit above the image/title without overlap
    paddingTop: 72,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  headerImage: {
    width: 120,
    height: 120,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  playAll: {
    // moved absolute positioning to wrapper so this is only visual button styling
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },

  playAllContainer: {
    position: 'absolute',
    right: 18,
    zIndex: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: COLORS.cardBackground,
  },
  playingArtwork: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  itemText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  duration: {
    color: COLORS.textSecondary,
    marginLeft: 8,
    width: 48,
    textAlign: 'right',
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuCard: {
    backgroundColor: 'rgba(18,18,24,0.85)',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backdropFilter: 'blur(8px)',
  },
  menuTitle: { color: COLORS.textPrimary, fontWeight: '700', marginBottom: 8 },
  menuOption: { paddingVertical: 12 },
  menuOptionText: { color: COLORS.textPrimary, fontSize: 16 },
  miniPlayerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 84,
    paddingHorizontal: 12,
  },
  searchBoxWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    // top is controlled by the animated style `searchBoxStyle` so the box
    // remains visually anchored inside the header and moves with it.
  },
  searchInput: {
    height: 44,
    flex: 1,
    paddingHorizontal: 10,
    color: COLORS.textPrimary,
  },
  searchInner: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  collapsedHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground
  },
  backButton: {
    position: 'absolute',
    left: 8,
    top: 12,
    padding: 8,
  },
  collapsedTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  seamPlayContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
  },
  seamPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.98,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 18,
  },
 
  bottomDark: {
    ...StyleSheet.absoluteFillObject,
    bottom: 0,
    height: 220,
    backgroundColor: 'transparent',
    // gradient handled by GradientBackground bottomDark prop; fallback overlay
  },
})
