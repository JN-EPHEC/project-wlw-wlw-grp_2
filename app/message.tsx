import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function MessagesListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);

  const [discussions, setDiscussions] = useState([
    { 
      id: '1', 
      name: 'Marie Dupont', 
      lastMsg: 'Merci pour ta vidéo !', 
      time: 'Il y a 1h', 
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 
      unread: 2 
    },
    { 
      id: '2', 
      name: 'Thomas Bernard', 
      lastMsg: 'Tu as des ressources sur l\'IA ?', 
      time: 'Il y a 3h', 
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 
      unread: 0 
    },
    { 
      id: '3', 
      name: 'Lucas Noel', 
      lastMsg: 'Le rendu est pour demain.', 
      time: 'Hier', 
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150', 
      unread: 1 
    },
    { 
      id: '4', 
      name: 'Sophie Martin', 
      lastMsg: 'Excellent cours aujourd\'hui ! 👏', 
      time: 'Hier', 
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 
      unread: 0 
    },
    { 
      id: '5', 
      name: 'Ahmed Khalil', 
      lastMsg: 'J\'ai une question sur le projet...', 
      time: 'Il y a 2j', 
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 
      unread: 3 
    },
    { 
      id: '6', 
      name: 'Emma Wilson', 
      lastMsg: 'Merci pour ton aide ! 😊', 
      time: 'Il y a 3j', 
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 
      unread: 0 
    },
    { 
      id: '7', 
      name: 'Kevin Dubois', 
      lastMsg: 'À quelle heure la prochaine session ?', 
      time: 'Il y a 4j', 
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 
      unread: 0 
    },
  ]);

  const filteredDiscussions = discussions.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const markAsRead = (id: string) => {
    setDiscussions(prevDiscussions =>
      prevDiscussions.map(chat =>
        chat.id === id ? { ...chat, unread: 0 } : chat
      )
    );
  };

  const openChat = (chatId: string) => {
    markAsRead(chatId);
    router.push({
      pathname: '/chat',
      params: { userId: chatId }
    } as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#18181B" />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        
        <TouchableOpacity onPress={() => setShowNewMessageModal(true)}>
          <Ionicons name="create-outline" size={24} color="#9333EA" />
        </TouchableOpacity>
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

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filteredDiscussions.length > 0 ? (
          filteredDiscussions.map((chat) => (
            <TouchableOpacity 
              key={chat.id} 
              style={styles.card} 
              onPress={() => openChat(chat.id)}
            >
              <Image source={{ uri: chat.avatar }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <View style={styles.row}>
                  <Text style={styles.name}>{chat.name}</Text>
                  <Text style={styles.time}>{chat.time}</Text>
                </View>
                <Text 
                  style={[
                    styles.lastMsg, 
                    chat.unread > 0 && styles.unreadMsg
                  ]} 
                  numberOfLines={1}
                >
                  {chat.lastMsg}
                </Text>
              </View>
              {chat.unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{chat.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#E5E7EB" />
            <Text style={styles.emptyText}>
              Aucune discussion trouvée pour "{searchQuery}"
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showNewMessageModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau message</Text>
              <TouchableOpacity onPress={() => setShowNewMessageModal(false)}>
                <Ionicons name="close" size={24} color="#52525B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSearchBar}>
              <Ionicons name="search-outline" size={20} color="#A1A1AA" />
              <TextInput 
                style={styles.modalSearchInput}
                placeholder="Rechercher un utilisateur..."
                placeholderTextColor="#A1A1AA"
              />
            </View>

            <ScrollView style={styles.usersList}>
              {discussions.map((user) => (
                <TouchableOpacity 
                  key={user.id} 
                  style={styles.userItem}
                  onPress={() => {
                    setShowNewMessageModal(false);
                    openChat(user.id);
                  }}
                >
                  <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                  <Text style={styles.userName}>{user.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 20, 
    paddingBottom: 15, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  title: { fontSize: 24, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  searchArea: { padding: 16 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F9FAFB', 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    height: 48, 
    borderWidth: 1, 
    borderColor: '#E5E7EB' 
  },
  searchInput: { flex: 1, fontSize: 16, color: '#18181B' },
  list: { paddingHorizontal: 16 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#F3F4F6' 
  },
  avatar: { width: 55, height: 55, borderRadius: 27.5, marginRight: 12 },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 4 
  },
  name: { fontWeight: 'bold', fontSize: 16, color: '#18181B' },
  time: { fontSize: 12, color: '#71717A' },
  lastMsg: { color: '#71717A', fontSize: 14 },
  unreadMsg: { 
    fontWeight: '600', 
    color: '#18181B' 
  },
  badge: { 
    backgroundColor: '#9333EA', 
    minWidth: 22, 
    height: 22, 
    borderRadius: 11, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 10,
    paddingHorizontal: 6 
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { 
    marginTop: 100, 
    alignItems: 'center',
    paddingHorizontal: 40 
  },
  emptyText: { 
    color: '#71717A', 
    fontSize: 14, 
    textAlign: 'center',
    marginTop: 16 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '80%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#18181B',
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 48,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#18181B',
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  userAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#18181B',
  },
});