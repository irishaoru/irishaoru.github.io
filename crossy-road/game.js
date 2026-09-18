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
    buildingRoof: 0x1a1a1a,   // black roof/top
    windowBlue  : 0x3a7bd5,   // blue window glass
    signGreen   : 0x27ae60,

    // UI
    sky         : 0x87CEEB,
    coin        : 0xFFD700,
  };

  // ── Difficulty Config ──────────────────────────────────────
  // Difficulty scales hazard speed/frequency. In Rush mode it also
  // sets the countdown time limit (seconds).
  const DIFFICULTY = {
    easy:   { speedMult: 0.70, hazardMult: 0.70, label: 'EASY',   rushTime: 90 },
    medium: { speedMult: 1.00, hazardMult: 1.00, label: 'MEDIUM', rushTime: 60 },
    hard:   { speedMult: 1.40, hazardMult: 1.30, label: 'HARD',   rushTime: 40 },
  };

  // ── Game modes ─────────────────────────────────────────────
  // 'classic' = endless run (original gameplay, unchanged).
  // 'rush'    = timed level; reach Tepper before time runs out.
  const MODE = { CLASSIC: 'classic', RUSH: 'rush' };
  let gameMode = MODE.CLASSIC;
  // Distance (rows forward) to the Tepper destination in Rush mode.
  const RUSH_DISTANCE = 40;
  let destZ = null;         // z of the Tepper destination lane (rush mode)

  // ── Infinite world streaming ───────────────────────────────
  const ROWS_AHEAD  = 26;  // rows generated in front of the player
  const ROWS_BEHIND = 8;   // rows kept behind before culling

  // CMU campus zone flavor labels for procedurally generated lanes
  const CAMPUS_GRASS_LABELS = [
    'The Cut', 'The Mall', 'CFA Lawn', 'MM Lawn',
    'Science Quad', 'Wean Doherty', 'NSH Plaza', 'Tepper Lawn',
  ];
  const CAMPUS_ROAD_LABELS = ['Forbes Ave', 'Frew St', 'Morewood Ave', 'Tech St', 'Hamburg Way'];
  const CAMPUS_PATH_LABELS = ['Campus Walk', 'Busy Walkway', 'Cut Path', 'Wean Walkway'];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ── Character roster ───────────────────────────────────────
  // Each id maps to a builder in buildPlayer(charId).
  const CHARACTERS = [
    { id: 'standard', name: 'CMU STUDENT',   blurb: 'Red hoodie, jeans, sneakers' },
    { id: 'scs',      name: 'SCS STUDENT',   blurb: 'Tired. Headphones. Laptop.'  },
    { id: 'drama',    name: 'DRAMA STUDENT',  blurb: 'Colorful & cheerful'         },
    { id: 'business', name: 'BUSINESS STUDENT', blurb: 'Sharp formal attire'      },
  ];
  let selectedCharIndex = 0;
  let selectedCharId = 'standard';

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
  const objectiveBanner = document.getElementById('objective-banner');
  const lcScreen     = document.getElementById('levelcomplete-screen');
  const lcReason     = document.getElementById('lc-reason');
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
    if (lane.type === LANE.GRASS) buildGrassDecor(z, lane.label, lane.flags, lane.buildings);
    if (lane.type === LANE.SAFE)  buildSafeDecor(z);
    if (lane.type === LANE.PATH)  buildPathDecor(z);

    // Safety: never let decor fully block a row — ensure a clear column
    ensureClearPath(z);

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
  function buildGrassDecor(z, label, laneFlags, laneBuildings) {
    if (decorMeshes[z]) return;
    decorMeshes[z] = [];

    const isCut   = label && (label.includes('Cut') || label.includes('Mall'));
    const isPlaza = label && (label.includes('Plaza') || label.includes('Wean') || label.includes('NSH'));

    // ── Campus buildings as obstacles ──────────────────────
    if (laneBuildings) {
      // Place 1-2 campus buildings in the lane, off-center so player can pass
      const style = Math.floor(Math.random() * 3);
      const bldg = buildCampusBuilding(style);
      // Place on one side of lane, leaving gap for player
      const side = Math.random() < 0.5 ? 1 : -1;
      const bx = side * (1 + Math.floor(Math.random() * 2)); // col 1–2 from center
      bldg.position.set(bx * TILE, 0, z * TILE);
      scene.add(bldg);
      // Block the column occupied plus the adjacent one for wider buildings
      const blockCols = style === 1 ? [bx - 1, bx, bx + 1] : [bx]; // wide=3, others=1
      blockCols.forEach(bc => {
        if (bc >= -HALF && bc <= HALF)
          decorMeshes[z].push({ mesh: bldg, x: bc });
      });

      // Possibly a second smaller building on other side
      if (Math.random() < 0.45) {
        const style2 = 2; // small annex
        const bldg2  = buildCampusBuilding(style2);
        const bx2    = -side * (2 + Math.floor(Math.random() * 2));
        bldg2.position.set(bx2 * TILE, 0, z * TILE);
        scene.add(bldg2);
        if (bx2 >= -HALF && bx2 <= HALF)
          decorMeshes[z].push({ mesh: bldg2, x: bx2 });
      }
    }

    // ── CMU Flag poles ──────────────────────────────────────
    if (laneFlags) {
      // Place 1-2 flag poles, preferring edges but sometimes mid-lane
      const flagPositions = isCut
        ? [-3, 3]            // both sides on the Cut
        : [[-HALF + 1], [HALF - 1]][Math.floor(Math.random() * 2)]; // one side
      (Array.isArray(flagPositions[0]) ? flagPositions[0] : flagPositions).forEach(fx => {
        const fp = buildCMUFlagPole();
        fp.position.set(fx * TILE, 0, z * TILE);
        scene.add(fp);
        decorMeshes[z].push({ mesh: fp, x: fx });
      });
    }

    // ── Regular trees / bushes ──────────────────────────────
    const usedX = new Set(decorMeshes[z].map(d => d.x));

    for (let x = -HALF - 1; x <= HALF + 1; x++) {
      if (usedX.has(x)) continue;
      if (Math.abs(x) <= 1 && z === 0) continue;

      const treeProb  = isCut ? 0.10 : isPlaza ? 0.08 : 0.16;
      const benchProb = isPlaza ? 0.10 : 0.05;

      if (Math.random() < treeProb) {
        const tree = buildTree();
        tree.position.set(x * TILE, 0, z * TILE);
        scene.add(tree);
        decorMeshes[z].push({ mesh: tree, x });
        usedX.add(x);
      } else if (Math.random() < benchProb) {
        const bench = buildBench();
        bench.position.set(x * TILE, 0, z * TILE);
        scene.add(bench);
        decorMeshes[z].push({ mesh: bench, x });
        usedX.add(x);
      }
    }
  }

  function buildSafeDecor(z) {
    if (decorMeshes[z]) return;
    decorMeshes[z] = [];
    // Safe zones get low bushes + occasional CMU flag pole along edges
    [-HALF-1, -HALF, HALF, HALF+1].forEach(x => {
      if (Math.random() < 0.4) {
        const bush = buildBush();
        bush.position.set(x*TILE, 0, z*TILE);
        scene.add(bush);
        decorMeshes[z].push({ mesh: bush, x });
      }
    });
    // One flag pole on a random edge slot (outside play area, decorative)
    if (Math.random() < 0.5) {
      const fx = Math.random() < 0.5 ? -HALF - 1 : HALF + 1;
      const fp = buildCMUFlagPole();
      fp.position.set(fx * TILE, 0, z * TILE);
      scene.add(fp);
      decorMeshes[z].push({ mesh: fp, x: fx });
    }
  }

  // Flag poles line the pedestrian walkways (edge slots only, non-blocking)
  function buildPathDecor(z) {
    if (decorMeshes[z]) return;
    decorMeshes[z] = [];
    if (Math.random() < 0.6) {
      const fx = Math.random() < 0.5 ? -HALF - 1 : HALF + 1;
      const fp = buildCMUFlagPole();
      fp.position.set(fx * TILE, 0, z * TILE);
      scene.add(fp);
      // edge slot beyond play area — do not add to blocking decor
    }
  }

  // Guarantee at least 3 crossable columns in any row so the player
  // can never be fully walled off by buildings/decor.
  function ensureClearPath(z) {
    const decors = decorMeshes[z];
    if (!decors || decors.length === 0) return;
    const blocked = new Set(
      decors.filter(d => d.x >= -HALF && d.x <= HALF).map(d => d.x)
    );
    const clearCount = (COLS) - blocked.size;
    if (clearCount >= 3) return;
    // Remove decor from center columns until at least 3 clear.
    // Buildings span multiple decor entries sharing one mesh — remove them all.
    const centerOrder = [0, 1, -1, 2, -2, 3, -3];
    for (const cx of centerOrder) {
      if ((COLS - blocked.size) >= 3) break;
      const entry = decors.find(d => d.x === cx);
      if (!entry) continue;
      const sharedMesh = entry.mesh;
      scene.remove(sharedMesh);
      // Remove every decor entry that used this mesh (whole building)
      for (let i = decors.length - 1; i >= 0; i--) {
        if (decors[i].mesh === sharedMesh) {
          blocked.delete(decors[i].x);
          decors.splice(i, 1);
        }
      }
    }
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

  // ── Arched window: square base + semi-oval top, blue glass ──
  function buildArchWindow(w, hBase, depth) {
    const g = new THREE.Group();
    const glassMat = new THREE.MeshLambertMaterial({ color: COL.windowBlue });
    const frameMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    // Square base
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, hBase, depth), glassMat);
    base.position.y = 0;
    g.add(base);

    // Semi-oval (half-cylinder) arch top sitting on the square
    const archR = w / 2;
    const arch = new THREE.Mesh(
      new THREE.CylinderGeometry(archR, archR, depth, 12, 1, false, 0, Math.PI),
      glassMat
    );
    // Rotate so the flat side faces down, dome faces up, extruded along Z
    arch.rotation.z = -Math.PI / 2;
    arch.rotation.y = Math.PI / 2;
    arch.position.set(0, hBase / 2, 0);
    g.add(arch);

    // Thin white frame outline around the square base
    const frameGeoV = new THREE.BoxGeometry(0.02, hBase, depth + 0.005);
    [-w/2, w/2].forEach(fx => {
      const f = new THREE.Mesh(frameGeoV, frameMat);
      f.position.set(fx, 0, 0);
      g.add(f);
    });
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.03, depth + 0.005), frameMat);
    sill.position.set(0, -hBase / 2, 0);
    g.add(sill);

    return g;
  }

  // ── CMU signage panel (red board with white "CMU") ─────────
  function buildCMUSign(scale) {
    scale = scale || 1;
    const g = new THREE.Group();
    // Red board
    const board = box(0.62 * scale, 0.26 * scale, 0.05, COL.cmuRed);
    board.castShadow = true;
    g.add(board);
    // Gold border trim
    const trim = box(0.66 * scale, 0.30 * scale, 0.03, COL.cmuGold);
    trim.position.z = -0.015;
    g.add(trim);
    // White "CMU" letter blocks
    const textMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    [-0.16, 0, 0.16].forEach(lx => {
      const letter = new THREE.Mesh(
        new THREE.BoxGeometry(0.09 * scale, 0.13 * scale, 0.03), textMat);
      letter.position.set(lx * scale, 0, 0.03);
      g.add(letter);
    });
    return g;
  }

  // ── Rooftop CMU flag (pole + waving red banner) ────────────
  function buildRoofFlag() {
    const g = new THREE.Group();
    const pole = box(0.04, 0.6, 0.04, 0x555555);
    pole.position.y = 0.3;
    g.add(pole);
    const flag = box(0.30, 0.20, 0.03, COL.cmuRed);
    flag.position.set(0.17, 0.5, 0);
    flag.castShadow = true;
    g.add(flag);
    // gold stripe on flag
    const stripe = box(0.30, 0.04, 0.035, COL.cmuGold);
    stripe.position.set(0.17, 0.41, 0);
    g.add(stripe);
    return g;
  }

  // ── CMU Flag Pole (lamp-post with red CMU banner) ─────────
  function buildCMUFlagPole() {
    const g = new THREE.Group();

    // Lamp post pole
    const pole = box(0.07, 1.8, 0.07, 0x4a4a4a);
    pole.position.y = 0.9;
    pole.castShadow = true;
    g.add(pole);

    // Lamp head
    const lamp = box(0.22, 0.1, 0.22, 0x2c2c2c);
    lamp.position.y = 1.82;
    g.add(lamp);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 6),
      new THREE.MeshLambertMaterial({ color: 0xfff5cc })
    );
    bulb.position.y = 1.76;
    g.add(bulb);

    // CMU red banner flag hanging from pole
    const bannerMat = new THREE.MeshLambertMaterial({ color: COL.cmuRed });
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.52, 0.04), bannerMat);
    banner.position.set(0.18, 1.42, 0);
    banner.castShadow = true;
    g.add(banner);

    // White "CMU" block letters on banner
    const textMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    // C
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.05), textMat);
    c.position.set(0.12, 1.50, 0);
    g.add(c);
    // M
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.05), textMat);
    m.position.set(0.18, 1.50, 0);
    g.add(m);
    // U
    const u = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.05), textMat);
    u.position.set(0.24, 1.50, 0);
    g.add(u);

    // Gold bottom trim on banner
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.05),
      new THREE.MeshLambertMaterial({ color: COL.cmuGold }));
    trim.position.set(0.18, 1.17, 0);
    g.add(trim);

    addShadowBlob(g, 0.1, 0.1);
    return g;
  }

  // ── Campus building obstacle (in-lane, player walks around) ──
  // Returns { mesh, blockedXSlots[] } so the decor system can
  // mark which column slots are impassable.
  function buildCampusBuilding(style) {
    // style: 0 = tall academic (Baker-like), 1 = wide modern (Wean-like),
    //        2 = small annex (NSH-like)
    // All styles: blue arched windows, black roof/top, CMU signage + rooftop flag.
    const g = new THREE.Group();
    const s = style % 3;
    const FRONT_Z = -0.36; // window face

    if (s === 0) {
      // Tall sandstone academic building (Baker Hall style)
      const body = box(1.6, 1.4, 0.7, 0xd9c99a);
      body.position.y = 0.7; body.castShadow = true; g.add(body);
      // Black flat roof top
      const roof = box(1.68, 0.24, 0.78, COL.buildingRoof);
      roof.position.y = 1.52; g.add(roof);
      const parapet = box(1.7, 0.08, 0.8, 0x000000);
      parapet.position.y = 1.66; g.add(parapet);

      // Blue arched windows (2 floors × 3)
      for (let row = 0; row < 2; row++) {
        for (let col = -1; col <= 1; col++) {
          const win = buildArchWindow(0.24, 0.26, 0.06);
          win.position.set(col * 0.5, 0.44 + row * 0.56, FRONT_Z);
          g.add(win);
        }
      }
      // Entry door
      const door = box(0.28, 0.44, 0.09, 0x3d2b1f);
      door.position.set(0, 0.22, -0.37); g.add(door);
      const doorArch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.09, 12, 1, false, 0, Math.PI),
        new THREE.MeshLambertMaterial({ color: COL.cmuRed }));
      doorArch.rotation.z = -Math.PI/2; doorArch.rotation.y = Math.PI/2;
      doorArch.position.set(0, 0.44, -0.38); g.add(doorArch);

      // CMU signage above the door
      const sign = buildCMUSign(1.0);
      sign.position.set(0, 1.02, -0.37); g.add(sign);
      // Rooftop flag
      const flag = buildRoofFlag();
      flag.position.set(-0.55, 1.66, 0); g.add(flag);

    } else if (s === 1) {
      // Wide modern building (Wean/GHC style) – gray concrete
      const body = box(2.2, 1.0, 0.65, 0xb8b8b8);
      body.position.y = 0.5; body.castShadow = true; g.add(body);
      const topFloor = box(2.2, 0.35, 0.65, 0xa0a0a0);
      topFloor.position.y = 1.17; g.add(topFloor);
      // Black roof parapet/top
      const roof = box(2.26, 0.16, 0.7, COL.buildingRoof);
      roof.position.y = 1.42; g.add(roof);

      // Blue arched window grid (2 rows × 5)
      for (let row = 0; row < 2; row++) {
        for (let col = -2; col <= 2; col++) {
          const win = buildArchWindow(0.2, 0.2, 0.05);
          win.position.set(col * 0.4, 0.4 + row * 0.44, -0.335);
          g.add(win);
        }
      }
      // CMU signage panel (large, on the facade)
      const sign = buildCMUSign(1.3);
      sign.position.set(-0.6, 0.82, -0.34); g.add(sign);
      // Rooftop flag
      const flag = buildRoofFlag();
      flag.position.set(0.7, 1.5, 0); g.add(flag);

    } else {
      // Small annex / NSH-style brick box
      const body = box(1.1, 0.9, 0.55, 0xc49a6c);
      body.position.y = 0.45; body.castShadow = true; g.add(body);
      // Black flat roof
      const roof = box(1.16, 0.14, 0.6, COL.buildingRoof);
      roof.position.y = 0.96; g.add(roof);

      // Blue arched windows (1 row × 3)
      for (let col = -1; col <= 1; col++) {
        const win = buildArchWindow(0.2, 0.24, 0.06);
        win.position.set(col * 0.36, 0.52, -0.29);
        g.add(win);
      }
      // CMU signage
      const sign = buildCMUSign(0.85);
      sign.position.set(0, 0.14, -0.29); g.add(sign);
      // Rooftop flag
      const flag = buildRoofFlag();
      flag.position.set(0.42, 1.03, 0); g.add(flag);
    }

    addShadowBlob(g, 1.8, 0.72);
    return g;
  }

  // ── Campus building facades (edge decor) ───────────────────
  function buildBuildingFacade(side) {
    const g = new THREE.Group();
    const h = 1.2 + Math.random() * 0.8;
    const w = 1.5 + Math.random() * 0.8;
    const wall = box(w, h, 0.6, COL.buildingWall);
    wall.position.y = h / 2; wall.castShadow = true; g.add(wall);
    // Black roof/top
    const roof = box(w + 0.12, 0.22, 0.72, COL.buildingRoof);
    roof.position.y = h + 0.11; g.add(roof);

    // Blue arched windows
    const floors = Math.floor(h);
    for (let wy = 0; wy < floors; wy++) {
      for (let wx = -1; wx <= 1; wx++) {
        const win = buildArchWindow(0.2, 0.2, 0.06);
        win.position.set(wx * 0.42, 0.42 + wy * 0.5, -0.30);
        g.add(win);
      }
    }

    // CMU signage on the facade
    const sign = buildCMUSign(1.0);
    sign.position.set(0, 0.24, -0.31); g.add(sign);

    // Rooftop CMU flag
    const flag = buildRoofFlag();
    flag.position.set(side * (w/2 - 0.25), h + 0.2, 0); g.add(flag);

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
    const winStrip1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.26, 0.08), winMat);
    winStrip1.position.set(0, 0.52, 0.36); g.add(winStrip1);
    const winStrip2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.26, 0.08), winMat);
    winStrip2.position.set(0, 0.52, -0.36); g.add(winStrip2);
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
  // Dispatcher: builds the chosen character mesh.
  function buildPlayer(charId) {
    switch (charId) {
      case 'scs':      return buildSCSStudent();
      case 'drama':    return buildDramaStudent();
      case 'business': return buildBusinessStudent();
      case 'standard':
      default:         return buildStandardStudent();
    }
  }

  // Shared helpers so all characters share proportions.
  function addHead(g, skin, hairColor, hairH) {
    const head = box(0.34, 0.32, 0.30, skin);
    head.position.set(0.04, 0.64, 0); head.castShadow = true; g.add(head);
    if (hairColor !== null) {
      const hair = box(0.36, hairH || 0.12, 0.32, hairColor);
      hair.position.set(0.02, 0.76 + (hairH || 0.12) / 2, 0); g.add(hair);
    }
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    [-0.08, 0.08].forEach(bz => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), eyeMat);
      eye.position.set(0.17, 0.65, bz); g.add(eye);
    });
    return head;
  }

  function addLegs(g, pantsColor, shoeColor) {
    const pants = box(0.40, 0.28, 0.32, pantsColor);
    pants.position.y = 0.06; g.add(pants);
    [[-0.10, -0.02], [0.10, -0.02]].forEach(([x, bz]) => {
      const shoe = box(0.14, 0.08, 0.20, shoeColor);
      shoe.position.set(x, -0.08, bz); g.add(shoe);
    });
  }

  function addArms(g, sleeveColor, raised) {
    [[0.24, -0.16], [0.24, 0.16]].forEach(([y, bz], i) => {
      const arm = box(0.12, 0.30, 0.12, sleeveColor);
      arm.position.set(i===0?0.26:-0.26, y, 0);
      arm.rotation.z = bz + (raised ? (i===0? -0.5 : 0.5) : 0);
      arm.castShadow = true;
      g.add(arm);
    });
  }

  function addBackpack(g, bagColor, strapColor) {
    const bag = box(0.30, 0.34, 0.14, bagColor);
    bag.position.set(-0.04, 0.32, -0.24); bag.castShadow = true; g.add(bag);
    const strap = box(0.06, 0.38, 0.04, strapColor);
    strap.position.set(0.06, 0.34, -0.14); g.add(strap);
  }

  // ── 1. Standard CMU student — red hoodie, jeans, white sneakers
  function buildStandardStudent() {
    const g = new THREE.Group();
    const torso = box(0.44, 0.40, 0.36, COL.studentShirt);
    torso.position.y = 0.30; torso.castShadow = true; g.add(torso);
    // Hoodie pocket
    const pocket = box(0.20, 0.10, 0.04, 0xa00020);
    pocket.position.set(0, 0.24, 0.18); g.add(pocket);
    addHead(g, COL.studentSkin, COL.studentHair, 0.12);
    addBackpack(g, COL.backpack, 0x1a6ea8);
    addArms(g, COL.studentShirt, false);
    addLegs(g, 0x3a5a8c /* blue jeans */, 0xffffff /* white sneakers */);
    // White "CMU" letters on chest
    const cmuMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    [-0.06, 0, 0.06].forEach(bz => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), cmuMat);
      l.position.set(0.19, 0.34, bz); g.add(l);
    });
    addShadowBlob(g, 0.48, 0.36);
    return g;
  }

  // ── 2. Tired SCS student — headphones, laptop, slumped, hoodie
  function buildSCSStudent() {
    const g = new THREE.Group();
    // Dark gray hoodie
    const torso = box(0.44, 0.40, 0.36, 0x40454d);
    torso.position.y = 0.30; torso.castShadow = true; g.add(torso);
    const head = addHead(g, COL.studentSkin, 0x2b2b2b, 0.11);
    // Slight forward slump: tilt whole body
    // Tired eyes — add small dark "eye bag" shadow blocks
    const bagMat = new THREE.MeshLambertMaterial({ color: 0xcaa38a });
    [-0.08, 0.08].forEach(bz => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.05), bagMat);
      b.position.set(0.17, 0.60, bz); g.add(b);
    });
    // Headphones — band over head + two ear cups
    const band = box(0.40, 0.06, 0.10, 0x222222);
    band.position.set(0.02, 0.86, 0); g.add(band);
    [-0.17, 0.17].forEach(bz => {
      const cup = box(0.10, 0.14, 0.10, 0xe74c3c);
      cup.position.set(0.04, 0.66, bz); g.add(cup);
    });
    addBackpack(g, 0x2c3e50, 0x1b2733);
    // Arms forward holding a laptop
    [[0.30, -0.16], [0.30, 0.16]].forEach(([y, bz], i) => {
      const arm = box(0.12, 0.26, 0.12, 0x40454d);
      arm.position.set(i===0?0.24:-0.24, y, 0.08);
      arm.rotation.x = -0.9; arm.castShadow = true; g.add(arm);
    });
    // Laptop held in front
    const laptopBase = box(0.34, 0.03, 0.24, 0xbdc3c7);
    laptopBase.position.set(0, 0.34, 0.26); g.add(laptopBase);
    const laptopScreen = box(0.34, 0.24, 0.03, 0x2c3e50);
    laptopScreen.position.set(0, 0.46, 0.36); laptopScreen.rotation.x = 0.3; g.add(laptopScreen);
    const glow = box(0.28, 0.18, 0.01, 0x5dade2);
    glow.position.set(0, 0.46, 0.345); glow.rotation.x = 0.3; g.add(glow);
    addLegs(g, 0x2c3e50 /* sweatpants */, 0x555555 /* worn shoes */);
    addShadowBlob(g, 0.48, 0.4);
    // Slump the whole character slightly forward
    g.rotation.x = 0.06;
    return g;
  }

  // ── 3. Drama student — colorful clothes + hair, cheerful
  function buildDramaStudent() {
    const g = new THREE.Group();
    // Bright magenta/teal outfit
    const torso = box(0.44, 0.40, 0.36, 0xe84393);
    torso.position.y = 0.30; torso.castShadow = true; g.add(torso);
    // Colorful scarf detail
    const scarf = box(0.46, 0.08, 0.38, 0x00cec9);
    scarf.position.set(0, 0.48, 0); g.add(scarf);
    // Head with bright colorful hair (taller, layered)
    addHead(g, COL.studentSkin, null, 0);
    const hairColors = [0x9b59b6, 0x1abc9c, 0xf1c40f];
    hairColors.forEach((hc, i) => {
      const hair = box(0.38 - i*0.06, 0.12, 0.34 - i*0.06, hc);
      hair.position.set(0.02, 0.80 + i*0.10, 0); g.add(hair);
    });
    // Big cheerful smile block
    const smile = box(0.12, 0.03, 0.05, 0x7a2b2b);
    smile.position.set(0.17, 0.56, 0); g.add(smile);
    // Colorful bag
    addBackpack(g, 0xf39c12, 0xe74c3c);
    // Arms raised cheerfully
    addArms(g, 0xe84393, true);
    // Rainbow-ish legs
    addLegs(g, 0x6c5ce7 /* purple pants */, 0xffeaa7 /* yellow shoes */);
    addShadowBlob(g, 0.48, 0.36);
    return g;
  }

  // ── 4. Business student — formal suit, tie, briefcase
  function buildBusinessStudent() {
    const g = new THREE.Group();
    // Navy suit jacket
    const torso = box(0.44, 0.40, 0.36, 0x2c3e50);
    torso.position.y = 0.30; torso.castShadow = true; g.add(torso);
    // White dress shirt V
    const shirt = box(0.14, 0.34, 0.06, 0xffffff);
    shirt.position.set(0, 0.30, 0.17); g.add(shirt);
    // Red tie
    const tie = box(0.05, 0.24, 0.03, COL.cmuRed);
    tie.position.set(0, 0.28, 0.20); g.add(tie);
    // Lapels
    [-0.09, 0.09].forEach(bx => {
      const lap = box(0.05, 0.22, 0.05, 0x1f2d3d);
      lap.position.set(bx, 0.34, 0.17); g.add(lap);
    });
    addHead(g, COL.studentSkin, 0x2b1d12, 0.10);
    // Neat side-part highlight
    addArms(g, 0x2c3e50, false);
    addLegs(g, 0x1f2d3d /* suit pants */, 0x2b1d12 /* dress shoes */);
    // Briefcase in right hand
    const armR = box(0.12, 0.30, 0.12, 0x2c3e50);
    armR.position.set(0.30, 0.22, 0); armR.castShadow = true; g.add(armR);
    const brief = box(0.22, 0.16, 0.08, 0x5a3a1a);
    brief.position.set(0.34, 0.06, 0); brief.castShadow = true; g.add(brief);
    const handle = box(0.10, 0.04, 0.02, 0x2b1d12);
    handle.position.set(0.34, 0.15, 0); g.add(handle);
    addShadowBlob(g, 0.5, 0.36);
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

  // ── Rush-mode countdown timer ──────────────────────────────
  function formatTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function renderTimer() {
    if (!timerEl) return;
    timerEl.textContent = formatTime(timeLeft);
    if (timerPill) timerPill.classList.toggle('urgent', timeLeft <= 10);
  }

  function startTimer() {
    stopTimer();
    renderTimer();
    timerInterval = setInterval(() => {
      if (gameState !== 'playing') return;
      timeLeft -= 1;
      renderTimer();
      if (timeLeft <= 0) {
        timeLeft = 0;
        renderTimer();
        triggerTimeout();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  // ── Infinite procedural world generation ──────────────────
  // Tracks how far forward we've generated and the last lane type
  // to avoid awkward runs (e.g. too many roads back-to-back).
  let genZ = 0;             // most-forward generated z (negative)
  let lastType = LANE.SAFE;
  let sameTypeRun = 0;

  // Build a lane definition for a given z based on simple rules.
  function generateLaneDef(z) {
    // Rush mode: fixed Tepper destination + safe run-up around it
    if (gameMode === MODE.RUSH && destZ !== null) {
      if (z === destZ)      return { type: LANE.DEST,  label: 'Tepper' };
      if (z < destZ)        return { type: LANE.SAFE,  label: 'Tepper Quad' };
      if (z === destZ + 1)  return { type: LANE.SAFE,  label: 'Almost there' };
    }
    // First few rows are always safe/grass so the player has a beat to start
    if (z === 0)  return { type: LANE.SAFE,  label: 'Margaret Morrison' };
    if (z >= -2)  return { type: LANE.GRASS, label: pick(CAMPUS_GRASS_LABELS),
                           flags: Math.random() < 0.4 };

    // Weighted random with anti-repeat pressure
    let roll = Math.random();
    let type;
    if (sameTypeRun >= 3) {
      // Force a change after 3 of the same
      const options = [LANE.GRASS, LANE.ROAD, LANE.PATH].filter(t => t !== lastType);
      type = pick(options);
    } else {
      if      (roll < 0.34) type = LANE.ROAD;
      else if (roll < 0.60) type = LANE.PATH;
      else if (roll < 0.94) type = LANE.GRASS;
      else                  type = LANE.SAFE;
    }

    if (type === lastType) sameTypeRun++; else sameTypeRun = 0;
    lastType = type;

    // Difficulty-independent base speeds (multiplier applied later)
    if (type === LANE.ROAD) {
      return {
        type, label: pick(CAMPUS_ROAD_LABELS),
        speed: 0.05 + Math.random() * 0.06,
        dir: Math.random() < 0.5 ? 1 : -1,
      };
    }
    if (type === LANE.PATH) {
      return {
        type, label: pick(CAMPUS_PATH_LABELS),
        speed: 0.038 + Math.random() * 0.032,
        dir: Math.random() < 0.5 ? 1 : -1,
      };
    }
    if (type === LANE.SAFE) {
      return { type, label: 'Quad' };
    }
    // GRASS — occasionally with buildings or flags
    return {
      type: LANE.GRASS,
      label: pick(CAMPUS_GRASS_LABELS),
      buildings: Math.random() < 0.32,
      flags: Math.random() < 0.4,
    };
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
      flags: !!def.flags,
      buildings: !!def.buildings,
    };
  }

  // Add one lane (tile + obstacles + optional facades) at z.
  function spawnLane(z) {
    if (tileMeshes[z]) return;
    const def  = generateLaneDef(z);
    const lane = makeLaneFromDef(def, z);
    lanes.push(lane);
    buildTile(lane);
    populateLane(lane);

    // Building facades along the edges every few rows
    if (z % 3 === 0 && z <= 0) {
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

  // Generate initial world and reset the streaming cursor.
  function buildLevelWorld() {
    genZ = 0;
    lastType = LANE.SAFE;
    sameTypeRun = 0;
    for (let z = 0; z >= -ROWS_AHEAD; z--) {
      spawnLane(z);
      genZ = z;
    }
  }

  // Ensure the world extends far enough ahead of the player and
  // cull lanes/decor/obstacles that are far behind.
  function streamWorld() {
    // Extend ahead
    const needTo = playerZ - ROWS_AHEAD;
    while (genZ > needTo) {
      genZ--;
      spawnLane(genZ);
    }
    // Cull behind (z greater than player + ROWS_BEHIND)
    const cullZ = playerZ + ROWS_BEHIND;
    lanes = lanes.filter(lane => {
      if (lane.z > cullZ) {
        cullLane(lane.z);
        return false;
      }
      return true;
    });
  }

  function cullLane(z) {
    if (tileMeshes[z]) { scene.remove(tileMeshes[z]); delete tileMeshes[z]; }
    if (decorMeshes[z]) {
      // De-dupe shared building meshes before removing
      const removed = new Set();
      decorMeshes[z].forEach(d => {
        if (!removed.has(d.mesh)) { scene.remove(d.mesh); removed.add(d.mesh); }
      });
      delete decorMeshes[z];
    }
    if (coinMeshes[z]) {
      coinMeshes[z].forEach(c => scene.remove(c.mesh));
      delete coinMeshes[z];
    }
    // Obstacles/logs for this lane
    const lane = lanes.find(l => l.z === z);
    if (lane) {
      lane.obstacles.forEach(o => scene.remove(o.mesh));
      lane.logs.forEach(l => scene.remove(l.mesh));
    }
    // Facades at this z
    facadeMeshes = facadeMeshes.filter(f => {
      if (Math.round(f.position.z / TILE) === z) { scene.remove(f); return false; }
      return true;
    });
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

    // Mode-specific setup
    if (gameMode === MODE.RUSH) {
      destZ = -RUSH_DISTANCE;
      timeLeft = DIFFICULTY[difficulty].rushTime;
      if (timerPill) { timerPill.style.display = 'flex'; timerPill.classList.remove('urgent'); }
      if (objectiveBanner) objectiveBanner.style.display = 'block';
      renderTimer();
    } else {
      destZ = null;
      if (timerPill) timerPill.style.display = 'none';
      if (objectiveBanner) objectiveBanner.style.display = 'none';
    }

    scoreEl.textContent = '0';
    coinEl.textContent  = '0';

    buildLevelWorld();

    playerGroup = new THREE.Group();
    playerGroup.userData.ridingLog  = null;
    playerGroup.userData.ridingLane = null;
    playerMesh  = buildPlayer(selectedCharId);
    playerGroup.add(playerMesh);
    playerGroup.position.set(0, 0, 0);
    scene.add(playerGroup);

    positionCamera(0);
    resetIdleTimer();

    if (gameMode === MODE.RUSH) startTimer();
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
    // Can't back up more than a few rows behind furthest progress
    if (newZ > maxZ + 3) return;

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
      streamWorld();  // extend/cull the infinite world after each hop
      checkReachedDest();  // rush mode: did we make it to Tepper?
    }
  }

  // Rush mode: reaching the Tepper destination lane wins the run.
  function checkReachedDest() {
    if (gameMode !== MODE.RUSH || gameState !== 'playing') return;
    if (destZ !== null && playerZ <= destZ) triggerWin();
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
    if (gameState !== 'playing' || isHopping || !playerGroup) return;
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

  // Rush mode: time ran out before reaching Tepper.
  function triggerTimeout() {
    if (gameState !== 'playing') return;
    gameState = 'dead';
    deathReason = 'timeout';
    clearTimers();
    stopTimer();
    goReason.textContent = "You're late to class!";
    setTimeout(showGameOver, 700);
  }

  // Rush mode: reached Tepper in time.
  function triggerWin() {
    if (gameState !== 'playing') return;
    gameState = 'win';
    clearTimers();
    stopTimer();
    playScore();
    if (objectiveBanner) objectiveBanner.style.display = 'none';
    if (timerPill) timerPill.classList.remove('urgent');
    setTimeout(showLevelComplete, 500);
  }

  function clearTimers() {
    if (drownTimer) { clearTimeout(drownTimer); drownTimer = null; }
    if (idleTimer)  { clearTimeout(idleTimer);  idleTimer  = null; }
  }

  function showGameOver() {
    goScore.textContent = score;
    goBest.textContent  = bestScore;
    goCoins.textContent = totalCoins;
    goScreen.style.display = 'flex';
  }

  function showLevelComplete() {
    if (lcTime)   lcTime.textContent   = formatTime(timeLeft);
    if (lcScore)  lcScore.textContent  = score;
    if (lcCoins)  lcCoins.textContent  = totalCoins;
    if (lcReason) lcReason.textContent = 'You made it to class on time.';
    lcScreen.style.display = 'flex';
  }

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    // Rush mode uses the countdown as its pressure; no idle eagle.
    if (gameMode === MODE.RUSH) return;
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
    const diffHint = document.getElementById('diff-hint');
    const modeHint = document.getElementById('mode-hint');

    // Difficulty hint text depends on the selected mode: classic describes
    // hazard pace, rush describes the time limit.
    function diffHintText(diff) {
      if (gameMode === MODE.RUSH) {
        const t = DIFFICULTY[diff].rushTime;
        const flavor = { easy: 'relaxed run', medium: 'steady pace', hard: 'sprint!' };
        return DIFFICULTY[diff].label + ' · ' + t + 's to reach Tepper · ' + flavor[diff];
      }
      const classic = { easy: 'Easy · slower hazards',
                        medium: 'Medium · normal pace',
                        hard: 'Hard · fast, frequent hazards' };
      return classic[diff];
    }

    function refreshDiffHint() {
      if (diffHint) diffHint.textContent = diffHintText(difficulty);
    }
    refreshDiffHint();

    // Mode selector
    const modeHintText = {
      classic: 'Classic · endless run, go as far as you can',
      rush:    'Rush to Class · reach Tepper before time runs out',
    };
    if (modeHint) modeHint.textContent = modeHintText[gameMode];
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        gameMode = btn.dataset.mode;
        if (modeHint) modeHint.textContent = modeHintText[gameMode];
        refreshDiffHint();
      });
    });

    // Difficulty selector
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        difficulty = btn.dataset.diff;
        refreshDiffHint();
      });
    });

    // Character selector arrows
    const prevBtn = document.getElementById('char-prev');
    const nextBtn = document.getElementById('char-next');
    if (prevBtn) prevBtn.addEventListener('click', e => { e.stopPropagation(); cycleChar(-1); });
    if (nextBtn) nextBtn.addEventListener('click', e => { e.stopPropagation(); cycleChar(1); });

    // Splash — tap the "START" button to begin (not the whole screen,
    // so selector controls remain clickable)
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', e => { e.stopPropagation(); startGame(); });

    // Restart
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    const nextLevelBtn = document.getElementById('nextlevel-btn');
    if (nextLevelBtn) nextLevelBtn.addEventListener('click', restartGame);

    updateCharUI();
  }

  // ── Character selection ────────────────────────────────────
  function cycleChar(dir) {
    selectedCharIndex = (selectedCharIndex + dir + CHARACTERS.length) % CHARACTERS.length;
    selectedCharId = CHARACTERS[selectedCharIndex].id;
    updateCharUI();
    swapPreviewCharacter();
  }

  function updateCharUI() {
    const nameEl  = document.getElementById('char-name');
    const blurbEl = document.getElementById('char-blurb');
    const ch = CHARACTERS[selectedCharIndex];
    if (nameEl)  nameEl.textContent  = ch.name;
    if (blurbEl) blurbEl.textContent = ch.blurb;
  }

  function startGame() {
    startScreen.style.display = 'none';
    try {
      initGame();
      gameState = 'playing';
    } catch(err) {
      console.error('initGame crashed:', err);
      // Show error on screen
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c41230;color:#fff;padding:12px 16px;font:11px monospace;z-index:9999;white-space:pre-wrap;word-break:break-all;';
      el.textContent = '⚠ initGame error: ' + err.message + '\n' + (err.stack || '');
      document.body.appendChild(el);
    }
  }

  function restartGame() {
    goScreen.style.display  = 'none';
    lcScreen.style.display  = 'none';
    if (eagleMesh) { scene.remove(eagleMesh); eagleMesh = null; }
    initGame();
    gameState = 'playing';
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

  // ── Character preview (mini rotating 3D scene on splash) ───
  let previewScene, previewCamera, previewRenderer, previewMesh, previewRAF;

  function initCharPreview() {
    const canvas = document.getElementById('char-canvas');
    if (!canvas) return;

    previewScene = new THREE.Scene();
    previewScene.background = null; // transparent

    const size = 180;
    previewCamera = new THREE.OrthographicCamera(-1.1, 1.1, 1.1, -1.1, 0.1, 50);
    previewCamera.position.set(2.4, 2.0, 2.4);
    previewCamera.lookAt(0, 0.45, 0);

    previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    previewRenderer.setSize(size, size, false);

    previewScene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const pl = new THREE.DirectionalLight(0xffffff, 0.7);
    pl.position.set(3, 5, 4);
    previewScene.add(pl);

    swapPreviewCharacter();
    animatePreview();
  }

  function swapPreviewCharacter() {
    if (!previewScene) return;
    if (previewMesh) previewScene.remove(previewMesh);
    const holder = new THREE.Group();
    const m = buildPlayer(selectedCharId);
    // Remove the flat shadow blob (last child) for the preview so it floats cleanly
    holder.add(m);
    holder.position.y = -0.1;
    previewMesh = holder;
    previewScene.add(previewMesh);
  }

  function animatePreview() {
    previewRAF = requestAnimationFrame(animatePreview);
    if (previewMesh) previewMesh.rotation.y += 0.02;
    if (previewRenderer) previewRenderer.render(previewScene, previewCamera);
  }

  // ── Boot ───────────────────────────────────────────────────
  function boot() {
    initThree();
    setupInput();
    setupScreenButtons();

    // Build a preview world visible behind the splash
    buildLevelWorld();

    // Build the character preview scene (separate mini renderer)
    initCharPreview();

    loop();
  }

  boot();

})();
