import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Dimensions, useWindowDimensions, ScrollView, 
  TouchableOpacity, ActivityIndicator, TouchableWithoutFeedback, 
  StatusBar, Alert, Image, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { 
  collection, getDocs, query, orderBy, limit, doc, getDoc, updateDoc, 
  increment, arrayUnion, arrayRemove, serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

// Import du modal commentaire (Assurez-vous que le chemin est correct)
import CommentModal from '../../components/CommentModal';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoData {
  id: string;
  title: string;
  description: string;
  category: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  videoUrl: string;
  likes: number;
  views: number;
  comments: number;
  tags: string[];
  duration: number;
  createdAt: any;
}

export default function FormateurHomeScreen() {
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;
  
  // --- STATES ---
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Player
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Interactions Utilisateur
  const [likedVideosSet, setLikedVideosSet] = useState<Set<string>>(new Set());
  const [savedVideosSet, setSavedVideosSet] = useState<Set<string>>(new Set());
  
  // Modal Commentaires
  const [showComments, setShowComments] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const videoRefs = useRef<Record<string, Video | null>>({});

  // 1. CHARGEMENT DONNÉES UTILISATEUR (Likes/Favoris)
  useFocusEffect(
    useCallback(() => {
        const fetchUserData = async () => {
            if (!currentUserId) return;
            try {
                const userDoc = await getDoc(doc(db, 'users', currentUserId));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setLikedVideosSet(new Set(data.likedVideos || []));
                    setSavedVideosSet(new Set(data.favorites || []));
                }
            } catch (error) { console.error('Erreur user data:', error); }
        };
        fetchUserData();
    }, [currentUserId])
  );

  // 2. CHARGEMENT VIDÉOS
  useFocusEffect(
    useCallback(() => {
      loadVideos();
    }, [])
  );

  // 3. LECTURE AUTO (Focus/Blur)
  useFocusEffect(
    useCallback(() => {
      setIsPlaying(true);
      const timer = setTimeout(async () => {
        const currentVideo = videoRefs.current[videos[currentIndex]?.id];
        if (currentVideo) try { await currentVideo.playAsync(); } catch (e) {}
      }, 100);
      return () => {
        clearTimeout(timer);
        Object.values(videoRefs.current).forEach(async (video) => {
          if (video) try { await video.pauseAsync(); } catch (e) {}
        });
        setIsPlaying(false);
      };
    }, [videos, currentIndex])
  );

  const loadVideos = async () => {
    try {
      const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      const rawVideos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VideoData[];
      
      const enrichedVideos = await Promise.all(rawVideos.map(async (video) => {
          try {
              const userDoc = await getDoc(doc(db, 'users', video.creatorId));
              if (userDoc.exists()) {
                  const userData = userDoc.data();
                  return {
                      ...video,
                      creatorName: `${userData.prenom || ''} ${userData.nom || ''}`.trim() || video.creatorName,
                      creatorAvatar: userData.photoURL || null
                  };
              }
              return video;
          } catch (e) { return video; }
      }));
      setVideos(enrichedVideos);
      setLoading(false);
    } catch (error) { setLoading(false); }
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
      if (isPlaying) { await currentVideo.pauseAsync(); setIsPlaying(false); }
      else { await currentVideo.playAsync(); setIsPlaying(true); }
    }
  };

  // --- ACTIONS SOCIALES ---

  const handleCreatorClick = (creatorId: string) => {
    if (creatorId === currentUserId) {
        router.push('/(tabs-formateur)/profile');
    } else {
        // Redirection vers profil public (si implémenté pour formateur, sinon peut-être adapter)
        router.push(`/profile/${creatorId}` as any);
    }
  };

  const handleLike = async (videoId: string) => {
    if (!currentUserId) return;
    const isLiked = likedVideosSet.has(videoId);
    const videoRef = doc(db, 'videos', videoId);
    const userRef = doc(db, 'users', currentUserId);

    // Optimistic Update
    const newSet = new Set(likedVideosSet);
    if (isLiked) newSet.delete(videoId);
    else newSet.add(videoId);
    setLikedVideosSet(newSet);

    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes: isLiked ? v.likes - 1 : v.likes + 1 } : v));

    try {
        if (isLiked) {
            await updateDoc(videoRef, { likes: increment(-1) });
            await updateDoc(userRef, { likedVideos: arrayRemove(videoId) });
        } else {
            await updateDoc(videoRef, { likes: increment(1) });
            await updateDoc(userRef, { likedVideos: arrayUnion(videoId) });
        }
    } catch (e) { console.error(e); }
  };

  const handleSave = async (videoId: string) => {
    if (!currentUserId) return;
    const isSaved = savedVideosSet.has(videoId);
    const userRef = doc(db, 'users', currentUserId);

    const newSet = new Set(savedVideosSet);
    if (isSaved) {
        newSet.delete(videoId);
        Alert.alert('Info', 'Retiré des favoris');
    } else {
        newSet.add(videoId);
        Alert.alert('Succès', 'Ajouté aux favoris');
    }
    setSavedVideosSet(newSet);

    try {
        if (isSaved) {
            await updateDoc(userRef, { favorites: arrayRemove(videoId) });
        } else {
            await updateDoc(userRef, { favorites: arrayUnion(videoId) });
        }
    } catch (e) { console.error(e); }
  };

  const handleComment = (videoId: string) => {
      setSelectedVideoId(videoId);
      setShowComments(true);
  };

  const handleShare = async () => {
      try {
          await Share.share({ message: 'Regarde cette vidéo sur SwipeSkills !' });
      } catch (e) {}
  };

  const handleMarkVideoAsWatched = async (video: VideoData) => {
      if (!currentUserId) return;
      try {
          await updateDoc(doc(db, 'users', currentUserId), { 
              watchHistory: arrayUnion(video.id),
              lastWatchedAt: serverTimestamp()
          });
          await updateDoc(doc(db, 'videos', video.id), { views: increment(1) });
      } catch (e) {}
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#9333ea" /></View>;
  
  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        ref={scrollViewRef} pagingEnabled showsVerticalScrollIndicator={false}
        onScroll={handleScroll} scrollEventThrottle={16} snapToInterval={SCREEN_HEIGHT} decelerationRate="fast"
        style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}
      >
        {videos.map((video, index) => {
            const isLiked = likedVideosSet.has(video.id);
            const isSaved = savedVideosSet.has(video.id);

            return (
            <View key={video.id} style={styles.videoContainer}>
              <TouchableWithoutFeedback onPress={togglePlayPause}>
                <View style={styles.videoWrapper}>
                  <Video
                    ref={(ref) => { if (ref) videoRefs.current[video.id] = ref; }}
                    source={{ uri: video.videoUrl }}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={index === currentIndex && isPlaying}
                    isLooping
                    style={StyleSheet.absoluteFillObject}
                    useNativeControls={false}
                    onPlaybackStatusUpdate={index === currentIndex ? handlePlaybackStatusUpdate : undefined}
                  />
                  {!isPlaying && index === currentIndex && (
                    <View style={styles.playPauseIcon}><Ionicons name="play" size={80} color="rgba(255,255,255,0.8)" /></View>
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

              {/* GAUCHE : INFOS */}
              <View style={styles.leftSide}>
                <TouchableOpacity style={styles.creatorInfo} onPress={() => handleCreatorClick(video.creatorId)}>
                  <View style={styles.creatorAvatar}>
                    {video.creatorAvatar ? (
                        <Image source={{ uri: video.creatorAvatar }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.creatorInitial}>{video.creatorName.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <Text style={styles.creatorName}>@{video.creatorName}</Text>
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>{video.title}</Text>
                <Text style={styles.description} numberOfLines={2}>{video.description}</Text>
              </View>

              {/* DROITE : INTERACTIONS (Ajouté) */}
              <View style={styles.rightSide}>
                
                {/* Avatar Profil */}
                <TouchableOpacity style={styles.avatarLarge} onPress={() => handleCreatorClick(video.creatorId)}>
                  <View style={styles.avatarCircle}>
                    {video.creatorAvatar ? (
                        <Image source={{ uri: video.creatorAvatar }} style={styles.avatarLargeImage} />
                    ) : (
                        <Text style={styles.avatarText}>{video.creatorName.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.plusIcon}>
                      <Ionicons name="add" size={12} color="white" />
                  </View>
                </TouchableOpacity>

                {/* Like */}
                <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(video.id)}>
                    <Ionicons name="heart" size={35} color={isLiked ? "#EF4444" : "white"} />
                    <Text style={styles.actionCount}>{video.likes}</Text>
                </TouchableOpacity>

                {/* Commentaire */}
                <TouchableOpacity style={styles.actionButton} onPress={() => handleComment(video.id)}>
                    <Ionicons name="chatbubble-ellipses" size={35} color="white" />
                    <Text style={styles.actionCount}>{video.comments || 0}</Text>
                </TouchableOpacity>

                {/* Enregistrer */}
                <TouchableOpacity style={styles.actionButton} onPress={() => handleSave(video.id)}>
                    <Ionicons name="bookmark" size={35} color={isSaved ? "#F59E0B" : "white"} />
                    <Text style={styles.actionCount}>{isSaved ? 'Sauvé' : 'Sauver'}</Text>
                </TouchableOpacity>

                {/* Partager */}
                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                    <Ionicons name="share-social" size={35} color="white" />
                    <Text style={styles.actionCount}>Partager</Text>
                </TouchableOpacity>

              </View>
            </View>
        );
      })}
      </ScrollView>

      {/* MODAL COMMENTAIRES */}
      {selectedVideoId && (
        <CommentModal 
            visible={showComments} 
            videoId={selectedVideoId} 
            onClose={() => setShowComments(false)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  scrollView: { flex: 1 },
  scrollViewContent: { flexGrow: 1 },
  videoContainer: { height: SCREEN_HEIGHT, width: SCREEN_WIDTH, position: 'relative', overflow: 'hidden' }, // overflow hidden important
  videoWrapper: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  playPauseIcon: { position: 'absolute', top: '50%', left: '50%', marginTop: -40, marginLeft: -40, zIndex: 10 },
  gradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', zIndex: 10, pointerEvents: 'none' },
  
  progressBarContainer: { position: 'absolute', bottom: 85, left: 0, right: 0, zIndex: 40 }, // Ajusté pour TabBar formateur
  progressBarBackground: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', width: '100%' },
  progressBarFill: { height: '100%', backgroundColor: '#9333ea' },
  
  // GAUCHE
  leftSide: { position: 'absolute', bottom: 100, left: 16, width: '70%', zIndex: 30 },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  creatorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff', overflow:'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  creatorInitial: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  creatorName: { color: '#fff', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 6, lineHeight: 20 },
  description: { color: '#e5e5e5', fontSize: 13, marginBottom: 8, lineHeight: 18 },
  
  // DROITE (SIDEBAR)
  rightSide: { position: 'absolute', bottom: 110, right: 10, gap: 20, alignItems: 'center', zIndex: 50 },
  
  avatarLarge: { marginBottom: 10, alignItems: 'center' },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  avatarLargeImage: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  plusIcon: { position: 'absolute', bottom: -8, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  actionButton: { alignItems: 'center' },
  actionCount: { color: 'white', fontSize: 12, fontWeight: '600', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
}); 