import { Stack } from 'expo-router';
import { ProgressProvider } from './ProgressContext';

export default function RootLayout() {
    return (
        <ProgressProvider>
            <Stack>
                <Stack.Screen 
                    name="(tabs)" 
                    options={{ headerShown: false }} 
                />
                <Stack.Screen 
                    name="user-profile" 
                    options={{ headerShown: false }} 
                />
                <Stack.Screen 
                    name="progression" 
                    options={{ headerShown: false }} 
                />
                <Stack.Screen 
                    name="modal" 
                    options={{ presentation: 'modal' }} 
                />
                {/* Ajoutez vos autres routes ici */}
            </Stack>
        </ProgressProvider>
    );
}