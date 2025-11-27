import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Composant Avatar pour l'utilisateur apprenant
function Avatar() {
    return (
        <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>👩‍🎓</Text>
        </View>
    );
}

// Composant Badge pour afficher un badge individuel
interface BadgeProps {
    title: string;
    emoji: string;
}

function Badge({ title, emoji }: BadgeProps) {
    return (
        <View style={styles.badgeItem}>
            <View style={styles.badgeIcon}>
                <Text style={styles.badgeEmoji}>{emoji}</Text>
            </View>
            <Text style={styles.badgeLabel}>{title}</Text>
        </View>
    );
}

// Composant Statistique
interface StatBoxProps {
    value: string;
    label: string;
    variant: 'orange' | 'purple';
}

function StatBox({ value, label, variant }: StatBoxProps) {
    return (
        <View style={[styles.statBox, variant === 'orange' ? styles.statOrange : styles.statPurple]}>
            <Text style={styles.statNumber}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// Page principale du profil utilisateur (apprenant)
export default function UserProfileLearnerComplete() {
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [activeTab, setActiveTab] = useState<'interactions' | 'downloads' | 'parcours' | 'playlists'>('interactions');
    const [isPremium] = useState(true); // Simuler un compte premium
    const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
    const [showAddVideosModal, setShowAddVideosModal] = useState(false);
    const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
    const [selectedVideosForPlaylist, setSelectedVideosForPlaylist] = useState<string[]>([]);

    // Données des badges de l'utilisateur
    const badges = [
        { title: 'Expert\nMarketing', emoji: '🏅' },
        { title: 'Développeur\nPython', emoji: '🐍' },
        { title: 'Expert\nData', emoji: '📊' },
        { title: 'Designer\nUI/UX', emoji: '🎨' },
    ];

    // Historique des interactions
    const interactions = [
        { 
            id: '1', 
            type: 'like', 
            title: 'Introduction au Marketing Digital', 
            date: 'Il y a 2h',
            thumbnail: '🎯',
            duration: '15:30',
            creator: '@marketingpro'
        },
        { 
            id: '2', 
            type: 'comment', 
            title: 'Python pour débutants', 
            date: 'Il y a 5h', 
            comment: 'Super tutoriel !',
            thumbnail: '🐍',
            duration: '22:15',
            creator: '@codewithpython'
        },
        { 
            id: '3', 
            type: 'share', 
            title: 'Design Thinking Workshop', 
            date: 'Hier',
            thumbnail: '🎨',
            duration: '45:00',
            creator: '@designmaster'
        },
        { 
            id: '4', 
            type: 'view', 
            title: 'Excel Avancé - Tableaux Croisés', 
            date: 'Il y a 2 jours',
            thumbnail: '📊',
            duration: '18:45',
            creator: '@excelpro'
        },
        { 
            id: '5', 
            type: 'view', 
            title: 'Comptabilité de Base', 
            date: 'Il y a 3 jours',
            thumbnail: '💰',
            duration: '25:30',
            creator: '@comptaexpert'
        },
        { 
            id: '6', 
            type: 'like', 
            title: 'SEO en 2024', 
            date: 'Il y a 4 jours',
            thumbnail: '🔍',
            duration: '12:20',
            creator: '@seospecialist'
        },
    ];

    // Vidéos téléchargées
    const downloads = [
        { id: '1', title: 'React Native Masterclass', size: '245 MB', duration: '2h 30min' },
        { id: '2', title: 'UI/UX Fundamentals', size: '180 MB', duration: '1h 45min' },
    ];

    // Parcours d'apprentissage
    const parcours = [
        { id: '1', title: 'Développement Web', progress: 65, total: 20, completed: 13 },
        { id: '2', title: 'Marketing Digital', progress: 30, total: 15, completed: 5 },
    ];

    // Calcul de la progression (exemple: 200/3000 XP = ~6.67%)
    const currentXP = 200;
    const targetXP = 3000;
    const progressPercentage = (currentXP / targetXP) * 100;

    const handleSendMessage = () => {
        console.log('Message envoyé:', messageText);
        setMessageText('');
        setShowMessageModal(false);
    };

    const handleDeleteInteraction = (id: string) => {
        console.log('Suppression interaction:', id);
        // Logique de suppression
    };

    const handleCreatePlaylist = () => {
        console.log('Créer playlist:', newPlaylistName, newPlaylistDescription);
        setNewPlaylistName('');
        setNewPlaylistDescription('');
        setShowCreatePlaylistModal(false);
    };

    const handleSharePlaylist = (playlistId: string) => {
        console.log('Partager playlist:', playlistId);
    };

    const handleDeletePlaylist = (playlistId: string) => {
        console.log('Supprimer playlist:', playlistId);
    };

    const handleAddVideosToPlaylist = (playlistId: string) => {
        setSelectedPlaylist(playlistId);
        setShowAddVideosModal(true);
    };

    const handleToggleVideoSelection = (videoId: string) => {
        setSelectedVideosForPlaylist(prev => 
            prev.includes(videoId) 
                ? prev.filter(id => id !== videoId)
                : [...prev, videoId]
        );
    };

    const handleSaveVideosToPlaylist = () => {
        console.log('Ajouter vidéos à la playlist:', selectedPlaylist, selectedVideosForPlaylist);
        setSelectedVideosForPlaylist([]);
        setShowAddVideosModal(false);
        setSelectedPlaylist(null);
    };

    // Playlists personnalisées de l'utilisateur
    const userPlaylists = [
        {
            id: 'up1',
            name: 'Apprendre le Marketing',
            description: 'Ma sélection de vidéos marketing',
            videoCount: 8,
            thumbnail: '🎯',
            isPublic: false,
            createdDate: 'Il y a 2 jours',
        },
        {
            id: 'up2',
            name: 'Développement Personnel',
            description: 'Vidéos inspirantes pour progresser',
            videoCount: 12,
            thumbnail: '🌟',
            isPublic: true,
            createdDate: 'Il y a 1 semaine',
        },
        {
            id: 'up3',
            name: 'Coding Tutorials',
            description: 'Tutoriels Python et JavaScript',
            videoCount: 15,
            thumbnail: '💻',
            isPublic: false,
            createdDate: 'Il y a 2 semaines',
        },
    ];

    // Vidéos disponibles pour ajouter aux playlists
    const availableVideos = [
        { id: 'av1', title: 'Introduction au Marketing Digital', creator: '@marketingpro', duration: '15:30', thumbnail: '🎯' },
        { id: 'av2', title: 'Python pour débutants', creator: '@codewithpython', duration: '22:15', thumbnail: '🐍' },
        { id: 'av3', title: 'Design Thinking Workshop', creator: '@designmaster', duration: '45:00', thumbnail: '🎨' },
        { id: 'av4', title: 'Excel Avancé', creator: '@excelpro', duration: '18:45', thumbnail: '📊' },
        { id: 'av5', title: 'SEO en 2024', creator: '@seospecialist', duration: '12:20', thumbnail: '🔍' },
        { id: 'av6', title: 'Leadership Moderne', creator: '@leadercoach', duration: '25:30', thumbnail: '👔' },
    ];

    return (
        <View style={styles.screen}>
            <ScrollView 
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* En-tête avec navigation */}
                <View style={styles.headerRow}>
                    <Link href="/" asChild>
                        <Pressable style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color="#6b6b6b" />
                        </Pressable>
                    </Link>
                    <View style={styles.headerSpacer} />
                    <Pressable style={styles.settingsButton}>
                        <Ionicons name="settings-outline" size={24} color="#6B46FF" />
                    </Pressable>
                </View>

                {/* Section centrale du profil */}
                <View style={styles.centerColumn}>
                    {/* Avatar utilisateur avec indicateur premium */}
                    <View style={styles.avatarWrapper}>
                        <Avatar />
                        {isPremium && (
                            <View style={styles.premiumBadge}>
                                <Ionicons name="star" size={16} color="#FFD700" />
                            </View>
                        )}
                    </View>

                    {/* Nom d'utilisateur */}
                    <Text style={styles.handle}>@sophiedubois</Text>

                    {/* Bio */}
                    <Text style={styles.bio}>
                        Passionnée de tech et design 🚀 | Apprenante curieuse | Marketing & Dev
                    </Text>

                    {/* Badge de rôle - Apprenant */}
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>Apprenant</Text>
                    </View>

                    {/* Boutons d'action */}
                    <View style={styles.actionButtons}>
                        <Pressable style={styles.editButton}>
                            <Text style={styles.editButtonText}>Modifier le profil</Text>
                        </Pressable>
                        <Pressable 
                            style={styles.messageButton}
                            onPress={() => setShowMessageModal(true)}
                        >
                            <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
                        </Pressable>
                    </View>

                    {/* Statistiques */}
                    <View style={styles.statsRow}>
                        <StatBox value="1.2K" label="Aimées" variant="orange" />
                        <StatBox value="1.2K" label="Abonnées" variant="purple" />
                        <StatBox value="124" label="Sauvegardes" variant="orange" />
                    </View>

                    {/* Carte de progression globale */}
                    <View style={styles.progressCard}>
                        <View style={styles.progressTitleRow}>
                            <View style={styles.titleLeft}>
                                <Ionicons name="trending-up" size={20} color="#FF9A2A" />
                                <Text style={styles.progressTitle}>Progression globale</Text>
                            </View>
                            <View style={styles.levelBadgeContainer}>
                                <Text style={styles.levelBadgeText}>Niveau 2</Text>
                            </View>
                        </View>

                        {/* Barre de progression */}
                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressTrack}>
                                <View 
                                    style={[
                                        styles.progressFill, 
                                        { width: `${progressPercentage}%` }
                                    ]} 
                                />
                            </View>
                        </View>

                        <Text style={styles.progressSub}>
                            {currentXP} / {targetXP.toLocaleString()} XP pour niveau 8
                        </Text>
                    </View>

                    {/* Carte Badges & Réalisations */}
                    <View style={styles.badgesCard}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleRow}>
                                <Ionicons name="ribbon" size={20} color="#FF9A2A" />
                                <Text style={styles.cardTitle}>Badges & Réalisation</Text>
                            </View>
                            <View style={styles.countBadge}>
                                <Text style={styles.countBadgeText}>4/8</Text>
                            </View>
                        </View>

                        {/* Liste horizontale des badges */}
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.badgesScrollContent}
                        >
                            {badges.map((badge, index) => (
                                <Badge 
                                    key={index} 
                                    title={badge.title} 
                                    emoji={badge.emoji} 
                                />
                            ))}
                        </ScrollView>

                        {/* Bouton voir certificats */}
                        <Pressable style={styles.ctaButton}>
                            <Text style={styles.ctaText}>Voir mes certificats</Text>
                        </Pressable>
                    </View>

                    {/* Nouvelle section: Parcours & Activités */}
                    <View style={styles.activitiesCard}>
                        <View style={styles.tabsHeader}>
                            <Pressable 
                                style={[styles.tab, activeTab === 'interactions' && styles.tabActive]}
                                onPress={() => setActiveTab('interactions')}
                            >
                                <Ionicons 
                                    name="time-outline" 
                                    size={18} 
                                    color={activeTab === 'interactions' ? '#6B46FF' : '#6b6b6b'} 
                                />
                                <Text style={[styles.tabText, activeTab === 'interactions' && styles.tabTextActive]}>
                                    Historique
                                </Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.tab, activeTab === 'playlists' && styles.tabActive]}
                                onPress={() => setActiveTab('playlists')}
                            >
                                <Ionicons 
                                    name="list-outline" 
                                    size={18} 
                                    color={activeTab === 'playlists' ? '#6B46FF' : '#6b6b6b'} 
                                />
                                <Text style={[styles.tabText, activeTab === 'playlists' && styles.tabTextActive]}>
                                    Playlists
                                </Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.tab, activeTab === 'downloads' && styles.tabActive]}
                                onPress={() => setActiveTab('downloads')}
                            >
                                <Ionicons 
                                    name="download-outline" 
                                    size={18} 
                                    color={activeTab === 'downloads' ? '#6B46FF' : '#6b6b6b'} 
                                />
                                <Text style={[styles.tabText, activeTab === 'downloads' && styles.tabTextActive]}>
                                    Téléchargés
                                </Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.tab, activeTab === 'parcours' && styles.tabActive]}
                                onPress={() => setActiveTab('parcours')}
                            >
                                <Ionicons 
                                    name="map-outline" 
                                    size={18} 
                                    color={activeTab === 'parcours' ? '#6B46FF' : '#6b6b6b'} 
                                />
                                <Text style={[styles.tabText, activeTab === 'parcours' && styles.tabTextActive]}>
                                    Parcours
                                </Text>
                            </Pressable>
                        </View>

                        {/* Contenu des onglets */}
                        <View style={styles.tabContent}>
                            {activeTab === 'interactions' && (
                                <View>
                                    <View style={styles.historyHeader}>
                                        <Ionicons name="time" size={24} color="#6B46FF" />
                                        <Text style={styles.historyTitle}>Historique de visionnage</Text>
                                    </View>
                                    <Text style={styles.historySubtitle}>
                                        Retrouvez toutes les vidéos que vous avez visionnées
                                    </Text>
                                    
                                    {interactions.map((item) => {
                                        const getIconName = () => {
                                            if (item.type === 'like') return 'heart';
                                            if (item.type === 'comment') return 'chatbubble';
                                            if (item.type === 'share') return 'share-social';
                                            return 'play-circle';
                                        };
                                        
                                        const getActionLabel = () => {
                                            if (item.type === 'like') return 'Aimé';
                                            if (item.type === 'comment') return 'Commenté';
                                            if (item.type === 'share') return 'Partagé';
                                            return 'Visionné';
                                        };
                                        
                                        return (
                                            <View key={item.id} style={styles.historyItem}>
                                                {/* Miniature */}
                                                <View style={styles.historyThumbnail}>
                                                    <Text style={styles.historyEmoji}>{item.thumbnail}</Text>
                                                    <View style={styles.historyDuration}>
                                                        <Text style={styles.historyDurationText}>{item.duration}</Text>
                                                    </View>
                                                </View>

                                                {/* Informations */}
                                                <View style={styles.historyContent}>
                                                    <Text style={styles.historyVideoTitle}>{item.title}</Text>
                                                    <Text style={styles.historyCreator}>{item.creator}</Text>
                                                    
                                                    {/* Type d'action et date */}
                                                    <View style={styles.historyMeta}>
                                                        <View style={styles.historyAction}>
                                                            <Ionicons 
                                                                name={getIconName()} 
                                                                size={14} 
                                                                color="#6B46FF" 
                                                            />
                                                            <Text style={styles.historyActionText}>
                                                                {getActionLabel()}
                                                            </Text>
                                                        </View>
                                                        <Text style={styles.historyDate}>{item.date}</Text>
                                                    </View>
                                                    
                                                    {item.type === 'comment' && item.comment && (
                                                        <View style={styles.commentBubble}>
                                                            <Text style={styles.commentText}>"{item.comment}"</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {/* Actions */}
                                                <View style={styles.historyActions}>
                                                    <Pressable 
                                                        style={styles.historyPlayButton}
                                                        onPress={() => console.log('Lire', item.id)}
                                                    >
                                                        <Ionicons name="play" size={20} color="#FFFFFF" />
                                                    </Pressable>
                                                    <Pressable 
                                                        style={styles.historyDeleteButton}
                                                        onPress={() => handleDeleteInteraction(item.id)}
                                                    >
                                                        <Ionicons name="close" size={18} color="#6b6b6b" />
                                                    </Pressable>
                                                </View>
                                            </View>
                                        );
                                    })}

                                    {/* Bouton tout effacer */}
                                    <Pressable style={styles.clearHistoryButton}>
                                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                                        <Text style={styles.clearHistoryText}>Effacer tout l'historique</Text>
                                    </Pressable>
                                </View>
                            )}

                            {activeTab === 'playlists' && (
                                <View>
                                    {/* Header avec bouton créer */}
                                    <View style={styles.playlistsHeader}>
                                        <View>
                                            <Text style={styles.playlistsTitle}>Mes Playlists</Text>
                                            <Text style={styles.playlistsSubtitle}>
                                                Organisez vos vidéos favorites
                                            </Text>
                                        </View>
                                        <Pressable 
                                            style={styles.createPlaylistBtn}
                                            onPress={() => setShowCreatePlaylistModal(true)}
                                        >
                                            <Ionicons name="add" size={24} color="#FFFFFF" />
                                        </Pressable>
                                    </View>

                                    {/* Liste des playlists */}
                                    {userPlaylists.map((playlist) => (
                                        <View key={playlist.id} style={styles.userPlaylistCard}>
                                            {/* Header avec statut */}
                                            <View style={styles.userPlaylistHeader}>
                                                <View style={styles.userPlaylistThumbnail}>
                                                    <Text style={styles.userPlaylistEmoji}>{playlist.thumbnail}</Text>
                                                    <View style={styles.userPlaylistCount}>
                                                        <Text style={styles.userPlaylistCountText}>
                                                            {playlist.videoCount}
                                                        </Text>
                                                    </View>
                                                </View>
                                                
                                                <View style={styles.userPlaylistInfo}>
                                                    <View style={styles.userPlaylistTitleRow}>
                                                        <Text style={styles.userPlaylistName}>{playlist.name}</Text>
                                                        <View style={[
                                                            styles.playlistStatusBadge,
                                                            { backgroundColor: playlist.isPublic ? '#E8FFE8' : '#FFE8E8' }
                                                        ]}>
                                                            <Ionicons 
                                                                name={playlist.isPublic ? 'globe-outline' : 'lock-closed-outline'} 
                                                                size={10} 
                                                                color={playlist.isPublic ? '#4CAF50' : '#FF6B6B'} 
                                                            />
                                                        </View>
                                                    </View>
                                                    <Text style={styles.userPlaylistDescription}>
                                                        {playlist.description}
                                                    </Text>
                                                    <Text style={styles.userPlaylistDate}>
                                                        Créée {playlist.createdDate}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Actions */}
                                            <View style={styles.userPlaylistActions}>
                                                <Pressable 
                                                    style={styles.userPlaylistActionBtn}
                                                    onPress={() => handleAddVideosToPlaylist(playlist.id)}
                                                >
                                                    <Ionicons name="add-circle-outline" size={18} color="#6B46FF" />
                                                    <Text style={styles.userPlaylistActionText}>Ajouter vidéos</Text>
                                                </Pressable>

                                                <Pressable 
                                                    style={styles.userPlaylistActionBtn}
                                                    onPress={() => handleSharePlaylist(playlist.id)}
                                                >
                                                    <Ionicons name="share-social-outline" size={18} color="#FF9A2A" />
                                                    <Text style={styles.userPlaylistActionText}>Partager</Text>
                                                </Pressable>

                                                <Pressable 
                                                    style={styles.userPlaylistActionBtn}
                                                    onPress={() => handleDeletePlaylist(playlist.id)}
                                                >
                                                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                                                </Pressable>
                                            </View>
                                        </View>
                                    ))}

                                    {/* Message si aucune playlist */}
                                    {userPlaylists.length === 0 && (
                                        <View style={styles.emptyPlaylistState}>
                                            <Ionicons name="musical-notes-outline" size={60} color="#E8E8E8" />
                                            <Text style={styles.emptyPlaylistText}>
                                                Vous n'avez pas encore de playlist
                                            </Text>
                                            <Pressable 
                                                style={styles.createFirstPlaylistBtn}
                                                onPress={() => setShowCreatePlaylistModal(true)}
                                            >
                                                <Text style={styles.createFirstPlaylistText}>
                                                    Créer ma première playlist
                                                </Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            )}

                            {activeTab === 'downloads' && (
                                <View>
                                    <View style={styles.storageInfo}>
                                        <Text style={styles.storageText}>Espace utilisé: 425 MB / 20 GB</Text>
                                        <Pressable style={styles.manageButton}>
                                            <Text style={styles.manageButtonText}>Gérer</Text>
                                        </Pressable>
                                    </View>
                                    {downloads.map((item) => (
                                        <View key={item.id} style={styles.downloadItem}>
                                            <View style={styles.downloadIcon}>
                                                <Ionicons name="play-circle" size={24} color="#6B46FF" />
                                            </View>
                                            <View style={styles.downloadContent}>
                                                <Text style={styles.downloadTitle}>{item.title}</Text>
                                                <Text style={styles.downloadInfo}>
                                                    {item.size} • {item.duration}
                                                </Text>
                                            </View>
                                            <Pressable style={styles.downloadDeleteButton}>
                                                <Ionicons name="trash-outline" size={20} color="#6b6b6b" />
                                            </Pressable>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {activeTab === 'parcours' && (
                                <View>
                                    {parcours.map((item) => (
                                        <View key={item.id} style={styles.parcoursItem}>
                                            <View style={styles.parcoursHeader}>
                                                <Text style={styles.parcoursTitle}>{item.title}</Text>
                                                <Text style={styles.parcoursProgress}>
                                                    {item.completed}/{item.total}
                                                </Text>
                                            </View>
                                            <View style={styles.parcoursBar}>
                                                <View 
                                                    style={[
                                                        styles.parcoursFill, 
                                                        { width: `${item.progress}%` }
                                                    ]} 
                                                />
                                            </View>
                                            <Text style={styles.parcoursPercentage}>{item.progress}% complété</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Modal de message */}
            <Modal
                visible={showMessageModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowMessageModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Envoyer un message</Text>
                            <Pressable onPress={() => setShowMessageModal(false)}>
                                <Ionicons name="close" size={24} color="#1A1A1A" />
                            </Pressable>
                        </View>
                        <TextInput
                            style={styles.messageInput}
                            placeholder="Écrivez votre message..."
                            multiline
                            value={messageText}
                            onChangeText={setMessageText}
                            maxLength={500}
                        />
                        <Pressable 
                            style={styles.sendButton}
                            onPress={handleSendMessage}
                        >
                            <Text style={styles.sendButtonText}>Envoyer</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Modal de création de playlist */}
            <Modal
                visible={showCreatePlaylistModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCreatePlaylistModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Créer une playlist</Text>
                            <Pressable onPress={() => setShowCreatePlaylistModal(false)}>
                                <Ionicons name="close" size={24} color="#1A1A1A" />
                            </Pressable>
                        </View>
                        
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Nom de la playlist *</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="Ex: Mes vidéos préférées"
                                value={newPlaylistName}
                                onChangeText={setNewPlaylistName}
                                maxLength={50}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Description</Text>
                            <TextInput
                                style={[styles.formInput, styles.formInputMultiline]}
                                placeholder="Décrivez votre playlist..."
                                value={newPlaylistDescription}
                                onChangeText={setNewPlaylistDescription}
                                multiline
                                maxLength={200}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Visibilité</Text>
                            <View style={styles.visibilitySelector}>
                                <Pressable style={[styles.visibilityOption, styles.visibilityOptionActive]}>
                                    <Ionicons name="lock-closed-outline" size={18} color="#FF6B6B" />
                                    <Text style={[styles.visibilityOptionText, { color: '#FF6B6B' }]}>
                                        Privée
                                    </Text>
                                </Pressable>
                                <Pressable style={styles.visibilityOption}>
                                    <Ionicons name="globe-outline" size={18} color="#6b6b6b" />
                                    <Text style={styles.visibilityOptionText}>Publique</Text>
                                </Pressable>
                            </View>
                        </View>

                        <Pressable 
                            style={[styles.sendButton, !newPlaylistName && styles.sendButtonDisabled]}
                            onPress={handleCreatePlaylist}
                            disabled={!newPlaylistName}
                        >
                            <Text style={styles.sendButtonText}>Créer la playlist</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Modal d'ajout de vidéos à une playlist */}
            <Modal
                visible={showAddVideosModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddVideosModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Ajouter des vidéos</Text>
                            <Pressable onPress={() => {
                                setShowAddVideosModal(false);
                                setSelectedVideosForPlaylist([]);
                            }}>
                                <Ionicons name="close" size={24} color="#1A1A1A" />
                            </Pressable>
                        </View>
                        
                        <Text style={styles.modalSubtitle}>
                            Sélectionnez les vidéos à ajouter à votre playlist
                        </Text>

                        <ScrollView style={styles.videoSelectionList}>
                            {availableVideos.map((video) => {
                                const isSelected = selectedVideosForPlaylist.includes(video.id);
                                return (
                                    <Pressable 
                                        key={video.id}
                                        style={[
                                            styles.videoSelectionItem,
                                            isSelected && styles.videoSelectionItemSelected
                                        ]}
                                        onPress={() => handleToggleVideoSelection(video.id)}
                                    >
                                        <View style={styles.videoSelectionThumbnail}>
                                            <Text style={styles.videoSelectionEmoji}>{video.thumbnail}</Text>
                                        </View>
                                        <View style={styles.videoSelectionInfo}>
                                            <Text style={styles.videoSelectionTitle}>{video.title}</Text>
                                            <Text style={styles.videoSelectionCreator}>{video.creator}</Text>
                                            <Text style={styles.videoSelectionDuration}>{video.duration}</Text>
                                        </View>
                                        <View style={[
                                            styles.videoSelectionCheckbox,
                                            isSelected && styles.videoSelectionCheckboxSelected
                                        ]}>
                                            {isSelected && (
                                                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                                            )}
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Text style={styles.selectedCount}>
                                {selectedVideosForPlaylist.length} vidéo(s) sélectionnée(s)
                            </Text>
                            <Pressable 
                                style={[
                                    styles.sendButton,
                                    selectedVideosForPlaylist.length === 0 && styles.sendButtonDisabled
                                ]}
                                onPress={handleSaveVideosToPlaylist}
                                disabled={selectedVideosForPlaylist.length === 0}
                            >
                                <Text style={styles.sendButtonText}>Ajouter à la playlist</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Navigation en bas de page */}
            <View style={styles.bottomNav}>
                <Pressable style={styles.navItem}>
                    <Ionicons name="home-outline" size={26} color="#B0B0B0" />
                    <Text style={styles.navText}>Accueil</Text>
                </Pressable>

                <Pressable style={styles.navItem}>
                    <Ionicons name="search-outline" size={26} color="#B0B0B0" />
                    <Text style={styles.navText}>Explorer</Text>
                </Pressable>

                <View style={styles.navItemCenter}>
                    <View style={styles.addButton}>
                        <Ionicons name="add" size={32} color="#FD9A34" />
                    </View>
                </View>

                <Pressable style={styles.navItem}>
                    <Ionicons name="notifications-outline" size={26} color="#B0B0B0" />
                    <Text style={styles.navText}>Notifications</Text>
                </Pressable>

                <Pressable style={styles.navItem}>
                    <Ionicons name="person" size={26} color="#6B46FF" />
                    <Text style={[styles.navText, styles.navTextActive]}>Profil</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: Platform.OS === 'ios' ? 100 : 90,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSpacer: {
        flex: 1,
    },
    settingsButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerColumn: {
        alignItems: 'center',
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 12,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F0E6FF',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarEmoji: {
        fontSize: 50,
    },
    premiumBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#1A1A1A',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    handle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    bio: {
        fontSize: 14,
        color: '#6b6b6b',
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
        lineHeight: 20,
    },
    roleBadge: {
        backgroundColor: '#6B46FF',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 16,
    },
    roleText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    editButton: {
        backgroundColor: '#6B46FF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
    },
    editButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    messageButton: {
        backgroundColor: '#FF9A2A',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
        paddingHorizontal: 8,
    },
    statBox: {
        flex: 1,
        height: 60,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
    },
    statOrange: {
        backgroundColor: '#FF9A2A',
    },
    statPurple: {
        backgroundColor: '#6B46FF',
    },
    statNumber: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        color: '#FFFFFF',
        fontSize: 11,
        marginTop: 2,
    },
    progressCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    progressTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    titleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginLeft: 8,
    },
    levelBadgeContainer: {
        backgroundColor: '#F8F6FF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    levelBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B46FF',
    },
    progressBarContainer: {
        marginBottom: 8,
    },
    progressTrack: {
        height: 8,
        backgroundColor: '#E0D6FF',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FF9A2A',
        borderRadius: 4,
    },
    progressSub: {
        fontSize: 12,
        color: '#6b6b6b',
        textAlign: 'left',
    },
    badgesCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E8E8E8',
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginLeft: 8,
    },
    countBadge: {
        backgroundColor: '#F8F6FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    countBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF9A2A',
    },
    badgesScrollContent: {
        paddingRight: 16,
    },
    badgeItem: {
        width: 70,
        alignItems: 'center',
        marginRight: 12,
    },
    badgeIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#6B46FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    badgeEmoji: {
        fontSize: 24,
    },
    badgeLabel: {
        fontSize: 10,
        color: '#6B46FF',
        textAlign: 'center',
        lineHeight: 13,
    },
    ctaButton: {
        backgroundColor: '#FF9A2A',
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 16,
    },
    ctaText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },

    activitiesCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E8E8E8',
        marginBottom: 16,
    },
    tabsHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#6B46FF',
    },
    tabText: {
        fontSize: 12,
        color: '#6b6b6b',
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#6B46FF',
        fontWeight: '600',
    },
    tabContent: {
        minHeight: 200,
    },

    // History Section
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    historySubtitle: {
        fontSize: 13,
        color: '#6b6b6b',
        marginBottom: 16,
        lineHeight: 18,
    },
    historyItem: {
        flexDirection: 'row',
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    historyThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 10,
        backgroundColor: '#6B46FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        position: 'relative',
    },
    historyEmoji: {
        fontSize: 32,
    },
    historyDuration: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    historyDurationText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '600',
    },
    historyContent: {
        flex: 1,
        justifyContent: 'space-between',
    },
    historyVideoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    historyCreator: {
        fontSize: 12,
        color: '#6B46FF',
        marginBottom: 6,
    },
    historyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    historyAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    historyActionText: {
        fontSize: 11,
        color: '#6B46FF',
        fontWeight: '600',
    },
    historyDate: {
        fontSize: 11,
        color: '#6b6b6b',
    },
    commentBubble: {
        backgroundColor: '#E8E8FF',
        padding: 8,
        borderRadius: 8,
        marginTop: 6,
    },
    commentText: {
        fontSize: 12,
        color: '#6B46FF',
        fontStyle: 'italic',
    },
    historyActions: {
        flexDirection: 'column',
        gap: 8,
        justifyContent: 'center',
        marginLeft: 8,
    },
    historyPlayButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#6B46FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyDeleteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearHistoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFE8E8',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 12,
    },
    clearHistoryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF6B6B',
    },

    // User Playlists
    playlistsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    playlistsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    playlistsSubtitle: {
        fontSize: 13,
        color: '#6b6b6b',
        marginTop: 2,
    },
    createPlaylistBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#6B46FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userPlaylistCard: {
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    userPlaylistHeader: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    userPlaylistThumbnail: {
        width: 70,
        height: 70,
        borderRadius: 12,
        backgroundColor: '#6B46FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        position: 'relative',
    },
    userPlaylistEmoji: {
        fontSize: 32,
    },
    userPlaylistCount: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    userPlaylistCountText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    userPlaylistInfo: {
        flex: 1,
    },
    userPlaylistTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    userPlaylistName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1A1A1A',
        flex: 1,
    },
    playlistStatusBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userPlaylistDescription: {
        fontSize: 13,
        color: '#6b6b6b',
        marginBottom: 4,
    },
    userPlaylistDate: {
        fontSize: 11,
        color: '#9b9b9b',
    },
    userPlaylistActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
        paddingTop: 10,
    },
    userPlaylistActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    userPlaylistActionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B46FF',
    },
    emptyPlaylistState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyPlaylistText: {
        fontSize: 15,
        color: '#6b6b6b',
        marginTop: 16,
        marginBottom: 20,
    },
    createFirstPlaylistBtn: {
        backgroundColor: '#6B46FF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
    },
    createFirstPlaylistText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },

    // Form styles
    formGroup: {
        marginBottom: 20,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    formInput: {
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    formInputMultiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    visibilitySelector: {
        flexDirection: 'row',
        gap: 12,
    },
    visibilityOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#F8F6FF',
        borderWidth: 1,
        borderColor: '#E8E8E8',
        gap: 8,
    },
    visibilityOptionActive: {
        backgroundColor: '#FFE8E8',
        borderColor: '#FF6B6B',
    },
    visibilityOptionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b6b6b',
    },
    sendButtonDisabled: {
        backgroundColor: '#B0B0B0',
        opacity: 0.5,
    },

    // Video Selection Modal
    modalSubtitle: {
        fontSize: 13,
        color: '#6b6b6b',
        marginBottom: 16,
    },
    videoSelectionList: {
        maxHeight: 400,
        marginBottom: 16,
    },
    videoSelectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    videoSelectionItemSelected: {
        borderColor: '#6B46FF',
        backgroundColor: '#F0E6FF',
    },
    videoSelectionThumbnail: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: '#6B46FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    videoSelectionEmoji: {
        fontSize: 24,
    },
    videoSelectionInfo: {
        flex: 1,
    },
    videoSelectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    videoSelectionCreator: {
        fontSize: 11,
        color: '#6B46FF',
        marginBottom: 2,
    },
    videoSelectionDuration: {
        fontSize: 11,
        color: '#6b6b6b',
    },
    videoSelectionCheckbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#E8E8E8',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    videoSelectionCheckboxSelected: {
        backgroundColor: '#6B46FF',
        borderColor: '#6B46FF',
    },
    modalFooter: {
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
        paddingTop: 16,
    },
    selectedCount: {
        fontSize: 13,
        color: '#6b6b6b',
        marginBottom: 12,
        textAlign: 'center',
        fontWeight: '500',
    },
    storageInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        marginBottom: 12,
    },
    storageText: {
        fontSize: 13,
        color: '#6b6b6b',
        fontWeight: '500',
    },
    manageButton: {
        backgroundColor: '#6B46FF',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
    },
    manageButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    downloadItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        marginBottom: 8,
    },
    downloadIcon: {
        marginRight: 12,
    },
    downloadContent: {
        flex: 1,
    },
    downloadTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    downloadInfo: {
        fontSize: 12,
        color: '#6b6b6b',
    },
    downloadDeleteButton: {
        padding: 8,
    },
    parcoursItem: {
        padding: 12,
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        marginBottom: 8,
    },
    parcoursHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    parcoursTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    parcoursProgress: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B46FF',
    },
    parcoursBar: {
        height: 6,
        backgroundColor: '#E0D6FF',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 6,
    },
    parcoursFill: {
        height: '100%',
        backgroundColor: '#6B46FF',
        borderRadius: 3,
    },
    parcoursPercentage: {
        fontSize: 12,
        color: '#6b6b6b',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    messageInput: {
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        padding: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        fontSize: 14,
        marginBottom: 16,
    },
    sendButton: {
        backgroundColor: '#6B46FF',
        paddingVertical: 14,
        borderRadius: 25,
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 75,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
        paddingBottom: Platform.OS === 'ios' ? 20 : 5,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    navItemCenter: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginTop: -10,
    },
    addButton: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FD9A34',
        shadowColor: '#FD9A34',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    navText: {
        fontSize: 10,
        color: '#B0B0B0',
        marginTop: 4,
        fontWeight: '500',
    },
    navTextActive: {
        color: '#6B46FF',
    },
});