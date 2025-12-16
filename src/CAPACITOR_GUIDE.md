# RecipeBox - Capacitor 앱 빌드 가이드

RecipeBox 웹 앱을 iOS/Android 네이티브 앱으로 빌드하는 방법을 안내합니다.

## 📋 사전 준비 사항

### 공통 요구사항
- **Node.js** 18 이상 설치
- **npm** 또는 **pnpm** 패키지 매니저

### iOS 앱 빌드 (macOS만 가능)
- **Xcode** 14 이상 설치
- **CocoaPods** 설치: `sudo gem install cocoapods`
- Apple Developer 계정 (앱 스토어 배포 시 필요)

### Android 앱 빌드
- **Android Studio** 설치
- **JDK** 11 이상 설치
- **Android SDK** (Android Studio를 통해 설치)

---

## 🚀 빌드 단계

### 1단계: 의존성 설치

```bash
npm install
# 또는
pnpm install
```

### 2단계: 웹 앱 빌드

```bash
npm run build
```

이 명령어는 Vite를 사용하여 웹 앱을 `dist` 폴더에 빌드합니다.

### 3단계: Capacitor 초기화 (최초 1회만)

플랫폼을 추가합니다:

```bash
# iOS 플랫폼 추가
npx cap add ios

# Android 플랫폼 추가
npx cap add android
```

### 4단계: 네이티브 프로젝트에 동기화

웹 앱을 빌드한 후, 변경사항을 네이티브 프로젝트에 동기화합니다:

```bash
npm run cap:sync
```

이 명령어는:
- 웹 빌드 결과물을 네이티브 프로젝트에 복사
- 네이티브 플러그인 설치 및 업데이트
- Capacitor 설정 동기화

---

## 📱 iOS 앱 실행 및 빌드

### 개발 중 실행

```bash
# Xcode 열기
npm run cap:open:ios

# 또는 직접 실행
npm run cap:run:ios
```

Xcode에서:
1. 상단 타겟 디바이스 선택 (시뮬레이터 또는 실제 기기)
2. 실제 기기 사용 시: **Signing & Capabilities** 탭에서 개발 팀 선택
3. ▶️ 버튼을 눌러 앱 실행

### 앱 스토어 배포 빌드

1. Xcode에서 **Product > Archive** 선택
2. Organizer에서 앱 업로드 또는 내보내기
3. TestFlight 또는 App Store Connect에 업로드

---

## 🤖 Android 앱 실행 및 빌드

### 개발 중 실행

```bash
# Android Studio 열기
npm run cap:open:android

# 또는 직접 실행
npm run cap:run:android
```

Android Studio에서:
1. 상단 타겟 디바이스 선택 (에뮬레이터 또는 실제 기기)
2. ▶️ 버튼을 눌러 앱 실행

### APK/AAB 빌드 (배포용)

Android Studio에서:
1. **Build > Generate Signed Bundle / APK** 선택
2. **Android App Bundle (AAB)** 선택 (Play 스토어용)
3. 키스토어 생성 또는 기존 키스토어 선택
4. 빌드 타입 선택 (Release)
5. 빌드 완료 후 `android/app/release/` 폴더에 생성됨

---

## 🎨 앱 아이콘 및 스플래시 스크린 설정

### 1. 아이콘 및 스플래시 이미지 준비

- **앱 아이콘**: 1024x1024 PNG (투명 배경 없음)
- **스플래시 스크린**: 2732x2732 PNG (중앙 배치)

이미지를 준비한 후:
- `/public/icon.png` - 앱 아이콘
- `/public/splash.png` - 스플래시 스크린

### 2. 리소스 자동 생성 (권장)

```bash
# Cordova Res 설치
npm install -g cordova-res

# 리소스 생성
cordova-res ios --skip-config --copy
cordova-res android --skip-config --copy
```

이 명령어는 자동으로 모든 해상도의 아이콘과 스플래시 스크린을 생성합니다.

---

## ⚙️ 주요 설정 파일

### `capacitor.config.ts`
앱의 기본 설정을 담고 있습니다:
- `appId`: 앱의 고유 식별자 (예: com.recipebox.app)
- `appName`: 앱 이름
- `webDir`: 웹 빌드 결과물 경로

### iOS 권한 설정
`ios/App/App/Info.plist`에서 카메라, 사진 라이브러리 권한 추가:

```xml
<key>NSCameraUsageDescription</key>
<string>레시피 사진을 촬영하기 위해 카메라 접근이 필요합니다.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>레시피 사진을 업로드하기 위해 사진 라이브러리 접근이 필요합니다.</string>
```

### Android 권한 설정
`android/app/src/main/AndroidManifest.xml`에서 권한 추가:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

---

## 🔄 개발 워크플로우

### 코드 변경 후 앱 업데이트

1. 웹 앱 수정
2. 빌드 및 동기화:
```bash
npm run build && npm run cap:sync
```
3. 네이티브 앱 새로고침 (Hot Reload는 지원되지 않음)

### Live Reload 사용 (개발 시)

개발 서버를 통해 실시간 업데이트:

```bash
# 개발 서버 시작
npm run dev
```

그 다음 `capacitor.config.ts`에서 임시로 서버 URL 추가:

```typescript
server: {
  url: 'http://localhost:3000',
  cleartext: true
}
```

⚠️ **중요**: 배포 전에는 이 설정을 제거해야 합니다!

---

## 📝 체크리스트

### 배포 전 확인사항

- [ ] `capacitor.config.ts`의 `appId`와 `appName` 확인
- [ ] 앱 아이콘과 스플래시 스크린 설정
- [ ] iOS: Signing & Capabilities 설정
- [ ] Android: 키스토어 생성 및 서명
- [ ] 필요한 권한 설정 (카메라, 파일 시스템)
- [ ] 환경변수 설정 (Supabase URL, API 키 등)
- [ ] 프로덕션 빌드 테스트

---

## 🆘 문제 해결

### "Command not found: cap"
```bash
npm install -g @capacitor/cli
```

### iOS 빌드 오류
```bash
cd ios/App
pod install
cd ../..
npm run cap:sync
```

### Android Gradle 오류
Android Studio에서:
- **File > Invalidate Caches / Restart**
- Gradle 동기화 재실행

### 플러그인 업데이트
```bash
npm install @capacitor/core@latest @capacitor/cli@latest
npm run cap:sync
```

---

## 📚 추가 리소스

- [Capacitor 공식 문서](https://capacitorjs.com/docs)
- [iOS 배포 가이드](https://capacitor.ionicframework.com/docs/ios)
- [Android 배포 가이드](https://capacitor.ionicframework.com/docs/android)
- [Capacitor 플러그인](https://capacitorjs.com/docs/plugins)

---

## 💡 다음 단계

1. **의존성 설치**: `npm install`
2. **웹 빌드**: `npm run build`
3. **플랫폼 추가**: `npx cap add ios` 또는 `npx cap add android`
4. **동기화**: `npm run cap:sync`
5. **앱 실행**: `npm run cap:open:ios` 또는 `npm run cap:open:android`

앱 빌드 과정에서 문제가 발생하면 위의 문제 해결 섹션을 참고하세요!
