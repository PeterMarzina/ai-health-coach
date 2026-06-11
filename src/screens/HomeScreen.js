import { View, Text, Button, Alert } from 'react-native'
import { signOut } from '../services/auth'

export default function HomeScreen() {
  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) Alert.alert('Error signing out', error.message)
  }

  return (
    <View style={{ padding: 20 }}>
      <Text>🏥 AI Health Coach</Text>
      <Button title="Logout" onPress={handleSignOut} />
    </View>
  )
}