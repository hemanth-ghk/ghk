/* Smart City Dashboard - Frontend only
   - simulated live updates
   - Chart.js charts
   - Leaflet map + heat
   - simple prediction + alerts
   - voice commands (Voice button)
*/

// ---------- CONFIG ----------
const CITY = "Hyderabad";
const LAT = 17.3850, LON = 78.4867;
let SIMULATE = false;        // toggled by Simulate button
const UPDATE_INTERVAL = 6000; // ms - simulated live update frequency

// ---------- DOM refs ----------
const summaryDiv = document.getElementById('summary');
const lastUpdate = document.getElementById('lastUpdate');
const eventsList = document.getElementById('events');
const voiceBtn = document.getElementById('voiceBtn');
const simulateBtn = document.getElementById('simulateBtn');

// ---------- CHARTS ----------
const tctx = document.getElementById('trafficChart').getContext('2d');
const trafficChart = new Chart(tctx, {
  type: 'line',
  data: { labels: [], datasets: [{ label:'Traffic (%)', data: [], borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.12)', fill: true }] },
  options: { animation: false, scales: { y: { min: 0, max: 120 } } }
});

const pctx = document.getElementById('pollutionChart').getContext('2d');
const pollutionChart = new Chart(pctx, {
  type: 'bar',
  data: { labels: ['PM2.5','PM10','NO2','SO2','O3'], datasets: [{ label:'μg/m³ (sim)', data: [0,0,0,0,0], backgroundColor: [] }] },
  options: { animation:false }
});

// ---------- MAP ----------
const map = L.map('map').setView([LAT, LON], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let markerLayer = L.layerGroup().addTo(map);
let heatLayer = null;
const markerIcon = L.icon({ iconUrl: 'assets/marker-icon.png', iconSize: [28,28], iconAnchor: [14,28] });

// ---------- HELPERS ----------
function showAlert(text, colorClass='bg-red-600') {
  const el = document.createElement('div');
  el.className = `alert ${colorClass}`;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 5000);
}
function cacheLast(data){ localStorage.setItem('scd_last', JSON.stringify(data)); }
function getCached(){ try{ return JSON.parse(localStorage.getItem('scd_last') || 'null'); }catch(e){return null;} }

// ---------- SIMULATION (fake "real" data) ----------
function simulatedData() {
  const traffic = Math.round(30 + Math.random()*70); // 30 - 100 %
  const aqi = Math.round(40 + Math.random()*160);    // 40 - 200 AQI
  const breakdown = [
    Math.round(aqi * 0.5), // PM2.5
    Math.round(aqi * 0.25),
    Math.round(aqi * 0.1),
    Math.round(aqi * 0.07),
    Math.round(aqi * 0.08)
  ];
  const events = [
    { name: 'Food Festival - Central Park', lat: LAT + 0.02, lon: LON + 0.01, at: 'Today 6 PM' },
    { name: 'Open-Air Concert - Riverfront', lat: LAT - 0.015, lon: LON - 0.02, at: 'Today 8 PM' }
  ];
  return { traffic, aqi, breakdown, events, temp: Math.round(20 + Math.random()*12), weather: 'clear' };
}

// ---------- UPDATE UI ----------
function updateTrafficChart(val){
  const time = new Date().toLocaleTimeString();
  trafficChart.data.labels.push(time);
  trafficChart.data.datasets[0].data.push(val);
  if (trafficChart.data.labels.length > 20) { trafficChart.data.labels.shift(); trafficChart.data.datasets[0].data.shift(); }
  trafficChart.update();
}
function updatePollutionChart(breakdown){
  pollutionChart.data.datasets[0].data = breakdown;
  pollutionChart.data.datasets[0].backgroundColor = breakdown.map(v => v>150 ? '#ef4444' : v>100 ? '#f59e0b' : '#10b981');
  pollutionChart.update();
}
function updateSummary(temp, weather, traffic, aqi){
  summaryDiv.innerHTML = `
    <div>City: <strong>${CITY}</strong></div>
    <div>Temp: <strong>${temp} °C</strong></div>
    <div>Weather: <strong>${weather}</strong></div>
    <div>Traffic: <strong>${traffic}%</strong></div>
    <div>AQI: <strong>${aqi}</strong></div>
  `;
}

// ---------- MAP & EVENTS ----------
function clearMap() {
  markerLayer.clearLayers();
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
}
function addEventMarkers(events){
  clearMap();
  const heatPoints = [];
  events.forEach(ev => {
    const m = L.marker([ev.lat, ev.lon], { icon: markerIcon }).bindPopup(`${ev.name} <br><small>${ev.at || ''}</small>`);
    markerLayer.addLayer(m);
    heatPoints.push([ev.lat, ev.lon, 0.6]);
  });
  if (heatPoints.length) {
    heatLayer = L.heatLayer(heatPoints, {radius: 25}).addTo(map);
  }
  // center map to first event if it exists
  if (events[0]) map.setView([events[0].lat, events[0].lon], 13);
}
function updateEventsUI(events){
  eventsList.innerHTML = '';
  events.forEach(ev => {
    const li = document.createElement('li');
    li.textContent = `${ev.name} — ${ev.at || 'TBD'}`;
    eventsList.appendChild(li);
  });
}

// ---------- SIMPLE PREDICTION (linear regression on traffic history) ----------
function predictNext(values){
  if (!values || values.length < 3) return null;
  const n = values.length;
  const x = values.map((_,i)=>i+1);
  const y = values;
  const xMean = x.reduce((a,b)=>a+b,0)/n;
  const yMean = y.reduce((a,b)=>a+b,0)/n;
  let num=0, den=0;
  for(let i=0;i<n;i++){ num += (x[i]-xMean)*(y[i]-yMean); den += (x[i]-xMean)**2; }
  const m = den ? num/den : 0;
  const c = yMean - m*xMean;
  return Math.round(m*(n+1)+c);
}
function runPredictionAndAlerts(){
  const vals = trafficChart.data.datasets[0].data.slice();
  const pred = predictNext(vals);
  if (pred && pred > 85) {
    showAlert(`⚠ Traffic predicted high (~${pred}%). Consider alternative routes.`, 'bg-red-600');
  } else if (pred && pred > 70) {
    showAlert(`⚠ Traffic may rise (~${pred}%).`, 'bg-amber-600');
  }
}

// ---------- MAIN REFRESH (simulated or real via proxy) ----------
async function refreshAll(){
  try {
    let data;
    if (SIMULATE) {
      data = simulatedData();
    } else {
      // In this front-end only version, we use simulation by default.
      // If you later add a proxy server, replace this block with real fetch() calls.
      data = simulatedData();
    }

    // parse and update UI
    updateSummary(data.temp, data.weather, data.traffic, data.aqi);
    updateTrafficChart(data.traffic);
    updatePollutionChart(data.breakdown);
    addEventMarkers(data.events);
    updateEventsUI(data.events);
    lastUpdate.textContent = new Date().toLocaleString();

    cacheLast({ data, ts: Date.now() });

    // run prediction (optional)
    runPredictionAndAlerts();
  } catch (err) {
    console.error('refresh error', err);
    showAlert('Data refresh failed — using cached data', 'bg-yellow-600');
    const cached = getCached();
    if (cached && cached.data) {
      // apply cached partially
      updateTrafficChart(cached.data.traffic || Math.floor(Math.random()*100));
    }
  }
}

// ---------- VOICE COMMANDS (init voice recognition) ----------
let recognition, listening = false;
const ZONES = {
  "city center": {lat: LAT, lon: LON, zoom: 13},
  "jubilee hills": {lat: 17.4239, lon: 78.4070, zoom: 14},
  "banjara hills": {lat: 17.4310, lon: 78.4100, zoom: 14}
};

function initVoice() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    voiceBtn.addEventListener('click', ()=> showAlert('Voice not supported in this browser', 'bg-yellow-600'));
    return;
  }
  recognition = new SpeechRec();
  recognition.lang = 'en-IN';
  recognition.interimResults = false;
  recognition.onstart = ()=> { listening = true; showAlert('Listening... speak now', 'bg-indigo-600'); voiceBtn.classList.add('ring','ring-2','ring-indigo-400'); };
  recognition.onend = ()=> { listening = false; voiceBtn.classList.remove('ring','ring-2','ring-indigo-400'); };
  recognition.onerror = e => { console.error('voice error', e); showAlert('Voice error', 'bg-red-600'); };

  recognition.onresult = e => {
    const text = e.results[0][0].transcript.toLowerCase().trim();
    console.log('voice:', text);
    handleVoiceCommand(text);
  };

  voiceBtn.addEventListener('click', ()=> {
    if (!listening) recognition.start();
    else recognition.stop();
  });
}

function handleVoiceCommand(text) {
  if (text.includes('stop') || text.includes('stop listening')) {
    recognition && recognition.stop();
    showAlert('Stopped listening', 'bg-slate-600');
    return;
  }

  if (text.includes('refresh') || text.includes('update')) {
    refreshAll(); showAlert('Refreshing data', 'bg-blue-600'); return;
  }
  if (text.includes('traffic')) { document.getElementById('trafficChart').scrollIntoView({behavior:'smooth'}); showAlert('Focusing traffic', 'bg-cyan-600'); return; }
  if (text.includes('pollution') || text.includes('air quality')) { document.getElementById('pollutionChart').scrollIntoView({behavior:'smooth'}); showAlert('Focusing pollution', 'bg-orange-600'); return; }
  if (text.includes('events')) { document.getElementById('events').scrollIntoView({behavior:'smooth'}); showAlert('Showing events', 'bg-emerald-600'); return; }
  if (text.includes('predict') || text.includes('forecast')) { runPredictionAndAlerts(); showAlert('Running prediction', 'bg-purple-600'); return; }

  const zm = text.match(/zoom to (.+)/);
  if (zm) {
    const zone = zm[1].trim();
    if (ZONES[zone]) { map.setView([ZONES[zone].lat, ZONES[zone].lon], ZONES[zone].zoom); showAlert(`Zoomed to ${zone}`, 'bg-indigo-600'); }
    else showAlert(`Zone not found: ${zone}`, 'bg-yellow-600');
    return;
  }

  showAlert(`Heard: "${text}"`, 'bg-slate-600');
}

// ---------- UI Buttons ----------
simulateBtn.addEventListener('click', ()=> {
  SIMULATE = !SIMULATE;
  simulateBtn.textContent = SIMULATE ? 'Simulate: ON' : 'Simulate';
  showAlert(`Simulate ${SIMULATE ? 'ON' : 'OFF'}`, SIMULATE ? 'bg-amber-500' : 'bg-slate-600');
});

// ---------- Init ----------
initVoice();
refreshAll();
setInterval(refreshAll, UPDATE_INTERVAL);
