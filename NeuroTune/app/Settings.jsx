import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Alert, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import COLORS from '../constants/colors'
import styles from '../assets/styles/profile.styles'
import { useAuthStore } from '../store/authStore'
import { API_URL } from '../constants/api'

export default function Settings() {
  const { user, token, logout } = useAuthStore()
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDeleteAccount = () => {
    Alert.alert('Delete account', 'This will permanently delete your account and all data. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteAccount }
    ])
  }

  const deleteAccount = async () => {
    if (!user || !token) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}api/user/${user._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const txt = await res.text()
        console.error('deleteAccount failed', res.status, txt)
        Alert.alert('Delete failed', 'Could not delete account')
        return
      }

      // on success, log out and go to auth screen
      logout()
      router.replace('/(auth)/index')
    } catch (e) {
      console.error('deleteAccount error', e)
      Alert.alert('Error', 'Failed to delete account')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Settings</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}>
        <View>
          <Text style={{ color: COLORS.textPrimary, fontWeight: '600' }}>Notifications</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Enable push / email notifications</Text>
        </View>
        <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}>
        <View>
          <Text style={{ color: COLORS.textPrimary, fontWeight: '600' }}>Dark mode</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Toggle app theme (client-side)</Text>
        </View>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>

      <View style={{ marginTop: 18 }}>
        <TouchableOpacity onPress={() => router.push('/PrivacyPolicy')} style={[styles.addButton, { backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 12 }]}>
          <Text style={[styles.addButtonText, { color: COLORS.textPrimary }]}>Privacy policy</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 36 }}>
        <TouchableOpacity onPress={handleDeleteAccount} style={[styles.logoutButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} disabled={deleting}>
          <Text style={styles.logoutText}>{deleting ? 'Deleting...' : 'Delete account'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
