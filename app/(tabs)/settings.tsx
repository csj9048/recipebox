import React, { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, SafeAreaView, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { getGuestRecipes, clearGuestRecipes } from '../../utils/storage';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../utils/supabase/client';
import { AuthModal } from '../../components/AuthModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [user, setUser] = useState<any>(null);
    const [authModalVisible, setAuthModalVisible] = useState(false);

    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        checkUser();
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Settings: Auth event:', event);
            setUser(session?.user || null);
            setImageError(false);

            // Global AuthModal in _layout.tsx handles sync logic now.
        });
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
    };

    const handleLogout = async () => {
        Alert.alert(t('settings.alert.logout_title'), t('settings.alert.logout_message'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('settings.menu.logout'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        await GoogleSignin.signOut();
                    } catch (e) {
                        console.log('Google Sign-Out Error (ignore if not logged in via Google):', e);
                    }
                    await supabase.auth.signOut();
                    setUser(null);
                },
            },
        ]);
    };

    const handleReview = () => {
        if (Platform.OS === 'ios') {
            // TODO: Replace with actual App ID after release
            Linking.openURL('https://apps.apple.com/app/id6739487321?action=write-review');
        } else {
            const packageName = Constants.expoConfig?.android?.package || 'com.recipebox.app';
            Linking.openURL(`market://details?id=${packageName}`);
        }
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            t('settings.alert.delete_account_title'),
            t('settings.alert.delete_account_message'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('settings.alert.delete_confirm'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!user) return;

                            // 0. Get current session for token
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session?.access_token) {
                                throw new Error('No access token found');
                            }

                            // 1. Delete user data (recipes)
                            const { error: deleteError } = await supabase
                                .from('recipes')
                                .delete()
                                .eq('user_id', user.id);

                            if (deleteError) {
                                console.error('Error deleting recipes:', deleteError);
                            }

                            // 2. Call Edge Function to delete user from Auth
                            const { error: functionError } = await fetch(
                                `https://${projectId}.supabase.co/functions/v1/server/delete-user`,
                                {
                                    method: 'POST',
                                    headers: {
                                        Authorization: `Bearer ${session.access_token}`,
                                        'Content-Type': 'application/json',
                                    },
                                }
                            ).then(async res => {
                                if (!res.ok) {
                                    const text = await res.text();
                                    console.error('Edge Function Error:', text);
                                    throw new Error(`Failed to delete user: ${text}`);
                                }
                                return { error: null };
                            }).catch(err => ({ error: err }));

                            if (functionError) {
                                console.error('Delete User Function Failed:', functionError);
                                throw functionError;
                            }

                            // 3. Sign out locally
                            await supabase.auth.signOut();
                            setUser(null);
                            Alert.alert(t('common.notice'), t('settings.alert.delete_success'));

                        } catch (error: any) {
                            Alert.alert(t('common.error'), t('settings.alert.delete_failed'));
                            console.error('Account deletion error:', error);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.container]}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={{ width: 40, height: 40 }} />
                <Text style={styles.headerTitle}>{t('settings.title')}</Text>
                <View style={{ width: 40, height: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header / Profile Section */}
                <View style={styles.profileSection}>
                    {user ? (
                        <View style={styles.profileInfo}>
                            {user.user_metadata?.avatar_url && !imageError ? (
                                <Image
                                    source={{ uri: user.user_metadata.avatar_url }}
                                    style={styles.avatarImage}
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <View style={styles.avatar}>
                                    <Ionicons name="person" size={32} color={Colors.white} />
                                </View>
                            )}
                            <View>
                                <Text style={styles.emailText}>
                                    {user.user_metadata?.full_name || user.user_metadata?.name || (user.email && user.email.includes('privaterelay') ? t('settings.user.apple_user') : user.email) || t('settings.user.user')}님
                                </Text>
                                <Text style={styles.loginStatusText}>
                                    {user.app_metadata?.provider === 'kakao' ? t('settings.user.kakao_login') :
                                        user.app_metadata?.provider === 'apple' ? t('settings.user.apple_login') :
                                            (user.email && !user.email.includes('@recipebox') ? user.email : t('settings.user.logged_in'))}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.loginCard}
                            onPress={() => setAuthModalVisible(true)}
                        >
                            <View style={styles.loginCardContent}>
                                <Text style={styles.loginTitle}>{t('settings.login_card.title')}</Text>
                                <Text style={styles.loginSubtitle}>
                                    {t('settings.login_card.subtitle')}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color={Colors.gray[400]} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert(t('settings.menu.app_info'), `Version ${Constants.expoConfig?.version || '1.0.0'}`)}>
                        <Ionicons name="information-circle-outline" size={24} color={Colors.text.primary} />
                        <Text style={styles.menuText}>{t('settings.menu.app_info')}</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.gray[300]} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleReview}>
                        <Ionicons name="star-outline" size={24} color={Colors.text.primary} />
                        <Text style={styles.menuText}>{t('settings.menu.review')}</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.gray[300]} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://www.notion.so/csj9048/RecipeBox-2e8aabf0f5ad80e6b4bdf83f267ae5dc')}>
                        <Ionicons name="document-text-outline" size={24} color={Colors.text.primary} />
                        <Text style={styles.menuText}>{t('settings.menu.terms')}</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.gray[300]} />
                    </TouchableOpacity>
                </View>

                {/* Logout & Delete Account Button */}
                {user && (
                    <View style={styles.footerButtons}>
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Text style={styles.logoutText}>{t('settings.menu.logout')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.withdrawalButton} onPress={handleDeleteAccount}>
                            <Text style={styles.withdrawalText}>{t('settings.menu.delete_account')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <AuthModal
                visible={authModalVisible}
                onClose={() => setAuthModalVisible(false)}
                onSuccess={checkUser}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderColor: '#eee',
        backgroundColor: Colors.primary,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text.primary,
    },
    content: {
        padding: 20,
    },
    profileSection: {
        marginBottom: 24,
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 20,
        borderRadius: 16,
        gap: 16,
        borderWidth: 1,
        borderColor: Colors.border.light,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E0E0E0', // 이미지 로딩 중/실패 시 배경색
    },
    emailText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    loginStatusText: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '500',
    },
    loginCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border.light,
    },
    loginCardContent: {
        flex: 1,
    },
    loginTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text.primary,
        marginBottom: 8,
    },
    loginSubtitle: {
        fontSize: 14,
        color: Colors.gray[500],
        lineHeight: 20,
    },
    menuSection: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border.light,
        overflow: 'hidden',
        marginBottom: 24,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray[100],
        gap: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: Colors.text.primary,
    },
    footerButtons: {
        gap: 12,
        marginBottom: 20,
    },
    logoutButton: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: Colors.gray[100],
        borderRadius: 12,
    },
    logoutText: {
        color: Colors.gray[600],
        fontSize: 16,
        fontWeight: '500',
    },
    withdrawalButton: {
        padding: 12,
        alignItems: 'center',
    },
    withdrawalText: {
        color: Colors.gray[400],
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.white,
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeText: {
        fontSize: 16,
        color: Colors.primary,
    },
    modalContent: {
        padding: 20,
    },
    termsText: {
        fontSize: 16,
        lineHeight: 24,
        color: Colors.text.primary,
    },
});
