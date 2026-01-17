# AWS SAA Quiz - Google Sheets 연동 설정 가이드

## 1. Google Spreadsheet 설정

### 1.1 스프레드시트 열기
- URL: https://docs.google.com/spreadsheets/d/146VfL2XxlXdJsUMad4WixRbXVhoINJCCC3XoBdCGwtg/edit

### 1.2 사용자목록 시트 생성
1. 하단의 `+` 버튼 클릭하여 새 시트 추가
2. 시트 이름을 `사용자목록`으로 변경
3. 아래 헤더 입력:

| A | B | C | D | E |
|---|---|---|---|---|
| 이름 | 슬랙ID | 등록일 | 알림설정 | 목표(문제/일) |

4. 사용자 추가 예시:

| 이름 | 슬랙ID | 등록일 | 알림설정 | 목표(문제/일) |
|-----|-------|--------|---------|-------------|
| 홍길동 | U01ABC123 | 2024-01-17 | ON | 10 |
| 김철수 | U02DEF456 | 2024-01-17 | ON | 5 |

**슬랙ID 찾는 방법:**
1. Slack에서 해당 사용자 프로필 클릭
2. `...` 메뉴 → "멤버 ID 복사"

---

## 2. Google Apps Script 설정

### 2.1 Apps Script 열기
1. 스프레드시트에서 **확장 프로그램 → Apps Script** 클릭
2. 기존 코드가 있다면 모두 삭제

### 2.2 코드 붙여넣기
1. `google-apps-script.js` 파일의 전체 내용을 복사
2. Apps Script 에디터에 붙여넣기

### 2.3 설정 수정
코드 상단의 설정 부분 확인:
```javascript
const SPREADSHEET_ID = '146VfL2XxlXdJsUMad4WixRbXVhoINJCCC3XoBdCGwtg';
const SLACK_WEBHOOK_URL = 'YOUR_SLACK_WEBHOOK_URL_HERE'; // 나중에 설정
```

### 2.4 초기 시트 생성
1. 함수 선택 드롭다운에서 `initializeSheets` 선택
2. **실행** 버튼 클릭
3. 권한 요청 시 **권한 검토 → 허용**

### 2.5 웹 앱 배포
1. **배포 → 새 배포** 클릭
2. 설정:
   - 유형: **웹 앱**
   - 설명: "AWS SAA Quiz API"
   - 실행 주체: **나**
   - 액세스 권한: **모든 사용자**
3. **배포** 클릭
4. **웹 앱 URL 복사** (중요!)

예시 URL:
```
https://script.google.com/macros/s/AKfycbx.../exec
```

---

## 3. 퀴즈 앱 설정

### 3.1 API URL 설정
`index.html` 파일에서 아래 부분 수정:

```javascript
// 변경 전
const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

// 변경 후
const API_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
```

### 3.2 테스트
1. `index.html`을 브라우저에서 열기
2. 사용자 선택 모달에서 이름이 표시되는지 확인
3. 문제를 풀고 스프레드시트에 기록되는지 확인

---

## 4. 슬랙 연동 설정 (선택)

### 4.1 Slack Webhook 생성
1. https://api.slack.com/apps 접속
2. **Create New App → From scratch**
3. App Name: "AWS SAA Quiz Bot"
4. Workspace 선택 → Create App
5. **Incoming Webhooks** → On으로 변경
6. **Add New Webhook to Workspace** 클릭
7. 알림 받을 채널 선택 (예: #aws-study)
8. **Webhook URL 복사**

### 4.2 Webhook URL 설정
Apps Script 코드의 설정 부분 수정:
```javascript
const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T.../B.../...';
```

### 4.3 트리거 설정
1. Apps Script 에디터에서 함수 선택: `setupTriggers`
2. **실행** 클릭
3. 설정되는 트리거:
   - 주간 리포트: 매주 월요일 오전 10시
   - 격려 알림: 매일 오전 9시 (3일 이상 미접속자)

### 4.4 테스트
1. 함수 선택: `sendWeeklyReport`
2. **실행** → 슬랙 채널에 메시지 확인

---

## 5. 시트 구조 요약

### 자동 생성되는 시트

| 시트 이름 | 용도 |
|----------|------|
| 사용자목록 | 사용자 관리 (수동 입력) |
| 전체요약 | 전체 사용자 통계 (자동 갱신) |
| 서비스별요약 | AWS 서비스별 분석 (자동 갱신) |
| {사용자이름} | 개인별 풀이 기록 (자동 생성) |

### 개인 기록 시트 컬럼 (15개)

| 컬럼 | 설명 |
|-----|------|
| 타임스탬프 | 문제 푼 시각 |
| 세션ID | 접속 세션 구분 |
| 풀이모드 | 순차/랜덤/오답복습/미풀이 |
| 문제ID | 문제 번호 |
| 문제내용 | 문제 텍스트 (100자) |
| 문제유형 | 단일선택/복수선택 |
| AWS서비스 | 관련 서비스 태그 |
| 선택한 답 | 사용자 선택 |
| 정답 | 실제 정답 |
| 정답여부 | ✅ / ❌ |
| 소요시간(초) | 풀이 시간 |
| 시도횟수 | n번째 시도 |
| 요일 | 월~일 |
| 시간대 | 오전/오후/저녁/심야 |
| 누적정답률 | 해당 시점 정답률 |

---

## 6. 문제 해결

### API 연결 실패
- 스프레드시트 공유 설정 확인 (링크가 있는 모든 사용자 - 보기 가능)
- Apps Script 배포 설정 확인 (모든 사용자 접근 허용)
- 브라우저 콘솔에서 에러 메시지 확인

### 슬랙 알림 안 옴
- Webhook URL 확인
- Apps Script 실행 로그 확인 (보기 → 실행 로그)
- 트리거 설정 확인 (트리거 → 현재 프로젝트의 트리거)

### 데이터 저장 안 됨
- 스프레드시트 권한 확인
- Apps Script 권한 재승인 시도
- 브라우저 개발자 도구 Network 탭에서 요청/응답 확인

---

## 7. 배포 업데이트

코드 수정 후:
1. Apps Script 에디터에서 코드 저장
2. **배포 → 배포 관리**
3. 연필 아이콘 클릭 → 버전: **새 버전**
4. **배포**

---

## 파일 구조

```
aws-saa-quiz/
├── index.html              # 퀴즈 앱 (API_URL 설정 필요)
├── questions.json          # 문제 데이터 (services 태그 포함)
├── google-apps-script.js   # Apps Script 코드 (복사용)
├── preview.html            # UI 미리보기 (개발용)
└── SETUP_GUIDE.md          # 이 가이드
```
