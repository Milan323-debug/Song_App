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
  Animated,
  Modal,
  Pressable,
  Share,
} from 'react-native'
import COLORS from '../../constants/colors'
import { API_URL, API } from '../../constants/api'
import { Ionicons } from '@expo/vector-icons'
import usePlayerStore from '../../store/playerStore'
import PlayerContainer from '../../components/PlayerContainer'
import { useAuthStore } from '../../store/authStore'

// Liked Songs screen
// Assumptions: backend exposes an endpoint to GET liked songs and to remove a liked song.
// We'll try GET `${API_URL}api/users/liked` then fallback to `${API_URL}api/songs/liked` if 404.

export default function LikedSongs() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuTarget, setMenuTarget] = useState(null)
  const [menuAnim] = useState(new Animated.Value(0))
  const scrollY = useRef(new Animated.Value(0)).current
  const { token } = useAuthStore()
  const playTrack = usePlayerStore((s) => s.playTrack)
  const current = usePlayerStore((s) => s.current)

  useEffect(() => {
    fetchLiked()
  }, [])

  const fetchLiked = async () => {
    setLoading(true)
    try {
      let res = await fetch(API('api/user/liked'), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) {
        console.debug('GET api/user/liked returned', res.status, await res.text()?.slice?.(0,200))
        res = await fetch(API('api/songs/liked'))
      }
  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : null } catch (e) { json = null }
  // Accept either { songs: [...] } or array. Be defensive: json may be null (HTML/error), so avoid accessing json.songs directly.
  const list = (json && Array.isArray(json.songs)) ? json.songs : (Array.isArray(json) ? json : []);
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
      // POST toggle or DELETE; try both patterns gracefully
      let res = await fetch(API(`api/user/liked/${song._id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      let text = await res.text()
      if (res.status === 404) {
        res = await fetch(API('api/user/liked'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ songId: song._id, remove: true }) })
        text = await res.text()
      }
      console.debug('removeFromLiked response', { status: res.status, ok: res.ok, text: text?.slice?.(0,200) })
      if (!res.ok) throw new Error('Failed')
      setSongs((cur) => cur.filter((s) => String(s._id) !== String(song._id)))
      Alert.alert('Removed', 'Song removed from Liked')
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

  const headerHeight = scrollY.interpolate({ inputRange: [0, 160], outputRange: [220, 80], extrapolate: 'clamp' })
  const headerImageScale = scrollY.interpolate({ inputRange: [0, 160], outputRange: [1, 0.6], extrapolate: 'clamp' })

  const playAll = useCallback(() => {
    if (songs && songs.length > 0) onPlay(songs[0])
  }, [songs, onPlay])

  if (loading) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={COLORS.primary} /></View>

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { height: headerHeight }] }>
        <Animated.Image source={{ uri: songs[0]?.artworkUrl || songs[0]?.imageUrl }} style={[styles.headerImage, { transform: [{ scale: headerImageScale }] }]} />
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerSubtitle}>Your favorites in one place</Text>
          <Text style={styles.headerTitle}>Liked Songs</Text>
        </View>
        <TouchableOpacity style={styles.playAll} onPress={playAll}>
          <Ionicons name="play" size={18} color={COLORS.black} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.FlatList
        data={songs}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 140 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      />

      {/* Context menu modal */}
      <Modal visible={menuVisible} transparent animationType="none">
        <Pressable style={styles.menuBackdrop} onPress={closeMenu}>
          <Animated.View style={[styles.menuCard, { opacity: menuAnim, transform: [{ translateY: menuAnim.interpolate({ inputRange: [0,1], outputRange: [40,0] }) }] }]}>
            <Text style={styles.menuTitle}>{menuTarget?.title}</Text>
            <TouchableOpacity style={styles.menuOption} onPress={() => playNext(menuTarget)}>
              <Text style={styles.menuOptionText}>Play Next</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => removeFromLiked(menuTarget)}>
              <Text style={[styles.menuOptionText, { color: COLORS.error }]}>Remove from Liked</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => addToPlaylist(menuTarget)}>
              <Text style={styles.menuOptionText}>Add to Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => shareSong(menuTarget)}>
              <Text style={styles.menuOptionText}>Share</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* mini player */}
      <View style={styles.miniPlayerWrap} pointerEvents="box-none">
        <PlayerContainer />
      </View>
    </View>
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
    width: '100%',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
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
    position: 'absolute',
    right: 18,
    top: 18,
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
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
})
