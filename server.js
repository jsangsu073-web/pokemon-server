const admin = require('firebase-admin');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Render 환경 변수에서 비밀키를 가져옵니다. (나중에 세팅할 예정)
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL // 이것도 나중에 세팅
});

const db = admin.database();

// Render 서버가 살아있는지 확인하기 위한 가짜 웹페이지
app.get('/', (req, res) => {
  res.send('포켓몬 그래프 24시간 자동 봇이 정상 작동 중입니다! ⚡');
});

// 확률 계산 함수 (소수점 확률 완벽 적용)
function calculateCrashPoint() {
    // 0.00부터 99.999... 까지의 정밀한 난수를 생성합니다.
    let r = Math.random() * 100; 
    
    // 확률표 (누적 방식으로 계산됨)
    if (r <= 15) {
        return 1.00; // 15% 확률: 즉시 폭발
    } 
    else if (r <= 45) { 
        return parseFloat((Math.random() * (1.50 - 1.01) + 1.01).toFixed(2)); // 30% 확률 (20 + 30)
    } 
    else if (r <= 67) { 
        return parseFloat((Math.random() * (2.00 - 1.51) + 1.51).toFixed(2)); // 22% 확률 (50 + 17)
    } 
    else if (r <= 95) { 
        return parseFloat((Math.random() * (5.00 - 2.01) + 2.01).toFixed(2)); // 28% 확률 (67 + 28)
    } 
    else if (r <= 99.5) { 
        return parseFloat((Math.random() * (10.00 - 5.01) + 5.01).toFixed(2)); // 4.5% 확률 (95 + 4.5)
    } 
    else {
        // 나머지 0.5% 확률: 10.01 이상 잭팟 (99.5 + 0.5)
        let extreme_random = Math.random() * 0.99;
        return parseFloat((10.01 + (1.0 / (1.0 - extreme_random))).toFixed(2));
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 🤖 24시간 무한 루프 시작
async function startGameLoop() {
    console.log("자동화 로봇 가동 시작!");
    
    while(true) {
        try {
            // [1] 15초 카운트다운
            const nextStart = Date.now() + 15000;
            await db.ref('game').set({ status: 'waiting', nextStartTime: nextStart });
            await sleep(15000);

            // [2] 게임 시작
            const crashPt = calculateCrashPoint();
            const startTime = Date.now();
            await db.ref('game').set({ status: 'running', startTime: startTime, crashPoint: crashPt });
            console.log(`로켓 발사! 이번 폭발 지점: ${crashPt}x`);
            
            // [3] 폭발 지점까지 상승 대기
            const crashDurationMs = ((crashPt - 1.00) / 0.4) * 1000;
            await sleep(crashDurationMs);

            // [4] Busted!
            await db.ref('game').set({ status: 'crashed', crashPoint: crashPt });
            
            // 👇 이 한 줄을 새로 추가해 주세요! (기록 저장)
            await db.ref('history').push({ crashPoint: crashPt, timestamp: Date.now() });

            console.log(`펑! 폭발 완료. 기록 저장됨.`);
            
            // 유저들이 결과를 볼 수 있게 4초 대기
            await sleep(4000);
        } catch (error) {
            console.error("루프 에러 발생:", error);
            await sleep(5000); // 에러 시 5초 쉬고 재시작
        }
    }
}

app.listen(port, () => {
  console.log(`포켓몬 서버가 포트 ${port}에서 켜졌습니다.`);
  startGameLoop(); // 서버가 켜지면 무한 루프 바로 실행!
});