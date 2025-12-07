import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Alert, Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

interface SwipeableVideoItemProps {
    id: string;
    title: string;
    subtitle: string;
    onDelete: (id: string) => void;
    onPress?: () => void;
    showFavorite?: boolean;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
}

export default function SwipeableVideoItem({
    id,
    title,
    subtitle,
    onDelete,
    onPress,
    showFavorite = false,
    isFavorite = false,
    onToggleFavorite,
}: SwipeableVideoItemProps) {
    const translateX = useRef(new Animated.Value(0)).current;
    const lastOffset = useRef(0);

    const SWIPE_THRESHOLD = -80; // Distance pour activer la suppression
    const DELETE_BUTTON_WIDTH = 80;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Active le swipe seulement si mouvement horizontal significatif
                return Math.abs(gestureState.dx) > 10;
            },
            onPanResponderGrant: () => {
                translateX.setOffset(lastOffset.current);
                translateX.setValue(0);
            },
            onPanResponderMove: (_, gestureState) => {
                // Limite le swipe : seulement vers la gauche et pas trop loin
                const newValue = Math.min(0, Math.max(gestureState.dx, -DELETE_BUTTON_WIDTH * 1.2));
                translateX.setValue(newValue);
            },
            onPanResponderRelease: (_, gestureState) => {
                translateX.flattenOffset();
                
                if (gestureState.dx < SWIPE_THRESHOLD) {
                    // Swipe suffisant : ouvrir le bouton de suppression
                    lastOffset.current = -DELETE_BUTTON_WIDTH;
                    Animated.spring(translateX, {
                        toValue: -DELETE_BUTTON_WIDTH,
                        useNativeDriver: true,
                        friction: 8,
                    }).start();
                } else {
                    // Swipe insuffisant : revenir à la position initiale
                    lastOffset.current = 0;
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                        friction: 8,
                    }).start();
                }
            },
        })
    ).current;

    const handleDelete = () => {
        Alert.alert(
            'Supprimer de la playlist',
            `Êtes-vous sûr de vouloir supprimer "${title}" de votre playlist ?`,
            [
                {
                    text: 'Annuler',
                    style: 'cancel',
                    onPress: () => {
                        // Fermer le swipe
                        closeSwipe();
                    },
                },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: () => {
                        // Animation de suppression
                        Animated.timing(translateX, {
                            toValue: -500,
                            duration: 300,
                            useNativeDriver: true,
                        }).start(() => {
                            onDelete(id);
                            lastOffset.current = 0;
                            translateX.setValue(0);
                        });
                    },
                },
            ]
        );
    };

    const closeSwipe = () => {
        lastOffset.current = 0;
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    return (
        <View style={styles.container}>
            {/* Bouton de suppression (en arrière-plan) */}
            <View style={styles.deleteBackground}>
                <Pressable style={styles.deleteButton} onPress={handleDelete}>
                    <Ionicons name="trash" size={24} color="#FFFFFF" />
                    <Text style={styles.deleteText}>Supprimer</Text>
                </Pressable>
            </View>

            {/* Contenu swipeable */}
            <Animated.View
                style={[
                    styles.swipeableContent,
                    {
                        transform: [{ translateX }],
                    },
                ]}
                {...panResponder.panHandlers}
            >
                <Pressable
                    style={styles.itemCard}
                    onPress={() => {
                        if (lastOffset.current < 0) {
                            // Si le swipe est ouvert, le fermer
                            closeSwipe();
                        } else if (onPress) {
                            onPress();
                        }
                    }}
                >
                    <View style={styles.itemContent}>
                        <View style={styles.itemTextContainer}>
                            <Text style={styles.itemTitle} numberOfLines={2}>
                                {title}
                            </Text>
                            <Text style={styles.itemSubtitle} numberOfLines={1}>
                                {subtitle}
                            </Text>
                        </View>

                        <View style={styles.itemActions}>
                            {showFavorite && onToggleFavorite && (
                                <Pressable
                                    style={styles.favoriteButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        onToggleFavorite();
                                    }}
                                >
                                    <Ionicons
                                        name={isFavorite ? 'heart' : 'heart-outline'}
                                        size={24}
                                        color={isFavorite ? '#FF3B30' : '#6B6B6B'}
                                    />
                                </Pressable>
                            )}
                            <Pressable
                                style={styles.viewButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    if (onPress) onPress();
                                }}
                            >
                                <Text style={styles.viewButtonText}>Voir</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Indicateur de swipe */}
                    <View style={styles.swipeIndicator}>
                        <Ionicons name="chevron-back" size={16} color="#B0B0B0" />
                    </View>
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        position: 'relative',
        overflow: 'hidden',
    },
    deleteBackground: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 80,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FF3B30',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
    },
    deleteButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    deleteText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 4,
    },
    swipeableContent: {
        backgroundColor: '#FFFFFF',
    },
    itemCard: {
        backgroundColor: '#F8F6FF',
        borderRadius: 12,
        padding: 16,
        position: 'relative',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    itemSubtitle: {
        fontSize: 14,
        color: '#6B6B6B',
    },
    itemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    favoriteButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewButton: {
        backgroundColor: '#6B46FF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    viewButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    swipeIndicator: {
        position: 'absolute',
        left: 8,
        top: '50%',
        marginTop: -8,
        opacity: 0.3,
    },
});