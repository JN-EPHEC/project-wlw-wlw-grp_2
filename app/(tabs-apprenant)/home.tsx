import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, useWindowDimensions, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, TouchableWithoutFeedback, StatusBar, Image,
  Modal, TextInput, Platform, Linking, FlatList, Clipboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { 
  collection, getDocs, query, orderBy, limit, doc, updateDoc, 
  increment, arrayUnion, arrayRemove, getDoc, addDoc, serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import CommentModal from '../../components/CommentModal';

// ========================================
// 📦 INTERFACES
// ========================================

interface VideoData {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  videoUrl: string;
  likes: number;
  comments: number;
  creatorBadge?: 'apprenant' | 'expert' | 'pro' | 'diplome';
}

interface UserProfile {
  uid: string;
  displayName?: string;
  photoURL?: string;
  badge?: string;
  prenom?: string;
  nom?: string;
  role?: string;
  following?: string[];
  followers?: string[];
}

// ========================================
// 🏠 COMPOSANT PRINCIPAL
// ========================================

export default function HomeScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  
  // États vidéos
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // ✅ État pour tracker les vidéos déjà comptées
  const [countedVideos, setCountedVideos] = useState<Set<string>>(new Set());
  
  // ✅ État pour gérer l'expansion des descriptions
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  
  // États utilisateur
  const [userProfile, setUserProfile] = useState<any>(null);
  const [likedVideosSet, setLikedVideosSet] = useState<Set<string>>(new Set());
  const [savedVideosSet, setSavedVideosSet] = useState<Set<string>>(new Set());
  const [likingVideos, setLikingVideos] = useState<Set<string>>(new Set());
  
  // États chargement
  const [loading, setLoading] = useState(true);
  
  // États commentaires
  const [showComments, setShowComments] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  
  // 📤 États partage
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [selectedVideoForShare, setSelectedVideoForShare] = useState<VideoData | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);

  const videoRefs = useRef<Record<string, Video | null>>({});

  // ========================================
  // 🔄 EFFETS
  // ========================================

  // ✅ Configuration audio pour iOS
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Erreur configuration audio:', error);
      }
    };
    
    setupAudio();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        const user = auth.currentUser;
        if (!user) return;
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile(data);
          setLikedVideosSet(new Set<string>(data.likedVideos || []));
          setSavedVideosSet(new Set<string>(data.favorites || []));
        }
      };
      
      fetchUserData();
      
      const timer = setTimeout(() => {
        const currentVideo = videoRefs.current[videos[currentIndex]?.id];
        if (currentVideo) {
          currentVideo.playAsync()
            .catch(error => {
              if (error.name !== 'AbortError') {
                console.error('Erreur lecture vidéo:', error);
              }
            });
          setIsPlaying(true);
        }
      }, 100);
      
      return () => {
        clearTimeout(timer);
        setIsPlaying(false);
        Object.values(videoRefs.current).forEach(async (videoRef) => {
          if (videoRef) {
            try {
              await videoRef.pauseAsync();
            } catch (e) {
              console.error('Erreur pause vidéo:', e);
            }
          }
        });
      };
    }, [videos, currentIndex])
  );

  useEffect(() => { loadVideos(); }, []);

  useEffect(() => {
    const pauseOtherVideos = async () => {
      Object.keys(videoRefs.current).forEach(async (videoId, index) => {
        if (videos[index]?.id !== videos[currentIndex]?.id && videoRefs.current[videoId]) {
          try {
            await videoRefs.current[videoId]?.pauseAsync();
          } catch (error) {
            console.error('Erreur pause vidéo:', error);
          }
        }
      });
    };
    
    if (videos.length > 0) {
      pauseOtherVideos();
    }
  }, [currentIndex, videos]);

  // 🔄 LISTENER TEMPS RÉEL pour les compteurs likes/comments
  useEffect(() => {
    if (videos.length === 0 || !videos[currentIndex]?.id) return;
    
    const videoId = videos[currentIndex].id;
    
    const unsubscribe = onSnapshot(
      doc(db, 'videos', videoId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          
          setVideos(prev => prev.map(v => {
            if (v.id !== videoId) return v;
            
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
    
    return () => unsubscribe();
  }, [currentIndex, videos.length]);

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

  // ========================================
  // 🎬 FONCTIONS VIDÉOS
  // ========================================

  const loadVideos = async () => {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'videos'), 
          orderBy('createdAt', 'desc'),
          limit(20)
        )
      );
      
      const rawVideos = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as any[];
      
      const enriched = await Promise.all(rawVideos.map(async (v) => {
        const uDoc = await getDoc(doc(db, 'users', v.creatorId));
        const uData = uDoc.exists() ? uDoc.data() : {};
        
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
          ...v, 
          creatorName: uData.displayName || `${uData.prenom || ''} ${uData.nom || ''}`.trim() || 'Formateur',
          creatorAvatar: uData.photoURL || null,
          creatorBadge: badge
        };
      }));
      
      setVideos(enriched);
      
      if (enriched.length > 0) {
        handleMarkAsWatched(enriched[0].id);
      }
      
    } catch (e) { 
      console.error('Erreur chargement vidéos:', e); 
    } finally { 
      setLoading(false);
    }
  };

  const handleMarkAsWatched = async (videoId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        watchHistory: arrayUnion(videoId),
        lastWatchedAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'videos', videoId), { 
        views: increment(1) 
      });
    } catch (error) {
      console.error('❌ Erreur handleMarkAsWatched:', error);
    }
  };

  const handleVideoCompleted = async (videoId: string, durationMillis: number) => {
    const user = auth.currentUser;
    if (!user) return;
    
    if (countedVideos.has(videoId)) {
      return;
    }
    
    try {
      const videoDurationInMinutes = durationMillis / 60000;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const currentTotalMinutes = userDoc.exists() 
        ? (userDoc.data().stats?.totalMinutes || 0) 
        : 0;
      
      await updateDoc(doc(db, 'users', user.uid), { 
        'stats.totalMinutes': currentTotalMinutes + videoDurationInMinutes
      });
      
      setCountedVideos(prev => new Set(prev).add(videoId));
      
      console.log(`✅ Vidéo complétée : +${videoDurationInMinutes.toFixed(2)} minutes (total: ${(currentTotalMinutes + videoDurationInMinutes).toFixed(2)})`);
      
    } catch (error) {
      console.error('❌ Erreur handleVideoCompleted:', error);
    }
  };

  const togglePlayPause = async () => {
    const ref = videoRefs.current[videos[currentIndex]?.id];
    if (ref) {
      if (isPlaying) {
        await ref.pauseAsync();
        setIsPlaying(false);
      } else {
        await ref.playAsync();
        setIsPlaying(true);
      }
    }
  };

  // ✅ Fonction pour toggler la description
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

  // ========================================
  // ❤️ ACTIONS UTILISATEUR
  // ========================================

  const handleLike = async (videoId: string) => {
    if (likingVideos.has(videoId)) return;
    
    const isLiked = likedVideosSet.has(videoId);
    
    setLikingVideos(prev => new Set(prev).add(videoId));
    
    setLikedVideosSet(prev => { 
      const s = new Set(prev); 
      isLiked ? s.delete(videoId) : s.add(videoId); 
      return s; 
    });
    
    try {
      await updateDoc(doc(db, 'videos', videoId), { 
        likes: increment(isLiked ? -1 : 1) 
      });
      
      await updateDoc(doc(db, 'users', auth.currentUser!.uid), { 
        likedVideos: isLiked ? arrayRemove(videoId) : arrayUnion(videoId) 
      });
    } catch (error) {
      console.error('Erreur like:', error);
      
      setLikedVideosSet(prev => { 
        const s = new Set(prev); 
        isLiked ? s.add(videoId) : s.delete(videoId); 
        return s; 
      });
      
      Alert.alert('Erreur', 'Impossible de synchroniser avec le serveur');
    } finally {
      setLikingVideos(prev => {
        const s = new Set(prev);
        s.delete(videoId);
        return s;
      });
    }
  };

  const handleFavorite = async (videoId: string) => {
    const isSaved = savedVideosSet.has(videoId);
    
    setSavedVideosSet(prev => { 
      const s = new Set(prev); 
      isSaved ? s.delete(videoId) : s.add(videoId); 
      return s; 
    });
    
    await updateDoc(doc(db, 'users', auth.currentUser!.uid), { 
      favorites: isSaved ? arrayRemove(videoId) : arrayUnion(videoId) 
    });
    
    Alert.alert("Favoris", isSaved ? "Retiré des favoris" : "Ajouté aux favoris !");
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
        
        setUserProfile((prev: any) => prev ? { 
          ...prev, 
          following: (prev.following || []).filter((id: string) => id !== creatorId) 
        } : null);
        
        Alert.alert('✓', `Vous ne suivez plus ${creatorName}`);
      } else {
        await updateDoc(userRef, { following: arrayUnion(creatorId) });
        await updateDoc(creatorRef, { followers: arrayUnion(user.uid) });
        
        setUserProfile((prev: any) => prev ? { 
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

  // ========================================
  // 💬 COMMENTAIRES
  // ========================================

  const handleCommentAdded = (videoId: string) => {
    // Le listener s'en occupe
  };

  const handleCommentDeleted = (videoId: string) => {
    // Le listener s'en occupe
  };

  // ========================================
  // 📤 FONCTIONS PARTAGE
  // ========================================

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

  const handleShare = async (video: VideoData) => {
    setSelectedVideoForShare(video);
    await loadAllUsers();
    setShowShareModal(true);
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

  // ========================================
  // 🔄 RENDU
  // ========================================

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
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
          
          if (index !== currentIndex && index >= 0 && index < videos.length) {
            const oldVideo = videoRefs.current[videos[currentIndex]?.id];
            if (oldVideo) {
              try {
                oldVideo.pauseAsync();
              } catch (e) {
                console.error('Erreur pause ancienne vidéo:', e);
              }
            }
            
            setCurrentIndex(index);
            setProgress(0);
            setIsPlaying(true);
            handleMarkAsWatched(videos[index].id);
            
            setTimeout(() => {
              const newVideo = videoRefs.current[videos[index]?.id];
              if (newVideo) {
                try {
                  newVideo.playAsync();
                } catch (e) {
                  console.error('Erreur lecture nouvelle vidéo:', e);
                }
              }
            }, 100);
          }
        }}
        scrollEventThrottle={16}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {videos.map((video, index) => {
          const isLiked = likedVideosSet.has(video.id);
          const isSaved = savedVideosSet.has(video.id);
          const isFollowing = userProfile?.following?.includes(video.creatorId);
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
                isMuted={false}
                volume={1.0}
                style={StyleSheet.absoluteFillObject}
                onPlaybackStatusUpdate={(s) => {
                  if (index === currentIndex && s.isLoaded) {
                    setProgress(s.positionMillis);
                    setDuration(s.durationMillis || 0);
                    
                    if (s.durationMillis && s.positionMillis >= s.durationMillis * 0.9) {
                      handleVideoCompleted(video.id, s.durationMillis);
                    }
                  }
                }}
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
                <TouchableOpacity 
                  style={styles.creatorInfo} 
                  onPress={() => router.push(`/profile/${video.creatorId}`)}
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
                    
                    {!isMyVideo && !isFollowing && (
                      <TouchableOpacity 
                        onPress={() => handleFollow(video.creatorId, video.creatorName)}
                        activeOpacity={0.8}
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
                </TouchableOpacity>
                
                <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
                
                {/* ✅ DESCRIPTION CLIQUABLE AVEC EXPANSION */}
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
                  onPress={() => router.push(`/profile/${video.creatorId}`)}
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
                  onPress={() => handleLike(video.id)}
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
                  onPress={() => { 
                    setSelectedVideoId(video.id); 
                    setShowComments(true); 
                  }}
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
      {selectedVideoId && (
        <CommentModal 
          visible={showComments} 
          videoId={selectedVideoId} 
          creatorId={videos.find(v => v.id === selectedVideoId)?.creatorId || ''}
          videoTitle={videos.find(v => v.id === selectedVideoId)?.title || 'Vidéo'}
          onClose={() => setShowComments(false)}
          onCommentAdded={() => handleCommentAdded(selectedVideoId)}
          onCommentDeleted={() => handleCommentDeleted(selectedVideoId)}
        />
      )}
    </View>
  );
}

// ========================================
// 🎨 STYLES (Design du premier code)
// ========================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
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
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    marginBottom: 12 
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
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  creatorNameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    flex: 1
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