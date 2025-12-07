import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

const COLORS = {
  violetPrincipal: '#7459F0',
  orangeSecondaire: '#FBA31A',
  bleuNuit: '#242A65',
  blancCasse: '#F8F8F6',
  gris: '#6B7280',
  grisClair: '#E5E7EB',
  blanc: '#FFFFFF',
};

// Types
interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  timestamp: string;
  senderId: string;
  senderName: string;
  isCurrentUser: boolean; // Si c'est l'utilisateur connecté
}

interface ConversationInfo {
  id: string;
  name: string;
  avatar: string;
  isCreator: boolean;
}

// 🎭 Données mockées pour la conversation
const MOCK_CONVERSATION: ConversationInfo = {
  id: '1',
  name: 'Amara Diallo',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
  isCreator: true,
};

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    text: 'Salut ! J\'ai une question sur React Native',
    timestamp: '2024-01-20T14:00:00',
    senderId: 'currentUser',
    senderName: 'Toi',
    isCurrentUser: true,
  },
  {
    id: '2',
    text: 'Salut ! Bien sûr, je suis là pour t\'aider 😊',
    timestamp: '2024-01-20T14:02:00',
    senderId: 'user123',
    senderName: 'Amara Diallo',
    isCurrentUser: false,
  },
  {
    id: '3',
    text: 'Comment je peux utiliser les hooks avec TypeScript ?',
    timestamp: '2024-01-20T14:03:00',
    senderId: 'currentUser',
    senderName: 'Toi',
    isCurrentUser: true,
  },
  {
    id: '4',
    text: 'Excellente question ! Tu peux typer tes hooks comme ça :',
    timestamp: '2024-01-20T14:04:00',
    senderId: 'user123',
    senderName: 'Amara Diallo',
    isCurrentUser: false,
  },
  {
    id: '5',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop',
    timestamp: '2024-01-20T14:05:00',
    senderId: 'user123',
    senderName: 'Amara Diallo',
    isCurrentUser: false,
  },
  {
    id: '6',
    text: 'const [state, setState] = useState<string>("")',
    timestamp: '2024-01-20T14:06:00',
    senderId: 'user123',
    senderName: 'Amara Diallo',
    isCurrentUser: false,
  },
  {
    id: '7',
    text: 'Super merci ! C\'est très clair 🙏',
    timestamp: '2024-01-20T14:08:00',
    senderId: 'currentUser',
    senderName: 'Toi',
    isCurrentUser: true,
  },
  {
    id: '8',
    text: 'De rien ! N\'hésite pas si tu as d\'autres questions',
    timestamp: '2024-01-20T14:09:00',
    senderId: 'user123',
    senderName: 'Amara Diallo',
    isCurrentUser: false,
  },
];

export default function ConversationPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Scroll vers le bas au chargement
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = () => {
    if (inputText.trim() === '') return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      timestamp: new Date().toISOString(),
      senderId: 'currentUser',
      senderName: 'Toi',
      isCurrentUser: true,
    };

    setMessages([...messages, newMessage]);
    setInputText('');

    // Scroll vers le bas
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Render du header
  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ThemedText style={styles.backIcon}>←</ThemedText>
      </Pressable>

      <View style={styles.headerCenter}>
        <Image source={{ uri: MOCK_CONVERSATION.avatar }} style={styles.headerAvatar} />
        <View>
          <ThemedText style={styles.headerName}>{MOCK_CONVERSATION.name}</ThemedText>
          {MOCK_CONVERSATION.isCreator && (
            <ThemedText style={styles.headerRole}>Créateur</ThemedText>
          )}
        </View>
      </View>

      <View style={styles.headerActions}>
        <Pressable style={styles.headerIconButton}>
          <ThemedText style={styles.headerIcon}>📞</ThemedText>
        </Pressable>
        <Pressable style={styles.headerIconButton}>
          <ThemedText style={styles.headerIcon}>⋮</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  // Render d'un message
  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.isCurrentUser;

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.messageContainerRight : styles.messageContainerLeft,
        ]}
      >
        {/* Avatar (seulement pour les messages reçus) */}
        {!isCurrentUser && (
          <Image
            source={{ uri: MOCK_CONVERSATION.avatar }}
            style={styles.messageAvatar}
          />
        )}

        <View style={styles.messageContent}>
          {/* Bulle de message */}
          <View
            style={[
              styles.messageBubble,
              isCurrentUser ? styles.messageBubbleOrange : styles.messageBubbleViolet,
            ]}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : (
              <ThemedText style={styles.messageText}>{item.text}</ThemedText>
            )}
          </View>

          {/* Timestamp */}
          <ThemedText
            style={[
              styles.messageTime,
              isCurrentUser ? styles.messageTimeRight : styles.messageTimeLeft,
            ]}
          >
            {formatTime(item.timestamp)}
          </ThemedText>
        </View>
      </View>
    );
  };

  // Render de la zone de saisie
  const renderInput = () => (
    <View style={styles.inputContainer}>
      <Pressable style={styles.emojiButton}>
        <ThemedText style={styles.emojiIcon}>😊</ThemedText>
      </Pressable>

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Écrivez un message..."
          placeholderTextColor={COLORS.gris}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />

        <View style={styles.inputActions}>
          <Pressable style={styles.inputIconButton}>
            <ThemedText style={styles.inputIcon}>📎</ThemedText>
          </Pressable>
          <Pressable style={styles.inputIconButton}>
            <ThemedText style={styles.inputIcon}>📷</ThemedText>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[
          styles.sendButton,
          inputText.trim() === '' && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={inputText.trim() === ''}
      >
        <ThemedText style={styles.sendIcon}>➤</ThemedText>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ThemedView style={styles.container}>
        {renderHeader()}

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {renderInput()}
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.blanc,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grisClair,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.bleuNuit,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
  },
  headerRole: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.violetPrincipal,
    fontFamily: 'Poppins',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },

  // Messages
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  messageContainerLeft: {
    justifyContent: 'flex-start',
  },
  messageContainerRight: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageContent: {
    maxWidth: '75%',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
  },
  messageBubbleViolet: {
    backgroundColor: COLORS.violetPrincipal,
    borderBottomLeftRadius: 4,
  },
  messageBubbleOrange: {
    backgroundColor: COLORS.orangeSecondaire,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.blanc,
    lineHeight: 20,
    fontFamily: 'Poppins',
  },
  messageImage: {
    width: 250,
    height: 180,
    borderRadius: 12,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.gris,
    fontFamily: 'Poppins',
  },
  messageTimeLeft: {
    textAlign: 'left',
    marginLeft: 4,
  },
  messageTimeRight: {
    textAlign: 'right',
    marginRight: 4,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.blanc,
    borderTopWidth: 1,
    borderTopColor: COLORS.grisClair,
    gap: 8,
  },
  emojiButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emojiIcon: {
    fontSize: 24,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.blancCasse,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.bleuNuit,
    fontFamily: 'Poppins',
    paddingTop: 6,
    paddingBottom: 6,
  },
  inputActions: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  inputIconButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIcon: {
    fontSize: 18,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.violetPrincipal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.grisClair,
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 18,
    color: COLORS.blanc,
  },
});