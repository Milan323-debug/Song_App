import React from "react";
import {
  Modal,
  Pressable,
  Animated as RNAnimated,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";

export default function ContextMenu({
  menuVisible,
  closeMenu,
  menuAnim,
  menuTarget,
  playNext,
  removeFromLiked,
  addToPlaylist,
  shareSong,
}) {
  const translateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  const options = [
    {
      key: "playNext",
      label: "Play Next",
      icon: "play-skip-forward-outline",
      action: () => playNext(menuTarget),
      color: COLORS.textPrimary,
    },
    {
      key: "removeLike",
      label: "Remove from Liked",
      icon: "heart-dislike-outline",
      action: () => removeFromLiked(menuTarget),
      color: COLORS.error,
    },
    {
      key: "addToPlaylist",
      label: "Add to Playlist",
      icon: "albums-outline",
      action: () => addToPlaylist(menuTarget),
      color: COLORS.textPrimary,
    },
    {
      key: "share",
      label: "Share",
      icon: "share-social-outline",
      action: () => shareSong(menuTarget),
      color: COLORS.textPrimary,
    },
  ];

  return (
    <Modal visible={menuVisible} transparent animationType="none">
      <Pressable style={styles.backdrop} onPress={closeMenu}>
        <RNAnimated.View
          style={[
            styles.card,
            {
              opacity: menuAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Header / Title */}
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {menuTarget?.title}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Option Items */}
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={styles.menuOption}
              onPress={() => {
                // close first for a smooth UX, then run action after a tick
                closeMenu();
                setTimeout(() => {
                  try { opt.action(); } catch (e) { console.warn('context action failed', e); }
                }, 180);
              }}
              activeOpacity={0.6}
            >
              <Ionicons
                name={opt.icon}
                size={20}
                color={opt.color}
                style={styles.optionIcon}
              />
              <Text style={[styles.menuOptionText, { color: opt.color }]}> {opt.label} </Text>
            </TouchableOpacity>
          ))}
  </RNAnimated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: COLORS.background, // e.g. dark theme
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    paddingTop: 10,
    paddingHorizontal: 16,
    // optional shadow/glow
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  menuHeader: {
    paddingVertical: 8,
    alignItems: "center",
  },
  menuTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border, // subtle border
    marginVertical: 8,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  optionIcon: {
    marginRight: 16,
  },
  menuOptionText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
