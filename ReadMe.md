# BitTorrent Tracker

A lightweight and efficient BitTorrent tracker implementation in TypeScript using Bun runtime and Express.

## Features

- **Full BitTorrent tracking functionality**: Implements the BitTorrent tracker protocol with announce, scrape, and stats endpoints
- **Peer management**: Tracks active seeders and leechers for each torrent
- **State persistence**: Automatically saves and loads tracker state to survive restarts
- **Automatic cleanup**: Removes inactive peers to keep memory usage optimal
- **Compact responses**: Supports compact peer lists for bandwidth efficiency
- **Docker support**: Ready for containerized deployment
- **Configurable**: Environment variables to customize your tracker setup

## Installation

### Prerequisites

- [Bun](https://bun.sh/) runtime

### Standard Installation

```bash
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

### Configuration

Configure the tracker using environment variables in .env file.
`PORT`, `DATA_DIR`, `CLEANUP_INTERVAL`

### API Endpoints

`/announce` - Used by BitTorrent clients to announce their presence and get peer lists.

**Params:**

- info_hash: Hash of the torrent (required)
- peer_id: Client's peer ID (required)
- port: Client's listening port (required)
- uploaded: Bytes uploaded
- downloaded: Bytes downloaded
- left: Bytes left to download
- compact: Whether to use compact peer list format (0 or 1)
- event: Client event (started, completed, stopped, or paused)

`/scrape` - Used to query statistics about torrents.

**Params:**

- info_hash: Hash of the torrent (optional, can be specified multiple times)

`/stats/summary` - Provides a summary of statistics about all tracked torrents.

`/stats/details` - Provides a detailed statistics about all tracked torrents.

### Usage with qBittorrent

To use this tracker with qBittorrent:

In qBittorrent, go to a torrent's properties

Click the "Trackers" tab

Add http://your-server-ip:8080/announce to the trackers list manually

**OR**

go into options and add the link to the torrent setting that appends it to each download automatically.
