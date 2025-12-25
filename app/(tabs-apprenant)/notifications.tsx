import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'save';
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  videoId?: string;
  videoTitle?: string;
  videoThumb?: string;
  comment?: string;
  read: boolean;
  createdAt: any;
}

export default function NotificationsFormateurScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setTimeout(() => router.replace('/login'), 100);
      return;
    }

    // Écouter les notifications en temps réel
    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      const notifs: Notification[] = [];
      let unread = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({ id: doc.id, ...data } as Notification);
        if (!data.read) unread++;
      });

      setNotifications(notifs);
      setUnreadCount(unread);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (error) {
      console.error('Erreur marquage lecture:', error);
    }
  };

  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'like': return { name: 'heart', color: '#ef4444' };
      case 'comment': return { name: 'chatbubble', color: '#3b82f6' };
      case 'follow': return { name: 'person-add', color: '#10b981' };
      case 'save': return { name: 'bookmark', color: '#f59e0b' };
      default: return { name: 'notifications', color: '#9333ea' };
    }
  };

  const getNotifMessage = (notif: Notification) => {
    switch(notif.type) {
      case 'like': return 'a aimé votre vidéo';
      case 'comment': return 'a commenté votre vidéo';
      case 'follow': return 'a commencé à vous suivre';
      case 'save': return 'a sauvegardé votre vidéo';
      default: return 'notification';
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    return `Il y a ${diffDays}j`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={() => router.push('/message' as any)} style={styles.iconBtn}>
          {unreadCount > 0 && (
            <View style={styles.msgBadge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
          <Ionicons name="chatbubble-outline" size={28} color="#18181B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {notifications.length > 0 ? (
          notifications.map((notif) => {
            const icon = getNotifIcon(notif.type);
            
            return (
              <TouchableOpacity 
                key={notif.id} 
                style={[styles.notifCard, !notif.read && styles.unreadCard]}
                onPress={() => markAsRead(notif.id)}
              >
                <View style={styles.leftSection}>
                  {notif.fromUserAvatar ? (
                    <Image source={{ uri: notif.fromUserAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitial}>
                        {notif.fromUserName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
                    <Ionicons name={icon.name as any} size={12} color="#fff" />
                  </View>
                </View>
                
                <View style={styles.notifInfo}>
                  <Text style={styles.notifUser}>{notif.fromUserName}</Text>
                  <Text style={styles.notifMsg}>{getNotifMessage(notif)}</Text>
                  {notif.videoTitle && (
                    <Text style={styles.notifVideo}>"{notif.videoTitle}"</Text>
                  )}
                  {notif.comment && (
                    <View style={styles.commentBox}>
                      <Text style={styles.commentText}>{notif.comment}</Text>
                    </View>
                  )}
                  <Text style={styles.notifTime}>{formatTime(notif.createdAt)}</Text>
                </View>
                
                {notif.videoThumb && (
                  <Image source={{ uri: notif.videoThumb }} style={styles.thumbnail} />
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color="#E5E7EB" />
            <Text style={styles.emptyText}>Aucune notification</Text>
            <Text style={styles.emptySubtext}>
              Vos interactions apparaîtront ici
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#18181B' },
  iconBtn: { padding: 5, position: 'relative' },
  msgBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#F97316',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  scrollContent: { padding: 16 },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  unreadCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#9333ea',
    borderWidth: 2,
  },
  leftSection: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#9333ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notifInfo: { flex: 1 },
  notifUser: { fontSize: 15, fontWeight: 'bold', color: '#18181B' },
  notifMsg: { fontSize: 14, color: '#3F3F46', marginTop: 2 },
  notifVideo: { fontSize: 14, fontWeight: '600', color: '#18181B', marginTop: 4 },
  commentBox: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  commentText: {
    fontSize: 13,
    color: '#3F3F46',
    fontStyle: 'italic',
  },
  notifTime: { fontSize: 12, color: '#A1A1AA', marginTop: 6 },
  thumbnail: { width: 70, height: 70, borderRadius: 12, marginLeft: 10 },
  emptyState: {
    marginTop: 100,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#18181B',
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
  },
});