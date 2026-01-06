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

// Désactivation des logs inutiles pour la clarté
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
          msg: data.type === 'badge' ? `🎉 Badge ${data.badge} débloqué !` : (data.msg || 'nouvelle interaction'),
          title: data.videoTitle || '',
          time: 'récemment', 
          avatar: data.fromUserAvatar || 'https://ui-avatars.com/api/?name=' + (data.fromUserName || 'U'),
          read: data.read || false,
          createdAt: data.createdAt,
          videoId: data.videoId,
          fromUserId: data.fromUserId,
        });
        if (!data.read) unread++;
      });

      setNotifs(notifications);
      setUnreadCount(unread);
      setLoading(false);
    });

    return () => unsubscribeNotifs();
  }, []);

  const deleteNotif = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#7459f0" /></View>;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFFFFF', '#F9FAFB']} style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <LinearGradient colors={['#7459f0', '#9333ea']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}</Text>
              </LinearGradient>
            )}
          </View>
          
          <TouchableOpacity onPress={() => router.push('/message' as any)} style={styles.iconBtnWrapper}>
            <LinearGradient colors={['#7459f0', '#9333ea', '#242A65']} style={styles.iconBtn}>
              <Ionicons name="chatbubble" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {notifs.map((item) => (
          <View key={item.id} style={styles.notifCardWrapper}>
            <LinearGradient
              colors={item.type === 'badge' ? ['#FFF5E6', '#FFFAF0'] : !item.read ? ['#F3E8FF', '#FAF5FF'] : ['#FFFFFF', '#FAFAFA']}
              style={[styles.notifCard, !item.read && styles.unreadCard, item.type === 'badge' && styles.badgeCard]}
            >
              <View style={styles.notifContent}>
                <View style={styles.leftSection}>
                  <View style={styles.avatarWrapper}>
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                  </View>
                  <View style={styles.iconBadge}>
                    <Ionicons name="notifications" size={12} color="#fff" />
                  </View>
                </View>
                
                <View style={styles.notifInfo}>
                  <Text style={styles.notifUser}>{item.user}</Text>
                  <Text style={[styles.notifMsg, item.type === 'badge' && styles.badgeMsg]}>{item.msg}</Text>
                </View>

                <TouchableOpacity onPress={() => deleteNotif(item.id)} style={styles.deleteBtnWrapper}>
                  <View style={styles.deleteBtn}><Ionicons name="close" size={14} color="#EF4444" /></View>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        ))}
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
  
  // Correction Property 'iconBtnWrapper'
  iconBtnWrapper: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  
  scrollContent: { padding: 20 },
  notifCardWrapper: { marginBottom: 16 },
  notifCard: { borderRadius: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  unreadCard: { borderWidth: 1.5, borderColor: '#7459f0' },
  badgeCard: { borderWidth: 1.5, borderColor: '#FBA31A' },
  notifContent: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  
  // Correction Property 'leftSection'
  leftSection: { position: 'relative', marginRight: 12 },
  
  avatarWrapper: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  avatar: { width: '100%', height: '100%' },
  iconBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#7459f0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  notifInfo: { flex: 1 },
  notifUser: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
  notifMsg: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  
  // Correction Property 'badgeMsg'
  badgeMsg: { color: '#B45309', fontWeight: '600' },
  
  deleteBtnWrapper: { marginLeft: 10 },
  deleteBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }
});