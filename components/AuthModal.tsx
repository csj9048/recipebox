import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { Colors } from '../constants/Colors';
import { supabase } from '../utils/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

interface AuthModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Reset form when modal opens
    React.useEffect(() => {
        if (visible) {
            setEmail('');
            setPassword('');
            setIsLogin(true);
        }
    }, [visible]);

    const handleSubmit = async () => {
        if (!email || !password) {
            Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
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
                Toast.show({ type: 'success', text1: '로그인되었습니다.' });
                onSuccess();
                onClose();
            } else {
                // SignUp
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;

                // Auto Login Attempt
                if (data.session) {
                    // Session exists (auto confirmed or no email verification needed)
                    Toast.show({
                        type: 'success',
                        text1: '가입 완료!',
                        text2: '레시피들이 이 계정에 저장되었습니다',
                        visibilityTime: 4000,
                    });
                    onSuccess();
                    onClose();
                } else if (data.user) {
                    // User created but no session (maybe email confirmation needed)
                    // Try to sign in just in case it works (sometimes helps if session wasn't returned but login works)
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });

                    if (!signInError && signInData.session) {
                        Toast.show({
                            type: 'success',
                            text1: '가입 완료!',
                            text2: '레시피들이 이 계정에 저장되었습니다',
                            visibilityTime: 4000,
                        });
                        onSuccess();
                        onClose();
                    } else {
                        // Really need manual verification
                        Alert.alert('회원가입 성공', '이메일로 인증 메일을 보냈습니다. 확인 후 로그인해주세요.');
                        setIsLogin(true); // Switch to login view
                    }
                }
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert('오류', error.message || '요청 처리에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleKakaoLogin = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'kakao',
                options: {
                    redirectTo: 'recipebox://', // App scheme
                    queryParams: {
                        scope: 'profile_nickname,profile_image', // 쉼표로 구분, 엄격하게 제한
                    },
                },
            });

            if (error) throw error;

            if (data?.url) {
                await Linking.openURL(data.url);
            }

        } catch (error: any) {
            console.error(error);
            Alert.alert('Kakao Login Error', error.message);
        } finally {
            setLoading(false);
            // We don't close modal immediately because the user is in the browser.
            // The app needs to handle the deep link to close this and refresh.
        }
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
                    <View style={styles.header}>
                        <Text style={styles.title}>{isLogin ? '로그인' : '회원가입'}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={Colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoTextContainer}>
                        {isLogin ? (
                            <>
                                <Text style={styles.infoText}>
                                    기존 계정으로 로그인하면{'\n'}
                                    계정에 저장된 레시피가 표시됩니다.
                                </Text>
                                <Text style={styles.infoTextSmall}>
                                    이 기기에서 만든 레시피는 로그아웃하면 다시 볼 수 있어요
                                </Text>
                            </>
                        ) : (
                            <Text style={styles.infoText}>
                                가입하면 이 기기에서 만든 레시피가{'\n'}
                                계정에 안전하게 저장됩니다.
                            </Text>
                        )}
                    </View>

                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder="이메일"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholderTextColor={Colors.gray[400]}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="비밀번호"
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
                                    {isLogin ? '로그인' : '회원가입'}
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
                                {isLogin ? '카카오 로그인' : '카카오로 가입하기'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.switchButton}
                            onPress={() => setIsLogin(!isLogin)}
                        >
                            <Text style={styles.switchButtonText}>
                                {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                            </Text>
                        </TouchableOpacity>


                    </View>
                </View>
            </View>
        </Modal>
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
        borderRadius: 12,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
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
        gap: 16,
    },
    input: {
        backgroundColor: Colors.gray[100],
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        color: Colors.text.primary,
    },
    submitButton: {
        backgroundColor: Colors.primary,
        borderRadius: 8,
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
        borderRadius: 8,
        padding: 16,
        marginBottom: 8,
        gap: 8,
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    switchButton: {
        alignItems: 'center',
        padding: 8,
    },
    switchButtonText: {
        color: Colors.gray[500],
    },
    infoTextContainer: {
        marginBottom: 16,
    },
    infoText: {
        fontSize: 14,
        color: Colors.gray[600],
        textAlign: 'left',
        lineHeight: 20,
    },
    infoTextSmall: {
        fontSize: 12,
        color: Colors.gray[400],
        textAlign: 'left',
        marginTop: 4,
    },
});
