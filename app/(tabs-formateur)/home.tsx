import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Dimensions, useWindowDimensions, ScrollView, 
  TouchableOpacity, Alert, ActivityIndicator, TouchableWithoutFeedback, 
  Modal, TextInput, KeyboardAvoidingView, Platform, Share 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { 
  collection, getDocs, query, orderBy, limit, doc, getDoc, 
  where, updateDoc, increment, arrayUnion, arrayRemove, addDoc, serverTimestamp, deleteDoc 
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoData {
  id: string;
  title: string;
  description: string;
  category: string;
  creatorId: string;
  creatorName: string;
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
  prenom: string;
  nom: string;
  displayName: string;
}

// Interface simplifiée pour l'affichage (pas de logique commentaires complexe ici)
interface Comment {
  id: string;
  text: string;
  userName: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { width: dynamicWidth, height: dynamicHeight } = useWindowDimensions();
  
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const videoRefs = useRef<Record<string, Video | null>>({});

  // 1. RECHARGEMENT DES DONNÉES À CHAQUE VUE (Focus)
  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
      loadVideos();
    }, [])
  );

  // 2. GESTION LECTURE AUTO
  useFocusEffect(
    useCallback(() => {
      setIsPlaying(true);
      const timer = setTimeout(async () => {
        const currentVideo = videoRefs.current[videos[currentIndex]?.id];
        if (currentVideo) {
          try { await currentVideo.playAsync(); } catch (e) { console.log('Play error', e); }
        }
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

  // Pause au scroll
  useEffect(() => {
    const pauseOtherVideos = async () => {
      Object.keys(videoRefs.current).forEach(async (videoId, index) => {
        if (index !== currentIndex && videoRefs.current[videoId]) {
          try { await videoRefs.current[videoId]?.pauseAsync(); } catch (e) {}
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
        const prenom = data.prenom || '';
        const nom = data.nom || '';
        const displayName = (prenom + ' ' + nom).trim() || data.displayName || 'Utilisateur';

        setUserProfile({
          uid: user.uid,
          prenom,
          nom,
          displayName
        });
      }
    } catch (error) { console.error('Erreur loading user:', error); }
  };

  const loadVideos = async () => {
    try {
      // Chargement du fil d'actualité global
      const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VideoData[];
      
      setVideos(videosData);
      setLoading(false);
    } catch (error) {
      console.error('Erreur loading videos:', error);
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

  const handleMarkVideoAsWatched = async (video: VideoData) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      // Incrémenter vue seulement
      await updateDoc(doc(db, 'videos', video.id), {
        views: increment(1)
      });
    } catch (error) { console.log("Erreur vue", error); }
  };

  // --- CORRECTION NAVIGATION PROFIL ---
  const handleCreatorClick = (creatorId: string) => {
    const user = auth.currentUser;
    // Si c'est MOI (l'utilisateur connecté)
    if (user && creatorId === user.uid) {
        // Redirection vers MON onglet Profil
        router.push('/(tabs-formateur)/profile');
    } else {
        // Si c'est quelqu'un d'autre -> Alerte (car page public non créée)
        Alert.alert("Profil", "Ceci est le profil d'un autre formateur.");
    }
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
      <View style={styles.progressIndicator}>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {videos.length}
        </Text>
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
          // --- PATCH D'AFFICHAGE DU NOM ---
          // Si l'ID créateur est le mien, j'affiche mon nom actuel du profil local
          // Sinon, j'affiche le nom enregistré dans la vidéo (ou "Utilisateur")
          const isMyVideo = video.creatorId === auth.currentUser?.uid;
          const displayCreatorName = isMyVideo && userProfile 
            ? userProfile.displayName 
            : (video.creatorName || "Utilisateur");

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

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gradientOverlay}
              />

              {index === currentIndex && (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                  </View>
                </View>
              )}

              {/* INFORMATIONS CRÉATEUR (GAUCHE) */}
              <View style={styles.leftSide}>
                <TouchableOpacity 
                  style={styles.creatorInfo}
                  onPress={() => handleCreatorClick(video.creatorId)}
                >
                  <View style={styles.creatorAvatar}>
                    <Text style={styles.creatorInitial}>
                      {displayCreatorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.creatorDetails}>
                    <Text style={styles.creatorName}>@{displayCreatorName}</Text>
                    {/* Pas de bouton Suivre sur l'interface Formateur pour simplifier la vue */}
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

              {/* ACTIONS (DROITE) - SIMPLIFIÉES POUR FORMATEUR (Juste Vue) */}
              <View style={styles.rightSide}>
                <TouchableOpacity 
                  style={styles.avatarLarge}
                  onPress={() => handleCreatorClick(video.creatorId)}
                >
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {displayCreatorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Pas de Like/Comment/Save interactifs pour le formateur, juste affichage des stats si besoin */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { color: '#fff', fontSize: 16, marginTop: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 32 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: '#a1a1aa', fontSize: 14, textAlign: 'center' },
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
  creatorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#7459F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  creatorInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  creatorDetails: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  creatorName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  description: { color: '#fff', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  tagsContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { color: '#7459F0', fontSize: 14, fontWeight: '600' },
  rightSide: { position: 'absolute', bottom: 120, right: 8, gap: 18, alignItems: 'center', zIndex: 50 },
  avatarLarge: { marginBottom: 8, position: 'relative' },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#7459F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  plusIcon: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 24, height: 24, borderRadius: 12, backgroundColor: '#7459F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  swipeUpIndicator: { position: 'absolute', top: 80, alignSelf: 'center', zIndex: 20 },
  swipeDownIndicator: { position: 'absolute', bottom: 150, alignSelf: 'center', zIndex: 20 },
});