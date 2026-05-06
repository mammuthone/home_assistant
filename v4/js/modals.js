// modals.js — lampada, porta, camera Tapo
import { HA_LL_TOKEN, HA_BASE_URL, CAM_ENTITY } from './config.js';
import { callService, getState, getAttr, setToggle } from './ha.js';

// ─── LAMPADA ───────────────────────────────────────────────
export function openLampModal() {
  const lampState = getState('light.lampada');
  const bright    = getAttr('light.lampada', 'brightness') || 128;
  document.getElementById('modalLampState').textContent = lampState === 'on' ? 'Accesa' : 'Spenta';
  setToggle('modalToggleLampada', lampState === 'on');
  document.getElementById('modalSliderBright').value = bright;
  document.getElementById('modalBrightVal').textContent = Math.round(bright / 255 * 100) + '%';
  document.getElementById('lampModal').classList.add('open');
}
export function closeLampModal() { document.getElementById('lampModal').classList.remove('open'); }

// ─── PORTA ────────────────────────────────────────────────
export function openDoorModal() {
  const isOpen = getState('binary_sensor.shelly_blu_door_window_8cd3_window') === 'on';
  document.getElementById('doorCurrentState').textContent = isOpen ? 'Aperta' : 'Chiusa';
  document.getElementById('doorCurrentDot').className = 'door-log-dot ' + (isOpen ? 'open' : 'close');
  document.getElementById('doorModal').classList.add('open');

  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  fetch(`${HA_BASE_URL}/api/history/period/${since}?filter_entity_id=binary_sensor.shelly_blu_door_window_8cd3_window&minimal_response=true`,
    { headers: { Authorization: `Bearer ${HA_LL_TOKEN}` } })
    .then(r => r.json())
    .then(data => {
      const list = document.getElementById('doorLogList');
      while (list.firstChild) list.removeChild(list.firstChild);
      const events = (data[0] || []).slice().reverse();
      if (!events.length) { list.textContent = 'Nessun evento'; return; }
      events.forEach(ev => {
        const open = ev.state === 'on';
        const d    = new Date(ev.last_changed);
        const time = d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit' }) + ' ' +
                     d.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
        const row  = document.createElement('div');
        row.className = 'door-log-entry';
        const dot  = document.createElement('div');  dot.className = `door-log-dot ${open ? 'open' : 'close'}`;
        const ts   = document.createElement('span'); ts.className  = 'door-log-time';  ts.textContent = time;
        const lbl  = document.createElement('span'); lbl.className = 'door-log-label'; lbl.textContent = open ? 'Aperta' : 'Chiusa';
        row.appendChild(dot); row.appendChild(ts); row.appendChild(lbl);
        list.appendChild(row);
      });
    });
}
export function closeDoorModal() { document.getElementById('doorModal').classList.remove('open'); }

// ─── CAMERA TAPO ─────────────────────────────────────────
let _camPollInterval = null;

async function fetchCameraSnapshot() {
  try {
    const res = await fetch(`${HA_BASE_URL}/api/camera_proxy/${CAM_ENTITY}`,
      { headers: { Authorization: `Bearer ${HA_LL_TOKEN}` } });
    if (!res.ok) throw new Error(res.status);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const img  = document.getElementById('cameraStream');
    const old  = img.src;
    img.src = url; img.style.display = 'block';
    document.getElementById('cameraStreamError').style.display = 'none';
    if (old.startsWith('blob:')) URL.revokeObjectURL(old);
  } catch { document.getElementById('cameraStreamError').textContent = 'Stream non disponibile'; }
}

export function openCameraModal() {
  const motion = getState('binary_sensor.tapo_c202_01fe_motion_alarm');
  document.getElementById('cameraMotionBadge').textContent = motion === 'on' ? '🔴 Movimento' : '🟢 Nessun movimento';
  document.getElementById('cameraModal').style.display = 'flex';
  fetchCameraSnapshot();
  _camPollInterval = setInterval(fetchCameraSnapshot, 1000);
}

export function closeCameraModal() {
  clearInterval(_camPollInterval);
  const img = document.getElementById('cameraStream');
  if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  img.src = ''; img.style.display = 'none';
  document.getElementById('cameraModal').style.display = 'none';
}

// ─── INIT ─────────────────────────────────────────────────
export function initModals() {
  const on = (id, ev, fn) => document.getElementById(id)?.addEventListener(ev, fn);
  const closeOnOverlay = (id, fn) => document.getElementById(id)?.addEventListener('click', e => { if (e.target === document.getElementById(id)) fn(); });

  on('modalToggleLampada', 'click', () => {
    callService('homeassistant', 'toggle', { entity_id: 'light.lampada' });
    setTimeout(() => {
      const s = getState('light.lampada');
      document.getElementById('modalLampState').textContent = s === 'on' ? 'Accesa' : 'Spenta';
      setToggle('modalToggleLampada', s === 'on');
    }, 400);
  });
  on('modalSliderBright', 'input',  function() { document.getElementById('modalBrightVal').textContent = Math.round(this.value/255*100)+'%'; });
  on('modalSliderBright', 'change', function() { callService('light','turn_on',{entity_id:'light.lampada',brightness:parseInt(this.value)}); });
  on('modalCloseLamp',    'click',  closeLampModal);
  closeOnOverlay('lampModal', closeLampModal);

  on('modalCloseDoor', 'click', closeDoorModal);
  closeOnOverlay('doorModal', closeDoorModal);

  on('modalCloseCamera', 'click', closeCameraModal);
  closeOnOverlay('cameraModal', closeCameraModal);
  on('btnCamPrivacy', 'click', () => { const on = getState('switch.tapo_c202_01fe_privacy') === 'on'; callService('switch', on?'turn_off':'turn_on', {entity_id:'switch.tapo_c202_01fe_privacy'}); });
  on('btnCamLed',     'click', () => { const on = getState('switch.tapo_c202_01fe_indicator_led') === 'on'; callService('switch', on?'turn_off':'turn_on', {entity_id:'switch.tapo_c202_01fe_indicator_led'}); });
  on('btnCamAlarm',   'click', () => callService('button','press',{entity_id:'button.tapo_c202_01fe_manual_alarm_start'}));
  on('btnCamReboot',  'click', () => callService('button','press',{entity_id:'button.tapo_c202_01fe_reboot'}));
}
