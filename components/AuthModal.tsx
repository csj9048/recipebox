import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, Linking, AppState, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '../constants/Colors';
import { supabase } from '../utils/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Image } from 'expo-image';
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
    const safeT = (key: string, options?: any) => i18next.t(key, options) as string;

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

    useEffect(() => {
        if (visible) {
            initializeModal();
        }
    }, [visible]);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: '189700867975-0b4furd1tetrr0l4dh8sj80m2jgag4um.apps.googleusercontent.com',
            // iOS Client ID will need to be updated after downloading fresh GoogleService-Info.plist
            iosClientId: '189700867975-rie9hhoe8t4ib19bte0u46v6k50da66m.apps.googleusercontent.com',
            offlineAccess: true,
        });
    }, []);

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
                // if (loading) return; // Fix: Allow listener to trigger checkGuestRecipes even if loading
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
                        prompt: 'login', // Force login screen to allow account switching
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

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await GoogleSignin.hasPlayServices();

            // Generate a random nonce
            const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            // Re-configure with the nonce
            GoogleSignin.configure({
                webClientId: '189700867975-0b4furd1tetrr0l4dh8sj80m2jgag4um.apps.googleusercontent.com',
                iosClientId: '189700867975-rie9hhoe8t4ib19bte0u46v6k50da66m.apps.googleusercontent.com',
                offlineAccess: true,
                nonce: nonce, // Pass the raw nonce to Google
            } as any);

            // GIDConfiguration doesn't support nonce, but we patched the native module to accept it in signIn options
            const response = await GoogleSignin.signIn({ nonce } as any);

            // Check both potential locations for idToken (v13+ uses data.idToken)
            // Check both potential locations for idToken (v13+ uses data.idToken)
            const idToken = response.data?.idToken || response.idToken;

            if (idToken) {
                try {
                    // Decode JWT (header.payload.signature)
                    const parts = idToken.split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                        console.log('Decoded ID Token Nonce:', payload.nonce);
                        console.log('Expected Nonce:', nonce);
                        if (payload.nonce !== nonce) {
                            console.error('CRITICAL: Nonce mismatch! Google ignored our nonce.');
                        }
                    }
                } catch (e) {
                    console.error('Failed to decode ID token:', e);
                }

                const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: idToken,
                    nonce: nonce, // Pass the raw nonce to Supabase for verification
                });
                console.log(error, data);

                if (error) throw error;
                // onSuccess will be triggered by onAuthStateChange in RootLayout
                onSuccess?.();
            } else {
                console.error('Google Sign-In Response:', JSON.stringify(response, null, 2));
                throw new Error('no ID token present!');
            }
        } catch (error: any) {
            console.error('Google login error:', error);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // user cancelled the login flow
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // operation (e.g. sign in) is in progress already
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                // play services not available or outdated
                Alert.alert(safeT('common.error'), 'Google Play Services not available.');
            } else {
                // some other error happened
                Alert.alert(safeT('auth_modal.alert.error_title'), 'Google Login Failed');
            }
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
                                    style={styles.switchButton}
                                    onPress={() => setIsLogin(!isLogin)}
                                >
                                    <Text style={styles.switchButtonText}>
                                        {isLogin ? safeT('auth_modal.button.switch_to_signup') : safeT('auth_modal.button.switch_to_login')}
                                    </Text>
                                </TouchableOpacity>

                                {/* Divider */}
                                <View style={styles.dividerContainer}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.dividerText}>OR</Text>
                                    <View style={styles.dividerLine} />
                                </View>

                                {/* Social Login Buttons Row */}
                                <View style={styles.socialContainer}>
                                    {/* Kakao */}
                                    <TouchableOpacity
                                        style={[styles.socialButtonCircle, { backgroundColor: '#FEE500' }]}
                                        onPress={handleKakaoLogin}
                                        disabled={loading}
                                    >
                                        <Ionicons name="chatbubble" size={24} color="#000000" />
                                    </TouchableOpacity>

                                    {/* Apple */}
                                    {appleAuthAvailable && (
                                        <TouchableOpacity
                                            style={[styles.socialButtonCircle, { backgroundColor: '#000000' }]}
                                            onPress={onAppleLogin}
                                            disabled={loading}
                                        >
                                            <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
                                        </TouchableOpacity>
                                    )}

                                    {/* Google */}
                                    <TouchableOpacity
                                        style={[styles.socialButtonCircle, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDDDDD' }]}
                                        onPress={handleGoogleLogin}
                                        disabled={loading}
                                    >
                                        <Image
                                            source={require('../assets/google-logo.png')}
                                            style={{ width: 24, height: 24 }}
                                            contentFit="contain"
                                        />
                                    </TouchableOpacity>
                                </View>

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
    socialButtonCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow for elevation
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
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
    /* Divider Styles */
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.gray[200],
    },
    dividerText: {
        marginHorizontal: 12,
        color: Colors.gray[400],
        fontSize: 12,
        fontWeight: '500',
    },
    /* Social Container */
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 10,
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
