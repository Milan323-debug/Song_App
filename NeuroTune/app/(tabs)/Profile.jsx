import { View, Text, TouchableOpacity, Alert } from 'react-native'
import React from 'react'
import COLORS from '../../constants/colors'
import styles from '../../assets/styles/profile.styles'
import { useAuthStore } from '../../store/authStore'

export default function Profile() {
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ])
  }
  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <Text style={styles.username}>Profile</Text>
          <Text style={styles.email}>{/* email placeholder */}</Text>
        </View>
      </View>

      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  )
}
