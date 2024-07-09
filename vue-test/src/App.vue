<template>
  <div class="wrapper" :class="{ thunderstorm: isThunderstorm, rain: isRain }">
    <h1>Погодное приложение</h1>
    <p>Узнать погоду в {{ city === "" ? "вашем городе" : cityName }}</p>
    <input 
      type="text" 
      v-model="city" 
      placeholder="Введите город или населенный пункт" 
      @keydown.enter="getWeatherByCity"
    >
    <button v-if="city !== ''" @click="getWeatherByCity">Показать погоду</button>
    <button disabled v-else>Введите название города или населенного пункта</button>
    <p class="error">{{ error }}</p>

    <div v-if="info != null">
      <div class="weather-info">
        <p>{{ weatherDescription }}</p>
        <div v-html="weatherEmoji" class="weather-emoji"></div>
      </div>
      <p>{{ showTemp }}</p>
      <p>{{ showFeelsLike }}</p>
      <p>{{ showMinTemp }}</p>
      <p>{{ showMaxTemp }}</p>
      <p>{{ showHumidity }}</p>
      <p>{{ showPressure }}</p>
    </div>

    <div id="map" class="map-container"></div>
    <div v-if="isThunderstorm" class="lightning"></div>
  </div>
</template>

<script>
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let proxyUrl = '';

export default {
  data() {
    return {
      city: "",
      error: "",
      info: null,
      zoom: 10,
      center: [55.7522, 37.6156],
      marker: null,
      map: null
    };
  },
  computed: {
    cityName() {
      return "<<" + this.city + ">>";
    },
    showTemp() {
      return "Температура: " + this.info.main.temp + "°C";
    },
    showFeelsLike() {
      return "Ощущается как: " + this.info.main.feels_like + "°C";
    },
    showMinTemp() {
      return "Минимальная температура: " + this.info.main.temp_min + "°C";
    },
    showMaxTemp() {
      return "Максимальная температура: " + this.info.main.temp_max + "°C";
    },
    showHumidity() {
      return "Влажность: " + this.info.main.humidity + "%";
    },
    showPressure() {
      return "Давление: " + this.convertPressure(this.info.main.pressure) + " мм рт. ст.";
    },
    weatherDescription() {
      return this.info ? this.info.weather[0].description : "";
    },
    weatherEmoji() {
      if (!this.info) return "";
      const weatherId = this.info.weather[0].id;
      if (weatherId >= 200 && weatherId < 300) return "🌩️"; // Thunderstorm
      if (weatherId >= 300 && weatherId < 500) return "🌧️"; // Drizzle
      if (weatherId >= 500 && weatherId < 600) return "🌦️"; // Rain
      if (weatherId >= 600 && weatherId < 700) return "❄️"; // Snow
      if (weatherId >= 700 && weatherId < 800) return "🌫️"; // Atmosphere
      if (weatherId === 800) return "☀️"; // Clear
      if (weatherId > 800 && weatherId < 900) return "☁️"; // Clouds
      return ""; // Default case
    },
    isThunderstorm() {
      return this.info && this.info.weather[0].id >= 200 && this.info.weather[0].id < 300;
    },
    isRain() {
      return this.info && ((this.info.weather[0].id >= 300 && this.info.weather[0].id < 500) || (this.info.weather[0].id >= 500 && this.info.weather[0].id < 600));
    }
  },
  methods: {
    getWeatherByCity() {
      if (this.city.trim().length < 2) {
        this.error = "Нужно название более одного символа";
        return false;
      }
      this.error = "";

      this.getCityCoords(this.city)
        .then(coords => {
          if (coords) {
            this.center = [coords.lat, coords.lon];
            this.map.setView(this.center, this.zoom);
            if (this.marker) {
              this.map.removeLayer(this.marker);
            }
            this.marker = L.marker(this.center).addTo(this.map);
            this.getWeatherByCoords(coords.lat, coords.lon);
          } else {
            this.error = "Такого города нет или в запросе ошибка";
          }
        })
        .catch(err => {
          this.error = "Невозможно найти координаты города";
          console.error(err);
        });
    },
    getWeatherByCoords(lat, lon) {
      axios
        .get(`${proxyUrl}?lat=${lat}&lon=${lon}`)
        .then((res) => {
          this.info = res.data;
          this.error = ""; // Очистка ошибки при успешном запросе погоды
        })
        .catch((err) => {
          this.error = "Невозможно получить данные о погоде для выбранного места";
          this.info = null;
        });
    },
    getLocationName(lat, lon) {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      axios
        .get(url)
        .then((response) => {
          if (response.data && response.data.address) {
            const address = response.data.address;
            this.city =
              address.city ||
              address.town ||
              address.village ||
              address.hamlet ||
              address.suburb ||
              address.neighbourhood ||
              "Неизвестное место";
          }
        })
        .catch((error) => {
          console.error("Ошибка при обратном геокодировании:", error);
          this.city = "Неизвестное место";
        });
    },
    getCityCoords(city) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${city}`;
      return axios
        .get(url)
        .then((response) => {
          if (response.data && response.data.length > 0) {
            const place = response.data[0];
            return {
              lat: place.lat,
              lon: place.lon
            };
          } else {
            throw new Error("Город не найден");
          }
        })
        .catch((error) => {
          console.error("Ошибка при геокодировании:", error);
          return null;
        });
    },
    convertPressure(hPa) {
      return (hPa * 0.75006).toFixed(2);
    },
    initializeMap() {
      this.map = L.map('map', {
        center: this.center,
        zoom: this.zoom,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(this.map);

      this.map.on('click', (e) => {
        const { lat, lng } = e.latlng;

        if (this.marker) {
          this.map.removeLayer(this.marker);
        }

        this.marker = L.marker([lat, lng]).addTo(this.map);
        this.getWeatherByCoords(lat, lng);
        this.getLocationName(lat, lng);
      });
    }
  },
  async mounted() {
    const response = await fetch('/proxy-port.json');
    const data = await response.json();
    proxyUrl = `http://localhost:${data.port}/weather`;
    this.initializeMap();
  }
};
</script>

<style scoped>
.error {
  color: #d03939;
}

.wrapper {
  width: 900px;
  height: auto;
  border-radius: 50px;
  padding: 20px;
  background: #1f0f24;
  text-align: center;
  color: #fff;
  position: relative;
}

.wrapper.thunderstorm::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1;
  pointer-events: none;
  animation: flash 2s infinite;
}

@keyframes flash {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

.wrapper h1 {
  margin-top: 50px;
}

.wrapper p {
  margin-top: 20px;
}

.wrapper input {
  margin-top: 30px;
  background: transparent;
  border: 0;
  border-bottom: 2px solid #110813;
  color: #fcfcfc;
  font-size: 14px;
  padding: 5px 8px;
  outline: none;
}

.wrapper input:focus {
  border-bottom-color: #6e2d7d;
}

.wrapper button:disabled {
  background: #746027;
  cursor: not-allowed;
}

.wrapper button {
  background: #e3bc4b;
  color: #fff;
  border: 2px solid #b99935;
  border-radius: 10px;
  padding: 10px 15px;
  margin-left: 20px;
  cursor: pointer;
  transition: transform 500ms ease;
}

.wrapper button:hover {
  transform: scale(1.1) translateY(-5px);
}

.map-container {
  height: 500px;
  width: 100%;
  margin-top: 20px;
}

.weather-info {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
}

.weather-emoji {
  font-size: 48px;
  margin-left: 10px;
}

.lightning {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  z-index: 999;
  pointer-events: none;
  animation: lightning 1s infinite;
}

@keyframes lightning {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
</style>
