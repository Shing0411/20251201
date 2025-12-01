// --- 變數宣告區 ---

// 1. 平常 (循環)
let idleAnim = { img: null, frames: 6, path: '平常/66.png', w: 0, h: 0 };
// 2. 跳 (單次)
let jumpAnim = { img: null, frames: 6, path: '跳/33.png', w: 0, h: 0 };
// 3. 舞 (單次)
let danceAnim = { img: null, frames: 6, path: '舞/55.png', w: 0, h: 0 };
// 4. 跑 (循環)
let runAnim = { img: null, frames: 4, path: '跑/22.png', w: 0, h: 0 };
// 5. 打 (攻擊)
let attackAnim = { img: null, frames: 4, path: '打/77.png', w: 0, h: 0 };
// 6. 特效 (循環)
let effectAnim = { img: null, frames: 5, path: '特效/11.png', w: 0, h: 0 };

// --- 角色狀態控制 ---
let currentState = 'idle'; 
let charX, charY;          
let facing = 1;            // 1 為右，-1 為左
let moveSpeed = 5;         

// --- ★★★ 新增：物理模擬變數 ★★★ ---
let groundY;       // 地板的高度 (角色原本站的位置)
let vy = 0;        // 垂直速度 (Velocity Y)
let gravity = 1.5; // 重力 (數字越大掉越快)
let jumpPower = -25; // 跳躍力道 (負數代表往上)

// --- 動畫與特效管理 ---
let animTimer = 0; 
let speed = 15;       
let attackSpeed = 5;  
let projectiles = []; 
let shootCooldown = 0; 

function preload() {
  idleAnim.img = loadImage(idleAnim.path);
  jumpAnim.img = loadImage(jumpAnim.path);
  danceAnim.img = loadImage(danceAnim.path);
  runAnim.img = loadImage(runAnim.path);
  attackAnim.img = loadImage(attackAnim.path);
  effectAnim.img = loadImage(effectAnim.path);
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 計算所有圖片單格寬高
  idleAnim.w = idleAnim.img.width / idleAnim.frames;
  idleAnim.h = idleAnim.img.height;
  jumpAnim.w = jumpAnim.img.width / jumpAnim.frames;
  jumpAnim.h = jumpAnim.img.height;
  danceAnim.w = danceAnim.img.width / danceAnim.frames;
  danceAnim.h = danceAnim.img.height;
  runAnim.w = runAnim.img.width / runAnim.frames;
  runAnim.h = runAnim.img.height;
  attackAnim.w = attackAnim.img.width / attackAnim.frames;
  attackAnim.h = attackAnim.img.height;
  effectAnim.w = effectAnim.img.width / effectAnim.frames;
  effectAnim.h = effectAnim.img.height;
  
  // 設定地板位置在螢幕正中間
  groundY = height / 2;
  charX = width / 2;
  charY = groundY;
  
  noSmooth();
  imageMode(CENTER); 
}

function draw() {
  background('#bde0fe');

  // ==========================
  // Part 1: 物理模擬 (Physics)
  // ==========================
  
  // 1. 套用重力 (只要在空中，就會越來越快往下掉)
  if (charY < groundY || vy < 0) {
    vy += gravity;   // 速度增加重力
    charY += vy;     // 更新位置
  }

  // 2. 地板碰撞偵測 (落地)
  if (charY >= groundY) {
    charY = groundY; // 強制校正回地板位置
    vy = 0;          // 垂直速度歸零

    // 如果原本是跳躍狀態，落地瞬間變回平常
    if (currentState === 'jumping') {
      currentState = 'idle';
      animTimer = 0; // 重置動畫
    }
  }

  // ==========================
  // Part 2: 角色狀態邏輯
  // ==========================

  let isLockedAction = (currentState === 'jumping' || currentState === 'dancing' || currentState === 'attacking');

  if (!isLockedAction) {
    // 優先權 1: 空白鍵 -> 開始攻擊
    if (keyIsDown(32)) { 
       currentState = 'attacking';
       animTimer = 0; 
    }
    // 優先權 2: 移動
    else if (keyIsDown(RIGHT_ARROW)) {
      currentState = 'running';
      facing = 1;
      charX += moveSpeed;
    } 
    else if (keyIsDown(LEFT_ARROW)) {
      currentState = 'running';
      facing = -1;
      charX -= moveSpeed;
    } 
    else {
      currentState = 'idle';
    }
  }

  // 邊界限制 (X軸)
  let safeMargin = runAnim.w / 2;
  charX = constrain(charX, safeMargin, width - safeMargin);

  // 決定使用哪一組動畫資料
  let currentAnimData;
  if (currentState === 'jumping') currentAnimData = jumpAnim;
  else if (currentState === 'dancing') currentAnimData = danceAnim;
  else if (currentState === 'running') currentAnimData = runAnim;
  else if (currentState === 'attacking') currentAnimData = attackAnim;
  else currentAnimData = idleAnim;

  // 動畫計時
  animTimer++;
  let currentSpeed = (currentState === 'attacking') ? attackSpeed : speed;
  let rawFrameIndex = floor(animTimer / currentSpeed);

  // --- 狀態結束檢查 ---
  
  // A. 攻擊 (Attack) 的結束檢查
  if (currentState === 'attacking') {
    if (rawFrameIndex >= currentAnimData.frames) {
      if (keyIsDown(32)) {
         // 按住空白鍵：保持攻擊狀態 (鎖定姿勢)
      } else {
         currentState = 'idle';
         animTimer = 0;
         currentAnimData = idleAnim;
         rawFrameIndex = 0;
      }
    }
  } 
  // B. 跳舞 (Dance) 的結束檢查 (跳躍已經交給物理引擎判斷，這裡只需判斷跳舞)
  else if (currentState === 'dancing') {
    if (rawFrameIndex >= currentAnimData.frames) {
      currentState = 'idle';
      animTimer = 0;
      currentAnimData = idleAnim;
      rawFrameIndex = 0;
    }
  }
  // C. 跳躍 (Jump) 不需要檢查動畫幀數，因為它是靠「落地」來結束的

  // --- 計算顯示影格 ---
  let displayFrame;
  
  if (currentState === 'attacking') {
    // 攻擊：鎖定在最後一張
    displayFrame = min(rawFrameIndex, currentAnimData.frames - 1);
  } 
  else if (currentState === 'jumping') {
    // ★★★ 跳躍修正 ★★★
    // 因為在空中的時間可能比動畫長，我們讓它播到最後一張就停住(像飛翔姿勢)，而不是循環
    displayFrame = min(rawFrameIndex, currentAnimData.frames - 1);
  }
  else {
    // 其他：循環播放
    displayFrame = rawFrameIndex % currentAnimData.frames;
  }

  // --- 特效發射邏輯 ---
  if (currentState === 'attacking' && displayFrame === 3) {
     if (shootCooldown <= 0) {
        spawnProjectile();
        shootCooldown = 10; 
     }
  }
  if (shootCooldown > 0) shootCooldown--;


  // 繪製角色
  push(); 
    translate(charX, charY);
    scale(facing, 1);
    image(
      currentAnimData.img,
      0, 0, 
      currentAnimData.w, currentAnimData.h,
      displayFrame * currentAnimData.w, 0, 
      currentAnimData.w, currentAnimData.h
    );
  pop(); 

  // ==========================
  // Part 3: 特效邏輯
  // ==========================
  
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];
    p.x += p.speed;
    let pFrame = floor(frameCount / 5) % effectAnim.frames;

    push();
      translate(p.x, p.y);
      scale(p.dir, 1); 
      image(
        effectAnim.img,
        0, 0,
        effectAnim.w, effectAnim.h,
        pFrame * effectAnim.w, 0,
        effectAnim.w, effectAnim.h
      );
    pop();

    if ((p.dir === 1 && p.x > width + 200) || (p.dir === -1 && p.x < -200)) {
      projectiles.splice(i, 1); 
    }
  }
}

// 產生特效
function spawnProjectile() {
  let newProjectile = {
    x: charX + (80 * facing), 
    y: charY - 50,            
    dir: facing,              
    speed: 20 * facing      
  };
  projectiles.push(newProjectile);
}

// --- 按鍵事件 ---
function keyPressed() {
  // 檢查是否處於「不可打斷」的動作中
  // 注意：現在跳躍中也可以按空白鍵(空中攻擊)嗎？如果不行的話就維持原樣
  let isActionActive = (currentState === 'jumping' || currentState === 'dancing' || currentState === 'attacking');
  
  // 允許在平常或跑步時跳躍，或是在跳舞時無法跳躍
  // 這裡特別放寬：如果只是 'running' or 'idle' 就可以跳
  if (currentState === 'idle' || currentState === 'running') {
    if (keyCode === UP_ARROW) {
      currentState = 'jumping';
      animTimer = 0;
      vy = jumpPower; // ★★★ 給予向上速度 (發射！) ★★★
    } else if (keyCode === DOWN_ARROW) {
      currentState = 'dancing';
      animTimer = 0;
    } 
  }
  
  if (key === ' ' && !isActionActive) {
    currentState = 'attacking';
    animTimer = 0;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  groundY = height / 2; // 視窗改變大小時，重新計算地板位置
  charY = groundY;      // 讓角色回到地板
  let safeMargin = runAnim.w / 2;
  charX = constrain(charX, safeMargin, width - safeMargin);
}
