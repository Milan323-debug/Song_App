import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "../components/SafeScreen";

import { Audio } from 'expo-av';
import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const { checkAuth, user, token, isCheckingAuth } = useAuthStore();

  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Medium": require("../assets/fonts/JetBrainsMono-Medium.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    checkAuth();
  }, []);

  // handle navigation based on the auth state
  useEffect(() => {
    // wait for auth hydration to complete before navigating
    if (isCheckingAuth) return;

    const inAuthScreen = segments[0] === "(auth)";
    const isSignedIn = !!user && !!token;
    const atRoot = !segments || segments.length === 0 || !segments[0];

    // Defer navigation slightly so the Root navigator has mounted.
    const id = setTimeout(() => {
      if (atRoot) {
        // If user lands on '/', pick the correct landing route based on auth
  if (isSignedIn) router.replace("/(tabs)/Home");
        else router.replace("/(auth)");
        return;
      }

      // existing behavior for other segment states
      if (!isSignedIn && !inAuthScreen) router.replace("/(auth)");
  else if (isSignedIn && inAuthScreen) router.replace("/(tabs)/Home");
    }, 50);

    return () => clearTimeout(id);
  }, [user, token, segments, isCheckingAuth, router]);

  // Configure Expo Audio for background playback
  useEffect(() => {
    (async () => {
      try {
        const audioMode = {
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        }
        // Add interruption mode flags only if the constants exist in this version of expo-av
        if (typeof Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX !== 'undefined') {
          audioMode.interruptionModeIOS = Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX
        } else if (typeof Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS !== 'undefined') {
          audioMode.interruptionModeIOS = Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS
        }
        if (typeof Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS !== 'undefined') {
          audioMode.interruptionModeAndroid = Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS
        }

        await Audio.setAudioModeAsync(audioMode)
      } catch (e) {
        console.warn('Audio.setAudioModeAsync failed', e)
      }
    })();
  }, [])

  return (
    <SafeAreaProvider>
      <SafeScreen>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </SafeScreen>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}