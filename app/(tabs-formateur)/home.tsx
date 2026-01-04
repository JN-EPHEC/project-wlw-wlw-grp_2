import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, useWindowDimensions, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TouchableWithoutFeedback, Modal, TextInput, KeyboardAvoidingView, Platform, Share, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, increment, arrayUnion, arrayRemove, getDoc, addDoc, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Mise à jour de l'interface pour inclure l'avatar
interface VideoData {
  id: string;
  title: string;
  description: string;
  category: string;
  creatorId: string;
  creatorName: string; // Nom affiché (enrichi)
  creatorAvatar?: string | null; // URL de la photo (enrichi)
  videoUrl: string;
  likes: number;
  views: number;
  comments: number;
  tags: string[];
  duration: number;
  createdAt: any;
}

interface UserProfile {
  uid: string;
  favorites?: string[];
  following?: string[];
  watchHistory?: string[];
  interests?: string[];
  displayName?: string;
  photoURL?: string;
}

interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  text: string;
  likes: number;
  replies: Reply[];
  createdAt: any;
  likedBy?: string[];
}

interface Reply {
  id: string;
  userId: string;
  userName: string;
  text: string;
  likes: number;
  createdAt: any;
  likedBy?: string[];
}

export default function HomeScreen() {
  const router = useRouter();
  const { width: dynamicWidth, height: dynamicHeight } = useWindowDimensions();
  const currentUserId = auth.currentUser?.uid;
  
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // États pour les commentaires
  const [showComments, setShowComments] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const videoRefs = useRef<Record<string, Video | null>>({});

  useFocusEffect(
    useCallback(() => {
      setIsPlaying(true);
      const timer = setTimeout(async () => {
        const currentVideo = videoRefs.current[videos[currentIndex]?.id];
        if (currentVideo) {
          try {
            await currentVideo.playAsync();
          } catch (error) {
            console.log('Error playing video:', error);
          }
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        Object.values(videoRefs.current).forEach(async (video) => {
          if (video) {
            try { await video.pauseAsync(); } catch (error) {}
          }
        });
        setIsPlaying(false);
      };
    }, [videos, currentIndex])
  );

  useEffect(() => {
    loadUserProfile();
    loadVideos();
  }, []);

  useEffect(() => {
    const pauseOtherVideos = async () => {
      Object.keys(videoRefs.current).forEach(async (videoId, index) => {
        if (index !== currentIndex && videoRefs.current[videoId]) {
          try { await videoRefs.current[videoId]?.pauseAsync(); } catch (error) {}
        }
      });
    };
    pauseOtherVideos();
  }, [currentIndex]);

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({
          uid: user.uid,
          favorites: data.favorites || [],
          following: data.following || [],
          watchHistory: data.watchHistory || [],
          interests: data.interests || [],
          displayName: data.displayName || data.email || 'Utilisateur',
          photoURL: data.photoURL
        });
        
        if (data.likedVideos && Array.isArray(data.likedVideos)) {
          setLikedVideos(new Set(data.likedVideos));
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // --- AMÉLIORATION : Enrichissement des données (Data Enrichment) ---
  const loadVideos = async () => {
    try {
      const videosQuery = query(
        collection(db, 'videos'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(videosQuery);
      
      // Extraction des données brutes
      const rawVideos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VideoData[];

      // Enrichissement : Récupérer les infos à jour du créateur (Avatar & Nom)
      const enrichedVideos = await Promise.all(rawVideos.map(async (video) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', video.creatorId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                    ...video,
                    // Priorité au nom complet, sinon pseudo, sinon nom stocké dans la vidéo
                    creatorName: userData.displayName || `${userData.prenom || ''} ${userData.nom || ''}`.trim() || video.creatorName,
                    creatorAvatar: userData.photoURL || null
                };
            }
            return video;
        } catch (e) {
            return video;
        }
      }));
      
      // Filtrage par centres d'intérêt (si applicable)
      if (userProfile?.interests && userProfile.interests.length > 0) {
        const filteredVideos = enrichedVideos.filter(video =>
          userProfile.interests?.includes(video.category)
        );
        
        if (filteredVideos.length > 0) {
          setVideos([...filteredVideos, ...enrichedVideos.filter(v => !filteredVideos.includes(v))]);
        } else {
          setVideos(enrichedVideos);
        }
      } else {
        setVideos(enrichedVideos);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading videos:', error);
      setLoading(false);
    }
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / SCREEN_HEIGHT);
    
    if (index !== currentIndex && index >= 0 && index < videos.length) {
      setCurrentIndex(index);
      setIsPlaying(true);
      setProgress(0);
      handleMarkVideoAsWatched(videos[index]);
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setProgress(status.positionMillis);
      setDuration(status.durationMillis || 0);
    }
  };

  const togglePlayPause = async () => {
    const currentVideo = videoRefs.current[videos[currentIndex]?.id];
    if (currentVideo) {
      if (isPlaying) {
        await currentVideo.pauseAsync();
        setIsPlaying(false);
      } else {
        await currentVideo.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const createNotification = async (type: string, videoId: string, creatorId: string) => {
    try {
      const user = auth.currentUser;
      if (!user || user.uid === creatorId) return;

      await addDoc(collection(db, 'notifications'), {
        userId: creatorId,
        fromUserId: user.uid,
        fromUserName: userProfile?.displayName || 'Un utilisateur',
        type: type,
        videoId: videoId,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const handleMarkVideoAsWatched = async (video: VideoData) => {
    try {
      const user = auth.currentUser;
      if (!user || !userProfile) return;
      if (userProfile.watchHistory?.includes(video.id)) return;

      await updateDoc(doc(db, 'users', user.uid), {
        watchHistory: arrayUnion(video.id)
      });
      await updateDoc(doc(db, 'videos', video.id), {
        views: increment(1)
      });
      
      setUserProfile(prev => prev ? {
        ...prev,
        watchHistory: [...(prev.watchHistory || []), video.id]
      } : null);
    } catch (error) {
      console.error('Error marking video as watched:', error);
    }
  };

  const handleLike = async (videoId: string, creatorId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const isLiked = likedVideos.has(videoId);
      
      if (isLiked) {
        setLikedVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
        await updateDoc(doc(db, 'videos', videoId), { likes: increment(-1) });
        await updateDoc(doc(db, 'users', user.uid), { likedVideos: arrayRemove(videoId) });
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes: v.likes - 1 } : v));
      } else {
        setLikedVideos(prev => new Set([...prev, videoId]));
        await updateDoc(doc(db, 'videos', videoId), { likes: increment(1) });
        await updateDoc(doc(db, 'users', user.uid), { likedVideos: arrayUnion(videoId) });
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes: v.likes + 1 } : v));
        await createNotification('like', videoId, creatorId);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de liker la vidéo');
    }
  };

  const handleFavorite = async (videoId: string, creatorId: string) => {
    try {
      const user = auth.currentUser;
      if (!user || !userProfile) return;
      
      const isFavorited = userProfile.favorites?.includes(videoId) ?? false;
      
      if (isFavorited) {
        await updateDoc(doc(db, 'users', user.uid), { favorites: arrayRemove(videoId) });
        Alert.alert('✓', 'Retiré des favoris');
        setUserProfile(prev => prev ? { ...prev, favorites: (prev.favorites || []).filter(id => id !== videoId) } : null);
      } else {
        await updateDoc(doc(db, 'users', user.uid), { favorites: arrayUnion(videoId) });
        Alert.alert('✓', 'Ajouté aux favoris ⭐');
        setUserProfile(prev => prev ? { ...prev, favorites: [...(prev.favorites || []), videoId] } : null);
        await createNotification('save', videoId, creatorId);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour les favoris');
    }
  };

  const handleFollow = async (creatorId: string, creatorName: string) => {
    try {
      const user = auth.currentUser;
      if (!user || !userProfile) return;
      
      const isFollowing = userProfile.following?.includes(creatorId) ?? false;
      
      if (isFollowing) {
        await updateDoc(doc(db, 'users', user.uid), { following: arrayRemove(creatorId) });
        Alert.alert('✓', `Vous ne suivez plus ${creatorName}`);
        setUserProfile(prev => prev ? { ...prev, following: (prev.following || []).filter(id => id !== creatorId) } : null);
      } else {
        await updateDoc(doc(db, 'users', user.uid), { following: arrayUnion(creatorId) });
        Alert.alert('✓', `Vous suivez maintenant ${creatorName} ✅`);
        setUserProfile(prev => prev ? { ...prev, following: [...(prev.following || []), creatorId] } : null);
        await createNotification('follow', '', creatorId);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de suivre/désuivre');
    }
  };

  // --- Commentaires et Réponses ---
  const loadComments = async (videoId: string) => {
    setLoadingComments(true);
    try {
      const commentsQuery = query(collection(db, 'comments'), where('videoId', '==', videoId));
      const snapshot = await getDocs(commentsQuery);
      
      const commentsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, replies: data.replies || [] };
      }) as Comment[];
      
      commentsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setComments(commentsData);
      setLoadingComments(false);
    } catch (error) {
      setLoadingComments(false);
    }
  };

  const handleComment = async (videoId: string, creatorId: string) => {
    setCurrentVideoId(videoId);
    setShowComments(true);
    await loadComments(videoId);
    
    const currentVideo = videoRefs.current[videoId];
    if (currentVideo) {
      try {
        await currentVideo.pauseAsync();
        setIsPlaying(false);
      } catch (error) {}
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour commenter');
        return;
      }

      const commentData = {
        videoId: currentVideoId,
        userId: user.uid,
        userName: userProfile?.displayName || 'Utilisateur',
        text: newComment.trim(),
        likes: 0,
        replies: [],
        likedBy: [],
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'comments'), commentData);
      await updateDoc(doc(db, 'videos', currentVideoId), { comments: increment(1) });
      setVideos(prev => prev.map(v => v.id === currentVideoId ? { ...v, comments: v.comments + 1 } : v));

      setNewComment('');
      loadComments(currentVideoId);
      Alert.alert('✓', 'Commentaire ajouté !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le commentaire');
    }
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour répondre');
        return;
      }

      const reply = {
        id: Date.now().toString(),
        userId: user.uid,
        userName: userProfile?.displayName || 'Utilisateur',
        text: replyText.trim(),
        likes: 0,
        likedBy: [],
        createdAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'comments', commentId), { replies: arrayUnion(reply) });
      await updateDoc(doc(db, 'videos', currentVideoId), { comments: increment(1) });
      setVideos(prev => prev.map(v => v.id === currentVideoId ? { ...v, comments: v.comments + 1 } : v));

      setReplyText('');
      setReplyTo(null);
      loadComments(currentVideoId);
      Alert.alert('✓', 'Réponse ajoutée !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la réponse');
    }
  };

  const handleDeleteComment = async (commentId: string, repliesCount: number) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const performDelete = async () => {
        try {
          await deleteDoc(doc(db, 'comments', commentId));
          await updateDoc(doc(db, 'videos', currentVideoId), { comments: increment(-(1 + repliesCount)) });
          setVideos(prev => prev.map(v => v.id === currentVideoId ? { ...v, comments: v.comments - (1 + repliesCount) } : v));
          loadComments(currentVideoId);
          Platform.OS === 'web' ? alert('✓ Commentaire supprimé !') : Alert.alert('Succès', 'Commentaire supprimé !');
        } catch (error) {
          Alert.alert('Erreur', 'Impossible de supprimer le commentaire');
        }
      };

      if (Platform.OS === 'web') {
        if (confirm('Supprimer ce commentaire ?')) await performDelete();
      } else {
        Alert.alert('Confirmation', 'Supprimer ce commentaire ?', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: performDelete }
        ]);
      }
    } catch (error) {}
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const performDelete = async () => {
        try {
          const comment = comments.find(c => c.id === commentId);
          if (!comment) return;
          const replyToDelete = comment.replies.find(r => r.id === replyId);
          if (!replyToDelete) return;

          await updateDoc(doc(db, 'comments', commentId), { replies: arrayRemove(replyToDelete) });
          await updateDoc(doc(db, 'videos', currentVideoId), { comments: increment(-1) });
          setVideos(prev => prev.map(v => v.id === currentVideoId ? { ...v, comments: v.comments - 1 } : v));
          loadComments(currentVideoId);
          Platform.OS === 'web' ? alert('✓ Réponse supprimée !') : Alert.alert('Succès', 'Réponse supprimée !');
        } catch (error) {
          Alert.alert('Erreur', 'Impossible de supprimer la réponse');
        }
      };

      if (Platform.OS === 'web') {
        if (confirm('Supprimer cette réponse ?')) await performDelete();
      } else {
        Alert.alert('Confirmation', 'Supprimer cette réponse ?', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: performDelete }
        ]);
      }
    } catch (error) {}
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      const isLiked = comment.likedBy?.includes(user.uid);
      const commentRef = doc(db, 'comments', commentId);

      if (isLiked) {
        await updateDoc(commentRef, { likes: increment(-1), likedBy: arrayRemove(user.uid) });
      } else {
        await updateDoc(commentRef, { likes: increment(1), likedBy: arrayUnion(user.uid) });
      }
      loadComments(currentVideoId);
    } catch (error) {}
  };

  const handleLikeReply = async (commentId: string, replyId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      const updatedReplies = comment.replies.map(reply => {
        if (reply.id === replyId) {
          const isLiked = reply.likedBy?.includes(user.uid);
          return {
            ...reply,
            likes: isLiked ? reply.likes - 1 : reply.likes + 1,
            likedBy: isLiked ? (reply.likedBy || []).filter(id => id !== user.uid) : [...(reply.likedBy || []), user.uid]
          };
        }
        return reply;
      });

      await updateDoc(doc(db, 'comments', commentId), { replies: updatedReplies });
      loadComments(currentVideoId);
    } catch (error) {}
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    let date;
    if (timestamp.toDate) date = timestamp.toDate();
    else if (typeof timestamp === 'string') date = new Date(timestamp);
    else return '';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}j`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}min`;
    return 'À l\'instant';
  };

  const handleShare = async (video: VideoData) => {
    try {
      const shareMessage = `🎓 Découvrez cette vidéo sur SwipeSkills !\n\n📹 ${video.title}\n👤 Par @${video.creatorName}\n\n${video.description}\n\n🔗 Lien: https://swipeskills.app/video/${video.id}`;
      if (Platform.OS === 'web') {
        if (navigator.share) {
            try { await navigator.share({ title: video.title, text: shareMessage, url: `https://swipeskills.app/video/${video.id}` }); alert('✓ Partagé !'); } 
            catch (e: any) { if (e.name !== 'AbortError') { await navigator.clipboard.writeText(shareMessage); alert('✓ Lien copié !'); } }
        } else { await navigator.clipboard.writeText(shareMessage); alert('✓ Lien copié !'); }
      } else {
        const result = await Share.share({ message: shareMessage, title: video.title });
        if (result.action === Share.sharedAction) Alert.alert('✓', 'Partagé avec succès !');
      }
    } catch (error) { Alert.alert('Erreur', 'Impossible de partager'); }
  };

  const handleCreatorClick = (creatorId: string) => {
    try {
        if (creatorId === currentUserId) {
            // Optionnel : rediriger vers son propre profil si c'est soi-même
            // router.push('/(tabs)/profile'); 
            router.push(`/profile/${creatorId}` as any);
        } else {
            router.push(`/profile/${creatorId}` as any);
        }
    } catch (error) { Alert.alert('Erreur', 'Impossible de charger le profil'); }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7459F0" />
        <Text style={styles.loadingText}>Chargement des vidéos...</Text>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-off" size={64} color="#7459F0" />
        <Text style={styles.emptyTitle}>Aucune vidéo disponible</Text>
      </View>
    );
  }

  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Ajout de la StatusBar (Manquait dans Code A) */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.progressIndicator}>
        <Text style={styles.progressText}>{currentIndex + 1} / {videos.length}</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {videos.map((video, index) => {
          const isLiked = likedVideos.has(video.id);
          const isFavorited = userProfile?.favorites?.includes(video.id) ?? false;
          const isFollowing = userProfile?.following?.includes(video.creatorId) ?? false;
          const isMyVideo = video.creatorId === currentUserId; // Detection "Ma vidéo"
          
          return (
            <View key={video.id} style={styles.videoContainer}>
              <TouchableWithoutFeedback onPress={togglePlayPause}>
                <View style={styles.videoWrapper}>
                  <Video
                    ref={(ref) => { if (ref) videoRefs.current[video.id] = ref; }}
                    source={{ uri: video.videoUrl }}
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={index === currentIndex && isPlaying}
                    isLooping
                    style={StyleSheet.absoluteFillObject}
                    onPlaybackStatusUpdate={index === currentIndex ? handlePlaybackStatusUpdate : undefined}
                    useNativeControls={false}
                    videoStyle={{ width: dynamicWidth, height: dynamicHeight }}
                  />
                  {!isPlaying && index === currentIndex && (
                    <View style={styles.playPauseIcon}>
                      <Ionicons name="play" size={80} color="rgba(255,255,255,0.8)" />
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>

              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay} />

              {index === currentIndex && (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                  </View>
                </View>
              )}

              <View style={styles.leftSide}>
                <TouchableOpacity style={styles.creatorInfo} onPress={() => handleCreatorClick(video.creatorId)}>
                  {/* AMÉLIORATION : Gestion d'image d'avatar */}
                  <View style={[styles.creatorAvatar, video.creatorAvatar ? { borderWidth: 1 } : {}]}>
                    {video.creatorAvatar ? (
                        <Image 
                            source={{ uri: video.creatorAvatar }} 
                            style={styles.avatarImage} 
                        />
                    ) : (
                        <Text style={styles.creatorInitial}>
                            {video.creatorName.charAt(0).toUpperCase()}
                        </Text>
                    )}
                  </View>

                  <View style={styles.creatorDetails}>
                    <Text style={styles.creatorName}>
                        @{video.creatorName} {isMyVideo && <Text style={{fontSize: 12, color: '#aaa'}}>(Moi)</Text>}
                    </Text>
                    
                    {!isMyVideo && ( // On ne se suit pas soi-même
                        <TouchableOpacity 
                        style={[styles.followButton, isFollowing && styles.followButtonActive]}
                        onPress={() => handleFollow(video.creatorId, video.creatorName)}
                        >
                        <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
                            {isFollowing ? 'Suivi' : 'Suivre'}
                        </Text>
                        </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>

                <Text style={styles.title} numberOfLines={1}>{video.title}</Text>
                <Text style={styles.description} numberOfLines={2}>{video.description}</Text>

                <View style={styles.tagsContainer}>
                  {video.tags?.slice(0, 3).map((tag, idx) => (
                    <Text key={idx} style={styles.tag}>#{tag}</Text>
                  ))}
                </View>
              </View>

              <View style={styles.rightSide}>
                <TouchableOpacity style={styles.avatarLarge} onPress={() => handleCreatorClick(video.creatorId)}>
                  {/* AMÉLIORATION : Gestion d'image d'avatar grand format */}
                  <View style={styles.avatarCircle}>
                    {video.creatorAvatar ? (
                         <Image source={{ uri: video.creatorAvatar }} style={styles.avatarImageLarge} />
                    ) : (
                        <Text style={styles.avatarText}>{video.creatorName.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  {!isFollowing && !isMyVideo && (
                    <View style={styles.plusIcon}>
                      <Ionicons name="add" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(video.id, video.creatorId)}>
                  <View style={[styles.actionIcon, isLiked && styles.actionIconActive]}>
                    <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color="#fff" />
                  </View>
                  <Text style={styles.actionCount}>{video.likes}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => handleComment(video.id, video.creatorId)}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="chatbubble-outline" size={28} color="#fff" />
                  </View>
                  <Text style={styles.actionCount}>{video.comments || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => handleFavorite(video.id, video.creatorId)}>
                  <View style={[styles.actionIcon, isFavorited && styles.actionIconActiveFavorite]}>
                    <Ionicons name={isFavorited ? "bookmark" : "bookmark-outline"} size={28} color="#fff" />
                  </View>
                  <Text style={styles.actionCount}>Sauver</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(video)}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="share-social-outline" size={28} color="#fff" />
                  </View>
                  <Text style={styles.actionCount}>Partager</Text>
                </TouchableOpacity>
              </View>

              {currentIndex > 0 && index === currentIndex && (
                <View style={styles.swipeUpIndicator}>
                  <Ionicons name="chevron-up" size={32} color="rgba(255,255,255,0.5)" />
                </View>
              )}
              {currentIndex < videos.length - 1 && index === currentIndex && (
                <View style={styles.swipeDownIndicator}>
                  <Ionicons name="chevron-down" size={32} color="rgba(255,255,255,0.5)" />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Modal Commentaires (Reste identique à Code A mais inclus pour complétude) */}
      <Modal visible={showComments} animationType="slide" transparent={false} onRequestClose={() => setShowComments(false)}>
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowComments(false); setReplyTo(null); setReplyText(''); }} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Commentaires</Text>
            <View style={styles.placeholder} />
          </View>
          <ScrollView style={styles.commentsList}>
            {loadingComments ? (
              <View style={styles.loadingCommentsContainer}><ActivityIndicator size="large" color="#7459F0" /></View>
            ) : comments.length === 0 ? (
              <View style={styles.emptyCommentsContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                <Text style={styles.emptyCommentsText}>Aucun commentaire</Text>
                <Text style={styles.emptyCommentsSubtext}>Soyez le premier à commenter !</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentContainer}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>{comment.userName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.commentContent}>
                      <View style={styles.commentTop}>
                        <Text style={styles.commentUserName}>{comment.userName}</Text>
                        <Text style={styles.commentTimestamp}>{formatDate(comment.createdAt)}</Text>
                      </View>
                      <Text style={styles.commentText}>{comment.text}</Text>
                      <View style={styles.commentActions}>
                        <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleLikeComment(comment.id)}>
                          <Ionicons name={comment.likedBy?.includes(auth.currentUser?.uid || '') ? "heart" : "heart-outline"} size={16} color={comment.likedBy?.includes(auth.currentUser?.uid || '') ? "#ef4444" : "#666"} />
                          {comment.likes > 0 && <Text style={styles.commentActionText}>{comment.likes}</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentActionBtn} onPress={() => setReplyTo(comment.id)}>
                          <Ionicons name="chatbubble-outline" size={16} color="#666" />
                          <Text style={styles.commentActionText}>Répondre</Text>
                        </TouchableOpacity>
                        {comment.userId === auth.currentUser?.uid && (
                          <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleDeleteComment(comment.id, comment.replies.length)}>
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                            <Text style={[styles.commentActionText, { color: '#ef4444' }]}>Supprimer</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                  {replyTo === comment.id && (
                    <View style={styles.replyInputContainer}>
                      <TextInput style={styles.replyInput} placeholder="Écrire une réponse..." value={replyText} onChangeText={setReplyText} multiline />
                      <View style={styles.replyButtons}>
                        <TouchableOpacity onPress={() => { setReplyTo(null); setReplyText(''); }} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Annuler</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleAddReply(comment.id)} style={styles.sendReplyButton}><Text style={styles.sendReplyButtonText}>Répondre</Text></TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {comment.replies && comment.replies.length > 0 && (
                    <View style={styles.repliesContainer}>
                      {comment.replies.map((reply) => (
                        <View key={reply.id} style={styles.replyItem}>
                          <View style={styles.replyHeader}>
                            <View style={styles.replyAvatar}>
                              <Text style={styles.replyAvatarText}>{reply.userName.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={styles.replyContent}>
                              <View style={styles.replyTop}>
                                <Text style={styles.replyUserName}>{reply.userName}</Text>
                                <Text style={styles.replyTimestamp}>{formatDate(reply.createdAt)}</Text>
                              </View>
                              <Text style={styles.replyText}>{reply.text}</Text>
                              <View style={styles.replyActions}>
                                <TouchableOpacity style={styles.replyLikeBtn} onPress={() => handleLikeReply(comment.id, reply.id)}>
                                  <Ionicons name={reply.likedBy?.includes(auth.currentUser?.uid || '') ? "heart" : "heart-outline"} size={14} color={reply.likedBy?.includes(auth.currentUser?.uid || '') ? "#ef4444" : "#666"} />
                                  {reply.likes > 0 && <Text style={styles.replyLikeText}>{reply.likes}</Text>}
                                </TouchableOpacity>
                                {reply.userId === auth.currentUser?.uid && (
                                  <TouchableOpacity style={styles.replyDeleteBtn} onPress={() => handleDeleteReply(comment.id, reply.id)}>
                                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.inputContainer}>
            <View style={styles.inputAvatar}>
              <Text style={styles.inputAvatarText}>{userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}</Text>
            </View>
            <TextInput style={styles.commentInput} placeholder="Ajouter un commentaire..." value={newComment} onChangeText={setNewComment} multiline maxLength={500} />
            <TouchableOpacity style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]} onPress={handleAddComment} disabled={!newComment.trim()}>
              <Ionicons name="send" size={24} color={newComment.trim() ? "#7459F0" : "#ccc"} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { color: '#fff', fontSize: 16, marginTop: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 32 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  progressIndicator: { position: 'absolute', top: 48, left: 0, right: 0, zIndex: 50, alignItems: 'center' },
  progressText: { color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  scrollView: { flex: 1 },
  scrollViewContent: { flexGrow: 1 },
  videoContainer: { height: SCREEN_HEIGHT, width: SCREEN_WIDTH, position: 'relative', overflow: 'visible' },
  videoWrapper: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  playPauseIcon: { position: 'absolute', top: '50%', left: '50%', marginTop: -40, marginLeft: -40, zIndex: 10 },
  progressBarContainer: { position: 'absolute', bottom: 80, left: 0, right: 0, paddingHorizontal: 16, zIndex: 40 },
  progressBarBackground: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#7459F0', borderRadius: 1 },
  gradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', zIndex: 10, pointerEvents: 'none' },
  leftSide: { position: 'absolute', bottom: 100, left: 16, right: 80, zIndex: 30 },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  creatorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#7459F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  creatorInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  creatorDetails: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  creatorName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  followButton: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  followButtonActive: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: '#fff' },
  followButtonText: { color: '#000', fontSize: 14, fontWeight: '600' },
  followButtonTextActive: { color: '#fff' },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  description: { color: '#fff', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  tagsContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { color: '#7459F0', fontSize: 14, fontWeight: '600' },
  rightSide: { position: 'absolute', bottom: 120, right: 8, gap: 18, alignItems: 'center', zIndex: 50 },
  avatarLarge: { marginBottom: 8, position: 'relative' },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#7459F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  avatarImageLarge: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  plusIcon: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 24, height: 24, borderRadius: 12, backgroundColor: '#7459F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  actionButton: { alignItems: 'center', gap: 4 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  actionIconActive: { backgroundColor: '#ef4444' },
  actionIconActiveFavorite: { backgroundColor: '#FBA31A' },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '600' },
  swipeUpIndicator: { position: 'absolute', top: 80, alignSelf: 'center', zIndex: 20 },
  swipeDownIndicator: { position: 'absolute', bottom: 150, alignSelf: 'center', zIndex: 20 },
  // Styles pour le modal des commentaires
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', backgroundColor: '#fff' },
  backButton: { padding: 8 },
  modalHeaderTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  placeholder: { width: 40 },
  commentsList: { flex: 1 },
  loadingCommentsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 },
  emptyCommentsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 },
  emptyCommentsText: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 16 },
  emptyCommentsSubtext: { fontSize: 14, color: '#999', marginTop: 8 },
  commentContainer: { paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  commentHeader: { flexDirection: 'row', gap: 12 },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7459F0', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  commentContent: { flex: 1 },
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  commentUserName: { fontSize: 14, fontWeight: '600', color: '#000' },
  commentTimestamp: { fontSize: 12, color: '#999' },
  commentText: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 8 },
  commentActions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  commentActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentActionText: { fontSize: 12, color: '#666', fontWeight: '500' },
  repliesContainer: { marginTop: 12, marginLeft: 52, gap: 12 },
  replyItem: { paddingVertical: 8 },
  replyHeader: { flexDirection: 'row', gap: 8 },
  replyAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#7459F0', justifyContent: 'center', alignItems: 'center' },
  replyAvatarText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  replyContent: { flex: 1 },
  replyTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  replyUserName: { fontSize: 13, fontWeight: '600', color: '#000' },
  replyTimestamp: { fontSize: 11, color: '#999' },
  replyText: { fontSize: 13, color: '#333', lineHeight: 18, marginBottom: 6 },
  replyActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  replyLikeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyLikeText: { fontSize: 11, color: '#666' },
  replyDeleteBtn: { padding: 4 },
  replyInputContainer: { marginTop: 12, marginLeft: 52, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8 },
  replyInput: { fontSize: 14, color: '#000', minHeight: 40, maxHeight: 100 },
  replyButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  cancelButtonText: { fontSize: 14, color: '#666', fontWeight: '500' },
  sendReplyButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: '#7459F0' },
  sendReplyButtonText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e5e5e5', backgroundColor: '#fff', gap: 12 },
  inputAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7459F0', justifyContent: 'center', alignItems: 'center' },
  inputAvatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  commentInput: { flex: 1, fontSize: 14, color: '#000', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f5f5f5', borderRadius: 20, maxHeight: 100 },
  sendButton: { padding: 8 },
  sendButtonDisabled: { opacity: 0.5 },
});