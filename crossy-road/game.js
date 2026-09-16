// ============================================================
//  CROSSY ROAD  –  game.js
//  Three.js r128  |  voxel aesthetic, core mechanics
// ============================================================

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const TILE   = 1;          // world unit = 1 Three.js unit
  const COLS   = 11;         // visible columns (-5 … +5)
  const HALF   = Math.floor(COLS / 2);
  const VISIBLE_ROWS = 20;   // rows kept alive ahead/behind
  const LANE_SPEED_MIN = 0.03;
  const LANE_SPEED_MAX = 0.12;
  const HOP_DURATION  = 160; // ms per hop
  const DROWN_TIME    = 900; // ms before drown death on water
  const IDLE_TIMEOUT  = 6000;// ms idle → eagle

  // Lane type constants
  const LANE = { GRASS: 'grass', ROAD: 'road', WATER: 'water', SAFE: 'safe' };

  // Palette – flat voxel colours
  const COL = {
    grassLight : 0x78c850,
    grassDark  : 0x5ba836,
    roadGray   : 0x555566,
    roadLine   : 0xf0e060,
    waterDeep  : 0x1a6ea8,
    waterLight : 0x2288cc,
    logBrown   : 0x8B5E3C,
    logEnd     : 0x6B4423,
    carRed     : 0xe74c3c,
    carBlue    : 0x3498db,
    carYellow  : 0xf1c40f,
    carGreen   : 0x27ae60,
    carWhite   : 0xecf0f1,
    truckOrange: 0xe67e22,
    truckGray  : 0x7f8c8d,
    playerBody : 0xF5CBA7,
    playerBeak : 0xF39C12,
    playerEye  : 0x1a1a1a,
    playerWing : 0xffffff,
    playerFeet : 0xF39C12,
    treeTrunk  : 0x7D5A3C,
    treeTop    : 0x2ecc71,
    treeTop2   : 0x27ae60,
    shadow     : 0x000000,
    sky        : 0x87CEEB,
    ground     : 0x5ba836,
    lilyPad    : 0x2ecc71,
    coin       : 0xFFD700,
  };

  // ── State ──────────────────────────────────────────────────
  let scene, camera, renderer;
  let playerMesh, playerGroup;
  let lanes = [];          // { type, z, obstacles:[], logs:[], speed, dir }
  let score = 0, bestScore = 0;
  let gameState = 'start'; // start | playing | dead
  let hopQueue = [];
  let isHopping = false;
  let hopStart, hopEnd, hopStartTime;
  let playerZ = 0;         // current row (integer)
  let playerX = 0;         // current col (integer)
  let maxZ = 0;            // furthest row reached
  let idleTimer = null;
  let drownTimer = null;
  let eagleMesh = null;
  let deathType = '';       // 'squish' | 'drown' | 'eagle'
  let waterOffset = {};    // z → phase offset for water shimmer
  let clock;
  let frameId;

  // Meshes pools
  let obstacleMeshes = [];   // cars/trucks in scene
  let logMeshes      = [];   // logs in scene
  let tileMeshes     = {};   // z → ground tile mesh
  let decorMeshes    = {};   // z → array of decor meshes

  // DOM refs
  const scoreEl     = document.getElementById('score-display');
  const bestEl      = document.getElementById('best-display');
  const startScreen = document.getElementById('start-screen');
  const goScreen    = document.getElementById('gameover-screen');
  const goScore     = document.getElementById('gameover-score');
  const goBest      = document.getElementById('gameover-best');
  const hopFlash    = document.getElementById('hop-flash');

  // ── Audio (Web Audio API) ──────────────────────────────────
  let audioCtx = null;

  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playHop() {
    try {
      const ctx = getAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(340, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
  }

  function playSquish() {
    try {
      const ctx = getAudio();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 400;
      src.buffer = buf;
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      src.start();
    } catch(e) {}
  }

  function playPlop() {
    try {
      const ctx = getAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
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
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.18);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.2);
      });
    } catch(e) {}
  }

  // ── THREE setup ────────────────────────────────────────────
  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COL.sky);
    // No fog — it was causing the top-of-screen fade artefact with ortho camera

    // Camera – orthographic isometric like the original Crossy Road
    const aspect = window.innerWidth / window.innerHeight;
    const viewH = 8;
    camera = new THREE.OrthographicCamera(
      -viewH * aspect, viewH * aspect,
       viewH, -viewH,
      0.1, 200
    );
    camera._viewH  = viewH;
    camera._aspect = aspect;
    positionCamera(0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').prepend(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff8e7, 0.95);
    sun.position.set(5, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.width  = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far  = 60;
    sun.shadow.camera.left = -14;
    sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xadd8e6, 0.3);
    fill.position.set(-5, 4, -4);
    scene.add(fill);

    clock = new THREE.Clock();

    window.addEventListener('resize', onResize);
  }

  function positionCamera(targetZ) {
    // Classic Crossy Road angle: camera behind-and-above, looking forward and slightly down
    // Equal x/y/z offsets gives the 45° isometric diagonal look
    camera.position.set(0, 12, targetZ + 12);
    camera.lookAt(0, 0, targetZ);
  }

  function onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const viewH  = camera._viewH || 10;
    camera.left   = -viewH * aspect;
    camera.right  =  viewH * aspect;
    camera.top    =  viewH;
    camera.bottom = -viewH;
    camera._aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ── Geometry helpers ───────────────────────────────────────
  function box(w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshLambertMaterial({ color });
    return new THREE.Mesh(geo, mat);
  }

  function roundedBox(w, h, d, color) {
    // Approximate rounded box with normal box (voxel look)
    return box(w, h, d, color);
  }

  // ── World generation ───────────────────────────────────────
  function generateLane(z) {
    // z=0 is always a safe start row
    if (z === 0) return makeSafeLane(z);

    // Positive z = behind player (never generate obstacles there)
    if (z > 0) return makeGrassLane(z);

    // First few rows forward = safe grass
    if (z >= -3) return makeGrassLane(z);

    // Weighted random for forward lanes
    const r = Math.random();
    if (r < 0.35)      return makeRoadLane(z);
    else if (r < 0.55) return makeWaterLane(z);
    else               return makeGrassLane(z);
  }

  function makeSafeLane(z) {
    return { type: LANE.SAFE, z, obstacles: [], logs: [], speed: 0, dir: 1 };
  }

  function makeGrassLane(z) {
    return { type: LANE.GRASS, z, obstacles: [], logs: [], speed: 0, dir: 1 };
  }

  function makeRoadLane(z) {
    const dir   = Math.random() < 0.5 ? 1 : -1;
    const speed = LANE_SPEED_MIN + Math.random() * (LANE_SPEED_MAX - LANE_SPEED_MIN);
    const type  = LANE.ROAD;
    return { type, z, obstacles: [], logs: [], speed, dir };
  }

  function makeWaterLane(z) {
    const dir   = Math.random() < 0.5 ? 1 : -1;
    const speed = LANE_SPEED_MIN + Math.random() * (LANE_SPEED_MAX * 0.7 - LANE_SPEED_MIN);
    waterOffset[z] = Math.random() * Math.PI * 2;
    return { type: LANE.WATER, z, obstacles: [], logs: [], speed, dir };
  }

  // ── Ground tiles ───────────────────────────────────────────
  const GEO_TILE   = new THREE.BoxGeometry(TILE, 0.22, TILE);
  const GEO_WATER  = new THREE.BoxGeometry(TILE, 0.12, TILE);

  function buildTile(lane) {
    const z = lane.z;
    if (tileMeshes[z]) return;

    let group = new THREE.Group();

    if (lane.type === LANE.WATER) {
      // Water surface – multiple tiles per row
      for (let x = -HALF - 2; x <= HALF + 2; x++) {
        const shade = (x + z) % 2 === 0 ? COL.waterDeep : COL.waterLight;
        const mat = new THREE.MeshLambertMaterial({ color: shade, transparent: true, opacity: 0.88 });
        const mesh = new THREE.Mesh(GEO_WATER, mat);
        mesh.position.set(x * TILE, -0.06, z * TILE);
        mesh.receiveShadow = true;
        group.add(mesh);
      }
    } else {
      // Grass / road / safe
      for (let x = -HALF - 2; x <= HALF + 2; x++) {
        let color;
        if (lane.type === LANE.ROAD || lane.type === LANE.SAFE) {
          color = COL.roadGray;
        } else {
          color = (x + z) % 2 === 0 ? COL.grassLight : COL.grassDark;
        }
        const mat = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(GEO_TILE, mat);
        mesh.position.set(x * TILE, -0.11, z * TILE);
        mesh.receiveShadow = true;
        group.add(mesh);
      }

      // Road markings
      if (lane.type === LANE.ROAD) {
        const lineMat = new THREE.MeshLambertMaterial({ color: COL.roadLine });
        const lineGeo = new THREE.BoxGeometry(0.18, 0.01, 0.45);
        for (let x = -HALF - 1; x <= HALF + 1; x++) {
          const line = new THREE.Mesh(lineGeo, lineMat);
          line.position.set(x * TILE, 0.0, z * TILE);
          group.add(line);
        }
      }
    }

    scene.add(group);
    tileMeshes[z] = group;

    // Decorations on grass
    if (lane.type === LANE.GRASS) {
      buildGrassDecor(z);
    }
  }

  function buildGrassDecor(z) {
    if (decorMeshes[z]) return;
    decorMeshes[z] = [];

    // Randomly place trees (avoid center columns)
    const treePositions = [];
    for (let x = -HALF - 1; x <= HALF + 1; x++) {
      if (Math.abs(x) <= 1 && z === 0) continue; // keep start clear
      if (Math.random() < 0.18) {
        treePositions.push(x);
      }
    }

    treePositions.forEach(x => {
      const tree = buildTree();
      tree.position.set(x * TILE, 0, z * TILE);
      scene.add(tree);
      decorMeshes[z].push(tree);
    });
  }

  function buildTree() {
    const g = new THREE.Group();

    // Trunk
    const trunk = box(0.22, 0.55, 0.22, COL.treeTrunk);
    trunk.position.y = 0.27;
    trunk.castShadow = true;
    g.add(trunk);

    // Foliage layers (voxel style)
    const colors = [COL.treeTop2, COL.treeTop, COL.treeTop2];
    const sizes  = [0.72, 0.58, 0.42];
    const ys     = [0.60, 0.82, 1.00];
    colors.forEach((c, i) => {
      const leaf = box(sizes[i], 0.28, sizes[i], c);
      leaf.position.y = ys[i];
      leaf.castShadow = true;
      g.add(leaf);
    });

    return g;
  }

  // ── Vehicle building ───────────────────────────────────────
  function buildCar(lane) {
    const colorOptions = [COL.carRed, COL.carBlue, COL.carYellow, COL.carGreen, COL.carWhite];
    const bodyColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];

    const g = new THREE.Group();

    // Body
    const body = box(0.82, 0.34, 0.58, bodyColor);
    body.position.y = 0.17;
    body.castShadow = true;
    g.add(body);

    // Cabin
    const cabin = box(0.52, 0.28, 0.52, bodyColor);
    cabin.position.set(-0.05, 0.45, 0);
    cabin.castShadow = true;
    g.add(cabin);

    // Windows (dark)
    const winMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
    const winGeo = new THREE.BoxGeometry(0.38, 0.18, 0.08);
    [-0.22, 0.22].forEach(z => {
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(-0.05, 0.46, z);
      g.add(win);
    });

    // Wheels
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const wheelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 8);
    [[-0.28, -0.22], [-0.28, 0.22], [0.28, -0.22], [0.28, 0.22]].forEach(([x, z]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.05, z);
      g.add(w);
    });

    // Headlights
    const lightMat = new THREE.MeshLambertMaterial({ color: 0xffffaa });
    const lightGeo = new THREE.BoxGeometry(0.1, 0.08, 0.06);
    [-0.15, 0.15].forEach(z => {
      const l = new THREE.Mesh(lightGeo, lightMat);
      const xOff = lane.dir > 0 ? 0.41 : -0.41;
      l.position.set(xOff, 0.2, z);
      g.add(l);
    });

    // Shadow blob
    addShadowBlob(g, 0.7, 0.55);

    return g;
  }

  function buildTruck(lane) {
    const g = new THREE.Group();
    const cabColor  = COL.truckOrange;
    const bodyColor = COL.truckGray;

    // Trailer
    const trailer = box(1.1, 0.5, 0.62, bodyColor);
    trailer.position.set(lane.dir > 0 ? -0.5 : 0.5, 0.25, 0);
    trailer.castShadow = true;
    g.add(trailer);

    // Cab
    const cab = box(0.58, 0.58, 0.58, cabColor);
    cab.position.set(lane.dir > 0 ? 0.62 : -0.62, 0.29, 0);
    cab.castShadow = true;
    g.add(cab);

    // Windows
    const winMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
    const winGeo = new THREE.BoxGeometry(0.08, 0.22, 0.38);
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(lane.dir > 0 ? 0.91 : -0.91, 0.36, 0);
    g.add(win);

    // Wheels
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const wheelGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.14, 8);
    const xPositions = lane.dir > 0
      ? [-0.85, -0.2, 0.5]
      : [0.85, 0.2, -0.5];
    xPositions.forEach(x => {
      [-0.26, 0.26].forEach(z => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, 0.05, z);
        g.add(w);
      });
    });

    addShadowBlob(g, 1.6, 0.65);
    return g;
  }

  function buildLog(length) {
    const g = new THREE.Group();

    // Main log body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, length - 0.1, 10),
      new THREE.MeshLambertMaterial({ color: COL.logBrown })
    );
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    g.add(body);

    // End caps
    [-1, 1].forEach(side => {
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.08, 10),
        new THREE.MeshLambertMaterial({ color: COL.logEnd })
      );
      cap.rotation.z = Math.PI / 2;
      cap.position.x = side * (length / 2 - 0.02);
      g.add(cap);

      // Ring detail
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.025, 6, 12),
        new THREE.MeshLambertMaterial({ color: 0x5a3a1a })
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.x = side * (length / 2 - 0.05);
      g.add(ring);
    });

    addShadowBlob(g, length, 0.46);
    return g;
  }

  function addShadowBlob(group, w, d) {
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.9, d * 0.85),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.08;
    group.add(shadow);
  }

  // ── Player ─────────────────────────────────────────────────
  function buildPlayer() {
    const g = new THREE.Group();

    // Body (rounded voxel chicken)
    const body = box(0.52, 0.5, 0.46, COL.playerBody);
    body.position.y = 0.28;
    body.castShadow = true;
    g.add(body);

    // Head
    const head = box(0.38, 0.34, 0.36, COL.playerBody);
    head.position.set(0.06, 0.65, 0);
    head.castShadow = true;
    g.add(head);

    // Comb (red)
    const combMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
    [0, 0.08, -0.08].forEach((xOff, i) => {
      const comb = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.12 - i * 0.02, 0.07),
        combMat
      );
      comb.position.set(0.06 + xOff, 0.86, 0);
      g.add(comb);
    });

    // Beak
    const beak = box(0.15, 0.1, 0.12, COL.playerBeak);
    beak.position.set(0.27, 0.62, 0);
    g.add(beak);

    // Eyes
    const eyeMat = new THREE.MeshLambertMaterial({ color: COL.playerEye });
    const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    [-0.1, 0.1].forEach(z => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(0.2, 0.68, z);
      g.add(eye);
    });

    // Wings
    const wingMat = new THREE.MeshLambertMaterial({ color: COL.playerWing });
    const wingGeo = new THREE.BoxGeometry(0.08, 0.28, 0.38);
    [-0.28, 0.28].forEach(z => {
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(0, 0.32, z);
      wing.rotation.z = z < 0 ? 0.2 : -0.2;
      wing.castShadow = true;
      g.add(wing);
    });

    // Feet
    const feetMat = new THREE.MeshLambertMaterial({ color: COL.playerFeet });
    const feetGeo = new THREE.BoxGeometry(0.2, 0.07, 0.1);
    [-0.12, 0.12].forEach(z => {
      const foot = new THREE.Mesh(feetGeo, feetMat);
      foot.position.set(0, 0.04, z);
      g.add(foot);
    });

    addShadowBlob(g, 0.55, 0.5);

    return g;
  }

  // ── Eagle ─────────────────────────────────────────────────
  function buildEagle() {
    const g = new THREE.Group();

    const body = box(0.7, 0.4, 0.5, 0x6B4423);
    body.position.y = 0.2;
    g.add(body);

    const head = box(0.34, 0.3, 0.32, 0x4a3018);
    head.position.set(0.22, 0.42, 0);
    g.add(head);

    const beak = box(0.18, 0.1, 0.12, 0xe67e22);
    beak.position.set(0.38, 0.38, 0);
    g.add(beak);

    // Wings spread
    const wingMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
    [-1, 1].forEach(side => {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.06, 1.2),
        wingMat
      );
      wing.position.set(0, 0.28, side * 0.7);
      wing.rotation.x = side * 0.3;
      g.add(wing);
    });

    const eyeGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
    [-0.1, 0.1].forEach(z => {
      const eye = new THREE.Mesh(eyeGeo, new THREE.MeshLambertMaterial({ color: 0xf1c40f }));
      eye.position.set(0.31, 0.46, z);
      g.add(eye);
    });

    return g;
  }

  // ── Populate lanes ─────────────────────────────────────────
  function populateLane(lane) {
    if (lane.type === LANE.ROAD) {
      populateRoad(lane);
    } else if (lane.type === LANE.WATER) {
      populateWater(lane);
    }
  }

  function populateRoad(lane) {
    // Space vehicles evenly with gaps
    const numVehicles = 2 + Math.floor(Math.random() * 3);
    const spacing = COLS / numVehicles;
    let x = -(HALF + 2);

    for (let i = 0; i < numVehicles; i++) {
      const isTruck = Math.random() < 0.3;
      const mesh = isTruck ? buildTruck(lane) : buildCar(lane);
      const startX = x + (i * spacing) + (Math.random() - 0.5) * (spacing * 0.4);
      mesh.position.set(startX * TILE, 0, lane.z * TILE);
      mesh.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      scene.add(mesh);

      const width = isTruck ? 1.65 : 0.82;
      lane.obstacles.push({
        mesh, x: startX, width,
        type: isTruck ? 'truck' : 'car'
      });
      obstacleMeshes.push(mesh);
    }
  }

  function populateWater(lane) {
    const numLogs = 2 + Math.floor(Math.random() * 3);
    const spacing = (COLS + 4) / numLogs;

    for (let i = 0; i < numLogs; i++) {
      const logLen = 1.2 + Math.random() * 1.4;
      const mesh = buildLog(logLen);
      const startX = -(HALF + 2) + (i * spacing) + (Math.random() - 0.5);
      mesh.position.set(startX * TILE, 0.1, lane.z * TILE);
      scene.add(mesh);

      lane.logs.push({ mesh, x: startX, length: logLen });
      logMeshes.push(mesh);
    }
  }

  // ── Game init ──────────────────────────────────────────────
  function initGame() {
    // Clear previous scene objects
    clearWorld();

    playerZ = 0;
    playerX = 0;
    score   = 0;
    maxZ    = 0;  // tracks most-forward row (most negative z)
    camTargetZ = 0;
    hopQueue = [];
    isHopping = false;
    deathType = '';
    waterOffset = {};

    scoreEl.textContent = '0';
    bestEl.textContent  = 'BEST: ' + bestScore;

    // Generate initial lanes: a few behind (positive z), many ahead (negative z)
    lanes = [];
    for (let z = 3; z >= -VISIBLE_ROWS; z--) {
      const lane = generateLane(z);
      lanes.push(lane);
      buildTile(lane);
      populateLane(lane);
    }

    // Build player
    playerGroup = new THREE.Group();
    playerMesh  = buildPlayer();
    playerGroup.add(playerMesh);
    playerGroup.position.set(0, 0, 0);
    scene.add(playerGroup);

    positionCamera(0);
    resetIdleTimer();
  }

  function clearWorld() {
    // Remove all tracked meshes
    Object.values(tileMeshes).forEach(m => scene.remove(m));
    Object.values(decorMeshes).forEach(arr => arr.forEach(m => scene.remove(m)));
    obstacleMeshes.forEach(m => scene.remove(m));
    logMeshes.forEach(m => scene.remove(m));
    if (playerGroup) scene.remove(playerGroup);
    if (eagleMesh)   { scene.remove(eagleMesh); eagleMesh = null; }

    tileMeshes     = {};
    decorMeshes    = {};
    obstacleMeshes = [];
    logMeshes      = [];
    lanes          = [];
  }

  // ── Movement ───────────────────────────────────────────────
  function queueHop(dx, dz) {
    if (gameState !== 'playing') return;
    // Max 2 hops queued
    if (hopQueue.length >= 2) return;
    hopQueue.push({ dx, dz });
  }

  function processHopQueue() {
    if (isHopping || hopQueue.length === 0) return;

    const { dx, dz } = hopQueue.shift();
    const newX = playerX + dx;
    const newZ = playerZ + dz;

    // Boundary check
    if (newX < -HALF || newX > HALF) return;
    // Can't hop too far backward
    if (newZ > 3) return;

    // Check if moving to tree
    const decors = decorMeshes[newZ] || [];
    const blocked = decors.some(tree => {
      return Math.abs(tree.position.x - newX * TILE) < 0.6;
    });
    if (blocked) return;

    playerX = newX;
    playerZ = newZ;

    // Always clear log riding state when starting a new hop
    if (playerGroup) {
      playerGroup.userData.ridingLog  = null;
      playerGroup.userData.ridingLane = null;
    }
    if (drownTimer) { clearTimeout(drownTimer); drownTimer = null; }

    hopStart    = playerGroup.position.clone();
    hopEnd      = new THREE.Vector3(newX * TILE, 0, newZ * TILE);
    hopStartTime = performance.now();
    isHopping   = true;

    playHop();
    flashScreen();

    // Score for moving forward (negative Z = forward)
    if (newZ < maxZ) {
      maxZ = newZ;
      score = -maxZ; // score = how many rows forward
      if (score > bestScore) bestScore = score;
      scoreEl.textContent = score;
      bestEl.textContent  = 'BEST: ' + bestScore;
      if (score % 5 === 0) playScore();
    }

    resetIdleTimer();
    // Extend world ahead
    extendWorld(newZ);
  }

  function updateHop(now) {
    if (!isHopping) return;

    const t = Math.min(1, (now - hopStartTime) / HOP_DURATION);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out

    // Arc
    const arcH = 0.55;
    const arcY = Math.sin(t * Math.PI) * arcH;

    playerGroup.position.lerpVectors(hopStart, hopEnd, ease);
    playerGroup.position.y = arcY;

    // Squash & stretch
    const stretch = 1 + Math.sin(t * Math.PI) * 0.35;
    const squash  = 1 - Math.sin(t * Math.PI) * 0.18;
    playerMesh.scale.set(squash, stretch, squash);

    // Body tilt toward direction
    playerGroup.rotation.y = Math.atan2(
      hopEnd.x - hopStart.x,
      hopEnd.z - hopStart.z
    );

    if (t >= 1) {
      playerGroup.position.copy(hopEnd);
      playerGroup.position.y = 0;
      playerMesh.scale.set(1, 1, 1);
      isHopping = false;

      // Land squash
      playerMesh.scale.set(1.2, 0.75, 1.2);
      setTimeout(() => { if (playerMesh) playerMesh.scale.set(1, 1, 1); }, 80);

      checkCollisions();
    }
  }

  // ── Camera follow ──────────────────────────────────────────
  let camTargetZ = 0;
  function updateCamera(dt) {
    const targetZ = playerGroup ? playerGroup.position.z : 0;
    camTargetZ += (targetZ - camTargetZ) * Math.min(1, dt * 5);

    camera.position.x += (0              - camera.position.x) * Math.min(1, dt * 5);
    camera.position.z += (camTargetZ + 12 - camera.position.z) * Math.min(1, dt * 5);
    camera.position.y += (12             - camera.position.y) * Math.min(1, dt * 5);
    camera.lookAt(0, 0, camTargetZ);
  }

  // ── World streaming ────────────────────────────────────────
  function extendWorld(currentZ) {
    const aheadZ = currentZ - 18; // negative Z is forward
    for (let z = currentZ - 1; z >= aheadZ; z--) {
      if (!lanes.find(l => l.z === z)) {
        const lane = generateLane(z);
        lanes.push(lane);
        buildTile(lane);
        populateLane(lane);
      }
    }

    // Cull lanes far behind player (large positive z relative to player)
    const cutoff = currentZ + 10;
    lanes = lanes.filter(lane => {
      if (lane.z > cutoff) {
        if (tileMeshes[lane.z]) {
          scene.remove(tileMeshes[lane.z]);
          delete tileMeshes[lane.z];
        }
        if (decorMeshes[lane.z]) {
          decorMeshes[lane.z].forEach(m => scene.remove(m));
          delete decorMeshes[lane.z];
        }
        lane.obstacles.forEach(o => scene.remove(o.mesh));
        lane.logs.forEach(l => scene.remove(l.mesh));
        return false;
      }
      return true;
    });
  }

  // ── Obstacle update ────────────────────────────────────────
  const WORLD_WIDTH = COLS + 6; // wraparound width

  function updateObstacles(dt) {
    lanes.forEach(lane => {
      if (lane.type === LANE.ROAD) {
        lane.obstacles.forEach(obs => {
          obs.x += lane.speed * lane.dir * dt * 60;
          // Wraparound
          const half = WORLD_WIDTH / 2;
          if (obs.x > HALF + 4)  obs.x -= WORLD_WIDTH;
          if (obs.x < -HALF - 4) obs.x += WORLD_WIDTH;
          obs.mesh.position.x = obs.x * TILE;
        });
      } else if (lane.type === LANE.WATER) {
        lane.logs.forEach(log => {
          log.x += lane.speed * lane.dir * dt * 60;
          const half = WORLD_WIDTH / 2;
          if (log.x > HALF + 5)  log.x -= WORLD_WIDTH + 2;
          if (log.x < -HALF - 5) log.x += WORLD_WIDTH + 2;
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
      // Left water — stop riding any log and cancel drown timer
      playerGroup.userData.ridingLog  = null;
      playerGroup.userData.ridingLane = null;
      if (drownTimer) { clearTimeout(drownTimer); drownTimer = null; }

      if (lane.type === LANE.ROAD) {
        checkRoadCollision(lane);
      }
    }
  }

  function checkRoadCollision(lane) {
    if (gameState !== 'playing') return;
    const px = playerGroup.position.x;
    const pz = playerGroup.position.z;
    lane.obstacles.forEach(obs => {
      const ox = obs.mesh.position.x;
      const oz = obs.mesh.position.z;
      // Must be on same row (z-axis overlap)
      if (Math.abs(pz - oz) > 0.48) return;
      // Slightly generous x margin to catch fast cars between frames
      const halfW = obs.width * 0.5 + 0.28;
      if (Math.abs(px - ox) < halfW) {
        triggerSquish();
      }
    });
  }

  function handleWaterLanding(lane) {
    const px = playerGroup.position.x;
    let onLog = false;

    lane.logs.forEach(log => {
      const lx = log.mesh.position.x;
      const halfLen = log.length * 0.5 - 0.08;
      if (Math.abs(px - lx) < halfLen) {
        onLog = true;
        playerGroup.userData.ridingLog  = log;
        playerGroup.userData.ridingLane = lane;
      }
    });

    if (!onLog) {
      // No log — drown immediately
      triggerDrown();
    } else {
      if (drownTimer) { clearTimeout(drownTimer); drownTimer = null; }
    }
  }

  function continuousCollisionCheck() {
    if (gameState !== 'playing' || isHopping) return;

    const lane = lanes.find(l => l.z === playerZ);
    if (!lane) return;

    if (lane.type === LANE.ROAD) {
      // Make sure we're not still carrying a log reference from water
      playerGroup.userData.ridingLog  = null;
      playerGroup.userData.ridingLane = null;
      checkRoadCollision(lane);
    } else if (lane.type === LANE.WATER) {
      // Check if still on log
      const px = playerGroup.position.x;
      let onLog = false;
      lane.logs.forEach(log => {
        const lx = log.mesh.position.x;
        const halfLen = log.length * 0.5 - 0.08;
        if (Math.abs(px - lx) < halfLen) {
          onLog = true;
          playerGroup.userData.ridingLog  = log;
          playerGroup.userData.ridingLane = lane;
        }
      });

      if (!onLog) {
        // Log slid away — give a tiny grace period (1 frame) then drown
        if (!drownTimer) {
          drownTimer = setTimeout(() => triggerDrown(), 80);
        }
      } else {
        if (drownTimer) { clearTimeout(drownTimer); drownTimer = null; }
      }
    }
  }

  function rideLog(dt) {
    if (gameState !== 'playing' || isHopping) return;
    const log  = playerGroup.userData.ridingLog;
    const lane = playerGroup.userData.ridingLane;
    if (!log || !lane) return;

    // Move player with log
    const dx = lane.speed * lane.dir * dt * 60 * TILE;
    playerGroup.position.x += dx;
    playerX = Math.round(playerGroup.position.x / TILE);

    // Fall off screen edge (left/right)
    if (Math.abs(playerGroup.position.x) > (HALF + 0.6) * TILE) {
      playerGroup.userData.ridingLog  = null;
      playerGroup.userData.ridingLane = null;
      triggerDrown();
    }
  }

  // ── Death states ───────────────────────────────────────────
  function triggerSquish() {
    if (gameState !== 'playing') return;
    gameState = 'dead';
    deathType = 'squish';
    playSquish();

    // Flatten player
    if (playerMesh) {
      playerMesh.scale.set(1.8, 0.12, 1.8);
      playerMesh.position.y = -0.12;
    }

    clearTimers();
    setTimeout(showGameOver, 1200);
  }

  function triggerDrown() {
    if (gameState !== 'playing') return;
    gameState = 'dead';
    deathType = 'drown';
    playPlop();
    drownTimer = null;

    // Sink player
    if (playerGroup) {
      playerGroup.userData.ridingLog  = null;
      playerGroup.userData.ridingLane = null;
      // Animate sink
      let sinkT = 0;
      const sinkInterval = setInterval(() => {
        sinkT += 0.04;
        if (playerGroup) playerGroup.position.y = -sinkT;
        if (sinkT > 1.2) clearInterval(sinkInterval);
      }, 16);
    }

    clearTimers();
    setTimeout(showGameOver, 1400);
  }

  function triggerEagle() {
    if (gameState !== 'playing') return;
    gameState = 'dead';
    deathType = 'eagle';
    clearTimers();

    // Spawn eagle from above
    eagleMesh = buildEagle();
    eagleMesh.position.set(playerGroup.position.x, 8, playerGroup.position.z - 4);
    scene.add(eagleMesh);

    let t = 0;
    const swoop = setInterval(() => {
      t += 0.025;
      if (eagleMesh) {
        eagleMesh.position.z = playerGroup.position.z - 4 + t * 5;
        eagleMesh.position.y = 8 - t * 14;
        eagleMesh.rotation.x = t * 0.8;
        // Wing flap
        eagleMesh.rotation.z = Math.sin(t * 25) * 0.2;
      }
      if (t >= 0.6) {
        clearInterval(swoop);
        if (playerGroup) scene.remove(playerGroup);
        setTimeout(showGameOver, 800);
      }
    }, 16);
  }

  function clearTimers() {
    if (drownTimer) { clearTimeout(drownTimer);  drownTimer  = null; }
    if (idleTimer)  { clearTimeout(idleTimer);   idleTimer   = null; }
  }

  function showGameOver() {
    goScore.textContent = 'Score: ' + score;
    goBest.textContent  = 'Best: '  + bestScore;
    goScreen.style.display = 'flex';
  }

  // ── Idle eagle ─────────────────────────────────────────────
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (gameState === 'playing') triggerEagle();
    }, IDLE_TIMEOUT);
  }

  // ── Water shimmer animation ────────────────────────────────
  function animateWater(elapsed) {
    Object.entries(tileMeshes).forEach(([z, group]) => {
      const lane = lanes.find(l => l.z === parseInt(z));
      if (!lane || lane.type !== LANE.WATER) return;
      const phase = waterOffset[parseInt(z)] || 0;
      group.children.forEach((mesh, i) => {
        mesh.material.opacity = 0.78 + Math.sin(elapsed * 1.8 + phase + i * 0.4) * 0.1;
      });
    });
  }

  // ── Flash effect ───────────────────────────────────────────
  function flashScreen() {
    hopFlash.classList.add('flash');
    setTimeout(() => hopFlash.classList.remove('flash'), 80);
  }

  // ── Input handling ─────────────────────────────────────────
  function setupInput() {
    document.addEventListener('keydown', e => {
      if (gameState !== 'playing') return;
      switch (e.code) {
        case 'ArrowUp':    case 'KeyW': e.preventDefault(); queueHop(0, -1); break;
        case 'ArrowDown':  case 'KeyS': e.preventDefault(); queueHop(0,  1); break;
        case 'ArrowLeft':  case 'KeyA': e.preventDefault(); queueHop(-1, 0); break;
        case 'ArrowRight': case 'KeyD': e.preventDefault(); queueHop( 1, 0); break;
      }
    });

    // Swipe support
    let touchStartX = 0, touchStartY = 0;
    document.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', e => {
      if (gameState !== 'playing') return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < 20) {
        queueHop(0, -1); // tap = forward
        return;
      }
      if (absDx > absDy) {
        queueHop(dx > 0 ? 1 : -1, 0);
      } else {
        queueHop(0, dy > 0 ? 1 : -1);
      }
    }, { passive: true });

    // D-pad buttons
    document.getElementById('btn-up').addEventListener('touchstart',    e => { e.preventDefault(); queueHop(0, -1); }, { passive: false });
    document.getElementById('btn-down').addEventListener('touchstart',  e => { e.preventDefault(); queueHop(0,  1); }, { passive: false });
    document.getElementById('btn-left').addEventListener('touchstart',  e => { e.preventDefault(); queueHop(-1, 0); }, { passive: false });
    document.getElementById('btn-right').addEventListener('touchstart', e => { e.preventDefault(); queueHop( 1, 0); }, { passive: false });

    document.getElementById('btn-up').addEventListener('click',    () => queueHop(0, -1));
    document.getElementById('btn-down').addEventListener('click',  () => queueHop(0,  1));
    document.getElementById('btn-left').addEventListener('click',  () => queueHop(-1, 0));
    document.getElementById('btn-right').addEventListener('click', () => queueHop( 1, 0));
  }

  function setupScreenButtons() {
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
  }

  function startGame() {
    startScreen.style.display = 'none';
    gameState = 'playing';
    initGame();
  }

  function restartGame() {
    goScreen.style.display = 'none';
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
      // Bobbing idle animation
      if (!isHopping && playerMesh) {
        playerMesh.position.y = Math.sin(elapsed * 3.5) * 0.04;
      }
    } else if (gameState === 'dead') {
      updateObstacles(dt);
      animateWater(elapsed);
      if (eagleMesh) {
        // Eagle wing flap in holding pattern handled by swoop interval
      }
    }

    updateCamera(dt);
    renderer.render(scene, camera);
  }

  // ── Boot ───────────────────────────────────────────────────
  function boot() {
    initThree();
    setupInput();
    setupScreenButtons();

    // Pre-build a preview world behind start screen
    for (let z = 4; z >= -14; z--) {
      const lane = generateLane(z);
      lanes.push(lane);
      buildTile(lane);
      populateLane(lane);
    }

    loop();
  }

  boot();

})();
