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
  creatorId: string; // Ajouté pour la cohérence
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

  // --- PLAYLIST DETAILS STATES ---
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

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile(data);
        setEditedName(`${data.prenom || ''} ${data.nom || ''}`.trim());
        setEditedBio(data.bio || "Formateur expert 🎓");
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
            name: newPlaylistName, userId: user.uid, videoIds: [], createdAt: serverTimestamp()
        });
        setNewPlaylistName(''); setShowCreatePlaylist(false); loadProfile();
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
    if (Platform.OS === 'web') { if (confirm("Supprimer ?")) performDelete(); }
    else { Alert.alert("Supprimer", "Sûr ?", [{text:"Non"}, {text:"Oui", onPress:performDelete}]); }
  };

  const openAddVideoModal = async () => {
    if (!userProfile?.likedVideos?.length) return Alert.alert("Info", "Pas de likes");
    const likedVids = await fetchVideosByIds(userProfile.likedVideos);
    setLikedVideosList(likedVids);
    setShowAddVideoModal(true);
  };

  const addVideoToPlaylist = async (video: CreatorVideo) => {
    if (!selectedPlaylist) return;
    await updateDoc(doc(db, 'playlists', selectedPlaylist.id), { videoIds: arrayUnion(video.id) });
    setSelectedPlaylistVideos(prev => [...prev, video]);
    setShowAddVideoModal(false);
  };

  const removeVideoFromPlaylist = async (videoId: string) => {
    if (!selectedPlaylist) return;
    await updateDoc(doc(db, 'playlists', selectedPlaylist.id), { videoIds: arrayRemove(videoId) });
    setSelectedPlaylistVideos(prev => prev.filter(v => v.id !== videoId));
  };

  if (loading || !userProfile) return <View style={styles.center}><ActivityIndicator size="large" color="#9333ea" /></View>;

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
                    <View style={styles.roleBadge}><Ionicons name="school" size={10} color="#9333ea" /><Text style={styles.roleText}>Formateur</Text></View>
                </View>
            </View>
        </View>

        {/* IDENTITY */}
        <View style={styles.identitySection}>
            {isEditing ? (
                <View style={styles.editForm}>
                    <TextInput style={styles.input} value={editedName} onChangeText={setEditedName} placeholder="Nom" />
                    <TextInput style={[styles.input, { height: 60 }]} value={editedBio} onChangeText={setEditedBio} multiline />
                    <View style={styles.editButtons}>
                        <TouchableOpacity style={[styles.saveBtn, styles.cancelBtn]} onPress={() => setIsEditing(false)}><Text>Annuler</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}><Text style={{color:"white"}}>Save</Text></TouchableOpacity>
                    </View>
                </View>
            ) : (
                <>
                    <Text style={styles.name}>{userProfile.prenom} {userProfile.nom}</Text>
                    <Text style={styles.bio}>{userProfile.bio}</Text>
                    <TouchableOpacity style={styles.modifyBtn} onPress={() => setIsEditing(true)}>
                        <Ionicons name="create-outline" size={16} color="#9333ea" />
                        <Text style={styles.modifyText}>Modifier</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statNum}>{totalViews}</Text><Text style={styles.statLabel}>Vues</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{totalLikes} ❤️</Text><Text style={styles.statLabel}>Likes</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{myVideos.length}</Text><Text style={styles.statLabel}>Vidéos</Text></View>
        </View>

        {/* ONGLETS */}
        <View style={styles.tabBar}>
            <TouchableOpacity onPress={() => setActiveTab('videos')} style={[styles.tabItem, activeTab === 'videos' && styles.tabItemActive]}>
                <Ionicons name="videocam" size={20} color={activeTab === 'videos' ? '#9333ea' : '#71717A'} /><Text>Vidéos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('playlists')} style={[styles.tabItem, activeTab === 'playlists' && styles.tabItemActive]}>
                <Ionicons name="list" size={20} color={activeTab === 'playlists' ? '#9333ea' : '#71717A'} /><Text>Playlists</Text>
            </TouchableOpacity>
        </View>

        {/* GRILLE */}
        <View style={styles.contentContainer}>
            {activeTab === 'videos' && (
                <View style={styles.gridContainer}>
                    {myVideos.map((video) => (
                        <TouchableOpacity key={video.id} style={[styles.videoCard, video.isPinned && styles.videoCardPinned]} onPress={() => handleVideoPress(video)}>
                            <View style={styles.videoThumb}>
                                {video.thumbnail ? <Image source={{ uri: video.thumbnail }} style={styles.thumbImage} /> : <View style={styles.center}><Ionicons name="play" size={30} color="white" /></View>}
                                {video.isPinned && <View style={styles.pinBadge}><Ionicons name="pricetag" size={10} color="white" /></View>}
                                <View style={styles.overlayBottomRight}><Ionicons name="play" size={10} color="white" /><Text style={styles.overlayTextSm}>{video.views}</Text></View>
                            </View>
                            <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
            {activeTab === 'playlists' && (
                <View>
                    <TouchableOpacity style={styles.createPlaylistBtn} onPress={() => setShowCreatePlaylist(true)}><Text>+ Playlist</Text></TouchableOpacity>
                    {myPlaylists.map(pl => (
                        <TouchableOpacity key={pl.id} style={styles.playlistCard} onPress={() => openPlaylist(pl)}>
                            <Text style={styles.playlistTitle}>{pl.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
        <View style={{height: 100}} />
      </ScrollView>

      {/* LECTEUR */}
      <Modal visible={showPlayer && selectedVideo !== null} animationType="slide">
        <View style={styles.fullScreenContainer}>
            <StatusBar hidden />
            {selectedVideo && (
                <>
                    <Video ref={videoRef} source={{ uri: selectedVideo.videoUrl }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} shouldPlay isLooping onPlaybackStatusUpdate={onPlaybackStatusUpdate} />
                    <TouchableOpacity activeOpacity={1} onPress={togglePlayPause} style={styles.touchOverlay}>
                        {!isPlaying && <Ionicons name="play" size={80} color="rgba(255,255,255,0.6)" />}
                    </TouchableOpacity>
                    <View style={styles.progressBarContainer}><View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} /></View>
                    <View style={styles.leftSide}>
                        <Text style={styles.videoTitleFull}>{selectedVideo.title}</Text>
                        <Text style={styles.videoDescFull}>{selectedVideo.description}</Text>
                    </View>
                    <View style={styles.rightSide}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)}>
                            <Ionicons name="chatbubble-ellipses" size={35} color="white" /><Text style={styles.actionText}>{selectedVideo.comments}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowVideoOptions(true)}>
                            <Ionicons name="ellipsis-horizontal-circle" size={40} color="white" /><Text style={styles.actionText}>Gérer</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => setShowPlayer(false)} style={styles.closePlayerBtn}><Ionicons name="close" size={30} color="white" /></TouchableOpacity>
                </>
            )}
        </View>
      </Modal>

      {/* MODAL COMMENTAIRES CORRIGÉ */}
      {selectedVideo && (
        <CommentModal 
            visible={showComments} 
            videoId={selectedVideo.id} 
            creatorId={selectedVideo.creatorId} // Correction ici
            videoTitle={selectedVideo.title}    // Correction ici
            onClose={() => setShowComments(false)} 
        />
      )}

      {/* OPTIONS VIDEO */}
      <Modal visible={showVideoOptions} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <TouchableOpacity style={styles.modalOption} onPress={togglePinVideo}><Text>📌 Épingler</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalOption} onPress={deleteVideo}><Text style={{color:"red"}}>🗑️ Supprimer</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setShowVideoOptions(false)} style={styles.modalCancel}><Text>Annuler</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* CREATE PLAYLIST */}
      <Modal visible={showCreatePlaylist} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <TextInput placeholder="Nom" value={newPlaylistName} onChangeText={setNewPlaylistName} style={styles.modalInput} />
                <TouchableOpacity onPress={createPlaylist}><Text>Créer</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setShowCreatePlaylist(false)}><Text>Annuler</Text></TouchableOpacity>
            </View>
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
  
  // Avatar
  avatarSection: { position: 'absolute', bottom: -40, left: 0, right: 0, alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatarBorder: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFF', backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 50 },
  avatarCircle: { width: '100%', height: '100%', borderRadius: 50, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center' },
  avatarInit: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
  roleBadge: { position: 'absolute', bottom: -5, alignSelf: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  roleText: { fontSize: 10, fontWeight: 'bold', color: '#9333ea', marginLeft: 4 },

  // Identity & Edit
  identitySection: { alignItems: 'center', marginTop: 10, paddingHorizontal: 20 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  bio: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  modifyBtn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  modifyText: { fontSize: 13, color: '#9333ea', fontWeight: '600', marginLeft: 6 },
  editForm: { width: '100%', gap: 10 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12 },
  editButtons: { flexDirection: 'row', gap: 10 },
  saveBtn: { flex: 1, backgroundColor: '#9333ea', padding: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F3F4F6', padding: 12, borderRadius: 10, alignItems: 'center', flex: 1 },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20 },
  statCard: { width: '31%', backgroundColor: '#FFF', padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', elevation: 1 },
  statNum: { fontSize: 18, fontWeight: 'bold', color: '#4B5563' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // Tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 25, backgroundColor: '#F9FAFB', padding: 4, borderRadius: 16 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  tabItemActive: { backgroundColor: '#FFF', elevation: 2 },

  // Content
  contentContainer: { padding: 20 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  videoCard: { width: '48%', marginBottom: 15 },
  videoCardPinned: { borderColor: '#9333ea', borderWidth: 2, borderRadius: 14 },
  videoThumb: { width: '100%', height: 120, backgroundColor: '#333', borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumbImage: { width: '100%', height: '100%' },
  overlayBottomRight: { position: 'absolute', bottom: 5, right: 5, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  overlayTextSm: { color: 'white', fontSize: 10, marginLeft: 3 },
  pinBadge: { position: 'absolute', top: 5, left: 5, backgroundColor: '#9333ea', padding: 4, borderRadius: 4 },
  videoTitle: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 5 },

  // Playlists (Correction de l'erreur ici)
  createPlaylistBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3E8FF', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 15,
    justifyContent: 'center'
  },
  playlistCard: { padding: 15, backgroundColor: "#F9FAFB", borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  playlistTitle: { fontWeight: "bold", color: '#1F2937' },

  // Player Fullscreen
  fullScreenContainer: { flex: 1, backgroundColor: 'black' },
  touchOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressBarContainer: { position: 'absolute', bottom: 50, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  progressBarFill: { height: '100%', backgroundColor: '#9333ea' },
  leftSide: { position: 'absolute', bottom: 70, left: 15, width: '70%' },
  videoTitleFull: { color: 'white', fontSize: 16, fontWeight: '700' },
  videoDescFull: { color: '#ddd', fontSize: 14, marginTop: 5 },
  rightSide: { position: 'absolute', bottom: 70, right: 10, alignItems: 'center', gap: 20 },
  actionBtn: { alignItems: 'center', gap: 5 },
  actionText: { color: 'white', fontSize: 12, fontWeight: '600' },
  closePlayerBtn: { position: 'absolute', top: 50, left: 20, padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 20, borderRadius: 20 },
  modalOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalCancel: { marginTop: 15, alignItems: 'center' },
  modalInput: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },

  // Sheet Playlist Detail
  sheetContainer: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: 'bold' },
  deletePlaylistBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  addVideoToPlBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#F3E8FF', padding:15, borderRadius:12, marginBottom:20 },
  addVideoToPlText: { color:'#9333ea', fontWeight:'bold', marginLeft:10 },
  sheetVideoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F9FAFB' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 20 },
  
  // Settings Modal
  settingsContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: '#FFF' },
  settingsTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
});