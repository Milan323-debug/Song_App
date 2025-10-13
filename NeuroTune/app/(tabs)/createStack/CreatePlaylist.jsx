import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, StyleSheet } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import COLORS from "../../../constants/colors";
import styles from "../../../assets/styles/create.styles";
import playlistStyles from "../../../assets/styles/playlists.styles";
import { API_URL, API } from "../../../constants/api";
import { useAuthStore } from "../../../store/authStore";
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

  if (loading) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <LinearGradient colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.6)"]} style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={pickImage}
            style={{
              width: 120,
              height: 120,
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.03)',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
            }}
          >
            {image ? (
              <Image 
                source={{ uri: image.uri }} 
                style={{ width: '100%', height: '100%' }} 
                resizeMode="cover"
              />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="image-outline" size={40} color={COLORS.primary} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 4 }}>Add Cover</Text>
              </View>
            )}
            {uploadingImage && (
              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            )}
          </TouchableOpacity>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <TextInput
              style={{ 
                color: COLORS.textPrimary, 
                fontSize: 24, 
                fontWeight: '800',
                padding: 0
              }}
              placeholder="New Playlist"
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
            />
            <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>Create a playlist by adding songs</Text>
          </View>
        </View>
      </LinearGradient>
      <View style={[styles.card, { margin: 12, marginTop: 0 }] }>
        <Text style={styles.title}>Add Songs</Text>
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
              <TouchableOpacity 
                onPress={() => toggleSelect(item)} 
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: selected.some((s) => String(s._id) === String(item._id)) 
                    ? `${COLORS.primary}20`
                    : 'rgba(255,255,255,0.05)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 8
                }}
              >
                <Ionicons 
                  name={selected.some((s) => String(s._id) === String(item._id)) 
                    ? "checkmark" 
                    : "add"
                  } 
                  size={24} 
                  color={selected.some((s) => String(s._id) === String(item._id)) 
                    ? COLORS.primary 
                    : COLORS.textSecondary
                  } 
                />
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
