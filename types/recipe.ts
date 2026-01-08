export interface Recipe {
  id: string;
  user_id?: string | null;
  title?: string | null;
  body_text?: string | null;
  memo?: string | null;
  tags: { type: 'situation' | 'ingredient'; name: string }[];
  thumbnail_url?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeInsert {
  user_id?: string;
  title?: string;
  body_text?: string;
  memo?: string;
  tags?: { type: 'situation' | 'ingredient'; name: string }[];
  thumbnail_url?: string;
  image_url?: string;
}

export interface RecipeUpdate {
  title?: string;
  body_text?: string;
  memo?: string;
  tags?: { type: 'situation' | 'ingredient'; name: string }[];
  thumbnail_url?: string;
  image_url?: string;
}

