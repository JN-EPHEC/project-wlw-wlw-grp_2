import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';

export default function FormateurTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#9333ea', // Violet quand actif
        tabBarInactiveTintColor: '#71717a', // Gris quand inactif
        tabBarShowLabel: true, // Afficher les textes
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e4e4e7',
          height: Platform.OS === 'ios' ? 85 : 65, // Hauteur ajustée
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      {/* 1. HOME */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 2. RECHERCHE */}
      <Tabs.Screen
        name="recherche"
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 3. UPLOAD (BOUTON CENTRAL ORANGE) */}
      <Tabs.Screen
        name="upload"
        options={{
          title: '', // Pas de texte sous le bouton central
          tabBarLabelStyle: { display: 'none' }, // Cache le label
          tabBarIcon: () => (
            <View style={styles.uploadButtonWrapper}>
              <View style={styles.uploadButton}>
                <Ionicons name="add" size={32} color="#fff" />
              </View>
            </View>
          ),
        }}
      />

      {/* 4. NOTIFICATIONS */}
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifs',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "notifications" : "notifications-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 5. PROFILE */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  uploadButtonWrapper: {
    top: -20, // Fait remonter le bouton
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F97316', // Orange Figma
    justifyContent: 'center',
    alignItems: 'center',
    // Ombres pour l'effet flottant
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#ffffff', // Petit contour blanc
  },
});