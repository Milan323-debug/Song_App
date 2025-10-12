// Styles used by components/PlayerContainer.jsx
import COLORS from '../../constants/colors'

export default ({
  root: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 84 },
  miniContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 12,
    elevation: 10,
  },
  miniInner: { flexDirection: 'row', alignItems: 'center' },
  miniArtPlaceholder: { width: 52, height: 52, borderRadius: 8, backgroundColor: COLORS.cardBackground, marginRight: 12 },
  miniInfo: { flex: 1 },
  title: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  artist: { color: COLORS.textSecondary, fontSize: 12 },
  miniProgressWrap: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, marginTop: 6, overflow: 'hidden' },
  miniProgress: { height: 4, backgroundColor: COLORS.primary },
  miniPlayBtnSmall: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  fullContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
  },
  fullHeader: { height: 56, alignItems: 'flex-end', padding: 12 },
  fullContent: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 24 },
  fullArtPlaceholder: { width: 220, height: 220, borderRadius: 12, backgroundColor: COLORS.cardBackground },
  fullTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 12 },
  fullArtist: { color: COLORS.textSecondary, marginTop: 8 },
  progressContainer: { width: '92%', flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  timeText: { color: COLORS.textSecondary, width: 48, textAlign: 'center' },
  progressBarWrap: { flex: 1, height: 24, justifyContent: 'center' },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: 6, backgroundColor: COLORS.primary },
  progressThumbContainer: { position: 'absolute', left: 0, top: -6, width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
  progressThumb: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  ctrlBtn: { padding: 12 },
  playBigBtn: { backgroundColor: COLORS.primary, borderRadius: 36, paddingHorizontal: 18, paddingVertical: 12 },

  // other shared styles
})