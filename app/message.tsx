import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { getDoc, doc, collection, query, where, getDocs, limit } from 'firebase/firestore';
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
  role?: string;
}

export default function MessagesListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [formateurSuggestions, setFormateurSuggestions] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setTimeout(() => router.replace('/login'), 100);
      return;
    }

    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) setCurrentUserRole(snap.data().role);
    });

    const unsubscribe = subscribeToConversations((convs: Conversation[]) => {
      setConversations(convs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const user = auth.currentUser;
    return conversations.filter((conv: Conversation) => {
      const otherUserId = conv.participants.find((id: string) => id !== user?.uid);
      if (!otherUserId) return false;
      const otherUser = conv.participantDetails[otherUserId];
      return otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [conversations, searchQuery]);

  useEffect(() => {
    if (showNewMessageModal) {
      handleGlobalSearch('');
      if (currentUserRole === 'apprenant') {
        loadFormateurSuggestions();
      }
    }
  }, [showNewMessageModal, currentUserRole]);

  const loadFormateurSuggestions = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'formateur'), limit(10));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({
        id: d.id,
        name: `${d.data().prenom || ''} ${d.data().nom || ''}`.trim(),
        avatar: d.data().photoURL,
        emoji: d.data().profileEmoji || '🎓',
        status: 'Disponible'
      })).filter(u => u.id !== auth.currentUser?.uid);
      setFormateurSuggestions(list);
    } catch (error) {
      console.error('Erreur suggestions:', error);
    }
  };

  const handleGlobalSearch = async (text: string) => {
    setSearchQuery(text);
    setLoadingContacts(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const usersRef = collection(db, 'users');
      const q = text.length > 0 
        ? query(usersRef, limit(20)) 
        : query(usersRef, limit(10));

      const snap = await getDocs(q);
      const foundUsers = snap.docs
        .map(d => ({
          id: d.id,
          name: `${d.data().prenom || ''} ${d.data().nom || ''}`.trim() || 'Utilisateur',
          avatar: d.data().photoURL,
          emoji: d.data().profileEmoji || '👤',
          status: d.data().role === 'formateur' ? 'Formateur' : 'Apprenant'
        }))
        .filter(u => u.id !== user.uid && u.name.toLowerCase().includes(text.toLowerCase()));

      setContacts(foundUsers);
    } catch (error) {
      console.error('Erreur recherche:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  // ✅ CORRECTION NAVIGATION : Utilise le fichier chat.tsx à la racine du dossier /app
  const openChat = (conversationId: string) => {
    setShowNewMessageModal(false);
    router.push({
      pathname: "/chat",
      params: { conversationId: conversationId }
    } as any);
  };

  const startNewChat = async (contactId: string) => {
    setCreatingChat(true);
    try {
      const conversationId = await getOrCreateConversation(contactId);
      openChat(conversationId);
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la discussion.');
    } finally {
      setCreatingChat(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (error) { return ''; }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#9333EA" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#18181B" /></TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity onPress={() => setShowNewMessageModal(true)}><Ionicons name="create-outline" size={24} color="#9333EA" /></TouchableOpacity>
      </View>

      <View style={styles.searchArea}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#A1A1AA" style={{ marginRight: 10 }} />
          <TextInput style={styles.searchInput} placeholder="Rechercher une conversation..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filteredConversations.map((conv: Conversation) => {
          const user = auth.currentUser;
          const otherUserId = conv.participants.find((id: string) => id !== user?.uid);
          const otherUser = conv.participantDetails[otherUserId!];
          return (
            <TouchableOpacity key={conv.id} style={styles.card} onPress={() => openChat(conv.id)}>
              <Image source={{ uri: otherUser?.profileImage || `https://ui-avatars.com/api/?name=${otherUser?.username}` }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <View style={styles.row}>
                  <Text style={styles.name}>{otherUser?.username || 'Utilisateur'}</Text>
                  <Text style={styles.time}>{formatTime(conv.lastMessage?.createdAt)}</Text>
                </View>
                <Text style={styles.lastMsg} numberOfLines={1}>{conv.lastMessage?.text || 'Nouvelle discussion'}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* MODAL DE RECHERCHE */}
      <Modal visible={showNewMessageModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau message</Text>
              <TouchableOpacity onPress={() => setShowNewMessageModal(false)}><Ionicons name="close" size={24} color="#52525B" /></TouchableOpacity>
            </View>
            
            <View style={styles.modalSearchBar}>
              <Ionicons name="search-outline" size={20} color="#A1A1AA" />
              <TextInput style={styles.modalSearchInput} placeholder="Chercher un utilisateur..." value={searchQuery} onChangeText={handleGlobalSearch} />
            </View>

            <ScrollView>
              {!searchQuery && currentUserRole === 'apprenant' && (
                <View style={styles.suggestionContainer}>
                  <Text style={styles.suggestionTitle}>Formateurs suggérés</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroll}>
                    {formateurSuggestions.map(f => (
                      <TouchableOpacity key={f.id} style={styles.suggestItem} onPress={() => startNewChat(f.id)}>
                        <Image source={{ uri: f.avatar || `https://ui-avatars.com/api/?name=${f.name}` }} style={styles.suggestAvatar} />
                        <Text style={styles.suggestName} numberOfLines={1}>{f.name.split(' ')[0]}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.usersList}>
                {contacts.map((contact) => (
                  <TouchableOpacity key={contact.id} style={styles.userItem} onPress={() => startNewChat(contact.id)}>
                    <Image source={{ uri: contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}` }} style={styles.userAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{contact.name}</Text>
                      <Text style={styles.userStatus}>{contact.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#A1A1AA" />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {creatingChat && <View style={styles.creatingOverlay}><ActivityIndicator size="large" color="#fff" /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#18181B' },
  searchArea: { padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, height: 48, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 16 },
  list: { flex: 1, paddingHorizontal: 16 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  avatar: { width: 55, height: 55, borderRadius: 27.5, marginRight: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontWeight: 'bold', fontSize: 16 },
  time: { fontSize: 12, color: '#71717A' },
  lastMsg: { color: '#71717A', fontSize: 14 },
  unreadMsg: { fontWeight: '600', color: '#18181B' },
  badge: { backgroundColor: '#9333EA', minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { marginTop: 100, alignItems: 'center' },
  emptyText: { color: '#71717A', fontSize: 16, fontWeight: '600', marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '85%', paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalSearchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, height: 48, margin: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  modalSearchInput: { flex: 1, fontSize: 16 },
  suggestionContainer: { paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestionTitle: { fontSize: 13, fontWeight: 'bold', color: '#71717A', marginLeft: 20, marginBottom: 12, textTransform: 'uppercase' },
  suggestionScroll: { paddingLeft: 20 },
  suggestItem: { alignItems: 'center', marginRight: 20, width: 60 },
  suggestAvatar: { width: 55, height: 55, borderRadius: 27.5, borderWidth: 2, borderColor: '#9333EA' },
  suggestName: { fontSize: 11, marginTop: 5, color: '#18181B' },
  usersList: { paddingHorizontal: 16 },
  userItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  userAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  userName: { fontSize: 16, fontWeight: '600' },
  userStatus: { fontSize: 13, color: '#22C55E' },
  creatingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  startChatBtn: { marginTop: 20, backgroundColor: '#9333EA', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  startChatBtnText: { color: '#FFF', fontWeight: '600' },
});