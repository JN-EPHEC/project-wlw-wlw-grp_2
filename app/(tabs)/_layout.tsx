import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ProgressProvider } from '../ProgressContext'; // ← AJOUTER CETTE LIGNE

export default function TabsLayout() {
    return (
        <ProgressProvider>
            <Tabs
                screenOptions={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search" size={size} color={color} />
                    ),
                }}
            >
                {/* Vos Tabs.Screen existants */}
                <Tabs.Screen
                    name="userprofile"
                    options={{
                        title: 'Profil',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="person" size={size} color={color} />
                        ),
                    }}
                />
                {/* Ajoutez vos autres tabs ici */}
            </Tabs>
        </ProgressProvider>
    );
}