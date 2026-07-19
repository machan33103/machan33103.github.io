//#region 初期設定

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// スマホでもPCでも画面サイズに合わせる
setTimeout(() => {
  canvas.width = window.innerWidth * 0.9;
  canvas.height = window.innerHeight * 0.7;
}, 200);

// ニックネーム
let nickname = "";

// プレイヤー設定
let player = {
  x: canvas.width / 2,
  y: canvas.height - 50,
  size: 40,
  color: "cyan",
  invincible: false
};

// 爆弾設定
let bombs = [];
let lastBombSpawn = 0;   // 最後に爆弾を生成した時間
let lastBombSpeedUp = 0; // 最後に生成速度が速くなった時間
let BombspawnRate = 800;     // 初期生成速度（あなたのコードのまま）

//直線爆撃
let warningLine = null; // { type, pos, createdAt }
let lastBombing = 0; // 最後に爆撃を生成した時間
let lastBombingSpeedUp = 0; // 最後に生成速度が速くなった時間
let BombingspawnRate = 2000; //　初期生成速度
let warningDots = []; // 予告線の○の座標を保存する

//高速爆弾
let highSpeedWarnings = []; // 高速爆撃の予告線データ
let lastHighSpeedSpawn = 0;
let highSpeedSpawnRate = 1000; // 高速爆撃の発生間隔
let lasthighSpeedUP = 0; //最後に生成速度が速くなった時間

// コイン設定
let coins = [];
let coinCount = 0;

// スコア
let startTime;
let scoreDisplay = document.getElementById("score");

// タッチ操作
let touchStartX = null;
let touchStartY = null;

// スワイプ操作（2次元移動）
canvas.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

canvas.addEventListener("touchmove", (e) => {
  if (touchStartX === null || touchStartY === null) return;

  let currentX = e.touches[0].clientX;
  let currentY = e.touches[0].clientY;

  let diffX = currentX - touchStartX;
  let diffY = currentY - touchStartY;

  player.x += diffX * 0.8;
  player.y += diffY * 0.8;

  player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x));
  player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y));

  touchStartX = currentX;
  touchStartY = currentY;
});

canvas.addEventListener("touchend", () => {
  touchStartX = null;
  touchStartY = null;
});

// タイマー
let coinInterval = null;

//フェーズ
let phase = 1;               // 現在のフェーズ
let lastPhaseTime = 0;       // 最後にフェーズが進んだ時間

//ジョイスティック
let joystickEnabled = false;
let playerVX = 0;
let playerVY = 0;

//#endregion


//#region  ジョイスティック
const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");

let joyActive = false;
let joyX = 0;
let joyY = 0;

joystick.addEventListener("touchstart", (e) => {
  if (!joystickEnabled) return;
  joyActive = true;
});

joystick.addEventListener("touchmove", (e) => {
  if (!joystickEnabled) return;
  if (!joyActive) return;

  const rect = joystick.getBoundingClientRect();
  const touch = e.touches[0];

  // ジョイスティック中心からの距離
  let x = touch.clientX - (rect.left + rect.width / 2);
  let y = touch.clientY - (rect.top + rect.height / 2);

  // 最大距離を制限（円の外に出ないように）
  const maxDist = 140;
  const dist = Math.sqrt(x*x + y*y);
  if (dist > maxDist) {
    x = (x / dist) * maxDist;
    y = (y / dist) * maxDist;
  }

  // スティックの位置を更新
  stick.style.left = (60 + x) + "px";
  stick.style.top = (60 + y) + "px";

  // プレイヤー移動用に保存
  joyX = x / maxDist;
  joyY = y / maxDist;
});

joystick.addEventListener("touchend", () => {
  if (!joystickEnabled) return
  joyActive = false;
  joyX = 0;
  joyY = 0;

  // スティックを中央に戻す
  stick.style.left = "30px";
  stick.style.top = "30px";
});

function joysticksystem(){
  if (joyActive) {

    // 倒れ具合の強さ（0〜1）
    const strength = Math.sqrt(joyX * joyX + joyY * joyY);

    // 最大速度
    const maxSpeed = 8;

    // 目標速度（スティックの倒れ具合に比例）
    const targetVX = joyX * maxSpeed * strength;
    const targetVY = joyY * maxSpeed * strength;

    // ★ 慣性（遅延）を作る：currentSpeed をゆっくり targetSpeed に近づける
    const smooth = 0.5;  // ← 慣性の強さ（0.1〜0.3がオススメ）

    playerVX += (targetVX - playerVX) * smooth;
    playerVY += (targetVY - playerVY) * smooth;

    // プレイヤー移動
    player.x += playerVX;
    player.y += playerVY;

    // 壁判定
    player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x));
    player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y));
  }

}

//#endregion


//#region スコア記録＆ランキング
// ⭐ ランキング保存
function saveScore(finalScore) {
  firebase.database().ref("ranking").push({
    name: nickname,
    score: finalScore,
    time: Date.now()
  });
}

function displayRanking() {
  firebase.database().ref("ranking").once("value", snapshot => {
    let data = snapshot.val();
    let scores = [];

    for (let id in data) {
      scores.push(data[id]);
    }

    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 30);

    let rankingDiv = document.getElementById("ranking");
    rankingDiv.innerHTML = "<h3>ランキング</h3>";

    scores.forEach((item, index) => {
      rankingDiv.innerHTML += `<p>${index + 1}位: ${item.name} - ${item.score} 点</p>`;
    });
  });
}

// スコア更新
function updateScore() {
  let now = Date.now();
  let seconds = Math.floor((now - startTime) / 1000);
  scoreDisplay.textContent = `現在フェーズ: ${phase} 残り: ${30-Math.floor((now-lastPhaseTime)/1000)}秒 　　　　　　 生存時間: ${seconds} 秒 / コイン: ${coinCount} 枚`;
}
//#endregion


//#region 爆弾system

function bombSystem() {

  // 爆弾生成
  function spawnBombTop() {
    bombs.push({
      x: Math.random() * canvas.width,
      y: -20,
      size: 30,
      color: "red",
      speed: 3 + Math.random() * 4,
      vx: 0,
      vy: 1
    });
  }
  function spawnBombBottom() {
    bombs.push({
     x: Math.random() * canvas.width,
      y: canvas.height + 20,
      size: 30,
      color: "red",
      speed: 3 + Math.random() * 4,
      vx: 0,
      vy: -1
    });
  }
  function spawnBombLeft() {
    bombs.push({
      x: -20,
      y: Math.random() * canvas.height,
      size: 30,
      color: "red",
      speed: 3 + Math.random() * 4,
      vx: 1,
      vy: 0
    });
  }
  function spawnBombRight() {
    bombs.push({
      x: canvas.width + 20,
      y: Math.random() * canvas.height,
      size: 30,
      color: "red",
      speed: 3+Math.random() * 4,
      vx: -1,
      vy: 0
    });
  }

  // 爆弾生成（BombspawnRate に応じて生成）
  if (Date.now() - lastBombSpawn > BombspawnRate) {

    let r = Math.random();
    if (r < 0.25) spawnBombTop();
    else if (r < 0.5) spawnBombBottom();
    else if (r < 0.75) spawnBombLeft();
    else spawnBombRight();

    lastBombSpawn = Date.now();
  }

  // 爆弾生成速度の変化（5秒ごとに速くする）
  if (!player.invincible) {  // ゲームオーバー中は加速しない
    if (Date.now() - lastBombSpeedUp > 5000) {
      if (BombspawnRate > 300) {
        BombspawnRate -= 50;
      }
      lastBombSpeedUp = Date.now(); // 次の5秒カウント開始
    }
  }

  // 爆弾の移動と当たり判定
  for (let bomb of bombs) {
    bomb.x += bomb.vx * bomb.speed;
    bomb.y += bomb.vy * bomb.speed;

    if (
      !player.invincible &&
      Math.abs(bomb.x - player.x) < (bomb.size + 0.9 * player.size) / 2 &&
      Math.abs(bomb.y - player.y) < (bomb.size + 0.9 * player.size) / 2
    ) {
      gameOver();
      return;
    }
  }

  // ★ ④ 画面外の爆弾を削除
  bombs = bombs.filter(b =>
    b.x > -50 &&
    b.x < canvas.width + 50 &&
    b.y > -50 &&
    b.y < canvas.height + 50
  );

}
//#endregion


//#region 直線爆撃system

function LineBombingsystem() {
  // 50%で横、50%で縦
  const isHorizontal = Math.random() < 0.5;

  // 直線爆撃生成（BombspawnRate に応じて生成）
  if (Date.now() - lastBombing > BombingspawnRate) {

    if (isHorizontal) {
      const y = 50 + Math.random() * (canvas.height - 100);
      warningLine = { type: "horizontal", pos: y, createdAt: Date.now() };
    } else {
      const x = 50 + Math.random() * (canvas.width - 100);
      warningLine = { type: "vertical", pos: x, createdAt: Date.now() };
    }

    setTimeout(() => {

      // ★ 今回の直線爆撃の方向を決める（1回だけ）
      let vx = 0;
      let vy = 0;

      if (warningLine.type === "vertical") {
        // 縦線 → 左 or 右へランダム
        vx = Math.random() < 0.5 ? -1 : 1;
        vy = 0;
      } else {
        // 横線 → 上 or 下へランダム
        vx = 0;
        vy = Math.random() < 0.5 ? -1 : 1;
      }

      // ★ warningDots の位置に爆弾を生成（方向はすべて同じ）
      for (let dot of warningDots) {
        bombs.push({
        x: dot.x,
        y: dot.y,
        size: 30,
        color: "red",
        speed: 6,
        vx: vx,
        vy: vy
        });
      }

      warningLine = null;
      warningDots = [];

    }, 1000);



    lastBombing = Date.now();
  }

  // 直線爆撃生成速度の変化（5秒ごとに速くする）
  if (!player.invincible) {  // ゲームオーバー中は加速しない
    if (Date.now() - lastBombingSpeedUp > 5000) {
      if (BombspawnRate > 1000) {
        BombspawnRate -= 150;
      }
      lastBombingSpeedUp = Date.now(); // 次の5秒カウント開始
    }
  }

  // 爆弾の移動と当たり判定
  for (let bomb of bombs) {
    bomb.x += bomb.vx * bomb.speed;
    bomb.y += bomb.vy * bomb.speed;

    if (
      !player.invincible &&
      Math.abs(bomb.x - player.x) < (bomb.size + 0.9 * player.size) / 2 &&
      Math.abs(bomb.y - player.y) < (bomb.size + 0.9 * player.size) / 2
    ) {
      gameOver();
      return;
    }
  } 
}

//#endregion


//#region 高速爆弾system
function HighSpeedBombSystem() {

  // ★ ① 高速爆撃の予告線を生成
  if (Date.now() - lastHighSpeedSpawn > highSpeedSpawnRate) {

    const count = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < count; i++) {

      const isHorizontal = Math.random() < 0.5;
      const direction = Math.random() < 0.5 ? -1 : 1;

      let pos = isHorizontal
        ? 50 + Math.random() * (canvas.height - 100)
        : 50 + Math.random() * (canvas.width - 100);

      highSpeedWarnings.push({
        type: isHorizontal ? "horizontal" : "vertical",
        pos: pos,
        dir: direction,
        createdAt: Date.now(),
        dots: [] // ★ここに後で座標を入れる
      });
    }

    lastHighSpeedSpawn = Date.now();
  }

  // ★ ② dots をここで生成する（draw() ではなく）
  for (let warn of highSpeedWarnings) {

    warn.dots = []; // リセット

    const dotSpacing = 30;

    if (warn.type === "horizontal") {
      for (let x = 0; x < canvas.width; x += dotSpacing) {
        warn.dots.push({ x: x, y: warn.pos });
      }
    } else {
      for (let y = 0; y < canvas.height; y += dotSpacing) {
        warn.dots.push({ x: warn.pos, y: y });
      }
    }
  }

  // ★ ② 1秒後に高速爆弾を生成（draw() が dots を作った後に必ず走る）
  highSpeedWarnings = highSpeedWarnings.filter(warn => {

    if (Date.now() - warn.createdAt > 1000) {

      if (warn.dots.length > 0) {

        let targetDot;

        if (warn.type === "horizontal") {
          // 横線
          if (warn.dir === 1) {
            // → 右向き → 左端の点だけ
            targetDot = warn.dots[0];
          } else {
            // ← 左向き → 右端の点だけ
            targetDot = warn.dots[warn.dots.length - 1];
          }
          } else {
          // 縦線
          if (warn.dir === 1) {
            // ↓ 下向き → 上端の点だけ
            targetDot = warn.dots[0];
          } else {
            // ↑ 上向き → 下端の点だけ
            targetDot = warn.dots[warn.dots.length - 1];
          }
        }

        // ★ 1個だけ爆弾生成
        bombs.push({
          x: targetDot.x,
          y: targetDot.y,
          size: 25,
          color: "red",
          speed: 30,
          vx: warn.type === "horizontal" ? warn.dir : 0,
          vy: warn.type === "horizontal" ? 0 : warn.dir
        });
      }

      return false; // 予告線削除
    }

    return true;
  });

  // 高速爆弾の変化（5秒ごとに速くする）
  if (!player.invincible) {  // ゲームオーバー中は加速しない
    if (Date.now() - lasthighSpeedUP > 5000) {
      if (highSpeedSpawnRate > 500) {
        highSpeedSpawnRate -= 150;
      }
      lasthighSpeedUP = Date.now(); // 次の5秒カウント開始
    }
  }

  // 爆弾の移動と当たり判定
  for (let bomb of bombs) {
    bomb.x += bomb.vx * bomb.speed;
    bomb.y += bomb.vy * bomb.speed;

    if (
      !player.invincible &&
      Math.abs(bomb.x - player.x) < (bomb.size + 0.9 * player.size) / 2 &&
      Math.abs(bomb.y - player.y) < (bomb.size + 0.9 * player.size) / 2
    ) {
      gameOver();
      return;
    }
  } 

}

//#endregion


//#region コインsystem
// コイン生成
function spawnCoin() {

  const margin = 50; // 端から50pxは避ける

  coins.push({
    x: margin + Math.random() * (canvas.width - margin * 2),
    y: margin + Math.random() * (canvas.height - margin * 2),
    size: 25,
    color: "gold",
    createdAt: Date.now(),
    blink: false
  });
}

function startSpawningCoins() {
  coinInterval = setInterval(() => {
    spawnCoin();
  }, 3000);
}

//  コインの判定（寿命＋点滅）
function updateCoins() {
  let now = Date.now();

  for (let i = coins.length - 1; i >= 0; i--) {
    let coin = coins[i];

    // 回収判定
    if (
      Math.abs(coin.x - player.x) < (coin.size + player.size) / 2 &&
      Math.abs(coin.y - player.y) < (coin.size + player.size) / 2
    ) {
      coinCount++;
      coins.splice(i, 1);
      continue;
    }

    // 点滅開始（消える1秒前）
    if (now - coin.createdAt > 4000) {
      coin.blink = true;
    }

    // 寿命で消える（5秒）
    if (now - coin.createdAt > 5000) {
      coins.splice(i, 1);
    }
  }
}
//#endregion


//#region フェーズ管理
function showPhaseMessage(text) {
  const msg = document.createElement("div");
  msg.className = "phaseMessage";
  msg.textContent = text;

  document.body.appendChild(msg);

  setTimeout(() => {
    msg.remove();
  }, 1500); // 2秒で消える
}

// フェーズ判定（30秒ごと）
function Phasejadge(){
  let now = Date.now();
  if (now - lastPhaseTime > 30000) {  // 30秒経過
    phase++;

    showPhaseMessage(`第${phase - 1}フェーズクリア！`);
    setTimeout(() => {
      showPhaseMessage(`第${phase}フェーズ開始！`);
    }, 1500);
  
    lastBombSpawn = 0;
    lastBombSpeedUp = 0;
    BombspawnRate = 800;
    lastBombing = 0;
    lastBombSpeedUp = 0;
    lasthighSpeedUP = 0
    BombingspawnRate = 2000;
    highSpeedWarnings = []; 
    lastHighSpeedSpawn = 0;
    highSpeedSpawnRate = 1000;  
    bombs = [];
    coins = [];
    warningDots = [];
    lastPhaseTime = now;
  }
}
//#endregion


//#region ゲーム描画
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // プレイヤー
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
  ctx.fill();

  // 高速爆弾予告線の描画（点滅＋矢印）
  for (let warn of highSpeedWarnings) {

  if (Math.floor(Date.now() / 200) % 2 === 0) continue;

  ctx.save();
  ctx.fillStyle = "cyan";

  const dotSize = 3;

  // dots は HighSpeedBombSystem が作るので描画だけ
  for (let dot of warn.dots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // ★ 矢印の描画（そのままでOK）
  if (warn.type === "horizontal") {
    ctx.beginPath();
    ctx.moveTo(warn.dir === 1 ? canvas.width - 20 : 20, warn.pos - 20);
    ctx.lineTo(warn.dir === 1 ? canvas.width - 20 : 20, warn.pos + 20);
    ctx.lineTo(warn.dir === 1 ? canvas.width : 0, warn.pos);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(warn.pos - 20, warn.dir === 1 ? canvas.height - 20 : 20);
    ctx.lineTo(warn.pos + 20, warn.dir === 1 ? canvas.height - 20 : 20);
    ctx.lineTo(warn.pos, warn.dir === 1 ? canvas.height : 0);
    ctx.fill();
  }

  ctx.restore();
}


  // 直線爆撃予告線（丸の点線）
if (warningLine) {

  // ★ 点滅（200msごとに ON/OFF）
  if (Math.floor(Date.now() / 200) % 2 === 0) {
    // OFF のときは描画しない
  } else {
    // ON のときだけ描画する

    ctx.save();
    ctx.fillStyle = "white";

    const dotSize = 15;
    const dotSpacing = 100;

    warningDots = []; // ★毎回リセット（ここはそのままでOK）

    if (warningLine.type === "horizontal") {
      for (let x = 0; x < canvas.width; x += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, warningLine.pos, dotSize, 0, Math.PI * 2);
        ctx.fill();

        warningDots.push({ x: x, y: warningLine.pos });
      }
    } else {
      for (let y = 0; y < canvas.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(warningLine.pos, y, dotSize, 0, Math.PI * 2);
        ctx.fill();

        warningDots.push({ x: warningLine.pos, y: y });
      }
    }

    ctx.restore();
  }
}

  // 爆弾の描画
  for (let bomb of bombs) {
    ctx.fillStyle = bomb.color;
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // コイン（点滅対応）
  for (let coin of coins) {
    if (coin.blink && Math.floor(Date.now() / 200) % 2 === 0) {
      continue; // 点滅
    }

    ctx.fillStyle = coin.color;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
//#endregion


//#region ゲームループ
let gameLoopId;
function gameLoop() {
  updateCoins();
  draw();
  updateScore();
  Phasejadge();
  joysticksystem();

//フェーズ1
  if(phase === 1){
    bombSystem();
  }

//フェーズ2
  if(phase === 2){
    LineBombingsystem();
  }

//フェーズ3
  if(phase === 3){
    HighSpeedBombSystem();
  }
  
  if(gameLoopId === 1){
    requestAnimationFrame(gameLoop);
  }
}
//#endregion


//#region ゲームオーバー
function gameOver() {
  if (!startTime) return;

  document.getElementById("joystick").style.display = "none";
  joystickEnabled = false; // ★ジョイスティック無効化
  joyX = 0;
  joyY = 0;
  stick.style.left = "30px";
  stick.style.top = "30px";

  gameLoopId = 0;
  cancelAnimationFrame(gameLoopId);
  clearInterval(coinInterval);
  player.invincible = true;
  bombs = [];
  coins = [];
  warningDots = [];
  highSpeedWarnings = []; 
  lastHighSpeedSpawn = 0;
  highSpeedSpawnRate = 1000;
  lastBombSpawn = 0;
  lastBombSpeedUp = 0;
  lasthighSpeedUP = 0
  BombspawnRate = 800;
  lastBombing = 0;
  lastBombSpeedUp = 0;
  BombingspawnRate = 2000;

  let now = Date.now();
  let seconds = Math.floor((now - startTime) / 1000);
  let finalScore = seconds * coinCount;

  saveScore(finalScore);

  const overlay = document.createElement("div");
  overlay.id = "gameOverOverlay";
  overlay.innerHTML = `
    <div class="game-over-box">
      <h2>ゲームオーバー！</h2>
      <p>スコア: ${finalScore} 点</p>
      <button id="restartBtn">もう一度プレイ</button>
      <button id="backMenuBtn">メニューに戻る</button>
    </div>
  `;
  
  document.body.appendChild(overlay);

  document.getElementById("restartBtn").addEventListener("click", () => {
    document.getElementById("gameOverOverlay").remove();
    showScreen("nameScreen");
  });

  document.getElementById("backMenuBtn").addEventListener("click", () => {
    location.reload();
  });
}
//#endregion


//#region 画面切り替え関数
function showScreen(id) {
  document.getElementById("menuScreen").style.display = "none";
  document.getElementById("nameScreen").style.display = "none";
  document.getElementById("gameScreen").style.display = "none";
  document.getElementById("rankingScreen").style.display = "none";
  document.getElementById(id).style.display = "block";
}
//#endregion 


//#region メニュー画面
//プレイボタン
document.getElementById("playBtn").addEventListener("click", () => {
  showScreen("nameScreen");
});

//ランキングボタン
document.getElementById("rankingBtn").addEventListener("click", () => {
  displayRanking();
  showScreen("rankingScreen");
});

//遊び方ボタン
document.getElementById("howToBtn").addEventListener("click", () => {
  alert("爆弾を避けながらコインを集めよう！");
});
//#endregion


//#region ニックネーム入力 ・ ゲーム開始画面
document.getElementById("startGameBtn").addEventListener("click", () => {
  nickname = document.getElementById("nickname").value || "名無し";

  showScreen("gameScreen");
  setTimeout(() => {
  canvas.width = window.innerWidth * 0.9;
  canvas.height = window.innerHeight * 0.7;
  }, 200);

  // ★ ゲーム開始時にジョイスティックを表示
  joystickEnabled = true; // ★ジョイスティック有効化
  document.getElementById("joystick").style.display = "block";

  player = {
  x: canvas.width / 2,
  y: canvas.height - 50,
  size: 40,
  color: "cyan",
  invincible: false
  };

  
  lastPhaseTime = 0;
  coinCount = 0;
  gameLoopId = 1
  phase = 1;

  lastPhaseTime = Date.now();
  showPhaseMessage(`第1フェーズ開始！`);
  startTime = Date.now();
  startSpawningCoins();
  gameLoop();
});
//#endregion


//#region ランキング 画面
document.getElementById("backToMenuBtn").addEventListener("click", () => {
  showScreen("menuScreen");

  // ★ メニューに戻ったらジョイスティックを消す
  joystickEnabled = false; // ★ジョイスティック無効化
  document.getElementById("joystick").style.display = "none";
});
//#endregion
