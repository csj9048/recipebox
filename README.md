# RecipeBox - React Native 앱

레시피 관리 네이티브 앱입니다. React Native (Expo)로 구현되었습니다.

## 기능

- 레시피 리스트 조회 및 검색
- 레시피 상세 보기
- 레시피 추가/수정
- 이미지 업로드 및 AI 분석
- 해시태그 관리 (재료별, 상황별)

## 시작하기

### 필수 요구사항

- Node.js 18+
- npm/yarn/pnpm
- Expo CLI (`npm install -g expo-cli` 또는 `npx expo`)
- iOS 개발: Xcode (Mac만)
- Android 개발: Android Studio

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm start

# iOS 시뮬레이터에서 실행
npm run ios

# Android 에뮬레이터에서 실행
npm run android
```

### 실기기 테스트

1. Expo Go 앱 설치 (iOS App Store 또는 Google Play)
2. 개발 서버 실행 후 QR 코드 스캔

## 프로젝트 구조

```
native/
├── app/                    # Expo Router 라우트
│   ├── (tabs)/            # 탭 네비게이션
│   ├── add.tsx            # 레시피 추가
│   └── detail/[id].tsx     # 레시피 상세
├── components/            # 재사용 가능한 컴포넌트
│   ├── RecipeList.tsx
│   ├── RecipeCard.tsx
│   ├── RecipeDetail.tsx
│   └── AddRecipe.tsx
├── types/                 # TypeScript 타입 정의
│   └── recipe.ts
├── utils/                 # 유틸리티 함수
│   └── supabase/          # Supabase 클라이언트
├── constants/             # 상수
│   └── Colors.ts
└── assets/                # 이미지, 폰트 등
```

## 주요 라이브러리

- **expo-router**: 파일 기반 라우팅
- **@supabase/supabase-js**: Supabase 클라이언트
- **expo-image**: 이미지 최적화 로딩
- **expo-image-picker**: 이미지 선택/촬영
- **expo-file-system**: 파일 시스템 접근
- **react-native-toast-message**: 토스트 알림
- **@expo/vector-icons**: 아이콘

## 환경 설정

Supabase 설정은 `utils/supabase/info.tsx`에 있습니다.

## 빌드

```bash
# iOS 빌드
eas build --platform ios

# Android 빌드
eas build --platform android
```

## 라이선스

Private

