import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { supabase } from '../utils/supabase/client';
import { Recipe } from '../types/recipe';
import { Image } from 'expo-image';
import { getGuestRecipes } from '../utils/storage';
import { useTranslation } from 'react-i18next';
import i18next from '../locales';

interface RecipeSelectorProps {
    onSelect: (recipe: Recipe) => void;
    onClose: () => void;
}

export function RecipeSelector({ onSelect, onClose }: RecipeSelectorProps) {
    const { t } = useTranslation();
    const safeT = (key: string, options?: any) => i18next.t(key, options);

    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadRecipes();
    }, []);

    const loadRecipes = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                // Guest mode
                const guestRecipes = await getGuestRecipes();
                // Sort by last modified/created (desc) - assuming id acts as timestamp or order matter
                setRecipes(guestRecipes.reverse());
                return;
            }

            const { data, error } = await supabase
                .from('recipes')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRecipes(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
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

    const renderItem = ({ item }: { item: Recipe }) => (
        <TouchableOpacity style={styles.item} onPress={() => onSelect(item)}>
            {item.thumbnail_url ? (
                <Image
                    source={{ uri: item.thumbnail_url }}
                    style={styles.thumbnail}
                    contentFit="cover"
                />
            ) : (
                <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                    <Ionicons name="restaurant" size={24} color={Colors.gray[400]} />
                </View>
            )}
            <View style={styles.itemContent}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.tags}>
                    {item.tags.slice(0, 3).map((tag, idx) => (
                        <Text key={idx} style={styles.tagText}>#{tag.name}</Text>
                    ))}
                </View>
            </View>
            <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={Colors.gray[400]} />
                    <TextInput
                        style={styles.input}
                        placeholder={safeT('recipe_selector.search_placeholder')}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>{safeT('recipe_selector.close')}</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredRecipes}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>{safeT('recipe_selector.empty')}</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray[100],
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
        gap: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.text.primary,
    },
    closeButton: {
        padding: 8,
    },
    closeButtonText: {
        color: Colors.text.secondary,
        fontSize: 16,
    },
    list: {
        padding: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
        gap: 12,
    },
    thumbnail: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: Colors.gray[200],
    },
    itemContent: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    tags: {
        flexDirection: 'row',
        gap: 8,
    },
    tagText: {
        fontSize: 12,
        color: Colors.gray[500],
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        color: Colors.gray[500],
        fontSize: 16,
    },
    thumbnailPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.gray[100],
    },
});
