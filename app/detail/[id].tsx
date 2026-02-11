import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { RecipeDetail } from '../../components/RecipeDetail';
import { AdBanner } from '../../components/AdBanner';
import { Recipe } from '../../types/recipe';
import { getGuestRecipes } from '../../utils/storage';
import { supabase } from '../../utils/supabase/client';
import { Colors } from '../../constants/Colors';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

export default function RecipeDetailScreen() {
  const { t } = useTranslation();
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
          text1: t('recipe_detail_screen.not_found'),
        });
        return;
      }

      setRecipe(fetchedRecipe);
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: t('recipe_detail_screen.load_error'),
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('recipe_detail_screen.loading')}</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{t('recipe_detail_screen.not_found')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <RecipeDetail recipe={recipe} />
      <AdBanner />
    </View>
  );
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

