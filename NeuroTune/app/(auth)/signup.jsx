import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../assets/styles/signup.styles";
import COLORS from "../../constants/colors";
import { useAuthStore } from "../../store/authStore";

export default function Signup() {
  const router = useRouter();
  const { user, isLoading, register, token, isCheckingAuth } = useAuthStore();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [securePwd, setSecurePwd] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [errors, setErrors] = useState({});

  const btnScale = useRef(new Animated.Value(1)).current;

  function validate() {
    const e = {};
    // Username
    if (!username) e.username = "Username is required";
    else if (username.length < 4) e.username = "Username must be at least 4 characters";
    else if (!/^[a-zA-Z0-9]+$/.test(username)) e.username = "Username can only contain letters and numbers";

    // Email
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Please enter a valid email address";

    // Password
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Password must be at least 8 characters";
    else {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        e.password =
          "Password must include uppercase, lowercase, a number and a special character";
      }
    }

    if (password !== confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onPressIn() {
    Animated.timing(btnScale, { toValue: 0.98, duration: 120, useNativeDriver: true }).start();
  }
  function onPressOut() {
    Animated.timing(btnScale, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }

  function handleSignup() {
    Keyboard.dismiss();
    if (!validate()) return;
    (async () => {
      const res = await register(username, email, password);
      if (res.success) {
        Alert.alert("Account created", "Welcome to NeuroTunes!", [
          { text: "Continue", onPress: () => setTimeout(() => router.replace("/(tabs)/Home"), 50) },
        ]);
      } else {
        Alert.alert("Sign up failed", res.error || "Unable to register");
      }
    })();
  }

  if (isCheckingAuth) return null;

  React.useEffect(() => {
    if (!token && !isCheckingAuth) return;
    const id = setTimeout(() => {
      if (token && !isCheckingAuth) router.replace("/(tabs)/Home");
    }, 50);
    return () => clearTimeout(id);
  }, [token, isCheckingAuth, router]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <LinearGradient colors={["#0F3460", "#000000"]} style={styles.container}>
      <View style={styles.particlesWrap} pointerEvents="none">
        {/* denser, more abrupt particle placement for a lively background */}
        <View style={[styles.particle, { left: "6%", top: "18%", width: 6, height: 6, opacity: 0.9 }]} />
        <View style={[styles.particle, { left: "18%", top: "10%", width: 10, height: 10, opacity: 0.75 }]} />
        <View style={[styles.particle, { left: "28%", top: "22%", width: 8, height: 8, opacity: 0.6 }]} />
        <View style={[styles.particle, { left: "38%", top: "8%", width: 14, height: 14, opacity: 0.95 }]} />
        <View style={[styles.particle, { left: "46%", top: "26%", width: 10, height: 10, opacity: 0.7 }]} />
        <View style={[styles.particle, { left: "52%", top: "16%", width: 12, height: 12, opacity: 0.85 }]} />
        <View style={[styles.particle, { left: "60%", top: "6%", width: 6, height: 6, opacity: 0.5 }]} />
        <View style={[styles.particle, { left: "68%", top: "20%", width: 18, height: 18, opacity: 1 }]} />
        <View style={[styles.particle, { left: "78%", top: "14%", width: 8, height: 8, opacity: 0.8 }]} />
        <View style={[styles.particle, { left: "86%", top: "24%", width: 6, height: 6, opacity: 0.6 }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "center" }}
      >
        <View style={styles.logoWrap}>
          <Image source={require("../../assets/images/logo.png")} style={styles.logoImage} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join NeuroTunes — your gateway to focused soundscapes</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.textPrimary} style={styles.inputIcon} />
              <TextInput
                placeholder="Your username"
                placeholderTextColor="rgba(255,255,255,0.6)"
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
            {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textPrimary} style={styles.inputIcon} />
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
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textPrimary} style={styles.inputIcon} />
              <TextInput
                placeholder="Create a password"
                placeholderTextColor="rgba(255,255,255,0.6)"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={securePwd}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setSecurePwd((s) => !s)} style={styles.eyeIcon}>
                <Ionicons name={securePwd ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textPrimary} style={styles.inputIcon} />
              <TextInput
                placeholder="Confirm password"
                placeholderTextColor="rgba(255,255,255,0.6)"
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={secureConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setSecureConfirm((s) => !s)} style={styles.eyeIcon}>
                <Ionicons name={secureConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            {errors.confirm ? <Text style={styles.errorText}>{errors.confirm}</Text> : null}
          </View>

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={handleSignup}
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
                  <Text style={styles.buttonText}>Sign Up</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/(auth)" style={styles.link}>
              Login
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
    </KeyboardAvoidingView>
  );
}