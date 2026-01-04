import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, Platform, 
  ActivityIndicator, Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// ✅ Chemin corrigé pour un fichier situé dans /app
import { auth, db } from '../firebaseConfig';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp, doc, updateDoc 
} from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

export default function ChatScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;

    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Erreur Firestore Chat:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [conversationId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      const messageData = {
        conversationId,
        text: newMessage.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp(),
      };
      setNewMessage('');
      await addDoc(collection(db, 'messages'), messageData);
      await updateDoc(doc(db, 'conversations', conversationId), {
        updatedAt: serverTimestamp(),
        'lastMessage.text': newMessage.trim(),
        'lastMessage.senderId': user.uid,
        'lastMessage.createdAt': serverTimestamp(),
      });
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'envoyer le message.");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#9333ea" /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="black" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Discussion</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => {
          const isMine = item.senderId === auth.currentUser?.uid;
          return (
            <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
              <Text style={{ color: isMine ? 'white' : 'black' }}>{item.text}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Votre message..." value={newMessage} onChangeText={setNewMessage} multiline />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  messagesList: { padding: 20 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 20, marginBottom: 10 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#9333ea', borderBottomRightRadius: 2 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#E5E7EB', borderBottomLeftRadius: 2 },
  inputContainer: { flexDirection: 'row', padding: 15, backgroundColor: 'white', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE' },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, maxHeight: 100 },
  sendButton: { backgroundColor: '#9333ea', width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' }
});