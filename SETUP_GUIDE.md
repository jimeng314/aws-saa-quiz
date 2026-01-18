# AWS SAA Quiz - 설정 가이드

팀 스터디를 위한 Google Sheets 연동 및 슬랙 알림 설정 가이드입니다.

---

## 1. Google Spreadsheet 설정

### 1.1 새 스프레드시트 생성
1. [Google Sheets](https://sheets.google.com) 접속
2. **새 스프레드시트** 생성
3. 이름 지정 (예: "AWS SAA Quiz 기록")
4. URL에서 **스프레드시트 ID** 복사
   ```
   https://docs.google.com/spreadsheets/d/[이 부분이 ID]/edit
   ```

### 1.2 사용자목록 시트 생성
1. 시트 이름을 `사용자목록`으로 변경
2. 첫 행에 헤더 입력:

| A | B | C | D | E |
|---|---|---|---|---|
| 이름 | 슬랙ID | 등록일 | 알림설정 | 목표(문제/일) |

3. 사용자 추가:

| 이름 | 슬랙ID | 등록일 | 알림설정 | 목표(문제/일) |
|-----|-------|--------|---------|-------------|
| 홍길동 | U01ABC123 | 2025-01-18 | ON | 10 |
| 김철수 | U02DEF456 | 2025-01-18 | ON | 5 |

> **슬랙ID 찾기**: Slack에서 사용자 프로필 → `...` → "멤버 ID 복사"

---

## 2. Google Apps Script 설정

### 2.1 Apps Script 열기
1. 스프레드시트에서 **확장 프로그램 → Apps Script** 클릭
2. 기존 코드 삭제

### 2.2 코드 복사
1. [google-apps-script.js](./google-apps-script.js) 내용 전체 복사
2. Apps Script 에디터에 붙여넣기

### 2.3 설정 수정
코드 상단 설정 부분 수정:
```javascript
const SPREADSHEET_ID = '여기에_스프레드시트_ID_입력';
const SLACK_WEBHOOK_URL = '여기에_슬랙_웹훅_URL_입력'; // 나중에 설정
```

### 2.4 초기화 실행
1. 함수 드롭다운에서 `initializeSheets` 선택
2. **실행** 클릭
3. 권한 요청 시 **권한 검토 → 고급 → (프로젝트명)(으)로 이동 → 허용**

### 2.5 웹 앱 배포
1. **배포 → 새 배포** 클릭
2. 설정:
   - 유형: **웹 앱**
   - 설명: "AWS SAA Quiz API"
   - 실행 주체: **나**
   - 액세스 권한: **모든 사용자**
3. **배포** 클릭
4. **웹 앱 URL 복사** (중요!)

```
https://script.google.com/macros/s/AKfycbx.../exec
```

---

## 3. 퀴즈 앱 연동

### 3.1 API URL 설정
`index.html` 파일에서 수정:
```javascript
// 변경 전
const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

// 변경 후
const API_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
```

### 3.2 GitHub Pages 배포
```bash
git add index.html
git commit -m "feat: API URL 설정"
git push origin main

# gh-pages 브랜치에 반영
git checkout gh-pages
git merge main
git push origin gh-pages
git checkout main
```

### 3.3 테스트
1. https://[username].github.io/aws-saa-quiz/ 접속
2. 사용자 선택 모달에서 이름 확인
3. 문제 풀고 스프레드시트에 기록 확인

---

## 4. 슬랙 연동 (선택)

### 4.1 Slack App 생성
1. https://api.slack.com/apps 접속
2. **Create New App → From scratch**
3. App Name: "AWS SAA Quiz Bot"
4. Workspace 선택 → **Create App**

### 4.2 Webhook 설정
1. **Incoming Webhooks** → **On**
2. **Add New Webhook to Workspace**
3. 알림 받을 채널 선택 (예: #aws-study)
4. **Webhook URL 복사**

### 4.3 Apps Script에 Webhook 설정
```javascript
const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T.../B.../...';
```

### 4.4 트리거 설정
1. Apps Script에서 함수 선택: `setupTriggers`
2. **실행** 클릭
3. 설정되는 트리거:
   - **주간 리포트**: 매주 월요일 오전 10시
   - **격려 알림**: 매일 오전 9시 (3일 이상 미접속자)

### 4.5 테스트
1. 함수 선택: `sendWeeklyReport`
2. **실행** → 슬랙 채널 확인

---

## 5. 시트 구조

### 자동 생성 시트

| 시트 | 용도 |
|------|------|
| 사용자목록 | 사용자 관리 (수동 입력) |
| 전체요약 | 사용자별 통계 (자동) |
| 서비스별요약 | AWS 서비스별 분석 (자동) |
| {사용자이름} | 개인별 풀이 기록 (자동) |

### 개인 기록 시트 컬럼 (17개)

| 컬럼 | 내용 |
|------|------|
| 타임스탬프 | 풀이 시각 |
| 세션ID | 접속 세션 구분 |
| 풀이모드 | 순차/랜덤/오답복습/미풀이 |
| 문제ID | 문제 번호 |
| 문제내용 | 문제 전체 텍스트 |
| 선지 | A~E 선택지 (줄바꿈 구분) |
| 선택한 답 | 사용자 선택 |
| 정답 | 실제 정답 |
| 해설 | 문제 해설 (줄바꿈 구분) |
| 정답여부 | ✅ / ❌ |
| 문제유형 | 단일선택/복수선택 |
| AWS서비스 | 관련 서비스 (줄바꿈 구분) |
| 소요시간(초) | 풀이 시간 (소수점 2자리) |
| 시도횟수 | n번째 시도 |
| 요일 | 월~일 |
| 시간대 | 오전/오후/저녁/심야 |
| 누적정답률 | 해당 시점 정답률 |

---

## 6. 배포 업데이트

Apps Script 코드 수정 후:
1. 코드 저장
2. **배포 → 배포 관리**
3. 연필 아이콘 클릭 → 버전: **새 버전**
4. **배포**

> 새 버전으로 배포해야 변경사항이 반영됩니다!

---

## 7. 문제 해결

### "사용자 목록을 불러올 수 없습니다"
- Apps Script 배포 URL 확인
- 배포 설정에서 "모든 사용자" 접근 허용 확인
- 새 버전으로 재배포

### "저장 실패"
- 스프레드시트 권한 확인
- Apps Script 권한 재승인
- 브라우저 콘솔에서 에러 확인

### 슬랙 알림 안 옴
- Webhook URL 확인
- Apps Script 실행 로그 확인 (보기 → 실행)
- 트리거 설정 확인 (트리거 메뉴)

---

## 8. 파일 구조

```
aws-saa-quiz/
├── index.html              # 퀴즈 앱 (API_URL 설정)
├── questions.json          # 문제 데이터 (724문제)
├── google-apps-script.js   # Apps Script 코드 (복사용)
├── README.md               # 프로젝트 소개
└── SETUP_GUIDE.md          # 이 가이드
```
