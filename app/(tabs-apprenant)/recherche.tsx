import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, 
  TouchableOpacity, Image, Platform, Modal, Dimensions, ActivityIndicator, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av'; 
import { LinearGradient } from 'expo-linear-gradient';

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
  serverTimestamp 
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
  createdAt?: any;
  tags?: string[];
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

export default function RechercheScreen() {
  // --- ÉTATS ---
  const [activeTab, setActiveTab] = useState<'videos' | 'creators'>('videos');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState('all'); 
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [creators, setCreators] = useState<CreatorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [creatorsLoaded, setCreatorsLoaded] = useState(false);
  
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<CreatorData | null>(null);
  const [creatorVideos, setCreatorVideos] = useState<VideoData[]>([]);

  // --- UTILITAIRES ---
  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.id.toLowerCase() === category.toLowerCase());
    return cat ? cat.label : category;
  };

  const getCategoryEmoji = (category: string) => {
    const cat = CATEGORIES.find(c => c.id.toLowerCase() === category.toLowerCase());
    return cat ? cat.emoji : '📚';
  };

  // --- CHARGEMENT VIDÉOS ---
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, "videos"));
        const videoList: VideoData[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as VideoData));

        const enriched = await Promise.all(videoList.map(async (v) => {
          const userDoc = await getDoc(doc(db, 'users', v.creatorId));
          return {
            ...v,
            creatorName: userDoc.exists() ? (userDoc.data().prenom + " " + userDoc.data().nom) : v.creatorName
          };
        }));
        
        enriched.sort((a, b) => (b.likes || 0) + (b.views || 0) - ((a.likes || 0) + (a.views || 0)));
        setVideos(enriched);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchVideos();
  }, []);

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

  // --- SUIVRE / NE PLUS SUIVRE ---
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
            filteredVideos.map((video, index) => (
              <TouchableOpacity key={video.id} style={[styles.videoCard, index < 3 && search === '' && styles.topVideoCard]} onPress={() => setSelectedVideo(video)}>
                <View style={styles.emojiContainer}>
                  <Text style={styles.categoryEmoji}>{getCategoryEmoji(video.category)}</Text>
                  {index < 3 && search === '' && <Text style={styles.medalEmoji}>{TOP_MEDALS[index]}</Text>}
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.vTitle} numberOfLines={2}>{video.title}</Text>
                  <Text style={styles.vCreator}>Par {video.creatorName}</Text>
                  <View style={styles.categoryBadge}><Text style={styles.categoryText}>{getCategoryLabel(video.category)}</Text></View>
                  <Text style={styles.statText}>👁️ {video.views}  ❤️ {video.likes}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D4D4D8" />
              </TouchableOpacity>
            ))
          ) : (
            creators.map(creator => (
              <TouchableOpacity key={creator.id} style={styles.creatorCard} onPress={() => setSelectedCreator(creator)}>
                <Image source={{ uri: creator.photoURL || 'https://via.placeholder.com/150' }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.creatorName}>{creator.name}</Text>
                  <Text style={styles.creatorFollowers}>{creator.followers} abonnés • {creator.videosCount} vidéos</Text>
                </View>
                <TouchableOpacity onPress={() => toggleFollow(creator.id)}>
                  <LinearGradient colors={followedIds.includes(creator.id) ? ['#FBA31A', '#F59E0B'] : ['#7459f0', '#9333ea', '#242A65']} style={styles.followBtn}>
                    <Text style={styles.followBtnText}>{followedIds.includes(creator.id) ? 'Suivi' : 'Suivre'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>

      {/* MODAL FILTRES */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrer par sujet</Text>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat.id} style={[styles.filterOption, selectedCat === cat.id && {backgroundColor: '#F3E8FF'}]} onPress={() => { setSelectedCat(cat.id); setShowFilterModal(false); }}>
                <Text style={{ fontSize: 20 }}>{cat.icon}  {cat.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={{marginTop: 20, alignSelf: 'center'}}><Text style={{color:'#9333EA', fontWeight:'bold'}}>Fermer</Text></TouchableOpacity>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  filterOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', borderRadius: 10 }
});