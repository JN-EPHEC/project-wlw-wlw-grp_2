import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, increment, arrayUnion, arrayRemove, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
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
  favorites?: string[];
  following?: string[];
  watchHistory?: string[];
  interests?: string[];
}

export default function HomeScreen() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const videoRefs = useRef<Record<string, Video | null>>({});

  // Gérer la lecture/pause des vidéos
  useFocusEffect(
    useCallback(() => {
      setIsPlaying(true);
      
      // Relancer la vidéo courante après un court délai
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
        // Mettre en pause toutes les vidéos
        Object.values(videoRefs.current).forEach(async (video) => {
          if (video) {
            try {
              await video.pauseAsync();
            } catch (error) {
              console.log('Error pausing video:', error);
            }
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

  // Arrêter les autres vidéos quand on change d'index
  useEffect(() => {
    const pauseOtherVideos = async () => {
      Object.keys(videoRefs.current).forEach(async (videoId, index) => {
        if (index !== currentIndex && videoRefs.current[videoId]) {
          try {
            await videoRefs.current[videoId]?.pauseAsync();
          } catch (error) {
            console.log('Error pausing other videos:', error);
          }
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
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadVideos = async () => {
    try {
      const videosQuery = query(
        collection(db, 'videos'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(videosQuery);
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VideoData[];
      
      if (userProfile?.interests && userProfile.interests.length > 0) {
        const filteredVideos = videosData.filter(video =>
          userProfile.interests?.includes(video.category)
        );
        
        if (filteredVideos.length > 0) {
          setVideos([...filteredVideos, ...videosData.filter(v => !filteredVideos.includes(v))]);
        } else {
          setVideos(videosData);
        }
      } else {
        setVideos(videosData);
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
        fromUserName: userProfile?.uid || 'Un utilisateur',
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
      const isLiked = likedVideos.has(videoId);
      
      if (isLiked) {
        setLikedVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
        
        await updateDoc(doc(db, 'videos', videoId), {
          likes: increment(-1)
        });
      } else {
        setLikedVideos(prev => new Set([...prev, videoId]));
        
        await updateDoc(doc(db, 'videos', videoId), {
          likes: increment(1)
        });

        await createNotification('like', videoId, creatorId);
      }
      
      setVideos(prev => prev.map(v => 
        v.id === videoId 
          ? { ...v, likes: isLiked ? v.likes - 1 : v.likes + 1 }
          : v
      ));
      
    } catch (error) {
      console.error('Error liking video:', error);
      Alert.alert('Erreur', 'Impossible de liker la vidéo');
    }
  };

  const handleFavorite = async (videoId: string, creatorId: string) => {
    try {
      const user = auth.currentUser;
      if (!user || !userProfile) return;
      
      const isFavorited = userProfile.favorites?.includes(videoId) ?? false;
      
      if (isFavorited) {
        await updateDoc(doc(db, 'users', user.uid), {
          favorites: arrayRemove(videoId)
        });
        Alert.alert('✓', 'Retiré des favoris');
        
        setUserProfile(prev => prev ? {
          ...prev,
          favorites: (prev.favorites || []).filter(id => id !== videoId)
        } : null);
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
          favorites: arrayUnion(videoId)
        });
        Alert.alert('✓', 'Ajouté aux favoris ⭐');
        
        setUserProfile(prev => prev ? {
          ...prev,
          favorites: [...(prev.favorites || []), videoId]
        } : null);

        await createNotification('save', videoId, creatorId);
      }
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour les favoris');
    }
  };

  const handleFollow = async (creatorId: string, creatorName: string) => {
    try {
      const user = auth.currentUser;
      if (!user || !userProfile) return;
      
      const isFollowing = userProfile.following?.includes(creatorId) ?? false;
      
      if (isFollowing) {
        await updateDoc(doc(db, 'users', user.uid), {
          following: arrayRemove(creatorId)
        });
        Alert.alert('✓', `Vous ne suivez plus ${creatorName}`);
        
        setUserProfile(prev => prev ? {
          ...prev,
          following: (prev.following || []).filter(id => id !== creatorId)
        } : null);
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
          following: arrayUnion(creatorId)
        });
        Alert.alert('✓', `Vous suivez maintenant ${creatorName} ✅`);
        
        setUserProfile(prev => prev ? {
          ...prev,
          following: [...(prev.following || []), creatorId]
        } : null);

        await createNotification('follow', '', creatorId);
      }
      
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Erreur', 'Impossible de suivre/désuivre');
    }
  };

  const handleComment = (videoId: string, creatorId: string) => {
    Alert.alert('Commentaires', 'Fonctionnalité en cours de développement');
  };

  const handleShare = () => {
    Alert.alert('Partager', 'Fonctionnalité en cours de développement');
  };

  const handleCreatorClick = (creatorId: string) => {
  try {
    router.push(`/profile/${creatorId}` as any);
  } catch (error) {
    console.error('Navigation error:', error);
    Alert.alert('Erreur', 'Impossible de charger le profil');
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
        <Text style={styles.emptySubtitle}>Les formateurs n'ont pas encore publié de contenu</Text>
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
          const isLiked = likedVideos.has(video.id);
          const isFavorited = userProfile?.favorites?.includes(video.id) ?? false;
          const isFollowing = userProfile?.following?.includes(video.creatorId) ?? false;
          
          return (
            <View key={video.id} style={styles.videoContainer}>
              <TouchableWithoutFeedback onPress={togglePlayPause}>
                <View style={styles.videoWrapper}>
                  <Video
                    ref={(ref) => {
                      if (ref) {
                        videoRefs.current[video.id] = ref;
                      }
                    }}
                    source={{ uri: video.videoUrl }}
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={index === currentIndex && isPlaying}
                    isLooping
                    style={styles.video}
                    onPlaybackStatusUpdate={index === currentIndex ? handlePlaybackStatusUpdate : undefined}
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

              <View style={styles.leftSide}>
                <TouchableOpacity 
                  style={styles.creatorInfo}
                  onPress={() => handleCreatorClick(video.creatorId)}
                >
                  <View style={styles.creatorAvatar}>
                    <Text style={styles.creatorInitial}>
                      {video.creatorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.creatorDetails}>
                    <Text style={styles.creatorName}>@{video.creatorName}</Text>
                    <TouchableOpacity 
                      style={[styles.followButton, isFollowing && styles.followButtonActive]}
                      onPress={() => handleFollow(video.creatorId, video.creatorName)}
                    >
                      <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
                        {isFollowing ? 'Suivi' : 'Suivre'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                <Text style={styles.title} numberOfLines={1}>
                  {video.title}
                </Text>

                <Text style={styles.description} numberOfLines={2}>
                  {video.description}
                </Text>

                <View style={styles.tagsContainer}>
                  {video.tags?.slice(0, 3).map((tag, idx) => (
                    <Text key={idx} style={styles.tag}>#{tag}</Text>
                  ))}
                </View>
              </View>

              <View style={styles.rightSide}>
                <TouchableOpacity 
                  style={styles.avatarLarge}
                  onPress={() => handleCreatorClick(video.creatorId)}
                >
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {video.creatorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  {!isFollowing && (
                    <View style={styles.plusIcon}>
                      <Ionicons name="add" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(video.id, video.creatorId)}>
                  <View style={[styles.actionIcon, isLiked && styles.actionIconActive]}>
                    <Ionicons 
                      name={isLiked ? "heart" : "heart-outline"} 
                      size={28} 
                      color="#fff"
                    />
                  </View>
                  <Text style={styles.actionCount}>{video.likes + (isLiked ? 1 : 0)}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => handleComment(video.id, video.creatorId)}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="chatbubble-outline" size={28} color="#fff" />
                  </View>
                  <Text style={styles.actionCount}>{video.comments || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => handleFavorite(video.id, video.creatorId)}>
                  <View style={[styles.actionIcon, isFavorited && styles.actionIconActiveFavorite]}>
                    <Ionicons 
                      name={isFavorited ? "bookmark" : "bookmark-outline"} 
                      size={28} 
                      color="#fff"
                    />
                  </View>
                  <Text style={styles.actionCount}>Sauver</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
  },
  progressIndicator: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 50,
    alignItems: 'center',
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  videoContainer: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    position: 'relative',
  },
  videoWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  playPauseIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 40,
  },
  progressBarBackground: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7459F0',
    borderRadius: 1,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  leftSide: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 80,
    zIndex: 30,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7459F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  creatorInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  creatorDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creatorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  followButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  followButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: '#fff',
  },
  followButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: '#fff',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    color: '#7459F0',
    fontSize: 14,
    fontWeight: '600',
  },
  rightSide: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    gap: 24,
    alignItems: 'center',
    zIndex: 30,
  },
  avatarLarge: {
    marginBottom: 8,
    position: 'relative',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7459F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  plusIcon: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7459F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconActive: {
    backgroundColor: '#ef4444',
  },
  actionIconActiveFavorite: {
    backgroundColor: '#FBA31A',
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  swipeUpIndicator: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
  },
  swipeDownIndicator: {
    position: 'absolute',
    bottom: 150,
    alignSelf: 'center',
  },
});