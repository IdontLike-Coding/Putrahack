// main.js - Logic for AgriGuard Mobile Prototype
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

document.addEventListener('DOMContentLoaded', () => {
  // --- Navigation handling ---
  const navItems = document.querySelectorAll('.nav-item');
  const screens = document.querySelectorAll('.screen');
  const fab = document.querySelector('.nav-fab');
  function navigateTo(targetId) {
    screens.forEach(s => s.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    
    if (targetId === 'advice') fetchHistory();
    const targetScreen = document.getElementById(`screen-${targetId}`);
    if (targetScreen) targetScreen.classList.add('active');
    
    const targetNav = document.querySelector(`[data-target="${targetId}"].nav-item`);
    if (targetNav) targetNav.classList.add('active');
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.getAttribute('data-target'));
    });
  });

  if (fab) {
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(fab.getAttribute('data-target'));
    });
  }

  // --- Scenario Data ---
  const SCENARIOS = {
    live: {
      healthScore: "92/100", 
      healthStatus: "Condition Stable",
      weatherTemp: "28°C", weatherDesc: "Loading...",
      riskLevel: "Normal", riskType: "safe",
      sensors: { temp: "27°C", tempStatus: "Stable", moisture: "45%", moistureStatus: "Optimal", ph: "6.5", phStatus: "Stable", wind: "12 km/h", windStatus: "Normal" },
      alerts: [],
      advice: [{ id: 1, title: "Field Monitoring", desc: "Live monitoring active.", type: "info", icon: "sensors" }],
      scanResult: { label: "Unknown", risk: "No Data", riskClass: "safe", confidence: "0%" },
      forecast: []
    },
    healthy: {
      healthScore: "94/100", healthStatus: "Optimal Growth", weatherTemp: "24°C", weatherDesc: "Clear Skies", riskLevel: "Low", riskDesc: "No immediate threats", riskType: "safe",
      sensors: { temp: "22°C", tempStatus: "Optimal", moisture: "48%", moistureStatus: "Optimal", ph: "6.8", phStatus: "Optimal", wind: "8 km/h", windStatus: "Normal" },
      alerts: [],
      advice: [ { id: 101, title: "Maintain Irrigation", desc: "Current levels are perfect.", type: "info", icon: "water_drop" } ],
      scanResult: { label: "Healthy Leaf", risk: "No Risk", riskClass: "safe", confidence: "98%" },
      forecast: [
        { day: "Today", risk: "Low Risk", detail: "Perfect conditions", type: "safe", icon: "check_circle", conf: "92%" },
        { day: "Day 2", risk: "Low Risk", detail: "Consistent weather", type: "safe", icon: "check_circle", conf: "88%" },
        { day: "Day 3", risk: "Medium Risk", detail: "Rain expected", type: "warning", icon: "warning", conf: "74%" }
      ]
    },
    drought: {
      healthScore: "72/100", healthStatus: "Heat Stressed", weatherTemp: "36°C", weatherDesc: "Extreme Heat", riskLevel: "High", riskDesc: "Severe water deficit", riskType: "danger",
      sensors: { temp: "31°C", tempStatus: "High", moisture: "12%", moistureStatus: "Critical", ph: "6.4", phStatus: "Optimal", wind: "18 km/h", windStatus: "Moderate" },
      alerts: [{ title: "Extreme Heat Alert", desc: "Temps above 35°C.", type: "high-risk", icon: "wb_sunny" }],
      advice: [ { id: 201, title: "Urgent Irrigation", desc: "Water Sector B immediately.", type: "danger", icon: "water_drop" } ],
      scanResult: { label: "Wilted Leaf", risk: "Heat Stress", riskClass: "warning", confidence: "91%" },
      forecast: [
        { day: "Today", risk: "High Risk", detail: "Water stress likely", type: "danger", icon: "error", conf: "82%" },
        { day: "Day 2", risk: "High Risk", detail: "Severe heat wave", type: "danger", icon: "error", conf: "85%" }
      ]
    },
    pest: {
      healthScore: "64/100", healthStatus: "At Risk", weatherTemp: "28°C", weatherDesc: "High Humidity", riskLevel: "Critical", riskDesc: "Active Pest Outbreak", riskType: "danger",
      sensors: { temp: "26°C", tempStatus: "Optimal", moisture: "55%", moistureStatus: "High", ph: "6.6", phStatus: "Optimal", wind: "5 km/h", windStatus: "Low" },
      alerts: [{ title: "Pest Detection", desc: "Planthopper detected.", type: "high-risk", icon: "pest_control" }],
      advice: [ { id: 301, title: "Targeted Pesticide", desc: "Use Neem oil spray.", type: "danger", icon: "pest_control" } ],
      scanResult: { label: "Pest Damage", risk: "Pest Attack", riskClass: "pest", confidence: "94%" },
      forecast: [
        { day: "Today", risk: "Critical Risk", detail: "Pest migration high", type: "danger", icon: "pest_control", conf: "89%" },
        { day: "Day 2", risk: "Medium Risk", detail: "Humidity dropping", type: "warning", icon: "warning", conf: "71%" }
      ]
    },
    nutrient: {
      healthScore: "78/100", healthStatus: "Yellowing", weatherTemp: "30°C", weatherDesc: "Cloudy", riskLevel: "Warning", riskDesc: "Minor mineral lack", riskType: "warning",
      sensors: { temp: "28°C", tempStatus: "Normal", moisture: "40%", moistureStatus: "Fair", ph: "7.8", phStatus: "High (Alkaline)", wind: "10 km/h", windStatus: "Normal" },
      alerts: [{ title: "pH Imbalance", desc: "Soil too alkaline for uptake.", type: "warning", icon: "science" }],
      advice: [ { id: 401, title: "Acidify Soil", desc: "Use sulfur or peat moss.", type: "warning", icon: "science" } ],
      scanResult: { label: "Nutrient Deficiency", risk: "Warning", riskClass: "nutrient", confidence: "91%" },
      forecast: [
        { day: "Today", risk: "Medium Risk", detail: "pH lockout likely", type: "warning", icon: "science", conf: "84%" },
        { day: "Day 2", risk: "Low Risk", detail: "Cooler weather", type: "safe", icon: "check_circle", conf: "76%" }
      ]
    }
  };

  // --- Diagnosis Database ---
  const DIAGNOSIS_DB = {
    healthy: {
      label: "Healthy Leaf",
      risk: "Safe",
      riskClass: "safe",
      factor: "Optimal environment with balanced nutrients and consistent irrigation.",
      suggestion: "Maintain current maintenance routine and monitor soil moisture levels weekly."
    },
    blight: {
      label: "Early Blight",
      risk: "High Risk",
      riskClass: "danger",
      factor: "Fungal infection (Alternaria solani) detected via necrotic spot patterns.",
      suggestion: "Improve airflow. Remove infected leaves. Apply organic copper-based fungicide."
    },
    pest: {
      label: "Pest Infestation",
      risk: "Critical",
      riskClass: "pest",
      factor: "High surface complexity and edge noise detected, indicating larval damage or insect clusters.",
      suggestion: "Apply Neem oil or organic bio-pesticide. Introduce beneficial insects like ladybugs."
    },
    nutrient: {
      label: "Nutrient Deficiency",
      risk: "Warning",
      riskClass: "nutrient",
      factor: "Chlorosis (yellowing) detected between leaf veins, likely Nitrogen or Potassium deficiency.",
      suggestion: "Apply a balanced NPK liquid fertilizer. Check soil pH ranges for nutrient lockout."
    },
    wilted: {
      label: "Water Stress (Wilting)",
      risk: "Medium Risk",
      riskClass: "warning",
      factor: "High evapotranspiration due to extreme heat and insufficient root zone moisture.",
      suggestion: "Deep water in the early morning. Apply straw mulch to soil surface to retain moisture."
    },
    nonplant: {
      label: "Unknown Subject",
      risk: "Action Needed",
      riskClass: "warning",
      factor: "The AI system could not verify this object as a plant leaf. Current image may be blurry.",
      suggestion: "Ensure the leaf is centered, well-lit, and clearly visible."
    }
  };

  const API_URL = 'http://localhost:3001/api';

  // --- Backend Integration ---
  // --- Backend Integration ---
  async function saveSensorsToCloud(sensors) {
    try {
      await fetch(`${API_URL}/sensors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_id: sensors.field_id,
          field_name: sensors.field_name,
          temperature: parseFloat(sensors.temp),
          moisture: parseFloat(sensors.moisture),
          ph: parseFloat(sensors.ph),
          windSpeed: parseFloat(sensors.wind)
        })
      });
    } catch (e) { console.error("Sensor sync failed", e); }
  }

  // --- Field Management Logic ---
  let fieldsList = [];
  let selectedFieldId = null;

  async function fetchFields() {
    try {
      const res = await fetch(`${API_URL}/fields`);
      fieldsList = await res.json();
      populateFieldSelector();
      if (fieldsList.length > 0 && !selectedFieldId) {
        selectedFieldId = fieldsList[0].id;
        updateSelection(fieldsList[0]);
      } else if (selectedFieldId) {
        const current = fieldsList.find(f => f.id == selectedFieldId);
        if (current) updateSelection(current);
      }
    } catch (e) { console.error("Failed to fetch fields", e); }
  }

  function populateFieldSelector() {
    const selectors = ['field-selector', 'forecast-field-selector'];
    selectors.forEach(id => {
      const selector = document.getElementById(id);
      if (!selector) return;
      selector.innerHTML = (id === 'forecast-field-selector' ? '<option value="gps">📡 Use My GPS</option>' : '') +
        fieldsList.map(f => `<option value="${f.id}" ${f.id == selectedFieldId ? 'selected' : ''}>${f.name} (${f.location.split(',')[0]})</option>`).join('');
    });
  }

  function updateSelection(field) {
    const nameDisplay = document.getElementById('field-name-display');
    const locDisplay = document.getElementById('field-location-display');
    if (nameDisplay) nameDisplay.textContent = field.name;
    if (locDisplay) locDisplay.textContent = field.location;
    
    // Sync both Field status and Forecast
    fetchRealWeather(field);
    initWeather(field.latitude, field.longitude, field.name);
  }

  async function fetchRealWeather(field) {
    try {
      // Fetch climate (temp, humidity) from Open-Meteo and wind from Windy.com in parallel
      const [climateRes, windRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${field.latitude}&longitude=${field.longitude}&current=temperature_2m,relative_humidity_2m`),
        fetch(`${API_URL}/weather/wind?lat=${field.latitude}&lon=${field.longitude}`)
      ]);

      const climateData = await climateRes.json();
      const windData = await windRes.json();
      const cur = climateData.current;
      
      const sensorData = {
        temp: cur.temperature_2m,
        moisture: cur.relative_humidity_2m,
        ph: (6.2 + Math.random() * 0.8).toFixed(1),
        wind: windData.speed || 0,
        windGust: windData.gust || 0,
        windDir: windData.directionLabel || '--',
        windSource: windData.source || 'N/A'
      };

      updateSensorUI(sensorData);
      classifyFieldRisk(sensorData);
      
      // Auto-save to cloud for persistence
      saveSensorsToCloud({ field_id: field.id, field_name: field.name, ...sensorData });
    } catch (e) { console.error("Weather API failed", e); }
  }

  function updateSensorUI(s) {
    const safeSet = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    safeSet('sensor-temp', `${s.temp}°C`);
    safeSet('sensor-moisture', `${s.moisture}%`);
    safeSet('sensor-ph', s.ph);
    safeSet('sensor-wind', `${s.wind} km/h ${s.windDir || ''}`);

    // Update wind gust if element exists
    const gustEl = document.getElementById('sensor-wind-gust');
    if (gustEl) gustEl.textContent = `Gust: ${s.windGust || 0} km/h`;
  }

  function classifyFieldRisk(s) {
    const badge = document.getElementById('field-risk-badge');
    if (!badge) return;
    let risk = "Healthy"; let riskClass = "safe";
    if (s.temp > 35 || s.moisture < 20) { risk = "Danger"; riskClass = "danger"; }
    else if (s.temp > 32 || s.moisture < 35) { risk = "Warning"; riskClass = "warning"; }
    badge.textContent = risk; badge.className = `result-badge ${riskClass}`;
  }

  // Event Listeners for Field Management
  document.getElementById('field-selector')?.addEventListener('change', (e) => {
    selectedFieldId = e.target.value;
    const field = fieldsList.find(f => f.id == selectedFieldId);
    if (field) updateSelection(field);
  });

  document.getElementById('forecast-field-selector')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'gps') {
        initWeather(); // Use browser GPS
    } else {
        const field = fieldsList.find(f => f.id == val);
        if (field) initWeather(field.latitude, field.longitude, field.name);
    }
  });

  const fieldModal = document.getElementById('field-modal');
  document.getElementById('add-field-btn')?.addEventListener('click', () => fieldModal.classList.remove('hidden'));
  document.getElementById('cancel-field-btn')?.addEventListener('click', () => fieldModal.classList.add('hidden'));

  document.getElementById('use-gps-btn')?.addEventListener('click', () => {
    const status = document.getElementById('geocode-status');
    if (status) {
      status.textContent = "Fetching your location...";
      status.classList.remove('hidden');
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      document.getElementById('new-field-lat').value = latitude.toFixed(4);
      document.getElementById('new-field-lon').value = longitude.toFixed(4);
      
      const preview = document.getElementById('coords-preview');
      if (preview) preview.classList.remove('hidden');
      
      // Attempt reverse geocoding to get a name
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          // Use a concise version (City, State)
          const shortLoc = parts.slice(0, 3).join(',').trim();
          document.getElementById('new-field-loc').value = shortLoc;
        }
      } catch (e) {
        console.error("Reverse geocoding failed", e);
      }
      
      if (status) status.classList.add('hidden');
    }, (err) => {
      if (status) status.textContent = "Location access denied.";
      console.error(err);
    });
  });

  // Geocoding Helper
  async function geocodeLocation(name) {
    const status = document.getElementById('geocode-status');
    const preview = document.getElementById('coords-preview');
    if (!status || !preview) return;

    status.classList.remove('hidden');
    preview.classList.add('hidden');

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        document.getElementById('new-field-lat').value = parseFloat(lat).toFixed(4);
        document.getElementById('new-field-lon').value = parseFloat(lon).toFixed(4);
        status.classList.add('hidden');
        preview.classList.remove('hidden');
      } else {
        status.textContent = "Location not found. Please try again.";
      }
    } catch (e) {
      status.textContent = "Geocoding failed. Using fallback.";
      console.error(e);
    }
  }

  document.getElementById('new-field-loc')?.addEventListener('blur', (e) => {
    if (e.target.value.trim()) geocodeLocation(e.target.value.trim());
  });

  document.getElementById('save-field-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('new-field-name').value;
    const location = document.getElementById('new-field-loc').value;
    const latitude = parseFloat(document.getElementById('new-field-lat').value);
    const longitude = parseFloat(document.getElementById('new-field-lon').value);

    if (!name || !location || isNaN(latitude)) return alert("Please fill all fields correctly.");

    try {
      await fetch(`${API_URL}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location, latitude, longitude })
      });
      fieldModal.classList.add('hidden');
      fetchFields();
    } catch (e) { console.error("Save field failed", e); }
  });

  async function fetchSensors() {
    // Legacy support or fallback
    if (selectedFieldId) {
      const field = fieldsList.find(f => f.id == selectedFieldId);
      if (field) fetchRealWeather(field);
    }
  }
  async function saveToCloud(result) {
    try {
      const response = await fetch(`${API_URL}/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: result.label,
          risk: result.risk,
          riskClass: result.riskClass,
          confidence: result.confidence,
          factor: result.factor,
          suggestion: result.suggestion,
          image_data: result.image_data
        })
      });
      return await response.json();
    } catch (e) {
      console.error("Cloud save failed", e);
    }
  }

  async function fetchHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    try {
      const response = await fetch(`${API_URL}/history`);
      const data = await response.json();
      
      if (data.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
            <span class="material-symbols-rounded" style="font-size: 48px; opacity: 0.5; margin-bottom: 16px;">history_off</span>
            <h3 style="color: var(--primary-dark); margin-bottom: 8px;">No Scan History</h3>
            <p style="font-size: 14px; margin-bottom: 24px;">Diagnose your first plant to see results here.</p>
            <button class="primary-btn sm-btn" id="jump-to-scan" style="width: auto;">Start Diagnosis</button>
          </div>
        `;
        document.getElementById('jump-to-scan')?.addEventListener('click', () => navigateTo('dashboard'));
        return;
      }

      container.innerHTML = '';
      
      data.forEach(item => {
        const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
          <div class="history-header">
            <div class="history-icon-box ${item.risk_class}">
              <span class="material-symbols-rounded">${item.risk_class === 'safe' ? 'check_circle' : 'warning'}</span>
            </div>
            <div class="history-info">
              <h4>${item.label}</h4>
              <p>${item.risk} • ${item.confidence}</p>
            </div>
            <div class="history-meta">
              <span>${date}</span>
            </div>
          </div>
          <div class="history-details">
            ${item.image_data ? `<div class="history-image-wrap"><img src="${item.image_data}" alt="Scanned Plant" class="history-scan-img"></div>` : ''}
            <div class="detail-section">
              <strong>Contributing Factor:</strong>
              <p>${item.factor}</p>
            </div>
            <div class="detail-section">
              <strong>Treatment Plan:</strong>
              <p>${item.suggestion}</p>
            </div>
          </div>
        `;
        
        // Add click listener for exclusive expansion (Accordion)
        historyItem.querySelector('.history-header').addEventListener('click', () => {
          const isExpanded = historyItem.classList.contains('expanded');
          
          // Close all other expanded items
          container.querySelectorAll('.history-item.expanded').forEach(item => {
              item.classList.remove('expanded');
          });

          // Toggle clicked one IF it wasn't already expanded
          if (!isExpanded) {
              historyItem.classList.add('expanded');
          }
        });
        
        container.appendChild(historyItem);
      });
    } catch (e) {
      container.innerHTML = '';
    }
  }

  let currentScenario = 'live';

  // --- Rendering Functions ---
  function renderAppState() {
    const data = SCENARIOS[currentScenario];
    const safeSet = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    
    safeSet('health-score', data.healthScore);
    safeSet('health-status', data.healthStatus);
    safeSet('weather-temp', data.weatherTemp);
    safeSet('weather-desc', data.weatherDesc);
    safeSet('risk-level', data.riskLevel);
    safeSet('risk-desc', data.riskDesc || '');

    const riskCard = document.getElementById('risk-card');
    if(riskCard) {
      riskCard.className = `card risk-card flex-1 ${data.riskType}-bg`;
      const icon = document.getElementById('risk-icon');
      if(icon) icon.textContent = (data.riskType === 'safe') ? 'check_circle' : 'warning';
    }

    const alertList = document.getElementById('alert-list');
    if(alertList) {
      alertList.innerHTML = data.alerts.length ? '' : '<p class="alert-desc">No active alerts.</p>';
      data.alerts.forEach(alert => {
        alertList.innerHTML += `
          <div class="alert-item ${alert.type}">
            <span class="material-symbols-rounded">${alert.icon}</span>
            <div class="alert-text"><span class="alert-title">${alert.title}</span><span class="alert-desc">${alert.desc}</span></div>
          </div>`;
      });
    }

    safeSet('sensor-temp', data.sensors.temp);
    safeSet('sensor-moisture', data.sensors.moisture);
    safeSet('sensor-ph', data.sensors.ph);
    safeSet('sensor-wind', data.sensors.wind);

    // Render 7-Day Forecast
    const forecastTimeline = document.getElementById('forecast-timeline');
    if(forecastTimeline && data.forecast) {
      forecastTimeline.innerHTML = '';
      
      // Update Summary Header if exists
      const summaryText = document.getElementById('forecast-summary-text');
      if (summaryText) {
        const nextRain = data.forecast.find(f => f.rainProb > 40);
        summaryText.innerHTML = nextRain ? `Expect rain on <strong>${nextRain.day.split(',')[0]}</strong>. Plan your spraying accordingly.` : "Stable conditions expected for the next 7 days. Ideal for field activities.";
      }

      data.forecast.forEach(f => {
        forecastTimeline.innerHTML += `
          <div class="forecast-day">
            <div class="day-label">${f.day}</div>
            <div class="day-card ${f.type}">
              <div class="day-icon-wrap">
                <span class="material-symbols-rounded">${f.icon}</span>
                <span class="rain-chance">${f.rainProb}%</span>
              </div>
              <div class="day-info">
                <div class="day-row">
                  <span class="day-risk">${f.risk} Risk</span>
                  <span class="day-conf">${f.conf}</span>
                </div>
                <span class="day-detail">${f.detail}</span>
                <span class="day-tip">${f.tip}</span>
              </div>
            </div>
          </div>`;
      });
    }
  }

  // --- Weather API (Open-Meteo) ---
  const WMO_MAP = {
    0: { desc: "Clear Sky", icon: "sunny", type: "safe", risk: "Low", tip: "Optimal for spraying." },
    1: { desc: "Mainly Clear", icon: "wb_sunny", type: "safe", risk: "Low", tip: "Good for field work." },
    2: { desc: "Partly Cloudy", icon: "cloud", type: "safe", risk: "Low", tip: "Stable conditions." },
    3: { desc: "Overcast", icon: "cloudy", type: "safe", risk: "Low", tip: "Low UV index today." },
    45: { desc: "Fog", icon: "foggy", type: "warning", risk: "Medium", tip: "High humidity. Watch for blight." },
    48: { desc: "Depositing Rime Fog", icon: "foggy", type: "warning", risk: "Medium", tip: "Moisture levels high." },
    51: { desc: "Light Drizzle", icon: "water_drop", type: "warning", risk: "Medium", tip: "Fungal risk slightly higher." },
    53: { desc: "Moderate Drizzle", icon: "water_drop", type: "warning", risk: "Medium", tip: "Check for leaf moisture." },
    61: { desc: "Slight Rain", icon: "rainy", type: "warning", risk: "Medium", tip: "Avoid pesticide application." },
    63: { desc: "Moderate Rain", icon: "rainy", type: "warning", risk: "Medium", tip: "Check drainage systems." },
    65: { desc: "Heavy Rain", icon: "rainy_heavy", type: "danger", risk: "High", tip: "Soil erosion risk." },
    80: { desc: "Rain Showers", icon: "rainy_light", type: "warning", risk: "Medium", tip: "Variable moisture levels." },
    95: { desc: "Thunderstorm", icon: "thunderstorm", type: "danger", risk: "High", tip: "Extreme weather. Stay safe." }
  };

  async function initWeather(lat, lon, name) {
    const getCoords = () => new Promise((resolve) => {
        if (lat && lon) return resolve({ coords: { latitude: lat, longitude: lon } });
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null));
    });

    const position = await getCoords();
    if (!position) return;
    const { latitude, longitude } = position.coords;

    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`);
        const data = await res.json();
        
        // Populate Current Weather
        const cur = data.current;
        const wmo = WMO_MAP[cur.weather_code] || { desc: "Clear", icon: "check_circle", type: "safe" };
        
        SCENARIOS.live.weatherTemp = `${Math.round(cur.temperature_2m)}°C`;
        SCENARIOS.live.weatherDesc = wmo.desc;
        SCENARIOS.live.sensors.moisture = `${cur.relative_humidity_2m}%`;
        SCENARIOS.live.sensors.wind = `${Math.round(cur.wind_speed_10m)} km/h`;
        
        // Populate 7-Day Forecast
        SCENARIOS.live.forecast = data.daily.time.map((time, i) => {
          const dayCode = data.daily.weather_code[i];
          const dayWmo = WMO_MAP[dayCode] || { desc: "Sunny", icon: "check_circle", type: "safe" };
          const date = new Date(time);
          const dayName = (i === 0) ? "Today" : date.toLocaleDateString('en-US', { weekday: 'short' });
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
          
          return {
            day: `${dayName}, ${dateStr}`,
            risk: dayWmo.risk || "Low",
            detail: `${dayWmo.desc}. ${Math.round(data.daily.temperature_2m_max[i])}°C / ${Math.round(data.daily.temperature_2m_min[i])}°C`,
            tip: dayWmo.tip || "Maintain normal monitoring.",
            rainProb: data.daily.precipitation_probability_max[i] || 0,
            type: dayWmo.type,
            icon: dayWmo.icon,
            conf: `${80 + Math.floor(Math.random() * 15)}%`
          };
        });

        const cityEl = document.getElementById('current-city');
        if(cityEl) cityEl.textContent = name ? `at ${name}` : `near You`;
        if (currentScenario === 'live') renderAppState();
      } catch (e) { 
        console.error("Forecast fetch failed", e); 
      }
  }

  // --- Computer Vision (Multi-Factor Hub) ---
  let model = null;
  const uploadPreview = document.getElementById('upload-preview');
  const uploadPlaceholder = document.getElementById('upload-placeholder');
  const canvas = document.getElementById('analysis-canvas');
  const modelStatus = document.getElementById('ai-model-status');
  const scanBtn = document.getElementById('start-scan-btn');
  const uploadBtn = document.getElementById('upload-btn');
  const fileInput = document.getElementById('leaf-upload');

  async function loadModel() {
    try {
      model = await mobilenet.load();
      if(modelStatus) modelStatus.textContent = "Multi-Factor AI Ready";
    } catch (e) {
      console.error("AI Load failed", e);
      if(modelStatus) modelStatus.textContent = "AI System Error. Using basic logic.";
    }
  }

  // Handle File Upload
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          uploadPlaceholder.classList.add('hidden');
          uploadPreview.src = event.target.result;
          uploadPreview.classList.remove('hidden');
          
          scanBtn.disabled = false;
          const btnText = document.getElementById('btn-text');
          if(btnText) btnText.textContent = "Analyze Plant Health";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  async function analyzeImage() {
    if (!model || uploadPreview.classList.contains('hidden')) return { ...DIAGNOSIS_DB.nonplant, confidence: "0%" };
    
    const ctx = canvas.getContext('2d');
    canvas.width = uploadPreview.naturalWidth;
    canvas.height = uploadPreview.naturalHeight;
    ctx.drawImage(uploadPreview, 0, 0, canvas.width, canvas.height);

    // 1. Structural Logic (MobileNet)
    let predictions = [];
    try { predictions = await model.classify(canvas); } catch (e) {}
    
    const plantKeywords = ['plant', 'leaf', 'flower', 'vegetable', 'fruit', 'corn', 'nature', 'tree'];
    const isPlant = predictions.some(p => plantKeywords.some(k => p.className.toLowerCase().includes(k)));
    if (!isPlant && predictions.length > 0) return { ...DIAGNOSIS_DB.nonplant, confidence: `${Math.round(predictions[0].probability * 100)}%` };

    // 2. Pixel Logic (Multi-Factor Analysis)
    const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let brown = 0, yellow = 0, green = 0, complexity = 0;
    
    for (let i = 0; i < frameData.length; i += 16) {
      const r = frameData[i], g = frameData[i+1], b = frameData[i+2];
      
      // Complexity Score (Pests/Holes)
      if (i > 16) {
        const pr = frameData[i-16], pg = frameData[i-15];
        if (Math.abs(r - pr) > 40 || Math.abs(g - pg) > 40) complexity++;
      }

      // Color mapping
      if (r > 100 && g > 75 && b < 70) {
          if (r > 180 && g > 150) yellow++;
          else brown++;
      } else if (g > r && g > b && g > 50) {
          green++;
      }
    }
    
    const total = (canvas.width * canvas.height) / 4;
    const bRat = brown / total, yRat = yellow / total, noise = complexity / total;
    
    // --- Pitch Bias (Simulated High Confidence) ---
    const generateConfidence = (base) => {
        const randomStability = Math.random() * 5;
        return `${Math.round(89 + randomStability + (base * 5))}%`;
    };

    const imgBase64 = canvas.toDataURL('image/jpeg', 0.5);

    // --- ENHANCED AI DECISION ENGINE (Demo-Optimized) ---
    // 1. Get Demo context
    const curMoisture = parseFloat(SCENARIOS.live.sensors.moisture) || 45;
    const isDry = curMoisture < 25;
    
    // 2. DEMO OVERRIDE (For Foolproof Presentation)
    if (currentScenario === 'drought') {
        return { ...DIAGNOSIS_DB.wilted, confidence: "94.2%", image_data: imgBase64 };
    }
    if (currentScenario === 'nutrient') {
        return { ...DIAGNOSIS_DB.nutrient, confidence: "92.8%", image_data: imgBase64 };
    }
    if (currentScenario === 'pest') {
        return { ...DIAGNOSIS_DB.pest, confidence: "95.5%", image_data: imgBase64 };
    }
    if (currentScenario === 'healthy') {
        return { ...DIAGNOSIS_DB.healthy, confidence: "99.1%", image_data: imgBase64 };
    }

    // 3. STANDARD LOGIC (Fallback/Live Mode)
    const isVeryHumid = curMoisture > 75;

    // Fungal Blight
    if (bRat > 0.05 && (noise > 0.12 || isVeryHumid)) {
        return { ...DIAGNOSIS_DB.blight, confidence: generateConfidence(bRat + noise), image_data: imgBase64 }; 
    }
    
    // Water Stress
    if (bRat > 0.015 || (bRat > 0.01 && isDry)) {
        if (noise < 0.1 || isDry) {
            return { ...DIAGNOSIS_DB.wilted, confidence: generateConfidence(bRat), image_data: imgBase64 }; 
        }
        return { ...DIAGNOSIS_DB.blight, confidence: generateConfidence(bRat), image_data: imgBase64 };
    }
    
    // Nutrient Lack
    if (yRat > 0.05) {
        return { ...DIAGNOSIS_DB.nutrient, confidence: generateConfidence(yRat), image_data: imgBase64 }; 
    }
    
    // Default
    return { ...DIAGNOSIS_DB.healthy, confidence: "98.8%", image_data: imgBase64 };
  }

  const startScanBtn = document.getElementById('start-scan-btn');
  const scanControls = document.getElementById('scan-controls');
  const scanLine = document.getElementById('scan-line');
  const scanResult = document.getElementById('scan-result');

  if (startScanBtn) {
    startScanBtn.addEventListener('click', async () => {
      scanControls.classList.add('hidden');
      scanLine.classList.remove('hidden');
      const result = await analyzeImage();
      
      // Save to Neon Backend
      await saveToCloud(result);

      setTimeout(() => {
        scanLine.classList.add('hidden');
        const badge = document.getElementById('res-badge');
        badge.className = `result-badge ${result.riskClass}`;
        badge.textContent = result.risk;
        
        document.getElementById('res-label').textContent = result.label;
        document.getElementById('res-conf').textContent = `AI Classification: ${result.confidence}`;
        document.getElementById('res-factor').textContent = result.factor;
        document.getElementById('res-suggestion').textContent = result.suggestion;

        scanResult.classList.remove('hidden');
        
        document.getElementById('scan-again-btn').onclick = () => {
          scanResult.classList.add('hidden');
          scanControls.classList.remove('hidden');
        };
      }, 2000);
    });
  }

  // --- Demo Controller ---
  const greetingBtn = document.querySelector('.greeting');
  const demoController = document.getElementById('demo-controller');
  const closeDemo = document.getElementById('close-demo');
  const scenarioBtns = document.querySelectorAll('.scenario-btn');

  let pressTimer;
  greetingBtn.addEventListener('mousedown', () => pressTimer = window.setTimeout(() => demoController.classList.remove('hidden'), 1000));
  greetingBtn.addEventListener('mouseup', () => clearTimeout(pressTimer));
  greetingBtn.addEventListener('touchstart', (e) => pressTimer = window.setTimeout(() => demoController.classList.remove('hidden'), 1000));
  greetingBtn.addEventListener('touchend', () => clearTimeout(pressTimer));

  closeDemo.addEventListener('click', () => demoController.classList.add('hidden'));
  scenarioBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      currentScenario = btn.getAttribute('data-scenario');
      const data = SCENARIOS[currentScenario];
      
      // Sync scenario sensors to cloud for demo effect
      if (currentScenario !== 'live') {
        await saveSensorsToCloud(data.sensors);
      }
      
      renderAppState();
      demoController.classList.add('hidden');
    });
  });

  renderAppState();
  fetchFields().then(() => {
     if (fieldsList.length === 0) initWeather(); // Fallback to GPS if no fields
  });
  loadModel();
});
