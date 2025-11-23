/**
 * PAGE NOTIFICATIONS - CODE COMPLET AVEC TYPES
 * 
 * Concepts du cours utilisés :
 * - Composant fonctionnel (Slides 51-52)
 * - Array.map() pour itérer (TP09 Section 5, Slide 57)
 * - StyleSheet pour le CSS (Slide 34)
 * - Composants React Native (View, Text, ScrollView, Image)
 * - TypeScript pour le typage (Slides 4, 30)
 */

import React from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// ========== INTERFACE TYPESCRIPT ==========
// Définit la structure d'une notification
// Concept : Typage fort de TypeScript (Slide 4)
interface NotificationType {
  id: number;
  username: string;
  message: string;
  image: string;
  timeAgo: string;
}

/**
 * COMPOSANT PRINCIPAL
 * Affiche une liste de notifications
 */
export default function Notifications() {
  
  // ========== DONNÉES (State Local) ==========
  // Concept : Données locales du composant (Slide 53)
  const notifications: NotificationType[] = [
    {
      id: 1,
      username: "Alice",
      message: "a commencé à vous suivre",
      image: "https://randomuser.me/api/portraits/women/1.jpg",
      timeAgo: "il y a 2h",
    },
    {
      id: 2,
      username: "Bob",
      message: "a aimé votre vidéo",
      image: "https://randomuser.me/api/portraits/men/2.jpg",
      timeAgo: "il y a 3h",
    },
    {
      id: 3,
      username: "Charlie",
      message: "vous avez atteint les 100 000 vues",
      image: "https://randomuser.me/api/portraits/men/3.jpg",
      timeAgo: "il y a 5h",
    },
    {
      id: 4,
      username: "Diana",
      message: "a commenté votre publication",
      image: "https://randomuser.me/api/portraits/women/4.jpg",
      timeAgo: "il y a 1 jour",
    },
    {
      id: 5,
      username: "Evan",
      message: "a partagé votre vidéo",
      image: "https://randomuser.me/api/portraits/men/5.jpg",
      timeAgo: "il y a 2 jours",
    },
  ];

  // ========== GESTION D'ÉVÉNEMENT ==========
  // Concept : Event handlers (Slides 54-55)
  // CORRECTION : Ajout du type NotificationType
  const handleNotificationPress = (notification: NotificationType) => {
    console.log('Notification cliquée:', notification.username);
    // Ici vous pourriez naviguer vers une autre page
    // Exemple : navigation.navigate('Profile', { userId: notification.id });
  };

  // ========== RENDU JSX ==========
  return (
    <View style={styles.container}>
      {/* StatusBar : Barre d'état du téléphone */}
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* ========== EN-TÊTE ========== */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>
          {notifications.length} notification(s)
        </Text>
      </View>

      {/* ========== LISTE DES NOTIFICATIONS ========== */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 
          ITÉRATION avec .map() 
          Concept : Méthodes sur Array (TP09 Section 5, Slide 57)
          
          Pour chaque notification dans le tableau,
          on crée un composant visuel
        */}
        {notifications.map((notification) => (
          <TouchableOpacity 
            key={notification.id} 
            style={styles.notificationCard}
            onPress={() => handleNotificationPress(notification)}
            activeOpacity={0.7}
          >
            {/* AVATAR DE L'UTILISATEUR */}
            <Image 
              source={{ uri: notification.image }} 
              style={styles.avatar} 
            />
            
            {/* CONTENU DE LA NOTIFICATION */}
            <View style={styles.content}>
              {/* Texte avec username en gras */}
              <Text style={styles.text}>
                <Text style={styles.username}>
                  {notification.username}
                </Text>
                {' '}
                {notification.message}
              </Text>
              
              {/* Temps écoulé */}
              <Text style={styles.timeAgo}>
                {notification.timeAgo}
              </Text>
            </View>

            {/* INDICATEUR DE NOUVELLE NOTIFICATION */}
            {notification.id <= 2 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* ========== MESSAGE DE FIN ========== */}
        <View style={styles.endMessage}>
          <Text style={styles.endMessageText}>
            ✅ Vous êtes à jour !
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ========== STYLES CSS ==========
/**
 * StyleSheet.create() - Concept du cours (Slide 34)
 * 
 * Équivalent du CSS mais en JavaScript
 * Les propriétés sont en camelCase (backgroundColor au lieu de background-color)
 */
const styles = StyleSheet.create({
  
  // ========== CONTENEUR PRINCIPAL ==========
  container: {
    flex: 1,                        // Prend tout l'espace disponible
    backgroundColor: '#F5F5F5',     // Gris clair pour le fond
  },

  // ========== EN-TÊTE ==========
  header: {
    backgroundColor: '#FFFFFF',     // Fond blanc
    paddingTop: 50,                 // Espacement du haut (pour la barre d'état)
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,           // Ligne de séparation
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',            // Ombre (iOS)
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,                   // Ombre (Android)
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
  },

  // ========== ZONE SCROLLABLE ==========
  scrollView: {
    flex: 1,
  },

  // ========== CARTE DE NOTIFICATION ==========
  notificationCard: {
    flexDirection: 'row',           // Disposition horizontale (avatar + texte)
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,               // Coins arrondis
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // ========== AVATAR ==========
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,               // Cercle parfait (50/2)
    marginRight: 12,
    backgroundColor: '#E0E0E0',     // Couleur de secours si l'image ne charge pas
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },

  // ========== CONTENU TEXTE ==========
  content: {
    flex: 1,                        // Prend l'espace restant
    justifyContent: 'center',
  },

  text: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 20,
    marginBottom: 4,
  },

  username: {
    fontWeight: '700',              // Gras (700 = bold)
    color: '#000000',
  },

  timeAgo: {
    fontSize: 13,
    color: '#999999',
  },

  // ========== BADGE "NEW" ==========
  newBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },

  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // ========== MESSAGE DE FIN ==========
  endMessage: {
    padding: 30,
    alignItems: 'center',
  },

  endMessageText: {
    fontSize: 15,
    color: '#999999',
    fontWeight: '500',
  },
});

/**
 * ========== EXPLICATIONS TYPESCRIPT ==========
 * 
 * interface NotificationType {
 *   id: number;
 *   username: string;
 *   ...
 * }
 * 
 * → Définit la structure d'une notification
 * → TypeScript vérifie que toutes les propriétés sont présentes
 * → Autocomplétion dans VS Code
 * 
 * const notifications: NotificationType[]
 * 
 * → Le tableau contient des NotificationType
 * → TypeScript vérifie chaque objet
 * 
 * handleNotificationPress = (notification: NotificationType)
 * 
 * → Le paramètre doit être de type NotificationType
 * → Plus d'erreur "implicitly has an 'any' type"
 */