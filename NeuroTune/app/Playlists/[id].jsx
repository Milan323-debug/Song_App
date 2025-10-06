import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { API_URL } from "../../constants/api";
import COLORS from "../../constants/colors";
import styles from "../../assets/styles/playlists.styles";
import usePlayerStore from "../../store/playerStore";

export default function PlaylistDetail() {
  const { id } = useLocalSearchParams();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { playTrack } = usePlayerStore((state) => ({
    playTrack: state.playTrack
  }));

  useEffect(() => {
    let isMounted = true;
    
    const fetchPlaylist = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}api/playlists/${id}`);
        const data = await res.json();
        
        if (isMounted) {
          if (data.error) {
            console.error("Error fetching playlist:", data.error);
            return;
          }
          setPlaylist(data.playlist || null);
        }
      } catch (error) {
        console.error("fetchPlaylist error:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPlaylist();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handlePlaySong = async (song, index) => {
    if (!song) return;
    try {
      // Pass the entire playlist songs array as the queue and current index
      await playTrack(song, playlist.songs || [], index);
    } catch (error) {
      console.error('Failed to play song:', error);
    }
  };

  if (loading || !playlist) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{playlist.title}</Text>
        <Text style={styles.subtitle}>{playlist.description}</Text>
        <Text style={styles.owner}>By {playlist.user?.username || 'Unknown'}</Text>
      </View>

      <FlatList
        data={playlist.songs || []}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.songRow} onPress={() => handlePlaySong(item, index)}>
            {item.artworkUrl ? (
              <Image source={{ uri: item.artworkUrl }} style={styles.songArtwork} />
            ) : (
              <View style={[styles.songArtwork, { backgroundColor: COLORS.cardBackground }]} />
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.songTitle}>{item.title}</Text>
              <Text style={styles.songSubtitle}>{item.artist}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}
