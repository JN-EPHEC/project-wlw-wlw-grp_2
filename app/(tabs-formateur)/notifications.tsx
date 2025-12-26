import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

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
}

export default function NotificationsFormateurScreen() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    console.log('🔍 Chargement notifications formateur...');
    
    const user = auth.currentUser;
    console.log('👤 User ID:', user?.uid);
    
    if (!user) {
      console.log('❌ Pas connecté');
      setLoading(false);
      return;
    }

    try {
      // Écouter les notifications en temps réel
      const notifQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid)
      );

      console.log('✅ Query créée, attente données...');

      const unsubscribe = onSnapshot(
        notifQuery,
        (snapshot) => {
          console.log('📬 Données reçues:', snapshot.docs.length, 'notifications');
          
          const notifications: Notification[] = [];
          let unread = 0;

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            console.log('📄 Document:', docSnap.id, data);
            
            // Transformer les données Firebase
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
              createdAt: data.createdAt
            });
            
            if (!data.read) unread++;
          });

          console.log('✅ Total:', notifications.length, '| Non lus:', unread);
          setNotifs(notifications);
          setUnreadCount(unread);
          setLoading(false);
        },
        (error) => {
          console.error('❌ ERREUR Firestore:', error);
          setLoading(false);
        }
      );

      return () => {
        console.log('🧹 Nettoyage listener');
        unsubscribe();
      };
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
      if (diffMins < 60) return `${diffMins} minutes`;
      if (diffHours < 24) return `${diffHours} heures`;
      if (diffDays === 1) return '1 jour';
      return `${diffDays} jours`;
    } catch (error) {
      return 'récemment';
    }
  };

  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'like': return { name: 'heart', color: '#ef4444' };
      case 'comment': return { name: 'chatbubble', color: '#3b82f6' };
      case 'follow': return { name: 'person-add', color: '#10b981' };
      default: return { name: 'notifications', color: '#9333ea' };
    }
  };

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
      console.log('✓ Notification marquée comme lue:', notifId);
    } catch (error) {
      console.error('Erreur marquage lecture:', error);
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
                onPress={() => markAsRead(item.id)}
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
                  {item.title && <Text style={styles.notifVideo}>"{item.title}"</Text>}
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
  iconBtn: { padding: 5 },
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