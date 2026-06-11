import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { signOut } from '../services/auth'

export default function HomeScreen() {
  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) Alert.alert('Error signing out', error.message)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🏥</Text>
          </View>
          <Text style={styles.title}>AI Health Coach</Text>
          <Text style={styles.subtitle}>Welcome back! Ready to achieve your health goals?</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
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
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: CARD,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
  },
  title: {
    color: WHITE,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: GRAY,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  logoutBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
})
