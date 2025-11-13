import TrackPlayer, { Capability } from 'react-native-track-player'

export async function setupTrackPlayer() {
  try {
    // setup player if not already
    await TrackPlayer.setupPlayer()
    await TrackPlayer.updateOptions({
      stopWithApp: false,
      alwaysPauseOnInterruption: false,
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    })
  } catch (e) {
    console.warn('setupTrackPlayer failed', e)
  }
}
