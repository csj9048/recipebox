import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../utils/supabase/client';
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  useEffect(() => {
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
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    try {
      // Supabase OAuth callback URL format: recipebox://#access_token=...&refresh_token=...
      // We need to parse hash parameters
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
            console.log('Session set from deep link');
          }
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
      <Toast position='bottom' bottomOffset={90} />
    </>
  );
}
