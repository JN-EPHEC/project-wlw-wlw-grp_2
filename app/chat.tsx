import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

export default function ChatScreen() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: '1', text: "Salut ! J'ai adoré ta dernière vidéo", isMine: false, time: 'Il y a 2h' },
    { id: '2', text: "Merci beaucoup ! 😊", isMine: true, time: 'Il y a 1h' }
  ]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    setChatMessages([...chatMessages, { 
      id: Date.now().toString(), 
      text: inputText, 
      isMine: true, 
      time: 'À l\'instant' 
    }]);
    setInputText('');
  };

  const deleteMessage = (id: string) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer ce message ?", [
      { text: "Annuler", style: "cancel" },
      { 
        text: "Supprimer", 
        style: "destructive", 
        onPress: () => setChatMessages(prev => prev.filter(m => m.id !== id)) 
      }
    ]);
  };

  // Fonction pour naviguer vers le profil
  const goToProfile = () => {
    router.push('/profile'); // Vous pouvez passer l'userId si nécessaire
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container} 
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#52525B" />
        </TouchableOpacity>
        
        {/* Zone cliquable pour aller au profil */}
        <TouchableOpacity 
          onPress={goToProfile} 
          style={styles.userInfoContainer}
        >
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' }} 
            style={styles.avatarSmall} 
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>Marie Dupont</Text>
            <Text style={styles.onlineStatus}>En ligne</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowMenu(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color="#52525B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.chatContainer}>
        {chatMessages.map((msg) => (
          <TouchableOpacity 
            key={msg.id} 
            onLongPress={() => deleteMessage(msg.id)} 
            style={msg.isMine ? styles.myMsg : styles.theirMsg}
          >
            <Text style={msg.isMine ? styles.myText : styles.theirText}>
              {msg.text}
            </Text>
            <Text style={msg.isMine ? styles.myTime : styles.theirTime}>
              {msg.time}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.inputArea}>
        <TouchableOpacity onPress={async () => await DocumentPicker.getDocumentAsync({})}>
          <Ionicons name="attach" size={26} color="#52525B" />
        </TouchableOpacity>
        <TextInput 
          style={styles.input} 
          placeholder="Écrire un message..." 
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal transparent visible={showMenu} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { 
                setShowMenu(false); 
                goToProfile(); 
              }}
            >
              <Ionicons name="person-outline" size={20} color="#9333EA" />
              <Text style={[styles.menuText, { color: '#9333EA' }]}>
                Voir le profil
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { 
                setShowMenu(false); 
                Alert.alert("Signalé"); 
              }}
            >
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={[styles.menuText, { color: '#EF4444' }]}>
                Signaler l'utilisateur
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6', 
    gap: 12 
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarSmall: { width: 36, height: 36, borderRadius: 18 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#18181B' },
  onlineStatus: { fontSize: 12, color: '#22C55E' },
  chatContainer: { padding: 16, gap: 12, paddingBottom: 30 },
  theirMsg: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#F4F4F5', 
    padding: 12, 
    borderRadius: 16, 
    borderBottomLeftRadius: 4, 
    maxWidth: '80%' 
  },
  theirText: { color: '#18181B', fontSize: 15 },
  theirTime: { fontSize: 10, color: '#71717A', marginTop: 4 },
  myMsg: { 
    alignSelf: 'flex-end', 
    backgroundColor: '#A855F7', 
    padding: 12, 
    borderRadius: 16, 
    borderBottomRightRadius: 4, 
    maxWidth: '80%' 
  },
  myText: { color: '#FFF', fontSize: 15 },
  myTime: { fontSize: 10, color: '#E9D5FF', marginTop: 4, textAlign: 'right' },
  inputArea: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F3F4F6', 
    paddingBottom: Platform.OS === 'ios' ? 30 : 12, 
    gap: 10,
    backgroundColor: '#FFF'
  },
  input: { 
    flex: 1, 
    height: 40, 
    backgroundColor: '#F4F4F5', 
    borderRadius: 20, 
    paddingHorizontal: 16,
    fontSize: 15 
  },
  sendBtn: { 
    backgroundColor: '#A855F7', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  menuCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    width: '80%', 
    padding: 8 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    gap: 12 
  },
  menuText: { fontSize: 15, fontWeight: '500' }
});