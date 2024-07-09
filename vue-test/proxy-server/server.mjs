import express from 'express';
import axios from 'axios';
import portfinder from 'portfinder';
import fs from 'fs';
import dotenv from 'dotenv';

// Загрузка переменных из .env файла
dotenv.config();

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/weather', (req, res) => {
  const { lat, lon } = req.query;
  const apiKey = process.env.WEATHER_API_KEY;
  const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${apiKey}`;

  axios.get(weatherApiUrl)
    .then(response => {
      res.json(response.data);
    })
    .catch(error => {
      res.status(500).send(error);
    });
});

(async () => {
  portfinder.basePort = 3000;
  portfinder.highestPort = 3100;
  portfinder.getPort((err, port) => {
    if (err) {
      console.error(err);
      return;
    }

    app.listen(port, () => {
      console.log(`Proxy server listening at http://localhost:${port}`);
    });

    // Log the port to a file so the client can read it
    fs.writeFileSync('proxy-port.json', JSON.stringify({ port }));
  });
})();
