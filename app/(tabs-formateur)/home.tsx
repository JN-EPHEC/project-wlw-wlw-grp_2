import React, { useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar, 
  Image, 
  NativeSyntheticEvent, 
  NativeScrollEvent 
} from 'react-native';

// --- External Libraries ---
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

// --- Firebase ---
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

// --- Components ---
import CommentModal from '../../components/CommentModal';

// --- Constants & Types ---
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoData {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string | null;
  videoUrl: string;
  likes: number;
  comments: number;
  createdAt: any; // Idéalement, utilisez Timestamp de firebase
}

export default function FormateurHomeScreen() {
  // --- Hooks & State ---
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // États pour les interactions
  const [showComments, setShowComments] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);

  const videoRefs = useRef<Record<string, Video | null>>({});

  // --- Effects ---
  useFocusEffect(
    useCallback(() => {
      loadVideos();
      // On peut ajouter une logique ici pour mettre en pause si on quitte l'écran
      return () => setIsPlaying(false); 
    }, [])
  );

  // --- Functions ---
  const loadVideos = async () => {
    try {
      const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      const rawVideos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VideoData[];

      // Enrichissement des données avec les infos utilisateur
      const enrichedVideos = await Promise.all(
        rawVideos.map(async (video) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', video.creatorId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                ...video,
                creatorName: `${userData.prenom || ''} ${userData.nom || ''}`.trim(),
                creatorAvatar: userData.photoURL || null
              };
            }
            return video;
          } catch (e) {
            console.error("Erreur récupération user", e);
            return video;
          }
        })
      );

      setVideos(enrichedVideos);
    } catch (error) {
      console.error("Erreur chargement vidéos", error);
    } finally {
      setLoading(false);
      setIsPlaying(true);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
    if (index !== currentIndex && index >= 0 && index < videos.length) {
      setCurrentIndex(index);
      setIsPlaying(true);
    }
  };

  const handleCreatorClick = (creatorId: string) => {
    if (creatorId === currentUserId) {
      router.push('/(tabs-formateur)/profile');
    } else {
      router.push(`/profile/${creatorId}` as any);
    }
  };

  const handleOpenComments = (video: VideoData) => {
    setSelectedVideo(video);
    setShowComments(true);
  };

  // --- Render ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        style={{ flex: 1 }}
      >
        {videos.map((video, index) => {
          const isMyVideo = video.creatorId === currentUserId;
          const isActive = index === currentIndex && isPlaying;

          return (
            <View key={video.id} style={styles.videoContainer}>
              {/* VIDEO PLAYER */}
              <Video
                ref={(ref) => { if (ref) videoRefs.current[video.id] = ref; }}
                source={{ uri: video.videoUrl }}
                resizeMode={ResizeMode.COVER}
                shouldPlay={isActive}
                isLooping
                style={StyleSheet.absoluteFillObject}
              />

              {/* GRADIENT OVERLAY */}
              <LinearGradient 
                colors={['transparent', 'rgba(0,0,0,0.8)']} 
                style={styles.gradientOverlay} 
              />
              
              {/* SECTION GAUCHE : INFOS VIDÉO */}
              <View style={styles.leftSide}>
                <TouchableOpacity 
                  style={styles.creatorInfo} 
                  onPress={() => handleCreatorClick(video.creatorId)}
                >
                  <View style={styles.creatorAvatar}>
                    {video.creatorAvatar ? (
                      <Image 
                        source={{ uri: video.creatorAvatar }} 
                        style={styles.fullSizeImage} 
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {video.creatorName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.creatorName}>
                    @{video.creatorName} {isMyVideo && "(Moi)"}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.title}>{video.title}</Text>
                <Text style={styles.description} numberOfLines={2}>
                  {video.description}
                </Text>
              </View>

              {/* SECTION DROITE : ACTIONS */}
              <View style={styles.rightSide}>
                
                {/* Avatar Createur (Lien Profil) */}
                <TouchableOpacity 
                  onPress={() => handleCreatorClick(video.creatorId)} 
                  style={styles.avatarLarge}
                >
                  <View style={styles.avatarLargeCircle}>
                    {video.creatorAvatar ? (
                      <Image 
                        source={{ uri: video.creatorAvatar }} 
                        style={styles.fullSizeImage} 
                      />
                    ) : (
                      <Text style={styles.avatarTextLarge}>
                        {video.creatorName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Actions conditionnelles (Seulement si c'est ma vidéo) */}
                {isMyVideo && (
                  <>
                    <View style={styles.actionBtn}>
                      <Ionicons name="heart" size={35} color="white" />
                      <Text style={styles.actionText}>{video.likes}</Text>
                    </View>

                    <TouchableOpacity 
                      style={styles.actionBtn} 
                      onPress={() => handleOpenComments(video)}
                    >
                      <Ionicons name="chatbubble-ellipses" size={35} color="white" />
                      <Text style={styles.actionText}>{video.comments || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.actionBtn} 
                      onPress={() => router.push('/(tabs-formateur)/profile')}
                    >
                      <Ionicons name="ellipsis-horizontal-circle" size={40} color="white" />
                      <Text style={styles.actionText}>Gérer</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL COMMENTAIRES */}
      {selectedVideo && (
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

// --- Styles ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#000' 
  },
  videoContainer: {
    width: SCREEN_WIDTH, 
    height: SCREEN_HEIGHT,
    backgroundColor: '#000'
  },
  gradientOverlay: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: '40%', 
    zIndex: 10 
  },
  
  // Left Side (Infos)
  leftSide: { 
    position: 'absolute', 
    bottom: 100, 
    left: 16, 
    right: 80, 
    zIndex: 30 
  },
  creatorInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  creatorAvatar: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#9333ea', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#fff', 
    overflow: 'hidden' 
  },
  avatarText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  creatorName: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1
  },
  title: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 4 
  },
  description: { 
    color: '#ddd', 
    fontSize: 14,
    lineHeight: 20
  },

  // Right Side (Actions)
  rightSide: { 
    position: 'absolute', 
    bottom: 100, 
    right: 10, 
    zIndex: 30, 
    alignItems: 'center', 
    gap: 20 
  },
  avatarLarge: { 
    marginBottom: 10 
  },
  avatarLargeCircle: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#9333ea', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#fff', 
    overflow: 'hidden' 
  },
  avatarTextLarge: {
    color: 'white', 
    fontWeight: 'bold',
    fontSize: 18
  },
  actionBtn: { 
    alignItems: 'center' 
  },
  actionText: { 
    color: 'white', 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginTop: 4 
  },
  fullSizeImage: {
    width: '100%', 
    height: '100%'
  }
});