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
  violetPrincipal: '#7459F0',
  orangeSecondaire: '#FBA31A',
  bleuNuit: '#242A65',
  blancCasse: '#F8F8F6',
  gris: '#6B7280',
  grisClair: '#E5E7EB',
  blanc: '#FFFFFF',
  vert: '#10B981',
};

// Types
type ConversationType = 'user_to_user' | 'creator_to_user' | 'system';

interface Conversation {
  id: string;
  userName: string;
  userAvatar: string; // URL de la photo
  userRole?: 'creator' | 'user' | 'system'; // Rôle de l'interlocuteur
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  unreadCount?: number;
  type: ConversationType;
  hasImage?: boolean; // Si le dernier message contient une image
  badge?: string; // Badge spécial (ex: "Nouvelle réalisation")
  verified?: boolean; // Si c'est un créateur vérifié
}

// 🎭 Données mockées diversifiées avec photos de profil
const INITIAL_CONVERSATIONS: Conversation[] = [
  // 1. Créateur → Utilisateur
  {
    id: '1',
    userName: 'Claire Petit',
    userAvatar: 'https://i.pravatar.cc/150?img=5',
    userRole: 'creator',
    lastMessage: 'votre experte excel a posté une nouvelle vidéo',
    timestamp: '2024-01-20T16:30:00',
    unread: true,
    unreadCount: 1,
    type: 'creator_to_user',
    verified: true,
  },
  
  // 2. Système (notifications de progression)
  {
    id: '2',
    userName: 'Félicitations',
    userAvatar: 'system', // Icône système
    userRole: 'system',
    lastMessage: 'Vous avez atteint le niveau 4.',
    timestamp: '2024-01-20T13:00:00',
    unread: false,
    type: 'system',
  },
  
  // 3. Système (achievement avec badge)
  {
    id: '3',
    userName: 'Plus que 2 vidéos',
    userAvatar: 'achievement',
    userRole: 'system',
    lastMessage: 'pour débloquer \'Développeur Python!\'',
    timestamp: '2024-01-20T08:00:00',
    unread: false,
    type: 'system',
    badge: 'Nouvelle réalisation',
  },
  
  // 4. Créateur → Utilisateur (demande d'abonnement)
  {
    id: '4',
    userName: 'Marc Leroy',
    userAvatar: 'https://i.pravatar.cc/150?img=12',
    userRole: 'creator',
    lastMessage: 'vous a envoyé une demande d\'abonnement.',
    timestamp: '2024-01-19T18:45:00',
    unread: false,
    type: 'creator_to_user',
    verified: true,
  },
  
  // 5. Utilisateur ↔ Utilisateur (discussion entre apprenants)
  {
    id: '5',
    userName: 'Aïcha Benali',
    userAvatar: 'https://i.pravatar.cc/150?img=47',
    userRole: 'user',
    lastMessage: 'Tu as réussi l\'exercice 3 ? Je bloque dessus 😅',
    timestamp: '2024-01-19T15:20:00',
    unread: true,
    unreadCount: 3,
    type: 'user_to_user',
  },
  
  // 6. Créateur → Utilisateur (réponse à une question)
  {
    id: '6',
    userName: 'Léo Traoré',
    userAvatar: 'https://i.pravatar.cc/150?img=14',
    userRole: 'creator',
    lastMessage: 'Bonne question ! Je t\'explique : utilise map() plutôt que forEach() ici',
    timestamp: '2024-01-19T11:30:00',
    unread: false,
    type: 'creator_to_user',
    verified: true,
  },
  
  // 7. Utilisateur ↔ Utilisateur (avec image)
  {
    id: '7',
    userName: 'Inès El Amrani',
    userAvatar: 'https://i.pravatar.cc/150?img=31',
    userRole: 'user',
    lastMessage: '📸 Photo',
    timestamp: '2024-01-18T20:15:00',
    unread: false,
    type: 'user_to_user',
    hasImage: true,
  },
  
  // 8. Créateur → Utilisateur (annonce de live)
  {
    id: '8',
    userName: 'Karim Nguyen',
    userAvatar: 'https://i.pravatar.cc/150?img=68',
    userRole: 'creator',
    lastMessage: '🔴 LIVE demain à 19h : Session de code en direct !',
    timestamp: '2024-01-18T14:00:00',
    unread: true,
    unreadCount: 1,
    type: 'creator_to_user',
    verified: true,
  },
  
  // 9. Utilisateur ↔ Utilisateur (groupe d'étude)
  {
    id: '9',
    userName: 'Zara Patel',
    userAvatar: 'https://i.pravatar.cc/150?img=43',
    userRole: 'user',
    lastMessage: 'On se retrouve sur Discord pour réviser ?',
    timestamp: '2024-01-17T16:40:00',
    unread: false,
    type: 'user_to_user',
  },
  
  // 10. Créateur → Utilisateur (feedback)
  {
    id: '10',
    userName: 'Noah Kowalski',
    userAvatar: 'https://i.pravatar.cc/150?img=51',
    userRole: 'creator',
    lastMessage: 'Excellent travail sur ton projet ! Continue comme ça 💪',
    timestamp: '2024-01-17T09:20:00',
    unread: false,
    type: 'creator_to_user',
    verified: true,
  },
];

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = conversations.filter(c => c.unread).length;
  const hasUnread = unreadCount > 0;

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "À l'instant";
    if (diffInHours < 24) return `Il y a ${Math.floor(diffInHours)}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Hier';
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const handleConversationPress = (conversation: Conversation) => {
    // Marquer comme lu
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversation.id ? { ...conv, unread: false, unreadCount: 0 } : conv
      )
    );

    // Navigation selon le type
    if (conversation.type === 'system') {
      // Si c'est un message système, aller vers la page appropriée
      console.log('Message système:', conversation.userName);
    } else {
      // Sinon, ouvrir la conversation
      // router.push(`/conversation/${conversation.id}`);
      console.log('Ouvrir conversation avec:', conversation.userName);
    }
  };

  const handleNewMessage = () => {
    // router.push('/new-message');
    console.log('Nouveau message');
  };

  // Render du header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </Pressable>

        <ThemedText style={styles.headerTitle}>Discussions</ThemedText>

        {/* Bouton composer (✏️ crayon) */}
        <Pressable style={styles.composeButton} onPress={handleNewMessage}>
          <ThemedText style={styles.composeIcon}>✏️</ThemedText>
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

  // Render d'une conversation
  const renderConversation = ({ item }: { item: Conversation }) => {
    const isSystemMessage = item.userRole === 'system';
    
    return (
      <Pressable
        style={[
          styles.conversationCard,
          item.unread && styles.conversationCardUnread,
        ]}
        onPress={() => handleConversationPress(item)}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {isSystemMessage ? (
            // Avatar système (icône)
            <View style={[
              styles.systemAvatar,
              item.userAvatar === 'achievement' && styles.achievementAvatar
            ]}>
              <ThemedText style={styles.systemAvatarIcon}>
                {item.userAvatar === 'achievement' ? '🎯' : '📊'}
              </ThemedText>
            </View>
          ) : (
            // Avatar utilisateur/créateur (photo)
            <View style={styles.photoAvatarContainer}>
              <Image 
                source={{ uri: item.userAvatar }} 
                style={styles.avatar}
              />
              {/* Badge vérifié pour les créateurs */}
              {item.verified && (
                <View style={styles.verifiedBadge}>
                  <ThemedText style={styles.verifiedIcon}>✓</ThemedText>
                </View>
              )}
            </View>
          )}
          
          {/* Indicateur non lu */}
          {item.unread && !isSystemMessage && (
            <View style={styles.unreadDot} />
          )}
        </View>

        {/* Contenu */}
        <View style={styles.conversationContent}>
          {/* Header */}
          <View style={styles.conversationHeader}>
            <View style={styles.nameContainer}>
              <ThemedText
                style={[
                  styles.userName,
                  item.unread && styles.userNameUnread,
                  isSystemMessage && styles.systemUserName,
                ]}
                numberOfLines={1}
              >
                {item.userName}
              </ThemedText>
              
              {/* Badge "Nouvelle réalisation" ou rôle */}
              {item.badge && (
                <View style={styles.orangeBadge}>
                  <ThemedText style={styles.badgeText}>{item.badge}</ThemedText>
                </View>
              )}
              
              {/* Indicateur de rôle (créateur) */}
              {item.userRole === 'creator' && !item.badge && (
                <View style={styles.creatorBadge}>
                  <ThemedText style={styles.creatorBadgeText}>Créateur</ThemedText>
                </View>
              )}
            </View>

            <ThemedText style={styles.timestamp}>
              {formatTimestamp(item.timestamp)}
            </ThemedText>
          </View>

          {/* Message */}
          <View style={styles.messageFooter}>
            <ThemedText
              style={[
                styles.lastMessage,
                item.unread && styles.lastMessageUnread,
              ]}
              numberOfLines={2}
            >
              {item.hasImage && '📸 '}
              {item.lastMessage}
            </ThemedText>

            {/* Badge compteur */}
            {item.unreadCount && item.unreadCount > 0 && (
              <View style={styles.countBadge}>
                <ThemedText style={styles.countBadgeText}>
                  {item.unreadCount}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  // État "Vous êtes à jour !"
  const renderAllCaughtUp = () => (
    <View style={styles.caughtUpContainer}>
      <ThemedText style={styles.caughtUpIcon}>✨</ThemedText>
      <ThemedText style={styles.caughtUpText}>Vous êtes à jour !</ThemedText>
      <ThemedText style={styles.caughtUpSubtext}>
        Aucun nouveau message
      </ThemedText>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyIcon}>💬</ThemedText>
      <ThemedText style={styles.emptyText}>Aucune discussion</ThemedText>
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
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={!hasUnread && conversations.length > 0 ? renderAllCaughtUp : null}
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
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  composeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.violetPrincipal,
  },
  composeIcon: {
    fontSize: 18,
  },

  // Search
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

  // Conversation Card
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.blanc,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  conversationCardUnread: {
    backgroundColor: '#F5F1FF',
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
  },
  photoAvatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  systemAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.blancCasse,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementAvatar: {
    backgroundColor: '#FFF4E6',
  },
  systemAvatarIcon: {
    fontSize: 24,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.violetPrincipal,
    borderWidth: 2,
    borderColor: COLORS.blanc,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: {
    color: COLORS.blanc,
    fontSize: 10,
    fontWeight: 'bold',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.violetPrincipal,
    borderWidth: 2,
    borderColor: COLORS.blanc,
  },

  // Content
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  userNameUnread: {
    fontWeight: '700',
  },
  systemUserName: {
    fontSize: 15,
  },
  orangeBadge: {
    backgroundColor: COLORS.orangeSecondaire,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: COLORS.blanc,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  creatorBadge: {
    backgroundColor: COLORS.violetPrincipal,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  creatorBadgeText: {
    color: COLORS.blanc,
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 2,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.gris,
    lineHeight: 20,
    fontFamily: 'Poppins',
  },
  lastMessageUnread: {
    fontWeight: '500',
    color: COLORS.bleuNuit,
  },
  countBadge: {
    backgroundColor: COLORS.violetPrincipal,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: COLORS.blanc,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },

  // Caught up
  caughtUpContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  caughtUpIcon: {
    fontSize: 48,
  },
  caughtUpText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  caughtUpSubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },

  // Empty
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