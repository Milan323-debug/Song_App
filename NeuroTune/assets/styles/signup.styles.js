// styles/signup.styles.js
import { StyleSheet, Dimensions } from "react-native";
import COLORS from "../../constants/colors";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  particlesWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  particle: {
    position: "absolute",
    top: "18%",
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: "rgba(0,187,249,0.12)",
    shadowColor: "#00BBF9",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 12,
    zIndex: 2,
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    justifyContent: "center",
    alignSelf: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    marginBottom: 0,
    transform: [{ scale: 2 }],
  },
  header: {
    alignItems: "center",
    marginBottom: 18,
    zIndex: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 6,
    fontFamily: "JetBrainsMono-Medium",
    textShadowColor: "rgba(0,187,249,0.25)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  formContainer: {
    marginTop: 8,
    zIndex: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,187,249,0.12)",
    paddingHorizontal: 12,
    height: 54,
    shadowColor: "rgba(0,187,249,0.12)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  inputIcon: {
    marginRight: 12,
    shadowColor: "#00BBF9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  input: {
    flex: 1,
    color: COLORS.white,
    height: 54,
    fontSize: 15,
    paddingRight: 48,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#FF6B6B",
    marginTop: 6,
    fontSize: 13,
  },
  button: {
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    shadowColor: "rgba(0,187,249,0.28)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 6,
  },
  buttonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.8)",
    marginRight: 6,
  },
  link: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});

export default styles;