import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import styles from "../../assets/styles/create.styles";
import COLORS from "../../constants/colors";
import { useRouter } from "expo-router";
import { Modal } from "react-native";
import { useUiStore } from "../../store/uiStore";

export default function Create() {
  const { token } = useAuthStore();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [pickedFile, setPickedFile] = useState(null);
  const [pickedArtwork, setPickedArtwork] = useState(null);
  const [uploading, setUploading] = useState(false);
  const chooserVisible = useUiStore((s) => s.chooserVisible);
  const setChooserVisible = useUiStore((s) => s.setChooserVisible);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Permission to access photos is required to select artwork"
        );
      }
    })();
  }, []);

  const pickFile = async () => {
    try {
      const pickerType = Platform.OS === "ios" ? "public.audio" : "audio/*";
      const res = await DocumentPicker.getDocumentAsync({ type: pickerType, copyToCacheDirectory: true });
      if (res && Array.isArray(res.assets) && res.canceled === false) {
        const asset = res.assets[0];
        setPickedFile({ uri: asset.uri, name: asset.name || asset.uri.split("/").pop(), size: asset.size, mimeType: asset.mimeType, raw: res });
      } else if (res && res.type === "success") {
        setPickedFile({ uri: res.uri, name: res.name || res.uri.split("/").pop(), size: res.size, mimeType: res.mimeType, raw: res });
      }
    } catch (e) {
      console.warn("pickFile", e);
      Alert.alert("File error", "Could not pick file");
    }
  };

  const pickArtwork = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: false });
      if (!res || res.canceled) return;
      let asset = Array.isArray(res.assets) ? res.assets[0] : res;
      setPickedArtwork({ uri: asset.uri, name: asset.fileName || asset.uri.split("/").pop(), width: asset.width, height: asset.height, raw: res });
    } catch (e) {
      console.warn("pickArtwork", e);
      Alert.alert("Artwork error", "Could not pick artwork");
    }
  };

  const uploadToCloudinary = async (file) => {
    const signRes = await fetch(`${API_URL}/api/songs/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ folder: "songs", resource_type: "raw" }),
    });
    if (!signRes.ok) throw new Error("Failed to get upload signature");
    const signJson = await signRes.json();

    const cloudUrl = `https://api.cloudinary.com/v1_1/${signJson.cloud_name}/raw/upload`;
    const form = new FormData();
    form.append("file", { uri: file.uri, name: file.name, type: file.mimeType || "audio/mpeg" });
    form.append("api_key", signJson.api_key);
    form.append("timestamp", String(signJson.timestamp));
    form.append("signature", signJson.signature);
    form.append("resource_type", "raw");
    form.append("folder", "songs");

    const uploadRes = await fetch(cloudUrl, { method: "POST", body: form });
    const cloudJson = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(cloudJson.error?.message || "Cloud upload failed");
    return cloudJson;
  };

  const uploadArtworkToCloudinary = async (image) => {
    const signRes = await fetch(`${API_URL}/api/songs/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    if (!uploadRes.ok) throw new Error(cloudJson.error?.message || "Artwork upload failed");
    return cloudJson;
  };

  const handleUpload = async () => {
    if (!token) return Alert.alert("Not signed in");
    if (!pickedFile) return Alert.alert("Select a file first");
    if (!title.trim()) return Alert.alert("Title required");

    setUploading(true);
    try {
      let artworkJson = null;
      if (pickedArtwork) artworkJson = await uploadArtworkToCloudinary(pickedArtwork);

      const cloudJson = await uploadToCloudinary(pickedFile);

      const createRes = await fetch(`${API_URL}/api/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

      setTitle("");
      setArtist("");
      setPickedFile(null);
      setPickedArtwork(null);
      Alert.alert("Success", "Song created");
    } catch (e) {
      console.error("create upload error", e);
      Alert.alert("Upload failed", e.message || String(e));
    } finally {
      setUploading(false);
    }
  };

  // Playlist creation flow: show chooser modal
  const openChooser = () => setChooserVisible(true);

  const onChooseSong = () => {
    setChooserVisible(false);
    // open existing song upload UI (this screen already is that)
  };

  const onChoosePlaylist = async () => {
    setChooserVisible(false);
    // Generate default sequential name if user doesn't provide one on next screen
    // We'll navigate to CreatePlaylist screen which will prompt the user for a name
    router.push("/CreatePlaylist");
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create a Song</Text>
        <Text style={styles.subtitle}>Upload an audio file and optional artwork</Text>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Title</Text>
          <View style={styles.inputContainer}>
            <TextInput placeholder="Song title" value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor={COLORS.textSecondary} />
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Artist</Text>
          <View style={styles.inputContainer}>
            <TextInput placeholder="Artist" value={artist} onChangeText={setArtist} style={styles.input} placeholderTextColor={COLORS.textSecondary} />
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Audio file</Text>
          <TouchableOpacity style={styles.button} onPress={pickFile} disabled={uploading}>
            {pickedFile ? <Text style={styles.buttonText}>Selected: {pickedFile.name}</Text> : <Text style={styles.buttonText}>Choose audio file</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Artwork (optional)</Text>
          <TouchableOpacity style={[styles.imagePicker, { justifyContent: 'center', alignItems: 'center' }]} onPress={pickArtwork} disabled={uploading}>
            {pickedArtwork ? <Image source={{ uri: pickedArtwork.uri }} style={styles.previewImage} /> : <Text style={styles.placeholderText}>Tap to select cover image</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleUpload} disabled={uploading}>
          {uploading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Create</Text>}
        </TouchableOpacity>
        {/* removed duplicate create button; the tab bar Create button now opens the chooser modal */}
      </View>
    </View>
  );
}