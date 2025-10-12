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
    padding: 16,
    backgroundColor: 'transparent'
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: -50,
    borderWidth: 4,
    borderColor: COLORS.background,
    backgroundColor: COLORS.cardBackground
  },
  nameContainer: {
    marginTop: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 16,
    lineHeight: 20,
  },
  statsContainer: {
    marginTop: 8,
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
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