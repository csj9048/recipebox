import { Recipe } from '../types/recipe';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ChevronLeft, MoreVertical, Edit, Trash2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import defaultThumbnail from 'figma:asset/de36e1906579ee3e8d586d2ba9b30fae404f4e8b.png';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}

export function RecipeDetail({ recipe, onBack, onEdit, onDelete }: RecipeDetailProps) {
  const situationTags = recipe.tags.filter(t => t.type === 'situation');
  const ingredientTags = recipe.tags.filter(t => t.type === 'ingredient');
  const [showMenu, setShowMenu] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Parse image URLs
  let imageUrls: string[] = [];
  if (recipe.image_url) {
    try {
      const parsed = JSON.parse(recipe.image_url);
      if (Array.isArray(parsed)) {
        imageUrls = parsed;
      } else {
        imageUrls = [recipe.image_url];
      }
    } catch {
      imageUrls = [recipe.image_url];
    }
  }

  const handleDelete = () => {
    if (window.confirm('이 레시피를 삭제하시겠습니까?')) {
      onDelete(recipe.id);
      onBack();
    }
    setShowMenu(false);
  };

  const handleEdit = () => {
    onEdit(recipe);
    setShowMenu(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile App Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="size-6 text-gray-700" />
          </button>
          <h1 className="flex-1 text-center mx-4 truncate" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
            {recipe.title || '레시피'}
          </h1>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical className="size-6 text-gray-700" />
            </button>
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                  >
                    <Edit className="size-4" />
                    <span>수정하기</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-red-600"
                  >
                    <Trash2 className="size-4" />
                    <span>삭제하기</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 shadow-none rounded-none bg-white">
          {recipe.thumbnail_url && recipe.thumbnail_url !== defaultThumbnail && (
            <div className="w-full overflow-hidden bg-gray-50">
              <img
                src={recipe.thumbnail_url}
                alt={recipe.title || '레시피'}
                className="w-full max-h-96 object-contain"
              />
            </div>
          )}
          <CardContent className="space-y-6">
            <div>
              <div className="whitespace-pre-wrap text-gray-700">
                {recipe.body_text || ''}
              </div>
              {imageUrls.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <div className="relative">
                    <img
                      src={imageUrls[currentImageIndex]}
                      alt={`레시피 이미지 ${currentImageIndex + 1}`}
                      className="w-full object-contain"
                    />
                    
                    {/* Image counter */}
                    {imageUrls.length > 1 && (
                      <div className="absolute top-2 left-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                        {currentImageIndex + 1} / {imageUrls.length}
                      </div>
                    )}
                    
                    {/* Navigation buttons */}
                    {imageUrls.length > 1 && (
                      <>
                        {currentImageIndex > 0 && (
                          <button
                            type="button"
                            onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                          >
                            <ChevronLeft className="size-5" />
                          </button>
                        )}
                        {currentImageIndex < imageUrls.length - 1 && (
                          <button
                            type="button"
                            onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                          >
                            <ChevronRight className="size-5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            {recipe.memo && (
              <div>
                <h3 className="mb-2 text-gray-900">코멘트</h3>
                <div className="bg-[#FDD360]/10 border border-[#FDD360]/30 p-4 rounded-lg whitespace-pre-wrap text-gray-700">
                  {recipe.memo}
                </div>
              </div>
            )}
            
            {/* Tags at bottom */}
            {(ingredientTags.length > 0 || situationTags.length > 0) && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {ingredientTags.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">재료</p>
                    <div className="flex flex-wrap gap-2">
                      {ingredientTags.map((tag, idx) => (
                        <Badge key={`ingredient-${idx}`} variant="outline" className="border-[#FDD360] text-gray-700 bg-[#FDD360]/20">
                          #{tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {situationTags.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">상황</p>
                    <div className="flex flex-wrap gap-2">
                      {situationTags.map((tag, idx) => (
                        <Badge key={`situation-${idx}`} variant="secondary" className="bg-[#FDD360] text-gray-900 border-[#FDD360]">
                          #{tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}