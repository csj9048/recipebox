import { useState } from 'react';
import { RecipeList } from './components/RecipeList';
import { AddRecipe } from './components/AddRecipe';
import { RecipeDetail } from './components/RecipeDetail';
import { Toaster } from './components/ui/sonner';
import { Recipe } from './types/recipe';
import { toast } from 'sonner';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'list' | 'add' | 'edit' | 'detail'>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentPage('detail');
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentPage('edit');
  };

  const handleDeleteRecipe = (id: string) => {
    const saved = localStorage.getItem('recipes');
    if (saved) {
      const recipes = JSON.parse(saved);
      const updated = recipes.filter((r: Recipe) => r.id !== id);
      localStorage.setItem('recipes', JSON.stringify(updated));
      toast.success('레시피가 삭제되었습니다');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      {currentPage === 'list' ? (
        <RecipeList 
          onNavigateToAdd={() => setCurrentPage('add')}
          onViewRecipe={handleViewRecipe}
          onEditRecipe={handleEditRecipe}
        />
      ) : currentPage === 'add' ? (
        <AddRecipe onNavigateToList={() => setCurrentPage('list')} />
      ) : currentPage === 'edit' ? (
        selectedRecipe && (
          <AddRecipe 
            onNavigateToList={() => setCurrentPage('list')}
            editingRecipe={selectedRecipe}
          />
        )
      ) : (
        selectedRecipe && (
          <RecipeDetail 
            recipe={selectedRecipe}
            onBack={() => setCurrentPage('list')}
            onEdit={handleEditRecipe}
            onDelete={handleDeleteRecipe}
          />
        )
      )}
    </div>
  );
}