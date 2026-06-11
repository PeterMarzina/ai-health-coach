import { useState } from 'react'
import { View, TextInput, Button, Text, Alert, StyleSheet } from 'react-native'
import { signIn, signUp } from '../services/auth'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async () => {
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignUp = async () => {
    setLoading(true)
    setError('')
    const { error } = await signUp(email, password)
    if (error) setError(error.message)
    else Alert.alert('Check your email to confirm your account!')
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏥 AI Health Coach </Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={loading ? 'Loading...' : 'Login'} onPress={handleSignIn} disabled={loading} />
      <Button title={loading ? 'Loading...' : 'Sign up'} onPress={handleSignUp} disabled={loading} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 12, borderRadius: 6 },
  error: { color: 'red', marginBottom: 12 },
})