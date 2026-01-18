# AWS SAA-C03 Quiz App

AWS Solution Architect Associate (SAA-C03) 자격증 시험 준비를 위한 팀 스터디 퀴즈 애플리케이션입니다.

## 주요 기능

### 문제 풀이
- **724개의 SAA-C03 문제** 수록
- **4가지 풀이 모드**: 순차 / 랜덤 / 오답복습 / 미풀이
- **상세 해설**: 각 문제별 해설 제공
- **AWS 서비스 태그**: 문제별 관련 서비스 표시

### 오답노트
- **오답 자동 수집**: 틀린 문제만 모아서 관리
- **서비스별 필터링**: EC2, S3 등 서비스별 오답 확인
- **정렬 옵션**: 오답 횟수순 / 최근 오답순 / 문제 번호순
- **바로 풀기**: 오답노트에서 해당 문제로 바로 이동

### 학습 기록 (Google Sheets 연동)
- **개인별 기록**: 사용자별 시트에 풀이 기록 저장
- **상세 데이터**: 문제내용, 선지, 해설, 소요시간 등 17개 항목
- **통계 자동 생성**: 전체 요약, 서비스별 분석
- **슬랙 알림**: 주간 리포트, 격려 알림 (선택)

## 기술 스택

- **Frontend**: Vue.js 3 (CDN), Vanilla JavaScript
- **Hosting**: GitHub Pages (무료)
- **Backend**: Google Apps Script (무료)
- **Database**: Google Spreadsheet (무료)
- **알림**: Slack Webhook (선택)

## 시작하기

### 빠른 시작 (로컬 모드)
```bash
# 저장소 클론
git clone https://github.com/jimeng314/aws-saa-quiz.git

# index.html을 브라우저에서 열기
```

### 팀 스터디 설정
Google Sheets 연동 및 슬랙 알림 설정은 [SETUP_GUIDE.md](./SETUP_GUIDE.md)를 참고하세요.

## 라이브 데모

https://jimeng314.github.io/aws-saa-quiz/

## 파일 구조

```
aws-saa-quiz/
├── index.html              # 퀴즈 앱 메인
├── questions.json          # 문제 데이터 (724문제)
├── google-apps-script.js   # Google Apps Script 코드
├── README.md               # 프로젝트 소개
└── SETUP_GUIDE.md          # 설정 가이드
```

## 데이터 저장

| 저장 위치 | 데이터 | 비고 |
|----------|--------|------|
| LocalStorage | 오답노트 (횟수, 날짜) | 브라우저별 저장 |
| Google Sheets | 전체 풀이 기록 | 팀 공유 가능 |

## 무료 사용 한도

| 서비스 | 한도 | 현재 사용량 (15명 기준) |
|--------|------|------------------------|
| GitHub Pages | 월 100GB 대역폭 | 약 0.1% |
| Google Apps Script | 일 20,000 호출 | 약 2.5% (500회) |
| Google Spreadsheet | 1,000만 셀 | 약 3년 사용 가능 |

## 합격을 기원합니다!
