import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Image, TouchableOpacity, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../constants/api';
import styles from '../../assets/styles/playlists.styles';
import COLORS from '../../constants/colors';
import { useRouter } from 'expo-router';

export default function UserSongs() {
  const { token, user } = useAuthStore();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [songMenuVisible, setSongMenuVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const router = useRouter();

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

  useEffect(() => {
    fetchUserSongs();
  }, [fetchUserSongs]);

  const openSongMenu = (song) => {
    setSelectedSong(song);
    setSongMenuVisible(true);
  };

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
      <View style={{ padding: 16 }}>
        <View style={{ width: 160, height: 20, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <View style={{ width: 120, height: 14, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)', marginTop: 8 }} />
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
      <View style={{ padding: 16 }}>
        <Text style={{ color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' }}>Your Songs</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>{songs.length} created tracks</Text>
      </View>

      <FlatList
        data={songs}
        keyExtractor={(s) => s._id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/Songs/${item._id}`)} style={styles.item} onLongPress={() => openSongMenu(item)}>
            <View>
              {item.artworkUrl || item.artwork ? (
                <Image source={{ uri: item.artworkUrl || item.artwork }} style={styles.songArtwork} />
              ) : (
                <View style={styles.songArtwork} />
              )}
            </View>
            <View style={styles.itemText}>
              <Text style={[styles.title, { fontSize: 16 }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.subtitle, { fontSize: 13 }]} numberOfLines={1}>{item.artist || 'Unknown artist'}</Text>
            </View>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); openSongMenu(item); }} style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
  contentContainerStyle={{ padding: 0, paddingTop: 6, paddingBottom: 140 }}
  ListFooterComponent={() => <View style={{ height: 120 }} />}
        ListEmptyComponent={() => (
          <View style={{ padding: 24 }}>
            <Text style={{ color: COLORS.textSecondary }}>You haven't uploaded any songs yet.</Text>
          </View>
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
