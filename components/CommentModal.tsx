import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, 
  FlatList, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, increment 
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
}

export default function CommentModal({ visible, onClose, videoId }: CommentModalProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!videoId || !visible) return;
    setLoading(true);

    // Référence à la sous-collection "comments" de la vidéo
    const commentsRef = collection(db, 'videos', videoId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));

    // Écoute temps réel avec GESTION D'ERREUR
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const loadedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setComments(loadedComments);
        setLoading(false);
      },
      (error) => {
        console.error("Erreur chargement commentaires:", error);
        setLoading(false);
        // Ne pas spammer d'alertes, mais loguer l'erreur
      }
    );

    return () => unsubscribe();
  }, [videoId, visible]);

  const handleSend = async () => {
    if (newComment.trim() === '') return;
    
    if (!currentUser) {
        Alert.alert("Erreur", "Vous devez être connecté pour commenter.");
        return;
    }

    setSending(true);
    const commentText = newComment;
    setNewComment(''); // Vide le champ immédiatement pour l'UX
    Keyboard.dismiss();

    try {
      // 1. Ajouter le commentaire dans la sous-collection
      await addDoc(collection(db, 'videos', videoId, 'comments'), {
        text: commentText,
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonyme", // Fallback si pas de nom
        // On récupère le prénom/nom depuis le profil utilisateur si nécessaire, 
        // mais pour l'instant on utilise displayName ou une valeur par défaut
        userAvatar: currentUser.photoURL || null,
        createdAt: serverTimestamp()
      });

      // 2. Mettre à jour le compteur de commentaires sur la vidéo principale
      const videoRef = doc(db, 'videos', videoId);
      await updateDoc(videoRef, { comments: increment(1) });

    } catch (error: any) {
      console.error("Erreur envoi:", error);
      Alert.alert("Oups", "Le commentaire n'a pas pu être envoyé: " + error.message);
      setNewComment(commentText); // Remettre le texte si échec
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{comments.length} commentaires</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Liste */}
          {loading ? (
            <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#9333ea" />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Soyez le premier à commenter ! 👇</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={item => item.id}
              contentContainerStyle={{paddingBottom: 20}}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  {item.userAvatar ? (
                    <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInit}>
                        {(item.userName && item.userName[0]) ? item.userName[0].toUpperCase() : '?'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.textContainer}>
                    <View style={styles.nameRow}>
                        <Text style={styles.username}>{item.userName}</Text>
                        <Text style={styles.date}>
                            {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : ''}
                        </Text>
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                  </View>
                </View>
              )}
            />
          )}

          {/* Input Zone */}
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="Ajouter un commentaire..."
              placeholderTextColor="#999"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
                onPress={handleSend} 
                style={[styles.sendBtn, (!newComment.trim() || sending) && styles.sendBtnDisabled]}
                disabled={!newComment.trim() || sending}
            >
              {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
              ) : (
                  <Ionicons name="send" size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>
          
          {/* Espace safe area pour iPhone X+ */}
          <View style={{height: Platform.OS === 'ios' ? 20 : 0, backgroundColor: 'white'}} />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  
  modalContent: { 
    height: '70%', 
    backgroundColor: 'white', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
    position: 'relative'
  },
  title: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  closeBtn: { position: 'absolute', right: 15, top: 15 },
  
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: '#999', fontSize: 16 },

  commentItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#eee' },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarInit: { fontWeight: 'bold', color: '#4F46E5', fontSize: 16 },
  
  textContainer: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  username: { fontWeight: '600', fontSize: 13, color: '#333' },
  date: { color: '#bbb', fontSize: 10 },
  commentText: { color: '#444', fontSize: 14, lineHeight: 20 },
  
  inputArea: { 
    flexDirection: 'row', 
    padding: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0', 
    alignItems: 'center',
    backgroundColor: 'white'
  },
  input: { 
    flex: 1, 
    backgroundColor: '#f5f5f5', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    marginRight: 10, 
    color: '#333',
    maxHeight: 100
  },
  sendBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#9333ea', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  sendBtnDisabled: {
      backgroundColor: '#d8b4fe'
  }
});