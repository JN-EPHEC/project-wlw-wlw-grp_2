import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';

export default function FormateurTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#9333ea', // Violet (couleur active texte/icones standards)
        tabBarInactiveTintColor: '#71717a', // Gris
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          height: Platform.OS === 'ios' ? 85 : 60, // Hauteur suffisante pour le bouton
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
          elevation: 0, // Retire l'ombre par défaut sur Android pour un look clean
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      {/* 1. ACCUEIL */}
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
        name="recherche" // Assurez-vous que le fichier s'appelle bien recherche.tsx
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
          title: '', // Pas de texte
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
          title: 'Notifications',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "notifications" : "notifications-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 5. PROFIL */}
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
    top: -20, // Fait remonter le bouton pour l'effet "flottant"
    justifyContent: 'center',
    alignItems: 'center',
    // Important pour que le clic fonctionne sur la partie qui dépasse
    zIndex: 10, 
  },
  uploadButton: {
    width: 60,
    height: 60,
    borderRadius: 30, // Cercle parfait
    backgroundColor: '#F97316', // Orange exact de votre image
    justifyContent: 'center',
    alignItems: 'center',
    // Ombres pour donner du relief (comme sur l'image)
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});