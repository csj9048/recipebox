import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, RefreshControl, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase/client';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from 'expo-router';

interface ShoppingItem {
  id: string;
  text: string;
  is_completed: boolean;
}

export default function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch items when screen is focused or refreshed
  const fetchItems = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
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
      Toast.show({ type: 'error', text1: '리스트를 불러오지 못했습니다' });
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
      if (!user) return;

      const { error } = await supabase
        .from('shopping_items')
        .insert({
          user_id: user.id,
          text: newItemText.trim(),
        });

      if (error) throw error;

      setNewItemText('');
      fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
      Toast.show({ type: 'error', text1: '추가 실패' });
    }
  };

  const handleToggleComplete = async (item: ShoppingItem) => {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({ is_completed: !item.is_completed })
        .eq('id', item.id);

      if (error) throw error;
      fetchItems();
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    Alert.alert('삭제', '이 항목을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('shopping_items').delete().eq('id', id);
            if (error) throw error;
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
      '장보기 목록 초기화',
      '전체 목록을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전체 삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              const { error } = await supabase
                .from('shopping_items')
                .delete()
                .eq('user_id', user.id);

              if (error) throw error;
              fetchItems();
              Toast.show({ type: 'success', text1: '목록이 초기화되었습니다' });
            } catch (error) {
              console.error('Error resetting list:', error);
              Toast.show({ type: 'error', text1: '초기화 실패' });
            }
          }
        }
      ]
    );
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
        {/* Delete Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleDeleteItem(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.gray[400]} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={{ width: 40, height: 40 }} />
        <Text style={styles.headerTitle}>장보기</Text>
        <TouchableOpacity onPress={handleReset} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="trash-bin-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="살 것을 입력하세요 (예: 우유 2팩)"
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
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyText}>장보기 목록이 비어있어요</Text>
            <Text style={styles.emptySubText}>레시피에서 재료를 추가하거나{'\n'}직접 입력해보세요</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
