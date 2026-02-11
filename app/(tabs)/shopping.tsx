import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, RefreshControl, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase/client';
import Toast from 'react-native-toast-message';
import analytics from '@react-native-firebase/analytics';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';
import {
  getGuestShoppingList,
  addGuestShoppingItem,
  toggleGuestShoppingItem,
  deleteGuestShoppingItem,
  clearGuestShoppingList
} from '../../utils/storage';

interface ShoppingItem {
  id: string;
  text: string;
  is_completed: boolean;
}

export default function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is in Korea
  const isKorea = Localization.getLocales()[0]?.regionCode === 'KR';

  // Fetch items when screen is focused or refreshed
  const fetchItems = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Guest mode
        const guestItems = await getGuestShoppingList();
        // Sort by created_at desc (newest first)
        const sorted = guestItems.sort((a, b) => b.created_at - a.created_at);
        setItems(sorted);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching shopping items:', error);
      Toast.show({ type: 'error', text1: t('shopping.message.load_failed') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Guest mode
        await addGuestShoppingItem(newItemText.trim());
      } else {
        const { error } = await supabase
          .from('shopping_items')
          .insert({
            user_id: user.id,
            text: newItemText.trim(),
          });

        if (error) throw error;
      }

      setNewItemText('');
      fetchItems();
      await analytics().logEvent('shopping_added', {
        item: newItemText.trim(),
        method: 'manual'
      });
    } catch (error) {
      console.error('Error adding item:', error);
      Toast.show({ type: 'error', text1: t('shopping.message.add_failed') });
    }
  };

  const handleToggleComplete = async (item: ShoppingItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Guest mode
        await toggleGuestShoppingItem(item.id);
      } else {
        const { error } = await supabase
          .from('shopping_items')
          .update({ is_completed: !item.is_completed })
          .eq('id', item.id);

        if (error) throw error;
      }
      fetchItems();
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    Alert.alert(t('shopping.alert.delete_title'), t('shopping.alert.delete_message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('shopping.alert.delete_confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
              // Guest mode
              await deleteGuestShoppingItem(id);
            } else {
              const { error } = await supabase.from('shopping_items').delete().eq('id', id);
              if (error) throw error;
            }
            fetchItems();
          } catch (error) {
            console.error('Error deleting item:', error);
          }
        },
      },
    ]);
  };

  const handleReset = () => {
    Alert.alert(
      t('shopping.alert.reset_title'),
      t('shopping.alert.reset_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('shopping.alert.reset_confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();

              if (!user) {
                // Guest mode
                await clearGuestShoppingList();
              } else {
                const { error } = await supabase
                  .from('shopping_items')
                  .delete()
                  .eq('user_id', user.id);

                if (error) throw error;
              }
              fetchItems();
              Toast.show({ type: 'success', text1: t('shopping.message.reset_success') });
            } catch (error) {
              console.error('Error resetting list:', error);
              Toast.show({ type: 'error', text1: t('shopping.message.reset_failed') });
            }
          }
        }
      ]
    );
  };

  const handleCoupangSearch = (text: string) => {
    // Open Coupang search.
    // In the future, this can be replaced with a Partners link.
    const url = `https://m.coupang.com/nm/search?q=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  const sortedItems = [...items].sort((a, b) => {
    // Completed items go to bottom
    if (a.is_completed === b.is_completed) return 0;
    return a.is_completed ? 1 : -1;
  });

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <TouchableOpacity
      style={[styles.item, item.is_completed && styles.itemCompleted]}
      onPress={() => handleToggleComplete(item)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
        <Ionicons
          name={item.is_completed ? 'checkbox' : 'square-outline'}
          size={24}
          color={item.is_completed ? Colors.gray[400] : Colors.primary}
          style={{ marginRight: 12 }}
        />
        <Text style={[styles.itemText, item.is_completed && styles.itemTextCompleted]} numberOfLines={1}>
          {item.text}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {/* Coupang Search Button (KR only) */}
        {isKorea && !item.is_completed && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleCoupangSearch(item.text)}
          >
            <Ionicons name="cart-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleDeleteItem(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={{ width: 40, height: 40 }} />
        <Text style={styles.headerTitle}>{t('shopping.title')}</Text>
        <TouchableOpacity onPress={handleReset} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="trash-bin-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('shopping.placeholder')}
          value={newItemText}
          onChangeText={setNewItemText}
          onSubmitEditing={handleAddItem}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, isKorea && { paddingBottom: 60 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyText}>{t('shopping.empty.text')}</Text>
            <Text style={styles.emptySubText}>{t('shopping.empty.subtext')}</Text>
          </View>
        }
      />

      {/* Coupang Partners Disclaimer (KR only) */}
      {isKorea && (
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>
            장바구니 링크를 통해 구매하시면 쿠팡 파트너스 활동을 통해{'\n'}서비스 운영에 도움이 되는 소정의 수수료를 제공받습니다.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  // ... existing styles ...
  disclaimerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerText: {
    fontSize: 10,
    color: Colors.gray[500],
    textAlign: 'center',
    lineHeight: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary },
  // resetButton removed
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  itemCompleted: {
    backgroundColor: Colors.gray[50],
    borderColor: 'transparent',
  },
  itemText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  itemTextCompleted: {
    color: Colors.gray[400],
    textDecorationLine: 'line-through',
  },
  iconButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 12
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.gray[500]
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.gray[400],
    textAlign: 'center',
    lineHeight: 20
  }
});
