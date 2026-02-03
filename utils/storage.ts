import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types/recipe';
import * as FileSystem from 'expo-file-system';

const GUEST_RECIPES_KEY = 'guest_recipes';
const FIRST_LAUNCH_KEY = 'is_first_launch';

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

// Process recipe for save (Relative Paths)
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

// Process recipe for load (Absolute Paths)
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

// --- First Launch Check ---

export const getIsFirstLaunch = async (): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
        return value === null; // If null, it's the first launch
    } catch (e) {
        console.error('Failed to check first launch', e);
        return false; // Default to false on error to be safe
    }
};

export const setIsFirstLaunch = async (isFirst: boolean): Promise<void> => {
    try {
        if (isFirst) {
            await AsyncStorage.removeItem(FIRST_LAUNCH_KEY);
        } else {
            await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'false');
        }
    } catch (e) {
        console.error('Failed to set first launch', e);
    }
};
