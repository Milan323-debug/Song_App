import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center'
  },
  cardLeft: {
    width: 64,
    height: 64,
  },
  artwork: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  cardRight: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4
  },
  owner: {
    color: COLORS.placeholderText,
    fontSize: 11,
    marginTop: 6
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)'
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)'
  },
  songArtwork: {
    width: 56,
    height: 56,
    borderRadius: 6
  },
  songTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  songSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4
  }
});
