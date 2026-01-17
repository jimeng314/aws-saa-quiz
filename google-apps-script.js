/**
 * AWS SAA Quiz - Google Apps Script
 */

// ============================================
// 설정
// ============================================
const SPREADSHEET_ID = '146VfL2XxlXdJsUMad4WixRbXVhoINJCCC3XoBdCGwtg';
const SLACK_WEBHOOK_URL = 'YOUR_SLACK_WEBHOOK_URL_HERE';

const SHEET_USERS = '사용자목록';
const SHEET_SUMMARY = '전체요약';
const SHEET_SERVICE_SUMMARY = '서비스별요약';
const SHEET_SETTINGS = '알림설정';

// ============================================
// 웹 앱 엔드포인트
// ============================================

function doGet(e) {
  const action = e.parameter.action;

  try {
    let result;

    switch (action) {
      case 'getUsers':
        result = getUsers();
        break;
      case 'getUserStats':
        const userName = e.parameter.userName;
        result = getUserStats(userName);
        break;
      default:
        result = { status: 'ok', message: 'AWS SAA Quiz API' };
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, error: error.message });
  }
}

function doPost(e) {
  try {
    let data;

    if (e.parameter && e.parameter.payload) {
      data = JSON.parse(e.parameter.payload);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      return createJsonResponse({ success: false, error: 'No data received' });
    }

    const action = data.action;
    let result;

    switch (action) {
      case 'saveQuizResult':
        result = saveQuizResult(data);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ success: false, error: error.message });
  }
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// 사용자 관리
// ============================================

function getUsers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);

  if (!sheet) {
    return { success: false, error: '사용자목록 시트가 없습니다.' };
  }

  const data = sheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      users.push({
        name: data[i][0],
        slackId: data[i][1] || '',
        registeredAt: data[i][2] || '',
        notificationEnabled: data[i][3] === 'ON',
        dailyGoal: data[i][4] || 10
      });
    }
  }

  return { success: true, users: users };
}

function getUserStats(userName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(userName);

  if (!sheet) {
    return {
      success: true,
      stats: {
        totalAttempts: 0,
        correctCount: 0,
        wrongCount: 0,
        solvedQuestions: [],
        wrongQuestions: []
      }
    };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      success: true,
      stats: {
        totalAttempts: 0,
        correctCount: 0,
        wrongCount: 0,
        solvedQuestions: [],
        wrongQuestions: []
      }
    };
  }

  let correctCount = 0;
  let wrongCount = 0;
  const solvedSet = new Set();
  const wrongSet = new Set();
  const questionResults = {};

  for (let i = 1; i < data.length; i++) {
    const questionId = data[i][3];
    const isCorrect = data[i][9] === '✅';

    if (isCorrect) {
      correctCount++;
    } else {
      wrongCount++;
    }

    solvedSet.add(questionId);
    questionResults[questionId] = isCorrect;
  }

  for (const [qId, isCorrect] of Object.entries(questionResults)) {
    if (!isCorrect) {
      wrongSet.add(parseInt(qId));
    }
  }

  return {
    success: true,
    stats: {
      totalAttempts: data.length - 1,
      correctCount: correctCount,
      wrongCount: wrongCount,
      solvedQuestions: Array.from(solvedSet),
      wrongQuestions: Array.from(wrongSet)
    }
  };
}

// ============================================
// 퀴즈 결과 저장
// ============================================

function saveQuizResult(data) {
  const {
    userName,
    sessionId,
    mode,
    questionId,
    questionText,
    choices,
    questionType,
    services,
    selectedAnswers,
    correctAnswers,
    explanation,
    isCorrect,
    elapsedTime,
    attemptCount
  } = data;

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let sheet = ss.getSheetByName(userName);
  if (!sheet) {
    sheet = createUserSheet(ss, userName);
  }

  const now = new Date();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
  const hour = now.getHours();
  let timeSlot;
  if (hour >= 6 && hour < 12) timeSlot = '오전';
  else if (hour >= 12 && hour < 18) timeSlot = '오후';
  else if (hour >= 18 && hour < 23) timeSlot = '저녁';
  else timeSlot = '심야';

  const existingData = sheet.getDataRange().getValues();
  let totalCorrect = isCorrect ? 1 : 0;
  let totalAttempts = 1;

  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][9] === '✅') totalCorrect++;
    totalAttempts++;
  }

  const cumulativeRate = Math.round((totalCorrect / totalAttempts) * 100) + '%';

  const row = [
    Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
    sessionId,
    mode,
    questionId,
    questionText,
    choices || '',
    selectedAnswers.join(', '),
    correctAnswers.join(', '),
    explanation || '',
    isCorrect ? '✅' : '❌',
    questionType,
    services.join('\n'),  // 줄바꿈으로 구분
    elapsedTime,
    attemptCount,
    dayOfWeek,
    timeSlot,
    cumulativeRate
  ];

  sheet.appendRow(row);
  updateSummarySheets(ss);

  return { success: true, message: '저장 완료' };
}

function createUserSheet(ss, userName) {
  const sheet = ss.insertSheet(userName);

  const headers = [
    '타임스탬프', '세션ID', '풀이모드', '문제ID', '문제내용',
    '선지', '선택한 답', '정답', '해설', '정답여부',
    '문제유형', 'AWS서비스', '소요시간(초)', '시도횟수', '요일', '시간대', '누적정답률'
  ];

  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  // 열 너비 조정
  sheet.setColumnWidth(1, 150);   // 타임스탬프
  sheet.setColumnWidth(5, 300);   // 문제내용
  sheet.setColumnWidth(6, 400);   // 선지
  sheet.setColumnWidth(9, 400);   // 해설
  sheet.setColumnWidth(12, 150);  // AWS서비스

  // 문제내용(E), 선지(F), 해설(I), AWS서비스(L) 열 설정
  // 텍스트 줄바꿈 + 세로 맞춤 위쪽
  const colSettings = [5, 6, 9, 12]; // E, F, I, L 열
  for (const col of colSettings) {
    sheet.getRange(1, col, 1000, 1)
      .setWrap(true)
      .setVerticalAlignment('top');
  }

  return sheet;
}

// ============================================
// 요약 시트 업데이트
// ============================================

function updateSummarySheets(ss) {
  updateTotalSummary(ss);
  updateServiceSummary(ss);
}

function updateTotalSummary(ss) {
  let sheet = ss.getSheetByName(SHEET_SUMMARY);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SUMMARY);
  }

  const headers = [
    '이름', '푼 문제', '총 시도', '1차 정답률', '시도 정답률',
    '문제 정답률', '평균 시도', '미해결', '평균 소요시간', '최근 활동'
  ];

  const usersResult = getUsers();
  if (!usersResult.success) return;

  const summaryData = [headers];

  for (const user of usersResult.users) {
    const userSheet = ss.getSheetByName(user.name);
    if (!userSheet) continue;

    const data = userSheet.getDataRange().getValues();
    if (data.length <= 1) continue;

    const stats = calculateUserStats(data);

    summaryData.push([
      user.name,
      stats.solvedCount,
      stats.totalAttempts,
      stats.firstTryRate,
      stats.attemptRate,
      stats.questionRate,
      stats.avgAttempts,
      stats.unresolvedCount,
      stats.avgTime,
      stats.lastActivity
    ]);
  }

  sheet.clear();
  if (summaryData.length > 0) {
    sheet.getRange(1, 1, summaryData.length, headers.length).setValues(summaryData);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function calculateUserStats(data) {
  const questionMap = {};
  let totalCorrect = 0;
  let totalTime = 0;
  let totalAttempts = data.length - 1;

  for (let i = 1; i < data.length; i++) {
    const questionId = data[i][3];
    const isCorrect = data[i][9] === '✅';
    const elapsedTime = parseInt(data[i][12]) || 0;

    if (!questionMap[questionId]) {
      questionMap[questionId] = {
        attempts: 0,
        firstTryCorrect: null,
        lastCorrect: false
      };
    }

    questionMap[questionId].attempts++;
    if (questionMap[questionId].firstTryCorrect === null) {
      questionMap[questionId].firstTryCorrect = isCorrect;
    }
    questionMap[questionId].lastCorrect = isCorrect;

    if (isCorrect) totalCorrect++;
    totalTime += elapsedTime;
  }

  const solvedCount = Object.keys(questionMap).length;
  let firstTryCorrect = 0;
  let resolvedCount = 0;

  for (const q of Object.values(questionMap)) {
    if (q.firstTryCorrect) firstTryCorrect++;
    if (q.lastCorrect) resolvedCount++;
  }

  const unresolvedCount = solvedCount - resolvedCount;

  const lastActivity = data.length > 1 ? data[data.length - 1][0] : '';
  const lastActivityStr = lastActivity ?
    Utilities.formatDate(new Date(lastActivity), 'Asia/Seoul', 'yyyy-MM-dd') : '-';

  return {
    solvedCount: solvedCount,
    totalAttempts: totalAttempts,
    firstTryRate: solvedCount > 0 ? Math.round((firstTryCorrect / solvedCount) * 100) + '%' : '0%',
    attemptRate: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) + '%' : '0%',
    questionRate: solvedCount > 0 ? Math.round((resolvedCount / solvedCount) * 100) + '%' : '0%',
    avgAttempts: solvedCount > 0 ? (totalAttempts / solvedCount).toFixed(1) + '회' : '0회',
    unresolvedCount: unresolvedCount,
    avgTime: totalAttempts > 0 ? Math.round(totalTime / totalAttempts) + '초' : '0초',
    lastActivity: lastActivityStr
  };
}

function updateServiceSummary(ss) {
  let sheet = ss.getSheetByName(SHEET_SERVICE_SUMMARY);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SERVICE_SUMMARY);
  }

  const headers = ['이름', '서비스', '문제 수', '시도 수', '1차 정답률', '최종 정답률', '상태'];

  const usersResult = getUsers();
  if (!usersResult.success) return;

  const summaryData = [headers];

  for (const user of usersResult.users) {
    const userSheet = ss.getSheetByName(user.name);
    if (!userSheet) continue;

    const data = userSheet.getDataRange().getValues();
    if (data.length <= 1) continue;

    const serviceStats = calculateServiceStats(data);

    for (const [service, stats] of Object.entries(serviceStats)) {
      const finalRate = parseInt(stats.finalRate);
      const status = finalRate >= 70 ? '양호' : '⚠️ 취약';

      summaryData.push([
        user.name,
        service,
        stats.questionCount,
        stats.attemptCount,
        stats.firstTryRate,
        stats.finalRate,
        status
      ]);
    }
  }

  sheet.clear();
  if (summaryData.length > 0) {
    sheet.getRange(1, 1, summaryData.length, headers.length).setValues(summaryData);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function calculateServiceStats(data) {
  const serviceMap = {};

  for (let i = 1; i < data.length; i++) {
    const services = (data[i][11] || '').split(', ');
    const questionId = data[i][3];
    const isCorrect = data[i][9] === '✅';

    for (const service of services) {
      if (!service) continue;

      if (!serviceMap[service]) {
        serviceMap[service] = {
          questions: {},
          attemptCount: 0
        };
      }

      if (!serviceMap[service].questions[questionId]) {
        serviceMap[service].questions[questionId] = {
          firstTryCorrect: null,
          lastCorrect: false
        };
      }

      const q = serviceMap[service].questions[questionId];
      if (q.firstTryCorrect === null) {
        q.firstTryCorrect = isCorrect;
      }
      q.lastCorrect = isCorrect;

      serviceMap[service].attemptCount++;
    }
  }

  const result = {};

  for (const [service, svcData] of Object.entries(serviceMap)) {
    const questions = Object.values(svcData.questions);
    const questionCount = questions.length;
    const firstTryCorrect = questions.filter(q => q.firstTryCorrect).length;
    const finalCorrect = questions.filter(q => q.lastCorrect).length;

    result[service] = {
      questionCount: questionCount,
      attemptCount: svcData.attemptCount,
      firstTryRate: questionCount > 0 ? Math.round((firstTryCorrect / questionCount) * 100) + '%' : '0%',
      finalRate: questionCount > 0 ? Math.round((finalCorrect / questionCount) * 100) + '%' : '0%'
    };
  }

  return result;
}

// ============================================
// 슬랙 알림
// ============================================

function sendWeeklyReport() {
  if (SLACK_WEBHOOK_URL === 'YOUR_SLACK_WEBHOOK_URL_HERE') {
    console.log('슬랙 Webhook URL이 설정되지 않았습니다.');
    return;
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const usersResult = getUsers();
  if (!usersResult.success) return;

  const weeklyStats = [];
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const user of usersResult.users) {
    const userSheet = ss.getSheetByName(user.name);
    if (!userSheet) continue;

    const data = userSheet.getDataRange().getValues();
    let weeklyAttempts = 0;
    let weeklyCorrect = 0;
    const servicesWrong = {};

    for (let i = 1; i < data.length; i++) {
      const timestamp = new Date(data[i][0]);
      if (timestamp >= oneWeekAgo) {
        weeklyAttempts++;
        if (data[i][9] === '✅') {
          weeklyCorrect++;
        } else {
          const services = (data[i][11] || '').split(', ');
          for (const s of services) {
            if (s) servicesWrong[s] = (servicesWrong[s] || 0) + 1;
          }
        }
      }
    }

    let weakestService = '-';
    let maxWrong = 0;
    for (const [s, count] of Object.entries(servicesWrong)) {
      if (count > maxWrong) {
        maxWrong = count;
        weakestService = s;
      }
    }

    if (weeklyAttempts > 0) {
      weeklyStats.push({
        name: user.name,
        slackId: user.slackId,
        attempts: weeklyAttempts,
        rate: Math.round((weeklyCorrect / weeklyAttempts) * 100),
        weakestService: weakestService
      });
    }
  }

  weeklyStats.sort((a, b) => b.attempts - a.attempts);

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const dateFormat = (d) => `${d.getMonth() + 1}/${d.getDate()}`;

  let message = `📊 *AWS SAA 스터디 주간 리포트* (${dateFormat(weekAgo)} ~ ${dateFormat(today)})\n\n`;

  if (weeklyStats.length > 0) {
    message += `🏆 *이번주 MVP*: ${weeklyStats[0].name} (${weeklyStats[0].attempts}문제, 정답률 ${weeklyStats[0].rate}%)\n\n`;
    message += `| 이름 | 푼 문제 | 정답률 | 취약 서비스 |\n`;
    message += `|------|--------|-------|------------|\n`;

    for (const stat of weeklyStats) {
      message += `| ${stat.name} | ${stat.attempts} | ${stat.rate}% | ${stat.weakestService} |\n`;
    }

    const allWeak = weeklyStats.map(s => s.weakestService).filter(s => s !== '-');
    const weakCount = {};
    for (const s of allWeak) {
      weakCount[s] = (weakCount[s] || 0) + 1;
    }
    const commonWeak = Object.entries(weakCount)
      .filter(([_, count]) => count >= 2)
      .map(([service, _]) => service);

    if (commonWeak.length > 0) {
      message += `\n💡 *공통 취약 서비스*: ${commonWeak.join(', ')} → 함께 복습 추천!`;
    }
  } else {
    message += `이번주 학습 기록이 없습니다. 다들 화이팅! 💪`;
  }

  sendSlackMessage(message);
}

function sendEncouragementAlerts() {
  if (SLACK_WEBHOOK_URL === 'YOUR_SLACK_WEBHOOK_URL_HERE') {
    console.log('슬랙 Webhook URL이 설정되지 않았습니다.');
    return;
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const usersResult = getUsers();
  if (!usersResult.success) return;

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  for (const user of usersResult.users) {
    if (!user.notificationEnabled || !user.slackId) continue;

    const userSheet = ss.getSheetByName(user.name);
    let lastActivity = null;
    let solvedCount = 0;

    if (userSheet) {
      const data = userSheet.getDataRange().getValues();
      solvedCount = new Set(data.slice(1).map(row => row[3])).size;

      if (data.length > 1) {
        lastActivity = new Date(data[data.length - 1][0]);
      }
    }

    if (!lastActivity || lastActivity < threeDaysAgo) {
      const daysSince = lastActivity ?
        Math.floor((new Date() - lastActivity) / (1000 * 60 * 60 * 24)) : '?';

      const progressRate = Math.round((solvedCount / 724) * 100);
      const remaining = 724 - solvedCount;

      const message = `👋 <@${user.slackId}> ${user.name}님, ${daysSince}일째 쉬고 계시네요!\n\n` +
        `📈 현재 진행률: ${solvedCount}/724 (${progressRate}%)\n` +
        `🎯 남은 문제: ${remaining}개\n\n` +
        `오늘 딱 ${user.dailyGoal}문제만 풀어볼까요? 💪`;

      sendSlackMessage(message);
    }
  }
}

function sendSlackMessage(message) {
  const payload = {
    text: message,
    mrkdwn: true
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);
    console.log('슬랙 메시지 발송 성공');
  } catch (error) {
    console.error('슬랙 메시지 발송 실패:', error);
  }
}

// ============================================
// 트리거 및 초기화
// ============================================

function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    ScriptApp.deleteTrigger(trigger);
  }

  ScriptApp.newTrigger('sendWeeklyReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(10)
    .create();

  ScriptApp.newTrigger('sendEncouragementAlerts')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  console.log('트리거 설정 완료');
}

function initializeSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let usersSheet = ss.getSheetByName(SHEET_USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEET_USERS);
    usersSheet.appendRow(['이름', '슬랙ID', '등록일', '알림설정', '목표(문제/일)']);
    usersSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    usersSheet.setFrozenRows(1);
  }

  let summarySheet = ss.getSheetByName(SHEET_SUMMARY);
  if (!summarySheet) {
    summarySheet = ss.insertSheet(SHEET_SUMMARY);
    const headers = ['이름', '푼 문제', '총 시도', '1차 정답률', '시도 정답률',
                     '문제 정답률', '평균 시도', '미해결', '평균 소요시간', '최근 활동'];
    summarySheet.appendRow(headers);
    summarySheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    summarySheet.setFrozenRows(1);
  }

  let serviceSheet = ss.getSheetByName(SHEET_SERVICE_SUMMARY);
  if (!serviceSheet) {
    serviceSheet = ss.insertSheet(SHEET_SERVICE_SUMMARY);
    const headers = ['이름', '서비스', '문제 수', '시도 수', '1차 정답률', '최종 정답률', '상태'];
    serviceSheet.appendRow(headers);
    serviceSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    serviceSheet.setFrozenRows(1);
  }

  console.log('시트 초기화 완료');
}
