export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface MealPlan {
    id: string;
    user_id: string;
    date: string; // YYYY-MM-DD
    day_of_week?: string; // Optional, derived from date usually
    meal_type: MealType;
    recipe_id?: string | null;
    custom_text?: string | null;
    created_at?: string;

    // Joins
    recipes?: {
        id: string;
        title: string;
        thumbnail_url: string | null;
    } | null;
}

export interface MealPlanInsert {
    user_id: string;
    date: string;
    meal_type: MealType;
    recipe_id?: string | null;
    custom_text?: string | null;
}
