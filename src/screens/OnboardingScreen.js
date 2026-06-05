import { useState } from 'react'
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { supabase } from '../lib/supabase'

export default function OnboardingScreen({ onComplete }) {
  const [fullName, setFullName] = useState('')
  const [healthGoal, setHealthGoal] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSaveProfile = async () => {
    if (!fullName || !healthGoal) {
      Alert.alert('Missing info', 'Please fill in your name and a health goal.')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          health_goal: healthGoal,
          updated_at: new Date(),
        })

      if (error) throw error

      onComplete()
    } catch (error) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome! Let's get to know you.</Text>

      <Text style={styles.label}>What's your name?</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={styles.label}>What is your main health goal?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Lose weight, Run a 5k, Eat better"
        value={healthGoal}
        onChangeText={setHealthGoal}
        multiline
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Finish Setup" onPress={handleSaveProfile} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
})
