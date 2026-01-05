import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, 
  Image, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, query, where, onSnapshot, addDoc, serverTimestamp, 
  orderBy, updateDoc, doc, getDoc
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { notifyNewMessage } from '../utils/notificationService';

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

export default function MessageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Charger les conversations
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const convMap = new Map<string, Conversation>();

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const conversationId = data.conversationId || '';
        
        // Filtrer les conversations de l'utilisateur courant
        if (!conversationId.includes(user.uid)) continue;

        const otherUserId = conversationId.split('_').find((id: string) => id !== user.uid);
        if (!otherUserId) continue;

        // Compter les messages non lus
        const isUnread = !data.read && data.senderId !== user.uid;

        if (!convMap.has(otherUserId)) {
          // Charger les infos de l'autre utilisateur
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

      // Si on a un userId dans les params, ouvrir cette conversation
      if (params.userId && !selectedConv) {
        const conv = convList.find(c => c.userId === params.userId);
        if (conv) {
          handleSelectConversation(conv);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Charger les messages d'une conversation
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

        // Marquer comme lu si c'est un message reçu
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

  // Envoyer un message
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

      // Notifier l'autre utilisateur
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

  // Vue conversation sélectionnée
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
          
          <Image 
            source={{ uri: selectedConv.userAvatar || `https://ui-avatars.com/api/?name=${selectedConv.userName}` }} 
            style={styles.chatAvatar} 
          />
          <Text style={styles.chatName}>{selectedConv.userName}</Text>
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

  // Vue liste de conversations
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#18181B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
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
            <Text style={styles.emptySubtext}>Vos conversations apparaîtront ici</Text>
          </View>
        }
      />
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
    gap: 16
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#18181B' },
  backBtn: { padding: 4 },
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
  chatAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' },
  chatName: { fontSize: 18, fontWeight: 'bold', color: '#18181B', flex: 1 },
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
  emptyMessages: { marginTop: 80, alignItems: 'center' },
  emptyText: { marginTop: 16, fontSize: 16, color: '#71717A' }
});