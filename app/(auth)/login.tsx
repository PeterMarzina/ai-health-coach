// app/(auth)/login.tsx — Inlog-/registratiescherm in design-stijl
// Gebruikt je bestaande backend-functies signIn/signUp (Supabase) en je eigen
// thema + componenten. Na succesvol inloggen stuurt de auth-poort in app/_layout.tsx
// je automatisch door naar de tabs.
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang } from '@/components/store';
import { Icon } from '@/components/Icon';
import { signIn, signUp } from '../../src/services/auth';

export default function LoginScreen() {
  const { c } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // false = inloggen, true = registreren

  // Roept de juiste backend-functie aan en toont een melding bij een fout.
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert(t('oops'), t('fill_fields'));
      return;
    }
    setLoading(true);
    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert(t('err_title'), error.message);
    } else if (isSignUp) {
      Alert.alert(t('signup_done_title'), t('signup_done_msg'));
    }
    // Bij inloggen: niks doen — de auth-poort merkt de sessie op en navigeert vanzelf.
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* Logo + titel */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ fontWeight: '800', fontSize: 30, color: c.accentText, fontStyle: 'italic' }}>A</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: c.text, letterSpacing: -0.4 }}>
            {isSignUp ? t('signup_title') : t('login_title')}
          </Text>
          <Text style={{ fontSize: 13.5, color: c.sub, marginTop: 6 }}>
            {isSignUp ? t('signup_subtitle') : t('login_subtitle')}
          </Text>
        </View>

        {/* E-mailveld */}
        <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600', marginBottom: 6, marginLeft: 2 }}>{t('email')}</Text>
        <TextInput
          placeholder={t('email_ph')}
          placeholderTextColor={c.dim}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{
            backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14,
            paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text, marginBottom: 14,
          }}
        />

        {/* Wachtwoordveld */}
        <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600', marginBottom: 6, marginLeft: 2 }}>{t('password')}</Text>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor={c.dim}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{
            backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14,
            paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: c.text, marginBottom: 22,
          }}
        />

        {/* Hoofdknop */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleAuth}
          disabled={loading}
          style={{
            height: 52, borderRadius: 15, backgroundColor: c.accent,
            alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color={c.onAccent} />
          ) : (
            <>
              <Text style={{ color: c.onAccent, fontSize: 16, fontWeight: '700' }}>
                {isSignUp ? t('btn_signup') : t('btn_login')}
              </Text>
              <Icon name="chevR" size={18} color={c.onAccent} />
            </>
          )}
        </TouchableOpacity>

        {/* Schakelaar tussen inloggen en registreren */}
        <TouchableOpacity activeOpacity={0.7} onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={{ color: c.sub, fontSize: 13.5 }}>
            {isSignUp ? t('switch_to_login') : t('switch_to_signup')}
            <Text style={{ color: c.accentText, fontWeight: '700' }}>
              {isSignUp ? t('btn_login') : t('btn_signup')}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
