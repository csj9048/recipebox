import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types/recipe';

const GUEST_RECIPES_KEY = 'guest_recipes';

export const getGuestRecipes = async (): Promise<Recipe[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(GUEST_RECIPES_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Failed to load guest recipes', e);
        return [];
    }
};

export const saveGuestRecipe = async (recipe: Recipe): Promise<void> => {
    try {
        const currentRecipes = await getGuestRecipes();
        const updatedRecipes = [recipe, ...currentRecipes];
        await AsyncStorage.setItem(GUEST_RECIPES_KEY, JSON.stringify(updatedRecipes));
    } catch (e) {
        console.error('Failed to save guest recipe', e);
        throw e;
    }
};

export const updateGuestRecipe = async (recipe: Recipe): Promise<void> => {
    try {
        const currentRecipes = await getGuestRecipes();
        const updatedRecipes = currentRecipes.map((r) =>
            r.id === recipe.id ? recipe : r
        );
        await AsyncStorage.setItem(GUEST_RECIPES_KEY, JSON.stringify(updatedRecipes));
    } catch (e) {
        console.error('Failed to update guest recipe', e);
        throw e;
    }
};

export const deleteGuestRecipe = async (id: string): Promise<void> => {
    try {
        const currentRecipes = await getGuestRecipes();
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
