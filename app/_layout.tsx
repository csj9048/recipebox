import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { supabase } from '../utils/supabase/client';
import Toast from 'react-native-toast-message';
import analytics from '@react-native-firebase/analytics';

import { AuthModal } from '../components/AuthModal';
import { getGuestRecipes } from '../utils/storage';
import { useState } from 'react';

export default function RootLayout() {
  const [authModalVisible, setAuthModalVisible] = useState(false);

  useEffect(() => {
    // Global Auth Listener for Sync
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Trigger sync if we just signed in OR if we are initialized with a session
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const guestRecipes = await getGuestRecipes();
        if (guestRecipes.length > 0) {
          console.log('RootLayout: Found guest recipes, opening sync modal...');
          setAuthModalVisible(true);
        }

        // Log login event
        if (event === 'SIGNED_IN') {
          await analytics().logLogin({
            method: session.user.app_metadata.provider || 'email'
          });
        }
      }
    });

    // Handle deep link when app is cold-launched
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle deep link while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Incoming URL:', url);
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    try {
      // 1. Handle Implicit Flow (hash fragment)
      if (url.includes('access_token') || url.includes('refresh_token')) {
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const paramsString = url.substring(hashIndex + 1);
          const params = new URLSearchParams(paramsString);

          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            console.log('Session set from deep link (Implicit Flow)');
            return;
          }
        }
      }

      // 2. Handle PKCE Flow (query params)
      const { queryParams } = Linking.parse(url);
      const code = queryParams?.code;

      if (code && typeof code === 'string') {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          // ... error handling
        } else {
          console.log('Session exchanged from deep link code (PKCE Flow)');
          Toast.show({
            type: 'success',
            text1: '로그인 성공',
            text2: '잠시 후 데이터 연동이 시작됩니다.',
          });
          // Explicitly trigger check in case onAuthStateChange is slow
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

  return (
    <>
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
    </>
  );
}
