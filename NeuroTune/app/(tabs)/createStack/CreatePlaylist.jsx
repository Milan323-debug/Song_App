import React, { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, StyleSheet, Animated, Modal, Pressable } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import COLORS from "../../../constants/colors";
import styles from "../../../assets/styles/create.styles";
import playlistStyles from "../../../assets/styles/playlists.styles";
import { API_URL, API } from "../../../constants/api";
import { useAuthStore } from "../../../store/authStore";
import { LinearGradient } from 'expo-linear-gradient';
import GradientBackground from '../../../components/GradientBackground'
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AddCircleButton from '../../../components/AddCircleButton';

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
  const [createModalVisible, setCreateModalVisible] = useState(false)

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
      // Use the new ImagePicker.MediaType when available to avoid deprecation warnings
      const mediaTypes = ImagePicker.MediaType ? ImagePicker.MediaType.Images : ImagePicker.MediaTypeOptions.Images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
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
      // Use the same signed upload flow as the song uploader (Cloudinary)
      // Request signature from server
      const signRes = await fetch(API('api/songs/sign'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ folder: 'playlists/artwork', resource_type: 'image' }),
      });
      if (!signRes.ok) throw new Error('Failed to get upload signature');
      const signJson = await signRes.json();

      const cloudUrl = `https://api.cloudinary.com/v1_1/${signJson.cloud_name}/image/upload`;
      const form = new FormData();
      form.append('file', { uri: image.uri, name: image.fileName || 'cover.jpg', type: 'image/jpeg' });
      form.append('api_key', signJson.api_key);
      form.append('timestamp', String(signJson.timestamp));
      form.append('signature', signJson.signature);
      form.append('folder', 'playlists/artwork');

      const uploadRes = await fetch(cloudUrl, { method: 'POST', body: form });
      const cloudJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(cloudJson.error?.message || 'Artwork upload failed');
      return { url: cloudJson.secure_url, publicId: cloudJson.public_id };
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
  const artwork = await uploadImage();
      
      // auto name if blank: Playlist #N using current playlist count if available
      let title;
      if (name && name.trim()) title = name.trim();
      else if (typeof playlistCount === 'number') title = `Playlist #${playlistCount + 1}`;
      else title = `Playlist #${Math.floor(Date.now() / 1000)}`;
      
      // use playlistSongs as the payload for songs
      const songIds = playlistSongs.length ? playlistSongs.map(s => s._id) : selected.map(s => s._id)
      const res = await fetch(API('api/playlists'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          title, 
          songs: songIds,
          artworkUrl: artwork ? artwork.url : undefined,
          artworkPublicId: artwork ? artwork.publicId : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to create playlist');
      const created = json.playlist || json; // backend returns { playlist }
      Alert.alert('Playlist created');
      // navigate to the created playlist detail
      if (created && created._id) {
        // reset form after navigation so the create screen is fresh when user returns
        router.push(`/Playlists/${created._id}`);
        resetForm();
      } else {
        // fallback to list
        resetForm();
        router.push('/Playlists');
      }
    } catch (e) {
      console.error('createPlaylist error', e);
      Alert.alert('Create failed', e.message || String(e));
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setImage(null);
    setSelected([]);
    setPlaylistSongs([]);
    setCreateModalVisible(false);
    // increment local playlist count so default names move forward
    setPlaylistCount((prev) => (typeof prev === 'number' ? prev + 1 : prev));
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
      // small shrink animation when removing
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 0.98, duration: 80, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start()
      setPlaylistSongs(playlistSongs.filter(s => String(s._id) !== String(song._id)))
      return
    }
    // simple bounce animation and add
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.05, duration: 80, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start()
    setPlaylistSongs([song, ...playlistSongs])
  }

  const renderSong = ({ item }) => {
    const added = playlistSongs.some(s => String(s._id) === String(item._id))
    // we keep the '+' icon always (per request); visual added state is subtle (background highlight)
    return (
      <Animated.View style={{ transform: [{ scale: added ? bounceAnim : 1 }], backgroundColor: 'transparent' }}>
        {/* make the song row transparent so the GradientBackground shows through */}
        <View style={[localStyles.songRow]}> 
          {item.artworkUrl ? (
            <Image source={{ uri: item.artworkUrl }} style={localStyles.songCover} />
          ) : (
            <View style={[localStyles.songCover, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cardBackground }]}>
              <Ionicons name="musical-notes" size={22} color={'rgba(255,255,255,0.85)'} />
            </View>
            )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[localStyles.songTitle, { color: COLORS.textPrimary }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[localStyles.songArtist, { color: COLORS.textSecondary }]} numberOfLines={1}>{item.artist}</Text>
          </View>
          <AddCircleButton isAdded={added} onPress={() => onAddSong(item)} size={36} />
        </View>
      </Animated.View>
    )
  }

  return (
    <GradientBackground variant="teal" bottomDark={true}>
      <View style={[localStyles.container, { backgroundColor: 'transparent' }]}> 
        <View style={localStyles.header}> 
          <TouchableOpacity onPress={() => router.back()} style={localStyles.backIcon}>
            <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={localStyles.headerInner}>
            <View style={localStyles.coverPlaceholder}>
              {image ? <Image source={{ uri: image.uri }} style={localStyles.coverImage} /> : <Ionicons name="musical-notes" size={56} color={'rgba(255,255,255,0.9)'} />}
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={[localStyles.playlistTitle, { color: COLORS.textPrimary }]}>{name && name.trim() ? name : `My playlist #${(playlistCount || 0) + 1}`}</Text>
              <Text style={[localStyles.creatorText, { color: COLORS.textSecondary }]}>{user?.name || 'You'}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'center', width: 140 }}>
            <TouchableOpacity style={[localStyles.addToBtn, { backgroundColor: COLORS.primary, marginTop: 100 }]} onPress={() => setCreateModalVisible(true)} disabled={creating}>
              <Ionicons name="add" size={18} color={COLORS.black} />
              <Text style={[localStyles.addToBtnText, { color: COLORS.black, marginLeft: 8 }]}>Create Playlist</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={localStyles.card}> 
          <Text style={[localStyles.sectionTitle, { color: COLORS.textPrimary }]}>Recommended Songs</Text>
          <Animated.FlatList
            data={recommended}
            keyExtractor={(i) => String(i._id)}
            renderItem={renderSong}
            contentContainerStyle={{ paddingBottom: 140 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
        {/* Create modal: edit name and upload poster before creating */}
        <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
          <View style={localStyles.modalOverlay}>
            <View style={localStyles.modalCard}>
              <Text style={localStyles.modalTitle}>Create playlist</Text>
              <TextInput placeholder="Playlist name" value={name} onChangeText={setName} placeholderTextColor={COLORS.textSecondary} style={localStyles.modalInput} />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <TouchableOpacity onPress={pickImage} style={localStyles.coverPicker}>
                  {image ? <Image source={{ uri: image.uri }} style={localStyles.coverPreview} /> : <Ionicons name="image-outline" size={28} color={COLORS.textSecondary} />}
                </TouchableOpacity>
                <Text style={{ marginLeft: 12, color: COLORS.textSecondary }}>Upload a cover (optional)</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }}>
                <Pressable onPress={() => setCreateModalVisible(false)} disabled={creating} style={localStyles.modalButton}>
                  <Text style={localStyles.modalButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={async () => { await createPlaylist(); }}
                  style={[localStyles.modalButton, { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }]}
                  disabled={creating || uploadingImage}
                >
                  {creating ? (
                    <ActivityIndicator color={COLORS.black} />
                  ) : (
                    <Text style={[localStyles.modalButtonText, { color: COLORS.black }]}>Create</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </GradientBackground>
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
  songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)', backgroundColor: 'transparent' },
  songCover: { width: 56, height: 56, borderRadius: 6, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  songTitle: { color: '#fff', fontWeight: '700' },
  songArtist: { color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  plusBtn: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  plusInner: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 72, backgroundColor: '#0b0b0b', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: -6 }, shadowRadius: 12 },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 }
  ,modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '88%', backgroundColor: COLORS.cardBackground, padding: 16, borderRadius: 12 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalInput: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8, color: COLORS.textPrimary },
  coverPicker: { width: 72, height: 72, borderRadius: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center' },
  coverPreview: { width: '100%', height: '100%', borderRadius: 8 },
  modalButton: { paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8, borderRadius: 8, backgroundColor: 'transparent' },
  modalButtonText: { color: COLORS.textPrimary }
})
