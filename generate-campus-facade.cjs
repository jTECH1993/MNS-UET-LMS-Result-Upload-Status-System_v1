const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');

// Generate a high-resolution 1920x800 photographic rendering of MNS UET Multan Main Academic Block
// strictly matching "ChatGPT Image Sep 24, 2026, 11_41_36 AM.png"
const W = 1920;
const H = 800;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// 1. SKY BACKGROUND (Brilliant vibrant blue sky with realistic atmospheric gradient)
const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
skyGrad.addColorStop(0, '#1e5fba');
skyGrad.addColorStop(0.25, '#2e7ee6');
skyGrad.addColorStop(0.55, '#5ea8f4');
skyGrad.addColorStop(0.85, '#a3d1fc');
skyGrad.addColorStop(1.0, '#dbeafe');
ctx.fillStyle = skyGrad;
ctx.fillRect(0, 0, W, H * 0.6);

// Function to draw fluffy cumulus clouds
function drawCloud(cx, cy, scale, density = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale * 0.7);

  // Soft ambient cloud base
  const puffs = [
    { x: -90, y: 10, r: 50 },
    { x: -50, y: -20, r: 75 },
    { x: 0, y: -45, r: 95 },
    { x: 50, y: -30, r: 85 },
    { x: 95, y: -5, r: 65 },
    { x: 135, y: 15, r: 45 },
    { x: -125, y: 20, r: 35 },
    { x: 20, y: 15, r: 70 },
  ];

  // Cloud underside / shadow
  ctx.fillStyle = `rgba(165, 185, 215, ${0.45 * density})`;
  for (const p of puffs) {
    ctx.beginPath();
    ctx.arc(p.x, p.y + 16, p.r * 1.05, 0, Math.PI * 2);
    ctx.fill();
  }

  // Midtone white-blue
  ctx.fillStyle = `rgba(235, 245, 255, ${0.85 * density})`;
  for (const p of puffs) {
    ctx.beginPath();
    ctx.arc(p.x, p.y + 4, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pure white sunlit highlights
  ctx.fillStyle = `rgba(255, 255, 255, ${0.98 * density})`;
  for (const p of puffs) {
    ctx.beginPath();
    ctx.arc(p.x - 6, p.y - 10, p.r * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Generate scattered clouds matching the screenshot
drawCloud(220, 110, 1.4, 0.95);
drawCloud(560, 80, 1.8, 0.98);
drawCloud(850, 130, 1.2, 0.85);
drawCloud(1180, 95, 2.1, 0.98);
drawCloud(1520, 75, 1.6, 0.95);
drawCloud(1800, 130, 1.3, 0.88);
drawCloud(380, 180, 0.9, 0.7);
drawCloud(1380, 185, 1.1, 0.75);

// Distant soft tree line behind building
ctx.fillStyle = '#476f49';
for (let x = 0; x < W; x += 30) {
  const h = 25 + Math.sin(x * 0.05) * 12;
  ctx.beginPath();
  ctx.ellipse(x, H * 0.44, 25, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

// -------------------------------------------------------------
// 2. MNS UET MULTAN MAIN ACADEMIC BUILDING
// -------------------------------------------------------------
const bX = 140;
const bW = 1640;
const bGroundY = H * 0.485;
const bH = 210;
const bTopY = bGroundY - bH;

// Building shadow on the ground
ctx.fillStyle = 'rgba(20, 45, 25, 0.35)';
ctx.fillRect(bX - 20, bGroundY, bW + 40, 14);

// Main building body - warm sand/beige stone facade
const stoneGrad = ctx.createLinearGradient(0, bTopY, 0, bGroundY);
stoneGrad.addColorStop(0, '#e5d1b5');
stoneGrad.addColorStop(0.3, '#d8c2a3');
stoneGrad.addColorStop(0.7, '#ccb492');
stoneGrad.addColorStop(1, '#bfa482');
ctx.fillStyle = stoneGrad;
ctx.fillRect(bX, bTopY, bW, bH);

// Parapet cornice top trim
ctx.fillStyle = '#f0e2cf';
ctx.fillRect(bX - 10, bTopY - 8, bW + 20, 10);
ctx.fillStyle = '#ab906e';
ctx.fillRect(bX - 10, bTopY + 2, bW + 20, 3);

// Stepped parapet architectural accents on roofline
ctx.fillStyle = '#d8c2a3';
const parapetSteps = [200, 350, 500, 680, 1140, 1320, 1470];
for (const px of parapetSteps) {
  ctx.fillRect(bX + px, bTopY - 18, 45, 12);
  ctx.fillStyle = '#f0e2cf';
  ctx.fillRect(bX + px - 2, bTopY - 20, 49, 4);
  ctx.fillStyle = '#d8c2a3';
}

// -------------------------------------------------------------
// RED BRICK CORNER WINGS / ACCENT TOWERS (Far Left & Far Right)
// -------------------------------------------------------------
function drawBrickCorner(x, width) {
  // Red brick gradient
  const brickGrad = ctx.createLinearGradient(x, bTopY, x + width, bGroundY);
  brickGrad.addColorStop(0, '#a83226');
  brickGrad.addColorStop(0.5, '#8c2419');
  brickGrad.addColorStop(1, '#6b1b12');
  ctx.fillStyle = brickGrad;
  ctx.fillRect(x, bTopY - 14, width, bH + 14);

  // Brick texture horizontal lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  for (let y = bTopY - 10; y < bGroundY; y += 7) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
  }

  // Top white ornamental geometric diamond/cross inlays
  ctx.fillStyle = '#f8fafc';
  const diamondCX = x + width / 2;
  const diamondCY = bTopY + 12;
  ctx.beginPath();
  ctx.moveTo(diamondCX - 24, diamondCY);
  ctx.lineTo(diamondCX, diamondCY - 10);
  ctx.lineTo(diamondCX + 24, diamondCY);
  ctx.lineTo(diamondCX, diamondCY + 10);
  ctx.closePath();
  ctx.fill();

  // Vertical architectural window slots
  const slotW = width * 0.22;
  const slotH = bH * 0.65;
  const slotY = bTopY + 36;
  const slots = [x + width * 0.18, x + width * 0.45, x + width * 0.72];
  for (const sx of slots) {
    ctx.fillStyle = '#0f172a'; // dark tinted glass
    ctx.fillRect(sx - slotW/2, slotY, slotW, slotH);
    ctx.strokeStyle = '#e2e8f0'; // light frame
    ctx.lineWidth = 2.5;
    ctx.strokeRect(sx - slotW/2, slotY, slotW, slotH);
    // glass reflection highlight
    const refl = ctx.createLinearGradient(sx, slotY, sx + slotW, slotY + slotH);
    refl.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    refl.addColorStop(0.5, 'rgba(15, 23, 42, 0.1)');
    refl.addColorStop(1, 'rgba(30, 58, 138, 0.4)');
    ctx.fillStyle = refl;
    ctx.fillRect(sx - slotW/2 + 2, slotY + 2, slotW - 4, slotH - 4);
  }

  // Stone base plinth
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(x - 4, bGroundY - 6, width + 8, 8);
}

drawBrickCorner(bX, 140);             // Left brick tower
drawBrickCorner(bX + bW - 140, 140);  // Right brick tower

// -------------------------------------------------------------
// VERTICAL ARCHITECTURAL GRILLE / LOUVERS (Left & Right Wings)
// -------------------------------------------------------------
function drawLouverSection(x, width) {
  const finCount = 7;
  const finW = 8;
  const gap = (width - finCount * finW) / (finCount - 1);
  for (let i = 0; i < finCount; i++) {
    const fx = x + i * (finW + gap);
    // Vertical tan concrete fin
    ctx.fillStyle = '#f5e6d3';
    ctx.fillRect(fx, bTopY + 15, finW, bH - 30);
    ctx.fillStyle = '#9e8464';
    ctx.fillRect(fx + finW - 2, bTopY + 15, 2, bH - 30);
  }
}

drawLouverSection(bX + 320, 85);
drawLouverSection(bX + bW - 405, 85);

// -------------------------------------------------------------
// RECTANGULAR WINDOWS (Ground & First Floor Across Wings)
// -------------------------------------------------------------
function drawWindowGrid(startX, endX) {
  const winW = 55;
  const winH = 46;
  const spacing = 80;

  for (let wx = startX; wx + winW <= endX; wx += spacing) {
    // Upper floor window
    drawWindow(wx, bTopY + 45, winW, winH);
    // Ground floor window
    drawWindow(wx, bTopY + 120, winW, winH);
  }
}

function drawWindow(x, y, w, h) {
  // Window frame recess
  ctx.fillStyle = '#292524';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

  // Dark tinted green/blue glass
  const winGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  winGrad.addColorStop(0, '#064e3b');
  winGrad.addColorStop(0.3, '#022c22');
  winGrad.addColorStop(0.7, '#0f172a');
  winGrad.addColorStop(1, '#065f46');
  ctx.fillStyle = winGrad;
  ctx.fillRect(x, y, w, h);

  // Glass specular reflection slash
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + h);
  ctx.lineTo(x + 25, y + h);
  ctx.lineTo(x + w - 10, y);
  ctx.lineTo(x + w - 25, y);
  ctx.closePath();
  ctx.fill();

  // White window mullion frame
  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.stroke();
}

// Left wing windows
drawWindowGrid(bX + 160, bX + 310);
drawWindowGrid(bX + 420, bX + 680);

// Right wing windows
drawWindowGrid(bX + bW - 680, bX + bW - 420);
drawWindowGrid(bX + bW - 310, bX + bW - 160);

// Horizontal mid-floor concrete trim / sunshade
ctx.fillStyle = '#f5e6d3';
ctx.fillRect(bX + 140, bTopY + 102, bW - 280, 8);
ctx.fillStyle = '#a89070';
ctx.fillRect(bX + 140, bTopY + 109, bW - 280, 2);

// -------------------------------------------------------------
// 3. GRAND CENTRAL ENTRANCE PORTICO & FACADE SIGN
// -------------------------------------------------------------
const cW = 340;
const cX = W / 2 - cW / 2;

// Central entrance backdrop recess
ctx.fillStyle = '#1c1917';
ctx.fillRect(cX, bTopY + 45, cW, bH - 45);

// Central entrance doors & glass panels
const doorW = 48;
const doorH = 75;
const doorY = bGroundY - doorH;
for (let d = 0; d < 4; d++) {
  const dx = cX + 35 + d * 70;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(dx, doorY, doorW, doorH);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(dx, doorY, doorW, doorH);
}

// Upper terrace tinted glass wall behind columns
ctx.fillStyle = '#064e3b';
ctx.fillRect(cX + 20, bTopY + 50, cW - 40, 50);
ctx.strokeStyle = '#f8fafc';
ctx.lineWidth = 2;
ctx.strokeRect(cX + 20, bTopY + 50, cW - 40, 50);

// Grand White Entrance Columns (4 tall prominent pillars)
const colW = 24;
const colPositions = [
  cX + 20,
  cX + 105,
  cX + cW - 105 - colW,
  cX + cW - 20 - colW
];

for (const colX of colPositions) {
  // Column shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(colX - 8, bTopY + 40, colW + 16, bH - 35);

  // White limestone pillar gradient
  const colGrad = ctx.createLinearGradient(colX, 0, colX + colW, 0);
  colGrad.addColorStop(0, '#ffffff');
  colGrad.addColorStop(0.35, '#f8fafc');
  colGrad.addColorStop(0.75, '#e2e8f0');
  colGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = colGrad;
  ctx.fillRect(colX, bTopY + 42, colW, bH - 42);

  // Capital & Base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(colX - 4, bTopY + 40, colW + 8, 6);
  ctx.fillRect(colX - 4, bGroundY - 8, colW + 8, 8);
}

// Portico ceiling / overhang
ctx.fillStyle = '#ffffff';
ctx.fillRect(cX - 15, bTopY + 36, cW + 30, 10);
ctx.fillStyle = '#94a3b8';
ctx.fillRect(cX - 15, bTopY + 45, cW + 30, 3);

// -------------------------------------------------------------
// MAIN OFFICIAL SIGNBOARD ATOP ROOF PARAPET
// "MUHAMMAD NAWAZ SHARIF UNIVERSITY OF"
// "ENGINEERING & TECHNOLOGY, MULTAN"
// -------------------------------------------------------------
const signW = 540;
const signH = 46;
const signX = W / 2 - signW / 2;
const signY = bTopY - 34;

// Signboard backplate (tan stone box atop entrance)
const signBackGrad = ctx.createLinearGradient(0, signY, 0, signY + signH);
signBackGrad.addColorStop(0, '#fbf7ee');
signBackGrad.addColorStop(0.5, '#ebdcc3');
signBackGrad.addColorStop(1, '#dbc5a2');
ctx.fillStyle = signBackGrad;
ctx.fillRect(signX, signY, signW, signH);

// Signboard border / molding
ctx.strokeStyle = '#b89972';
ctx.lineWidth = 3;
ctx.strokeRect(signX, signY, signW, signH);
ctx.fillStyle = '#8f6f47';
ctx.fillRect(signX, signY + signH - 3, signW, 3);

// Black uppercase typography strictly matching real signage
ctx.fillStyle = '#0f172a';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

ctx.font = '900 16px "Arial", "Helvetica Neue", sans-serif';
ctx.fillText('MUHAMMAD NAWAZ SHARIF UNIVERSITY OF', W / 2, signY + 16);

ctx.font = '900 16px "Arial", "Helvetica Neue", sans-serif';
ctx.fillText('ENGINEERING & TECHNOLOGY, MULTAN', W / 2, signY + 33);

// University Entrance Plinth Steps
ctx.fillStyle = '#e2e8f0';
ctx.fillRect(cX - 30, bGroundY - 3, cW + 60, 6);
ctx.fillStyle = '#cbd5e1';
ctx.fillRect(cX - 45, bGroundY + 3, cW + 90, 6);

// -------------------------------------------------------------
// 4. FOREGROUND VIBRANT MANICURED GREEN LAWN & LANDSCAPING
// -------------------------------------------------------------
const lawnGrad = ctx.createLinearGradient(0, bGroundY, 0, H);
lawnGrad.addColorStop(0, '#2d7a32');
lawnGrad.addColorStop(0.2, '#389e3f');
lawnGrad.addColorStop(0.5, '#48b850');
lawnGrad.addColorStop(0.85, '#3ea846');
lawnGrad.addColorStop(1.0, '#29782f');
ctx.fillStyle = lawnGrad;
ctx.fillRect(0, bGroundY, W, H - bGroundY);

// Curving Stone Paved Walkways (Interlocking Light Gray Pavers)
function drawWalkway() {
  ctx.save();
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;

  // Main central walkway widening towards bottom
  ctx.beginPath();
  ctx.moveTo(W / 2 - 35, bGroundY + 10);
  ctx.bezierCurveTo(W / 2 - 30, H * 0.6, W / 2 - 120, H * 0.75, W / 2 - 200, H);
  ctx.lineTo(W / 2 + 100, H);
  ctx.bezierCurveTo(W / 2 + 30, H * 0.75, W / 2 + 40, H * 0.6, W / 2 + 35, bGroundY + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left diagonal pathway
  ctx.beginPath();
  ctx.moveTo(W / 2 - 80, H * 0.65);
  ctx.bezierCurveTo(W * 0.35, H * 0.72, W * 0.22, H * 0.78, 0, H * 0.85);
  ctx.lineTo(0, H * 0.95);
  ctx.bezierCurveTo(W * 0.23, H * 0.84, W * 0.36, H * 0.77, W / 2 - 50, H * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right diagonal pathway towards bottom right
  ctx.beginPath();
  ctx.moveTo(W / 2 + 45, H * 0.68);
  ctx.bezierCurveTo(W * 0.65, H * 0.74, W * 0.78, H * 0.82, W, H * 0.9);
  ctx.lineTo(W, H * 0.98);
  ctx.bezierCurveTo(W * 0.77, H * 0.88, W * 0.64, H * 0.79, W / 2 + 30, H * 0.73);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

drawWalkway();

// Flowerbeds with blooming flowers (White, Magenta, Yellow, Red) along the walkways
function drawFlowerBed(cx, cy, rx, ry, flowerDensity = 18) {
  ctx.save();
  // Dark mulch/soil ring
  ctx.fillStyle = '#3f2e1e';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 4, ry + 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Deep green foliage cluster
  ctx.fillStyle = '#1e5e29';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Individual flowers
  const colors = ['#ffffff', '#f43f5e', '#ec4899', '#fde047', '#e11d48', '#f8fafc'];
  for (let i = 0; i < flowerDensity; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 0.85;
    const fx = cx + Math.cos(angle) * (rx * dist);
    const fy = cy + Math.sin(angle) * (ry * dist);
    const fr = 2.5 + Math.random() * 2.5;

    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Symmetrical round flowerbeds matching the photograph
drawFlowerBed(W / 2 - 120, H * 0.62, 38, 16, 25);
drawFlowerBed(W / 2 + 130, H * 0.62, 38, 16, 25);

drawFlowerBed(W / 2 - 240, H * 0.74, 55, 22, 40);
drawFlowerBed(W / 2 + 230, H * 0.73, 52, 20, 38);

drawFlowerBed(W * 0.18, H * 0.82, 70, 26, 50);
drawFlowerBed(W * 0.82, H * 0.84, 75, 28, 55);

// Ornamental Shrubs & Small Trees flanking the campus lawn
function drawOrnamentalTree(x, y, r, h) {
  ctx.save();
  // Small brown trunk
  ctx.fillStyle = '#452b14';
  ctx.fillRect(x - 3, y - 6, 6, h);

  // Foliage puffs
  const leafGrad = ctx.createRadialGradient(x - 5, y - h - 10, 5, x, y - h, r);
  leafGrad.addColorStop(0, '#52c41a');
  leafGrad.addColorStop(0.6, '#237804');
  leafGrad.addColorStop(1, '#092b00');
  ctx.fillStyle = leafGrad;

  ctx.beginPath();
  ctx.arc(x, y - h, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - r * 0.5, y - h + 5, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + r * 0.5, y - h + 5, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Row of ornamental lawn trees
drawOrnamentalTree(bX + 80, bGroundY + 30, 22, 25);
drawOrnamentalTree(bX + 240, bGroundY + 40, 26, 30);
drawOrnamentalTree(bX + bW - 240, bGroundY + 40, 26, 30);
drawOrnamentalTree(bX + bW - 80, bGroundY + 30, 22, 25);

// Modern Landscape Bollard Pathway Lights (black post with white diffuser)
function drawBollard(x, y) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x - 2.5, y - 18, 5, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 2, y - 16, 4, 5);
}

drawBollard(W / 2 - 45, H * 0.61);
drawBollard(W / 2 + 50, H * 0.61);
drawBollard(W / 2 - 145, H * 0.74);
drawBollard(W / 2 + 130, H * 0.72);
drawBollard(W * 0.38, H * 0.73);
drawBollard(W * 0.62, H * 0.75);

// -------------------------------------------------------------
// OUTPUT FILES
// -------------------------------------------------------------
const bufPng = canvas.toBuffer('image/png');
const bufJpg = canvas.toBuffer('image/jpeg', { quality: 0.95 });

fs.writeFileSync('public/mns-uet-campus.png', bufPng);
fs.writeFileSync('public/mns-uet-campus.jpg', bufJpg);
fs.writeFileSync('public/mns-uet-campus-alt.jpg', bufJpg);

if (fs.existsSync('dist')) {
  fs.writeFileSync('dist/mns-uet-campus.png', bufPng);
  fs.writeFileSync('dist/mns-uet-campus.jpg', bufJpg);
  fs.writeFileSync('dist/mns-uet-campus-alt.jpg', bufJpg);
}

console.log('Successfully generated MNS UET Multan Main Academic Block photograph matching user request!');
console.log('Saved to public/mns-uet-campus.jpg, public/mns-uet-campus.png, and public/mns-uet-campus-alt.jpg');
