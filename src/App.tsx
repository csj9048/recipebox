import { useState } from 'react';
import { RecipeList } from './components/RecipeList';
import { AddRecipe } from './components/AddRecipe';
import { RecipeDetail } from './components/RecipeDetail';
import { MealPlan } from './components/MealPlan';
import { Shopping } from './components/Shopping';
import { MyPage } from './components/MyPage';
import { BottomNavigation } from './components/BottomNavigation';
import { Toaster } from './components/ui/sonner';
import { Recipe } from './types/recipe';
import { toast } from 'sonner';

type TabType = 'recipe' | 'meal' | 'shopping' | 'my';
type RecipePage = 'list' | 'add' | 'edit' | 'detail';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('recipe');
  const [recipePage, setRecipePage] = useState<RecipePage>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeToAddToMeal, setRecipeToAddToMeal] = useState<Recipe | null>(null);

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setRecipePage('detail');
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setRecipePage('edit');
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

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    // Reset recipe page to list when switching to recipe tab
    if (tab === 'recipe') {
      setRecipePage('list');
    }
    // Clear recipeToAddToMeal when leaving meal tab
    if (tab !== 'meal') {
      setRecipeToAddToMeal(null);
    }
  };

  const handleAddToMealPlan = () => {
    if (selectedRecipe) {
      setRecipeToAddToMeal(selectedRecipe);
      setCurrentTab('meal');
    }
  };

  const handleMealSlotSelected = (day: number, meal: number) => {
    toast.success('식단에 추가되었습니다');
    // Go back to recipe detail
    setRecipeToAddToMeal(null);
    setCurrentTab('recipe');
    setRecipePage('detail');
  };

  const renderContent = () => {
    // Recipe tab with its own sub-navigation
    if (currentTab === 'recipe') {
      if (recipePage === 'list') {
        return (
          <RecipeList 
            onNavigateToAdd={() => setRecipePage('add')}
            onViewRecipe={handleViewRecipe}
            onEditRecipe={handleEditRecipe}
          />
        );
      } else if (recipePage === 'add') {
        return <AddRecipe onNavigateToList={() => setRecipePage('list')} />;
      } else if (recipePage === 'edit' && selectedRecipe) {
        return (
          <AddRecipe 
            onNavigateToList={() => setRecipePage('list')}
            editingRecipe={selectedRecipe}
          />
        );
      } else if (recipePage === 'detail' && selectedRecipe) {
        return (
          <RecipeDetail 
            recipe={selectedRecipe}
            onBack={() => setRecipePage('list')}
            onEdit={handleEditRecipe}
            onDelete={handleDeleteRecipe}
            onAddToMealPlan={handleAddToMealPlan}
          />
        );
      }
    }

    // Other tabs
    if (currentTab === 'meal') {
      return <MealPlan onSlotSelected={handleMealSlotSelected} recipeToAdd={recipeToAddToMeal} />;
    }
    if (currentTab === 'shopping') {
      return <Shopping />;
    }
    if (currentTab === 'my') {
      return <MyPage />;
    }

    return null;
  };

  // Hide bottom navigation when in add/edit/detail pages
  const showBottomNav = currentTab !== 'recipe' || recipePage === 'list';
  const showFAB = currentTab === 'recipe' && recipePage === 'list';

  return (
    <>
      <div className="app-shell">
        <Toaster />
        
        {/* Safe area top - extends header background to notch */}
        <div className="app-safe-top" />
        
        {/* Main content area - only this scrolls */}
        <main className="app-main">
          {renderContent()}
        </main>
      </div>
      
      {/* FAB button for adding recipe - completely fixed, outside shell */}
      {showFAB && (
        <div className="app-fab">
          <button 
            onClick={() => setRecipePage('add')}
            className="bg-[#FDD360] hover:bg-[#FDD360]/90 text-gray-900 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors"
          >
            <span className="text-2xl leading-none">+</span>
          </button>
        </div>
      )}
      
      {/* Bottom navigation - completely fixed, outside shell */}
      {showBottomNav && (
        <div className="app-bottom">
          <BottomNavigation currentTab={currentTab} onTabChange={handleTabChange} />
        </div>
      )}
    </>
  );
}