import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { signIn, signUp } from "../services/auth";

// ─── Icons (inline SVG-style via Text — swap with lucide-react-native if available) ───
const EmailIcon = () => <Text style={styles.inputIcon}>✉</Text>;
const LockIcon = () => <Text style={styles.inputIcon}>🔒</Text>;
const EyeIcon = ({ show }) => (
  <Text style={styles.eyeIcon}>{show ? "👁" : "🙈"}</Text>
);
const UserIcon = () => <Text style={styles.inputIcon}>👤</Text>;

// ─── Screens ─────────────────────────────────────────────────────────────────
const SCREENS = {
  LOGIN: "LOGIN",
  REGISTER: "REGISTER",
  FORGOT: "FORGOT",
};

// ─── Reusable Input ───────────────────────────────────────────────────────────
function AuthInput({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  onToggleSecure,
  showSecure,
}) {
  return (
    <View style={styles.inputWrapper}>
      {icon}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#555"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !showSecure}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
      {secureTextEntry && (
        <TouchableOpacity onPress={onToggleSecure}>
          <EyeIcon show={showSecure} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Social Button ────────────────────────────────────────────────────────────
function SocialButton({ label, emoji }) {
  return (
    <TouchableOpacity style={styles.socialBtn}>
      <Text style={styles.socialEmoji}>{emoji}</Text>
      <Text style={styles.socialLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or continue with</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <View style={styles.logoCircle}>
      <Text style={styles.logoText}>▲</Text>
    </View>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginView({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.backBtn} onPress={() => {}}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Log In</Text>
      <Text style={styles.screenSubtitle}>
        Welcome back! Please log in to continue.
      </Text>

      <View style={styles.form}>
        <AuthInput
          icon={<EmailIcon />}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <AuthInput
          icon={<LockIcon />}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          showSecure={showPass}
          onToggleSecure={() => setShowPass((p) => !p)}
        />

        <TouchableOpacity
          onPress={() => onNavigate(SCREENS.FORGOT)}
          style={styles.forgotRow}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>
            {loading ? "Logging in..." : "Log In"}
          </Text>
        </TouchableOpacity>

        <Divider />
        <SocialButton label="Google" emoji="G" />
        <SocialButton label="Apple" emoji="" />

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => onNavigate(SCREENS.REGISTER)}>
            <Text style={styles.switchLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

// ─── REGISTER SCREEN ──────────────────────────────────────────────────────────
function RegisterView({ onNavigate }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Include a number", ok: /\d/.test(password) },
    { label: "Include an uppercase letter", ok: /[A-Z]/.test(password) },
  ];

  const handleRegister = async () => {
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await signUp(email, password);
    if (error) setError(error.message);
    else Alert.alert("Check your email to confirm your account!");
    setLoading(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => onNavigate(SCREENS.LOGIN)}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Create Account</Text>
      <Text style={styles.screenSubtitle}>
        Let's get started on your health journey.
      </Text>

      <View style={styles.form}>
        <AuthInput
          icon={<UserIcon />}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />
        <AuthInput
          icon={<EmailIcon />}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <AuthInput
          icon={<LockIcon />}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          showSecure={showPass}
          onToggleSecure={() => setShowPass((p) => !p)}
        />
        <AuthInput
          icon={<LockIcon />}
          placeholder="Confirm Password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          showSecure={showConf}
          onToggleSecure={() => setShowConf((p) => !p)}
        />

        <View style={styles.rulesList}>
          {rules.map((r) => (
            <Text
              key={r.label}
              style={[styles.ruleText, r.ok && styles.ruleOk]}
            >
              {r.ok ? "✓" : "·"} {r.label}
            </Text>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>
            {loading ? "Creating..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        <Divider />
        <SocialButton label="Google" emoji="G" />
        <SocialButton label="Apple" emoji="" />

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => onNavigate(SCREENS.LOGIN)}>
            <Text style={styles.switchLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

// ─── FORGOT PASSWORD SCREEN ───────────────────────────────────────────────────
function ForgotView({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000)); // replace with real reset call
    setSent(true);
    setLoading(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => onNavigate(SCREENS.LOGIN)}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <View style={styles.centeredSection}>
        <View style={styles.lockCircle}>
          <Text style={styles.lockIcon}>🔏</Text>
        </View>
        <Text style={styles.screenTitle}>Reset Password</Text>
        <Text style={styles.screenSubtitle}>
          Enter your email address and we'll send you a link to reset your
          password.
        </Text>
      </View>

      <View style={styles.form}>
        <AuthInput
          icon={<EmailIcon />}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        {sent && (
          <Text style={styles.successText}>
            Reset link sent! Check your email.
          </Text>
        )}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onNavigate(SCREENS.LOGIN)}
          style={styles.backLinkRow}
        >
          <Text style={styles.switchLink}>Back to Log In</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [screen, setScreen] = useState(SCREENS.LOGIN);

  const navigate = (s) => setScreen(s);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {screen === SCREENS.LOGIN && <LoginView onNavigate={navigate} />}
          {screen === SCREENS.REGISTER && (
            <RegisterView onNavigate={navigate} />
          )}
          {screen === SCREENS.FORGOT && <ForgotView onNavigate={navigate} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const GREEN = "#4ADE80"; // neon green accent
const BG = "#0A0A0A"; // near-black background
const CARD = "#161616"; // input / card background
const BORDER = "#2A2A2A"; // subtle border
const WHITE = "#FFFFFF";
const GRAY = "#888888";

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // Back button
  backBtn: { marginBottom: 24 },
  backArrow: { color: WHITE, fontSize: 22 },

  // Titles
  screenTitle: {
    color: WHITE,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  screenSubtitle: {
    color: GRAY,
    fontSize: 14,
    marginBottom: 32,
    lineHeight: 20,
  },

  // Form wrapper
  form: { gap: 12 },

  // Input
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
    color: GRAY,
  },
  input: {
    flex: 1,
    color: WHITE,
    fontSize: 15,
  },
  eyeIcon: {
    fontSize: 16,
    color: GRAY,
  },

  // Forgot
  forgotRow: { alignItems: "flex-end", marginTop: -4 },
  forgotText: { color: GREEN, fontSize: 13 },

  // Error / success
  errorText: { color: "#F87171", fontSize: 13, marginTop: 4 },
  successText: { color: GREEN, fontSize: 13, marginTop: 4 },

  // Primary button
  primaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { color: GRAY, fontSize: 12, marginHorizontal: 12 },

  // Social
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    gap: 10,
  },
  socialEmoji: { fontSize: 18 },
  socialLabel: { color: WHITE, fontSize: 15, fontWeight: "500" },

  // Switch row
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  switchText: { color: GRAY, fontSize: 13 },
  switchLink: { color: GREEN, fontSize: 13, fontWeight: "600" },

  // Password rules
  rulesList: { gap: 4, marginTop: 2 },
  ruleText: { color: GRAY, fontSize: 12 },
  ruleOk: { color: GREEN },

  // Logo (onboarding)
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: { color: GREEN, fontSize: 26, fontWeight: "700" },

  // Lock icon (forgot pw)
  centeredSection: { alignItems: "center", marginBottom: 8 },
  lockCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  lockIcon: { fontSize: 32 },
  backLinkRow: { alignItems: "center", marginTop: 8 },
});
