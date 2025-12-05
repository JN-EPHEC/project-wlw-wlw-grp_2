// app/messages.tsx
// Page de messages/inbox - SwipeSkills
// ✅ Palette de couleurs officielle SwipeSkills
// ✅ Typographie Poppins avec tailles et poids corrects

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    Image,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

// 🎨 Palette SwipeSkills
const COLORS = {
  violetPrincipal: '#7459F0',    // Actions principales, CTA, navigation
  orangeSecondaire: '#FBA31A',   // Actions secondaires, feedback positif, badges
  bleuNuit: '#242A65',           // Titres, icônes sombres, contraste fort
  blancCasse: '#F8F8F6',         // Arrière-plans clairs
  gris: '#6B7280',               // Texte secondaire
  grisClair: '#E5E7EB',          // Bordures
  blanc: '#FFFFFF',              // Blanc pur
  vert: '#10B981',               // En ligne
};

// Types
interface Message {
  id: string;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  unreadCount?: number;
}

// Données mockées
const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    userName: 'Jean Dupont',
    lastMessage: 'Merci pour la réponse ! C\'était très clair 👍',
    timestamp: '2024-01-20T14:30:00',
    unread: true,
    unreadCount: 2,
  },
  {
    id: '2',
    userName: 'Marie Martin',
    lastMessage: 'Quand est-ce que le nouveau cours sera disponible ?',
    timestamp: '2024-01-20T10:15:00',
    unread: true,
    unreadCount: 1,
  },
  {
    id: '3',
    userName: 'Pierre Dubois',
    lastMessage: 'D\'accord, je vais essayer ça. Merci !',
    timestamp: '2024-01-19T16:45:00',
    unread: false,
  },
  {
    id: '4',
    userName: 'Sophie Laurent',
    lastMessage: 'Super cours ! J\'ai beaucoup appris',
    timestamp: '2024-01-19T09:20:00',
    unread: false,
  },
  {
    id: '5',
    userName: 'Lucas Bernard',
    lastMessage: 'Je n\'arrive pas à télécharger le certificat',
    timestamp: '2024-01-18T11:30:00',
    unread: false,
  },
];

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMessages = messages.filter((msg) =>
    msg.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = messages.reduce((sum, msg) => sum + (msg.unreadCount || 0), 0);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "À l'instant";
    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Hier';
    if (diffInDays < 7) return `${diffInDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const handleMessagePress = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, unread: false, unreadCount: 0 } : msg
      )
    );

    // router.push(`/conversation/${messageId}`);
    console.log('Ouvrir conversation:', messageId);
  };

  // Render du header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </Pressable>

        <View style={styles.headerTitleContainer}>
          {/* Titre H1 */}
          <ThemedText style={styles.headerTitle}>
            Messages
          </ThemedText>
          {/* Badge orange secondaire (feedback positif) */}
          {totalUnread > 0 && (
            <View style={styles.headerBadge}>
              <ThemedText style={styles.headerBadgeText}>{totalUnread}</ThemedText>
            </View>
          )}
        </View>

        {/* Bouton nouveau message - Violet principal (CTA) */}
        <Pressable style={styles.newMessageButton}>
          <ThemedText style={styles.newMessageIcon}>✏️</ThemedText>
        </Pressable>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <ThemedText style={styles.searchIcon}>🔍</ThemedText>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une conversation..."
          placeholderTextColor={COLORS.gris}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <ThemedText style={styles.clearIcon}>✕</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );

  // Render d'un message
  const renderMessage = ({ item }: { item: Message }) => (
    <Pressable
      style={[styles.messageCard, item.unread && styles.messageCardUnread]}
      onPress={() => handleMessagePress(item.id)}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {item.userAvatar ? (
          <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <ThemedText style={styles.avatarText}>
              {item.userName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
        {item.unread && <View style={styles.onlineIndicator} />}
      </View>

      {/* Contenu */}
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          {/* Nom H2 */}
          <ThemedText
            style={[styles.userName, item.unread && styles.userNameUnread]}
          >
            {item.userName}
          </ThemedText>
          {/* Timestamp Small */}
          <ThemedText style={styles.timestamp}>
            {formatTimestamp(item.timestamp)}
          </ThemedText>
        </View>

        <View style={styles.messageFooter}>
          {/* Message Body */}
          <ThemedText
            style={[styles.lastMessage, item.unread && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </ThemedText>
          {/* Badge orange secondaire (feedback positif) */}
          {item.unreadCount && item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <ThemedText style={styles.unreadBadgeText}>
                {item.unreadCount}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyIcon}>💬</ThemedText>
      <ThemedText style={styles.emptyText}>
        Aucun message
      </ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Vos conversations apparaîtront ici
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ThemedView style={styles.container}>
        <FlatList
          data={filteredMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.blanc,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.blancCasse,
  },
  listContent: {
    paddingBottom: 32,
  },

  // Header
  headerContainer: {
    backgroundColor: COLORS.blanc,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grisClair,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.blancCasse,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.bleuNuit,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // H1 écran - 28-32px, 700 bold
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  // Badge orange secondaire (feedback positif)
  headerBadge: {
    backgroundColor: COLORS.orangeSecondaire,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    color: COLORS.blanc,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  // CTA violet principal
  newMessageButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.violetPrincipal,
  },
  newMessageIcon: {
    fontSize: 18,
  },

  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.blancCasse,
    borderRadius: 12,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
    opacity: 0.5,
  },
  // Body - 14-16px, 400/500 regular
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  clearIcon: {
    fontSize: 16,
    color: COLORS.gris,
    padding: 4,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: COLORS.grisClair,
    marginLeft: 76,
  },

  // Message Card
  messageCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.blanc,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  messageCardUnread: {
    backgroundColor: '#F5F1FF', // Violet très clair
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.violetPrincipal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.blanc,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.vert,
    borderWidth: 2,
    borderColor: COLORS.blanc,
  },

  // Message content
  messageContent: {
    flex: 1,
    gap: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // H2 - 20-22px, 600 semi-bold
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  userNameUnread: {
    fontWeight: '700',
  },
  // Small - 12-13px, 400 medium
  timestamp: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  // Body - 14-16px, 400/500 regular
  lastMessage: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.gris,
    lineHeight: 20,
    fontFamily: 'Poppins',
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: COLORS.bleuNuit,
  },
  // Badge orange secondaire (feedback positif)
  unreadBadge: {
    backgroundColor: COLORS.orangeSecondaire,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: COLORS.blanc,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },

  // Empty state
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
});