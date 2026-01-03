import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, useWindowDimensions, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, TouchableWithoutFeedback, StatusBar, Share, Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { 
  collection, getDocs, query, orderBy, limit, doc, updateDoc, 
  increment, arrayUnion, arrayRemove, getDoc, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
// Import du composant commentaire
import CommentModal from '../../components/CommentModal';

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

interface UserProfile {
  uid: string;
  favorites?: string[];    
  likedVideos?: string[];  
  watchHistory?: string[]; 
  following?: string[];    
  interests?: string[];
}

export default function HomeScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedVideosSet, setLikedVideosSet] = useState<Set<string>>(new Set());
  const [savedVideosSet, setSavedVideosSet] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Gestion Commentaires
  const [showComments, setShowComments] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const videoRefs = useRef<Record<string, Video | null>>({});

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setLikedVideosSet(new Set(data.likedVideos || []));
            setSavedVideosSet(new Set(data.favorites || []));
            setUserProfile({
              uid: user.uid,
              favorites: data.favorites || [],
              likedVideos: data.likedVideos || [],
              watchHistory: data.watchHistory || [],
              following: data.following || [],
              interests: data.interests || [],
            });
          }
        } catch (error) { console.error('Erreur profil:', error); }
      };
      fetchUserData();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      setIsPlaying(true);
      const timer = setTimeout(async () => {
        const currentVideo = videoRefs.current[videos[currentIndex]?.id];
        if (currentVideo) try { await currentVideo.playAsync(); } catch (e) {}
      }, 100);
      return () => {
        clearTimeout(timer);
        Object.values(videoRefs.current).forEach(async (v) => {
          if (v) try { await v.pauseAsync(); } catch (e) {}
        });
        setIsPlaying(false);
      };
    }, [videos, currentIndex])
  );

  useEffect(() => { loadVideos(); }, []);

  const loadVideos = async () => {
    try {
      const videosQuery = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(videosQuery);
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

  const handleCreatorClick = (creatorId: string) => { router.push(`/profile/${creatorId}` as any); };
  
  // Ouverture du modal commentaire
  const handleComment = (videoId: string) => { 
      setSelectedVideoId(videoId);
      setShowComments(true);
  };
  
  const handleShare = async () => { try { await Share.share({ message: 'Regarde cette vidéo sur SwipeSkills !' }); } catch (e) {} };

  const handleFollow = async (creatorId: string, creatorName: string) => {
    try {
      const user = auth.currentUser;
      if (!user || !userProfile) return;
      const isFollowing = userProfile.following?.includes(creatorId) ?? false;
      const userRef = doc(db, 'users', user.uid);
      if (isFollowing) {
        await updateDoc(userRef, { following: arrayRemove(creatorId) });
        Alert.alert('Info', `Vous ne suivez plus ${creatorName}`);
        setUserProfile(prev => prev ? { ...prev, following: (prev.following || []).filter(id => id !== creatorId) } : null);
      } else {
        await updateDoc(userRef, { following: arrayUnion(creatorId) });
        Alert.alert('Succès', `Vous suivez maintenant ${creatorName}`);
        setUserProfile(prev => prev ? { ...prev, following: [...(prev.following || []), creatorId] } : null);
        await addDoc(collection(db, 'notifications'), { userId: creatorId, fromUserId: user.uid, type: 'follow', read: false, createdAt: serverTimestamp() });
      }
    } catch (error) { console.error('Error follow:', error); }
  };

  const handleMarkVideoAsWatched = async (video: VideoData) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await updateDoc(doc(db, 'users', user.uid), { watchHistory: arrayUnion(video.id), 'stats.videosWatched': increment(1), lastWatchedAt: serverTimestamp() });
      await updateDoc(doc(db, 'videos', video.id), { views: increment(1) });
    } catch (error) {}
  };

  const handleLike = async (videoId: string, creatorId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const isLiked = likedVideosSet.has(videoId);
      const userRef = doc(db, 'users', user.uid);
      const videoRef = doc(db, 'videos', videoId);
      if (isLiked) {
        setLikedVideosSet(prev => { const s = new Set(prev); s.delete(videoId); return s; });
        await updateDoc(userRef, { likedVideos: arrayRemove(videoId) });
        await updateDoc(videoRef, { likes: increment(-1) });
      } else {
        setLikedVideosSet(prev => new Set([...prev, videoId]));
        await updateDoc(userRef, { likedVideos: arrayUnion(videoId) });
        await updateDoc(videoRef, { likes: increment(1) });
      }
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes: isLiked ? v.likes - 1 : v.likes + 1 } : v));
    } catch (error) { console.error('Error like:', error); }
  };

  const handleFavorite = async (videoId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const isSaved = savedVideosSet.has(videoId);
      const userRef = doc(db, 'users', user.uid);
      if (isSaved) {
        setSavedVideosSet(prev => { const s = new Set(prev); s.delete(videoId); return s; });
        await updateDoc(userRef, { favorites: arrayRemove(videoId) });
        Alert.alert('Info', 'Retiré des favoris');
      } else {
        setSavedVideosSet(prev => new Set([...prev, videoId]));
        await updateDoc(userRef, { favorites: arrayUnion(videoId) });
        Alert.alert('Succès', 'Ajouté aux favoris !');
      }
    } catch (error) { console.error('Error favorite:', error); }
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
          const isFollowing = userProfile?.following?.includes(video.creatorId) ?? false;
          
          return (
            <View key={video.id} style={[styles.videoContainer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
              <Video
                ref={(ref) => { if (ref) videoRefs.current[video.id] = ref; }}
                source={{ uri: video.videoUrl }}
                resizeMode={ResizeMode.COVER}
                shouldPlay={index === currentIndex && isPlaying}
                isLooping
                style={StyleSheet.absoluteFillObject}
                onPlaybackStatusUpdate={index === currentIndex ? handlePlaybackStatusUpdate : undefined}
                useNativeControls={false}
              />
              <TouchableWithoutFeedback onPress={togglePlayPause}>
                <View style={styles.touchableOverlay}>
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
                  <View style={styles.creatorDetails}>
                    <Text style={styles.creatorName}>@{video.creatorName}</Text>
                    {/* Bouton Suivre (Seulement si pas déjà abonné, car si abonné on a le V à droite) */}
                    {!isFollowing && (
                        <TouchableOpacity 
                            style={styles.followButton}
                            onPress={() => handleFollow(video.creatorId, video.creatorName)}
                        >
                        <Text style={styles.followButtonText}>Suivre</Text>
                        </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>{video.title}</Text>
                <Text style={styles.description} numberOfLines={2}>{video.description}</Text>
              </View>

              {/* DROITE : ACTIONS */}
              <View style={styles.rightSide}>
                <TouchableOpacity style={styles.avatarLarge} onPress={() => handleCreatorClick(video.creatorId)}>
                  <View style={styles.avatarCircle}>
                    {video.creatorAvatar ? (
                        <Image source={{ uri: video.creatorAvatar }} style={styles.avatarLargeImage} />
                    ) : (
                        <Text style={styles.avatarText}>{video.creatorName.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  
                  {/* LOGIQUE DU CHECK (V) */}
                  {isFollowing ? (
                    <View style={[styles.plusIcon, {backgroundColor:'#10B981'}]}>
                        <Ionicons name="checkmark" size={12} color="white" />
                    </View>
                  ) : (
                    <View style={styles.plusIcon}><Ionicons name="add" size={16} color="white" /></View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(video.id, video.creatorId)}>
                  <View style={[styles.actionIcon, isLiked && styles.actionIconActive]}>
                    <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color="#fff" />
                  </View>
                  <Text style={styles.actionCount}>{video.likes}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => handleComment(video.id)}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="chatbubble-outline" size={28} color="#fff" />
                  </View>
                  <Text style={styles.actionCount}>{video.comments || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => handleFavorite(video.id)}>
                  <View style={[styles.actionIcon, isSaved && styles.actionIconActiveFavorite]}>
                    <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={28} color="#fff" />
                  </View>
                  <Text style={styles.actionCount}>{isSaved ? 'Enregistré' : 'Sauver'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="share-social-outline" size={28} color="#fff" />
                  </View>
                  <Text style={styles.actionCount}>Partager</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

     {/* MODAL COMMENTAIRES DANS HOME APPRENANT */}
      {selectedVideoId && (
        <CommentModal 
            visible={showComments} 
            videoId={selectedVideoId} 
            // On récupère le créateur et le titre depuis la liste des vidéos
            creatorId={videos.find(v => v.id === selectedVideoId)?.creatorId || ''}
            videoTitle={videos.find(v => v.id === selectedVideoId)?.title || 'Vidéo'}
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
  videoContainer: { width: '100%', height: '100%', backgroundColor: '#000', position: 'relative', overflow: 'hidden' },
  touchableOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  playPauseIcon: { zIndex: 10 },
  progressBarContainer: { position: 'absolute', bottom: 80, left: 0, right: 0, paddingHorizontal: 16, zIndex: 40 },
  progressBarBackground: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#9333ea', borderRadius: 1 },
  gradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', zIndex: 10 },
  
  leftSide: { position: 'absolute', bottom: 100, left: 16, right: 80, zIndex: 30 },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  creatorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow:'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  creatorInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  creatorDetails: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  creatorName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  followButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  followButtonActive: { backgroundColor: 'rgba(255,255,255,0)', borderWidth: 1, borderColor: '#fff' },
  followButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  followButtonTextActive: { color: '#ddd' },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  description: { color: '#fff', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  
  rightSide: { position: 'absolute', bottom: 100, right: 16, gap: 24, alignItems: 'center', zIndex: 30 },
  avatarLarge: { marginBottom: 8, position: 'relative' },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  avatarLargeImage: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  
  // Style de base pour l'icône +
  plusIcon: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 24, height: 24, borderRadius: 12, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  
  actionButton: { alignItems: 'center', gap: 4 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  actionIconActive: { backgroundColor: '#ef4444' },
  actionIconActiveFavorite: { backgroundColor: '#FBA31A' },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '600' },
});