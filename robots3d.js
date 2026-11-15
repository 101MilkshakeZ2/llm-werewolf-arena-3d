// AI MAFIA - "Cute Little Robots" player bodies (three.js). Plain script, load after three.min.js.
// Three designs, each built only from three.js primitives, so there is nothing to download or rig:
//   screenie - a TV-head robot; the logo IS the face, on the screen front and back
//   pip      - a round hover robot; the logo is a big round badge on the chest and on the back
//   bolt     - a boxy little walker; the logo is on the chest plate, the backpack and a flag on the antenna
// Every robot is recoloured with ONE call (setColor) and gets its logo with ONE call (setLogo).
//
//   const r = Robots.build('pip', { color: '#e9786f', height: 2.5 });
//   scene.add(r.group);
//   r.setColor('#3fa7ff');                    // the shell; feet, glow and trim follow
//   r.setLogo(Robots.logoTexture(img));       // any square image, canvas or text initials
//   r.update(timeSeconds, speaking);          // idle bob, antenna wobble, talking animation
//
// r.arms (two pivots, swing on .rotation.x) and r.neck (turn on .rotation.y) match the figures in town3d.js,
// so a robot can stand in for the default AI body later (see ALT_STYLES there).
(function () {
  'use strict';
  if (!window.THREE) return;
  const T = THREE;
  const BUILT_HEIGHT = 1.7; // every design is modelled at about this height, then scaled to opts.height

  // ---------- small helpers ----------
  function roundedBox(w, h, d, r, seg) { // a box with rounded edges, centred on 0
    r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
    const s = new T.Shape(), x = -w / 2 + r, y = -h / 2 + r, iw = w - 2 * r, ih = h - 2 * r;
    s.moveTo(x, y - r); s.lineTo(x + iw, y - r); s.quadraticCurveTo(x + iw + r, y - r, x + iw + r, y);
    s.lineTo(x + iw + r, y + ih); s.quadraticCurveTo(x + iw + r, y + ih + r, x + iw, y + ih + r);
    s.lineTo(x, y + ih + r); s.quadraticCurveTo(x - r, y + ih + r, x - r, y + ih);
    s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
    const g = new T.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: 0, bevelSegments: seg || 4, curveSegments: seg || 4 });
    g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals(); return g;
  }
  function mesh(parent, geo, mat, x, y, z, shadow) {
    const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = shadow !== false; m.receiveShadow = true; parent.add(m); return m;
  }
  const group = (parent, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g; };

  // A logo plane: square (round:false) or round. The logo material is unlit, so it stays readable at night.
  function logoPlane(parent, size, mat, x, y, z, back, round) {
    const geo = round ? new T.CircleGeometry(size / 2, 40) : new T.PlaneGeometry(size, size);
    const m = mesh(parent, geo, mat, x, y, z, false); if (back) m.rotation.y = Math.PI; return m;
  }

  // ---------- logo textures ----------
  // src: an <img>, <canvas> or ImageBitmap (any square logo, like sprites/*.png), or a short string (initials).
  // bg is used behind initials and behind transparent logos. Corners are rounded; round:true makes a disc.
  function logoTexture(src, opts) {
    opts = opts || {};
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
    const bg = opts.bg || '#2a2d34', rad = opts.round ? S / 2 : S * 0.16;
    g.beginPath(); if (g.roundRect) g.roundRect(0, 0, S, S, rad); else g.rect(0, 0, S, S); g.clip();
    g.fillStyle = bg; g.fillRect(0, 0, S, S);
    if (typeof src === 'string') {
      g.fillStyle = '#ffffff'; g.font = '700 ' + (src.length > 2 ? 86 : 118) + 'px sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(src.slice(0, 3), S / 2, S / 2 + 6);
    } else if (src) {
      g.drawImage(src, 0, 0, S, S);
    }
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
  }

  // ---------- shared material set: one tint drives everything that should follow the player colour ----------
  function materials(color) {
    const m = {
      shell: new T.MeshStandardMaterial({ roughness: 0.42, metalness: 0.08 }),            // the player colour
      shade: new T.MeshStandardMaterial({ roughness: 0.6, metalness: 0.05 }),             // a darker step of it (feet, joints)
      trim: new T.MeshStandardMaterial({ color: 0xf1eee6, roughness: 0.5 }),              // off-white, works with any colour
      dark: new T.MeshStandardMaterial({ color: 0x1c1f26, roughness: 0.35, metalness: 0.2 }), // screens, visors, legs
      glow: new T.MeshBasicMaterial({ color: 0xffffff }),                                 // eyes and antenna tips
      halo: new T.MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false }),
      logo: new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),      // logos keep their real colours, day and night
      logoRound: new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    };
    m.setColor = (hex) => {
      const c = new T.Color(hex);
      m.shell.color.copy(c);
      m.shade.color.copy(c).multiplyScalar(0.55);
      m.halo.color.copy(c).lerp(new T.Color(0xffffff), 0.35);
    };
    m.setColor(color || '#e9786f');
    return m;
  }

  // ---------- design 1: Screenie, the TV head ----------
  function buildScreenie(root, M) {
    const r = {};
    // legs and feet
    for (const s of [-1, 1]) {
      mesh(root, new T.CylinderGeometry(0.07, 0.07, 0.26, 12), M.dark, s * 0.15, 0.2, 0);
      const foot = mesh(root, new T.SphereGeometry(0.14, 20, 12), M.shade, s * 0.15, 0.06, 0.04); foot.scale.set(1, 0.55, 1.35);
    }
    // body: a rounded little barrel, off-white belly panel
    const body = group(root, 0, 0.62, 0); r.body = body;
    mesh(body, roundedBox(0.62, 0.5, 0.46, 0.14), M.shell, 0, 0, 0);
    mesh(body, roundedBox(0.36, 0.26, 0.04, 0.08), M.trim, 0, -0.02, 0.23);
    for (const [i, x] of [[0, -0.08], [1, 0], [2, 0.08]]) mesh(body, new T.SphereGeometry(0.028, 10, 8), i === 1 ? M.glow : M.dark, x, 0.03, 0.255, false);
    // arms: off-white noodles with shell-coloured mitts, on pivots at the shoulder
    r.arms = [-1, 1].map(s => {
      const piv = group(body, s * 0.36, 0.14, 0);
      mesh(piv, new T.CapsuleGeometry(0.055, 0.2, 4, 10), M.trim, s * 0.02, -0.15, 0);
      mesh(piv, new T.SphereGeometry(0.085, 16, 12), M.shell, s * 0.03, -0.32, 0);
      return piv;
    });
    // neck and the TV head
    const neck = group(body, 0, 0.26, 0); r.neck = neck;
    mesh(neck, new T.CylinderGeometry(0.08, 0.1, 0.08, 14), M.dark, 0, 0.03, 0);
    const head = group(neck, 0, 0.42, 0); r.head = head;
    mesh(head, roundedBox(0.98, 0.76, 0.66, 0.16), M.shell, 0, 0, 0);
    for (const z of [1, -1]) { // a dark screen on BOTH sides, with the logo filling most of it
      const bez = mesh(head, roundedBox(0.8, 0.62, 0.04, 0.1), M.dark, 0, 0, z * 0.32, false);
      logoPlane(head, 0.54, M.logo, 0, 0, z * 0.345, z < 0);
      bez.userData.screen = true;
    }
    for (const s of [-1, 1]) { // ear bolts
      const ear = mesh(head, new T.CylinderGeometry(0.1, 0.1, 0.07, 18), M.trim, s * 0.5, 0, 0); ear.rotation.z = Math.PI / 2;
    }
    // antenna with a glowing tip in the player colour
    const ant = group(head, 0.22, 0.38, 0); r.antenna = ant;
    mesh(ant, new T.CylinderGeometry(0.015, 0.015, 0.24, 8), M.dark, 0, 0.12, 0);
    mesh(ant, new T.SphereGeometry(0.055, 14, 10), M.glow, 0, 0.27, 0, false);
    mesh(ant, new T.SphereGeometry(0.11, 14, 10), M.halo, 0, 0.27, 0, false);
    r.update = (t, speaking, ph) => {
      body.position.y = 0.62 + Math.sin(t * 2 + ph) * 0.012;
      ant.rotation.z = Math.sin(t * 3 + ph) * 0.12;
      head.rotation.z = speaking ? Math.sin(t * 9) * 0.05 : 0;
      head.position.y = 0.42 + (speaking ? Math.abs(Math.sin(t * 9)) * 0.03 : 0);
    };
    return r;
  }

  // ---------- design 2: Pip, the round hover bot ----------
  function buildPip(root, M) {
    const r = {};
    const float = group(root, 0, 0, 0); r.body = float;
    // hover ring and its glow on the ground
    const ring = mesh(float, new T.TorusGeometry(0.2, 0.045, 10, 28), M.dark, 0, 0.32, 0); ring.rotation.x = Math.PI / 2;
    const glowDisc = mesh(root, new T.CircleGeometry(0.3, 28), M.halo, 0, 0.02, 0, false); glowDisc.rotation.x = -Math.PI / 2;
    // the egg body
    const egg = mesh(float, new T.SphereGeometry(0.6, 40, 28), M.shell, 0, 0.9, 0); egg.scale.set(1, 0.95, 0.92);
    // round logo badge front and back: a puck set into the shell, an off-white rim, the logo on its face
    for (const z of [1, -1]) {
      const puck = mesh(float, new T.CylinderGeometry(0.24, 0.24, 0.24, 36), M.dark, 0, 0.66, z * 0.43); puck.rotation.x = Math.PI / 2;
      const rim = mesh(float, new T.TorusGeometry(0.235, 0.03, 10, 40), M.trim, 0, 0.66, z * 0.55); if (z < 0) rim.rotation.y = Math.PI;
      logoPlane(float, 0.42, M.logoRound, 0, 0.66, z * 0.553, z < 0, true);
    }
    // neck = a group at the top so the visor can turn on its own
    const neck = group(float, 0, 1.08, 0); r.neck = neck;
    const visor = mesh(neck, new T.CapsuleGeometry(0.12, 0.42, 6, 16), M.dark, 0, 0.02, 0.47); visor.rotation.z = Math.PI / 2; visor.scale.set(1, 1, 0.5);
    const eyes = [-1, 1].map(s => mesh(neck, new T.CapsuleGeometry(0.04, 0.07, 4, 10), M.glow, s * 0.13, 0.03, 0.53, false));
    r.eyes = eyes;
    // little side fins
    for (const s of [-1, 1]) { const fin = mesh(float, new T.SphereGeometry(0.12, 16, 12), M.trim, s * 0.58, 1.02, 0); fin.scale.set(0.45, 1, 0.8); fin.rotation.z = -s * 0.5; }
    // floating hands (no arms), on pivots so they can still wave
    r.arms = [-1, 1].map(s => {
      const piv = group(float, s * 0.72, 0.95, 0.05);
      mesh(piv, new T.SphereGeometry(0.11, 18, 12), M.shell, 0, -0.18, 0);
      mesh(piv, new T.TorusGeometry(0.08, 0.02, 8, 20), M.trim, 0, -0.08, 0).rotation.x = Math.PI / 2;
      return piv;
    });
    // short antenna
    const ant = group(neck, 0, 0.42, 0); r.antenna = ant;
    mesh(ant, new T.CylinderGeometry(0.015, 0.015, 0.16, 8), M.dark, 0, 0.08, 0);
    mesh(ant, new T.SphereGeometry(0.05, 14, 10), M.glow, 0, 0.18, 0, false);
    mesh(ant, new T.SphereGeometry(0.1, 14, 10), M.halo, 0, 0.18, 0, false);
    r.update = (t, speaking, ph) => {
      float.position.y = 0.06 + Math.sin(t * 1.8 + ph) * 0.05;
      glowDisc.scale.setScalar(1 - Math.sin(t * 1.8 + ph) * 0.1);
      ant.rotation.z = Math.sin(t * 2.6 + ph) * 0.15;
      const blink = (Math.sin(t * 0.9 + ph * 3) > 0.985) ? 0.15 : 1;
      for (const e of eyes) e.scale.y = speaking ? 0.6 + Math.abs(Math.sin(t * 10)) * 0.6 : blink;
    };
    return r;
  }

  // ---------- design 3: Bolt, the boxy walker with a flag ----------
  function buildBolt(root, M) {
    const r = {};
    for (const s of [-1, 1]) {
      mesh(root, new T.BoxGeometry(0.14, 0.26, 0.16), M.dark, s * 0.18, 0.2, 0);
      mesh(root, roundedBox(0.24, 0.12, 0.34, 0.05), M.shade, s * 0.18, 0.06, 0.04);
    }
    const body = group(root, 0, 0.68, 0); r.body = body;
    mesh(body, roundedBox(0.76, 0.64, 0.5, 0.1), M.shell, 0, 0, 0);
    // chest plate with the logo, and a backpack with the logo on its back
    mesh(body, roundedBox(0.5, 0.5, 0.04, 0.07), M.trim, 0, 0, 0.25);
    logoPlane(body, 0.42, M.logo, 0, 0, 0.275, false);
    mesh(body, roundedBox(0.56, 0.5, 0.18, 0.07), M.shade, 0, 0.02, -0.33);
    logoPlane(body, 0.42, M.logo, 0, 0.02, -0.425, true);
    r.arms = [-1, 1].map(s => {
      const piv = group(body, s * 0.44, 0.18, 0);
      mesh(piv, new T.SphereGeometry(0.08, 14, 10), M.dark, 0, 0, 0);
      mesh(piv, new T.CylinderGeometry(0.06, 0.06, 0.3, 12), M.trim, 0, -0.18, 0);
      const claw = mesh(piv, new T.TorusGeometry(0.075, 0.03, 8, 16, Math.PI * 1.4), M.shell, 0, -0.38, 0); claw.rotation.z = -Math.PI * 0.2;
      return piv;
    });
    const neck = group(body, 0, 0.32, 0); r.neck = neck;
    mesh(neck, new T.CylinderGeometry(0.1, 0.12, 0.08, 14), M.dark, 0, 0.04, 0);
    const head = group(neck, 0, 0.36, 0); r.head = head;
    mesh(head, roundedBox(0.92, 0.6, 0.62, 0.12), M.trim, 0, 0, 0);
    mesh(head, roundedBox(0.74, 0.42, 0.04, 0.1), M.dark, 0, 0, 0.3, false);
    const eyes = [-1, 1].map(s => mesh(head, new T.CircleGeometry(0.085, 24), M.glow, s * 0.17, 0.04, 0.325, false));
    const mouth = mesh(head, new T.TorusGeometry(0.06, 0.016, 6, 16, Math.PI), M.glow, 0, -0.08, 0.325, false); mouth.rotation.z = Math.PI;
    r.eyes = eyes;
    for (const s of [-1, 1]) mesh(head, roundedBox(0.08, 0.26, 0.26, 0.04), M.shell, s * 0.48, 0, 0); // ear caps in the player colour
    // antenna with a flag that shows the logo on both sides: visible from far away and from above
    const ant = group(head, -0.3, 0.3, 0); r.antenna = ant;
    mesh(ant, new T.CylinderGeometry(0.014, 0.014, 0.6, 8), M.dark, 0, 0.3, 0);
    mesh(ant, new T.SphereGeometry(0.04, 12, 10), M.glow, 0, 0.62, 0, false);
    const flag = group(ant, 0, 0.44, 0); r.flag = flag;
    logoPlane(flag, 0.3, M.logo, 0.17, 0, 0.004, false);
    logoPlane(flag, 0.3, M.logo, 0.17, 0, -0.004, true);
    r.update = (t, speaking, ph) => {
      body.position.y = 0.68 + Math.abs(Math.sin(t * 2 + ph)) * 0.012;
      ant.rotation.z = Math.sin(t * 2.4 + ph) * 0.06;
      flag.rotation.y = Math.sin(t * 3 + ph) * 0.35;
      mouth.scale.y = speaking ? 0.4 + Math.abs(Math.sin(t * 11)) * 1.4 : 1;
      head.position.y = 0.36 + (speaking ? Math.abs(Math.sin(t * 9)) * 0.025 : 0);
    };
    return r;
  }

  const KINDS = {
    screenie: { label: 'Screenie', blurb: 'TV head. The logo is the face, on the screen front and back.', build: buildScreenie },
    pip: { label: 'Pip', blurb: 'Round hover bot. Big round logo badge on the chest and the back.', build: buildPip },
    bolt: { label: 'Bolt', blurb: 'Boxy walker. Logo on the chest, the backpack and a flag on the antenna.', build: buildBolt },
  };

  function build(kind, opts) {
    opts = opts || {};
    const k = KINDS[kind] || KINDS.screenie;
    const g = new T.Group(), root = new T.Group(); g.add(root);
    root.scale.setScalar((opts.height || BUILT_HEIGHT) / BUILT_HEIGHT);
    const M = materials(opts.color);
    const parts = k.build(root, M);
    const ph = opts.phase != null ? opts.phase : Math.random() * 6.28;
    const api = {
      kind, group: g, root, materials: M, arms: parts.arms, neck: parts.neck, parts,
      setColor: (hex) => M.setColor(hex),
      setLogo: (tex) => {
        for (const m of [M.logo, M.logoRound]) { m.map = tex; m.needsUpdate = true; }
      },
      update: (t, speaking) => parts.update(t, !!speaking, ph),
      dispose: () => {
        g.traverse(o => o.geometry && o.geometry.dispose());
        for (const key of Object.keys(M)) if (M[key] && M[key].isMaterial) M[key].dispose();
      },
    };
    // the round badge gets its own round-cropped copy of the logo
    api.setLogoSource = (src, logoOpts) => {
      const sq = logoTexture(src, logoOpts), rd = logoTexture(src, Object.assign({}, logoOpts, { round: true }));
      for (const [m, t] of [[M.logo, sq], [M.logoRound, rd]]) { if (m.map) m.map.dispose(); m.map = t; m.needsUpdate = true; }
    };
    api.setLogoSource(opts.logo || '?', { bg: opts.logoBg });
    return api;
  }

  window.Robots = { KINDS, build, logoTexture, BUILT_HEIGHT };
})();
