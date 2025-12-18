import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="splashscreen" />
      <Stack.Screen name="role-selection" />
      <Stack.Screen name="signup-apprenant" />
      <Stack.Screen name="signup-formateur" />
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="onboarding-apprenant" />
      <Stack.Screen name="onboarding-formateur" />
      <Stack.Screen name="(tabs-apprenant)" />
      <Stack.Screen name="(tabs-formateur)" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="help" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}