import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, useWindowDimensions, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, TouchableWithoutFeedback, StatusBar, Image,
  Modal, TextInput, KeyboardAvoidingView, Platform, Linking, FlatList,
  Clipboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { 
  collection, getDocs, query, orderBy, limit, doc, updateDoc, 
  increment, arrayUnion, arrayRemove, getDoc, addDoc, serverTimestamp,
  onSnapshot  // ✅ DOIT ÊTRE LÀ
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CommentModal from '../../components/CommentModal';

interface VideoData {
  id: string;
  title: string;
  description: string;
  category: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  creatorBadge?: 'apprenant' | 'expert' | 'pro' | 'diplome';
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
  followers?: string[];
  interests?: string[];
  displayName?: string;
  photoURL?: string;
  badge?: 'apprenant' | 'expert' | 'pro' | 'diplome';
  prenom?: string;
  nom?: string;
  role?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  
  const targetVideoId = params.videoId as string;
  const shouldOpenComments = params.openComments === 'true';
  
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedVideosSet, setLikedVideosSet] = useState<Set<string>>(new Set());
  const [savedVideosSet, setSavedVideosSet] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [showComments, setShowComments] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string>('');

  const [showShareModal, setShowShareModal] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [selectedVideoForShare, setSelectedVideoForShare] = useState<VideoData | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);

  // ✅ NOUVEL ÉTAT pour gérer l'expansion des descriptions
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

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
              followers: data.followers || [],
              interests: data.interests || [],
              displayName: data.displayName || `${data.prenom} ${data.nom}`.trim(),
              photoURL: data.photoURL,
              badge: data.badge || 'apprenant',
              prenom: data.prenom,
              nom: data.nom,
              role: data.role
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
        if (currentVideo) {
          try { await currentVideo.playAsync(); } catch (e) {}
        }
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

  useEffect(() => {
    if (targetVideoId && videos.length > 0) {
      const targetIndex = videos.findIndex(v => v.id === targetVideoId);
      if (targetIndex !== -1 && scrollViewRef.current) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: targetIndex * SCREEN_HEIGHT,
            animated: true
          });
          setCurrentIndex(targetIndex);
          
          if (shouldOpenComments) {
            setTimeout(() => {
              setCurrentVideoId(targetVideoId);
              setShowComments(true);
            }, 500);
          }
        }, 300);
      }
    }
  }, [targetVideoId, videos, SCREEN_HEIGHT, shouldOpenComments]);

  const loadAllUsers = async () => {
    try {
      const currentUserId = auth.currentUser?.uid;
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs
        .map(d => {
          const data = d.data();
          return {
            uid: d.id,
            displayName: data.displayName || `${data.prenom} ${data.nom}`.trim(),
            photoURL: data.photoURL,
            badge: data.badge,
            prenom: data.prenom,
            nom: data.nom,
            role: data.role
          } as UserProfile;
        })
        .filter(u => u.uid !== currentUserId);
      setAllUsers(usersData);
      setFilteredUsers(usersData);
    } catch (e) {
      console.error("Erreur chargement utilisateurs:", e);
    }
  };
// ✅ AJOUTER CE LISTENER pour synchroniser TOUTES les vidéos
useEffect(() => {
    if (videos.length === 0) return;
    
    const unsubscribers: (() => void)[] = [];
    
    videos.forEach((video) => {
        const unsub = onSnapshot(
            doc(db, 'videos', video.id),
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    
                    setVideos(prev => prev.map(v => {
                        if (v.id !== video.id) return v;
                        
                        return {
                            ...v,
                            likes: data.likes || 0,
                            comments: data.comments || 0
                        };
                    }));
                }
            },
            (error) => {
                console.error('Erreur listener vidéo:', error);
            }
        );
        
        unsubscribers.push(unsub);
    });
    
    return () => {
        unsubscribers.forEach(unsub => unsub());
    };
}, [videos.length]); // ⚠️ NE PAS mettre "videos" entier sinon boucle infinie
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user => {
        const fullName = `${user.prenom || ''} ${user.nom || ''}`.toLowerCase();
        const displayName = (user.displayName || '').toLowerCase();
        const search = searchQuery.toLowerCase();
        return fullName.includes(search) || displayName.includes(search);
      });
      setFilteredUsers(filtered);
    }
  }, [searchQuery, allUsers]);

  const loadVideos = async () => {
    try {
      const videosQuery = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(videosQuery);
      const rawVideos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      const enrichedVideos = await Promise.all(rawVideos.map(async (video) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', video.creatorId));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            
            let badge: 'apprenant' | 'expert' | 'pro' | 'diplome' = 'apprenant';
            
            if (uData.badge) {
              badge = uData.badge;
            }
            else if (uData.profileLevel) {
              switch (uData.profileLevel.toLowerCase()) {
                case 'expert':
                  badge = 'expert';
                  break;
                case 'diplome':
                case 'diplomé':
                  badge = 'diplome';
                  break;
                case 'pro':
                case 'professionnel':
                  badge = 'pro';
                  break;
                case 'amateur':
                case 'apprenant':
                default:
                  badge = 'apprenant';
                  break;
              }
            }
            else if (uData.statut) {
              switch (uData.statut.toLowerCase()) {
                case 'expert':
                  badge = 'expert';
                  break;
                case 'diplome':
                case 'diplomé':
                  badge = 'diplome';
                  break;
                case 'pro':
                case 'professionnel':
                  badge = 'pro';
                  break;
                case 'amateur':
                case 'apprenant':
                default:
                  badge = 'apprenant';
                  break;
              }
            }
            else if (uData.role === 'formateur') {
              badge = 'expert';
            }
            
            return {
              ...video,
              creatorName: uData.displayName || `${uData.prenom || ''} ${uData.nom || ''}`.trim() || video.creatorName,
              creatorAvatar: uData.photoURL || null,
              creatorBadge: badge
            };
          }
          return video;
        } catch (e) { 
          console.error('Erreur enrichissement vidéo:', e);
          return video; 
        }
      }));
      
      setVideos(enrichedVideos);
      setLoading(false);
    } catch (error) { 
      console.error('Erreur chargement vidéos:', error);
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

  // ✅ NOUVELLE FONCTION pour toggler la description
  const toggleDescription = (videoId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const handleCreatorClick = (creatorId: string) => { 
    router.push(`/profile/${creatorId}` as any); 
  };

  const shareOnWhatsApp = async () => {
    if (!selectedVideoForShare) return;
    
    const message = `🎓 Découvre cette vidéo sur SwipeSkills!\n\n📹 ${selectedVideoForShare.title}\n👤 Par @${selectedVideoForShare.creatorName}\n\n👉 Ouvre l'app pour la regarder!`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
        setShowShareModal(false);
        setSelectedVideoForShare(null);
      } else {
        Alert.alert("Erreur", "WhatsApp n'est pas installé sur cet appareil");
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'ouvrir WhatsApp");
    }
  };

  const handleCopyLink = async () => {
    if (!selectedVideoForShare) return;
    
    const videoLink = `https://swipeskills.app/video/${selectedVideoForShare.id}`;
    const shareMessage = `🎓 Découvre cette vidéo sur SwipeSkills!\n\n📹 ${selectedVideoForShare.title}\n👤 Par @${selectedVideoForShare.creatorName}\n\n🔗 ${videoLink}`;
    
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(shareMessage);
        alert('✓ Lien copié !');
      } else {
        Clipboard.setString(shareMessage);
        Alert.alert('✓', 'Lien copié dans le presse-papier !');
      }
      setShowShareModal(false);
      setSelectedVideoForShare(null);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier le lien');
    }
  };

  const shareToUser = async (targetUser: UserProfile) => {
    if (!selectedVideoForShare) return;
    
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;
    
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: targetUser.uid,
        fromUserId: currentUserId,
        fromUserName: userProfile?.displayName || 'Un utilisateur',
        type: 'video_share',
        videoId: selectedVideoForShare.id,
        videoTitle: selectedVideoForShare.title,
        read: false,
        createdAt: serverTimestamp()
      });
      
      const conversationId = [currentUserId, targetUser.uid].sort().join('_');
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: currentUserId,
        senderName: userProfile?.displayName || 'Utilisateur',
        content: `📹 Je t'ai partagé: ${selectedVideoForShare.title}`,
        videoId: selectedVideoForShare.id,
        type: 'video_share',
        createdAt: serverTimestamp(),
        read: false
      });
      
      Alert.alert("✓", `Vidéo partagée avec ${targetUser.displayName || targetUser.prenom}`);
      setShowUsersList(false);
      setShowShareModal(false);
      setSelectedVideoForShare(null);
    } catch (error) {
      console.error("Erreur partage:", error);
      Alert.alert("Erreur", "Impossible de partager la vidéo");
    }
  };

  const handleShare = async (video: VideoData) => {
    setSelectedVideoForShare(video);
    await loadAllUsers();
    setShowShareModal(true);
  };

  const handleFollow = async (creatorId: string, creatorName: string) => {
    try {
      const user = auth.currentUser;
      if (!user || !userProfile) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }
      
      const isFollowing = userProfile.following?.includes(creatorId) ?? false;
      const userRef = doc(db, 'users', user.uid);
      const creatorRef = doc(db, 'users', creatorId);
      
      if (isFollowing) {
        await updateDoc(userRef, { following: arrayRemove(creatorId) });
        await updateDoc(creatorRef, { followers: arrayRemove(user.uid) });
        
        setUserProfile(prev => prev ? { 
          ...prev, 
          following: (prev.following || []).filter(id => id !== creatorId) 
        } : null);
        
        Alert.alert('✓', `Vous ne suivez plus ${creatorName}`);
      } else {
        await updateDoc(userRef, { following: arrayUnion(creatorId) });
        await updateDoc(creatorRef, { followers: arrayUnion(user.uid) });
        
        setUserProfile(prev => prev ? { 
          ...prev, 
          following: [...(prev.following || []), creatorId] 
        } : null);
        
        await addDoc(collection(db, 'notifications'), { 
          userId: creatorId, 
          fromUserId: user.uid, 
          fromUserName: userProfile.displayName || 'Un utilisateur',
          type: 'follow', 
          read: false, 
          createdAt: serverTimestamp() 
        });
        
        Alert.alert('✓', `Vous suivez maintenant ${creatorName}`);
      }
    } catch (error: any) { 
      console.error('Error follow:', error);
      Alert.alert('Erreur', 'Impossible de s\'abonner: ' + error.message);
    }
  };

  const handleMarkVideoAsWatched = async (video: VideoData) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      await updateDoc(doc(db, 'users', user.uid), { 
        watchHistory: arrayUnion(video.id),
        'stats.videosWatched': increment(1),
        lastWatchedAt: serverTimestamp() 
      });
      
      await updateDoc(doc(db, 'videos', video.id), { 
        views: increment(1) 
      });
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
        setLikedVideosSet(prev => { 
          const s = new Set(prev); 
          s.delete(videoId); 
          return s; 
        });
        await updateDoc(userRef, { likedVideos: arrayRemove(videoId) });
        await updateDoc(videoRef, { likes: increment(-1) });
        setVideos(prev => prev.map(v => 
          v.id === videoId ? { ...v, likes: v.likes - 1 } : v
        ));
      } else {
        setLikedVideosSet(prev => new Set([...prev, videoId]));
        await updateDoc(userRef, { likedVideos: arrayUnion(videoId) });
        await updateDoc(videoRef, { likes: increment(1) });
        setVideos(prev => prev.map(v => 
          v.id === videoId ? { ...v, likes: v.likes + 1 } : v
        ));
      }
    } catch (error) { 
      console.error('Error like:', error); 
    }
  };

  const handleFavorite = async (videoId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const isSaved = savedVideosSet.has(videoId);
      const userRef = doc(db, 'users', user.uid);
      
      if (isSaved) {
        setSavedVideosSet(prev => { 
          const s = new Set(prev); 
          s.delete(videoId); 
          return s; 
        });
        await updateDoc(userRef, { favorites: arrayRemove(videoId) });
        Alert.alert('Info', 'Retiré des favoris');
      } else {
        setSavedVideosSet(prev => new Set([...prev, videoId]));
        await updateDoc(userRef, { favorites: arrayUnion(videoId) });
        Alert.alert('Succès', 'Ajouté aux favoris !');
      }
    } catch (error) { 
      console.error('Error favorite:', error); 
    }
  };

  const handleComment = async (videoId: string, creatorId: string) => {
    setCurrentVideoId(videoId);
    setShowComments(true);
    
    const currentVideo = videoRefs.current[videoId];
    if (currentVideo) {
      try {
        await currentVideo.pauseAsync();
        setIsPlaying(false);
      } catch (error) {}
    }
  };

  const getBadgeInfo = (badge?: 'apprenant' | 'expert' | 'pro' | 'diplome') => {
    switch (badge) {
      case 'expert':
        return { icon: 'shield-checkmark', color: '#FBA31A', label: 'EXPERT' };
      case 'diplome':
        return { icon: 'school', color: '#3B82F6', label: 'DIPLOMÉ' };
      case 'pro':
        return { icon: 'star', color: '#10B981', label: 'PRO' };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#7459f0" />
      </View>
    );
  }

  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
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
          const isLiked = likedVideosSet.has(video.id);
          const isSaved = savedVideosSet.has(video.id);
          const isFollowing = userProfile?.following?.includes(video.creatorId) ?? false;
          const currentUserId = auth.currentUser?.uid;
          const isMyVideo = video.creatorId === currentUserId;
          const badgeInfo = getBadgeInfo(video.creatorBadge);
          const isDescriptionExpanded = expandedDescriptions.has(video.id);
          
          return (
            <View 
              key={video.id} 
              style={[styles.videoContainer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}
            >
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
                    <LinearGradient
                      colors={['rgba(116, 89, 240, 0.3)', 'rgba(36, 42, 101, 0.3)']}
                      style={styles.playPauseIconBg}
                    >
                      <Ionicons name="play" size={60} color="white" />
                    </LinearGradient>
                  )}
                </View>
              </TouchableWithoutFeedback>

              <LinearGradient 
                colors={['transparent', 'rgba(0,0,0,0.9)']} 
                style={styles.gradientOverlay} 
              />
              
              {index === currentIndex && (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <LinearGradient
                      colors={['#7459f0', '#9333ea', '#242A65']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
                    />
                  </View>
                </View>
              )}

              <View style={styles.leftSide}>
                <View style={styles.creatorInfo}>
                  <TouchableOpacity 
                    style={styles.creatorInfoTop}
                    onPress={() => handleCreatorClick(video.creatorId)}
                  >
                    <View style={styles.creatorAvatarWrapper}>
                      <LinearGradient
                        colors={['#7459f0', '#242A65']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.creatorAvatarBorder}
                      >
                        <View style={styles.creatorAvatar}>
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
                      </LinearGradient>
                    </View>
                    
                    <View style={styles.creatorDetails}>
                      <View style={styles.creatorNameRow}>
                        <Text style={styles.creatorName}>
                          @{video.creatorName} 
                          {isMyVideo && <Text style={styles.meLabel}> (Moi)</Text>}
                        </Text>
                        
                        {badgeInfo && (
                          <LinearGradient
                            colors={[badgeInfo.color, badgeInfo.color]}
                            style={styles.badge}
                          >
                            <Ionicons name={badgeInfo.icon as any} size={10} color="#fff" />
                            <Text style={styles.badgeText}>{badgeInfo.label}</Text>
                          </LinearGradient>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  {!isMyVideo && !isFollowing && (
                    <TouchableOpacity 
                      onPress={() => handleFollow(video.creatorId, video.creatorName)}
                      activeOpacity={0.8}
                      style={styles.followButtonContainer}
                    >
                      <LinearGradient
                        colors={['#7459f0', '#9333ea', '#242A65']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.followButtonProminent}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                        <Text style={styles.followButtonProminentText}>Suivre</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
                
                <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
                
                {/* ✅ DESCRIPTION CLIQUABLE AVEC EXPANSION - CORRIGÉE */}
                <View>
                  <TouchableOpacity 
                    onPress={() => toggleDescription(video.id)}
                    activeOpacity={0.9}
                  >
                    <Text 
                      style={styles.description} 
                      numberOfLines={isDescriptionExpanded ? undefined : 2}
                    >
                      {video.description}
                      {!isDescriptionExpanded && video.description && video.description.length > 80 && (
                        <Text style={styles.seeMore}> ... voir plus</Text>
                      )}
                    </Text>
                    {isDescriptionExpanded && (
                      <Text style={styles.seeLess}>voir moins</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.rightSide}>
                <TouchableOpacity 
                  style={styles.avatarLarge} 
                  onPress={() => handleCreatorClick(video.creatorId)}
                >
                  <LinearGradient
                    colors={['#7459f0', '#242A65']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarCircleBorder}
                  >
                    <View style={styles.avatarCircle}>
                      {video.creatorAvatar ? (
                        <Image 
                          source={{ uri: video.creatorAvatar }} 
                          style={styles.avatarLargeImage} 
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {video.creatorName.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                  </LinearGradient>
                  
                  {isFollowing && (
                    <LinearGradient
                      colors={['#7459f0', '#9333ea']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.checkIcon}
                    >
                      <Ionicons name="checkmark" size={12} color="white" />
                    </LinearGradient>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => handleLike(video.id, video.creatorId)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={isLiked ? ['#ef4444', '#dc2626'] : ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionIcon}
                  >
                    <Ionicons 
                      name={isLiked ? "heart" : "heart-outline"} 
                      size={28} 
                      color="#fff" 
                    />
                  </LinearGradient>
                  <Text style={styles.actionCount}>{video.likes}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => handleComment(video.id, video.creatorId)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#7459f0', '#242A65']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionIcon}
                  >
                    <Ionicons name="chatbubble-outline" size={28} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.actionCount}>{video.comments || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => handleFavorite(video.id)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={isSaved ? ['#FBA31A', '#F59E0B'] : ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionIcon}
                  >
                    <Ionicons 
                      name={isSaved ? "bookmark" : "bookmark-outline"} 
                      size={28} 
                      color="#fff" 
                    />
                  </LinearGradient>
                  <Text style={styles.actionCount}>{isSaved ? 'Enregistré' : 'Sauver'}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => handleShare(video)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#7459f0', '#242A65']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionIcon}
                  >
                    <Ionicons name="share-social-outline" size={28} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.actionCount}>Partager</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL PARTAGE */}
      <Modal visible={showShareModal} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.shareOverlay} 
          activeOpacity={1} 
          onPress={() => {
            setShowShareModal(false);
            setSelectedVideoForShare(null);
          }}
        >
          <TouchableOpacity activeOpacity={1} style={styles.shareContentWrapper}>
            <View style={styles.shareContent}>
              <LinearGradient 
                colors={['#7459f0', '#9333ea', '#242A65']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shareHeader}
              >
                <View style={styles.shareHeaderContent}>
                  <Ionicons name="share-social" size={24} color="white" />
                  <Text style={styles.shareTitle}>Partager la vidéo</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    setShowShareModal(false);
                    setSelectedVideoForShare(null);
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </LinearGradient>

              {selectedVideoForShare && (
                <View style={styles.videoPreview}>
                  <LinearGradient
                    colors={['#F3E8FF', '#E9D5FF']}
                    style={styles.videoPreviewIcon}
                  >
                    <Ionicons name="play-circle" size={32} color="#7459f0" />
                  </LinearGradient>
                  <View style={styles.videoPreviewInfo}>
                    <Text style={styles.videoPreviewTitle} numberOfLines={2}>
                      {selectedVideoForShare.title}
                    </Text>
                    <Text style={styles.videoPreviewCreator}>
                      Par @{selectedVideoForShare.creatorName}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.shareOptionsGrid}>
                <TouchableOpacity 
                  style={styles.shareOptionCard} 
                  onPress={shareOnWhatsApp}
                  activeOpacity={0.7}
                >
                  <LinearGradient 
                    colors={['#25D366', '#128C7E']} 
                    style={styles.shareIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="logo-whatsapp" size={36} color="white" />
                  </LinearGradient>
                  <Text style={styles.shareOptionLabel}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.shareOptionCard} 
                  onPress={() => {
                    setShowShareModal(false);
                    setShowUsersList(true);
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient 
                    colors={['#7459f0', '#9333ea', '#242A65']} 
                    style={styles.shareIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="people" size={36} color="white" />
                  </LinearGradient>
                  <Text style={styles.shareOptionLabel}>Utilisateurs</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.shareOptionCard} 
                  onPress={handleCopyLink}
                  activeOpacity={0.7}
                >
                  <LinearGradient 
                    colors={['#3B82F6', '#2563EB']} 
                    style={styles.shareIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="link" size={36} color="white" />
                  </LinearGradient>
                  <Text style={styles.shareOptionLabel}>Copier le lien</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MODAL LISTE UTILISATEURS */}
      <Modal visible={showUsersList} animationType="slide">
        <View style={styles.usersListContainer}>
          <LinearGradient 
            colors={['#7459f0', '#9333ea', '#242A65']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.usersListHeader}
          >
            <TouchableOpacity onPress={() => {
              setShowUsersList(false);
              setSearchQuery('');
            }}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.usersListTitle}>Partager avec</Text>
            <View style={{width: 24}} />
          </LinearGradient>

          <View style={styles.searchContainer}>
            <LinearGradient
              colors={['#F9FAFB', '#F3F4F6']}
              style={styles.searchInputWrapper}
            >
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput 
                style={styles.searchInput}
                placeholder="Rechercher un utilisateur..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </LinearGradient>
          </View>

          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.userItem} 
                onPress={() => shareToUser(item)}
                activeOpacity={0.7}
              >
                <View style={styles.userAvatarWrapper}>
                  {item.photoURL ? (
                    <Image source={{ uri: item.photoURL }} style={styles.userAvatarImg} />
                  ) : (
                    <LinearGradient 
                      colors={['#7459f0', '#242A65']} 
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.userAvatarPlaceholder}
                    >
                      <Text style={styles.userAvatarText}>
                        {(item.prenom?.[0] || item.displayName?.[0] || 'U').toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.displayName || `${item.prenom} ${item.nom}`}
                  </Text>
                  <Text style={styles.userRole}>
                    {item.badge === 'expert' ? '👨‍🎓 Expert' : 
                     item.badge === 'diplome' ? '🎓 Diplomé' :
                     item.badge === 'pro' ? '⭐ Pro' : 
                     '📚 Apprenant'}
                  </Text>
                </View>
                <LinearGradient
                  colors={['#7459f0', '#9333ea']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendIconWrapper}
                >
                  <Ionicons name="send" size={20} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyUsersList}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyUsersText}>Aucun utilisateur trouvé</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* MODAL COMMENTAIRES */}
      <CommentModal
        visible={showComments}
        onClose={() => {
          setShowComments(false);
          setCurrentVideoId('');
        }}
        videoId={currentVideoId}
        creatorId={videos.find(v => v.id === currentVideoId)?.creatorId || ''}
        videoTitle={videos.find(v => v.id === currentVideoId)?.title || ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#000' 
  },
  loadingText: { 
    color: '#fff', 
    fontSize: 16, 
    marginTop: 16,
    fontWeight: '600'
  },
  scrollView: { flex: 1 },
  scrollViewContent: { flexGrow: 1 },
  videoContainer: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: '#000', 
    position: 'relative', 
    overflow: 'hidden' 
  },
  touchableOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 5 
  },
  playPauseIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  progressBarContainer: { 
    position: 'absolute', 
    bottom: 120, 
    left: 0, 
    right: 0, 
    paddingHorizontal: 16, 
    zIndex: 40 
  },
  progressBarBackground: { 
    height: 3, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    borderRadius: 2, 
    overflow: 'hidden' 
  },
  progressBarFill: { 
    height: '100%', 
    borderRadius: 2 
  },
  gradientOverlay: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: '50%', 
    zIndex: 10 
  },
  
  leftSide: { 
    position: 'absolute', 
    bottom: 140, 
    left: 16, 
    right: 100, 
    zIndex: 30 
  },
  creatorInfo: { 
    marginBottom: 12 
  },
  creatorInfoTop: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    marginBottom: 8
  },
  creatorAvatarWrapper: {
    padding: 2
  },
  creatorAvatarBorder: {
    padding: 2,
    borderRadius: 26
  },
  creatorAvatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: '#1a1a2e', 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow:'hidden' 
  },
  avatarImage: { width: '100%', height: '100%' },
  creatorInitial: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  creatorDetails: { 
    flex: 1
  },
  creatorNameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    flexWrap: 'wrap'
  },
  creatorName: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3
  },
  meLabel: { 
    fontSize: 12, 
    color: '#aaa',
    fontWeight: '500'
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  followButtonContainer: {
    alignSelf: 'flex-start',
    marginLeft: 60
  },
  followButtonProminent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  followButtonProminentText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  title: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3
  },
  description: { 
    color: '#fff', 
    fontSize: 14, 
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3
  },
  
  seeMore: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3
  },

  seeLess: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3
  },
  
  rightSide: { 
    position: 'absolute', 
    bottom: 140, 
    right: 16, 
    gap: 20, 
    alignItems: 'center', 
    zIndex: 30 
  },
  avatarLarge: { 
    marginBottom: 8, 
    position: 'relative' 
  },
  avatarCircleBorder: {
    padding: 3,
    borderRadius: 31
  },
  avatarCircle: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#1a1a2e', 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden' 
  },
  avatarLargeImage: { width: '100%', height: '100%' },
  avatarText: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  checkIcon: { 
    position: 'absolute', 
    bottom: -4, 
    alignSelf: 'center', 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#fff' 
  },
  
  actionButton: { 
    alignItems: 'center', 
    gap: 6 
  },
  actionIcon: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8
  },
  actionCount: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3
  },
  
  shareOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  shareContentWrapper: {
    width: '100%',
    maxWidth: 400
  },
  shareContent: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20
  },
  shareHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  shareTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  videoPreviewIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoPreviewInfo: {
    flex: 1
  },
  videoPreviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  videoPreviewCreator: {
    fontSize: 13,
    color: '#6B7280'
  },
  shareOptionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 30,
    gap: 20,
    justifyContent: 'space-around'
  },
  shareOptionCard: {
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  shareIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12
  },
  shareOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center'
  },

  usersListContainer: {
    flex: 1,
    backgroundColor: '#F8F8F6'
  },
  usersListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20
  },
  usersListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginVertical: 16
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937'
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  userAvatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden'
  },
  userAvatarImg: {
    width: '100%',
    height: '100%'
  },
  userAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2
  },
  userRole: {
    fontSize: 13,
    color: '#6B7280'
  },
  sendIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyUsersList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64
  },
  emptyUsersText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    fontWeight: '500'
  },
});