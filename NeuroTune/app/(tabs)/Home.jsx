import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Switch,
  Dimensions,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { usePlayerStore } from "../../store/playerStore";
import { API_URL } from "../../constants/api";
import COLORS from "../../constants/colors";
import { useAuthStore } from "../../store/authStore";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedGestureHandler,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { PanGestureHandler } from "react-native-gesture-handler";
import styles from "../../assets/styles/songs.styles";

const SONGS_BG = "#071019";
const SONGS_CARD = "#0f1724";
const SONGS_BORDER = "#15202b";
const SONGS_TEXT = "#E6F7F2";
const SONGS_TEXT_LIGHT = "#9AA6B2";
const ACCENT = COLORS.primary || "#22c1a9";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function Songs() {
  const { token } = useAuthStore();
  const currentUser = useAuthStore((s) => s.user);

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [pickedFile, setPickedFile] = useState(null);
  const [pickedArtwork, setPickedArtwork] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [optionsForSong, setOptionsForSong] = useState(null);

  const playerCurrent = usePlayerStore((s) => s.current);
  const playerIsPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const stopPlayer = usePlayerStore((s) => s.stop);
  const shuffleOn = usePlayerStore((s) => s.shuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const setShuffle = usePlayerStore((s) => s.setShuffle);
  const setRepeatMode = usePlayerStore((s) => s.setRepeatMode);

  // shared values retained for future gestures, but UI collapse will use measured React state
  const translateY = useSharedValue(0);
  const listTranslate = useSharedValue(0);
  const uploadH = useSharedValue(220);
  const uploadBtnH = useSharedValue(56);
  const uploadContentH = useSharedValue(0);
  const [uploadHeightPx, setUploadHeightPx] = useState(220);
  const [uploadBtnHeightPx, setUploadBtnHeightPx] = useState(56);
  // How many pixels to preserve visible at the top when collapsed
  const COLLAPSE_SAFE_INSET = 48;
  const maxTranslate = () => {
    const diff = uploadH.value - uploadBtnH.value;
    const raw = Number.isFinite(diff) ? diff : 200;
    // Reduce by a safe inset so the upload card doesn't move completely off-screen
    const allowed = raw - COLLAPSE_SAFE_INSET;
    return Math.max(0, allowed);
  };
  const [measured, setMeasured] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showPlayerSettings, setShowPlayerSettings] = useState(false);

  const toggleCollapse = () => {
    const max = maxTranslate();
    if (!collapsed) {
      translateY.value = -max;
      listTranslate.value = max;
      setCollapsed(true);
    } else {
      translateY.value = 0;
      listTranslate.value = 0;
      setCollapsed(false);
    }
  };

  // track list scroll so we only intercept gestures when the list is at the top
  const scrollY = useSharedValue(1);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (ev) => {
      scrollY.value = ev.contentOffset.y;
    },
  });

  // gesture handling removed for simplicity; collapse will be height-based so list remains stable

  useEffect(() => {
    fetchSongs();
    return () => {};
  }, []);

  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Permission to access photos is required to select artwork"
        );
      }
    })();
  }, []);

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/songs`);
      const json = await res.json();
      setSongs(json.songs || []);
    } catch (e) {
      console.warn("fetchSongs", e);
      Alert.alert("Error", "Failed to load songs");
    } finally {
      setLoading(false);
    }
  };

  const pickFile = async () => {
    try {
      const pickerType = Platform.OS === "ios" ? "public.audio" : "audio/*";
      const res = await DocumentPicker.getDocumentAsync({
        type: pickerType,
        copyToCacheDirectory: true,
      });

      if (res && Array.isArray(res.assets) && res.canceled === false) {
        const asset = res.assets[0];
        setPickedFile({
          uri: asset.uri,
          name: asset.name || asset.uri.split("/").pop(),
          size: asset.size,
          mimeType: asset.mimeType,
          raw: res,
        });
      } else if (res && res.type === "success") {
        setPickedFile({
          uri: res.uri,
          name: res.name || res.uri.split("/").pop(),
          size: res.size,
          mimeType: res.mimeType,
          raw: res,
        });
      } else {
        Alert.alert("Selection cancelled", "No file was selected");
      }
    } catch (e) {
      console.warn("pickFile", e);
    }
  };

  const pickArtwork = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });
      if (!res || res.canceled) return;

      let asset = Array.isArray(res.assets) ? res.assets[0] : res;
      setPickedArtwork({
        uri: asset.uri,
        name: asset.fileName || asset.uri.split("/").pop(),
        width: asset.width,
        height: asset.height,
        raw: res,
      });
    } catch (e) {
      console.warn("pickArtwork", e);
    }
  };

  const uploadToCloudinary = async (file) => {
    const signRes = await fetch(`${API_URL}/api/songs/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ folder: "songs", resource_type: "raw" }),
    });
    if (!signRes.ok) throw new Error("Failed to get upload signature");
    const signJson = await signRes.json();

    const cloudUrl = `https://api.cloudinary.com/v1_1/${signJson.cloud_name}/raw/upload`;
    const form = new FormData();
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "audio/mpeg",
    });
    form.append("api_key", signJson.api_key);
    form.append("timestamp", String(signJson.timestamp));
    form.append("signature", signJson.signature);
    form.append("resource_type", "raw");
    form.append("folder", "songs");

    const uploadRes = await fetch(cloudUrl, { method: "POST", body: form });
    const cloudJson = await uploadRes.json();
    if (!uploadRes.ok)
      throw new Error(cloudJson.error?.message || "Cloud upload failed");
    return cloudJson;
  };

  const uploadArtworkToCloudinary = async (image) => {
    const signRes = await fetch(`${API_URL}/api/songs/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ folder: "songs/artwork", resource_type: "image" }),
    });
    if (!signRes.ok) throw new Error("Failed to get upload signature");
    const signJson = await signRes.json();

    const cloudUrl = `https://api.cloudinary.com/v1_1/${signJson.cloud_name}/image/upload`;
    const form = new FormData();
    form.append("file", { uri: image.uri, name: image.name, type: "image/jpeg" });
    form.append("api_key", signJson.api_key);
    form.append("timestamp", String(signJson.timestamp));
    form.append("signature", signJson.signature);
    form.append("folder", "songs/artwork");

    const uploadRes = await fetch(cloudUrl, { method: "POST", body: form });
    const cloudJson = await uploadRes.json();
    if (!uploadRes.ok)
      throw new Error(cloudJson.error?.message || "Artwork upload failed");
    return cloudJson;
  };

  const handleUpload = async () => {
    if (!token) return Alert.alert("Not signed in");
    if (!pickedFile) return Alert.alert("Select a file first");
    if (!title.trim()) return Alert.alert("Title required");

    setUploading(true);
    try {
      let artworkJson = null;
      if (pickedArtwork) {
        artworkJson = await uploadArtworkToCloudinary(pickedArtwork);
      }

      const cloudJson = await uploadToCloudinary(pickedFile);

      const createRes = await fetch(`${API_URL}/api/songs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
          url: cloudJson.secure_url,
          publicId: cloudJson.public_id,
          mimeType: cloudJson.resource_type || pickedFile.mimeType,
          size: cloudJson.bytes || pickedFile.size || 0,
          artworkUrl: artworkJson ? artworkJson.secure_url : undefined,
          artworkPublicId: artworkJson ? artworkJson.public_id : undefined,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson.error || "Failed to save song");

      setSongs((s) => [createJson.song, ...s]);
      setTitle("");
      setArtist("");
      setPickedFile(null);
      setPickedArtwork(null);
      Alert.alert("Success", "Song uploaded");
    } catch (e) {
      console.error("upload error", e);
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  // When collapsed: first press should expand the upload card.
  // When expanded: pressing again performs the actual upload.
  const handleUploadPress = async () => {
    if (collapsed) {
      // expand first
      setCollapsed(false);
      // give layout a tick to measure if needed
      return;
    }
    // already expanded - proceed with upload
    await handleUpload();
  };

  const playSong = async (song, index) => {
    try {
      await playTrack(song, songs, index);
    } catch (e) {
      console.warn("playSong", e);
      Alert.alert("Playback error", "Could not play this song");
    }
  };

  const stopPlayback = async () => {
    try {
      await stopPlayer();
    } catch (e) {
      console.warn("stopPlayback", e);
    }
  };

  const showSongOptions = (item) => {
    setOptionsForSong(item);
  };

  const confirmDeleteSong = (item) => {
    Alert.alert("Are you sure?", "Are you sure you want to delete the song?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/api/songs/${item._id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Delete failed");
            setSongs((s) => s.filter((x) => x._id !== item._id));
            setOptionsForSong(null);
          } catch (e) {
            console.warn("delete song failed", e);
            Alert.alert("Delete failed", e.message);
          }
        },
      },
    ]);
  };

  const repeatSongOption = async (item) => {
    try {
      setRepeatMode("one");
      await playTrack(
        item,
        songs,
        songs.findIndex((s) => String(s._id) === String(item._id))
      );
      setOptionsForSong(null);
      Alert.alert("Repeat enabled", "This song will repeat");
    } catch (e) {
      console.warn("repeat song failed", e);
      Alert.alert("Failed", "Could not set repeat");
    }
  };

  const renderItem = ({ item, index }) => {
    const isCurrent = playerCurrent && String(playerCurrent._id) === String(item._id);
    const playing = isCurrent && playerIsPlaying;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => {
          if (playing) stopPlayback();
          else playSong(item, index);
        }}
      >
        {item.artworkUrl ? (
          <Image source={{ uri: item.artworkUrl }} style={styles.cardArt} />
        ) : (
          <View style={styles.cardArtPlaceholder} />
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.songTitle}>{item.title}</Text>
          <Text style={styles.songArtist}>{item.artist || item.user?.username || ""}</Text>
        </View>
        {currentUser && item.user && String(item.user._id) === String(currentUser._id) && (
          <TouchableOpacity style={styles.optionsBtn} onPress={() => showSongOptions(item)}>
            <Text style={styles.optionsText}>⋮</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };
  // compute collapsed style so header and upload button remain visible when collapsed
  const minCollapsed = Math.max(uploadBtnHeightPx + 48, 140); // ensure visible area
  const collapsedStyle = collapsed ? { height: minCollapsed, overflow: 'hidden' } : null;

  if (loading) {
    return (
      <LinearGradient colors={["#071019", "#0f1724"]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={ACCENT} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#071019", "#0f1724"]} style={{ flex: 1 }}>
      <Animated.View style={[{ flex: 1 }]}>
        <Animated.FlatList
          data={songs}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingTop: 20 }}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        />
      </Animated.View>

      {/* Options modal for each song (Repeat / Delete) */}
      <Modal
        visible={!!optionsForSong}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsForSong(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: SONGS_CARD, borderRadius: 12, padding: 12 }}>
            <Text style={{ color: SONGS_TEXT, fontWeight: '700', marginBottom: 8 }}>Song options</Text>
            <Text style={{ color: SONGS_TEXT_LIGHT, marginBottom: 2 ,justifyContent: 'center', textAlign: 'center',fontSize: 16}}>{optionsForSong?.title}</Text>

            <TouchableOpacity
              style={{ padding: 10, borderRadius: 8, marginBottom: 3, backgroundColor: 'transparent' }}
              onPress={() => {
                repeatSongOption(optionsForSong);
              }}
            >
              <Text style={{ color: ACCENT, fontWeight: '600' }}>Repeat this song</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ padding: 12, borderRadius: 8, marginBottom: 8, backgroundColor: 'transparent' }}
              onPress={() => {
                // ask for confirmation inside confirmDeleteSong
                confirmDeleteSong(optionsForSong);
              }}
            >
              <Text style={{ color: '#ff6b6b', fontWeight: '600' }}>Delete song</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ padding: 12, borderRadius: 8, marginTop: 6, alignItems: 'center' }}
              onPress={() => setOptionsForSong(null)}
            >
              <Text style={{ color: SONGS_TEXT_LIGHT, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// styles are loaded from assets/styles/songs.styles.js
