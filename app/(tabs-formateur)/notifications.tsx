import React, { useState, useEffect } from 'react';
import { 
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, 
  Platform, ActivityIndicator, LogBox 
} from 'react-native';

LogBox.ignoreLogs([
  'Unexpected text node',
  'aria-hidden',
]);

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

    const messagesQuery = query(
      collection(db, 'messages'),
      where('read', '==', false)
    );

    const unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
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
      case 'badge': return `🎉 Vous avez débloqué le badge ${data?.badge || 'Expert'} !`;
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

  const getNotifIcon = (type: string): { name: string; colors: [string, string] } => {
    switch(type) {
      case 'like': return { name: 'heart', colors: ['#ef4444', '#dc2626'] };
      case 'comment': return { name: 'chatbubble', colors: ['#3b82f6', '#2563eb'] };
      case 'comment_reply': return { name: 'chatbubbles', colors: ['#7459f0', '#9333ea'] };
      case 'comment_like': return { name: 'heart-circle', colors: ['#ec4899', '#db2777'] };
      case 'follow': return { name: 'person-add', colors: ['#10b981', '#059669'] };
      case 'save': return { name: 'bookmark', colors: ['#7459f0', '#242A65'] };
      case 'badge': return { name: 'ribbon', colors: ['#FBA31A', '#F59E0B'] };
      case 'video_share': return { name: 'share-social', colors: ['#7459f0', '#9333ea'] };
      case 'message': return { name: 'mail', colors: ['#7459f0', '#242A65'] };
      default: return { name: 'notifications', colors: ['#7459f0', '#9333ea'] };
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
    try {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
    } catch (e) {}
    
    if (notif.type === 'follow' && notif.fromUserId) {
      router.push(`/profile/${notif.fromUserId}` as any);
    } else if (notif.videoId) {
      const path = (notif.type.includes('comment')) 
        ? `/(tabs-formateur)/home?videoId=${notif.videoId}&openComments=true`
        : `/(tabs-formateur)/home?videoId=${notif.videoId}`;
      router.push(path as any);
    } else if (notif.type === 'message' && notif.fromUserId) {
      router.push(`/message?userId=${notif.fromUserId}` as any);
    } else if (notif.type === 'badge') {
      router.push('/(tabs-formateur)/profile' as any);
    } else {
      router.push('/(tabs-formateur)/home' as any);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#7459f0', '#9333ea', '#242A65']} style={styles.loadingIconWrapper}>
          <ActivityIndicator size="large" color="#FFF" />
        </LinearGradient>
        <Text style={styles.loadingText}>Chargement de vos notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFFFFF', '#F9FAFB']} style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 ? (
              <LinearGradient colors={['#7459f0', '#9333ea']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}</Text>
              </LinearGradient>
            ) : null}
          </View>
          
          <TouchableOpacity onPress={() => router.push('/message' as any)} style={styles.iconBtnWrapper}>
            <LinearGradient colors={['#7459f0', '#9333ea', '#242A65']} style={styles.iconBtn}>
              {messageCount > 0 ? (
                <LinearGradient colors={['#FBA31A', '#F59E0B']} style={styles.msgBadge}>
                  <Text style={styles.badgeText}>{messageCount}</Text>
                </LinearGradient>
              ) : null}
              <Ionicons name="chatbubble" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {notifs.length > 0 ? (
          notifs.map((item) => {
            const icon = getNotifIcon(item.type);
            const isBadgeNotif = item.type === 'badge';
            
            return (
              <TouchableOpacity key={item.id} style={styles.notifCardWrapper} onPress={() => handleNotificationClick(item)} activeOpacity={0.8}>
                <LinearGradient
                  colors={isBadgeNotif ? ['#FFF5E6', '#FFFAF0'] : !item.read ? ['#F3E8FF', '#FAF5FF'] : ['#FFFFFF', '#FAFAFA']}
                  style={[styles.notifCard, isBadgeNotif && styles.badgeCard, !item.read && styles.unreadCard]}
                >
                  <View style={styles.notifContent}>
                    <View style={styles.leftSection}>
                      <LinearGradient colors={isBadgeNotif ? ['#FBA31A', '#F59E0B'] : ['#7459f0', '#242A65']} style={styles.avatarBorder}>
                        <View style={styles.avatarWrapper}>
                          <Image source={{ uri: item.avatar }} style={styles.avatar} />
                        </View>
                      </LinearGradient>
                      <LinearGradient colors={icon.colors} style={styles.iconBadge}>
                        <Ionicons name={icon.name as any} size={14} color="#fff" />
                      </LinearGradient>
                    </View>
                    
                    <View style={styles.notifInfo}>
                      <Text style={styles.notifUser}>{item.user}</Text>
                      <Text style={[styles.notifMsg, isBadgeNotif && styles.badgeMsg]}>{item.msg}</Text>
                      
                      {!!item.title && (
                        <LinearGradient colors={['#E9D5FF', '#F3E8FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.videoTitleBadge}>
                          <Text style={styles.videoTitleText} numberOfLines={1}>📹 {item.title}</Text>
                        </LinearGradient>
                      )}
                      
                      {!!item.comment && (
                        <LinearGradient colors={['#EFF6FF', '#F0F9FF']} style={styles.commentBox}>
                          <View style={styles.commentBorderLeft} />
                          <Text style={styles.commentText} numberOfLines={2}>💬 {item.comment}</Text>
                        </LinearGradient>
                      )}
                      
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.notifTime}>{item.time}</Text>
                      </View>
                    </View>
                    
                    {!!item.thumb && (
                      <View style={styles.thumbnailWrapper}>
                        <Image source={{ uri: item.thumb }} style={styles.thumbnail} />
                        <LinearGradient colors={['transparent', 'rgba(116, 89, 240, 0.3)']} style={styles.thumbnailOverlay}>
                          <Ionicons name="play-circle" size={24} color="#FFF" />
                        </LinearGradient>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    onPress={(e) => { e.stopPropagation(); deleteNotif(item.id); }}
                    style={styles.deleteBtnWrapper}
                  >
                    <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.deleteBtn}>
                      <Ionicons name="close" size={16} color="#EF4444" />
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <LinearGradient colors={['#7459f0', '#9333ea', '#242A65']} style={styles.emptyIconWrapper}>
              <Ionicons name="notifications-off-outline" size={50} color="#fff" />
            </LinearGradient>
            <Text style={styles.emptyTitleDark}>Vous êtes à jour !</Text>
            <Text style={styles.emptySubtext}>Les interactions avec vos vidéos apparaîtront ici</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs-formateur)/home' as any)}>
              <LinearGradient colors={['#7459f0', '#9333ea', '#242A65']} style={styles.emptyActionBtn}>
                <Text style={styles.emptyActionText}>Explorer les vidéos</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingIconWrapper: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  loadingText: { color: '#71717A', fontSize: 15, fontWeight: '600' },
  headerGradient: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1F2937' },
  unreadBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  unreadBadgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  iconBtnWrapper: {},
  iconBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  msgBadge: { position: 'absolute', top: -4, right: -4, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', zIndex: 1, borderWidth: 2, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  notifCardWrapper: { marginBottom: 16 },
  notifCard: { borderRadius: 20, overflow: 'hidden' },
  unreadCard: { borderWidth: 2, borderColor: '#7459f0' },
  badgeCard: { borderWidth: 2, borderColor: '#FBA31A' },
  notifContent: { flexDirection: 'row', padding: 16 },
  leftSection: { position: 'relative', marginRight: 12 },
  avatarBorder: { padding: 3, borderRadius: 28 },
  avatarWrapper: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', backgroundColor: '#FFF' },
  avatar: { width: '100%', height: '100%' },
  iconBadge: { position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  notifInfo: { flex: 1 },
  notifUser: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  notifMsg: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  badgeMsg: { fontWeight: '700' },
  videoTitleBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 10 },
  videoTitleText: { fontSize: 12, fontWeight: '700', color: '#7459f0' },
  commentBox: { padding: 12, borderRadius: 10, marginBottom: 10 },
  commentBorderLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#3b82f6', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  commentText: { fontSize: 13, color: '#1E40AF' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notifTime: { fontSize: 11, color: '#9CA3AF' },
  thumbnailWrapper: { marginLeft: 8 },
  thumbnail: { width: 70, height: 70, borderRadius: 12 },
  thumbnailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  deleteBtnWrapper: { position: 'absolute', top: 10, right: 10 },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyState: { marginTop: 100, alignItems: 'center' },
  emptyIconWrapper: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitleDark: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  emptySubtext: { fontSize: 15, color: '#71717A', textAlign: 'center', marginBottom: 30 },
  emptyActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  emptyActionText: { color: '#FFF', fontWeight: 'bold' }
});