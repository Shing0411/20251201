// ==========================================
// P5.JS 解謎逃脫遊戲 - 攻擊互動版
// (加入子彈碰撞、關主被打倒地、自動起身機制)
// ==========================================

// --- 資源變數 ---
let idleAnim = { img: null, frames: 6, path: '平常/66.png' };
let jumpAnim = { img: null, frames: 6, path: '跳/33.png' };
let danceAnim = { img: null, frames: 6, path: '舞/55.png' };
let runAnim = { img: null, frames: 4, path: '跑/22.png' };
let attackAnim = { img: null, frames: 4, path: '打/77.png' };
let effectAnim = { img: null, frames: 5, path: '特效/11.png' };
let npcImg1, npcImg2, npcImg3; 
let hintImg; 

// --- 縮放控制 ---
let globalScale = 0.6; 
const PLAYER_SCALE_MOD = 1.8; 
const NPC_SCALE_MOD = 0.6;    

// --- 角色與物理 ---
let charX, charY, facing = 1;
let groundY; 
let vy = 0, gravity = 1.5, jumpPower = -25;
let currentState = 'idle';
let moveSpeed = 5;

// --- 動畫管理 ---
let animTimer = 0;
let speed = 15;
let attackSpeed = 5;
let projectiles = [];
let shootCooldown = 0;

// --- 解謎與遊戲系統 ---
let gameState = 'start'; 
let questionTable;         
let npcs = [];     
let hintChar; 
let currentNPC = null;     
let currentQuestion = null;
let showHint = false;      
let solvedCount = 0;       
let escapeDoorX = 0;       

// 全域題庫
let globalQPool = []; 

// --- 特效系統 ---
let fireworks = [];
let bgParticles = [];

// --- 玩家與介面 ---
let playerName = "";       
let nameInput, startButton; 
let helperName = "提示精靈";

function preload() {
  idleAnim.img = loadImage(idleAnim.path);
  jumpAnim.img = loadImage(jumpAnim.path);
  danceAnim.img = loadImage(danceAnim.path);
  runAnim.img = loadImage(runAnim.path);
  attackAnim.img = loadImage(attackAnim.path);
  effectAnim.img = loadImage(effectAnim.path);
  npcImg1 = loadImage('1.png');
  npcImg2 = loadImage('2.png');
  npcImg3 = loadImage('3.png');
  hintImg = loadImage('4.png');
  questionTable = loadTable('quiz.csv', 'csv', 'header', 
    () => console.log("quiz.csv 讀取成功！"),
    () => console.error("讀取失敗！請檢查 quiz.csv")
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  updateGlobalScale();
  updateAllAnimSizes(); 

  groundY = height * 0.8;
  
  charX = width * 0.1; 
  if (idleAnim.destH) charY = groundY - (idleAnim.destH / 2);
  else charY = groundY - 50;

  escapeDoorX = width - 60; 

  noSmooth();
  imageMode(CENTER);
  textAlign(CENTER, CENTER);

  // --- 輸入介面 ---
  nameInput = createInput();
  styleDomElement(nameInput, width/2 - 100, height/2, 200, 30);
  nameInput.attribute('placeholder', '請輸入你的大名');
  
  startButton = createButton('開始挑戰');
  styleDomElement(startButton, width/2 - 50, height/2 + 50, 100, 40);
  startButton.style('cursor', 'pointer');
  startButton.style('background-color', '#ffd700'); 
  startButton.style('border', 'none'); 
  startButton.style('font-weight', 'bold');
  
  startButton.mousePressed(() => {
    let val = nameInput.value();
    if (val.trim() !== "") {
      playerName = val;
      gameState = 'roaming'; 
      nameInput.hide();      
      startButton.hide();    

      vy = 0;
      charY = groundY - (idleAnim.destH / 2);
      fillGlobalQuestionPool();

    } else {
      alert("請先輸入名字喔！");
    }
  });

  // NPC 位置 (15%, 45%, 75%)
  npcs.push(new ImageNPC(width * 0.15, groundY, 1, npcImg1)); 
  npcs.push(new ImageNPC(width * 0.45, groundY, 2, npcImg2)); 
  npcs.push(new ImageNPC(width * 0.75, groundY, 3, npcImg3)); 

  hintChar = new HintCharacter(hintImg);

  for(let i=0; i<50; i++) bgParticles.push(new BGParticle());
}

function draw() {
  drawStudioBackground();
  drawStageFloor(); 

  if (gameState === 'start') {
    fill(0, 100); rectMode(CORNER); rect(0, 0, width, height);
    fill(255); stroke(0); strokeWeight(3); textAlign(CENTER, CENTER);
    textSize(50 * (width < 600 ? 0.6 : 1)); 
    text("知識迷宮逃脫", width/2, height/2 - 120);
    noStroke();
    fill('#ffd700'); textSize(24);
    text("準備好接受考驗了嗎？", width/2, height/2 - 60);
    return; 
  }

  drawEscapeDoor();
  drawInfoPanel();

  if (gameState === 'roaming') {
    handlePhysics();
    handleInput();
    
    // 更新並顯示 NPC (包含倒地邏輯)
    for (let npc of npcs) {
      npc.update(); // ★★★ 新增 update 處理倒地計時 ★★★
      npc.display();
    }

    handleAnimation(); 

    for (let npc of npcs) {
        npc.checkProximity(charX, charY);
    }
    
    if (solvedCount >= 3 && charX > width - 120) {
      gameState = 'win';
    }
  } 
  else if (gameState === 'quiz') {
    drawCharacter(charX, charY, idleAnim, 0); 
    if(currentNPC) currentNPC.display(); 
    drawQuizUI();
  }
  else if (gameState === 'win') {
    let yPos = groundY - (danceAnim.destH / 2);
    drawCharacter(escapeDoorX - 30, yPos, danceAnim, floor(frameCount/10)%danceAnim.frames);
    fill(0, 150); rectMode(CORNER); rect(0, 0, width, height);
    fill('#ffd700'); stroke(0); strokeWeight(3); textAlign(CENTER, CENTER);
    textSize(60 * (width < 600 ? 0.6 : 1));
    text(`恭喜 ${playerName}！`, width/2, height/2 - 50);
    fill(255);
    text("闖關成功！", width/2, height/2 + 50);
    noStroke(); textSize(20);
    text("重新整理頁面再來一次", width/2, height/2 + 120);
    if(frameCount % 20 === 0) fireworks.push(new Firework(random(width), random(height/2)));
  }
  
  handleProjectiles(); 
  
  for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].update(); fireworks[i].display();
    if (fireworks[i].done()) fireworks.splice(i, 1);
  }
}

function fillGlobalQuestionPool() {
    let allQuestions = questionTable.getRows();
    globalQPool = [...allQuestions]; 
    shuffle(globalQPool, true);      
}

// ============================================
// UI 與背景
// ============================================

function drawStudioBackground() {
  noFill();
  for (let y = 0; y <= height; y++) {
      let inter = map(y, 0, height, 0, 1);
      let c = lerpColor(color('#1a237e'), color('#4a148c'), inter); 
      stroke(c); line(0, y, width, y);
  }
  noStroke();
  for(let p of bgParticles) { p.update(); p.display(); }
}

function drawStageFloor() {
    rectMode(CORNER);
    fill('#0d47a1'); rect(0, groundY, width, height - groundY);
    fill('#1565c0'); noStroke();
    rect(0, groundY, width, 15);
}

function drawEscapeDoor() {
  let doorW = 80 * globalScale; let doorH = 160 * globalScale;
  let doorX = escapeDoorX; let doorY = groundY - doorH/2;
  rectMode(CENTER);
  fill(solvedCount >= 3 ? '#00c853' : '#d50000');
  stroke(255); strokeWeight(3); 
  rect(doorX, doorY, doorW, doorH, 5);
  fill(solvedCount >= 3 ? '#69f0ae' : '#ff5252'); noStroke();
  rect(doorX, doorY, doorW-8, doorH-8, 3);
  fill(255); stroke(0); strokeWeight(2); textSize(16);
  textAlign(CENTER, CENTER);
  text(solvedCount >= 3 ? "逃脫口" : "上鎖中", doorX, doorY - doorH/2 - 20);
}

function drawInfoPanel() {
    push(); translate(130, 40);
    fill(255); noStroke(); textSize(18); textAlign(LEFT, CENTER);
    drawingContext.shadowBlur = 5; drawingContext.shadowColor = 'black';
    text(`挑戰者: ${playerName}`, -100, -10);
    text(`進度: ${solvedCount} / 3`, -100, 15);
    drawingContext.shadowBlur = 0; 
    fill(0, 100); stroke(255); strokeWeight(2);
    rectMode(CORNER);
    rect(50, 8, 100, 15, 10);
    noStroke(); fill('#ffd700');
    let progress = map(solvedCount, 0, 3, 0, 96);
    if(progress > 0) rect(52, 10, progress, 11, 8);
    pop();
}

function drawQuizUI() {
  let uiW = width < 600 ? width * 0.95 : 650; let uiH = 450;
  let uiX = width / 2; let uiY = height / 2; 
  rectMode(CENTER); fill(20, 30, 80, 240);
  stroke('#ffd700'); strokeWeight(2); 
  rect(uiX, uiY, uiW, uiH, 15);
  fill('#1a237e'); noStroke();
  rect(uiX, uiY - uiH/2 + 40, uiW-4, 60, 15, 15, 0, 0);
  fill('#ffd700'); textSize(28); textAlign(CENTER, CENTER);
  text(`【 關主 ${currentNPC.id} 的考驗 】`, uiX, uiY - uiH/2 + 40);
  textSize(width < 600 ? 22 : 30); fill(255); noStroke(); 
  text(currentQuestion.getString('question'), uiX, uiY - 60);
  drawOptionBtn(uiX, uiY + 50, `[1] ${currentQuestion.getString('optA')}`);
  drawOptionBtn(uiX, uiY + 110, `[2] ${currentQuestion.getString('optB')}`);
  drawOptionBtn(uiX, uiY + 170, `[3] ${currentQuestion.getString('optC')}`);
  fill('#b3e5fc'); noStroke(); textSize(16);
  text("請按鍵盤數字鍵 1, 2, 3 作答", uiX, uiY + 220);
  if (showHint) { drawHintBox(uiX, uiY, uiW); } 
  else { fill('#ffd700'); textSize(18); text("遇到困難了嗎？ 按下 [H] 召喚提示精靈", uiX, uiY - 150); }
}

function drawOptionBtn(x, y, txt) {
    rectMode(CENTER);
    fill(60, 70, 180, 200); noStroke(); 
    rect(x, y, 500, 45, 10);
    fill(255); textSize(width < 600 ? 18 : 22);
    textAlign(CENTER, CENTER);
    text(txt, x, y);
}

function drawHintBox(uiX, uiY, uiW) {
    let hintBoxW = uiW * 0.8; let hintBoxH = 90; let hintBoxY = uiY - 160; 
    let charTargetX = uiX + hintBoxW/2 + 60;
    if(width < 700) charTargetX = uiX; 
    hintChar.updateAndDisplay(charTargetX, hintBoxY);
    rectMode(CENTER); fill(255, 245, 220, 250); stroke('#ffa000'); strokeWeight(2);
    rect(uiX, hintBoxY, hintBoxW, hintBoxH, 15);
    fill('#4e342e'); noStroke(); textSize(width < 600 ? 16 : 20); textAlign(LEFT, CENTER);
    text(`💡${helperName}：\n${currentQuestion.getString('hint')}`, uiX - hintBoxW/2 + 20, hintBoxY);
    textAlign(CENTER, CENTER);
}

// ============================================
// 特效
// ============================================
class BGParticle {
    constructor() { this.x = random(width); this.y = random(height); this.size = random(1, 3); this.speedY = random(0.1, 0.5); this.alpha = random(50, 150); }
    update() { this.y -= this.speedY; if (this.y < 0) this.y = height; }
    display() { fill(255, this.alpha); ellipse(this.x, this.y, this.size); }
}
class Particle {
  constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.angle = random(TWO_PI); this.speed = random(3, 10); this.vx = cos(this.angle)*this.speed; this.vy = sin(this.angle)*this.speed; this.alpha = 255; this.gravity = 0.2; }
  update() { this.vy += this.gravity; this.x += this.vx; this.y += this.vy; this.alpha -= 8; }
  display() { noStroke(); fill(red(this.color), green(this.color), blue(this.color), this.alpha); ellipse(this.x, this.y, 5); }
  done() { return this.alpha <= 0; }
}
class Firework {
  constructor(x, y) { this.x = x; this.y = y; this.particles = []; let colors = [color('#ff5252'), color('#ffd700'), color('#69f0ae'), color('#40c4ff'), color('#e040fb')]; let c = random(colors); for (let i=0; i<60; i++) this.particles.push(new Particle(this.x, this.y, c)); }
  update() { for (let i=this.particles.length-1; i>=0; i--) { this.particles[i].update(); if (this.particles[i].done()) this.particles.splice(i, 1); } }
  display() { for (let p of this.particles) p.display(); }
  done() { return this.particles.length === 0; }
}

// ============================================
// 遊戲邏輯類別
// ============================================
class HintCharacter {
  constructor(img) { this.img = img; this.scaleVal = 0; this.visible = false; }
  appear() { this.visible = true; }
  hide() { this.visible = false; this.scaleVal = 0; }
  updateAndDisplay(tx, ty) { if (!this.visible) return; if (this.scaleVal < 1) this.scaleVal += 0.1; let displayW = this.img.width*globalScale*this.scaleVal; let displayH = this.img.height*globalScale*this.scaleVal; push(); translate(tx, ty); image(this.img, 0, 0, displayW, displayH); pop(); }
}

class ImageNPC {
  constructor(x, groundY, id, img) { 
    this.x = x; this.id = id; this.img = img; this.cleared = false; 
    this.updateSize(groundY); 
    
    // ★★★ 狀態管理：是否被暈眩 ★★★
    this.isStunned = false; 
    this.stunTimer = 0;
    this.rotation = 0; // 旋轉角度
  }

  updateSize(gY) { this.w = this.img.width*globalScale*NPC_SCALE_MOD; this.h = this.img.height*globalScale*NPC_SCALE_MOD; this.y = gY - (this.h / 2); }
  
  // ★★★ 被攻擊時的處理 ★★★
  hit() {
      if(!this.isStunned) {
          this.isStunned = true;
          this.stunTimer = 180; // 暈眩約 3 秒 (60fps * 3)
      }
  }

  // ★★★ 每幀更新狀態 ★★★
  update() {
      if(this.isStunned) {
          // 倒下動畫 (插值旋轉到 90度)
          this.rotation = lerp(this.rotation, PI/2, 0.2);
          this.stunTimer--;
          if(this.stunTimer <= 0) {
              this.isStunned = false; // 恢復正常
          }
      } else {
          // 站起來 (插值旋轉回 0度)
          this.rotation = lerp(this.rotation, 0, 0.2);
      }
  }

  display() { 
    push(); 
    translate(this.x, this.y); 
    
    // ★★★ 應用旋轉 ★★★
    // 旋轉中心點在底部 (因為我們定位是定在底部)
    // 但為了倒下好看，我們將旋轉點移到圖片底部中心
    translate(0, this.h/2); // 移到底部
    rotate(this.rotation);
    translate(0, -this.h/2); // 移回來
    
    if (this.cleared) tint(80); 
    
    // 如果暈眩，閃爍紅色
    if(this.isStunned) tint(255, 100, 100);

    image(this.img, 0, 0, this.w, this.h); 
    noTint(); 
    
    // 暈眩時不顯示名字標籤，顯示「暈眩中...」
    rectMode(CENTER); textAlign(CENTER, CENTER);
    fill(20, 30, 80, 200); stroke('#ffd700'); strokeWeight(2); 
    rect(0, -this.h/2 - 25, 90, 26, 8); 
    fill('#ffd700'); noStroke(); textSize(13); 
    
    if(this.isStunned) text("😵 暈眩中...", 0, -this.h/2 - 25);
    else text(this.cleared ? "已通關" : `關主 ${this.id}`, 0, -this.h/2 - 25); 
    
    pop(); 
  }

  checkProximity(px, py) { 
    if (this.cleared) return; 
    // ★★★ 暈眩時不能對話 ★★★
    if (this.isStunned) return;

    if (abs(px - this.x) < 80) { 
      rectMode(CENTER); textAlign(CENTER, CENTER);
      fill('#ffd700'); stroke(0); strokeWeight(2); textSize(18); 
      text("按 [E] 挑戰", this.x, this.y - this.h/2 - 55); 
      if (keyIsDown(69)) this.startQuiz(); 
    } 
  }

  startQuiz() { 
    if (gameState === 'quiz') return; 
    gameState = 'quiz'; currentNPC = this; showHint = false; hintChar.hide(); 
    
    if (globalQPool.length === 0) fillGlobalQuestionPool();
    if (globalQPool.length > 0) currentQuestion = globalQPool.pop(); 
    else { console.error("題目不足"); gameState = 'roaming'; } 
  }
}

function updateGlobalScale() { if (width < 600) globalScale = 0.35; else if (width < 1000) globalScale = 0.5; else globalScale = 0.65; }
function updateAllAnimSizes() { calculateAnimSize(idleAnim, PLAYER_SCALE_MOD); calculateAnimSize(jumpAnim, PLAYER_SCALE_MOD); calculateAnimSize(danceAnim, PLAYER_SCALE_MOD); calculateAnimSize(runAnim, PLAYER_SCALE_MOD); calculateAnimSize(attackAnim, PLAYER_SCALE_MOD); calculateAnimSize(effectAnim, 1.0); }
function calculateAnimSize(anim, extraScale = 1.0) { if (anim.img) { anim.origW = anim.img.width/anim.frames; anim.origH = anim.img.height; anim.destW = anim.origW*globalScale*extraScale; anim.destH = anim.origH*globalScale*extraScale; } }
function styleDomElement(elt, x, y, w, h) { elt.position(x, y); elt.size(w, h); elt.style('font-size', '18px'); elt.style('text-align', 'center'); elt.style('border-radius', '10px'); elt.style('box-shadow', 'none'); elt.style('border', '2px solid #4fc3f7'); }

function handlePhysics() { let playerBottom = charY + (idleAnim.destH / 2); if (playerBottom < groundY || vy < 0) { vy += gravity; charY += vy; } else { vy = 0; charY = groundY - (idleAnim.destH / 2); if (currentState === 'jumping') { currentState = 'idle'; animTimer = 0; } } charX = constrain(charX, width*0.02, width*0.98); }
function handleInput() { let isAction = (currentState === 'jumping' || currentState === 'dancing' || currentState === 'attacking'); if (!isAction) { if (keyIsDown(32)) { currentState = 'attacking'; animTimer = 0; } else if (keyIsDown(RIGHT_ARROW)) { currentState = 'running'; facing = 1; charX += moveSpeed; } else if (keyIsDown(LEFT_ARROW)) { currentState = 'running'; facing = -1; charX -= moveSpeed; } else { currentState = 'idle'; } } }
function handleAnimation() { animTimer++; let currentAnimData = idleAnim; if (currentState === 'jumping') currentAnimData = jumpAnim; else if (currentState === 'dancing') currentAnimData = danceAnim; else if (currentState === 'running') currentAnimData = runAnim; else if (currentState === 'attacking') currentAnimData = attackAnim; let spd = (currentState === 'attacking') ? attackSpeed : speed; let idx = floor(animTimer / spd); if (currentState === 'attacking' && idx >= currentAnimData.frames && !keyIsDown(32)) currentState = 'idle'; let frame = idx % currentAnimData.frames; if(currentState === 'attacking' || currentState === 'jumping') frame = min(idx, currentAnimData.frames-1); if(currentState === 'attacking' && frame === 3 && shootCooldown <= 0) { projectiles.push({x: charX + 80*facing*globalScale, y: charY, dir: facing, speed: 20*facing}); shootCooldown = 10; } if(shootCooldown > 0) shootCooldown--; drawCharacter(charX, charY, currentAnimData, frame); }
function drawCharacter(x, y, anim, frame) { push(); translate(x, y); scale(facing, 1); if(anim.img) { image(anim.img, 0, 0, anim.destW, anim.destH, frame * anim.origW, 0, anim.origW, anim.origH); } else { rect(0, 0, 50, 100); } pop(); }

// ★★★ 子彈與 NPC 碰撞偵測 ★★★
function handleProjectiles() { 
    for (let i = projectiles.length - 1; i >= 0; i--) { 
        let p = projectiles[i]; 
        p.x += p.speed; 
        let pf = floor(frameCount/5) % effectAnim.frames; 
        
        push(); translate(p.x, p.y); scale(p.dir, 1); 
        if(effectAnim.img) image(effectAnim.img, 0, 0, effectAnim.destW, effectAnim.destH, pf * effectAnim.origW, 0, effectAnim.origW, effectAnim.origH); 
        pop(); 
        
        // 碰撞檢查迴圈
        let hit = false;
        for (let npc of npcs) {
            // 距離判定 (簡單矩形或圓形判定)
            if (!npc.cleared && abs(p.x - npc.x) < npc.w/2 && abs(p.y - npc.y) < npc.h/2) {
                npc.hit(); // 觸發 NPC 受傷
                hit = true;
                break; // 一顆子彈只打一個人
            }
        }

        if (hit || p.x > width + 200 || p.x < -200) {
            projectiles.splice(i, 1); 
        }
    } 
}

function keyPressed() {
  if (gameState === 'quiz') {
    let ans = currentQuestion.getString('answer'); 
    if (key === '1' || key === '2' || key === '3') {
      if (key === ans) {
        fireworks.push(new Firework(currentNPC.x, currentNPC.y - 100));
        currentNPC.cleared = true; solvedCount++; gameState = 'roaming'; hintChar.hide(); 
      } else { showHint = true; hintChar.appear(); }
    }
    if (key === 'h' || key === 'H') { showHint = true; hintChar.appear(); }
  } 
  else if (gameState === 'roaming') {
    if ((currentState === 'idle' || currentState === 'running') && keyCode === UP_ARROW) { currentState = 'jumping'; animTimer = 0; vy = jumpPower; }
  }
}

function windowResized() { createCanvas(windowWidth, windowHeight); updateGlobalScale(); if (gameState === 'start') { styleDomElement(nameInput, width/2 - 100, height/2, 200, 30); styleDomElement(startButton, width/2 - 50, height/2 + 50, 100, 40); } updateAllAnimSizes(); groundY = height * 0.8; charY = groundY - (idleAnim.destH / 2); escapeDoorX = width - 60; if (npcs.length > 0) { npcs[0].x = width * 0.15; npcs[0].updateSize(groundY); npcs[1].x = width * 0.45; npcs[1].updateSize(groundY); npcs[2].x = width * 0.75; npcs[2].updateSize(groundY); } }