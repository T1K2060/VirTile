/**
 * Level Loader
 * Loads beatmaps from GitHub in the specified format
 * Format: Folder with Song.mp3, Icon.png, Hard.json, Mania.json, Chart.json
 * Metadata: Star rating, Ranked status, Chart_type (Acc), etc.
 */

export class LevelLoader {
  constructor() {
    // Default GitHub repository for beatmaps
    // Structure: Levels/SongName/map data (Song.mp3, Icon.png, Hard.json, etc.)
    // Correct raw GitHub URL format: /refs/heads/main/
    this.baseUrl = 'https://raw.githubusercontent.com/T1K2060/Levels/refs/heads/main/';
    this.levelsPath = 'Levels/';
    
    // Cache for loaded levels
    this.cache = new Map();
  }

  setBaseUrl(url) {
    // Handle both full URLs and partial paths
    if (url.includes('github.com')) {
      // Convert GitHub web URL to raw URL
      url = url.replace('github.com', 'raw.githubusercontent.com');
      url = url.replace('/tree/', '/');
      // Ensure proper refs/heads/main format for raw GitHub
      if (!url.includes('refs/heads/') && url.includes('/main/')) {
        url = url.replace('/main/', '/refs/heads/main/');
      }
    }
    this.baseUrl = url.endsWith('/') ? url : url + '/';
  }

  /**
   * Build URL for level files
   * New structure: Levels/SongName/file
   */
  buildUrl(levelName, filename) {
    return `${this.baseUrl}${this.levelsPath}${levelName}/${filename}`;
  }

  /**
   * Get difficulty display name from filename
   * Converts "extremely_hard.json" to "Extremely Hard"
   */
  getDifficultyDisplayName(filename) {
    // Remove .json extension
    let name = filename.replace('.json', '');
    // Replace underscores with spaces
    name = name.replace(/_/g, ' ');
    // Capitalize each word
    return name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  /**
   * Get sort order based on star rating
   * Charts are sorted by star rating (lowest to highest)
   */
  getDifficultyOrder(chart) {
    return chart.starRating || 0;
  }

  /**
   * Load a level by name
   * @param {string} levelName - The folder name of the level
   * @returns {Promise<Object>} Level data object
   */
  async load(levelName) {
    // Check cache
    if (this.cache.has(levelName)) {
      console.log(`Loading ${levelName} from cache`);
      return this.cache.get(levelName);
    }

    console.log(`Loading level: ${levelName}`);

    try {
      // Load metadata (meta.json)
      const meta = await this.loadMetadata(levelName);
      
      // Load chart data (Hard.json, Mania.json, etc.)
      const charts = await this.loadCharts(levelName, meta);
      
      // Get audio URL
      const audio = this.getAudioUrl(levelName);
      
      // Get icon URL
      const icon = this.getIconUrl(levelName);
      
      const levelData = {
        name: levelName,
        meta,
        charts,
        audio,
        icon,
        loaded: true
      };
      
      // Cache the level
      this.cache.set(levelName, levelData);
      
      console.log(`Level ${levelName} loaded successfully`);
      return levelData;
      
    } catch (error) {
      console.error(`Failed to load level ${levelName}:`, error);
      throw error;
    }
  }

  /**
   * Load metadata from meta.txt (text format)
   * Supports both JSON content and key=value format
   */
  async loadMetadata(levelName) {
    const metaUrl = this.buildUrl(levelName, 'meta.txt');
    
    try {
      const response = await fetch(metaUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      let metaData = {};
      
      // Try to parse as JSON first
      try {
        const json = JSON.parse(text);
        metaData = json.meta || json;
      } catch (e) {
        // Not JSON, parse as key=value format
        text.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            // Try to parse numbers
            if (!isNaN(value) && value !== '') {
              metaData[key.trim()] = Number(value);
            } else if (value === 'true' || value === 'false') {
              metaData[key.trim()] = value === 'true';
            } else {
              metaData[key.trim()] = value;
            }
          }
        });
      }
      
      // Validate and set defaults
      return {
        title: metaData.song_name || metaData.title || levelName,
        artist: metaData.artist || 'Unknown Artist',
        mapper: metaData.mapper || 'Unknown Mapper',
        bpm: metaData.bpm || 120,
        duration: metaData.duration || 0,
        previewTime: metaData.previewTime || 20,
        tags: metaData.tags || [],
        ...metaData
      };
      
    } catch (error) {
      console.warn(`No meta.txt found for ${levelName}, using defaults`);
      return {
        title: levelName,
        artist: 'Unknown Artist',
        mapper: 'Unknown Mapper',
        bpm: 120,
        duration: 0,
        previewTime: 0,
        tags: []
      };
    }
  }

  /**
   * Load all available chart files
   * First tries to load charts.json index, then falls back to discovery
   */
  async loadCharts(levelName, meta) {
    const charts = {};
    const chartFiles = [];
    
    // Try to load charts.json index file first (lists available charts)
    try {
      const indexUrl = this.buildUrl(levelName, 'charts.json');
      const response = await fetch(indexUrl);
      if (response.ok) {
        const index = await response.json();
        const chartList = index.charts || index.files || [];
        
        for (const filename of chartList) {
          try {
            const name = filename.replace('.json', '');
            const chart = await this.loadChartFile(levelName, name);
            if (chart) {
              const displayName = this.getDifficultyDisplayName(filename);
              chart.displayName = displayName;
              chart.fileName = filename;
              chart.sortOrder = this.getDifficultyOrder(chart);
              charts[displayName] = chart;
              chartFiles.push({ name: displayName, chart, sortOrder: chart.sortOrder });
            }
          } catch (error) {
            // Skip invalid charts
          }
        }
        
        if (chartFiles.length > 0) {
          chartFiles.sort((a, b) => a.sortOrder - b.sortOrder);
          this.lastChartList = chartFiles.map(c => ({ name: c.name, fileName: c.chart.fileName }));
          return charts;
        }
      }
    } catch (error) {
      // No charts.json, continue to discovery
    }
    
    // Silent discovery - only log success, not failures
    const commonNames = ['Easy', 'Normal', 'Hard', 'Expert', 'Maniac', 'Mania', 'Chart'];
    
    for (const name of commonNames) {
      try {
        const chart = await this.loadChartFileSilent(levelName, name);
        if (chart) {
          const displayName = this.getDifficultyDisplayName(name + '.json');
          chart.displayName = displayName;
          chart.fileName = name + '.json';
          chart.sortOrder = this.getDifficultyOrder(chart);
          charts[displayName] = chart;
          chartFiles.push({ name: displayName, chart, sortOrder: chart.sortOrder });
          console.log(`Loaded chart: ${displayName} (${chart.starRating}★)`);
        }
      } catch (error) {
        // Silently skip missing charts
      }
    }
    
    // Sort charts by star rating (lowest to highest, left to right)
    chartFiles.sort((a, b) => a.sortOrder - b.sortOrder);
    
    // Store sorted chart list
    this.lastChartList = chartFiles.map(c => ({ name: c.name, fileName: c.chart.fileName }));
    
    return charts;
  }

  /**
   * Load a chart file silently (no 404 console spam)
   */
  async loadChartFileSilent(levelName, fileName) {
    const chartUrl = this.buildUrl(levelName, `${fileName}.json`);
    
    try {
      const response = await fetch(chartUrl);
      if (!response.ok) {
        return null;
      }
      
      const chartData = await response.json();
      return this.parseChart(chartData, fileName);
    } catch (error) {
      return null;
    }
  }

  /**
   * Load a specific chart file
   */
  async loadChartFile(levelName, fileName) {
    const chartUrl = this.buildUrl(levelName, `${fileName}.json`);
    
    const response = await fetch(chartUrl);
    if (!response.ok) {
      return null;
    }
    
    const chartData = await response.json();
    
    // Parse and validate chart format
    return this.parseChart(chartData, fileName);
  }

  /**
   * Parse chart data into standardized format
   * Supports the simpler format:
   * {
   *   settings: { star, ranked, chart_type, lane_count, note_speed, ... },
   *   notes: [...]
   * }
   * Or direct properties:
   * {
   *   Star: 1.56,
   *   Ranked: false,
   *   Chart_type: "Acc",
   *   lane_count: 4,
   *   notes: [...]
   * }
   */
  parseChart(chartData, fileName) {
    // Handle both formats (direct or nested in settings)
    const settings = chartData.settings || chartData;
    
    const parsed = {
      fileName: fileName + '.json',
      difficulty: this.getDifficultyDisplayName(fileName + '.json'),
      starRating: settings.star || settings.Star || 0,
      ranked: settings.ranked || settings.Ranked || false,
      chartType: settings.chart_type || settings.Chart_type || 'Acc',
      laneCount: settings.lane_count || settings.laneCount || 4,
      noteSpeed: settings.note_speed || settings.noteSpeed || 1.0,
      bpm: settings.bpm || 120,
      offset: settings.offset || 0,
      notes: [],
      events: [],
      timingPoints: []
    };
    
    // Parse notes - detect hold notes by endTime
    if (chartData.notes && Array.isArray(chartData.notes)) {
      parsed.notes = chartData.notes.map((note, index) => {
        const hasEndTime = note.endTime !== undefined || note.end !== undefined;
        return {
          id: index,
          time: note.time || 0,
          lane: note.lane || 0,
          type: hasEndTime ? 'hold' : 'tap',
          endTime: note.endTime || note.end || null,
          velocity: note.velocity || 1
        };
      });
    }
    
    // Parse timing points if present
    if (chartData.timingPoints) {
      parsed.timingPoints = chartData.timingPoints;
    }
    
    return parsed;
  }

  /**
   * Get audio file URL
   */
  getAudioUrl(levelName) {
    return this.buildUrl(levelName, 'Song.mp3');
  }

  /**
   * Get icon/background image URL
   */
  getIconUrl(levelName) {
    return this.buildUrl(levelName, 'Icon.png');
  }

  /**
   * Get song duration by loading audio metadata
   */
  async getSongDuration(audioUrl) {
    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        resolve(0);
      });
      // Timeout fallback
      setTimeout(() => resolve(0), 5000);
    });
  }

  /**
   * Load multiple levels (for song select screen)
   * Fetches from the configured GitHub repository
   */
  async loadLevelList() {
    // Known song folders to try (can be expanded or fetched dynamically)
    const knownSongs = ['Metronome', 'Tutorial'];
    
    const levels = [];
    
    for (const levelName of knownSongs) {
      try {
        const level = await this.load(levelName);
        // Get song duration
        const duration = await this.getSongDuration(level.audio);
        level.meta.duration = duration;
        level.formattedDuration = this.formatDuration(duration);
        levels.push(level);
      } catch (error) {
        console.warn(`Could not load ${levelName}:`, error.message);
      }
    }
    
    return levels;
  }

  /**
   * Format duration in seconds to MM:SS
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get available difficulties for a level
   */
  getAvailableDifficulties(level) {
    if (!level || !level.charts) return [];
    
    const difficulties = Object.entries(level.charts).map(([name, chart]) => ({
      name: name,
      fileName: chart.fileName,
      starRating: chart.starRating,
      ranked: chart.ranked,
      sortOrder: chart.sortOrder || 999
    }));
    
    // Sort by star rating (lowest to highest)
    return difficulties.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get cached level list (fast)
   */
  getCachedLevelList() {
    return Array.from(this.cache.values());
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Check if a level exists
   */
  async levelExists(levelName) {
    try {
      const response = await fetch(this.buildUrl(levelName, 'meta.json'), {
        method: 'HEAD'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get difficulty display info
   */
  getDifficultyInfo(difficulty, starRating) {
    const colors = {
      'Easy': '#00ff88',
      'Normal': '#00d4ff',
      'Hard': '#ffaa00',
      'Expert': '#ff3366',
      'Maniac': '#ff00ff',
      'Mania': '#a020f0'
    };
    
    return {
      name: difficulty,
      color: colors[difficulty] || '#ffffff',
      stars: starRating,
      display: `${difficulty} ★${starRating.toFixed(2)}`
    };
  }
}
