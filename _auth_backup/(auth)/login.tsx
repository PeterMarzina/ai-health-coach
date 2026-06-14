import { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text, Alert, ActivityIndicator } from 'react-native';
import { signIn, signUp } from '../../src/services/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else if (isSignUp) {
      Alert.alert('Success', 'Check your email!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Button title={isSignUp ? 'Sign Up' : 'Login'} onPress={handleAuth} />
          <View style={{ height: 10 }} />
          <Button
            title={isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            onPress={() => setIsSignUp(!isSignUp)}
            color="#666"
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
});
