import React, { useEffect, useState, useCallback } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { supabase } from '../utils/supabase/client';
import Toast from 'react-native-toast-message';
import analytics from '@react-native-firebase/analytics';

import { AuthModal } from '../components/AuthModal';
import { getGuestRecipes, getIsFirstLaunch, setIsFirstLaunch } from '../utils/storage';

import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { AppOpenAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// App Open Ad Unit IDs (Use TestIds for now)
const adUnitId = __DEV__
  ? TestIds.APP_OPEN
  : Platform.select({
    ios: 'ca-app-pub-8570807371650587/6266044224', // Real iOS App Open ID
    android: 'ca-app-pub-8570807371650587/7531024431', // Real Android App Open ID
  }) || TestIds.APP_OPEN;

const appOpenAd = AppOpenAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

export default function RootLayout() {
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const [loaded, error] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    async function prepare() {
      try {
        // 1. Check First Launch
        const isFirstLaunch = await getIsFirstLaunch();

        if (isFirstLaunch) {
          // First Launch Logic: No Ad, Request ATT (iOS)
          if (Platform.OS === 'ios') {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay for splash
            const { status } = await requestTrackingPermissionsAsync();
            console.log('ATT Permission Status:', status);
          }
          await setIsFirstLaunch(false);
          setAppIsReady(true);
        } else {
          // Subsequent Launch Logic: Load App Open Ad
          appOpenAd.load();

          // Wait for ad to load or timeout (timeout 1.0s)
          const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1000, 'TIMEOUT'));

          const adPromise = new Promise(resolve => {
            const unsubscribeLoaded = appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
              resolve('LOADED');
            });
            const unsubscribeError = appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
              console.log('App Open Ad Error:', error);
              resolve('ERROR');
            });
          });

          const result = await Promise.race([adPromise, timeoutPromise]);

          if (result === 'LOADED') {
            appOpenAd.show();
            // Wait for ad to be closed before hiding splash
            await new Promise(resolve => {
              const unsubscribeClosed = appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
                resolve(true);
              });
            });
          }

          setAppIsReady(true);
        }
      } catch (e) {
        console.warn(e);
        setAppIsReady(true);
      }
    }

    if (loaded) {
      prepare();
    }
  }, [loaded]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // Handle Deep Links
  const handleDeepLink = async (url: string) => {
    try {
      if (url.includes('access_token') || url.includes('refresh_token')) {
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const paramsString = url.substring(hashIndex + 1);
          const params = new URLSearchParams(paramsString);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            return;
          }
        }
      }
      const { queryParams } = Linking.parse(url);
      const code = queryParams?.code;
      if (code && typeof code === 'string') {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          Toast.show({ type: 'success', text1: '로그인 성공', text2: '잠시 후 데이터 연동이 시작됩니다.' });
          setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const recipes = await getGuestRecipes();
              if (recipes.length > 0) setAuthModalVisible(true);
            }
          }, 1000);
        }
      }
    } catch (e) {
      console.error('Deep link handling error:', e);
    }
  };

  useEffect(() => {
    // Check for valid session on startup to prevent "Invalid Refresh Token" crash
    supabase.auth.getSession().then(({ error }) => {
      if (error && (error.message.includes('Refresh Token') || error.message.includes('refresh_token'))) {
        console.log('Detected invalid refresh token, signing out...');
        supabase.auth.signOut();
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const guestRecipes = await getGuestRecipes();
        if (guestRecipes.length > 0) setAuthModalVisible(true);
        if (event === 'SIGNED_IN') {
          await analytics().logLogin({ method: session.user.app_metadata.provider || 'email' });
        }
      } else if (event === 'SIGNED_OUT') {
        // Ensure UI updates if needed
      }
    });
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });
    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => {
      subscription.remove();
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={() => setAuthModalVisible(false)}
        initialViewMode="sync"
      />
      <Toast position='bottom' bottomOffset={90} />
      <StatusBar style="dark" backgroundColor="#FDD360" />
    </View>
  );
}


