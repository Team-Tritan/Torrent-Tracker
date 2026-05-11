# Torrent Tracker

A lightweight and efficient Torrent tracker implemented in TypeScript, using the Bun runtime and Express.

---

## Features

- **Full Torrent tracking functionality**  
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
git clone https://github.com/team-tritan/torrent-tracker.git
cd torrent-tracker

# Install dependencies
bun install

# Start the tracker
bun start
```

### Docker Installation

```
# Clone the repository
git clone https://github.com/team-tritan/torrent-tracker.git
cd torrent-tracker

# Start with Docker Compose
docker compose up -d
```

---

## Configuration

Configure the tracker using environment variables in a `.env` file:

- `PORT` - Port the tracker will listen on
- `DATA_DIR` - Directory to store persistent data
- `CLEANUP_INTERVAL` - Interval for cleaning up inactive peers (in ms)
- `REDIS_HOST` - Hostname for redis, defaulted to docker networking
- `REDIS_PORT` - Ditto to above
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

### `/stats`

Returns a summary of statistics about all tracked torrents.

---

### `/stats/details`

Returns detailed statistics about all tracked torrents.

---
### `/torrent/:infoHash`

Returns detailed information about a specific torrent currently being tracked.

**Path Parameters:**

* `infoHash` — The torrent info hash (required)

**Description:**

This endpoint provides a full snapshot of a single torrent’s current swarm state, including peer-level and aggregate statistics. It is primarily intended for debugging, monitoring, and administrative visibility rather than client usage.

It returns:

* Total number of peers in the swarm
* Seeder and leecher counts
* Aggregate upload and download totals
* Per-client breakdown (based on peer ID prefix)
* Full peer list with connection metadata

**Example Request:**

```http
GET /torrent/<infoHash>
```

**Example Response:**

```json
{
  "infoHash": "...",
  "totalPeers": 12,
  "seeders": 5,
  "leechers": 7,
  "uploaded": 12345678,
  "downloaded": 9876543,
  "hasSeederAndLeecher": true,
  "clients": {
    "qB": 4,
    "TR": 3
  },
  "peers": [
    {
      "peerId": "...",
      "ip": "1.2.3.4",
      "port": 6881,
      "uploaded": 1234,
      "downloaded": 5678,
      "left": 0,
      "isSeeder": true,
      "lastSeen": 1710000000000
    }
  ]
}
```
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
