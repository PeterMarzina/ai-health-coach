// src/services/biometrics.ts — voorbereiding voor passkey/biometrics-login
// Nog niet aangesloten op de login-flow deze sprint. `isAvailable()` checkt of
// het toestel Face ID/Touch ID/vingerafdruk heeft; `authenticate()` toont de
// systeem-prompt. Een volgende sprint kan dit combineren met expo-secure-store
// (al geïnstalleerd) om het wachtwoord/token lokaal versleuteld te bewaren.
import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricsAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  const { success } = await LocalAuthentication.authenticateAsync({ promptMessage });
  return success;
}
