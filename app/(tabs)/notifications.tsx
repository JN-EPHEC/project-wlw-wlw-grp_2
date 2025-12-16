import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    View
} from 'react-native';

// Types
type NotificationType = 
  | 'message' 
  | 'alert' 
  | 'info' 
  | 'course_update' 
  | 'progress' 
  | 'certificate' 
  | 'reminder' 
  | 'question' 
  | 'review' 
  | 'milestone';

type Priority = 'high' | 'normal' | 'low';
type FilterType = 'all' | 'unread' | 'read';
type SortType = 'date' | 'priority';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: Priority;
  courseId?: string;
  courseName?: string;
  actionUrl?: string;
  metadata?: {
    progress?: number;
    studentCount?: number;
    rating?: number;
  };
}

// Données mockées
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'course_update',
    title: 'Nouveau contenu disponible',
    message: 'Un nouveau module a été ajouté à "React Native Avancé"',
    timestamp: '2024-01-20T10:30:00',
    read: false,
    priority: 'high',
    courseId: 'course-123',
    courseName: 'React Native Avancé',
    actionUrl: '/courses/course-123',
  },
  {
    id: '2',
    type: 'progress',
    title: 'Félicitations ! 🎉',
    message: 'Vous avez complété 50% de "TypeScript pour débutants"',
    timestamp: '2024-01-20T09:15:00',
    read: false,
    priority: 'normal',
    courseId: 'course-456',
    courseName: 'TypeScript pour débutants',
    actionUrl: '/courses/course-456',
    metadata: { progress: 50 },
  },
  {
    id: '3',
    type: 'certificate',
    title: 'Certificat disponible',
    message: 'Votre certificat de "JavaScript ES6" est prêt à télécharger',
    timestamp: '2024-01-19T14:20:00',
    read: true,
    priority: 'normal',
    courseId: 'course-789',
    courseName: 'JavaScript ES6',
    actionUrl: '/certificates/cert-789',
  },
  {
    id: '4',
    type: 'reminder',
    title: 'Rappel de cours',
    message: 'Vous n\'avez pas continué "Python Basics" depuis 7 jours',
    timestamp: '2024-01-18T08:00:00',
    read: false,
    priority: 'low',
    courseId: 'course-101',
    courseName: 'Python Basics',
    actionUrl: '/courses/course-101',
  },
  {
    id: '5',
    type: 'question',
    title: 'Nouvelle question',
    message: 'Un étudiant a posé une question dans "React Hooks"',
    timestamp: '2024-01-17T16:45:00',
    read: true,
    priority: 'high',
    courseId: 'course-202',
    courseName: 'React Hooks',
    actionUrl: '/courses/course-202/discussions',
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [refreshing, setRefreshing] = useState(false);

  
  // Simule la vérification au chargement
  useEffect(() => {
    // Dans une vraie app, tu écouterais Firebase ici
    // checkUserProgress();
  }, []);

  // Fonctions de gestion
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

  const clearAll = () => {
    Alert.alert(
      'Tout supprimer',
      'Êtes-vous sûr de vouloir supprimer toutes les notifications ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: () => setNotifications([]),
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Simule un chargement
    setTimeout(() => {
      setRefreshing(false);
      // checkUserProgress(); // Vérifie les nouveaux progrès
    }, 1500);
  };

  // ✨ FONCTIONNALITÉ 2 : Navigation vers les cours
  const handleNotificationPress = (notification: Notification) => {
    // Marque comme lu automatiquement
    markAsRead(notification.id);

    // Navigation vers le cours ou la page concernée
    if (notification.actionUrl) {
      // Dans une vraie app avec expo-router :
      // router.push(notification.actionUrl);
      
      // Pour le moment, on affiche juste une alerte
      Alert.alert(
        'Navigation',
        `Redirection vers : ${notification.actionUrl}\n\nCours : ${notification.courseName}`,
        [
          { text: 'OK' },
          {
            text: 'Voir le cours',
            onPress: () => {
              // router.push(notification.actionUrl);
              console.log('Navigation vers:', notification.actionUrl);
            },
          },
        ]
      );
    }
  };

  // Filtrage et tri
  const filteredAndSortedNotifications = useMemo(() => {
    // Filtrage
    let filtered = notifications;
    if (filter === 'unread') {
      filtered = notifications.filter((n) => !n.read);
    } else if (filter === 'read') {
      filtered = notifications.filter((n) => n.read);
    }

    // Tri
    return [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      const priorityOrder: Record<Priority, number> = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [notifications, filter, sortBy]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fonctions utilitaires
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
      message: '💬',
      alert: '⚠️',
      info: 'ℹ️',
      course_update: '📚',
      progress: '🎯',
      certificate: '🏆',
      reminder: '⏰',
      question: '❓',
      review: '⭐',
      milestone: '🎉',
    };
    return icons[type] || '📢';
  };

  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'normal':
        return '#3b82f6';
      case 'low':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: Priority): string => {
    switch (priority) {
      case 'high':
        return 'Urgent';
      case 'normal':
        return 'Normal';
      case 'low':
        return 'Faible';
    }
  };

  // Render functions
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <ThemedText type="title">🔔 Notifications</ThemedText>
          <ThemedText style={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
          </ThemedText>
        </View>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{unreadCount}</ThemedText>
          </View>
        )}
      </View>

      {/* Actions principales */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.buttonPrimary, unreadCount === 0 && styles.buttonDisabled]}
          onPress={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <ThemedText style={styles.buttonText}>✓ Tout marquer lu</ThemedText>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonDanger, notifications.length === 0 && styles.buttonDisabled]}
          onPress={clearAll}
          disabled={notifications.length === 0}
        >
          <ThemedText style={styles.buttonText}>🗑️ Tout supprimer</ThemedText>
        </Pressable>
      </View>

      {/* Filtres */}
      <View style={styles.filters}>
        <ThemedText type="defaultSemiBold" style={styles.filterLabel}>
          Filtres:
        </ThemedText>
        <View style={styles.filterButtons}>
          <Pressable
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <ThemedText style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
              Toutes ({notifications.length})
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
            onPress={() => setFilter('unread')}
          >
            <ThemedText style={[styles.filterButtonText, filter === 'unread' && styles.filterButtonTextActive]}>
              Non lues ({unreadCount})
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.filterButton, filter === 'read' && styles.filterButtonActive]}
            onPress={() => setFilter('read')}
          >
            <ThemedText style={[styles.filterButtonText, filter === 'read' && styles.filterButtonTextActive]}>
              Lues ({notifications.length - unreadCount})
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Tri */}
      <View style={styles.sortContainer}>
        <ThemedText style={styles.sortLabel}>Trier par:</ThemedText>
        <View style={styles.sortButtons}>
          <Pressable
            style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
            onPress={() => setSortBy('date')}
          >
            <ThemedText style={[styles.sortButtonText, sortBy === 'date' && styles.sortButtonTextActive]}>
              Date
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.sortButton, sortBy === 'priority' && styles.sortButtonActive]}
            onPress={() => setSortBy('priority')}
          >
            <ThemedText style={[styles.sortButtonText, sortBy === 'priority' && styles.sortButtonTextActive]}>
              Priorité
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderNotification = ({ item }: { item: Notification }) => (
    <Pressable 
      style={[styles.notifCard, !item.read && styles.notifCardUnread]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notifHeader}>
        <View style={styles.notifIconContainer}>
          <ThemedText style={styles.notifIcon}>{getTypeIcon(item.type)}</ThemedText>
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifTitleRow}>
            <ThemedText type="defaultSemiBold" style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>
              {item.title}
            </ThemedText>
            <View style={[styles.priorityBadge, { borderColor: getPriorityColor(item.priority) }]}>
              <ThemedText style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {getPriorityLabel(item.priority)}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={styles.notifMessage}>{item.message}</ThemedText>

          {item.metadata?.progress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${item.metadata.progress}%` }]} />
              </View>
              <ThemedText style={styles.progressText}>{item.metadata.progress}%</ThemedText>
            </View>
          )}

          {/* ✨ NOUVEAU : Bouton d'action rapide */}
          {item.actionUrl && (
            <Pressable 
              style={styles.actionUrlButton}
              onPress={() => handleNotificationPress(item)}
            >
              <ThemedText style={styles.actionUrlButtonText}>
                {item.type === 'certificate' ? '📥 Télécharger' : '👉 Voir le cours'}
              </ThemedText>
            </Pressable>
          )}

          <View style={styles.notifFooter}>
            <ThemedText style={styles.timestamp}>{formatTimestamp(item.timestamp)}</ThemedText>

            <View style={styles.notifActions}>
              {!item.read && (
                <Pressable 
                  style={styles.actionButton} 
                  onPress={(e) => {
                    e.stopPropagation(); // Empêche la navigation
                    markAsRead(item.id);
                  }}
                >
                  <ThemedText style={styles.actionButtonText}>✓ Marquer lu</ThemedText>
                </Pressable>
              )}

              <Pressable 
                style={styles.actionButton} 
                onPress={(e) => {
                  e.stopPropagation(); // Empêche la navigation
                  deleteNotification(item.id);
                }}
              >
                <ThemedText style={[styles.actionButtonText, styles.actionButtonTextDanger]}>🗑️ Supprimer</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyIcon}>🔔</ThemedText>
      <ThemedText type="subtitle" style={styles.emptyText}>
        Aucune notification
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={filteredAndSortedNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    gap: 16,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 20,
    minWidth: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
  },
  buttonDanger: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  filters: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  sortButtonActive: {
    backgroundColor: '#3b82f6',
  },
  sortButtonText: {
    fontSize: 13,
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  separator: {
    height: 12,
  },
  notifCard: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  notifCardUnread: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderLeftColor: '#3b82f6',
  },
  notifHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  notifIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifIcon: {
    fontSize: 24,
  },
  notifContent: {
    flex: 1,
    gap: 8,
  },
  notifTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  notifTitle: {
    flex: 1,
    fontSize: 15,
  },
  notifTitleUnread: {
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notifMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  // ✨ NOUVEAU : Styles pour le bouton d'action
  actionUrlButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  actionUrlButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  notifFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  notifActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  actionButtonTextDanger: {
    color: '#ef4444',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.3,
  },
  emptyText: {
    color: '#9ca3af',
  },
});
