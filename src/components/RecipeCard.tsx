import { Recipe } from '../types/recipe';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Trash2, Edit } from 'lucide-react';
import { Button } from './ui/button';
import defaultThumbnail from 'figma:asset/de36e1906579ee3e8d586d2ba9b30fae404f4e8b.png';

interface RecipeCardProps {
  recipe: Recipe;
  onDelete: (id: string) => void;
  onView: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, onDelete, onView, onEdit }: RecipeCardProps) {
  const situationTags = recipe.tags.filter(t => t.type === 'situation');
  const ingredientTags = recipe.tags.filter(t => t.type === 'ingredient');

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all border-gray-200 hover:border-[#FDD360] bg-white cursor-pointer" onClick={() => onView(recipe)}>
      <div className="flex gap-3 p-4">
        {/* 왼쪽 썸네일 이미지 */}
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
          <img
            src={recipe.thumbnail_url || defaultThumbnail}
            alt={recipe.title || '레시피'}
            className="w-full h-full object-cover"
          />
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
          
          <div className="flex flex-wrap gap-1">
            {ingredientTags.slice(0, 3).map((tag, idx) => (
              <Badge key={`ingredient-${idx}`} variant="outline" className="text-xs border-gray-300 text-gray-700 bg-gray-50">
                #{tag.name}
              </Badge>
            ))}
            {situationTags.slice(0, 3).map((tag, idx) => (
              <Badge key={`situation-${idx}`} variant="secondary" className="text-xs bg-[#FDD360]/20 text-gray-800 border-[#FDD360]/30">
                #{tag.name}
              </Badge>
            ))}
            {(situationTags.length + ingredientTags.length > 6) && (
              <span className="text-xs text-gray-400">...</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}