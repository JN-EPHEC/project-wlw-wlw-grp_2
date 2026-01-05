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
      case 'like': return { name: 'heart', colors: ['#ef4444', '#dc2626'] as [string, string] };
      case 'comment': return { name: 'chatbubble', colors: ['#3b82f6', '#2563eb'] as [string, string] };
      case 'comment_reply': return { name: 'chatbubbles', colors: ['#7459f0', '#9333ea'] as [string, string] };
      case 'comment_like': return { name: 'heart-circle', colors: ['#ec4899', '#db2777'] as [string, string] };
      case 'follow': return { name: 'person-add', colors: ['#10b981', '#059669'] as [string, string] };
      case 'save': return { name: 'bookmark', colors: ['#7459f0', '#242A65'] as [string, string] };
      case 'badge': return { name: 'ribbon', colors: ['#FBA31A', '#F59E0B'] as [string, string] };
      case 'video_share': return { name: 'share-social', colors: ['#7459f0', '#9333ea'] as [string, string] };
      case 'message': return { name: 'mail', colors: ['#7459f0', '#242A65'] as [string, string] };
      default: return { name: 'notifications', colors: ['#7459f0', '#9333ea'] as [string, string] };
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
      router.push(`/(tabs-formateur)/home?videoId=${notif.videoId}&openComments=true` as any);
      
    } else if (notif.type === 'comment_reply' && notif.videoId) {
      router.push(`/(tabs-formateur)/home?videoId=${notif.videoId}&openComments=true` as any);
      
    } else if (notif.type === 'comment_like' && notif.videoId) {
      router.push(`/(tabs-formateur)/home?videoId=${notif.videoId}&openComments=true` as any);
      
    } else if ((notif.type === 'like' || notif.type === 'save' || notif.type === 'video_share' || notif.type === 'view') && notif.videoId) {
      router.push(`/(tabs-formateur)/home?videoId=${notif.videoId}` as any);
      
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
        <LinearGradient
          colors={['#7459f0', '#9333ea', '#242A65']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loadingIconWrapper}
        >
          <ActivityIndicator size="large" color="#FFF" />
        </LinearGradient>
        <Text style={styles.loadingText}>Chargement de vos notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER AVEC DÉGRADÉ */}
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <LinearGradient
                colors={['#7459f0', '#9333ea']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.unreadBadge}
              >
                <Text style={styles.unreadBadgeText}>{unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}</Text>
              </LinearGradient>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/message' as any)} 
            style={styles.iconBtnWrapper}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#7459f0', '#9333ea', '#242A65']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBtn}
            >
              {messageCount > 0 && (
                <LinearGradient
                  colors={['#FBA31A', '#F59E0B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.msgBadge}
                >
                  <Text style={styles.badgeText}>{messageCount}</Text>
                </LinearGradient>
              )}
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
              <TouchableOpacity 
                key={item.id} 
                style={styles.notifCardWrapper}
                onPress={() => handleNotificationClick(item)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    isBadgeNotif 
                      ? ['#FFF5E6', '#FFFAF0'] 
                      : !item.read 
                        ? ['#F3E8FF', '#FAF5FF']
                        : ['#FFFFFF', '#FAFAFA']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.notifCard,
                    isBadgeNotif && styles.badgeCard,
                    !item.read && styles.unreadCard
                  ]}
                >
                  <View style={styles.notifContent}>
                    {/* AVATAR + ICON BADGE AVEC DÉGRADÉ */}
                    <View style={styles.leftSection}>
                      <LinearGradient
                        colors={isBadgeNotif ? ['#FBA31A', '#F59E0B'] : ['#7459f0', '#242A65']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.avatarBorder}
                      >
                        <View style={styles.avatarWrapper}>
                          <Image source={{ uri: item.avatar }} style={styles.avatar} />
                        </View>
                      </LinearGradient>
                      
                      <LinearGradient
                        colors={icon.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconBadge}
                      >
                        <Ionicons name={icon.name as any} size={14} color="#fff" />
                      </LinearGradient>
                    </View>
                    
                    {/* CONTENU NOTIFICATION */}
                    <View style={styles.notifInfo}>
                      <Text style={styles.notifUser}>{item.user}</Text>
                      <Text style={[styles.notifMsg, isBadgeNotif && styles.badgeMsg]}>
                        {item.msg}
                      </Text>
                      
                      {item.title && (
                        <LinearGradient
                          colors={['#E9D5FF', '#F3E8FF']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.videoTitleBadge}
                        >
                          <Text style={styles.videoTitleText} numberOfLines={1}>
                            📹 {item.title}
                          </Text>
                        </LinearGradient>
                      )}
                      
                      {item.comment && (
                        <LinearGradient
                          colors={['#EFF6FF', '#F0F9FF']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.commentBox}
                        >
                          <View style={styles.commentBorderLeft} />
                          <Text style={styles.commentText} numberOfLines={2}>
                            💬 {item.comment}
                          </Text>
                        </LinearGradient>
                      )}
                      
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.notifTime}>{item.time}</Text>
                      </View>
                    </View>
                    
                    {/* THUMBNAIL */}
                    {item.thumb && (
                      <View style={styles.thumbnailWrapper}>
                        <Image source={{ uri: item.thumb }} style={styles.thumbnail} />
                        <LinearGradient
                          colors={['transparent', 'rgba(116, 89, 240, 0.3)']}
                          style={styles.thumbnailOverlay}
                        >
                          <Ionicons name="play-circle" size={24} color="#FFF" />
                        </LinearGradient>
                      </View>
                    )}
                  </View>
                  
                  {/* BOUTON SUPPRIMER AVEC DÉGRADÉ */}
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      deleteNotif(item.id);
                    }}
                    style={styles.deleteBtnWrapper}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#FEE2E2', '#FECACA']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="close" size={16} color="#EF4444" />
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#7459f0', '#9333ea', '#242A65']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIconWrapper}
            >
              <Ionicons name="notifications-off-outline" size={50} color="#fff" />
            </LinearGradient>
            
            <LinearGradient
              colors={['#1F2937', '#374151']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyTitleGradient}
            >
              <Text style={styles.emptyTitle}>Vous êtes à jour !</Text>
            </LinearGradient>
            
            <Text style={styles.emptySubtext}>
              Les interactions avec vos vidéos apparaîtront ici
            </Text>
            
            <TouchableOpacity 
              onPress={() => router.push('/(tabs-formateur)/home' as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7459f0', '#9333ea', '#242A65']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyActionBtn}
              >
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
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F9FAFB' 
  },
  loadingIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12
  },
  loadingText: { 
    marginTop: 12, 
    color: '#71717A', 
    fontSize: 15,
    fontWeight: '600'
  },
  headerGradient: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#1F2937',
    marginBottom: 6
  },
  unreadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold'
  },
  iconBtnWrapper: {},
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6
  },
  msgBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#FFF',
    paddingHorizontal: 5,
    shadowColor: '#FBA31A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6
  },
  badgeText: { 
    color: '#FFF', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  scrollContent: { 
    padding: 20, 
    paddingBottom: 32 
  },
  
  // CARTE NOTIFICATION AVEC DÉGRADÉS
  notifCardWrapper: {
    marginBottom: 16
  },
  notifCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  unreadCard: {
    borderWidth: 2,
    borderColor: '#7459f0',
  },
  badgeCard: {
    borderWidth: 2,
    borderColor: '#FBA31A',
  },
  notifContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  leftSection: { 
    position: 'relative', 
    marginRight: 12 
  },
  avatarBorder: {
    padding: 3,
    borderRadius: 28,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  avatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#FFF'
  },
  avatar: { 
    width: '100%', 
    height: '100%' 
  },
  iconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6
  },
  notifInfo: { 
    flex: 1 
  },
  notifUser: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1F2937', 
    marginBottom: 4 
  },
  notifMsg: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginBottom: 10,
    lineHeight: 20
  },
  badgeMsg: {
    fontWeight: '700',
    fontSize: 15
  },
  videoTitleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 10,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  videoTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7459f0'
  },
  commentBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    position: 'relative',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  commentBorderLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#3b82f6',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10
  },
  commentText: { 
    fontSize: 13, 
    color: '#1E40AF', 
    lineHeight: 18,
    fontWeight: '500'
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6
  },
  notifTime: { 
    fontSize: 11, 
    color: '#9CA3AF', 
    fontWeight: '600'
  },
  thumbnailWrapper: {
    position: 'relative',
    marginLeft: 8
  },
  thumbnail: { 
    width: 70, 
    height: 70, 
    borderRadius: 12, 
    backgroundColor: '#F3F4F6' 
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  chevronWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  deleteBtnWrapper: {
    position: 'absolute',
    top: 10,
    right: 10
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  emptyState: { 
    marginTop: 100, 
    alignItems: 'center', 
    paddingHorizontal: 40 
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12
  },
  emptyTitleGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12
  },
  emptyTitle: { 
    fontSize: 24, 
    color: '#FFF', 
    fontWeight: 'bold',
    textAlign: 'center'
  },
  emptySubtext: { 
    marginTop: 8,
    marginBottom: 30,
    fontSize: 15, 
    color: '#71717A', 
    textAlign: 'center', 
    lineHeight: 22 
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8
  },
  emptyActionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});