import { Stack } from 'expo-router';
import { ProgressProvider } from './ProgressContext';

export default function RootLayout() {
    return (
        <ProgressProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="progression" />
            </Stack>
        </ProgressProvider>
    );
}