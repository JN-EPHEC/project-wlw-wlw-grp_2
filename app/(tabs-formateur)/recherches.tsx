import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, 
  TouchableOpacity, Image, Platform, Modal, Dimensions, ActivityIndicator, Alert, FlatList, Clipboard, Linking,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av'; 
import { LinearGradient } from 'expo-linear-gradient';
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

// --- CATÉGORIES AVEC EMOJIS AMÉLIORÉS ---
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
  // --- ÉTATS PRINCIPAUX ---
  const [activeTab, setActiveTab] = useState<'videos' | 'creators'>('videos');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<string[]>([]);
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
  const [creatorVideos, setCreatorVideos] = useState<VideoData[]>([]);
  
  // --- ÉTATS UTILISATEUR ---
  const [userProfile, setUserProfile] = useState<any>(null);
  const [likedVideosSet, setLikedVideosSet] = useState<Set<string>>(new Set());
  const [savedVideosSet, setSavedVideosSet] = useState<Set<string>>(new Set());
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [likingVideos, setLikingVideos] = useState<Set<string>>(new Set());
  
  // --- ÉTATS COMMENTAIRES ---
  const [showComments, setShowComments] = useState(false);
  
  // --- ÉTATS VIDÉO ---
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<Video | null>(null);
  
  // --- ÉTATS PARTAGE ---
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [selectedVideoForShare, setSelectedVideoForShare] = useState<VideoData | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);

  // --- FONCTIONS UTILITAIRES ---
  const getCategoryLabel = (category: string): string => {
    const cat = CATEGORIES.find(c => c.id.toLowerCase() === category.toLowerCase());
    return cat ? cat.label : category;
  };

  const getCategoryEmoji = (category: string): string => {
    const cat = CATEGORIES.find(c => c.id.toLowerCase() === category.toLowerCase());
    return cat ? cat.emoji : '📚';
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

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) { 
        await videoRef.current.pauseAsync(); 
        setIsPlaying(false); 
      } else { 
        await videoRef.current.playAsync(); 
        setIsPlaying(true); 
      }
    }
  };

  // ✅ CHARGEMENT USER PROFILE EN PREMIER
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
          
          const likedSet = new Set<string>(data.likedVideos || []);
          const savedSet = new Set<string>(data.favorites || []);
          const followingList = data.following || [];
          
          setLikedVideosSet(likedSet);
          setSavedVideosSet(savedSet);
          setFollowedIds(followingList);
        }
      } catch (error) {
        console.error('❌ [RECHERCHE] Erreur chargement profil:', error);
      }
    };
    
    fetchUserData();
  }, []);

  // --- CHARGEMENT VIDÉOS FIREBASE ---
  useEffect(() => {
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
        
        enriched.sort((a, b) => (b.likes || 0) + (b.views || 0) - ((a.likes || 0) + (a.views || 0)));
        setVideos(enriched);
      } catch (error) { 
        console.error('❌ [RECHERCHE] Erreur chargement vidéos:', error); 
      } finally { 
        setLoading(false); 
      }
    };
    
    fetchVideos();
  }, [userProfile]);

  // --- LISTENER TEMPS RÉEL VIDÉO SÉLECTIONNÉE ---
  useEffect(() => {
    if (!selectedVideo?.id) return;
    
    // Réinitialiser la lecture quand une nouvelle vidéo est sélectionnée
    setIsPlaying(true);
    
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

  // --- CHARGEMENT CRÉATEURS ---
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
              category: d.data().specialite,
              bio: d.data().bio
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

  // --- CHARGEMENT VIDÉOS D'UN CRÉATEUR ---
  const loadCreatorVideos = async (creatorId: string) => {
    try {
      const videosRef = collection(db, "videos");
      const q = query(videosRef, where("creatorId", "==", creatorId));
      
      const querySnapshot = await getDocs(q);
      const videoList: VideoData[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        videoList.push({
          id: docSnap.id,
          title: data.title || 'Sans titre',
          creatorId: data.creatorId || '',
          creatorName: data.creatorName || 'Inconnu',
          creatorAvatar: data.creatorAvatar,
          videoUrl: data.videoUrl || '',
          thumbnailUrl: data.thumbnailUrl,
          category: data.category || 'general',
          description: data.description || '',
          views: data.views || 0,
          likes: data.likes || 0,
          comments: data.comments || 0,
          tags: data.tags || []
        });
      });
      
      setCreatorVideos(videoList);
    } catch (error) {
      console.error("Erreur chargement vidéos créateur:", error);
    }
  };

  // --- ACTIONS VIDÉO ---
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
      console.error('❌ Erreur like:', error);
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
    } catch (error: any) { 
      console.error('❌ Error follow:', error);
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
    console.log(`🎬 [RECHERCHE] Ouverture vidéo:`, {
      videoId: video.id,
      isLiked: likedVideosSet.has(video.id),
      isSaved: savedVideosSet.has(video.id),
      isFollowing: followedIds.includes(video.creatorId)
    });
    
    setSelectedVideo(video);
  };

  const handleCreatorClick = async (creator: CreatorData) => {
    setSelectedCreator(creator);
    await loadCreatorVideos(creator.id);
  };

  // --- ACTIONS RECHERCHE ---
  const handleSearch = () => {
    if (search.trim().length > 0) {
      setHistory(prev => [search, ...prev.filter(item => item !== search)].slice(0, 5));
    }
  };

  const deleteFromHistory = (itemToDelete: string) => {
    setHistory(prev => prev.filter(item => item !== itemToDelete));
  };

  // --- FILTRES ---
  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const searchLower = search.toLowerCase().trim();
      
      const matchesSearch = searchLower === '' ||
        v.title.toLowerCase().includes(searchLower) ||
        v.description?.toLowerCase().includes(searchLower) ||
        v.creatorName.toLowerCase().includes(searchLower) ||
        v.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
        getCategoryLabel(v.category).toLowerCase().includes(searchLower);

      const matchesCategory = selectedCat === 'all' || 
        v.category.toLowerCase() === selectedCat.toLowerCase() ||
        v.category.toLowerCase().includes(selectedCat.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [videos, search, selectedCat]);

  const filteredCreators = useMemo(() => {
    return creators.filter(c => {
      const searchLower = search.toLowerCase().trim();
      
      const matchesSearch = searchLower === '' ||
        c.name.toLowerCase().includes(searchLower) ||
        c.bio?.toLowerCase().includes(searchLower) ||
        c.category?.toLowerCase().includes(searchLower);
      
      const matchesCategory = selectedCat === 'all' || 
        c.category?.toLowerCase() === selectedCat.toLowerCase() ||
        c.category?.toLowerCase().includes(selectedCat.toLowerCase());
      
      return matchesSearch && matchesCategory;
    });
  }, [creators, search, selectedCat]);

  const activeCategoryLabel = CATEGORIES.find(c => c.id === selectedCat)?.label || 'Filtres';

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Recherche</Text>
        
        <View style={styles.searchRow}>
          <View style={styles.searchBarContainer}>
            <TextInput 
              style={styles.input} 
              placeholder={activeTab === 'videos' ? "Rechercher (Titre, Sujet...)" : "Rechercher un formateur..."}
              value={search} 
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity onPress={handleSearch} style={{padding: 5}}>
              <Ionicons name="search" size={20} color="#9333EA" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="funnel" size={20} color={selectedCat !== 'all' ? "#9333EA" : "#18181B"} />
            {selectedCat !== 'all' && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* TABS */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setActiveTab('videos')}
            activeOpacity={0.8}
          >
            {activeTab === 'videos' ? (
              <LinearGradient
                colors={['#7459f0', '#9333ea', '#242A65']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.activeTabGradient}
              >
                <Text style={styles.activeTabText}>Vidéos</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.tabText}>Vidéos</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setActiveTab('creators')}
            activeOpacity={0.8}
          >
            {activeTab === 'creators' ? (
              <LinearGradient
                colors={['#7459f0', '#9333ea', '#242A65']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.activeTabGradient}
              >
                <Text style={styles.activeTabText}>Formateurs</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.tabText}>Formateurs</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardDismissMode="on-drag">
        
        {selectedCat !== 'all' && (
          <View style={styles.activeFilterBadge}>
            <Text style={styles.activeFilterText}>Filtre : {activeCategoryLabel}</Text>
            <TouchableOpacity onPress={() => setSelectedCat('all')}>
              <Ionicons name="close-circle" size={18} color="#9333EA" style={{marginLeft: 5}}/>
            </TouchableOpacity>
          </View>
        )}

        {loading && activeTab === 'videos' ? (
          <ActivityIndicator size="large" color="#9333EA" style={{marginTop: 50}} />
        ) : loadingCreators && activeTab === 'creators' ? (
          <ActivityIndicator size="large" color="#9333EA" style={{marginTop: 50}} />
        ) : (
          <>
            {activeTab === 'videos' && (
              <>
                <Text style={styles.sectionTitle}>
                  {search ? `Résultats (${filteredVideos.length})` : "🔥 Tendances"}
                </Text>
                
                {filteredVideos.length === 0 ? (
                  <View style={{alignItems: 'center', marginTop: 30}}>
                    <Ionicons name="search-outline" size={50} color="#D1D5DB" />
                    <Text style={styles.emptyText}>
                      {search ? `Aucune vidéo trouvée pour "${search}"` : "Aucune vidéo disponible"}
                    </Text>
                  </View>
                ) : (
                  filteredVideos.map((video, index) => {
                    const isTopThree = search === '' && index < 3;
                    
                    return (
                      <TouchableOpacity 
                        key={video.id} 
                        style={[
                          styles.videoCard,
                          isTopThree && styles.topVideoCard
                        ]}
                        onPress={() => handleVideoPress(video)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.emojiContainer}>
                          <Text style={styles.categoryEmoji}>
                            {getCategoryEmoji(video.category)}
                          </Text>
                          {isTopThree && (
                            <Text style={styles.medalEmoji}>{TOP_MEDALS[index]}</Text>
                          )}
                        </View>
                        
                        <View style={styles.videoInfo}>
                          <Text style={styles.vTitle} numberOfLines={2}>{video.title}</Text>
                          <Text style={styles.vCreator}>Par {video.creatorName}</Text>
                          
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{getCategoryLabel(video.category)}</Text>
                          </View>
                          
                          <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                              <Text style={styles.statText}>👁️ {video.views?.toLocaleString() || 0}</Text>
                            </View>
                            <View style={styles.statItem}>
                              <Text style={styles.statText}>❤️ {video.likes?.toLocaleString() || 0}</Text>
                            </View>
                          </View>
                        </View>

                        <Ionicons name="chevron-forward" size={20} color="#D4D4D8" />
                      </TouchableOpacity>
                    );
                  })
                )}
                
                {history.length > 0 && search === '' && (
                  <View style={styles.historySection}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.sectionTitle}>📜 Recherches récentes</Text>
                      <TouchableOpacity onPress={() => setHistory([])}>
                        <Text style={styles.clearAllText}>Tout effacer</Text>
                      </TouchableOpacity>
                    </View>
                    {history.map((item, index) => (
                      <View key={index} style={styles.historyRow}>
                        <TouchableOpacity 
                          style={styles.historyClickable} 
                          onPress={() => setSearch(item)}
                        >
                          <Ionicons name="time-outline" size={20} color="#A1A1AA" />
                          <Text style={styles.historyText}>{item}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteFromHistory(item)}>
                          <Ionicons name="close" size={18} color="#A1A1AA" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {activeTab === 'creators' && (
              <>
                <Text style={styles.sectionTitle}>
                  {search ? `Résultats (${filteredCreators.length})` : "⭐ Formateurs suggérés"}
                </Text>
                {filteredCreators.length === 0 ? (
                  <View style={{alignItems: 'center', marginTop: 30}}>
                    <Ionicons name="people-outline" size={50} color="#D1D5DB" />
                    <Text style={styles.emptyText}>
                      {search ? "Aucun formateur trouvé" : "Aucun formateur disponible"}
                    </Text>
                  </View>
                ) : (
                  filteredCreators.map(creator => (
                    <TouchableOpacity 
                      key={creator.id} 
                      style={styles.creatorCard}
                      onPress={() => handleCreatorClick(creator)}
                      activeOpacity={0.7}
                    >
                      <Image 
                        source={{ uri: creator.photoURL || 'https://via.placeholder.com/150' }} 
                        style={styles.avatar} 
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.creatorName}>{creator.name}</Text>
                        <Text style={styles.creatorFollowers}>
                          {creator.followers?.toLocaleString() || 0} abonnés • {creator.videosCount || 0} vidéos
                        </Text>
                        {creator.category && (
                          <Text style={styles.creatorCategory}>
                            {getCategoryEmoji(creator.category)} {getCategoryLabel(creator.category)}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.followBtnWrapper}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleFollow(creator.id);
                        }}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={followedIds.includes(creator.id) ? ['#FBA31A', '#F59E0B'] : ['#7459f0', '#9333ea', '#242A65']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.followBtn}
                        >
                          <Text style={styles.followBtnText}>
                            {followedIds.includes(creator.id) ? 'Suivi' : 'Suivre'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* MODAL VIDÉO PLEIN ÉCRAN - FORMAT TIKTOK */}
      <Modal 
        visible={selectedVideo !== null} 
        animationType="slide" 
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setSelectedVideo(null);
          setIsPlaying(true);
          if (videoRef.current) {
            videoRef.current.pauseAsync();
          }
        }}
      >
        {selectedVideo && (
          <View style={styles.videoModalContainer}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => {
                setSelectedVideo(null);
                setIsPlaying(true);
                if (videoRef.current) {
                  videoRef.current.pauseAsync();
                }
              }}
            >
              <LinearGradient 
                colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)']} 
                style={styles.closeButtonGradient}
              >
                <Ionicons name="close" size={28} color="white" />
              </LinearGradient>
            </TouchableOpacity>

            <Video
              ref={videoRef}
              source={{ uri: selectedVideo.videoUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode={ResizeMode.COVER}
              shouldPlay={isPlaying}
              isLooping
              useNativeControls={false}
            />

            <TouchableWithoutFeedback onPress={togglePlayPause}>
              <View style={styles.touchableOverlay}>
                {!isPlaying && (
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
              colors={['transparent', 'rgba(0,0,0,0.85)']} 
              style={styles.videoInfoOverlay}
            >
              <View style={styles.creatorInfo}>
                <TouchableOpacity 
                  style={styles.creatorAvatarContainer}
                  onPress={() => {
                    setSelectedVideo(null);
                    // Ouvrir le profil du créateur
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
                    
                    {(() => {
                      const badgeInfo = getBadgeInfo(selectedVideo.creatorBadge);
                      if (!badgeInfo) return null;
                      
                      return (
                        <LinearGradient
                          colors={[badgeInfo.color, badgeInfo.color]}
                          style={styles.badgeContainerModal}
                        >
                          <Ionicons name={badgeInfo.icon as any} size={10} color="#fff" />
                          <Text style={styles.badgeTextModal}>{badgeInfo.label}</Text>
                        </LinearGradient>
                      );
                    })()}
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

            {/* ✅ NOUVEAUX BOUTONS STYLE TIKTOK */}
            <View style={styles.rightSideActions}>
              <TouchableOpacity 
                style={styles.avatarLargeAction} 
                onPress={() => {
                  setSelectedVideo(null);
                  // Navigation vers le profil du créateur
                }}
              >
                <LinearGradient
                  colors={['#7459f0', '#242A65']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarCircleBorder}
                >
                  <View style={styles.avatarCircleAction}>
                    {selectedVideo.creatorAvatar ? (
                      <Image 
                        source={{ uri: selectedVideo.creatorAvatar }} 
                        style={styles.avatarLargeImage} 
                      />
                    ) : (
                      <Text style={styles.avatarTextAction}>
                        {selectedVideo.creatorName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                </LinearGradient>
                
                {followedIds.includes(selectedVideo.creatorId) && (
                  <LinearGradient
                    colors={['#7459f0', '#9333ea']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.checkIconAction}
                  >
                    <Ionicons name="checkmark" size={12} color="white" />
                  </LinearGradient>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButtonModal} 
                onPress={() => handleLike(selectedVideo.id)}
                activeOpacity={0.7}
              >
                <LinearGradient 
                  colors={likedVideosSet.has(selectedVideo.id) ? ['#ef4444', '#dc2626'] : ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionIconModal}
                >
                  <Ionicons 
                    name={likedVideosSet.has(selectedVideo.id) ? "heart" : "heart-outline"} 
                    size={28} 
                    color="#fff" 
                  />
                </LinearGradient>
                <Text style={styles.actionCountModal}>{selectedVideo.likes || 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButtonModal} 
                onPress={() => {
                  setShowComments(true);
                  // Mettre en pause la vidéo quand on ouvre les commentaires
                  if (videoRef.current && isPlaying) {
                    videoRef.current.pauseAsync();
                    setIsPlaying(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <LinearGradient 
                  colors={['#7459f0', '#242A65']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionIconModal}
                >
                  <Ionicons name="chatbubble-outline" size={28} color="#fff" />
                </LinearGradient>
                <Text style={styles.actionCountModal}>{selectedVideo.comments || 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButtonModal} 
                onPress={() => handleFavorite(selectedVideo.id)}
                activeOpacity={0.7}
              >
                <LinearGradient 
                  colors={savedVideosSet.has(selectedVideo.id) ? ['#FBA31A', '#F59E0B'] : ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionIconModal}
                >
                  <Ionicons 
                    name={savedVideosSet.has(selectedVideo.id) ? "bookmark" : "bookmark-outline"} 
                    size={28} 
                    color="#fff" 
                  />
                </LinearGradient>
                <Text style={styles.actionCountModal}>
                  {savedVideosSet.has(selectedVideo.id) ? 'Enregistré' : 'Sauver'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButtonModal} 
                onPress={() => handleShare(selectedVideo)}
                activeOpacity={0.7}
              >
                <LinearGradient 
                  colors={['#7459f0', '#242A65']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionIconModal}
                >
                  <Ionicons name="share-social-outline" size={28} color="#fff" />
                </LinearGradient>
                <Text style={styles.actionCountModal}>Partager</Text>
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
          onClose={() => {
            setShowComments(false);
            // Reprendre la lecture si elle était en cours
            if (videoRef.current && !isPlaying) {
              setTimeout(() => {
                videoRef.current?.playAsync();
                setIsPlaying(true);
              }, 300);
            }
          }}
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

      {/* MODAL PROFIL FORMATEUR */}
      <Modal visible={selectedCreator !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedCreator(null)}>
        <View style={[styles.container, {paddingTop: 20}]}>
          <View style={{flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20}}>
            <TouchableOpacity onPress={() => setSelectedCreator(null)} style={{padding: 10, backgroundColor: '#F3F4F6', borderRadius: 20}}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {selectedCreator && (
            <ScrollView contentContainerStyle={{padding: 20, alignItems: 'center'}}>
              <Image source={{ uri: selectedCreator.photoURL || 'https://via.placeholder.com/150' }} 
                style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 15 }} />
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1F2937' }}>{selectedCreator.name}</Text>
              {selectedCreator.category && (
                <Text style={{ color: '#6B7280', marginBottom: 10, textAlign: 'center' }}>
                  {`Expert en ${getCategoryLabel(selectedCreator.category)}`}
                </Text>
              )}
              <Text style={{ color: '#6B7280', marginBottom: 20 }}>
                {selectedCreator.followers?.toLocaleString() || 0} abonnés • {selectedCreator.videosCount || 0} vidéos
              </Text>
              
              {selectedCreator.bio && (
                <Text style={{ color: '#4B5563', textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 }}>
                  {selectedCreator.bio}
                </Text>
              )}
              
              <TouchableOpacity
                onPress={() => toggleFollow(selectedCreator.id)}
                activeOpacity={0.8}
                style={{ width: 200, marginBottom: 30 }}
              >
                <LinearGradient
                  colors={followedIds.includes(selectedCreator.id) ? ['#FBA31A', '#F59E0B'] : ['#7459f0', '#9333ea', '#242A65']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.followBtnLarge}
                >
                  <Text style={styles.followBtnLargeText}>
                    {followedIds.includes(selectedCreator.id) ? 'Abonné(e)' : "S'abonner"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider} />

              <Text style={[styles.sectionTitle, {alignSelf: 'flex-start'}]}>📚 Ses cours disponibles</Text>
              
              {creatorVideos.length > 0 ? (
                creatorVideos.map((video) => (
                  <TouchableOpacity 
                    key={video.id} 
                    style={[styles.videoCard, {width: '100%'}]}
                    onPress={() => { setSelectedCreator(null); setTimeout(() => handleVideoPress(video), 400); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.emojiContainer}>
                      <Text style={styles.categoryEmoji}>{getCategoryEmoji(video.category)}</Text>
                    </View>
                    
                    <View style={styles.videoInfo}>
                      <Text style={styles.vTitle}>{video.title}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{getCategoryLabel(video.category)}</Text>
                      </View>
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={styles.statText}>👁️ {video.views?.toLocaleString() || 0}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statText}>❤️ {video.likes?.toLocaleString() || 0}</Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="play-circle" size={32} color="#9333EA" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>Ce formateur n'a pas encore publié de vidéo.</Text>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* MODAL FILTRES */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrer par sujet</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {CATEGORIES.map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.filterOption, selectedCat === cat.id && {backgroundColor: '#F3E8FF'}]} 
                  onPress={() => { setSelectedCat(cat.id); setShowFilterModal(false); }}
                >
                  <Text style={{ fontSize: 22 }}>{cat.icon}</Text>
                  <Text style={[styles.filterLabel, selectedCat === cat.id && { color: '#9333EA', fontWeight: 'bold' }]}>
                    {cat.label}
                  </Text>
                  {selectedCat === cat.id && <Ionicons name="checkmark-circle" size={22} color="#9333EA" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 20, 
    paddingBottom: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 15, color: '#1F2937' },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 15, alignItems: 'center' },
  searchBarContainer: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', 
    borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#E5E7EB' 
  },
  input: { flex: 1, fontSize: 16, color: '#333' },
  filterBtn: { 
    width: 50, height: 50, backgroundColor: '#F9FAFB', borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' 
  },
  filterDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, backgroundColor: '#9333EA', borderRadius: 4 },
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12, 
    padding: 4 
  },
  tab: { 
    flex: 1, 
    alignItems: 'center', 
    borderRadius: 10,
    overflow: 'hidden'
  },
  activeTabGradient: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10
  },
  tabText: { 
    fontWeight: '600', 
    color: '#71717A',
    paddingVertical: 10
  },
  activeTabText: { 
    color: '#FFF',
    fontWeight: '600'
  },
  activeFilterBadge: { 
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', 
    backgroundColor: '#F3E8FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginBottom: 15 
  },
  activeFilterText: { color: '#9333EA', fontWeight: 'bold', fontSize: 12 },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1F2937' },
  emptyText: { color: '#9CA3AF', fontStyle: 'italic', marginTop: 10, textAlign: 'center', fontSize: 15 },
  
  videoCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#F3F4F6',
    shadowColor: "#000", 
    shadowOffset: {width: 0, height: 2}, 
    shadowOpacity: 0.08, 
    shadowRadius: 4, 
    elevation: 3,
  },
  topVideoCard: {
    borderWidth: 2,
    borderColor: '#7459f0',
    backgroundColor: '#FEFBFF',
    shadowColor: "#7459f0",
    shadowOpacity: 0.15,
  },
  
  emojiContainer: {
    width: 70,
    height: 70,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F6',
    borderRadius: 12,
    position: 'relative'
  },
  categoryEmoji: {
    fontSize: 36,
  },
  medalEmoji: {
    position: 'absolute',
    top: -8,
    right: -8,
    fontSize: 24,
  },
  
  videoInfo: { flex: 1 },
  vTitle: { fontWeight: 'bold', fontSize: 15, color: '#1F2937', marginBottom: 4, lineHeight: 20 },
  vCreator: { color: '#71717A', fontSize: 13, marginBottom: 8 },
  
  categoryBadge: { 
    alignSelf: 'flex-start',
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, 
    backgroundColor: '#E9D5FF',
    marginBottom: 8
  },
  categoryText: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: '#7459f0' 
  },
  
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 4
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500'
  },
  
  historySection: { marginTop: 30 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clearAllText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  historyRow: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' 
  },
  historyClickable: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  historyText: { fontSize: 16, color: '#3F3F46', marginLeft: 12 },
  
  creatorCard: { 
    flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#F9FAFB', 
    padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#E5E7EB' },
  creatorName: { fontWeight: 'bold', fontSize: 16, color: '#1F2937' },
  creatorFollowers: { color: '#71717A', fontSize: 12, marginTop: 2 },
  creatorCategory: { color: '#9333EA', fontSize: 11, marginTop: 4, fontWeight: '500' },
  
  followBtnWrapper: {},
  followBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20,
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  followBtnText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: 13 
  },
  followBtnLarge: {
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#7459f0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6
  },
  followBtnLargeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  filterOption: { 
    flexDirection: 'row', alignItems: 'center', padding: 15, 
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', borderRadius: 12 
  },
  filterLabel: { flex: 1, marginLeft: 15, fontSize: 16, color: '#1F2937' },
  
  // ✅ MODAL VIDÉO PLEIN ÉCRAN - STYLES TIKTOK
  videoModalContainer: { flex: 1, backgroundColor: '#000' },
  closeButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 100 },
  closeButtonGradient: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  
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
  
  videoInfoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 100, padding: 20, paddingBottom: 40, zIndex: 20 },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  creatorAvatarContainer: { marginRight: 12 },
  creatorAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#fff' },
  nameWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeContainerModal: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeTextModal: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '700' 
  },
  badgeContainer: { backgroundColor: '#FBA31A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#000', fontSize: 9, fontWeight: '900' },
  miniFollowButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start' },
  miniFollowText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  modalVideoTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 6 },
  modalCreatorName: { fontSize: 16, color: '#FFF', fontWeight: '700' },
  modalDescription: { fontSize: 14, color: '#FFF', opacity: 0.8, lineHeight: 20 },
  
  // ✅ NOUVEAUX STYLES POUR LES BOUTONS STYLE TIKTOK
  rightSideActions: { 
    position: 'absolute', 
    bottom: 140, 
    right: 16, 
    gap: 20, 
    alignItems: 'center', 
    zIndex: 50 
  },
  avatarLargeAction: { 
    marginBottom: 8, 
    position: 'relative' 
  },
  avatarCircleBorder: {
    padding: 3,
    borderRadius: 31
  },
  avatarCircleAction: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#1a1a2e', 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden' 
  },
  avatarLargeImage: { 
    width: '100%', 
    height: '100%' 
  },
  avatarTextAction: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  checkIconAction: { 
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
  
  actionButtonModal: { 
    alignItems: 'center', 
    gap: 6 
  },
  actionIconModal: { 
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
  actionCountModal: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3
  },
  
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
  
  divider: { width: '100%', height: 1, backgroundColor: '#E5E7EB', marginVertical: 20 }
});