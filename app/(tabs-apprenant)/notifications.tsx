import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';

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
  videoId?: string;
  fromUserId?: string;
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
      // ✅ Exigence ID 42 : Tri du plus récent au plus ancien
      const notifQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc') // Plus récent en premier
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
            
            // ✅ Exigence ID 185, 397 : Format "Nom d'utilisateur" + "action" + "nom de la vidéo"
            let message = '';
            if (data.type === 'new_video') {
              message = 'a publié une nouvelle vidéo';
            } else if (data.type === 'follow') {
              message = 'a commencé à vous suivre';
            } else if (data.type === 'like') {
              message = 'a aimé votre vidéo';
            } else if (data.type === 'comment') {
              message = 'a commenté votre vidéo';
            } else {
              message = data.msg || 'notification';
            }
            
            notifications.push({
              id: docSnap.id,
              user: data.fromUserName || 'Utilisateur',
              role: data.role || 'Membre',
              msg: message,
              title: data.videoTitle || '', // ✅ Nom de la vidéo
              time: formatTime(data.createdAt),
              avatar: data.fromUserAvatar || 'https://via.placeholder.com/150',
              thumb: data.videoThumb || '',
              type: data.type,
              read: data.read || false,
              createdAt: data.createdAt,
              videoId: data.videoId,
              fromUserId: data.fromUserId
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

  // ✅ Exigence ID 40 : Format du temps avec "Il y a + heures/minutes/jours"
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'récemment';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      // Format selon l'exigence ID 40
      if (diffMins < 1) return 'à l\'instant';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
      if (diffHours < 24) return `${diffHours} heure${diffHours > 1 ? 's' : ''}`;
      if (diffDays === 1) return 'hier';
      if (diffDays === 2) return 'il y a deux jours';
      if (diffDays < 7) return `${diffDays} jours`;
      
      // Au-delà d'une semaine, afficher la date
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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
    if (notif.type === 'follow' && notif.fromUserId) {
      // Aller vers le profil du formateur
      router.push(`/profile/${notif.fromUserId}` as any);
    } else if (notif.type === 'new_video') {
      // Aller vers la page d'accueil pour voir la vidéo
      router.push('/(tabs-apprenant)' as any);
    } else if (notif.type === 'like' || notif.type === 'comment') {
      // Aller vers la vidéo si possible
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
      {/* ✅ Exigence ID 36, 392 : Menu principal accessible */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {/* ✅ Exigence ID 38, 393 : Icône bulle de conversation pour accéder aux messages */}
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
          // ✅ Exigence ID 42 : Notifications du plus récent au plus ancien
          notifs.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.notifCard, !item.read && styles.unreadCard]}
              onPress={() => handleNotificationClick(item)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={styles.notifInfo}>
                {/* ✅ Exigence ID 185 : Format "Nom d'utilisateur" + "action" + "Temps" */}
                <Text style={styles.notifUser}>
                  {item.user} <Text style={styles.notifRole}>• {item.role}</Text>
                </Text>
                <Text style={styles.notifMsg}>{item.msg}</Text>
                {/* ✅ Exigence ID 397 : Affichage du nom de la vidéo */}
                {item.title && (
                  <Text style={styles.notifVideo}>"{item.title}"</Text>
                )}
                {/* ✅ Exigence ID 40 : Format du temps */}
                <Text style={styles.notifTime}>Il y a {item.time}</Text>
              </View>
              {/* Miniature de la vidéo si disponible */}
              {item.thumb && <Image source={{ uri: item.thumb }} style={styles.thumbnail} />}
            </TouchableOpacity>
          ))
        ) : (
          // ✅ Exigence ID 41, 187 : Message "Vous êtes à jour !" si aucune notification
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={80} color="#22C55E" />
            <Text style={styles.emptyTitle}>Vous êtes à jour !</Text>
            <Text style={styles.emptySubtext}>
              Les nouvelles vidéos et interactions apparaîtront ici
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
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  notifInfo: { flex: 1 },
  notifUser: { fontSize: 15, fontWeight: 'bold', color: '#18181B' },
  notifRole: { fontWeight: '400', color: '#71717A', fontSize: 13 },
  notifMsg: { fontSize: 14, color: '#3F3F46', marginTop: 2 },
  notifVideo: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#9333ea', 
    marginTop: 4,
    lineHeight: 20,
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