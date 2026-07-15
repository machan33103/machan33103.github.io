const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// スマホでもPCでも画面サイズに合わせる
canvas.width = window.innerWidth * 0.9;
canvas.height = window.innerHeight * 0.7;

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

//コイン設定
let coins = [];
let coinCount = 0;


// スコア（生存時間）
let startTime;
let scoreDisplay = document.getElementById("score");

// スワイプ操作用
let touchStartX = null;
let touchStartY = null;

// 爆弾生成タイマー
let bombInterval = null;
let spawnAccelerator = null;

// ⭐ ランキング保存
function saveScore(finalScore) {
  let scores = JSON.parse(localStorage.getItem("scores") || "[]");

  scores.push({
    name: nickname,
    score: finalScore
  });
//スコアの高い順に並び変え
  scores.sort((a, b) => b.score - a.score);
//上位5位までを表示
  scores = scores.slice(0, 5);

  localStorage.setItem("scores", JSON.stringify(scores));
}

// ⭐ ランキング表示
function displayRanking() {
  let scores = JSON.parse(localStorage.getItem("scores") || "[]");
  let rankingDiv = document.getElementById("ranking");

  rankingDiv.innerHTML = "<h3>ランキング</h3>";

  if (scores.length === 0) {
    rankingDiv.innerHTML += "<p>まだ記録がありません</p>";
    return;
  }

  scores.forEach((item, index) => {
    rankingDiv.innerHTML += `<p>${index + 1}位: ${item.name} - ${item.score} 点</p>`;
  });
}

// 4方向から爆弾を追加（速度ランダム）
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
    speed: 3 + Math.random() * 4,
    vx: -1,
    vy: 0
  });
}

// 爆弾の動き
function updateBombs() {
  for (let bomb of bombs) {
    bomb.x += bomb.vx * bomb.speed;
    bomb.y += bomb.vy * bomb.speed;

    // 当たり判定
    if (
      !player.invincible &&
      Math.abs(bomb.x - player.x) < (bomb.size + 0.9 * player.size) / 2 &&
      Math.abs(bomb.y - player.y) < (bomb.size + 0.9 * player.size) / 2
    ) {
      gameOver();
    }
  }

  // 画面外の爆弾を削除
  bombs = bombs.filter(b =>
    b.x > -50 &&
    b.x < canvas.width + 50 &&
    b.y > -50 &&
    b.y < canvas.height + 50
  );
}

//コインの判定
function updateCoins() {
  for (let i = coins.length - 1; i >= 0; i--) {
    let coin = coins[i];

    if (
      Math.abs(coin.x - player.x) < (coin.size + player.size) / 2 &&
      Math.abs(coin.y - player.y) < (coin.size + player.size) / 2
    ) {
      coinCount++;
      coins.splice(i, 1); // コインを削除
      continue
    }

    // ★ 点滅開始（消える1秒前）

    let now = Date.now();
    if (now - coin.createdAt > 3000) {   // 寿命5秒なら残り1秒
      coin.blink = true;
    }

    // ★ 寿命で消える（5秒）
    if (now - coin.createdAt > 5000) {
      coins.splice(i, 1);
    }
  }
}

// 描画
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // プレイヤー
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
  ctx.fill();

  // 爆弾
  for (let bomb of bombs) {
    ctx.fillStyle = bomb.color;
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // コイン点滅
  for (let coin of coins) {

    // ★ blink が true のときは点滅（0.2秒ごとに消える）
    if (coin.blink && Math.floor(Date.now() / 200) % 2 === 0) {
    continue; // 描画しない → 点滅して見える
    }

    ctx.fillStyle = coin.color;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// スコア更新
function updateScore() {
  let now = Date.now();
  let seconds = Math.floor((now - startTime) / 1000);
  scoreDisplay.textContent = `生存時間: ${seconds} 秒 / コイン: ${coinCount} 枚`;
}

// ゲームループ
let gameLoopId;

function gameLoop() {
  updateBombs();
  updateCoins();
  draw();
  updateScore();
  gameLoopId = requestAnimationFrame(gameLoop);
}

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

// ゲームオーバー
function gameOver() {
  if (!startTime) return;  // ← 追加（score が NaN になるのを防ぐ）

  clearInterval(bombInterval);
  if (spawnAccelerator) {
    clearInterval(spawnAccelerator);
    spawnAccelerator = null;
  }

  player.invincible = true;
//データ保存
  let now = Date.now();
  let seconds = Math.floor((now - startTime) / 1000);
  let finalScore = seconds * coinCount;
  saveScore(finalScore);
  
  const overlay = document.createElement("div");
  overlay.id = "gameOverOverlay";
  overlay.innerHTML = `
    <div class="game-over-box">
      <h2>ゲームオーバー！</h2>
      <p>遊んでくれてありがとう！</p>
      <button id="restartBtn">もう一度プレイ</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  document.getElementById("restartBtn").addEventListener("click", () => {
    location.reload();
  });
}

//コイン生成タイマー
let coinInterval = null;

function startSpawningCoins() {
  coinInterval = setInterval(() => {
    spawnCoin();
  }, 3000); // 3秒ごとにコイン出現
}

//コインを生成する関数
function spawnCoin() {
  coins.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 25,
    color: "gold",
    createdAt: Date.now(),
    blink: false 
  });
}

// ⭐ 爆弾生成速度を上げる関数
let spawnRate = 800;

function startSpawningBombs() {
  bombInterval = setInterval(() => {
    let r = Math.random();
    if (r < 0.25) spawnBombTop();
    else if (r < 0.5) spawnBombBottom();
    else if (r < 0.75) spawnBombLeft();
    else spawnBombRight();
  }, spawnRate);

  if (!spawnAccelerator) {
    spawnAccelerator = setInterval(() => {
      if (spawnRate > 300) {
        spawnRate -= 30;
        clearInterval(bombInterval);
        startSpawningBombs();
      } else {
        clearInterval(spawnAccelerator);
        spawnAccelerator = null;
      }
    }, 5000);
  }
}

// ⭐ ランキング表示（ゲーム開始前に呼ぶ）
window.onload = () => {
  displayRanking();
};

//ゲームスタート
document.getElementById("startBtn").addEventListener("click", () => {
  nickname = document.getElementById("nickname").value || "名無し";

  document.getElementById("startScreen").style.display = "none";

  startTime = Date.now();

  startSpawningBombs();
  startSpawningCoins();
  gameLoop();
});
