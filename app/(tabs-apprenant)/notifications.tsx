import React, { useState, useEffect } from 'react';
import { 
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, 
  Platform, ActivityIndicator, LogBox 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy, deleteDoc } from 'firebase/firestore';

LogBox.ignoreLogs(['Unexpected text node', 'aria-hidden']);

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

export default function NotificationsApprenantScreen() {
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

    const unsubscribeNotifs = onSnapshot(notifQuery, (snapshot) => {
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
    });

    const messagesQuery = query(collection(db, 'messages'), where('read', '==', false));
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const unreadMessages = snapshot.docs.filter(doc => {
        const data = doc.data();
        return (data.conversationId || '').includes(user.uid) && data.senderId !== user.uid;
      });
      setMessageCount(unreadMessages.length);
    });

    return () => { unsubscribeNotifs(); unsubscribeMessages(); };
  }, []);

  const getNotifMessage = (type: string, data?: any) => {
    switch(type) {
      case 'like': return 'a aimé votre vidéo';
      case 'comment': return 'a commenté votre vidéo';
      case 'comment_reply': return 'a répondu à votre commentaire';
      case 'comment_like': return 'a aimé votre commentaire';
      case 'follow': return 'a commencé à vous suivre';
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
      const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
      if (diffMins < 1) return 'à l\'instant';
      if (diffMins < 60) return `${diffMins} min`;
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (e) { return 'récemment'; }
  };

  const getNotifIcon = (type: string): { name: string; colors: [string, string] } => {
    switch(type) {
      case 'like': return { name: 'heart', colors: ['#ef4444', '#dc2626'] };
      case 'comment': return { name: 'chatbubble', colors: ['#3b82f6', '#2563eb'] };
      case 'comment_reply': return { name: 'chatbubbles', colors: ['#7459f0', '#9333ea'] };
      case 'comment_like': return { name: 'heart-circle', colors: ['#ec4899', '#db2777'] };
      case 'follow': return { name: 'person-add', colors: ['#10b981', '#059669'] };
      case 'badge': return { name: 'ribbon', colors: ['#FBA31A', '#F59E0B'] };
      case 'video_share': return { name: 'share-social', colors: ['#7459f0', '#9333ea'] };
      default: return { name: 'notifications', colors: ['#7459f0', '#9333ea'] };
    }
  };

  const markAsRead = async (notifId: string) => {
    try { await updateDoc(doc(db, 'notifications', notifId), { read: true }); } catch (e) {}
  };

  const handleNotificationClick = async (notif: Notification) => {
    await markAsRead(notif.id);
    if (notif.type === 'message' && notif.fromUserId) {
      router.push(`/message?userId=${notif.fromUserId}` as any);
    } else if (notif.type === 'badge') {
      router.push('/(tabs-apprenant)/profile' as any);
    } else if (notif.videoId) {
      const isCommentType = notif.type.includes('comment');
      router.push(`/(tabs-apprenant)/home?videoId=${notif.videoId}${isCommentType ? '&openComments=true' : ''}` as any);
    }
  };

  const deleteNotif = async (notifId: string) => {
    try { await deleteDoc(doc(db, 'notifications', notifId)); } catch (e) {}
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#7459f0" /></View>;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFFFFF', '#F9FAFB']} style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            {/* CORRECTION ICI : Utilisation de !! pour éviter Unexpected text node */}
            {!!unreadCount && unreadCount > 0 ? (
              <LinearGradient colors={['#7459f0', '#9333ea']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}</Text>
              </LinearGradient>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => router.push('/message' as any)} style={styles.iconBtnWrapper}>
            <LinearGradient colors={['#7459f0', '#9333ea', '#242A65']} style={styles.iconBtn}>
              {/* CORRECTION ICI : Utilisation de !! */}
              {!!messageCount && messageCount > 0 ? (
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
        {notifs.map((item) => {
          const icon = getNotifIcon(item.type);
          const isBadge = item.type === 'badge';
          return (
            <TouchableOpacity key={item.id} style={styles.notifCardWrapper} onPress={() => handleNotificationClick(item)}>
              <LinearGradient
                colors={isBadge ? ['#FFF5E6', '#FFFAF0'] : !item.read ? ['#F3E8FF', '#FAF5FF'] : ['#FFFFFF', '#FAFAFA']}
                style={[styles.notifCard, !item.read && styles.unreadCard, isBadge && styles.badgeCard]}
              >
                <View style={styles.notifContent}>
                  <View style={styles.leftSection}>
                    <LinearGradient colors={isBadge ? ['#FBA31A', '#F59E0B'] : ['#7459f0', '#242A65']} style={styles.avatarBorder}>
                      <View style={styles.avatarWrapper}><Image source={{ uri: item.avatar }} style={styles.avatar} /></View>
                    </LinearGradient>
                    <LinearGradient colors={icon.colors} style={styles.iconBadge}><Ionicons name={icon.name as any} size={14} color="#fff" /></LinearGradient>
                  </View>
                  <View style={styles.notifInfo}>
                    <Text style={styles.notifUser}>{item.user}</Text>
                    <Text style={[styles.notifMsg, isBadge && styles.badgeMsg]}>{item.msg}</Text>
                    {/* CORRECTION ICI : Utilisation de !! */}
                    {!!item.title ? (
                      <View style={styles.videoTitleBadge}><Text style={styles.videoTitleText} numberOfLines={1}>📹 {item.title}</Text></View>
                    ) : null}
                    {!!item.comment ? (
                      <View style={styles.commentPreview}><Text style={styles.commentPreviewText} numberOfLines={1}>"{item.comment}"</Text></View>
                    ) : null}
                    <View style={styles.timeRow}><Ionicons name="time-outline" size={12} color="#9CA3AF" /><Text style={styles.notifTime}>{item.time}</Text></View>
                  </View>
                  <TouchableOpacity onPress={() => deleteNotif(item.id)} style={styles.deleteBtnWrapper}>
                    <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.deleteBtn}><Ionicons name="close" size={16} color="#EF4444" /></LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerGradient: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1F2937' },
  unreadBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 4 },
  unreadBadgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  iconBtnWrapper: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  msgBadge: { position: 'absolute', top: -4, right: -4, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  notifCardWrapper: { marginBottom: 16 },
  notifCard: { borderRadius: 20, overflow: 'hidden' },
  unreadCard: { borderWidth: 1.5, borderColor: '#7459f0' },
  badgeCard: { borderWidth: 1.5, borderColor: '#FBA31A' },
  notifContent: { flexDirection: 'row', padding: 16, alignItems: 'flex-start' },
  leftSection: { position: 'relative', marginRight: 12 },
  avatarBorder: { padding: 2, borderRadius: 28 },
  avatarWrapper: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: '#FFF' },
  avatar: { width: '100%', height: '100%' },
  iconBadge: { position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  notifInfo: { flex: 1, marginLeft: 8 },
  notifUser: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  notifMsg: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  badgeMsg: { fontWeight: '700', color: '#B45309' },
  videoTitleBadge: { backgroundColor: '#F3E8FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginVertical: 8 },
  videoTitleText: { fontSize: 11, fontWeight: '700', color: '#7459f0' },
  commentPreview: { borderLeftWidth: 3, borderLeftColor: '#D1D5DB', paddingLeft: 8, marginVertical: 6 },
  commentPreviewText: { fontSize: 12, fontStyle: 'italic', color: '#4B5563' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  notifTime: { fontSize: 11, color: '#9CA3AF' },
  deleteBtnWrapper: { marginLeft: 10 },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }
});
// ... gardez vos styles identiques ... //