import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy, deleteDoc } from 'firebase/firestore';

interface Notification {
  id: string;
  user: string;
  type: string;
  msg: string;
  title?: string;
  time: string;
  avatar: string;
  thumb?: string;
  comment?: string;
  read?: boolean;
  createdAt: any;
  videoId?: string;
  fromUserId?: string;
  badge?: string;
}

export default function NotificationsFormateurScreen() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    // 📧 LISTENER NOTIFICATIONS
    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeNotifs = onSnapshot(
      notifQuery,
      (snapshot) => {
        const notifications: Notification[] = [];
        let unread = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          
          notifications.push({
            id: docSnap.id,
            user: data.fromUserName || 'Utilisateur',
            type: data.type || 'notification',
            msg: getNotifMessage(data.type, data),
            title: data.videoTitle || '',
            time: formatTime(data.createdAt),
            avatar: data.fromUserAvatar || 'https://ui-avatars.com/api/?name=' + (data.fromUserName || 'U'),
            thumb: data.videoThumb || '',
            comment: data.comment || '',
            read: data.read || false,
            createdAt: data.createdAt,
            videoId: data.videoId,
            fromUserId: data.fromUserId,
            badge: data.badge
          });
          
          if (!data.read) unread++;
        });

        setNotifs(notifications);
        setUnreadCount(unread);
        setLoading(false);
      },
      (error) => {
        console.error('❌ ERREUR Notifications:', error);
        setLoading(false);
      }
    );

    // 📨 LISTENER MESSAGES NON LUS
    const messagesQuery = query(
      collection(db, 'messages'),
      where('read', '==', false)
    );

    const unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        // Filtrer les messages reçus (pas envoyés)
        const unreadMessages = snapshot.docs.filter(doc => {
          const data = doc.data();
          const conversationId = data.conversationId || '';
          return conversationId.includes(user.uid) && data.senderId !== user.uid;
        });
        
        setMessageCount(unreadMessages.length);
      }
    );

    return () => {
      unsubscribeNotifs();
      unsubscribeMessages();
    };
  }, []);

  const getNotifMessage = (type: string, data?: any) => {
    switch(type) {
      case 'like': return 'a aimé votre vidéo';
      case 'comment': return 'a commenté votre vidéo';
      case 'comment_reply': return 'a répondu à votre commentaire';
      case 'comment_like': return 'a aimé votre commentaire';
      case 'follow': return 'a commencé à vous suivre';
      case 'save': return 'a sauvegardé votre vidéo';
      case 'view': return 'a regardé votre vidéo';
      case 'badge': return `a reçu le badge ${data?.badge || 'Expert'}`;
      case 'video_share': return 'a partagé une vidéo avec vous';
      case 'message': return 'vous a envoyé un message';
      default: return 'notification';
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'récemment';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'à l\'instant';
      if (diffMins < 60) return `${diffMins} min`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays === 1) return 'hier';
      if (diffDays < 7) return `${diffDays}j`;
      
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (error) {
      return 'récemment';
    }
  };

  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'like': return { name: 'heart', color: '#ef4444' };
      case 'comment': return { name: 'chatbubble', color: '#3b82f6' };
      case 'comment_reply': return { name: 'chatbubbles', color: '#8b5cf6' };
      case 'comment_like': return { name: 'heart-circle', color: '#ec4899' };
      case 'follow': return { name: 'person-add', color: '#10b981' };
      case 'save': return { name: 'bookmark', color: '#f59e0b' };
      case 'badge': return { name: 'ribbon', color: '#fbbf24' };
      case 'video_share': return { name: 'share-social', color: '#06b6d4' };
      case 'message': return { name: 'mail', color: '#6366f1' };
      default: return { name: 'notifications', color: '#9333ea' };
    }
  };

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (error) {
      console.error('Erreur marquage lecture:', error);
    }
  };

  const deleteNotif = async (notifId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notifId));
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    await markAsRead(notif.id);
    
    if (notif.type === 'follow' && notif.fromUserId) {
      router.push(`/profile/${notif.fromUserId}` as any);
    } else if (notif.type === 'comment' && notif.videoId) {
      router.push({
        pathname: '/(tabs-formateur)',
        params: { openVideoId: notif.videoId, openComments: 'true' }
      } as any);
    } else if (notif.type === 'comment_reply' && notif.videoId) {
      router.push({
        pathname: '/(tabs-formateur)',
        params: { openVideoId: notif.videoId, openComments: 'true' }
      } as any);
    } else if ((notif.type === 'like' || notif.type === 'save' || notif.type === 'video_share') && notif.videoId) {
      router.push({
        pathname: '/(tabs-formateur)',
        params: { openVideoId: notif.videoId }
      } as any);
    } else if (notif.type === 'message' && notif.fromUserId) {
      router.push(`/message?userId=${notif.fromUserId}` as any);
    } else {
      router.push('/(tabs-formateur)' as any);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={() => router.push('/message' as any)} style={styles.iconBtn}>
          {messageCount > 0 && (
            <View style={styles.msgBadge}>
              <Text style={styles.badgeText}>{messageCount}</Text>
            </View>
          )}
          <Ionicons name="chatbubble-outline" size={28} color="#18181B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {notifs.length > 0 ? (
          notifs.map((item) => {
            const icon = getNotifIcon(item.type);
            
            return (
              <View key={item.id} style={[styles.notifCard, !item.read && styles.unreadCard]}>
                <TouchableOpacity 
                  style={styles.notifContent}
                  onPress={() => handleNotificationClick(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.leftSection}>
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
                      <Ionicons name={icon.name as any} size={12} color="#fff" />
                    </View>
                  </View>
                  
                  <View style={styles.notifInfo}>
                    <Text style={styles.notifUser}>{item.user}</Text>
                    <Text style={styles.notifMsg}>{item.msg}</Text>
                    {item.title && (
                      <Text style={styles.notifVideo} numberOfLines={1}>"{item.title}"</Text>
                    )}
                    {item.comment && (
                      <View style={styles.commentBox}>
                        <Text style={styles.commentText} numberOfLines={2}>{item.comment}</Text>
                      </View>
                    )}
                    <Text style={styles.notifTime}>Il y a {item.time}</Text>
                  </View>
                  
                  {item.thumb && <Image source={{ uri: item.thumb }} style={styles.thumbnail} />}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => deleteNotif(item.id)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={80} color="#22C55E" />
            <Text style={styles.emptyTitle}>Vous êtes à jour !</Text>
            <Text style={styles.emptySubtext}>
              Les interactions avec vos vidéos apparaîtront ici
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  loadingText: { marginTop: 12, color: '#71717A', fontSize: 14 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#18181B' },
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
  scrollContent: { padding: 16, paddingBottom: 32 },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#F5F3FF',
    borderColor: '#9333ea',
    borderLeftWidth: 4,
  },
  notifContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
  },
  leftSection: { position: 'relative', marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB' },
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
  notifUser: { fontSize: 15, fontWeight: 'bold', color: '#18181B', marginBottom: 2 },
  notifMsg: { fontSize: 14, color: '#52525B', marginBottom: 4 },
  notifVideo: { fontSize: 13, fontWeight: '600', color: '#9333ea', marginTop: 2, lineHeight: 18 },
  commentBox: {
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  commentText: { fontSize: 13, color: '#1E40AF', fontStyle: 'italic', lineHeight: 18 },
  notifTime: { fontSize: 12, color: '#A1A1AA', marginTop: 6 },
  thumbnail: { width: 60, height: 60, borderRadius: 10, marginLeft: 8, backgroundColor: '#F3F4F6' },
  deleteBtn: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: { marginTop: 100, alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { marginTop: 20, fontSize: 22, color: '#18181B', fontWeight: 'bold' },
  emptySubtext: { marginTop: 12, fontSize: 15, color: '#71717A', textAlign: 'center', lineHeight: 22 },
});