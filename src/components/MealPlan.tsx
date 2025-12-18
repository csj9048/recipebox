import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Recipe } from '../types/recipe';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const MEALS = ['아침', '점심', '저녁'];

interface MealItem {
  day: number; // 0-6 (월-일)
  meal: number; // 0-2 (아침-점심-저녁)
  recipeId: string;
  recipeName: string;
}

interface MealPlanProps {
  recipeToAdd?: Recipe | null;
  onSlotSelected?: (day: number, meal: number) => void;
}

export function MealPlan({ recipeToAdd, onSlotSelected }: MealPlanProps) {
  const [mealPlan, setMealPlan] = useState<MealItem[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);

  // Load meal plan from localStorage on mount and when returning to this tab
  useEffect(() => {
    const loadMealPlan = () => {
      const saved = localStorage.getItem('mealPlan');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setMealPlan(parsed);
        } catch (e) {
          console.error('Failed to load meal plan:', e);
        }
      }
    };
    
    loadMealPlan();
    setInitialLoad(false);
  }, []); // Re-run when component mounts

  // Save meal plan to localStorage whenever it changes (but skip initial load)
  useEffect(() => {
    if (!initialLoad) {
      localStorage.setItem('mealPlan', JSON.stringify(mealPlan));
    }
  }, [mealPlan, initialLoad]);

  const getMealForSlot = (day: number, meal: number) => {
    return mealPlan.find(item => item.day === day && item.meal === meal);
  };

  const handleSlotClick = (day: number, meal: number) => {
    if (recipeToAdd && onSlotSelected) {
      // If in "add mode", add the recipe to this slot
      const newMealItem: MealItem = {
        day,
        meal,
        recipeId: recipeToAdd.id,
        recipeName: recipeToAdd.title || '제목 없음',
      };
      
      // Replace if already exists, otherwise add
      const filtered = mealPlan.filter(item => !(item.day === day && item.meal === meal));
      setMealPlan([...filtered, newMealItem]);
      
      // Call the callback to go back
      onSlotSelected(day, meal);
    }
  };

  return (
    <div className="bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        {/* Header content */}
        <div className="px-4 py-3">
          <h1 className="text-center" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
            이번 주 식단
          </h1>
        </div>
      </div>

      {/* Content - no internal scroll, just flows */}
      <div className="p-4 pb-24">
        {recipeToAdd && (
          <div className="mb-4 p-4 bg-[#FDD360]/20 border border-[#FDD360]/40 rounded-lg">
            <p className="text-sm text-center text-gray-700">
              <span className="font-medium">{recipeToAdd.title}</span>을(를) 추가할<br />
              요일과 식사를 선택해주세요
            </p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Meal plan grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 z-10 w-16 p-2 border-r border-b border-gray-200"></th>
                  {MEALS.map((meal, idx) => (
                    <th 
                      key={idx}
                      className="p-3 border-b border-gray-200 text-center"
                      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
                    >
                      {meal}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dayIdx) => (
                  <tr key={dayIdx} className="hover:bg-gray-50/50 transition-colors">
                    <td 
                      className="sticky left-0 bg-white z-10 p-3 border-r border-b border-gray-200 text-center font-medium"
                      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
                    >
                      {day}
                    </td>
                    {MEALS.map((_, mealIdx) => {
                      const mealItem = getMealForSlot(dayIdx, mealIdx);
                      
                      return (
                        <td 
                          key={mealIdx}
                          className="p-2 border-b border-gray-200 align-top"
                        >
                          {mealItem ? (
                            <div 
                              className={`min-h-[60px] bg-[#FDD360]/10 rounded p-2 border border-[#FDD360]/30 ${recipeToAdd ? 'cursor-pointer hover:bg-[#FDD360]/20' : ''}`}
                              onClick={() => handleSlotClick(dayIdx, mealIdx)}
                            >
                              <p className="text-sm line-clamp-2">{mealItem.recipeName}</p>
                            </div>
                          ) : (
                            <button 
                              className="w-full min-h-[60px] border-2 border-dashed border-gray-200 rounded hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center"
                              onClick={() => handleSlotClick(dayIdx, mealIdx)}
                            >
                              <Plus className="size-5 text-gray-400" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Helper text */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            레시피 상세 페이지에서 "식단에 추가하기"를 눌러<br />
            이번 주 요리 계획을 세워보세요
          </p>
        </div>
      </div>
    </div>
  );
}