import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, 
  Image, KeyboardAvoidingView, Platform, ActivityIndicator, Modal 
,LogBox
} from 'react-native'

LogBox.ignoreLogs([
  'Unexpected text node',
  'aria-hidden',
  ]);

import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, query, where, onSnapshot, addDoc, serverTimestamp, 
  orderBy, updateDoc, doc, getDoc, getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { notifyNewMessage } from './utils/notificationService';

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  lastMessageTime: any;
  unreadCount: number;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
  read: boolean;
}

interface User {
  id: string;
  nom: string;
  prenom: string;
  displayName: string;
  photoURL?: string;
  role: string;
}

export default function MessageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 🔥 FONCTION RETOUR VERS NOTIFICATIONS
  const handleGoBack = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/(tabs)/home' as any);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const role = userDoc.data()?.role;
      
      if (role === 'formateur') {
        router.push('/(tabs-formateur)/notifications' as any);
      } else {
        router.push('/(tabs)/home' as any);
      }
    } catch (error) {
      router.push('/(tabs)/home' as any);
    }
  };

  // 🔍 RECHERCHER UTILISATEURS
  const searchUsers = async (searchText: string) => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const results: User[] = [];
      const currentUserId = auth.currentUser?.uid;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (doc.id === currentUserId) return; // Exclure l'utilisateur courant

        const fullName = `${data.prenom || ''} ${data.nom || ''}`.trim().toLowerCase();
        const displayName = (data.displayName || '').toLowerCase();
        const searchLower = searchText.toLowerCase();

        if (fullName.includes(searchLower) || displayName.includes(searchLower)) {
          results.push({
            id: doc.id,
            nom: data.nom || '',
            prenom: data.prenom || '',
            displayName: data.displayName || 'Utilisateur',
            photoURL: data.photoURL,
            role: data.role || 'apprenant'
          });
        }
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Erreur recherche:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // 💬 DÉMARRER UNE NOUVELLE CONVERSATION
  const startNewConversation = (user: User) => {
    const newConv: Conversation = {
      id: user.id,
      userId: user.id,
      userName: `${user.prenom} ${user.nom}`.trim() || user.displayName,
      userAvatar: user.photoURL,
      lastMessage: '',
      lastMessageTime: null,
      unreadCount: 0
    };

    setSelectedConv(newConv);
    setShowUserSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // 🔥 CHARGEMENT CONVERSATIONS EN TEMPS RÉEL
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const messagesQuery = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const convMap = new Map<string, Conversation>();

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const conversationId = data.conversationId || '';
        
        if (!conversationId.includes(user.uid)) continue;

        const otherUserId = conversationId.split('_').find((id: string) => id !== user.uid);
        if (!otherUserId) continue;

        const isUnread = !data.read && data.senderId !== user.uid;

        if (!convMap.has(otherUserId)) {
          try {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            const userData = userDoc.data();

            convMap.set(otherUserId, {
              id: otherUserId,
              userId: otherUserId,
              userName: `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || userData?.displayName || 'Utilisateur',
              userAvatar: userData?.photoURL,
              lastMessage: data.content || '',
              lastMessageTime: data.createdAt,
              unreadCount: isUnread ? 1 : 0
            });
          } catch (error) {
            console.error('Erreur chargement utilisateur:', error);
          }
        } else {
          const existing = convMap.get(otherUserId)!;
          if (isUnread) {
            existing.unreadCount++;
          }
        }
      }

      const convList = Array.from(convMap.values()).sort((a, b) => 
        (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0)
      );

      setConversations(convList);
      setLoading(false);

      if (params.userId && !selectedConv) {
        const conv = convList.find(c => c.userId === params.userId);
        if (conv) {
          handleSelectConversation(conv);
        }
      }
    });

    return () => unsubscribe();
  }, [params.userId]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    const user = auth.currentUser;
    if (!user) return;

    const conversationId = [user.uid, conv.userId].sort().join('_');

    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    onSnapshot(messagesQuery, async (snapshot) => {
      const msgs: Message[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        msgs.push({
          id: docSnap.id,
          text: data.content || '',
          senderId: data.senderId || '',
          senderName: data.senderName || '',
          createdAt: data.createdAt,
          read: data.read || false
        });

        if (data.senderId !== user.uid && !data.read) {
          await updateDoc(doc(db, 'messages', docSnap.id), { read: true });
        }
      }

      setMessages(msgs);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const senderName = `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || userData?.displayName || 'Vous';

      const conversationId = [user.uid, selectedConv.userId].sort().join('_');

      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: user.uid,
        senderName,
        content: newMessage.trim(),
        type: 'text',
        read: false,
        createdAt: serverTimestamp()
      });

      await notifyNewMessage(selectedConv.userId, newMessage.trim());

      setNewMessage('');
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  // VUE CONVERSATION INDIVIDUELLE
  if (selectedConv) {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setSelectedConv(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#18181B" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push(`/profile/${selectedConv.userId}` as any)}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          >
            <Image 
              source={{ uri: selectedConv.userAvatar || `https://ui-avatars.com/api/?name=${selectedConv.userName}` }} 
              style={styles.chatAvatar} 
            />
            <Text style={styles.chatName}>{selectedConv.userName}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => {
            const isMine = item.senderId === auth.currentUser?.uid;
            return (
              <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMine && styles.myMessageText]}>
                  {item.text}
                </Text>
                <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Aucun message</Text>
              <Text style={styles.emptySubtext}>Commencez la conversation !</Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Écrire un message..."
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            onPress={handleSend}
            disabled={!newMessage.trim()}
            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
          >
            <Ionicons name="send" size={24} color={newMessage.trim() ? "#9333ea" : "#D1D5DB"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // VUE LISTE DE CONVERSATIONS
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#18181B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={() => setShowUserSearch(true)} style={styles.newChatBtn}>
          <Ionicons name="create-outline" size={26} color="#9333ea" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.convList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.convItem}
            onPress={() => handleSelectConversation(item)}
          >
            <Image 
              source={{ uri: item.userAvatar || `https://ui-avatars.com/api/?name=${item.userName}` }} 
              style={styles.avatar} 
            />
            
            <View style={styles.convInfo}>
              <Text style={styles.convName}>{item.userName}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
            </View>

            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="mail-outline" size={80} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptySubtext}>Commencez une nouvelle conversation</Text>
            <TouchableOpacity 
              style={styles.startChatBtn}
              onPress={() => setShowUserSearch(true)}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.startChatText}>Nouvelle conversation</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* MODAL RECHERCHE UTILISATEURS */}
      <Modal
        visible={showUserSearch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserSearch(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle conversation</Text>
              <TouchableOpacity onPress={() => {
                setShowUserSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}>
                <Ionicons name="close" size={24} color="#18181B" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un utilisateur..."
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  searchUsers(text);
                }}
                autoFocus
              />
            </View>

            {searchLoading ? (
              <ActivityIndicator size="large" color="#9333ea" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.searchResults}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => startNewConversation(item)}
                  >
                    <Image
                      source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${item.prenom}+${item.nom}` }}
                      style={styles.userAvatar}
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{`${item.prenom} ${item.nom}`.trim() || item.displayName}</Text>
                      <Text style={styles.userRole}>{item.role === 'formateur' ? 'Formateur' : 'Apprenant'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  searchQuery.trim() ? (
                    <View style={styles.noResults}>
                      <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                      <Text style={styles.noResultsText}>Aucun utilisateur trouvé</Text>
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#18181B', flex: 1, marginLeft: 16 },
  backBtn: { padding: 4 },
  newChatBtn: { padding: 4 },
  convList: { padding: 16 },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#E5E7EB' },
  convInfo: { flex: 1 },
  convName: { fontSize: 16, fontWeight: 'bold', color: '#18181B', marginBottom: 4 },
  lastMessage: { fontSize: 14, color: '#71717A' },
  unreadBadge: {
    backgroundColor: '#9333ea',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8
  },
  unreadText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  chatHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12
  },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#E5E7EB' },
  chatName: { fontSize: 18, fontWeight: 'bold', color: '#18181B' },
  messagesList: { padding: 16, paddingBottom: 80 },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#9333ea',
    borderBottomRightRadius: 4
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4
  },
  messageText: { fontSize: 15, color: '#18181B', marginBottom: 4 },
  myMessageText: { color: '#FFFFFF' },
  messageTime: { fontSize: 11, color: '#71717A', alignSelf: 'flex-end' },
  myMessageTime: { color: '#E9D5FF' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100
  },
  sendBtn: { padding: 8 },
  sendBtnDisabled: { opacity: 0.5 },
  emptyState: { marginTop: 100, alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { marginTop: 20, fontSize: 22, color: '#18181B', fontWeight: 'bold' },
  emptySubtext: { marginTop: 12, fontSize: 15, color: '#71717A', textAlign: 'center' },
  startChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9333ea',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 24,
    gap: 8
  },
  startChatText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  emptyMessages: { marginTop: 80, alignItems: 'center' },
  emptyText: { marginTop: 16, fontSize: 16, color: '#71717A' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingTop: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#18181B' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#18181B'
  },
  searchResults: { paddingHorizontal: 20, paddingBottom: 20 },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  userAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#E5E7EB' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#18181B', marginBottom: 2 },
  userRole: { fontSize: 13, color: '#71717A' },
  noResults: { marginTop: 60, alignItems: 'center' },
  noResultsText: { marginTop: 12, fontSize: 15, color: '#71717A' }
});