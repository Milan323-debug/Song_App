import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert, Modal, TextInput, Animated, Keyboard, Platform, Pressable } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useFocusEffect } from '@react-navigation/native';
import { API_URL, API } from "../../constants/api";
import COLORS from "../../constants/colors";
import styles from "../../assets/styles/playlists.styles";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { BlurView } from 'expo-blur';
import { DEFAULT_ARTWORK_BG, DEFAULT_PROFILE_IMAGE } from '../../constants/artwork'

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [pinnedIds, setPinnedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const anim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const inputRef = useRef(null);
  const pulse = useRef(new Animated.Value(0.85)).current;

  // start pulsing while loading
  React.useEffect(() => {
    let loop
    if (loading) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        ])
      )
      loop.start()
    } else {
      // ensure visible when not loading
      Animated.timing(pulse, { toValue: 1, duration: 120, useNativeDriver: true }).start()
    }
    return () => { loop && loop.stop && loop.stop() }
  }, [loading])

  useEffect(() => {
    fetchPlaylists();
    loadPinnedIds();
  }, []);

  // Refetch when screen is focused (so newly created playlists appear)
  useFocusEffect(
    useCallback(() => {
      fetchPlaylists();
    }, [token])
  );

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

  const PIN_KEY = '@neurotune:pinned_playlists';
  const loadPinnedIds = async () => {
    try {
      const raw = await AsyncStorage.getItem(PIN_KEY);
      if (raw) setPinnedIds(JSON.parse(raw));
    } catch (e) { console.warn('loadPinnedIds', e) }
  }

  const savePinnedIds = async (ids) => {
    try {
      await AsyncStorage.setItem(PIN_KEY, JSON.stringify(ids));
      setPinnedIds(ids);
    } catch (e) { console.warn('savePinnedIds', e) }
  }

  const togglePin = async (playlist) => {
    if (!playlist) return;
    const id = String(playlist._id || '');
    const isPinned = pinnedIds.includes(id);
    const next = isPinned ? pinnedIds.filter(i => i !== id) : [id, ...pinnedIds];
    await savePinnedIds(next);
    // reorder local playlists
    setPlaylists((cur) => {
      const rest = cur.filter(p => String(p._id) !== id);
      if (!isPinned) return [{ ...playlist, _pinned: true }, ...rest];
      return rest.map(p => ({ ...p, _pinned: undefined }));
    });
    setMenuVisible(false);
  }

  const fetchPlaylists = useCallback(async () => {
    try {
      // If already refreshing (user pulled) don't flip the full-page loading indicator
      if (!refreshing) setLoading(true);
      const endpoint = token ? `${API_URL}api/playlists/mine` : `${API_URL}api/playlists`;
      const res = await fetch(endpoint, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      // backend returns { playlists }
      let list = (data && Array.isArray(data.playlists)) ? data.playlists : (Array.isArray(data) ? data : []);

      // fetch liked count/songs for the user and inject a synthetic 'Liked Songs' playlist
      try {
        if (token) {
          const lr = await fetch(`${API_URL}api/user/liked`, { headers: { Authorization: `Bearer ${token}` } });
          const lj = await lr.json();
          // backend returns { songs: [] } — be tolerant of different shapes
          const songsArray = Array.isArray(lj) ? lj : (Array.isArray(lj?.songs) ? lj.songs : []);
          const likedCount = songsArray.length || 0;
          const likedPseudo = {
            _id: 'liked',
            title: 'Liked Songs',
            description: `${likedCount} tracks`,
            user: user || {},
            _isSynthetic: true,
            // include songs so the UI can use artwork from the first liked track
            songs: songsArray
          };
          // inject only if not already present
          if (!list.find(p => String(p._id) === 'liked')) list = [likedPseudo, ...list];
        }
      } catch (e) { console.warn('liked fetch error', e) }

      // if there are pinned IDs, move those to the top in order
      if (pinnedIds && pinnedIds.length) {
        const pinned = [];
        const rest = [];
        list.forEach(p => {
          if (pinnedIds.includes(String(p._id))) pinned.push({ ...p, _pinned: true }); else rest.push(p);
        });
        list = [...pinned, ...rest];
      }

      setPlaylists(list);
      // mark that we have loaded playlists at least once so subsequent refreshes use pull-to-refresh UI
      setHasLoadedOnce(true);
    } catch (error) {
      console.error("fetchPlaylists error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, refreshing]);

  // open/close animation handlers
  const openSearch = () => {
    setSearchOpen(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      // focus input after animation
      setTimeout(() => inputRef.current?.focus?.(), 50);
    });
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    Animated.timing(anim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setSearchOpen(false);
      setSearchQuery('');
    });
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
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { transform: [{ scale: pressed ? 0.985 : 1 }], opacity: pressed ? 0.96 : 1 }
        ]}
        android_ripple={{ color: 'rgba(255,255,255,0.03)' }}
        onPress={() => {
          if (String(item._id) === 'liked') return router.push('/Playlists/Liked');
          return router.push(`/Playlists/${item._id}`);
        }}
        onLongPress={() => handleOpenMenu(item)}
        hitSlop={8}
        accessibilityRole="button"
      >
        <View style={styles.cardLeft}>
          {String(item._id) === 'liked' ? (
            <Image source={require('../../assets/images/heart.png')} style={styles.artwork} />
          ) : playlistArtwork ? (
            <Image source={{ uri: playlistArtwork }} style={styles.artwork} />
          ) : fallbackSongArtwork ? (
            <Image source={{ uri: typeof fallbackSongArtwork === 'string' ? fallbackSongArtwork : fallbackSongArtwork.url }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, { backgroundColor: DEFAULT_ARTWORK_BG }]} />
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
              marginRight: 0
            }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </Pressable>
    );
  };

  if ((loading && !hasLoadedOnce) ) {
    // Skeleton: show header and several placeholder playlist cards
    const skeletons = Array.from({ length: 6 })
    return (
      <Animated.View style={[styles.container, { paddingTop: 8, opacity: pulse }]}> 
        <View style={styles.libraryHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.avatar, { backgroundColor: COLORS.cardBackground }]}>
              <View style={[styles.avatarImg, { backgroundColor: COLORS.black, borderRadius: 20 }]} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <View style={{ width: 160, height: 20, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' }} />
              <View style={{ width: 120, height: 14, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)', marginTop: 8 }} />
            </View>
          </View>
        </View>

        <View style={styles.pillRow}>
          <View style={{ width: 110, height: 36, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', marginRight: 8 }} />
          <View style={{ width: 90, height: 36, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', marginRight: 8 }} />
          <View style={{ width: 90, height: 36, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)' }} />
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          {skeletons.map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' }} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <View style={{ width: '60%', height: 16, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)' }} />
                <View style={{ width: '40%', height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)', marginTop: 8 }} />
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: 8 }]}> 
      {/* Header */}
      <View style={styles.libraryHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.avatar}>
            <Image source={(user?.profileImage) ? { uri: user?.profileImage } : DEFAULT_PROFILE_IMAGE} style={styles.avatarImg} />
          </View>
          <Text style={styles.titleLarge}>Your Library</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 1 }} />
          {/* search & add buttons - search opens animated overlay */}
          <TouchableOpacity style={{ marginRight: 12 }} onPress={openSearch} accessibilityLabel="Open search">
            <Ionicons name="search" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/createStack/CreatePlaylist')}>
            <Ionicons name="add" size={32} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        {/* Animated search overlay (renders at top of screen, absolute) */}
        <Animated.View pointerEvents={searchOpen ? 'auto' : 'none'} style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          paddingTop: 8,
          zIndex: 40,
          // animate opacity and translateY
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }]
        }}>
          <BlurView intensity={90} tint="default" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ padding: 23, paddingTop: 24, backgroundColor: COLORS.cardBackground + 'cc', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Animated.View style={{
                  backgroundColor: COLORS.inputBackground,
                  borderRadius: 28,
                  paddingHorizontal: 12,
                  height: 44,
                  justifyContent: 'center',
                  transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }]
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="search" size={18} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      ref={inputRef}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search your library"
                      placeholderTextColor={COLORS.textSecondary}
                      style={{ color: COLORS.textPrimary, flex: 1 }}
                      accessible
                      accessibilityLabel="Library search"
                      returnKeyType="search"
                      onSubmitEditing={() => { /* no-op for now */ }}
                    />
                    {!!searchQuery && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} style={{ paddingLeft: 8 }} accessibilityLabel="Clear search">
                        <Ionicons name="close" size={18} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              </View>
              <TouchableOpacity onPress={closeSearch} style={{ marginLeft: 12 }} accessibilityLabel="Cancel search">
                <Text style={{ color: COLORS.textPrimary, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>

      

      {/* Pill tabs */}
      <View style={styles.pillRow}>
        <TouchableOpacity style={[styles.pill, styles.pillActive]} onPress={() => {}}>
          <Text style={[styles.pillText, styles.pillTextActive]}>Playlists</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pill} onPress={() => router.push('/Playlists/UserSongs')}>
          <Text style={styles.pillText}>Your Songs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pill} onPress={() => Alert.alert('Not implemented', 'Albums view')}>
          <Text style={styles.pillText}>Albums</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pill} onPress={() => Alert.alert('Not implemented', 'Artists view')}>
          <Text style={styles.pillText}>Artists</Text>
        </TouchableOpacity>
      </View>

      {/* Recents header */}
      <View style={styles.recentsRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="swap-vertical" size={18} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
          <Text style={styles.recentsTitle}>Recents</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.alert('Change view') }>
          <Ionicons name="grid" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
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
            {/* Pin / Unpin option */}
            {selectedPlaylist && !selectedPlaylist._isSynthetic && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                }}
                onPress={() => togglePin(selectedPlaylist)}
              >
                <Ionicons name={pinnedIds.includes(String(selectedPlaylist._id)) ? 'pin' : 'pin-outline'} size={20} color={COLORS.textPrimary} />
                <Text style={{ color: COLORS.textPrimary, marginLeft: 12, fontSize: 16 }}>{pinnedIds.includes(String(selectedPlaylist._id)) ? 'Unpin' : 'Pin to top'}</Text>
              </TouchableOpacity>
            )}
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
      {(() => {
        const filteredPlaylists = playlists.filter(p => {
          const q = (searchQuery || '').trim().toLowerCase()
          if (!q) return true
          return (p.title || '').toLowerCase().includes(q) || (p.user?.username || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
        })

        return (
          <FlatList
            data={filteredPlaylists}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: 140 }}
            ListHeaderComponent={null}
            ListFooterComponent={() => <View style={{ height: 120 }} />}
            extraData={searchQuery}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={() => (
          <View style={{ padding: 24 }}>
            <Text style={{ color: COLORS.textSecondary }}>No playlists yet. Create one from the Create tab.</Text>
          </View>
        )}
      />
        )
      })()}
      {/* floating create button removed in favor of header + */}
    </View>
  );
}
