// ha.js — WebSocket Home Assistant connection
import { HA_LL_TOKEN, HA_WS_URL } from './config.js';

let ws = null;
let msgId = 1;
export let states = {};
const pendingCallbacks = {};
let authFailed = false;
let _updateUI = null;

export function onUpdate(fn) { _updateUI = fn; }

export function send(type, data, cb) {
  const id = msgId++;
  if (cb) pendingCallbacks[id] = cb;
  ws.send(JSON.stringify(Object.assign({ id, type }, data)));
}

export function callService(domain, service, serviceData) {
  send('call_service', { domain, service, service_data: serviceData });
}

export function getState(id) {
  return states[id] ? states[id].state : 'unavailable';
}

export function getAttr(id, attr) {
  return states[id]?.attributes?.[attr] ?? null;
}

export function toggleEntity(id) {
  playSwitch();
  callService('homeassistant', 'toggle', { entity_id: id });
}

export function setToggle(id, on) {
  const el = document.getElementById(id);
  if (el) el.className = 'toggle' + (on ? ' on' : '');
}

// Audio feedback
let _audioCtx = null;
export function playSwitch() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) { const t = i / ctx.sampleRate; d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 280) * 0.9; }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    src.connect(gain); gain.connect(ctx.destination); src.start();
  } catch (e) {}
}

function connect() {
  if (authFailed) return;
  ws = new WebSocket(HA_WS_URL);

  ws.onmessage = function(evt) {
    const msg = JSON.parse(evt.data);

    if (msg.type === 'auth_required') {
      ws.send(JSON.stringify({ type: 'auth', access_token: HA_LL_TOKEN }));

    } else if (msg.type === 'auth_ok') {
      const el = document.getElementById('connStatus');
      if (el) { el.className = 'conn-status connected'; el.textContent = 'Connesso'; }
      send('subscribe_events', { event_type: 'state_changed' });
      send('get_states', {}, result => {
        for (let i = 0; i < result.length; i++) states[result[i].entity_id] = result[i];
        if (_updateUI) _updateUI();
      });

    } else if (msg.type === 'auth_invalid') {
      authFailed = true;
      const el = document.getElementById('connStatus');
      if (el) { el.className = 'conn-status disconnected'; el.textContent = 'Token non valido'; }

    } else if (msg.type === 'result' && msg.success && pendingCallbacks[msg.id]) {
      pendingCallbacks[msg.id](msg.result);
      delete pendingCallbacks[msg.id];

    } else if (msg.type === 'event' && msg.event?.event_type === 'state_changed') {
      const d = msg.event.data;
      if (d.new_state) { states[d.entity_id] = d.new_state; if (_updateUI) _updateUI(); }
    }
  };

  ws.onclose = function() {
    const el = document.getElementById('connStatus');
    if (el) { el.className = 'conn-status disconnected'; el.textContent = 'Disconnesso'; }
    if (!authFailed) setTimeout(connect, 5000);
  };

  ws.onerror = () => ws.close();
}

connect();

// Esponi globalmente per compatibilità con scene.js e carousel
window.HA = {
  callService, toggleEntity, getState, getAttr,
  get states() { return states; },
  send(type, data, cb) { send(type, data, cb); }
};
