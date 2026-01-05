import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Dimensions, TextInput, ActivityIndicator, Alert, Modal, RefreshControl, StatusBar, FlatList, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

// ===== IMPORTS FIREBASE =====
import { auth, db, storage } from '../../firebaseConfig'; 
import { 
  doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, serverTimestamp, deleteDoc, arrayUnion, arrayRemove, orderBy, limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut as firebaseSignOut } from 'firebase/auth';

// Import du modal commentaire
import CommentModal from '../../components/CommentModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- TYPES ---
interface CreatorVideo {
  id: string;
  videoUrl: string;
  thumbnail?: string;
  title: string;
  description?: string;
  views: number;
  likes: number;
  comments: number;
  creatorId: string;
  isPinned?: boolean;
  createdAt: any;
}

interface Playlist {
  id: string;
  name: string;
  videoIds: string[];
}

export default function ProfileFormateurScreen() {
  const router = useRouter();
  
  // --- STATES ---
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  const [showHistory, setShowHistory] = useState(false);
  const [watchHistory, setWatchHistory] = useState<CreatorVideo[]>([]);
  
  // Edit Profile
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [bioCharCount, setBioCharCount] = useState(0);

  // Data
  const [myVideos, setMyVideos] = useState<CreatorVideo[]>([]);
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
  
  // --- PLAYER STATES ---
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<CreatorVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef<Video>(null);

  // --- MODALS STATES ---
  const [showSettings, setShowSettings] = useState(false);
  const [showVideoOptions, setShowVideoOptions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showEditVideo, setShowEditVideo] = useState(false);
  const [editedVideoTitle, setEditedVideoTitle] = useState('');
  const [editedVideoDesc, setEditedVideoDesc] = useState('');

  // --- PLAYLIST DETAILS STATES ---
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [selectedPlaylistVideos, setSelectedPlaylistVideos] = useState<CreatorVideo[]>([]);
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [likedVideosList, setLikedVideosList] = useState<CreatorVideo[]>([]);
  
  // Stats
  const totalViews = myVideos.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalLikes = myVideos.reduce((acc, curr) => acc + (curr.likes || 0), 0);

  // Progression (simulée pour l'exemple)
  const progressData = {
    videosWatched: 0, // L'apprenant regardera ses vidéos, pas le formateur
    totalVideos: myVideos.length,
    progressPercent: 0
  };

  // --- LOADING ---
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) { router.replace('/login'); return; }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile(data);
        setEditedName(`${data.prenom || ''} ${data.nom || ''}`.trim());
        setEditedBio(data.bio || "Formateur expert 🎓");
        setBioCharCount((data.bio || "").length);
      }

      // Vidéos
      try {
          const vRef = collection(db, 'videos');
          const vQuery = query(vRef, where('creatorId', '==', user.uid));
          const vSnapshot = await getDocs(vQuery);
          const videosData = vSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as CreatorVideo));
          
          videosData.sort((a, b) => {
             if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
             return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
          });
          setMyVideos(videosData);
      } catch (e) { console.error("Erreur vidéos:", e); }

      // Playlists
      try {
          const pRef = collection(db, 'playlists');
          const pQuery = query(pRef, where('userId', '==', user.uid));
          const pSnapshot = await getDocs(pQuery);
          setMyPlaylists(pSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Playlist)));
      } catch (e) { console.log("Erreur playlists:", e); }

      // Historique (dernières vidéos vues)
      try {
        const historyRef = collection(db, 'watchHistory');
        const historyQuery = query(
          historyRef, 
          where('userId', '==', user.uid), 
          orderBy('watchedAt', 'desc'),
          limit(20)
        );
        const historySnapshot = await getDocs(historyQuery);
        const historyVideoIds = historySnapshot.docs.map(d => d.data().videoId);
        
        if (historyVideoIds.length > 0) {
          const historyVideos = await fetchVideosByIds(historyVideoIds);
          setWatchHistory(historyVideos);
        }
      } catch (e) { console.log("Erreur historique:", e); }

    } catch (error) {
      console.error("Erreur générale:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const signOut = async () => {
    try { await firebaseSignOut(auth); router.replace('/login'); } 
    catch (error) { Alert.alert('Erreur', 'Impossible de se déconnecter'); }
  };

  const saveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Limiter la bio à 200 caractères (ID 65, 275)
    if (editedBio.length > 200) {
      Alert.alert("Erreur", "La biographie ne peut pas dépasser 200 caractères");
      return;
    }
    
    const [prenom, ...nomArray] = editedName.split(' ');
    await updateDoc(doc(db, 'users', user.uid), { 
      prenom: prenom || '', 
      nom: nomArray.join(' ') || '', 
      bio: editedBio 
    });
    setIsEditing(false); 
    loadProfile();
  };

  const handleBioChange = (text: string) => {
    if (text.length <= 200) {
      setEditedBio(text);
      setBioCharCount(text.length);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.5,
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

  const fetchVideosByIds = async (videoIds: string[]) => {
    if (!videoIds || videoIds.length === 0) return [];
    const videosData: CreatorVideo[] = [];
    for (const id of videoIds) {
        try {
            const vidDoc = await getDoc(doc(db, 'videos', id));
            if (vidDoc.exists()) {
                videosData.push({ id: vidDoc.id, ...vidDoc.data() } as CreatorVideo);
            }
        } catch (e) { console.log(`Vidéo ${id} introuvable`); }
    }
    return videosData;
  };

  // --- ACTIONS VIDEO ---
  const handleVideoPress = (video: CreatorVideo) => {
    setSelectedVideo(video);
    setShowPlayer(true);
    setIsPlaying(true);
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

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
        setVideoDuration(status.durationMillis || 0);
        setVideoProgress(status.positionMillis);
    }
  };

  const togglePinVideo = async () => {
    if (!selectedVideo) return;
    try {
        const newStatus = !selectedVideo.isPinned;
        await updateDoc(doc(db, 'videos', selectedVideo.id), { isPinned: newStatus });
        Alert.alert("Succès", newStatus ? "Vidéo épinglée 📌" : "Vidéo désépinglée");
        setShowVideoOptions(false);
        setSelectedVideo({...selectedVideo, isPinned: newStatus});
        loadProfile();
    } catch (e) { Alert.alert("Erreur", "Action échouée"); }
  };

  // ID 49 - Modifier une vidéo
  const openEditVideo = () => {
    if (!selectedVideo) return;
    setEditedVideoTitle(selectedVideo.title);
    setEditedVideoDesc(selectedVideo.description || '');
    setShowVideoOptions(false);
    setShowEditVideo(true);
  };

  const saveEditedVideo = async () => {
    if (!selectedVideo) return;
    try {
      await updateDoc(doc(db, 'videos', selectedVideo.id), {
        title: editedVideoTitle,
        description: editedVideoDesc
      });
      Alert.alert("Succès", "Vidéo modifiée avec succès");
      setShowEditVideo(false);
      setSelectedVideo({
        ...selectedVideo,
        title: editedVideoTitle,
        description: editedVideoDesc
      });
      loadProfile();
    } catch (e) {
      Alert.alert("Erreur", "Modification échouée");
    }
  };

  const deleteVideo = async () => {
    if (!selectedVideo) return;

    const executeDelete = async () => {
        try {
            await deleteDoc(doc(db, 'videos', selectedVideo.id));
            setShowVideoOptions(false);
            setShowPlayer(false);
            if (Platform.OS === 'web') window.alert("Votre vidéo a bien été supprimée");
            else Alert.alert("Succès", "Votre vidéo a bien été supprimée");
            loadProfile();
        } catch(e: any) { 
            Alert.alert("Erreur", "Suppression échouée"); 
        }
    };

    if (Platform.OS === 'web') {
        if (window.confirm("Supprimer définitivement cette vidéo ?")) executeDelete();
    } else {
        Alert.alert("Confirmer", "Supprimer définitivement cette vidéo ?", [
            { text: "Annuler", style: 'cancel' },
            { text: "Supprimer", style: 'destructive', onPress: executeDelete }
        ]);
    }
  };

  // --- PLAYLIST ACTIONS ---
  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
        const user = auth.currentUser;
        if (!user) return;
        await addDoc(collection(db, 'playlists'), {
            name: newPlaylistName, 
            userId: user.uid, 
            videoIds: [], 
            createdAt: serverTimestamp()
        });
        setNewPlaylistName(''); 
        setShowCreatePlaylist(false); 
        loadProfile();
        Alert.alert("Succès", "Playlist créée 🎉");
    } catch (e) { Alert.alert("Erreur", "Création échouée"); }
  };

  const openPlaylist = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    const videos = await fetchVideosByIds(playlist.videoIds || []);
    setSelectedPlaylistVideos(videos);
  };

  const deletePlaylist = async () => {
    if (!selectedPlaylist) return;
    const performDelete = async () => {
        try {
            await deleteDoc(doc(db, 'playlists', selectedPlaylist.id));
            setMyPlaylists(prev => prev.filter(p => p.id !== selectedPlaylist.id));
            setSelectedPlaylist(null);
            Alert.alert("Succès", "Playlist supprimée");
        } catch (e) { Alert.alert("Erreur", "Impossible de supprimer la playlist"); }
    };
    if (Platform.OS === 'web') { 
      if (confirm("Supprimer cette playlist ?")) performDelete(); 
    } else { 
      Alert.alert("Supprimer", "Êtes-vous sûr ?", [
        {text:"Annuler"}, 
        {text:"Supprimer", style: 'destructive', onPress:performDelete}
      ]); 
    }
  };

  const openAddVideoModal = async () => {
    // Pour le formateur, on ajoute ses propres vidéos à la playlist
    if (myVideos.length === 0) {
      Alert.alert("Info", "Vous n'avez pas encore de vidéos");
      return;
    }
    setShowAddVideoModal(true);
  };

  const addVideoToPlaylist = async (video: CreatorVideo) => {
    if (!selectedPlaylist) return;
    
    // Vérifier si la vidéo est déjà dans la playlist
    if (selectedPlaylist.videoIds.includes(video.id)) {
      Alert.alert("Info", "Cette vidéo est déjà dans la playlist");
      return;
    }
    
    await updateDoc(doc(db, 'playlists', selectedPlaylist.id), { 
      videoIds: arrayUnion(video.id) 
    });
    setSelectedPlaylistVideos(prev => [...prev, video]);
    setSelectedPlaylist({
      ...selectedPlaylist,
      videoIds: [...selectedPlaylist.videoIds, video.id]
    });
    Alert.alert("Succès", "Vidéo ajoutée à la playlist");
    setShowAddVideoModal(false);
  };

  const removeVideoFromPlaylist = async (videoId: string) => {
    if (!selectedPlaylist) return;
    
    const performRemove = async () => {
      await updateDoc(doc(db, 'playlists', selectedPlaylist.id), { 
        videoIds: arrayRemove(videoId) 
      });
      setSelectedPlaylistVideos(prev => prev.filter(v => v.id !== videoId));
      setSelectedPlaylist({
        ...selectedPlaylist,
        videoIds: selectedPlaylist.videoIds.filter(id => id !== videoId)
      });
      Alert.alert("Succès", "Vidéo retirée de la playlist");
    };
    
    if (Platform.OS === 'web') {
      if (confirm("Retirer cette vidéo de la playlist ?")) performRemove();
    } else {
      Alert.alert("Confirmer", "Retirer cette vidéo de la playlist ?", [
        { text: "Annuler", style: 'cancel' },
        { text: "Retirer", style: 'destructive', onPress: performRemove }
      ]);
    }
  };

  if (loading || !userProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7459f0" />
      </View>
    );
  }

  const progressPercent = videoDuration > 0 ? (videoProgress / videoDuration) * 100 : 0;

  return (
    <View style={{flex: 1, backgroundColor: '#FFFFFF'}}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true); 
              loadProfile();
            }} 
            tintColor="#7459f0"
          />
        }
      >
        {/* HEADER avec gradient SwipeSkills */}
        <View style={styles.headerWrapper}>
            <LinearGradient 
              colors={['#7459f0', '#5b3fd1']} 
              style={styles.headerGradient}
            >
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
            
            {/* Avatar */}
            <View style={styles.avatarSection}>
                <View style={styles.avatarContainer}>
                    <TouchableOpacity 
                      onPress={pickImage} 
                      style={styles.avatarBorder} 
                      disabled={isUploading}
                    >
                        {isUploading ? (
                          <ActivityIndicator color="white" />
                        ) : userProfile.photoURL ? (
                            <Image 
                              source={{ uri: userProfile.photoURL }} 
                              style={styles.avatarImg} 
                            />
                        ) : (
                            <View style={styles.avatarCircle}>
                              <Text style={styles.avatarInit}>
                                {userProfile.prenom?.[0] || 'F'}
                              </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <View style={styles.roleBadge}>
                      <Ionicons name="school" size={10} color="#7459f0" />
                      <Text style={styles.roleText}>Formateur</Text>
                    </View>
                </View>
            </View>
        </View>

        {/* IDENTITY */}
        <View style={styles.identitySection}>
            {isEditing ? (
                <View style={styles.editForm}>
                    <TextInput 
                      style={styles.input} 
                      value={editedName} 
                      onChangeText={setEditedName} 
                      placeholder="Nom complet" 
                      placeholderTextColor="#9CA3AF"
                    />
                    <View>
                      <TextInput 
                        style={[styles.input, { height: 80 }]} 
                        value={editedBio} 
                        onChangeText={handleBioChange} 
                        multiline 
                        placeholder="Biographie (max 200 caractères)"
                        placeholderTextColor="#9CA3AF"
                        maxLength={200}
                      />
                      <Text style={styles.charCount}>
                        {bioCharCount}/200
                      </Text>
                    </View>
                    <View style={styles.editButtons}>
                        <TouchableOpacity 
                          style={styles.cancelBtn} 
                          onPress={() => {
                            setIsEditing(false);
                            setEditedName(`${userProfile.prenom || ''} ${userProfile.nom || ''}`.trim());
                            setEditedBio(userProfile.bio || "Formateur expert 🎓");
                            setBioCharCount((userProfile.bio || "").length);
                          }}
                        >
                          <Text style={styles.cancelBtnText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.saveBtn} 
                          onPress={saveProfile}
                        >
                          <Text style={styles.saveBtnText}>Enregistrer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <>
                    <Text style={styles.name}>
                      {userProfile.prenom} {userProfile.nom}
                    </Text>
                    <Text style={styles.bio}>{userProfile.bio}</Text>
                    <TouchableOpacity 
                      style={styles.modifyBtn} 
                      onPress={() => setIsEditing(true)}
                    >
                        <Ionicons name="create-outline" size={16} color="#7459f0" />
                        <Text style={styles.modifyText}>Modifier</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{totalViews}</Text>
              <Text style={styles.statLabel}>Vues totales</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{totalLikes}</Text>
              <Text style={styles.statLabel}>Likes totaux</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{myVideos.length}</Text>
              <Text style={styles.statLabel}>Vidéos</Text>
            </View>
        </View>

        {/* TABLEAU DE PROGRESSION (ID 62) */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Ma progression</Text>
            {/* ID 43, 398 - Icône historique */}
            <TouchableOpacity 
              style={styles.historyBtn}
              onPress={() => setShowHistory(true)}
            >
              <Ionicons name="time-outline" size={20} color="#7459f0" />
              <Text style={styles.historyBtnText}>Historique</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Vidéos publiées</Text>
                <Text style={styles.progressValue}>{myVideos.length}</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Vues totales</Text>
                <Text style={styles.progressValue}>{totalViews}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ONGLETS */}
        <View style={styles.tabBar}>
            <TouchableOpacity 
              onPress={() => setActiveTab('videos')} 
              style={[styles.tabItem, activeTab === 'videos' && styles.tabItemActive]}
            >
                <Ionicons 
                  name="videocam" 
                  size={20} 
                  color={activeTab === 'videos' ? '#7459f0' : '#71717A'} 
                />
                <Text style={[
                  styles.tabText,
                  activeTab === 'videos' && styles.tabTextActive
                ]}>
                  Vidéos
                </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setActiveTab('playlists')} 
              style={[styles.tabItem, activeTab === 'playlists' && styles.tabItemActive]}
            >
                <Ionicons 
                  name="list" 
                  size={20} 
                  color={activeTab === 'playlists' ? '#7459f0' : '#71717A'} 
                />
                <Text style={[
                  styles.tabText,
                  activeTab === 'playlists' && styles.tabTextActive
                ]}>
                  Playlists
                </Text>
            </TouchableOpacity>
        </View>

        {/* GRILLE VIDEOS / PLAYLISTS */}
        <View style={styles.contentContainer}>
            {activeTab === 'videos' && (
                <View style={styles.gridContainer}>
                    {myVideos.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Ionicons name="videocam-outline" size={60} color="#D1D5DB" />
                        <Text style={styles.emptyText}>Aucune vidéo publiée</Text>
                        <Text style={styles.emptySubtext}>
                          Vos vidéos apparaîtront ici
                        </Text>
                      </View>
                    ) : (
                      myVideos.map((video) => (
                        <TouchableOpacity 
                          key={video.id} 
                          style={[
                            styles.videoCard, 
                            video.isPinned && styles.videoCardPinned
                          ]} 
                          onPress={() => handleVideoPress(video)}
                        >
                            <View style={styles.videoThumb}>
                                {video.thumbnail ? (
                                  <Image 
                                    source={{ uri: video.thumbnail }} 
                                    style={styles.thumbImage} 
                                  />
                                ) : (
                                  <LinearGradient
                                    colors={['#7459f0', '#5b3fd1']}
                                    style={styles.thumbGradient}
                                  >
                                    <Ionicons name="play" size={30} color="white" />
                                  </LinearGradient>
                                )}
                                
                                {/* ID 60 - Badge épinglé */}
                                {video.isPinned && (
                                  <View style={styles.pinBadge}>
                                    <Ionicons name="bookmark" size={12} color="white" />
                                  </View>
                                )}
                                
                                {/* ID 47, 48 - Vues et Likes sur la vidéo */}
                                <View style={styles.videoStats}>
                                  <View style={styles.statBadge}>
                                    <Ionicons name="play" size={10} color="white" />
                                    <Text style={styles.statBadgeText}>{video.views}</Text>
                                  </View>
                                  <View style={[styles.statBadge, { marginLeft: 4 }]}>
                                    <Ionicons name="heart" size={10} color="white" />
                                    <Text style={styles.statBadgeText}>{video.likes}</Text>
                                  </View>
                                </View>
                            </View>
                            <Text style={styles.videoTitle} numberOfLines={2}>
                              {video.title}
                            </Text>
                        </TouchableOpacity>
                      ))
                    )}
                </View>
            )}
            
            {activeTab === 'playlists' && (
                <View>
                    <TouchableOpacity 
                      style={styles.createPlaylistBtn} 
                      onPress={() => setShowCreatePlaylist(true)}
                    >
                      <Ionicons name="add-circle" size={20} color="#7459f0" />
                      <Text style={styles.createPlaylistText}>
                        Créer une playlist
                      </Text>
                    </TouchableOpacity>
                    
                    {myPlaylists.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Ionicons name="list-outline" size={60} color="#D1D5DB" />
                        <Text style={styles.emptyText}>Aucune playlist</Text>
                        <Text style={styles.emptySubtext}>
                          Créez des playlists pour organiser vos vidéos
                        </Text>
                      </View>
                    ) : (
                      myPlaylists.map(pl => (
                        <TouchableOpacity 
                          key={pl.id} 
                          style={styles.playlistCard} 
                          onPress={() => openPlaylist(pl)}
                        >
                          <View style={styles.playlistIcon}>
                            <Ionicons name="list" size={24} color="#7459f0" />
                          </View>
                          <View style={styles.playlistInfo}>
                            <Text style={styles.playlistTitle}>{pl.name}</Text>
                            <Text style={styles.playlistSubtitle}>
                              {pl.videoIds?.length || 0} vidéo{(pl.videoIds?.length || 0) > 1 ? 's' : ''}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                        </TouchableOpacity>
                      ))
                    )}
                </View>
            )}
        </View>
        <View style={{height: 100}} />
      </ScrollView>

      {/* LECTEUR VIDEO */}
      <Modal visible={showPlayer && selectedVideo !== null} animationType="slide">
        <View style={styles.fullScreenContainer}>
            <StatusBar hidden />
            {selectedVideo && (
                <>
                    <Video 
                      ref={videoRef} 
                      source={{ uri: selectedVideo.videoUrl }} 
                      style={StyleSheet.absoluteFill} 
                      resizeMode={ResizeMode.COVER} 
                      shouldPlay 
                      isLooping 
                      onPlaybackStatusUpdate={onPlaybackStatusUpdate} 
                    />
                    
                    <TouchableOpacity 
                      activeOpacity={1} 
                      onPress={togglePlayPause} 
                      style={styles.touchOverlay}
                    >
                        {!isPlaying && (
                          <Ionicons 
                            name="play" 
                            size={80} 
                            color="rgba(255,255,255,0.6)" 
                          />
                        )}
                    </TouchableOpacity>
                    
                    {/* Barre de progression */}
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                    </View>
                    
                    {/* Infos vidéo */}
                    <View style={styles.leftSide}>
                        <Text style={styles.videoTitleFull}>{selectedVideo.title}</Text>
                        <Text style={styles.videoDescFull}>
                          {selectedVideo.description}
                        </Text>
                        <View style={styles.videoStatsPlayer}>
                          <View style={styles.statPlayerItem}>
                            <Ionicons name="eye" size={14} color="white" />
                            <Text style={styles.statPlayerText}>{selectedVideo.views} vues</Text>
                          </View>
                          <View style={styles.statPlayerItem}>
                            <Ionicons name="heart" size={14} color="white" />
                            <Text style={styles.statPlayerText}>{selectedVideo.likes} likes</Text>
                          </View>
                        </View>
                    </View>
                    
                    {/* Actions */}
                    <View style={styles.rightSide}>
                        <TouchableOpacity 
                          style={styles.actionBtn} 
                          onPress={() => setShowComments(true)}
                        >
                            <Ionicons name="chatbubble-ellipses" size={32} color="white" />
                            <Text style={styles.actionText}>{selectedVideo.comments}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.actionBtn} 
                          onPress={() => setShowVideoOptions(true)}
                        >
                            <Ionicons name="ellipsis-horizontal-circle" size={32} color="white" />
                            <Text style={styles.actionText}>Options</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Bouton fermer */}
                    <TouchableOpacity 
                      onPress={() => {
                        setShowPlayer(false);
                        setIsPlaying(false);
                      }} 
                      style={styles.closePlayerBtn}
                    >
                      <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                </>
            )}
        </View>
      </Modal>

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

      {/* OPTIONS VIDEO (ID 49 - Ajout de "Modifier") */}
      <Modal visible={showVideoOptions} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVideoOptions(false)}
        >
          <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Options de la vidéo</Text>
              
              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={openEditVideo}
              >
                <Ionicons name="create-outline" size={20} color="#7459f0" />
                <Text style={styles.modalOptionText}>Modifier</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={togglePinVideo}
              >
                <Ionicons 
                  name={selectedVideo?.isPinned ? "bookmark" : "bookmark-outline"} 
                  size={20} 
                  color="#7459f0" 
                />
                <Text style={styles.modalOptionText}>
                  {selectedVideo?.isPinned ? "Désépingler" : "Épingler"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={deleteVideo}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text style={[styles.modalOptionText, { color: "#ef4444" }]}>
                  Supprimer
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setShowVideoOptions(false)} 
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL MODIFIER VIDÉO (ID 49) */}
      <Modal visible={showEditVideo} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditVideo(false)}
        >
          <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Modifier la vidéo</Text>
              
              <TextInput 
                placeholder="Titre de la vidéo" 
                value={editedVideoTitle} 
                onChangeText={setEditedVideoTitle} 
                style={styles.modalInput}
                placeholderTextColor="#9CA3AF"
              />
              
              <TextInput 
                placeholder="Description (optionnel)" 
                value={editedVideoDesc} 
                onChangeText={setEditedVideoDesc} 
                style={[styles.modalInput, { height: 80 }]}
                multiline
                placeholderTextColor="#9CA3AF"
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  onPress={() => setShowEditVideo(false)}
                  style={styles.modalBtnSecondary}
                >
                  <Text style={styles.modalBtnSecondaryText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={saveEditedVideo}
                  style={styles.modalBtnPrimary}
                >
                  <Text style={styles.modalBtnPrimaryText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CREATE PLAYLIST */}
      <Modal visible={showCreatePlaylist} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreatePlaylist(false)}
        >
          <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Nouvelle playlist</Text>
              
              <TextInput 
                placeholder="Nom de la playlist" 
                value={newPlaylistName} 
                onChangeText={setNewPlaylistName} 
                style={styles.modalInput}
                placeholderTextColor="#9CA3AF"
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  onPress={() => setShowCreatePlaylist(false)}
                  style={styles.modalBtnSecondary}
                >
                  <Text style={styles.modalBtnSecondaryText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={createPlaylist}
                  style={styles.modalBtnPrimary}
                >
                  <Text style={styles.modalBtnPrimaryText}>Créer</Text>
                </TouchableOpacity>
              </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DÉTAILS PLAYLIST (ID 45, 58) */}
      <Modal 
        visible={selectedPlaylist !== null} 
        animationType="slide"
        transparent
      >
        <View style={styles.playlistDetailOverlay}>
          <View style={styles.playlistDetailContainer}>
            {/* Header */}
            <View style={styles.playlistDetailHeader}>
              <TouchableOpacity 
                onPress={() => setSelectedPlaylist(null)}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>
              
              <Text style={styles.playlistDetailTitle}>
                {selectedPlaylist?.name}
              </Text>
              
              <TouchableOpacity 
                onPress={deletePlaylist}
                style={styles.deletePlaylistIconBtn}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* Bouton ajouter vidéo */}
            <TouchableOpacity 
              style={styles.addVideoToPlBtn}
              onPress={openAddVideoModal}
            >
              <Ionicons name="add-circle" size={20} color="#7459f0" />
              <Text style={styles.addVideoToPlText}>Ajouter une vidéo</Text>
            </TouchableOpacity>

            {/* Liste des vidéos */}
            <ScrollView style={styles.playlistVideosScroll}>
              {selectedPlaylistVideos.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="videocam-outline" size={60} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Playlist vide</Text>
                  <Text style={styles.emptySubtext}>
                    Ajoutez des vidéos à cette playlist
                  </Text>
                </View>
              ) : (
                selectedPlaylistVideos.map((video, index) => (
                  <View key={video.id} style={styles.playlistVideoItem}>
                    <TouchableOpacity 
                      style={styles.playlistVideoThumb}
                      onPress={() => handleVideoPress(video)}
                    >
                      {video.thumbnail ? (
                        <Image 
                          source={{ uri: video.thumbnail }} 
                          style={styles.playlistVideoThumbImg} 
                        />
                      ) : (
                        <LinearGradient
                          colors={['#7459f0', '#5b3fd1']}
                          style={styles.playlistVideoThumbImg}
                        >
                          <Ionicons name="play" size={20} color="white" />
                        </LinearGradient>
                      )}
                    </TouchableOpacity>
                    
                    <View style={styles.playlistVideoInfo}>
                      <Text style={styles.playlistVideoTitle} numberOfLines={2}>
                        {video.title}
                      </Text>
                      <Text style={styles.playlistVideoStats}>
                        {video.views} vues • {video.likes} likes
                      </Text>
                    </View>
                    
                    {/* ID 51 - Supprimer de la playlist */}
                    <TouchableOpacity 
                      style={styles.removeVideoBtn}
                      onPress={() => removeVideoFromPlaylist(video.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL AJOUTER VIDÉO À PLAYLIST */}
      <Modal 
        visible={showAddVideoModal} 
        transparent 
        animationType="fade"
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddVideoModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter une vidéo</Text>
            
            <ScrollView style={styles.modalVideosList}>
              {myVideos.filter(v => 
                !selectedPlaylist?.videoIds.includes(v.id)
              ).map(video => (
                <TouchableOpacity 
                  key={video.id}
                  style={styles.modalVideoItem}
                  onPress={() => addVideoToPlaylist(video)}
                >
                  <View style={styles.modalVideoThumb}>
                    {video.thumbnail ? (
                      <Image 
                        source={{ uri: video.thumbnail }} 
                        style={styles.modalVideoThumbImg} 
                      />
                    ) : (
                      <LinearGradient
                        colors={['#7459f0', '#5b3fd1']}
                        style={styles.modalVideoThumbImg}
                      >
                        <Ionicons name="play" size={16} color="white" />
                      </LinearGradient>
                    )}
                  </View>
                  <Text style={styles.modalVideoItemText} numberOfLines={2}>
                    {video.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              onPress={() => setShowAddVideoModal(false)}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL HISTORIQUE (ID 43, 398) */}
      <Modal 
        visible={showHistory} 
        animationType="slide"
        transparent
      >
        <View style={styles.historyOverlay}>
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <TouchableOpacity 
                onPress={() => setShowHistory(false)}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>
              
              <Text style={styles.historyTitle}>Historique</Text>
              
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.historyScroll}>
              {watchHistory.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={60} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Aucun historique</Text>
                  <Text style={styles.emptySubtext}>
                    Vos vidéos regardées apparaîtront ici
                  </Text>
                </View>
              ) : (
                watchHistory.map((video) => (
                  <TouchableOpacity 
                    key={video.id}
                    style={styles.historyItem}
                    onPress={() => {
                      setShowHistory(false);
                      handleVideoPress(video);
                    }}
                  >
                    <View style={styles.historyThumb}>
                      {video.thumbnail ? (
                        <Image 
                          source={{ uri: video.thumbnail }} 
                          style={styles.historyThumbImg} 
                        />
                      ) : (
                        <LinearGradient
                          colors={['#7459f0', '#5b3fd1']}
                          style={styles.historyThumbImg}
                        >
                          <Ionicons name="play" size={20} color="white" />
                        </LinearGradient>
                      )}
                    </View>
                    
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyVideoTitle} numberOfLines={2}>
                        {video.title}
                      </Text>
                      <Text style={styles.historyVideoStats}>
                        {video.views} vues • {video.likes} likes
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  
  // Header
  headerWrapper: { 
    marginBottom: 50 
  },
  headerGradient: { 
    height: 140, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30, 
    paddingTop: 50, 
    paddingHorizontal: 20 
  },
  topIcons: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end' 
  },
  glassIcon: { 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    padding: 10, 
    borderRadius: 20, 
    marginLeft: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  
  // Avatar
  avatarSection: { 
    position: 'absolute', 
    bottom: -40, 
    left: 0, 
    right: 0, 
    alignItems: 'center' 
  },
  avatarContainer: { 
    position: 'relative' 
  },
  avatarBorder: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    borderWidth: 4, 
    borderColor: '#FFFFFF', 
    backgroundColor: '#7459f0', 
    justifyContent: 'center', 
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  avatarImg: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 50 
  },
  avatarCircle: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 50, 
    backgroundColor: '#7459f0', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarInit: { 
    fontSize: 40, 
    color: '#FFFFFF', 
    fontWeight: 'bold' 
  },
  roleBadge: { 
    position: 'absolute', 
    bottom: -5, 
    alignSelf: 'center', 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 12, 
    paddingVertical: 5, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  roleText: { 
    fontSize: 10, 
    fontWeight: 'bold', 
    color: '#7459f0', 
    marginLeft: 4 
  },

  // Identity & Edit
  identitySection: { 
    alignItems: 'center', 
    marginTop: 10, 
    paddingHorizontal: 20 
  },
  name: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1F2937' 
  },
  bio: { 
    fontSize: 14, 
    color: '#6B7280', 
    textAlign: 'center', 
    marginTop: 6,
    lineHeight: 20
  },
  modifyBtn: { 
    marginTop: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 24, 
    borderRadius: 20, 
    borderWidth: 1.5, 
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF'
  },
  modifyText: { 
    fontSize: 14, 
    color: '#7459f0', 
    fontWeight: '600', 
    marginLeft: 6 
  },
  editForm: { 
    width: '100%' 
  },
  input: { 
    backgroundColor: '#F9FAFB', 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 12, 
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 12
  },
  charCount: {
    position: 'absolute',
    right: 12,
    bottom: 20,
    fontSize: 12,
    color: '#9CA3AF'
  },
  editButtons: { 
    flexDirection: 'row',
    marginTop: 8
  },
  saveBtn: { 
    flex: 1, 
    backgroundColor: '#7459f0', 
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center',
    marginLeft: 8
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600'
  },
  cancelBtn: { 
    flex: 1,
    backgroundColor: '#F3F4F6', 
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center'
  },
  cancelBtnText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600'
  },

  // Stats
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    marginTop: 20 
  },
  statCard: { 
    width: '31%', 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  statNum: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#1F2937' 
  },
  statLabel: { 
    fontSize: 11, 
    color: '#9CA3AF', 
    marginTop: 4 
  },

  // Progression Section (ID 62)
  progressSection: {
    paddingHorizontal: 20,
    marginTop: 20
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12
  },
  historyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7459f0',
    marginLeft: 6
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  progressItem: {
    flex: 1,
    alignItems: 'center'
  },
  progressLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6
  },
  progressValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7459f0'
  },
  progressDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB'
  },

  // Tabs
  tabBar: { 
    flexDirection: 'row', 
    marginHorizontal: 20, 
    marginTop: 25, 
    backgroundColor: '#F9FAFB', 
    padding: 4, 
    borderRadius: 16 
  },
  tabItem: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    borderRadius: 12 
  },
  tabItemActive: { 
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tabText: {
    fontSize: 14,
    color: '#71717A',
    marginLeft: 6,
    fontWeight: '500'
  },
  tabTextActive: {
    color: '#7459f0',
    fontWeight: '600'
  },

  // Content
  contentContainer: { 
    padding: 20 
  },
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between'
  },
  videoCard: { 
    width: '48%', 
    marginBottom: 20 
  },
  videoCardPinned: { 
    borderColor: '#7459f0', 
    borderWidth: 2, 
    borderRadius: 14,
    padding: 3
  },
  videoThumb: { 
    width: '100%', 
    height: 120, 
    backgroundColor: '#1F2937', 
    borderRadius: 12, 
    overflow: 'hidden', 
    position: 'relative' 
  },
  thumbImage: { 
    width: '100%', 
    height: '100%' 
  },
  thumbGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  // ID 47, 48 - Stats sur la vidéo (vues + likes)
  videoStats: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row'
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6
  },
  statBadgeText: {
    color: 'white',
    fontSize: 10,
    marginLeft: 3,
    fontWeight: '600'
  },
  pinBadge: { 
    position: 'absolute', 
    top: 6, 
    left: 6, 
    backgroundColor: '#7459f0', 
    padding: 6, 
    borderRadius: 8 
  },
  videoTitle: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#1F2937', 
    marginTop: 8,
    lineHeight: 18
  },

  // Playlists
  createPlaylistBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3E8FF', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16,
    justifyContent: 'center'
  },
  createPlaylistText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7459f0',
    marginLeft: 8
  },
  playlistCard: { 
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  playlistIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  playlistInfo: {
    flex: 1
  },
  playlistTitle: { 
    fontSize: 15,
    fontWeight: '600', 
    color: '#1F2937',
    marginBottom: 4
  },
  playlistSubtitle: {
    fontSize: 13,
    color: '#9CA3AF'
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12
  },
  emptySubtext: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 4,
    textAlign: 'center'
  },

  // Player Fullscreen
  fullScreenContainer: { 
    flex: 1, 
    backgroundColor: 'black' 
  },
  touchOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  progressBarContainer: { 
    position: 'absolute', 
    bottom: 50, 
    left: 0, 
    right: 0, 
    height: 3, 
    backgroundColor: 'rgba(255,255,255,0.3)' 
  },
  progressBarFill: { 
    height: '100%', 
    backgroundColor: '#7459f0' 
  },
  leftSide: { 
    position: 'absolute', 
    bottom: 70, 
    left: 15, 
    width: '70%' 
  },
  videoTitleFull: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: '700',
    marginBottom: 6
  },
  videoDescFull: { 
    color: '#ddd', 
    fontSize: 14, 
    marginTop: 4,
    lineHeight: 20
  },
  videoStatsPlayer: {
    flexDirection: 'row',
    marginTop: 12
  },
  statPlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  statPlayerText: {
    color: 'white',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500'
  },
  rightSide: { 
    position: 'absolute', 
    bottom: 70, 
    right: 12, 
    alignItems: 'center'
  },
  actionBtn: { 
    alignItems: 'center',
    marginBottom: 20
  },
  actionText: { 
    color: 'white', 
    fontSize: 12, 
    fontWeight: '600',
    marginTop: 6
  },
  closePlayerBtn: { 
    position: 'absolute', 
    top: 50, 
    left: 20, 
    padding: 10, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    borderRadius: 25 
  },

  // Modals
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    padding: 24, 
    borderRadius: 20,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20
  },
  modalOption: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6'
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
    fontWeight: '500'
  },
  modalCancel: { 
    marginTop: 16, 
    alignItems: 'center',
    paddingVertical: 12
  },
  modalCancelText: {
    fontSize: 15,
    color: '#7459f0',
    fontWeight: '600'
  },
  modalInput: { 
    backgroundColor: '#F9FAFB', 
    padding: 14, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    marginBottom: 16,
    fontSize: 15,
    color: '#1F2937'
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 8
  },
  modalBtnSecondary: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8
  },
  modalBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280'
  },
  modalBtnPrimary: {
    flex: 1,
    backgroundColor: '#7459f0',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8
  },
  modalBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  modalVideosList: {
    maxHeight: 300,
    marginBottom: 16
  },
  modalVideoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  modalVideoThumb: {
    width: 60,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12
  },
  modalVideoThumbImg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalVideoItemText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500'
  },

  // Playlist Detail Modal
  playlistDetailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end'
  },
  playlistDetailContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '90%',
    paddingTop: 20
  },
  playlistDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  backBtn: {
    padding: 8
  },
  playlistDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  deletePlaylistIconBtn: {
    padding: 8
  },
  addVideoToPlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16
  },
  addVideoToPlText: {
    color: '#7459f0',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 15
  },
  playlistVideosScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  playlistVideoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  playlistVideoThumb: {
    width: 80,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12
  },
  playlistVideoThumbImg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  playlistVideoInfo: {
    flex: 1
  },
  playlistVideoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 18
  },
  playlistVideoStats: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  removeVideoBtn: {
    padding: 8
  },

  // History Modal (ID 43, 398)
  historyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end'
  },
  historyContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '80%',
    paddingTop: 20
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  historyScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  historyThumb: {
    width: 80,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12
  },
  historyThumbImg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  historyInfo: {
    flex: 1
  },
  historyVideoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 18
  },
  historyVideoStats: {
    fontSize: 12,
    color: '#9CA3AF'
  },
});