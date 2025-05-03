# BitTorrent Tracker

A lightweight and efficient BitTorrent tracker implemented in TypeScript, using the Bun runtime and Express.

---

## Features

- **Full BitTorrent tracking functionality**  
  Implements the BitTorrent tracker protocol with announce, scrape, and stats endpoints.
- **Peer management**  
  Tracks active seeders and leechers for each torrent.
- **State persistence**  
  Automatically saves and loads tracker state to survive restarts.
- **Automatic cleanup**  
  Removes inactive peers to keep memory usage optimal.
- **Compact responses**  
  Supports compact peer lists for bandwidth efficiency.
- **Docker support**  
  Ready for containerized deployment.
- **Configurable**  
  Environment variables allow you to customize your tracker setup.

---

## Installation

### Prerequisites

- [Bun](https://bun.sh/) runtime

### Standard Installation

```
# Clone the repository
git clone https://github.com/team-tritan/bittorrent-tracker.git
cd bittorrent-tracker

# Install dependencies
bun install

# Start the tracker
bun start
```

### Docker Installation

```
# Clone the repository
git clone https://github.com/team-tritan/bittorrent-tracker.git
cd bittorrent-tracker

# Start with Docker Compose
docker-compose up -d
```

---

## Configuration

Configure the tracker using environment variables in a `.env` file:

- `PORT` — Port the tracker will listen on
- `DATA_DIR` — Directory to store persistent data
- `CLEANUP_INTERVAL` — Interval for cleaning up inactive peers (in ms)

---

## API Endpoints

### `/announce`

Used by BitTorrent clients to announce their presence and receive peer lists.

**Query Parameters:**

- `info_hash` — Hash of the torrent (required)
- `peer_id` — Client's peer ID (required)
- `port` — Client's listening port (required)
- `uploaded` — Bytes uploaded
- `downloaded` — Bytes downloaded
- `left` — Bytes left to download
- `compact` — Use compact peer list format (0 or 1)
- `event` — Client event (`started`, `completed`, `stopped`, or `paused`)

---

### `/scrape`

Returns statistics about one or more torrents.

**Query Parameters:**

- `info_hash` — Hash of the torrent (optional, can be specified multiple times)

---

### `/stats/summary`

Returns a summary of statistics about all tracked torrents.

---

### `/stats/details`

Returns detailed statistics about all tracked torrents.

---

## Usage with qBittorrent

To use this tracker with qBittorrent:

1. Open a torrent's **Properties**
2. Go to the **Trackers** tab
3. Add:  
   `http://your-server-ip:8080/announce`

**Alternatively:**

- Go to **Options** → **Downloads**
- Add the tracker URL to the setting that appends it to each download automatically
