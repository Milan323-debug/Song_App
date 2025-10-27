import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Switch,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import COLORS from '../constants/colors'
import { useAuthStore } from '../store/authStore'
import { API_URL } from '../constants/api'

export default function Settings() {
  const { user, token, logout } = useAuthStore()
  const router = useRouter()

  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loadingPrefs, setLoadingPrefs] = useState(true)

  const PREFS_KEYS = {
    notifications: 'prefs_notifications_v1',
    darkMode: 'prefs_darkmode_v1',
  }

  useEffect(() => {
    // load saved preferences from AsyncStorage
    let mounted = true
    const load = async () => {
      try {
        const [n, d] = await Promise.all([
          AsyncStorage.getItem(PREFS_KEYS.notifications),
          AsyncStorage.getItem(PREFS_KEYS.darkMode),
        ])
        if (!mounted) return
        if (n !== null) setNotificationsEnabled(n === '1')
        if (d !== null) setDarkMode(d === '1')
      } catch (e) {
        console.warn('Failed to load prefs', e)
      } finally {
        if (mounted) setLoadingPrefs(false)
      }
    }
    load()
    return () => (mounted = false)
  }, [])

  useEffect(() => {
    // persist small preferences
    AsyncStorage.setItem(PREFS_KEYS.notifications, notificationsEnabled ? '1' : '0').catch(() => {})
  }, [notificationsEnabled])

  useEffect(() => {
    AsyncStorage.setItem(PREFS_KEYS.darkMode, darkMode ? '1' : '0').catch(() => {})
    // If you have a Theme provider, notify it here. This is purely local toggle.
  }, [darkMode])

  const handleOpenPrivacy = () => {
     router.push('/PrivacyPolicy')
  }

  const handleSendFeedback = async () => {
    const subject = encodeURIComponent('App feedback')
    const body = encodeURIComponent(`Hi,\n\nI would like to share some feedback:\n\n`)
    const mailto = `mailto:spideritachi0780@gmail.com?subject=${subject}&body=${body}`
    try {
      await Linking.openURL(mailto)
    } catch (e) {
      Alert.alert('Error', 'Unable to open mail client')
    }
  }

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout()
          } catch (e) { /* ignore */ }
          // navigate to the auth root route; RootLayout expects '/(auth)'
          router.replace('/(auth)')
        },
      },
    ])
  }

  const handleDeleteAccount = () => {
    Alert.alert('Delete account', 'This will permanently delete your account and all data. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteAccount },
    ])
  }

  const deleteAccount = async () => {
    if (!user || !token) return
    setDeleting(true)
    try {
      // Best-effort: delete user's playlists
      try {
        const plRes = await fetch(`${API_URL}api/playlists/mine`, { headers: { Authorization: `Bearer ${token}` } })
        if (plRes.ok) {
          const plJson = await plRes.json().catch(() => ({}))
          const playlists = Array.isArray(plJson.playlists) ? plJson.playlists : []
          if (playlists.length > 0) {
            await Promise.all(playlists.map(p => fetch(`${API_URL}api/playlists/${p._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(err => { console.warn('delete playlist failed', p._id, err); return null })))
          }
        }
      } catch (e) {
        console.warn('Failed to fetch/delete playlists during account delete', e)
      }

      // Best-effort: delete user's songs
      try {
        const usernameOrId = encodeURIComponent(user.username || user._id)
        const songsRes = await fetch(`${API_URL}api/songs/user/${usernameOrId}`, { headers: { Authorization: `Bearer ${token}` } })
        if (songsRes.ok) {
          const songsJson = await songsRes.json().catch(() => ({}))
          const songs = Array.isArray(songsJson.songs) ? songsJson.songs : []
          if (songs.length > 0) {
            // delete songs sequentially to avoid hammering cloudinary
            for (const s of songs) {
              try {
                await fetch(`${API_URL}api/songs/${s._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
              } catch (err) {
                console.warn('delete song failed', s._id, err)
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch/delete songs during account delete', e)
      }

      // Attempt to delete user record if backend supports it. Not all backends include this endpoint.
      try {
        const res = await fetch(`${API_URL}api/user/${user._id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res && !res.ok) {
          // if 404/405, it's likely the endpoint isn't implemented; log and continue
          const txt = await res.text().catch(() => '')
          console.warn('deleteAccount: user delete endpoint returned non-ok', res.status, txt)
        }
      } catch (e) {
        console.warn('deleteAccount: user delete request failed or not implemented', e)
      }

      // Finally, log out locally and navigate to auth
      try {
        await logout()
      } catch (e) { console.warn('logout after delete failed', e) }
      router.replace('/(auth)')
    } catch (e) {
      console.error('deleteAccount error', e)
      Alert.alert('Error', 'Failed to delete account')
    } finally {
      setDeleting(false)
    }
  }

  const SettingRow = ({ icon, title, subtitle, children, onPress, destructive }) => (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[styles.row, destructive ? styles.rowDestructive : null]}
    >
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color={destructive ? '#ff4d4f' : COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, destructive ? styles.titleDestructive : null]}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.rowRight}>{children}</View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {loadingPrefs ? (
        <View style={{ padding: 16 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <SettingRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Enable push / email notifications"
          >
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              thumbColor={Platform.OS === 'android' ? (notificationsEnabled ? COLORS.primary : '#fff') : undefined}
            />
          </SettingRow>

          <SettingRow icon="moon-outline" title="Dark mode" subtitle="Toggle app theme (client-side)">
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              thumbColor={Platform.OS === 'android' ? (darkMode ? COLORS.primary : '#fff') : undefined}
            />
          </SettingRow>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Support</Text>
          </View>

          <SettingRow icon="document-text-outline" title="Privacy policy" subtitle="Read our privacy policy" onPress={handleOpenPrivacy}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </SettingRow>

          <SettingRow icon="mail-outline" title="Send feedback" subtitle="Help us improve" onPress={handleSendFeedback}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </SettingRow>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <SettingRow icon="log-out-outline" title="Sign out" subtitle={user?.email || ''} onPress={handleSignOut}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </SettingRow>

          <SettingRow icon="trash-outline" title="Delete account" subtitle="Permanently delete your account" onPress={handleDeleteAccount} destructive>
            {deleting ? <ActivityIndicator /> : <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />}
          </SettingRow>

          <View style={styles.footer}>
            <Text style={styles.versionText}>App version 1.0.0</Text>
            <Text style={styles.copyrightText}>© {new Date().getFullYear()} NeuroTune</Text>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  rowRight: {
    marginLeft: 12,
  },
  rowDestructive: {
    // subtle red tint for destructive rows
  },
  titleDestructive: {
    color: '#ff4d4f',
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 6,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
  },
  versionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  copyrightText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 6,
  },
})