import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Recipe } from '../types/recipe';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface RecipeCardProps {
  recipe: Recipe;
  onDelete: (id: string) => void;
  onView: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, onDelete, onView, onEdit }: RecipeCardProps) {
  const situationTags = recipe.tags.filter(t => t.type === 'situation');
  const ingredientTags = recipe.tags.filter(t => t.type === 'ingredient');

  const hasValidThumbnail = recipe.thumbnail_url &&
    recipe.thumbnail_url.trim() !== '' &&
    recipe.thumbnail_url !== 'null';

  return (
    <Pressable
      style={styles.card}
      onPress={() => onView(recipe)}
      android_ripple={{ color: Colors.gray[100] }}
    >
      <View style={styles.cardContent}>
        {/* 썸네일 이미지 */}
        <View style={styles.thumbnailContainer}>
          {hasValidThumbnail ? (
            <Image
              source={{ uri: recipe.thumbnail_url! }}
              style={styles.thumbnail}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="restaurant" size={40} color={Colors.primary} />
          )}
        </View>

        {/* 콘텐츠 */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {recipe.title || '제목 없음'}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => {
                  onEdit(recipe);
                }}
                style={styles.actionButton}
              >
                <Ionicons name="create-outline" size={18} color={Colors.gray[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onDelete(recipe.id);
                }}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tags */}
          <View style={styles.tagsContainer}>
            {ingredientTags.length > 0 && (
              <View style={styles.tagRow}>
                {ingredientTags.slice(0, 4).map((tag, idx) => (
                  <View key={`ingredient-${idx}`} style={[styles.tag, styles.ingredientTag]}>
                    <Text style={styles.tagText}>#{tag.name}</Text>
                  </View>
                ))}
                {ingredientTags.length > 4 && (
                  <Text style={styles.tagMore}>+{ingredientTags.length - 4}</Text>
                )}
              </View>
            )}

            {situationTags.length > 0 && (
              <View style={styles.tagRow}>
                {situationTags.slice(0, 4).map((tag, idx) => (
                  <View key={`situation-${idx}`} style={[styles.tag, styles.situationTag]}>
                    <Text style={styles.tagText}>#{tag.name}</Text>
                  </View>
                ))}
                {situationTags.length > 4 && (
                  <Text style={styles.tagMore}>+{situationTags.length - 4}</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 4,
  },
  tagsContainer: {
    gap: 6,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ingredientTag: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  situationTag: {
    backgroundColor: Colors.gray[100],
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  tagText: {
    fontSize: 11,
    color: Colors.text.primary,
  },
  tagMore: {
    fontSize: 11,
    color: Colors.gray[400],
  },
});

