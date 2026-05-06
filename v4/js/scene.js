// scene.js — Three.js 3D scene (ES module)
// Usa window.HA per comunicare con ha.js
// Usa window.update3D per ricevere aggiornamenti stati

let THREE, OrbitControls;
try {
  THREE = await import('three');
  ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
} catch (err) {
  document.getElementById('sceneErrorMsg').textContent = String(err && err.message || err);
  document.getElementById('sceneError').classList.add('show');
  document.getElementById('sceneLoading').classList.add('hidden');
  console.error('Three.js load failed:', err); throw err;
}

const W = 100, D = 80, WALL_H = 12;
const pctCenter = (top, left, w, h) => ({ x: (left + w / 2) / 100 * W, z: (top + h / 2) / 100 * D, w: w / 100 * W, d: h / 100 * D });
const pctPoint = (top, left) => ({ x: left / 100 * W, z: top / 100 * D });
const ZONES = [
  // Proporzioni ricavate dalla planimetria reale (image.png)
  { id: 'camera2',   label: 'Camera 2',  top: 4,  left: 12, w: 43, h: 36, color: 0x1c2347 },
  { id: 'soggiorno', label: 'Soggiorno', top: 4,  left: 57, w: 43, h: 36, color: 0x222a52 },
  { id: 'camera',    label: 'Camera',    top: 43, left: 0,  w: 38, h: 52, color: 0x1c2347 },
  { id: 'bagno',     label: 'Bagno',     top: 43, left: 40, w: 15, h: 33, color: 0x1a2742 },
  { id: 'cucina',    label: 'Cucina',    top: 43, left: 57, w: 17, h: 33, color: 0x222a52 },
  { id: 'pranzo',    label: 'Soggiorno', top: 43, left: 76, w: 24, h: 33, color: 0x222a52 },
  { id: 'veranda',   label: 'Veranda',   top: 80, left: 40, w: 60, h: 14, color: 0x1a3b32 },
];

const canvas = document.getElementById('sceneCanvas');
const wrap = document.getElementById('sceneWrap');

const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.Fog(0x0a0a1c, 200, 320);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 800);
const ROOM_CENTER = new THREE.Vector3(W / 2, 0, D / 2);
const DEFAULT_POS = new THREE.Vector3(W / 2 + 95, 105, D / 2 + 100);
camera.position.copy(DEFAULT_POS);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(ROOM_CENTER);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 20; controls.maxDistance = 400;
controls.minPolarAngle = 0.05; controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.enablePan = true;
controls.screenSpacePanning = false;
controls.panSpeed = 1.5;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE
};
controls.touches = {
  ONE: THREE.TOUCH.PAN,
  TWO: THREE.TOUCH.DOLLY_ROTATE
};

scene.add(new THREE.AmbientLight(0x8898cc, 0.7));
scene.add(new THREE.HemisphereLight(0x99bbff, 0x223344, 0.85));
const keyLight = new THREE.DirectionalLight(0xc8dcff, 1.15);
keyLight.position.set(W / 2 + 50, 130, D / 2 + 60);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 1; keyLight.shadow.camera.far = 280;
keyLight.shadow.camera.left = -100; keyLight.shadow.camera.right = 100;
keyLight.shadow.camera.top = 100; keyLight.shadow.camera.bottom = -100;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);
const fill = new THREE.DirectionalLight(0x6688cc, 0.35);
fill.position.set(-30, 80, -30); scene.add(fill);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.6, D * 1.6),
  new THREE.MeshStandardMaterial({ color: 0x14152e, roughness: 0.85, metalness: 0.05 }));
floor.rotation.x = -Math.PI / 2; floor.position.set(W / 2, -0.05, D / 2); floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(Math.max(W, D) * 1.6, 28, 0x2a3060, 0x1a2040);
grid.position.set(W / 2, 0, D / 2);
grid.material.transparent = true; grid.material.opacity = 0.35;
scene.add(grid);

ZONES.forEach(z => {
  const c = pctCenter(z.top, z.left, z.w, z.h);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(c.w * 0.97, c.d * 0.97),
    new THREE.MeshStandardMaterial({ color: z.color, roughness: 0.9, transparent: true, opacity: 0.95 })
  );
  m.rotation.x = -Math.PI / 2; m.position.set(c.x, 0.05, c.z); m.receiveShadow = true; scene.add(m);
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(c.w * 0.97, c.d * 0.97)),
    new THREE.LineBasicMaterial({ color: z.id === 'veranda' ? 0x66dd8b : 0xadc6ff, transparent: true, opacity: 0.22 })
  );
  edge.rotation.x = -Math.PI / 2; edge.position.set(c.x, 0.06, c.z);
  scene.add(edge);
});

function makeTextSprite(text, color, size = 64, weight = 700) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px Inter, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 16;
  ctx.fillText(text.toUpperCase(), cv.width / 2, cv.height / 2);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
}
ZONES.forEach(z => {
  const c = pctCenter(z.top, z.left, z.w, z.h);
  const sp = makeTextSprite(z.label, z.id === 'veranda' ? '#88e6a8aa' : '#9aa6d8aa');
  sp.scale.set(20, 5, 1); sp.position.set(c.x, 0.5, c.z);
  scene.add(sp);
});

const wallMat = new THREE.MeshStandardMaterial({ color: 0x141833, roughness: 0.9, metalness: 0.05 });
const wallBack = new THREE.Mesh(new THREE.BoxGeometry(W, WALL_H, 0.6), wallMat);
wallBack.position.set(W / 2, WALL_H / 2, -0.3); wallBack.castShadow = true; wallBack.receiveShadow = true;
scene.add(wallBack);
const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.6, WALL_H, D), wallMat);
wallLeft.position.set(-0.3, WALL_H / 2, D / 2); wallLeft.castShadow = true; wallLeft.receiveShadow = true;
scene.add(wallLeft);
const baseLine = new THREE.Mesh(new THREE.BoxGeometry(W, 0.18, 0.18),
  new THREE.MeshBasicMaterial({ color: 0x4b8eff, transparent: true, opacity: 0.22 }));
baseLine.position.set(W / 2, 0.1, 0.05); scene.add(baseLine);
const baseLine2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, D),
  new THREE.MeshBasicMaterial({ color: 0x4b8eff, transparent: true, opacity: 0.22 }));
baseLine2.position.set(0.05, 0.1, D / 2); scene.add(baseLine2);

const interactives = [];
const devices3D = {};

// TV
{
  const p = pctPoint(3, 70);
  const tvW = 14, tvH = 8, tvT = 0.7;
  const grp = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(tvW, tvH, tvT),
    new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.5, metalness: 0.4 }));
  frame.castShadow = true; grp.add(frame);
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x05060e, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.25 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(tvW * 0.92, tvH * 0.85), screenMat);
  screen.position.z = tvT / 2 + 0.01; grp.add(screen);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x4a90ff, transparent: true, opacity: 0, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(tvW * 1.15, tvH * 1.15), glowMat);
  glow.position.z = tvT / 2 + 0.005; grp.add(glow);
  // Spotlight puntato verso il divano (x=70, z=19)
  const tvSpot = new THREE.SpotLight(0x4a90ff, 0, 32, Math.PI / 3, 0.6, 1.4);
  tvSpot.position.set(p.x, 9, p.z + 0.7);
  tvSpot.target.position.set(p.x, 0, p.z + 10);
  scene.add(tvSpot); scene.add(tvSpot.target);
  // Luce ambiente TV → divano (blu freddo, proiettata nella stanza)
  const tvAmbient = new THREE.PointLight(0x2255aa, 0, 60, 1.2);
  tvAmbient.position.set(p.x, 7, p.z + 3);
  scene.add(tvAmbient);
  grp.position.set(p.x, 9, 0.7); scene.add(grp);
  devices3D.tv = { screenMat, glowMat, spot: tvSpot, ambient: tvAmbient };
  interactives.push({ mesh: frame, kind: 'tv', tooltip: () => 'Sony TV' });
  interactives.push({ mesh: screen, kind: 'tv', tooltip: () => 'Sony TV' });
}

// Divano — grigio chiaro, gambe legno, posto sx allungato
{
  const p = pctPoint(24, 70);
  const grp = new THREE.Group();
  const fab  = new THREE.MeshStandardMaterial({ color: 0xb4b4ac, roughness: 0.93 });
  const fab2 = new THREE.MeshStandardMaterial({ color: 0xa4a49c, roughness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xc8a96e, roughness: 0.55 });

  const SW = 11.7, SD = 5.0, SH = 2;   // seduta principale
  const EXT = 4.5;                       // estensione posto sx (chaise integrata)
  const seatW = SW / 3;               // larghezza singolo posto

  // Corpo seduta principale
  const seat = new THREE.Mesh(new THREE.BoxGeometry(SW, SH, SD), fab);
  seat.position.set(0, SH / 2, 0); seat.castShadow = true; seat.receiveShadow = true; grp.add(seat);

  // Estensione posto sx (raddoppia la profondità)
  const ext = new THREE.Mesh(new THREE.BoxGeometry(seatW, SH, EXT), fab);
  ext.position.set(-SW / 2 + seatW / 2, SH / 2, -(SD + EXT) / 2);
  ext.castShadow = true; ext.receiveShadow = true; grp.add(ext);

  // Schienale principale
  const back = new THREE.Mesh(new THREE.BoxGeometry(SW, 4, 1), fab);
  back.position.set(0, SH + 2, SD / 2 - 0.5); back.castShadow = true; grp.add(back);

  // Bracciolo sinistro
  const armL = new THREE.Mesh(new THREE.BoxGeometry(1, 3.5, SD), fab);
  armL.position.set(-SW / 2 - 0.5, 1.75, 0); armL.castShadow = true; grp.add(armL);

  // Bracciolo destro
  const armR = new THREE.Mesh(new THREE.BoxGeometry(1, 3.5, SD), fab);
  armR.position.set(SW / 2 + 0.5, 1.75, 0); armR.castShadow = true; grp.add(armR);

  // Cuscini seduta (3) — il primo a sx copre anche l'estensione
  for (let i = 0; i < 3; i++) {
    const cD = i === 0 ? SD + EXT - 1 : SD - 1.5;
    const cZ = i === 0 ? -(EXT / 2) - 0.3 : -0.3;
    const c = new THREE.Mesh(new THREE.BoxGeometry(seatW - 0.5, 0.9, cD), fab2);
    c.position.set(-SW / 2 + (i + 0.5) * seatW, SH + 0.45, cZ);
    c.castShadow = true; grp.add(c);
  }

  // Gambe (cilindri legno)
  [[-SW/2+1, -SD/2+1], [SW/2-1, -SD/2+1], [-SW/2+1, SD/2-1], [SW/2-1, SD/2-1],
   [-SW/2+seatW-1, -(SD+EXT)+1]
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 1.6, 8), wood);
    leg.position.set(lx, 0.8, lz); leg.castShadow = true; grp.add(leg);
  });

  grp.rotation.y = 0;
  grp.position.set(p.x, 0, p.z);
  scene.add(grp);
}

// Letto
{
  const c = pctCenter(59, 16, 18, 32);
  const grp = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x2a2845, roughness: 0.7 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(c.w, 1, c.d), wood);
  base.position.y = 0.5; base.castShadow = true; base.receiveShadow = true; grp.add(base);
  const matt = new THREE.Mesh(new THREE.BoxGeometry(c.w * 0.95, 1.2, c.d * 0.95),
    new THREE.MeshStandardMaterial({ color: 0x4a4a78, roughness: 0.85 }));
  matt.position.y = 1.6; matt.castShadow = true; grp.add(matt);
  const head = new THREE.Mesh(new THREE.BoxGeometry(c.w, 4, 2.5), wood);
  head.position.set(0, 2, -c.d / 2 + 0.25); head.castShadow = true; grp.add(head);
  for (let i = 0; i < 2; i++) {
    const pl = new THREE.Mesh(new THREE.BoxGeometry(c.w / 2 - 0.5, 0.5, c.d / 3),
      new THREE.MeshStandardMaterial({ color: 0xd8dbeb, roughness: 0.9 }));
    pl.position.set(-c.w / 4 + i * c.w / 2, 2.5, -c.d / 3); pl.castShadow = true; grp.add(pl);
  }
  grp.rotation.y = -Math.PI / 2;
  grp.position.set(c.x, 0, c.z); scene.add(grp);
}

// Lampada Arco (Flos) — base marmo nero, braccio cromato ad arco, cupola cromata
{
  const p = pctPoint(27, 61);
  const grp = new THREE.Group();
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd0d8e0, roughness: 0.08, metalness: 0.95 });
  const marble = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.05 });

  // Base marmo nero rettangolare
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.5, 1.6), marble);
  base.position.y = 1.75; base.castShadow = true; base.receiveShadow = true; grp.add(base);

  // Palo verticale cromato
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 12), chrome);
  pole.position.y = 4.5 + 3.5; pole.castShadow = true; grp.add(pole);

  // Arco — simulato con segmenti curvi
  const arcR = 9, arcSegs = 10;
  for (let i = 0; i < arcSegs; i++) {
    const a0 = (i / arcSegs) * (Math.PI / 2);
    const a1 = ((i + 1) / arcSegs) * (Math.PI / 2);
    const x0 = Math.sin(a0) * arcR, y0 = Math.cos(a0) * arcR;
    const x1 = Math.sin(a1) * arcR, y1 = Math.cos(a1) * arcR;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const len = Math.sqrt((x1-x0)**2 + (y1-y0)**2);
    const ang = Math.atan2(x1-x0, y1-y0);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, len, 8), chrome);
    seg.position.set(mx, my + 9, 0);
    seg.rotation.z = ang;
    seg.castShadow = true; grp.add(seg);
  }

  // Paralume a cupola (semisfera cromata, aperta verso il basso)
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xc8d4e0, emissive: 0xffcc88, emissiveIntensity: 0, roughness: 0.08, metalness: 0.9, side: THREE.DoubleSide });
  const shade = new THREE.Mesh(new THREE.SphereGeometry(2.0, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), shadeMat);
  shade.position.set(arcR, 9, 0);
  shade.castShadow = true; grp.add(shade);

  // Bulbo interno (visibile quando acceso)
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0x332200 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), bulbMat);
  bulb.position.set(arcR, 8.8, 0); grp.add(bulb);

  // Luce punto
  const pl = new THREE.PointLight(0xffcc77, 0, 40, 1.5);
  pl.position.set(arcR, 8.5, 0); grp.add(pl);

  // Hit area
  const hit = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(arcR, 9, 0); grp.add(hit);

  grp.rotation.y = Math.PI / 4;
  grp.position.set(p.x, 0, p.z); scene.add(grp);
  devices3D.lampada = { shadeMat, bulbMat, light: pl };
  interactives.push({ mesh: hit, kind: 'lampada', tooltip: () => 'Lampada Arco (tieni premuto per controlli)' });
  interactives.push({ mesh: shade, kind: 'lampada', tooltip: () => 'Lampada Arco' });
}

// Faretti — larger housing & hit area for easier interaction
{
  const positions = [pctPoint(8, 64), pctPoint(8, 76), pctPoint(8, 88)];
  devices3D.faretti = [];
  positions.forEach(p => {
    const grp = new THREE.Group();
    // Larger housing
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 1.0, 24),
      new THREE.MeshStandardMaterial({ color: 0x2a2a48, roughness: 0.35, metalness: 0.7 }));
    housing.castShadow = true; grp.add(housing);
    // Glowing ring around lens
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x444466, emissive: 0xffd6a0, emissiveIntensity: 0, roughness: 0.3, metalness: 0.5 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.15, 8, 24), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = -0.5; grp.add(ring);
    // Larger lens
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x333355, emissive: 0xffd6a0, emissiveIntensity: 0, roughness: 0.15, metalness: 0.4 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), lensMat);
    lens.rotation.x = Math.PI / 2; lens.position.y = -0.5; grp.add(lens);
    const sp = new THREE.SpotLight(0xffe1b8, 0, 30, Math.PI / 3.5, 0.5, 1.2);
    sp.target.position.set(0, -14, 0); grp.add(sp); grp.add(sp.target);
    // Much larger hit area
    const hit = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    grp.add(hit);
    grp.position.set(p.x, WALL_H + 0.5, p.z); scene.add(grp);
    devices3D.faretti.push({ lensMat, ringMat, light: sp });
    interactives.push({ mesh: hit, kind: 'faretti', tooltip: () => 'Faretti' });
    interactives.push({ mesh: lens, kind: 'faretti', tooltip: () => 'Faretti' });
  });
}

// Boiler — Ariston Velis: serbatoio verticale bianco ovale, fasce grigio scuro, display
{
  const p = pctPoint(84, 57);
  const grp = new THREE.Group();
  const white  = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.25, metalness: 0.05 });
  const darkCap = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.3, metalness: 0.4 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0x888898, roughness: 0.2, metalness: 0.7 });

  const H = 9, R = 2.2;   // altezza corpo, raggio

  // Corpo principale bianco (cilindro con tappi arrotondati)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 32), white);
  body.position.y = H / 2; body.castShadow = true; body.receiveShadow = true; grp.add(body);

  // Cupola superiore
  const topDome = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), white);
  topDome.position.y = H; grp.add(topDome);

  // Cupola inferiore
  const botDome = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), white);
  botDome.position.y = 0; grp.add(botDome);

  // Fascia superiore grigio scuro
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.05, R + 0.05, 0.7, 32), darkCap);
  capTop.position.y = H - 0.1; grp.add(capTop);

  // Fascia inferiore grigio scuro
  const capBot = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.05, R + 0.05, 0.9, 32), darkCap);
  capBot.position.y = 0.5; grp.add(capBot);

  // Striscia cromata verticale centrale (indicatore)
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, H * 0.35, 0.05), chrome);
  stripe.position.set(0, H * 0.65, R + 0.01); grp.add(stripe);

  // Display/pannello in basso (piccolo rettangolo scuro con LED)
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.2, metalness: 0.5 }));
  panel.position.set(0, 0.9, R + 0.02); grp.add(panel);

  // LED display (emissivo quando acceso)
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, emissive: 0xff6600, emissiveIntensity: 0, roughness: 0.3 });
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.04), ledMat);
  led.position.set(0, 0.9, R + 0.05); grp.add(led);

  // Hit area
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.5, R + 0.5, H + 2, 16), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = H / 2; grp.add(hit);

  grp.position.set(p.x, 0, p.z); scene.add(grp);

  // Sprite info boiler (temperatura + docce)
  const bcv = document.createElement('canvas'); bcv.width = 256; bcv.height = 160;
  const bctx = bcv.getContext('2d');
  const btex = new THREE.CanvasTexture(bcv); btex.colorSpace = THREE.SRGBColorSpace;
  const bplane = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 5.6),
    new THREE.MeshBasicMaterial({ map: btex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  );
  bplane.position.set(p.x - 7, 8, p.z);
  bplane.rotation.y = 0;
  scene.add(bplane);
  function updateBoilerSprite(temp, showers) {
    bctx.clearRect(0, 0, bcv.width, bcv.height);
    bctx.shadowColor = 'rgba(0,0,0,0.8)'; bctx.shadowBlur = 10;
    bctx.textBaseline = 'top';
    // Temperatura
    bctx.fillStyle = '#ff9944'; bctx.font = '800 80px Inter';
    bctx.textAlign = 'center';
    bctx.fillText((temp !== 'unavailable' ? temp : '—') + '°', 128, 4);
    // Docce
    bctx.fillStyle = '#64dfdf'; bctx.font = '600 44px Inter';
    bctx.fillText('🚿 ' + (showers !== 'unavailable' ? showers : '—'), 128, 100);
    btex.needsUpdate = true;
  }
  updateBoilerSprite('—', '—');
  devices3D.boiler = { ledMat, updateSprite: updateBoilerSprite };
  interactives.push({ mesh: hit, kind: 'boiler', tooltip: () => 'Scaldabagno Ariston Velis' });
}

// Lavatrice
{
  const p = pctPoint(91, 44);
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4, 4.5, 4),
    new THREE.MeshStandardMaterial({ color: 0xe8eaf2, roughness: 0.3, metalness: 0.5 }));
  body.position.y = 2.25; body.castShadow = true; grp.add(body);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x222244, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.15, metalness: 0.6 });
  const door = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), doorMat);
  door.position.set(0, 2.25, 2.01); grp.add(door);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.15, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0x999, roughness: 0.4, metalness: 0.7 }));
  ring.position.set(0, 2.25, 1.95); grp.add(ring);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(2.9, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 2.25; grp.add(hit);
  grp.position.set(p.x, 0, p.z); grp.rotation.y = Math.PI / 2; scene.add(grp);
  devices3D.washer = { doorMat };
  interactives.push({ mesh: hit, kind: 'washer', tooltip: () => 'Lavatrice' });
  interactives.push({ mesh: door, kind: 'washer', tooltip: () => 'Lavatrice' });
}

// Frigo Bosch — two-compartment fridge-freezer, stainless steel
{
  const p = pctPoint(47, 71);
  const grp = new THREE.Group();
  const FRIDGE_W = 4, FRIDGE_D = 3.8, FRIDGE_H = WALL_H - 1;
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.3, metalness: 0.75 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(FRIDGE_W, FRIDGE_H, FRIDGE_D), steelMat);
  body.position.y = FRIDGE_H / 2; body.castShadow = true; body.receiveShadow = true; grp.add(body);
  // Top door (fridge)
  const topDoorH = FRIDGE_H * 0.6;
  const topDoor = new THREE.Mesh(new THREE.BoxGeometry(FRIDGE_W * 0.98, topDoorH - 0.2, 0.15),
    new THREE.MeshStandardMaterial({ color: 0xc2c6ce, roughness: 0.25, metalness: 0.8 }));
  topDoor.position.set(0, FRIDGE_H - topDoorH / 2, FRIDGE_D / 2 + 0.08); grp.add(topDoor);
  // Bottom door (freezer)
  const botDoorH = FRIDGE_H * 0.38;
  const botDoor = new THREE.Mesh(new THREE.BoxGeometry(FRIDGE_W * 0.98, botDoorH - 0.2, 0.15),
    new THREE.MeshStandardMaterial({ color: 0xbabec6, roughness: 0.25, metalness: 0.8 }));
  botDoor.position.set(0, botDoorH / 2 + 0.1, FRIDGE_D / 2 + 0.08); grp.add(botDoor);
  // Gap line
  const gapLine = new THREE.Mesh(new THREE.BoxGeometry(FRIDGE_W * 1.01, 0.12, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.3 }));
  gapLine.position.set(0, FRIDGE_H * 0.38 + 0.1, FRIDGE_D / 2 + 0.05); grp.add(gapLine);
  // Handles
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.9 });
  const handleTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, topDoorH * 0.6, 0.3), handleMat);
  handleTop.position.set(-FRIDGE_W / 2 + 0.25, FRIDGE_H - topDoorH / 2, FRIDGE_D / 2 + 0.28); grp.add(handleTop);
  const handleBot = new THREE.Mesh(new THREE.BoxGeometry(0.12, botDoorH * 0.5, 0.3), handleMat);
  handleBot.position.set(-FRIDGE_W / 2 + 0.25, botDoorH / 2 + 0.1, FRIDGE_D / 2 + 0.28); grp.add(handleBot);
  // Bosch logo badge
  const badge = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0.2 }));
  badge.position.set(FRIDGE_W / 2 - 0.8, FRIDGE_H - 0.6, FRIDGE_D / 2 + 0.16); grp.add(badge);

  // LED status frigo — verde standby, ciano pulsante quando compressore attivo
  const fridgeLedMat = new THREE.MeshStandardMaterial({
    color: 0x00cc44, emissive: 0x00cc44, emissiveIntensity: 0.6, roughness: 0.2
  });
  const fridgeLed = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), fridgeLedMat);
  fridgeLed.position.set(FRIDGE_W / 2 - 0.25, 0.5, FRIDGE_D / 2 + 0.1); grp.add(fridgeLed);

  // Piccola luce PointLight che proietta un bagliore quando raffredda
  const fridgeGlow = new THREE.PointLight(0x00aaff, 0, 8, 2);
  fridgeGlow.position.set(FRIDGE_W / 2, 0.5, FRIDGE_D / 2 + 0.5); grp.add(fridgeGlow);

  grp.position.set(p.x, 0, p.z); scene.add(grp);
  devices3D.fridge = { ledMat: fridgeLedMat, glow: fridgeGlow };
}

// Scrivania + Yeelight Screenbar (Camera 2) - Fredde Style
{
  const p = pctPoint(36, 19);
  const grp = new THREE.Group();
  grp.rotation.y = Math.PI;

  const deskMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.8, metalness: 0.1 });

  // Main desktop
  const desktop = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 4.5), deskMat);
  desktop.position.y = 4.0; desktop.castShadow = true; desktop.receiveShadow = true; grp.add(desktop);

  // Vertical side panels / legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.8, 4), deskMat);
  legL.position.set(-3.85, 3.9, 0); grp.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.8, 4), deskMat);
  legR.position.set(3.85, 3.9, 0); grp.add(legR);

  // Top shelf
  const topShelf = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 2.5), deskMat);
  topShelf.position.set(0, 6.5, -1.0); grp.add(topShelf);

  // Side wings (speaker shelves)
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), deskMat);
  wingL.position.set(-5.0, 5.0, 0); grp.add(wingL);
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), deskMat);
  wingR.position.set(5.0, 5.0, 0); grp.add(wingR);

  // Monitor
  const monitorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3, metalness: 0.8 });
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 0.15), monitorMat);
  monitor.position.set(0, 5.5, -0.6); grp.add(monitor);
  const monitorStand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 1.2), deskMat);
  monitorStand.position.set(0, 4.1, -1.2); grp.add(monitorStand);
  const monitorNeck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.4), deskMat);
  monitorNeck.position.set(0, 4.8, -1.2); grp.add(monitorNeck);

  // Yeelight Screenbar (on top of monitor)
  const lampBaseMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.2 });
  const lampBar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.2, 16), lampBaseMat);
  lampBar.rotation.z = Math.PI / 2;
  lampBar.position.set(0, 6.95, -0.5); grp.add(lampBar);

  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe1b8 });
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.05, 0.1), bulbMat);
  bulb.position.set(0, 6.89, -0.5); grp.add(bulb);

  const pl = new THREE.PointLight(0xffaa55, 0, 30, 2);
  pl.position.set(0, 6.8, -0.5); grp.add(pl);

  const hit = new THREE.Mesh(new THREE.BoxGeometry(5.0, 4.0, 3.0), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 5.5, -0.5); grp.add(hit);

  grp.position.set(p.x, 0, p.z); scene.add(grp);
  devices3D.xiaomiLight = { bulbMat, light: pl };
  interactives.push({ mesh: hit, kind: 'xiaomi', tooltip: () => 'Yeelight Screenbar' });
  interactives.push({ mesh: bulb, kind: 'xiaomi', tooltip: () => 'Yeelight Screenbar' });
}

// Sockets
{
  const positions = [pctPoint(45, 58), pctPoint(45, 61), pctPoint(45, 64), pctPoint(45, 67)];
  devices3D.sockets = [];
  positions.forEach((p, i) => {
    const grp = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 2),
      new THREE.MeshStandardMaterial({ color: 0x1a1a30, roughness: 0.7, metalness: 0.3 }));
    base.position.y = 0.25; base.castShadow = true; grp.add(base);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0x3d3d5c, emissiveIntensity: 0.5 });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), ledMat);
    led.position.y = 0.7; grp.add(led);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.5; grp.add(hit);
    grp.position.set(p.x, 0, p.z); scene.add(grp);
    devices3D.sockets.push({ ledMat });
    interactives.push({ mesh: hit, kind: 'socket', index: i, tooltip: () => 'Out ' + (i + 1) });
    interactives.push({ mesh: led, kind: 'socket', index: i, tooltip: () => 'Out ' + (i + 1) });
  });
}

// Door sensor — realistic door with frame, panel, handle & sensor LED
{
  const p = pctPoint(18, 99);
  const grp = new THREE.Group();

  const DOOR_W = 5.5, DOOR_H = WALL_H - 0.5, FRAME_T = 0.6, FRAME_D = 1.2;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.75, metalness: 0.15, emissive: 0x25a55a, emissiveIntensity: 0.2 });

  // Frame — left upright
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(FRAME_T, DOOR_H, FRAME_D), frameMat);
  frameL.position.set(-DOOR_W / 2, DOOR_H / 2, 0); frameL.castShadow = true; grp.add(frameL);
  // Frame — right upright
  const frameR = new THREE.Mesh(new THREE.BoxGeometry(FRAME_T, DOOR_H, FRAME_D), frameMat);
  frameR.position.set(DOOR_W / 2, DOOR_H / 2, 0); frameR.castShadow = true; grp.add(frameR);
  // Frame — top lintel
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + FRAME_T, FRAME_T, FRAME_D), frameMat);
  frameTop.position.set(0, DOOR_H + FRAME_T / 2, 0); frameTop.castShadow = true; grp.add(frameTop);

  // Door panel — pivots around left edge (hinge side)
  const PANEL_W = DOOR_W - FRAME_T * 0.8, PANEL_H = DOOR_H - 0.3, PANEL_T = 0.35;
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.7, metalness: 0.1 });
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-DOOR_W / 2 + FRAME_T / 2, 0, 0); // hinge at left frame edge

  const panel = new THREE.Mesh(new THREE.BoxGeometry(PANEL_W, PANEL_H, PANEL_T), panelMat);
  panel.position.set(PANEL_W / 2, PANEL_H / 2 + 0.15, 0);
  panel.castShadow = true; panel.receiveShadow = true;
  doorPivot.add(panel);

  // Panel detail — two inset rectangles
  const insetMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.8, metalness: 0.05 });
  const insetW = PANEL_W * 0.6, insetH = PANEL_H * 0.32;
  const insetUp = new THREE.Mesh(new THREE.BoxGeometry(insetW, insetH, 0.06), insetMat);
  insetUp.position.set(PANEL_W / 2, PANEL_H * 0.68, PANEL_T / 2 + 0.03); doorPivot.add(insetUp);
  const insetDown = new THREE.Mesh(new THREE.BoxGeometry(insetW, insetH, 0.06), insetMat);
  insetDown.position.set(PANEL_W / 2, PANEL_H * 0.26, PANEL_T / 2 + 0.03); doorPivot.add(insetDown);

  // Handle — metallic knob on the right side of the panel
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xccbb88, roughness: 0.25, metalness: 0.9 });
  const handleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 12), handleMat);
  handleBase.rotation.x = Math.PI / 2;
  handleBase.position.set(PANEL_W - 0.7, PANEL_H * 0.47, PANEL_T / 2 + 0.15);
  doorPivot.add(handleBase);
  const handleKnob = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), handleMat);
  handleKnob.position.set(PANEL_W - 0.7, PANEL_H * 0.47, PANEL_T / 2 + 0.4);
  doorPivot.add(handleKnob);

  // Hinges
  const hingeMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.8 });
  [PANEL_H * 0.2, PANEL_H * 0.8].forEach(hy => {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), hingeMat);
    hinge.position.set(0.1, hy, 0);
    doorPivot.add(hinge);
  });

  grp.add(doorPivot);

  // Sensor LED on the frame top-right
  const sensorLedMat = new THREE.MeshStandardMaterial({ color: 0x25a55a, emissive: 0x25a55a, emissiveIntensity: 0.6 });
  const sensorLed = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), sensorLedMat);
  sensorLed.position.set(DOOR_W / 2 - 0.1, DOOR_H - 0.5, FRAME_D / 2 + 0.1);
  grp.add(sensorLed);

  // Hit area for interaction
  const hit = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 2, DOOR_H + 2, 3), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, DOOR_H / 2, 0); grp.add(hit);

  grp.position.set(p.x, 0, p.z); grp.rotation.y = Math.PI / 2; scene.add(grp);
  devices3D.door = { mesh: sensorLed, pivot: doorPivot, frameMat: frameMat, _targetAngle: 0, _currentAngle: 0 };
  interactives.push({ mesh: hit, kind: 'door', tooltip: () => 'Porta d\'ingresso' });
  interactives.push({ mesh: panel, kind: 'door', tooltip: () => 'Porta d\'ingresso' });
}

// Motion sensor
{
  const p = pctPoint(10, 75);
  const grp = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x3d3d5c, emissive: 0x3d3d5c, emissiveIntensity: 0.3 }));
  orb.position.y = WALL_H - 1; orb.castShadow = true; grp.add(orb);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2a40 }));
  arm.position.y = WALL_H - 0.4; grp.add(arm);
  grp.position.set(p.x, 0, p.z); scene.add(grp);
  devices3D.motion = { mesh: orb };
}

// Camera Tapo C202
{
  const p = pctPoint(5, 95);
  const grp = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.4, metalness: 0.7 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.1, metalness: 0.5, emissive: 0x0044ff, emissiveIntensity: 0.4 });
  // Corpo camera
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2, 16), bodyMat);
  body.rotation.z = Math.PI / 2; body.position.y = WALL_H - 1.5; body.castShadow = true; grp.add(body);
  // Lente
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16), lensMat);
  lens.rotation.z = Math.PI / 2; lens.position.set(1.1, WALL_H - 1.5, 0); grp.add(lens);
  // Staffa
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), bodyMat);
  bracket.position.set(0, WALL_H - 0.6, 0); grp.add(bracket);
  // Hit area
  const hit = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = WALL_H - 1.5; grp.add(hit);
  grp.position.set(p.x, 0, p.z);
  grp.rotation.y = Math.PI;
  scene.add(grp);
  devices3D.tapoCamera = { lensMat };
  interactives.push({ mesh: hit, kind: 'tapoCamera', tooltip: () => 'Tapo C202 — clicca per stream' });
}

// Sprite Temp/Hum
const rcv = document.createElement('canvas'); rcv.width = 512; rcv.height = 280;
const rctx = rcv.getContext('2d');
const rtex = new THREE.CanvasTexture(rcv); rtex.colorSpace = THREE.SRGBColorSpace;
const rplane = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 10),
  new THREE.MeshBasicMaterial({ map: rtex, transparent: true, depthWrite: false })
);
rplane.rotation.x = -Math.PI / 2;
const rPos = pctPoint(34, 90); rplane.position.set(rPos.x, 0.12, rPos.z);
scene.add(rplane);
function updateReadoutSprite(temp, hum, lux) {
  rctx.clearRect(0, 0, rcv.width, rcv.height);
  rctx.shadowColor = 'rgba(0,0,0,0.7)'; rctx.shadowBlur = 12;
  rctx.textBaseline = 'top';
  // Luminosità con icona sole
  rctx.fillStyle = '#ffd166'; rctx.font = '700 56px Inter';
  rctx.textAlign = 'right';
  rctx.fillText((lux !== undefined ? lux : '—') + ' lux', rcv.width - 12, 4);
  rctx.font = '700 50px serif';
  rctx.fillText('☀️', rcv.width - 12 - rctx.measureText((lux !== undefined ? lux : '—') + ' lux').width - 60, 4);
  // Umidità con icona goccia
  rctx.fillStyle = '#64dfdf'; rctx.font = '700 68px Inter';
  rctx.textAlign = 'right';
  rctx.fillText(hum + '%', rcv.width - 12, 72);
  rctx.font = '700 60px serif';
  rctx.textAlign = 'right';
  rctx.fillText('💧', rcv.width - 12 - rctx.measureText(hum + '%').width - 80, 72);
  // Temperatura con termometro monocromo a sinistra
  rctx.fillStyle = '#adc6ff'; rctx.font = '800 96px Inter';
  rctx.textAlign = 'right';
  rctx.fillText(temp + '°', rcv.width - 12, 160);
  // Termometro disegnato a canvas (monocromo, stesso colore testo)
  const tempTextW = rctx.measureText(temp + '°').width;
  const tx = rcv.width - 12 - tempTextW - 60, ty = 160;
  const tw = 14, th = 70, tr = 14; // larghezza tubo, altezza, raggio bulbo
  rctx.fillStyle = '#adc6ff'; rctx.strokeStyle = '#adc6ff'; rctx.lineWidth = 2;
  // Tubo
  rctx.beginPath();
  rctx.roundRect(tx + 7, ty + 8, tw, th - tr - 8, tw / 2);
  rctx.fill();
  // Bulbo
  rctx.beginPath();
  rctx.arc(tx + 7 + tw / 2, ty + th, tr, 0, Math.PI * 2);
  rctx.fill();
  // Finestrella interna (sfondo scuro per contrasto)
  rctx.fillStyle = 'rgba(10,12,30,0.7)';
  rctx.beginPath();
  rctx.roundRect(tx + 10, ty + 10, tw - 6, th - tr - 14, (tw - 6) / 2);
  rctx.fill();
  rtex.needsUpdate = true;
}
updateReadoutSprite('—', '—', '—');

// Raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tooltipEl = document.getElementById('sceneTooltip');

function pickInteractive(cx, cy) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((cx - r.left) / r.width) * 2 - 1;
  pointer.y = -((cy - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const meshes = interactives.map(i => i.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return null;
  return interactives.find(i => i.mesh === hits[0].object) || null;
}
function showTooltip(text, cx, cy) {
  const r = wrap.getBoundingClientRect();
  tooltipEl.textContent = text;
  tooltipEl.style.left = (cx - r.left) + 'px';
  tooltipEl.style.top = (cy - r.top) + 'px';
  tooltipEl.classList.add('show');
}
function hideTooltip() { tooltipEl.classList.remove('show'); }

let downX = 0, downY = 0, dragging = false, lampPress = null;
canvas.addEventListener('pointerdown', e => {
  downX = e.clientX; downY = e.clientY; dragging = false;
  canvas.classList.add('dragging');
  const hit = pickInteractive(e.clientX, e.clientY);
  if (hit && hit.kind === 'lampada') {
    lampPress = setTimeout(() => {
      lampPress = null; dragging = true; hideTooltip();
      window.HA && window.HA.openLampModal && window.HA.openLampModal();
    }, 500);
  }
});
canvas.addEventListener('pointermove', e => {
  if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 4) dragging = true;
  if (e.pointerType !== 'touch') {
    const hit = pickInteractive(e.clientX, e.clientY);
    if (hit) { canvas.style.cursor = 'pointer'; showTooltip(hit.tooltip(), e.clientX, e.clientY); }
    else { canvas.style.cursor = 'grab'; hideTooltip(); }
  }
});
canvas.addEventListener('pointerup', e => {
  canvas.classList.remove('dragging');
  if (lampPress) { clearTimeout(lampPress); lampPress = null; }
  if (dragging) return;
  const hit = pickInteractive(e.clientX, e.clientY);
  if (!hit) return;
  switch (hit.kind) {
    case 'tv': window.HA && window.HA.toggleTV(); break;
    case 'lampada': window.HA && window.HA.toggleEntity('light.lampada'); break;
    case 'faretti': window.HA && window.HA.toggleEntity('switch.shelly1_vela'); break;
    case 'socket': window.HA && window.HA.toggleEntity('switch.shellypstripg4_e8f60a617f38_switch_' + hit.index); break;
    case 'boiler': window.HA && window.HA.toggleEntity('switch.ariston_power'); break;
    case 'washer': window.HA && window.HA.toggleEntity('switch.shellyplus1pm_4855199d6bb4_switch_0'); break;
    case 'fridge': window.HA && window.HA.toggleEntity('switch.shellyplus1pm_cc7b5c826c80'); break;
    case 'xiaomi': window.HA && window.HA.toggleEntity('light.yeelight_lamp15_0xeea0715'); break;
    case 'door': window.HA && window.HA.openDoorModal(); break;
    case 'tapoCamera': window.HA&&window.HA.openCameraModal&&window.HA.openCameraModal(); break;
  }
});
canvas.addEventListener('pointerleave', () => { hideTooltip(); canvas.classList.remove('dragging'); });
canvas.addEventListener('pointercancel', () => { if (lampPress) { clearTimeout(lampPress); lampPress = null; } });

function animateCamera(targetPos, targetLook, ms = 700) {
  const start = camera.position.clone(), startLook = controls.target.clone();
  const t0 = performance.now();
  function step(now) {
    const t = Math.min(1, (now - t0) / ms);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera.position.lerpVectors(start, targetPos, e);
    controls.target.lerpVectors(startLook, targetLook, e);
    controls.update();
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
document.getElementById('btnViewTop').addEventListener('click',
  () => animateCamera(new THREE.Vector3(W / 2, 200, D / 2 + 0.01), ROOM_CENTER));
document.getElementById('btnViewIso').addEventListener('click',
  () => animateCamera(new THREE.Vector3(W / 2 + 95, 105, D / 2 + 100), ROOM_CENTER));
document.getElementById('btnViewReset').addEventListener('click',
  () => animateCamera(DEFAULT_POS, ROOM_CENTER));
canvas.addEventListener('dblclick', () => animateCamera(DEFAULT_POS, ROOM_CENTER));
document.getElementById('btnAutoRotate').addEventListener('click', () => {
  controls._autoRotating = !controls._autoRotating;
  const btn = document.getElementById('btnAutoRotate');
  btn.style.background = controls._autoRotating ? 'rgba(75,142,255,0.3)' : '';
  btn.style.color = controls._autoRotating ? 'var(--primary)' : '';
  if (controls._autoRotating) controls.enablePan = false;
  else controls.enablePan = true;
});

function resize() {
  const w = wrap.clientWidth, h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(wrap); resize();

let frame = 0;
function animate() {
  frame++;
  if (devices3D.motion && devices3D.motion._active) {
    devices3D.motion.mesh.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(frame * 0.18);
    devices3D.motion.mesh.scale.setScalar(1 + 0.06 * Math.sin(frame * 0.18));
  }
  // TV screen animation — subtle color shifting & glow pulse
  if (devices3D.tv && devices3D.tv._tvOn) {
    const t = frame * 0.04;
    const r = 0.12 + 0.10 * Math.sin(t * 1.7);
    const g = 0.28 + 0.15 * Math.sin(t * 2.3 + 1.2);
    const b = 0.55 + 0.20 * Math.sin(t * 1.1 + 2.5);
    devices3D.tv.screenMat.emissive.setRGB(r, g, b);
    devices3D.tv.screenMat.emissiveIntensity = 1.5 + 1.0 * Math.sin(t * 3.1);
    devices3D.tv.glowMat.opacity = 0.12 + 0.06 * Math.sin(t * 2.0 + 0.8);
    if (devices3D.tv.ambient) devices3D.tv.ambient.intensity = 1.8 + 0.4 * Math.sin(t * 2.5);
    devices3D.tv.spot.intensity = 8 + 6 * Math.sin(t * 1.5);
    devices3D.tv.spot.color.setRGB(r * 2, g * 1.5, b * 1.2);
  }
  if (devices3D.washer && devices3D.washer._spinning) {
    devices3D.washer.doorMat.emissiveIntensity = 0.5 + 0.3 * Math.sin(frame * 0.25);
  }
  // Animate door pivot smoothly
  if (devices3D.door && devices3D.door.pivot) {
    const diff = devices3D.door._targetAngle - devices3D.door._currentAngle;
    if (Math.abs(diff) > 0.005) {
      devices3D.door._currentAngle += diff * 0.06;
      devices3D.door.pivot.rotation.y = devices3D.door._currentAngle;
    }
  }
  if (controls._autoRotating) {
    controls.target.copy(ROOM_CENTER);
    const dx = camera.position.x - ROOM_CENTER.x;
    const dz = camera.position.z - ROOM_CENTER.z;
    const r = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz) + 0.0003;
    camera.position.x = ROOM_CENTER.x + Math.sin(angle) * r;
    camera.position.z = ROOM_CENTER.z + Math.cos(angle) * r;
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
document.getElementById('sceneLoading').classList.add('hidden');

function kelvinToRGB(k) {
  k = Math.max(1000, Math.min(40000, k)) / 100;
  let r, g, b;
  if (k <= 66) { r = 255; g = 99.4708 * Math.log(k) - 161.1196; }
  else { r = 329.6987 * Math.pow(k - 60, -0.1332); g = 288.1222 * Math.pow(k - 60, -0.0755); }
  if (k >= 66) b = 255;
  else if (k <= 19) b = 0;
  else b = 138.5177 * Math.log(k - 10) - 305.0448;
  return { r: Math.max(0, Math.min(255, r)) / 255, g: Math.max(0, Math.min(255, g)) / 255, b: Math.max(0, Math.min(255, b)) / 255 };
}

window.update3D = function (states) {
  const tvSt = states['media_player.sony_2']?.state;
  // Many HA media players use 'playing', 'paused', 'idle' when on
  const tvOn = tvSt && tvSt !== 'off' && tvSt !== 'unavailable';
  if (devices3D.tv) {
    devices3D.tv._tvOn = tvOn;
    if (!tvOn) {
      devices3D.tv.screenMat.emissive.setHex(0x000000);
      devices3D.tv.screenMat.emissiveIntensity = 0;
      devices3D.tv.glowMat.opacity = 0;
      devices3D.tv.spot.intensity = 0;
      if (devices3D.tv.ambient) devices3D.tv.ambient.intensity = 0;
    } else {
      devices3D.tv.screenMat.emissive.setHex(0x3a6abf);
      devices3D.tv.screenMat.emissiveIntensity = 1.5;
      devices3D.tv.glowMat.opacity = 0.12;
      devices3D.tv.spot.intensity = 2.5;
      if (devices3D.tv.ambient) devices3D.tv.ambient.intensity = 1.8;
    }
  }
  const lampSt = states['light.lampada']?.state;
  const bright = states['light.lampada']?.attributes?.brightness || 0;
  const tempK = states['light.lampada']?.attributes?.color_temp_kelvin || 3200;
  if (devices3D.lampada) {
    const on = lampSt === 'on', f = bright / 255, c = kelvinToRGB(tempK);
    devices3D.lampada.bulbMat.color.setRGB(on ? c.r : 0.2, on ? c.g : 0.1, on ? c.b : 0.05);
    devices3D.lampada.shadeMat.emissive.setRGB(c.r, c.g, c.b);
    devices3D.lampada.shadeMat.emissiveIntensity = on ? (0.4 + f * 0.8) : 0;
    devices3D.lampada.light.color.setRGB(c.r, c.g, c.b);
    devices3D.lampada.light.intensity = on ? 30 + f * 60 : 0;
  }
  const fOn = states['switch.shelly1_vela']?.state === 'on';
  if (devices3D.faretti) devices3D.faretti.forEach(f => {
    f.lensMat.emissiveIntensity = fOn ? 1.0 : 0;
    f.ringMat.emissiveIntensity = fOn ? 0.8 : 0;
    f.light.intensity = fOn ? 55 : 0;
  });

  if (devices3D.xiaomiLight) {
    const xOn = states['light.yeelight_lamp15_0xeea0715']?.state === 'on';
    devices3D.xiaomiLight.bulbMat.color.setHex(xOn ? 0xffffff : 0x222222);
    devices3D.xiaomiLight.light.intensity = xOn ? 25 : 0;
  }
  const boilerP = parseFloat(states['sensor.shellyplus1pm_4855199a166c_switch_0_power']?.state) || 0;
  if (devices3D.boiler) {
    devices3D.boiler.ledMat.emissiveIntensity = boilerP > 100 ? 0.9 : 0;
  }
  // Frigo — LED verde standby, ciano pulsante se compressore attivo (>5W)
  if (devices3D.fridge) {
    const fridgeP3 = parseFloat(states['sensor.shellyplus1pm_cc7b5c826c80_potenza']?.state) || 0;
    const fridgeOn = states['switch.shellyplus1pm_cc7b5c826c80']?.state === 'on';
    if (!fridgeOn) {
      devices3D.fridge.ledMat.color.setHex(0x333333);
      devices3D.fridge.ledMat.emissive.setHex(0x000000);
      devices3D.fridge.ledMat.emissiveIntensity = 0;
      devices3D.fridge.glow.intensity = 0;
    } else if (fridgeP3 > 5) {
      // Compressore attivo — ciano pulsante
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 250);
      devices3D.fridge.ledMat.color.setHex(0x00ccff);
      devices3D.fridge.ledMat.emissive.setHex(0x00ccff);
      devices3D.fridge.ledMat.emissiveIntensity = 0.6 + 0.4 * pulse;
      devices3D.fridge.glow.intensity = 1.5 * pulse;
      devices3D.fridge.glow.color.setHex(0x00aaff);
    } else {
      // Standby — verde fisso
      devices3D.fridge.ledMat.color.setHex(0x00cc44);
      devices3D.fridge.ledMat.emissive.setHex(0x00cc44);
      devices3D.fridge.ledMat.emissiveIntensity = 0.5;
      devices3D.fridge.glow.intensity = 0;
    }
  }
  // Sprite info scaldabagno
  if (devices3D.boiler && devices3D.boiler.updateSprite) {
    const bTemp = states['sensor.ariston_proc_req_temp']?.state;
    const bShow = states['sensor.ariston_average_showers']?.state;
    devices3D.boiler.updateSprite(bTemp || '—', bShow || '—');
  }
  const washSt = states['switch.shellyplus1pm_4855199d6bb4_switch_0']?.state;
  const washP = parseFloat(states['sensor.shellyplus1pm_4855199d6bb4_switch_0_power']?.state) || 0;
  if (devices3D.washer) {
    if (washSt !== 'on') {
      devices3D.washer._spinning = false;
      devices3D.washer.doorMat.emissive.setHex(0x000000);
      devices3D.washer.doorMat.emissiveIntensity = 0;
    } else if (washP > 10) {
      devices3D.washer._spinning = true;
      devices3D.washer.doorMat.emissive.setHex(0x4b8eff);
    } else {
      devices3D.washer._spinning = false;
      devices3D.washer.doorMat.emissive.setHex(0x64dfdf);
      devices3D.washer.doorMat.emissiveIntensity = 0.5;
    }
  }
  if (devices3D.sockets) devices3D.sockets.forEach((s, i) => {
    const sw = states['switch.shellypstripg4_e8f60a617f38_switch_' + i]?.state;
    const p = parseFloat(states['sensor.shellypstripg4_e8f60a617f38_switch_' + i + '_potenza']?.state) || 0;
    let col, intensity;
    if (sw !== 'on') { col = 0x3d3d5c; intensity = 0.25; }
    else if (p < 50) { col = 0x66dd8b; intensity = 1.3; }
    else if (p < 200) { col = 0xffb874; intensity = 1.3; }
    else { col = 0xff6b6b; intensity = 1.5; }
    s.ledMat.emissive.setHex(col);
    s.ledMat.emissiveIntensity = intensity;
  });
  if (devices3D.door) {
    const open = states['binary_sensor.shelly_blu_door_window_8cd3_window']?.state === 'on';
    // Sensor LED color
    devices3D.door.mesh.material.color.setHex(open ? 0xff6b6b : 0x25a55a);
    devices3D.door.mesh.material.emissive.setHex(open ? 0xff6b6b : 0x25a55a);
    devices3D.door.mesh.material.emissiveIntensity = open ? 1.0 : 0.5;
    // Frame glow
    if (devices3D.door.frameMat) {
      devices3D.door.frameMat.emissive.setHex(open ? 0xff3b3b : 0x25a55a);
      devices3D.door.frameMat.emissiveIntensity = open ? 0.3 : 0.15;
    }
    // Door panel animation target angle (positive to open inwards)
    devices3D.door._targetAngle = open ? Math.PI * 0.45 : 0;
  }
  if (devices3D.motion) {
    const active = states['binary_sensor.hub3_063d']?.state === 'on';
    devices3D.motion._active = active;
    if (!active) {
      devices3D.motion.mesh.material.emissive.setHex(0x3d3d5c);
      devices3D.motion.mesh.material.emissiveIntensity = 0.3;
      devices3D.motion.mesh.scale.setScalar(1);
    } else {
      devices3D.motion.mesh.material.emissive.setHex(0x64dfdf);
    }
  }
  const t = states['sensor.hub3_063d_temperatura']?.state;
  const h = states['sensor.hub3_063d_umidita']?.state;
  const l = states['sensor.hub3_063d_illuminamento']?.state;
  updateReadoutSprite(
    t && t !== 'unavailable' ? t : '—',
    h && h !== 'unavailable' ? h : '—',
    l && l !== 'unavailable' ? l : '—'
  );
};
