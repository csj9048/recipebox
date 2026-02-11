import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, Linking, AppState, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '../constants/Colors';
import { supabase } from '../utils/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getGuestRecipes, clearGuestRecipes } from '../utils/storage';
import { convertImageToBase64, uploadImage } from '../utils/image';
import { RecipeInsert } from '../types/recipe';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import i18next from '../locales';

interface AuthModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialViewMode?: 'auth' | 'sync';
}

WebBrowser.maybeCompleteAuthSession();

export function AuthModal({ visible, onClose, onSuccess, initialViewMode = 'auth' }: AuthModalProps) {
    const { t } = useTranslation();
    // Helper to use global i18n for Modal content to avoid context loss issues
    const safeT = (key: string, options?: any) => i18next.t(key, options);

    const [viewMode, setViewMode] = useState<'auth' | 'sync'>(initialViewMode);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [guestRecipeCount, setGuestRecipeCount] = useState(0);
    const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

    useEffect(() => {
        AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }, []);

    // Reset form when modal opens
    React.useEffect(() => {
        if (visible) {
            initializeModal();
        }
    }, [visible]);

    const initializeModal = async () => {
        setEmail('');
        setPassword('');
        setLoading(false);

        // Check current session immediately
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            console.log('AuthModal: Already logged in, checking guest recipes...');
            await checkGuestRecipes(session.user.id);
        } else {
            setIsLogin(true);
            setViewMode('auth');
        }
    };

    // Listen for auth state changes (handles both Email and OAuth login success)
    React.useEffect(() => {
        if (!visible) return;

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                console.log('AuthModal: User signed in (event), checking guest recipes...');
                // Avoid double processing if already handled manually
                if (loading) return;
                await checkGuestRecipes(session.user.id);
            }
        });

        // AppState listener to check session when returning from browser (Kakao Login)
        // This is a backup in case the global listener in Settings doesn't trigger a re-mount update fast enough
        const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
                console.log('AuthModal: App resumed, polling session...');
                let attempts = 0;
                const pollSession = setInterval(async () => {
                    attempts++;
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        clearInterval(pollSession);
                        // Only sync if we are still visible
                        await checkGuestRecipes(session.user.id);
                    }
                    if (attempts > 3) clearInterval(pollSession);
                }, 1000);
            }
        });

        return () => {
            console.log('AuthModal: Cleaning up listeners');
            authListener.subscription.unsubscribe();
            appStateSubscription.remove();
        };
    }, [visible]);

    const checkGuestRecipes = async (userId: string) => {
        try {
            const recipes = await getGuestRecipes();
            if (recipes.length > 0) {
                console.log(`Found ${recipes.length} guest recipes. Switching to sync view.`);
                setGuestRecipeCount(recipes.length);
                setViewMode('sync');
            } else {
                console.log('No guest recipes. Closing in 500ms...');
                // Add a small delay to ensure WebBrowser/Modal transitions settle
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 500);
            }
        } catch (e) {
            console.error('Failed to check guest recipes', e);
            onSuccess();
            onClose();
        }
    };

    const handleSubmit = async () => {
        if (!email || !password) {
            Alert.alert(safeT('common.notice'), safeT('auth_modal.alert.input_required'));
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // Listener will handle next steps
            } else {
                // SignUp
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;

                if (data.session) {
                    Toast.show({
                        type: 'success',
                        text1: safeT('auth_modal.alert.signup_success'),
                        text2: safeT('auth_modal.alert.welcome'),
                        visibilityTime: 4000,
                    });
                    // Listener will handle next steps
                } else if (data.user) {
                    // Try auto-login just in case
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });
                    if (!signInError && signInData.session) {
                        Toast.show({
                            type: 'success',
                            text1: safeT('auth_modal.alert.signup_success'),
                            text2: safeT('auth_modal.alert.welcome'),
                            visibilityTime: 4000,
                        });
                        // Listener will handle next steps
                    } else {
                        Alert.alert(safeT('auth_modal.title.signup'), safeT('auth_modal.alert.signup_email_sent'));
                        setIsLogin(true);
                    }
                }
            }
        } catch (error: any) {
            let msg = error.message || safeT('auth_modal.alert.error_request');
            if (msg.includes('Invalid login credentials')) {
                msg = safeT('auth_modal.alert.login_failed_invalid');
            }
            Alert.alert(safeT('common.error'), msg);
        } finally {
            setLoading(false);
        }
    };

    const onAppleLogin = async () => {
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            console.log('Apple Credential:', credential);

            if (credential.identityToken) {
                let extraData = {};
                if (credential.fullName) {
                    const nameParts = [];
                    if (credential.fullName.familyName) nameParts.push(credential.fullName.familyName);
                    if (credential.fullName.givenName) nameParts.push(credential.fullName.givenName);
                    const fullName = nameParts.join(' ');
                    if (fullName) {
                        extraData = {
                            data: {
                                full_name: fullName,
                                name: fullName, // Supabase often uses 'name' as well
                            }
                        };
                    }
                }

                const { error } = await supabase.auth.signInWithIdToken({
                    provider: 'apple',
                    token: credential.identityToken,
                    options: extraData // Attach user metadata handles the update on sign-in
                });

                if (error) {
                    console.error('Supabase Apple Sign-In Error:', error);
                    Alert.alert(safeT('auth_modal.alert.error_title'), error.message);
                } else {
                    // onSuccess will be triggered by onAuthStateChange in RootLayout
                    onSuccess?.();
                }
            } else {
                throw new Error('No identityToken.');
            }
        } catch (e: any) {
            if (e.code === 'ERR_REQUEST_CANCELED') {
                // user canceled
            } else {
                console.error('Apple Login Error:', e);
                Alert.alert(safeT('auth_modal.alert.error_title'), safeT('auth_modal.alert.apple_login_error'));
            }
        }
    };

    const handleKakaoLogin = async () => {
        setLoading(true);
        try {
            // 1. Get the OAuth URL from Supabase
            // skipBrowserRedirect is crucial so Supabase doesn't try to open headers itself
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'kakao',
                options: {
                    redirectTo: 'recipebox://',
                    skipBrowserRedirect: true,
                    queryParams: {
                        scope: 'profile_nickname,profile_image',
                    },
                },
            });

            if (error) throw error;

            if (data?.url) {
                // 2. Open the URL in an In-App Browser (ASWebAuthenticationSession)
                // The browser will automatically close when it detects a redirect to 'recipebox://'
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    'recipebox://'
                );

                // 3. Handle the result
                if (result.type === 'success' && result.url) {
                    console.log('WebBrowser success:', result.url);

                    // Manually parse the URL fragment to extract tokens
                    try {
                        // iOS might return the URL with #access_token=...
                        const urlObj = new URL(result.url);
                        const params = new URLSearchParams(urlObj.hash.replace('#', ''));
                        const accessToken = params.get('access_token');
                        const refreshToken = params.get('refresh_token');

                        if (accessToken && refreshToken) {
                            const { error } = await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            });
                            if (error) throw error;
                            console.log('Session manually set from WebBrowser result');
                        }
                    } catch (e) {
                        console.error('Failed to parse session from URL:', e);
                    }
                } else if (result.type === 'cancel' || result.type === 'dismiss') {
                    console.log('User cancelled login');
                }
            }
        } catch (error: any) {
            console.error('Kakao login error:', error);
            Alert.alert(safeT('auth_modal.alert.error_title'), error.message || safeT('auth_modal.alert.kakao_login_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setLoading(true);
        try {
            const guestRecipes = await getGuestRecipes();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                Alert.alert(safeT('common.error'), safeT('auth_modal.alert.no_login_info'));
                return;
            }

            let successCount = 0;
            for (const recipe of guestRecipes) {
                try {
                    // 1. Upload Thumbnail
                    let thumbnailUrl = null;
                    if (recipe.thumbnail_url && recipe.thumbnail_url.startsWith('file://')) {
                        try {
                            const base64 = await convertImageToBase64(recipe.thumbnail_url);
                            thumbnailUrl = await uploadImage(base64, `sync_thumb_${Date.now()}.jpg`, 'image/jpeg');
                        } catch (e) {
                            console.error('Thumbnail upload failed', e);
                        }
                    } else if (recipe.thumbnail_url) {
                        thumbnailUrl = recipe.thumbnail_url;
                    }

                    // 2. Upload Body Images
                    let imageUrlString = null;
                    if (recipe.image_url) {
                        try {
                            let localUris: string[] = [];
                            try {
                                localUris = JSON.parse(recipe.image_url);
                            } catch {
                                localUris = [recipe.image_url];
                            }

                            if (Array.isArray(localUris)) {
                                const hostedUrls = [];
                                for (let i = 0; i < localUris.length; i++) {
                                    const uri = localUris[i];
                                    if (uri.startsWith('file://')) {
                                        const base64 = await convertImageToBase64(uri);
                                        const url = await uploadImage(base64, `sync_img_${Date.now()}_${i}.jpg`, 'image/jpeg');
                                        hostedUrls.push(url);
                                    } else {
                                        hostedUrls.push(uri);
                                    }
                                }
                                imageUrlString = JSON.stringify(hostedUrls);
                            }
                        } catch (e) {
                            console.error('Body image upload failed', e);
                        }
                    }

                    // 3. Insert to Supabase
                    const newRecipe: RecipeInsert = {
                        user_id: user.id,
                        title: recipe.title || '제목 없음',
                        body_text: recipe.body_text || '',
                        memo: recipe.memo || '',
                        tags: recipe.tags || [],
                        thumbnail_url: thumbnailUrl ?? undefined,
                        image_url: imageUrlString ?? undefined,
                    };

                    const { error } = await supabase.from('recipes').insert(newRecipe);
                    if (error) throw error;
                    successCount++;

                } catch (e) {
                    console.error('Failed to sync recipe', e);
                }
            }

            await clearGuestRecipes();
            Toast.show({
                type: 'success',
                text1: safeT('auth_modal.sync.success'),
                text2: safeT('auth_modal.sync.success_detail', { count: successCount }),
            });
            onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            Alert.alert(safeT('common.error'), safeT('auth_modal.alert.sync_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDiscard = () => {
        Alert.alert(
            safeT('auth_modal.sync.alert_title'),
            safeT('auth_modal.sync.alert_message'),
            [
                { text: safeT('common.cancel'), style: 'cancel' },
                {
                    text: safeT('auth_modal.sync.alert_confirm'),
                    style: 'destructive',
                    onPress: async () => {
                        await clearGuestRecipes();
                        onSuccess();
                        onClose();
                    }
                }
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {viewMode === 'auth' ? (isLogin ? safeT('auth_modal.title.login') : safeT('auth_modal.title.signup')) : safeT('auth_modal.title.sync')}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={Colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Content Body */}
                    {viewMode === 'auth' ? (
                        <>
                            <View style={styles.infoTextContainer}>
                                {isLogin ? (
                                    <>
                                        <Text style={styles.infoText}>
                                            {safeT('auth_modal.info.login_desc')}
                                        </Text>
                                        <Text style={styles.infoTextSmall}>
                                            {safeT('auth_modal.info.login_sub')}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={styles.infoText}>
                                        {safeT('auth_modal.info.signup_desc')}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.form}>
                                <TextInput
                                    style={styles.input}
                                    placeholder={safeT('auth_modal.placeholder.email')}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    placeholderTextColor={Colors.gray[400]}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder={safeT('auth_modal.placeholder.password')}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    placeholderTextColor={Colors.gray[400]}
                                />

                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={Colors.white} />
                                    ) : (
                                        <Text style={styles.submitButtonText}>
                                            {isLogin ? safeT('auth_modal.button.login') : safeT('auth_modal.button.signup')}
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.socialButton, { backgroundColor: '#FEE500' }]}
                                    onPress={handleKakaoLogin}
                                    disabled={loading}
                                >
                                    <Ionicons name="chatbubble" size={20} color="#000000" />
                                    <Text style={[styles.socialButtonText, { color: '#000000' }]}>
                                        {isLogin ? safeT('auth_modal.button.kakao_login') : safeT('auth_modal.button.kakao_signup')}
                                    </Text>
                                </TouchableOpacity>

                                {appleAuthAvailable && (
                                    <AppleAuthentication.AppleAuthenticationButton
                                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                        cornerRadius={12}
                                        style={styles.appleButton}
                                        onPress={onAppleLogin}
                                    />
                                )}

                                <TouchableOpacity
                                    style={styles.switchButton}
                                    onPress={() => setIsLogin(!isLogin)}
                                >
                                    <Text style={styles.switchButtonText}>
                                        {isLogin ? safeT('auth_modal.button.switch_to_signup') : safeT('auth_modal.button.switch_to_login')}
                                    </Text>
                                </TouchableOpacity>

                                {isLogin && (
                                    <TouchableOpacity
                                        style={styles.forgotPasswordButton}
                                        onPress={() => {
                                            if (!email) {
                                                Alert.alert(safeT('common.notice'), safeT('auth_modal.alert.input_email'));
                                                return;
                                            }
                                            Alert.alert(safeT('common.notice'), safeT('auth_modal.alert.feature_wip'));
                                        }}
                                    >
                                        <Text style={styles.forgotPasswordText}>{safeT('auth_modal.button.forgot_password')}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    ) : (
                        /* SYNC VIEW */
                        <View style={styles.syncContainer}>
                            <View style={styles.syncIconContainer}>
                                <Ionicons name="cloud-upload" size={48} color={Colors.primary} />
                            </View>
                            <Text style={styles.syncTitle}>
                                {safeT('auth_modal.sync.title', { count: guestRecipeCount })}
                            </Text>
                            <Text style={styles.syncDescription}>
                                {safeT('auth_modal.sync.description')}
                            </Text>

                            <View style={styles.syncActions}>
                                <TouchableOpacity
                                    style={styles.syncButtonPrimary}
                                    onPress={handleSync}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={Colors.white} />
                                    ) : (
                                        <Text style={styles.syncButtonTextPrimary}>{safeT('auth_modal.sync.confirm')}</Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.syncButtonSecondary}
                                    onPress={handleDiscard}
                                    disabled={loading}
                                >
                                    <Text style={styles.syncButtonTextSecondary}>{safeT('auth_modal.sync.discard')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal >
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 24,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text.primary,
    },
    closeButton: {
        padding: 4,
    },
    form: {
        gap: 12,
    },
    input: {
        backgroundColor: Colors.gray[100],
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: Colors.text.primary,
    },
    submitButton: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        padding: 16,
        marginBottom: 4,
        gap: 8,
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    appleButton: {
        width: '100%',
        height: 50,
        marginBottom: 8,
    },
    switchButton: {
        alignItems: 'center',
        padding: 12,
    },
    switchButtonText: {
        color: Colors.gray[500],
        fontSize: 14,
    },
    infoTextContainer: {
        marginBottom: 20,
    },
    infoText: {
        fontSize: 15,
        color: Colors.gray[800],
        textAlign: 'left',
        lineHeight: 22,
    },
    infoTextSmall: {
        fontSize: 13,
        color: Colors.gray[500],
        textAlign: 'left',
        marginTop: 6,
    },
    forgotPasswordButton: {
        alignItems: 'center',
        padding: 4,
    },
    forgotPasswordText: {
        color: Colors.gray[400],
        fontSize: 13,
        textDecorationLine: 'underline',
    },
    /* Sync View Styles */
    syncContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    syncIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${Colors.primary}15`, // 15% opacity
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    syncTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text.primary,
        marginBottom: 8,
        textAlign: 'center',
    },
    syncDescription: {
        fontSize: 15,
        color: Colors.gray[600],
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    syncActions: {
        width: '100%',
        gap: 12,
    },
    syncButtonPrimary: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    syncButtonTextPrimary: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    syncButtonSecondary: {
        backgroundColor: Colors.gray[100],
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    syncButtonTextSecondary: {
        color: Colors.gray[600],
        fontSize: 16,
        fontWeight: '600',
    },
});
