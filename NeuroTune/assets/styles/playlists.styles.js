import { StyleSheet } from "react-native";
import { DEFAULT_ARTWORK_BG } from '../../constants/artwork';
import COLORS from "../../constants/colors";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)'
  },
  cardLeft: {
    width: 84,
    height: 84,
  },
  artwork: {
    width: 84,
    height: 84,
    borderRadius: 10,
  },
  // smaller artwork for inline song rows (playlist detail, liked songs)
  songArtwork: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: DEFAULT_ARTWORK_BG,
  },
  cardRight: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4
  },
  owner: {
    color: COLORS.placeholderText,
    fontSize: 12,
    marginTop: 8
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    // increase paddingTop so the search bar can sit above the image/title without overlap
    paddingTop: 72,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  headerImage: {
    width: 120,
    height: 120,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: DEFAULT_ARTWORK_BG,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  playAll: {
    // moved absolute positioning to wrapper so this is only visual button styling
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  playAllContainer: {
    position: 'absolute',
    right: 18,
    zIndex: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  playingArtwork: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  itemText: {
    flex: 1,
    marginLeft: 10,
  },
  playingText: {
    color: COLORS.neonAqua,
  },
  duration: {
    color: COLORS.textSecondary,
    marginLeft: 6,
    width: 40,
    textAlign: 'right',
  },
  duration: {
    color: COLORS.textSecondary,
    marginLeft: 8,
    width: 48,
    textAlign: 'right',
  },
  menuButton: {
    padding: 6,
    marginLeft: 6,
  },
  searchBoxWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    // top is controlled by the animated style `searchBoxStyle` so the box
    // remains visually anchored inside the header and moves with it.
  },
  searchInput: {
    height: 44,
    flex: 1,
    paddingHorizontal: 10,
    color: COLORS.textPrimary,
  },
  searchInner: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  collapsedHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
  },
  backButton: {
    position: 'absolute',
    left: 8,
    top: 12,
    padding: 8,
  },
  collapsedTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(31, 61, 63, 1)'
  },
  avatarImg: { width: 40, height: 40 },
  titleLarge: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  pillRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: 'transparent', marginRight: 8 },
  pillActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  pillText: { color: COLORS.textSecondary },
  pillTextActive: { color: COLORS.textPrimary, fontWeight: '700' },
  recentsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  recentsTitle: { color: COLORS.textPrimary, fontWeight: '700' },
  seamPlayContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
  },
  seamPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.neonAqua,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.neonAqua,
    shadowOpacity: 0.98,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 18,
  },
  modeButton: {
    // small square button with subtle background
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  modeButtonSeam: {
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
