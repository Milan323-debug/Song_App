import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import COLORS from '../constants/colors'

// Privacy Policy page for a music/song app
// NOTE: This is a template to display a privacy policy inside the app.
// It should be reviewed by legal counsel for your app and jurisdiction before publishing.

const LAST_UPDATED = 'October 22, 2025'
const CONTACT_EMAIL = 'spideritachi0780@gmail.com'

const policyText = `Last updated: ${LAST_UPDATED}

Thank you for choosing our music app. This privacy policy describes how we collect, use, share, and protect information when you use the app.

1. Information we collect
• Account information: email address and any profile information you provide (name, avatar).
• Content: playlists, favorites, likes, and the music metadata you create or upload.
• Device & usage data: device model, OS version, app version, IP address, analytics (how you use the app).
• Media access: only when you grant permission to choose photos for profile/banner images.

2. How we use information
• Provide and operate the app, including syncing your playlists and preferences.
• Improve the app, fix bugs, and run analytics to understand feature usage.
• Send you transactional messages (account notices) and, if you opt in, marketing messages.
• Moderation and safety: prevent abuse and respond to support requests.

3. Sharing & third parties
We may share data with:
• Service providers that help operate the app (hosting, analytics, email delivery, cloud storage such as Cloudinary).
• Advertising partners if you use ad-supported features (we will state if ads are enabled and how to opt out).
• Law enforcement or other parties if required by law or to protect rights and property.

4. Your choices
• You can update or delete profile information in the app.
• You can control notification preferences in Settings.
• Revoke media permissions in your device settings.

5. Security
We take reasonable administrative and technical measures to protect your data, but no method is 100% secure. If a breach occurs, we'll follow applicable laws.

6. Data retention
We retain data to provide the service and for legal/compliance reasons. If you request account deletion, we will remove or anonymize personal data according to our retention policy.

7. Children
The app is not directed to children under 13. We do not knowingly collect personal information from children under 13.

8. Changes to this policy
We may update this policy. If changes are material, we will notify you in-app or by email.

Contact
If you have questions about this policy or want to exercise your privacy rights, contact: ${CONTACT_EMAIL}
`;

export default function PrivacyPolicy({ onAccept }) {
  const router = useRouter()

  const handleOpenEmail = async () => {
    const mailto = `mailto:${CONTACT_EMAIL}?subject=Privacy%20Policy%20Question`
    try {
      await Linking.openURL(mailto)
    } catch (e) {
      console.warn('Could not open mail client', e)
    }
  }

  const handleShare = async () => {
    try {
      await Share.share({ message: `Privacy Policy - Last updated ${LAST_UPDATED}\n\nYou can read it in the app or contact ${CONTACT_EMAIL}` })
    } catch (e) {
      console.warn('Share failed', e)
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>

        <Text style={styles.paragraph}>{policyText}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleOpenEmail}>
            <Ionicons name="mail-outline" size={16} color={COLORS.primary} />
            <Text style={styles.actionText}>Contact us</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={16} color={COLORS.primary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => (onAccept ? onAccept() : router.back())}
          accessibilityRole="button"
        >
          <Text style={styles.closeText}>{onAccept ? 'Accept & Continue' : 'Close'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    padding: 16,
  },
  lastUpdated: {
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  paragraph: {
    color: COLORS.textPrimary,
    lineHeight: 20,
    fontSize: 14,
    whiteSpace: 'pre-line',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  actionText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 22,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: COLORS.black,
    fontWeight: '700',
  },
})