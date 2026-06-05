import { useEffect, useState } from 'react'
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native'
import { signOut } from '../services/auth'
import { supabase } from '../lib/supabase'

export default function HomeScreen() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🏥</Text>
      <Text style={styles.title}>AI Health Coach</Text>

      {profile && (
        <View style={styles.profileBox}>
          <Text style={styles.welcome}>Welcome back, {profile.full_name}!</Text>
          <Text style={styles.goal}>Your goal: {profile.health_goal}</Text>
        </View>
      )}

      <Button title="Logout" onPress={signOut} color="#ff4444" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  emoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  profileBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcome: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  goal: {
    fontSize: 16,
    color: '#666',
  },
})
