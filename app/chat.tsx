import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './../firebaseConfig';
import { 
  subscribeToMessages, 
  sendMessage, 
  markMessagesAsRead,
  Message 
} from './utils/messaging';
import { doc, getDoc } from 'firebase/firestore';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const conversationId = params.conversationId as string;
  
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    if (!conversationId) {
      Alert.alert('Erreur', 'Conversation introuvable');
      setTimeout(() => router.back(), 100);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setTimeout(() => router.replace('/login'), 100);
      return;
    }

    // Charger les infos de l'autre utilisateur
    loadOtherUserInfo();

    // S'abonner aux messages en temps réel
    const unsubscribe = subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      
      // Scroll automatique vers le bas
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    // Marquer les messages comme lus
    markMessagesAsRead(conversationId);

    return () => unsubscribe();
  }, [conversationId]);

  const loadOtherUserInfo = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Extraire l'ID de l'autre utilisateur depuis conversationId
      const participants = conversationId.split('_');
      const otherUserId = participants.find(id => id !== user.uid);
      
      if (!otherUserId) return;

      const userDoc = await getDoc(doc(db, 'users', otherUserId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setOtherUser({
          id: otherUserId,
          name: `${userData.prenom || ''} ${userData.nom || ''}`.trim() || 'Utilisateur',
          avatar: userData.photoURL,
          emoji: userData.profileEmoji || '👤',
          status: 'En ligne'
        });
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;
    
    setSending(true);
    const textToSend = inputText.trim();
    setInputText(''); // Vider immédiatement l'input
    
    try {
      await sendMessage(conversationId, textToSend);
      
      // Scroll vers le bas après envoi
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      setInputText(textToSend); // Restaurer le texte en cas d'erreur
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const goToProfile = () => {
    if (!otherUser) return;
    router.push(`/profile/${otherUser.id}` as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A855F7" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!otherUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Utilisateur introuvable</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container} 
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#52525B" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={goToProfile} 
          style={styles.userInfoContainer}
        >
          {otherUser.avatar ? (
            <Image 
              source={{ uri: otherUser.avatar }} 
              style={styles.avatarSmall} 
            />
          ) : (
            <View style={styles.avatarEmojiSmall}>
              <Text style={styles.emojiSmall}>{otherUser.emoji}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{otherUser.name}</Text>
            <Text style={styles.onlineStatus}>{otherUser.status}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowMenu(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color="#52525B" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.chatContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => {
          const user = auth.currentUser;
          const isMine = msg.senderId === user?.uid;

          return (
            <View 
              key={msg.id} 
              style={isMine ? styles.myMsg : styles.theirMsg}
            >
              <Text style={isMine ? styles.myText : styles.theirText}>
                {msg.text}
              </Text>
              <View style={styles.messageFooter}>
                <Text style={isMine ? styles.myTime : styles.theirTime}>
                  {formatTime(msg.createdAt)}
                </Text>
                {isMine && (
                  <Ionicons 
                    name={msg.isRead ? "checkmark-done" : "checkmark"} 
                    size={14} 
                    color={msg.isRead ? "#A855F7" : "#E9D5FF"} 
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
            </View>
          );
        })}
        
        {messages.length === 0 && (
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubbles-outline" size={64} color="#E5E7EB" />
            <Text style={styles.emptyText}>
              Démarrez la conversation avec {otherUser.name}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <TouchableOpacity disabled>
          <Ionicons name="attach" size={26} color="#D1D5DB" />
        </TouchableOpacity>
        <TextInput 
          style={styles.input} 
          placeholder="Écrire un message..." 
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendMessage}
          returnKeyType="send"
          editable={!sending}
        />
        <TouchableOpacity 
          onPress={handleSendMessage} 
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          disabled={sending || !inputText.trim()}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <Modal transparent visible={showMenu} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { 
                setShowMenu(false); 
                goToProfile(); 
              }}
            >
              <Ionicons name="person-outline" size={20} color="#9333EA" />
              <Text style={[styles.menuText, { color: '#9333EA' }]}>
                Voir le profil
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { 
                setShowMenu(false); 
                Alert.alert("Signalé", `Vous avez signalé ${otherUser.name}`); 
              }}
            >
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={[styles.menuText, { color: '#EF4444' }]}>
                Signaler l'utilisateur
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: { marginTop: 12, color: '#71717A', fontSize: 14 },
  errorText: { color: '#EF4444', fontSize: 16 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6', 
    gap: 12 
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarSmall: { width: 36, height: 36, borderRadius: 18 },
  avatarEmojiSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiSmall: { fontSize: 20 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#18181B' },
  onlineStatus: { fontSize: 12, color: '#22C55E' },
  chatContainer: { padding: 16, gap: 12, paddingBottom: 30 },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#71717A',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  theirMsg: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#F4F4F5', 
    padding: 12, 
    borderRadius: 16, 
    borderBottomLeftRadius: 4, 
    maxWidth: '80%' 
  },
  theirText: { color: '#18181B', fontSize: 15 },
  theirTime: { fontSize: 10, color: '#71717A', marginTop: 4 },
  myMsg: { 
    alignSelf: 'flex-end', 
    backgroundColor: '#A855F7', 
    padding: 12, 
    borderRadius: 16, 
    borderBottomRightRadius: 4, 
    maxWidth: '80%' 
  },
  myText: { color: '#FFF', fontSize: 15 },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  myTime: { fontSize: 10, color: '#E9D5FF' },
  inputArea: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F3F4F6', 
    paddingBottom: Platform.OS === 'ios' ? 30 : 12, 
    gap: 10,
    backgroundColor: '#FFF'
  },
  input: { 
    flex: 1, 
    height: 40, 
    backgroundColor: '#F4F4F5', 
    borderRadius: 20, 
    paddingHorizontal: 16,
    fontSize: 15 
  },
  sendBtn: { 
    backgroundColor: '#A855F7', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  menuCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    width: '80%', 
    padding: 8 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    gap: 12 
  },
  menuText: { fontSize: 15, fontWeight: '500' }
});