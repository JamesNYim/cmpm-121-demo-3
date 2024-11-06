import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";
import "./style.css";

// Start location and gameplay settings
const START_LOCATION = leaflet.latLng(35.6595, 139.7006);
const ZOOM_LEVEL = 19;
const TILE_SIZE = 1e-4;
const AREA_SIZE = 8;
const CACHE_PROBABILITY = 0.1;

// Initialize map
const map = leaflet.map(document.getElementById("map")!, {
  center: START_LOCATION,
  zoom: ZOOM_LEVEL,
  minZoom: ZOOM_LEVEL,
  maxZoom: ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Add base layer
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// Player's position
const playerMarker = leaflet.marker(START_LOCATION, { title: "Your position" })
.addTo(map);

// Track player's coins
let playerCoins = 0;

// Sample status DOM reference
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "Coins: 0";

// Function to spawn caches
function spawnCache(i: number, j: number) {
  const origin = START_LOCATION;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_SIZE, origin.lng + j * TILE_SIZE],
    [origin.lat + (i + 1) * TILE_SIZE, origin.lng + (j + 1) * TILE_SIZE],
  ]);

  // Rectangle to represent cache
  const cache = {
    rect: leaflet.rectangle(bounds).addTo(map),
    coins: Math.floor(Math.random() * 20),
  };

  // Popup interaction
  cache.rect.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>Cache location [${i}, ${j}]. Coins: <span id="value">${cache.coins}</span></div>
      <button id="collect">Collect</button>
      <button id="deposit">Deposit</button>`;

    // Button interaction for collecting and depositing:
    popupDiv.querySelector("#collect")!.addEventListener("click", () => {
      if (cache.coins > 0) {
        cache.coins--;
        playerCoins++;
        statusPanel.innerHTML = `Coins: ${playerCoins}`;
        popupDiv.querySelector("#value")!.innerHTML = cache.coins.toString();
      }
    });

    popupDiv.querySelector("#deposit")!.addEventListener("click", () => {
      if (playerCoins > 0) {
        cache.coins++;
        playerCoins--;
        statusPanel.innerHTML = `Coins: ${playerCoins}`;
        popupDiv.querySelector("#value")!.innerHTML = cache.coins.toString();
      }
    });

    return popupDiv;
  });
}

// Detect nearby caches and enable interactions
for (let i = -AREA_SIZE; i < AREA_SIZE; i++) {
  for (let j = -AREA_SIZE; j < AREA_SIZE; j++) {
    if (Math.random() < CACHE_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
