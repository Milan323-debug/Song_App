import React from 'react';
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { TouchableOpacity, View, Modal, Text } from 'react-native';
import { useUiStore } from '../../store/uiStore';

function CreateTabButton(props) {
  const setChooserVisible = useUiStore((s) => s.setChooserVisible);
  const selected = props.accessibilityState?.selected;
  return (
    <TouchableOpacity
      {...props}
      // Do NOT call props.onPress (navigation). Only open chooser modal so
      // the modal is shown over the current active screen.
      onPress={() => {
        setChooserVisible(true);
      }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 10 }, props.style]}
      accessible
      accessibilityRole="button"
    >
      <View>
        <Ionicons name="add-circle-outline" size={24} color={selected ? COLORS.primary : '#def7ffff'} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const chooserVisible = useUiStore((s) => s.chooserVisible);
  const setChooserVisible = useUiStore((s) => s.setChooserVisible);
  const router = require('expo-router').useRouter();

  const onChoosePlaylist = () => {
    setChooserVisible(false);
    router.push("/Playlists/CreatePlaylist");
  };

  const onChooseSong = () => {
    setChooserVisible(false);
    router.push("/(tabs)/Create");
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
            backgroundColor: "transparent", // Make it transparent
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
          },
          tabBarBackground: () => (
            <LinearGradient
              colors={["rgba(0, 0, 0, 0.1)", "rgba(0, 0, 0, 0.7)"]} // top to bottom fade
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ flex: 1 }}
              pointerEvents="none"
            />
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
          name="Create"
          options={{
            title: "Create",
            tabBarButton: (props) => <CreateTabButton {...props} />,
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
          name="Profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      <Modal
        visible={chooserVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChooserVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.cardBackground, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Create</Text>
            <TouchableOpacity 
              style={{ paddingVertical: 12 }}
              onPress={onChooseSong}
              accessible
              accessibilityLabel="Upload a new song"
              accessibilityRole="button"
            >
              <Text style={{ color: COLORS.textPrimary, fontSize: 16 }}>Song</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Upload a new song</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ paddingVertical: 12 }}
              onPress={onChoosePlaylist}
              accessible
              accessibilityLabel="Create a new playlist"
              accessibilityRole="button"
            >
              <Text style={{ color: COLORS.textPrimary, fontSize: 16 }}>Playlist</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Create a new playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ paddingVertical: 12, alignItems: 'flex-end' }}
              onPress={() => setChooserVisible(false)}
              accessible
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
