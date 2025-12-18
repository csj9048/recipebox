import { Recipe } from '../types/recipe';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Trash2, Edit, UtensilsCrossed } from 'lucide-react';
import { Button } from './ui/button';

interface RecipeCardProps {
  recipe: Recipe;
  onDelete: (id: string) => void;
  onView: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, onDelete, onView, onEdit }: RecipeCardProps) {
  const situationTags = recipe.tags.filter(t => t.type === 'situation');
  const ingredientTags = recipe.tags.filter(t => t.type === 'ingredient');
  
  // Check if thumbnail exists and is a valid URL (not empty, null, or placeholder)
  const hasValidThumbnail = recipe.thumbnail_url && 
    recipe.thumbnail_url.trim() !== '' &&
    recipe.thumbnail_url !== 'null' &&
    recipe.thumbnail_url.startsWith('http');

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all border-gray-200 hover:border-[#FDD360] bg-white cursor-pointer" onClick={() => onView(recipe)}>
      <div className="flex gap-3 p-4">
        {/* 왼쪽 썸네일 이미지 - show icon if no valid thumbnail */}
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#FDD360]/10 shrink-0 border border-[#FDD360]/20 flex items-center justify-center">
          {hasValidThumbnail ? (
            <img
              src={recipe.thumbnail_url}
              alt={recipe.title || '레시피'}
              className="w-full h-full object-cover"
            />
          ) : (
            <UtensilsCrossed className="size-10 text-[#FDD360]" strokeWidth={1.5} />
          )}
        </div>

        {/* 오른쪽 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-medium text-gray-900">{recipe.title || '제목 없음'}</h3>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(recipe);
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <Edit className="size-4 text-gray-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(recipe.id);
                }}
                className="h-8 w-8 p-0 hover:bg-red-50"
              >
                <Trash2 className="size-4 text-red-500" />
              </Button>
            </div>
          </div>
          
          {/* Tags section - separated by type */}
          <div className="space-y-1.5">
            {/* Ingredient tags on first line */}
            {ingredientTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {ingredientTags.slice(0, 4).map((tag, idx) => (
                  <Badge key={`ingredient-${idx}`} variant="outline" className="text-xs border-[#FDD360]/40 text-gray-700 bg-[#FDD360]/10">
                    #{tag.name}
                  </Badge>
                ))}
                {ingredientTags.length > 4 && (
                  <span className="text-xs text-gray-400">+{ingredientTags.length - 4}</span>
                )}
              </div>
            )}
            
            {/* Situation tags on second line */}
            {situationTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {situationTags.slice(0, 4).map((tag, idx) => (
                  <Badge key={`situation-${idx}`} variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-300">
                    #{tag.name}
                  </Badge>
                ))}
                {situationTags.length > 4 && (
                  <span className="text-xs text-gray-400">+{situationTags.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}