import { create } from 'zustand'
import TrackPlayer, { State, Event } from 'react-native-track-player'
import { setupTrackPlayer } from './trackPlayerSetup'

const usePlayerStore = create((set, get) => {
  let progressInterval = null
  let listeners = []

  const startProgressTimer = () => {
    stopProgressTimer()
    progressInterval = setInterval(async () => {
      try {
        const position = await TrackPlayer.getPosition()
        const duration = await TrackPlayer.getDuration()
        const state = await TrackPlayer.getState()
        set({ position: Math.floor((position || 0) * 1000), duration: Math.floor((duration || 0) * 1000), isPlaying: state === State.Playing })
      } catch (e) {
        // ignore polling errors
      }
    }, 1000)
  }

  const stopProgressTimer = () => {
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null }
  }

  const ensurePlayer = async () => {
    try {
      await setupTrackPlayer()
      // attach listeners once
      if (listeners.length === 0) {
        listeners.push(TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
          // handle end of queue: mimic previous behavior (stop or repeat)
          const q = get().queue || []
          const idx = get().index
          const repeatMode = get().repeatMode
          if (repeatMode === 'one' && get().current) {
            // replay same
            const current = get().current
            await TrackPlayer.reset()
            await TrackPlayer.add({ id: current.id || 'current', url: current.url, title: current.title || current.name })
            await TrackPlayer.play()
          } else if (q && q.length > 0 && typeof idx === 'number') {
            if (idx + 1 < q.length) {
              const next = q[idx + 1]
              await playTrack(next, q, idx + 1)
            } else if (repeatMode === 'all') {
              await playTrack(q[0], q, 0)
            } else {
              set({ isPlaying: false, current: null, position: 0 })
              stopProgressTimer()
            }
          } else {
            set({ isPlaying: false, current: null, position: 0 })
            stopProgressTimer()
          }
        }))
      }
    } catch (e) {
      console.warn('ensurePlayer failed', e)
    }
  }

  const playTrack = async (track, queue = null, index = 0) => {
    try {
      await ensurePlayer()
      // reset queue and load current track
      await TrackPlayer.reset()
      const item = {
        id: track.id || `t_${Date.now()}`,
        url: track.url,
        title: track.title || track.name || 'Unknown',
        artist: track.artist || track.uploader || '',
        artwork: track.artwork || track.image || track.poster || null,
      }
      await TrackPlayer.add(item)
      await TrackPlayer.play()
      set({ current: track, isPlaying: true, queue: queue || [track], index })
      startProgressTimer()
    } catch (e) {
      console.warn('player playTrack error', e)
    }
  }

  const pause = async () => {
    try {
      await TrackPlayer.pause()
      set({ isPlaying: false })
    } catch (e) { console.warn('pause error', e) }
  }

  const resume = async () => {
    try {
      await TrackPlayer.play()
      set({ isPlaying: true })
      startProgressTimer()
    } catch (e) { console.warn('resume error', e) }
  }

  const stop = async () => {
    try {
      await TrackPlayer.stop()
      await TrackPlayer.reset()
      stopProgressTimer()
      set({ isPlaying: false, current: null, queue: [], index: null, position: 0, duration: 0 })
    } catch (e) { console.warn('stop error', e) }
  }

  const seek = async (millis) => {
    try {
      if (typeof millis !== 'number') return
      const seconds = Math.max(0, millis / 1000)
      await TrackPlayer.seekTo(seconds)
      set({ position: Math.floor(seconds * 1000) })
    } catch (e) { console.warn('seek error', e) }
  }

  const setShuffle = (val) => set({ shuffle: !!val })
  const setRepeatMode = (mode) => set({ repeatMode: mode })

  const next = async () => {
    const q = get().queue || []
    const idx = get().index
    const shuffle = get().shuffle
    if (shuffle && q && q.length > 0) {
      let nextIdx = idx
      if (q.length === 1) nextIdx = 0
      else {
        while (nextIdx === idx) {
          nextIdx = Math.floor(Math.random() * q.length)
        }
      }
      await playTrack(q[nextIdx], q, nextIdx)
      return
    }

    if (q && typeof idx === 'number' && idx + 1 < q.length) {
      await playTrack(q[idx + 1], q, idx + 1)
    }
  }

  const previous = async () => {
    const q = get().queue || []
    const idx = get().index
    if (q && typeof idx === 'number' && idx - 1 >= 0) {
      await playTrack(q[idx - 1], q, idx - 1)
    }
  }

  return {
    current: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    shuffle: false,
    repeatMode: 'off', // 'off' | 'one' | 'all'
    queue: [],
    index: null,
    playTrack,
    pause,
    resume,
    stop,
    next,
    previous,
    seek,
    setShuffle,
    setRepeatMode,
  }
})

export default usePlayerStore;
