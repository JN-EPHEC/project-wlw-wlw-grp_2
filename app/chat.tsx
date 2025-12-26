import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import { 
  subscribeToConversations, 
  getOrCreateConversation,
  Conversation 
} from './utils/messaging';

interface Contact {
  id: string;
  name: string;
  avatar?: string;
  emoji?: string;
  status?: string;
}

export default function MessagesListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setTimeout(() => router.replace('/login'), 100);
      return;
    }

    const unsubscribe = subscribeToConversations((convs) => {
      setConversations(convs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (showNewMessageModal) {
      loadMutualFollowers();
    }
  }, [showNewMessageModal]);

  const loadMutualFollowers = async () => {
    setLoadingContacts(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const following = userData.following || [];

      if (following.length === 0) {
        setContacts([]);
        setLoadingContacts(false);
        return;
      }

      const mutualFollowers: Contact[] = [];

      for (const followedUserId of following) {
        const followedUserDoc = await getDoc(doc(db, 'users', followedUserId));
        
        if (followedUserDoc.exists()) {
          const followedUserData = followedUserDoc.data();
          const theirFollowing = followedUserData.following || [];

          if (theirFollowing.includes(user.uid)) {
            mutualFollowers.push({
              id: followedUserId,
              name: `${followedUserData.prenom || ''} ${followedUserData.nom || ''}`.trim() || 'Utilisateur',
              avatar: followedUserData.photoURL,
              emoji: followedUserData.profileEmoji || '👤',
              status: 'En ligne'
            });
          }
        }
      }

      setContacts(mutualFollowers);
    } catch (error) {
      console.error('Erreur chargement contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const user = auth.currentUser;
    if (!user) return false;

    const otherUserId = conv.participants.find(id => id !== user.uid);
    if (!otherUserId) return false;

    const otherUserDetails = conv.participantDetails[otherUserId];
    return otherUserDetails?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openChat = (conversationId: string) => {
    router.push({
      pathname: '/chat',
      params: { conversationId }
    } as any);
  };

  const startNewChat = async (contactId: string) => {
    setCreatingChat(true);
    try {
      const conversationId = await getOrCreateConversation(contactId);
      setShowNewMessageModal(false);
      openChat(conversationId);
    } catch (error) {
      console.error('Erreur création conversation:', error);
      Alert.alert('Erreur', 'Impossible de créer la conversation');
    } finally {
      setCreatingChat(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333EA" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#18181B" />
        </TouchableOpacity>
        <Text style={styles.title}>Message</Text>
        
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
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => {
            const user = auth.currentUser;
            if (!user) return null;

            const otherUserId = conv.participants.find(id => id !== user.uid);
            if (!otherUserId) return null;

            const otherUser = conv.participantDetails[otherUserId];
            const unreadCount = conv.unreadCount?.[user.uid] || 0;
            const lastMessage = conv.lastMessage;

            return (
              <TouchableOpacity 
                key={conv.id} 
                style={styles.card} 
                onPress={() => openChat(conv.id)}
              >
                {otherUser?.profileImage ? (
                  <Image source={{ uri: otherUser.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarEmoji}>
                    <Text style={styles.emojiText}>{otherUser?.profileEmoji || '👤'}</Text>
                  </View>
                )}
                
                <View style={{ flex: 1 }}>
                  <View style={styles.row}>
                    <Text style={styles.name}>{otherUser?.username || 'Utilisateur'}</Text>
                    <Text style={styles.time}>
                      {formatTime(lastMessage?.createdAt)}
                    </Text>
                  </View>
                  <Text 
                    style={[
                      styles.lastMsg, 
                      unreadCount > 0 && styles.unreadMsg
                    ]} 
                    numberOfLines={1}
                  >
                    {lastMessage?.senderId === user.uid && 'Vous: '}
                    {lastMessage?.text || 'Nouvelle conversation'}
                  </Text>
                </View>
                
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#E5E7EB" />
            <Text style={styles.emptyText}>
              {searchQuery ? `Aucune discussion trouvée pour "${searchQuery}"` : 'Aucune conversation'}
            </Text>
            <TouchableOpacity 
              style={styles.startChatBtn}
              onPress={() => setShowNewMessageModal(true)}
            >
              <Text style={styles.startChatBtnText}>Démarrer une conversation</Text>
            </TouchableOpacity>
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
                placeholder="Rechercher un contact..."
                placeholderTextColor="#A1A1AA"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {loadingContacts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9333EA" />
              </View>
            ) : (
              <ScrollView style={styles.usersList}>
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <TouchableOpacity 
                      key={contact.id} 
                      style={styles.userItem}
                      onPress={() => startNewChat(contact.id)}
                      disabled={creatingChat}
                    >
                      {contact.avatar ? (
                        <Image source={{ uri: contact.avatar }} style={styles.userAvatar} />
                      ) : (
                        <View style={styles.userAvatarEmoji}>
                          <Text style={styles.userEmojiText}>{contact.emoji}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{contact.name}</Text>
                        <Text style={styles.userStatus}>{contact.status}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#A1A1AA" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyContacts}>
                    <Ionicons name="people-outline" size={64} color="#E5E7EB" />
                    <Text style={styles.emptyContactsText}>
                      {searchQuery 
                        ? `Aucun contact trouvé pour "${searchQuery}"`
                        : 'Aucun contact mutuel. Suivez des personnes qui vous suivent aussi !'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {creatingChat && (
        <View style={styles.creatingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.creatingText}>Création de la conversation...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#FFF' 
  },
  loadingText: { marginTop: 12, color: '#71717A', fontSize: 14 },
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
  avatarEmoji: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: { fontSize: 28 },
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
    marginTop: 16,
    marginBottom: 24
  },
  startChatBtn: {
    backgroundColor: '#9333EA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startChatBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
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
  userAvatarEmoji: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userEmojiText: {
    fontSize: 24,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#18181B',
  },
  userStatus: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  emptyContacts: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyContactsText: {
    color: '#71717A',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  creatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 12,
  },
});