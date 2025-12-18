import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, increment, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  favorites: string[];
  following: string[];
  watchHistory: string[];
  interests: string[];
}

export default function HomeScreen() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadUserProfile();
    loadVideos();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
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
      
      // Filtrer par intérêts si l'utilisateur en a
      if (userProfile?.interests && userProfile.interests.length > 0) {
        const filteredVideos = videosData.filter(video =>
          userProfile.interests.includes(video.category)
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
      handleMarkVideoAsWatched(videos[index]);
    }
  };

  const handleMarkVideoAsWatched = async (video: VideoData) => {
    try {
      const user = auth.currentUser;
      if (!user || !userProfile) return;
      if (userProfile.watchHistory.includes(video.id)) return;

      await updateDoc(doc(db, 'users', user.uid), {
        watchHistory: arrayUnion(video.id)
      });

      await updateDoc(doc(db, 'videos', video.id), {
        views: increment(1)
      });
      
      // Mettre à jour le profil local
      setUserProfile(prev => prev ? {
        ...prev,
        watchHistory: [...prev.watchHistory, video.id]
      } : null);
      
    } catch (error) {
      console.error('Error marking video as watched:', error);
    }
  };

  const handleLike = async (videoId: string) => {
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
      }
      
      // Mettre à jour localement
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

  const handleFavorite = async (videoId: string) => {
    try {
      const user = auth.currentUser;
      if (!user || !userProfile) return;
      
      const isFavorited = userProfile.favorites.includes(videoId);
      
      if (isFavorited) {
        await updateDoc(doc(db, 'users', user.uid), {
          favorites: arrayRemove(videoId)
        });
        Alert.alert('✓', 'Retiré des favoris');
        
        setUserProfile(prev => prev ? {
          ...prev,
          favorites: prev.favorites.filter(id => id !== videoId)
        } : null);
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
          favorites: arrayUnion(videoId)
        });
        Alert.alert('✓', 'Ajouté aux favoris ⭐');
        
        setUserProfile(prev => prev ? {
          ...prev,
          favorites: [...prev.favorites, videoId]
        } : null);
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
      
      const isFollowing = userProfile.following.includes(creatorId);
      
      if (isFollowing) {
        await updateDoc(doc(db, 'users', user.uid), {
          following: arrayRemove(creatorId)
        });
        Alert.alert('✓', `Vous ne suivez plus ${creatorName}`);
        
        setUserProfile(prev => prev ? {
          ...prev,
          following: prev.following.filter(id => id !== creatorId)
        } : null);
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
          following: arrayUnion(creatorId)
        });
        Alert.alert('✓', `Vous suivez maintenant ${creatorName} ✅`);
        
        setUserProfile(prev => prev ? {
          ...prev,
          following: [...prev.following, creatorId]
        } : null);
      }
      
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Erreur', 'Impossible de suivre/désuivre');
    }
  };

  const handleComment = () => {
    Alert.alert('Commentaires', 'Fonctionnalité en cours de développement');
  };

  const handleShare = () => {
    Alert.alert('Partager', 'Fonctionnalité en cours de développement');
  };

  const handleCreatorClick = (creatorId: string) => {
    Alert.alert('Profil créateur', 'Navigation vers le profil en cours de développement');
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

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressIndicator}>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {videos.length}
        </Text>
      </View>

      {/* Videos ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {videos.map((video, index) => {
          const isLiked = likedVideos.has(video.id);
          const isFavorited = userProfile?.favorites.includes(video.id) || false;
          const isFollowing = userProfile?.following.includes(video.creatorId) || false;
          
          return (
            <View key={video.id} style={styles.videoContainer}>
              {/* Video Player */}
              <Video
                source={{ uri: video.videoUrl }}
                rate={1.0}
                volume={1.0}
                isMuted={false}
                resizeMode={ResizeMode.COVER}
                shouldPlay={index === currentIndex}
                isLooping
                style={styles.video}
              />

              {/* Gradient Overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gradientOverlay}
              />

              {/* Left Side - Info */}
              <View style={styles.leftSide}>
                {/* Creator Info */}
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

                {/* Title */}
                <Text style={styles.title} numberOfLines={1}>
                  {video.title}
                </Text>

                {/* Description */}
                <Text style={styles.description} numberOfLines={2}>
                  {video.description}
                </Text>

                {/* Tags */}
                <View style={styles.tagsContainer}>
                  {video.tags?.slice(0, 3).map((tag, idx) => (
                    <Text key={idx} style={styles.tag}>#{tag}</Text>
                  ))}
                </View>
              </View>

              {/* Right Side - Actions */}
              <View style={styles.rightSide}>
                {/* Creator Avatar (large) */}
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

                {/* Like */}
                <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(video.id)}>
                  <View style={[styles.actionIcon, isLiked && styles.actionIconActive]}>
                    <Ionicons 
                      name={isLiked ? "heart" : "heart-outline"} 
                      size={28} 
                      color="#fff"
                    />
                  </View>
                  <Text style={styles.actionCount}>{video.likes + (isLiked ? 1 : 0)}</Text>
                </TouchableOpacity>

                {/* Comment */}
                <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="chatbubble-outline" size={28} color="#fff" />
                  </View>
                  <Text style={styles.actionCount}>{video.comments || 0}</Text>
                </TouchableOpacity>

                {/* Favorite */}
                <TouchableOpacity style={styles.actionButton} onPress={() => handleFavorite(video.id)}>
                  <View style={[styles.actionIcon, isFavorited && styles.actionIconActiveFavorite]}>
                    <Ionicons 
                      name={isFavorited ? "bookmark" : "bookmark-outline"} 
                      size={28} 
                      color="#fff"
                    />
                  </View>
                  <Text style={styles.actionCount}>Sauver</Text>
                </TouchableOpacity>

                {/* Share */}
                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="share-social-outline" size={28} color="#fff" />
                  </View>
                  <Text style={styles.actionCount}>Partager</Text>
                </TouchableOpacity>
              </View>

              {/* Swipe indicators */}
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
  videoContainer: {
    height: SCREEN_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
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