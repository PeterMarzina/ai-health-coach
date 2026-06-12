import { View, Text, SafeAreaView, TouchableOpacity, Alert } from 'react-native'
import { signOut } from '../services/auth'

export default function HomeScreen() {
  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) Alert.alert('Error signing out', error.message)
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-between px-6 pt-6 pb-10">
        <View className="items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full border-2 border-accent bg-surface">
            <Text className="text-4xl font-bold">🏥</Text>
          </View>
          <Text className="mb-2 text-center text-[28px] font-bold text-white">AI Health Coach</Text>
          <Text className="max-w-[280px] text-center text-sm leading-5 text-muted">
            Welcome back! Ready to achieve your health goals?
          </Text>
        </View>

        <TouchableOpacity
          className="items-center rounded-[14px] bg-accent py-4"
          onPress={handleSignOut}
        >
          <Text className="text-base font-bold text-black">Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}