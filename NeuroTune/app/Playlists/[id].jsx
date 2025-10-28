import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
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
import { useLocalSearchParams } from 'expo-router'
import usePlayerStore from '../../store/playerStore'
import ContextMenu from '../../components/ContextMenu'
import GradientBackground from '../../components/GradientBackground'
import PlaybackModeButton from '../../components/PlaybackModeButton'
import { useAuthStore } from '../../store/authStore'
import Reanimated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate, Extrapolate } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import styles from '../../assets/styles/playlists.styles'
import { DEFAULT_ARTWORK_URL } from '../../constants/artwork'
import AddCircleButton from '../../components/AddCircleButton'

const AnimatedImage = Reanimated.createAnimatedComponent(Image)
const AnimatedFlatList = Reanimated.createAnimatedComponent(FlatList)
const AnimatedText = Reanimated.createAnimatedComponent(Text)
const AnimatedLinearGradient = Reanimated.createAnimatedComponent(LinearGradient)

export default function PlaylistDetail() {
  const { id } = useLocalSearchParams()
  const [playlist, setPlaylist] = useState(null)
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
  const [likedSet, setLikedSet] = useState(new Set())
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false)
  const [playlists, setPlaylists] = useState([])
  const [playlistsLoading, setPlaylistsLoading] = useState(false)
  const [selectedForPlaylist, setSelectedForPlaylist] = useState(null)

  useEffect(() => {
    fetchPlaylist()
  }, [id])

  const onRefresh = async () => {
    try {
      setRefreshing(true)
      await fetchPlaylist()
    } catch (e) {
      console.warn('refresh playlist', e)
    } finally {
      setRefreshing(false)
    }
  }

  async function fetchPlaylist() {
    setLoading(true)
    try {
      const res = await fetch(API(`api/playlists/${id}`))
      const json = await res.json()
      if (json.error) {
        setPlaylist(null)
        return
      }
      const pl = json.playlist || json
      const songs = Array.isArray(pl.songs) ? pl.songs : []
      setPlaylist({ ...pl, songs })

      // fetch liked songs for current user so we can mark which songs are liked
      try {
        if (token) {
          const lr = await fetch(API('api/user/liked'), { headers: { Authorization: `Bearer ${token}` } })
          if (lr.ok) {
            const lj = await lr.json()
            const list = Array.isArray(lj.songs) ? lj.songs : (Array.isArray(lj) ? lj : [])
            const set = new Set(list.map(s => String(s._id || s.id)))
            setLikedSet(set)
          }
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.error('fetchPlaylist', e)
      setPlaylist(null)
    } finally {
      setLoading(false)
    }
  }

  const onPlay = useCallback(async (track) => {
    try {
      await playTrack(track, playlist.songs, playlist.songs.findIndex((s) => String(s._id) === String(track._id)))
    } catch (e) {
      console.warn('play error', e)
    }
  }, [playTrack, playlist])

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
      const res = await fetch(API(`api/songs/${song._id}/like`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      let json = null
      try { json = await res.json() } catch (e) { json = null }
      if (!res.ok) {
        throw new Error(json?.error || json?.message || 'Failed to toggle like')
      }
      if (json.liked === false) {
        // if we happen to be in a liked-only view, remove; for playlist detail we'll just update set
        setLikedSet((cur) => { const next = new Set(Array.from(cur)); next.delete(String(song._id)); return next })
        Alert.alert('Removed', 'Song removed from Liked')
      } else {
        setLikedSet((cur) => { const next = new Set(Array.from(cur)); next.add(String(song._id)); return next })
        Alert.alert('Added', 'Song added to Liked')
      }
    } catch (e) {
      console.warn('remove liked', e)
      Alert.alert('Error', 'Could not update liked')
    } finally {
      closeMenu()
    }
  }

  // Add to playlist flow for playlist-detail songs
  const addToPlaylist = async (song) => {
    if (!token) return Alert.alert('Not signed in')
    try {
      setSelectedForPlaylist(song)
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
      if (!res.ok) { setPlaylists([]); return }
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
      const pr = await fetch(`${API_URL}api/playlists/${playlistId}`)
      if (!pr.ok) throw new Error('Failed to fetch playlist')
      const pj = await pr.json()
      const existing = Array.isArray(pj.playlist?.songs) ? pj.playlist.songs.map(s => String(s._id || s)) : []
      const next = Array.from(new Set([...existing, String(selectedForPlaylist._id || selectedForPlaylist.id)]))
      const upr = await fetch(`${API_URL}api/playlists/${playlistId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ songs: next })
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

  const playNext = async (song) => { await onPlay(song); closeMenu() }

  const toggleLike = async (song) => {
    try {
      if (!token) return Alert.alert('Not signed in')
      const res = await fetch(API(`api/songs/${song._id}/like`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to toggle like')
      const liked = json.liked === true
      setLikedSet((cur) => {
        const next = new Set(Array.from(cur))
        const key = String(song._id || song.id)
        if (liked) next.add(key)
        else next.delete(key)
        return next
      })
      // no alert here to reduce noise; openMenu/removeFromLiked shows alerts when used
    } catch (e) {
      console.error('toggleLike error', e)
      Alert.alert('Error', 'Could not update liked state')
    }
  }

  const renderItem = useCallback(({ item }) => {
    const isPlaying = current && current._id === item._id
    const isLiked = likedSet.has(String(item._id))
    return (
      <TouchableOpacity onPress={() => onPlay(item)} onLongPress={() => openMenu(item)} style={styles.item} activeOpacity={0.8}>
  <Image source={{ uri: item.artworkUrl || item.imageUrl || item.cover || DEFAULT_ARTWORK_URL }} style={[styles.songArtwork, isPlaying && styles.playingArtwork]} />
        <View style={styles.itemText}>
          <Text numberOfLines={1} style={[styles.title, isPlaying && styles.playingText]}>{item.title}</Text>
          <Text numberOfLines={1} style={styles.subtitle}>{item.artist || item.artists?.join(', ') || ''}</Text>
        </View>
        <Text style={styles.duration}>{formatDuration(item.duration || item.size)}</Text>
        {/* reduce the circular liked/add button size for inline song rows */}
        <AddCircleButton isAdded={isLiked} onPress={() => toggleLike(item)} size={30} />
        <TouchableOpacity onPress={() => openMenu(item)} style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }, [onPlay, current, likedSet])

  const keyExtractor = useCallback((i) => String(i._id || i.id || i.title), [])

  // Reanimated header
  const HEADER_MAX = 220
  const HEADER_MIN = 80
  const HEADER_SCROLL = HEADER_MAX - HEADER_MIN
  const onScroll = useAnimatedScrollHandler((ev) => { scrollY.value = ev.contentOffset.y })

  const headerStyle = useAnimatedStyle(() => {
    const h = interpolate(scrollY.value, [0, HEADER_SCROLL], [HEADER_MAX, HEADER_MIN], Extrapolate.CLAMP)
    return { height: h }
  })

  const playButtonAnimatedStyle = useAnimatedStyle(() => {
    const top = interpolate(scrollY.value, [0, HEADER_SCROLL], [HEADER_MAX - 64, HEADER_MIN - 36], Extrapolate.CLAMP)
    const opacity = interpolate(scrollY.value, [HEADER_SCROLL * 0.6, HEADER_SCROLL], [1, 0], Extrapolate.CLAMP)
    return { top, opacity }
  })

  // animate mode button so it hides along with the floating play button as header collapses
  const modeButtonAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [HEADER_SCROLL * 0.6, HEADER_SCROLL], [1, 0], Extrapolate.CLAMP)
    const translateX = interpolate(scrollY.value, [0, HEADER_SCROLL], [0, -6], Extrapolate.CLAMP)
    return { opacity, transform: [{ translateX }], zIndex: 14 }
  })

  // seam mode should remain hidden (we don't introduce a separate mode button in the seam)
  const seamModeAnimatedStyle = useAnimatedStyle(() => ({ opacity: 0 }))

  const collapsedHeaderStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [HEADER_SCROLL * 0.6, HEADER_SCROLL], [0, 1], Extrapolate.CLAMP)
    const opacity = progress
    const translateY = interpolate(progress, [0, 1], [-8, 0], Extrapolate.CLAMP)
    return { opacity, transform: [{ translateY }], zIndex: 60 }
  })

  const seamPlayStyle = useAnimatedStyle(() => {
    const headerH = interpolate(scrollY.value, [0, HEADER_SCROLL], [HEADER_MAX, HEADER_MIN], Extrapolate.CLAMP)
    const BUTTON_SIZE = 56
    const top = headerH - (BUTTON_SIZE / 2) - 20
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
    const translateY = interpolate(scrollY.value, [0, HEADER_SCROLL], [0, -Math.max(40, HEADER_SCROLL * 0.6)], Extrapolate.CLAMP)
    const opacity = interpolate(scrollY.value, [0, HEADER_SCROLL * 0.6, HEADER_SCROLL], [1, 0.6, 0], Extrapolate.CLAMP)
    return { transform: [{ scale: s }, { translateY }], opacity }
  })

  const searchBoxStyle = useAnimatedStyle(() => {
    const top = interpolate(scrollY.value, [0, HEADER_SCROLL], [16, 8], Extrapolate.CLAMP)
    const padding = interpolate(scrollY.value, [0, HEADER_SCROLL], [10, 6], Extrapolate.CLAMP)
    const opacity = interpolate(scrollY.value, [0, HEADER_SCROLL * 0.6, HEADER_SCROLL], [1, 0.95, 0.85], Extrapolate.CLAMP)
    return { position: 'absolute', left: 16, right: 16, top, paddingVertical: padding, opacity, zIndex: 50 }
  })

  if (loading) return (
    <GradientBackground variant="teal" bottomDark={true}>
      <View style={[styles.container, { backgroundColor: 'transparent' }]}> 
        <View style={[styles.header, { height: 180, paddingTop: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 120, height: 120, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)', marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <View style={{ width: 220, height: 20, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)' }} />
              <View style={{ width: 140, height: 14, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)', marginTop: 6 }} />
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
        <Reanimated.View style={[styles.header, headerStyle]} >
          <AnimatedImage source={{ uri: playlist.imageUrl || playlist.poster || playlist.cover || playlist.songs[0]?.artworkUrl || playlist.songs[0]?.imageUrl || DEFAULT_ARTWORK_URL }} style={[styles.headerImage, headerImageStyle]} />
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerSubtitle}>Playlist</Text>
            <AnimatedText style={[styles.headerTitle, titleAnimatedStyle]}>{playlist.title}</AnimatedText>
          </View>
          <Reanimated.View style={[styles.playAllContainer, playButtonAnimatedStyle]} pointerEvents={undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Reanimated.View style={modeButtonAnimatedStyle}>
                <PlaybackModeButton style={styles.modeButton} />
              </Reanimated.View>
              <TouchableOpacity style={styles.seamPlayButton} onPress={async () => {
                // play all / toggle
                if (playerIsPlaying) { await pause(); return }
                if (current && String(current._id) === String(playlist.songs[0]?._id)) { await resume(); return }
                if (playlist.songs && playlist.songs.length) await onPlay(playlist.songs[0])
              }} activeOpacity={0.85}>
                {playerIsPlaying ? (
                  <Ionicons name="pause" size={27} color={COLORS.black} />
                ) : (
                  <Ionicons name="play" size={22} color={COLORS.black} />
                )}
              </TouchableOpacity>
            </View>
          </Reanimated.View>

          <Reanimated.View style={[styles.searchBoxWrap, searchBoxStyle]}>
            <View style={styles.searchInner}>
              <Ionicons name="search" size={18} color={'rgba(198, 247, 255, 1)'} style={styles.searchIcon} />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search playlist songs"
                placeholderTextColor={'rgba(198, 247, 255, 1)'}
                style={styles.searchInput}
                underlineColorAndroid="transparent"
              />
            </View>
          </Reanimated.View>
        </Reanimated.View>

        <AnimatedFlatList
          data={(playlist.songs || []).filter(s => {
            const q = (searchText || '').trim().toLowerCase()
            if (!q) return true
            return (s.title || '').toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q)
          })}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: HEADER_MAX + 24, paddingBottom: 140 }}
          ListFooterComponent={() => <View style={{ height: 120 }} />}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        />

        <AnimatedLinearGradient colors={[COLORS.cardBackground, COLORS.inputBackground]} locations={[0,0.8]} start={{x:0,y:0}} end={{x:1,y:0}} style={[styles.collapsedHeader, collapsedHeaderStyle]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.collapsedTitle}>{playlist.title}</Text>
        </AnimatedLinearGradient>

        <Reanimated.View style={[styles.seamPlayContainer, seamPlayStyle]} pointerEvents="box-none">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Reanimated.View style={seamModeAnimatedStyle}>
              <PlaybackModeButton style={styles.modeButtonSeam} />
            </Reanimated.View>
            <TouchableOpacity style={styles.seamPlayButton} onPress={async () => {
              if (playerIsPlaying) { await pause(); return }
              if (current && String(current._id) === String(playlist.songs[0]?._id)) { await resume(); return }
              if (playlist.songs && playlist.songs.length) await onPlay(playlist.songs[0])
            }} activeOpacity={0.85}>
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
        {/* Playlist selection modal for adding a song to another playlist */}
        <Modal visible={playlistModalVisible} transparent animationType="slide" onRequestClose={() => setPlaylistModalVisible(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setPlaylistModalVisible(false)}>
            <Pressable onPress={() => {}} style={{ width: '100%' }}>
              <View style={{ backgroundColor: COLORS.cardBackground, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '100%', paddingBottom: 32 }}>
                <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Select Playlist</Text>
                {playlistsLoading ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <FlatList
                    data={playlists}
                    keyExtractor={(p) => p._id}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' , borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)'}} onPress={() => handleAddToPlaylist(item._id)}>
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
                <TouchableOpacity
  style={{
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  }}
  activeOpacity={0.8}
  onPress={() => setPlaylistModalVisible(false)}
>
  <Text
    style={{
      color: COLORS.textPrimary,
      fontWeight: '600',
      fontSize: 16,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    }}
  >
    Cancel
  </Text>
</TouchableOpacity>

              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </GradientBackground>
  )
}

function formatDuration(d) {
  if (!d && d !== 0) return ''
  const sec = Math.floor((d || 0))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}
