import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, 
  ScrollView, Image, Alert, ActivityIndicator, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Firebase Imports
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, increment, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { auth, storage, db } from '../../firebaseConfig';

const CATEGORIES = [
  'Marketing', 'IA', 'E-commerce', 'Design', 'Dev', 'Business', 'Photo', 'Vidéo'
];

export default function UploadScreen() {
  const router = useRouter();

  // --- State ---
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // --- Logic: Pick Video ---
  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0].uri) {
        const uri = result.assets[0].uri;
        setVideoUri(uri);
        generateThumbnail(uri);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner la vidéo');
    }
  };

  const generateThumbnail = async (videoUri: string) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000, // Capture at 1 second
      });
      setThumbnailUri(uri);
    } catch (e) {
      console.warn("Could not generate thumbnail", e);
    }
  };

  const clearSelection = () => {
    setVideoUri(null);
    setThumbnailUri(null);
    setProgress(0);
  };

  // --- Logic: Upload to Firebase ---
  const handleUpload = async () => {
    if (!videoUri || !title || !selectedCategory) {
      Alert.alert('Champs manquants', 'Veuillez sélectionner une vidéo, un titre et une catégorie.');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setUploading(true);

    try {
      // 1. Upload Video
      const videoBlob = await (await fetch(videoUri)).blob();
      const videoRef = ref(storage, `videos/${user.uid}/${Date.now()}.mp4`);
      const uploadTask = uploadBytesResumable(videoRef, videoBlob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(prog));
        },
        (error) => {
          console.error("Upload error:", error);
          setUploading(false);
          Alert.alert("Erreur", "Échec de l'upload vidéo");
        },
        async () => {
          // Upload complete
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          
          // 2. Upload Thumbnail (if exists)
          let thumbUrl = null;
          if (thumbnailUri) {
            const thumbBlob = await (await fetch(thumbnailUri)).blob();
            const thumbRef = ref(storage, `thumbnails/${user.uid}/${Date.now()}.jpg`);
            await uploadBytesResumable(thumbRef, thumbBlob);
            thumbUrl = await getDownloadURL(thumbRef);
          }

          // 3. Save to Firestore
          await saveToFirestore(user.uid, downloadUrl, thumbUrl);
        }
      );

    } catch (error) {
      console.error(error);
      setUploading(false);
      Alert.alert("Erreur", "Une erreur est survenue");
    }
  };

  const saveToFirestore = async (userId: string, videoUrl: string, thumbnailUrl: string | null) => {
    try {
      // Add Video Document
      const videoDocRef = await addDoc(collection(db, 'videos'), {
        creatorId: userId,
        videoUrl: videoUrl,
        thumbnail: thumbnailUrl,
        title: title,
        description: description,
        category: selectedCategory,
        likes: 0,
        views: 0,
        comments: 0,
        createdAt: serverTimestamp(),
      });

      // Update User Stats
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'stats.videosCreated': increment(1),
        videos: arrayUnion(videoDocRef.id)
      });

      setUploading(false);
      Alert.alert("Succès", "Vidéo publiée avec succès ! 🎉");
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedCategory('');
      clearSelection();
      
      // Navigate home
      router.push('/(tabs-formateur)/home');

    } catch (error) {
      console.error("Firestore Error:", error);
      setUploading(false);
      Alert.alert("Erreur", "Impossible de sauvegarder les données.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nouvelle Publication</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Video Picker Area */}
        {videoUri ? (
          <View style={styles.previewContainer}>
            <Image 
              source={{ uri: thumbnailUri || videoUri }} 
              style={styles.thumbnail} 
              resizeMode="cover" 
            />
            <View style={styles.previewOverlay}>
              <TouchableOpacity style={styles.clearBtn} onPress={clearSelection} disabled={uploading}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
              <View style={styles.playIcon}>
                <Ionicons name="play-circle" size={50} color="rgba(255,255,255,0.8)" />
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBox} onPress={pickVideo}>
            <LinearGradient
              colors={['#F3E8FF', '#F9FAFB']}
              style={styles.uploadGradient}
            >
              <View style={styles.uploadIconCircle}>
                <Ionicons name="cloud-upload-outline" size={40} color="#9333ea" />
              </View>
              <Text style={styles.uploadText}>Sélectionner une vidéo</Text>
              <Text style={styles.uploadSubText}>Format MP4, max 3 min</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Form Fields */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>Titre de la leçon</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Les bases du SEO..."
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            editable={!uploading}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décrivez le contenu de la vidéo..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            editable={!uploading}
          />

          <Text style={styles.label}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipSelected
                ]}
                onPress={() => !uploading && setSelectedCategory(cat)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.categoryTextSelected
                ]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[
            styles.submitButton, 
            (!videoUri || !title || !selectedCategory || uploading) && styles.submitButtonDisabled
          ]}
          onPress={handleUpload}
          disabled={!videoUri || !title || !selectedCategory || uploading}
        >
          {uploading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.submitText}>Upload en cours {progress}%</Text>
            </View>
          ) : (
            <Text style={styles.submitText}>Publier la vidéo</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Loading Overlay (Optional, for blocking interaction) */}
      {uploading && (
        <View style={styles.progressOverlay}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  // Upload Box
  uploadBox: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E9D5FF',
    borderStyle: 'dashed',
  },
  uploadGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  uploadSubText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Preview
  previewContainer: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#000',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 20,
  },
  playIcon: {
    opacity: 0.8,
  },
  // Form
  formContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoriesRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipSelected: {
    backgroundColor: '#9333ea',
    borderColor: '#9333ea',
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#FFF',
  },
  // Button
  submitButton: {
    backgroundColor: '#9333ea',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Progress Overlay
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  progressBarContainer: {
    width: '100%',
    height: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
});