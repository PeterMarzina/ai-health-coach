import { useState } from 'react'
import { View, TextInput, Button } from 'react-native'
import { signIn, signUp } from '../services/auth'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <View style={{ padding: 20 }}>
      <TextInput placeholder="email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="password" value={password} onChangeText={setPassword} secureTextEntry />

      <Button title="Login" onPress={() => signIn(email, password)} />
      <Button title="Sign up" onPress={() => signUp(email, password)} />
    </View>
  )
}