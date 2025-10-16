import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Animated, Dimensions, PanResponder, Image, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import COLORS from '../constants/colors'
import styles from '../assets/styles/playerContainer.styles'
import usePlayerStore from '../store/playerStore'

// Theme-based colors
const SONGS_BG = COLORS.background || '#071019'
const SONGS_CARD = COLORS.cardBackground || '#0f1724'
const SONGS_BORDER = COLORS.border || '#15202b'
const SONGS_TEXT = COLORS.textPrimary || '#E6F7F2'
const SONGS_TEXT_LIGHT = COLORS.textSecondary || '#9AA6B2'
const ACCENT = COLORS.primary || '#22c1a9'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MINI_HEIGHT = 72
const TAB_BAR_HEIGHT = 28
const THUMB_SIZE = 13

export default function PlayerContainer() {
  const { current, isPlaying, pause, resume, stop, previous, next, position, duration, seek } = usePlayerStore()
  const insets = useSafeAreaInsets()
  const anim = useRef(new Animated.Value(0)).current // 0 mini, 1 full
  const pan = useRef(new Animated.Value(0)).current
  const [expanded, setExpanded] = useState(false)
  const [seeking, setSeeking] = useState(false)
  const [seekPos, setSeekPos] = useState(0)
  const progressAnim = useRef(new Animated.Value(0)).current // 0..1 progress for animated UI
  const thumbScale = useRef(new Animated.Value(1)).current
  const progressWidth = useRef(1)
  const miniProgressWidth = useRef(1)
  const progressBarRef = useRef(null)
  const miniProgressRef = useRef(null)
  const progressBarLayout = useRef({ x: 0, width: 1 })
  const miniProgressLayout = useRef({ x: 0, width: 1 })
  const seekPosRef = useRef(0)
  const durationRef = useRef(duration)

  // keep duration ref up to date so PanResponder (created once) can read it
  useEffect(() => { durationRef.current = duration }, [duration])

  // animate visual progress when playback updates (unless user is scrubbing)
  useEffect(() => {
    if (!seeking) {
      const denom = (duration && duration > 0) ? duration : 1
      const pct = Math.max(0, Math.min(1, (position || 0) / denom))
      Animated.timing(progressAnim, { toValue: pct, duration: 250, useNativeDriver: false }).start()
    }
  }, [position, duration, seeking])

  const progressPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e, gs) => {
      setSeeking(true)
      // prefer locationX (coordinates relative to the responder target) when present
      const w = progressWidth.current || 1
      const locX = typeof e.nativeEvent.locationX === 'number' ? e.nativeEvent.locationX : null
      const pageX = typeof e.nativeEvent.pageX === 'number' ? e.nativeEvent.pageX : null
      const px = progressBarLayout.current.x || 0
      let relativeX = 0
      if (locX != null && locX >= 0 && locX <= w) {
        relativeX = locX
      } else if (pageX != null) {
        relativeX = pageX - px
      }
      const percent = Math.max(0, Math.min(1, relativeX / w))
      const target = percent * (durationRef.current || 1)
  seekPosRef.current = target
  setSeekPos(target)
  // update animated progress and enlarge thumb for feedback
  const pct = Math.max(0, Math.min(1, (durationRef.current && durationRef.current > 0) ? (target / durationRef.current) : 0))
  progressAnim.setValue(pct)
  Animated.spring(thumbScale, { toValue: 1.4, useNativeDriver: false }).start()
      
    },
    onPanResponderMove: (e, gs) => {
      const w = progressWidth.current || 1
      const locX = typeof e.nativeEvent.locationX === 'number' ? e.nativeEvent.locationX : null
      const pageX = typeof e.nativeEvent.pageX === 'number' ? e.nativeEvent.pageX : null
      const px = progressBarLayout.current.x || 0
      let relativeX = 0
      if (locX != null && locX >= 0 && locX <= w) {
        relativeX = locX
      } else if (pageX != null) {
        relativeX = pageX - px
      }
      const percent = Math.max(0, Math.min(1, relativeX / w))
      const target = percent * (durationRef.current || 1)
  seekPosRef.current = target
  setSeekPos(target)
  // update animated progress directly for snappy UI
  const pct = Math.max(0, Math.min(1, (durationRef.current && durationRef.current > 0) ? (target / durationRef.current) : 0))
  progressAnim.setValue(pct)
      
    },
    onPanResponderRelease: async (e, gs) => {
      setSeeking(false)
      try {
        const to = seekPosRef.current
        // animate thumb back to normal and smooth fill to final
        Animated.parallel([
          Animated.timing(progressAnim, { toValue: (durationRef.current && durationRef.current > 0) ? (to / durationRef.current) : 0, duration: 200, useNativeDriver: false }),
          Animated.spring(thumbScale, { toValue: 1, useNativeDriver: false }),
        ]).start()
        await seek(to)
      } catch (err) { console.warn('seek fail', err) }
    },
  })).current

  useEffect(() => {
    // reset to mini when track finished/cleared
    if (!current) collapse()
  }, [current])

  const expand = () => {
    setExpanded(true)
    Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }).start()
  }
  const collapse = () => {
    Animated.timing(anim, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => setExpanded(false))
  }

  // pan responder to allow swipe down to collapse when expanded
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) pan.setValue(gs.dy)
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120) {
          pan.setValue(0)
          collapse()
        } else {
          Animated.timing(pan, { toValue: 0, duration: 150, useNativeDriver: true }).start()
        }
      },
    })
  ).current

  if (!current) return null

  const baseBottom = TAB_BAR_HEIGHT + (insets.bottom || 0) - 18

  // animated styles
  const fullTranslateY = anim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] })
  const miniOpacity = anim.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' })
  const fullOpacity = anim.interpolate({ inputRange: [0.6, 1], outputRange: [0, 1], extrapolate: 'clamp' })

  const panStyle = {
    transform: [
      { translateY: Animated.add(pan, Animated.multiply(anim, 0)) },
    ],
  }

  const formatTime = (ms) => {
    if (!ms || ms <= 0) return '0:00'
    const total = Math.floor(ms / 1000)
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // progress used for UI (from store unless currently scrubbing)
  const progress = seeking ? (seekPos / (duration || 1)) : ((duration > 0) ? (position / duration) : 0)

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Mini Bar */}
      <Animated.View style={[styles.miniContainer, { bottom: baseBottom, opacity: miniOpacity, transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [0, -8] }) }] }]}> 
        <TouchableOpacity activeOpacity={0.9} style={styles.miniInner} onPress={expand}>
          {/* optional artwork */}
          {current.artworkUrl ? (
            <Image source={{ uri: current.artworkUrl }} style={styles.miniArtPlaceholder} />
          ) : (
            <View style={styles.miniArtPlaceholder} />
          )}
          <View style={styles.miniInfo}>
            <Text style={styles.title} numberOfLines={1}>{current.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{current.artist}</Text>
            {/* mini progress bar */}
            <View
              ref={miniProgressRef}
              style={styles.miniProgressWrap}
              onLayout={(e) => {
                miniProgressWidth.current = e.nativeEvent.layout.width
                // measure absolute position for pageX calculations
                if (miniProgressRef.current && miniProgressRef.current.measure) {
                  miniProgressRef.current.measure((fx, fy, w, h, px, py) => {
                    miniProgressLayout.current = { x: px, width: w }
                  })
                }
              }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                // immediate tap-to-seek on mini bar using pageX
                try {
                  const pageX = e.nativeEvent.pageX
                  const px = miniProgressLayout.current.x || 0
                  const w = miniProgressWidth.current || 1
                  const relativeX = pageX - px
                  const percent = Math.max(0, Math.min(1, relativeX / w))
                  const target = percent * (duration || 1)
                  // update UI briefly
                  setSeekPos(target)
                  setSeeking(true)
              // visual feedback
              Animated.sequence([Animated.spring(thumbScale, { toValue: 1.3, useNativeDriver: false }), Animated.spring(thumbScale, { toValue: 1, useNativeDriver: false })]).start()
              // perform seek
              seek(target).catch((err) => console.warn('mini seek fail', err)).finally(() => setSeeking(false))
                } catch (err) { console.warn('mini seek', err) }
              }}
            >
              <Animated.View style={[styles.miniProgress, { width: progressAnim.interpolate({ inputRange: [0,1], outputRange: [0, Math.max(0, miniProgressWidth.current)] }) }]} />
            </View>
          </View>
          <TouchableOpacity onPress={() => (isPlaying ? pause() : resume())} style={styles.miniPlayBtnSmall}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color={SONGS_BG} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>

      {/* Full Screen Overlay */}
      <Animated.View
        style={[
          styles.fullContainer,
          { transform: [{ translateY: Animated.add(fullTranslateY, pan) }], opacity: fullOpacity },
        ]}
        {...(expanded ? panResponder.panHandlers : {})}
      >
        <View style={styles.fullHeader}>
          <TouchableOpacity onPress={collapse} style={{ padding: 8 }}>
            <Ionicons name="chevron-down" size={28} color={SONGS_TEXT} />
          </TouchableOpacity>
        </View>

        <View style={styles.fullContent}>
          {current.artworkUrl ? (
            <Image source={{ uri: current.artworkUrl }} style={styles.fullArtPlaceholder} />
          ) : (
            <View style={styles.fullArtPlaceholder} />
          )}
          <Text style={styles.fullTitle}>{current.title}</Text>
          <Text style={styles.fullArtist}>{current.artist}</Text>

          {/* progress + times */}
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(seeking ? seekPos : position)}</Text>
            <View
              ref={progressBarRef}
              style={styles.progressBarWrap}
              onLayout={(e) => {
                progressWidth.current = e.nativeEvent.layout.width
                if (progressBarRef.current && progressBarRef.current.measure) {
                  progressBarRef.current.measure((fx, fy, w, h, px, py) => {
                    progressBarLayout.current = { x: px, width: w }
                  })
                }
              }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                // immediate tap-to-seek on full progress bar using locationX or pageX
                try {
                  const w = progressWidth.current || 1
                  const locX = typeof e.nativeEvent.locationX === 'number' ? e.nativeEvent.locationX : null
                  const pageX = typeof e.nativeEvent.pageX === 'number' ? e.nativeEvent.pageX : null
                  const px = progressBarLayout.current.x || 0
                  let relativeX = 0
                  if (locX != null && locX >= 0 && locX <= w) relativeX = locX
                  else if (pageX != null) relativeX = pageX - px
                  const percent = Math.max(0, Math.min(1, relativeX / w))
                  const target = percent * (durationRef.current || 1)
                  setSeekPos(target)
                  setSeeking(true)
                  seek(target).catch((err) => console.warn('full seek fail', err)).finally(() => setSeeking(false))
                  
                } catch (err) { console.warn('full seek', err) }
              }}
            >
              <View style={styles.progressBarBg}>
                <Animated.View style={[styles.progressBarFill, { width: progressAnim.interpolate({ inputRange: [0,1], outputRange: [0, Math.max(0, progressWidth.current)] }) }]} />
              </View>
              {/* visible thumb (translateX avoids 'left' style) */}
              <Animated.View pointerEvents="none" style={[styles.progressThumbContainer, { transform: [ { translateX: progressAnim.interpolate({ inputRange: [0,1], outputRange: [0, Math.max(0, progressWidth.current - THUMB_SIZE)] }) }, { scale: thumbScale } ] }]}>
                <View style={styles.progressThumb} />
              </Animated.View>
              {/* pan responder area for seeking when expanded */}
              {expanded && (
                <View style={StyleSheet.absoluteFill} {...progressPanResponder.panHandlers} />
              )}
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={previous} style={styles.ctrlBtn}><Ionicons name="play-skip-back" size={28} color={SONGS_TEXT} /></TouchableOpacity>
            <TouchableOpacity onPress={() => (isPlaying ? pause() : resume())} style={[styles.ctrlBtn, styles.playBigBtn]}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color={SONGS_BG} />
            </TouchableOpacity>
            <TouchableOpacity onPress={next} style={styles.ctrlBtn}><Ionicons name="play-skip-forward" size={28} color={SONGS_TEXT} /></TouchableOpacity>
          </View>

        </View>
      </Animated.View>
    </View>
  )
}

// styles are imported from assets/styles/playerContainer.styles.js
