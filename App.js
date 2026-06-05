import { useEffect, useState } from 'react'
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native'
import HomeScreen from './src/screens/HomeScreen'
import LoginScreen from './src/screens/LoginScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import { supabase } from './src/lib/supabase'


export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (isMounted) {
        setSession(data?.session ?? null)
        if (data?.session) {
          await checkProfile(data.session.user.id)
        }
        setLoading(false)
      }
    }

    loadSession()

    const { data } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        await checkProfile(nextSession.user.id)
      } else {
        setShowOnboarding(false)
      }
      setLoading(false)
    })

    return () => {
      isMounted = false
      data?.subscription?.unsubscribe()
    }
  }, [])

  const checkProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        setShowOnboarding(true)
      } else {
        setShowOnboarding(false)
      }
    } catch (e) {
      setShowOnboarding(true)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
  }

  return <HomeScreen />
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
