import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { DEFAULT_PROFILE_IMAGE } from '../constants/artwork'
import COLORS from '../constants/colors'
import { useAuthStore } from '../store/authStore'
import { API_URL } from '../constants/api'

const { width } = Dimensions.get('window')

export default function EditProfile() {
  const { user, token, fetchMe } = useAuthStore()
  const router = useRouter()

  const [form, setForm] = useState({ firstName: '', lastName: '', bio: '', location: '' })
  const [profileImage, setProfileImage] = useState(null)
  const [bannerImage, setBannerImage] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        location: user.location || '',
      })
      setProfileImage(user.profileImage || null)
      setBannerImage(user.bannerImage || null)
    }
  }, [user])

  const pickImage = async (setter) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access photos is required.')
        return
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })

      if (res.canceled) return
      const asset = res.assets && res.assets[0]
      if (!asset) return
      setter(asset.uri)
    } catch (e) {
      console.error('pickImage', e)
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const uploadImageToCloudinary = async (uri, folder) => {
    if (!uri) return null
    if (uri.startsWith('http://') || uri.startsWith('https://')) return uri

    const signRes = await fetch(`${API_URL}api/songs/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ folder, resource_type: 'image' }),
    })
    if (!signRes.ok) throw new Error('Failed to get upload signature')
    const signJson = await signRes.json()

    const cloudUrl = `https://api.cloudinary.com/v1_1/${signJson.cloud_name}/image/upload`
    const uploadForm = new FormData()

    const parts = uri.split('/')
    const filename = parts[parts.length - 1]
    const match = filename.match(/\.([a-zA-Z0-9]+)$/)
    const ext = match ? match[1].toLowerCase() : 'jpg'
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`

    uploadForm.append('file', { uri, name: filename, type: mime })
    uploadForm.append('api_key', signJson.api_key)
    uploadForm.append('timestamp', String(signJson.timestamp))
    uploadForm.append('signature', signJson.signature)
    if (signJson.folder) uploadForm.append('folder', signJson.folder)
    if (signJson.resource_type) uploadForm.append('resource_type', signJson.resource_type)

    const uploadRes = await fetch(cloudUrl, { method: 'POST', body: uploadForm })
    const cloudJson = await uploadRes.json()
    if (!uploadRes.ok) throw new Error(cloudJson.error?.message || 'Cloud upload failed')
    return cloudJson.secure_url || cloudJson.url
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const updates = {
        firstName: form.firstName || '',
        lastName: form.lastName || '',
        bio: form.bio || '',
        location: form.location || '',
      }

      let finalProfileUrl = profileImage
      let finalBannerUrl = bannerImage

      const isLocalProfile = profileImage && (profileImage.startsWith('file:') || profileImage.includes('/'))
      const isLocalBanner = bannerImage && (bannerImage.startsWith('file:') || bannerImage.includes('/'))

      if (isLocalProfile) {
        try {
          finalProfileUrl = await uploadImageToCloudinary(profileImage, 'profiles')
        } catch (e) {
          console.warn('Profile upload failed, will attempt multipart upload', e)
          finalProfileUrl = null
        }
      }

      if (isLocalBanner) {
        try {
          finalBannerUrl = await uploadImageToCloudinary(bannerImage, 'banners')
        } catch (e) {
          console.warn('Banner upload failed, will attempt multipart upload', e)
          finalBannerUrl = null
        }
      }

      let res
      const needMultipart = (isLocalProfile && !finalProfileUrl) || (isLocalBanner && !finalBannerUrl)

      if (!needMultipart) {
        if (finalProfileUrl && (finalProfileUrl.startsWith('http://') || finalProfileUrl.startsWith('https://'))) updates.profileImage = finalProfileUrl
        if (finalBannerUrl && (finalBannerUrl.startsWith('http://') || finalBannerUrl.startsWith('https://'))) updates.bannerImage = finalBannerUrl

        res = await fetch(`${API_URL}api/user/profile`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
      } else {
        const multipart = new FormData()
        multipart.append('firstName', updates.firstName)
        multipart.append('lastName', updates.lastName)
        multipart.append('bio', updates.bio)
        multipart.append('location', updates.location)

        if (isLocalProfile) {
          const parts = profileImage.split('/')
          const filename = parts[parts.length - 1]
          multipart.append('profileImage', { uri: profileImage, name: filename, type: 'image/jpeg' })
        }
        if (isLocalBanner) {
          const parts = bannerImage.split('/')
          const filename = parts[parts.length - 1]
          multipart.append('bannerImage', { uri: bannerImage, name: filename, type: 'image/jpeg' })
        }

        res = await fetch(`${API_URL}api/user/profile`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: multipart,
        })
      }

      if (!res || !res.ok) {
        const txt = res ? await res.text().catch(() => '') : ''
        console.error('EditProfile failed', res && res.status, txt)
        Alert.alert('Save failed', 'Failed to update profile')
        return
      }

      try {
        await fetchMe()
      } catch (e) {
        // ignore
      }

      Alert.alert('Saved', 'Profile updated')
      router.back()
    } catch (e) {
      console.error('handleSave error', e)
      Alert.alert('Error', 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  const isSaveDisabled = loading || (!form.firstName.trim() && !form.lastName.trim())

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.bannerContainer}>
          {bannerImage ? (
            <Image source={{ uri: bannerImage }} style={styles.banner} />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Ionicons name="image" size={28} color="#999" />
              <Text style={styles.bannerPlaceholderText}>Add a banner</Text>
            </View>
          )}

          <TouchableOpacity style={styles.bannerEdit} onPress={() => pickImage(setBannerImage)} accessibilityLabel="Edit banner">
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>

          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                <Image source={DEFAULT_PROFILE_IMAGE} style={styles.avatar} />
              )}

              <TouchableOpacity style={styles.avatarEdit} onPress={() => pickImage(setProfileImage)} accessibilityLabel="Edit profile image">
                <Ionicons name="camera" size={14} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.nameCol}>
              <Text style={styles.nameText}>{(form.firstName || 'First') + ' ' + (form.lastName || 'Last')}</Text>
              <Text style={styles.subText}>{form.location || 'Location'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            value={form.firstName}
            onChangeText={(t) => setForm((s) => ({ ...s, firstName: t }))}
            style={styles.input}
            placeholder="First name"
            placeholderTextColor="#9AA0A6"
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Last name</Text>
          <TextInput
            value={form.lastName}
            onChangeText={(t) => setForm((s) => ({ ...s, lastName: t }))}
            style={styles.input}
            placeholder="Last name"
            placeholderTextColor="#9AA0A6"
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Bio</Text>
            <Text style={styles.charCount}>{(form.bio || '').length}/200</Text>
          </View>
          <TextInput
            value={form.bio}
            onChangeText={(t) => setForm((s) => ({ ...s, bio: t }))}
            multiline
            numberOfLines={3}
            style={[styles.input, styles.multiline]}
            placeholder="Tell something about yourself"
            placeholderTextColor="#9AA0A6"
            maxLength={200}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            value={form.location}
            onChangeText={(t) => setForm((s) => ({ ...s, location: t }))}
            style={styles.input}
            placeholder="City, Country"
            placeholderTextColor="#9AA0A6"
            returnKeyType="done"
          />
        </View>

        <TouchableOpacity onPress={handleSave} style={[styles.saveButton, isSaveDisabled ? styles.saveDisabled : null]} disabled={isSaveDisabled} accessibilityRole="button">
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>Save changes</Text>}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  bannerContainer: {
    marginBottom: 16,
  },
  banner: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  bannerPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerPlaceholderText: {
    color: '#999',
    marginTop: 6,
  },
  bannerEdit: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -28,
  },
  avatarWrap: {
    marginLeft: 6,
    width: 96,
    height: 96,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEdit: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: COLORS.primary || '#1a73e8',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  nameCol: {
    marginLeft: 12,
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subText: {
    marginTop: 4,
    color: COLORS.textSecondary,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.cardBackground,
    padding: 12,
    borderRadius: 10,
    color: COLORS.textPrimary,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    color: '#9AA0A6',
    fontSize: 12,
  },
  saveButton: {
    marginTop: 6,
    backgroundColor: COLORS.primary || '#1a73e8',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: COLORS.black,
    fontWeight: '700',
  },
})