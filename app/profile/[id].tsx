import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Dimensions, ActivityIndicator, Alert, Modal, StatusBar, TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { 
  doc, collection, query, where, getDocs, updateDoc, 
  arrayUnion, arrayRemove, increment, onSnapshot, getDoc, deleteDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

import CommentModal from '../../components/CommentModal';
import { sendNotification } from'/../utils/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GRID_SPACING = 2;
const ITEM_WIDTH = (SCREEN_WIDTH - (GRID_SPACING * (COLUMN_COUNT + 1))) / COLUMN_COUNT;

interface UserData { 
  uid: string; 
  prenom: string; 
  nom: string; 
  displayName?: string;
  role: 'formateur' | 'apprenant'; 
  badge?: 'apprenant' | 'expert' | 'pro';
  bio?: string; 
  photoURL?: string; 
  followers?: string[]; 
  following?: string[]; 
  stats?: { videosWatched: number; }; 
}

interface VideoData { 
  id: string; 
  title: string; 
  videoUrl: string; 
  thumbnail?: string; 
  views: number; 
  likes: number; 
  comments: number; 
  description?: string; 
  creatorId: string; 
  tags?: string[]; 
  isPinned?: boolean; 
  createdAt?: any; 
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [profile, setProfile] = useState<UserData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>(""); 
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  
  const [myLikedVideos, setMyLikedVideos] = useState<Set<string>>(new Set());
  const [mySavedVideos, setMySavedVideos] = useState<Set<string>>(new Set());

  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [showComments, setShowComments] = useState(false);
  const videoRef = useRef<Video>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const totalViews = videos.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalLikes = videos.reduce((acc, curr) => acc + (curr.likes || 0), 0);

  const canInteract = !(currentUserRole === 'formateur' && profile?.role === 'formateur');

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    if (currentUserId) {
        getDoc(doc(db, 'users', currentUserId)).then(snap => {
            if (snap.exists()) {
              const data = snap.data();
              setCurrentUserRole(data.role);
              setCurrentUserName(`${data.prenom} ${data.nom}`);
            }
        });
    }

    const unsubProfile = onSnapshot(doc(db, 'users', id as string), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({ 
              uid: id as string, 
              displayName: data.displayName || `${data.prenom} ${data.nom}`.trim(),
              ...data 
            } as UserData);
            setFollowersCount(data.followers ? data.followers.length : 0);
        }
        setLoading(false);
    });

    if (currentUserId) {
        onSnapshot(doc(db, 'users', currentUserId), (docSnap) => {
            if (docSnap.exists()) {
                const myData = docSnap.data();
                setIsFollowing((myData.following || []).includes(id));
                setMyLikedVideos(new Set(myData.likedVideos || []));
                setMySavedVideos(new Set(myData.favorites || []));
            }
        });
    }

    const loadVideos = async () => {
        try {
            const vQuery = query(collection(db, 'videos'), where('creatorId', '==', id));
            const vSnapshot = await getDocs(vQuery);
            const videosData = vSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as VideoData));
            videosData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setVideos(videosData);
        } catch (e) { console.error(e); }
    };
    loadVideos();

    return () => unsubProfile();
  }, [id, currentUserId]);

  const handleUpdateVideo = async () => {
    if (!selectedVideo || !editTitle.trim()) return;
    
    setIsSaving(true);
    try {
      const videoDocRef = doc(db, 'videos', selectedVideo.id);
      await updateDoc(videoDocRef, {
        title: editTitle.trim(),
        description: editDescription.trim()
      });
      
      setVideos(prev => prev.map(v => 
        v.id === selectedVideo.id 
        ? { ...v, title: editTitle, description: editDescription } 
        : v
      ));
      setSelectedVideo(prev => prev ? { ...prev, title: editTitle, description: editDescription } : null);
      
      Alert.alert("✓", "Vidéo mise à jour !");
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de modifier la vidéo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessage = () => {
    if (!profile || !canInteract) return;
    router.push({
      pathname: "/chat" as any, 
      params: { conversationId: profile.uid } 
    });
  };

  const handleFollow = async () => {
    if (!currentUserId || !profile) return;
    
    try {
      const myRef = doc(db, 'users', currentUserId);
      const targetRef = doc(db, 'users', profile.uid);
      
      if (isFollowing) {
        await updateDoc(myRef, { following: arrayRemove(profile.uid) });
        await updateDoc(targetRef, { followers: arrayRemove(currentUserId) });
        setFollowersCount(prev => Math.max(0, prev - 1));
        Alert.alert('✓', `Vous ne suivez plus ${profile.displayName || profile.prenom}`);
      } else {
        await updateDoc(myRef, { following: arrayUnion(profile.uid) });
        await updateDoc(targetRef, { followers: arrayUnion(currentUserId) });
        setFollowersCount(prev => prev + 1);
        
        await addDoc(collection(db, 'notifications'), {
          userId: profile.uid,
          fromUserId: currentUserId,
          fromUserName: currentUserName,
          type: 'follow',
          read: false,
          createdAt: serverTimestamp()
        });
        
        Alert.alert('✓', `Vous suivez maintenant ${profile.displayName || profile.prenom}`);
      }
    } catch (error: any) {
      console.error('Erreur follow:', error);
      Alert.alert("Erreur", error.message || "Impossible de modifier l'abonnement");
    }
  };

  const handleVideoLike = async () => {
      if (!currentUserId || !selectedVideo || !canInteract) return;
      const isLiked = myLikedVideos.has(selectedVideo.id);
      try {
          const vRef = doc(db, 'videos', selectedVideo.id);
          const uRef = doc(db, 'users', currentUserId);
          if (isLiked) {
              await updateDoc(uRef, { likedVideos: arrayRemove(selectedVideo.id) });
              await updateDoc(vRef, { likes: increment(-1) });
          } else {
              await updateDoc(uRef, { likedVideos: arrayUnion(selectedVideo.id) });
              await updateDoc(vRef, { likes: increment(1) });
              await sendNotification(selectedVideo.creatorId, 'like', { videoId: selectedVideo.id, videoTitle: selectedVideo.title, senderName: currentUserName, senderId: currentUserId });
          }
      } catch (e) { console.error(e); }
  };

  const getBadgeInfo = (badge?: 'apprenant' | 'expert' | 'pro') => {
    switch (badge) {
      case 'expert':
        return { icon: 'shield-checkmark', color: '#3B82F6', label: 'Expert' };
      case 'pro':
        return { icon: 'star', color: '#FBA31A', label: 'Pro' };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7459f0" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }
  
  if (!profile) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-circle-outline" size={80} color="#ccc" />
        <Text style={styles.errorText}>Profil introuvable</Text>
      </View>
    );
  }

  const badgeInfo = getBadgeInfo(profile.badge);
  const isOwnProfile = currentUserId === profile.uid;

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER AVEC AVATAR INTÉGRÉ */}
        <View style={styles.headerSection}>
          <LinearGradient 
            colors={['#7459f0', '#9333ea', '#242a65']} 
            locations={[0, 0.5, 1]}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            {/* AVATAR DANS LE HEADER */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBorder}>
                {profile.photoURL ? (
                  <Image source={{ uri: profile.photoURL }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {profile.prenom?.[0]?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* NOM + ROLE DANS LE HEADER */}
            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.nameWhite}>{profile.displayName || `${profile.prenom} ${profile.nom}`}</Text>
                {badgeInfo && (
                  <View style={[styles.badge, { backgroundColor: badgeInfo.color }]}>
                    <Ionicons name={badgeInfo.icon as any} size={12} color="#fff" />
                    <Text style={styles.badgeText}>{badgeInfo.label}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.roleTagWhite}>
                <Ionicons name="school" size={14} color="#fff" />
                <Text style={styles.roleWhiteText}>Formateur</Text>
              </View>

              {/* STATS DANS LE HEADER */}
              <View style={styles.headerStats}>
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatValue}>{videos.length}</Text>
                  <Text style={styles.headerStatLabel}>Vidéos</Text>
                </View>
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatValue}>{followersCount}</Text>
                  <Text style={styles.headerStatLabel}>Abonnés</Text>
                </View>
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatValue}>{totalViews}</Text>
                  <Text style={styles.headerStatLabel}>Vues</Text>
                </View>
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatValue}>{totalLikes}</Text>
                  <Text style={styles.headerStatLabel}>J'aime</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* BOUTONS S'ABONNER ET MESSAGE */}
          {!isOwnProfile && (
            canInteract ? (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.followBtn, isFollowing && styles.followBtnActive]} 
                  onPress={handleFollow}
                >
                  <Ionicons 
                    name={isFollowing ? "checkmark-circle" : "person-add"} 
                    size={20} 
                    color={isFollowing ? "#7459f0" : "#fff"} 
                  />
                  <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                    {isFollowing ? "Abonné" : "Suivre"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.messageBtn} onPress={handleMessage}>
                  <Ionicons name="chatbubble-outline" size={20} color="#7459f0" />
                  <Text style={styles.messageBtnText}>Message</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.restrictedBanner}>
                <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
                <Text style={styles.restrictedText}>Collaboration entre formateurs restreinte</Text>
              </View>
            )
          )}
        </View>

        {/* VIDÉOS */}
        <View style={styles.videosSection}>
          <View style={styles.videosHeader}>
            <Text style={styles.videosTitle}>Vidéos publiées</Text>
            <View style={styles.videosCount}>
              <Text style={styles.videosCountText}>{videos.length}</Text>
            </View>
          </View>

          <View style={styles.videosGrid}>
            {videos.map((video) => (
              <TouchableOpacity 
                key={video.id} 
                style={styles.videoItem} 
                onPress={() => { 
                  setSelectedVideo(video); 
                  setShowPlayer(true); 
                }}
              >
                {video.thumbnail ? (
                  <Image source={{ uri: video.thumbnail }} style={styles.videoThumbnail} />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.5)" />
                  </View>
                )}
                
                <LinearGradient 
                  colors={['transparent', 'rgba(0,0,0,0.8)']} 
                  style={styles.videoGradient}
                >
                  <View style={styles.playIconContainer}>
                    <Ionicons name="play" size={16} color="#fff" />
                  </View>
                  <Text style={styles.videoViews}>{video.views}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={{height: 40}} />
      </ScrollView>

      {/* PLAYER MODAL */}
      <Modal visible={showPlayer && selectedVideo !== null} animationType="slide">
        <View style={styles.playerContainer}>
          {selectedVideo && (
            <>
              <Video 
                ref={videoRef} 
                source={{ uri: selectedVideo.videoUrl }} 
                style={StyleSheet.absoluteFill} 
                resizeMode={ResizeMode.COVER} 
                shouldPlay 
                isLooping 
              />

              {currentUserId === selectedVideo.creatorId && (
                <TouchableOpacity style={styles.optionsButton} onPress={() => setShowOptions(true)}>
                  <View style={styles.optionsIcon}>
                    <Ionicons name="ellipsis-vertical" size={24} color="white" />
                  </View>
                </TouchableOpacity>
              )}
              
              {canInteract && (
                <View style={styles.playerActions}>
                  <TouchableOpacity style={styles.playerAction} onPress={handleVideoLike}>
                    <View style={[styles.playerActionIcon, myLikedVideos.has(selectedVideo.id) && styles.playerActionIconActive]}>
                      <Ionicons 
                        name={myLikedVideos.has(selectedVideo.id) ? "heart" : "heart-outline"} 
                        size={28} 
                        color="#fff" 
                      />
                    </View>
                    <Text style={styles.playerActionText}>{selectedVideo.likes}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.playerAction} onPress={() => setShowComments(true)}>
                    <View style={styles.playerActionIcon}>
                      <Ionicons name="chatbubble-outline" size={28} color="#fff" />
                    </View>
                    <Text style={styles.playerActionText}>{selectedVideo.comments}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity onPress={() => setShowPlayer(false)} style={styles.closeButton}>
                <View style={styles.closeIcon}>
                  <Ionicons name="close" size={28} color="white" />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* MODAL OPTIONS */}
      <Modal visible={showOptions} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptions(false)}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={() => {
                setShowOptions(false);
                setEditTitle(selectedVideo?.title || '');
                setEditDescription(selectedVideo?.description || '');
                setIsEditing(true);
              }}
            >
              <Ionicons name="create-outline" size={24} color="#7459f0" />
              <Text style={styles.modalOptionText}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={() => {
                setShowOptions(false);
                Alert.alert("Supprimer", "Supprimer cette vidéo ?", [
                  { text: "Annuler", style: "cancel" },
                  { text: "Supprimer", style: "destructive", onPress: async () => {
                    try {
                      await deleteDoc(doc(db, 'videos', selectedVideo!.id));
                      setVideos(prev => prev.filter(v => v.id !== selectedVideo!.id));
                      setShowPlayer(false);
                      Alert.alert("✓", "Vidéo supprimée");
                    } catch (e) { 
                      Alert.alert("Erreur", "Impossible de supprimer"); 
                    }
                  }}
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <Text style={[styles.modalOptionText, {color: '#EF4444'}]}>Supprimer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowOptions(false)}>
              <Text style={styles.modalCancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL ÉDITION */}
      <Modal visible={isEditing} transparent animationType="slide">
        <View style={styles.editOverlay}>
          <View style={styles.editContent}>
            <Text style={styles.editTitle}>Modifier la vidéo</Text>
            
            <Text style={styles.editLabel}>Titre</Text>
            <TextInput 
              style={styles.editInput} 
              value={editTitle} 
              onChangeText={setEditTitle} 
              placeholder="Titre" 
              placeholderTextColor="#999"
            />
            
            <Text style={styles.editLabel}>Description</Text>
            <TextInput 
              style={[styles.editInput, styles.editTextArea]} 
              value={editDescription} 
              onChangeText={setEditDescription} 
              placeholder="Description" 
              placeholderTextColor="#999"
              multiline 
            />
            
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancel} onPress={() => setIsEditing(false)}>
                <Text style={styles.editCancelText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.editSave} onPress={handleUpdateVideo} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.editSaveText}>Sauvegarder</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {selectedVideo && canInteract && (
        <CommentModal 
          visible={showComments} 
          videoId={selectedVideo.id} 
          creatorId={selectedVideo.creatorId} 
          videoTitle={selectedVideo.title} 
          onClose={() => setShowComments(false)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#F8F8F6' },
  container: { flex: 1 },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F8F8F6' 
  },
  loadingText: { 
    color: '#7459f0', 
    fontSize: 16, 
    marginTop: 16, 
    fontWeight: '600' 
  },
  errorText: { 
    color: '#666', 
    fontSize: 18, 
    marginTop: 16 
  },
  
  // Header Section
  headerSection: {
    marginBottom: 20
  },
  headerGradient: { 
    paddingTop: 50, 
    paddingHorizontal: 20,
    paddingBottom: 30
  },
  backButton: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 20
  },
  
  avatarContainer: { 
    alignItems: 'center', 
    marginBottom: 16
  },
  avatarBorder: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 4, 
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8
  },
  avatarImg: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 50 
  },
  avatarPlaceholder: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 50, 
    backgroundColor: '#242a65', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarInitial: { 
    fontSize: 40, 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  
  headerInfo: {
    alignItems: 'center'
  },
  nameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 8 
  },
  nameWhite: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  
  roleTagWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20
  },
  roleWhiteText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  
  headerStats: {
    flexDirection: 'row',
    gap: 30
  },
  headerStatItem: {
    alignItems: 'center'
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2
  },
  
  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: -20
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7459f0',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  followBtnActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#7459f0'
  },
  followBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15
  },
  followBtnTextActive: {
    color: '#7459f0'
  },
  
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#7459f0',
    paddingVertical: 14,
    borderRadius: 12
  },
  messageBtnText: {
    color: '#7459f0',
    fontWeight: 'bold',
    fontSize: 15
  },
  
  restrictedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: -20
  },
  restrictedText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500'
  },
  
  // Videos Section
  videosSection: {
    paddingHorizontal: 20
  },
  videosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  videosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#242a65'
  },
  videosCount: {
    backgroundColor: '#7459f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  videosCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  
  videosGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    marginHorizontal: -1
  },
  videoItem: { 
    width: ITEM_WIDTH, 
    height: 200, 
    backgroundColor: '#242a65',
    borderRadius: 12,
    overflow: 'hidden',
    margin: 1
  },
  videoThumbnail: { 
    width: '100%', 
    height: '100%' 
  },
  videoPlaceholder: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#1a1a2e'
  },
  videoGradient: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  playIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7459f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoViews: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '700' 
  },
  
  // Player
  playerContainer: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  optionsButton: { 
    position: 'absolute', 
    top: 50, 
    right: 20 
  },
  optionsIcon: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  playerActions: { 
    position: 'absolute', 
    bottom: 120, 
    right: 16, 
    gap: 24 
  },
  playerAction: { 
    alignItems: 'center', 
    gap: 6 
  },
  playerActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  playerActionIconActive: {
    backgroundColor: '#EF4444'
  },
  playerActionText: { 
    color: '#fff', 
    fontSize: 13, 
    fontWeight: '600' 
  },
  
  closeButton: { 
    position: 'absolute', 
    top: 50, 
    left: 20 
  },
  closeIcon: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  // Modals
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'flex-end', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    overflow: 'hidden'
  },
  modalOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 18, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#E5E7EB', 
    gap: 12 
  },
  modalOptionText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#242a65' 
  },
  modalCancel: { 
    padding: 18, 
    alignItems: 'center' 
  },
  modalCancelText: { 
    fontSize: 16, 
    color: '#666', 
    fontWeight: '500' 
  },
  
  // Edit Modal
  editOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    padding: 24 
  },
  editContent: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 24
  },
  editTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#242a65'
  },
  editLabel: { 
    fontSize: 13, 
    color: '#666', 
    marginBottom: 8,
    fontWeight: '600'
  },
  editInput: { 
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#F9FAFB'
  },
  editTextArea: { 
    height: 100, 
    textAlignVertical: 'top' 
  },
  editActions: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 8 
  },
  editCancel: { 
    flex: 1, 
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center'
  },
  editCancelText: { 
    color: '#666', 
    fontWeight: '600',
    fontSize: 15
  },
  editSave: { 
    flex: 2, 
    backgroundColor: '#7459f0',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  editSaveText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 15
  }
});