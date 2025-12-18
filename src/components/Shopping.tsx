import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';

interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
}

export function Shopping() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([...items, {
        id: Date.now().toString(),
        name: newItem.trim(),
        checked: false,
      }]);
      setNewItem('');
    }
  };

  const handleToggleItem = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  const uncheckedItems = items.filter(item => !item.checked);
  const checkedItems = items.filter(item => item.checked);

  return (
    <div className="bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        {/* Header content */}
        <div className="px-4 py-3">
          <h1 className="text-center" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
            장보기
          </h1>
        </div>
      </div>

      {/* Content - no internal scroll, just flows */}
      <div className="max-w-2xl mx-auto p-4 pb-24">
        {/* Add item section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="필요한 재료를 입력하세요"
              className="flex-1"
            />
            <Button onClick={handleAddItem} size="sm">
              <Plus className="size-4 mr-1" />
              추가
            </Button>
          </div>
        </div>

        {/* Shopping list */}
        <div className="bg-white rounded-lg shadow-sm">
          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>장보기 목록이 비어있습니다</p>
              <p className="text-sm mt-2">위에서 재료를 추가해보세요</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Unchecked items */}
              {uncheckedItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => handleToggleItem(item.id)}
                    id={`item-${item.id}`}
                  />
                  <label
                    htmlFor={`item-${item.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    {item.name}
                  </label>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Trash2 className="size-4 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              ))}

              {/* Checked items */}
              {checkedItems.length > 0 && (
                <>
                  {uncheckedItems.length > 0 && (
                    <div className="px-4 py-2 bg-gray-50">
                      <p className="text-xs text-gray-500">완료한 항목</p>
                    </div>
                  )}
                  {checkedItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => handleToggleItem(item.id)}
                        id={`item-${item.id}`}
                      />
                      <label
                        htmlFor={`item-${item.id}`}
                        className="flex-1 cursor-pointer line-through text-gray-400"
                      >
                        {item.name}
                      </label>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <Trash2 className="size-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        {items.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            {checkedItems.length}/{items.length} 항목 완료
          </div>
        )}
      </div>
    </div>
  );
}