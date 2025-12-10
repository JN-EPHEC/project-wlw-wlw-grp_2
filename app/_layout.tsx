import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { ProgressProvider } from './_ProgressContext';
import '../firebaseConfig'; // initialise Firebase (side-effect)
import { auth } from '../firebaseConfig';

export default function RootLayout() {
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // @ts-ignore: dynamic import (path resolved at runtime)
                    const profileFuncs = await import('./firebase-profile-functions');
                    const { saveUserProfile, addGoal } = profileFuncs;
                    // @ts-ignore
                    const AsyncStorageModule = await import('@react-native-async-storage/async-storage');
                    const AsyncStorage = AsyncStorageModule.default;

                    // Sync local profile draft if present
                    const localProfile = await AsyncStorage.getItem('local_profile_draft');
                    if (localProfile) {
                        try {
                            const profile = JSON.parse(localProfile);
                            await saveUserProfile({
                                username: profile.username || '',
                                bio: profile.bio || '',
                                profileEmoji: profile.profileEmoji || '👩‍🎓',
                                profileImage: profile.profileImage || null,
                            });
                            await AsyncStorage.removeItem('local_profile_draft');
                            console.log('Local profile synchronized');
                        } catch (e) {
                            console.error('Failed to sync local profile:', e);
                        }
                    }

                    // Sync local goals if present
                    const localGoals = await AsyncStorage.getItem('local_goals');
                    if (localGoals) {
                        try {
                            const goals = JSON.parse(localGoals);
                            for (const g of goals) {
                                try {
                                    await addGoal({ title: g.title, emoji: g.emoji, color: g.color, target: g.target });
                                } catch (e) {
                                    console.error('Failed to upload local goal:', e);
                                }
                            }
                            await AsyncStorage.removeItem('local_goals');
                            console.log('Local goals synchronized');
                        } catch (e) {
                            console.error('Failed to parse/sync local goals:', e);
                        }
                    }
                } catch (err) {
                    console.error('Error during post-login sync:', err);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <ProgressProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="progression" />
            </Stack>
        </ProgressProvider>
    );
}