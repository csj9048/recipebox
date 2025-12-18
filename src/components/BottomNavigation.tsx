import { ChefHat, Calendar, ShoppingCart, User } from 'lucide-react';

type TabType = 'recipe' | 'meal' | 'shopping' | 'my';

interface BottomNavigationProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomNavigation({ currentTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: 'recipe' as TabType, label: '레시피', icon: ChefHat },
    { id: 'meal' as TabType, label: '식단', icon: Calendar },
    { id: 'shopping' as TabType, label: '장보기', icon: ShoppingCart },
    { id: 'my' as TabType, label: 'MY', icon: User },
  ];

  return (
    <div className="bg-white border-t border-gray-200">
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 transition-colors ${
                isActive 
                  ? 'text-[#FDD360]' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className={`size-6 mb-1 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              <span className={`text-xs ${isActive ? 'font-semibold' : 'font-normal'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}