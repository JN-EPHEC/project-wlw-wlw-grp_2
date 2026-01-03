import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, 
  FlatList, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, 
  doc, updateDoc, increment, getDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { sendNotification } from '../app/utils/notificationService';
import { useRouter } from 'expo-router';

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  creatorId: string; 
  videoTitle: string; 
  onCountChange?: (videoId: string, delta: number) => void;
}

interface CommentData {
  id: string;
  text: string;
  userId: string;
  userName?: string; // Optionnel car on va le chercher en live
  userAvatar?: string;
  createdAt: any;
  replyToId?: string;
  replyToName?: string;
  videoId: string;
}

// Composant interne pour gérer l'affichage d'un auteur de commentaire en temps réel
const CommentAuthor = ({ userId, isCreator, creatorId, onNavigate }: { userId: string, isCreator: boolean, creatorId: string, onNavigate: (uid: string) => void }) => {
  const [userData, setUserData] = useState<{name: string, avatar: string | null} | null>(null);

  useEffect(() => {
    const fetchAuthor = async () => {
      const uDoc = await getDoc(doc(db, 'users', userId));
      if (uDoc.exists()) {
        const data = uDoc.data();
        setUserData({
          name: `${data.prenom || ''} ${data.nom || ''}`.trim() || "Utilisateur",
          avatar: data.photoURL || null
        });
      }
    };
    fetchAuthor();
  }, [userId]);

  if (!userData) return <View style={styles.skeletonAvatar} />;

  return (
    <View style={styles.authorRow}>
      <TouchableOpacity onPress={() => onNavigate(userId)} style={styles.avatarContainer}>
        {userData.avatar ? (
          <Image source={{ uri: userData.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{userData.name.charAt(0)}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onNavigate(userId)}>
        <Text style={styles.username}>
          {userData.name} {userId === creatorId && <Text style={styles.authorBadge}> (Auteur)</Text>}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function CommentModal({ visible, onClose, videoId, creatorId, videoTitle, onCountChange }: CommentModalProps) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommentData | null>(null);
  
  const inputRef = useRef<TextInput>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!videoId || !visible) return;
    setLoading(true);
    const q = query(collection(db, 'comments'), where('videoId', '==', videoId), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommentData[];
        setComments(loadedComments);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [videoId, visible]);

  const handleSend = async () => {
    if (!newComment.trim() || !currentUser) return;
    setSending(true);
    const commentText = newComment;
    const isReply = !!replyingTo;
    
    try {
      await addDoc(collection(db, 'comments'), {
        videoId,
        text: commentText,
        userId: currentUser.uid,
        replyToId: replyingTo?.id || null,
        replyToName: replyingTo?.userName || null, // Gardé pour la trace mais l'affichage live est prioritaire
        createdAt: serverTimestamp()
      });

      const targetId = isReply ? replyingTo!.userId : creatorId;
      if (currentUser.uid !== targetId) {
          await sendNotification(targetId, 'comment', { videoId, videoTitle, commentText });
      }

      await updateDoc(doc(db, 'videos', videoId), { comments: increment(1) });
      setNewComment('');
      setReplyingTo(null);
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert("Erreur", "Impossible de publier.");
    } finally {
      setSending(false);
    }
  };

  // LOGIQUE DE NAVIGATION CORRIGÉE
  const handleNavigate = (userId: string) => {
    onClose();
    if (userId === currentUser?.uid) {
      // Si c'est mon commentaire, je vais sur mon espace privé (tabs-formateur)
      router.push('/(tabs-formateur)/profile');
    } else {
      // Sinon, profil public de l'autre personne
      router.push(`/profile/${userId}` as any);
    }
  };

  const startReply = (comment: CommentData) => {
      setReplyingTo(comment);
      setNewComment(`@Réponse `); // On peut personnaliser ici
      setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{comments.length} Commentaires</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#9333ea" style={{marginTop: 50}} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={[styles.commentItem, item.replyToId ? styles.replyItem : null]}>
                  <CommentAuthor 
                    userId={item.userId} 
                    isCreator={item.userId === creatorId} 
                    creatorId={creatorId}
                    onNavigate={handleNavigate} 
                  />
                  <View style={styles.textContainer}>
                    <Text style={styles.commentText}>{item.text}</Text>
                    <TouchableOpacity onPress={() => startReply(item)}>
                        <Text style={styles.replyButton}>Répondre</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}

          {replyingTo && (
              <View style={styles.replyBar}>
                  <Text style={styles.replyBarText}>Réponse en cours...</Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)}><Ionicons name="close-circle" size={20} color="#666" /></TouchableOpacity>
              </View>
          )}

          <View style={styles.inputArea}>
            <TextInput ref={inputRef} style={styles.input} placeholder="Écrire un commentaire..." value={newComment} onChangeText={setNewComment} multiline />
            <TouchableOpacity onPress={handleSend} style={styles.sendBtn} disabled={sending || !newComment.trim()}>
              {sending ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="send" size={18} color="white" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdrop: { flex: 1 },
  modalContent: { height: '85%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', position: 'relative' },
  closeBtn: { position: 'absolute', right: 15 },
  title: { fontWeight: 'bold', fontSize: 16 },
  commentItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  replyItem: { marginLeft: 45, borderLeftWidth: 2, borderLeftColor: '#E9D5FF', backgroundColor: '#FAF5FF' },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  avatarContainer: { marginRight: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f0f0f0' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#9333ea' },
  avatarInitial: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  skeletonAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eee', marginRight: 10 },
  textContainer: { paddingLeft: 44 },
  username: { fontWeight: 'bold', fontSize: 13, color: '#333' },
  authorBadge: { color: '#9333ea', fontSize: 11, fontWeight: 'bold' },
  commentText: { fontSize: 14, color: '#444' },
  replyButton: { fontSize: 12, color: '#666', fontWeight: 'bold', marginTop: 8 },
  replyBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#f0f0f0', alignItems: 'center' },
  replyBarText: { fontSize: 12, color: '#666' },
  inputArea: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center', backgroundColor: 'white' },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center' }
});