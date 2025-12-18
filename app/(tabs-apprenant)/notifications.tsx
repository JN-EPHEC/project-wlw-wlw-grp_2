import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const NOTIFS = [
  { id: '1', user: 'Marie Dupont', role: 'Formatrice Marketing', msg: 'a posté une nouvelle vidéo', title: 'Les secrets du Marketing Digital en 2024', time: '33 minutes', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', thumb: 'https://images.unsplash.com/photo-1432888622747-4eb9a8f2c293?w=400' },
  { id: '2', user: 'Thomas AI', role: 'Expert IA', msg: 'a posté une nouvelle vidéo', title: 'Prompt Engineering avancé avec ChatGPT', time: '2 heures', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', thumb: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400' },
];

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={() => router.push('/message')} style={styles.iconBtn}>
          <View style={styles.msgBadge}><Text style={styles.badgeText}>3</Text></View>
          <Ionicons name="chatbubble-outline" size={28} color="#18181B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {NOTIFS.map((item) => (
          <TouchableOpacity key={item.id} style={styles.notifCard}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.notifInfo}>
              <Text style={styles.notifUser}>{item.user} <Text style={styles.notifRole}>• {item.role}</Text></Text>
              <Text style={styles.notifMsg}>{item.msg}</Text>
              <Text style={styles.notifVideo}>"{item.title}"</Text>
              <Text style={styles.notifTime}>Il y a {item.time}</Text>
            </View>
            <Image source={{ uri: item.thumb }} style={styles.thumbnail} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
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
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#FFFFFF'
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
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  notifInfo: { flex: 1 },
  notifUser: { fontSize: 15, fontWeight: 'bold', color: '#18181B' },
  notifRole: { fontWeight: '400', color: '#71717A', fontSize: 13 },
  notifMsg: { fontSize: 14, color: '#3F3F46', marginTop: 2 },
  notifVideo: { fontSize: 14, fontWeight: '600', color: '#18181B', marginTop: 4 },
  notifTime: { fontSize: 12, color: '#A1A1AA', marginTop: 6 },
  thumbnail: { width: 70, height: 70, borderRadius: 12, marginLeft: 10 }
});