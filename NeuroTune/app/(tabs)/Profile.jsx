import { View, Text, TouchableOpacity, Alert, Image, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import React, { useEffect, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import COLORS from '../../constants/colors'
import styles from '../../assets/styles/profile.styles'
import { useAuthStore } from '../../store/authStore'
import { API_URL } from '../../constants/api'

export default function Profile() {
  const { logout, token, user } = useAuthStore()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    songs: 0,
    playlists: 0
  })
  const [uploadingImage, setUploadingImage] = useState(false)

  const fetchUserData = async () => {
    try {
      setLoading(true)
      // Correct endpoint: backend mounts user routes at /api/user
      const res = await fetch(`${API_URL}api/user/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        const text = await res.text();
        console.error('fetchUserData: non-OK response', res.status, text);
        return;
      }

      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.user) setUserData(data.user);
      } else {
        // Avoid trying to parse HTML or other non-JSON responses
        const text = await res.text();
        console.error('fetchUserData: expected JSON but received:', text.slice(0, 500));
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const pickAndUploadProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access photos is required to update your profile image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;
      const asset = result.assets && result.assets[0];
      if (!asset || !asset.uri) return;

      // upload
      setUploadingImage(true);
      const uri = asset.uri;
      const filename = uri.split('/').pop();
      const match = filename && filename.match(/\.(\w+)$/);
      const ext = match ? match[1] : 'jpg';
      const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      const formData = new FormData();
      formData.append('profileImage', {
        uri,
        name: filename || `profile.${ext}`,
        type: mimeType,
      });

      const res = await fetch(`${API_URL}api/user/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT set Content-Type; let fetch set the multipart boundary
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('profile image upload failed', res.status, text);
        Alert.alert('Upload failed', 'Failed to upload profile image');
        return;
      }

      // refresh local user data
      try {
        const refreshed = await useAuthStore.getState().fetchMe();
        if (refreshed) setUserData(refreshed);
      } catch (e) {
        // fallback to fetching our own copy
        await fetchUserData();
      }

      Alert.alert('Success', 'Profile image updated');
    } catch (e) {
      console.error('pickAndUploadProfileImage error', e);
      Alert.alert('Error', 'Failed to update profile image');
    } finally {
      setUploadingImage(false);
    }
  }

  const fetchUserStats = async () => {
    try {
      // Fetch user's songs
      const songsRes = await fetch(`${API_URL}api/songs?userId=${user._id}`)
      let songsCount = 0;
      if (songsRes.ok && (songsRes.headers.get('content-type') || '').includes('application/json')) {
        const songsData = await songsRes.json();
        songsCount = Array.isArray(songsData.songs) ? songsData.songs.length : (Array.isArray(songsData) ? songsData.length : 0);
      }

      // Fetch user's playlists
      const playlistsRes = await fetch(`${API_URL}api/playlists`)
      let playlistsCount = 0;
      if (playlistsRes.ok && (playlistsRes.headers.get('content-type') || '').includes('application/json')) {
        const playlistsData = await playlistsRes.json();
        const list = Array.isArray(playlistsData.playlists) ? playlistsData.playlists : (Array.isArray(playlistsData) ? playlistsData : []);
        playlistsCount = list.filter(p => String(p.user?._id || p.user) === String(user._id)).length;
      }

      setStats({ songs: songsCount, playlists: playlistsCount });
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchUserData(), fetchUserStats()])
    setRefreshing(false)
  }

  useEffect(() => {
    if (user && token) {
      fetchUserData()
      fetchUserStats()
    }
  }, [user, token])

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ])
  }

  if (loading && !userData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
      }
    >
      <LinearGradient
        colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.6)"]}
        style={styles.profileHeader}
      >
        <View style={styles.bannerContainer}>
          {userData?.bannerImage ? (
            <Image 
              source={{ uri: userData.bannerImage }} 
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[COLORS.cardBackground, COLORS.background]}
              style={styles.bannerImage}
            />
          )}
        </View>

        <View style={styles.profileInfo}>
          <View style={{ width: 100 }}>
            <Image 
              source={{ uri: userData?.profileImage || user?.profileImage }} 
              style={styles.profileImage}
            />
            <TouchableOpacity
              onPress={pickAndUploadProfileImage}
              style={{
                position: 'absolute',
                right: 4,
                bottom: 4,
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: 18,
                padding: 6,
              }}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="pencil" size={16} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{userData?.firstName} {userData?.lastName}</Text>
            <Text style={styles.username}>@{userData?.username || user?.username}</Text>
          </View>

          {userData?.bio && (
            <Text style={styles.bio}>{userData.bio}</Text>
          )}

          <View style={styles.statsContainer}>
            {userData?.location && (
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.locationText}>{userData.location}</Text>
              </View>
            )}
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.songs}</Text>
                <Text style={styles.statLabel}>Songs</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.playlists}</Text>
                <Text style={styles.statLabel}>Playlists</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
