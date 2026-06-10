import { View, Text, Button } from 'react-native'
import { signOut } from '../services/auth'

export default function HomeScreen() {
  return (
    <View style={{ padding: 20 }}>
      <Text>🏥 AI Health Coach</Text>
      <Button title="Logout" onPress={signOut} />
    </View>
  )
}