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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { signIn, signUp } from "../services/auth";

// ─── Constants ────────────────────────────────────────────────────────────────
const { height } = Dimensions.get("window");

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
      className="mb-7 w-9"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Text className="text-2xl text-white">←</Text>
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
    <View className="flex-row items-center rounded-xl border border-line-deep bg-surface-deep px-3.5 py-[15px]">
      <Text className="mr-2.5 w-5 text-center text-[15px] text-muted">
        {iconChar}
      </Text>
      <TextInput
        className="flex-1 text-[15px] text-white"
        placeholder={placeholder}
        placeholderTextColor="#444444"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !showPass}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize}
      />
      {secureTextEntry && (
        <TouchableOpacity onPress={onTogglePass}>
          <Text className="pl-2 text-xs text-muted">
            {showPass ? "○" : "●"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      className={`items-center rounded-[14px] bg-accent py-4 ${disabled ? "opacity-60" : ""}`}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className="text-base font-bold text-black">{label}</Text>
    </TouchableOpacity>
  );
}

function GhostButton({ label, onPress }) {
  return (
    <TouchableOpacity
      className="items-center rounded-[14px] border border-line-deep bg-surface-deep py-4"
      onPress={onPress}
    >
      <Text className="text-base font-medium text-white">{label}</Text>
    </TouchableOpacity>
  );
}

function SocialButton({ label, iconChar }) {
  return (
    <TouchableOpacity className="flex-row items-center justify-center gap-2.5 rounded-[14px] border border-line-deep bg-surface-deep py-[15px]">
      <Text className="w-[22px] text-center text-[17px] font-bold text-white">
        {iconChar}
      </Text>
      <Text className="text-[15px] font-medium text-white">{label}</Text>
    </TouchableOpacity>
  );
}

function OrDivider() {
  return (
    <View className="my-0.5 flex-row items-center">
      <View className="h-px flex-1 bg-line-deep" />
      <Text className="mx-3 text-xs text-muted">or continue with</Text>
      <View className="h-px flex-1 bg-line-deep" />
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
    <View className="mt-0.5 gap-[5px]">
      {rules.map((r) => (
        <Text
          key={r.label}
          className={`text-xs ${r.ok ? "text-accent" : "text-muted"}`}
        >
          {r.ok ? "✓" : "·"} {r.label}
        </Text>
      ))}
    </View>
  );
}

function LogoMark({ size = 56 }) {
  return (
    <View
      className="items-center justify-center border-2 border-accent"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="font-bold text-accent" style={{ fontSize: size * 0.38 }}>
        ▲
      </Text>
    </View>
  );
}

// ─── Screen 1 · Splash ────────────────────────────────────────────────────────
function SplashScreen({ onNavigate }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Hero area */}
      <View
        className="items-center justify-end pb-6 pt-10"
        style={{ height: height * 0.42 }}
      >
        {/* Stylised wireframe human — geometric rings */}
        <View className="mb-6 h-40 w-[120px] items-center">
          {[110, 86, 64, 44].map((d, i) => (
            <View
              key={i}
              className="absolute self-center border-[1.5px] border-accent"
              style={{
                width: d,
                height: d,
                borderRadius: d / 2,
                opacity: 1 - i * 0.18,
                top: i * 14,
              }}
            />
          ))}
          {/* Vertical body lines */}
          <View className="absolute bottom-0 left-[46%] h-[70px] w-[1.5px] bg-accent opacity-50" />
          <View className="absolute bottom-0 left-[52%] h-[70px] w-[1.5px] bg-accent opacity-50" />
          {/* Shoulder line */}
          <View className="absolute bottom-[55px] h-[1.5px] w-[90px] bg-accent opacity-50" />
        </View>

        {/* Logo below wireframe */}
        <LogoMark size={68} />
      </View>

      {/* Text block */}
      <View className="px-7">
        <Text className="text-[34px] font-bold leading-[42px] text-white">
          Your habits.{"\n"}Your health.
        </Text>
        <Text className="mb-3.5 text-[34px] font-bold text-accent">
          Your best self.
        </Text>
        <Text className="text-[15px] leading-[22px] text-muted">
          Track. Train. Transform.{"\n"}All in one place.
        </Text>
      </View>

      {/* Dot indicators */}
      <View className="my-6 flex-row justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className={`h-2 rounded-full ${i === 0 ? "w-6 bg-accent" : "w-2 bg-muted-dim"}`}
          />
        ))}
      </View>

      {/* Actions */}
      <View className="gap-3 px-6 pb-8">
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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="px-6 pt-10 pb-9"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8 items-center">
          <LogoMark size={64} />
          <Text className="mt-4 text-[22px] font-medium text-white">
            Welcome to
          </Text>
          <Text className="text-[26px] font-bold text-accent">AI Coach</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-muted">
            Your personal health{"\n"}and fitness companion.
          </Text>
        </View>

        <View className="mb-7 gap-3">
          {FEATURES.map((f) => (
            <View
              key={f.title}
              className="flex-row items-center gap-3.5 rounded-[14px] border border-line-deep bg-surface-deep p-4"
            >
              <View
                className="h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: f.bg }}
              >
                <Text className="text-[22px]">{f.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-[15px] font-semibold text-white">
                  {f.title}
                </Text>
                <Text className="text-[13px] leading-[18px] text-muted">
                  {f.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View className="mb-5 gap-3">
          <PrimaryButton
            label="Create Account"
            onPress={() => onNavigate(SCREENS.REGISTER)}
          />
          <GhostButton
            label="Log In"
            onPress={() => onNavigate(SCREENS.LOGIN)}
          />
        </View>

        <Text className="text-center text-xs leading-[18px] text-muted">
          By continuing, you agree to our{" "}
          <Text className="text-accent">Terms of Use</Text> and{" "}
          <Text className="text-accent">Privacy Policy</Text>.
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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pt-5 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          <BackButton onPress={() => onNavigate(SCREENS.ONBOARDING)} />

          <Text className="mb-2 text-[28px] font-bold text-white">Log In</Text>
          <Text className="mb-7 text-sm leading-5 text-muted">
            Welcome back! Please log in to continue.
          </Text>

          <View className="gap-3">
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
              className="-mt-1 items-end"
            >
              <Text className="text-[13px] text-accent">Forgot password?</Text>
            </TouchableOpacity>

            {error ? (
              <Text className="mt-0.5 text-[13px] text-danger">{error}</Text>
            ) : null}

            <PrimaryButton
              label={loading ? "Logging in…" : "Log In"}
              onPress={handleLogin}
              disabled={loading}
            />
            <OrDivider />
            <SocialButton label="Google" iconChar="G" />
            <SocialButton label="Apple" iconChar="" />

            <View className="mt-1 flex-row justify-center">
              <Text className="text-[13px] text-muted">
                Don't have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => onNavigate(SCREENS.REGISTER)}>
                <Text className="text-[13px] font-semibold text-accent">
                  Register
                </Text>
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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pt-5 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          <BackButton onPress={() => onNavigate(SCREENS.LOGIN)} />

          <Text className="mb-2 text-[28px] font-bold text-white">
            Create Account
          </Text>
          <Text className="mb-7 text-sm leading-5 text-muted">
            Let's get started on your health journey.
          </Text>

          <View className="gap-3">
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

            {error ? (
              <Text className="mt-0.5 text-[13px] text-danger">{error}</Text>
            ) : null}

            <PrimaryButton
              label={loading ? "Creating…" : "Create Account"}
              onPress={handleRegister}
              disabled={loading}
            />
            <OrDivider />
            <SocialButton label="Google" iconChar="G" />
            <SocialButton label="Apple" iconChar="" />

            <View className="mt-1 flex-row justify-center">
              <Text className="text-[13px] text-muted">
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => onNavigate(SCREENS.LOGIN)}>
                <Text className="text-[13px] font-semibold text-accent">
                  Log In
                </Text>
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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow items-stretch px-6 pt-5 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          <BackButton onPress={() => onNavigate(SCREENS.LOGIN)} />

          <View className="mb-5 items-center">
            <View className="h-[90px] w-[90px] items-center justify-center rounded-full border border-line-deep bg-surface-deep">
              <Text className="text-[38px]">🔏</Text>
            </View>
          </View>

          <Text className="mb-2 text-center text-[28px] font-bold text-white">
            Reset Password
          </Text>
          <Text className="mb-7 text-center text-sm leading-5 text-muted">
            Enter your email address and we'll send you a link to reset your
            password.
          </Text>

          <View className="gap-3">
            <AuthInput
              iconChar="✉"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            {sent && (
              <Text className="mt-0.5 text-[13px] text-accent">
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
              className="items-center pt-1"
            >
              <Text className="text-[13px] font-semibold text-accent">
                Back to Log In
              </Text>
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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow items-stretch px-6 pt-5 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          <BackButton onPress={() => onNavigate(SCREENS.RESET)} />

          <View className="mb-5 items-center">
            <View className="h-[90px] w-[90px] items-center justify-center rounded-full border border-line-deep bg-surface-deep">
              <Text className="text-[38px]">🔐</Text>
              <View className="absolute bottom-0.5 right-0.5 h-6 w-6 items-center justify-center rounded-full bg-accent">
                <Text className="text-[13px] font-bold text-black">✓</Text>
              </View>
            </View>
          </View>

          <Text className="mb-2 text-center text-[28px] font-bold text-white">
            Set New Password
          </Text>
          <Text className="mb-7 text-center text-sm leading-5 text-muted">
            Enter your new password below.
          </Text>

          <View className="gap-3">
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

            {error && (
              <Text className="mt-0.5 text-[13px] text-danger">{error}</Text>
            )}
            {done && (
              <Text className="mt-0.5 text-[13px] text-accent">
                Password updated! Redirecting…
              </Text>
            )}

            <PrimaryButton
              label={loading ? "Saving…" : "Reset Password"}
              onPress={handleReset}
              disabled={loading || done}
            />

            <TouchableOpacity
              onPress={() => onNavigate(SCREENS.LOGIN)}
              className="items-center pt-1"
            >
              <Text className="text-[13px] font-semibold text-accent">
                Back to Log In
              </Text>
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