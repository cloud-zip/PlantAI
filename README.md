# 🌱 Plantify — Smart Plant Care Dashboard

Plantify is a modern, responsive, React-based smart farming and plant care dashboard. Built for farmers and indoor plant enthusiasts alike, it delivers real-time sensor tracking, automated AI agronomy advice, nutrient visualization, and configuration management within a dark, botanical-themed user interface.

![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=Vite&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=github-actions&logoColor=white)

---

## ✨ Features

### 📊 1. Real-Time Sensor Speedometers
Dynamic, SVG-rendered circular gauges tracking critical health indicators:
*   **Temperature:** Monitored in degrees Celsius.
*   **Humidity:** Relative atmospheric moisture levels.
*   **Soil Moisture:** Real-time volumetric water content.
*   **Weather Conditions:** Built-in regional weather reporting powered by OpenMeteo.

### 🧪 2. NPK Nutrient Visualization
Visual tracking of essential macronutrients:
*   **Nitrogen (N):** Leaf and stem health.
*   **Phosphorus (P):** Root development.
*   **Potassium (K):** Disease and stress tolerance.

### 🤖 3. AI Agronomist & Chat
*   **AI Care Plan:** On-demand generation of custom fertilization, watering, and care schedules.
*   **Interactive Advisor:** Instant-messaging interface allowing you to chat directly with an AI agronomist regarding crop issues or conditions.

### 🌾 4. Field Profile & Crop Management
*   Supports crop profiles: *Millet, Rice, Wheat, Tomato, Chili, Brinjal, Cucumber, Carrot, Spinach, Potato, Onion, Capsicum, Lettuce, Broccoli, and Custom crops*.
*   Automatic calculation of **Days since planting** based on a single setup input.
*   Physical properties management (Area in $m^2$, Soil Type).

### ⚙️ 5. Settings & History
*   **History Logs:** Time-stamped data grids showing historical moisture and temperature metrics.
*   **Location Configuration:** Timezone and regional settings to sync OpenMeteo forecasts correctly.

---

## 🛠️ Architecture

*   **Frontend:** React (Single Page Application)
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS with runtime configuration + Google Fonts (*Playfair Display*, *Inter*, *JetBrains Mono*)
*   **Deployment:** Automatic compilation and deployment to **GitHub Pages** on every branch push via GitHub Actions.

---

## 🚀 Local Development

Follow these steps to run the dashboard on your local machine:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/cloud-zip/PlantAI.git
   cd PlantAI
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```

4. **Build for Production:**
   ```bash
   npm run build
   ```

---

## 📦 Deployment (GitHub Pages)

Deployment is completely automated. The repository contains a GitHub Actions workflow located in `.github/workflows/deploy.yml`. 

Whenever you push changes to the `main` branch, the workflow will:
1. Initialize the Node environment.
2. Install all necessary dependencies.
3. Build the application using the correct repository subpath base `/PlantAI/`.
4. Deploy the static build files from `/dist` directly to the `gh-pages` branch.

---

## 🔌 ESP32 Integration Specs

The dashboard UI is configured to display data fetched from ESP32 edge devices. For developers looking to connect their physical hardware, the ESP32 should:
*   Perform reading loops of DHT (Temp/Humidity) and soil moisture sensors.
*   Send HTTP `POST` payloads containing sensor values to the server endpoint.
*   Retrieve water relay activation commands in response.
