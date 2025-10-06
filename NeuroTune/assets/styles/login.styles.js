// styles/login.styles.js
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
    top: "20%",
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: "rgba(0,187,249,0.14)",
    shadowColor: "#00BBF9",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 16,
    zIndex: 2,
    // make a fixed container so the image can be cropped to a circle
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    justifyContent: "center",
    alignSelf: "center",
  },
  // image logo (fills container)
  logo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    marginBottom: 0,
    // scale the image to zoom in and crop edges inside the circular wrapper
    transform: [{ scale: 2 }],
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
    zIndex: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#00E5FF",
    marginBottom: 6,
    // prefer Inter or Poppins if available
    fontFamily: "Inter-Black",
    textShadowColor: "rgba(0,229,255,0.28)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    fontFamily: "Inter-Regular",
  },
  formContainer: {
    marginTop: 10,
    zIndex: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,187,249,0.14)",
    paddingHorizontal: 12,
    height: 56,
    // soft glass effect
    shadowColor: "rgba(0,187,249,0.12)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
    // glow for icon
    shadowColor: "#00BBF9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  input: {
    flex: 1,
    color: COLORS.white,
    height: 56,
    fontSize: 15,
    paddingRight: 48, // space for eye icon
    fontFamily: "Inter-Regular",
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    height: 52,
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
    // soft glow
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
    fontFamily: "Inter-SemiBold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.9)",
    marginRight: 6,
    fontFamily: "Inter-Regular",
  },
  link: {
    color: "#00E5FF",
    fontWeight: "700",
    fontFamily: "Inter-SemiBold",
  },
});

export default styles;