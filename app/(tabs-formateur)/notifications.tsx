import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';

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
}

export default function NotificationsFormateurScreen() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const notifQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
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
              msg: getNotifMessage(data.type),
              title: data.videoTitle || '',
              time: formatTime(data.createdAt),
              avatar: data.fromUserAvatar || 'https://via.placeholder.com/150',
              thumb: data.videoThumb || '',
              comment: data.comment || '',
              read: data.read || false,
              createdAt: data.createdAt,
              videoId: data.videoId,
              fromUserId: data.fromUserId
            });
            
            if (!data.read) unread++;
          });

          setNotifs(notifications);
          setUnreadCount(unread);
          setLoading(false);
        },
        (error) => {
          console.error('❌ ERREUR Firestore:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('❌ Erreur création query:', error);
      setLoading(false);
    }
  }, []);

  const getNotifMessage = (type: string) => {
    switch(type) {
      case 'like': return 'a aimé votre vidéo';
      case 'comment': return 'a commenté votre vidéo';
      case 'follow': return 'a commencé à vous suivre';
      case 'save': return 'a sauvegardé votre vidéo';
      case 'view': return 'a regardé votre vidéo';
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
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
      if (diffHours < 24) return `${diffHours} heure${diffHours > 1 ? 's' : ''}`;
      if (diffDays === 1) return 'hier';
      if (diffDays === 2) return 'il y a deux jours';
      if (diffDays < 7) return `${diffDays} jours`;
      
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (error) {
      return 'récemment';
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

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (error) {
      console.error('Erreur marquage lecture:', error);
    }
  };

  // ✅ REDIRECTION selon le type de notification
  const handleNotificationClick = async (notif: Notification) => {
    await markAsRead(notif.id);
    
    if (notif.type === 'follow' && notif.fromUserId) {
      // Aller vers le profil de l'apprenant
      router.push(`/profile/${notif.fromUserId}` as any);
    } else if (notif.type === 'comment' && notif.videoId) {
      // ✅ REDIRECTION vers la vidéo avec ouverture automatique des commentaires
      router.push({
        pathname: '/(tabs-formateur)',
        params: { openVideoId: notif.videoId, openComments: 'true' }
      } as any);
    } else if ((notif.type === 'like' || notif.type === 'save') && notif.videoId) {
      // Aller vers la vidéo
      router.push({
        pathname: '/(tabs-formateur)',
        params: { openVideoId: notif.videoId }
      } as any);
    } else {
      // Par défaut, aller vers home formateur
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
          {unreadCount > 0 && (
            <View style={styles.msgBadge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
          <Ionicons name="chatbubble-outline" size={28} color="#18181B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {notifs.length > 0 ? (
          notifs.map((item) => {
            const icon = getNotifIcon(item.type);
            
            return (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.notifCard, !item.read && styles.unreadCard]}
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
                    <Text style={styles.notifVideo}>"{item.title}"</Text>
                  )}
                  {item.comment && (
                    <View style={styles.commentBox}>
                      <Text style={styles.commentText}>{item.comment}</Text>
                    </View>
                  )}
                  <Text style={styles.notifTime}>Il y a {item.time}</Text>
                </View>
                
                {item.thumb && <Image source={{ uri: item.thumb }} style={styles.thumbnail} />}
              </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    color: '#71717A',
    fontSize: 14,
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
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: '#FAF5FF',
    borderColor: '#9333ea',
    borderWidth: 2,
  },
  leftSection: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
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
  notifVideo: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#9333ea', 
    marginTop: 4,
    lineHeight: 20,
  },
  commentBox: {
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  commentText: {
    fontSize: 13,
    color: '#1E40AF',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  notifTime: { fontSize: 12, color: '#A1A1AA', marginTop: 6 },
  thumbnail: { 
    width: 70, 
    height: 70, 
    borderRadius: 12, 
    marginLeft: 10,
    backgroundColor: '#F3F4F6',
  },
  emptyState: {
    marginTop: 120,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 24,
    color: '#18181B',
    fontWeight: 'bold',
  },
  emptySubtext: {
    marginTop: 12,
    fontSize: 15,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 22,
  },
});