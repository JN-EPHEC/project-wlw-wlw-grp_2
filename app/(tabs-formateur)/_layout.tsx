import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';

export default function FormateurTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#9333ea',
        tabBarInactiveTintColor: '#71717a',
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          // 👇 C'EST ICI QUE TOUT SE JOUE POUR LE DESIGN
          position: 'absolute', // Indispensable pour l'effet flottant
          bottom: 0,
          left: 0,
          right: 0,
          borderTopLeftRadius: 30,  // Crée l'arrondi à gauche
          borderTopRightRadius: 30, // Crée l'arrondi à droite
          borderTopWidth: 0,        // Supprime la ligne grise du haut
          height: Platform.OS === 'ios' ? 95 : 70, // Plus haut pour accommoder l'arrondi
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
          
          
          elevation: 10, // Pour Android
          shadowColor: '#000', // Pour iOS
          shadowOffset: { width: 0, height: -5 }, // Ombre vers le haut
          shadowOpacity: 0.1,
          shadowRadius: 10,
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />

      

      {/* 3. UPLOAD (BOUTON CENTRAL ORANGE) */}
      <Tabs.Screen
        name="upload"
        options={{
          title: '',
          tabBarLabelStyle: { display: 'none' },
          tabBarIcon: () => (
            <View style={styles.uploadButtonContainer}>
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "notifications" : "notifications-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 5. PROFIL */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  uploadButtonContainer: {
    top: -25, // Fait remonter le bouton plus haut pour qu'il chevauche la barre
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Assure que le bouton est cliquable
  },
  uploadButton: {
    width: 60,
    height: 60,
    borderRadius: 30, // Rond parfait
    backgroundColor: '#F97316', // Orange exact
    justifyContent: 'center',
    alignItems: 'center',
    // Ombres spécifiques au bouton
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});