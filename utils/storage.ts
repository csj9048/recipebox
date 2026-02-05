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
// --- Guest Shopping List ---

export interface GuestShoppingItem {
    id: string;
    text: string;
    is_completed: boolean;
    created_at: number;
}

const GUEST_SHOPPING_KEY = 'guest_shopping_list';

export const getGuestShoppingList = async (): Promise<GuestShoppingItem[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(GUEST_SHOPPING_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Failed to load guest shopping list', e);
        return [];
    }
};

export const addGuestShoppingItem = async (text: string): Promise<GuestShoppingItem> => {
    try {
        const items = await getGuestShoppingList();
        const newItem: GuestShoppingItem = {
            id: Date.now().toString(),
            text,
            is_completed: false,
            created_at: Date.now(),
        };
        const updatedItems = [newItem, ...items];
        await AsyncStorage.setItem(GUEST_SHOPPING_KEY, JSON.stringify(updatedItems));
        return newItem;
    } catch (e) {
        console.error('Failed to add guest shopping item', e);
        throw e;
    }
};

export const toggleGuestShoppingItem = async (id: string): Promise<void> => {
    try {
        const items = await getGuestShoppingList();
        const updatedItems = items.map(item =>
            item.id === id ? { ...item, is_completed: !item.is_completed } : item
        );
        await AsyncStorage.setItem(GUEST_SHOPPING_KEY, JSON.stringify(updatedItems));
    } catch (e) {
        console.error('Failed to toggle guest shopping item', e);
        throw e;
    }
};

export const deleteGuestShoppingItem = async (id: string): Promise<void> => {
    try {
        const items = await getGuestShoppingList();
        const updatedItems = items.filter(item => item.id !== id);
        await AsyncStorage.setItem(GUEST_SHOPPING_KEY, JSON.stringify(updatedItems));
    } catch (e) {
        console.error('Failed to delete guest shopping item', e);
        throw e;
    }
};

export const clearGuestShoppingList = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(GUEST_SHOPPING_KEY);
    } catch (e) {
        console.error('Failed to clear guest shopping list', e);
        throw e;
    }
};

// --- Guest Meal Plan ---

export interface GuestMealPlan {
    id: string;
    date: string; // YYYY-MM-DD
    meal_type: 'breakfast' | 'lunch' | 'dinner';
    recipe_id?: string;
    custom_text?: string;
    // For joining with recipes locally
    recipes?: Recipe;
}

const GUEST_MEAL_PLAN_KEY = 'guest_meal_plans';

export const getGuestMealPlans = async (startDate: string, endDate: string): Promise<GuestMealPlan[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(GUEST_MEAL_PLAN_KEY);
        let plans: GuestMealPlan[] = jsonValue != null ? JSON.parse(jsonValue) : [];

        // Filter by date range (simple string comparison works for YYYY-MM-DD)
        plans = plans.filter(p => p.date >= startDate && p.date <= endDate);

        // Join with guest recipes (to simulate foreign key)
        const guestRecipes = await getGuestRecipes();
        plans = plans.map(p => {
            if (p.recipe_id) {
                const recipe = guestRecipes.find(r => r.id === p.recipe_id);
                if (recipe) {
                    return { ...p, recipes: recipe };
                }
            }
            return p;
        });

        return plans;
    } catch (e) {
        console.error('Failed to load guest meal plans', e);
        return [];
    }
};

export const addGuestMealPlan = async (plan: Omit<GuestMealPlan, 'id' | 'recipes'>): Promise<void> => {
    try {
        const jsonValue = await AsyncStorage.getItem(GUEST_MEAL_PLAN_KEY);
        const plans: GuestMealPlan[] = jsonValue != null ? JSON.parse(jsonValue) : [];

        const newPlan: GuestMealPlan = {
            ...plan,
            id: Date.now().toString(),
        };

        const updatedPlans = [...plans, newPlan];
        await AsyncStorage.setItem(GUEST_MEAL_PLAN_KEY, JSON.stringify(updatedPlans));
    } catch (e) {
        console.error('Failed to add guest meal plan', e);
        throw e;
    }
};

export const deleteGuestMealPlan = async (id: string): Promise<void> => {
    try {
        const jsonValue = await AsyncStorage.getItem(GUEST_MEAL_PLAN_KEY);
        const plans: GuestMealPlan[] = jsonValue != null ? JSON.parse(jsonValue) : [];
        const updatedPlans = plans.filter(p => p.id !== id);
        await AsyncStorage.setItem(GUEST_MEAL_PLAN_KEY, JSON.stringify(updatedPlans));
    } catch (e) {
        console.error('Failed to delete guest meal plan', e);
        throw e;
    }
};
