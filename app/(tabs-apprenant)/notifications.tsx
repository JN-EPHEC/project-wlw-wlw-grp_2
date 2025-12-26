import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

interface Notification {
  id: string;
  user: string;
  role: string;
  msg: string;
  title?: string;
  time: string;
  avatar: string;
  thumb?: string;
  type?: string;
  read?: boolean;
  createdAt: any;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    console.log('🔍 Chargement notifications...');
    
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
            
            // Transformer les données Firebase vers votre format
            notifications.push({
              id: docSnap.id,
              user: data.fromUserName || 'Utilisateur',
              role: data.role || 'Membre',
              msg: data.type === 'new_video' ? 'a posté une nouvelle vidéo' : data.msg || 'notification',
              title: data.videoTitle || '',
              time: formatTime(data.createdAt),
              avatar: data.fromUserAvatar || 'https://via.placeholder.com/150',
              thumb: data.videoThumb || '',
              type: data.type,
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

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
      console.log('✓ Notification marquée comme lue:', notifId);
    } catch (error) {
      console.error('Erreur marquage lecture:', error);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Marquer comme lue
    await markAsRead(notif.id);
    
    // Rediriger selon le type
    if (notif.type === 'follow') {
      // Aller vers le profil du formateur
      const userData = notifs.find(n => n.id === notif.id);
      // TODO: récupérer l'ID du formateur et naviguer
      // router.push(`/profile/${formateurId}` as any);
    } else if (notif.type === 'new_video') {
      // Aller vers la page vidéo ou home pour voir la vidéo
      router.push('/(tabs-apprenant)' as any);
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
          notifs.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.notifCard, !item.read && styles.unreadCard]}
              onPress={() => handleNotificationClick(item)}
            >
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={styles.notifInfo}>
                <Text style={styles.notifUser}>
                  {item.user} <Text style={styles.notifRole}>• {item.role}</Text>
                </Text>
                <Text style={styles.notifMsg}>{item.msg}</Text>
                {item.title && <Text style={styles.notifVideo}>"{item.title}"</Text>}
                <Text style={styles.notifTime}>Il y a {item.time}</Text>
              </View>
              {item.thumb && <Image source={{ uri: item.thumb }} style={styles.thumbnail} />}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color="#E5E7EB" />
            <Text style={styles.emptyText}>Aucune notification</Text>
            <Text style={styles.emptySubtext}>
              Les nouvelles vidéos apparaîtront ici
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
    borderColor: '#F3F4F6'
  },
  unreadCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#9333ea',
    borderWidth: 2,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  notifInfo: { flex: 1 },
  notifUser: { fontSize: 15, fontWeight: 'bold', color: '#18181B' },
  notifRole: { fontWeight: '400', color: '#71717A', fontSize: 13 },
  notifMsg: { fontSize: 14, color: '#3F3F46', marginTop: 2 },
  notifVideo: { fontSize: 14, fontWeight: '600', color: '#18181B', marginTop: 4 },
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