import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import COLORS from '../constants/colors'
import styles from '../assets/styles/profile.styles'
import { useAuthStore } from '../store/authStore'
import { API_URL } from '../constants/api'

export default function EditProfile() {
  const { user, token, fetchMe } = useAuthStore()
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', bio: '', location: '' })
  const [profileImage, setProfileImage] = useState(null)
  const [bannerImage, setBannerImage] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({ firstName: user.firstName || '', lastName: user.lastName || '', bio: user.bio || '', location: user.location || '' })
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

      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 })
      if (res.canceled) return
      const asset = res.assets && res.assets[0]
      if (!asset) return
      setter(asset.uri)
    } catch (e) {
      console.error('pickImage', e)
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  // We will upload images using multipart/form-data to the backend endpoint

  const handleSave = async () => {
    setLoading(true)
    try {
      // Prepare updates object to send as JSON. Upload images directly to Cloudinary first (signed upload)
      const updates = { firstName: form.firstName || '', lastName: form.lastName || '', bio: form.bio || '', location: form.location || '' }

      // helper to sign and upload an image to Cloudinary
      const uploadImageToCloudinary = async (uri, folder) => {
        if (!uri) return null
        // if it's already a URL (starts with http), return as-is
        if (uri.startsWith('http://') || uri.startsWith('https://')) return uri

        // ask server for a signature
        const signRes = await fetch(`${API_URL}api/songs/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ folder, resource_type: 'image' })
        })
        if (!signRes.ok) throw new Error('Failed to get upload signature')
        const signJson = await signRes.json()

  const cloudUrl = `https://api.cloudinary.com/v1_1/${signJson.cloud_name}/image/upload`
  const form = new FormData()
  // name and type
  const parts = uri.split('/')
  const filename = parts[parts.length - 1]
  const match = filename.match(/\.([a-zA-Z0-9]+)$/)
  const ext = match ? match[1].toLowerCase() : 'jpg'
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
  form.append('file', { uri, name: filename, type: mime })
  // include only the api key / timestamp / signature provided by the server
  // (append only the fields that were part of the string-to-sign on the server)
  form.append('api_key', signJson.api_key)
  form.append('timestamp', String(signJson.timestamp))
  form.append('signature', signJson.signature)
  // If the signer echoed a folder or resource_type, include them so the upload parameters match the signed string
  if (signJson.folder) form.append('folder', signJson.folder)
  if (signJson.resource_type) form.append('resource_type', signJson.resource_type)

        const uploadRes = await fetch(cloudUrl, { method: 'POST', body: form })
        const cloudJson = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(cloudJson.error?.message || 'Cloud upload failed')
        return cloudJson.secure_url || cloudJson.url
      }

      // Decide whether to send multipart/form-data (if local files selected) or JSON
      const isLocalProfile = profileImage && (profileImage.startsWith('file:') || profileImage.includes('/'))
      const isLocalBanner = bannerImage && (bannerImage.startsWith('file:') || bannerImage.includes('/'))

      let res
      if (isLocalProfile || isLocalBanner) {
        const form = new FormData()
        form.append('firstName', updates.firstName)
        form.append('lastName', updates.lastName)
        form.append('bio', updates.bio)
        form.append('location', updates.location)
        if (isLocalProfile) {
          const parts = profileImage.split('/')
          const filename = parts[parts.length - 1]
          form.append('profileImage', { uri: profileImage, name: filename, type: 'image/jpeg' })
        }
        if (isLocalBanner) {
          const parts = bannerImage.split('/')
          const filename = parts[parts.length - 1]
          form.append('bannerImage', { uri: bannerImage, name: filename, type: 'image/jpeg' })
        }

        res = await fetch(`${API_URL}api/user/profile`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: form
        })
      } else {
        // no local files, send JSON with URLs or text fields
        if (profileImage && (profileImage.startsWith('http://') || profileImage.startsWith('https://'))) updates.profileImage = profileImage
        if (bannerImage && (bannerImage.startsWith('http://') || bannerImage.startsWith('https://'))) updates.bannerImage = bannerImage

        res = await fetch(`${API_URL}api/user/profile`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
      }

      if (!res.ok) {
        const txt = await res.text()
        console.error('EditProfile failed', res.status, txt)
        Alert.alert('Save failed', 'Failed to update profile')
        return
      }

      // refresh auth store
      try { await fetchMe() } catch (e) { /* ignore */ }
      Alert.alert('Saved', 'Profile updated')
      router.back()
    } catch (e) {
      console.error('handleSave error', e)
      Alert.alert('Error', 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={{ flex: 1, padding: 12 }}>
      <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Edit profile</Text>

      <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>Profile image</Text>
      <TouchableOpacity onPress={() => pickImage(setProfileImage)} style={{ marginBottom: 12 }}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={{ width: 96, height: 96, borderRadius: 8 }} />
        ) : (
          <View style={{ width: 96, height: 96, borderRadius: 8, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff' }}>Pick</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>Banner image</Text>
      <TouchableOpacity onPress={() => pickImage(setBannerImage)} style={{ marginBottom: 12 }}>
        {bannerImage ? (
          <Image source={{ uri: bannerImage }} style={{ width: '100%', height: 120, borderRadius: 8 }} />
        ) : (
          <View style={{ width: '100%', height: 120, borderRadius: 8, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff' }}>Pick</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>First name</Text>
      <TextInput value={form.firstName} onChangeText={(t) => setForm(s => ({ ...s, firstName: t }))} style={{ backgroundColor: COLORS.cardBackground, padding: 10, borderRadius: 8, color: COLORS.textPrimary, marginBottom: 12 }} />

      <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>Last name</Text>
      <TextInput value={form.lastName} onChangeText={(t) => setForm(s => ({ ...s, lastName: t }))} style={{ backgroundColor: COLORS.cardBackground, padding: 10, borderRadius: 8, color: COLORS.textPrimary, marginBottom: 12 }} />

      <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>Bio</Text>
      <TextInput value={form.bio} onChangeText={(t) => setForm(s => ({ ...s, bio: t }))} multiline numberOfLines={3} style={{ backgroundColor: COLORS.cardBackground, padding: 10, borderRadius: 8, color: COLORS.textPrimary, marginBottom: 12 }} />

      <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>Location</Text>
      <TextInput value={form.location} onChangeText={(t) => setForm(s => ({ ...s, location: t }))} style={{ backgroundColor: COLORS.cardBackground, padding: 10, borderRadius: 8, color: COLORS.textPrimary, marginBottom: 18 }} />

      <TouchableOpacity onPress={handleSave} style={[styles.addButton, { justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }]} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.addButtonText}>Save</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}
