import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

const MAP_ZOOM_LEVEL = 19;
const CACHE_SPAWN_GRID_SIZE = 8;
const CACHE_SPAWN_CHANCE = 0.05;
const CACHE_POSITION_ADJUST = 0.0001;
const OAKES_CLASSROOM_POSITION = leaflet.latLng(
  36.98949379578401,
  -122.06277128548504,
);
let globalSerialCounter = 0;
const totalCoins: Coin[] = [];

interface Cell {
  i: number;
  j: number;
}

interface Coin {
  cell: Cell;
  serial: number;
}

interface Cache {
  cell: Cell;
  coins: Coin[];
}

const cellMap: Map<string, Cell> = new Map();
const caches: Map<string, Coin[]> = new Map();

function cellHandler(i: number, j: number): Cell {
  const key = `${i},${j}`;
  if (!cellMap.has(key)) {
    cellMap.set(key, { i, j });
  }
  return cellMap.get(key)!;
}

function coinHandler(cell: Cell) {
  // give unique serial number
  const coin: Coin = { cell, serial: globalSerialCounter++ };
  return coin;
}

function cacheHandler(cell: Cell, initialCoins: number): Coin[] {
  const key = `${cell.i},${cell.j}`;
  if (!caches.has(key)) {
    const coins = Array.from(
      { length: initialCoins },
      () => coinHandler(cell),
    );
    caches.set(key, coins);
  }
  return caches.get(key)!;
}

const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM_POSITION,
  zoom: MAP_ZOOM_LEVEL,
  minZoom: MAP_ZOOM_LEVEL,
  maxZoom: MAP_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: MAP_ZOOM_LEVEL,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerDivIcon = leaflet.divIcon({
  html: '<div class="player-marker-circle"></div>',
  iconSize: [20, 20],
});
const playerMarker = leaflet.marker(OAKES_CLASSROOM_POSITION, {
  icon: playerDivIcon,
});
playerMarker.bindTooltip("You Are Here");
playerMarker.addTo(map);

let playerPoints = 0;
const inventoryPanel = document.querySelector<HTMLDivElement>(
  "#inventoryPanel",
)!;
inventoryPanel.innerHTML = "No coins";

function getCachePosition(i: number, j: number) {
  const latitudeAdjustment = i * CACHE_POSITION_ADJUST;
  const longitudeAdjustment = j * CACHE_POSITION_ADJUST;

  return leaflet.latLng(
    OAKES_CLASSROOM_POSITION.lat + latitudeAdjustment,
    OAKES_CLASSROOM_POSITION.lng + longitudeAdjustment,
  );
}

function createMapMarker(cell: Cell) {
  const position = getCachePosition(cell.i, cell.j);

  const marker = leaflet.marker(position);
  marker.addTo(map);

  marker.bindPopup(() => {
    const popupDiv = document.createElement("div");
    updatePopupContent(popupDiv, cell);
    return popupDiv;
  });
}

function updatePopupContent(popupDiv: HTMLDivElement, cell: Cell) {
  const cache = caches.get(`${cell.i},${cell.j}`);
  if (cache) {
    const coinsHTML = cache
      .map((coin) =>
        `<button id="collect-${coin.serial}">Collect Coin #${coin.serial}</button>`
      )
      .join("<br>");

    popupDiv.innerHTML = `    
      <div>Cache ${getCachePosition(cell.i, cell.j).lat.toFixed(6)}:${
      getCachePosition(cell.i, cell.j).lng.toFixed(6)
    }</div>
      <div>${coinsHTML}</div>
      <button id="deposit" ${
      playerPoints === 0 ? "disabled" : ""
    }>Deposit Coin</button> 
    `;

    cache.forEach((coin) => {
      popupDiv.querySelector<HTMLButtonElement>(`#collect-${coin.serial}`)!
        .addEventListener("click", () => {
          collectCoin(cell, coin.serial);
          updatePopupContent(popupDiv, cell);
        });
    });

    popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        deposit(cell);
        updatePopupContent(popupDiv, cell);
      },
    );
  }
}

function collectCoin(cell: Cell, serial: number) {
  const key = `${cell.i},${cell.j}`;
  const cache = caches.get(key);
  if (cache) {
    const coinIndex = cache.findIndex((coin) => coin.serial === serial);
    if (coinIndex !== -1) {
      const [coin] = cache.splice(coinIndex, 1);
      totalCoins.push(coin);
      playerPoints++;
      updateInventoryPanel();
    }
  }
}

function deposit(cell: Cell) {
  const key = `${cell.i},${cell.j}`;
  const cache = caches.get(key);

  if (cache && playerPoints > 0) {
    const coinToDeposit = totalCoins.pop();
    if (coinToDeposit) {
      coinToDeposit.cell = cell;
      cache.push(coinToDeposit);
      playerPoints--;
      updateInventoryPanel();
    }
  } else {
    console.log("No coins to deposit or cache not found.");
  }
}

function updateInventoryPanel() {
  const inventoryList = totalCoins
    .map((coin) => {
      return `<div>Coin #${coin.serial} at 
      ${(coin.cell.i + OAKES_CLASSROOM_POSITION.lat).toFixed(6)}: 
      ${(coin.cell.j + OAKES_CLASSROOM_POSITION.lng).toFixed(6)}</div>`;
    })
    .join("");

  if (totalCoins.length === 0) {
    inventoryPanel.innerHTML = "No coins collected.";
  } else {
    inventoryPanel.innerHTML = `
      <div>${totalCoins.length} coin(s) collected:</div>
      ${inventoryList}
    `;
  }
}

function populateMap() {
  for (let i = CACHE_SPAWN_GRID_SIZE; i > -CACHE_SPAWN_GRID_SIZE; i--) {
    for (let j = CACHE_SPAWN_GRID_SIZE; j > -CACHE_SPAWN_GRID_SIZE; j--) {
      const luckValue = luck([i, j].toString());
      if (luckValue < CACHE_SPAWN_CHANCE) {
        console.log(`i: ${i}, j: ${j}, luck: ${luckValue}`);
        const cell = cellHandler(i, j);
        const initialCoins = Math.ceil(
          luck([i, j, "initialValue"].toString()) * 5,
        );
        cacheHandler(cell, initialCoins);
        createMapMarker(cell);
      }
    }
  }
}

populateMap();
