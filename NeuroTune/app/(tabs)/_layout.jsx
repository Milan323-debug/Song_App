// TabLayout.jsx (or .js)
import React, { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "../../constants/colors";
import { useUiStore } from "../../store/uiStore";

function CreateTabButton(props) {
  const setChooserVisible = useUiStore((s) => s.setChooserVisible);
  const selected = props.accessibilityState?.selected;
  return (
    <TouchableOpacity
      {...props}
      onPress={() => {
        setChooserVisible(true);
      }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={[
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          height: 60,
          paddingTop: 8,
          zIndex: 10,
        },
        props.style,
      ]}
      accessible
      accessibilityRole="button"
    >
      <Ionicons
        name="add-circle"
        size={30}
        color={selected ? COLORS.primary : "#def7ffff"}
        style={{ marginBottom: 4 }}
      />
    </TouchableOpacity>
  );
}

function OverlayMenu({
  visible,
  onClose,
  onChooseSong,
  onChoosePlaylist,
  tabBarHeight,
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 300 : 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) {
    return null;
  }

  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [150 + tabBarHeight, 0],
  });
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "black", opacity: backdropOpacity },
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: tabBarHeight,
          },
          { transform: [{ translateY }, { scale }] },
        ]}
      >
        <View style={styles.menuCard}>
          <Text style={styles.title}>Create</Text>

          <TouchableOpacity onPress={onChooseSong} style={styles.option}>
            <View style={styles.optionRow}>
              <Ionicons
                name="musical-notes-outline"
                size={24}
                color={COLORS.primary}
                style={styles.optionIcon}
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Song</Text>
                <Text style={styles.optionDesc}>Upload a new song</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onChoosePlaylist}
            style={styles.optionLast}
          >
            <View style={styles.optionRow}>
              <Ionicons
                name="list-outline"
                size={24}
                color={COLORS.primary}
                style={styles.optionIcon}
              />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Playlist</Text>
                <Text style={styles.optionDesc}>Create a new playlist</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.cancelContainer}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelButton}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuCard: {
    marginHorizontal: 24,
    borderRadius: 20,
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 12,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
  },
  option: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.textSecondary + "33",
  },
  optionLast: {
    paddingVertical: 16,
    // no bottom border
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIcon: {
    marginRight: 16,
    // optionally: width/height, align, etc.
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "600",
  },
  optionDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  cancelContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 6,
  },
  cancelButtonText: {
    color: COLORS.cardBackground,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const chooserVisible = useUiStore((s) => s.chooserVisible);
  const setChooserVisible = useUiStore((s) => s.setChooserVisible);
  const router = useRouter();

  const tabBarHeight = 60 + insets.bottom;

  const onChooseSong = () => {
    setChooserVisible(false);
    router.push("/(tabs)/createStack");
  };

  const onChoosePlaylist = () => {
    setChooserVisible(false);
    router.push("/(tabs)/createStack/CreatePlaylist");
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: "#def7ffff",
          tabBarStyle: {
            position: "absolute",
            borderTopWidth: 0,
            elevation: 0,
            backgroundColor: "transparent",
            height: tabBarHeight,
            paddingBottom: insets.bottom,
          },
          tabBarBackground: () => (
            <View style={{ flex: 1 }}>
              {/* put gradient or whatever background */}
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="Home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="Playlists"
          options={{
            title: "Playlists",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="library-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="createStack"
          options={{
            title: "Create",
            tabBarButton: (props) => <CreateTabButton {...props} />,
          }}
        />
        <Tabs.Screen
          name="Liked"
          options={{
            title: "Liked",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="Profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
  {/* CreatePlaylist is nested under createStack (app/(tabs)/createStack/CreatePlaylist.jsx) and is not its own tab */}
      </Tabs>

      <OverlayMenu
        visible={chooserVisible}
        onClose={() => setChooserVisible(false)}
        onChooseSong={onChooseSong}
        onChoosePlaylist={onChoosePlaylist}
        tabBarHeight={tabBarHeight}
      />
    </View>
  );
}
