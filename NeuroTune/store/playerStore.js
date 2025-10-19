import { create } from 'zustand'
// Use Expo AV for audio (provides Audio and Sound APIs)
import { Audio } from 'expo-av'

const usePlayerStore = create((set, get) => {
  const soundRef = { current: null }
  // optional promise that resolves when a new sound has finished creating
  soundRef.initPromise = null
  // queued seek when duration not yet known
  let queuedSeekMillis = null
  let audioModeInitialized = false

  const ensureAudioMode = async () => {
    if (audioModeInitialized) return
    try {
      // Configure audio to continue playing in background and play in silent mode on iOS.
      // Use a minimal, compatible audio mode configuration. Some expo-av versions
      // have different sets of interruptionMode constants which can trigger
      // "invalid value" errors; omitting them keeps this work across versions.
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      })
      audioModeInitialized = true
    } catch (e) {
      console.warn('Failed to set Audio mode', e)
    }
  }

  const playTrack = async (track, queue = null, index = 0) => {
    try {
      // ensure audio mode is configured for background playback
      await ensureAudioMode()
      // stop previous
      if (soundRef.current) {
        try { await soundRef.current.unloadAsync(); } catch (e) {}
        soundRef.current = null
      }

      // create and track init promise so callers (seek/resume/etc) can wait for the sound to be ready
      const creation = Audio.Sound.createAsync({ uri: track.url }, { shouldPlay: true })
      soundRef.initPromise = creation.then(({ sound }) => {
        soundRef.current = sound

        sound.setOnPlaybackStatusUpdate((status) => {
        if (!status) return

        // update shared playback state (position, duration, playing)
        try {
          const isPlaying = !!status.isPlaying
          const position = typeof status.positionMillis === 'number' ? status.positionMillis : get().position || 0
          const duration = typeof status.durationMillis === 'number' ? status.durationMillis : get().duration || 0
          set({ isPlaying, position, duration })
        } catch (e) {
          // swallow
        }

        // if duration just became available and a queued seek exists, perform it
        try {
          if (typeof status.durationMillis === 'number' && queuedSeekMillis != null) {
            const to = Math.max(0, Math.floor(queuedSeekMillis))
            queuedSeekMillis = null
            sound.setPositionAsync(to).catch(() => {})
            set({ position: to })
          }
        } catch (e) {}

        if (status.didJustFinish) {
          // auto play next immediately (don't use JS timers which may be suspended in background)
          const q = get().queue || []
          const idx = get().index
          const repeatMode = get().repeatMode
          const shuffle = get().shuffle
          const currentTrack = get().current

          if (repeatMode === 'one' && currentTrack) {
            // replay same track
            playTrack(currentTrack, q, idx)
          } else if (shuffle && q && q.length > 0) {
            // pick a random index (avoid same when possible)
            let nextIdx = idx
            if (q.length === 1) nextIdx = 0
            else {
              while (nextIdx === idx) {
                nextIdx = Math.floor(Math.random() * q.length)
              }
            }
            playTrack(q[nextIdx], q, nextIdx)
          } else if (q && q.length > 0 && idx != null) {
            if (idx + 1 < q.length) {
              const next = q[idx + 1]
              playTrack(next, q, idx + 1)
            } else {
              // reached end of queue
              if (repeatMode === 'all') {
                // loop back to first track
                playTrack(q[0], q, 0)
              } else {
                set({ isPlaying: false, current: null, position: 0 })
              }
            }
          } else {
            // finished
            set({ isPlaying: false, current: null, position: 0 })
          }
        }
        })

        return sound
      })

      // await creation so playTrack doesn't return until sound is ready
      try { await soundRef.initPromise } catch (e) { /* creation failed, handled below */ }
      soundRef.initPromise = null

      set({ current: track, isPlaying: true, queue: queue || [track], index: index })
    } catch (e) {
      console.warn('player playTrack error', e)
    }
  }

  const pause = async () => {
    try {
      if (soundRef.initPromise) await soundRef.initPromise.catch(() => {})
      if (soundRef.current) await soundRef.current.pauseAsync()
      set({ isPlaying: false })
    } catch (e) { console.warn('pause error', e) }
  }

  const resume = async () => {
    try {
      if (soundRef.initPromise) await soundRef.initPromise.catch(() => {})
      if (soundRef.current) await soundRef.current.playAsync()
      set({ isPlaying: true })
    } catch (e) { console.warn('resume error', e) }
  }

  const stop = async () => {
    try {
      if (soundRef.initPromise) await soundRef.initPromise.catch(() => {})
      if (soundRef.current) { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null }
      set({ isPlaying: false, current: null, queue: [], index: null, position: 0, duration: 0 })
    } catch (e) { console.warn('stop error', e) }
  }

  const seek = async (millis) => {
    try {
      if (typeof millis !== 'number') return
      // if a sound is currently being created, wait for it
      if (soundRef.initPromise) {
        await soundRef.initPromise.catch(() => {})
        soundRef.initPromise = null
      }
      if (soundRef.current) {
        // if we don't yet know duration (some sources), queue the seek until status reports duration
        const curDuration = get().duration || 0
        const to = Math.max(0, Math.floor(millis))
        if (curDuration <= 0) {
          queuedSeekMillis = to
          // still update UI optimistically
          set({ position: to })
        } else {
          try {
            await soundRef.current.setPositionAsync(to)
            set({ position: to })
          } catch (e) {
            console.warn('[playerStore] setPositionAsync failed', e)
          }
        }
      } else {
        // no sound available to seek - log for debugging
        console.warn('[playerStore] seek called but no sound is loaded (soundRef.current null)')
      }
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
      playTrack(q[nextIdx], q, nextIdx)
      return
    }

    if (q && idx != null && idx + 1 < q.length) {
      playTrack(q[idx + 1], q, idx + 1)
    }
  }

  const previous = async () => {
    const q = get().queue || []
    const idx = get().index
    if (q && idx != null && idx - 1 >= 0) {
      playTrack(q[idx - 1], q, idx - 1)
    }
  }

  return {
    current: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    shuffle: false,
    repeatMode: 'off', // 'off' | 'one' | 'all' (all not implemented specially here)
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
