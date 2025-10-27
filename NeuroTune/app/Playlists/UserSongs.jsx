import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, Image, TouchableOpacity, Alert, Modal, TouchableWithoutFeedback, TextInput, Animated, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../constants/api';
import styles from '../../assets/styles/playlists.styles';
import { DEFAULT_ARTWORK_URL } from '../../constants/artwork'
import COLORS from '../../constants/colors';
import { useRouter } from 'expo-router';
import usePlayerStore from '../../store/playerStore';
import AddCircleButton from '../../components/AddCircleButton';

export default function UserSongs() {
  const { token, user } = useAuthStore();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [songMenuVisible, setSongMenuVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [likedSet, setLikedSet] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchAnim = useRef(new Animated.Value(0)).current
  const emptyAnim = useRef(new Animated.Value(0)).current
  const router = useRouter();
  const playTrack = usePlayerStore(s => s.playTrack)
  const togglePlay = usePlayerStore(s => s.togglePlay)

  const filteredSongs = React.useMemo(() => songs.filter(s => {
    const q = (searchQuery || '').trim().toLowerCase()
    if (!q) return true
    return (s.title || '').toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q)
  }), [songs, searchQuery])

  const fetchUserSongs = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Prefer username-based route
      const endpoint = `${API_URL}api/songs/user/${encodeURIComponent(user.username || user._id)}`;
      const res = await fetch(endpoint, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      const list = data && Array.isArray(data.songs) ? data.songs : (Array.isArray(data) ? data : []);
      setSongs(list);
    } catch (e) {
      console.warn('fetchUserSongs error', e);
      Alert.alert('Error', 'Failed to load your songs');
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  const fetchLiked = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}api/user/liked`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const j = await res.json()
      const list = Array.isArray(j.songs) ? j.songs : (Array.isArray(j) ? j : [])
      setLikedSet(new Set(list.map(s => String(s._id || s.id))))
    } catch (e) {
      console.warn('fetchLiked in UserSongs', e)
    }
  }, [token])

  useEffect(() => {
    fetchUserSongs();
    fetchLiked();
  }, [fetchUserSongs, fetchLiked]);

  // animate search bar on focus/blur
  useEffect(() => {
    Animated.timing(searchAnim, { toValue: searchFocused ? 1 : 0, duration: 200, useNativeDriver: true }).start()
  }, [searchFocused])

  // animate empty state when there are no songs
  useEffect(() => {
    const isEmpty = (filteredSongs || []).length === 0
    Animated.timing(emptyAnim, { toValue: isEmpty ? 1 : 0, duration: 350, useNativeDriver: true }).start()
  }, [filteredSongs, emptyAnim])

  const openSongMenu = (song) => {
    setSelectedSong(song);
    setSongMenuVisible(true);
  };

  const handleInlineAddToPlaylist = async (song) => {
    try {
      setSelectedSong(song);
      await fetchUserPlaylists();
      setPlaylistModalVisible(true);
      setSongMenuVisible(false);
    } catch (e) {
      console.warn('handleInlineAddToPlaylist', e);
      Alert.alert('Error', 'Could not open playlist selector');
    }
  };

  const toggleLike = async (song) => {
    try {
      if (!token) return Alert.alert('Not signed in')
      const res = await fetch(`${API_URL}api/songs/${song._id}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || json?.message || 'Failed to toggle like')
      const liked = json.liked === true
      setLikedSet((cur) => {
        const next = new Set(Array.from(cur))
        const key = String(song._id || song.id)
        if (liked) next.add(key); else next.delete(key)
        return next
      })
    } catch (e) {
      console.warn('toggleLike userSongs', e)
      Alert.alert('Error', 'Could not update liked state')
    }
  }

  const closeSongMenu = () => {
    setSelectedSong(null);
    setSongMenuVisible(false);
  };

  const fetchUserPlaylists = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}api/playlists/mine`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      const list = d && Array.isArray(d.playlists) ? d.playlists : [];
      setPlaylists(list);
    } catch (e) {
      console.warn('fetchUserPlaylists', e);
    }
  };

  const handleDeleteSong = async () => {
    if (!selectedSong || !token) return;
    try {
      const res = await fetch(`${API_URL}api/songs/${selectedSong._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to delete');
      // remove locally
      setSongs(cur => cur.filter(s => String(s._id) !== String(selectedSong._id)));
      closeSongMenu();
      Alert.alert('Deleted', 'Song removed');
    } catch (e) {
      console.error('delete song', e);
      Alert.alert('Error', 'Failed to delete song');
    }
  };

  const openAddToPlaylist = async () => {
    await fetchUserPlaylists();
    setPlaylistModalVisible(true);
    setSongMenuVisible(false);
  };

  const handleAddToPlaylist = async (playlistId) => {
    if (!playlistId || !selectedSong || !token) return;
    try {
      // fetch playlist to get current songs
      const pr = await fetch(`${API_URL}api/playlists/${playlistId}`);
      const pj = await pr.json();
      const existing = Array.isArray(pj.playlist?.songs) ? pj.playlist.songs.map(s => s._id || s) : [];
      const next = Array.from(new Set([...existing, String(selectedSong._id)]));
      const upr = await fetch(`${API_URL}api/playlists/${playlistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ songs: next })
      });
      if (!upr.ok) throw new Error('Failed to update playlist');
      setPlaylistModalVisible(false);
      setSelectedSong(null);
      Alert.alert('Added', 'Song added to playlist');
    } catch (e) {
      console.error('add to playlist', e);
      Alert.alert('Error', 'Failed to add song to playlist');
    }
  };

  if (loading) return (
    <View style={styles.container}>
      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ width: 160, height: 20, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' }} />
          <View style={{ width: 120, height: 14, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)', marginTop: 8 }} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
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
  );

  return (
    <View style={styles.container}>
      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' }}>Your Songs</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>{songs.length} created tracks</Text>
        </View>

        {/* Top search removed — converted to bottom sticky search bar for a cleaner, app-like layout */}
        <View style={{ height: 12 }} />
      </View>

      {/* Search bar placed under header (not fixed to bottom) */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        <View style={{ height: 56, borderRadius: 12, backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
          <Ionicons name="search" size={26} color={'#858585b2'} style={{ marginRight: 12 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search your songs"
            placeholderTextColor={"#888888"}
            style={{ color: COLORS.textPrimary, flex: 1, height: 56, fontSize: 16, fontWeight: '600' }}
            onFocus={() => { setSearchFocused(true) }}
            onBlur={() => { setSearchFocused(false) }}
            returnKeyType="search"
            underlineColorAndroid="transparent"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); Keyboard.dismiss() }} style={{ paddingLeft: 8 }} accessibilityLabel="Clear search">
              <Ionicons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredSongs}
        keyExtractor={(s) => s._id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={async () => {
            try {
              const list = filteredSongs || []
              const idx = list.findIndex(s => String(s._id || s.id) === String(item._id || item.id))
              playTrack && playTrack(item, list.length ? list : [item], idx >= 0 ? idx : 0)
            } catch (e) { console.warn('play from UserSongs failed', e) }
          }} style={styles.item} onLongPress={() => openSongMenu(item)}>
            <View>
                <Image source={{ uri: item.artworkUrl || item.artwork || DEFAULT_ARTWORK_URL }} style={styles.songArtwork} />
            </View>
            <View style={styles.itemText}>
              <Text style={[styles.title, { fontSize: 16 }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.subtitle, { fontSize: 13 }]} numberOfLines={1}>{item.artist || 'Unknown artist'}</Text>
            </View>
            {/* Inline like/add button: toggles liked state for the user's Liked Songs */}
            <AddCircleButton isAdded={likedSet.has(String(item._id))} onPress={() => toggleLike(item)} size={30} />
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); openSongMenu(item); }} style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
  contentContainerStyle={{ padding: 0, paddingTop: 6, paddingBottom: 40 }}
  ListFooterComponent={() => <View style={{ height: 24 }} />}
        ListEmptyComponent={() => (
          <Animated.View style={{ padding: 24, alignItems: 'center', opacity: emptyAnim, transform: [{ translateY: emptyAnim.interpolate ? emptyAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) : 0 }] }}>
            <Ionicons name="musical-notes-outline" size={44} color={COLORS.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' }}>You haven't uploaded any songs yet.</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 8, fontSize: 12, textAlign: 'center', maxWidth: 260 }}>Tap the + button on the home screen to upload your first track.</Text>
          </Animated.View>
        )}
      />

      

      {/* Song options modal */}
      <Modal visible={songMenuVisible} transparent animationType="fade" onRequestClose={closeSongMenu}>
        <TouchableWithoutFeedback onPress={closeSongMenu}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: COLORS.cardBackground, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Song Actions</Text>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={handleDeleteSong}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  <Text style={{ color: COLORS.error, marginLeft: 12, fontSize: 16 }}>Delete Song</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={openAddToPlaylist}>
                  <Ionicons name="add" size={20} color={COLORS.textPrimary} />
                  <Text style={{ color: COLORS.textPrimary, marginLeft: 12, fontSize: 16 }}>Add to Playlist</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }} onPress={closeSongMenu}>
                  <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Playlist selection modal */}
      <Modal visible={playlistModalVisible} transparent animationType="fade" onRequestClose={() => setPlaylistModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setPlaylistModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: COLORS.cardBackground, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%' }}>
                <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Select Playlist</Text>
                <FlatList
                  data={playlists}
                  keyExtractor={(p) => p._id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={{ paddingVertical: 12 }} onPress={() => handleAddToPlaylist(item._id)}>
                      <Text style={{ color: COLORS.textPrimary, fontSize: 16 }}>{item.title}</Text>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{(item.songs?.length || 0)} songs</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }} onPress={() => setPlaylistModalVisible(false)}>
                  <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
