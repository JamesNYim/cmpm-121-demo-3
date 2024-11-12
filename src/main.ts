// Import Leaflet, styles, and other necessary modules
// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

// Define constants and settings
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Player state management (inventory, score, etc.)
let playerPoints = 0;
let playerInventory: Coin[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;

// Initialize the map
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Add map tiles and player marker
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Flyweight Pattern: CacheLocation factory to ensure unique locations
class CacheLocationFactory {
  private locations: { [key: string]: CacheLocation } = {};

  getCacheLocation(i: number, j: number): CacheLocation {
    const key = `${i}:${j}`;
    if (!this.locations[key]) {
      this.locations[key] = new CacheLocation(i, j);
    }
    return this.locations[key];
  }
}

// CacheLocation class to represent cache locations and manage coins
class CacheLocation {
  private coins: Coin[] = [];

  constructor(public i: number, public j: number) {
    // Generate a random offering of coins at each location deterministically
    const coinCount = Math.floor(luck([i, j, "coinCount"].toString()) * 5) + 1;
    for (let serial = 0; serial < coinCount; serial++) {
      this.coins.push(new Coin(i, j, serial));
    }
  }

  getCoins(): Coin[] {
    return this.coins;
  }

  collectCoin(): Coin | null {
    return this.coins.length > 0 ? this.coins.pop()! : null;
  }

  addCoin(coin: Coin) {
    this.coins.push(coin);
  }
}

// Coin class to represent unique coins at each cache location
class Coin {
  public origin: { i: number, j: number };

  constructor(public i: number, public j: number, public serial: number) {
    this.origin = { i, j }; // Store the original spawn location
  }

  getId(): string {
    return `[${this.origin.i}:${this.origin.j}#${this.serial}]`;
  }
}

// Facade Pattern: Main game management class
class Game {
  private cacheLocationFactory = new CacheLocationFactory();

  private updatePopupContent(popupDiv: HTMLDivElement, cacheLocation: CacheLocation) {
    popupDiv.innerHTML = `
      <div>Cache at "${cacheLocation.i},${cacheLocation.j}".</div>
      <div>Coins: ${cacheLocation.getCoins().map(coin => coin.getId()).join(", ")}</div>
      <button id="collect">Collect Coin</button>
      <button id="deposit">Deposit Coin</button>`;

    // Collect Coin button functionality
    popupDiv.querySelector<HTMLButtonElement>("#collect")!.addEventListener("click", () => {
      const collectedCoin = cacheLocation.collectCoin();
      if (collectedCoin) {
        playerInventory.push(collectedCoin);
        playerPoints++;
        statusPanel.innerHTML = `Points: ${playerPoints}. Inventory: ${playerInventory.map(c => c.getId()).join(", ")}`;
        this.updatePopupContent(popupDiv, cacheLocation); // Refresh popup after collecting
      }
    });

    // Deposit Coin button functionality
    popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener("click", () => {
      if (playerInventory.length > 0) {
        const depositedCoin = playerInventory.pop()!;
        cacheLocation.addCoin(depositedCoin);
        playerPoints--;
        statusPanel.innerHTML = `Points: ${playerPoints}. Inventory: ${playerInventory.map(c => c.getId()).join(", ")}`;
        this.updatePopupContent(popupDiv, cacheLocation); // Refresh popup after depositing
      }
    });
  }

  spawnCache(i: number, j: number): void {
    const cacheLocation = this.cacheLocationFactory.getCacheLocation(i, j);

    const origin = OAKES_CLASSROOM;
    const bounds = leaflet.latLngBounds([
      [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
      [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
    ]);

    const rect = leaflet.rectangle(bounds);
    rect.addTo(map);

    rect.bindPopup(() => {
      const popupDiv = document.createElement("div");
      this.updatePopupContent(popupDiv, cacheLocation); // Set up popup with content
      return popupDiv;
    });
  }

  // Populate caches around the player
  spawnNeighborhood() {
    for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
      for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
        if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
          this.spawnCache(i, j);
        }
      }
    }
  }
}

// Start the game
const game = new Game();
game.spawnNeighborhood();
