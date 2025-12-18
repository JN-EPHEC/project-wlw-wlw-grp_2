aimport React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, 
  TouchableOpacity, Image, Platform, Modal, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// --- DONNÉES MOCKS ---
const CATEGORIES = [
  { id: 'all', label: 'Tout', icon: '🌟' },
  { id: 'Marketing', label: 'Marketing Digital', icon: '📱' },
  { id: 'IA', label: 'IA', icon: '🤖' },
  { id: 'E-commerce', label: 'E-commerce', icon: '🛒' },
];

const MOCK_VIDEOS = [
  { id: 'v1', title: 'SEO Stratégie 2024', creator: 'Marie Dupont', tag: 'Marketing', color: '#9333EA', thumb: 'https://images.unsplash.com/photo-1432888622747-4eb9a8f2c293?w=400', trending: true },
  { id: 'v2', title: 'IA : La méthode STAR', creator: 'Thomas AI', tag: 'IA', color: '#EC4899', thumb: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400', trending: true },
  { id: 'v3', title: 'Vendre sur Shopify', creator: 'Sophie Commerce', tag: 'E-commerce', color: '#F97316', thumb: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400', trending: false },
  { id: 'v4', title: 'Design UI/UX Masterclass', creator: 'Alex Design', tag: 'Design', color: '#06B6D4', thumb: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400', trending: false },
  { id: 'v5', title: 'Publicité Facebook Ads', creator: 'Jean Marketing', tag: 'Marketing', color: '#9333EA', thumb: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400', trending: false },
];

const MOCK_CREATORS = [
  { id: 'c1', name: 'Marie Dupont', followers: '12.5k', tag: 'Marketing', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { id: 'c2', name: 'Thomas AI', followers: '28.9k', tag: 'IA', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
];

export default function RechercheScreen() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'videos' | 'creators'>('videos');
  const [selectedCat, setSelectedCat] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [followedIds, setFollowedIds] = useState<string[]>([]);

  const toggleFollow = (id: string) => {
    setFollowedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Filtrage intelligent
  const filteredVideos = MOCK_VIDEOS.filter(v => 
    (selectedCat === 'all' || v.tag === selectedCat) && 
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCreators = MOCK_CREATORS.filter(c => 
    (selectedCat === 'all' || c.tag === selectedCat) && 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* HEADER FIXE */}
      <View style={styles.header}>
        <Text style={styles.title}>Recherche</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#A1A1AA" />
            <TextInput style={styles.input} placeholder="Vidéos, créateurs..." value={search} onChangeText={setSearch} />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="options-outline" size={24} color="#18181B" />
            {selectedCat !== 'all' && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'videos' && styles.activeTab]} onPress={() => setActiveTab('videos')}>
            <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>Vidéos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'creators' && styles.activeTab]} onPress={() => setActiveTab('creators')}>
            <Text style={[styles.tabText, activeTab === 'creators' && styles.activeTabText]}>Créateurs</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENU SCROLLABLE */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {activeTab === 'videos' ? (
          <>
            {/* 1. SECTION TENDANCES (Horizontale) */}
            <Text style={styles.sectionTitle}>🔥 Tendances</Text>
            {filteredVideos.filter(v => v.trending).map((video, index) => (
              <View key={video.id} style={styles.trendingCard}>
                <Text style={styles.rank}>#{index + 1}</Text>
                <Image source={{ uri: video.thumb }} style={styles.trendingThumb} />
                <View style={styles.videoInfo}>
                  <Text style={styles.vTitle}>{video.title}</Text>
                  <Text style={styles.vCreator}>{video.creator}</Text>
                  <View style={[styles.tagBadge, { backgroundColor: video.color + '20' }]}>
                    <Text style={[styles.tagText, { color: video.color }]}>{video.tag}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* 2. SECTION TOUTES LES VIDÉOS (Grille Verticale) */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Toutes les vidéos</Text>
            <View style={styles.videoGrid}>
              {filteredVideos.map((video) => (
                <View key={video.id} style={styles.gridCard}>
                  <View style={styles.thumbWrapper}>
                    <Image source={{ uri: video.thumb }} style={styles.gridThumb} />
                    <View style={[styles.gridTag, { backgroundColor: video.color }]}>
                      <Text style={styles.gridTagText}>{video.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.gridTitle} numberOfLines={2}>{video.title}</Text>
                  <Text style={styles.gridCreator}>{video.creator}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          /* 3. SECTION CRÉATEURS */
          <>
            <Text style={styles.sectionTitle}>⭐ Créateurs suggérés</Text>
            {filteredCreators.map(creator => (
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
            ))}
          </>
        )}
      </ScrollView>

      {/* MODAL FILTRES */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sujets</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}><Ionicons name="close" size={24} /></TouchableOpacity>
            </View>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat.id} style={styles.filterOption} onPress={() => { setSelectedCat(cat.id); setShowFilterModal(false); }}>
                <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                <Text style={[styles.filterLabel, selectedCat === cat.id && { color: '#9333EA', fontWeight: 'bold' }]}>{cat.label}</Text>
                {selectedCat === cat.id && <Ionicons name="checkmark" size={20} color="#9333EA" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 15 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, height: 48, borderWidth: 1, borderColor: '#E5E7EB' },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },
  filterBtn: { width: 48, height: 48, backgroundColor: '#F9FAFB', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  filterDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, backgroundColor: '#9333EA', borderRadius: 4 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#9333EA' },
  tabText: { fontWeight: '600', color: '#71717A' },
  activeTabText: { color: '#FFF' },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  // Trending
  trendingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 12, marginBottom: 12 },
  rank: { fontSize: 16, fontWeight: 'bold', color: '#9333EA', width: 30 },
  trendingThumb: { width: 60, height: 80, borderRadius: 10 },
  videoInfo: { flex: 1, marginLeft: 15 },
  vTitle: { fontWeight: 'bold', fontSize: 14 },
  vCreator: { color: '#71717A', fontSize: 12 },
  tagBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  tagText: { fontSize: 10, fontWeight: 'bold' },
  // Grid
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: { width: (width - 55) / 2, marginBottom: 20 },
  thumbWrapper: { position: 'relative' },
  gridThumb: { width: '100%', height: 200, borderRadius: 16 },
  gridTag: { position: 'absolute', top: 10, right: 10, padding: 4, borderRadius: 6 },
  gridTagText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  gridTitle: { fontWeight: 'bold', fontSize: 13, marginTop: 8 },
  gridCreator: { color: '#71717A', fontSize: 11 },
  // Creator
  creatorCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  creatorName: { fontWeight: 'bold', fontSize: 16 },
  creatorFollowers: { color: '#71717A', fontSize: 12 },
  followBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#9333EA' },
  followedBtnActive: { backgroundColor: '#9333EA' },
  followBtnText: { color: '#9333EA', fontWeight: 'bold' },
  followedBtnTextActive: { color: '#FFF' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, padding: 25, minHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  filterOption: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterLabel: { flex: 1, marginLeft: 15, fontSize: 16 }
});