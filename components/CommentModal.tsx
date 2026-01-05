import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, 
  FlatList, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  collection, addDoc, query, where, onSnapshot, serverTimestamp, 
  doc, updateDoc, increment, getDoc, deleteDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useRouter } from 'expo-router';

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  creatorId: string; 
  videoTitle: string; 
}

interface CommentData {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  createdAt?: any;
  replyToId?: string;
  replyToName?: string;
  likes?: number;
  likedBy?: string[];
}

export default function CommentModal({ visible, onClose, videoId, creatorId, videoTitle }: CommentModalProps) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommentData | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!videoId || !visible) return;
    setLoading(true);
    const q = query(collection(db, 'comments'), where('videoId', '==', videoId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || '',
          userId: data.userId || '',
          userName: data.userName || 'Utilisateur',
          userAvatar: data.userAvatar || undefined,
          createdAt: data.createdAt || undefined,
          replyToId: data.replyToId || undefined,
          replyToName: data.replyToName || undefined,
          likes: data.likes || 0,
          likedBy: data.likedBy || []
        } as CommentData;
      });
      setComments(fetched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    }, (err) => { setLoading(false); });
    return () => unsubscribe();
  }, [videoId, visible]);

  const handleSend = async () => {
    const user = auth.currentUser;
    if (!newComment.trim() || !user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const fullName = `${userData?.prenom || ''} ${userData?.nom || ''}`.trim() || userData?.displayName || "Utilisateur";

      await addDoc(collection(db, 'comments'), {
        videoId,
        text: newComment.trim(),
        userId: user.uid,
        userName: fullName,
        userAvatar: userData?.photoURL || null,
        replyToId: replyingTo?.id || null,
        replyToName: replyingTo?.userName || null,
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'videos', videoId), { comments: increment(1) });

      if (creatorId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: creatorId,
          fromUserId: user.uid,
          fromUserName: fullName,
          fromUserAvatar: userData?.photoURL || null,
          type: 'comment',
          videoId: videoId,
          videoTitle: videoTitle,
          comment: newComment.trim().substring(0, 50),
          read: false,
          createdAt: serverTimestamp()
        });
      }

      if (replyingTo && replyingTo.userId !== user.uid && replyingTo.userId !== creatorId) {
        await addDoc(collection(db, 'notifications'), {
          userId: replyingTo.userId,
          fromUserId: user.uid,
          fromUserName: fullName,
          fromUserAvatar: userData?.photoURL || null,
          type: 'comment',
          videoId: videoId,
          videoTitle: videoTitle,
          comment: `En réponse : ${newComment.trim().substring(0, 50)}`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setNewComment('');
      setReplyingTo(null);
      Keyboard.dismiss();
    } catch (e: any) {
      console.error("❌ Erreur commentaire:", e);
      Alert.alert("Erreur", "Impossible d'ajouter le commentaire");
    }
  };

  const handleLike = async (comment: CommentData) => {
    const user = auth.currentUser;
    if (!user) return;

    const isLiked = comment.likedBy?.includes(user.uid);
    const commentRef = doc(db, 'comments', comment.id);

    try {
      if (isLiked) {
        await updateDoc(commentRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(commentRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid)
        });
      }
    } catch (e: any) {
      console.error("❌ Erreur like:", e);
    }
  };

  const handleDelete = async (comment: CommentData) => {
    const user = auth.currentUser;
    if (!user) return;

    const isMyComment = comment.userId === user.uid;
    const isMyVideo = creatorId === user.uid;

    if (!isMyComment && !isMyVideo) {
      Alert.alert("Non autorisé", "Vous ne pouvez supprimer que vos propres commentaires ou ceux sur vos vidéos");
      return;
    }

    const performDelete = async () => {
      try {
        await deleteDoc(doc(db, 'comments', comment.id));
        await updateDoc(doc(db, 'videos', videoId), { comments: increment(-1) });
      } catch (e: any) {
        console.error('❌ Erreur suppression:', e);
        Alert.alert("Erreur", "Impossible de supprimer");
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Voulez-vous vraiment supprimer ce commentaire ?')) {
        await performDelete();
      }
    } else {
      Alert.alert(
        "Supprimer", 
        "Êtes-vous sûr ?", 
        [
          { text: "Annuler", style: "cancel" },
          { text: "Supprimer", style: "destructive", onPress: performDelete }
        ]
      );
    }
  };

  const handleNavigate = async (uid: string) => {
    onClose();
    const currentUser = auth.currentUser;
    if (uid === currentUser?.uid) {
      router.push('/(tabs)/profile' as any);
    } else {
      router.push(`/profile/${uid}` as any);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return "Hier";
    return `${days}j`;
  };

  const organizedComments = comments.filter(c => !c.replyToId);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalContent}
        >
          <View style={styles.dragHandle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>{comments.length} Commentaire{comments.length > 1 ? 's' : ''}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7459f0" />
            </View>
          ) : (
            <FlatList
              data={organizedComments}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Aucun commentaire</Text>
                  <Text style={styles.emptySubtext}>Soyez le premier à commenter !</Text>
                </View>
              }
              renderItem={({ item: parentComment }) => {
                const isLiked = parentComment.likedBy?.includes(auth.currentUser?.uid || '');
                const isMyComment = parentComment.userId === auth.currentUser?.uid;
                const isMyVideo = creatorId === auth.currentUser?.uid;
                const canDelete = isMyComment || isMyVideo;
                const replies = comments.filter(c => c.replyToId === parentComment.id);

                return (
                  <View style={styles.commentWrapper}>
                    <View style={styles.commentItem}>
                      <TouchableOpacity onPress={() => handleNavigate(parentComment.userId)}>
                        <LinearGradient
                          colors={['#7459f0', '#242A65']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.avatarGradient}
                        >
                          <Image 
                            source={{ uri: parentComment.userAvatar || `https://ui-avatars.com/api/?name=${parentComment.userName}` }} 
                            style={styles.avatar} 
                          />
                        </LinearGradient>
                      </TouchableOpacity>
                      
                      <View style={{flex: 1}}>
                        <View style={styles.commentHeader}>
                          <View style={{flex: 1}}>
                            <Text style={styles.username}>{parentComment.userName}</Text>
                            <Text style={styles.timeText}>{formatTime(parentComment.createdAt)}</Text>
                          </View>
                          
                          {canDelete && (
                            <TouchableOpacity onPress={() => handleDelete(parentComment)} style={styles.deleteBtn}>
                              <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>

                        <Text style={styles.text}>{parentComment.text}</Text>
                        
                        <View style={styles.actionsRow}>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(parentComment)}>
                            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? "#EF4444" : "#6B7280"} />
                            {(parentComment.likes || 0) > 0 && (
                              <Text style={[styles.actionText, isLiked && {color: '#EF4444'}]}>{parentComment.likes}</Text>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.actionBtn} onPress={() => { setReplyingTo(parentComment); inputRef.current?.focus(); }}>
                            <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
                            <Text style={styles.actionText}>Répondre</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {replies.length > 0 && (
                      <View style={styles.repliesContainer}>
                        {replies.map(reply => {
                          const isReplyLiked = reply.likedBy?.includes(auth.currentUser?.uid || '');
                          const isMyReply = reply.userId === auth.currentUser?.uid;
                          const canDeleteReply = isMyReply || isMyVideo;

                          return (
                            <View key={reply.id} style={styles.replyItem}>
                              <TouchableOpacity onPress={() => handleNavigate(reply.userId)}>
                                <LinearGradient
                                  colors={['#9333ea', '#7459f0']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.replyAvatarGradient}
                                >
                                  <Image source={{ uri: reply.userAvatar || `https://ui-avatars.com/api/?name=${reply.userName}` }} style={styles.replyAvatar} />
                                </LinearGradient>
                              </TouchableOpacity>
                              
                              <View style={{flex: 1}}>
                                <View style={styles.commentHeader}>
                                  <View style={{flex: 1}}>
                                    <Text style={styles.replyUsername}>{reply.userName}</Text>
                                    <Text style={styles.replyTimeText}>{formatTime(reply.createdAt)}</Text>
                                  </View>
                                  
                                  {canDeleteReply && (
                                    <TouchableOpacity onPress={() => handleDelete(reply)} style={styles.deleteBtn}>
                                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                  )}
                                </View>

                                <Text style={styles.replyLabel}>En réponse à @{reply.replyToName}</Text>
                                <Text style={styles.replyText}>{reply.text}</Text>
                                
                                <View style={styles.actionsRow}>
                                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(reply)}>
                                    <Ionicons name={isReplyLiked ? "heart" : "heart-outline"} size={16} color={isReplyLiked ? "#EF4444" : "#6B7280"} />
                                    {(reply.likes || 0) > 0 && (
                                      <Text style={[styles.actionText, isReplyLiked && {color: '#EF4444'}]}>{reply.likes}</Text>
                                    )}
                                  </TouchableOpacity>

                                  <TouchableOpacity style={styles.actionBtn} onPress={() => { setReplyingTo(reply); inputRef.current?.focus(); }}>
                                    <Ionicons name="chatbubble-outline" size={14} color="#6B7280" />
                                    <Text style={styles.replyActionText}>Répondre</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}

          <View style={styles.inputArea}>
            {replyingTo && (
              <View style={styles.replyIndicator}>
                <Text style={styles.replyIndicatorText}>Réponse à @{replyingTo.userName}</Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Ionicons name="close-circle" size={18} color="#7459f0" />
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.inputRow}>
              <TextInput 
                ref={inputRef}
                style={styles.input} 
                value={newComment} 
                onChangeText={setNewComment} 
                placeholder={replyingTo ? "Votre réponse..." : "Écrire un commentaire..."} 
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
              <TouchableOpacity onPress={handleSend} disabled={!newComment.trim()} activeOpacity={0.7}>
                <LinearGradient
                  colors={newComment.trim() ? ['#7459f0', '#9333ea'] : ['#D1D5DB', '#9CA3AF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendBtn}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  backdrop: {
    flex: 1
  },
  modalContent: { 
    height: '65%',
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1, 
    borderColor: '#F3F4F6' 
  },
  title: { fontWeight: 'bold', fontSize: 18, color: '#1F2937' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { marginTop: 60, alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  commentWrapper: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  commentItem: { flexDirection: 'row', padding: 16, backgroundColor: '#fff' },
  avatarGradient: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    marginRight: 12,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#E5E7EB' 
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  username: { fontWeight: 'bold', fontSize: 14, color: '#1F2937' },
  timeText: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  deleteBtn: { padding: 4 },
  text: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 8 },
  actionsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  repliesContainer: { marginLeft: 52, backgroundColor: '#F9FAFB' },
  replyItem: { 
    flexDirection: 'row', 
    padding: 12, 
    paddingLeft: 16, 
    borderLeftWidth: 3, 
    borderLeftColor: '#7459f0' 
  },
  replyAvatarGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  replyAvatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#E5E7EB' 
  },
  replyUsername: { fontWeight: '600', fontSize: 13, color: '#1F2937' },
  replyTimeText: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  replyLabel: { fontSize: 11, color: '#7459f0', fontStyle: 'italic', marginBottom: 4 },
  replyText: { fontSize: 13, color: '#374151', lineHeight: 18, marginBottom: 6 },
  replyActionText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  inputArea: { 
    padding: 16, 
    borderTopWidth: 1, 
    borderColor: '#F3F4F6', 
    backgroundColor: 'white',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16
  },
  replyIndicator: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#F3E8FF', 
    padding: 10, 
    borderRadius: 12, 
    marginBottom: 12, 
    borderLeftWidth: 3, 
    borderLeftColor: '#7459f0' 
  },
  replyIndicatorText: { fontSize: 13, color: '#7459f0', fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { 
    flex: 1, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    fontSize: 14, 
    maxHeight: 100 
  },
  sendBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  }
});