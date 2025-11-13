import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Image, Modal, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import styles from '../assets/styles/playerContainer.styles'
import { API } from '../constants/api'
import { DEFAULT_ARTWORK_URL } from '../constants/artwork'
import COLORS from '../constants/colors'
import usePlayerStore from '../store/playerStore'
import PlaybackExpanded from './PlaybackExpanded'
import PlaybackModeButton from './PlaybackModeButton'

// Client-side wrapper: call serverless endpoint and cache results in AsyncStorage.
const CACHE_PREFIX = 'dominant:'

function hexToRgb(hex) {
  if (!hex) return null
  const h = hex.replace('#', '')
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
}

function relativeLuminance(r, g, b) {
  const srgb = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

function getContrastColor(hex) {
  try {
    const rgb = hexToRgb(hex)
    if (!rgb) return COLORS.white
    const lum = relativeLuminance(rgb.r, rgb.g, rgb.b)
    // WCAG recommends a contrast threshold. Use 0.179 as a mid point (approx)
    return lum > 0.5 ? '#000000' : COLORS.white
  } catch (e) {
    return COLORS.white
  }
}

async function fetchDominantFromServer(uri) {
  if (!uri) return COLORS.playerContainer
  try {
    // Build endpoint using project's API helper. Make sure constants/API_URL is set to your server.
    const ep = API(`api/dominant?url=${encodeURIComponent(uri)}`)
    const res = await fetch(ep)
    if (!res.ok) throw new Error('bad response')
    const json = await res.json()
    // The server now returns { color: '#rrggbb', textColor: '#ffffff' }
    if (json && json.color) return { color: json.color, textColor: json.textColor }
  } catch (e) {
    // network/remote errors -> will fall back
  }
  // return object shape for consistency with server response
  return { color: COLORS.playerContainer, textColor: getContrastColor(COLORS.playerContainer) }
}

async function getCachedOrFetch(uri) {
  const key = CACHE_PREFIX + uri
  try {
    const raw = await AsyncStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.color) return parsed
    }
  } catch (e) {
    // ignore cache read errors
  }
  const res = await fetchDominantFromServer(uri)
  // `res` may be either a string (old-server) or an object { color, textColor }
  let color
  let textColor
  if (res && typeof res === 'object') {
    color = res.color || COLORS.playerContainer
    textColor = res.textColor || getContrastColor(color)
  } else {
    color = res || COLORS.playerContainer
    textColor = getContrastColor(color)
  }
  const payload = { color, textColor }
  try { await AsyncStorage.setItem(key, JSON.stringify(payload)) } catch (e) { /* ignore */ }
  return payload
}

// Match the dark Songs screen palette
const SONGS_BG = '#071019'
const SONGS_CARD = '#0f1724'
const SONGS_BORDER = '#15202b'
const SONGS_TEXT = '#E6F7F2'
const SONGS_TEXT_LIGHT = '#9AA6B2'
const ACCENT = COLORS.primary || '#22c1a9'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MINI_HEIGHT = 68
const TAB_BAR_HEIGHT = 28
const THUMB_SIZE = 13

export default function PlayerContainer({ tabBarHeight }) {
  const { current, isPlaying, pause, resume, stop, previous, next, position, duration, seek } = usePlayerStore()
  const queue = usePlayerStore((s) => s.queue) || []
  const index = usePlayerStore((s) => s.index)
  // listening mode selectors
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeatMode = usePlayerStore((s) => s.repeatMode)
  const setShuffle = usePlayerStore((s) => s.setShuffle)
  const setRepeatMode = usePlayerStore((s) => s.setRepeatMode)
  const insets = useSafeAreaInsets()
  const anim = useRef(new Animated.Value(0)).current // 0 mini, 1 full
  const panY = useRef(new Animated.Value(0)).current
  const [expanded, setExpanded] = useState(false)
  const progressAnim = useRef(new Animated.Value(0)).current
  // background color handling for mini player (smooth cross-fade)
  const [miniBg, setMiniBg] = useState(COLORS.playerContainer)
  const overlayBgRef = useRef(COLORS.playerContainer)
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const miniProgressWidth = useRef(1)
  const topProgressWidth = useRef(0)
  const fullProgressWidth = useRef(0)
  const [measuredFullWidth, setMeasuredFullWidth] = useState(0)
  const isScrubbing = useRef(false)
  const scrubStartPx = useRef(0)
  const trackFade = useRef(new Animated.Value(1)).current

  // If user starts scrubbing before the progress bar layout is measured,
  // `scrubStartPx` can be 0 which makes the scrub computations wrong.
  // Watch for measuredFullWidth updates and recompute the start pixel while
  // scrubbing so the gesture uses the correct width as soon as it's known.
  useEffect(() => {
    if (!isScrubbing.current) return
    const curPct = (duration && duration > 0) ? (position / duration) : 0
    const width = fullProgressWidth.current || measuredFullWidth || 0
    scrubStartPx.current = width * curPct
  }, [measuredFullWidth])

  useEffect(() => {
    // while user is scrubbing we don't stomp the scrub value
    if (isScrubbing.current) return
    const pct = (duration && duration > 0) ? (position / duration) : 0
    Animated.timing(progressAnim, { toValue: pct, duration: 200, useNativeDriver: false }).start()
  }, [position, duration])

  // fade when track changes for smooth visual transition
  const prevIdRef = useRef(current?._id)
  useEffect(() => {
    if (!current) return
    if (prevIdRef.current && prevIdRef.current !== current._id) {
      trackFade.setValue(0)
      Animated.timing(trackFade, { toValue: 1, duration: 260, useNativeDriver: true }).start()
    }
    prevIdRef.current = current._id
  }, [current])

  // Update mini-player background color when the current track changes.
  const [textColor, setTextColor] = useState(COLORS.white)
  // overlay background color exposed to expanded player so it can reflect the live crossfade
  const [overlayBgColor, setOverlayBgColor] = useState(overlayBgRef.current || COLORS.playerContainer)
  useEffect(() => {
    let mounted = true
    if (!current) return
    const uri = (current.artworkUrl && String(current.artworkUrl).trim().length > 0) ? current.artworkUrl : DEFAULT_ARTWORK_URL
    ;(async () => {
      const { color, textColor: tc } = await getCachedOrFetch(uri)
      if (!mounted) return
      try {
        overlayBgRef.current = color
        // update state so expanded player re-renders and receives the live overlay color
        setOverlayBgColor(color)
        overlayOpacity.setValue(0)
        Animated.timing(overlayOpacity, { toValue: 1, duration: 420, useNativeDriver: false }).start(() => {
          // commit and reset overlay
          setMiniBg(color)
          setTextColor(tc || COLORS.white)
          overlayOpacity.setValue(0)
        })
      } catch (e) {
        // ignore animation errors
        setMiniBg(color)
        setTextColor(tc || COLORS.white)
      }
    })()
    return () => { mounted = false }
  }, [current])

  // Mode UI state and helpers (hooks must be called unconditionally)
  const [modeSheetVisible, setModeSheetVisible] = useState(false)
  const openModeSheet = () => setModeSheetVisible(true)
  const closeModeSheet = () => setModeSheetVisible(false)

  const applyMode = (mode) => {
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
    const iconColor = '#ffffff'
    if (shuffle) return { name: 'shuffle', color: iconColor }
    if (repeatMode && repeatMode !== 'off') return { name: 'repeat', color: iconColor }
    return { name: 'list-outline', color: iconColor }
  }

  const expand = () => {
    setExpanded(true)
    Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start()
  }
  const collapse = () => {
    Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setExpanded(false))
  }

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 6,
    onPanResponderMove: (_, gs) => {
      if (gs.dy > 0) panY.setValue(gs.dy)
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 120) {
        panY.setValue(0)
        collapse()
      } else {
        Animated.timing(panY, { toValue: 0, duration: 150, useNativeDriver: true }).start()
      }
    }
  })).current

  // PanResponder for the full-player progress scrubber
  const progressPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      isScrubbing.current = true
      // compute start pixel from current progress
      const curPct = (duration && duration > 0) ? (position / duration) : 0
      scrubStartPx.current = (fullProgressWidth.current || measuredFullWidth) * curPct
    },
    onPanResponderMove: (_, gs) => {
      const width = fullProgressWidth.current || measuredFullWidth || 1
      let x = scrubStartPx.current + gs.dx
      if (x < 0) x = 0
      if (x > width) x = width
      const pct = width > 0 ? (x / width) : 0
      progressAnim.setValue(pct)
    },
    onPanResponderRelease: (_, gs) => {
      const width = fullProgressWidth.current || measuredFullWidth || 1
      // compute offset relative to the progress width and clamp within bounds
      let x = scrubStartPx.current + gs.dx
      if (x < 0) x = 0
      if (x > width) x = width
      const pct = width > 0 ? (x / width) : 0

      // Keep isScrubbing true until seek completes so playback updates don't stomp the scrub UI
      // compute new playback time and attempt to seek (clamped)
      if (duration && duration > 0) {
        const newTime = Math.max(0, Math.min(Math.round(pct * duration), Math.round(duration)))
        // call seek (don't overwrite store position here; the slider will update it)
        Promise.resolve(seek(newTime)).catch((e) => {
          console.warn('seek promise rejected', e)
        }).finally(() => {
          isScrubbing.current = false
        })
      } else {
        // duration unknown -> the store will queue the seek; clear scrubbing flag
        isScrubbing.current = false
      }
    },
    onPanResponderTerminate: (_, gs) => {
      // handle cases where the gesture is terminated unexpectedly (parent took responder)
      const width = fullProgressWidth.current || measuredFullWidth || 1
      let x = scrubStartPx.current + gs.dx
      if (x < 0) x = 0
      if (x > width) x = width
      const pct = width > 0 ? (x / width) : 0

      if (duration && duration > 0) {
        const newTime = Math.max(0, Math.min(Math.round(pct * duration), Math.round(duration)))
        Promise.resolve(seek(newTime)).catch((e) => {
          console.warn('seek promise rejected', e)
        }).finally(() => {
          isScrubbing.current = false
        })
      } else {
        isScrubbing.current = false
      }
    },
  })).current

  if (!current) return null

  const tbH = (typeof tabBarHeight === 'number' && tabBarHeight >= 0) ? tabBarHeight : TAB_BAR_HEIGHT
  // reduce extra gap so the mini-player sits closer to the tab navigator
  const baseBottom = tbH + (insets.bottom || 0) - 43

  const miniOpacity = anim.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' })
  const fullTranslateY = anim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] })

  const formatTime = (ms) => {
    if (!ms || ms <= 0) return '0:00'
    const total = Math.floor(ms / 1000)
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  


  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Animated background derived from app theme; for better results extract colors from artwork using a color library */}
      <Animated.View pointerEvents="none" style={[styles.fullBg, { opacity: anim.interpolate({ inputRange: [0,1], outputRange: [0, 1] }) }]}>
        <LinearGradient colors={[COLORS.background, COLORS.neonAqua]} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      </Animated.View>
      {/* Mini */}
      {/* Make mini-player non-interactive when expanded so it doesn't steal touches */}
      <Animated.View
        pointerEvents={expanded ? 'none' : 'auto'}
        style={[styles.miniContainer, { bottom: baseBottom, opacity: miniOpacity, backgroundColor: miniBg }]}
      > 
        {/* overlay used to cross-fade to the next track color */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: overlayBgColor, opacity: overlayOpacity, borderRadius: styles.miniContainer.borderTopLeftRadius }]} />
        <TouchableOpacity activeOpacity={0.9} style={styles.miniInner} onPress={expand}>
          <Animated.View style={{ opacity: trackFade }}>
            <Image source={{ uri: (current.artworkUrl && String(current.artworkUrl).trim().length > 0) ? current.artworkUrl : DEFAULT_ARTWORK_URL }} style={styles.miniArtPlaceholder} />
          </Animated.View>

          <View style={styles.miniInfo}>
            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>{current.title}</Text>
            <Text style={[styles.artist, { color: textColor }]} numberOfLines={1}>{current.artist}</Text>
            {/* removed mini progress strip to free vertical space for title/artist */}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <PlaybackModeButton style={styles.modeBtnSmall} />
            <TouchableOpacity onPress={() => (isPlaying ? pause() : resume())} style={styles.miniPlayBtnSmall} accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={textColor || COLORS.white} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* moved thin progress bar to bottom of the mini-player */}
        <View style={styles.topProgress} pointerEvents="none" onLayout={(e) => { topProgressWidth.current = e.nativeEvent.layout.width - 24 /* account for left/right margins */ }}>
          <Animated.View style={[styles.topProgressFill, { width: progressAnim.interpolate({ inputRange: [0,1], outputRange: [0, topProgressWidth.current || 0] }) }]} />
        </View>
      </Animated.View>

      {/* Mode selection sheet */}
      <Modal visible={modeSheetVisible} transparent animationType="fade" onRequestClose={closeModeSheet}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={closeModeSheet}>
          <View style={{ backgroundColor: COLORS.cardBackground, padding: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <Text style={{ color: COLORS.textPrimary, fontWeight: '700', marginBottom: 8 }}>Playback mode</Text>
            <TouchableOpacity onPress={() => applyMode('order')} style={{ padding: 10 }}><Text style={{ color: COLORS.textPrimary }}>Play in order</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => applyMode('shuffle')} style={{ padding: 10 }}><Text style={{ color: COLORS.textPrimary }}>Shuffle</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => applyMode('repeat-one')} style={{ padding: 10 }}><Text style={{ color: COLORS.textPrimary }}>Repeat one</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => applyMode('repeat-all')} style={{ padding: 10 }}><Text style={{ color: COLORS.textPrimary }}>Repeat all</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <PlaybackExpanded
        anim={anim}
        panY={panY}
        dragPanHandlers={expanded ? panResponder.panHandlers : null}
        progressAnim={progressAnim}
        progressPan={progressPan}
        measuredFullWidth={measuredFullWidth}
        setMeasuredFullWidth={setMeasuredFullWidth}
        fullProgressWidth={fullProgressWidth}
        collapse={collapse}
        /* committed mini background color */
        bgColor={miniBg}
        /* overlay color used during the cross-fade */
        overlayBg={overlayBgColor}
        /* pass the animated opacity value so expanded view can cross-fade */
        overlayOpacity={overlayOpacity}
        bgTextColor={textColor}
        formatTime={formatTime}
      />
    </View>
  )
}