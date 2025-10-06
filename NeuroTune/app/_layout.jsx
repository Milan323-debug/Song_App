import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "../components/SafeScreen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";

import { useAuthStore } from "../store/authStore";
import { useEffect } from "react";

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