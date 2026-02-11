import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function MyPageScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t('my_page.title')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  text: {
    fontSize: 16,
    color: '#6B7280',
  },
});

