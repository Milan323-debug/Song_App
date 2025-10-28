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
import { DEFAULT_ARTWORK_URL } from '../../constants/artwork'
import styles from '../../assets/styles/playlists.styles'
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
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false)
  const [playlists, setPlaylists] = useState([])
  const [playlistsLoading, setPlaylistsLoading] = useState(false)
  const [selectedForPlaylist, setSelectedForPlaylist] = useState(null)
  const scrollYRef = useRef(null)
  const scrollY = useSharedValue(0)
  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState('Songs')
  const { token } = useAuthStore()
  const authUser = useAuthStore((s) => s.user)
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
    // Open playlist selector modal and lazy-load user's playlists
    if (!token) {
      Alert.alert('Not signed in')
      return
    }
    try {
      setSelectedForPlaylist(song)
      // fetch playlists lazily
      if (!playlists || playlists.length === 0) await fetchUserPlaylists()
      setPlaylistModalVisible(true)
    } catch (e) {
      console.warn('open add to playlist', e)
      Alert.alert('Error', 'Could not open playlist selector')
    }
    closeMenu()
  }

  const fetchUserPlaylists = async () => {
    if (!token) return
    try {
      setPlaylistsLoading(true)
      const res = await fetch(`${API_URL}api/playlists/mine`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        setPlaylists([])
        return
      }
      const d = await res.json()
      const list = d && Array.isArray(d.playlists) ? d.playlists : []
      setPlaylists(list)
    } catch (e) {
      console.warn('fetchUserPlaylists', e)
      setPlaylists([])
    } finally {
      setPlaylistsLoading(false)
    }
  }

  const handleAddToPlaylist = async (playlistId) => {
    if (!playlistId || !selectedForPlaylist || !token) return
    try {
      // fetch current playlist songs
      const pr = await fetch(`${API_URL}api/playlists/${playlistId}`)
      if (!pr.ok) throw new Error('Failed to fetch playlist')
      const pj = await pr.json()
      const existing = Array.isArray(pj.playlist?.songs) ? pj.playlist.songs.map(s => String(s._id || s)) : []
      const next = Array.from(new Set([...existing, String(selectedForPlaylist._id || selectedForPlaylist.id)]))
      const upr = await fetch(`${API_URL}api/playlists/${playlistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ songs: next })
      })
      if (!upr.ok) throw new Error('Failed to update playlist')
      setPlaylistModalVisible(false)
      setSelectedForPlaylist(null)
      Alert.alert('Added', 'Song added to playlist')
    } catch (e) {
      console.error('add to playlist', e)
      Alert.alert('Error', 'Failed to add song to playlist')
    }
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
        <Image source={{ uri: item.artworkUrl || item.imageUrl || item.cover || DEFAULT_ARTWORK_URL }} style={[styles.songArtwork, isPlaying && styles.playingArtwork]} />
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

  // Listening mode UI
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeatMode = usePlayerStore((s) => s.repeatMode)
  const setShuffle = usePlayerStore((s) => s.setShuffle)
  const setRepeatMode = usePlayerStore((s) => s.setRepeatMode)

  const [modeSheetVisible, setModeSheetVisible] = useState(false)

  const openModeSheet = () => setModeSheetVisible(true)
  const closeModeSheet = () => setModeSheetVisible(false)

  const applyMode = (mode) => {
    // mode: 'order' | 'shuffle' | 'repeat-one' | 'repeat-all'
    if (mode === 'order') {
      setShuffle(false)
      setRepeatMode('off')
    } else if (mode === 'shuffle') {
      setShuffle(true)
      setRepeatMode('off')
    } else if (mode === 'repeat-one') {
      setShuffle(false)
      setRepeatMode('one')
    } else if (mode === 'repeat-all') {
      setShuffle(false)
      setRepeatMode('all')
    }
    closeModeSheet()
  }

  const getModeIcon = () => {
    // Always use a white icon for the small left-side listening-mode button
    const iconColor = '#ffffff'
    if (shuffle) return { name: 'shuffle', color: iconColor }
    if (repeatMode && repeatMode !== 'off') return { name: 'repeat', color: iconColor }
    return { name: 'list-outline', color: iconColor }
  }

  // animate mode button so it hides along with the floating play button as header collapses
  const modeButtonAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [HEADER_SCROLL * 0.6, HEADER_SCROLL], [1, 0], Extrapolate.CLAMP)
    const translateX = interpolate(scrollY.value, [0, HEADER_SCROLL], [0, -6], Extrapolate.CLAMP)
    return { opacity, transform: [{ translateX }], zIndex: 14 }
  })

  // seam mode should remain hidden (we don't introduce a separate mode button in the seam)
  const seamModeAnimatedStyle = useAnimatedStyle(() => ({ opacity: 0 }))

  if (loading) return (
    <GradientBackground variant="teal" bottomDark={true}>
      <View style={[styles.container, { backgroundColor: 'transparent', paddingTop: 8 }]}> 
        <View style={[styles.header, { height: 160, paddingTop: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.04)', marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <View style={{ width: 180, height: 18, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)' }} />
              <View style={{ width: 120, height: 14, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)', marginTop: 6 }} />
            </View>
          </View>
        </View>
        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 56, height: 56, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)' }} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <View style={{ width: '60%', height: 16, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)' }} />
                <View style={{ width: '40%', height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)', marginTop: 8 }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </GradientBackground>
  )

  return (
    <GradientBackground variant="teal" bottomDark={true}>
      <View style={[styles.container, { backgroundColor: 'transparent' }]}> 
        {/* header overlay - positioned absolute so list scrolls under it */}
        <Reanimated.View style={[styles.header, headerStyle]} >
          <AnimatedImage source={require('../../assets/images/heart5.png')} style={[styles.headerImage, headerImageStyle]} />
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerSubtitle}>Your favorites in one place</Text>
            <AnimatedText style={[styles.headerTitle, titleAnimatedStyle]}>Liked Songs</AnimatedText>
          </View>
          <Reanimated.View style={[styles.playAllContainer, playButtonAnimatedStyle]} pointerEvents={undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Reanimated.View style={modeButtonAnimatedStyle}>
                <TouchableOpacity onPress={openModeSheet} style={styles.modeButton}>
                  <Ionicons name={getModeIcon().name} size={26} color={getModeIcon().color} />
                </TouchableOpacity>
              </Reanimated.View>
              <TouchableOpacity style={styles.seamPlayButton} onPress={playAll} activeOpacity={0.85}>
              {playerIsPlaying ? (
                <Ionicons name="pause" size={27} color={COLORS.black} />
              ) : (
                <Ionicons name="play" size={22} color={COLORS.black} />
              )}
            </TouchableOpacity>
            </View>
          </Reanimated.View>

          {/* search box - animated */}
          <Reanimated.View style={[styles.searchBoxWrap, searchBoxStyle]}>
            <View style={styles.searchInner}>
              <Ionicons name="search" size={18} color={'rgba(198, 247, 255, 1)'} style={styles.searchIcon} />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search liked songs, artists, albums"
                placeholderTextColor={'rgba(198, 247, 255, 1)'}
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
          ListFooterComponent={() => <View style={{ height: 120 }} />}
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
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.collapsedTitle}>Liked Songs</Text>
        </AnimatedLinearGradient>

        {/* seam play button: appears centered at the header/list seam when collapsed */}
        <Reanimated.View style={[styles.seamPlayContainer, seamPlayStyle]} pointerEvents="box-none">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Reanimated.View style={seamModeAnimatedStyle}>
              <TouchableOpacity onPress={openModeSheet} style={styles.modeButtonSeam}>
                <Ionicons name={getModeIcon().name} size={22} color={getModeIcon().color} />
              </TouchableOpacity>
            </Reanimated.View>
            <TouchableOpacity style={styles.seamPlayButton} onPress={playAll} activeOpacity={0.85}>
              {playerIsPlaying ? (
                <Ionicons name="pause" size={27} color={COLORS.black} />
              ) : (
                <Ionicons name="play" size={22} color={COLORS.black} />
              )}
            </TouchableOpacity>
          </View>
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

        {/* Listening Mode bottom sheet */}
        <Modal visible={modeSheetVisible} transparent animationType="slide" onRequestClose={closeModeSheet}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={closeModeSheet} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <View style={{ backgroundColor: COLORS.cardBackground, padding: 16, paddingBottom: 36, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: 300 }}>
              <Text style={{ color: COLORS.textPrimary, fontSize: 22, fontWeight: '900', marginBottom: 18, textAlign: 'center' }}>Listening Mode</Text>
              <TouchableOpacity style={[styles.menuOption, { paddingVertical: 16 }]} onPress={() => applyMode('order')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View marginLeft={9} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="list-outline" size={30} color={'#fff'} style={{ marginRight: 18 }} />
                    <Text style={[styles.menuOptionText, { fontSize: 17, color: '#fff' }]}>Play in order</Text>
                  </View>
                  {( !shuffle && repeatMode === 'off' ) && <Ionicons name="checkmark" size={27} color={COLORS.primary} />}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuOption, { paddingVertical: 16 }]} onPress={() => applyMode('shuffle')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View marginLeft={9} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="shuffle" size={30} color={shuffle ? COLORS.primary : '#fff'} style={{ marginRight: 18 }} />
                    <Text style={[styles.menuOptionText, { fontSize: 17, color: '#fff' }]}>Shuffle</Text>
                  </View>
                  {shuffle && <Ionicons name="checkmark" size={27} color={COLORS.primary} />}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuOption, { paddingVertical: 16 }]} onPress={() => applyMode('repeat-one')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View marginLeft={9} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="repeat" size={30} color={repeatMode === 'one' ? COLORS.primary : '#fff'} style={{ marginRight: 18 }} />
                    <Text style={[styles.menuOptionText, { fontSize: 17 }]}>Repeat one</Text>
                  </View>
                  {repeatMode === 'one' && <Ionicons name="checkmark" size={27} color={COLORS.primary} />}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuOption, { paddingVertical: 16 }]} onPress={() => applyMode('repeat-all')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View marginLeft={9} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="repeat" size={30} color={repeatMode === 'all' ? COLORS.primary : '#fff'} style={{ marginRight: 18 }} />
                    <Text style={[styles.menuOptionText, { fontSize: 17 }]}>Repeat all</Text>
                  </View>
                  {repeatMode === 'all' && <Ionicons name="checkmark" size={27} color={COLORS.primary} />}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Playlist selection modal for 'Add to Playlist' */}
        <Modal visible={playlistModalVisible} transparent animationType="fade" onRequestClose={() => setPlaylistModalVisible(false)}>
          {/* Backdrop: justifyContent flex-end so sheet sits at bottom */}
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setPlaylistModalVisible(false)}>
            {/* Content container: tapping inside should not close the modal, so stop propagation by using a nested Pressable without onPress */}
            <Pressable onPress={() => {}} style={{ width: '100%', height: '100%', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: COLORS.cardBackground, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%' }}>
                <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Select Playlist</Text>
                {playlistsLoading ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <FlatList
                    data={playlists}
                    keyExtractor={(p) => p._id}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }} onPress={() => handleAddToPlaylist(item._id)}>
                        <Image source={{ uri: item.imageUrl || item.poster || item.cover || DEFAULT_ARTWORK_URL }} style={styles.songArtwork} />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text style={{ color: COLORS.textPrimary, fontSize: 16 }}>{item.title}</Text>
                          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{(item.songs?.length || 0)} songs</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={() => <Text style={{ color: COLORS.textSecondary }}>No playlists</Text>}
                  />
                )}
                <TouchableOpacity style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', alignItems: 'center' }} onPress={() => setPlaylistModalVisible(false)}>
                  <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* dark bottom overlay to reduce brightness and emulate Spotify-style footer */}
        <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, bottom: 0, height: 220, backgroundColor: 'transparent' }} />
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
