import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePathname, useRouter, Slot } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdBanner } from '../../components/AdBanner';

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabs = [
    { name: '레시피', route: '/', icon: 'restaurant' },
    { name: '식단', route: '/meal', icon: 'calendar' },
    { name: '', route: '/add', icon: 'add-circle' },
    { name: '장보기', route: '/shopping', icon: 'cart' },
    { name: '설정', route: '/settings', icon: 'settings' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      <AdBanner />
      <View style={[styles.tabBar, { paddingBottom: insets.bottom, height: 70 + insets.bottom }]}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.route;
          return (
            <TouchableOpacity
              key={tab.route}
              style={styles.tab}
              onPress={() => router.push(tab.route as any)}
            >
              <Ionicons
                name={tab.icon as any}
                size={tab.route === '/add' ? 50 : 24}
                color={tab.route === '/add' ? Colors.primary : (isActive ? Colors.primary : Colors.gray[400])}
              />
              {tab.name ? (
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                  ]}
                >
                  {tab.name}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.white,
    height: 70,
    paddingTop: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 4,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
});

