import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Dimensions, TextInput, ActivityIndicator, Alert, Modal, RefreshControl, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import SettingsScreen from '../../components/SettingsScreen';
// ===== IMPORTS FIREBASE & AUTH =====
import { auth, db, storage } from '../../firebaseConfig'; 
import { 
  doc, getDoc, updateDoc, collection, addDoc,
  arrayRemove, query, where, orderBy, serverTimestamp, getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut as firebaseSignOut } from 'firebase/auth'; 
import { useUserProgress } from '../../hooks/useuserprogress';
// AJOUT: Import pour les badges
import { checkNewBadges } from '../../services/badgeService';

const { width } = Dimensions.get('window');

// --- TYPES ---
interface SimpleVideo {
  id: string;
  videoUrl: string;
  thumbnail?: string;
  title: string;
  category: string;
  creatorName?: string;
}

interface BadgeDisplay {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

interface Badge {
  id: string;
  name: string;
  level: 'Bronze' | 'Argent' | 'Or';
  icon: string;
  requirement: number;
  description: string;
  unlocked: boolean;
  progress: number;
}

interface BonusBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

// --- CONFIGURATION ---
const INTEREST_CONFIG: Record<string, { icon: string, color: string, label: string, textColor: string }> = {
  'digital-marketing': { icon: '📱', color: '#E0F2FE', textColor: '#0284C7', label: 'Marketing' },
  'ia': { icon: '🤖', color: '#F3E8FF', textColor: '#9333EA', label: 'IA' },
  'ecommerce': { icon: '🛒', color: '#FEF3C7', textColor: '#D97706', label: 'E-commerce' },
  'design': { icon: '🎨', color: '#FCE7F3', textColor: '#DB2777', label: 'Design' },
  'dev': { icon: '💻', color: '#DCFCE7', textColor: '#16A34A', label: 'Dev' },
  'business': { icon: '📊', color: '#FFEDD5', textColor: '#EA580C', label: 'Business' },
};

const BADGE_DEFINITIONS: Record<string, BadgeDisplay> = {
  'premier-pas': { id: 'premier-pas', name: 'Premier Pas', icon: '🎬', description: 'Regardez votre première vidéo', unlocked: false },
  'apprenant-assidu': { id: 'apprenant-assidu', name: 'Apprenant Assidu', icon: '📚', description: 'Regardez 10 vidéos', unlocked: false },
  'en-serie': { id: 'en-serie', name: 'En Série', icon: '🔥', description: '3 jours consécutifs', unlocked: false },
  'expert': { id: 'expert', name: 'Expert', icon: '🎓', description: 'Atteignez le niveau 5', unlocked: false },
};

// --- COMPOSANT VIDEOGRID ---
const VideoGrid = ({ 
  videos, 
  type, 
  emptyMsg, 
  icon, 
  onSelect, 
  onRemove 
}: { 
  videos: SimpleVideo[], 
  type: 'favorites' | 'watchHistory' | 'likedVideos', 
  emptyMsg: string, 
  icon: any,
  onSelect: (v: SimpleVideo) => void,
  onRemove: (type: 'favorites' | 'watchHistory' | 'likedVideos', id: string) => void
}) => {
  
  if (!videos || videos.length === 0) {
      return (
          <View style={styles.emptyState}>
              <Ionicons name={icon} size={40} color="#A1A1AA" />
              <Text style={styles.emptyText}>{emptyMsg}</Text>
          </View>
      );
  }

  let deleteIconName: any = "trash-outline";
  let deleteIconColor = "#EF4444";

  if (type === 'favorites') {
      deleteIconName = "star"; 
      deleteIconColor = "#FFD700"; 
  } else if (type === 'likedVideos') {
      deleteIconName = "heart"; 
      deleteIconColor = "#EF4444"; 
  }

  return (
      <View style={styles.gridContainer}>
          {videos.map((video: any) => (
              <TouchableOpacity 
                  key={video.id} 
                  style={styles.videoCard}
                  onPress={() => onSelect(video)}
              >
                  <View style={styles.videoThumb}>
                     {video.thumbnail ? (
                         <Image source={{ uri: video.thumbnail }} style={styles.thumbImage} resizeMode="cover" />
                     ) : (
                         <View style={[styles.center, {backgroundColor:'#333'}]}>
                             <Ionicons name="play-circle" size={30} color="white" />
                         </View>
                     )}
                     <TouchableOpacity 
                          style={styles.deleteVideoBtn}
                          onPress={() => onRemove(type, video.id)}
                      >
                          <Ionicons name={deleteIconName} size={16} color={deleteIconColor} />
                      </TouchableOpacity>
                  </View>
                  
                  <View style={styles.videoInfoBlock}>
                      <Text style={styles.videoTitle} numberOfLines={1}>
                          {video.title || "Vidéo sans titre"}
                      </Text>
                      <Text style={styles.videoCat} numberOfLines={1}>
                          {video.category || "Général"}
                      </Text>
                  </View>
              </TouchableOpacity>
          ))}
      </View>
  );
};

export default function ProfileApprenantScreen() {
  const router = useRouter();
  
  // --- ÉTATS ---
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('progress'); 
  
  // Édition
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Données Listes
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<SimpleVideo[]>([]);   
  const [history, setHistory] = useState<SimpleVideo[]>([]);       
  const [likedVideos, setLikedVideos] = useState<SimpleVideo[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<BadgeDisplay[]>([]);
  
  const [badges, setBadges] = useState<Badge[]>([]);
  const [bonusBadges, setBonusBadges] = useState<BonusBadge[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastAnimation] = useState(new Animated.Value(-100));
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState<Badge | null>(null);
  
  // Statistiques
  const [stats, setStats] = useState({
    videosWatched: 0,
    streak: 0,
    totalMinutes: 0,
    followers: 0,
  });

  // Modals
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [selectedPlaylistVideos, setSelectedPlaylistVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<SimpleVideo | null>(null);

  // Hooks Progression
  const { stats: progressStats, getXPProgressPercentage, getBadgesWithProgress, getBonusBadgesWithProgress } = useUserProgress();
  const xpPercentage = getXPProgressPercentage ? getXPProgressPercentage() : 0;
  const currentLevel = userProfile?.progressData?.level || Math.floor((stats.videosWatched || 0) / 10) + 1;
  const nextLevelVideos = (currentLevel * 10) - (stats.videosWatched || 0);

  // --- EFFETS ---
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [activeTab])
  );

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  const fetchVideosByIds = async (videoIds: string[]) => {
    if (!videoIds || videoIds.length === 0) return [];
    const recentIds = [...videoIds].reverse().slice(0, 20); 
    const videosData: any[] = [];

    for (const id of recentIds) {
        try {
            const vidDoc = await getDoc(doc(db, 'videos', id));
            if (vidDoc.exists()) {
                const data = vidDoc.data();
                videosData.push({ 
                    id: vidDoc.id, 
                    ...data,
                    thumbnail: data.thumbnail || null 
                });
            }
        } catch (e) { console.log(`Vidéo ${id} erreur`); }
    }
    return videosData;
  };

  // ✅ CORRECTION : Fonction loadBadges avec logs
  const loadBadges = async () => {
    try {
      console.log('🔄 Chargement des badges...');
      
      const allBadges = getBadgesWithProgress();
      const allBonusBadges = getBonusBadgesWithProgress();
      
      console.log('🎯 Badges calculés:', allBadges.filter(b => b.unlocked).map(b => b.name));
      
      setBadges(allBadges);
      setBonusBadges(allBonusBadges);
      
      // ✅ IMPORTANT : Cette ligne vérifie et sauvegarde les nouveaux badges
      const newBadges = await checkNewBadges(allBadges);
      console.log('🎉 Nouveaux badges débloqués:', newBadges.length);
      
      if (newBadges.length > 0) {
        const badge = allBadges.find(b => b.id === newBadges[0].id);
        if (badge) {
          setNewlyUnlockedBadge(badge);
          showBadgeUnlockedToast();
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement badges:', error);
    }
  };

  const showBadgeUnlockedToast = () => {
    setShowToast(true);
    Animated.sequence([
      Animated.spring(toastAnimation, {
        toValue: 20,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.delay(3000),
      Animated.timing(toastAnimation, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowToast(false));
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Bronze': return '#CD7F32';
      case 'Argent': return '#C0C0C0';
      case 'Or': return '#FFD700';
      default: return '#CD7F32';
    }
  };

  const getNextBadge = () => {
    return badges.find(badge => !badge.unlocked);
  };

  // ✅ CORRECTION : Fonction loadProfile avec source unique pour watchCount
  const loadProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) { router.replace('/login'); return; }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile(data);
        setEditedName(`${data.prenom || ''} ${data.nom || ''}`.trim());
        setEditedBio(data.bio || "Passionné d'apprentissage continu 📚");
        
        // ✅ CORRECTION : Source unique = watchHistory.length
        const watchCount = data.watchHistory ? data.watchHistory.length : 0;
        
        // ✅ AJOUT : Logs de debug
        console.log('📊 Statistiques chargées:', {
          watchHistory: data.watchHistory?.length || 0,
          unlockedBadges: data.unlockedBadges?.length || 0,
          videosWatched: watchCount
        });
        
        setStats({
          videosWatched: watchCount,
          streak: data.stats?.streak || 0,
          totalMinutes: data.stats?.totalMinutes || 0,
          followers: data.stats?.followers || 0,
        });

        // ✅ Appel de loadBadges qui va maintenant sauvegarder automatiquement
        await loadBadges();

        if (activeTab === 'playlists') await loadPlaylists(user.uid);
        if (activeTab === 'saved') setFavorites(await fetchVideosByIds(data.favorites || []));
        if (activeTab === 'history') setHistory(await fetchVideosByIds(data.watchHistory || []));
        if (activeTab === 'liked') setLikedVideos(await fetchVideosByIds(data.likedVideos || []));
        
        let badgesList: BadgeDisplay[] = [];
        if (data.unlockedBadges && data.unlockedBadges.length > 0) {
            badgesList = data.unlockedBadges.map((b: any) => ({
                id: b.badgeId, name: b.badgeName, icon: b.badgeIcon, description: 'Débloqué', unlocked: true
            }));
        } else if (data.badges && data.badges.length > 0) {
            badgesList = data.badges.map((id: string) => ({
                ...(BADGE_DEFINITIONS[id] || { id, name: id, icon: '🏆', description: 'Badge débloqué' }),
                unlocked: true
            }));
        }
        setUnlockedBadges(badgesList);
      }
    } catch (error) {
      console.error("❌ Erreur chargement profil:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPlaylists = async (userId: string) => {
    try {
      const playlistsRef = collection(db, 'playlists');
      const q = query(playlistsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const playlistsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlaylists(playlistsData);
    } catch (error) { console.error('Erreur playlists:', error); }
  };

  const saveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const [prenom, ...nomArray] = editedName.split(' ');
    await updateDoc(doc(db, 'users', user.uid), {
      prenom: prenom || '', nom: nomArray.join(' ') || '', bio: editedBio
    });
    setIsEditing(false);
    loadProfile();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) uploadImage(result.assets[0].uri);
  };

  const uploadImage = async (uri: string) => {
    const user = auth.currentUser;
    if (!user) return;
    setIsUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);
      await updateDoc(doc(db, 'users', user.uid), { photoURL: downloadURL });
      setUserProfile((prev: any) => ({ ...prev, photoURL: downloadURL }));
    } catch (e) { Alert.alert("Erreur", "Upload échoué"); } 
    finally { setIsUploading(false); }
  };

  const removeFromList = async (listType: 'favorites' | 'watchHistory' | 'likedVideos', videoId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db, 'users', user.uid), {
        [listType]: arrayRemove(videoId)
      });

      if (listType === 'favorites') setFavorites(prev => prev.filter(v => v.id !== videoId));
      if (listType === 'watchHistory') setHistory(prev => prev.filter(v => v.id !== videoId));
      if (listType === 'likedVideos') setLikedVideos(prev => prev.filter(v => v.id !== videoId));

    } catch (error) {
      console.error(`Erreur remove ${listType}:`, error);
      Alert.alert("Erreur", "Impossible de supprimer l'élément.");
    }
  };

  const handleRemoveAction = (type: 'favorites' | 'watchHistory' | 'likedVideos', videoId: string) => {
    if (type === 'favorites' || type === 'likedVideos') {
        removeFromList(type, videoId);
        return;
    }
    Alert.alert(
        "Supprimer ?",
        "Retirer cette vidéo de l'historique ?",
        [
            { text: "Annuler", style: "cancel" },
            { text: "Retirer", style: "destructive", onPress: () => removeFromList(type, videoId) }
        ]
    );
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      await addDoc(collection(db, 'playlists'), {
        name: newPlaylistName, userId: user.uid, videoIds: [],
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setNewPlaylistName(''); setShowCreatePlaylist(false);
      loadPlaylists(user.uid);
    } catch (error) { Alert.alert('Erreur', 'Impossible de créer la playlist'); }
  };

  const openPlaylist = async (playlist: any) => {
    setSelectedPlaylist(playlist);
    const videos = await fetchVideosByIds(playlist.videoIds || []);
    setSelectedPlaylistVideos(videos);
  };

  const removeVideoFromPlaylist = async (videoId: string) => {
    if (!selectedPlaylist) return;
    try {
        await updateDoc(doc(db, 'playlists', selectedPlaylist.id), {
            videoIds: arrayRemove(videoId),
            updatedAt: serverTimestamp()
        });
        setSelectedPlaylistVideos(prev => prev.filter(v => v.id !== videoId));
        setPlaylists(prev => prev.map(p => 
            p.id === selectedPlaylist.id 
            ? { ...p, videoIds: p.videoIds.filter((id: string) => id !== videoId) } 
            : p
        ));
    } catch (error) { Alert.alert('Erreur', 'Impossible de supprimer la vidéo'); }
  };

  if (loading || !userProfile) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#9333ea" /></View>;
  }

  const nextBadge = getNextBadge();
  const unlockedBadgesFull = badges.filter(b => b.unlocked);
  const lockedBadgesFull = badges.filter(b => !b.unlocked);

  return (
    <View style={{flex: 1, backgroundColor: '#FFFFFF'}}>
      {showToast && newlyUnlockedBadge && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnimation }] }]}>
          <View style={styles.toast}>
            <Text style={styles.toastIcon}>🎉</Text>
            <View style={styles.toastContent}>
              <Text style={styles.toastTitle}>Bravo !</Text>
              <Text style={styles.toastMessage}>Tu as débloqué le badge {newlyUnlockedBadge.icon} {newlyUnlockedBadge.name} !</Text>
            </View>
            <Text style={styles.toastCelebration}>🎊</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); loadProfile();}} />}
      >
        <View style={styles.headerWrapper}>
            <LinearGradient colors={['#9333ea', '#7e22ce']} style={styles.headerGradient}>
                <View style={styles.topIcons}>
                    <TouchableOpacity 
                        style={styles.glassIcon}
                        onPress={() => setShowSettings(true)}
                    >
                        <Ionicons name="settings-outline" size={20} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.glassIcon, { backgroundColor: 'rgba(239, 68, 68, 0.4)' }]}
                        onPress={signOut} 
                    >
                        <Ionicons name="log-out-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <View style={styles.avatarSection}>
                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarBorder} disabled={isUploading}>
                        {isUploading ? <ActivityIndicator color="white" /> : userProfile.photoURL ? (
                            <Image source={{ uri: userProfile.photoURL }} style={styles.avatarImg} />
                        ) : (
                            <View style={styles.avatarCircle}><Text style={styles.avatarInit}>{userProfile.prenom?.[0] || 'A'}</Text></View>
                        )}
                    </TouchableOpacity>
                    <View style={styles.roleBadge}>
                        <Ionicons name="flash" size={10} color="#EF4444" />
                        <Text style={styles.roleText}>Apprenant</Text>
                    </View>
                </View>
            </View>
        </View>

        {/* IDENTITÉ */}
        <View style={styles.identitySection}>
            {isEditing ? (
                <View style={styles.editForm}>
                    <TextInput style={styles.input} value={editedName} onChangeText={setEditedName} placeholder="Nom Complet" />
                    <TextInput style={[styles.input, { height: 60 }]} value={editedBio} onChangeText={setEditedBio} multiline placeholder="Biographie" />
                    <View style={styles.editButtons}>
                        <TouchableOpacity style={[styles.saveBtn, styles.cancelBtn]} onPress={() => setIsEditing(false)}>
                            <Text style={styles.cancelBtnText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
                            <Text style={styles.saveBtnText}>Enregistrer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <>
                    <Text style={styles.name}>{userProfile.prenom} {userProfile.nom}</Text>
                    <Text style={styles.bio}>{userProfile.bio}</Text>
                    <Text style={styles.memberSince}>Membre depuis {new Date(userProfile.createdAt?.toDate?.() || Date.now()).toLocaleDateString('fr-FR', {month:'long', year:'numeric'})}</Text>
                    
                    <TouchableOpacity style={styles.modifyBtn} onPress={() => setIsEditing(true)}>
                        <Ionicons name="create-outline" size={16} color="#9333ea" />
                        <Text style={styles.modifyText}>Modifier le profil</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>

        {/* STATISTIQUES */}
        <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statNum}>{stats.videosWatched}</Text><Text style={styles.statLabel}>Vidéos vues</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{stats.streak} 🔥</Text><Text style={styles.statLabel}>Jours série</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{Math.round(stats.totalMinutes)}</Text><Text style={styles.statLabel}>Minutes</Text></View>
        </View>

        {/* NIVEAU */}
        <View style={styles.levelSection}>
            <View style={styles.levelHeader}>
                <View style={styles.levelIcon}><Text style={styles.levelIconText}>{currentLevel}</Text></View>
                <Text style={styles.levelName}>Niveau {currentLevel}</Text>
                <Text style={styles.levelPercent}>{Math.round(xpPercentage)}%</Text>
            </View>
            <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${xpPercentage}%` }]} /></View>
            <Text style={styles.progressSub}>Encore {Math.max(0, nextLevelVideos)} vidéo{nextLevelVideos > 1 ? 's' : ''} pour atteindre le niveau {currentLevel + 1}</Text>
        </View>

        <TouchableOpacity style={styles.historyButton} onPress={() => setActiveTab('history')}>
            <Ionicons name="time-outline" size={22} color="#9333ea" />
            <Text style={styles.historyButtonText}>Consulter mon historique</Text>
            <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
        </TouchableOpacity>

        {/* CENTRES D'INTÉRÊT */}
        <View style={styles.interestsSection}>
            <Text style={styles.sectionTitle}>Centres d'intérêt</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.interestsRow}>
                {(userProfile.interests || ['ia', 'business']).map((tag: string) => {
                    const conf = INTEREST_CONFIG[tag] || { icon: '#', color: '#F3F4F6', textColor: '#333', label: tag };
                    return (
                        <View key={tag} style={[styles.interestBadge, { backgroundColor: conf.color }]}>
                            <Text style={{fontSize:14, marginRight:5}}>{conf.icon}</Text>
                            <Text style={[styles.interestText, { color: conf.textColor }]}>{conf.label}</Text>
                        </View>
                    );
                })}
            </ScrollView>
        </View>

        {/* TABS */}
        <View style={styles.tabBar}>
            {['progress', 'saved', 'liked', 'playlists'].map((tab) => (
                <TouchableOpacity 
                    key={tab} 
                    style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                    onPress={() => setActiveTab(tab)}
                >
                    <Ionicons 
                        name={tab === 'progress' ? 'stats-chart' : tab === 'saved' ? 'star' : tab === 'liked' ? 'heart' : 'list'} 
                        size={20} 
                        color={activeTab === tab ? '#9333ea' : '#71717A'} 
                    />
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                        {tab === 'progress' ? 'Progrès' : tab === 'saved' ? 'Favoris' : tab === 'liked' ? "J'aime" : 'Playlists'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>

        {/* CONTENU ONGLETS */}
        <View style={styles.contentContainer}>
            {activeTab === 'progress' && (
                <View>
                    {nextBadge && (
                      <View style={styles.nextBadgeSection}>
                        <View style={styles.nextBadgeHeader}>
                          <View style={styles.nextBadgeIconContainer}><Text style={styles.nextBadgeIconLarge}>{nextBadge.icon}</Text></View>
                          <View style={styles.nextBadgeInfo}>
                            <Text style={styles.nextBadgeTitle}>Prochain: {nextBadge.name}</Text>
                            <Text style={styles.nextBadgeSubtitle}>{nextBadge.progress > 0 ? `Plus que ${nextBadge.requirement - Math.round(nextBadge.requirement * nextBadge.progress / 100)} vidéos ! 🔥` : `Regardez ${nextBadge.requirement} vidéos`}</Text>
                          </View>
                        </View>
                        {nextBadge.progress > 0 && (
                          <><View style={styles.nextBadgeProgressBar}><View style={[styles.nextBadgeProgressFill, { width: `${nextBadge.progress}%` }]} /></View>
                          <Text style={styles.nextBadgeProgressText}>{Math.round(nextBadge.requirement * nextBadge.progress / 100)}/{nextBadge.requirement} ({nextBadge.progress}%)</Text></>
                        )}
                      </View>
                    )}

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Badges débloqués</Text>
                        <Text style={styles.badgeCount}>{unlockedBadgesFull.length}/{badges.length}</Text>
                    </View>

                    {unlockedBadgesFull.length === 0 ? (
                        <View style={styles.emptyState}><Text style={{ fontSize: 40 }}>🏆</Text><Text style={styles.emptyText}>Regardez des vidéos pour débloquer vos premiers badges !</Text></View>
                    ) : (
                        <View style={styles.badgesGrid}>
                            {unlockedBadgesFull.map((badge) => (
                                <View key={badge.id} style={styles.badgeCardFull}>
                                    <View style={styles.badgeIconContainer}><Text style={styles.badgeIconLarge}>{badge.icon}</Text><View style={styles.checkmarkContainer}><Text style={styles.checkmark}>✓</Text></View></View>
                                    <Text style={styles.badgeName}>{badge.name}</Text>
                                    <View style={[styles.badgeLevel, { backgroundColor: getLevelColor(badge.level) }]}><Text style={styles.badgeLevelText}>{badge.level}</Text></View>
                                    <Text style={styles.badgeDescription}>{badge.description}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    
                    {lockedBadgesFull.length > 0 && (
                      <><Text style={[styles.sectionTitle, { marginTop: 25 }]}>Badges à débloquer</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10, paddingBottom:10}}>
                            {lockedBadgesFull.map((badge) => (
                                <View key={badge.id} style={[styles.badgeCardFull, {width: 140, opacity: badge.progress > 0 ? 0.8 : 0.5}]}>
                                    <View style={[styles.badgeIconContainer, styles.badgeIconLocked]}><Text style={[styles.badgeIconLarge, styles.badgeIconLockedText]}>{badge.icon}</Text></View>
                                    <Text style={styles.badgeName}>{badge.name}</Text>
                                    <View style={[styles.badgeLevel, { backgroundColor: getLevelColor(badge.level) }, styles.badgeLevelLocked]}><Text style={styles.badgeLevelText}>{badge.level}</Text></View>
                                    <Text style={[styles.badgeDescription, styles.badgeDescriptionLocked]}>{badge.description}</Text>
                                    {badge.progress > 0 && (
                                      <View style={styles.progressContainer}><View style={styles.progressBarBackground}><View style={[styles.progressBarFill, { width: `${badge.progress}%` }]} /></View><Text style={styles.progressText}>{badge.progress}%</Text></View>
                                    )}
                                </View>
                            ))}
                        </ScrollView></>
                    )}
                </View>
            )}

            {activeTab === 'playlists' && (
                <View>
                    <TouchableOpacity style={styles.createPlaylistBtn} onPress={() => setShowCreatePlaylist(true)}>
                        <View style={styles.createPlaylistIcon}><Ionicons name="add" size={24} color="#9333ea" /></View>
                        <Text style={styles.createPlaylistText}>Créer une nouvelle playlist</Text>
                    </TouchableOpacity>
                    {playlists.map(pl => (
                        <TouchableOpacity key={pl.id} style={styles.playlistCard} onPress={() => openPlaylist(pl)}>
                            <View style={styles.playlistIcon}><Ionicons name="musical-notes" size={24} color="#9333ea" /></View>
                            <View style={{flex:1}}><Text style={styles.playlistTitle}>{pl.name}</Text><Text style={styles.playlistCount}>{pl.videoIds?.length || 0} vidéos</Text></View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {activeTab === 'saved' && <VideoGrid videos={favorites} type="favorites" emptyMsg="Aucun favori" icon="bookmark" onSelect={setSelectedVideo} onRemove={handleRemoveAction} />}
            {activeTab === 'liked' && <VideoGrid videos={likedVideos} type="likedVideos" emptyMsg="Aucun like" icon="heart" onSelect={setSelectedVideo} onRemove={handleRemoveAction} />}
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      <SettingsScreen 
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        userProfile={userProfile}
        userRole="apprenant"
      />
      
      {/* Modals existantes */}
      <Modal visible={showCreatePlaylist} transparent animationType="fade" onRequestClose={() => setShowCreatePlaylist(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Nouvelle Playlist</Text>
                <TextInput style={styles.modalInput} placeholder="Nom..." value={newPlaylistName} onChangeText={setNewPlaylistName} />
                <View style={styles.modalActions}>
                    <TouchableOpacity onPress={() => setShowCreatePlaylist(false)}><Text style={{color:'#777'}}>Annuler</Text></TouchableOpacity>
                    <TouchableOpacity onPress={createPlaylist}><Text style={{color:'#9333ea', fontWeight:'bold'}}>Créer</Text></TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      <Modal visible={selectedPlaylist !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedPlaylist(null)}>
        <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{selectedPlaylist?.name}</Text><TouchableOpacity onPress={() => setSelectedPlaylist(null)}><Ionicons name="close" size={24} /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={{padding: 20}}>
                {selectedPlaylistVideos.length === 0 ? <Text style={styles.emptyText}>Playlist vide</Text> : 
                 selectedPlaylistVideos.map(vid => (
                    <View key={vid.id} style={styles.sheetVideoItem}><View style={{width: 60, height: 40, backgroundColor: '#eee', borderRadius: 4, marginRight: 10}} >{vid.thumbnail && <Image source={{uri:vid.thumbnail}} style={{width:'100%', height:'100%', borderRadius:4}} />}</View><Text style={{flex:1, fontWeight:'600'}} numberOfLines={1}>{vid.title}</Text><TouchableOpacity onPress={() => removeVideoFromPlaylist(vid.id)}><Ionicons name="trash-outline" size={20} color="#EF4444" /></TouchableOpacity></View>
                 ))
                }
            </ScrollView>
        </View>
      </Modal>

      <Modal visible={selectedVideo !== null} animationType="slide" transparent={false} onRequestClose={() => setSelectedVideo(null)}>
            <View style={{flex:1, backgroundColor:'black', justifyContent:'center'}}><TouchableOpacity style={{position:'absolute', top:40, right:20, zIndex:10}} onPress={() => setSelectedVideo(null)}><Ionicons name="close-circle" size={40} color="white" /></TouchableOpacity>{selectedVideo && <Video source={{ uri: selectedVideo.videoUrl }} style={{width: '100%', height: 300}} useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay />}<View style={{padding: 20}}><Text style={{color:'white', fontSize:18, fontWeight:'bold'}}>{selectedVideo?.title}</Text><Text style={{color:'#ccc'}}>{selectedVideo?.category}</Text></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toastContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, paddingHorizontal: 20 },
  toast: { backgroundColor: '#10B981', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  toastIcon: { fontSize: 40, marginRight: 12 },
  toastContent: { flex: 1 },
  toastTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  toastMessage: { fontSize: 14, color: '#FFFFFF' },
  toastCelebration: { fontSize: 32, marginLeft: 8 },
  headerWrapper: { marginBottom: 50 },
  headerGradient: { height: 140, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingTop: 50, paddingHorizontal: 20 },
  topIcons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  glassIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20, marginLeft: 10 },
  avatarSection: { position: 'absolute', bottom: -40, left: 0, right: 0, alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatarBorder: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFF', backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 50 },
  avatarCircle: { width: '100%', height: '100%', borderRadius: 50, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center' },
  avatarInit: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
  roleBadge: { position: 'absolute', bottom: -5, alignSelf: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor:'#000', shadowOpacity:0.1, shadowOffset:{width:0, height:2} },
  roleText: { fontSize: 10, fontWeight: 'bold', color: '#EF4444', marginLeft: 4 },
  identitySection: { alignItems: 'center', marginTop: 10, paddingHorizontal: 20 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  bio: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  memberSince: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  modifyBtn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  modifyText: { fontSize: 13, color: '#9333ea', fontWeight: '600', marginLeft: 6 },
  editForm: { width: '100%', gap: 10 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12 },
  editButtons: { flexDirection: 'row', gap: 10 },
  saveBtn: { flex: 1, backgroundColor: '#9333ea', padding: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  saveBtnText: { color: '#FFF', fontWeight: '600' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20 },
  statCard: { width: '31%', backgroundColor: '#FFF', padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', elevation: 1, shadowColor:'#000', shadowOpacity:0.05, shadowOffset:{width:0, height:1} },
  statNum: { fontSize: 18, fontWeight: 'bold', color: '#4B5563' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  levelSection: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#F5EEFF', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E9D5FF' },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  levelIcon: { width: 24, height: 24, backgroundColor: '#9333ea', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  levelIconText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  levelName: { flex: 1, marginLeft: 8, fontWeight: 'bold', color: '#1F2937' },
  levelPercent: { fontWeight: 'bold', color: '#6B7280' },
  progressBg: { height: 8, backgroundColor: '#DDD', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#9333ea' },
  progressSub: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  historyButton: { marginHorizontal: 20, marginTop: 15, backgroundColor: '#FFF', padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  historyButtonText: { flex: 1, marginLeft: 10, fontWeight: '600', color: '#374151' },
  interestsSection: { marginTop: 20, paddingLeft: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 10 },
  interestsRow: { paddingRight: 20, gap: 10 },
  interestBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  interestText: { fontSize: 12, fontWeight: '600' },
  tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 25, backgroundColor: '#F9FAFB', padding: 4, borderRadius: 16 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  tabItemActive: { backgroundColor: '#FFF', elevation: 2, shadowColor:'#000', shadowOpacity:0.05 },
  tabText: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginLeft: 4 },
  tabTextActive: { color: '#111827' },
  contentContainer: { padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badgeCount: { fontSize: 14, fontWeight: '600', color: '#9333EA' },
  nextBadgeSection: { marginBottom: 25, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 2, borderColor: '#e5e7eb', elevation: 3 },
  nextBadgeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  nextBadgeIconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  nextBadgeIconLarge: { fontSize: 36 },
  nextBadgeInfo: { flex: 1 },
  nextBadgeTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  nextBadgeSubtitle: { fontSize: 13, color: '#6b7280' },
  nextBadgeProgressBar: { width: '100%', height: 10, backgroundColor: '#f3f4f6', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  nextBadgeProgressFill: { height: '100%', backgroundColor: '#9333ea', borderRadius: 5 },
  nextBadgeProgressText: { color: '#6b7280', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  createPlaylistBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  createPlaylistIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  createPlaylistText: { fontWeight: '600', color: '#1F2937' },
  playlistCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  playlistIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  playlistTitle: { fontWeight: 'bold', color: '#1F2937' },
  playlistCount: { fontSize: 12, color: '#9CA3AF' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  videoCard: { width: '48%', marginBottom: 10 },
  videoThumb: { width: '100%', height: 100, backgroundColor: '#333', borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumbImage: { width: '100%', height: '100%' },
  videoInfoBlock: { padding: 5 },
  videoTitle: { fontSize: 12, fontWeight: '600', color: '#374151' },
  videoCat: { fontSize: 10, color: '#9333ea', marginTop: 2 },
  deleteVideoBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(255,255,255,0.9)', padding: 4, borderRadius: 10, zIndex: 10 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  badgeCardFull: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', elevation: 2 },
  badgeIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 15, position: 'relative' },
  badgeIconLocked: { backgroundColor: '#f9fafb' },
  badgeIconLarge: { fontSize: 40 },
  badgeIconLockedText: { opacity: 0.3 },
  checkmarkContainer: { position: 'absolute', top: -5, right: -5, width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  badgeName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  badgeLevel: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginBottom: 8 },
  badgeLevelLocked: { opacity: 0.3 },
  badgeLevelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  badgeDescription: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  badgeDescriptionLocked: { opacity: 0.4 },
  progressContainer: { width: '100%', marginTop: 12 },
  progressBarBackground: { width: '100%', height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#9333ea', borderRadius: 4 },
  progressText: { color: '#6b7280', fontSize: 12, textAlign: 'right', marginTop: 4, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 20 },
  emptyState: { padding: 40, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 20, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalInput: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  sheetContainer: { flex: 1, backgroundColor: '#FFF', marginTop: 100, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  sheetTitle: { fontSize: 18, fontWeight: 'bold' },
  sheetVideoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F9FAFB' },
});