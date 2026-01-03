import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, 
  FlatList, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, 
  doc, updateDoc, increment, getDoc, deleteDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { sendNotification } from '../app/utils/notificationService'; // Assurez-vous que ce fichier existe

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  creatorId: string; // OBLIGATOIRE pour les notifications
  videoTitle: string; // OBLIGATOIRE pour le message de notification
  onCountChange?: (videoId: string, delta: number) => void;
}

interface CommentData {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  createdAt: any;
}

export default function CommentModal({ visible, onClose, videoId, creatorId, videoTitle, onCountChange }: CommentModalProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!videoId || !visible) return;
    setLoading(true);

    const q = query(
        collection(db, 'comments'), 
        where('videoId', '==', videoId), 
        orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommentData[];
        setComments(loadedComments);
        setLoading(false);
    }, (error) => {
        console.error("Erreur comments:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [videoId, visible]);

  const handleSend = async () => {
    if (!newComment.trim() || !currentUser) return;

    setSending(true);
    const commentText = newComment;
    setNewComment(''); 
    Keyboard.dismiss();

    try {
      // 1. Ajouter le commentaire
      await addDoc(collection(db, 'comments'), {
        videoId: videoId,
        text: commentText,
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonyme",
        userAvatar: currentUser.photoURL || null,
        createdAt: serverTimestamp()
      });

      // 2. Compteur +1
      await updateDoc(doc(db, 'videos', videoId), { comments: increment(1) });
      
      // 3. ENVOI NOTIFICATION (Seulement si l'apprenant commente chez un formateur)
      if (currentUser.uid !== creatorId) {
          await sendNotification(creatorId, 'comment', {
              videoId: videoId,
              videoTitle: videoTitle,
              commentText: commentText
          });
      }

      if (onCountChange) onCountChange(videoId, 1);
    } catch (error) {
      Alert.alert("Erreur", "Envoi impossible");
      setNewComment(commentText); 
    } finally {
      setSending(false);
    }
  };

  // ... (Gardez le reste de la fonction handleDelete et le return du JSX inchangé)

  // 3. SUPPRESSION DU COMMENTAIRE (CORRIGÉE POUR WEB & MOBILE)
  const handleDelete = async (commentId: string) => {
    
    const performDelete = async () => {
        try {
            console.log("🗑️ Suppression commentaire:", commentId);
            
            // Mise à jour optimiste (suppression visuelle immédiate)
            setComments(prev => prev.filter(c => c.id !== commentId));

            // Suppression Firestore
            await deleteDoc(doc(db, 'comments', commentId));
            
            // Compteur Vidéo -1
            const videoRef = doc(db, 'videos', videoId);
            await updateDoc(videoRef, { comments: increment(-1) });

            if (onCountChange) onCountChange(videoId, -1);
            
            console.log("✅ Commentaire supprimé");

        } catch (error: any) {
            console.error("❌ Erreur suppression:", error);
            Alert.alert("Erreur", "Impossible de supprimer : " + error.message);
        }
    };

    // Gestion différente selon la plateforme
    if (Platform.OS === 'web') {
        if (confirm("Voulez-vous vraiment supprimer ce commentaire ?")) {
            await performDelete();
        }
    } else {
        Alert.alert(
            "Supprimer",
            "Voulez-vous vraiment supprimer ce commentaire ?",
            [
                { text: "Annuler", style: "cancel" },
                { text: "Supprimer", style: "destructive", onPress: performDelete }
            ]
        );
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "À l'instant";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{comments.length} commentaire{comments.length > 1 ? 's' : ''}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Liste */}
          {loading ? (
            <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#9333ea" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={item => item.id}
              contentContainerStyle={{paddingBottom: 20}}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Soyez le premier à commenter ! 👇</Text>
                </View>
              }
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
                        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                  </View>
                  
                  {/* BOUTON SUPPRIMER (Visible seulement pour l'auteur) */}
                  {currentUser && item.userId === currentUser.uid && (
                    <TouchableOpacity 
                        onPress={() => handleDelete(item.id)} 
                        style={styles.deleteBtn}
                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
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
          
          <View style={{height: Platform.OS === 'ios' ? 20 : 0, backgroundColor: 'white'}} />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdrop: { flex: 1 },
  modalContent: { 
    height: '70%', 
    backgroundColor: 'white', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
  },
  header: { 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
    padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', position: 'relative'
  },
  title: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  closeBtn: { position: 'absolute', right: 15, top: 15 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 50 },
  emptyText: { color: '#999', fontSize: 16 },

  commentItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f9f9f9', alignItems: 'flex-start' },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#eee' },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarInit: { fontWeight: 'bold', color: '#4F46E5', fontSize: 16 },
  
  textContainer: { flex: 1, marginRight: 10 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  username: { fontWeight: '600', fontSize: 13, color: '#333' },
  date: { color: '#bbb', fontSize: 10 },
  commentText: { color: '#444', fontSize: 14, lineHeight: 20 },
  deleteBtn: { padding: 5 },
  
  inputArea: { 
    flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', 
    alignItems: 'center', backgroundColor: 'white'
  },
  input: { 
    flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, 
    paddingVertical: 10, marginRight: 10, color: '#333', maxHeight: 100
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#d8b4fe' }
});