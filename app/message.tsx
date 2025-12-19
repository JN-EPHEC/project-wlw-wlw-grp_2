import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function MessagesListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const allDiscussions = [
    { id: '1', name: 'Marie Dupont', lastMsg: 'Merci pour ta vidéo !', time: 'Il y a 1h', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', unread: 2 },
    { id: '2', name: 'Thomas AI', lastMsg: 'Tu as des ressources sur l\'IA ?', time: 'Il y a 3h', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', unread: 0 },
    { id: '3', name: 'Lucas Noel', lastMsg: 'Le rendu est pour demain.', time: 'Hier', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150', unread: 1 },
  ];

  const filteredDiscussions = allDiscussions.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#18181B" />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchArea}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#A1A1AA" style={{ marginRight: 10 }} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Rechercher une conversation..."
            placeholderTextColor="#A1A1AA"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#A1A1AA" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.list}>
        {filteredDiscussions.length > 0 ? (
          filteredDiscussions.map((chat) => (
            <TouchableOpacity key={chat.id} style={styles.card} onPress={() => router.push('/chat')}>
              <Image source={{ uri: chat.avatar }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <View style={styles.row}>
                  <Text style={styles.name}>{chat.name}</Text>
                  <Text style={styles.time}>{chat.time}</Text>
                </View>
                <Text style={styles.lastMsg} numberOfLines={1}>{chat.lastMsg}</Text>
              </View>
              {chat.unread > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{chat.unread}</Text></View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune discussion trouvée pour "{searchQuery}"</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: 'bold' },
  searchArea: { padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, height: 48, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 16, color: '#18181B' },
  list: { paddingHorizontal: 16 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  avatar: { width: 55, height: 55, borderRadius: 27.5, marginRight: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontWeight: 'bold', fontSize: 16 },
  time: { fontSize: 12, color: '#71717A' },
  lastMsg: { color: '#71717A', fontSize: 14 },
  badge: { backgroundColor: '#9333EA', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { marginTop: 50, alignItems: 'center' },
  emptyText: { color: '#71717A', fontSize: 14 }
});