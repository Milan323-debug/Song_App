import { View, Text, TouchableOpacity, Alert, Image, ScrollView, ActivityIndicator, RefreshControl, FlatList } from 'react-native'
import React, { useEffect, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import Reanimated, { FadeIn } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import COLORS from '../../constants/colors'
import styles from '../../assets/styles/profile.styles'
import { useAuthStore } from '../../store/authStore'
import { API_URL, API } from '../../constants/api'
import { DEFAULT_ARTWORK_URL, DEFAULT_PROFILE_IMAGE } from '../../constants/artwork'

export default function Profile() {
  const { logout, token, user } = useAuthStore()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    songs: 0,
    playlists: 0
  })
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [recentSongs, setRecentSongs] = useState([])
  const router = useRouter()
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
      // set followers/following if available on userData
      if (userData) {
        setFollowers(userData.followers?.length || userData.followersCount || 0)
        setFollowing(userData.following?.length || userData.followingCount || 0)
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const fetchRecentSongs = async () => {
    try {
      // try username-based endpoint first
      const endpoint = `${API_URL}api/songs/user/${encodeURIComponent(user.username || user._id)}`
      const res = await fetch(endpoint, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) return
      const json = await res.json()
      const list = Array.isArray(json.songs) ? json.songs : (Array.isArray(json) ? json : [])
      setRecentSongs(list.slice(0, 8))
    } catch (e) { console.warn('fetchRecentSongs', e) }
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
      fetchRecentSongs()
    }
  }, [user, token])

  // (no glow animation) static avatar wrapper

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
        colors={["rgba(30, 166, 197, 0.9)", "rgba(6, 59, 59, 0.6)"]}
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

        <View style={[styles.profileInfo, styles.headerRow]}>
          <View style={styles.headerLeft}>
            <View style={styles.profileImageWrap}>
              <Image 
                source={(userData?.profileImage || user?.profileImage) ? { uri: userData?.profileImage || user?.profileImage } : DEFAULT_PROFILE_IMAGE } 
                style={styles.profileImage}
              />

              <TouchableOpacity
                onPress={pickAndUploadProfileImage}
                style={styles.editButton}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="pencil" size={16} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerRight} paddingRight={8}>
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
              <View style={styles.statsRow}>
                <TouchableOpacity style={styles.statCard} onPress={() => Alert.alert('Followers', `${followers} followers`)}>
                  <Ionicons name="people" size={20} color={COLORS.primary} />
                  <Text style={styles.statValue}>{followers}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statCard} onPress={() => Alert.alert('Following', `${following} following`)}>
                  <Ionicons name="person-add" size={20} color={COLORS.primary} />
                  <Text style={styles.statValue}>{following}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/Playlists/UserSongs')}>
                  <Ionicons name="musical-notes" size={20} color={COLORS.primary} />
                  <Text style={styles.statValue}>{stats.songs}</Text>
                  <Text style={styles.statLabel}>Songs</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statCard} onPress={() => router.push('/Playlists')}>
                  <Ionicons name="albums" size={20} color={COLORS.primary} />
                  <Text style={styles.statValue}>{stats.playlists}</Text>
                  <Text style={styles.statLabel}>Playlists</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

    <View style={{ paddingHorizontal: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <TouchableOpacity style={[styles.addButton, { flex: 1, marginRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={() => router.push('/EditProfile')}>
            <Ionicons name="create-outline" size={16} color={COLORS.black} />
            <Text style={[styles.addButtonText, { marginLeft: 8 }]}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: 'rgba(29, 30, 30, 1)', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={() => router.push('/Settings')}>
            <Ionicons name="settings-outline" size={16} color={COLORS.textPrimary} />
            <Text style={[styles.addButtonText, { color: COLORS.textPrimary, marginLeft: 8 }]}>Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Recent uploads</Text>
          {recentSongs && recentSongs.length > 0 ? (
            <FlatList
              data={recentSongs}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(i) => i._id}
              renderItem={({ item, index }) => (
                <Reanimated.View entering={FadeIn.delay(index * 80).duration(400)} style={{ marginRight: 12 }}>
                  {/* Presentational card only: removed navigation link so it's not clickable */}
                  <View>
                    <View style={styles.recentCard}>
                      <Image source={{ uri: item.artworkUrl || DEFAULT_ARTWORK_URL }} style={{ width: '100%', height: '100%' }} />
                    </View>
                    <Text numberOfLines={1} style={{ color: COLORS.textPrimary, marginTop: 8, width: 120 }}>{item.title}</Text>
                    <Text numberOfLines={1} style={{ color: COLORS.textSecondary, fontSize: 12, width: 120 }}>{item.artist || ''}</Text>
                  </View>
                </Reanimated.View>
              )}
            />
          ) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textSecondary }}>No recent uploads</Text>
              </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
