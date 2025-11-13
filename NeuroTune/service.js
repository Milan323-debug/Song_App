/**
 * Background service entry for react-native-track-player.
 * This file is registered with TrackPlayer.registerPlaybackService and
 * runs in the native background context to respond to remote events.
 */
import TrackPlayer, { Event } from 'react-native-track-player'

module.exports = async function() {
  // Remote controls
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play())
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause())
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext())
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious())
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => TrackPlayer.seekTo(position))

  // Handle playback queue ended / track changed if desired
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async ({ position }) => {
    // Default behavior: stop when queue ended. App store logic in JS store if you want auto-next.
    try { await TrackPlayer.stop() } catch (e) {}
  })
}
