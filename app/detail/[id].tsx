import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { RecipeDetail } from '../../components/RecipeDetail';
import { Recipe } from '../../types/recipe';
import { getGuestRecipes } from '../../utils/storage';
import { supabase } from '../../utils/supabase/client';
import { Colors } from '../../constants/Colors';
import Toast from 'react-native-toast-message';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadRecipe();
    }
  }, [id]);

  const loadRecipe = async () => {
    try {
      setLoading(true);

      let fetchedRecipe = null;

      // Try Supabase first
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          fetchedRecipe = data;
        }
      } catch (e) {
        // Ignore errors (e.g. invalid UUID)
      }

      // Fallback to guest storage
      if (!fetchedRecipe) {
        const guestRecipes = await getGuestRecipes();
        fetchedRecipe = guestRecipes.find(r => r.id === id) || null;
      }

      if (!fetchedRecipe) {
        Toast.show({
          type: 'error',
          text1: '레시피를 찾을 수 없습니다',
        });
        return;
      }

      setRecipe(fetchedRecipe);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>레시피를 찾을 수 없습니다</Text>
      </View>
    );
  }

  return <RecipeDetail recipe={recipe} />;
}

const styles = StyleSheet.create({
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
  errorText: {
    fontSize: 16,
    color: Colors.error,
  },
});

