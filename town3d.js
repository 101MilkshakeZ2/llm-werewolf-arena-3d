// AI MAFIA - 3D town view (three.js). Loaded by index.html as a plain script, after three.min.js.
// It only DRAWS: the game state (T) still comes from the same game lines as the log, and the names, roles,
// subtitles and vote arrows are drawn by index.html on a flat canvas on top of this one.
(function () {
  'use strict';
  if (!window.THREE) return;
  const THREE = window.THREE, V3 = THREE.Vector3;
  const IS_FILE = location.protocol === 'file:'; // WebGL may not read images from file://, so heads show initials there
  const rr = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; // fixed pseudo-random numbers
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const angLerp = (a, b, t) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
  const TALL = 1.12; // players are stretched a bit taller (heads stay square)
  const U = 0.72; // one "block" of a figure, in metres (a figure is 3.15 blocks tall)

  let renderer, scene, camera, canvas, sun, hemi, sky, skyT, stars, moon, sunBall, moonGlow, sunGlow, clouds = [], confetti;
  let sets = {}, cur = null, lampLights = [], lampMat, winLit, nightAmt = 0, skyNight = -1, lastT = 0, quality = 0, slow = 0, frameMs = 16;
  let fan = null, beacon = null, water = null, followOn = false;
  const figs = {}, texCache = {};
  const camPos = new V3(0, 9, 19), camLook = new V3(0, 1.1, 0), tmp = new V3(), tmp2 = new V3();

  // ---------- small builders ----------
  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.92, metalness: 0, flatShading: true }, o || {}));
  function add(parent, mesh, x, y, z, shadow) { mesh.position.set(x || 0, y || 0, z || 0); if (shadow !== false) { mesh.castShadow = true; mesh.receiveShadow = true; } parent.add(mesh); return mesh; }
  const box = (p, w, h, d, mat, x, y, z, sh) => add(p, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, sh);
  const cyl = (p, rt, rb, h, seg, mat, x, y, z, sh) => add(p, new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), x, y, z, sh);
  const ball = (p, r, mat, x, y, z, sh) => add(p, new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat), x, y, z, sh);
  function gable(p, w, h, d, mat, x, y, z) { // a pitched roof
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
    return add(p, new THREE.Mesh(g, mat), x, y, z);
  }
  function canvasTex(size, draw, rx, ry) {
    const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry || rx); }
    return t;
  }
  const grey = (v, a) => `rgba(${v},${v},${v},${a == null ? 1 : a})`;
  function speckle(g, s, n, lo, hi, a) { for (let i = 0; i < n; i++) { g.fillStyle = grey(lo + Math.floor(rr(i * 3.1 + s) * (hi - lo)), a); g.fillRect(rr(i + 1.7) * s, rr(i * 2.3 + 9) * s, 1 + rr(i + 5) * 3, 1 + rr(i + 8) * 3); } }
  const texCobble = () => canvasTex(512, (g, s) => {
    g.fillStyle = '#6f6a60'; g.fillRect(0, 0, s, s);
    const n = 9, c = s / n;
    for (let r = 0; r < n; r++) for (let q = -1; q < n; q++) {
      const x = q * c + (r % 2) * c / 2, y = r * c, k = rr(r * 13 + q * 7), v = 150 + Math.floor(k * 60);
      g.fillStyle = `rgb(${v},${v - 6},${v - 18})`; g.beginPath();
      const pad = 3 + rr(r + q * 3) * 2; g.roundRect(x + pad, y + pad, c - pad * 2, c - pad * 2, 9); g.fill();
      for (const dx of [0, s, -s]) if (dx) { g.beginPath(); g.roundRect(x + dx + pad, y + pad, c - pad * 2, c - pad * 2, 9); g.fill(); }
    }
    speckle(g, s, 500, 60, 230, 0.12);
  }, 6);
  const texGrass = () => canvasTex(256, (g, s) => { g.fillStyle = '#6aa85a'; g.fillRect(0, 0, s, s); for (let i = 0; i < 1400; i++) { g.fillStyle = ['#5d9a4f', '#79b866', '#63a455', '#86c06f'][Math.floor(rr(i) * 4)]; g.fillRect(rr(i + 3) * s, rr(i * 1.7 + 11) * s, 2, 3 + rr(i + 6) * 4); } }, 40);
  const texWood = (base) => canvasTex(256, (g, s) => { g.fillStyle = base; g.fillRect(0, 0, s, s); for (let i = 0; i < 8; i++) { g.fillStyle = grey(0, 0.05 + rr(i) * 0.1); g.fillRect(0, i * s / 8, s, s / 8 - 2); g.fillStyle = grey(0, 0.45); g.fillRect(0, (i + 1) * s / 8 - 2, s, 2); g.fillRect(rr(i + 20) * s, i * s / 8, 2, s / 8); } speckle(g, s, 300, 0, 60, 0.08); }, 4);
  const texTiles = (a, b) => canvasTex(256, (g, s) => { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = (r + c) % 2 ? a : b; g.fillRect(c * s / 4, r * s / 4, s / 4, s / 4); } g.strokeStyle = grey(0, 0.18); g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * s / 4, 0); g.lineTo(i * s / 4, s); g.moveTo(0, i * s / 4); g.lineTo(s, i * s / 4); g.stroke(); } }, 5);
  const texConcrete = (base) => canvasTex(256, (g, s) => { g.fillStyle = base; g.fillRect(0, 0, s, s); speckle(g, s, 1200, 0, 255, 0.06); g.strokeStyle = grey(0, 0.25); g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2); }, 3);
  const texBrick = (base, mortar) => canvasTex(256, (g, s) => { g.fillStyle = mortar; g.fillRect(0, 0, s, s); const h = s / 8, w = s / 4; for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) { g.fillStyle = base; g.globalAlpha = 0.75 + rr(r * 9 + c) * 0.25; g.fillRect(c * w + (r % 2) * w / 2 + 2, r * h + 2, w - 4, h - 4); } g.globalAlpha = 1; speckle(g, s, 400, 0, 80, 0.08); }, 4, 2);
  const texCork = () => canvasTex(256, (g, s) => { g.fillStyle = '#b78a55'; g.fillRect(0, 0, s, s); for (let i = 0; i < 2500; i++) { g.fillStyle = ['#a67a48', '#c79a63', '#8f683b', '#d1a770'][Math.floor(rr(i) * 4)]; g.fillRect(rr(i + 2) * s, rr(i * 1.3 + 5) * s, 2 + rr(i + 9) * 3, 2 + rr(i + 4) * 3); } }, 2, 1);
  const texCity = () => canvasTex(128, (g, s) => { g.fillStyle = '#000'; g.fillRect(0, 0, s, s); for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) if (rr(r * 17 + c * 5) > 0.5) { g.fillStyle = rr(r + c * 3) > 0.3 ? '#ffd58a' : '#bfe3ff'; g.fillRect(c * s / 5 + 5, r * s / 8 + 4, s / 5 - 10, s / 8 - 8); } });
  const texGlow = () => canvasTex(128, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
  const texStripes = (a, b) => canvasTex(64, (g, s) => { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * s / 4, 0, s / 4, s); } }, 2, 1);
  const texClock = () => canvasTex(128, (g, s) => { g.fillStyle = '#f3ead2'; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 2, 0, 7); g.fill(); g.strokeStyle = '#3a2a1c'; g.lineWidth = 6; g.stroke(); g.lineWidth = 4; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(s / 2 + Math.cos(a) * 46, s / 2 + Math.sin(a) * 46); g.lineTo(s / 2 + Math.cos(a) * 54, s / 2 + Math.sin(a) * 54); g.stroke(); } g.lineWidth = 6; g.beginPath(); g.moveTo(s / 2, s / 2); g.lineTo(s / 2 + 22, s / 2 - 18); g.moveTo(s / 2, s / 2); g.lineTo(s / 2 - 8, s / 2 - 44); g.stroke(); });
  const texMap = () => canvasTex(256, (g, s) => { g.fillStyle = '#d9c9a0'; g.fillRect(0, 0, s, s); g.strokeStyle = '#8a7a55'; g.lineWidth = 3; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(rr(i) * s, 0); g.lineTo(rr(i + 9) * s, s); g.moveTo(0, rr(i + 3) * s); g.lineTo(s, rr(i + 5) * s); g.stroke(); } g.fillStyle = '#7d8f63'; for (let i = 0; i < 9; i++) g.fillRect(rr(i + 30) * s, rr(i + 40) * s, 22, 16); g.strokeStyle = '#c0261c'; g.lineWidth = 7; for (let i = 0; i < 4; i++) { const x = 30 + rr(i + 50) * 190, y = 30 + rr(i + 60) * 190; g.beginPath(); g.moveTo(x - 12, y - 12); g.lineTo(x + 12, y + 12); g.moveTo(x + 12, y - 12); g.lineTo(x - 12, y + 12); g.stroke(); } });

  // ---------- faces: the sprite image (or coloured initials) as a texture, shared by head, photos and headstones ----------
  function faceTex(p, api) {
    const sk = api.skin; // the human's Minecraft skin: its face (and hat layer) is used everywhere the face is shown
    if (p.you && sk && sk.on && sk.img) {
      const src = 'skin:' + sk.ver, c0 = texCache[p.name]; if (c0 && c0.src === src) return c0.tex; if (c0) c0.tex.dispose();
      const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
      g.drawImage(sk.img, 8, 8, 8, 8, 0, 0, 128, 128); g.drawImage(sk.img, 40, 8, 8, 8, 0, 0, 128, 128);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache[p.name] = { src, tex: t }; return t;
    }
    const e = api.getSprite(p), useImg = e.ok && e.img && !IS_FILE, col = e.color || api.colorOf(p.name);
    const src = useImg ? e.img.src : 'init:' + col + api.initials(p);
    const c = texCache[p.name];
    if (c && c.src === src) return c.tex;
    if (c) c.tex.dispose();
    let tex;
    if (useImg) tex = new THREE.Texture(e.img);
    else {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
      g.fillStyle = col; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 96, 128, 32);
      g.fillStyle = 'rgba(255,255,255,.95)'; g.font = '700 58px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(api.initials(p), 64, 64);
      tex = new THREE.CanvasTexture(cv);
    }
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.needsUpdate = true;
    texCache[p.name] = { src, tex };
    return tex;
  }
  const setMap = (mat, tex) => { if (mat.map !== tex) { mat.map = tex; mat.needsUpdate = true; } };

  // ---------- a player: blocky figure, face on the front AND back of the head, plus its soul and headstone ----------
  const stoneMat = std(0x8a9099, { roughness: 1 }), plotMat = std(0x3a3128);
  function makeFigure(name) {
    const g = new THREE.Group(), body = new THREE.Group(), ai = new THREE.Group(); g.add(body); body.add(ai); // ai = the AI body; your Minecraft-skin body (buildSteve) or a robot (setRobot) can sit next to it
    const mT = std(0x888888), mA = std(0x888888), mL = std(0x555555), mS = std(0x888888), mShoe = std(0x22252b);
    const face = [new THREE.MeshStandardMaterial({ roughness: 0.8 }), new THREE.MeshStandardMaterial({ roughness: 0.8 })];
    box(ai, 0.45 * U, 0.75 * U, 0.5 * U, mL, -0.26 * U, 0.53 * U, 0); box(ai, 0.45 * U, 0.75 * U, 0.5 * U, mL, 0.26 * U, 0.53 * U, 0);
    box(ai, 0.47 * U, 0.16 * U, 0.62 * U, mShoe, -0.26 * U, 0.08 * U, 0.05 * U); box(ai, 0.47 * U, 0.16 * U, 0.62 * U, mShoe, 0.26 * U, 0.08 * U, 0.05 * U);
    box(ai, 1.14 * U, 1.22 * U, 0.62 * U, mT, 0, 1.51 * U, 0);
    box(ai, 1.16 * U, 0.14 * U, 0.64 * U, mL, 0, 0.97 * U, 0); // belt
    const arms = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(s * 0.76 * U, 2.02 * U, 0); ai.add(piv); box(piv, 0.36 * U, 0.8 * U, 0.42 * U, mA, 0, -0.38 * U, 0); box(piv, 0.34 * U, 0.26 * U, 0.4 * U, mS, 0, -0.9 * U, 0); return piv; });
    const neck = new THREE.Group(); neck.position.set(0, 2.15 * U, 0); ai.add(neck);
    const head = add(neck, new THREE.Mesh(new THREE.BoxGeometry(U, U, U), [mS, mS, mS, mS, face[0], face[1]]), 0, 0.5 * U / TALL, 0); head.scale.y = 1 / TALL; body.scale.y = TALL;
    // soul: the head, drifting up
    const soulMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const soul = add(g, new THREE.Mesh(new THREE.BoxGeometry(U, U, U), soulMat), 0, 2.65 * U * TALL, 0, false); soul.visible = false;
    // headstone with their face carved in (both sides, so it reads from anywhere in the ring)
    const stone = new THREE.Group(); stone.visible = false; stone.scale.setScalar(1.3); g.add(stone);
    box(stone, 1.25, 0.1, 0.8, plotMat, 0, 0.05, 0);
    box(stone, 0.82, 0.85, 0.2, stoneMat, 0, 0.5, 0);
    const top = cyl(stone, 0.41, 0.41, 0.2, 20, stoneMat, 0, 0.92, 0); top.rotation.x = Math.PI / 2;
    const carve = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 1 });
    for (const s of [1, -1]) { const pl = add(stone, new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.56), carve), 0, 0.84, s * 0.102, false); if (s < 0) pl.rotation.y = Math.PI; box(stone, 0.5, 0.04, 0.02, plotMat, 0, 0.42, s * 0.1, false); }
    scene.add(g);
    return { name, g, body, ai, arms, aArms: arms, aNeck: neck, neck, head, soul, soulMat, stone, carve, face, mT, mA, mL, mS, col: '', yaw: 0, ph: rr(name.length * 7 + name.charCodeAt(0)) * 6.28, set: null, wasAlive: true, armL: 0, armR: 0 };
  }
  // ---------- Minecraft skin (64x64, or the old 64x32) on a Minecraft-shaped body: the human's alternative to the AI body ----------
  const MC_P = 3.15 * U / 32; // one skin pixel in metres, so a skinned player is as tall as everyone else
  function mcBox(parent, tex, mat, w, h, d, u, v, x, y, z, grow, mirror) {
    const geo = new THREE.BoxGeometry((w + grow) * MC_P, (h + grow) * MC_P, (d + grow) * MC_P), TH = tex.image.height;
    // image rectangles (x0, y0, x1, y1) of the 6 faces, in BoxGeometry order: +x (their left), -x (their right), top, bottom, +z (front), -z (back)
    let R = [[u + d + w, v + d, u + 2 * d + w, v + d + h], [u, v + d, u + d, v + d + h], [u + d, v, u + d + w, v + d], [u + d + w, v, u + d + 2 * w, v + d], [u + d, v + d, u + d + w, v + d + h], [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h]];
    if (mirror) { R = [R[1], R[0], R[2], R[3], R[4], R[5]].map(r => [r[2], r[1], r[0], r[3]]); } // old skins: the left limb is the right one, flipped
    const uv = geo.attributes.uv;
    for (let f = 0; f < 6; f++) { const [x0, y0, x1, y1] = R[f]; for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, (x0 + uv.getX(k) * (x1 - x0)) / 64, 1 - (y0 + (1 - uv.getY(k)) * (y1 - y0)) / TH); } }
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  function buildSteve(f, img) {
    if (f.steve) { f.body.remove(f.steve); f.steveDispose && f.steveDispose(); }
    const legacy = img.height < 64, P = MC_P; let slim = false;
    try { // slim ("Alex") skins leave the last column of the arm empty
      const c = document.createElement('canvas'); c.width = 64; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      slim = !legacy && g.getImageData(47, 20, 1, 12).data.every((v, i) => i % 4 !== 3 || v === 0);
    } catch (e) {}
    const aw = slim ? 3 : 4;
    const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, alphaTest: 0.5 });
    const root = new THREE.Group(); f.body.add(root);
    const B = (par, w, h, d, u, v, x, y, z, gr, mir) => mcBox(par, tex, mat, w, h, d, u, v, x * P, y * P, z * P, gr || 0, mir);
    B(root, 4, 12, 4, 0, 16, -2, 6, 0); B(root, 4, 12, 4, legacy ? 0 : 16, legacy ? 16 : 48, 2, 6, 0, 0, legacy); // legs (their right is -x)
    B(root, 8, 12, 4, 16, 16, 0, 18, 0);
    if (!legacy) { B(root, 4, 12, 4, 0, 32, -2, 6, 0, 0.5); B(root, 4, 12, 4, 0, 48, 2, 6, 0, 0.5); B(root, 8, 12, 4, 16, 32, 0, 18, 0, 0.5); }
    const arms = [-1, 1].map(s => {
      const piv = new THREE.Group(), right = s < 0; piv.position.set(s * (4 + aw / 2) * P, 22 * P, 0); root.add(piv);
      B(piv, aw, 12, 4, right || legacy ? 40 : 32, right || legacy ? 16 : 48, 0, -4, 0, 0, legacy && !right);
      if (!legacy) B(piv, aw, 12, 4, right ? 40 : 48, right ? 32 : 48, 0, -4, 0, 0.5);
      return piv;
    });
    const neck = new THREE.Group(); neck.position.set(0, 24 * P, 0); root.add(neck);
    const hg = new THREE.Group(); hg.position.y = 4 * P / TALL; hg.scale.y = 1 / TALL; neck.add(hg); // the head stays square (body.scale.y stretches everything else)
    B(hg, 8, 8, 8, 0, 0, 0, 0, 0); B(hg, 8, 8, 8, 32, 0, 0, 0, 0, 1);
    root.visible = false; f.steve = root; f.sArms = arms; f.sNeck = neck; f.skinOn = false;
    f.steveDispose = () => { tex.dispose(); mat.dispose(); root.traverse(o => o.geometry && o.geometry.dispose()); };
  }
  // ---------- robot bodies (robots3d.js): the "gizmo" style. The model file loads once; until it has loaded
  // (or if it can't, e.g. when the page is opened as a file), players keep the default AI body. ----------
  const ROBOT_STYLES = { gizmo: 'gizmo' }; // body style -> robot design in robots3d.js
  let gizmoState = 'idle'; // idle | loading | ready | failed
  function robotReady(kind) {
    if (!window.Robots || kind !== 'gizmo') return false;
    if (gizmoState === 'idle') { gizmoState = 'loading'; Robots.loadGizmo().then(() => { gizmoState = 'ready'; }, err => { gizmoState = 'failed'; console.warn('Gizmo body unavailable, using the default body:', err.message); }); }
    return gizmoState === 'ready';
  }
  function setRobot(f, kind, p, h, e, hex) { // kind = robot design to show, or null for none
    if (f.robot && (!kind || f.robot.kind !== kind)) { f.body.remove(f.robot.group); f.robot.dispose(); f.robot = null; f.robotCol = f.robotLogo = ''; }
    if (!kind) return;
    if (!f.robot) {
      f.robot = Robots.build(kind, { height: 3.15 * U * TALL, color: hex, phase: f.ph });
      f.robot.group.scale.y = 1 / TALL; // the body group is stretched by TALL; robots keep their own proportions
      f.robot.group.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
      f.body.add(f.robot.group);
    }
    if (f.robotCol !== hex) { f.robotCol = hex; f.robot.setColor(hex); }
    const useImg = e.ok && e.img && !IS_FILE, key = useImg ? e.img.src : 'init:' + h.initials(p);
    if (f.robotLogo !== key) { f.robotLogo = key; f.robot.setLogoSource(useImg ? e.img : h.initials(p), { bg: hex }); }
  }
  function setRobotMode(f, on) {
    on = on && !!f.robot; if (f.robotOn === on) return; f.robotOn = on;
    f.robot && (f.robot.group.visible = on);
    if (on) { f.ai.visible = false; if (f.steve) f.steve.visible = false; f.skinOn = false; f.arms = f.robot.arms; f.neck = f.robot.neck; }
    else { f.ai.visible = true; f.arms = f.aArms; f.neck = f.aNeck; }
  }
  // The Minecraft skin a player wears, or null (= the normal AI body, or a robot). Your own uploaded skin wins in any style.
  // With "Bodies: Minecraft", a player wears one only if skins/<their name>.png exists; everyone else stays a normal AI body.
  function bodyFor(p, h) {
    const sk = h.skin; if (p.you && sk && sk.on && sk.img) return { key: 'me:' + sk.ver, img: sk.img };
    if (h.bodies !== 'minecraft') return null;
    const own = h.aiSkin && h.aiSkin(p); return own ? { key: 'file:' + own.src, img: own } : null;
  }
  function setSkinMode(f, on) {
    if (!f.steve) on = false; if (f.skinOn === on) return; f.skinOn = on;
    f.ai.visible = !on; if (f.steve) f.steve.visible = on; f.arms = on ? f.sArms : f.aArms; f.neck = on ? f.sNeck : f.aNeck;
  }
  function colourFigure(f, hex) {
    if (f.col === hex) return; f.col = hex;
    const c = new THREE.Color(hex);
    f.mT.color.copy(c); f.mA.color.copy(c).multiplyScalar(0.82); f.mL.color.copy(c).multiplyScalar(0.42); f.mS.color.copy(c).lerp(new THREE.Color(0xffffff), 0.12);
  }
  // st: { x, z, yaw, alive, diedAt, speaking, point (V3|null), look (V3|null), snap }
  function updateFigure(f, st, t, dt) {
    const g = f.g; g.visible = true;
    const k = st.snap ? 1 : 1 - Math.pow(0.002, dt);
    g.position.x = lerp(g.position.x, st.x, k); g.position.z = lerp(g.position.z, st.z, k); g.position.y = st.y || 0;
    let yaw = st.yaw;
    const aim = st.point || st.look;
    if (aim && st.alive) yaw = Math.atan2(aim.x - g.position.x, aim.z - g.position.z);
    f.yaw = st.snap ? yaw : angLerp(f.yaw, yaw, 1 - Math.pow(0.01, dt));
    const td = st.alive ? 0 : (st.diedAt ? clamp((performance.now() - st.diedAt) / 1900, 0, 1) : 1);
    f.body.visible = td < 0.45; f.soul.visible = td > 0 && td < 0.9; f.stone.visible = td > 0.3;
    if (!st.alive) {
      g.rotation.y = st.yaw; // the stone faces the middle of the square
      f.body.position.y = -ease(td / 0.45) * 1.9; f.body.rotation.z = 0;
      f.soul.position.y = 2.65 * U * TALL + td * 3.4; f.soul.rotation.y = f.yaw - st.yaw + td * 2; f.soul.scale.setScalar(1 + td * 0.4); f.soulMat.opacity = clamp(1 - td / 0.9, 0, 1) * 0.9;
      f.stone.position.y = -2 * (1 - ease((td - 0.3) / 0.7));
      return;
    }
    g.rotation.y = f.yaw; f.body.position.y = 0; f.stone.visible = false; f.soul.visible = false;
    const sp = st.speaking ? 1 : 0, w = t + f.ph;
    f.body.position.y = sp * Math.abs(Math.sin(t * 7)) * 0.07;
    f.body.rotation.z = sp * Math.sin(t * 3.5) * 0.04 + Math.sin(w * 0.8) * 0.012;
    f.neck.rotation.y = sp ? Math.sin(t * 2.2) * 0.25 : Math.sin(w * 0.55) * 0.22;
    f.neck.rotation.x = sp ? Math.sin(t * 7) * 0.06 : 0;
    let aL = Math.sin(w * 1.1) * 0.06, aR = -aL;
    if (sp) { aL = -0.75 - Math.sin(t * 6) * 0.5; aR = -0.75 + Math.sin(t * 6) * 0.5; }
    if (st.point) aR = -Math.PI / 2 - 0.05; // voting: point at them
    const ka = 1 - Math.pow(0.0005, dt);
    f.armL = lerp(f.armL, aL, ka); f.armR = lerp(f.armR, aR, ka);
    f.arms[0].rotation.x = f.armL; f.arms[1].rotation.x = f.armR;
    f.arms[0].rotation.z = sp ? -0.18 : -0.04; f.arms[1].rotation.z = sp && !st.point ? 0.18 : 0.04;
  }

  // ---------- town ----------
  function house(p, a, r, w, d, h, wall, roof, seed) {
    const g = new THREE.Group(); g.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); g.rotation.y = Math.atan2(-g.position.x, -g.position.z); p.add(g);
    const mw = std(wall), mr = std(roof), trim = std(0x4a3628), doorM = std([0x5b3a26, 0x2f4b5c, 0x6a2f2a, 0x34513a][Math.floor(rr(seed) * 4)]);
    box(g, w, h, d, mw, 0, h / 2, 0); box(g, w + 0.1, 0.35, d + 0.1, std(0x77716a), 0, 0.17, 0);
    const rf = gable(g, w + 0.7, 1.5 + rr(seed + 1) * 0.8, d + 0.8, mr, 0, h, 0);
    if (rr(seed + 2) > 0.5) { rf.rotation.y = Math.PI / 2; rf.scale.set((d + 0.7) / (w + 0.7), 1, (w + 0.8) / (d + 0.8)); }
    box(g, 0.5, 1.5, 0.5, std(0x7a5a4a), w * 0.28, h + 1.1, -d * 0.2); // chimney
    box(g, 0.95, 1.8, 0.12, doorM, (rr(seed + 3) - 0.5) * w * 0.4, 0.9, d / 2 + 0.03); box(g, 1.5, 0.14, 0.6, std(0x8c857b), 0, 0.07, d / 2 + 0.3);
    const floors = h > 4.4 ? 2 : 1, cols = Math.max(2, Math.round(w / 2));
    const win = (x, y, z, ry, i) => { const m = rr(seed * 5 + i) > 0.4 ? winLit : winDark; const f = box(g, 0.95, 1.05, 0.1, trim, x, y, z, false); f.rotation.y = ry; const q = box(g, 0.75, 0.85, 0.14, m, x, y, z, false); q.rotation.y = ry; };
    let i = 0;
    for (let f = 0; f < floors; f++) {
      const y = floors === 2 ? 1.5 + f * 2.2 : h * 0.6;
      for (let c = 0; c < cols; c++) { const x = (c + 0.5) / cols * w - w / 2; if (f === 0 && Math.abs(x) < 0.8 && floors === 1) continue; if (f === 0 && floors === 2 && Math.abs(x - (rr(seed + 3) - 0.5) * w * 0.4) < 0.9) continue; win(x, y, d / 2 + 0.02, 0, i++); }
      for (const s of [-1, 1]) win(s * (w / 2 + 0.02), y, 0, Math.PI / 2, i++);
    }
    return g;
  }
  let winDark;
  function tree(p, x, z, s, kind) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g);
    cyl(g, 0.16, 0.24, 1.5, 6, std(0x5a4030), 0, 0.75, 0);
    const greens = [0x3f8f4a, 0x4fa056, 0x357a45, 0x5aa85a];
    if (kind) { for (let i = 0; i < 3; i++) add(g, new THREE.Mesh(new THREE.ConeGeometry(1.25 - i * 0.3, 1.5, 7), std(greens[i])), 0, 1.7 + i * 0.85, 0); }
    else { ball(g, 1.25, std(greens[0]), 0, 2.5, 0); ball(g, 0.9, std(greens[1]), 0.7, 2.1, 0.3); ball(g, 0.85, std(greens[3]), -0.6, 2.2, -0.4); ball(g, 0.75, std(greens[2]), 0.1, 3.3, 0.1); }
  }
  function buildTown() {
    const g = new THREE.Group(); scene.add(g);
    const grass = add(g, new THREE.Mesh(new THREE.CircleGeometry(140, 48), std(0xffffff, { map: texGrass(), flatShading: false })), 0, 0, 0); grass.rotation.x = -Math.PI / 2; grass.castShadow = false;
    const cob = texCobble(), cobM = std(0xffffff, { map: cob, flatShading: false, roughness: 1 });
    const plaza = add(g, new THREE.Mesh(new THREE.CircleGeometry(10.5, 56), cobM), 0, 0.03, 0); plaza.rotation.x = -Math.PI / 2; plaza.castShadow = false;
    const rim = add(g, new THREE.Mesh(new THREE.RingGeometry(10.5, 11.1, 56), std(0xb9b2a2)), 0, 0.04, 0); rim.rotation.x = -Math.PI / 2; rim.castShadow = false;
    const cob2 = cob.clone(); cob2.needsUpdate = true; cob2.repeat.set(1.2, 9);
    const roadM = std(0xe6e0d2, { map: cob2, flatShading: false, roughness: 1 });
    for (const a of [0, 100, 180, 260]) { const rd = add(g, new THREE.Mesh(new THREE.PlaneGeometry(3, 36), roadM), Math.sin(a * Math.PI / 180) * 28, 0.02, Math.cos(a * Math.PI / 180) * 28); rd.rotation.x = -Math.PI / 2; rd.rotation.z = -a * Math.PI / 180; rd.castShadow = false; }
    // fountain in the middle
    const stone = std(0xa9a69c), stone2 = std(0x8f8c84);
    cyl(g, 2.1, 2.3, 0.55, 24, stone, 0, 0.3, 0); cyl(g, 1.85, 1.85, 0.08, 24, stone2, 0, 0.55, 0);
    water = cyl(g, 1.8, 1.8, 0.06, 24, new THREE.MeshStandardMaterial({ color: 0x4fb3d9, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }), 0, 0.58, 0, false);
    cyl(g, 0.22, 0.34, 1.3, 10, stone, 0, 1.1, 0); cyl(g, 0.8, 0.3, 0.25, 14, stone2, 0, 1.8, 0); ball(g, 0.2, stone, 0, 2.05, 0);
    cyl(g, 0.7, 0.7, 0.04, 14, new THREE.MeshStandardMaterial({ color: 0x6cc6e6, roughness: 0.15, transparent: true, opacity: 0.85 }), 0, 1.9, 0, false);
    // houses on the back and sides (the camera side stays open)
    const walls = [0xe9d8b8, 0xd9b99a, 0xf0e4cf, 0xc9a98a, 0xdcc7a6, 0xe5c9b0, 0xcfd6c4, 0xe8cfc0], roofs = [0xa54b3a, 0x8d4233, 0x5d6672, 0xb05c40, 0x6f5a4c, 0x94503c];
    for (let i = 0; i < 11; i++) { const a = (62 + i * 23.6) * Math.PI / 180; if (i === 5) continue; house(g, a, 16.2 + rr(i + 3) * 2.2, 4.4 + rr(i) * 2, 4.2 + rr(i + 7) * 1.6, 3.4 + Math.floor(rr(i + 11) * 3) * 0.9, walls[i % 8], roofs[i % 6], i + 1); }
    for (let i = 0; i < 12; i++) { const a = (48 + i * 24) * Math.PI / 180; house(g, a + 0.2, 27 + rr(i + 31) * 6, 5 + rr(i + 40) * 2.5, 5, 3.6 + Math.floor(rr(i + 51) * 3), walls[(i + 3) % 8], roofs[(i + 2) % 6], i + 30); }
    // town hall with a clock tower, at the back
    const hall = new THREE.Group(); hall.position.set(0, 0, -18.5); g.add(hall);
    const hw = std(0xe3d6bd), hr = std(0x54606e), st2 = std(0x9a948a);
    box(hall, 11, 5, 5.5, hw, 0, 2.5, 0); gable(hall, 11.8, 2.2, 6.3, hr, 0, 5, 0).rotation.y = Math.PI / 2; hall.children[hall.children.length - 1].scale.set(6.3 / 11.8, 1, 11.8 / 6.3);
    box(hall, 3.4, 11, 3.4, hw, 0, 5.5, 1.4); add(hall, new THREE.Mesh(new THREE.ConeGeometry(2.9, 3, 4), hr), 0, 12.5, 1.4).rotation.y = Math.PI / 4;
    box(hall, 3.7, 0.3, 3.7, st2, 0, 11, 1.4); box(hall, 3.7, 0.3, 3.7, st2, 0, 7.6, 1.4);
    const clockM = new THREE.MeshStandardMaterial({ map: texClock(), roughness: 0.7, emissive: 0xfff0cf, emissiveMap: null, emissiveIntensity: 0 });
    const ck = add(hall, new THREE.Mesh(new THREE.CircleGeometry(1.15, 24), clockM), 0, 9.3, 3.12, false); sets._clock = clockM; void ck;
    box(hall, 1.9, 2.9, 0.2, std(0x4b2f22), 0, 1.45, 3.15); for (let i = 0; i < 3; i++) box(hall, 5 - i * 0.6, 0.18, 1.6 - i * 0.4, st2, 0, 0.09 + i * 0.18, 3.6);
    for (const x of [-4, -2.2, 2.2, 4]) { box(hall, 1.05, 1.9, 0.1, std(0x4a3628), x, 2.8, 2.78, false); box(hall, 0.85, 1.7, 0.14, rr(x + 9) > 0.3 ? winLit : winDark, x, 2.8, 2.78, false); }
    // street lamps with real light at night
    const pole = std(0x23262d, { roughness: 0.6 });
    for (let i = 0; i < 6; i++) {
      const a = [52, 96, 150, 210, 264, 308][i] * Math.PI / 180, r = i === 0 || i === 5 ? 11.4 : 9.9, x = Math.sin(a) * r, z = Math.cos(a) * r;
      cyl(g, 0.07, 0.11, 3.3, 8, pole, x, 1.65, z); cyl(g, 0.2, 0.26, 0.3, 8, pole, x, 0.15, z); box(g, 0.5, 0.06, 0.5, pole, x, 3.75, z);
      box(g, 0.34, 0.42, 0.34, lampMat, x, 3.5, z, false);
      const L = new THREE.PointLight(0xffc27a, 0, 17, 1.6); L.position.set(x, 3.4, z); g.add(L); lampLights.push(L);
    }
    // market stall, benches, planters, barrels
    const stall = new THREE.Group(); stall.position.set(-8.2, 0, -3.6); stall.rotation.y = 1.1; g.add(stall);
    const wood = std(0x8a6242), wood2 = std(0x6e4c33);
    for (const [x, z] of [[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]]) box(stall, 0.12, 2.3, 0.12, wood2, x, 1.15, z);
    box(stall, 2.6, 0.12, 1.5, wood, 0, 0.95, 0); box(stall, 2.6, 0.9, 0.08, wood2, 0, 0.47, 0.7);
    const aw = box(stall, 3, 0.08, 2.1, new THREE.MeshStandardMaterial({ map: texStripes('#d9483b', '#f4ecd8'), roughness: 0.9 }), 0, 2.45, 0.1); aw.rotation.x = 0.22;
    const fruit = [0xe2572b, 0xf0b429, 0x7fb548, 0xc0392b]; for (let i = 0; i < 14; i++) ball(stall, 0.13, std(fruit[i % 4]), -1 + (i % 7) * 0.33, 1.13, -0.3 + Math.floor(i / 7) * 0.5);
    for (const a of [128, 232, 285, 75]) { const b = new THREE.Group(), ar = a * Math.PI / 180; b.position.set(Math.sin(ar) * 10, 0, Math.cos(ar) * 10); b.rotation.y = Math.atan2(-b.position.x, -b.position.z); g.add(b); box(b, 1.9, 0.1, 0.55, wood, 0, 0.5, 0); box(b, 1.9, 0.5, 0.09, wood, 0, 0.9, -0.25); for (const x of [-0.8, 0.8]) box(b, 0.1, 0.5, 0.5, pole, x, 0.25, 0); }
    const petals = [0xe85d75, 0xf2c14e, 0xf78154, 0xb5d99c, 0xd6a2e8];
    for (let i = 0; i < 6; i++) { const a = (i * 60) * Math.PI / 180, x = Math.sin(a) * 10.2, z = Math.cos(a) * 10.2; if (i === 0) continue; box(g, 1.3, 0.45, 0.7, std(0x7a5a44), x, 0.23, z).rotation.y = a; for (let k = 0; k < 6; k++) ball(g, 0.17, std(k % 2 ? 0x4f9a50 : petals[(i + k) % 5]), x + (rr(i * 9 + k) - 0.5) * 1, 0.55, z + (rr(i * 5 + k) - 0.5) * 0.4, false); }
    for (const [x, z] of [[8.3, -5.4], [8.9, -4.7], [-6.9, -7.2]]) { cyl(g, 0.34, 0.3, 0.8, 10, wood, x, 0.4, z); cyl(g, 0.36, 0.36, 0.06, 10, pole, x, 0.6, z, false); }
    // trees and far hills
    for (let i = 0; i < 46; i++) { const a = rr(i + 70) * Math.PI * 2, r = 21 + rr(i + 90) * 45, x = Math.sin(a) * r, z = Math.cos(a) * r; if (z > 6 && Math.abs(x) < 12 + z * 0.25) continue; tree(g, x, z, 1.1 + rr(i) * 1.1, i % 3 === 0); }
    for (const [x, z, s, k] of [[12.5, 4.5, 1.5, 0], [-12.8, 5.5, 1.6, 1], [-11.5, -9, 1.2, 0], [11.8, -8.5, 1.3, 1], [-18, 9, 1.9, 0], [18.5, 10, 1.8, 1]]) tree(g, x, z, s, k);
    const hillM = new THREE.MeshLambertMaterial({ color: 0x5c9a58 });
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.3, m = add(g, new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), hillM), Math.sin(a) * 105, -4, Math.cos(a) * 105, false); m.scale.set(38 + rr(i) * 20, 13 + rr(i + 4) * 12, 38); }
    return g;
  }

  // ---------- night rooms ----------
  function room(w, d, h, floorM, wallM, ceilM) {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const fl = add(g, new THREE.Mesh(new THREE.PlaneGeometry(w, d + 6), floorM), 0, 0, 3); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
    box(g, w, h, 0.3, wallM, 0, h / 2, -d / 2 - 0.15); box(g, 0.3, h, d + 6, wallM, -w / 2 - 0.15, h / 2, 3); box(g, 0.3, h, d + 6, wallM, w / 2 + 0.15, h / 2, 3);
    if (ceilM) box(g, w, 0.3, d + 6, ceilM, 0, h + 0.15, 3, false);
    return g;
  }
  function photo(p, size) { // a pinned photo: white card + face
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0xffffff });
    add(g, new THREE.Mesh(new THREE.PlaneGeometry(size * 1.16, size * 1.22), new THREE.MeshBasicMaterial({ color: 0xf4efe4 })), 0, -size * 0.03, 0, false);
    add(g, new THREE.Mesh(new THREE.PlaneGeometry(size, size), m), 0, 0, 0.005, false);
    p.add(g); g.userData.m = m; return g;
  }
  function buildBunker() {
    const g = room(15, 8, 4.2, std(0xffffff, { map: texConcrete('#4a4346'), flatShading: false }), std(0xffffff, { map: texBrick('#5a2a2c', '#2a1a1c'), flatShading: false }), std(0x1c1416));
    const metal = std(0x3a3d44, { roughness: 0.5, metalness: 0.4 }), wood = std(0x4a3226), dark = std(0x1a1516);
    cyl(g, 1.45, 1.45, 0.1, 22, wood, 0, 0.98, -0.4); cyl(g, 0.16, 0.5, 0.95, 10, dark, 0, 0.48, -0.4);
    const map = add(g, new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshStandardMaterial({ map: texMap(), roughness: 1 })), 0.1, 1.04, -0.35, false); map.rotation.x = -Math.PI / 2; map.rotation.z = 0.2;
    cyl(g, 0.07, 0.07, 0.22, 8, std(0x2f6b3a), -0.7, 1.14, -0.1); cyl(g, 0.05, 0.05, 0.1, 8, std(0xd8d0c0), 0.8, 1.08, -0.9);
    cyl(g, 0.015, 0.015, 0.7, 4, dark, 0, 3.85, -0.4, false); add(g, new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.35, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2224, side: THREE.DoubleSide, roughness: 0.6 })), 0, 3.45, -0.4, false);
    ball(g, 0.12, new THREE.MeshBasicMaterial({ color: 0xffb199 }), 0, 3.32, -0.4, false);
    const L = new THREE.PointLight(0xff4a38, 60, 18, 1.6); L.position.set(0, 3.15, -0.4); L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.004; g.add(L);
    const L2 = new THREE.PointLight(0xffd2b8, 26, 18, 1.6); L2.position.set(0, 2.6, 5.5); g.add(L2);
    for (const z of [-3, 1.6]) { const pipe = cyl(g, 0.12, 0.12, 15, 8, metal, 0, 3.8, z); pipe.rotation.z = Math.PI / 2; }
    cyl(g, 0.1, 0.1, 4.2, 8, metal, -6.6, 2.1, -3.6); cyl(g, 0.1, 0.1, 4.2, 8, metal, 6.3, 2.1, -3.6);
    box(g, 1.5, 2.6, 0.14, metal, 4.2, 1.3, -3.95); cyl(g, 0.22, 0.22, 0.08, 12, dark, 4.2, 1.5, -3.85).rotation.x = Math.PI / 2; // vault door
    const crate = std(0x6b4a30); for (const [x, y, z, s] of [[-5.6, 0.45, -2.8, 0.9], [-4.6, 0.45, -3, 0.9], [-5.2, 1.3, -2.9, 0.8], [5.8, 0.4, -1.5, 0.8], [-6, 0.4, 0.8, 0.8]]) box(g, s, s, s, crate, x, y, z).rotation.y = rr(x + z) * 0.6;
    box(g, 2.6, 0.08, 0.5, wood, -2.6, 2.2, -3.75); box(g, 2.6, 0.08, 0.5, wood, -2.6, 1.5, -3.75);
    const glass = [0x3f7d4a, 0x7a4a2a, 0x2f4f7a, 0x8a2f2f]; for (let i = 0; i < 9; i++) cyl(g, 0.07, 0.08, 0.34 + rr(i) * 0.12, 8, std(glass[i % 4], { roughness: 0.3 }), -3.7 + i * 0.27, (i % 2 ? 2.42 : 1.72), -3.75);
    for (const [x, z] of [[-2.1, 1.2], [2.2, 1], [0, 1.9]]) { cyl(g, 0.3, 0.3, 0.08, 10, wood, x, 0.55, z); cyl(g, 0.05, 0.05, 0.55, 6, dark, x, 0.27, z); } // stools
    return { g, bg: 0x0d0607, fog: [0x1a0809, 10, 34], hemi: [0x8a4a48, 0x1a0a0a, 0.4], sun: 0, cam: [0, 3.3, 8.2, 0, 1.5, -0.7], sky: false };
  }
  function buildClinic() {
    const g = room(15, 8, 4.2, std(0xffffff, { map: texTiles('#dfe7ea', '#c3d0d6'), flatShading: false, roughness: 0.5 }), std(0xe4edf0), std(0xf2f5f6));
    const white = std(0xf4f7f8, { roughness: 0.6 }), teal = std(0x2f8f8a), steel = std(0xb8c2c8, { roughness: 0.4, metalness: 0.5 }), red = std(0xd6372c);
    box(g, 15, 0.28, 0.06, teal, 0, 1.15, -3.96, false); box(g, 0.06, 0.28, 14, teal, -7.46, 1.15, 3, false); box(g, 0.06, 0.28, 14, teal, 7.46, 1.15, 3, false);
    const panel = new THREE.MeshBasicMaterial({ color: 0xffffff }); for (const x of [-3.5, 0, 3.5]) box(g, 2, 0.05, 0.8, panel, x, 4.17, 0.5, false);
    const L = new THREE.PointLight(0xf4fbff, 34, 24, 1.5); L.position.set(-1, 3.8, 2.5); L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.004; g.add(L);
    // bed
    const bed = new THREE.Group(); bed.position.set(-3.6, 0, -1.6); bed.rotation.y = 0.25; g.add(bed);
    box(bed, 1.3, 0.14, 2.6, steel, 0, 0.6, 0); for (const [x, z] of [[-0.55, -1.2], [0.55, -1.2], [-0.55, 1.2], [0.55, 1.2]]) cyl(bed, 0.04, 0.04, 0.6, 6, steel, x, 0.3, z);
    box(bed, 1.2, 0.2, 2.5, white, 0, 0.77, 0); box(bed, 0.9, 0.14, 0.5, white, 0, 0.94, -0.9); box(bed, 1.24, 0.1, 1.5, teal, 0, 0.9, 0.45); box(bed, 1.3, 0.7, 0.06, steel, 0, 0.95, -1.3);
    cyl(g, 0.03, 0.03, 2.3, 6, steel, -5.2, 1.15, -2.2); box(g, 0.5, 0.04, 0.04, steel, -5.2, 2.3, -2.2); box(g, 0.2, 0.34, 0.08, new THREE.MeshStandardMaterial({ color: 0xbfe6f2, transparent: true, opacity: 0.8, roughness: 0.2 }), -5.0, 2.05, -2.2, false);
    // cabinet with a red cross, desk, monitor wall
    box(g, 1.7, 2.6, 0.6, white, 5.4, 1.3, -3.6); box(g, 0.14, 0.6, 0.04, red, 5.4, 1.9, -3.28, false); box(g, 0.6, 0.14, 0.04, red, 5.4, 1.9, -3.28, false); box(g, 0.03, 2.5, 0.02, steel, 5.4, 1.3, -3.29, false);
    box(g, 2.6, 0.1, 1, white, 3.4, 0.95, 0.2); for (const x of [2.3, 4.5]) box(g, 0.1, 0.95, 0.9, steel, x, 0.47, 0.2);
    box(g, 0.5, 0.36, 0.05, std(0x20262c), 3.9, 1.3, 0); box(g, 0.3, 0.04, 0.2, red, 2.8, 1.02, 0.3, false); cyl(g, 0.07, 0.07, 0.2, 8, std(0xf2c14e), 3.2, 1.1, 0.4);
    // light box on the back wall: who is being protected tonight
    box(g, 2.3, 2.3, 0.12, std(0x20303a), 0, 2.35, -3.9, false);
    const scr = new THREE.MeshBasicMaterial({ color: 0x1d5b53 }); add(g, new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), scr), 0, 2.35, -3.83, false);
    const ph = photo(g, 1.25); ph.position.set(0, 2.5, -3.8);
    const beat = new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-0.95, 0], [-0.4, 0], [-0.25, 0.14], [-0.1, -0.18], [0.05, 0.22], [0.2, 0], [0.95, 0]].map(q => new V3(q[0], q[1], 0))), new THREE.LineBasicMaterial({ color: 0x7dffb5 })); beat.position.set(0, 1.52, -3.8); g.add(beat);
    const win = add(g, new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ color: 0x1a2350 })), -4.6, 2.5, -3.98, false); void win; box(g, 2.4, 0.1, 0.1, white, -4.6, 3.32, -3.95, false); box(g, 2.4, 0.1, 0.1, white, -4.6, 1.68, -3.95, false); box(g, 0.08, 1.6, 0.1, white, -4.6, 2.5, -3.95, false);
    ball(g, 0.16, new THREE.MeshBasicMaterial({ color: 0xf2efd8 }), -4.1, 2.9, -3.96, false);
    return { g, bg: 0xdfe8ec, fog: [0xdfe8ec, 30, 80], hemi: [0xffffff, 0xb8c6cc, 0.85], sun: 0, cam: [0.4, 2.7, 7.4, 0, 1.5, -1.2], sky: false, photo: ph };
  }
  function buildOffice() {
    const g = room(15, 8, 4.2, std(0xffffff, { map: texWood('#6b4a30'), flatShading: false }), std(0x3c4a44), std(0x2a2f2c));
    const wood = std(0x5a3d28), dark = std(0x2b1f17), brass = std(0xc9a24a, { roughness: 0.4, metalness: 0.6 });
    box(g, 15, 1.1, 0.08, wood, 0, 0.55, -3.95, false); box(g, 15, 0.1, 0.12, dark, 0, 1.12, -3.93, false);
    // cork board
    box(g, 6.6, 3.0, 0.1, dark, 0, 2.55, -3.94, false);
    add(g, new THREE.Mesh(new THREE.PlaneGeometry(6.3, 2.7), new THREE.MeshStandardMaterial({ map: texCork(), roughness: 1 })), 0, 2.55, -3.88, false);
    const board = new THREE.Group(); board.position.set(0, 2.55, -3.86); g.add(board);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.47, 0.58, 4), new THREE.MeshBasicMaterial({ color: 0xffdf5d })); ring.rotation.z = Math.PI / 4; ring.visible = false; ring.position.z = 0.02; board.add(ring);
    // desk, lamp, chair, cabinet, fan
    const desk = new THREE.Group(); desk.position.set(-3.7, 0, 0.3); desk.rotation.y = 0.35; g.add(desk);
    box(desk, 2.8, 0.12, 1.3, wood, 0, 0.98, 0); box(desk, 0.9, 0.92, 1.2, wood, -0.9, 0.46, 0); box(desk, 0.1, 0.92, 1.2, wood, 1.3, 0.46, 0);
    cyl(desk, 0.14, 0.18, 0.04, 10, brass, 0.8, 1.06, -0.2); cyl(desk, 0.025, 0.025, 0.45, 6, brass, 0.8, 1.28, -0.2); const shade = box(desk, 0.6, 0.16, 0.26, std(0x1f6b45, { roughness: 0.4 }), 0.8, 1.55, -0.2); void shade;
    const dl = new THREE.PointLight(0xffc27a, 22, 12, 1.7); dl.position.set(0.8, 1.4, -0.1); desk.add(dl);
    box(desk, 0.5, 0.03, 0.36, std(0xf1ead8), -0.2, 1.06, 0.1, false); box(desk, 0.3, 0.1, 0.2, dark, -1, 1.09, -0.3); cyl(desk, 0.08, 0.07, 0.16, 8, std(0xd8d0c0), 0.2, 1.12, 0.4);
    box(g, 0.7, 0.1, 0.7, dark, -4.4, 0.6, 1.8); box(g, 0.7, 0.9, 0.1, dark, -4.5, 1.1, 2.15).rotation.y = 0.35;
    for (let i = 0; i < 2; i++) { box(g, 1, 2.2, 0.8, std(0x5d6468, { roughness: 0.5, metalness: 0.3 }), 5.6 + i * 1.05, 1.1, -3.4); for (let k = 0; k < 4; k++) box(g, 0.3, 0.05, 0.04, brass, 5.6 + i * 1.05, 0.4 + k * 0.5, -2.98, false); }
    const ss = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? 0.17 : 0.4; ss[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } add(g, new THREE.Mesh(new THREE.ShapeGeometry(ss), brass), 4.6, 3.1, -3.96, false);
    fan = new THREE.Group(); fan.position.set(0, 3.95, 0.6); g.add(fan); cyl(fan, 0.14, 0.14, 0.2, 10, dark, 0, 0, 0, false); for (let i = 0; i < 4; i++) { const b = box(fan, 1.6, 0.03, 0.26, wood, 0, -0.06, 0, false); b.position.set(Math.cos(i * Math.PI / 2) * 0.9, -0.06, Math.sin(i * Math.PI / 2) * 0.9); b.rotation.y = -i * Math.PI / 2; }
    const L = new THREE.PointLight(0xffe2b8, 34, 20, 1.6); L.position.set(0.5, 3.4, 0.5); L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.004; g.add(L);
    const strings = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xc8281f })); strings.position.z = 0.012; board.add(strings);
    return { g, bg: 0x141816, fog: [0x141816, 14, 40], hemi: [0xffe8c8, 0x2a2018, 0.4], sun: 0, cam: [0.6, 2.7, 7.4, 0.4, 1.95, -2.2], sky: false, board, ring, strings, photos: {}, sig: '' };
  }
  function buildRoof() {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const gravel = std(0xffffff, { map: texConcrete('#3b3a45'), flatShading: false }), wall = std(0x4a4658), metal = std(0x5b6068, { roughness: 0.5, metalness: 0.4 }), brick = std(0xffffff, { map: texBrick('#6a4038', '#3a2a28'), flatShading: false });
    box(g, 16, 1, 12, gravel, 0, -0.5, 0); for (const [w, d, x, z] of [[16, 0.4, 0, -6], [0.4, 12, -8, 0], [0.4, 12, 8, 0]]) { box(g, w, 0.9, d, wall, x, 0.45, z); box(g, w + 0.15, 0.1, d + 0.15, std(0x6a667a), x, 0.95, z); }
    // stair hut with the wanted poster
    box(g, 3, 2.8, 2.6, brick, 5, 1.4, -3.2); box(g, 3.3, 0.16, 2.9, wall, 5, 2.88, -3.2); box(g, 1, 2, 0.1, metal, 5.6, 1, -1.88);
    const lampB = ball(g, 0.1, new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), 5.6, 2.35, -1.8, false); void lampB;
    const L = new THREE.PointLight(0xffc27a, 26, 16, 1.5); L.position.set(4.6, 2.5, -0.9); g.add(L);
    const poster = photo(g, 0.95); poster.position.set(4.25, 1.55, -1.88); const fr = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.8, 4), new THREE.MeshBasicMaterial({ color: 0xff4d3f })); fr.rotation.z = Math.PI / 4; fr.position.z = 0.01; poster.add(fr);
    // water tank, vents, antenna
    for (const [x, z] of [[-5.6, -4.2], [-4.4, -4.2], [-5.6, -3], [-4.4, -3]]) cyl(g, 0.06, 0.06, 1.6, 6, metal, x, 0.8, z);
    cyl(g, 1.05, 1.05, 1.7, 14, std(0x6b5a48), -5, 2.45, -3.6); add(g, new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.6, 14), std(0x4d4238)), -5, 3.6, -3.6);
    box(g, 1.2, 0.7, 0.9, metal, -1.5, 0.35, -4.6); cyl(g, 0.25, 0.25, 0.5, 10, metal, -1.5, 0.95, -4.6);
    cyl(g, 0.03, 0.03, 4, 5, metal, 7.2, 2, -5.2); beacon = ball(g, 0.09, new THREE.MeshBasicMaterial({ color: 0xff3b30 }), 7.2, 4.05, -5.2, false);
    // crate with the rifle
    box(g, 1.1, 0.7, 0.8, std(0x7a4f30), 1.9, 0.35, -0.6).rotation.y = 0.3; const rf = new THREE.Group(); rf.position.set(1.9, 0.76, -0.6); rf.rotation.y = 1.0; g.add(rf);
    box(rf, 1.5, 0.07, 0.08, std(0x17181c, { roughness: 0.4 }), 0, 0, 0); box(rf, 0.45, 0.14, 0.09, std(0x4a2f1e), -0.65, -0.02, 0); cyl(rf, 0.035, 0.035, 0.3, 8, std(0x17181c), 0.1, 0.08, 0).rotation.z = Math.PI / 2;
    // skyline
    const city = texCity();
    for (let i = 0; i < 22; i++) { const w = 4 + rr(i) * 5, h = 5 + rr(i + 3) * 20, x = -52 + i * 5 + rr(i + 8) * 3, z = -20 - rr(i + 5) * 30; const t = city.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.round(w / 1.6), Math.round(h / 2.6)); box(g, w, h, w, new THREE.MeshStandardMaterial({ color: 0x23213a, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.55, roughness: 1 }), x, h / 2 - 9, z, false); }
    const ground = add(g, new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshBasicMaterial({ color: 0x0c0b1a })), 0, -9, 0, false); ground.rotation.x = -Math.PI / 2;
    return { g, bg: 0x100d26, fog: [0x1c1840, 40, 170], hemi: [0x8c9cf0, 0x2a2848, 1.0], sun: 1.6, cam: [-1.2, 2.9, 8.2, 0.6, 1.9, -3], sky: true, night: 1, photo: poster };
  }

  // ---------- sky ----------
  const SKY = { dayTop: new THREE.Color(0x4f9fe0), dayBot: new THREE.Color(0xd9ecf5), nightTop: new THREE.Color(0x070a22), nightBot: new THREE.Color(0x2a2a5c) };
  function buildSky() {
    const geo = new THREE.SphereGeometry(220, 24, 14), n = geo.attributes.position.count; skyT = new Float32Array(n);
    for (let i = 0; i < n; i++) skyT[i] = clamp(geo.attributes.position.getY(i) / 220 * 1.6 + 0.05, 0, 1);
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false })); sky.renderOrder = -10; scene.add(sky);
    const sp = new Float32Array(500 * 3); for (let i = 0; i < 500; i++) { const a = rr(i) * Math.PI * 2, e = 0.08 + rr(i + 600) * 1.4, r = 200; sp[i * 3] = Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = Math.sin(e) * r; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(stars);
    const glow = texGlow();
    moon = add(scene, new THREE.Mesh(new THREE.SphereGeometry(7, 20, 12), new THREE.MeshBasicMaterial({ color: 0xf1eed8, fog: false, transparent: true })), -70, 85, -150, false);
    moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xcfd6ff, transparent: true, opacity: 0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending })); moonGlow.scale.setScalar(70); moonGlow.position.copy(moon.position); scene.add(moonGlow);
    sunBall = add(scene, new THREE.Mesh(new THREE.SphereGeometry(8, 20, 12), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false, transparent: true, toneMapped: false })), 85, 95, -140, false);
    sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xfff0c0, transparent: true, opacity: 0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending })); sunGlow.scale.setScalar(110); sunGlow.position.copy(sunBall.position); scene.add(sunGlow);
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: false });
    for (let i = 0; i < 7; i++) { const c = new THREE.Group(); for (let k = 0; k < 4; k++) { const m = add(c, new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), cm), (k - 1.5) * 5 + rr(i * 4 + k) * 2, rr(i + k) * 1.5, rr(i * 7 + k) * 3, false); m.scale.set(5 + rr(i + k * 3) * 3, 2.2 + rr(k + i) * 1.2, 4); } c.position.set(-130 + i * 42 + rr(i) * 20, 48 + rr(i + 2) * 22, -90 - rr(i + 5) * 60); scene.add(c); clouds.push(c); }
    // confetti for the winners
    const cn = 260, cp = new Float32Array(cn * 3), cc = new Float32Array(cn * 3), cols = [0xff6b61, 0xffd166, 0x7ee787, 0x5cc8ff, 0xc792ff, 0xffffff];
    for (let i = 0; i < cn; i++) { cp[i * 3] = (rr(i) - 0.5) * 20; cp[i * 3 + 1] = rr(i + 300) * 12; cp[i * 3 + 2] = (rr(i + 700) - 0.5) * 16; const c = new THREE.Color(cols[i % 6]); cc[i * 3] = c.r; cc[i * 3 + 1] = c.g; cc[i * 3 + 2] = c.b; }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    confetti = new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.3, vertexColors: true, toneMapped: false })); confetti.visible = false; confetti.frustumCulled = false; scene.add(confetti);
  }
  const cA = new THREE.Color(), cB = new THREE.Color();
  function paintSky(n) {
    if (Math.abs(n - skyNight) < 0.004) return; skyNight = n;
    cA.copy(SKY.dayTop).lerp(SKY.nightTop, n); cB.copy(SKY.dayBot).lerp(SKY.nightBot, n);
    const col = sky.geometry.attributes.color;
    for (let i = 0; i < skyT.length; i++) { const t = skyT[i]; col.setXYZ(i, lerp(cB.r, cA.r, t), lerp(cB.g, cA.g, t), lerp(cB.b, cA.b, t)); }
    col.needsUpdate = true;
  }

  // ---------- init ----------
  function init(wrap, overlay) {
    try {
      canvas = document.createElement('canvas'); canvas.id = 'town3d';
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      wrap.insertBefore(canvas, overlay);
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
      scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xd9ecf5, 45, 190);
      camera = new THREE.PerspectiveCamera(38, 1.6, 0.3, 500);
      hemi = new THREE.HemisphereLight(0xdcefff, 0x7a8a5a, 1.2); scene.add(hemi);
      sun = new THREE.DirectionalLight(0xfff1d6, 2.8); sun.position.set(14, 22, 10); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 1; sc.far = 70; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
      scene.add(sun); scene.add(sun.target);
      lampMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e0, emissive: 0xffc27a, emissiveIntensity: 0, roughness: 0.4 });
      winLit = new THREE.MeshStandardMaterial({ color: 0x8fb4cf, emissive: 0xffc56e, emissiveIntensity: 0, roughness: 0.25 });
      winDark = new THREE.MeshStandardMaterial({ color: 0x6f93ad, roughness: 0.25 });
      buildSky();
      sets.town = { g: buildTown(), sky: true };
      sets.mafia = buildBunker(); sets.doctor = buildClinic(); sets.sheriff = buildOffice(); sets.vigilante = buildRoof();
      canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); api.lost = true; });
      return true;
    } catch (err) { console.warn('3D town unavailable, using the flat view:', err); try { canvas && canvas.remove(); } catch {} renderer = null; return false; }
  }

  // ---------- per frame ----------
  function fitCam(px, py, pz, lx, ly, lz, aspect, k) {
    const f = Math.max(1, 1.5 / aspect); tmp.set(px - lx, py - ly, pz - lz).multiplyScalar(f).add(tmp2.set(lx, ly, lz));
    camPos.lerp(tmp, k); camLook.lerp(tmp2, k);
  }
  function applyQuality() {
    const dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(quality === 0 ? Math.min(dpr, 1.5) : 1);
    const sh = quality < 2; if (renderer.shadowMap.enabled !== sh) { renderer.shadowMap.enabled = sh; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); }); }
  }
  let sizeW = 0, sizeH = 0, qApplied = -1;
  function frame(T, W, H, h) {
    if (!renderer || api.lost) return false;
    const now = performance.now() / 1000, dt = Math.min(0.1, lastT ? now - lastT : 0.016); lastT = now;
    // drop quality on slow machines (pixel ratio first, then shadows)
    frameMs = lerp(frameMs, dt * 1000, 0.05); if (frameMs > 42) { if (++slow > 120 && quality < 2) { quality++; slow = 0; frameMs = 20; } } else slow = Math.max(0, slow - 1);
    if (qApplied !== quality) { applyQuality(); qApplied = quality; sizeW = 0; }
    if (sizeW !== W || sizeH !== H) { renderer.setSize(W, H, false); sizeW = W; sizeH = H; camera.aspect = W / H; camera.updateProjectionMatrix(); }
    const name = sets[T.scene] && T.scene !== 'day' && T.scene !== 'night' ? T.scene : 'town', S = sets[name], snap = cur !== name;
    if (snap) { for (const k of ['town', 'mafia', 'doctor', 'sheriff', 'vigilante']) sets[k].g.visible = k === name; cur = name; }
    const pk = n => T.players.find(p => p.name === n);

    // light and sky
    const wantNight = name === 'town' ? (T.scene === 'night' ? 1 : 0) : (S.night || 0);
    nightAmt = snap && name !== 'town' ? wantNight : lerp(nightAmt, wantNight, 1 - Math.pow(0.12, dt)); if (Math.abs(nightAmt - wantNight) < 0.002) nightAmt = wantNight;
    const n = nightAmt;
    sky.visible = stars.visible = !!S.sky; moon.visible = moonGlow.visible = !!S.sky && n > 0.02; sunBall.visible = sunGlow.visible = !!S.sky && n < 0.98; for (const c of clouds) c.visible = name === 'town';
    if (S.sky) {
      paintSky(n); stars.material.opacity = n * 0.9; moon.material.opacity = n; moonGlow.material.opacity = n * 0.55; sunBall.material.opacity = 1 - n; sunGlow.material.opacity = (1 - n) * 0.7;
      scene.background = null;
    } else scene.background = (S._bg || (S._bg = new THREE.Color(S.bg)));
    if (name === 'town') {
      scene.fog.color.copy(SKY.dayBot).lerp(SKY.nightBot, n); scene.fog.near = 45; scene.fog.far = 190;
      hemi.color.setHex(0xdcefff).lerp(cA.setHex(0x5868b8), n); hemi.groundColor.setHex(0x7a8a5a).lerp(cB.setHex(0x1c2230), n); hemi.intensity = lerp(1.2, 0.5, n);
      sun.color.setHex(0xfff1d6).lerp(cA.setHex(0x9fb6ff), n); sun.intensity = lerp(2.8, 0.55, n);
      sun.position.set(lerp(14, -9, n), lerp(22, 20, n), lerp(10, -8, n));
      for (const L of lampLights) L.intensity = n * 42;
      lampMat.emissiveIntensity = n * 2.4; winLit.emissiveIntensity = n * 1.7; winLit.color.setHex(0x8fb4cf).lerp(cA.setHex(0x3a3020), n); winDark.color.setHex(0x6f93ad).lerp(cA.setHex(0x1c2233), n);
      sets._clock.emissiveMap = sets._clock.map; sets._clock.emissiveIntensity = n * 0.55;
      for (const c of clouds) { c.position.x += dt * 0.6; if (c.position.x > 150) c.position.x = -150; }
      if (water) water.position.y = 0.58 + Math.sin(now * 1.3) * 0.012;
    } else {
      scene.fog.color.setHex(S.fog[0]); scene.fog.near = S.fog[1]; scene.fog.far = S.fog[2];
      hemi.color.setHex(S.hemi[0]); hemi.groundColor.setHex(S.hemi[1]); hemi.intensity = S.hemi[2];
      sun.color.setHex(0x9fb6ff); sun.intensity = S.sun; sun.position.set(-9, 20, -8);
    }
    if (fan) fan.rotation.y = now * 1.6; if (beacon) beacon.visible = Math.sin(now * 3) > 0;

    // who stands where
    const place = {}, list = T.players, cnt = list.length;
    let ringR = 4.6, wd = 0, wsw = 0, wideX = 0, wideZ = 20;
    if (name === 'town') {
      ringR = clamp(3.4 + cnt * 0.26, 4.8, 7.4);
      const spk = T.speaker ? pk(T.speaker) : null;
      wd = ringR * 2 + 10.5; wsw = Math.sin(now * 0.08) * 0.22; wideX = Math.sin(wsw) * wd; wideZ = Math.cos(wsw) * wd;
      list.forEach((p, i) => {
        const live = p.alive !== false || !!T.talk, a = (i / cnt) * Math.PI * 2 + Math.PI / cnt, speaking = p.name === T.speaker && live, r = ringR - (speaking ? 0.7 : 0), x = Math.sin(a) * r, z = Math.cos(a) * r;
        const st = place[p.name] = { x, z, yaw: Math.atan2(-x, -z), alive: live, diedAt: p.diedAt, speaking, snap };
        const v = T.votes[p.name], vt = v && v !== 'SKIP' ? pk(v) : null;
        if (vt && vt !== p && live) st.pointName = vt.name;
        else if (spk && spk !== p && (spk.alive !== false || T.talk)) st.lookName = spk.name;
      });
      const voting = Object.keys(T.votes).length > 0, fsp = T.speaker && place[T.speaker];
      followOn = api.follow && !!(fsp && fsp.alive && !voting && T.text); // camera goes to whoever is talking (not during the vote)
      if (followOn) fsp.look = new V3(wideX, 0, wideZ); // and they turn to face it
      for (const p of list) { const st = place[p.name]; if (st === fsp && followOn) continue; const q = place[st.pointName || st.lookName]; if (q) { const v = new V3(q.x, 0, q.z); if (st.pointName) st.point = v; else st.look = v; } }
    } else if (name === 'mafia') {
      let who = list.filter(p => p.alive && p.role === 'Mafia'); const sp = T.speaker && pk(T.speaker); if (!who.length && sp) who = [sp];
      who.forEach((p, i) => { const a = who.length === 1 ? Math.PI : Math.PI + (i / (who.length - 1) - 0.5) * 2.1, x = Math.sin(a) * 2.9, z = Math.cos(a) * 2.9 - 0.4; place[p.name] = { x, z, yaw: Math.atan2(-x, -0.4 - z), alive: true, speaking: p.name === T.speaker, snap }; });
    } else {
      const a = T.actor && pk(T.actor);
      if (a) place[a.name] = name === 'doctor' ? { x: 1.2, z: -1, yaw: -0.2, alive: true, speaking: true, snap } : name === 'sheriff' ? { x: 3.9, z: -1.2, yaw: Math.PI + 0.45, alive: true, speaking: false, snap, look: new V3(1.5, 0, -4) } : { x: -1.6, z: -1.2, yaw: 0.35, alive: true, speaking: false, snap };
    }
    for (const p of list) {
      let f = figs[p.name]; if (!f) f = figs[p.name] = makeFigure(p.name);
      const tex = faceTex(p, h), e = h.getSprite(p);
      setMap(f.face[0], tex); setMap(f.face[1], tex); setMap(f.soulMat, tex); setMap(f.carve, tex);
      colourFigure(f, e.color || h.colorOf(p.name));
      const wear = bodyFor(p, h), wantSkin = !!wear;
      const robotKind = !wantSkin && ROBOT_STYLES[h.bodies] && robotReady(ROBOT_STYLES[h.bodies]) ? ROBOT_STYLES[h.bodies] : null;
      if (wear && f.skinVer !== wear.key) { f.skinVer = wear.key; try { buildSteve(f, wear.img); } catch (err) { console.warn('skin failed:', err); } }
      if (f.robotOn && !robotKind) setRobotMode(f, false); // leave robot mode before the skin/default switch below
      setSkinMode(f, wantSkin);
      try { setRobot(f, robotKind, p, h, e, e.color || h.colorOf(p.name)); } catch (err) { console.warn('robot body failed:', err); }
      setRobotMode(f, !!robotKind);
      const st = place[p.name];
      if (!st) { f.g.visible = false; p._on = false; continue; }
      if (f.set !== name) { st.snap = true; f.set = name; }
      updateFigure(f, st, now, dt);
      // where the name tag goes (screen pixels), for the flat overlay
      tmp.set(f.g.position.x, (st.alive ? 3.15 * U * TALL + f.body.position.y : 1.8) + 0.2, f.g.position.z);
      const dist = tmp.distanceTo(camera.position); tmp.project(camera);
      p._on = tmp.z < 1 && tmp.z > -1; p._ax = (tmp.x * 0.5 + 0.5) * W; p._ay = (-tmp.y * 0.5 + 0.5) * H; p._d = dist;
      p._fs = clamp(H / dist * 0.36 / Math.tan(camera.fov * Math.PI / 360) * 0.5, 10.5, 21);
    }
    for (const k in figs) if (!list.some(p => p.name === k)) { scene.remove(figs[k].g); delete figs[k]; }

    // room details that follow the game
    const tgt = T.target ? pk(T.target) : null;
    if (name === 'doctor' || name === 'vigilante') { S.photo.visible = !!tgt; if (tgt) setMap(S.photo.userData.m, faceTex(tgt, h)); }
    if (name === 'sheriff') {
      const sig = list.map(p => p.name).join('|');
      if (S.sig !== sig) { // pin everyone's photo to the cork board, joined by red string
        S.sig = sig; for (const k in S.photos) S.board.remove(S.photos[k]); S.photos = {};
        const cols = Math.ceil(cnt / 2), pts = [];
        list.forEach((p, i) => { const row = i < cols ? 0 : 1, c = row ? i - cols : i, nrow = row ? cnt - cols : cols; const ph = photo(S.board, 0.62); ph.position.set((c - (nrow - 1) / 2) * (5.6 / Math.max(cols, 1)) + (rr(i + 2) - 0.5) * 0.12, (row ? -0.62 : 0.62) + (rr(i + 9) - 0.5) * 0.2, 0.01); ph.rotation.z = (rr(i + 5) - 0.5) * 0.16; add(ph, new THREE.Mesh(new THREE.CircleGeometry(0.04, 8), new THREE.MeshBasicMaterial({ color: 0xd6372c })), 0, 0.33, 0.012, false); S.photos[p.name] = ph; pts.push(ph.position); });
        const seg = []; for (let i = 0; i < pts.length; i++) for (const j of [1, cols]) { const q = pts[(i + j) % pts.length]; if (q !== pts[i]) seg.push(pts[i].x, pts[i].y + 0.33, 0, q.x, q.y + 0.33, 0); }
        S.strings.geometry.dispose(); S.strings.geometry = new THREE.BufferGeometry(); S.strings.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(seg), 3));
      }
      for (const p of list) { const ph = S.photos[p.name]; if (!ph) continue; setMap(ph.userData.m, faceTex(p, h)); ph.userData.m.color.setHex(p.alive === false ? 0x555555 : 0xffffff); }
      const tp = tgt && S.photos[tgt.name]; S.ring.visible = !!tp; if (tp) { S.ring.position.set(tp.position.x, tp.position.y, 0.03); S.ring.scale.setScalar(1.25 + Math.sin(now * 5) * 0.06); }
    }
    confetti.visible = name === 'town' && !!T.over;
    if (confetti.visible) { const a = confetti.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * (1.2 + rr(i) * 1.6); if (y < 0) y = 12; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(now * 2 + i) * dt * 0.5); } a.needsUpdate = true; }

    // camera: a slow drift, leaning towards whoever is speaking
    const aspect = W / H, k = snap ? 1 : 1 - Math.pow(0.08, dt);
    if (name === 'town') {
      const sw = wsw, d = wd, hgt = 3.6 + ringR * 0.8, sp = T.speaker && place[T.speaker], kk = snap ? 1 : 1 - Math.pow(0.1, dt);
      if (followOn && sp) { // close-up: the camera sits on the line from the speaker towards the usual wide spot, looking at them
        let dx = wideX - sp.x, dz = wideZ - sp.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
        fitCam(sp.x + dx * 7, 3.9, sp.z + dz * 7, sp.x, 1.55, sp.z, aspect, kk);
      } else {
        let lx = 0, lz = -0.4; if (sp && sp.alive) { lx = sp.x * 0.3; lz = sp.z * 0.3 - 0.4; }
        fitCam(Math.sin(sw) * d + lx * 0.5, hgt, Math.cos(sw) * d, lx, 2.5, lz - 1, aspect, kk);
      }
    } else { const c = S.cam, sw = Math.sin(now * 0.25) * 0.35; fitCam(c[0] + sw, c[1], c[2], c[3], c[4], c[5], aspect, k); }
    camera.position.copy(camPos); camera.lookAt(camLook);
    sun.target.position.set(0, 0, 0);
    renderer.render(scene, camera);
    return true;
  }
  function show(on) { if (canvas) canvas.style.display = on ? 'block' : 'none'; }
  const api = { init, frame, show, lost: false, follow: true, get quality() { return quality; } };
  window.Town3D = api;
})();
