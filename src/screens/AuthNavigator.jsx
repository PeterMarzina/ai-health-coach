/**
 * AuthNavigator.jsx
 * All 6 screens from AI Coach design:
 *  1. Splash
 *  2. Onboarding
 *  3. Log In
 *  4. Create Account
 *  5. Reset Password
 *  6. Set New Password
 */

import { useState } from "react";
import {
  Alert,
  Dimensions,
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

// ─── Constants ────────────────────────────────────────────────────────────────
const { width, height } = Dimensions.get("window");

const C = {
  bg: "#0A0A0A",
  card: "#141414",
  border: "#242424",
  green: "#4ADE80",
  greenDim: "#1A3A26",
  white: "#FFFFFF",
  gray: "#888888",
  grayDim: "#444444",
  red: "#F87171",
};

const SCREENS = {
  SPLASH: "SPLASH",
  ONBOARDING: "ONBOARDING",
  LOGIN: "LOGIN",
  REGISTER: "REGISTER",
  RESET: "RESET",
  SET_PASSWORD: "SET_PASSWORD",
};

// ─── Shared Components ────────────────────────────────────────────────────────

function BackButton({ onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={s.backBtn}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Text style={s.backArrow}>←</Text>
    </TouchableOpacity>
  );
}

function AuthInput({
  iconChar,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  showPass,
  onTogglePass,
  autoCapitalize = "none",
}) {
  return (
    <View style={s.inputRow}>
      <Text style={s.inputIcon}>{iconChar}</Text>
      <TextInput
        style={s.inputField}
        placeholder={placeholder}
        placeholderTextColor={C.grayDim}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !showPass}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize}
      />
      {secureTextEntry && (
        <TouchableOpacity onPress={onTogglePass}>
          <Text style={s.eyeIcon}>{showPass ? "○" : "●"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[s.primaryBtn, disabled && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={s.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function GhostButton({ label, onPress }) {
  return (
    <TouchableOpacity style={s.ghostBtn} onPress={onPress}>
      <Text style={s.ghostBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function SocialButton({ label, iconChar }) {
  return (
    <TouchableOpacity style={s.socialBtn}>
      <Text style={s.socialIcon}>{iconChar}</Text>
      <Text style={s.socialLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function OrDivider() {
  return (
    <View style={s.dividerRow}>
      <View style={s.dividerLine} />
      <Text style={s.dividerLabel}>or continue with</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

function PasswordRules({ password }) {
  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Include a number", ok: /\d/.test(password) },
    { label: "Include an uppercase letter", ok: /[A-Z]/.test(password) },
  ];
  return (
    <View style={s.rulesList}>
      {rules.map((r) => (
        <Text key={r.label} style={[s.ruleItem, r.ok && s.ruleOk]}>
          {r.ok ? "✓" : "·"} {r.label}
        </Text>
      ))}
    </View>
  );
}

function LogoMark({ size = 56 }) {
  return (
    <View
      style={[
        s.logoCircle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[s.logoTriangle, { fontSize: size * 0.38 }]}>▲</Text>
    </View>
  );
}

// ─── Screen 1 · Splash ────────────────────────────────────────────────────────
function SplashScreen({ onNavigate }) {
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      {/* Hero area */}
      <View style={s.splashHero}>
        {/* Stylised wireframe human — geometric rings */}
        <View style={s.wireframeWrap}>
          {[110, 86, 64, 44].map((d, i) => (
            <View
              key={i}
              style={[
                s.wireframeRing,
                {
                  width: d,
                  height: d,
                  borderRadius: d / 2,
                  opacity: 1 - i * 0.18,
                  position: "absolute",
                  top: i * 14,
                },
              ]}
            />
          ))}
          {/* Vertical body lines */}
          <View style={s.wireframeBodyLine} />
          <View style={[s.wireframeBodyLine, { left: "52%" }]} />
          {/* Shoulder line */}
          <View style={s.wireframeShoulderLine} />
        </View>

        {/* Logo below wireframe */}
        <LogoMark size={68} />
      </View>

      {/* Text block */}
      <View style={s.splashText}>
        <Text style={s.splashH1}>Your habits.{"\n"}Your health.</Text>
        <Text style={s.splashGreen}>Your best self.</Text>
        <Text style={s.splashSub}>
          Track. Train. Transform.{"\n"}All in one place.
        </Text>
      </View>

      {/* Dot indicators */}
      <View style={s.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[s.dot, i === 0 && s.dotActive]} />
        ))}
      </View>

      {/* Actions */}
      <View style={s.splashActions}>
        <PrimaryButton
          label="Create Account"
          onPress={() => onNavigate(SCREENS.ONBOARDING)}
        />
        <GhostButton label="Log In" onPress={() => onNavigate(SCREENS.LOGIN)} />
      </View>
    </SafeAreaView>
  );
}

// ─── Screen 2 · Onboarding ────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "📊",
    bg: "#0F2A1A",
    title: "Smart Tracking",
    desc: "Track your workouts, nutrition, sleep and more.",
  },
  {
    icon: "🎯",
    bg: "#0F1F2A",
    title: "Personalized Coaching",
    desc: "Get AI-powered insights and custom plans.",
  },
  {
    icon: "🔥",
    bg: "#2A1A0F",
    title: "Build Better Habits",
    desc: "Stay consistent and achieve lasting results.",
  },
];

function OnboardingScreen({ onNavigate }) {
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.onboardScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.onboardHeader}>
          <LogoMark size={64} />
          <Text style={s.onboardWelcome}>Welcome to</Text>
          <Text style={s.onboardBrand}>AI Coach</Text>
          <Text style={s.onboardSub}>
            Your personal health{"\n"}and fitness companion.
          </Text>
        </View>

        <View style={s.featureList}>
          {FEATURES.map((f) => (
            <View key={f.title} style={s.featureCard}>
              <View style={[s.featureIconWrap, { backgroundColor: f.bg }]}>
                <Text style={s.featureIcon}>{f.icon}</Text>
              </View>
              <View style={s.featureText}>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.onboardActions}>
          <PrimaryButton
            label="Create Account"
            onPress={() => onNavigate(SCREENS.REGISTER)}
          />
          <GhostButton
            label="Log In"
            onPress={() => onNavigate(SCREENS.LOGIN)}
          />
        </View>

        <Text style={s.termsText}>
          By continuing, you agree to our{" "}
          <Text style={s.termsLink}>Terms of Use</Text> and{" "}
          <Text style={s.termsLink}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Screen 3 · Log In ────────────────────────────────────────────────────────
function LoginScreen({ onNavigate }) {
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
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.formScroll}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton onPress={() => onNavigate(SCREENS.ONBOARDING)} />

          <Text style={s.formTitle}>Log In</Text>
          <Text style={s.formSub}>
            Welcome back! Please log in to continue.
          </Text>

          <View style={s.form}>
            <AuthInput
              iconChar="✉"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <AuthInput
              iconChar="🔒"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              showPass={showPass}
              onTogglePass={() => setShowPass((p) => !p)}
            />

            <TouchableOpacity
              onPress={() => onNavigate(SCREENS.RESET)}
              style={s.forgotRow}
            >
              <Text style={s.forgotLink}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? <Text style={s.errorMsg}>{error}</Text> : null}

            <PrimaryButton
              label={loading ? "Logging in…" : "Log In"}
              onPress={handleLogin}
              disabled={loading}
            />
            <OrDivider />
            <SocialButton label="Google" iconChar="G" />
            <SocialButton label="Apple" iconChar="" />

            <View style={s.switchRow}>
              <Text style={s.switchText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => onNavigate(SCREENS.REGISTER)}>
                <Text style={s.switchLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Screen 4 · Create Account ────────────────────────────────────────────────
function RegisterScreen({ onNavigate }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await signUp(email, password);
    if (error) setError(error.message);
    else Alert.alert("Success", "Check your email to confirm your account!");
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.formScroll}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton onPress={() => onNavigate(SCREENS.LOGIN)} />

          <Text style={s.formTitle}>Create Account</Text>
          <Text style={s.formSub}>
            Let's get started on your health journey.
          </Text>

          <View style={s.form}>
            <AuthInput
              iconChar="👤"
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <AuthInput
              iconChar="✉"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <AuthInput
              iconChar="🔒"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              showPass={showPass}
              onTogglePass={() => setShowPass((p) => !p)}
            />
            <AuthInput
              iconChar="🔒"
              placeholder="Confirm Password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              showPass={showConf}
              onTogglePass={() => setShowConf((p) => !p)}
            />

            <PasswordRules password={password} />

            {error ? <Text style={s.errorMsg}>{error}</Text> : null}

            <PrimaryButton
              label={loading ? "Creating…" : "Create Account"}
              onPress={handleRegister}
              disabled={loading}
            />
            <OrDivider />
            <SocialButton label="Google" iconChar="G" />
            <SocialButton label="Apple" iconChar="" />

            <View style={s.switchRow}>
              <Text style={s.switchText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => onNavigate(SCREENS.LOGIN)}>
                <Text style={s.switchLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Screen 5 · Reset Password ────────────────────────────────────────────────
function ResetScreen({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900)); // swap with real reset call
    setSent(true);
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[s.formScroll, s.centeredScroll]}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton onPress={() => onNavigate(SCREENS.LOGIN)} />

          <View style={s.iconBlock}>
            <View style={s.iconCircle}>
              <Text style={s.iconLarge}>🔏</Text>
            </View>
          </View>

          <Text style={[s.formTitle, s.textCenter]}>Reset Password</Text>
          <Text style={[s.formSub, s.textCenter]}>
            Enter your email address and we'll send you a link to reset your
            password.
          </Text>

          <View style={s.form}>
            <AuthInput
              iconChar="✉"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            {sent && (
              <Text style={s.successMsg}>
                Reset link sent! Check your inbox.
              </Text>
            )}

            <PrimaryButton
              label={loading ? "Sending…" : "Send Reset Link"}
              onPress={handleSend}
              disabled={loading || sent}
            />

            <TouchableOpacity
              onPress={() => onNavigate(SCREENS.LOGIN)}
              style={s.backLinkRow}
            >
              <Text style={s.switchLink}>Back to Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Screen 6 · Set New Password ─────────────────────────────────────────────
function SetPasswordScreen({ onNavigate }) {
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    if (newPass !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 900)); // swap with real update call
    setDone(true);
    setLoading(false);
    setTimeout(() => onNavigate(SCREENS.LOGIN), 1400);
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[s.formScroll, s.centeredScroll]}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton onPress={() => onNavigate(SCREENS.RESET)} />

          <View style={s.iconBlock}>
            <View style={s.iconCircle}>
              <Text style={s.iconLarge}>🔐</Text>
              <View style={s.checkBadge}>
                <Text style={s.checkMark}>✓</Text>
              </View>
            </View>
          </View>

          <Text style={[s.formTitle, s.textCenter]}>Set New Password</Text>
          <Text style={[s.formSub, s.textCenter]}>
            Enter your new password below.
          </Text>

          <View style={s.form}>
            <AuthInput
              iconChar="🔒"
              placeholder="New Password"
              value={newPass}
              onChangeText={setNewPass}
              secureTextEntry
              showPass={showNew}
              onTogglePass={() => setShowNew((p) => !p)}
            />
            <AuthInput
              iconChar="🔒"
              placeholder="Confirm New Password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              showPass={showConf}
              onTogglePass={() => setShowConf((p) => !p)}
            />

            <PasswordRules password={newPass} />

            {error && <Text style={s.errorMsg}>{error}</Text>}
            {done && (
              <Text style={s.successMsg}>Password updated! Redirecting…</Text>
            )}

            <PrimaryButton
              label={loading ? "Saving…" : "Reset Password"}
              onPress={handleReset}
              disabled={loading || done}
            />

            <TouchableOpacity
              onPress={() => onNavigate(SCREENS.LOGIN)}
              style={s.backLinkRow}
            >
              <Text style={s.switchLink}>Back to Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
export default function AuthNavigator() {
  const [screen, setScreen] = useState(SCREENS.SPLASH);

  const nav = (s) => setScreen(s);

  return (
    <>
      {screen === SCREENS.SPLASH && <SplashScreen onNavigate={nav} />}
      {screen === SCREENS.ONBOARDING && <OnboardingScreen onNavigate={nav} />}
      {screen === SCREENS.LOGIN && <LoginScreen onNavigate={nav} />}
      {screen === SCREENS.REGISTER && <RegisterScreen onNavigate={nav} />}
      {screen === SCREENS.RESET && <ResetScreen onNavigate={nav} />}
      {screen === SCREENS.SET_PASSWORD && (
        <SetPasswordScreen onNavigate={nav} />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Splash ──────────────────────────────────────
  splashHero: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 24,
    height: height * 0.42,
    justifyContent: "flex-end",
  },
  wireframeWrap: {
    width: 120,
    height: 160,
    alignItems: "center",
    marginBottom: 24,
  },
  wireframeRing: {
    borderWidth: 1.5,
    borderColor: C.green,
    alignSelf: "center",
  },
  wireframeBodyLine: {
    position: "absolute",
    bottom: 0,
    left: "46%",
    width: 1.5,
    height: 70,
    backgroundColor: C.green,
    opacity: 0.5,
  },
  wireframeShoulderLine: {
    position: "absolute",
    bottom: 55,
    width: 90,
    height: 1.5,
    backgroundColor: C.green,
    opacity: 0.5,
  },
  splashText: {
    paddingHorizontal: 28,
  },
  splashH1: {
    color: C.white,
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 42,
  },
  splashGreen: {
    color: C.green,
    fontSize: 34,
    fontWeight: "700",
    marginBottom: 14,
  },
  splashSub: {
    color: C.gray,
    fontSize: 15,
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.grayDim,
  },
  dotActive: {
    backgroundColor: C.green,
    width: 24,
  },
  splashActions: {
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 32,
  },

  // ── Onboarding ──────────────────────────────────
  onboardScroll: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 36,
  },
  onboardHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  onboardWelcome: {
    color: C.white,
    fontSize: 22,
    fontWeight: "500",
    marginTop: 16,
  },
  onboardBrand: {
    color: C.green,
    fontSize: 26,
    fontWeight: "700",
  },
  onboardSub: {
    color: C.gray,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  featureList: {
    gap: 12,
    marginBottom: 28,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 14,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureIcon: { fontSize: 22 },
  featureText: { flex: 1 },
  featureTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  featureDesc: {
    color: C.gray,
    fontSize: 13,
    lineHeight: 18,
  },
  onboardActions: {
    gap: 12,
    marginBottom: 20,
  },
  termsText: {
    color: C.gray,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: C.green,
  },

  // ── Form screens (Login / Register / Reset) ──────
  formScroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  centeredScroll: {
    alignItems: "stretch",
  },
  backBtn: {
    marginBottom: 28,
    width: 36,
  },
  backArrow: {
    color: C.white,
    fontSize: 24,
  },
  formTitle: {
    color: C.white,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  formSub: {
    color: C.gray,
    fontSize: 14,
    marginBottom: 28,
    lineHeight: 20,
  },
  textCenter: {
    textAlign: "center",
  },
  form: {
    gap: 12,
  },

  // ── Input ───────────────────────────────────────
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  inputIcon: {
    fontSize: 15,
    marginRight: 10,
    color: C.gray,
    width: 20,
    textAlign: "center",
  },
  inputField: {
    flex: 1,
    color: C.white,
    fontSize: 15,
  },
  eyeIcon: {
    color: C.gray,
    fontSize: 12,
    paddingLeft: 8,
  },

  // ── Buttons ─────────────────────────────────────
  primaryBtn: {
    backgroundColor: C.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  ghostBtn: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 16,
    alignItems: "center",
  },
  ghostBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: "500",
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 15,
    gap: 10,
  },
  socialIcon: {
    color: C.white,
    fontSize: 17,
    fontWeight: "700",
    width: 22,
    textAlign: "center",
  },
  socialLabel: {
    color: C.white,
    fontSize: 15,
    fontWeight: "500",
  },

  // ── Divider ─────────────────────────────────────
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerLabel: {
    color: C.gray,
    fontSize: 12,
    marginHorizontal: 12,
  },

  // ── Forgot / switch ──────────────────────────────
  forgotRow: {
    alignItems: "flex-end",
    marginTop: -4,
  },
  forgotLink: {
    color: C.green,
    fontSize: 13,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  switchText: {
    color: C.gray,
    fontSize: 13,
  },
  switchLink: {
    color: C.green,
    fontSize: 13,
    fontWeight: "600",
  },
  backLinkRow: {
    alignItems: "center",
    paddingTop: 4,
  },

  // ── Password rules ───────────────────────────────
  rulesList: {
    gap: 5,
    marginTop: 2,
  },
  ruleItem: {
    color: C.gray,
    fontSize: 12,
  },
  ruleOk: {
    color: C.green,
  },

  // ── Error / success ──────────────────────────────
  errorMsg: {
    color: C.red,
    fontSize: 13,
    marginTop: 2,
  },
  successMsg: {
    color: C.green,
    fontSize: 13,
    marginTop: 2,
  },

  // ── Logo mark ────────────────────────────────────
  logoCircle: {
    borderWidth: 2,
    borderColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  logoTriangle: {
    color: C.green,
    fontWeight: "700",
  },

  // ── Icon block (reset screens) ───────────────────
  iconBlock: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLarge: {
    fontSize: 38,
  },
  checkBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: "#000",
    fontSize: 13,
    fontWeight: "700",
  },
});
