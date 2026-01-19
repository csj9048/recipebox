import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types/recipe';
import * as FileSystem from 'expo-file-system';

const GUEST_RECIPES_KEY = 'guest_recipes';

// Helper to make paths relative
const makeRelative = (path: string | null): string | null => {
    if (!path) return null;
    if (FileSystem.documentDirectory && path.startsWith(FileSystem.documentDirectory)) {
        return path.substring(FileSystem.documentDirectory.length);
    }
    return path;
};

// Helper to make paths absolute
const makeAbsolute = (path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    if (FileSystem.documentDirectory && !path.startsWith(FileSystem.documentDirectory)) {
        return FileSystem.documentDirectory + path;
    }
    return path;
};

// Process recipe for saving (Relative Paths)
const processForSave = (recipe: Recipe): Recipe => {
    const relativeThumb = makeRelative(recipe.thumbnail_url ?? null);

    let relativeImages = recipe.image_url;
    if (recipe.image_url) {
        try {
            const parsed = JSON.parse(recipe.image_url);
            if (Array.isArray(parsed)) {
                const updated = parsed.map((p: string) => makeRelative(p));
                relativeImages = JSON.stringify(updated);
            }
        } catch {
            // If not array, try single path
            const rel = makeRelative(recipe.image_url);
            if (rel) relativeImages = rel;
        }
    }

    return {
        ...recipe,
        thumbnail_url: relativeThumb,
        image_url: relativeImages
    };
};

// Process recipe for loading (Absolute Paths)
const processForLoad = (recipe: Recipe): Recipe => {
    const absoluteThumb = makeAbsolute(recipe.thumbnail_url ?? null);

    let absoluteImages = recipe.image_url;
    if (recipe.image_url) {
        try {
            const parsed = JSON.parse(recipe.image_url);
            if (Array.isArray(parsed)) {
                const updated = parsed.map((p: string) => makeAbsolute(p));
                absoluteImages = JSON.stringify(updated);
            }
        } catch {
            const abs = makeAbsolute(recipe.image_url);
            if (abs) absoluteImages = abs;
        }
    }

    return {
        ...recipe,
        thumbnail_url: absoluteThumb,
        image_url: absoluteImages
    };
};

export const getGuestRecipes = async (): Promise<Recipe[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(GUEST_RECIPES_KEY);
        const recipes: Recipe[] = jsonValue != null ? JSON.parse(jsonValue) : [];
        return recipes.map(processForLoad);
    } catch (e) {
        console.error('Failed to load guest recipes', e);
        return [];
    }
};

export const saveGuestRecipe = async (recipe: Recipe): Promise<void> => {
    try {
        const currentRecipesRaw = await AsyncStorage.getItem(GUEST_RECIPES_KEY);
        const currentRecipes = currentRecipesRaw ? JSON.parse(currentRecipesRaw) : [];

        // Save the new recipe with relative paths
        const optimizedRecipe = processForSave(recipe);
        const updatedRecipes = [optimizedRecipe, ...currentRecipes];

        await AsyncStorage.setItem(GUEST_RECIPES_KEY, JSON.stringify(updatedRecipes));
    } catch (e) {
        console.error('Failed to save guest recipe', e);
        throw e;
    }
};

export const updateGuestRecipe = async (recipe: Recipe): Promise<void> => {
    try {
        const currentRecipesRaw = await AsyncStorage.getItem(GUEST_RECIPES_KEY);
        const currentRecipes: Recipe[] = currentRecipesRaw ? JSON.parse(currentRecipesRaw) : [];

        const optimizedRecipe = processForSave(recipe);
        const updatedRecipes = currentRecipes.map((r) =>
            r.id === recipe.id ? optimizedRecipe : r
        );
        await AsyncStorage.setItem(GUEST_RECIPES_KEY, JSON.stringify(updatedRecipes));
    } catch (e) {
        console.error('Failed to update guest recipe', e);
        throw e;
    }
};

export const deleteGuestRecipe = async (id: string): Promise<void> => {
    try {
        // Get RAW, filter RAW, save RAW to avoid unnecessary path processing
        const currentRecipesRaw = await AsyncStorage.getItem(GUEST_RECIPES_KEY);
        const currentRecipes: Recipe[] = currentRecipesRaw ? JSON.parse(currentRecipesRaw) : [];
        const updatedRecipes = currentRecipes.filter((r) => r.id !== id);
        await AsyncStorage.setItem(GUEST_RECIPES_KEY, JSON.stringify(updatedRecipes));
    } catch (e) {
        console.error('Failed to delete guest recipe', e);
        throw e;
    }
};

export const clearGuestRecipes = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(GUEST_RECIPES_KEY);
    } catch (e) {
        console.error('Failed to clear guest recipes', e);
        throw e;
    }
};
