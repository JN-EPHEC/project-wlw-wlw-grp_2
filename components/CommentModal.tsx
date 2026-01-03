import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, 
  FlatList, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, addDoc, query, where, onSnapshot, serverTimestamp, 
  doc, updateDoc, increment, getDoc, deleteDoc 
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
}

// Définition de l'interface pour corriger les erreurs TS2339
interface CommentData {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  createdAt?: { seconds: number; nanoseconds: number } | any;
  replyToId?: string;
  replyToName?: string;
}

export default function CommentModal({ visible, onClose, videoId, creatorId, videoTitle }: CommentModalProps) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<CommentData | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!videoId || !visible) return;
    setLoading(true);

    // Requête simplifiée sans orderBy pour éviter le besoin d'index composite
    const q = query(
      collection(db, 'comments'), 
      where('videoId', '==', videoId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Correction de l'erreur TS : On définit le type lors du map
      const fetchedComments = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as CommentData));
      
      // Tri manuel en JavaScript pour garantir l'ordre chronologique
      const sortedComments = fetchedComments.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateA - dateB;
      });

      setComments(sortedComments);
      setLoading(false);
    }, (err) => { 
      console.error("Erreur Firestore : ", err);
      setLoading(false); 
    });
    return () => unsubscribe();
  }, [videoId, visible]);

  const handleSend = async () => {
    const user = auth.currentUser;
    if (!newComment.trim() || !user) return;

    try {
      if (editingCommentId) {
        // Logique de modification
        await updateDoc(doc(db, 'comments', editingCommentId), {
          text: newComment.trim(),
          updatedAt: serverTimestamp()
        });
        setEditingCommentId(null);
        Alert.alert("Succès", "Commentaire modifié");
      } else {
        // Nouveau commentaire ou réponse
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const fullName = `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || "Utilisateur";

        await addDoc(collection(db, 'comments'), {
          videoId,
          text: newComment.trim(),
          userId: user.uid,
          userName: fullName,
          userAvatar: userData?.photoURL || null,
          replyToId: replyingTo?.id || null,
          replyToName: replyingTo?.userName || null,
          createdAt: serverTimestamp()
        });

        await sendNotification(replyingTo ? replyingTo.userId : creatorId, 'comment', {
          videoId,
          videoTitle,
          commentText: newComment.substring(0, 30),
          senderName: fullName,
          senderId: user.uid
        });

        await updateDoc(doc(db, 'videos', videoId), { comments: increment(1) });
      }

      setNewComment('');
      setReplyingTo(null);
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Erreur", "Action impossible");
    }
  };

  const handleDelete = (commentId: string) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer ce commentaire ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
          await deleteDoc(doc(db, 'comments', commentId));
          await updateDoc(doc(db, 'videos', videoId), { comments: increment(-1) });
      }}
    ]);
  };

  const handleNavigate = (uid: string) => {
    onClose();
    router.push(uid === auth.currentUser?.uid ? '/(tabs-formateur)/profile' : `/profile/${uid}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{comments.length} Commentaires</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} /></TouchableOpacity>
          </View>
          
          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[styles.commentItem, item.replyToId && styles.replyItem]}>
                <TouchableOpacity onPress={() => handleNavigate(item.userId)}>
                  <Image source={{ uri: item.userAvatar || `https://ui-avatars.com/api/?name=${item.userName}` }} style={styles.avatar} />
                </TouchableOpacity>
                <View style={{flex:1}}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.username} onPress={() => handleNavigate(item.userId)}>{item.userName}</Text>
                    {item.userId === auth.currentUser?.uid && (
                      <View style={styles.commentActions}>
                        <TouchableOpacity onPress={() => { setEditingCommentId(item.id); setNewComment(item.text); inputRef.current?.focus(); }}>
                          <Ionicons name="pencil" size={16} color="#9333ea" style={{marginRight: 15}} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)}>
                          <Ionicons name="trash" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  {item.replyToName && <Text style={styles.replyLabel}>En réponse à @{item.replyToName}</Text>}
                  <Text style={styles.text}>{item.text}</Text>
                  <TouchableOpacity onPress={() => { setReplyingTo(item); setEditingCommentId(null); inputRef.current?.focus(); }}>
                    <Text style={styles.replyBtn}>Répondre</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />

          <View style={styles.inputArea}>
            <TextInput 
              ref={inputRef}
              style={styles.input} 
              value={newComment} 
              onChangeText={setNewComment} 
              placeholder={editingCommentId ? "Modifier..." : (replyingTo ? `Répondre à ${replyingTo.userName}` : "Écrire...")} 
            />
            <TouchableOpacity onPress={handleSend}>
              <Ionicons name={editingCommentId ? "checkmark-circle" : "send"} size={28} color="#9333ea" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: { height: '80%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontWeight: 'bold' },
  commentItem: { flexDirection: 'row', padding: 15 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentActions: { flexDirection: 'row' },
  replyItem: { marginLeft: 40, borderLeftWidth: 2, borderColor: '#eee' },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  username: { fontWeight: 'bold', fontSize: 13 },
  replyLabel: { fontSize: 11, color: '#9333ea', fontStyle: 'italic' },
  text: { fontSize: 14, color: '#333' },
  replyBtn: { fontSize: 12, color: '#666', marginTop: 5, fontWeight: 'bold' },
  inputArea: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, height: 40, marginRight: 10 }
});