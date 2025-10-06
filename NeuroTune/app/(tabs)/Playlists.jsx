import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import COLORS from "../../constants/colors";
import styles from "../../assets/styles/playlists.styles";

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}api/playlists`);
      const data = await res.json();
      // backend returns { playlists }
      if (data && Array.isArray(data.playlists)) setPlaylists(data.playlists);
      else if (Array.isArray(data)) setPlaylists(data);
    } catch (error) {
      console.error("fetchPlaylists error", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/Playlists/${item._id}`)}>
        <View style={styles.cardLeft}>
          {item.songs && item.songs[0] && item.songs[0].artworkUrl ? (
            <Image source={{ uri: item.songs[0].artworkUrl }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, { backgroundColor: COLORS.cardBackground }]} />
          )}
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.description || `${item.songs?.length || 0} songs`}</Text>
          <Text style={styles.owner}>By {item.user?.username || 'Unknown'}</Text>
        </View>
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
      <FlatList
        data={playlists}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={() => (
          <View style={{ padding: 24 }}>
            <Text style={{ color: COLORS.textSecondary }}>No playlists yet. Create one from the Create tab.</Text>
          </View>
        )}
      />
      <TouchableOpacity
        onPress={() => router.push('/Create')}
        style={{ position: 'absolute', right: 18, bottom: 88, backgroundColor: COLORS.primary, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: COLORS.white, fontSize: 28 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
