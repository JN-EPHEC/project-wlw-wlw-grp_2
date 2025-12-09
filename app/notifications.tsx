import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';

// 🎨 Palette SwipeSkills
const COLORS = {
  violetPrincipal: '#7459F0',    // Actions principales, CTA, navigation
  orangeSecondaire: '#FBA31A',   // Actions secondaires, feedback positif, badges
  bleuNuit: '#242A65',           // Titres, icônes sombres, contraste fort
  blancCasse: '#F8F8F6',         // Arrière-plans clairs
  gris: '#6B7280',               // Texte secondaire
  grisClair: '#E5E7EB',          // Bordures
  blanc: '#FFFFFF',              // Blanc pur
};

// Types
type NotificationType = 
  | 'new_video' 
  | 'course_update' 
  | 'progress' 
  | 'certificate' 
  | 'reminder' 
  | 'followed_creator';

type Priority = 'high' | 'normal' | 'low';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: Priority;
  creatorName?: string;
  courseId?: string;
  courseName?: string;
  actionUrl?: string;
  metadata?: {
    progress?: number;
  };
}

// Données mockées
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'new_video',
    title: 'Nouvelle vidéo disponible',
    message: 'Jean Dupont a posté une nouvelle vidéo : "Les bases de React Native"',
    timestamp: '2024-01-20T10:30:00',
    read: false,
    priority: 'high',
    creatorName: 'Jean Dupont',
    actionUrl: '/videos/video-123',
  },
  {
    id: '2',
    type: 'progress',
    title: 'Félicitations ! 🎉',
    message: 'Vous avez complété 50% de "TypeScript pour débutants"',
    timestamp: '2024-01-20T09:15:00',
    read: false,
    priority: 'normal',
    courseName: 'TypeScript pour débutants',
    actionUrl: '/courses/course-456',
    metadata: { progress: 50 },
  },
  {
    id: '3',
    type: 'followed_creator',
    title: 'Nouveau contenu',
    message: 'Marie Martin (créateur que vous suivez) a ajouté un module à "JavaScript ES6"',
    timestamp: '2024-01-19T14:20:00',
    read: false,
    priority: 'normal',
    creatorName: 'Marie Martin',
    courseName: 'JavaScript ES6',
    actionUrl: '/courses/course-789',
  },
  {
    id: '4',
    type: 'course_update',
    title: 'Mise à jour de cours',
    message: 'Un nouveau chapitre a été ajouté à "Python Avancé"',
    timestamp: '2024-01-19T11:00:00',
    read: true,
    priority: 'normal',
    courseName: 'Python Avancé',
    actionUrl: '/courses/course-101',
  },
  {
    id: '5',
    type: 'certificate',
    title: 'Certificat disponible 🏆',
    message: 'Votre certificat de "React Hooks" est prêt à télécharger',
    timestamp: '2024-01-18T16:45:00',
    read: true,
    priority: 'high',
    courseName: 'React Hooks',
    actionUrl: '/certificates/cert-202',
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [refreshing, setRefreshing] = useState(false);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  const deleteNotification = (id: string) => {
    Alert.alert(
      'Supprimer la notification',
      'Êtes-vous sûr de vouloir supprimer cette notification ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            setNotifications((prev) => prev.filter((notif) => notif.id !== id));
          },
        },
      ]
    );
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);

    if (notification.actionUrl) {
      Alert.alert(
        notification.title,
        `Redirection vers : ${notification.courseName || 'Contenu'}`,
        [
          { text: 'Annuler' },
          {
            text: 'Voir',
            onPress: () => {
              // router.push(notification.actionUrl);
              console.log('Navigation vers:', notification.actionUrl);
            },
          },
        ]
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "À l'instant";
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Hier';
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getTypeIcon = (type: NotificationType): string => {
    const icons: Record<NotificationType, string> = {
      new_video: '🎥',
      course_update: '📚',
      progress: '🎯',
      certificate: '🏆',
      reminder: '⏰',
      followed_creator: '👤',
    };
    return icons[type] || '📢';
  };

  // Render du header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top bar avec navigation */}
      <View style={styles.topBar}>
        {/* Bouton retour (ID036) */}
        <Pressable 
  style={styles.backButton}
  onPress={() => {
    if (router.canGoBack()) {
      router.back(); // Retourne à la page précédente
    } else {
      router.push('/home' as any); // Sinon va à Home
    }
  }}
>
  <ThemedText style={styles.backIcon}>←</ThemedText>
</Pressable>

        {/* Titre H1 */}
        <ThemedText style={styles.headerTitle}>
          Notifications
        </ThemedText>

        {/* Bouton Messages (ID040, ID193) */}
        <Pressable 
          style={styles.inboxButton}
          onPress={() => router.push('/message')}
        >
          <ThemedText style={styles.inboxIcon}>📨</ThemedText>
          {/* Badge orange secondaire pour feedback positif */}
          <View style={styles.inboxBadge}>
            <ThemedText style={styles.inboxBadgeText}>3</ThemedText>
          </View>
        </Pressable>
      </View>

      {/* Résumé avec Small typography */}
      <View style={styles.summaryContainer}>
        <ThemedText style={styles.summaryText}>
          {unreadCount > 0 
            ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
            : 'Toutes vos notifications sont lues'}
        </ThemedText>
      </View>

      {/* CTA violet principal */}
      {unreadCount > 0 && (
        <Pressable
          style={styles.markAllButton}
          onPress={markAllAsRead}
        >
          <ThemedText style={styles.markAllButtonText}>
            ✓ Tout marquer comme lu
          </ThemedText>
        </Pressable>
      )}
    </View>
  );

  // Render d'une notification
  const renderNotification = ({ item }: { item: Notification }) => (
    <Pressable 
      style={[styles.notifCard, !item.read && styles.notifCardUnread]}
      onPress={() => handleNotificationPress(item)}
    >
      {/* Indicateur non lu - violet principal */}
      {!item.read && <View style={styles.unreadIndicator} />}

      <View style={styles.notifContent}>
        <View style={styles.notifRow}>
          {/* Icône */}
          <View style={styles.notifIconContainer}>
            <ThemedText style={styles.notifIcon}>{getTypeIcon(item.type)}</ThemedText>
          </View>

          <View style={styles.notifTextContainer}>
            {/* Titre H2 - Semi-bold */}
            <ThemedText style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>
              {item.title}
            </ThemedText>

            {/* Message Body - Regular */}
            <ThemedText style={styles.notifMessage}>
              {item.message}
            </ThemedText>

            {/* Barre de progression - Violet principal */}
            {item.metadata?.progress !== undefined && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${item.metadata.progress}%` }
                    ]} 
                  />
                </View>
                <ThemedText style={styles.progressText}>
                  {item.metadata.progress}%
                </ThemedText>
              </View>
            )}

            {/* Timestamp Small */}
            <ThemedText style={styles.timestamp}>
              {formatTimestamp(item.timestamp)}
            </ThemedText>
          </View>
        </View>

        {/* Actions secondaires */}
        <View style={styles.actionsRow}>
          {!item.read && (
            <Pressable 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                markAsRead(item.id);
              }}
            >
              <ThemedText style={styles.actionButtonText}>
                ✓ Lu
              </ThemedText>
            </Pressable>
          )}

          <Pressable 
            style={styles.actionButtonDelete}
            onPress={(e) => {
              e.stopPropagation();
              deleteNotification(item.id);
            }}
          >
            <ThemedText style={styles.deleteText}>
              🗑️
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyIcon}>🔔</ThemedText>
      <ThemedText style={styles.emptyText}>
        Aucune notification
      </ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Vous serez notifié des nouveaux contenus
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ThemedView style={styles.container}>
        <FlatList
          data={sortedNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={COLORS.violetPrincipal}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.blanc,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.blancCasse,
  },
  listContent: {
    paddingBottom: 32,
  },
  
  // Header
  headerContainer: {
    backgroundColor: COLORS.blanc,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grisClair,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.blancCasse,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.bleuNuit,
  },
  // H1 écran - 28-32px, 700 bold
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  inboxButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.blancCasse,
    position: 'relative',
  },
  inboxIcon: {
    fontSize: 20,
  },
  // Badge orange secondaire (feedback positif)
  inboxBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.orangeSecondaire,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.blanc,
  },
  inboxBadgeText: {
    color: COLORS.blanc,
    fontSize: 10,
    fontWeight: 'bold',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // Small - 12-13px, 400 medium
  summaryText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
  // CTA violet principal
  markAllButton: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.violetPrincipal,
    borderRadius: 12,
    alignItems: 'center',
  },
  markAllButtonText: {
    color: COLORS.blanc,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: COLORS.grisClair,
    marginHorizontal: 16,
  },

  // Notification Card
  notifCard: {
    backgroundColor: COLORS.blanc,
    paddingVertical: 16,
    paddingHorizontal: 16,
    position: 'relative',
  },
  notifCardUnread: {
    backgroundColor: '#F5F1FF', // Violet très clair
  },
  // Indicateur violet principal
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.violetPrincipal,
  },
  notifContent: {
    gap: 12,
  },
  notifRow: {
    flexDirection: 'row',
    gap: 12,
  },
  notifIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.blancCasse,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifIcon: {
    fontSize: 20,
  },
  notifTextContainer: {
    flex: 1,
    gap: 6,
  },
  // H2 - 20-22px, 600 semi-bold
  notifTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.bleuNuit,
    lineHeight: 26,
    fontFamily: 'Poppins',
  },
  notifTitleUnread: {
    fontWeight: '700',
  },
  // Body - 14-16px, 400/500 regular
  notifMessage: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.gris,
    lineHeight: 22,
    fontFamily: 'Poppins',
  },
  // Small - 12-13px, 400 medium
  timestamp: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.gris,
    marginTop: 2,
    fontFamily: 'Poppins',
  },

  // Progress bar - Violet principal
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.grisClair,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.violetPrincipal,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.violetPrincipal,
    minWidth: 35,
    fontFamily: 'Poppins',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 52,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.blancCasse,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  actionButtonDelete: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deleteText: {
    fontSize: 16,
  },

  // Empty state
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
});
