import React, { useRef, useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Image,
  FlatList,
  Dimensions,
  PanResponder,
  Alert,
  Share,
  StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { BlurView } from 'expo-blur'
import COLORS from '../constants/colors'
import styles from '../assets/styles/playerContainer.styles'
import usePlayerStore from '../store/playerStore'
import PlaybackModeButton from './PlaybackModeButton'


const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function PlaybackExpanded(props) {
  const {
    anim,
    panY,
    // handlers for dragging the expanded panel (attach only to the small handle)
    dragPanHandlers,
    progressAnim,
    progressPan,
    measuredFullWidth,
    setMeasuredFullWidth,
    fullProgressWidth,
    collapse,
    formatTime,
    overlayBg,
    overlayOpacity,
  } = props

  // background color and text color passed from PlayerContainer
  const bgColor = props.bgColor || COLORS.primary || COLORS.playerContainer
  const bgTextColor = props.bgTextColor || COLORS.textPrimary || COLORS.white
  // prefer overlayBg (live crossfade color) when available so expanded view updates immediately
  const effectiveBg = overlayBg || bgColor

  

  function clamp(v, lo = 0, hi = 255) { return Math.max(lo, Math.min(hi, v)) }
  function shadeHex(hex, percent) {
    try {
      const h = String(hex || '').replace('#', '')
      const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
      const r = parseInt(full.slice(0,2), 16)
      const g = parseInt(full.slice(2,4), 16)
      const b = parseInt(full.slice(4,6), 16)
      const factor = 1 + percent
      const nr = clamp(Math.round(r * factor))
      const ng = clamp(Math.round(g * factor))
      const nb = clamp(Math.round(b * factor))
      const toHex = v => v.toString(16).padStart(2, '0')
      return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`
    } catch (e) {
      return hex
    }
  }

  // build a gentle gradient based on the artwork color (prefer live overlay)
  const gradientColors = [
    effectiveBg,
    shadeHex(effectiveBg, 0.85), // slightly darker
    shadeHex(effectiveBg, 0.6),
    COLORS.cardBackground || COLORS.background,
  ]

  function hexToRgba(hex, alpha = 0.2) {
    try {
      let h = String(hex || '').replace('#', '')
      if (h.length === 3) h = h.split('').map(c => c + c).join('')
      const r = parseInt(h.slice(0,2), 16)
      const g = parseInt(h.slice(2,4), 16)
      const b = parseInt(h.slice(4,6), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    } catch (e) {
      return `rgba(0,0,0,${alpha})`
    }
  }

  // local UI state for like button (keeps UI responsive). In a full app this would
  // call an API or update persistent store; here we keep it local and optimistic.
  const [liked, setLiked] = useState(!!(props.initialLiked || false))

  const {
    current,
    isPlaying,
    pause,
    resume,
    previous,
    next,
    position,
    duration,
    seek,
    shuffle,
    setShuffle,
    repeatMode,
    setRepeatMode,
    queue,
    index,
  } = usePlayerStore()

  const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

  const upNextData = (queue || []).slice(index + 1, index + 6)

  // cache of fetched durations for up-next items keyed by id/url
  const [upNextDurations, setUpNextDurations] = useState({})

  // fetch duration metadata for up-next tracks that don't already report a duration
  useEffect(() => {
    let mounted = true
    const items = upNextData || []
    if (!items || items.length === 0) return

    const fetchAll = async () => {
      for (const item of items) {
        try {
          const key = String(item._id || item.id || item.url || '')
          if (!key) continue
          // skip if already present either on item or cached
          if ((typeof item.duration === 'number' && item.duration > 0) || (upNextDurations && upNextDurations[key])) continue

          // create a short-lived Sound to read metadata, don't play
          const creation = await Audio.Sound.createAsync({ uri: item.url }, { shouldPlay: false })
          const sound = creation && creation.sound ? creation.sound : null
          const status = creation && creation.status ? creation.status : null
          let dur = 0
          if (status && typeof status.durationMillis === 'number' && status.durationMillis > 0) dur = status.durationMillis
          else if (sound && typeof sound.getStatusAsync === 'function') {
            try {
              const s = await sound.getStatusAsync()
              if (s && typeof s.durationMillis === 'number') dur = s.durationMillis
            } catch (e) {}
          }
          // unload the temporary sound
          try { if (sound && typeof sound.unloadAsync === 'function') await sound.unloadAsync() } catch (e) {}

          if (mounted && dur && dur > 0) {
            setUpNextDurations((prev) => ({ ...prev, [key]: dur }))
          }
        } catch (e) {
          // ignore per-track errors; continue with others
        }
      }
    }

    fetchAll()
    return () => { mounted = false }
  }, [JSON.stringify(upNextData)])

  // initialize liked from current if available
  useEffect(() => {
    try { setLiked(!!current?.liked) } catch (e) {}
  }, [current])

  // Share current track using the native share sheet
  const shareSong = async () => {
    try {
      const message = `${current.title || ''} — ${current.artist || ''}\n${current.url || ''}`
      await Share.share({ message })
    } catch (e) {
      console.warn('share failed', e)
      Alert.alert('Share failed', 'Could not share this song')
    }
  }

  const onAddPress = () => {
    // minimal UX: show alert; in a complete app this would open playlist picker
    Alert.alert('Add to playlist', 'This feature is not implemented in this demo.')
  }

  const onLikePress = () => {
    const next = !liked
    setLiked(next)
    Alert.alert(next ? 'Added to Liked' : 'Removed from Liked')
  }

  const onMorePress = () => {
    Alert.alert(current.title || 'Options', null, [
      { text: 'Share', onPress: shareSong },
      { text: 'Add to playlist', onPress: onAddPress },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  // responsive artwork sizing
  const { width: SCREEN_WIDTH } = Dimensions.get('window')
  // leave some side padding; cap maximum size for large screens
  const ART_PADDING = 48
  const MAX_ART = 420
  const artSize = Math.min(SCREEN_WIDTH - ART_PADDING, MAX_ART)
  const artRadius = Math.round(Math.min(20, artSize * 0.05))
  const THUMB_SIZE = 12

  // scrubbing refs/state
  const isScrubbing = useRef(false)
  const scrubbingOffset = useRef(0)
  const lastSyncTime = useRef(0)
  const SYNC_THROTTLE_MS = 100
  const SYNC_THRESHOLD_PX = 2 // only update if thumb differs more than this many pixels
  const lastSetPct = useRef(0)
  const progressLeft = useRef(0)

  // create internal PanResponder so we can control scrubbing behavior
  const internalPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, gestureState) => {
        isScrubbing.current = true
        // capture starting offset
        const width = (fullProgressWidth && fullProgressWidth.current) || measuredFullWidth || 1
        const pct = duration && duration > 0 ? Math.max(0, Math.min(position / duration, 1)) : 0
        scrubbingOffset.current = pct * width
      },
      onPanResponderMove: (e, gestureState) => {
        try {
          const width = (fullProgressWidth && fullProgressWidth.current) || measuredFullWidth || 1
          let localX = 0
          // prefer locationX (relative to target) if available
          if (e && e.nativeEvent && typeof e.nativeEvent.locationX === 'number') {
            localX = e.nativeEvent.locationX
          } else if (typeof gestureState.moveX === 'number' && typeof progressLeft.current === 'number') {
            localX = gestureState.moveX - progressLeft.current
          }
          if (localX < 0) localX = 0
          if (localX > width) localX = width
          scrubbingOffset.current = localX
          const pct = width > 0 ? localX / width : 0
          // update UI immediately while scrubbing
          try { progressAnim && progressAnim.setValue(pct) } catch (err) {}
          lastSetPct.current = pct
        } catch (err) {
          // swallow
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        try {
          const width = (fullProgressWidth && fullProgressWidth.current) || measuredFullWidth || 1
          let localX = 0
          if (e && e.nativeEvent && typeof e.nativeEvent.locationX === 'number') {
            localX = e.nativeEvent.locationX
          } else if (typeof gestureState.moveX === 'number' && typeof progressLeft.current === 'number') {
            localX = gestureState.moveX - progressLeft.current
          }
          if (localX < 0) localX = 0
          if (localX > width) localX = width
          const pct = width > 0 ? localX / width : 0
          const newTime = duration && duration > 0 ? Math.max(0, Math.min(Math.round(pct * duration), Math.round(duration))) : 0
          // optimistically update store position and call seek
          try { usePlayerStore.setState({ position: newTime }) } catch (e) {}
          Promise.resolve(seek(newTime)).catch((err) => console.warn('seek promise rejected', err))
          // update animated value and bookkeeping
          try { progressAnim && progressAnim.setValue(pct) } catch (err) {}
          lastSetPct.current = pct
          lastSyncTime.current = Date.now()
        } catch (err) {}
        // re-enable syncing
        isScrubbing.current = false
      },
    })
  )

  if (!current) return null

  // Sync progressAnim from store position when not scrubbing.
  useEffect(() => {
    // do nothing if scrubbing or no width
    const width = (fullProgressWidth && fullProgressWidth.current) || measuredFullWidth || 0
    if (isScrubbing.current || !width || !duration || duration <= 0) return
    const now = Date.now()
    if (now - lastSyncTime.current < SYNC_THROTTLE_MS) return
    const pct = Math.max(0, Math.min(position / duration, 1))
    const currentPx = pct * width
    const lastPx = (lastSetPct.current || 0) * width
    if (Math.abs(currentPx - lastPx) > SYNC_THRESHOLD_PX) {
      try { progressAnim && progressAnim.setValue(pct) } catch (e) {}
      lastSetPct.current = pct
      lastSyncTime.current = now
    }
  }, [position, duration, measuredFullWidth])

  return (
    // allow touches to pass through to children so ScrollView receives them
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.fullContainer,
        {
          transform: [
            {
              // combine open/close animation with draggable panY
              translateY: Animated.add(
                anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SCREEN_HEIGHT, 0], // slide in from screen height
                  extrapolate: 'clamp',
                }),
                panY.interpolate({
                  inputRange: [-SCREEN_HEIGHT, SCREEN_HEIGHT],
                  outputRange: [-SCREEN_HEIGHT, SCREEN_HEIGHT],
                  extrapolate: 'clamp',
                })
              ),
            },
          ],
          opacity: anim,
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.fullBg}
      />
      {/* animated overlay color (crossfade) - parent provides overlayBg and overlayOpacity */}
      {overlayBg && overlayOpacity && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: overlayBg, opacity: overlayOpacity }]} />
      )}

      {/* --- Header (collapse + title) --- */}
      <View style={styles.fullHeader}>
        {/* small drag handle centered at top - attach dragPanHandlers only to the handle itself */}
        <View style={styles.dragHandleWrap} onStartShouldSetResponder={() => false}>
          <View
            style={styles.dragHandle}
            onStartShouldSetResponder={() => false}
            onMoveShouldSetResponder={() => true}
            // attach handlers only when provided so other touches (list) keep working
            {...(dragPanHandlers || {})}
          />
        </View>
        <TouchableOpacity onPress={collapse} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: bgTextColor }]} numberOfLines={1}>Now Playing</Text>
        <View style={{ width: 28 }} />
      </View>

      <Animated.ScrollView
        style={{ flex: 1 }}
        nestedScrollEnabled={true}
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        // Ensure the ScrollView captures gestures that start below the header/drag area
        // so top drags (header/handle) still collapse the panel.
        onStartShouldSetResponderCapture={(e) => {
          try {
            const ev = e && e.nativeEvent
            const y = (ev && (typeof ev.locationY === 'number' ? ev.locationY : ev.pageY)) || 0
            // keep top ~120px reserved for header/drag handle
            return typeof y === 'number' ? y > 120 : true
          } catch (err) { return true }
        }}
        onMoveShouldSetResponderCapture={(e) => {
          try {
            const ev = e && e.nativeEvent
            const y = (ev && (typeof ev.locationY === 'number' ? ev.locationY : ev.pageY)) || 0
            return typeof y === 'number' ? y > 120 : true
          } catch (err) { return true }
        }}
        directionalLockEnabled={true}
        contentContainerStyle={[styles.fullContent, { paddingBottom: 120, alignItems: 'stretch', flexGrow: 1 }]}
      >
        {/* artwork + title */}
        <Animated.View
          style={[
            styles.artWrap,
            {
              transform: [
                {
                  scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
                },
              ],
            },
          ]}
        >
          {/* radial accent behind artwork */}
          <Animated.View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center', justifyContent: 'center', alignItems: 'center', width: artSize * 1.6, height: artSize * 1.6, borderRadius: Math.round(artSize * 0.8), backgroundColor: hexToRgba(effectiveBg, 0.22), transform: [{ scale: anim.interpolate({ inputRange: [0,1], outputRange: [0.8, 1] }) }], opacity: overlayOpacity ? overlayOpacity : 1 }} />
          {/* subtle blur on top of the radial accent for depth */}
          <BlurView intensity={20} tint="dark" style={{ position: 'absolute', alignSelf: 'center', width: artSize * 1.6, height: artSize * 1.6, borderRadius: Math.round(artSize * 0.8) }} />

          {current.artworkUrl && String(current.artworkUrl).trim().length > 0 ? (
            <Image
              source={{ uri: current.artworkUrl }}
              style={[styles.fullArtPlaceholder, { width: artSize, height: artSize, borderRadius: artRadius }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.fullArtPlaceholder, { width: artSize, height: artSize, borderRadius: artRadius }]} />
          )}
        </Animated.View>

        <View justifyContent="center" alignItems="center" >
          <Text style={[styles.fullTitle, { color: bgTextColor }]} numberOfLines={1}>{current.title}</Text>
          <Text style={[styles.fullArtist, { color: bgTextColor }]} numberOfLines={1}>{current.artist}</Text>
        </View>

        {/* progress + controls (unchanged other than remaining inside ScrollView) */}
        <View style={styles.progressContainer}>
          <Text style={[styles.timeText, { color: bgTextColor }]}>{formatTime(position)}</Text>
          <View
            style={styles.progressBarWrap}
            {...(internalPan.current && internalPan.current.panHandlers)}
            onStartShouldSetResponder={() => true}
            onResponderRelease={(e) => {
              try {
                const width = (fullProgressWidth && fullProgressWidth.current) || measuredFullWidth || 1
                const x = (e && e.nativeEvent && typeof e.nativeEvent.locationX === 'number') ? e.nativeEvent.locationX : 0
                let clampedX = x
                if (clampedX < 0) clampedX = 0
                if (clampedX > width) clampedX = width
                const pct = width > 0 ? (clampedX / width) : 0
                try { progressAnim && progressAnim.setValue(pct); lastSetPct.current = pct; scrubbingOffset.current = pct * ((fullProgressWidth && fullProgressWidth.current) || measuredFullWidth || 1) } catch (e) {}
                if (duration && duration > 0) {
                  const newTime = Math.max(0, Math.min(Math.round(pct * duration), Math.round(duration)))
                  try { usePlayerStore.setState({ position: newTime }) } catch (e) {}
                  Promise.resolve(seek(newTime)).catch((err) => console.warn('seek promise rejected', err))
                } else {
                  try { usePlayerStore.setState({ position: 0 }) } catch (e) {}
                }
              } catch (err) {}
            }}
            onLayout={(e) => { const w = e.nativeEvent.layout.width; fullProgressWidth.current = w; progressLeft.current = e.nativeEvent.layout.x || 0; setMeasuredFullWidth(w) }}
          >
            <View style={styles.progressBarBg} />
            <Animated.View style={[styles.progressBarFill, { width: progressAnim.interpolate({ inputRange: [0,1], outputRange: [0, measuredFullWidth || 0] }) }]} />
            <Animated.View style={[styles.progressThumbContainer, { transform: [{ translateX: progressAnim.interpolate({ inputRange: [0,1], outputRange: [-(THUMB_SIZE / 2), (measuredFullWidth || 0) - (THUMB_SIZE / 2)] }) }] }]} {...(progressPan && progressPan.panHandlers)}>
              <View style={[styles.progressThumb, { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2 }]} />
            </Animated.View>
          </View>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        <View style={styles.controlsRowLarge}>
          <TouchableOpacity onPress={() => setShuffle(!shuffle)} style={styles.ctrlBtn}><Ionicons name="shuffle" size={22} color={shuffle ? COLORS.primary : COLORS.white} /></TouchableOpacity>
          <TouchableOpacity onPress={previous} style={styles.ctrlBtn}><Ionicons name="play-skip-back" size={28} color={COLORS.white} /></TouchableOpacity>

          {/* Play button: smaller triangle and slightly shifted right inside the circle */}
              <TouchableOpacity onPress={() => (isPlaying ? pause() : resume())} style={[styles.ctrlBtn, styles.playBigBtn]}>
                <View style={{ transform: isPlaying ? [{ translateX: 0 }, { scale: 0.9 }] : [{ translateX: 1 }, { scale: 0.9 }] }}>
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={29} color={COLORS.background} />
                </View>
              </TouchableOpacity>

          <TouchableOpacity onPress={next} style={styles.ctrlBtn}><Ionicons name="play-skip-forward" size={28} color={COLORS.white} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setRepeatMode(repeatMode === 'all' ? 'off' : 'all')} style={styles.ctrlBtn}><Ionicons name="repeat" size={22} color={repeatMode && repeatMode !== 'off' ? COLORS.primary : COLORS.white} /></TouchableOpacity>
        </View>

        {/* Option icons row: add horizontal padding/margins so icons are well spaced from phone edges */}
        <View style={[styles.optionsRow, {paddingVertical: 8, paddingHorizontal: -20 }]}> 
          <TouchableOpacity style={[styles.optionBtn, { marginHorizontal: 8 }]} onPress={onLikePress}>
            <Ionicons name="heart" size={20} color={liked ? COLORS.primary : COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.optionBtn, { marginHorizontal: 8 }]} onPress={onAddPress}>
            <Ionicons name="add" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.optionBtn, { marginHorizontal: 8 }]} onPress={shareSong}>
            <Ionicons name="share-social" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.optionBtn, { marginHorizontal: 8 }]} onPress={onMorePress}>
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.upNextWrap}><Text style={styles.upNextTitle}>Up Next</Text></View>

        {(upNextData || []).map((item, idx) => {
          const qIndex = (queue || []).findIndex((q) => String(q._id || q.id) === String(item._id || item.id))
          const displayPos = qIndex >= 0 ? qIndex + 1 : index + 1 + idx
          // prefer item.duration if present, otherwise use fetched cache
          const key = String(item._id || item.id || item.url || idx)
          const itemDur = typeof item.duration === 'number' && item.duration > 0 ? item.duration : upNextDurations[key]

          return (
            <View key={String(item._id || item.id || idx)} style={styles.upNextItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={styles.upNextIndex}><Text style={styles.upNextIndexText}>{displayPos}</Text></View>
                {item.artworkUrl && String(item.artworkUrl).trim().length > 0 ? (<Image source={{ uri: item.artworkUrl }} style={styles.upNextArt} />) : (<View style={styles.upNextArt} />)}
                <View style={{ marginLeft: 10, flexShrink: 1 }}>
                  <Text numberOfLines={1} style={styles.upNextTitleText}>{item.title}</Text>
                  <Text numberOfLines={1} style={styles.upNextArtistText}>{item.artist}</Text>
                </View>
              </View>
              <View style={{ marginLeft: 8 }}>
                <View style={styles.upNextDurationPill}>
                  <Text style={styles.upNextDuration}>{formatTime(itemDur || 0)}</Text>
                </View>
              </View>
            </View>
          )
        })}
      </Animated.ScrollView>
    </Animated.View>
  )
}