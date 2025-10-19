import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import COLORS from '../constants/colors'
import usePlayerStore from '../store/playerStore'

export default function PlaybackModeButton({ style }) {
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeatMode = usePlayerStore((s) => s.repeatMode)
  const setShuffle = usePlayerStore((s) => s.setShuffle)
  const setRepeatMode = usePlayerStore((s) => s.setRepeatMode)

  const [visible, setVisible] = useState(false)
  const open = () => setVisible(true)
  const close = () => setVisible(false)

  const applyMode = (mode) => {
    if (mode === 'order') {
      setShuffle(false)
      setRepeatMode('off')
    } else if (mode === 'shuffle') {
      setShuffle(true)
      setRepeatMode('off')
    } else if (mode === 'repeat-one') {
      setShuffle(false)
      setRepeatMode('one')
    } else if (mode === 'repeat-all') {
      setShuffle(false)
      setRepeatMode('all')
    }
    close()
  }

  const getModeIcon = () => {
    const iconColor = '#ffffff'
    if (shuffle) return { name: 'shuffle', color: iconColor }
    if (repeatMode && repeatMode !== 'off') return { name: 'repeat', color: iconColor }
    return { name: 'list-outline', color: iconColor }
  }

  return (
    <>
      <TouchableOpacity onPress={open} style={[styles.button, style]}>
        <Ionicons name={getModeIcon().name} size={16} color={getModeIcon().color} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
          <View style={styles.bigSheet}>
            <Text style={styles.bigTitle}>Listening Mode</Text>

            <TouchableOpacity style={[styles.menuOption, { paddingVertical: 16 }]} onPress={() => applyMode('order')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="list-outline" size={30} color={'#fff'} style={{ marginRight: 18 }} />
                  <Text style={[styles.menuOptionText, { fontSize: 17, color: '#fff' }]}>Play in order</Text>
                </View>
                {( !shuffle && repeatMode === 'off' ) && <Ionicons name="checkmark" size={27} color={COLORS.primary} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuOption, { paddingVertical: 16 }]} onPress={() => applyMode('shuffle')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="shuffle" size={30} color={shuffle ? COLORS.primary : '#fff'} style={{ marginRight: 18 }} />
                  <Text style={[styles.menuOptionText, { fontSize: 17, color: '#fff' }]}>Shuffle</Text>
                </View>
                {shuffle && <Ionicons name="checkmark" size={27} color={COLORS.primary} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuOption, { paddingVertical: 16 }]} onPress={() => applyMode('repeat-one')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="repeat" size={30} color={repeatMode === 'one' ? COLORS.primary : '#fff'} style={{ marginRight: 18 }} />
                  <Text style={[styles.menuOptionText, { fontSize: 17 }]}>Repeat one</Text>
                </View>
                {repeatMode === 'one' && <Ionicons name="checkmark" size={27} color={COLORS.primary} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuOption, { paddingVertical: 16 }]} onPress={() => applyMode('repeat-all')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="repeat" size={30} color={repeatMode === 'all' ? COLORS.primary : '#fff'} style={{ marginRight: 18 }} />
                  <Text style={[styles.menuOptionText, { fontSize: 17 }]}>Repeat all</Text>
                </View>
                {repeatMode === 'all' && <Ionicons name="checkmark" size={27} color={COLORS.primary} />}
              </View>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  bigSheet: { backgroundColor: COLORS.cardBackground, padding: 16, paddingBottom: 36, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: 300 },
  bigTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '900', marginBottom: 18, textAlign: 'center' },
  menuOption: { paddingVertical: 12, borderBottomWidth: 0, borderBottomColor: 'transparent' },
  menuOptionText: { color: COLORS.textPrimary, fontSize: 16 },
})
