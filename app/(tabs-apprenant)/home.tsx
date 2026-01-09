import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, useWindowDimensions, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, TouchableWithoutFeedback, StatusBar, Image,
  Modal, TextInput, Platform, Linking, FlatList, Clipboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
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
  
  // ✅ AJOUT : État pour tracker les vidéos déjà comptées
  const [countedVideos, setCountedVideos] = useState<Set<string>>(new Set());
  
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

  // ✅ MODIFIÉ : Ne plus ajouter de minutes ici
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

  // ✅ NOUVELLE FONCTION : Compter les minutes quand la vidéo est vue
  const handleVideoCompleted = async (videoId: string, durationMillis: number) => {
    const user = auth.currentUser;
    if (!user) return;
    
    // ✅ Vérifier si déjà comptée
    if (countedVideos.has(videoId)) {
      return;
    }
    
    try {
      // Convertir millisecondes en minutes
      const videoDurationInMinutes = durationMillis / 60000;
      
      // Récupérer les stats actuelles
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const currentTotalMinutes = userDoc.exists() 
        ? (userDoc.data().stats?.totalMinutes || 0) 
        : 0;
      
      // ✅ Mettre à jour uniquement les minutes
      await updateDoc(doc(db, 'users', user.uid), { 
        'stats.totalMinutes': currentTotalMinutes + videoDurationInMinutes
      });
      
      // ✅ Marquer comme comptée
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

  // ========================================
  // 🔄 RENDU
  // ========================================

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#7459f0" />
      </View>
    );
  }

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
      >
        {videos.map((video, index) => {
          const isLiked = likedVideosSet.has(video.id);
          const isSaved = savedVideosSet.has(video.id);
          const isFollowing = userProfile?.following?.includes(video.creatorId);
          const currentUserId = auth.currentUser?.uid;
          const isMyVideo = video.creatorId === currentUserId;
          
          return (
            <View key={video.id} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
              <Video
                ref={(ref) => { videoRefs.current[video.id] = ref; }}
                source={{ uri: video.videoUrl }}
                resizeMode={ResizeMode.COVER}
                shouldPlay={index === currentIndex && isPlaying}
                isLooping
                isMuted={Platform.OS === 'web'} 
                style={StyleSheet.absoluteFillObject}
                onPlaybackStatusUpdate={(s) => {
                  if (index === currentIndex && s.isLoaded) {
                    setProgress(s.positionMillis);
                    setDuration(s.durationMillis || 0);
                    
                    // ✅ AJOUT : Compter à 90% de progression
                    if (s.durationMillis && s.positionMillis >= s.durationMillis * 0.9) {
                      handleVideoCompleted(video.id, s.durationMillis);
                    }
                  }
                }}
              />
              
              <TouchableWithoutFeedback onPress={togglePlayPause}>
                <View style={styles.touchableOverlay}>
                  {!isPlaying && index === currentIndex && (
                    <Ionicons name="play" size={80} color="rgba(255,255,255,0.8)" />
                  )}
                </View>
              </TouchableWithoutFeedback>

              <LinearGradient 
                colors={['transparent', 'rgba(0,0,0,0.85)']} 
                style={styles.bottomGradient} 
              />

              {index === currentIndex && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBg}>
                    <LinearGradient 
                      colors={['#7459f0', '#9333ea', '#242A65']} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 0 }} 
                      style={[
                        styles.progressFill, 
                        { width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }
                      ]} 
                    />
                  </View>
                </View>
              )}

              <View style={styles.leftSide}>
                <View style={styles.creatorHeader}>
                  <TouchableOpacity 
                    style={styles.avatarWrapper} 
                    onPress={() => router.push(`/profile/${video.creatorId}`)}
                  >
                    <Image 
                      source={{ uri: video.creatorAvatar || 'https://via.placeholder.com/150' }} 
                      style={styles.avatar} 
                    />
                  </TouchableOpacity>
                  
                  <View style={styles.creatorTextInfo}>
                    <View style={styles.nameRow}>
                      <TouchableOpacity 
                        onPress={() => router.push(`/profile/${video.creatorId}`)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.creatorName}>
                          @{video.creatorName}
                          {isMyVideo && <Text style={styles.meLabel}> (Moi)</Text>}
                        </Text>
                      </TouchableOpacity>
                      
                      {video.creatorBadge === 'expert' && (
                        <View style={styles.expertBadge}>
                          <Text style={styles.expertText}>EXPERT</Text>
                        </View>
                      )}
                      
                      {video.creatorBadge === 'diplome' && (
                        <View style={[styles.expertBadge, { backgroundColor: '#3B82F6' }]}>
                          <Text style={styles.expertText}>DIPLOMÉ</Text>
                        </View>
                      )}
                      
                      {video.creatorBadge === 'pro' && (
                        <View style={[styles.expertBadge, { backgroundColor: '#10B981' }]}>
                          <Text style={styles.expertText}>PRO</Text>
                        </View>
                      )}
                    </View>
                    
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
                          style={styles.followButton}
                        >
                          <Ionicons name="add" size={16} color="#fff" />
                          <Text style={styles.followButtonText}>Suivre</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                
                <Text style={styles.videoTitle}>{video.title}</Text>
                <Text style={styles.videoDesc} numberOfLines={2}>
                  {video.description}
                </Text>
              </View>

              <View style={styles.rightSide}>
                <TouchableOpacity 
                  style={styles.profileAction} 
                  onPress={() => router.push(`/profile/${video.creatorId}`)}
                >
                  <View style={styles.profileCircle}>
                    <Image 
                      source={{ uri: video.creatorAvatar || 'https://via.placeholder.com/150' }} 
                      style={styles.profileImg} 
                    />
                  </View>
                  <View style={[
                    styles.plusBadge, 
                    { backgroundColor: isFollowing ? '#10B981' : '#EF4444' }
                  ]}>
                    <Ionicons 
                      name={isFollowing ? "checkmark" : "add"} 
                      size={12} 
                      color="white" 
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => handleLike(video.id)}
                >
                  <LinearGradient 
                    colors={isLiked ? ['#ef4444', '#dc2626'] : ['#7459f0', '#242A65']} 
                    style={styles.actionCircle}
                  >
                    <Ionicons 
                      name={isLiked ? "heart" : "heart-outline"} 
                      size={28} 
                      color="white" 
                    />
                  </LinearGradient>
                  <Text style={styles.actionCount}>{video.likes}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => { 
                    setSelectedVideoId(video.id); 
                    setShowComments(true); 
                  }}
                >
                  <LinearGradient 
                    colors={['#7459f0', '#242A65']} 
                    style={styles.actionCircle}
                  >
                    <Ionicons name="chatbubble-outline" size={26} color="white" />
                  </LinearGradient>
                  <Text style={styles.actionCount}>{video.comments || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => handleFavorite(video.id)}
                >
                  <LinearGradient 
                    colors={isSaved ? ['#FBA31A', '#F59E0B'] : ['#7459f0', '#242A65']} 
                    style={styles.actionCircle}
                  >
                    <Ionicons 
                      name={isSaved ? "bookmark" : "bookmark-outline"} 
                      size={26} 
                      color="white" 
                    />
                  </LinearGradient>
                  <Text style={styles.actionCount}>{isSaved ? 'Favoris' : 'Sauver'}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => handleShare(video)}
                >
                  <LinearGradient 
                    colors={['#7459f0', '#242A65']} 
                    style={styles.actionCircle}
                  >
                    <Ionicons name="share-social-outline" size={26} color="white" />
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
                     item.badge === 'pro' ? '⭐ Pro' : 
                     '🎓 Apprenant'}
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
// 🎨 STYLES
// ========================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A2E' },
  touchableOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', zIndex: 10 },
  progressContainer: { position: 'absolute', bottom: 90, left: 20, right: 20, zIndex: 40 },
  progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  leftSide: { position: 'absolute', bottom: 120, left: 20, right: 100, zIndex: 30 },
  creatorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatarWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow:'hidden' },
  avatar: { width: '100%', height: '100%' },
  creatorTextInfo: { gap: 6, marginLeft: 12, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  creatorName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  meLabel: { fontSize: 12, color: '#aaa', fontWeight: '500' },
  expertBadge: { backgroundColor: '#FBA31A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  expertText: { color: '#000', fontSize: 9, fontWeight: '900' },
  followButtonContainer: { marginTop: 4 },
  followButton: {
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
    alignSelf: 'flex-start',
  },
  followButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  videoTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  videoDesc: { color: '#fff', fontSize: 14, lineHeight: 20 },
  rightSide: { position: 'absolute', bottom: 120, right: 16, gap: 24, alignItems: 'center', zIndex: 30 },
  profileAction: { marginBottom: 8, position: 'relative' },
  profileCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  profileImg: { width: '100%', height: '100%' },
  plusBadge: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '600' },
  shareOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  shareContentWrapper: { width: '100%', maxWidth: 400 },
  shareContent: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  shareHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20 },
  shareHeaderContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  videoPreview: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  videoPreviewIcon: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  videoPreviewInfo: { flex: 1 },
  videoPreviewTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  videoPreviewCreator: { fontSize: 13, color: '#6B7280' },
  shareOptionsGrid: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 30, gap: 20, justifyContent: 'space-around' },
  shareOptionCard: { alignItems: 'center', gap: 12, flex: 1 },
  shareIconGradient: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 12 },
  shareOptionLabel: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },
  usersListContainer: { flex: 1, backgroundColor: '#F8F8F6' },
  usersListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
  usersListTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  searchContainer: { paddingHorizontal: 20, marginVertical: 16 },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937' },
  userItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  userAvatarWrapper: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden' },
  userAvatarImg: { width: '100%', height: '100%' },
  userAvatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  userRole: { fontSize: 13, color: '#6B7280' },
  sendIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  emptyUsersList: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 },
  emptyUsersText: { fontSize: 16, color: '#9CA3AF', marginTop: 16, fontWeight: '500' },
});