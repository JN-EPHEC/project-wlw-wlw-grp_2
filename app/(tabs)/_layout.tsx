import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ProgressProvider } from '../ProgressContext';

export default function TabsLayout() {
    return (
        <ProgressProvider>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: '#6B46FF',
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Accueil',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="home" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="explore"
                    options={{
                        title: 'Explorer',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="search" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="userprofile"
                    options={{
                        title: 'Profil',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="person" size={size} color={color} />
                        ),
                    }}
                />
            </Tabs>
        </ProgressProvider>
    );
}