// config.js — costanti globali
export const HA_LL_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiN2ZmNTM5NTYyMTE0OTZmYmQ2YTAzYTNkMDliZWMwNyIsImlhdCI6MTc3ODAxODI4MCwiZXhwIjoyMDkzMzc4MjgwfQ.aSMESzt9GYiY_lf-KKrKEl5v6dkKs0AKJevTRehk8Dw';

export const HA_WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') +
  (location.hostname && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1'
    ? location.host : '192.168.1.3:8123') + '/api/websocket';

export const HA_BASE_URL = (location.hostname && location.hostname !== 'localhost'
  ? location.protocol + '//' + location.host : 'http://192.168.1.3:8123');

export const TODO_ENTITY = 'todo.lista_della_spesa';
export const AC_ENTITY   = 'climate.condizionatore';
export const CAM_ENTITY  = 'camera.tapo_c202_01fe_hd_stream';
