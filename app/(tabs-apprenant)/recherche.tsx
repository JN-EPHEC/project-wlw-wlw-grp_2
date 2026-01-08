import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, 
  TouchableOpacity, Image, Platform, Modal, Dimensions, ActivityIndicator, Alert, FlatList, Clipboard, Linking,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import CommentModal from '../../components/CommentModal';

// --- IMPORTS FIREBASE ---
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  onSnapshot
} from 'firebase/firestore'; 
import { db, auth } from '../../firebaseConfig'; 

const { width, height } = Dimensions.get('window');

// --- CATÉGORIES ---
const CATEGORIES = [
  { id: 'all', label: 'Tout', icon: '🌟', emoji: '✨' },
  { id: 'digital-marketing', label: 'Marketing Digital', icon: '📱', emoji: '📱' },
  { id: 'ia', label: 'Intelligence Artificielle', icon: '🤖', emoji: '🤖' },
  { id: 'ecommerce', label: 'E-commerce', icon: '🛒', emoji: '🛒' },
  { id: 'design', label: 'Design', icon: '🎨', emoji: '🎨' },
  { id: 'dev', label: 'Développement', icon: '💻', emoji: '💻' },
  { id: 'business', label: 'Business', icon: '📊', emoji: '📊' },
];

const TOP_MEDALS = ['🥇', '🥈', '🥉'];

// --- TYPES ---
interface VideoData {
  id: string;
  title: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: string;
  description?: string;
  views?: number;
  likes?: number;
  comments?: number;
  createdAt?: any;
  tags?: string[];
  creatorBadge?: 'apprenant' | 'expert' | 'pro' | 'diplome';
}

interface CreatorData {
  id: string;
  name: string;
  photoURL?: string;
  followers?: number;
  videosCount?: number;
  bio?: string;
  category?: string;
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

export default function RechercheScreen() {
  const router = useRouter();
  
  // --- ÉTATS PRINCIPAUX ---
  const [activeTab, setActiveTab] = useState<'videos' | 'creators'>('videos');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all'); 
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [creators, setCreators] = useState<CreatorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [creatorsLoaded, setCreatorsLoaded] = useState(false);
  
  // --- ÉTATS VIDÉO SÉLECTIONNÉE ---
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<CreatorData | null>(null);
  
  // --- ÉTATS UTILISATEUR ---
  const [userProfile, setUserProfile] = useState<any>(null);
  const [likedVideosSet, setLikedVideosSet] = useState<Set<string>>(new Set());
  const [savedVideosSet, setSavedVideosSet] = useState<Set<string>>(new Set());
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [likingVideos, setLikingVideos] = useState<Set<string>>(new Set());
  
  // --- ÉTATS COMMENTAIRES ---
  const [showComments, setShowComments] = useState(false);
  
  // --- ÉTATS PARTAGE ---
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [selectedVideoForShare, setSelectedVideoForShare] = useState<VideoData | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);

  // --- UTILITAIRES ---
  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.id.toLowerCase() === category.toLowerCase());
    return cat ? cat.label : category;
  };

  const getCategoryEmoji = (category: string) => {
    const cat = CATEGORIES.find(c => c.id.toLowerCase() === category.toLowerCase());
    return cat ? cat.emoji : '📚';
  };

  // ✅ CORRECTION 1 : CHARGEMENT USER PROFILE EN PREMIER - PRIORITAIRE
  // ✅ CORRECTION 1 : CHARGEMENT USER PROFILE EN PREMIER - PRIORITAIRE
useEffect(() => {
  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      console.log('🔄 [RECHERCHE] Chargement données utilisateur...');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        
        console.log('✅ [RECHERCHE] Données utilisateur chargées:', {
          likedVideos: data.likedVideos?.length || 0,
          favorites: data.favorites?.length || 0,
          following: data.following?.length || 0
        });
        
        setUserProfile(data);
        
        // ✅ FIX : Typage explicite des Sets
        const likedSet = new Set<string>(data.likedVideos || []);
        const savedSet = new Set<string>(data.favorites || []);
        const followingList = data.following || [];
        
        setLikedVideosSet(likedSet);
        setSavedVideosSet(savedSet);
        setFollowedIds(followingList);
        
        console.log('🎯 [RECHERCHE] Sets initialisés:', {
          likedVideosSetSize: likedSet.size,
          savedVideosSetSize: savedSet.size,
          followedIdsLength: followingList.length
        });
      }
    } catch (error) {
      console.error('❌ [RECHERCHE] Erreur chargement profil:', error);
    }
  };
  
  fetchUserData();
}, []);

  // ✅ CORRECTION 2 : CHARGEMENT VIDÉOS APRÈS USER PROFILE
  useEffect(() => {
    // ⚠️ N'exécute PAS si userProfile n'est pas encore chargé
    if (!userProfile) {
      console.log('⏳ [RECHERCHE] En attente du profil utilisateur...');
      return;
    }
    
    const fetchVideos = async () => {
      try {
        console.log('🔄 [RECHERCHE] Chargement des vidéos...');
        setLoading(true);
        
        const snapshot = await getDocs(collection(db, "videos"));
        const videoList: VideoData[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as VideoData));

        const enriched = await Promise.all(videoList.map(async (v) => {
          const userDoc = await getDoc(doc(db, 'users', v.creatorId));
          const uData = userDoc.exists() ? userDoc.data() : {};
          
          // Détermine le badge
          let badge: 'apprenant' | 'expert' | 'pro' | 'diplome' = 'apprenant';
          
          if (uData.badge) {
            badge = uData.badge;
          } else if (uData.profileLevel) {
            switch (uData.profileLevel.toLowerCase()) {
              case 'expert': badge = 'expert'; break;
              case 'diplome':
              case 'diplomé': badge = 'diplome'; break;
              case 'pro':
              case 'professionnel': badge = 'pro'; break;
              default: badge = 'apprenant'; break;
            }
          } else if (uData.statut) {
            switch (uData.statut.toLowerCase()) {
              case 'expert': badge = 'expert'; break;
              case 'diplome':
              case 'diplomé': badge = 'diplome'; break;
              case 'pro':
              case 'professionnel': badge = 'pro'; break;
              default: badge = 'apprenant'; break;
            }
          } else if (uData.role === 'formateur') {
            badge = 'expert';
          }
          
          return {
            ...v,
            creatorName: userDoc.exists() ? (uData.prenom + " " + uData.nom) : v.creatorName,
            creatorAvatar: uData.photoURL || null,
            creatorBadge: badge
          };
        }));
        
        console.log('✅ [RECHERCHE] Vidéos chargées:', {
          totalVideos: enriched.length,
          likedVideosInSet: likedVideosSet.size,
          savedVideosInSet: savedVideosSet.size,
          followedCreators: followedIds.length
        });
        
        enriched.sort((a, b) => (b.likes || 0) + (b.views || 0) - ((a.likes || 0) + (a.views || 0)));
        setVideos(enriched);
      } catch (error) { 
        console.error('❌ [RECHERCHE] Erreur chargement vidéos:', error); 
      } finally { 
        setLoading(false); 
      }
    };
    
    fetchVideos();
  }, [userProfile]); // ✅ Se déclenche SEULEMENT quand userProfile est chargé

  // --- LISTENER TEMPS RÉEL VIDÉO SÉLECTIONNÉE ---
  useEffect(() => {
    if (!selectedVideo?.id) return;
    
    const unsubscribe = onSnapshot(
      doc(db, 'videos', selectedVideo.id),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          
          setSelectedVideo(prev => prev ? {
            ...prev,
            likes: data.likes || 0,
            comments: data.comments || 0
          } : null);
          
          // Met à jour aussi dans la liste
          setVideos(prev => prev.map(v => 
            v.id === selectedVideo.id 
              ? { ...v, likes: data.likes || 0, comments: data.comments || 0 }
              : v
          ));
        }
      }
    );
    
    return () => unsubscribe();
  }, [selectedVideo?.id]);

  // --- CHARGEMENT FORMATEURS ---
  useEffect(() => {
    if (activeTab === 'creators' && !creatorsLoaded) {
      const fetchCreators = async () => {
        try {
          setLoadingCreators(true);
          const q = query(collection(db, "users"), where("role", "==", "formateur"));
          const snapshot = await getDocs(q);
          const results = await Promise.all(snapshot.docs.map(async (d) => {
            const vSnap = await getDocs(query(collection(db, "videos"), where("creatorId", "==", d.id)));
            const fSnap = await getDocs(query(collection(db, "abonnements"), where("formateurId", "==", d.id)));
            return {
              id: d.id,
              name: d.data().prenom + " " + d.data().nom,
              photoURL: d.data().photoURL,
              followers: fSnap.size,
              videosCount: vSnap.size,
              category: d.data().specialite
            };
          }));
          setCreators(results);
          setCreatorsLoaded(true);
        } finally { setLoadingCreators(false); }
      };
      fetchCreators();
    }
  }, [activeTab]);

  // --- FILTRE UTILISATEURS PARTAGE ---
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

  // --- ACTIONS VIDÉO ---
  const handleLike = async (videoId: string) => {
    if (likingVideos.has(videoId)) return;
    
    const isLiked = likedVideosSet.has(videoId);
    
    console.log(`❤️ [RECHERCHE] Like action:`, {
      videoId,
      wasLiked: isLiked,
      willBeLiked: !isLiked
    });
    
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
      
      console.log(`✅ [RECHERCHE] Like synchronisé`);
    } catch (error) {
      console.error('❌ [RECHERCHE] Erreur like:', error);
      setLikedVideosSet(prev => { 
        const s = new Set(prev); 
        isLiked ? s.add(videoId) : s.delete(videoId); 
        return s; 
      });
      Alert.alert('Erreur', 'Impossible de synchroniser');
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
    
    console.log(`🔖 [RECHERCHE] Favorite action:`, {
      videoId,
      wasSaved: isSaved,
      willBeSaved: !isSaved
    });
    
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
      
      const isFollowing = followedIds.includes(creatorId);
      
      console.log(`👥 [RECHERCHE] Follow action:`, {
        creatorId,
        creatorName,
        wasFollowing: isFollowing,
        willFollow: !isFollowing
      });
      
      const userRef = doc(db, 'users', user.uid);
      const creatorRef = doc(db, 'users', creatorId);
      
      if (isFollowing) {
        await updateDoc(userRef, { following: arrayRemove(creatorId) });
        await updateDoc(creatorRef, { followers: arrayRemove(user.uid) });
        setFollowedIds(followedIds.filter(id => id !== creatorId));
        Alert.alert('✓', `Vous ne suivez plus ${creatorName}`);
      } else {
        await updateDoc(userRef, { following: arrayUnion(creatorId) });
        await updateDoc(creatorRef, { followers: arrayUnion(user.uid) });
        setFollowedIds([...followedIds, creatorId]);
        
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
      
      console.log(`✅ [RECHERCHE] Follow synchronisé`);
    } catch (error: any) { 
      console.error('❌ [RECHERCHE] Error follow:', error);
      Alert.alert('Erreur', 'Impossible de s\'abonner');
    }
  };

  const toggleFollow = async (formateurId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return Alert.alert("Erreur", "Connectez-vous");
    const q = query(collection(db, "abonnements"), where("apprenantId", "==", uid), where("formateurId", "==", formateurId));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, "abonnements"), { apprenantId: uid, formateurId, createdAt: serverTimestamp() });
      setFollowedIds([...followedIds, formateurId]);
    } else {
      await deleteDoc(doc(db, "abonnements", snap.docs[0].id));
      setFollowedIds(followedIds.filter(id => id !== formateurId));
    }
  };

  // --- COMMENTAIRES ---
  const handleCommentAdded = (videoId: string) => {
    // Le listener s'en occupe
  };

  const handleCommentDeleted = (videoId: string) => {
    // Le listener s'en occupe
  };

  // --- PARTAGE ---
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
        Alert.alert("Erreur", "WhatsApp n'est pas installé");
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

  // --- NAVIGATION ---
  const handleVideoPress = (video: VideoData) => {
    // ✅ Debug : Vérifier les états au moment du clic
    console.log(`🎬 [RECHERCHE] Ouverture vidéo:`, {
      videoId: video.id,
      videoTitle: video.title,
      creatorId: video.creatorId,
      isLiked: likedVideosSet.has(video.id),
      isSaved: savedVideosSet.has(video.id),
      isFollowing: followedIds.includes(video.creatorId),
      likedVideosSetSize: likedVideosSet.size,
      savedVideosSetSize: savedVideosSet.size
    });
    
    setSelectedVideo(video);
  };

  const handleCreatorPress = (creator: CreatorData) => {
    router.push(`/profile/${creator.id}`);
  };

  // --- FILTRES ---
  const filteredVideos = useMemo(() => videos.filter(v => 
    (selectedCat === 'all' || v.category === selectedCat) &&
    (v.title.toLowerCase().includes(search.toLowerCase()))
  ), [videos, search, selectedCat]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recherche</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBarContainer}>
            <TextInput 
              style={styles.input} 
              placeholder="Rechercher..."
              value={search} 
              onChangeText={setSearch}
            />
            <Ionicons name="search" size={20} color="#9333EA" />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="funnel" size={20} color={selectedCat !== 'all' ? "#9333EA" : "#18181B"} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          {['videos', 'creators'].map((tab) => (
            <TouchableOpacity key={tab} style={styles.tab} onPress={() => setActiveTab(tab as any)}>
              {activeTab === tab ? (
                <LinearGradient colors={['#7459f0', '#9333ea', '#242A65']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.activeTabGradient}>
                  <Text style={styles.activeTabText}>{tab === 'videos' ? 'Vidéos' : 'Formateurs'}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.tabText}>{tab === 'videos' ? 'Vidéos' : 'Formateurs'}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading || loadingCreators ? (
          <ActivityIndicator size="large" color="#9333EA" style={{marginTop: 50}} />
        ) : (
          activeTab === 'videos' ? (
            filteredVideos.map((video, index) => {
              // ✅ Debug : Logs pour chaque vidéo affichée
              const isLiked = likedVideosSet.has(video.id);
              const isSaved = savedVideosSet.has(video.id);
              const isFollowing = followedIds.includes(video.creatorId);
              
              return (
                <TouchableOpacity 
                  key={video.id} 
                  style={[styles.videoCard, index < 3 && search === '' && styles.topVideoCard]} 
                  onPress={() => handleVideoPress(video)}
                  activeOpacity={0.7}
                >
                  <View style={styles.emojiContainer}>
                    <Text style={styles.categoryEmoji}>{getCategoryEmoji(video.category)}</Text>
                    {index < 3 && search === '' && <Text style={styles.medalEmoji}>{TOP_MEDALS[index]}</Text>}
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.vTitle} numberOfLines={2}>{video.title}</Text>
                    <Text style={styles.vCreator}>Par {video.creatorName}</Text>
                    <View style={styles.categoryBadge}><Text style={styles.categoryText}>{getCategoryLabel(video.category)}</Text></View>
                    <Text style={styles.statText}>
                      👁️ {video.views}  
                      {isLiked ? '❤️' : '🤍'} {video.likes}
                      {isSaved ? ' 🔖' : ''}
                      {isFollowing ? ' ✅' : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#D4D4D8" />
                </TouchableOpacity>
              );
            })
          ) : (
            creators.map(creator => (
              <TouchableOpacity 
                key={creator.id} 
                style={styles.creatorCard} 
                onPress={() => handleCreatorPress(creator)}
                activeOpacity={0.7}
              >
                <Image source={{ uri: creator.photoURL }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.creatorName}>{creator.name}</Text>
                  <Text style={styles.creatorFollowers}>{creator.followers} abonnés • {creator.videosCount} vidéos</Text>
                </View>
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); toggleFollow(creator.id); }}>
                  <LinearGradient colors={followedIds.includes(creator.id) ? ['#FBA31A', '#F59E0B'] : ['#7459f0', '#9333ea', '#242A65']} style={styles.followBtn}>
                    <Text style={styles.followBtnText}>{followedIds.includes(creator.id) ? 'Suivi' : 'Suivre'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>

      {/* MODAL VIDÉO COMPLET - FORMAT CORRIGÉ */}
      <Modal 
        visible={selectedVideo !== null} 
        animationType="slide" 
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedVideo(null)}
      >
        {selectedVideo && (
          <View style={styles.videoModalContainer}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setSelectedVideo(null)}
            >
              <LinearGradient 
                colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)']} 
                style={styles.closeButtonGradient}
              >
                <Ionicons name="close" size={28} color="white" />
              </LinearGradient>
            </TouchableOpacity>

            <Video
              source={{ uri: selectedVideo.videoUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              useNativeControls={false}
            />

            <TouchableWithoutFeedback>
              <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 1 }} />
            </TouchableWithoutFeedback>

            <LinearGradient 
              colors={['transparent', 'rgba(0,0,0,0.85)']} 
              style={styles.videoInfoOverlay}
            >
              <View style={styles.creatorInfo}>
                <TouchableOpacity 
                  style={styles.creatorAvatarContainer}
                  onPress={() => {
                    setSelectedVideo(null);
                    router.push(`/profile/${selectedVideo.creatorId}`);
                  }}
                >
                  {selectedVideo.creatorAvatar ? (
                    <Image source={{ uri: selectedVideo.creatorAvatar }} style={styles.creatorAvatar} />
                  ) : (
                    <View style={[styles.creatorAvatar, {backgroundColor: '#7459f0', justifyContent: 'center', alignItems: 'center'}]}>
                      <Ionicons name="person" size={24} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
                
                <View style={{flex: 1}}>
                  <View style={styles.nameWithBadge}>
                    <Text style={styles.modalCreatorName}>@{selectedVideo.creatorName}</Text>
                    
                    {selectedVideo.creatorBadge === 'expert' && (
                      <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>EXPERT</Text>
                      </View>
                    )}
                    
                    {selectedVideo.creatorBadge === 'diplome' && (
                      <View style={[styles.badgeContainer, { backgroundColor: '#3B82F6' }]}>
                        <Text style={styles.badgeText}>DIPLOMÉ</Text>
                      </View>
                    )}
                    
                    {selectedVideo.creatorBadge === 'pro' && (
                      <View style={[styles.badgeContainer, { backgroundColor: '#10B981' }]}>
                        <Text style={styles.badgeText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  
                  {selectedVideo.creatorId !== auth.currentUser?.uid && !followedIds.includes(selectedVideo.creatorId) && (
                    <TouchableOpacity 
                      onPress={() => handleFollow(selectedVideo.creatorId, selectedVideo.creatorName)}
                      style={{marginTop: 4}}
                    >
                      <LinearGradient
                        colors={['#7459f0', '#9333ea', '#242A65']}
                        start={{x:0, y:0}}
                        end={{x:1, y:0}}
                        style={styles.miniFollowButton}
                      >
                        <Ionicons name="add" size={12} color="#fff" />
                        <Text style={styles.miniFollowText}>Suivre</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={styles.modalVideoTitle}>{selectedVideo.title}</Text>
              {selectedVideo.description && (
                <Text style={styles.modalDescription} numberOfLines={2}>
                  {selectedVideo.description}
                </Text>
              )}
            </LinearGradient>

            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                onPress={() => {
                  setSelectedVideo(null);
                  router.push(`/profile/${selectedVideo.creatorId}`);
                }}
              >
                <View style={styles.actionCircleWrapper}>
                  {selectedVideo.creatorAvatar ? (
                    <Image source={{ uri: selectedVideo.creatorAvatar }} style={styles.actionProfileImg} />
                  ) : (
                    <View style={[styles.actionProfileImg, {backgroundColor: '#7459f0', justifyContent: 'center', alignItems: 'center'}]}>
                      <Ionicons name="person" size={20} color="white" />
                    </View>
                  )}
                  <View style={[styles.plusBadge, { backgroundColor: followedIds.includes(selectedVideo.creatorId) ? '#10B981' : '#EF4444' }]}>
                    <Ionicons name={followedIds.includes(selectedVideo.creatorId) ? "checkmark" : "add"} size={10} color="white" />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => handleLike(selectedVideo.id)}
              >
                <LinearGradient 
                  colors={likedVideosSet.has(selectedVideo.id) ? ['#ef4444', '#dc2626'] : ['#7459f0', '#242A65']} 
                  style={styles.actionCircle}
                >
                  <Ionicons 
                    name={likedVideosSet.has(selectedVideo.id) ? "heart" : "heart-outline"} 
                    size={24} 
                    color="white" 
                  />
                </LinearGradient>
                <Text style={styles.actionCount}>{selectedVideo.likes || 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => setShowComments(true)}
              >
                <LinearGradient 
                  colors={['#7459f0', '#242A65']} 
                  style={styles.actionCircle}
                >
                  <Ionicons name="chatbubble-outline" size={22} color="white" />
                </LinearGradient>
                <Text style={styles.actionCount}>{selectedVideo.comments || 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => handleFavorite(selectedVideo.id)}
              >
                <LinearGradient 
                  colors={savedVideosSet.has(selectedVideo.id) ? ['#FBA31A', '#F59E0B'] : ['#7459f0', '#242A65']} 
                  style={styles.actionCircle}
                >
                  <Ionicons 
                    name={savedVideosSet.has(selectedVideo.id) ? "bookmark" : "bookmark-outline"} 
                    size={22} 
                    color="white" 
                  />
                </LinearGradient>
                <Text style={styles.actionCount}>
                  {savedVideosSet.has(selectedVideo.id) ? 'Sauvé' : 'Sauver'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => handleShare(selectedVideo)}
              >
                <LinearGradient 
                  colors={['#7459f0', '#242A65']} 
                  style={styles.actionCircle}
                >
                  <Ionicons name="share-social-outline" size={22} color="white" />
                </LinearGradient>
                <Text style={styles.actionCount}>Partager</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* MODAL COMMENTAIRES */}
      {selectedVideo && (
        <CommentModal 
          visible={showComments} 
          videoId={selectedVideo.id} 
          creatorId={selectedVideo.creatorId}
          videoTitle={selectedVideo.title}
          onClose={() => setShowComments(false)}
          onCommentAdded={() => handleCommentAdded(selectedVideo.id)}
          onCommentDeleted={() => handleCommentDeleted(selectedVideo.id)}
        />
      )}

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
                start={{x:0, y:0}}
                end={{x:1, y:0}}
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
                  style={styles.shareCloseButton}
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
                    start={{x:0, y:0}}
                    end={{x:1, y:1}}
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
                    start={{x:0, y:0}}
                    end={{x:1, y:1}}
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
                    start={{x:0, y:0}}
                    end={{x:1, y:1}}
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
            start={{x:0, y:0}}
            end={{x:1, y:0}}
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
                style={styles.searchInputModal}
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
                      start={{x:0, y:0}}
                      end={{x:1, y:1}}
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
                  start={{x:0, y:0}}
                  end={{x:1, y:1}}
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

      {/* MODAL FILTRES */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrer par sujet</Text>
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.filterOption, selectedCat === cat.id && {backgroundColor: '#F3E8FF'}]} 
                onPress={() => { setSelectedCat(cat.id); setShowFilterModal(false); }}
              >
                <Text style={{ fontSize: 20 }}>{cat.icon}  {cat.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={{marginTop: 20, alignSelf: 'center'}}>
              <Text style={{color:'#9333EA', fontWeight:'bold'}}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 15 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  searchBarContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, height: 45, borderWidth: 1, borderColor: '#E5E7EB' },
  input: { flex: 1, fontSize: 16 },
  filterBtn: { width: 45, height: 45, backgroundColor: '#F9FAFB', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 15 },
  tab: { flex: 1, alignItems: 'center', borderRadius: 10, overflow: 'hidden' },
  activeTabGradient: { width: '100%', paddingVertical: 8, alignItems: 'center' },
  tabText: { fontWeight: '600', color: '#71717A', paddingVertical: 8 },
  activeTabText: { color: '#FFF', fontWeight: '600' },
  scrollContent: { padding: 20 },
  videoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
  topVideoCard: { borderWidth: 2, borderColor: '#7459f0', backgroundColor: '#FEFBFF' },
  emojiContainer: { width: 60, height: 60, marginRight: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8F6', borderRadius: 12 },
  categoryEmoji: { fontSize: 30 },
  medalEmoji: { position: 'absolute', top: -5, right: -5, fontSize: 18 },
  videoInfo: { flex: 1 },
  vTitle: { fontWeight: 'bold', fontSize: 14, color: '#1F2937' },
  vCreator: { color: '#71717A', fontSize: 12 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#E9D5FF', marginVertical: 5 },
  categoryText: { fontSize: 10, fontWeight: 'bold', color: '#7459f0' },
  statText: { fontSize: 11, color: '#6B7280' },
  creatorCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  creatorName: { fontWeight: 'bold', fontSize: 15 },
  creatorFollowers: { color: '#71717A', fontSize: 12 },
  followBtn: { paddingHorizontal: 15, paddingVertical: 7, borderRadius: 20 },
  followBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  
  videoModalContainer: { flex: 1, backgroundColor: '#000' },
  closeButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 100 },
  closeButtonGradient: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  videoInfoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 100, padding: 20, paddingBottom: 40, zIndex: 20 },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  creatorAvatarContainer: { marginRight: 12 },
  creatorAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#fff' },
  nameWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeContainer: { backgroundColor: '#FBA31A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#000', fontSize: 9, fontWeight: '900' },
  miniFollowButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start' },
  miniFollowText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  modalVideoTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 6 },
  modalCreatorName: { fontSize: 16, color: '#FFF', fontWeight: '700' },
  modalDescription: { fontSize: 14, color: '#FFF', opacity: 0.8, lineHeight: 20 },
  
  actionsContainer: { position: 'absolute', bottom: 100, right: 16, gap: 20, alignItems: 'center', zIndex: 50 },
  actionCircleWrapper: { position: 'relative', marginBottom: 8 },
  actionProfileImg: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#fff' },
  plusBadge: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCircle: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  actionCount: { color: '#fff', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  
  shareOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  shareContentWrapper: { width: '100%', maxWidth: 400 },
  shareContent: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' },
  shareHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20 },
  shareHeaderContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  shareCloseButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  videoPreview: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  videoPreviewIcon: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  videoPreviewInfo: { flex: 1 },
  videoPreviewTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  videoPreviewCreator: { fontSize: 13, color: '#6B7280' },
  shareOptionsGrid: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 30, gap: 20, justifyContent: 'space-around' },
  shareOptionCard: { alignItems: 'center', gap: 12, flex: 1 },
  shareIconGradient: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  shareOptionLabel: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },
  
  usersListContainer: { flex: 1, backgroundColor: '#F8F8F6' },
  usersListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
  usersListTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  searchContainer: { paddingHorizontal: 20, marginVertical: 16 },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  searchInputModal: { flex: 1, fontSize: 15, color: '#1F2937' },
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
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  filterOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', borderRadius: 10 }
});