import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, 
  Image, KeyboardAvoidingView, Platform, ActivityIndicator, Modal 
  ,LogBox
} from 'react-native';

LogBox.ignoreLogs([
  'Unexpected text node',
  'aria-hidden',
]);

import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

const handleGoBack = async () => {
  const user = auth.currentUser;
  if (!user) {
    // Utilise le groupe apprenant par défaut ou le groupe principal
    router.push('/(tabs-apprenant)/home' as any); 
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const role = userDoc.data()?.role;
    
    if (role === 'formateur') {
      router.push('/(tabs-formateur)/notifications' as any);
    } else {
      router.push('/(tabs-apprenant)/notifications' as any);
    }
  } catch (error) {
    router.back();
  }
};

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
        if (doc.id === currentUserId) return;

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
        <LinearGradient
          colors={['#7459f0', '#9333ea', '#242A65']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loadingIconWrapper}
        >
          <ActivityIndicator size="large" color="#FFF" />
        </LinearGradient>
        <Text style={styles.loadingText}>Chargement...</Text>
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
        {/* HEADER DÉGRADÉ */}
        <LinearGradient
          colors={['#FFFFFF', '#F9FAFB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.chatHeaderGradient}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setSelectedConv(null)} activeOpacity={0.7}>
              <LinearGradient
                colors={['#F3E8FF', '#FAF5FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={22} color="#7459f0" />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => router.push(`/profile/${selectedConv.userId}` as any)}
              style={styles.chatUserInfo}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7459f0', '#242A65']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chatAvatarBorder}
              >
                <View style={styles.chatAvatarWrapper}>
                  <Image 
                    source={{ uri: selectedConv.userAvatar || `https://ui-avatars.com/api/?name=${selectedConv.userName}` }} 
                    style={styles.chatAvatar} 
                  />
                </View>
              </LinearGradient>
              
              <Text style={styles.chatName}>{selectedConv.userName}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => {
            const isMine = item.senderId === auth.currentUser?.uid;
            return (
              <View style={[styles.messageBubbleWrapper, isMine && styles.myMessageWrapper]}>
                <LinearGradient
                  colors={isMine ? ['#7459f0', '#9333ea', '#242A65'] : ['#F3F4F6', '#E5E7EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}
                >
                  <Text style={[styles.messageText, isMine && styles.myMessageText]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </LinearGradient>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <LinearGradient
                colors={['#7459f0', '#9333ea', '#242A65']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIcon}
              >
                <Ionicons name="chatbubbles-outline" size={40} color="#FFF" />
              </LinearGradient>
              <Text style={styles.emptyText}>Aucun message</Text>
              <Text style={styles.emptySubtext}>Commencez la conversation !</Text>
            </View>
          }
        />

        {/* INPUT AVEC DÉGRADÉ */}
        <View style={styles.inputContainerWrapper}>
          <LinearGradient
            colors={['#F3E8FF', '#FAF5FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.inputGradient}
          >
            <TextInput 
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Écrire un message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
            />
          </LinearGradient>
          
          <TouchableOpacity 
            onPress={handleSend}
            disabled={!newMessage.trim()}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={newMessage.trim() ? ['#7459f0', '#9333ea', '#242A65'] : ['#E5E7EB', '#D1D5DB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
            >
              <Ionicons name="send" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // VUE LISTE DE CONVERSATIONS
  return (
    <View style={styles.container}>
      {/* HEADER AVEC DÉGRADÉ */}
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} activeOpacity={0.7}>
            <LinearGradient
              colors={['#F3E8FF', '#FAF5FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#7459f0" />
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Messages</Text>
          
          <TouchableOpacity onPress={() => setShowUserSearch(true)} activeOpacity={0.7}>
            <LinearGradient
              colors={['#7459f0', '#9333ea', '#242A65']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.newChatBtn}
            >
              <Ionicons name="create" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.convList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.convItemWrapper}
            onPress={() => handleSelectConversation(item)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FFFFFF', '#FAFAFA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.convItem}
            >
              <LinearGradient
                colors={['#7459f0', '#242A65']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarBorder}
              >
                <View style={styles.avatarWrapper}>
                  <Image 
                    source={{ uri: item.userAvatar || `https://ui-avatars.com/api/?name=${item.userName}` }} 
                    style={styles.avatar} 
                  />
                </View>
              </LinearGradient>
              
              <View style={styles.convInfo}>
                <Text style={styles.convName}>{item.userName}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
              </View>

              {item.unreadCount > 0 && (
                <LinearGradient
                  colors={['#FBA31A', '#F59E0B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.unreadBadge}
                >
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </LinearGradient>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#7459f0', '#9333ea', '#242A65']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIconWrapper}
            >
              <Ionicons name="mail-outline" size={50} color="#FFF" />
            </LinearGradient>
            
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptySubtext}>Commencez une nouvelle conversation</Text>
            
            <TouchableOpacity 
              onPress={() => setShowUserSearch(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7459f0', '#9333ea', '#242A65']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startChatBtn}
              >
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.startChatText}>Nouvelle conversation</Text>
              </LinearGradient>
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
            {/* HEADER MODAL AVEC DÉGRADÉ */}
            <LinearGradient
              colors={['#7459f0', '#9333ea', '#242A65']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Nouvelle conversation</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowUserSearch(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </LinearGradient>

            {/* SEARCH BAR AVEC DÉGRADÉ */}
            <View style={styles.searchContainerWrapper}>
              <LinearGradient
                colors={['#F3E8FF', '#FAF5FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.searchContainer}
              >
                <Ionicons name="search" size={20} color="#7459f0" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un utilisateur..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    searchUsers(text);
                  }}
                  autoFocus
                />
              </LinearGradient>
            </View>

            {searchLoading ? (
              <View style={styles.searchLoadingContainer}>
                <LinearGradient
                  colors={['#7459f0', '#9333ea', '#242A65']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.loadingIconWrapper}
                >
                  <ActivityIndicator size="large" color="#FFF" />
                </LinearGradient>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.searchResults}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userItemWrapper}
                    onPress={() => startNewConversation(item)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#FFFFFF', '#FAFAFA']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.userItem}
                    >
                      <LinearGradient
                        colors={['#7459f0', '#242A65']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.userAvatarBorder}
                      >
                        <View style={styles.userAvatarWrapper}>
                          <Image
                            source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${item.prenom}+${item.nom}` }}
                            style={styles.userAvatar}
                          />
                        </View>
                      </LinearGradient>
                      
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{`${item.prenom} ${item.nom}`.trim() || item.displayName}</Text>
                        <Text style={styles.userRole}>{item.role === 'formateur' ? '👨‍🎓 Formateur' : '🎓 Apprenant'}</Text>
                      </View>
                      
                      <LinearGradient
                        colors={['#7459f0', '#9333ea']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.chevronWrapper}
                      >
                        <Ionicons name="chevron-forward" size={18} color="#FFF" />
                      </LinearGradient>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  searchQuery.trim() ? (
                    <View style={styles.noResults}>
                      <LinearGradient
                        colors={['#7459f0', '#9333ea', '#242A65']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.noResultsIcon}
                      >
                        <Ionicons name="search-outline" size={36} color="#FFF" />
                      </LinearGradient>
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
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12
  },
  loadingText: {
    color: '#71717A',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12
  },
  
  // HEADER LISTE CONVERSATIONS
  headerGradient: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#1F2937',
    flex: 1,
    marginLeft: 16
  },
  backBtn: { 
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
  },
  newChatBtn: { 
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8
  },
  
  // LISTE CONVERSATIONS
  convList: { 
    padding: 20,
    paddingBottom: 32
  },
  convItemWrapper: {
    marginBottom: 12
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4
  },
  avatarBorder: {
    padding: 3,
    borderRadius: 28,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5
  },
  avatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#FFF'
  },
  avatar: { 
    width: '100%', 
    height: '100%' 
  },
  convInfo: { 
    flex: 1,
    marginLeft: 12
  },
  convName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1F2937', 
    marginBottom: 4 
  },
  lastMessage: { 
    fontSize: 14, 
    color: '#71717A' 
  },
  unreadBadge: {
    borderRadius: 12,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginLeft: 12,
    shadowColor: '#FBA31A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6
  },
  unreadText: { 
    color: '#FFF', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
  
  // HEADER CHAT
  chatHeaderGradient: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  chatHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  chatUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  chatAvatarBorder: {
    padding: 2,
    borderRadius: 22,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  chatAvatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFF'
  },
  chatAvatar: { 
    width: '100%', 
    height: '100%' 
  },
  chatName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1F2937',
    marginLeft: 12
  },
  
  // MESSAGES
  messagesList: { 
    padding: 16, 
    paddingBottom: 80 
  },
  messageBubbleWrapper: {
    marginBottom: 12,
    alignItems: 'flex-start'
  },
  myMessageWrapper: {
    alignItems: 'flex-end'
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5
  },
  myMessage: {
    borderBottomRightRadius: 4,
    shadowColor: '#7459f0',
    shadowOpacity: 0.3
  },
  theirMessage: {
    borderBottomLeftRadius: 4
  },
  messageText: { 
    fontSize: 15, 
    color: '#1F2937', 
    marginBottom: 6,
    lineHeight: 20,
    fontWeight: '500'
  },
  myMessageText: { 
    color: '#FFF',
    fontWeight: '600'
  },
  messageTime: { 
    fontSize: 11, 
    color: '#9CA3AF', 
    alignSelf: 'flex-end',
    fontWeight: '600'
  },
  myMessageTime: { 
    color: '#E9D5FF' 
  },
  
  // INPUT
  inputContainerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16
  },
  inputGradient: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  input: {
    fontSize: 15,
    maxHeight: 100,
    color: '#1F2937',
    paddingVertical: 10
  },
  sendBtn: { 
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6
  },
  sendBtnDisabled: { 
    opacity: 0.5
  },
  
  // EMPTY STATES
  emptyState: { 
    marginTop: 100, 
    alignItems: 'center', 
    paddingHorizontal: 40 
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10
  },
  emptyTitle: { 
    marginTop: 8,
    fontSize: 22, 
    color: '#1F2937', 
    fontWeight: 'bold',
    marginBottom: 8
  },
  emptySubtext: { 
    fontSize: 15, 
    color: '#71717A', 
    textAlign: 'center',
    marginBottom: 30
  },
  startChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    gap: 10,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8
  },
  startChatText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  emptyMessages: { 
    marginTop: 80, 
    alignItems: 'center' 
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8
  },
  emptyText: { 
    marginTop: 8,
    fontSize: 18, 
    color: '#71717A',
    fontWeight: '600',
    marginBottom: 6
  },
  
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#FFF' 
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchContainerWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4
  },
  searchIcon: { 
    marginRight: 10 
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937'
  },
  searchLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchResults: { 
    paddingHorizontal: 20, 
    paddingBottom: 20
  },
  userItemWrapper: {
    marginBottom: 10
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3
  },
  userAvatarBorder: {
    padding: 2,
    borderRadius: 26,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  userAvatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF'
  },
  userAvatar: { 
    width: '100%', 
    height: '100%' 
  },
  userInfo: { 
    flex: 1,
    marginLeft: 12
  },
  userName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1F2937', 
    marginBottom: 4 
  },
  userRole: { 
    fontSize: 13, 
    color: '#71717A',
    fontWeight: '500'
  },
  chevronWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3
  },
  noResults: { 
    marginTop: 60, 
    alignItems: 'center' 
  },
  noResultsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8
  },
  noResultsText: { 
    marginTop: 8,
    fontSize: 15, 
    color: '#71717A',
    fontWeight: '600'
  }
});