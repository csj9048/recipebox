import { ChevronRight, Info, Settings, HelpCircle, Mail } from 'lucide-react';

export function MyPage() {
  const menuItems = [
    { icon: Settings, label: '설정', onClick: () => console.log('Settings') },
    { icon: Info, label: '앱 정보', onClick: () => console.log('App Info') },
    { icon: HelpCircle, label: '도움말', onClick: () => console.log('Help') },
    { icon: Mail, label: '문의하기', onClick: () => console.log('Contact') },
  ];

  return (
    <div className="bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        {/* Header content */}
        <div className="px-4 py-3">
          <h1 className="text-center" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
            MY
          </h1>
        </div>
      </div>

      {/* Content - no internal scroll, just flows */}
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#FDD360] rounded-full flex items-center justify-center">
              <span className="text-2xl">👨‍🍳</span>
            </div>
            <div>
              <h2 className="font-semibold mb-1" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
                요리 초보
              </h2>
              <p className="text-sm text-gray-500">RecipeBox 유저</p>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={item.onClick}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-5 text-gray-500" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="size-5 text-gray-400" />
              </button>
            );
          })}
        </div>

        {/* App version */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>RecipeBox v1.0.0</p>
        </div>
      </div>
    </div>
  );
}