// styles/profile.styles.js
import { StyleSheet, Dimensions } from "react-native";
import COLORS from "../../constants/colors";

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  profileHeader: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  bannerContainer: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.cardBackground,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: 'transparent'
  },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: COLORS.background,
    backgroundColor: COLORS.cardBackground,
    marginRight: 12,
  },
  profileImageWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -48,
    marginRight: 12,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
    position: 'relative'
  },
  editButton: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 6,
  },
  nameContainer: {
    marginTop: 4,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 12,
    lineHeight: 20,
  },
  statsContainer: {
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  statCard: {
    width: (width - 64) / 4,
    alignItems: 'center',
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontSize: 14,
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 16,
  },
  statItem: {
    marginRight: 24,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // small stat card
  statCardSmall: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    shadowColor: COLORS.black,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
    marginRight: 12,
  },
  // recent uploads
  recentCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    shadowColor: COLORS.black,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // additional list / empty states
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  // utility buttons
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default styles;