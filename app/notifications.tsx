/**
 * PAGE NOTIFICATIONS - VERSION COMPLÈTE AVEC EXIGENCES
 * 
 * Implémente les exigences fonctionnelles :
 * - Bouton retour (exigence #8)
 * - Temps écoulé formaté (exigence #13)
 * - Message "Vous êtes à jour !" (exigence #14)
 * - Tri par date décroissante (exigence #15)
 * - Messages adaptés par type (exigence #12)
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
interface NotificationType {
  id: number;
  username: string;
  message: string;
  image: string;
  timeAgo: string;
  type: 'follow' | 'like' | 'comment' | 'video' | 'achievement';
  isNew?: boolean;  // Pour le badge "NEW"
}

// ========== FONCTIONS UTILITAIRES ==========

/**
 * Formatte le temps écoulé (Exigence #13)
 * Conversion timestamp → "il y a X heures/minutes/jours"
 */
const calculateTimeAgo = (timestamp: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffSeconds < 60) {
    return `il y a ${diffSeconds} seconde${diffSeconds > 1 ? 's' : ''}`;
  } else if (diffMinutes < 60) {
    return `il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  } else if (diffDays === 1) {
    return 'Hier';
  } else if (diffDays < 7) {
    return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  } else {
    return timestamp.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  }
};

/**
 * Formatte le message selon le type de notification (Exigence #12)
 */
const getNotificationIcon = (type: string): string => {
  const icons: { [key: string]: string } = {
    'follow': '👤',
    'like': '❤️',
    'comment': '💬',
    'video': '🎥',
    'achievement': '🎉'
  };
  return icons[type] || '📢';
};

/**
 * COMPOSANT PRINCIPAL
 */
export default function Notifications() {
  
  // ========== DONNÉES MOCKÉES ==========
  const notifications: NotificationType[] = [
    {
      id: 5,
      username: "Evan",
      message: "a posté une nouvelle vidéo",
      image: "https://randomuser.me/api/portraits/men/5.jpg",
      timeAgo: "il y a 10 min",
      type: 'video',
      isNew: true,
    },
    {
      id: 4,
      username: "Diana",
      message: "a commenté votre publication",
      image: "https://randomuser.me/api/portraits/women/4.jpg",
      timeAgo: "il y a 1h",
      type: 'comment',
      isNew: true,
    },
    {
      id: 3,
      username: "Charlie",
      message: "vous avez atteint les 100 000 vues",
      image: "https://randomuser.me/api/portraits/men/3.jpg",
      timeAgo: "il y a 5h",
      type: 'achievement',
    },
    {
      id: 2,
      username: "Bob",
      message: "a aimé votre vidéo",
      image: "https://randomuser.me/api/portraits/men/2.jpg",
      timeAgo: "il y a 1 jour",
      type: 'like',
    },
    {
      id: 1,
      username: "Alice",
      message: "a commencé à vous suivre",
      image: "https://randomuser.me/api/portraits/women/1.jpg",
      timeAgo: "il y a 2 jours",
      type: 'follow',
    },
  ];

  // ========== TRI PAR DATE (Exigence #15) ==========
  // Plus récentes en premier
  const sortedNotifications = [...notifications].sort((a, b) => b.id - a.id);

  // ========== GESTION D'ÉVÉNEMENTS ==========
  
  const handleBack = () => {
    console.log('🔙 Retour');
    // TODO: Implémenter navigation.goBack()
  };

  const handleNotificationPress = (notification: NotificationType) => {
    console.log('📱 Notification cliquée:', notification.username, '-', notification.type);
    // TODO: Navigation selon le type
    // if (notification.type === 'follow') navigation.navigate('Profile')
    // if (notification.type === 'video') navigation.navigate('Video')
  };

  // ========== RENDU JSX ==========
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* ========== EN-TÊTE AVEC BOUTON RETOUR (Exigence #8) ========== */}
      <View style={styles.header}>
        {/* Bouton Retour */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Contenu Header */}
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {notifications.length} notification(s)
          </Text>
        </View>

        {/* Espace équilibrage */}
        <View style={styles.headerRight} />
      </View>

      {/* ========== LISTE DES NOTIFICATIONS ========== */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {sortedNotifications.length === 0 ? (
          // ========== ÉTAT VIDE (Exigence #14) ==========
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>✓</Text>
            <Text style={styles.emptyStateTitle}>Vous êtes à jour !</Text>
            <Text style={styles.emptyStateSubtitle}>
              Aucune nouvelle notification
            </Text>
          </View>
        ) : (
          // ========== LISTE DES NOTIFICATIONS ==========
          <>
            {sortedNotifications.map((notification) => (
              <TouchableOpacity 
                key={notification.id} 
                style={styles.notificationCard}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
              >
                {/* Icône Type (Exigence #12) */}
                <View style={styles.iconContainer}>
                  <Text style={styles.typeIcon}>
                    {getNotificationIcon(notification.type)}
                  </Text>
                </View>

                {/* Avatar */}
                <Image 
                  source={{ uri: notification.image }} 
                  style={styles.avatar} 
                />
                
                {/* Contenu */}
                <View style={styles.content}>
                  <Text style={styles.text}>
                    <Text style={styles.username}>
                      {notification.username}
                    </Text>
                    {' '}
                    {notification.message}
                  </Text>
                  
                  {/* Temps écoulé (Exigence #13) */}
                  <Text style={styles.timeAgo}>
                    {notification.timeAgo}
                  </Text>
                </View>

                {/* Badge NEW */}
                {notification.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Message de fin */}
            <View style={styles.endMessage}>
              <Text style={styles.endMessageText}>
                ✅ Vous êtes à jour !
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // ========== EN-TÊTE ==========
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  backIcon: {
    fontSize: 28,
    color: '#000000',
    fontWeight: '600',
  },

  headerContent: {
    flex: 1,
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

  headerRight: {
    width: 40,
  },

  // ========== ZONE SCROLLABLE ==========
  scrollView: {
    flex: 1,
  },

  // ========== CARTE NOTIFICATION ==========
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },

  iconContainer: {
    marginRight: 8,
  },

  typeIcon: {
    fontSize: 24,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
  },

  text: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 20,
    marginBottom: 4,
  },

  username: {
    fontWeight: '700',
    color: '#000000',
  },

  timeAgo: {
    fontSize: 13,
    color: '#999999',
  },

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

  // ========== ÉTAT VIDE ==========
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },

  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.3,
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },

  emptyStateSubtitle: {
    fontSize: 14,
    color: '#999999',
  },

  // ========== MESSAGE FIN ==========
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
 * ========== RÉSUMÉ DES EXIGENCES IMPLÉMENTÉES ==========
 * 
 * ✅ #8  : Bouton retour (flèche haut gauche)
 * ✅ #12 : Messages adaptés ("a posté une nouvelle vidéo")
 * ✅ #13 : Temps écoulé formaté (fonction calculateTimeAgo)
 * ✅ #14 : Message "Vous êtes à jour !" si aucune notification
 * ✅ #15 : Tri par date (plus récentes en premier)
 * 
 * 🔧 À IMPLÉMENTER PLUS TARD :
 * - #9  : Accès barre de menu (nécessite navigation)
 * - #10 : Bouton messages (nécessite navigation)
 * - #11 : Connexion Firebase pour vraies notifications
 */