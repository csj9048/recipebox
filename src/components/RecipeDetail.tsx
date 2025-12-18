import { Recipe } from '../types/recipe';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ChevronLeft, MoreVertical, Edit, Trash2, ChevronRight, Calendar } from 'lucide-react';
import { useState } from 'react';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onAddToMealPlan?: () => void;
}

export function RecipeDetail({ recipe, onBack, onEdit, onDelete, onAddToMealPlan }: RecipeDetailProps) {
  const situationTags = recipe.tags.filter(t => t.type === 'situation');
  const ingredientTags = recipe.tags.filter(t => t.type === 'ingredient');
  const [showMenu, setShowMenu] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageCollapsed, setImageCollapsed] = useState(true); // Start collapsed by default

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
  
  // Check if thumbnail exists and is a valid URL (not empty, null, or placeholder)
  const hasValidThumbnail = recipe.thumbnail_url && 
    recipe.thumbnail_url.trim() !== '' &&
    recipe.thumbnail_url !== 'null' &&
    recipe.thumbnail_url.startsWith('http');

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
    <div className="bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        {/* Header content */}
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

      {/* Content - no internal scroll, just flows */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
        <Card className="border-0 shadow-none rounded-none bg-white">
          {/* Show thumbnail only if it exists and is not empty */}
          {hasValidThumbnail && (
            <div className="w-full overflow-hidden bg-gray-50">
              <img
                src={recipe.thumbnail_url}
                alt={recipe.title || '레시피'}
                className="w-full max-h-96 object-contain"
              />
            </div>
          )}
          <CardContent className={`space-y-6 ${!hasValidThumbnail ? 'pt-6' : ''}`}>
            <div>
              <div className="whitespace-pre-wrap text-gray-700">
                {recipe.body_text || ''}
              </div>
              {imageUrls.length > 0 && (
                <div className="mt-4">
                  {imageCollapsed ? (
                    <button
                      type="button"
                      onClick={() => setImageCollapsed(false)}
                      className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      이미지 펼치기
                    </button>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      <div className="relative pb-10">
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
                        
                        {/* Collapse button at the bottom */}
                        <button
                          type="button"
                          onClick={() => setImageCollapsed(true)}
                          className="absolute bottom-0 left-0 right-0 w-full py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm"
                        >
                          이미지 접기
                        </button>
                      </div>
                    </div>
                  )}
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
                        <Badge key={`situation-${idx}`} variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">
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
        
        {/* Add to meal plan button - fixed at bottom */}
        {onAddToMealPlan && (
          <div className="p-4 bg-white border-t border-gray-200">
            <Button 
              onClick={onAddToMealPlan}
              className="w-full bg-[#FDD360] hover:bg-[#FDD360]/90 text-gray-900"
            >
              <Calendar className="size-4 mr-2" />
              식단에 추가하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}