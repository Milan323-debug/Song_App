import React, { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, StyleSheet, Animated } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import COLORS from "../constants/colors";
import styles from "../assets/styles/create.styles";
import playlistStyles from "../assets/styles/playlists.styles";
import { API_URL, API } from "../constants/api";
import { useAuthStore } from "../store/authStore";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function CreatePlaylist({ navigation }) {
  const { token, user } = useAuthStore();
  const [name, setName] = useState("");
  const [songs, setSongs] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [image, setImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const router = useRouter();
  const [playlistCount, setPlaylistCount] = useState(null);
  // local playlist state for added songs
  const [playlistSongs, setPlaylistSongs] = useState([])
  const bounceAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    fetchSongs();
    fetchPlaylistCount();
  }, []);

  const fetchSongs = async () => {
    try {
      setLoading(true);
  const res = await fetch(API('api/songs'));
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
  const res = await fetch(API('api/playlists'));
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async () => {
    if (!image) return null;
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', {
        uri: image.uri,
        type: 'image/jpeg',
        name: 'playlist-cover.jpg'
      });

      const res = await fetch(`${API_URL}api/upload`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const createPlaylist = async () => {
    if (!token) return Alert.alert('Not signed in');
    setCreating(true);
    try {
      // Upload image first if selected
      const imageUrl = await uploadImage();
      
      // auto name if blank: Playlist #N using current playlist count if available
      let title;
      if (name && name.trim()) title = name.trim();
      else if (typeof playlistCount === 'number') title = `Playlist #${playlistCount + 1}`;
      else title = `Playlist #${Math.floor(Date.now() / 1000)}`;
      
      const res = await fetch(`${API_URL}api/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          title, 
          songs: selected.map((s) => s._id),
          imageUrl
        }),
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

  // mock recommended songs if none fetched
  const recommended = songs && songs.length > 0 ? songs : [
    { _id: '1', title: 'Stranger Things (feat. OneRepublic)', artist: 'Kygo, OneRepublic', artworkUrl: null },
    { _id: '2', title: 'Anytime Anywhere', artist: 'milet', artworkUrl: null },
    { _id: '3', title: 'Suisou No Buranko', artist: 'Kitri', artworkUrl: null },
    { _id: '4', title: 'Hide (feat. Seezyn)', artist: 'Juice WRLD, Seezyn', artworkUrl: null },
    { _id: '5', title: 'Original (from Dolittle)', artist: 'Sia', artworkUrl: null },
  ]

  const onAddSong = (song) => {
    // if already added, remove; otherwise add
    const exists = playlistSongs.some(s => String(s._id) === String(song._id))
    if (exists) {
      setPlaylistSongs(playlistSongs.filter(s => String(s._id) !== String(song._id)))
      return
    }
    // simple bounce animation and add
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.12, duration: 140, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start()
    setPlaylistSongs([song, ...playlistSongs])
  }

  const renderSong = ({ item }) => {
    const added = playlistSongs.some(s => String(s._id) === String(item._id))
    return (
      <Animated.View style={{ transform: [{ scale: added ? bounceAnim : 1 }], backgroundColor: 'transparent' }}>
        <View style={localStyles.songRow}>
          {item.artworkUrl ? (
            <Image source={{ uri: item.artworkUrl }} style={localStyles.songCover} />
          ) : (
            <View style={[localStyles.songCover, { justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="musical-notes" size={28} color={'rgba(255,255,255,0.85)'} />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={localStyles.songTitle}>{item.title}</Text>
            <Text style={localStyles.songArtist}>{item.artist}</Text>
          </View>
          <TouchableOpacity onPress={() => onAddSong(item)} style={[localStyles.addBtn, added && localStyles.addedBtn]} activeOpacity={0.85}>
            <Ionicons name={added ? 'checkmark' : 'add'} size={18} color={added ? COLORS.black : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    )
  }

  return (
    <View style={[localStyles.container, { backgroundColor: COLORS.background }]}> 
      <LinearGradient colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.6)"]} style={localStyles.header}> 
        <TouchableOpacity onPress={() => navigation.goBack()} style={localStyles.backIcon}>
          <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={localStyles.headerInner}>
          <View style={localStyles.coverPlaceholder}>
            {image ? <Image source={{ uri: image.uri }} style={localStyles.coverImage} /> : <Ionicons name="musical-notes" size={56} color={'rgba(255,255,255,0.9)'} />}
          </View>
          <View style={{ marginLeft: 16 }}>
            <Text style={localStyles.playlistTitle}>{name && name.trim() ? name : `My playlist #${(playlistCount || 0) + 1}`}</Text>
            <Text style={localStyles.creatorText}>{user?.name || 'You'}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', width: 120 }}>
          <TouchableOpacity style={localStyles.addToBtn} onPress={createPlaylist} disabled={creating}>
            <Ionicons name="add" size={20} color={COLORS.black} />
            <Text style={localStyles.addToBtnText}>Add to this playlist</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={localStyles.card}> 
        <Text style={localStyles.sectionTitle}>Recommended Songs</Text>
        <Animated.FlatList
          data={recommended}
          keyExtractor={(i) => String(i._id)}
          renderItem={renderSong}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Bottom navigation */}
      <View style={localStyles.bottomNav}>
        <TouchableOpacity style={localStyles.navItem}><Ionicons name="home" size={22} color={COLORS.textSecondary} /><Text style={localStyles.navText}>Home</Text></TouchableOpacity>
        <TouchableOpacity style={localStyles.navItem}><Ionicons name="search" size={22} color={COLORS.textSecondary} /><Text style={localStyles.navText}>Search</Text></TouchableOpacity>
        <TouchableOpacity style={localStyles.navItem}><Ionicons name="library" size={22} color={COLORS.textSecondary} /><Text style={localStyles.navText}>Your Library</Text></TouchableOpacity>
        <TouchableOpacity style={localStyles.navItem}><Ionicons name="sparkles" size={22} color={COLORS.textSecondary} /><Text style={localStyles.navText}>Premium</Text></TouchableOpacity>
        <TouchableOpacity style={localStyles.navItem}><Ionicons name="add-circle" size={22} color={COLORS.textSecondary} /><Text style={localStyles.navText}>Create</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0b' },
  header: { padding: 16, paddingTop: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'transparent' },
  headerInner: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backIcon: { position: 'absolute', left: 12, top: 34, padding: 8, zIndex: 20 },
  coverPlaceholder: { width: 120, height: 120, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  playlistTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  creatorText: { color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  addToBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12 },
  addToBtnText: { color: '#000', fontWeight: '700', marginLeft: 8 },
  card: { flex: 1, marginTop: 8, paddingHorizontal: 16 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  songCover: { width: 56, height: 56, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)' },
  songTitle: { color: '#fff', fontWeight: '700' },
  songArtist: { color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  addedBtn: { backgroundColor: `${COLORS.primary}` },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 72, backgroundColor: '#0b0b0b', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: -6 }, shadowRadius: 12 },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 }
})
