import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  LayoutAnimation,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../assets/styles/login.styles";
import { API_URL, API } from "../../constants/api";
import COLORS from "../../constants/colors";
import { useAuthStore } from "../../store/authStore";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const router = useRouter();
  const { isLoading, login, isCheckingAuth, token } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [errors, setErrors] = useState({});
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // logo is static now (no glow animation)

  useEffect(() => {
    // no local checkAuth here; RootLayout runs it once. Redirect when token changes
  }, []);

  useEffect(() => {
    if (!token && !isCheckingAuth) return; // nothing to do

    const id = setTimeout(() => {
      if (token && !isCheckingAuth) router.replace("/(tabs)/Home");
    }, 50);

    return () => clearTimeout(id);
  }, [token, isCheckingAuth, router]);

  function validate() {
    const newErrors = {};
    if (!email) newErrors.email = "Email is required";
    else if (!emailRegex.test(email)) newErrors.email = "Enter a valid email";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6)
      newErrors.password = "Password must be >= 6 chars";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function animatePress() {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }

  async function handleLogin() {
    Keyboard.dismiss();
    if (!validate()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    animatePress();
    try {
      const result = await login(email, password);
      if (!result || !result.success) {
        Alert.alert("Login failed", result?.error || "Unable to login");
      }
    } catch (err) {
      Alert.alert("Login error", err.message || "Something went wrong");
    }
  }

  if (isCheckingAuth) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient colors={["#0F3460", "#000000"]} style={styles.container}>
        {/* glowing particles background */}
        <View style={styles.particlesWrap} pointerEvents="none">
          {/* denser, more abrupt particle placement for a lively background */}
          <View
            style={[
              styles.particle,
              { left: "6%", top: "18%", width: 6, height: 6, opacity: 0.9 },
            ]}
          />
          <View
            style={[
              styles.particle,
              { left: "18%", top: "10%", width: 10, height: 10, opacity: 0.75 },
            ]}
          />
          <View
            style={[
              styles.particle,
              { left: "28%", top: "22%", width: 8, height: 8, opacity: 0.6 },
            ]}
          />
          <View
            style={[
              styles.particle,
              { left: "38%", top: "8%", width: 14, height: 14, opacity: 0.95 },
            ]}
          />
          <View
            style={[
              styles.particle,
              { left: "46%", top: "26%", width: 10, height: 10, opacity: 0.7 },
            ]}
          />
          <View
            style={[
              styles.particle,
              { left: "52%", top: "16%", width: 12, height: 12, opacity: 0.85 },
            ]}
          />
          <View
            style={[
              styles.particle,
              { left: "60%", top: "6%", width: 6, height: 6, opacity: 0.5 },
            ]}
          />
          <View
            style={[
              styles.particle,
              { left: "68%", top: "20%", width: 18, height: 18, opacity: 1 },
            ]}
          />
          <View
            style={[
              styles.particle,
              { left: "78%", top: "14%", width: 8, height: 8, opacity: 0.8 },
            ]}
          />
          <View
            style={[
              styles.particle,
              { left: "86%", top: "24%", width: 6, height: 6, opacity: 0.6 },
            ]}
          />
        </View>

        <View style={styles.logoWrap}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
          />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue to NeuroTunes</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.textPrimary}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="you@neuro.io"
                placeholderTextColor="rgba(255,255,255,0.6)"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.textPrimary}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Your password"
                placeholderTextColor="rgba(255,255,255,0.6)"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secure}
                autoCapitalize="none"
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSecure((s) => !s)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 0,
                  bottom: 0,
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={secure ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={COLORS.textPrimary}
                  style={{ opacity: 0.95 }}
                />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleLogin}
              style={{ borderRadius: 999 }}
              disabled={isLoading}
            >
              <LinearGradient
                colors={["#00BBF9", "#00F5D4"]}
                start={[0, 0]}
                end={[1, 0]}
                style={styles.button}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Log In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New in NeuroTune?</Text>
            <Link href="/(auth)/signup" style={styles.link}>
              Sign Up
            </Link>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
