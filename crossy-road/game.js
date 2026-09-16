// ============================================================
//  CMU CROSSY ROAD  –  game.js
//  Three.js r128  |  voxel aesthetic, CMU campus theme
//  Level-based, countdown timer, difficulty selector
// ============================================================

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const TILE      = 1;
  const COLS      = 11;
  const HALF      = Math.floor(COLS / 2);   // 5
  const HOP_DURATION  = 155;  // ms
  const IDLE_TIMEOUT  = 8000; // ms idle → campus security (eagle equivalent)

  // Lane type constants
  const LANE = { GRASS: 'grass', ROAD: 'road', PATH: 'path', SAFE: 'safe', DEST: 'dest' };
  // PATH = pedestrian walkway (rushing students hazard)
  // DEST = destination zone (triggers level complete)

  // ── CMU Colour Palette ─────────────────────────────────────
  const COL = {
    // Campus ground
    grassLight  : 0x5cb85c,
    grassDark   : 0x4a9e4a,
    pathLight   : 0xd4c5a0,   // brick walkway light
    pathDark    : 0xbfae88,   // brick walkway dark
    roadGray    : 0x555566,
    roadLine    : 0xf0e060,
    sidewalkLight: 0xc8bfa8,
    sidewalkDark : 0xb0a890,

    // Water (kept for possible water features, unused in L1 but infrastructure retained)
    waterDeep   : 0x1a6ea8,
    waterLight  : 0x2288cc,
    logBrown    : 0x8B5E3C,
    logEnd      : 0x6B4423,

    // CMU brand
    cmuRed      : 0xc41230,
    cmuGold     : 0xe8b04b,
    cmuGray     : 0x63666a,
    cmuDarkGray : 0x3d3f42,

    // Vehicles
    busYellow   : 0xf5c518,   // CMU-ish campus shuttle yellow
    busDark     : 0xc9a010,
    scooterBlue : 0x2980b9,
    bikeRed     : 0xe74c3c,
    bikeDark    : 0x333333,
    carColors   : [0xe74c3c, 0x3498db, 0xf1c40f, 0x27ae60, 0xecf0f1, 0x9b59b6],

    // Student player
    studentSkin : 0xf5cba7,
    studentShirt: 0xc41230,   // CMU red shirt
    studentPants: 0x2c3e50,   // dark pants
    studentShoes: 0x7f8c8d,
    studentHair : 0x4a3728,
    backpack    : 0x2980b9,

    // Rushing student NPC
    npcColors   : [0xe74c3c, 0x3498db, 0x27ae60, 0x9b59b6, 0xe67e22, 0x1abc9c],

    // Decor
    treeTrunk   : 0x7D5A3C,
    treeTop     : 0x2ecc71,
    treeTop2    : 0x27ae60,
    benchBrown  : 0x8B6914,
    benchMetal  : 0x7f8c8d,
    buildingWall: 0xd4c5a0,
    buildingRoof: 0xc41230,   // CMU red roof
    signGreen   : 0x27ae60,

    // UI
    sky         : 0x87CEEB,
    coin        : 0xFFD700,
  };

  // ── Difficulty Config ──────────────────────────────────────
  const DIFFICULTY = {
    easy:   { time: 90,  speedMult: 0.70, hazardMult: 0.70, label: 'EASY'   },
    medium: { time: 60,  speedMult: 1.00, hazardMult: 1.00, label: 'MEDIUM' },
    hard:   { time: 40,  speedMult: 1.45, hazardMult: 1.35, label: 'HARD'   },
  };

  // ── Level 1 Lane Layout ────────────────────────────────────
  // z goes negative (forward). Player starts at z=0.
  // Each entry: { type, label, speed?, dir?, hazardType? }
  // Destination zone is the last row. Total = ~28 rows forward.
  const LEVEL1_LANES = [
    // ── Start: Margaret Morrison steps ──
    { type: LANE.SAFE,  label: 'Start – Margaret Morrison' },    // z=0
    { type: LANE.GRASS, label: 'MM Lawn' },
    { type: LANE.GRASS, label: 'MM Lawn' },
    // ── First path crossing ──
    { type: LANE.PATH,  label: 'Campus Walk', speed: 0.045, dir:  1 },
    { type: LANE.PATH,  label: 'Campus Walk', speed: 0.038, dir: -1 },
    // ── Grass quad ──
    { type: LANE.GRASS, label: 'The Cut (lower)' },
    { type: LANE.GRASS, label: 'The Cut (lower)' },
    { type: LANE.GRASS, label: 'The Cut (lower)' },
    // ── Forbes Ave crossing ──
    { type: LANE.ROAD,  label: 'Forbes Ave',  speed: 0.07,  dir:  1 },
    { type: LANE.ROAD,  label: 'Forbes Ave',  speed: 0.09,  dir: -1 },
    { type: LANE.ROAD,  label: 'Forbes Ave',  speed: 0.06,  dir:  1 },
    // ── Median / Sidewalk ──
    { type: LANE.SAFE,  label: 'Forbes Median' },
    // ── Frew St ──
    { type: LANE.ROAD,  label: 'Frew St',     speed: 0.055, dir: -1 },
    { type: LANE.ROAD,  label: 'Frew St',     speed: 0.07,  dir:  1 },
    // ── Mid-campus grass ──
    { type: LANE.GRASS, label: 'Mid Campus' },
    { type: LANE.GRASS, label: 'Mid Campus' },
    // ── Busy pedestrian crossing ──
    { type: LANE.PATH,  label: 'Busy Walkway', speed: 0.055, dir:  1 },
    { type: LANE.PATH,  label: 'Busy Walkway', speed: 0.065, dir: -1 },
    { type: LANE.PATH,  label: 'Busy Walkway', speed: 0.048, dir:  1 },
    // ── Upper campus grass ──
    { type: LANE.GRASS, label: 'Upper Campus Lawn' },
    { type: LANE.GRASS, label: 'Upper Campus Lawn' },
    // ── Morewood Ave ──
    { type: LANE.ROAD,  label: 'Morewood Ave', speed: 0.08,  dir: -1 },
    { type: LANE.ROAD,  label: 'Morewood Ave', speed: 0.10,  dir:  1 },
    // ── Final approach path ──
    { type: LANE.PATH,  label: 'Tepper Approach', speed: 0.04, dir: -1 },
    { type: LANE.GRASS, label: 'Tepper Lawn' },
    { type: LANE.GRASS, label: 'Tepper Lawn' },
    // ── Destination ──
    { type: LANE.DEST,  label: 'Tepper School of Business' },   // z = -26
  ];

  // The destination z-index (negative)
  const DEST_Z = -(LEVEL1_LANES.length - 1);

  // ── State ──────────────────────────────────────────────────
  let scene, camera, renderer, clock;
  let playerMesh, playerGroup;
  let lanes = [];
  let score = 0, bestScore = 0, totalCoins = 0;
  let difficulty = 'medium';
  let timeLeft = 60;
  let timerInterval = null;
  // gameState: 'start' | 'playing' | 'dead' | 'win'
  let gameState = 'start';
  let deathReason = '';    // 'hit' | 'timeout' | 'idle'
  let hopQueue = [];
  let isHopping = false;
  let hopStart, hopEnd, hopStartTime;
  let playerZ = 0, playerX = 0;
  let maxZ = 0;            // furthest forward z reached
  let idleTimer = null;
  let drownTimer = null;   // kept for water lane infra (unused L1)
  let eagleMesh = null;    // security guard / campus police
  let waterOffset = {};
  let camTargetZ = 0;
  let frameId;

  // Mesh pools
  let obstacleMeshes = [];
  let logMeshes      = [];
  let facadeMeshes   = [];
  let tileMeshes     = {};
  let decorMeshes    = {};
  let coinMeshes     = {};

  // DOM refs
  const scoreEl    = document.getElementById('score-display');
  const timerEl    = document.getElementById('timer-display');
  const timerPill  = document.getElementById('timer-pill');
  const coinEl     = document.getElementById('coin-display');
  const startScreen  = document.getElementById('splash-screen');
  const goScreen     = document.getElementById('gameover-screen');
  const goScore      = document.getElementById('gameover-score');
  const goBest       = document.getElementById('gameover-best');
  const goCoins      = document.getElementById('gameover-coins');
  const goTime       = document.getElementById('gameover-time');
  const goReason     = document.getElementById('go-reason');
  const lcScreen     = document.getElementById('levelcomplete-screen');
  const lcScore      = document.getElementById('lc-score');
  const lcTime       = document.getElementById('lc-time');
  const lcCoins      = document.getElementById('lc-coins');
  const lcDiff       = document.getElementById('lc-diff');
  const hopFlash     = document.getElementById('hop-flash');
  const levelLabel   = document.getElementById('level-label');

  // ── Audio ──────────────────────────────────────────────────
  let audioCtx = null;
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playStep() {
    // Footstep click
    try {
      const ctx = getAudio();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/(ctx.sampleRate*0.01));
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      filt.type = 'highpass'; filt.frequency.value = 800;
      src.buffer = buf;
      src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      src.start();
    } catch(e) {}
  }

  function playSquish() {
    try {
      const ctx = getAudio();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/(ctx.sampleRate*0.08));
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 400;
      src.buffer = buf;
      src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      src.start();
    } catch(e) {}
  }

  function playTimeout() {
    try {
      const ctx = getAudio();
      [440, 330, 220].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.start(t); osc.stop(t + 0.25);
      });
    } catch(e) {}
  }

  function playWin() {
    try {
      const ctx = getAudio();
      [523, 659, 784, 1047].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = f;
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0.0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.start(t); osc.stop(t + 0.3);
      });
    } catch(e) {}
  }

  function playScore() {
    try {
      const ctx = getAudio();
      [660, 880].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = f;
        const t = ctx.currentTime + i * 0.07;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t); osc.stop(t + 0.2);
      });
    } catch(e) {}
  }

  function playCoin() {
    try {
      const ctx = getAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.13, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } catch(e) {}
  }

  // ── THREE setup ────────────────────────────────────────────
  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COL.sky);

    const aspect = window.innerWidth / window.innerHeight;
    const viewH  = 6;
    camera = new THREE.OrthographicCamera(
      -viewH * aspect, viewH * aspect, viewH, -viewH, 0.1, 200
    );
    camera._viewH = viewH;
    positionCamera(0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').prepend(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff8e7, 0.9);
    sun.position.set(5, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.width = sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;   sun.shadow.camera.bottom = -16;
    sun.shadow.bias = -0.001;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xadd8e6, 0.25);
    fill.position.set(-5, 4, -4);
    scene.add(fill);

    clock = new THREE.Clock();
    window.addEventListener('resize', onResize);
  }

  function positionCamera(targetZ) {
    camera.position.set(0, 18, targetZ + 8);
    camera.lookAt(0, 0, targetZ - 4);
  }

  function onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const viewH  = camera._viewH || 6;
    camera.left = -viewH * aspect; camera.right  =  viewH * aspect;
    camera.top  =  viewH;          camera.bottom = -viewH;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ── Geometry helpers ───────────────────────────────────────
  function box(w, h, d, color) {
    return new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color })
    );
  }

  function addShadowBlob(g, w, d) {
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.9, d * 0.85),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
    );
    s.rotation.x = -Math.PI / 2;
    s.position.y = -0.08;
    g.add(s);
  }

  // ── Ground tile building ───────────────────────────────────
  const GEO_TILE  = new THREE.BoxGeometry(TILE, 0.22, TILE);
  const GEO_WATER = new THREE.BoxGeometry(TILE, 0.12, TILE);

  function buildTile(lane) {
    const z = lane.z;
    if (tileMeshes[z]) return;
    const group = new THREE.Group();

    if (lane.type === LANE.WATER) {
      for (let x = -HALF-2; x <= HALF+2; x++) {
        const shade = (x+z)%2===0 ? COL.waterDeep : COL.waterLight;
        const mat = new THREE.MeshLambertMaterial({ color: shade, transparent: true, opacity: 0.88 });
        const m = new THREE.Mesh(GEO_WATER, mat);
        m.position.set(x*TILE, -0.06, z*TILE);
        m.receiveShadow = true;
        group.add(m);
      }
    } else {
      for (let x = -HALF-2; x <= HALF+2; x++) {
        let color;
        if (lane.type === LANE.ROAD) {
          color = COL.roadGray;
        } else if (lane.type === LANE.PATH) {
          color = (x+z)%2===0 ? COL.pathLight : COL.pathDark;
        } else if (lane.type === LANE.DEST) {
          // Destination: special brick-red tile
          color = (x+z)%2===0 ? 0xd4a574 : 0xc49060;
        } else if (lane.type === LANE.SAFE) {
          color = COL.sidewalkLight;
        } else {
          // GRASS
          color = (x+z)%2===0 ? COL.grassLight : COL.grassDark;
        }
        const mat = new THREE.MeshLambertMaterial({ color });
        const m = new THREE.Mesh(GEO_TILE, mat);
        m.position.set(x*TILE, -0.11, z*TILE);
        m.receiveShadow = true;
        group.add(m);
      }

      // Road dashed lines
      if (lane.type === LANE.ROAD) {
        const lmat = new THREE.MeshLambertMaterial({ color: COL.roadLine });
        const lgeo = new THREE.BoxGeometry(0.18, 0.01, 0.44);
        for (let x = -HALF-1; x <= HALF+1; x++) {
          const l = new THREE.Mesh(lgeo, lmat);
          l.position.set(x*TILE, 0.0, z*TILE);
          group.add(l);
        }
      }

      // Path: small brick seam lines
      if (lane.type === LANE.PATH) {
        const smat = new THREE.MeshLambertMaterial({ color: 0x9e8a68 });
        const sgeo = new THREE.BoxGeometry(COLS + 4, 0.01, 0.06);
        const seam = new THREE.Mesh(sgeo, smat);
        seam.position.set(0, 0.0, z*TILE);
        group.add(seam);
      }

      // Destination: entry arch sign
      if (lane.type === LANE.DEST) {
        buildDestinationSign(group, z);
      }
    }

    scene.add(group);
    tileMeshes[z] = group;

    // Decorations
    if (lane.type === LANE.GRASS) buildGrassDecor(z, lane.label);
    if (lane.type === LANE.SAFE)  buildSafeDecor(z);

    spawnCoinsForLane(z, lane.type);
  }

  function buildDestinationSign(group, z) {
    // Arch posts
    [-2.5, 2.5].forEach(x => {
      const post = box(0.2, 1.4, 0.2, COL.cmuDarkGray);
      post.position.set(x, 0.7, z * TILE);
      post.castShadow = true;
      group.add(post);
    });
    // Arch crossbar
    const bar = box(5.2, 0.28, 0.2, COL.cmuRed);
    bar.position.set(0, 1.44, z * TILE);
    bar.castShadow = true;
    group.add(bar);
    // "TEPPER" text as colored blocks on bar
    const letterMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let i = 0; i < 6; i++) {
      const lb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), letterMat);
      lb.position.set(-1.1 + i * 0.44, 1.44, z * TILE - 0.12);
      group.add(lb);
    }
  }

  // ── Grass decorations ──────────────────────────────────────
  function buildGrassDecor(z, label) {
    if (decorMeshes[z]) return;
    decorMeshes[z] = [];
    const isCut = label && label.includes('Cut');

    for (let x = -HALF-1; x <= HALF+1; x++) {
      // Fewer trees on The Cut, more on edges
      const prob = isCut ? 0.12 : 0.18;
      if (Math.abs(x) <= 1 && z === 0) continue;
      if (Math.random() < prob) {
        const tree = buildTree();
        tree.position.set(x*TILE, 0, z*TILE);
        scene.add(tree);
        decorMeshes[z].push({ mesh: tree, x });
      } else if (Math.random() < 0.06) {
        // Occasional bench
        const bench = buildBench();
        bench.position.set(x*TILE, 0, z*TILE);
        scene.add(bench);
        decorMeshes[z].push({ mesh: bench, x });
      }
    }
  }

  function buildSafeDecor(z) {
    if (decorMeshes[z]) return;
    decorMeshes[z] = [];
    // Safe zones get low bushes along edges only
    [-HALF-1, -HALF, HALF, HALF+1].forEach(x => {
      if (Math.random() < 0.5) {
        const bush = buildBush();
        bush.position.set(x*TILE, 0, z*TILE);
        scene.add(bush);
        decorMeshes[z].push({ mesh: bush, x });
      }
    });
  }

  function buildTree() {
    const g = new THREE.Group();
    const trunk = box(0.22, 0.55, 0.22, COL.treeTrunk);
    trunk.position.y = 0.27; trunk.castShadow = true; g.add(trunk);
    [[0.72, 0.60], [0.58, 0.82], [0.42, 1.00]].forEach(([s, y], i) => {
      const leaf = box(s, 0.28, s, i%2===0 ? COL.treeTop2 : COL.treeTop);
      leaf.position.y = y; leaf.castShadow = true; g.add(leaf);
    });
    return g;
  }

  function buildBush() {
    const g = new THREE.Group();
    const base = box(0.55, 0.32, 0.45, 0x27ae60);
    base.position.y = 0.16; base.castShadow = true; g.add(base);
    const top = box(0.38, 0.22, 0.32, 0x2ecc71);
    top.position.y = 0.39; g.add(top);
    return g;
  }

  function buildBench() {
    const g = new THREE.Group();
    // Seat
    const seat = box(0.7, 0.08, 0.3, COL.benchBrown);
    seat.position.y = 0.28; g.add(seat);
    // Back
    const back = box(0.7, 0.24, 0.06, COL.benchBrown);
    back.position.set(0, 0.44, -0.12); g.add(back);
    // Legs
    [[-0.25, 0.1], [0.25, 0.1], [-0.25, -0.1], [0.25, -0.1]].forEach(([x, bz]) => {
      const leg = box(0.06, 0.28, 0.06, COL.benchMetal);
      leg.position.set(x, 0.14, bz); g.add(leg);
    });
    addShadowBlob(g, 0.72, 0.32);
    return g;
  }

  // ── Campus building facades (edge decor) ───────────────────
  function buildBuildingFacade(side) {
    // 'side' = 1 (right) or -1 (left), placed well outside HALF
    const g = new THREE.Group();
    const h = 1.2 + Math.random() * 0.8;
    const w = 1.5 + Math.random() * 0.8;
    const wall = box(w, h, 0.6, COL.buildingWall);
    wall.position.y = h / 2; wall.castShadow = true; g.add(wall);
    const roof = box(w + 0.1, 0.2, 0.7, COL.buildingRoof);
    roof.position.y = h + 0.1; g.add(roof);
    // Windows
    const winMat = new THREE.MeshLambertMaterial({ color: 0x87ceeb });
    for (let wy = 0; wy < Math.floor(h); wy++) {
      for (let wx = -1; wx <= 1; wx++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.08), winMat);
        win.position.set(wx * 0.42, 0.4 + wy * 0.5, -0.28);
        g.add(win);
      }
    }
    return g;
  }

  // ── Vehicle building ───────────────────────────────────────
  function buildBus(lane) {
    const g = new THREE.Group();
    // Long body
    const body = box(1.8, 0.7, 0.7, COL.busYellow);
    body.position.y = 0.35; body.castShadow = true; g.add(body);
    // Roof (slightly darker)
    const roof = box(1.75, 0.12, 0.68, COL.busDark);
    roof.position.y = 0.76; g.add(roof);
    // Windows strip
    const winMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
    const winStrip = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.26, 0.08), winMat);
    winStrip.position.set(0, 0.52, 0.36); g.add(winStrip);
    winStrip.clone().position.set(0, 0.52, -0.36); g.add(winStrip.clone());
    // Wheels (4 pairs)
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const wheelGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.14, 8);
    [[-0.6, -0.28], [-0.6, 0.28], [0, -0.28], [0, 0.28], [0.6, -0.28], [0.6, 0.28]].forEach(([x, bz]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.06, bz); g.add(w);
    });
    // CMU logo stripe
    const stripe = box(1.78, 0.1, 0.72, COL.cmuRed);
    stripe.position.y = 0.14; g.add(stripe);
    addShadowBlob(g, 1.8, 0.72);
    return g;
  }

  function buildScooter(lane) {
    const g = new THREE.Group();
    // Deck
    const deck = box(0.55, 0.06, 0.16, 0x2c3e50);
    deck.position.y = 0.16; g.add(deck);
    // Stem
    const stem = box(0.06, 0.42, 0.06, COL.scooterBlue);
    stem.position.set(lane.dir > 0 ? 0.22 : -0.22, 0.28, 0); g.add(stem);
    // Handlebar
    const hbar = box(0.06, 0.06, 0.32, 0x7f8c8d);
    hbar.position.set(lane.dir > 0 ? 0.22 : -0.22, 0.50, 0); g.add(hbar);
    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8);
    const wMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    [-0.22, 0.22].forEach(xOff => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(xOff * (lane.dir > 0 ? 1 : -1), 0.1, 0); g.add(w);
    });
    // Rider (tiny voxel figure)
    const body = box(0.18, 0.28, 0.16, COL.npcColors[Math.floor(Math.random()*COL.npcColors.length)]);
    body.position.set(0, 0.42, 0); body.castShadow = true; g.add(body);
    const head = box(0.16, 0.16, 0.14, COL.studentSkin);
    head.position.set(0, 0.64, 0); g.add(head);
    addShadowBlob(g, 0.56, 0.2);
    return g;
  }

  function buildBike(lane) {
    const g = new THREE.Group();
    // Frame
    const frame = box(0.62, 0.06, 0.06, COL.bikeRed);
    frame.position.y = 0.24; g.add(frame);
    // Seat
    const seat = box(0.14, 0.05, 0.12, COL.bikeDark);
    seat.position.set(lane.dir > 0 ? -0.2 : 0.2, 0.36, 0); g.add(seat);
    // Handlebar
    const hbar = box(0.06, 0.06, 0.26, 0x7f8c8d);
    hbar.position.set(lane.dir > 0 ? 0.2 : -0.2, 0.38, 0); g.add(hbar);
    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.07, 10);
    const wMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const rimMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    [-0.26, 0.26].forEach(xOff => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(xOff * (lane.dir > 0 ? 1 : -1), 0.19, 0); g.add(w);
    });
    // Rider
    const body = box(0.2, 0.3, 0.18, COL.npcColors[Math.floor(Math.random()*COL.npcColors.length)]);
    body.position.set(0, 0.52, 0); body.castShadow = true; g.add(body);
    const head = box(0.18, 0.18, 0.16, COL.studentSkin);
    head.position.set(0, 0.76, 0); g.add(head);
    addShadowBlob(g, 0.56, 0.24);
    return g;
  }

  function buildCar(lane) {
    const bodyColor = COL.carColors[Math.floor(Math.random() * COL.carColors.length)];
    const g = new THREE.Group();
    const body = box(0.82, 0.34, 0.58, bodyColor);
    body.position.y = 0.17; body.castShadow = true; g.add(body);
    const cabin = box(0.52, 0.28, 0.52, bodyColor);
    cabin.position.set(-0.05, 0.45, 0); cabin.castShadow = true; g.add(cabin);
    const winMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
    [-0.22, 0.22].forEach(bz => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.08), winMat);
      win.position.set(-0.05, 0.46, bz); g.add(win);
    });
    const wMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const wGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 8);
    [[-0.28,-0.22],[-0.28,0.22],[0.28,-0.22],[0.28,0.22]].forEach(([x, bz]) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI/2; w.position.set(x, 0.05, bz); g.add(w);
    });
    addShadowBlob(g, 0.7, 0.55);
    return g;
  }

  // ── Rushing student NPC (PATH hazard) ─────────────────────
  function buildRushingStudent(lane) {
    const g = new THREE.Group();
    const shirtCol = COL.npcColors[Math.floor(Math.random()*COL.npcColors.length)];

    // Body
    const body = box(0.28, 0.38, 0.22, shirtCol);
    body.position.y = 0.3; body.castShadow = true; g.add(body);
    // Head
    const head = box(0.24, 0.24, 0.22, COL.studentSkin);
    head.position.set(0, 0.62, 0); head.castShadow = true; g.add(head);
    // Hair
    const hair = box(0.26, 0.1, 0.24, COL.studentHair);
    hair.position.set(0, 0.78, 0); g.add(hair);
    // Backpack
    const bag = box(0.14, 0.28, 0.1, COL.backpack);
    bag.position.set(0, 0.32, lane.dir > 0 ? -0.14 : 0.14); g.add(bag);
    // Legs (stride pose)
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const legGeo = new THREE.BoxGeometry(0.1, 0.26, 0.1);
    [-0.08, 0.08].forEach((x, i) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.06, 0);
      leg.rotation.x = (i===0 ? 0.3 : -0.3);
      g.add(leg);
    });
    addShadowBlob(g, 0.3, 0.24);
    return g;
  }

  // ── Log (water, kept for infrastructure) ──────────────────
  function buildLog(length) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, length-0.1, 10),
      new THREE.MeshLambertMaterial({ color: COL.logBrown })
    );
    body.rotation.z = Math.PI/2; body.castShadow = true; g.add(body);
    addShadowBlob(g, length, 0.46);
    return g;
  }

  // ── CMU Student player ────────────────────────────────────
  function buildPlayer() {
    const g = new THREE.Group();

    // Torso (CMU red hoodie)
    const torso = box(0.44, 0.40, 0.36, COL.studentShirt);
    torso.position.y = 0.30; torso.castShadow = true; g.add(torso);

    // Hoodie pocket detail
    const pocket = box(0.20, 0.10, 0.04, 0xa00020);
    pocket.position.set(0, 0.24, 0.18); g.add(pocket);

    // Head
    const head = box(0.34, 0.32, 0.30, COL.studentSkin);
    head.position.set(0.04, 0.64, 0); head.castShadow = true; g.add(head);

    // Hair
    const hair = box(0.36, 0.12, 0.32, COL.studentHair);
    hair.position.set(0.02, 0.82, 0); g.add(hair);

    // Eyes
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    [-0.08, 0.08].forEach(bz => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), eyeMat);
      eye.position.set(0.17, 0.65, bz); g.add(eye);
    });

    // Backpack (blue)
    const bag = box(0.30, 0.34, 0.14, COL.backpack);
    bag.position.set(-0.04, 0.32, -0.24); bag.castShadow = true; g.add(bag);
    // Bag strap
    const strap = box(0.06, 0.38, 0.04, 0x1a6ea8);
    strap.position.set(0.06, 0.34, -0.14); g.add(strap);

    // Arms
    [[0.24, -0.16], [0.24, 0.16]].forEach(([y, bz], i) => {
      const arm = box(0.12, 0.30, 0.12, COL.studentShirt);
      arm.position.set(i===0?0.26:-0.26, y, 0);
      arm.rotation.z = bz; g.add(arm);
    });

    // Pants
    const pants = box(0.40, 0.28, 0.32, COL.studentPants);
    pants.position.y = 0.06; g.add(pants);

    // Shoes
    [[-0.10, -0.02], [0.10, -0.02]].forEach(([x, bz]) => {
      const shoe = box(0.14, 0.08, 0.20, COL.studentShoes);
      shoe.position.set(x, -0.08, bz); g.add(shoe);
    });

    // CMU text on shirt (tiny C-M-U blocks)
    const cmuMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    [-0.06, 0, 0.06].forEach((bz, i) => {
      const letter = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), cmuMat);
      letter.position.set(0.19, 0.34, bz); g.add(letter);
    });

    addShadowBlob(g, 0.48, 0.36);
    return g;
  }

  // ── Campus security (eagle replacement) ───────────────────
  function buildSecurityGuard() {
    const g = new THREE.Group();
    const body = box(0.44, 0.40, 0.36, 0x1a1a2e); // dark uniform
    body.position.y = 0.30; g.add(body);
    const head = box(0.34, 0.32, 0.30, COL.studentSkin);
    head.position.set(0, 0.64, 0); g.add(head);
    const hat = box(0.40, 0.14, 0.36, 0x2c2c3e);
    hat.position.set(0, 0.84, 0); g.add(hat);
    const hatBrim = box(0.50, 0.05, 0.42, 0x1a1a2e);
    hatBrim.position.set(0, 0.78, 0); g.add(hatBrim);
    // Badge (gold)
    const badge = box(0.10, 0.10, 0.04, 0xf1c40f);
    badge.position.set(0.16, 0.38, 0.18); g.add(badge);
    // Arms out like wings
    [-1, 1].forEach(side => {
      const arm = box(0.12, 0.06, 0.38, 0x1a1a2e);
      arm.position.set(0, 0.34, side * 0.26); g.add(arm);
    });
    return g;
  }

  // ── Populate lanes ─────────────────────────────────────────
  function getSpeedMult() {
    return DIFFICULTY[difficulty].speedMult;
  }
  function getHazardMult() {
    return DIFFICULTY[difficulty].hazardMult;
  }

  function populateLane(lane) {
    if (lane.type === LANE.ROAD)  populateRoad(lane);
    if (lane.type === LANE.PATH)  populatePath(lane);
    if (lane.type === LANE.WATER) populateWater(lane);
  }

  function populateRoad(lane) {
    const sm = getSpeedMult();
    const hm = getHazardMult();
    const baseSpeed = (lane.baseSpeed || 0.06) * sm;
    const numVehicles = Math.round((2 + Math.random()*2) * hm);
    const spacing = (COLS + 2) / numVehicles;

    for (let i = 0; i < numVehicles; i++) {
      const r = Math.random();
      let mesh, width;
      if (r < 0.20) {
        mesh = buildBus(lane); width = 1.85;
      } else if (r < 0.40) {
        mesh = buildScooter(lane); width = 0.56;
      } else if (r < 0.60) {
        mesh = buildBike(lane); width = 0.62;
      } else {
        mesh = buildCar(lane); width = 0.82;
      }
      const startX = -(HALF + 2) + i * spacing + (Math.random()-0.5) * spacing * 0.3;
      mesh.position.set(startX * TILE, 0, lane.z * TILE);
      mesh.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      scene.add(mesh);
      lane.obstacles.push({ mesh, x: startX, width, speed: baseSpeed });
      obstacleMeshes.push(mesh);
    }
  }

  function populatePath(lane) {
    const sm = getSpeedMult();
    const hm = getHazardMult();
    const baseSpeed = (lane.baseSpeed || 0.045) * sm;
    // Rushing students on path
    const numStudents = Math.round((3 + Math.random()*3) * hm);
    const spacing = (COLS + 2) / numStudents;

    for (let i = 0; i < numStudents; i++) {
      const mesh = buildRushingStudent(lane);
      const startX = -(HALF + 2) + i * spacing + (Math.random()-0.5) * spacing * 0.3;
      mesh.position.set(startX * TILE, 0, lane.z * TILE);
      mesh.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      scene.add(mesh);
      lane.obstacles.push({ mesh, x: startX, width: 0.30, speed: baseSpeed });
      obstacleMeshes.push(mesh);
    }
  }

  function populateWater(lane) {
    const numLogs = 2 + Math.floor(Math.random()*3);
    const spacing = (COLS+4) / numLogs;
    for (let i = 0; i < numLogs; i++) {
      const logLen = 1.2 + Math.random()*1.4;
      const mesh = buildLog(logLen);
      const startX = -(HALF+2) + i*spacing + (Math.random()-0.5);
      mesh.position.set(startX*TILE, 0.1, lane.z*TILE);
      scene.add(mesh);
      lane.logs.push({ mesh, x: startX, length: logLen });
      logMeshes.push(mesh);
    }
  }

  // ── Coin ──────────────────────────────────────────────────
  function buildCoin() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.07, 8),
      new THREE.MeshLambertMaterial({ color: COL.coin })
    );
    body.castShadow = true; g.add(body);
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.09, 8),
      new THREE.MeshLambertMaterial({ color: 0xffe066 })
    );
    g.add(inner);
    return g;
  }

  function spawnCoinsForLane(z, type) {
    if (coinMeshes[z]) return;
    if (type === LANE.WATER || type === LANE.ROAD) return;
    coinMeshes[z] = [];
    const count = Math.random() < 0.45 ? 2 : 1;
    const usedX = new Set();
    for (let i = 0; i < count; i++) {
      let cx, tries = 0;
      do { cx = Math.floor(Math.random()*COLS)-HALF; tries++; }
      while (usedX.has(cx) && tries < 20);
      usedX.add(cx);
      const decors = decorMeshes[z] || [];
      if (decors.some(d => Math.abs(d.x - cx) < 0.5)) continue;
      const mesh = buildCoin();
      mesh.position.set(cx*TILE, 0.34, z*TILE);
      scene.add(mesh);
      coinMeshes[z].push({ mesh, x: cx, collected: false });
    }
  }

  function checkCoinCollect() {
    const coins = coinMeshes[playerZ];
    if (!coins) return;
    coins.forEach(c => {
      if (c.collected) return;
      if (Math.abs(c.x - playerX) < 0.6) {
        c.collected = true;
        let t = 0;
        const anim = setInterval(() => {
          t += 0.08;
          c.mesh.position.y = 0.34 + t*1.2;
          c.mesh.scale.setScalar(1-t);
          if (t >= 1) { clearInterval(anim); scene.remove(c.mesh); }
        }, 16);
        totalCoins++;
        coinEl.textContent = totalCoins;
        showCoinPop();
      }
    });
  }

  function showCoinPop() {
    playCoin();
    try {
      const pop = document.createElement('div');
      pop.className = 'coin-pop';
      pop.textContent = '+1';
      pop.style.top = '52px';
      pop.style.right = '20px';
      document.getElementById('game-container').appendChild(pop);
      pop.addEventListener('animationend', () => pop.remove());
    } catch(e) {}
  }

  // ── Timer ──────────────────────────────────────────────────
  function startTimer() {
    stopTimer();
    const cfg = DIFFICULTY[difficulty];
    timeLeft = cfg.time;
    timerEl.textContent = timeLeft + 's';
    timerPill.classList.remove('urgent');

    timerInterval = setInterval(() => {
      if (gameState !== 'playing') { stopTimer(); return; }
      timeLeft--;
      timerEl.textContent = timeLeft + 's';
      if (timeLeft <= 10) timerPill.classList.add('urgent');
      if (timeLeft <= 0) {
        stopTimer();
        triggerTimeout();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  // ── Level layout – world generation ───────────────────────
  function buildLevelWorld() {
    // Build every lane in LEVEL1_LANES
    LEVEL1_LANES.forEach((def, idx) => {
      const z = -idx; // z=0 start, z=-1, z=-2… forward
      const lane = makeLaneFromDef(def, z);
      lanes.push(lane);
      buildTile(lane);
      populateLane(lane);
    });

    // Add building facades on sides at regular intervals
    for (let z = 0; z >= DEST_Z; z--) {
      if (z % 3 === 0) {
        const facadeR = buildBuildingFacade(1);
        facadeR.position.set((HALF+2)*TILE + 0.6, 0, z*TILE);
        scene.add(facadeR);
        facadeMeshes.push(facadeR);

        const facadeL = buildBuildingFacade(-1);
        facadeL.position.set(-(HALF+2)*TILE - 0.6, 0, z*TILE);
        scene.add(facadeL);
        facadeMeshes.push(facadeL);
      }
    }
  }

  function makeLaneFromDef(def, z) {
    const sm = getSpeedMult();
    const speed = (def.speed || 0) * sm;
    return {
      type: def.type,
      z,
      label: def.label || '',
      obstacles: [],
      logs: [],
      speed,
      baseSpeed: def.speed || 0,
      dir: def.dir || 1,
    };
  }

  // ── Game init ─────────────────────────────────────────────
  function initGame() {
    clearWorld();

    playerZ = 0;
    playerX = 0;
    score = 0; maxZ = 0;
    totalCoins = 0;
    camTargetZ = 0;
    hopQueue = [];
    isHopping = false;
    deathReason = '';
    waterOffset = {};

    scoreEl.textContent = '0';
    coinEl.textContent  = '0';
    timerPill.classList.remove('urgent');
    const cfg = DIFFICULTY[difficulty];
    timerEl.textContent = cfg.time + 's';

    buildLevelWorld();

    playerGroup = new THREE.Group();
    playerMesh  = buildPlayer();
    playerGroup.add(playerMesh);
    playerGroup.position.set(0, 0, 0);
    scene.add(playerGroup);

    positionCamera(0);
    startTimer();
    resetIdleTimer();
    showLevelLabel();
  }

  function clearWorld() {
    stopTimer();
    Object.values(tileMeshes).forEach(m => scene.remove(m));
    Object.values(decorMeshes).forEach(arr => arr.forEach(d => scene.remove(d.mesh)));
    Object.values(coinMeshes).forEach(arr => arr.forEach(c => scene.remove(c.mesh)));
    obstacleMeshes.forEach(m => scene.remove(m));
    logMeshes.forEach(m => scene.remove(m));
    if (playerGroup) scene.remove(playerGroup);
    if (eagleMesh) { scene.remove(eagleMesh); eagleMesh = null; }

    facadeMeshes.forEach(m => scene.remove(m));

    // Remove building facade groups (untracked — stored as direct scene children)
    const toRemove = scene.children.filter(c => c.isGroup && !c.isMesh);
    toRemove.forEach(c => scene.remove(c));

    tileMeshes = {}; decorMeshes = {}; coinMeshes = {};
    obstacleMeshes = []; logMeshes = []; facadeMeshes = []; lanes = [];
  }

  function showLevelLabel() {
    levelLabel.style.display = 'block';
    levelLabel.style.opacity = '1';
    setTimeout(() => {
      levelLabel.style.transition = 'opacity 0.8s';
      levelLabel.style.opacity = '0';
      setTimeout(() => {
        levelLabel.style.display = 'none';
        levelLabel.style.transition = '';
        levelLabel.style.opacity = '1';
      }, 800);
    }, 2000);
  }

  // ── Movement ──────────────────────────────────────────────
  function queueHop(dx, dz) {
    if (gameState !== 'playing') return;
    if (hopQueue.length >= 2) return;
    hopQueue.push({ dx, dz });
  }

  function processHopQueue() {
    if (isHopping || hopQueue.length === 0) return;
    const { dx, dz } = hopQueue.shift();
    const newX = playerX + dx;
    const newZ = playerZ + dz;

    // Boundaries
    if (newX < -HALF || newX > HALF) return;
    if (newZ > 2) return; // can't go too far backward
    if (newZ < DEST_Z) return; // can't go past destination

    // Block on decor
    const decors = decorMeshes[newZ] || [];
    if (decors.some(d => Math.abs(d.x - newX) < 0.55)) return;

    playerX = newX;
    playerZ = newZ;

    if (playerGroup) {
      playerGroup.userData.ridingLog  = null;
      playerGroup.userData.ridingLane = null;
    }
    if (drownTimer) { clearTimeout(drownTimer); drownTimer = null; }

    hopStart     = playerGroup.position.clone();
    hopEnd       = new THREE.Vector3(newX * TILE, 0, newZ * TILE);
    hopStartTime = performance.now();
    isHopping    = true;

    playStep();
    flashScreen();

    // Score: forward steps
    if (newZ < maxZ) {
      maxZ = newZ;
      score = -maxZ;
      if (score > bestScore) bestScore = score;
      scoreEl.textContent = score;
      if (score % 5 === 0) playScore();
    }

    resetIdleTimer();
  }

  function updateHop(now) {
    if (!isHopping) return;
    const t = Math.min(1, (now - hopStartTime) / HOP_DURATION);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const arcY = Math.sin(t * Math.PI) * 0.5;

    playerGroup.position.lerpVectors(hopStart, hopEnd, ease);
    playerGroup.position.y = arcY;

    const stretch = 1 + Math.sin(t*Math.PI)*0.32;
    const squash  = 1 - Math.sin(t*Math.PI)*0.16;
    playerMesh.scale.set(squash, stretch, squash);
    playerGroup.rotation.y = Math.atan2(hopEnd.x-hopStart.x, hopEnd.z-hopStart.z);

    if (t >= 1) {
      playerGroup.position.copy(hopEnd);
      playerGroup.position.y = 0;
      playerMesh.scale.set(1,1,1);
      isHopping = false;
      playerMesh.scale.set(1.18, 0.76, 1.18);
      setTimeout(() => { if (playerMesh) playerMesh.scale.set(1,1,1); }, 80);

      checkCollisions();
      checkCoinCollect();
      checkDestination();
    }
  }

  // ── Level complete detection ───────────────────────────────
  function checkDestination() {
    if (playerZ <= DEST_Z) {
      triggerWin();
    }
  }

  function triggerWin() {
    if (gameState !== 'playing') return;
    gameState = 'win';
    stopTimer();
    clearTimers();
    playWin();
    setTimeout(showLevelComplete, 900);
  }

  function showLevelComplete() {
    lcScore.textContent = score;
    lcTime.textContent  = timeLeft + 's';
    lcCoins.textContent = totalCoins;
    lcDiff.textContent  = DIFFICULTY[difficulty].label;
    lcScreen.style.display = 'flex';
  }

  // ── Camera ─────────────────────────────────────────────────
  function updateCamera(dt) {
    const targetZ = playerGroup ? playerGroup.position.z : 0;
    camTargetZ += (targetZ - camTargetZ) * Math.min(1, dt*5);
    camera.position.x += (0            - camera.position.x) * Math.min(1, dt*5);
    camera.position.z += (camTargetZ+8 - camera.position.z) * Math.min(1, dt*5);
    camera.position.y += (18           - camera.position.y) * Math.min(1, dt*5);
    camera.lookAt(0, 0, camTargetZ-4);
  }

  // ── Obstacle movement ──────────────────────────────────────
  const WORLD_WIDTH = COLS + 6;

  function updateObstacles(dt) {
    lanes.forEach(lane => {
      if (lane.type === LANE.ROAD || lane.type === LANE.PATH) {
        lane.obstacles.forEach(obs => {
          obs.x += obs.speed * lane.dir * dt * 60;
          if (obs.x >  HALF+4) obs.x -= WORLD_WIDTH;
          if (obs.x < -HALF-4) obs.x += WORLD_WIDTH;
          obs.mesh.position.x = obs.x * TILE;
        });
      } else if (lane.type === LANE.WATER) {
        lane.logs.forEach(log => {
          log.x += lane.speed * lane.dir * dt * 60;
          if (log.x >  HALF+5) log.x -= WORLD_WIDTH+2;
          if (log.x < -HALF-5) log.x += WORLD_WIDTH+2;
          log.mesh.position.x = log.x * TILE;
        });
      }
    });
  }

  // ── Collision detection ────────────────────────────────────
  function checkCollisions() {
    if (gameState !== 'playing') return;
    const lane = lanes.find(l => l.z === playerZ);
    if (!lane) return;

    if (lane.type === LANE.WATER) {
      handleWaterLanding(lane);
    } else {
      playerGroup.userData.ridingLog  = null;
      playerGroup.userData.ridingLane = null;
      if (drownTimer) { clearTimeout(drownTimer); drownTimer = null; }
      if (lane.type === LANE.ROAD || lane.type === LANE.PATH) {
        checkObstacleCollision(lane);
      }
    }
  }

  function checkObstacleCollision(lane) {
    if (gameState !== 'playing') return;
    const px = playerGroup.position.x;
    const pz = playerGroup.position.z;
    lane.obstacles.forEach(obs => {
      const oz = obs.mesh.position.z;
      if (Math.abs(pz - oz) > 0.48) return;
      const halfW = obs.width * 0.5 + 0.26;
      if (Math.abs(px - obs.mesh.position.x) < halfW) {
        triggerSquish();
      }
    });
  }

  function handleWaterLanding(lane) {
    const px = playerGroup.position.x;
    let onLog = false;
    lane.logs.forEach(log => {
      if (Math.abs(px - log.mesh.position.x) < log.length*0.5-0.08) {
        onLog = true;
        playerGroup.userData.ridingLog  = log;
        playerGroup.userData.ridingLane = lane;
      }
    });
    if (!onLog) triggerSquish(); // fall in water = squish for simplicity
    else if (drownTimer) { clearTimeout(drownTimer); drownTimer = null; }
  }

  function continuousCollisionCheck() {
    if (gameState !== 'playing' || isHopping) return;
    const lane = lanes.find(l => l.z === playerZ);
    if (!lane) return;
    if (lane.type === LANE.ROAD || lane.type === LANE.PATH) {
      playerGroup.userData.ridingLog  = null;
      playerGroup.userData.ridingLane = null;
      checkObstacleCollision(lane);
    } else if (lane.type === LANE.WATER) {
      const px = playerGroup.position.x;
      let onLog = false;
      lane.logs.forEach(log => {
        if (Math.abs(px - log.mesh.position.x) < log.length*0.5-0.08) {
          onLog = true;
          playerGroup.userData.ridingLog  = log;
          playerGroup.userData.ridingLane = lane;
        }
      });
      if (!onLog && !drownTimer) drownTimer = setTimeout(() => triggerSquish(), 80);
      else if (onLog && drownTimer) { clearTimeout(drownTimer); drownTimer = null; }
    }
  }

  function rideLog(dt) {
    if (gameState !== 'playing' || isHopping) return;
    const log  = playerGroup.userData.ridingLog;
    const lane = playerGroup.userData.ridingLane;
    if (!log || !lane) return;
    playerGroup.position.x += lane.speed * lane.dir * dt * 60 * TILE;
    playerX = Math.round(playerGroup.position.x / TILE);
    if (Math.abs(playerGroup.position.x) > (HALF+0.6)*TILE) {
      playerGroup.userData.ridingLog  = null;
      playerGroup.userData.ridingLane = null;
      triggerSquish();
    }
  }

  // ── Death states ───────────────────────────────────────────
  function triggerSquish() {
    if (gameState !== 'playing') return;
    gameState = 'dead';
    deathReason = 'hit';
    playSquish();
    if (playerMesh) { playerMesh.scale.set(1.8, 0.1, 1.8); playerMesh.position.y = -0.12; }
    clearTimers();
    stopTimer();
    goReason.textContent = 'You got hit!';
    setTimeout(showGameOver, 1200);
  }

  function triggerTimeout() {
    if (gameState !== 'playing') return;
    gameState = 'dead';
    deathReason = 'timeout';
    playTimeout();
    clearTimers();
    goReason.textContent = "Time's up! You were late to class.";
    setTimeout(showGameOver, 800);
  }

  function triggerIdle() {
    if (gameState !== 'playing') return;
    gameState = 'dead';
    deathReason = 'idle';
    clearTimers();
    stopTimer();

    // Campus security guard swoops in
    eagleMesh = buildSecurityGuard();
    eagleMesh.position.set(playerGroup.position.x, 6, playerGroup.position.z - 3);
    scene.add(eagleMesh);

    let t = 0;
    const swoop = setInterval(() => {
      t += 0.025;
      if (eagleMesh) {
        eagleMesh.position.z = playerGroup.position.z - 3 + t*5;
        eagleMesh.position.y = 6 - t*10;
      }
      if (t >= 0.6) {
        clearInterval(swoop);
        if (playerGroup) scene.remove(playerGroup);
        goReason.textContent = 'Campus security got you for loitering!';
        setTimeout(showGameOver, 700);
      }
    }, 16);
  }

  function clearTimers() {
    if (drownTimer) { clearTimeout(drownTimer); drownTimer = null; }
    if (idleTimer)  { clearTimeout(idleTimer);  idleTimer  = null; }
  }

  function showGameOver() {
    goScore.textContent = score;
    goBest.textContent  = bestScore;
    goCoins.textContent = totalCoins;
    goTime.textContent  = timeLeft + 's';
    goScreen.style.display = 'flex';
  }

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (gameState === 'playing') triggerIdle();
    }, IDLE_TIMEOUT);
  }

  // ── Water shimmer ──────────────────────────────────────────
  function animateWater(elapsed) {
    Object.entries(tileMeshes).forEach(([z, group]) => {
      const lane = lanes.find(l => l.z === parseInt(z));
      if (!lane || lane.type !== LANE.WATER) return;
      const phase = waterOffset[parseInt(z)] || 0;
      group.children.forEach((m, i) => {
        if (m.material && m.material.transparent)
          m.material.opacity = 0.78 + Math.sin(elapsed*1.8 + phase + i*0.4)*0.1;
      });
    });
  }

  function flashScreen() {
    hopFlash.classList.add('flash');
    setTimeout(() => hopFlash.classList.remove('flash'), 80);
  }

  // ── Input ──────────────────────────────────────────────────
  function setupInput() {
    document.addEventListener('keydown', e => {
      if (gameState !== 'playing') return;
      switch (e.code) {
        case 'ArrowUp':    case 'KeyW': e.preventDefault(); queueHop(0,-1); break;
        case 'ArrowDown':  case 'KeyS': e.preventDefault(); queueHop(0, 1); break;
        case 'ArrowLeft':  case 'KeyA': e.preventDefault(); queueHop(-1,0); break;
        case 'ArrowRight': case 'KeyD': e.preventDefault(); queueHop( 1,0); break;
      }
    });

    let tx = 0, ty = 0;
    document.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', e => {
      if (gameState !== 'playing') return;
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.max(Math.abs(dx),Math.abs(dy)) < 20) { queueHop(0,-1); return; }
      Math.abs(dx) > Math.abs(dy) ? queueHop(dx>0?1:-1,0) : queueHop(0,dy>0?1:-1);
    }, { passive: true });

    const dpad = [
      ['btn-up',    0,-1], ['btn-down',  0, 1],
      ['btn-left', -1, 0], ['btn-right', 1, 0],
    ];
    dpad.forEach(([id, dx, dz]) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', e => { e.preventDefault(); queueHop(dx,dz); }, { passive: false });
      el.addEventListener('click', () => queueHop(dx,dz));
    });
  }

  function setupScreenButtons() {
    // Difficulty selector
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        difficulty = btn.dataset.diff;
      });
    });

    // Splash — tap anywhere to start
    startScreen.addEventListener('click', startGame);

    // Restart / next level
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('nextlevel-btn').addEventListener('click', restartGame);
  }

  function startGame() {
    startScreen.style.display = 'none';
    gameState = 'playing';
    initGame();
  }

  function restartGame() {
    goScreen.style.display  = 'none';
    lcScreen.style.display  = 'none';
    if (eagleMesh) { scene.remove(eagleMesh); eagleMesh = null; }
    gameState = 'playing';
    initGame();
  }

  // ── Main loop ──────────────────────────────────────────────
  function loop() {
    frameId = requestAnimationFrame(loop);
    const dt      = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    if (gameState === 'playing') {
      updateObstacles(dt);
      rideLog(dt);
      processHopQueue();
      updateHop(performance.now());
      continuousCollisionCheck();
      animateWater(elapsed);
      if (!isHopping && playerMesh) {
        playerMesh.position.y = Math.sin(elapsed*3.2) * 0.035;
      }
      Object.values(coinMeshes).forEach(arr =>
        arr.forEach(c => { if (!c.collected) c.mesh.rotation.y = elapsed*3; })
      );
    } else if (gameState === 'dead' || gameState === 'win') {
      updateObstacles(dt);
      animateWater(elapsed);
    }

    updateCamera(dt);
    renderer.render(scene, camera);
  }

  // ── Boot ───────────────────────────────────────────────────
  function boot() {
    initThree();
    setupInput();
    setupScreenButtons();

    // Build a small preview world visible behind the splash
    const previewLanes = LEVEL1_LANES.slice(0, 12);
    previewLanes.forEach((def, idx) => {
      const z = -idx;
      const lane = makeLaneFromDef(def, z);
      lanes.push(lane);
      buildTile(lane);
      populateLane(lane);
    });

    loop();
  }

  boot();

})();
