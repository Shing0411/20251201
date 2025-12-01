// --- 變數宣告區 ---

// 1. 平常 (循環)
let idleAnim = { img: null, frames: 6, path: '平常/66.png', w: 0, h: 0 };
// 2. 跳 (單次)
let jumpAnim = { img: null, frames: 6, path: '跳/33.png', w: 0, h: 0 };
// 3. 舞 (單次)
let danceAnim = { img: null, frames: 6, path: '舞/55.png', w: 0, h: 0 };
// 4. 跑 (循環)
let runAnim = { img: null, frames: 4, path: '跑/22.png', w: 0, h: 0 };
// 5. 打 (先播完一次，按住則鎖定在最後一張)
let attackAnim = { img: null, frames: 4, path: '打/77.png', w: 0, h: 0 };
// 6. 特效 (循環)
let effectAnim = { img: null, frames: 5, path: '特效/11.png', w: 0, h: 0 };

// --- 角色狀態控制 ---
let currentState = 'idle'; 
let charX, charY;          
let facing = 1;            // 1 為右，-1 為左
let moveSpeed = 5;         

// --- 動畫與特效管理 ---
let animTimer = 0; 
let speed = 15;       // 一般動畫速度 (數字越大越慢)
let attackSpeed = 5;  // ★★★ 打鬥動畫速度 (數字越小越快，設為 5 會很有打擊感) ★★★
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
  
  charX = width / 2;
  charY = height / 2;
  
  noSmooth();
  imageMode(CENTER); 
}

function draw() {
  background('#bde0fe');

  // ==========================
  // Part 1: 角色邏輯
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

  // 邊界限制
  let safeMargin = runAnim.w / 2;
  charX = constrain(charX, safeMargin, width - safeMargin);

  // 決定使用哪一組動畫資料
  let currentAnimData;
  if (currentState === 'jumping') currentAnimData = jumpAnim;
  else if (currentState === 'dancing') currentAnimData = danceAnim;
  else if (currentState === 'running') currentAnimData = runAnim;
  else if (currentState === 'attacking') currentAnimData = attackAnim;
  else currentAnimData = idleAnim;

  // --- ★★★ 關鍵修改：決定目前的速度 ★★★ ---
  animTimer++;
  
  let currentSpeed = speed; // 預設使用一般速度 (15)
  if (currentState === 'attacking') {
    currentSpeed = attackSpeed; // 如果是打鬥，使用打鬥速度 (5)
  }
  
  let rawFrameIndex = floor(animTimer / currentSpeed);

  // 攻擊狀態結束邏輯
  if (currentState === 'attacking') {
    if (rawFrameIndex >= currentAnimData.frames) {
      if (keyIsDown(32)) {
        // 按住不放：維持狀態
      } else {
        // 放開：回到平常
        currentState = 'idle';
        animTimer = 0;
        currentAnimData = idleAnim;
        rawFrameIndex = 0;
      }
    }
  } 
  else if (currentState === 'jumping' || currentState === 'dancing') {
    if (rawFrameIndex >= currentAnimData.frames) {
      currentState = 'idle';
      animTimer = 0;
      currentAnimData = idleAnim;
      rawFrameIndex = 0;
    }
  }

  // 計算顯示影格
  let displayFrame;
  if (currentState === 'attacking') {
    displayFrame = min(rawFrameIndex, currentAnimData.frames - 1);
  } else {
    displayFrame = rawFrameIndex % currentAnimData.frames;
  }

  // --- 特效發射邏輯 (偵測影格) ---
  if (currentState === 'attacking' && displayFrame === 3) {
     if (shootCooldown <= 0) {
        spawnProjectile();
        // 設定冷卻時間 (配合打鬥速度，設短一點讓連發更爽快)
        shootCooldown = 10; 
     }
  }
  // 減少冷卻時間
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
  // Part 2: 特效邏輯
  // ==========================
  
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];
    p.x += p.speed;
    let pFrame = floor(frameCount / 5) % effectAnim.frames; // 特效本身的速度

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
  let isActionActive = (currentState === 'jumping' || currentState === 'dancing' || currentState === 'attacking');
  
  if (!isActionActive) {
    if (keyCode === UP_ARROW) {
      currentState = 'jumping';
      animTimer = 0;
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
  let safeMargin = runAnim.w / 2;
  charX = constrain(charX, safeMargin, width - safeMargin);
}