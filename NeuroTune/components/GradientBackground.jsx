import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../constants/colors";

export default function GradientBackground({
  children,
  variant = "default",
  style,
  bottomFade = false,
  bottomFadeHeight,
  customStops,    // new: allow custom stop locations
}) {
  const variants = {
    default: [
      COLORS.backgroundDark || "#000000",
      COLORS.background || "#071029",
      COLORS.primary || "#00BBF9",
      COLORS.cardBackground || "#002b54",
    ],
    teal: [
      COLORS.primary,
      // mid stops
      COLORS.primaryDark || "#008fb3",
      COLORS.cardBackground,
    ],
    neon: [
      COLORS.textDark || "#1f0f5d",
      COLORS.primary,
      COLORS.primaryLight || "#6afcff",
      COLORS.cardBackground,
    ],
  };

  const colors = customStops?.colors ?? (variants[variant] || variants.default);
  let stops = null
  if (customStops?.locations) {
    stops = customStops.locations
  } else if (Array.isArray(colors)) {
    // generate evenly spaced locations that match the number of colors
    const n = colors.length
    if (n > 1) {
      stops = colors.map((_, i) => i / (n - 1))
    } else {
      stops = [0]
    }
  } else {
    stops = [0, 0.3, 0.6, 1]
  }

  return (
    <LinearGradient
      colors={colors}
      locations={stops}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.root, style]}
    >
      {/* radial / circle accent behind for depth */}
      <View style={styles.radialAccent} pointerEvents="none" />

      {/* dark overlay to tone down vivid parts */}
      <View style={styles.overlay} pointerEvents="none" />

      {children}

      {bottomFade && (
        <LinearGradient
          colors={["transparent", COLORS.backgroundDark || COLORS.background]}
          style={[styles.bottomFade, { height: bottomFadeHeight || 220 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          pointerEvents="none"
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  radialAccent: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: COLORS.primaryLight ? (COLORS.primaryLight + "22") : "rgba(0, 195, 255, 0.15)",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.25)",  // increased darkness overlay
  },
  bottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
