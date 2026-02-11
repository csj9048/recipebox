import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Recipe } from '../types/recipe';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AddToMealModal } from './AddToMealModal';
import analytics from '@react-native-firebase/analytics';
import { addGuestMealPlan, addGuestShoppingItem } from '../utils/storage';
import { useTranslation } from 'react-i18next';

interface RecipeDetailProps {
  recipe: Recipe;
  onDelete?: (id: string) => void;
  onAddToMealPlan?: () => void;
}

export function RecipeDetail({ recipe, onDelete, onAddToMealPlan }: RecipeDetailProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const situationTags = recipe.tags.filter(t => t.type === 'situation');
  const ingredientTags = recipe.tags.filter(t => t.type === 'ingredient');
  const [showMenu, setShowMenu] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageCollapsed, setImageCollapsed] = useState(true);
  const [addToMealModalVisible, setAddToMealModalVisible] = useState(false);

  const handleAddToMealPlan = async (date: Date, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const dateStr = date.toISOString().split('T')[0];

      if (!user) {
        // Guest mode
        await addGuestMealPlan({
          date: dateStr,
          meal_type: mealType,
          recipe_id: recipe.id,
        });
      } else {
        const { error } = await supabase.from('meal_plans').insert({
          user_id: user.id,
          date: dateStr,
          meal_type: mealType,
          recipe_id: recipe.id,
        });
        if (error) throw error;
      }

      Toast.show({
        type: 'success',
        text1: t('recipe_detail.alert.meal_added'),
      });

      await analytics().logEvent('menu_added', {
        type: 'recipe',
        recipe_title: recipe.title,
        recipe_id: recipe.id,
        from: 'detail'
      });

      setAddToMealModalVisible(false);
    } catch (error) {
      console.error('Error adding to meal plan:', error);
      Toast.show({
        type: 'error',
        text1: t('recipe_detail.alert.meal_add_failed'),
      });
    }
  };

  // Parse image URLs
  let imageUrls: string[] = [];
  if (recipe.image_url) {
    try {
      const parsed = JSON.parse(recipe.image_url);
      if (Array.isArray(parsed)) {
        imageUrls = parsed;
      } else {
        imageUrls = [recipe.image_url];
      }
    } catch {
      imageUrls = [recipe.image_url];
    }
  }

  const hasValidThumbnail = recipe.thumbnail_url &&
    recipe.thumbnail_url.trim() !== '' &&
    recipe.thumbnail_url !== 'null' &&
    recipe.thumbnail_url.startsWith('http');

  const handleDelete = () => {
    Alert.alert(
      t('recipe_detail.alert.delete_title'),
      t('recipe_detail.alert.delete_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            if (onDelete) {
              onDelete(recipe.id);
            } else {
              try {
                const { error } = await supabase.from('recipes').delete().eq('id', recipe.id);
                if (error) throw error;
                router.back();
              } catch (err) {
                console.error(err);
                Toast.show({
                  type: 'error',
                  text1: t('recipe_detail.alert.delete_failed'),
                });
              }
            }
          },
        },
      ]
    );
    setShowMenu(false);
  };

  const handleEdit = () => {
    router.push({
      pathname: '/add',
      params: { id: recipe.id },
    });
    setShowMenu(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: Colors.primary, borderBottomWidth: 0 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {recipe.title || t('recipe_detail.title')}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          {showMenu && (
            <>
              <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)} />
              <View style={styles.menu}>
                <TouchableOpacity onPress={handleEdit} style={styles.menuItem}>
                  <Ionicons name="create-outline" size={18} color={Colors.text.primary} />
                  <Text style={styles.menuItemText}>{t('recipe_detail.menu.edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} style={styles.menuItem}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>{t('recipe_detail.menu.delete')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Thumbnail */}
        {hasValidThumbnail && (
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: recipe.thumbnail_url! }}
              style={styles.thumbnail}
              contentFit="contain"
            />
          </View>
        )}

        {/* Body Text */}
        <View style={styles.content}>
          <Text style={styles.bodyText}>{recipe.body_text || ''}</Text>

          {/* Images */}
          {imageUrls.length > 0 && (
            <View style={styles.imageSection}>
              {imageCollapsed ? (
                <TouchableOpacity
                  onPress={() => setImageCollapsed(false)}
                  style={styles.collapseButton}
                >
                  <Text style={styles.collapseButtonText}>{t('recipe_form.label.expand_image')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.imageContainer}>
                  <View style={styles.imageWrapper}>
                    <Image
                      source={{ uri: imageUrls[currentImageIndex] }}
                      style={styles.detailImage}
                      contentFit="contain"
                    />

                    {/* Image counter */}
                    {imageUrls.length > 1 && (
                      <View style={styles.imageCounter}>
                        <Text style={styles.imageCounterText}>
                          {currentImageIndex + 1} / {imageUrls.length}
                        </Text>
                      </View>
                    )}

                    {/* Navigation buttons */}
                    {imageUrls.length > 1 && (
                      <>
                        {currentImageIndex > 0 && (
                          <TouchableOpacity
                            onPress={() => setCurrentImageIndex(currentImageIndex - 1)}
                            style={[styles.imageNavButton, styles.imageNavButtonLeft]}
                          >
                            <Ionicons name="chevron-back" size={20} color={Colors.white} />
                          </TouchableOpacity>
                        )}
                        {currentImageIndex < imageUrls.length - 1 && (
                          <TouchableOpacity
                            onPress={() => setCurrentImageIndex(currentImageIndex + 1)}
                            style={[styles.imageNavButton, styles.imageNavButtonRight]}
                          >
                            <Ionicons name="chevron-forward" size={20} color={Colors.white} />
                          </TouchableOpacity>
                        )}
                      </>
                    )}

                    {/* Collapse button */}
                    <TouchableOpacity
                      onPress={() => setImageCollapsed(true)}
                      style={styles.collapseButtonBottom}
                    >
                      <Text style={styles.collapseButtonText}>{t('recipe_form.label.collapse_image')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Memo */}
          {recipe.memo && (
            <View style={styles.memoSection}>
              <Text style={styles.memoTitle}>{t('recipe_detail.section.comment')}</Text>
              <View style={styles.memoBox}>
                <Text style={styles.memoText}>{recipe.memo}</Text>
              </View>
            </View>
          )}

          {/* Tags */}
          {(ingredientTags.length > 0 || situationTags.length > 0) && (
            <View style={styles.tagsSection}>
              {ingredientTags.length > 0 && (
                <View style={styles.tagGroup}>
                  <Text style={styles.tagGroupTitle}>{t('recipe_detail.section.ingredient')}</Text>
                  <View style={styles.tagRow}>
                    {ingredientTags.map((tag, idx) => (
                      <TouchableOpacity
                        key={`ingredient-${idx}`}
                        style={[styles.tag, styles.ingredientTag]}
                        onPress={() => {
                          Alert.alert(
                            t('recipe_detail.alert.shop_add_title'),
                            t('recipe_detail.alert.shop_add_message', { item: tag.name }),
                            [
                              { text: t('common.cancel'), style: 'cancel' },
                              {
                                text: t('common.add'),
                                onPress: async () => {
                                  try {
                                    const { data: { user } } = await supabase.auth.getUser();

                                    if (user) {
                                      const { error } = await supabase.from('shopping_items').insert({
                                        user_id: user.id,
                                        text: tag.name
                                      });
                                      if (error) throw error;
                                    } else {
                                      // Guest mode
                                      await addGuestShoppingItem(tag.name);
                                    }

                                    Toast.show({ type: 'success', text1: t('recipe_detail.alert.shop_added') });

                                    await analytics().logEvent('shopping_added', {
                                      item: tag.name,
                                      method: 'recipe_tag'
                                    });
                                  } catch (e) {
                                    console.error(e);
                                    Toast.show({ type: 'error', text1: t('recipe_detail.alert.shop_add_failed') });
                                  }
                                }
                              }
                            ]
                          )
                        }}
                      >
                        <Text style={styles.tagText}>#{tag.name}</Text>
                        <Ionicons name="add-circle" size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {situationTags.length > 0 && (
                <View style={styles.tagGroup}>
                  <Text style={styles.tagGroupTitle}>{t('recipe_detail.section.situation')}</Text>
                  <View style={styles.tagRow}>
                    {situationTags.map((tag, idx) => (
                      <View key={`situation-${idx}`} style={[styles.tag, styles.situationTag]}>
                        <Text style={styles.tagText}>#{tag.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add to meal plan button */}
      <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
        <TouchableOpacity onPress={() => setAddToMealModalVisible(true)} style={styles.bottomButton}>
          <Ionicons name="calendar-outline" size={20} color={Colors.text.primary} />
          <Text style={styles.bottomButtonText}>{t('recipe_detail.button.add_to_meal_plan')}</Text>
        </TouchableOpacity>
      </View>

      <AddToMealModal
        visible={addToMealModalVisible}
        onClose={() => setAddToMealModalVisible(false)}
        onSave={handleAddToMealPlan}
        recipeTitle={recipe.title || t('recipe_detail.title')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    position: 'relative',
  },
  menuOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 1,
  },
  menu: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 160,
    backgroundColor: Colors.white,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 2,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  menuItemTextDanger: {
    color: Colors.error,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  thumbnailContainer: {
    width: '100%',
    backgroundColor: Colors.gray[50],
    marginBottom: 0,
  },
  thumbnail: {
    width: '100%',
    height: 300,
  },
  content: {
    padding: 16,
    backgroundColor: Colors.white,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  imageSection: {
    marginTop: 16,
  },
  collapseButton: {
    paddingVertical: 12,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    alignItems: 'center',
  },
  collapseButtonText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  collapseButtonBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
  },
  imageContainer: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.gray[50],
  },
  imageWrapper: {
    position: 'relative',
    paddingBottom: 48,
  },
  detailImage: {
    width: '100%',
    height: 400,
  },
  imageCounter: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  imageCounterText: {
    color: Colors.white,
    fontSize: 14,
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  imageNavButtonLeft: {
    left: 8,
  },
  imageNavButtonRight: {
    right: 8,
  },
  memoSection: {
    marginTop: 24,
  },
  memoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  memoBox: {
    backgroundColor: `${Colors.primary}10`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    borderRadius: 8,
    padding: 16,
  },
  memoText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.primary,
  },
  tagsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: 16,
  },
  tagGroup: {
    gap: 8,
  },
  tagGroupTitle: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ingredientTag: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  situationTag: {
    backgroundColor: Colors.gray[100],
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  tagText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  bottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  bottomButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});
