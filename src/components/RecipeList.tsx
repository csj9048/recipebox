import { useState, useEffect } from 'react';
import { Recipe } from '../types/recipe';
import { RecipeCard } from './RecipeCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';
import headerImage from 'figma:asset/00946ef853f4fe09007f5858a221b0c61332771f.png';

interface RecipeListProps {
  onNavigateToAdd: () => void;
  onViewRecipe: (recipe: Recipe) => void;
  onEditRecipe: (recipe: Recipe) => void;
}

export function RecipeList({ onNavigateToAdd, onViewRecipe, onEditRecipe }: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading recipes from Supabase:', error);
        toast.error('레시피를 불러오는데 실패했습니다');
        return;
      }

      setRecipes(data || []);
    } catch (err) {
      console.error('Error loading recipes:', err);
      toast.error('레시피를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting recipe:', error);
        toast.error('레시피 삭제에 실패했습니다');
        return;
      }

      setRecipes(recipes.filter((r) => r.id !== id));
      toast.success('레시피가 삭제되었습니다');
    } catch (err) {
      console.error('Error deleting recipe:', err);
      toast.error('레시피 삭제에 실패했습니다');
    }
  };

  const filteredRecipes = recipes.filter((recipe) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase().replace('#', '');
    
    // Filter by tags
    const matchesTags = recipe.tags.some((tag) => 
      tag.name.toLowerCase().includes(query)
    );
    
    // Filter by title
    const matchesTitle = recipe.title?.toLowerCase().includes(query);
    
    return matchesTags || matchesTitle;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-gray-50">
      {/* Header */}
      <div className="bg-[#FDD360] border-b border-gray-300 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 pb-0">
          <div className="flex items-end gap-1">
            <img src={headerImage} alt="Recipe" className="w-40 h-40 object-contain" style={{ marginBottom: '-4px' }} />
            <h1 className="pb-2" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, letterSpacing: '-0.025em', fontSize: '34px', color: '#2F2A25' }}>RecipeBox</h1>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <Input
              type="text"
              placeholder="해시태그로 검색 (예: #한끼요리, #오이)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 mb-4">
              {searchQuery ? '검색 결과가 없습니다' : '아직 저장된 레시피가 없습니다'}
            </p>
            {!searchQuery && (
              <Button onClick={onNavigateToAdd} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                <Plus className="size-4 mr-2" />
                첫 레시피 추가하기
              </Button>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onDelete={handleDelete}
                onView={onViewRecipe}
                onEdit={onEditRecipe}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none">
        <Button 
          onClick={onNavigateToAdd}
          className="pointer-events-auto bg-[#FDD360] hover:bg-[#FCC844] text-gray-900 shadow-lg rounded-full w-14 h-14 p-0"
        >
          <Plus className="size-6" />
        </Button>
      </div>
    </div>
  );
}