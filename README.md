# Smart City Dashboard — Live (Frontend)

## Overview

This project is a **Smart City Dashboard** frontend that provides real-time insights and visualizations for urban data including traffic trends, air pollution breakdown, live events, and interactive maps. It is designed as a simulation and demo for a smart city monitoring system.

The dashboard features:

- **Traffic trend line chart**  
- **Pollution breakdown bar chart** with multiple pollutants  
- **Interactive Leaflet map** with heatmap and event markers  
- **Live event listings** updated dynamically  
- **Voice command support** for navigation and data refresh  
- **city support** — City with live updates and city-specific events  
- **Simulated live data** with easy toggle between real and simulated data  

---

## Features
## Features

- Responsive UI built with **HTML**, **CSS** (using **Tailwind CSS** for styling)  
- Dynamic charts rendered with **Chart.js** for traffic and pollution data visualization  
- Interactive maps powered by **Leaflet.js** with heatmap overlays and event markers  
- Voice recognition and command handling using the **Web Speech API** (browser-native)  
- Simulated live data updates and toggling simulation mode in frontend only (no backend)  
- Custom alert notifications and simple traffic prediction using linear regression implemented in JavaScript  
- Data caching using **localStorage** to allow offline resilience and faster reloads  
- City selection with predefined city coordinates and events, updating map and charts dynamically  
---

## Setup & Usage

1. Clone this repository:

   ```bash
   git clone https://github.com/hemanth-ghk/ghk/smart-city-dashboard.git
   cd smart-city-dashboard
