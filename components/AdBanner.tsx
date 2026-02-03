import React from 'react';
import { View, Platform, ViewStyle } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

type AdBannerProps = {
    style?: ViewStyle;
};

// Use TestIds.BANNER for development to avoid policy violations
// Real Ad Unit IDs should be used in production
const adUnitId = __DEV__
    ? TestIds.BANNER
    : Platform.select({
        ios: 'ca-app-pub-8570807371650587/4006283556', // Replace with your iOS Ad Unit ID
        android: 'ca-app-pub-8570807371650587/3420921861', // Real Android Ad Unit ID
    }) || TestIds.BANNER;

export function AdBanner({ style }: AdBannerProps) {
    return (
        <View style={style}>
            <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
                }}
            />
        </View>
    );
}
