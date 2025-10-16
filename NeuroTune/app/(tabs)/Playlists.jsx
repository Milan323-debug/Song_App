import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert, Modal } from "react-native";
import { useRouter } from "expo-router";
import { API_URL, API } from "../../constants/api";
import COLORS from "../../constants/colors";
import styles from "../../assets/styles/playlists.styles";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const router = useRouter();
  const { token, user } = useAuthStore();

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleDeletePlaylist = async () => {
    if (!selectedPlaylist || !token) return;

    try {
      const res = await fetch(`${API_URL}api/playlists/${selectedPlaylist._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to delete playlist');
      }

      // Remove playlist from state
      setPlaylists(playlists.filter(p => p._id !== selectedPlaylist._id));
      setMenuVisible(false);
      setSelectedPlaylist(null);
    } catch (error) {
      console.error('Delete playlist error:', error);
      Alert.alert('Error', 'Failed to delete playlist');
    }
  };

  const handleOpenMenu = (playlist) => {
    setSelectedPlaylist(playlist);
    setMenuVisible(true);
  };

  const fetchPlaylists = async () => {
    try {
      // If already refreshing (user pulled) don't flip the full-page loading indicator
      if (!refreshing) setLoading(true);
      const res = await fetch(`${API_URL}api/playlists`);
      const data = await res.json();
      // backend returns { playlists }
      if (data && Array.isArray(data.playlists)) setPlaylists(data.playlists);
      else if (Array.isArray(data)) setPlaylists(data);
    } catch (error) {
      console.error("fetchPlaylists error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchPlaylists();
    } catch (err) {
      console.error('Refresh error', err);
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }) => {
    const isOwner = user && item.user && String(user._id) === String(item.user._id);
    // prefer playlist-level artwork fields; fall back to first song artwork when not present
    const playlistArtwork =
      item.imageUrl ||
      item.artworkUrl ||
      (item.image && (item.image.url || item.image.secure_url)) ||
      (item.artwork && (item.artwork.url || item.artwork.secure_url)) ||
      (item.images && (item.images[0]?.secure_url || item.images[0]?.url)) ||
      (item.artworkUrl && item.artworkUrl) || null;

    const fallbackSongArtwork = item.songs && item.songs[0] && (item.songs[0].artworkUrl || item.songs[0].artwork);

    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/Playlists/${item._id}`)}>
        <View style={styles.cardLeft}>
          {playlistArtwork ? (
            <Image source={{ uri: playlistArtwork }} style={styles.artwork} />
          ) : fallbackSongArtwork ? (
            <Image source={{ uri: typeof fallbackSongArtwork === 'string' ? fallbackSongArtwork : fallbackSongArtwork.url }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, { backgroundColor: COLORS.cardBackground }]} />
          )}
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.description || `${item.songs?.length || 0} songs`}</Text>
          <Text style={styles.owner}>By {item.user?.username || 'Unknown'}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              handleOpenMenu(item);
            }}
            style={{
              padding: 8,
              marginLeft: 'auto',
              marginRight: -8
            }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end'
          }} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={{ 
            backgroundColor: COLORS.cardBackground,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 16
          }}>
            <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
              Playlist Options
            </Text>
            <TouchableOpacity 
              style={{ 
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
              }}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert(
                  'Delete Playlist',
                  'Are you sure you want to delete this playlist?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', onPress: handleDeletePlaylist, style: 'destructive' }
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={24} color={COLORS.error} />
              <Text style={{ color: COLORS.error, marginLeft: 12, fontSize: 16 }}>Delete Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ 
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center'
              }}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <FlatList
        data={playlists}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={() => (
          <View style={{ padding: 24 }}>
            <Text style={{ color: COLORS.textSecondary }}>No playlists yet. Create one from the Create tab.</Text>
          </View>
        )}
      />
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/createStack/CreatePlaylist')}
        style={{ position: 'absolute', right: 18, bottom: 120, backgroundColor: COLORS.primary, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: COLORS.white, fontSize: 28 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
