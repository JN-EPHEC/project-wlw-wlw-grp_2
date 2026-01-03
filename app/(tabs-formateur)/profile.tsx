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
  doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, serverTimestamp, deleteDoc, arrayUnion, arrayRemove 
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
  
  // Edit Profile
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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

  // --- PLAYLIST DETAILS & ADD VIDEO STATES ---
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [selectedPlaylistVideos, setSelectedPlaylistVideos] = useState<CreatorVideo[]>([]);
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [likedVideosList, setLikedVideosList] = useState<CreatorVideo[]>([]);
  
  // Stats
  const totalViews = myVideos.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalLikes = myVideos.reduce((acc, curr) => acc + (curr.likes || 0), 0);

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

      // 1. Profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile(data);
        setEditedName(`${data.prenom || ''} ${data.nom || ''}`.trim());
        setEditedBio(data.bio || "Formateur expert 🎓");
      }

      // 2. Vidéos
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

      // 3. Playlists
      try {
          const pRef = collection(db, 'playlists');
          const pQuery = query(pRef, where('userId', '==', user.uid));
          const pSnapshot = await getDocs(pQuery);
          setMyPlaylists(pSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Playlist)));
      } catch (e) { console.log("Erreur playlists:", e); }

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
    const [prenom, ...nomArray] = editedName.split(' ');
    await updateDoc(doc(db, 'users', user.uid), { prenom: prenom || '', nom: nomArray.join(' ') || '', bio: editedBio });
    setIsEditing(false); loadProfile();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5,
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

  // --- HELPER: Fetch videos by IDs ---
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
        if (isPlaying) { await videoRef.current.pauseAsync(); setIsPlaying(false); }
        else { await videoRef.current.playAsync(); setIsPlaying(true); }
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

  const deleteVideo = async () => {
    if (!selectedVideo) return;
    Alert.alert("Confirmer", "Supprimer définitivement cette vidéo ?", [
        { text: "Annuler", style: 'cancel' },
        { text: "Supprimer", style: 'destructive', onPress: async () => {
            try {
                await deleteDoc(doc(db, 'videos', selectedVideo.id));
                setShowVideoOptions(false);
                setShowPlayer(false);
                loadProfile();
            } catch(e) { Alert.alert("Erreur", "Suppression échouée"); }
        }}
    ]);
  };

  // --- PLAYLIST ACTIONS ---
  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) {
        Alert.alert("Erreur", "Veuillez entrer un nom pour la playlist.");
        return;
    }
    setLoading(true);
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
        await loadProfile(); 
    } catch (e: any) {
        Alert.alert("Erreur", e.message);
    } finally {
        setLoading(false);
    }
  };

  // 1. Ouvrir une playlist
  const openPlaylist = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    const videos = await fetchVideosByIds(playlist.videoIds || []);
    setSelectedPlaylistVideos(videos);
  };

  // 2. Supprimer la playlist (CORRIGÉ & ROBUSTE)
  const deletePlaylist = async () => {
    console.log("🗑️ Clic suppression playlist");
    if (!selectedPlaylist) return;

    const performDelete = async () => {
        try {
            console.log("🔥 Suppression dans Firestore...");
            await deleteDoc(doc(db, 'playlists', selectedPlaylist.id));
            console.log("✅ Playlist supprimée");
            
            // Mise à jour locale (Optimistic UI Update)
            setMyPlaylists(prev => prev.filter(p => p.id !== selectedPlaylist.id));
            
            setSelectedPlaylist(null); // Fermer le modal
        } catch (e: any) {
            console.error("❌ Erreur suppression :", e);
            Alert.alert("Erreur", "Impossible de supprimer la playlist : " + e.message);
        }
    };

    if (Platform.OS === 'web') {
        if (confirm("Supprimer cette playlist ?")) {
            performDelete();
        }
    } else {
        Alert.alert(
            "Supprimer la playlist",
            "Êtes-vous sûr ? Cette action est irréversible.",
            [
                { text: "Annuler", style: "cancel" },
                { 
                    text: "Supprimer", 
                    style: "destructive", 
                    onPress: performDelete
                }
            ]
        );
    }
  };

  // 3. Charger les vidéos likées
  const openAddVideoModal = async () => {
    if (!userProfile?.likedVideos || userProfile.likedVideos.length === 0) {
        Alert.alert("Info", "Vous n'avez liké aucune vidéo pour le moment.");
        return;
    }
    
    // Filtrer les doublons
    const existingIds = selectedPlaylist?.videoIds || [];
    const candidateIds = userProfile.likedVideos.filter((id: string) => !existingIds.includes(id));

    if (candidateIds.length === 0) {
        Alert.alert("Info", "Toutes vos vidéos likées sont déjà dans cette playlist.");
        return;
    }

    const likedVids = await fetchVideosByIds(candidateIds);
    setLikedVideosList(likedVids);
    setShowAddVideoModal(true);
  };

  // 4. Ajouter une vidéo
  const addVideoToPlaylist = async (video: CreatorVideo) => {
    if (!selectedPlaylist) return;
    try {
        await updateDoc(doc(db, 'playlists', selectedPlaylist.id), {
            videoIds: arrayUnion(video.id)
        });
        
        setSelectedPlaylistVideos(prev => [...prev, video]);
        setLikedVideosList(prev => prev.filter(v => v.id !== video.id));
        
        if (likedVideosList.length <= 1) setShowAddVideoModal(false);

    } catch (e) {
        Alert.alert("Erreur", "Impossible d'ajouter la vidéo");
    }
  };

  // 5. Retirer une vidéo
  const removeVideoFromPlaylist = async (videoId: string) => {
    if (!selectedPlaylist) return;
    try {
        await updateDoc(doc(db, 'playlists', selectedPlaylist.id), {
            videoIds: arrayRemove(videoId)
        });
        setSelectedPlaylistVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (e) {
        Alert.alert('Erreur', 'Impossible de retirer la vidéo');
    }
  };

  if (loading || !userProfile) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#9333ea" /></View>;
  }

  const progressPercent = videoDuration > 0 ? (videoProgress / videoDuration) * 100 : 0;

  return (
    <View style={{flex: 1, backgroundColor: '#FFFFFF'}}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); loadProfile();}} />}
      >
        {/* HEADER */}
        <View style={styles.headerWrapper}>
            <LinearGradient colors={['#9333ea', '#7e22ce']} style={styles.headerGradient}>
                <View style={styles.topIcons}>
                    <TouchableOpacity style={styles.glassIcon} onPress={() => setShowSettings(true)}>
                        <Ionicons name="settings-outline" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.glassIcon, { backgroundColor: 'rgba(239, 68, 68, 0.4)' }]} onPress={signOut}>
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
                            <View style={styles.avatarCircle}><Text style={styles.avatarInit}>{userProfile.prenom?.[0] || 'F'}</Text></View>
                        )}
                    </TouchableOpacity>
                    <View style={styles.roleBadge}>
                        <Ionicons name="school" size={10} color="#9333ea" />
                        <Text style={styles.roleText}>Formateur</Text>
                    </View>
                </View>
            </View>
        </View>

        {/* IDENTITÉ */}
        <View style={styles.identitySection}>
            {isEditing ? (
                <View style={styles.editForm}>
                    <TextInput style={styles.input} value={editedName} onChangeText={setEditedName} placeholder="Nom complet" />
                    <TextInput style={[styles.input, { height: 60 }]} value={editedBio} onChangeText={setEditedBio} multiline placeholder="Bio" />
                    <View style={styles.editButtons}>
                        <TouchableOpacity style={[styles.saveBtn, styles.cancelBtn]} onPress={() => setIsEditing(false)}><Text style={styles.cancelBtnText}>Annuler</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}><Text style={styles.saveBtnText}>Enregistrer</Text></TouchableOpacity>
                    </View>
                </View>
            ) : (
                <>
                    <Text style={styles.name}>{userProfile.prenom} {userProfile.nom}</Text>
                    <Text style={styles.bio}>{userProfile.bio}</Text>
                    <Text style={{color:'#6B7280', fontSize:12, marginTop:4}}><Text style={{fontWeight:'bold', color:'#333'}}>{userProfile.followersCount || 0}</Text> Abonnés</Text>
                    <TouchableOpacity style={styles.modifyBtn} onPress={() => setIsEditing(true)}>
                        <Ionicons name="create-outline" size={16} color="#9333ea" />
                        <Text style={styles.modifyText}>Modifier le profil</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statNum}>{totalViews}</Text><Text style={styles.statLabel}>Vues</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{totalLikes} ❤️</Text><Text style={styles.statLabel}>J'aime</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{myVideos.length}</Text><Text style={styles.statLabel}>Vidéos</Text></View>
        </View>

        {/* ONGLETS */}
        <View style={styles.tabBar}>
            {['videos', 'playlists'].map((tab) => (
                <TouchableOpacity key={tab} style={[styles.tabItem, activeTab === tab && styles.tabItemActive]} onPress={() => setActiveTab(tab)}>
                    <Ionicons name={tab === 'videos' ? 'videocam' : 'list'} size={20} color={activeTab === tab ? '#9333ea' : '#71717A'} />
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'videos' ? 'Mes Vidéos' : 'Playlists'}</Text>
                </TouchableOpacity>
            ))}
        </View>

        {/* CONTENU GRILLE */}
        <View style={styles.contentContainer}>
            {activeTab === 'videos' && (
                <View style={styles.gridContainer}>
                    {myVideos.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={{color:'#777', marginBottom:10}}>Aucune vidéo publiée.</Text>
                            <TouchableOpacity style={styles.uploadBtn} onPress={() => router.push('/(tabs-formateur)/upload' as any)}>
                                <Text style={{color:'white', fontWeight:'bold'}}>Publier maintenant</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        myVideos.map((video) => (
                            <TouchableOpacity 
                                key={video.id} 
                                style={[styles.videoCard, video.isPinned && styles.videoCardPinned]}
                                onPress={() => handleVideoPress(video)}
                            >
                                <View style={styles.videoThumb}>
                                    {video.thumbnail ? (
                                        <Image source={{ uri: video.thumbnail }} style={styles.thumbImage} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.center, {backgroundColor:'#333'}]}><Ionicons name="play-circle" size={30} color="white" /></View>
                                    )}
                                    {video.isPinned && <View style={styles.pinBadge}><Ionicons name="pricetag" size={12} color="white" /></View>}
                                    <View style={styles.overlayBottomRight}>
                                        <Ionicons name="play" size={10} color="white" />
                                        <Text style={styles.overlayTextSm}>{video.views}</Text>
                                    </View>
                                </View>
                                <View style={styles.videoInfoBlock}>
                                    <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            )}

            {activeTab === 'playlists' && (
                <View>
                    <TouchableOpacity style={styles.createPlaylistBtn} onPress={() => setShowCreatePlaylist(true)}>
                        <View style={styles.createPlaylistIcon}><Ionicons name="add" size={24} color="#9333ea" /></View>
                        <Text style={styles.createPlaylistText}>Nouvelle Playlist</Text>
                    </TouchableOpacity>
                    {myPlaylists.map(pl => (
                        <TouchableOpacity key={pl.id} style={styles.playlistCard} onPress={() => openPlaylist(pl)}>
                            <View style={styles.playlistIcon}><Ionicons name="musical-notes" size={24} color="#9333ea" /></View>
                            <View style={{flex:1}}>
                                <Text style={styles.playlistTitle}>{pl.name}</Text>
                                <Text style={styles.playlistCount}>{pl.videoIds?.length || 0} vidéos</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
        <View style={{height: 100}} />
      </ScrollView>

      {/* ================================================= */}
      {/* MODAL LECTEUR VIDÉO (AVEC GESTION) */}
      {/* ================================================= */}
      <Modal visible={showPlayer && selectedVideo !== null} animationType="slide" transparent={false} onRequestClose={() => setShowPlayer(false)}>
        <View style={styles.fullScreenContainer}>
            <StatusBar hidden />
            {selectedVideo && (
                <>
                    <Video
                        ref={videoRef}
                        source={{ uri: selectedVideo.videoUrl }}
                        style={StyleSheet.absoluteFill}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={true}
                        isLooping
                        useNativeControls={false}
                        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                    />

                    <TouchableOpacity activeOpacity={1} onPress={togglePlayPause} style={styles.touchOverlay}>
                        {!isPlaying && (
                            <View style={styles.playIconContainer}><Ionicons name="play" size={80} color="rgba(255,255,255,0.6)" /></View>
                        )}
                    </TouchableOpacity>

                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay} />

                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBackground}>
                            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                        </View>
                    </View>

                    {/* GAUCHE : INFOS */}
                    <View style={styles.leftSide}>
                        <View style={styles.creatorRow}>
                            <View style={styles.miniAvatar}>
                                {userProfile?.photoURL ? (
                                    <Image source={{ uri: userProfile.photoURL }} style={{width:'100%', height:'100%'}} />
                                ) : (
                                    <Text style={styles.miniAvatarText}>{userProfile?.prenom?.[0]}</Text>
                                )}
                            </View>
                            <Text style={styles.creatorName}>@{userProfile?.prenom} {userProfile?.nom} (Moi)</Text>
                        </View>
                        <Text style={styles.videoTitleFull}>{selectedVideo.title}</Text>
                        <Text style={styles.videoDescFull} numberOfLines={2}>{selectedVideo.description}</Text>
                    </View>

                    {/* DROITE : ACTIONS DE GESTION */}
                    <View style={styles.rightSide}>
                        <View style={styles.rightAvatarContainer}>
                            <View style={styles.rightAvatarCircle}>
                                {userProfile?.photoURL ? (
                                    <Image source={{ uri: userProfile.photoURL }} style={{width:'100%', height:'100%'}} />
                                ) : (
                                    <Text style={{color:'white', fontWeight:'bold'}}>{userProfile?.prenom?.[0]}</Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.actionBtn}>
                            <Ionicons name="heart" size={35} color="white" />
                            <Text style={styles.actionText}>{selectedVideo.likes}</Text>
                        </View>

                        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)}>
                            <Ionicons name="chatbubble-ellipses" size={35} color="white" />
                            <Text style={styles.actionText}>{selectedVideo.comments || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} onPress={()=>Alert.alert("Info", "Vidéo ajoutée à vos archives.")}>
                             <Ionicons name="bookmark" size={35} color="white" />
                             <Text style={styles.actionText}>Sauver</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowVideoOptions(true)}>
                            <Ionicons name="ellipsis-horizontal-circle" size={40} color="white" />
                            <Text style={styles.actionText}>Gérer</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => setShowPlayer(false)} style={styles.closePlayerBtn}>
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
            onClose={() => setShowComments(false)} 
        />
      )}

      {/* MODAL OPTIONS VIDÉO */}
      <Modal visible={showVideoOptions} transparent animationType="fade" onRequestClose={() => setShowVideoOptions(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Gérer la vidéo</Text>
                
                <TouchableOpacity style={styles.modalOption} onPress={() => { setShowVideoOptions(false); }}>
                    <Ionicons name="create-outline" size={24} color="#333" />
                    <Text style={styles.modalOptionText}>Modifier les infos</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalOption} onPress={togglePinVideo}>
                    <Ionicons name={selectedVideo?.isPinned ? "pricetag-outline" : "pricetag"} size={24} color="#9333ea" />
                    <Text style={styles.modalOptionText}>{selectedVideo?.isPinned ? "Désépingler" : "Épingler en haut"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalOption, {borderBottomWidth:0}]} onPress={deleteVideo}>
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                    <Text style={[styles.modalOptionText, {color:'#EF4444'}]}>Supprimer définitivement</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowVideoOptions(false)}>
                    <Text style={{color:'#777'}}>Annuler</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* MODAL SETTINGS */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
        <View style={styles.settingsContainer}>
            <View style={styles.settingsHeader}>
                <TouchableOpacity onPress={() => setShowSettings(false)}>
                    <Ionicons name="chevron-back" size={28} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.settingsTitle}>Paramètres</Text>
                <View style={{width: 28}} /> 
            </View>
            <View style={{padding:20}}><Text>Paramètres du compte...</Text></View>
        </View>
      </Modal>

      {/* MODAL CREATE PLAYLIST */}
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
            {/* Header avec bouton Poubelle */}
            <View style={styles.sheetHeader}>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <TouchableOpacity onPress={() => setSelectedPlaylist(null)} style={{marginRight: 10}}>
                        <Ionicons name="close" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.sheetTitle}>{selectedPlaylist?.name}</Text>
                </View>
                {/* BOUTON POUBELLE */}
                <TouchableOpacity onPress={deletePlaylist} style={styles.deletePlaylistBtn}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{padding: 20}}>
                {/* Bouton Ajouter des vidéos */}
                <TouchableOpacity style={styles.addVideoToPlBtn} onPress={openAddVideoModal}>
                    <Ionicons name="add-circle" size={24} color="#9333ea" />
                    <Text style={styles.addVideoToPlText}>Ajouter des vidéos likées</Text>
                </TouchableOpacity>

                {/* Liste des vidéos */}
                {selectedPlaylistVideos.length === 0 ? (
                    <Text style={styles.emptyText}>Playlist vide</Text>
                ) : (
                    selectedPlaylistVideos.map(vid => (
                        <View key={vid.id} style={styles.sheetVideoItem}>
                            <View style={{width: 60, height: 40, backgroundColor: '#eee', borderRadius: 4, marginRight: 10}} >
                                {vid.thumbnail && <Image source={{uri:vid.thumbnail}} style={{width:'100%', height:'100%', borderRadius:4}} />}
                            </View>
                            <Text style={{flex:1, fontWeight:'600'}} numberOfLines={1}>{vid.title}</Text>
                            <TouchableOpacity onPress={() => removeVideoFromPlaylist(vid.id)}>
                                <Ionicons name="remove-circle-outline" size={24} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
      </Modal>

      {/* MODAL SÉLECTION VIDÉOS LIKÉES (AJOUT) */}
      <Modal visible={showAddVideoModal} animationType="slide" onRequestClose={() => setShowAddVideoModal(false)}>
        <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Ajouter à la playlist</Text>
                <TouchableOpacity onPress={() => setShowAddVideoModal(false)}><Text style={{color:'#9333ea'}}>Fermer</Text></TouchableOpacity>
            </View>
            <FlatList 
                data={likedVideosList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{padding: 20}}
                renderItem={({item}) => (
                    <TouchableOpacity style={styles.sheetVideoItem} onPress={() => addVideoToPlaylist(item)}>
                        <View style={{width: 60, height: 40, backgroundColor: '#333', borderRadius: 4, marginRight: 10}}>
                             {item.thumbnail ? (
                                <Image source={{uri: item.thumbnail}} style={{width:'100%', height:'100%', borderRadius:4}} />
                             ) : (
                                <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Ionicons name="play" color="white" /></View>
                             )}
                        </View>
                        <View style={{flex:1}}>
                            <Text style={{fontWeight:'600'}} numberOfLines={1}>{item.title}</Text>
                            <Text style={{fontSize:12, color:'#777'}}>J'aime</Text>
                        </View>
                        <Ionicons name="add-circle-outline" size={28} color="#9333ea" />
                    </TouchableOpacity>
                )}
            />
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  headerWrapper: { marginBottom: 50 },
  headerGradient: { height: 140, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingTop: 50, paddingHorizontal: 20 },
  topIcons: { flexDirection: 'row', justifyContent: 'flex-end' },
  glassIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20, marginLeft: 10 },

  avatarSection: { position: 'absolute', bottom: -40, left: 0, right: 0, alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatarBorder: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFF', backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 50 },
  avatarCircle: { width: '100%', height: '100%', borderRadius: 50, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center' },
  avatarInit: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
  roleBadge: { position: 'absolute', bottom: -5, alignSelf: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  roleText: { fontSize: 10, fontWeight: 'bold', color: '#9333ea', marginLeft: 4 },

  identitySection: { alignItems: 'center', marginTop: 10, paddingHorizontal: 20 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  bio: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 },
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
  statCard: { width: '31%', backgroundColor: '#FFF', padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', elevation: 1 },
  statNum: { fontSize: 18, fontWeight: 'bold', color: '#4B5563' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 25, backgroundColor: '#F9FAFB', padding: 4, borderRadius: 16 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  tabItemActive: { backgroundColor: '#FFF', elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginLeft: 4 },
  tabTextActive: { color: '#111827' },

  contentContainer: { padding: 20 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  
  videoCard: { width: '48%', marginBottom: 15 },
  videoCardPinned: { borderColor: '#9333ea', borderWidth: 2, borderRadius: 14 },
  videoThumb: { width: '100%', height: 120, backgroundColor: '#333', borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumbImage: { width: '100%', height: '100%' },
  
  overlayBottomRight: { position: 'absolute', bottom: 5, right: 5, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  overlayTextSm: { color: 'white', fontSize: 10, marginLeft: 3 },
  pinBadge: { position: 'absolute', top: 5, left: 5, backgroundColor: '#9333ea', padding: 4, borderRadius: 4 },

  videoInfoBlock: { padding: 5 },
  videoTitle: { fontSize: 12, fontWeight: '600', color: '#374151' },

  createPlaylistBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  createPlaylistIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  createPlaylistText: { fontWeight: '600', color: '#1F2937' },
  playlistCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  playlistIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  playlistTitle: { fontWeight: 'bold', color: '#1F2937' },
  playlistCount: { fontSize: 12, color: '#9CA3AF' },

  emptyState: { padding: 40, alignItems: 'center', width: '100%' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 20 },
  uploadBtn: { marginTop: 10, backgroundColor: '#9333ea', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },

  // --- PLAYER STYLES ---
  fullScreenContainer: { flex: 1, backgroundColor: 'black' },
  touchOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playIconContainer: { opacity: 0.8 },
  gradientOverlay: { position: 'absolute', bottom: 0, width: '100%', height: 300 },
  progressBarContainer: { position: 'absolute', bottom: 50, left: 0, right: 0, paddingHorizontal: 0, zIndex: 40 },
  progressBarBackground: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', width: '100%' },
  progressBarFill: { height: '100%', backgroundColor: '#9333ea' },
  
  leftSide: { position: 'absolute', bottom: 70, left: 15, width: '70%', zIndex: 30 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'white', marginRight: 10, overflow:'hidden', backgroundColor:'#9333ea', justifyContent:'center', alignItems:'center' },
  miniAvatarText: { color:'white', fontWeight:'bold' },
  creatorName: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  videoTitleFull: { color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  videoDescFull: { color: '#ddd', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  
  rightSide: { position: 'absolute', bottom: 70, right: 10, alignItems: 'center', gap: 20, zIndex: 30 },
  rightAvatarContainer: { marginBottom: 10, alignItems:'center' },
  rightAvatarCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center', backgroundColor: '#9333ea', overflow:'hidden' },
  
  actionBtn: { alignItems: 'center', gap: 5 },
  actionText: { color: 'white', fontSize: 12, marginTop: 4, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  closePlayerBtn: { position: 'absolute', top: 50, left: 20, padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, zIndex: 999 },

  // --- MODALS ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 20, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOptionText: { fontSize: 16, marginLeft: 15, color: '#333' },
  modalCancel: { marginTop: 15, alignItems: 'center' },
  modalInput: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },

  settingsContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: '#FFF' },
  settingsTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },

  // --- PLAYLIST DETAIL SHEET ---
  sheetContainer: { flex: 1, backgroundColor: '#FFF', marginTop: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: 'bold' },
  deletePlaylistBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  addVideoToPlBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#F3E8FF', padding:15, borderRadius:12, marginBottom:20 },
  addVideoToPlText: { color:'#9333ea', fontWeight:'bold', marginLeft:10 },
  sheetVideoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F9FAFB' },
});