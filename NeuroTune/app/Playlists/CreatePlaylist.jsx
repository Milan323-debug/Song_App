import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from "react-native";
import COLORS from "../../constants/colors";
import styles from "../../assets/styles/create.styles";
import playlistStyles from "../../assets/styles/playlists.styles";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";

export default function CreatePlaylist({ navigation }) {
  const { token, user } = useAuthStore();
  const [name, setName] = useState("");
  const [songs, setSongs] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const [playlistCount, setPlaylistCount] = useState(null);

  useEffect(() => {
    fetchSongs();
    fetchPlaylistCount();
  }, []);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}api/songs`);
      const json = await res.json();
      if (Array.isArray(json.songs)) setSongs(json.songs);
      else if (Array.isArray(json)) setSongs(json);
    } catch (e) {
      console.warn('fetchSongs', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylistCount = async () => {
    try {
      const res = await fetch(`${API_URL}api/playlists`);
      const json = await res.json();
      // server returns { playlists: [...] }
      const list = Array.isArray(json.playlists) ? json.playlists : (Array.isArray(json) ? json : []);
      setPlaylistCount(list.length);
    } catch (e) {
      // ignore
    }
  };

  const toggleSelect = (song) => {
    const exists = selected.some((s) => String(s._id) === String(song._id));
    if (exists) setSelected(selected.filter((s) => String(s._id) !== String(song._id)));
    else setSelected([...selected, song]);
  };

  const createPlaylist = async () => {
    if (!token) return Alert.alert('Not signed in');
    setCreating(true);
    try {
      // auto name if blank: Playlist #N using current playlist count if available
      let title;
      if (name && name.trim()) title = name.trim();
      else if (typeof playlistCount === 'number') title = `Playlist #${playlistCount + 1}`;
      else title = `Playlist #${Math.floor(Date.now() / 1000)}`;
      const res = await fetch(`${API_URL}api/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, songs: selected.map((s) => s._id) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to create playlist');
      Alert.alert('Playlist created');
      // navigate back to Playlists list
      router.push('/Playlists');
    } catch (e) {
      console.error('createPlaylist error', e);
      Alert.alert('Create failed', e.message || String(e));
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.6)"]} style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 120, height: 120, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)' }} />
          <View style={{ marginLeft: 12 }}>
            <Text style={{ color: COLORS.textPrimary, fontSize: 24, fontWeight: '800' }}>{name || 'New Playlist'}</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>Create a playlist by adding songs</Text>
          </View>
        </View>
      </LinearGradient>
      <View style={[styles.card, { margin: 12, marginTop: 0 }] }>
        <Text style={styles.title}>Create Playlist</Text>
        <TextInput placeholder="Playlist name (optional)" value={name} onChangeText={setName} style={[styles.input, { marginTop: 8 }]} placeholderTextColor={COLORS.textSecondary} />
        <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>{selected.length} songs selected</Text>
        <FlatList
          data={songs}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' }}>
              {item.artworkUrl ? <Image source={{ uri: item.artworkUrl }} style={{ width: 56, height: 56, borderRadius: 6 }} /> : <View style={{ width: 56, height: 56, borderRadius: 6, backgroundColor: COLORS.cardBackground }} />}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: COLORS.textPrimary }}>{item.title}</Text>
                <Text style={{ color: COLORS.textSecondary }}>{item.artist}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleSelect(item)} style={{ padding: 12 }}>
                <Text style={{ color: selected.some((s) => String(s._id) === String(item._id)) ? COLORS.primary : COLORS.textSecondary }}>{selected.some((s) => String(s._id) === String(item._id)) ? 'Added' : '+'}</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 200 }}
        />

        <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={createPlaylist} disabled={creating}>
          {creating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Create Playlist</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
