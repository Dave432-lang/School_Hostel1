/* weather.js — Real-time weather using Open-Meteo (free, no API key needed) */

(function () {
  var WMO_CODES = {
    0:'Clear Sky', 1:'Mostly Clear', 2:'Partly Cloudy', 3:'Overcast',
    45:'Foggy', 48:'Icy Fog',
    51:'Light Drizzle', 53:'Drizzle', 55:'Heavy Drizzle',
    61:'Light Rain', 63:'Rain', 65:'Heavy Rain',
    71:'Light Snow', 73:'Snow', 75:'Heavy Snow',
    80:'Showers', 81:'Rain Showers', 82:'Heavy Showers',
    95:'Thunderstorm', 96:'Thunderstorm', 99:'Thunderstorm'
  };
  var WMO_ICONS = {
    0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
    45:'🌫️', 48:'🌫️',
    51:'🌦️', 53:'🌦️', 55:'🌧️',
    61:'🌧️', 63:'🌧️', 65:'🌧️',
    71:'🌨️', 73:'❄️', 75:'❄️',
    80:'🌦️', 81:'🌧️', 82:'⛈️',
    95:'⛈️', 96:'⛈️', 99:'⛈️'
  };

  function getIcon(code) { return WMO_ICONS[code] || '🌡️'; }
  function getDesc(code) { return WMO_CODES[code] || 'Unknown'; }

  async function fetchWeather(lat, lon) {
    var url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + lat
      + '&longitude=' + lon
      + '&current=temperature_2m,relative_humidity_2m,weathercode,windspeed_10m,apparent_temperature'
      + '&timezone=Africa%2FAccra'
      + '&forecast_days=1';
    var res  = await fetch(url);
    return await res.json();
  }

  async function renderWeather(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-muted)"><div class="spinner" style="margin:0 auto;width:24px;height:24px"></div><div style="margin-top:.5rem;font-size:.8rem">Fetching weather…</div></div>';

    if (!navigator.geolocation) {
      renderDefault(container);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async function (pos) {
        try {
          var data    = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
          var c       = data.current;
          var code    = c.weathercode;
          container.innerHTML = buildCard(c.temperature_2m, c.apparent_temperature, c.relative_humidity_2m, c.windspeed_10m, code, 'Your Location');
        } catch { renderDefault(container); }
      },
      function () {
        // Geolocation denied — use KNUST Kumasi default
        fetchWeather(6.6745, -1.5716).then(function (data) {
          var c = data.current;
          container.innerHTML = buildCard(c.temperature_2m, c.apparent_temperature, c.relative_humidity_2m, c.windspeed_10m, c.weathercode, 'Campus Area');
        }).catch(function () { renderDefault(container); });
      }
    );
  }

  function buildCard(temp, feels, humidity, wind, code, location) {
    var icon = getIcon(code);
    var desc = getDesc(code);
    var now  = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    return '<div class="weather-card">'
      + '<div class="weather-top">'
        + '<div class="weather-icon">' + icon + '</div>'
        + '<div>'
          + '<div class="weather-temp">' + Math.round(temp) + '°C</div>'
          + '<div class="weather-desc">' + desc + '</div>'
          + '<div class="weather-loc">📍 ' + location + '</div>'
        + '</div>'
      + '</div>'
      + '<div class="weather-details">'
        + '<span title="Feels like">🌡️ Feels ' + Math.round(feels) + '°C</span>'
        + '<span title="Humidity">💧 ' + humidity + '%</span>'
        + '<span title="Wind">💨 ' + Math.round(wind) + ' km/h</span>'
        + '<span title="Updated">🕐 ' + now + '</span>'
      + '</div>'
    + '</div>';
  }

  function renderDefault(container) {
    container.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-muted);font-size:.85rem">⚠️ Weather unavailable. Allow location access to see current weather.</div>';
  }

  // Expose globally
  window.initWeather = function (containerId) { renderWeather(containerId); };
})();
