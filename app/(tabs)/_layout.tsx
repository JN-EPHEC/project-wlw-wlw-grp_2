import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#6B46FF',
                tabBarInactiveTintColor: '#6A6A6B',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#E8E8E8',
                    height: 70,
                    paddingBottom: 10,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '500',
                },
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
                name="home"
                options={{
                    title: 'Vidéos',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="play-circle" size={size} color={color} />
                    ),
                }}
            />
            
            <Tabs.Screen
                name="homeuser"
                options={{
                    title: 'Contenu',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="albums" size={size} color={color} />
                    ),
                }}
            />
            
            <Tabs.Screen
                name="notifications"
                options={{
                    title: 'Notifications',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="notifications" size={size} color={color} />
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
    );
}