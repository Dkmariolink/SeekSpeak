/**
 * SeekSpeak Caption Fetcher
 * Retrieves and processes YouTube video captions
 */

class CaptionFetcher {
  constructor() {
    this.currentVideoId = null;
    this.captionCache = new Map();
    this.availableLanguages = [];
  }

  async init(videoId) {
    this.currentVideoId = videoId;
    
    try {
      // Check for cached captions first
      const cached = await this.getCachedCaptions(videoId);
      if (cached) {
        console.log('SeekSpeak: Using cached captions for', videoId);
        return cached;
      }

      // Fetch fresh captions
      console.log('SeekSpeak: Fetching captions for video', videoId);
      const captions = await this.fetchCaptions(videoId);
      
      if (captions && captions.length > 0) {
        // Process and cache the captions
        const processed = this.processCaptionData(captions);
        await this.cacheCaption(videoId, processed);
        
        console.log('SeekSpeak: Successfully fetched', processed.segments.length, 'caption segments');
        return processed;
      } else {
        console.warn('SeekSpeak: No captions available for video', videoId);
        return null;
      }
      
    } catch (error) {
      console.error('SeekSpeak: Error fetching captions:', error);
      return null;
    }
  }

  async fetchCaptions(videoId) {
    // Try multiple methods to get captions
    const methods = [
      () => this.fetchFromTimedTextAPI(videoId),
      () => this.fetchFromPlayerData(videoId),
      () => this.parseFromTranscriptPanel()
    ];

    for (const method of methods) {
      try {
        const result = await method();
        if (result) {
          return result;
        }
      } catch (error) {
        console.warn('SeekSpeak: Caption fetch method failed:', error.message);
      }
    }

    return null;
  }

  async fetchFromTimedTextAPI(videoId) {
    // YouTube's internal timedtext API (primary method)
    const languages = ['en', 'en-US', 'en-GB']; // Try English first
    
    for (const lang of languages) {
      try {
        const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.events && data.events.length > 0) {
            console.log('SeekSpeak: Captions fetched via timedtext API for language:', lang);
            return this.parseTimedTextFormat(data.events);
          }
        }
      } catch (error) {
        console.warn(`SeekSpeak: Timedtext API failed for ${lang}:`, error.message);
      }
    }

    return null;
  }

  parseTimedTextFormat(events) {
    const segments = [];
    
    for (const event of events) {
      if (event.segs) {
        const startTime = Math.floor(event.tStartMs / 1000); // Convert to seconds
        const duration = Math.floor(event.dDurationMs / 1000);
        
        // Combine all text segments in this event
        const text = event.segs
          .map(seg => seg.utf8 || '')
          .join('')
          .trim();
        
        if (text) {
          segments.push({
            startTime,
            duration,
            endTime: startTime + duration,
            text
          });
        }
      }
    }
    
    return segments;
  }

  async fetchFromPlayerData(videoId) {
    // Try to extract caption data from YouTube's player configuration
    try {
      // Look for player data in various possible locations
      const playerData = this.extractPlayerData();
      
      if (playerData && playerData.captions) {
        console.log('SeekSpeak: Captions found in player data');
        return this.parsePlayerCaptions(playerData.captions);
      }
    } catch (error) {
      console.warn('SeekSpeak: Failed to extract from player data:', error.message);
    }
    
    return null;
  }

  extractPlayerData() {
    // Try to find YouTube's player configuration data
    const scripts = document.querySelectorAll('script');
    
    for (const script of scripts) {
      const content = script.textContent;
      
      // Look for player configuration patterns
      const playerConfigMatch = content.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (playerConfigMatch) {
        try {
          return JSON.parse(playerConfigMatch[1]);
        } catch (e) {
          continue;
        }
      }
    }
    
    return null;
  }

  parseFromTranscriptPanel() {
    // Fallback: try to parse from YouTube's transcript panel if it's open
    const transcriptContainer = document.querySelector('[data-target-id="engagement-panel-searchable-transcript"]');
    
    if (transcriptContainer) {
      const segments = [];
      const transcriptItems = transcriptContainer.querySelectorAll('[data-start-time]');
      
      for (const item of transcriptItems) {
        const startTime = parseInt(item.dataset.startTime);
        const textElement = item.querySelector('.segment-text');
        
        if (textElement && startTime >= 0) {
          segments.push({
            startTime,
            duration: 3, // Estimate duration
            endTime: startTime + 3,
            text: textElement.textContent.trim()
          });
        }
      }
      
      if (segments.length > 0) {
        console.log('SeekSpeak: Captions parsed from transcript panel');
        return segments;
      }
    }
    
    return null;
  }

  processCaptionData(rawSegments) {
    if (!rawSegments || rawSegments.length === 0) {
      return null;
    }

    // Sort segments by start time
    const sortedSegments = rawSegments.sort((a, b) => a.startTime - b.startTime);
    
    // Clean and normalize text
    const segments = sortedSegments.map(segment => ({
      ...segment,
      text: this.cleanText(segment.text)
    })).filter(segment => segment.text.length > 0);

    return {
      videoId: this.currentVideoId,
      totalSegments: segments.length,
      totalDuration: segments.length > 0 ? segments[segments.length - 1].endTime : 0,
      segments,
      processedAt: Date.now()
    };
  }

  cleanText(text) {
    return text
      .replace(/\r?\n/g, ' ')        // Remove line breaks
      .replace(/\s+/g, ' ')          // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '')  // Remove unusual characters
      .trim();
  }

  async cacheCaption(videoId, processedData) {
    // Cache in memory for current session
    this.captionCache.set(videoId, processedData);
    
    // Also store in Chrome's session storage
    try {
      await chrome.runtime.sendMessage({
        type: 'STORE_CAPTIONS',
        videoId,
        captions: processedData
      });
    } catch (error) {
      console.warn('SeekSpeak: Failed to store captions in background:', error);
    }
  }

  async getCachedCaptions(videoId) {
    // Check memory cache first
    if (this.captionCache.has(videoId)) {
      return this.captionCache.get(videoId);
    }
    
    // Check Chrome storage
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CAPTIONS',
        videoId
      });
      
      if (response && !response.error) {
        // Add to memory cache
        this.captionCache.set(videoId, response);
        return response;
      }
    } catch (error) {
      console.warn('SeekSpeak: Failed to get cached captions:', error);
    }
    
    return null;
  }

  getCurrentCaptions() {
    return this.captionCache.get(this.currentVideoId) || null;
  }
}

// Create global instance
window.captionFetcher = new CaptionFetcher();