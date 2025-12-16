import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

// ==========================================
// 🎨 COMPOSANTS ICONES
// ==========================================

const FunnelIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M3 4.5C3 4.22386 3.22386 4 3.5 4H20.5C20.7761 4 21 4.22386 21 4.5V6.58579C21 6.851 20.8946 7.10536 20.7071 7.29289L14.2929 13.7071C14.1054 13.8946 14 14.149 14 14.4142V17L10 21V14.4142C10 14.149 9.89464 13.8946 9.70711 13.7071L3.29289 7.29289C3.10536 7.10536 3 6.851 3 6.58579V4.5Z" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const SearchIcon = ({ size = 24, color = '#9ca3af' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const ClockIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const TrendingIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M13 7H21M21 7V15M21 7L13 15L9 11L3 17" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const CloseIcon = ({ size = 24, color = '#f9a8d4' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M18 6L6 18M6 6L18 18" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

// ==========================================
// 🚀 PAGE PRINCIPALE (EXPLORE)
// ==========================================

export default function ExplorePage() {
  type SearchHistoryItem = {
    uniqueSearchTimestamp: number;
    userSearchContent: string;
    timestamp: string;
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const filters = [
    { uniqueFilterIdentifier: 'all', label: 'Toutes' },
    { uniqueFilterIdentifier: 'recent', label: 'Récentes' },
    { uniqueFilterIdentifier: 'popular', label: 'Populaires' },
    { uniqueFilterIdentifier: 'tutorials', label: 'Tutoriels' },
    { uniqueFilterIdentifier: 'courses', label: 'Cours' }
  ];

  const recommendedVideos = [
    {
      uniqueVideoIdentifier: 1,
      title: "Introduction à React - Tutorial complet",
      thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop",
      duration: "15:30",
      views: "1.2M vues",
      date: "il y a 2 jours",
      category: "tutorials"
    },
    {
      uniqueVideoIdentifier: 2,
      title: "Les bases de JavaScript en 2024",
      thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=225&fit=crop",
      duration: "23:45",
      views: "850K vues",
      date: "il y a 1 semaine",
      category: "tutorials"
    },
    {
      uniqueVideoIdentifier: 3,
      title: "Design moderne avec Tailwind CSS",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=225&fit=crop",
      duration: "18:20",
      views: "620K vues",
      date: "il y a 3 jours",
      category: "tutorials"
    }
  ];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const newSearch = {
        uniqueSearchTimestamp: Date.now(),
        userSearchContent: searchQuery,
        timestamp: new Date().toLocaleString('fr-FR')
      };
      setSearchHistory([newSearch, ...searchHistory]);
      setSearchQuery('');
    }
  };

  const deleteSearch = (uniqueSearchTimestamp: number) => {
    setSearchHistory(searchHistory.filter(singleHistoryItem => singleHistoryItem.uniqueSearchTimestamp !== uniqueSearchTimestamp));
  };

  const clearHistory = () => {
    setSearchHistory([]);
  };

  const reuseSearch = (userSearchContent: string) => {
    setSearchQuery(userSearchContent);
  };

  const getFilteredVideos = () => {
    if (selectedFilter === 'all') return recommendedVideos;
    if (selectedFilter === 'recent') {
      return recommendedVideos.filter(singleVideoItem => 
        singleVideoItem.date.includes('jour') || singleVideoItem.date.includes('semaine')
      );
    }
    if (selectedFilter === 'popular') {
      return recommendedVideos.filter(singleVideoItem => parseFloat(singleVideoItem.views) > 1);
    }
    return recommendedVideos.filter(singleVideoItem => singleVideoItem.category === selectedFilter);
  };

  const filteredVideos = getFilteredVideos();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.contentWrapper}>
        
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            {/* Filter Button */}
            <Pressable
              onPress={() => setShowFilters(!showFilters)}
              style={[
                styles.filterButton,
                showFilters && styles.filterButtonActive
              ]}
            >
              <FunnelIcon size={20} color="#fff" />
            </Pressable>

            {/* Search Input */}
            <View style={styles.searchInputWrapper}>
              <View style={styles.searchIconWrapper}>
                <SearchIcon size={20} color="#9ca3af" />
              </View>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher..."
                placeholderTextColor="#9ca3af"
                onSubmitEditing={handleSearch}
              />
            </View>

            {/* Search Button */}
            <Pressable
              onPress={handleSearch}
              style={styles.searchButton}
            >
              <Text style={styles.searchButtonText}>GO</Text>
            </Pressable>
          </View>

          {/* Filter Dropdown */}
          {showFilters && (
            <View style={styles.filterDropdown}>
              {filters.map((singleFilterItem) => (
                <Pressable
                  key={singleFilterItem.uniqueFilterIdentifier}
                  onPress={() => {
                    setSelectedFilter(singleFilterItem.uniqueFilterIdentifier);
                    setShowFilters(false);
                  }}
                  style={[
                    styles.filterOption,
                    selectedFilter === singleFilterItem.uniqueFilterIdentifier && styles.filterOptionActive
                  ]}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilter === singleFilterItem.uniqueFilterIdentifier && styles.filterOptionTextActive
                  ]}>
                    {singleFilterItem.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Search History */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <ClockIcon size={24} color="#fff" />
              <Text style={styles.sectionTitle}>Historique</Text>
            </View>
            {searchHistory.length > 0 && (
              <Pressable onPress={clearHistory}>
                <Text style={styles.clearButton}>Tout effacer</Text>
              </Pressable>
            )}
          </View>

          {searchHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <SearchIcon size={48} color="#c4b5fd" />
              <Text style={styles.emptyText}>Aucune recherche récente</Text>
              <Text style={styles.emptySubtext}>Explorez de nouveaux sujets !</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {searchHistory.map((singleHistoryItem) => (
                <View key={singleHistoryItem.uniqueSearchTimestamp} style={styles.historyItem}>
                  <Pressable
                    style={styles.historyItemContent}
                    onPress={() => reuseSearch(singleHistoryItem.userSearchContent)}
                  >
                    <Text style={styles.historyItemText}>{singleHistoryItem.userSearchContent}</Text>
                    <Text style={styles.historyItemDate}>{singleHistoryItem.timestamp}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteSearch(singleHistoryItem.uniqueSearchTimestamp)}
                    style={styles.deleteButton}
                  >
                    <CloseIcon size={18} color="#f9a8d4" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recommended Videos */}
        <View style={styles.videosSection}>
          <View style={styles.sectionTitleRow}>
            <TrendingIcon size={24} color="#fff" />
            <Text style={styles.sectionTitle}>Recommandés</Text>
          </View>

          <View style={styles.videoGrid}>
            {filteredVideos.map((singleVideoItem) => (
              <Pressable
                key={singleVideoItem.uniqueVideoIdentifier}
                style={styles.videoCard}
                onPress={() => console.log('Ouvrir vidéo', singleVideoItem.title)}
              >
                <View style={styles.thumbnailWrapper}>
                  <Image
                    source={{ uri: singleVideoItem.thumbnail }}
                    style={styles.thumbnail}
                  />
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{singleVideoItem.duration}</Text>
                  </View>
                </View>
                <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                    {singleVideoItem.title}
                    </Text>
                    <Text style={styles.videoMeta}>
                    {singleVideoItem.views} • {singleVideoItem.date}
                    </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1b4b', // Fond bleu nuit foncé
  },
  contentWrapper: {
    padding: 16,
    paddingTop: 60, // Espace pour la status bar
  },
  // Search Section
  searchSection: {
    marginBottom: 24,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#7c3aed', // Violet vif
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
  },
  searchIconWrapper: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    height: '100%',
  },
  searchButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Filter Dropdown
  filterDropdown: {
    backgroundColor: '#2e2b5b',
    borderRadius: 14,
    marginTop: 10,
    overflow: 'hidden',
    padding: 4,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  filterOptionActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
  },
  filterOptionText: {
    color: '#a5b4fc',
    fontSize: 15,
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // History Section
  historySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  clearButton: {
    color: '#f472b6', // Rose
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9ca3af',
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  historyItemDate: {
    color: '#9ca3af',
    fontSize: 11,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(244, 114, 182, 0.1)', // Fond rose très léger
    borderRadius: 8,
  },

  // Videos Section
  videosSection: {
    marginBottom: 20,
  },
  videoGrid: {
    marginTop: 16,
    gap: 20,
  },
  videoCard: {
    backgroundColor: '#2e2b5b',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
    height: 180,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 22,
  },
  videoMeta: {
    color: '#a5b4fc',
    fontSize: 12,
  },
});