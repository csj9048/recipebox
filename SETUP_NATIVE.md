# 📱 네이티브 앱 설정 가이드

## 1️⃣ iOS (Xcode) 설정

### 사전 준비
- macOS 필요
- Xcode 설치 (App Store에서)
- CocoaPods 설치: `sudo gem install cocoapods`

### 설정 단계

```bash
# 1. 프로젝트 빌드
npm run build

# 2. iOS 플랫폼 추가 (최초 1회만)
npx cap add ios

# 3. 웹 코드를 네이티브로 동기화
npx cap sync ios

# 4. Xcode에서 열기
npm run cap:open:ios
# 또는
npx cap open ios
```

### Xcode에서 실행
1. Xcode가 열리면 상단에서 시뮬레이터 선택 (예: iPhone 15)
2. ▶️ 버튼 클릭하여 실행
3. 실제 기기 테스트 시 Apple Developer 계정 필요

---

## 2️⃣ Android (Android Studio) 설정

### 사전 준비
- Android Studio 설치 (https://developer.android.com/studio)
- Java JDK 17 설치

### 설정 단계

```bash
# 1. 프로젝트 빌드
npm run build

# 2. Android 플랫폼 추가 (최초 1회만)
npx cap add android

# 3. 웹 코드를 네이티브로 동기화
npx cap sync android

# 4. Android Studio에서 열기
npm run cap:open:android
# 또는
npx cap open android
```

### Android Studio에서 실행
1. Android Studio가 열리고 Gradle 동기화 완료 대기
2. 상단 도구 모음에서 기기 선택 (AVD 또는 실제 기기)
3. ▶️ Run 버튼 클릭

---

## 🔄 코드 수정 후 동기화

웹 코드를 수정했을 때:

```bash
# 1. 빌드
npm run build

# 2. 네이티브 플랫폼에 동기화
npm run cap:sync
# 또는 개별 플랫폼
npx cap sync ios
npx cap sync android

# 3. 네이티브 앱 새로고침 (Xcode/Android Studio에서 재실행)
```

---

## 📝 주요 명령어 정리

| 명령어 | 설명 |
|--------|------|
| `npm run build` | 웹 앱 빌드 |
| `npm run cap:sync` | iOS & Android 동기화 |
| `npm run cap:open:ios` | Xcode 열기 |
| `npm run cap:open:android` | Android Studio 열기 |
| `npm run cap:run:ios` | iOS 시뮬레이터에서 실행 |
| `npm run cap:run:android` | Android 에뮬레이터에서 실행 |

---

## ⚠️ 문제 해결

### iOS 빌드 오류
```bash
cd ios/App
pod install
cd ../..
npx cap sync ios
```

### Android Gradle 오류
- Android Studio에서 `File > Invalidate Caches / Restart`
- `android/` 폴더 삭제 후 `npx cap add android` 재실행

### 변경사항이 반영 안 될 때
```bash
npm run build
npx cap copy
npx cap sync
```
