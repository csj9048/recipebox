# 🔧 Git 설정 가이드

## 1️⃣ 로컬 Git 초기화

```bash
# Git 저장소 초기화
git init

# 현재 상태 확인
git status
```

---

## 2️⃣ 첫 커밋

```bash
# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: RecipeBox 프로젝트 설정 완료"
```

---

## 3️⃣ GitHub 저장소 연결

### GitHub에서 저장소 생성
1. https://github.com 접속
2. 우측 상단 `+` 버튼 → `New repository` 클릭
3. Repository name: `recipebox-app` (또는 원하는 이름)
4. **"Initialize this repository with a README" 체크 해제** (중요!)
5. `Create repository` 버튼 클릭

### 로컬과 연결

```bash
# GitHub 저장소 URL 연결
git remote add origin https://github.com/YOUR_USERNAME/recipebox-app.git

# 메인 브랜치 이름 설정
git branch -M main

# 첫 푸시
git push -u origin main
```

> **YOUR_USERNAME**을 본인의 GitHub 사용자명으로 바꿔주세요!

---

## 4️⃣ 일반적인 Git 작업 흐름

```bash
# 1. 변경사항 확인
git status

# 2. 변경된 파일 추가
git add .
# 또는 특정 파일만
git add src/App.tsx components/RecipeList.tsx

# 3. 커밋
git commit -m "feat: 레시피 검색 기능 추가"

# 4. 푸시
git push
```

---

## 5️⃣ 유용한 Git 명령어

```bash
# 변경 내역 보기
git log --oneline

# 브랜치 생성 및 이동
git checkout -b feature/new-feature

# 원격 저장소에서 최신 코드 가져오기
git pull

# 변경사항 임시 저장
git stash
git stash pop

# 마지막 커밋 수정
git commit --amend -m "새로운 커밋 메시지"
```

---

## 📝 커밋 메시지 컨벤션

```bash
# 새 기능
git commit -m "feat: 이미지 캐러셀 기능 추가"

# 버그 수정
git commit -m "fix: 레시피 삭제 시 오류 해결"

# 문서 수정
git commit -m "docs: README 업데이트"

# 스타일 변경
git commit -m "style: 버튼 색상 변경"

# 리팩토링
git commit -m "refactor: API 호출 로직 개선"

# 테스트
git commit -m "test: 레시피 추가 테스트 작성"

# 설정 변경
git commit -m "chore: Capacitor 설정 업데이트"
```

---

## ⚠️ 주의사항

### 민감한 정보 커밋하지 않기
- `.env` 파일은 이미 `.gitignore`에 포함됨
- API 키, 비밀번호 등은 절대 커밋하지 말 것
- 실수로 커밋했다면:
  ```bash
  git rm --cached .env
  git commit -m "chore: .env 파일 제거"
  git push
  ```

### 이미 생성된 파일들
- ✅ `.gitignore` 파일 생성 완료
- ✅ `ios/`, `android/`, `node_modules/` 등 제외됨

---

## 🔗 추가 리소스

- Git 공식 문서: https://git-scm.com/doc
- GitHub 가이드: https://docs.github.com/ko
- Git 시각화 학습: https://learngitbranching.js.org/?locale=ko
