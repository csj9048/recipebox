import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Recipe } from '../types/recipe';
import { RecipeCard } from './RecipeCard';
import { supabase } from '../utils/supabase/client';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getGuestRecipes, deleteGuestRecipe } from '../utils/storage';

export function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [])
  );



  const loadRecipes = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const guestRecipes = await getGuestRecipes();
        setRecipes(guestRecipes);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id) // 내 레시피만 가져오기
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        Toast.show({
          type: 'error',
          text1: '레시피를 불러오는데 실패했습니다',
        });
        return;
      }

      setRecipes(data || []);
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: '레시피를 불러오는데 실패했습니다',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        await deleteGuestRecipe(id);
        setRecipes((prev) => prev.filter((r) => r.id !== id));
        Toast.show({
          type: 'success',
          text1: '레시피가 삭제되었습니다',
        });
        return;
      }

      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;

      setRecipes((prev) => prev.filter((r) => r.id !== id));
      Toast.show({
        type: 'success',
        text1: '레시피가 삭제되었습니다',
      });
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: '레시피 삭제에 실패했습니다',
      });
    }
  };

  const handleViewRecipe = (recipe: Recipe) => {
    router.push(`/detail/${recipe.id}`);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    router.push({
      pathname: '/add',
      params: { id: recipe.id },
    });
  };

  const filteredRecipes = recipes.filter((recipe) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase().replace('#', '');

    const matchesTags = recipe.tags.some((tag) =>
      tag.name.toLowerCase().includes(query)
    );
    const matchesTitle = recipe.title?.toLowerCase().includes(query);

    return matchesTags || matchesTitle;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>RecipeBox</Text>
        </View>

        {/* 검색바 */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.gray[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="해시태그로 검색 (예: #한끼요리, #오이)"
            placeholderTextColor={Colors.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* 레시피 리스트 */}
      {filteredRecipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="restaurant-outline" size={48} color={Colors.gray[400]} />
          </View>
          <Text style={styles.emptyText}>레시피가 없습니다</Text>
          <Text style={styles.emptySubtext}>
            + 버튼을 눌러 새 레시피를 추가해보세요
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onView={handleViewRecipe}
              onEdit={handleEditRecipe}
              onDelete={handleDelete}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            router.push('/add');
          }}
        >
          <Ionicons
            name="add"
            size={28}
            color={Colors.text.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerContent: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.gray[500],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray[500],
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.gray[400],
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24, // Adjusted for tab bar
    left: '50%',
    transform: [{ translateX: -28 }], // Half of width (56/2)
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

