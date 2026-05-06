// app.js — entry point, orchestra tutti i moduli
import { onUpdate, states, getState, getAttr, callService, setToggle, toggleEntity, playSwitch } from './ha.js';
import { initCarousel } from './carousel.js';
import { initCalendar, loadTodoItems, renderCal, allItems } from './calendar.js';
import { initModals, openLampModal, openDoorModal, openCameraModal } from './modals.js';
import { AC_ENTITY } from './config.js';

// ─── DATA / DATE ──────────────────────────────────────────
(function updateDate() {
  const d = new Date();
  const days   = ['Domenica','Lunedi','Martedi','Mercoledi','Giovedi','Venerdi','Sabato'];
  const months = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const el = document.getElementById('dateDisplay');
  if (el) el.textContent = `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
})();

// ─── HELPERS UI ───────────────────────────────────────────
function buildDeviceRow(name, icon, batt) {
  const row = document.createElement('div'); row.className = 'device-row';
  const info = document.createElement('div'); info.className = 'device-info';
  const ico  = document.createElement('div'); ico.className = 'device-icon';
  const sp   = document.createElement('span'); sp.className = 'material-symbols-outlined'; sp.textContent = icon;
  ico.appendChild(sp);
  const txt  = document.createElement('div');
  const nm   = document.createElement('div'); nm.className = 'device-name';  nm.textContent = name;
  const st   = document.createElement('div'); st.className = 'device-state'; st.textContent = batt + '%';
  txt.appendChild(nm); txt.appendChild(st);
  info.appendChild(ico); info.appendChild(txt); row.appendChild(info);
  const bar = document.createElement('div');
  bar.style.cssText = `width:60px;height:6px;border-radius:3px;background:rgba(255,255,255,0.1);overflow:hidden;`;
  const fill = document.createElement('div');
  fill.style.cssText = `height:100%;width:${batt}%;background:${batt<20?'var(--red)':batt<50?'var(--orange)':'var(--green)'};border-radius:3px;`;
  bar.appendChild(fill); row.appendChild(bar);
  return row;
}

// ─── UPDATE UI ────────────────────────────────────────────
function updateUI() {
  // Meteo
  const w = getState('weather.forecast_casa');
  const wAttr = states['weather.forecast_casa']?.attributes;
  const wTemp = wAttr?.temperature;
  const wMap = { 'partlycloudy':'Parzialmente nuvoloso','sunny':'Soleggiato','cloudy':'Nuvoloso','rainy':'Pioggia','snowy':'Neve','windy':'Ventoso','fog':'Nebbia','lightning-rainy':'Temporale','clear-night':'Sereno' };
  const weatherEl = document.getElementById('weatherState');
  if (weatherEl) weatherEl.textContent = (wMap[w] || w) + (wTemp ? ' · ' + wTemp + '°C' : '');

  // Sensori
  const temp = getState('sensor.hub3_063d_temperatura');
  const hum  = getState('sensor.hub3_063d_umidita');
  const lux  = getState('sensor.hub3_063d_illuminamento');
  const el = id => document.getElementById(id);
  if (el('badgeTemp')) el('badgeTemp').textContent = temp !== 'unavailable' ? temp + '°C' : '—°C';
  if (el('badgeHum'))  el('badgeHum').textContent  = hum  !== 'unavailable' ? hum  + '%'  : '—%';
  if (el('badgeLux'))  el('badgeLux').textContent  = lux  !== 'unavailable' ? lux  + ' lux' : '— lux';

  // TV
  const tvState = getState('media_player.sony_2');
  if (el('tvState')) el('tvState').textContent = tvState === 'off' ? 'Spento' : tvState === 'idle' ? 'Idle' : tvState;
  setToggle('toggleTV', tvState !== 'off');

  // Lampada
  const lampState = getState('light.lampada');
  const bright    = getAttr('light.lampada','brightness') || 0;
  if (el('lampadaState')) el('lampadaState').textContent = lampState === 'on' ? 'Accesa' : 'Spenta';
  setToggle('toggleLampada', lampState === 'on');
  if (el('sliderLampada')) el('sliderLampada').value = bright;

  // Faretti
  const farState = getState('switch.shelly1_vela');
  if (el('farettiState')) el('farettiState').textContent = farState === 'on' ? 'Accesi' : 'Spenti';
  setToggle('toggleFaretti', farState === 'on');

  // Energia Strip G4
  const outs = [0,1,2,3].map(i => parseFloat(getState('sensor.shellypstripg4_e8f60a617f38_switch_'+i+'_potenza')) || 0);
  const boilerP = parseFloat(getState('sensor.shellyplus1pm_4855199a166c_switch_0_power')) || 0;
  const washP   = parseFloat(getState('sensor.shellyplus1pm_4855199d6bb4_switch_0_power')) || 0;
  const fridgeP = parseFloat(getState('sensor.shellyplus1pm_cc7b5c826c80_potenza')) || 0;
  const total   = outs.reduce((a,b)=>a+b,0) + boilerP + washP + fridgeP;
  const arc = 326.7, pct = Math.min(total/3500,1);
  const gc = pct<0.5?'var(--green)':pct<0.8?'var(--orange)':'var(--red)';
  const ring = document.getElementById('powerRing');
  if (ring) { ring.style.strokeDashoffset = arc*(1-pct); ring.style.stroke = gc; }
  const pn = document.getElementById('powerNum');
  if (pn) { pn.textContent = total.toFixed(0); pn.style.color = gc; }
  outs.forEach((v,i) => {
    const sw = getState('switch.shellypstripg4_e8f60a617f38_switch_'+i);
    const isOn = sw === 'on';
    const outEl = el('out'+i);
    if (outEl) { outEl.textContent = v.toFixed(1)+'W'; outEl.style.color = !isOn?'var(--text-muted)':v>0?'var(--green)':'var(--cyan)'; }
    setToggle('toggleOut'+i, isOn);
  });

  // Scaldabagno
  const boilerSw = getState('switch.ariston_power');
  if (el('boilerPower'))      el('boilerPower').textContent = boilerP.toFixed(0)+'W';
  if (el('boilerPowerState')) el('boilerPowerState').textContent = boilerSw!=='on'?'Spento':boilerP>100?'In riscaldamento':'Standby';
  setToggle('toggleBoilerPower',  boilerSw === 'on');
  setToggle('toggleBoilerEnergy', getState('switch.shellyplus1pm_4855199a166c_switch_0') === 'on');
  const bt = getState('sensor.ariston_proc_req_temp');
  const bm = getState('water_heater.scaldabagno');
  const sc = getState('sensor.ariston_average_showers');
  const al = getState('switch.ariston_anti_legionella');
  if (el('boilerTemp')) el('boilerTemp').textContent = (bt!=='unavailable'?bt:'—')+'°';
  if (el('boilerMode')) el('boilerMode').textContent = bm!=='unavailable'?bm:'—';
  if (el('showers'))    el('showers').textContent    = sc!=='unavailable'?sc:'—';
  if (el('antiLeg'))    el('antiLeg').textContent    = al==='on'?'ON':'OFF';
  setToggle('toggleEco',         getState('switch.ariston_eco_mode') === 'on');
  setToggle('toggleBoilerPower2', boilerSw === 'on');
  setToggle('toggleAntiLeg',     al === 'on');
  const tv2 = parseFloat(bt)||0;
  const arc2 = 326.7;
  const tempRing = document.getElementById('tempRing');
  if (tempRing) tempRing.style.strokeDashoffset = arc2 - (tv2/80)*arc2;

  // Lavatrice
  const washerSw = getState('switch.shellyplus1pm_4855199d6bb4_switch_0');
  if (el('washerState')) el('washerState').textContent = washerSw!=='on'?'Spenta':washP>10?'In funzione':'Standby';
  if (el('washerPower')) { el('washerPower').textContent = washP.toFixed(0)+'W'; el('washerPower').style.color = washerSw!=='on'?'var(--text-muted)':washP>10?'var(--primary)':'var(--cyan)'; }
  setToggle('toggleWasherEnergy', washerSw === 'on');

  // Frigo
  const fridgeSw = getState('switch.shellyplus1pm_cc7b5c826c80');
  if (el('fridgePower')) el('fridgePower').textContent = fridgeP.toFixed(0)+'W';
  if (el('fridgeState')) el('fridgeState').textContent = fridgeSw!=='on'?'Spento':fridgeP>5?'In raffreddamento':'In pausa';
  setToggle('toggleFridgePower', fridgeSw === 'on');

  // Sicurezza
  const door = getState('binary_sensor.shelly_blu_door_window_8cd3_window');
  const motion = getState('binary_sensor.hub3_063d');
  const sensorBatt = getState('sensor.shelly_blu_door_window_8cd3_battery');
  if (el('doorBadge'))       el('doorBadge').textContent       = door==='on'?'Aperta':'Chiusa';
  if (el('motionBadge'))     el('motionBadge').textContent     = motion==='on'?'Rilevato':'Clear';
  if (el('luxBadge'))        el('luxBadge').textContent        = lux!=='unavailable'?lux+' lux':'—';
  if (el('sensorBattBadge')) el('sensorBattBadge').textContent = sensorBatt+'%';
  if (el('sensorBattState')) el('sensorBattState').textContent = sensorBatt+'%';

  // Camera 2 / Yeelight
  const xiaomiSt = getState('light.yeelight_lamp15_0xeea0715');
  if (el('xiaomiLightState')) el('xiaomiLightState').textContent = xiaomiSt==='on'?'Accesa':'Spenta';
  setToggle('toggleXiaomiLight', xiaomiSt === 'on');

  // Persona
  const ps = getState('person.igor');
  if (el('personState')) el('personState').textContent = ps==='home'?'In casa':ps;
  if (el('personDot'))   el('personDot').style.background = ps==='home'?'var(--green)':'var(--red)';

  // Dispositivi (batterie)
  const devices = [
    {name:'Pixel 8a',     entity:'sensor.pixel_8a_battery_level',      icon:'smartphone'},
    {name:'Pixel 8 Pro',  entity:'sensor.pixel_8_pro_battery_level',    icon:'smartphone'},
    {name:'Pixel 8',      entity:'sensor.pixel_8_battery_level',        icon:'smartphone'},
    {name:'iPad di Davide',entity:'sensor.ipad_di_davide_battery_level',icon:'tablet_mac'},
  ];
  const dc = document.getElementById('devicesContainer');
  if (dc) {
    while (dc.firstChild) dc.removeChild(dc.firstChild);
    devices.forEach(d => dc.appendChild(buildDeviceRow(d.name, d.icon, parseInt(getState(d.entity)) || 0)));
  }

  // Condizionatore
  updateACCard();

  // Screen2 stati Shelly
  if (el('s2Lavatrice'))   el('s2Lavatrice').textContent   = washerSw==='on'?'Accesa':'Spenta';
  if (el('s2Scaldabagno')) el('s2Scaldabagno').textContent = boilerSw==='on'?'Acceso':'Spento';
  if (el('s2Frigo'))       el('s2Frigo').textContent       = fridgeSw==='on'?'Acceso':'Spento';

  // 3D scene
  if (window.update3D) window.update3D(states);
}

// ─── CONDIZIONATORE ──────────────────────────────────────
const modeIcons  = {cool:'ac_unit',heat:'local_fire_department',fan_only:'mode_fan',auto:'thermostat',dry:'water_drop',off:'power_settings_new'};
const modeLabels = {cool:'Freddo',heat:'Caldo',fan_only:'Ventola',auto:'Auto',dry:'Deumidifica',off:'Spento'};

function updateACCard() {
  const ac = states[AC_ENTITY];
  const card = document.getElementById('cardAC');
  if (!card) return;
  card.style.opacity = ac ? '1' : '0.4';
  if (!ac) return;
  const isOn = ac.state !== 'off' && ac.state !== 'unavailable';
  setToggle('toggleAC', isOn);
  const mode = isOn ? ac.state : 'off';
  const iconEl = document.getElementById('acModeIcon');
  if (iconEl) { iconEl.textContent = modeIcons[mode] || 'ac_unit'; iconEl.style.color = mode==='heat'?'var(--orange)':'var(--cyan)'; }
  const modeEl = document.getElementById('acModeLabel');
  if (modeEl) modeEl.textContent = modeLabels[mode] || mode;
  const t = ac.attributes?.temperature || 22;
  const tempEl = document.getElementById('acTempDisplay');
  if (tempEl) tempEl.textContent = t + '°';
  const slider = document.getElementById('sliderACTemp');
  if (slider) slider.value = t;
  const sliderVal = document.getElementById('acTempSliderVal');
  if (sliderVal) sliderVal.textContent = t + '°';
  document.querySelectorAll('.ac-mode-btn').forEach(b => b.classList.remove('active','heat'));
  if (mode==='cool') document.getElementById('btnACCool')?.classList.add('active');
  else if (mode==='heat') { document.getElementById('btnACHeat')?.classList.add('active','heat'); }
  else if (mode==='fan_only') document.getElementById('btnACFan')?.classList.add('active');
  const fan = ac.attributes?.fan_mode || 'auto';
  document.querySelectorAll('.ac-fan-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.ac-fan-btn[data-fan="${fan}"]`)?.classList.add('active');
}

// ─── INIT EVENT LISTENERS ────────────────────────────────
function initListeners() {
  const on = (id, ev, fn) => document.getElementById(id)?.addEventListener(ev, fn);

  // TV
  on('toggleTV', 'click', () => {
    playSwitch();
    const isOn = getState('media_player.sony_2') !== 'off';
    callService('remote', isOn?'turn_off':'turn_on', {entity_id:'remote.sony_kd_55xf9005'});
  });

  // Lampada
  on('toggleLampada', 'click', () => { playSwitch(); openLampModal(); });
  on('sliderLampada', 'change', function() { callService('light','turn_on',{entity_id:'light.lampada',brightness:parseInt(this.value)}); });

  // Faretti / switches
  on('toggleFaretti',      'click', () => toggleEntity('switch.shelly1_vela'));
  on('toggleBoilerPower',  'click', () => toggleEntity('switch.ariston_power'));
  on('toggleBoilerEnergy', 'click', () => toggleEntity('switch.shellyplus1pm_4855199a166c_switch_0'));
  on('toggleWasherEnergy', 'click', () => toggleEntity('switch.shellyplus1pm_4855199d6bb4_switch_0'));
  on('toggleFridgePower',  'click', () => toggleEntity('switch.shellyplus1pm_cc7b5c826c80'));
  on('toggleEco',          'click', () => toggleEntity('switch.ariston_eco_mode'));
  on('toggleAntiLeg',      'click', () => toggleEntity('switch.ariston_anti_legionella'));
  on('toggleXiaomiLight',  'click', () => toggleEntity('light.yeelight_lamp15_0xeea0715'));
  [0,1,2,3].forEach(i => on('toggleOut'+i, 'click', () => toggleEntity('switch.shellypstripg4_e8f60a617f38_switch_'+i)));

  // Condizionatore
  on('toggleAC', 'click', () => {
    const isOn = getState(AC_ENTITY) !== 'off';
    callService('climate', isOn?'turn_off':'turn_on', {entity_id:AC_ENTITY});
  });
  on('sliderACTemp', 'input',  function() { const v=document.getElementById('acTempSliderVal'); if(v) v.textContent=this.value+'°'; });
  on('sliderACTemp', 'change', function() { callService('climate','set_temperature',{entity_id:AC_ENTITY,temperature:parseFloat(this.value)}); });
  document.querySelectorAll('.ac-mode-btn').forEach(btn =>
    btn.addEventListener('click', () => callService('climate','set_hvac_mode',{entity_id:AC_ENTITY,hvac_mode:btn.dataset.mode})));
  document.querySelectorAll('.ac-fan-btn').forEach(btn =>
    btn.addEventListener('click', () => callService('climate','set_fan_mode',{entity_id:AC_ENTITY,fan_mode:btn.dataset.fan})));

  // Home cinema / automazioni
  on('btnCinema',     'click', () => callService('scene','turn_on',{entity_id:'scene.home_cinema'}));
  on('btnBuonanotte', 'click', () => callService('automation','trigger',{entity_id:'automation.buonanotte'}));
  on('btnAccendi',    'click', () => callService('automation','trigger',{entity_id:'automation.new_automation'}));
  on('btnSpegni',     'click', () => callService('automation','trigger',{entity_id:'automation.new_automation2'}));

  // Screen2 bottoni
  on('s2BtnBuonanotte', 'click', () => callService('automation','trigger',{entity_id:'automation.buonanotte'}));
  on('s2BtnAccendi',    'click', () => callService('automation','trigger',{entity_id:'automation.new_automation'}));
  on('s2BtnSpegni',     'click', () => callService('automation','trigger',{entity_id:'automation.new_automation2'}));
}

// ─── BOOT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCarousel();
  initModals();
  initCalendar();
  initListeners();
  onUpdate(updateUI);

  // Esponi openLampModal/openDoorModal/openCameraModal per la scena 3D
  window.HA.openLampModal   = openLampModal;
  window.HA.openDoorModal   = openDoorModal;
  window.HA.openCameraModal = openCameraModal;
});
