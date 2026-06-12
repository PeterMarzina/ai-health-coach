import { useState } from "react";
import {
  Alert,
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

// ─── Icons (inline SVG-style via Text — swap with lucide-react-native if available) ───
const EmailIcon = () => <Text className="mr-2.5 text-base text-muted">✉</Text>;
const LockIcon = () => <Text className="mr-2.5 text-base text-muted">🔒</Text>;
const EyeIcon = ({ show }) => (
  <Text className="text-base text-muted">{show ? "👁" : "🙈"}</Text>
);
const UserIcon = () => <Text className="mr-2.5 text-base text-muted">👤</Text>;

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
    <View className="flex-row items-center rounded-xl border border-line bg-surface px-3.5 py-3.5">
      {icon}
      <TextInput
        className="flex-1 text-[15px] text-white"
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
    <TouchableOpacity className="flex-row items-center justify-center gap-2.5 rounded-[14px] border border-line bg-surface py-3.5">
      <Text className="text-lg">{emoji}</Text>
      <Text className="text-[15px] font-medium text-white">{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <View className="my-1 flex-row items-center">
      <View className="h-px flex-1 bg-line" />
      <Text className="mx-3 text-xs text-muted">or continue with</Text>
      <View className="h-px flex-1 bg-line" />
    </View>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <View className="mb-4 h-16 w-16 items-center justify-center rounded-full border-2 border-accent">
      <Text className="text-[26px] font-bold text-accent">▲</Text>
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
      <TouchableOpacity className="mb-6" onPress={() => {}}>
        <Text className="text-[22px] text-white">←</Text>
      </TouchableOpacity>

      <Text className="mb-2 text-[28px] font-bold text-white">Log In</Text>
      <Text className="mb-8 text-sm leading-5 text-muted">
        Welcome back! Please log in to continue.
      </Text>

      <View className="gap-3">
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
          className="-mt-1 items-end"
        >
          <Text className="text-[13px] text-accent">Forgot password?</Text>
        </TouchableOpacity>

        {error ? (
          <Text className="mt-1 text-[13px] text-danger">{error}</Text>
        ) : null}

        <TouchableOpacity
          className="mt-2 items-center rounded-[14px] bg-accent py-4"
          onPress={handleLogin}
          disabled={loading}
        >
          <Text className="text-base font-bold text-black">
            {loading ? "Logging in..." : "Log In"}
          </Text>
        </TouchableOpacity>

        <Divider />
        <SocialButton label="Google" emoji="G" />
        <SocialButton label="Apple" emoji="" />

        <View className="mt-2 flex-row justify-center">
          <Text className="text-[13px] text-muted">Don't have an account? </Text>
          <TouchableOpacity onPress={() => onNavigate(SCREENS.REGISTER)}>
            <Text className="text-[13px] font-semibold text-accent">Register</Text>
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
        className="mb-6"
        onPress={() => onNavigate(SCREENS.LOGIN)}
      >
        <Text className="text-[22px] text-white">←</Text>
      </TouchableOpacity>

      <Text className="mb-2 text-[28px] font-bold text-white">
        Create Account
      </Text>
      <Text className="mb-8 text-sm leading-5 text-muted">
        Let's get started on your health journey.
      </Text>

      <View className="gap-3">
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

        <View className="mt-0.5 gap-1">
          {rules.map((r) => (
            <Text
              key={r.label}
              className={`text-xs ${r.ok ? "text-accent" : "text-muted"}`}
            >
              {r.ok ? "✓" : "·"} {r.label}
            </Text>
          ))}
        </View>

        {error ? (
          <Text className="mt-1 text-[13px] text-danger">{error}</Text>
        ) : null}

        <TouchableOpacity
          className="mt-2 items-center rounded-[14px] bg-accent py-4"
          onPress={handleRegister}
          disabled={loading}
        >
          <Text className="text-base font-bold text-black">
            {loading ? "Creating..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        <Divider />
        <SocialButton label="Google" emoji="G" />
        <SocialButton label="Apple" emoji="" />

        <View className="mt-2 flex-row justify-center">
          <Text className="text-[13px] text-muted">
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => onNavigate(SCREENS.LOGIN)}>
            <Text className="text-[13px] font-semibold text-accent">Log In</Text>
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
        className="mb-6"
        onPress={() => onNavigate(SCREENS.LOGIN)}
      >
        <Text className="text-[22px] text-white">←</Text>
      </TouchableOpacity>

      <View className="mb-2 items-center">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full border border-line bg-surface">
          <Text className="text-[32px]">🔏</Text>
        </View>
        <Text className="mb-2 text-[28px] font-bold text-white">
          Reset Password
        </Text>
        <Text className="mb-8 text-sm leading-5 text-muted">
          Enter your email address and we'll send you a link to reset your
          password.
        </Text>
      </View>

      <View className="gap-3">
        <AuthInput
          icon={<EmailIcon />}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        {sent && (
          <Text className="mt-1 text-[13px] text-accent">
            Reset link sent! Check your email.
          </Text>
        )}

        <TouchableOpacity
          className="mt-2 items-center rounded-[14px] bg-accent py-4"
          onPress={handleReset}
          disabled={loading}
        >
          <Text className="text-base font-bold text-black">
            {loading ? "Sending..." : "Send Reset Link"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onNavigate(SCREENS.LOGIN)}
          className="mt-2 items-center"
        >
          <Text className="text-[13px] font-semibold text-accent">
            Back to Log In
          </Text>
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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pt-6 pb-10"
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
