import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, 
  TouchableOpacity, Image, Platform, Modal, Dimensions, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av'; 

// --- IMPORTS FIREBASE ---
import { collection, getDocs } from 'firebase/firestore'; 
import { db } from '../../firebaseConfig'; 

const { width } = Dimensions.get('window');

// --- CATÉGORIES ---
const CATEGORIES = [
  { id: 'all', label: 'Tout', icon: '🌟' },
  { id: 'Marketing', label: 'Marketing Digital', icon: '📱' },
  { id: 'IA', label: 'Intelligence Artificielle', icon: '🤖' },
  { id: 'E-commerce', label: 'E-commerce', icon: '🛒' },
  { id: 'Design', label: 'Design', icon: '🎨' },
  { id: 'Dev', label: 'Développement', icon: '💻' },
];

const MOCK_CREATORS = [
  { id: 'c1', name: 'Marie Dupont', followers: '12.5k', tag: 'Marketing', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { id: 'c2', name: 'Thomas AI', followers: '28.9k', tag: 'IA', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { id: 'c3', name: 'Sophie Dev', followers: '5k', tag: 'Dev', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
];

// --- TYPES (Nettoyé : plus de 'thumb') ---
interface VideoData {
  id: string;
  title: string;
  creator: string;
  videoUrl: string;
  tag: string; 
  description?: string;
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
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);

  // --- CHARGEMENT FIREBASE ---
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "videos"));
        const videoList: VideoData[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          videoList.push({
            id: doc.id,
            title: data.title || 'Sans titre',
            creator: data.creator || 'Inconnu',
            videoUrl: data.videoUrl || '',
            // On ne récupère plus d'image ici
            tag: data.category ? String(data.category) : 'Général', 
            description: data.description || ''
          });
        });
        setVideos(videoList);
      } catch (error) {
        console.error("Erreur Firebase:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  // --- LOGIQUE DE FILTRE ---
  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const searchLower = search.toLowerCase().trim();
      const videoTagLower = v.tag.toLowerCase();
      const videoTitleLower = v.title.toLowerCase();

      // 1. Recherche TEXTUELLE
      const matchesSearch = 
          videoTitleLower.includes(searchLower) || 
          videoTagLower.includes(searchLower);

      // 2. Filtre par ENTONNOIR
      let matchesCategoryFilter = false;
      if (selectedCat === 'all') {
        matchesCategoryFilter = true;
      } else {
        const filterId = selectedCat.toLowerCase().trim();
        matchesCategoryFilter = 
            videoTagLower === filterId ||                       
            videoTagLower.includes(filterId) ||                 
            filterId.includes(videoTagLower) ||                 
            (filterId === 'ia' && videoTagLower.includes('intelligence')) || 
            (filterId === 'dev' && videoTagLower.includes('développement')); 
      }

      return matchesCategoryFilter && matchesSearch;
    });
  }, [videos, search, selectedCat]);

  // Filtre Créateurs
  const filteredCreators = useMemo(() => {
    return MOCK_CREATORS.filter(c => {
        const matchesSearch = 
            c.name.toLowerCase().includes(search.toLowerCase()) || 
            c.tag.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCat === 'all' || c.tag.toLowerCase().includes(selectedCat.toLowerCase());
        return matchesCategory && matchesSearch;
    });
  }, [search, selectedCat]);

  // --- ACTIONS ---
  const handleSearch = () => {
    if (search.trim().length > 0) {
      setHistory(prev => [search, ...prev.filter(item => item !== search)].slice(0, 5));
    }
  };

  const deleteFromHistory = (itemToDelete: string) => {
    setHistory(prev => prev.filter(item => item !== itemToDelete));
  };

  const toggleFollow = (id: string) => {
    setFollowedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

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
            style={[styles.tab, activeTab === 'videos' && styles.activeTab]} 
            onPress={() => setActiveTab('videos')}
          >
            <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>Vidéos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'creators' && styles.activeTab]} 
            onPress={() => setActiveTab('creators')}
          >
            <Text style={[styles.tabText, activeTab === 'creators' && styles.activeTabText]}>Formateurs</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardDismissMode="on-drag">
        
        {/* BADGE FILTRE ACTIF */}
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
        ) : (
          <>
            {/* VUE VIDÉOS (Liste Texte Uniquement) */}
            {activeTab === 'videos' && (
              <>
                <Text style={styles.sectionTitle}>
                  {search ? `Résultats` : "🔥 Tendances"}
                </Text>
                
                {filteredVideos.length === 0 ? (
                  <View style={{alignItems: 'center', marginTop: 30}}>
                    <Ionicons name="search-outline" size={50} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Aucune vidéo trouvée pour "{search}"</Text>
                  </View>
                ) : (
                  filteredVideos.map((video, index) => (
                    <TouchableOpacity 
                      key={video.id} 
                      style={styles.textOnlyCard}
                      onPress={() => setSelectedVideo(video)}
                    >
                      {/* RANG / INDEX */}
                      <Text style={styles.rank}>#{index + 1}</Text>
                      
                      {/* INFORMATIONS TEXTUELLES */}
                      <View style={styles.videoInfo}>
                        <Text style={styles.vTitle} numberOfLines={2}>{video.title}</Text>
                        <Text style={styles.vCreator}>Par {video.creator}</Text>
                        
                        {/* TAG / CATÉGORIE */}
                        <View style={[
                          styles.tagBadge, 
                          video.tag.toLowerCase().includes(search.toLowerCase()) && search !== '' ? {backgroundColor: '#9333EA'} : {}
                        ]}>
                          <Text style={[
                            styles.tagText,
                            video.tag.toLowerCase().includes(search.toLowerCase()) && search !== '' ? {color: '#FFF'} : {}
                          ]}>{video.tag}</Text>
                        </View>
                      </View>

                      {/* PETITE FLÈCHE DISCRÈTE (Pour indiquer que c'est cliquable) */}
                      <Ionicons name="chevron-forward" size={20} color="#D4D4D8" />
                    </TouchableOpacity>
                  ))
                )}

                {/* HISTORIQUE */}
                {history.length > 0 && search === '' && (
                  <View style={styles.historySection}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.sectionTitle}>Récent</Text>
                        <TouchableOpacity onPress={() => setHistory([])}>
                            <Text style={styles.clearAllText}>Effacer</Text>
                        </TouchableOpacity>
                    </View>
                    {history.map((item, index) => (
                      <View key={index} style={styles.historyRow}>
                        <TouchableOpacity style={styles.historyClickable} onPress={() => setSearch(item)}>
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

            {/* VUE CRÉATEURS */}
            {activeTab === 'creators' && (
              <>
                 <Text style={styles.sectionTitle}>⭐ Formateurs suggérés</Text>
                 {filteredCreators.length === 0 ? (
                    <Text style={styles.emptyText}>Aucun formateur trouvé.</Text>
                 ) : (
                   filteredCreators.map(creator => (
                    <View key={creator.id} style={styles.creatorCard}>
                      <Image source={{ uri: creator.avatar }} style={styles.avatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.creatorName}>{creator.name}</Text>
                        <Text style={styles.creatorFollowers}>{creator.followers} abonnés • {creator.tag}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.followBtn, followedIds.includes(creator.id) && styles.followedBtnActive]}
                        onPress={() => toggleFollow(creator.id)}
                      >
                        <Text style={[styles.followBtnText, followedIds.includes(creator.id) && styles.followedBtnTextActive]}>
                          {followedIds.includes(creator.id) ? 'Suivi' : 'Suivre'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                 )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* --- MODAL FILTRES --- */}
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

      {/* --- MODAL VIDÉO PLAYER --- */}
      <Modal 
        visible={selectedVideo !== null} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedVideo(null)}
      >
        <View style={styles.videoModalContainer}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedVideo(null)}>
            <Ionicons name="chevron-down" size={30} color="#FFF" />
          </TouchableOpacity>

          {selectedVideo && (
            <>
              <Video
                style={styles.videoPlayer}
                source={{ uri: selectedVideo.videoUrl }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={true}
              />
              <View style={styles.videoDetails}>
                <Text style={styles.videoModalTitle}>{selectedVideo.title}</Text>
                <Text style={styles.videoModalCreator}>Par {selectedVideo.creator}</Text>
                <Text style={styles.videoModalDesc}>{selectedVideo.description || "Pas de description."}</Text>
                <View style={[styles.tagBadge, {marginTop: 15, alignSelf:'flex-start'}]}>
                   <Text style={styles.tagText}>{selectedVideo.tag}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 15 },
  
  // Search Row
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 15, alignItems: 'center' },
  searchBarContainer: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', 
    borderRadius: 50, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#E5E7EB' 
  },
  input: { flex: 1, fontSize: 16, color: '#333' },
  filterBtn: { width: 50, height: 50, backgroundColor: '#F9FAFB', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  filterDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, backgroundColor: '#9333EA', borderRadius: 4 },

  // Tabs
  tabContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#9333EA' },
  tabText: { fontWeight: '600', color: '#71717A' },
  activeTabText: { color: '#FFF' },
  activeFilterBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#F3E8FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginBottom: 15 },
  activeFilterText: { color: '#9333EA', fontWeight: 'bold', fontSize: 12 },

  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  emptyText: { color: '#999', fontStyle: 'italic', marginTop: 10, textAlign: 'center' },

  // --- NOUVEAU STYLE : CARTE TEXTE SEULEMENT ---
  textOnlyCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
    borderRadius: 16, padding: 15, marginBottom: 12, 
    borderWidth: 1, borderColor: '#F3F4F6',
    // Ombre légère pour le relief
    shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
  },
  rank: { fontSize: 18, fontWeight: 'bold', color: '#9333EA', width: 35 },
  
  videoInfo: { flex: 1 },
  vTitle: { fontWeight: 'bold', fontSize: 15, color: '#1F2937', marginBottom: 2 },
  vCreator: { color: '#71717A', fontSize: 13, marginBottom: 6 },
  tagBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F3E8FF' },
  tagText: { fontSize: 10, fontWeight: 'bold', color: '#9333EA' },

  // Historique, Creator & Modals
  historySection: { marginTop: 30 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clearAllText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  historyClickable: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  historyText: { fontSize: 16, color: '#3F3F46', marginLeft: 12 },
  creatorCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  creatorName: { fontWeight: 'bold', fontSize: 16 },
  creatorFollowers: { color: '#71717A', fontSize: 12 },
  followBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#9333EA' },
  followedBtnActive: { backgroundColor: '#9333EA' },
  followBtnText: { color: '#9333EA', fontWeight: 'bold' },
  followedBtnTextActive: { color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  filterOption: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', borderRadius: 12 },
  filterLabel: { flex: 1, marginLeft: 15, fontSize: 16 },
  videoModalContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 10 },
  videoPlayer: { width: width, height: 300, backgroundColor: 'black' },
  videoDetails: { padding: 20 },
  videoModalTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 10 },
  videoModalCreator: { color: '#AAA', fontSize: 16, marginVertical: 5 },
  videoModalDesc: { color: '#DDD', marginTop: 10, lineHeight: 20 }
});