// Styles used by components/PlayerContainer.jsx
import COLORS from '../../constants/colors'
import { DEFAULT_ARTWORK_BG } from '../../constants/artwork'

const styles = {
  // cover the full screen so the expanded player can occupy the entire viewport
  root: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  miniContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    // slightly darker than screen for contrast
    backgroundColor: 'rgba(1, 66, 77, 0.85)',
  paddingVertical: 10,
  paddingHorizontal: 12,
  minHeight: 4,
    alignItems: 'center',
    // subtle shadow for elevation
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
    elevation: 10,
  },
  miniInner: { flexDirection: 'row', alignItems: 'center' },
  // smaller artwork so the bar can be thicker while remaining compact like Spotify
  miniArtPlaceholder: { width: 40, height: 40, borderRadius: 6, backgroundColor: DEFAULT_ARTWORK_BG, marginRight: 12 },
  miniInfo: { flex: 1, justifyContent: 'center' },
  title: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  artist: { color: COLORS.textSecondary, fontSize: 12 },
  // slightly smaller touch targets to keep the bar compact
  // visually transparent button so only the play/pause icon is visible (like Spotify)
  // keep size for a comfortable touch target but remove the circular background
  miniPlayBtnSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  modeBtnSmall: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },

  // bottom progress strip (previously topProgress) — flush to container bottom (thinner)
  topProgress: { height: 2, backgroundColor: 'rgba(255,255,255,0.06)', position: 'absolute', left: 12, right: 12, bottom: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, overflow: 'hidden' },
  topProgressFill: { height: 2, backgroundColor: COLORS.primary, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },

  fullContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    zIndex: 60,
  },
  fullBg: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: -1 },
  fullHeader: { height: 56, alignItems: 'flex-end', padding: 12 },
  // give slightly larger horizontal padding so the artwork and controls have breathing room
  fullContent: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 12, paddingHorizontal: 24 },
  fullArtPlaceholder: { width: 320, height: 320, borderRadius: 16, backgroundColor: DEFAULT_ARTWORK_BG, shadowColor: COLORS.neonAqua, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.14, shadowRadius: 30, elevation: 16 },
  artWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  dragHandleWrap: { position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  dragHandle: { width: 48, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)' },
  collapseFab: { position: 'absolute', top: 8, left: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  fullTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 12 },
  fullArtist: { color: COLORS.textSecondary, marginTop: 8 },

  // PROGRESS — improved, sleek, and attractive
  // progress area: tidy spacing and thin rounded track like Spotify
  // progress area occupies nearly full width inside the padded content
  // --- FIXED + REFINED PROGRESS BAR + THUMB UI ---
progressContainer: {
  width: '100%',
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 8,
  marginBottom: 8,
},

timeText: {
  color: COLORS.textSecondary,
  width: 42,
  textAlign: 'center',
  fontSize: 12,
  opacity: 0.9,
  fontWeight: '500',
},

// wider touch area so user can scrub easily
progressBarWrap: {
  flex: 1,
  height: 28, // taller touch zone
  justifyContent: 'center',
  marginHorizontal: 6,
},

// track background (thinner)
progressBarBg: {
  height: 3,
  backgroundColor: 'rgba(195, 197, 198, 0.57)',
  borderRadius: 999,
  overflow: 'hidden',
},

// filled portion (played) (thinner)
progressBarFill: {
  position: 'absolute',
  left: 0,
  height: 3,
  borderRadius: 999,
  backgroundColor: COLORS.primary,
  shadowColor: COLORS.neonAqua,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.18,
  shadowRadius: 4,
  elevation: 3,
},

// thumb sits perfectly centered vertically
progressThumbContainer: {
  position: 'absolute',
  left: 0,
  top: '50%',
  width: 3,
  height: 1,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 2,
},

// outer ring with glow (smaller)
progressThumb: {
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: COLORS.background,
  borderWidth: 2,
  borderColor: COLORS.primary,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: COLORS.neonAqua,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.22,
  shadowRadius: 6,
  elevation: 4,
},

// inner dot for depth (smaller)
progressThumbInner: {
  width: 4,
  height: 4,
  borderRadius: 2,
  backgroundColor: COLORS.primary,
},
// --- END FIXED PROGRESS STYLES ---


  controlsRowLarge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 18 },
  // make options occupy full content width and evenly distribute icons to match phone side gutters
  optionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 12 },
  // add consistent horizontal spacing so left/right gutters are equal
  optionBtn: { padding: 8, borderRadius: 8, marginHorizontal: 8 },
  upNextWrap: { width: '100%', marginTop: 24, paddingHorizontal: 18 },
  upNextTitle: { color: COLORS.textSecondary, marginBottom: 8 },
  // improved up next item with subtle separator and nicer spacing
  upNextItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  upNextIndex: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  upNextIndexText: { color: COLORS.textSecondary, fontSize: 12 },
  upNextArt: { width: 44, height: 44, borderRadius: 6, backgroundColor: DEFAULT_ARTWORK_BG },
  upNextTitleText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  upNextArtistText: { color: COLORS.textSecondary, fontSize: 12 },
  // duration pill shifted slightly left and styled
  upNextDuration: { color: COLORS.textSecondary, marginLeft: 8, width: 56, textAlign: 'center' },
  upNextDurationPill: { backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  ctrlBtn: { padding: 12 },
  playBigBtn: { backgroundColor: COLORS.neonAqua, borderRadius: 36, paddingHorizontal: 18, paddingVertical: 12 },

  // other shared styles
}

export default styles
