import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Dimensions, useWindowDimensions, ScrollView, 
  TouchableOpacity, ActivityIndicator, TouchableWithoutFeedback, 
  StatusBar, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { 
  collection, getDocs, query, orderBy, limit, doc, getDoc 
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
  const { width: dynamicWidth, height: dynamicHeight } = useWindowDimensions();
  const currentUserId = auth.currentUser?.uid;
  
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const videoRefs = useRef<Record<string, Video | null>>({});

  // CHARGEMENT
  useFocusEffect(
    useCallback(() => {
      loadVideos();
    }, [])
  );

  // LECTURE AUTO
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

  const handleCreatorClick = (creatorId: string) => {
    if (creatorId === currentUserId) {
        router.push('/(tabs-formateur)/profile');
    } else {
        router.push(`/profile/${creatorId}` as any);
    }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#7459F0" /></View>;
  
  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef} pagingEnabled showsVerticalScrollIndicator={false}
        onScroll={handleScroll} scrollEventThrottle={16} snapToInterval={SCREEN_HEIGHT} decelerationRate="fast"
        style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}
      >
        {videos.map((video, index) => (
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

              {/* GAUCHE : INFO (Juste navigation) */}
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

              {/* DROITE : VIDE (SAUF AVATAR) */}
              <View style={styles.rightSide}>
                <TouchableOpacity style={styles.avatarLarge} onPress={() => handleCreatorClick(video.creatorId)}>
                  <View style={styles.avatarCircle}>
                    {video.creatorAvatar ? (
                        <Image source={{ uri: video.creatorAvatar }} style={styles.avatarLargeImage} />
                    ) : (
                        <Text style={styles.avatarText}>{video.creatorName.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  scrollView: { flex: 1 },
  scrollViewContent: { flexGrow: 1 },
  videoContainer: { height: SCREEN_HEIGHT, width: SCREEN_WIDTH, position: 'relative', overflow: 'visible' },
  videoWrapper: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  playPauseIcon: { position: 'absolute', top: '50%', left: '50%', marginTop: -40, marginLeft: -40, zIndex: 10 },
  gradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', zIndex: 10, pointerEvents: 'none' },
  progressBarContainer: { position: 'absolute', bottom: 80, left: 0, right: 0, paddingHorizontal: 16, zIndex: 40 },
  progressBarBackground: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#7459F0', borderRadius: 1 },
  
  leftSide: { position: 'absolute', bottom: 100, left: 16, right: 80, zIndex: 30 },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  creatorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#7459F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow:'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  creatorInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  creatorName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  description: { color: '#fff', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  
  rightSide: { position: 'absolute', bottom: 120, right: 8, gap: 18, alignItems: 'center', zIndex: 50 },
  avatarLarge: { marginBottom: 8, position: 'relative' },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#7459F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  avatarLargeImage: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});