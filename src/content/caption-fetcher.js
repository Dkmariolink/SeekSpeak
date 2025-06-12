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
    console.log('SeekSpeak: CaptionFetcher initializing for video:', videoId);
    
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
    const attempts = [
      // Try different combinations of language and format
      { lang: 'en', fmt: 'srv3' },     // XML format
      { lang: 'a.en', fmt: 'srv3' },   // Auto-generated XML
      { lang: 'en', fmt: 'vtt' },      // WebVTT format
      { lang: 'a.en', fmt: 'vtt' },    // Auto-generated WebVTT
      { lang: 'en', fmt: 'json3' },    // JSON format (if it works)
      { lang: 'a.en', fmt: 'json3' },  // Auto-generated JSON
      { lang: 'en' },                  // Default format
      { lang: 'a.en' }                 // Auto-generated default
    ];
    
    console.log('SeekSpeak: Trying timedtext API with multiple formats');
    
    for (const attempt of attempts) {
      try {
        let url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${attempt.lang}`;
        if (attempt.fmt) {
          url += `&fmt=${attempt.fmt}`;
        }
        
        console.log('SeekSpeak: Fetching captions from:', url);
        
        const response = await fetch(url);
        console.log('SeekSpeak: Response status:', response.status, 'for', attempt.lang, attempt.fmt || 'default');
        
        if (response.ok) {
          const responseText = await response.text();
          console.log('SeekSpeak: Response length:', responseText.length, 'format:', attempt.fmt || 'default');
          
          if (responseText.trim().length === 0) {
            console.log('SeekSpeak: Empty response, trying next format');
            continue;
          }
          
          let parsedData = null;
          
          if (attempt.fmt === 'vtt' || responseText.includes('WEBVTT')) {
            console.log('SeekSpeak: Parsing as VTT format');
            parsedData = this.parseVTTFormat(responseText);
          } else if (attempt.fmt === 'srv3' || responseText.includes('<transcript>') || responseText.includes('<text ')) {
            console.log('SeekSpeak: Parsing as XML format');
            const xmlData = this.parseXMLResponse(responseText);
            if (xmlData && xmlData.events) {
              parsedData = this.parseTimedTextFormat(xmlData.events);
            }
          } else {
            console.log('SeekSpeak: Trying JSON format');
            try {
              const jsonData = JSON.parse(responseText);
              if (jsonData.events && jsonData.events.length > 0) {
                parsedData = this.parseTimedTextFormat(jsonData.events);
              }
            } catch (jsonError) {
              console.log('SeekSpeak: JSON parse failed, trying XML');
              const xmlData = this.parseXMLResponse(responseText);
              if (xmlData && xmlData.events) {
                parsedData = this.parseTimedTextFormat(xmlData.events);
              }
            }
          }
          
          if (parsedData && parsedData.length > 0) {
            console.log('SeekSpeak: Successfully parsed', parsedData.length, 'caption segments with format:', attempt.fmt || 'default');
            return parsedData;
          } else {
            console.log('SeekSpeak: No usable data from format:', attempt.fmt || 'default');
          }
        } else {
          console.log('SeekSpeak: Failed to fetch for format:', attempt.fmt || 'default', 'Status:', response.status);
        }
      } catch (error) {
        console.warn(`SeekSpeak: Timedtext API failed for ${attempt.lang} ${attempt.fmt || 'default'}:`, error.message);
      }
    }

    console.log('SeekSpeak: All timedtext API attempts failed');
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
    console.log('SeekSpeak: Trying to extract captions from player data');
    
    try {
      // Look for player data in various possible locations
      const playerData = this.extractPlayerData();
      console.log('SeekSpeak: Player data found:', !!playerData);
      
      if (playerData && playerData.captions) {
        console.log('SeekSpeak: Captions found in player data');
        return this.parsePlayerCaptions(playerData.captions);
      } else if (playerData) {
        console.log('SeekSpeak: Player data exists but no captions property');
        // Try to find captions in different locations
        if (playerData.playerResponse) {
          console.log('SeekSpeak: Checking playerResponse for captions');
          const captions = this.extractCaptionsFromPlayerResponse(playerData.playerResponse);
          if (captions) {
            return captions;
          }
        }
      }
    } catch (error) {
      console.warn('SeekSpeak: Failed to extract from player data:', error.message);
    }
    
    return null;
  }

  extractPlayerData() {
    // Try to find YouTube's player configuration data
    console.log('SeekSpeak: Searching for player configuration data');
    
    // Method 1: Look in window variables
    if (window.ytInitialPlayerResponse) {
      console.log('SeekSpeak: Found ytInitialPlayerResponse');
      return window.ytInitialPlayerResponse;
    }
    
    // Method 2: Search in script tags
    const scripts = document.querySelectorAll('script');
    console.log('SeekSpeak: Searching through', scripts.length, 'script tags');
    
    for (const script of scripts) {
      const content = script.textContent;
      
      // Look for player configuration patterns
      const playerConfigMatch = content.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (playerConfigMatch) {
        console.log('SeekSpeak: Found player config in script tag');
        try {
          return JSON.parse(playerConfigMatch[1]);
        } catch (e) {
          console.warn('SeekSpeak: Failed to parse player config:', e);
          continue;
        }
      }
      
      // Also try var ytInitialPlayerResponse pattern
      const varMatch = content.match(/var\s+ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (varMatch) {
        console.log('SeekSpeak: Found var ytInitialPlayerResponse in script tag');
        try {
          return JSON.parse(varMatch[1]);
        } catch (e) {
          console.warn('SeekSpeak: Failed to parse var player config:', e);
          continue;
        }
      }
    }
    
    console.log('SeekSpeak: No player configuration data found');
    return null;
  }

  extractCaptionsFromPlayerResponse(playerResponse) {
    console.log('SeekSpeak: Extracting captions from playerResponse');
    
    try {
      const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (captions && captions.length > 0) {
        console.log('SeekSpeak: Found', captions.length, 'caption tracks');
        
        // Find English caption track
        const englishTrack = captions.find(track => 
          track.languageCode === 'en' || 
          track.languageCode === 'en-US' ||
          track.languageCode.startsWith('en')
        );
        
        if (englishTrack) {
          console.log('SeekSpeak: Found English caption track:', englishTrack);
          return this.fetchCaptionFromUrl(englishTrack.baseUrl);
        } else {
          console.log('SeekSpeak: No English caption track found, using first available');
          return this.fetchCaptionFromUrl(captions[0].baseUrl);
        }
      }
    } catch (error) {
      console.error('SeekSpeak: Error extracting captions from playerResponse:', error);
    }
    
    return null;
  }

  parseXMLResponse(xmlText) {
    console.log('SeekSpeak: Parsing XML response');
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check for XML parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        console.error('SeekSpeak: XML parsing error:', parseError.textContent);
        return null;
      }
      
      const textElements = xmlDoc.querySelectorAll('text');
      console.log('SeekSpeak: Found', textElements.length, 'text elements in XML');
      
      if (textElements.length === 0) {
        return null;
      }
      
      // Convert XML format to our expected JSON-like format
      const events = [];
      
      for (const textEl of textElements) {
        const start = parseFloat(textEl.getAttribute('start')) || 0;
        const dur = parseFloat(textEl.getAttribute('dur')) || 3;
        const text = textEl.textContent || '';
        
        if (text.trim()) {
          events.push({
            tStartMs: Math.floor(start * 1000),
            dDurationMs: Math.floor(dur * 1000),
            segs: [{ utf8: text.trim() }]
          });
        }
      }
      
      console.log('SeekSpeak: Converted', events.length, 'XML elements to events');
      return { events };
      
    } catch (error) {
      console.error('SeekSpeak: Error parsing XML:', error);
      return null;
    }
  }

  parsePlayerCaptions(captions) {
    console.log('SeekSpeak: Parsing player captions data');
    
    try {
      // Handle different possible caption data structures
      if (captions.playerCaptionsTracklistRenderer) {
        return this.extractCaptionsFromPlayerResponse({ captions });
      }
      
      // If it's already processed caption data
      if (Array.isArray(captions)) {
        console.log('SeekSpeak: Player captions already in array format');
        return captions;
      }
      
      // Try to extract from other possible structures
      if (captions.tracks) {
        console.log('SeekSpeak: Found tracks in player captions');
        const englishTrack = captions.tracks.find(track => 
          track.languageCode === 'en' || track.languageCode?.startsWith('en')
        );
        
        if (englishTrack && englishTrack.baseUrl) {
          return this.fetchCaptionFromUrl(englishTrack.baseUrl);
        }
      }
      
      console.log('SeekSpeak: Unknown player caption format:', captions);
      return null;
      
    } catch (error) {
      console.error('SeekSpeak: Error parsing player captions:', error);
      return null;
    }
  }

  parseFromTranscriptPanel() {
    // Fallback: try to parse from YouTube's transcript panel if it's open
    console.log('SeekSpeak: Trying to parse from transcript panel');
    
    const transcriptContainer = document.querySelector('[data-target-id="engagement-panel-searchable-transcript"]');
    
    if (transcriptContainer) {
      console.log('SeekSpeak: Found transcript container');
      const segments = [];
      const transcriptItems = transcriptContainer.querySelectorAll('[data-start-time]');
      console.log('SeekSpeak: Found', transcriptItems.length, 'transcript items');
      
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
    } else {
      console.log('SeekSpeak: No transcript container found');
      
      // Try alternative selectors
      const altSelectors = [
        '.ytd-transcript-segment-renderer',
        '.transcript-text',
        '[role="button"][data-start-time]'
      ];
      
      for (const selector of altSelectors) {
        const items = document.querySelectorAll(selector);
        if (items.length > 0) {
          console.log('SeekSpeak: Found', items.length, 'items with selector:', selector);
          // Try to extract transcript data from these elements
          break;
        }
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
    
  async fetchCaptionFromUrl(baseUrl) {
    console.log('SeekSpeak: Fetching caption from URL:', baseUrl);
    
    try {
      // Try different format parameters
      const formats = ['json3', 'srv3', 'vtt'];
      
      for (const fmt of formats) {
        const url = baseUrl + '&fmt=' + fmt;
        console.log('SeekSpeak: Trying format:', fmt, 'URL:', url);
        
        const response = await fetch(url);
        
        if (response.ok) {
          const responseText = await response.text();
          console.log('SeekSpeak: Response for format', fmt, 'length:', responseText.length);
          
          if (fmt === 'json3') {
            try {
              const data = JSON.parse(responseText);
              if (data.events && data.events.length > 0) {
                return this.parseTimedTextFormat(data.events);
              }
            } catch (e) {
              console.log('SeekSpeak: JSON parse failed for json3 format');
            }
          } else if (fmt === 'vtt') {
            return this.parseVTTFormat(responseText);
          } else if (fmt === 'srv3') {
            return this.parseXMLResponse(responseText);
          }
        }
      }
    } catch (error) {
      console.error('SeekSpeak: Error fetching caption from URL:', error);
    }
    
    return null;
  }

  parseVTTFormat(vttText) {
    console.log('SeekSpeak: Parsing VTT format');
    
    try {
      const lines = vttText.split('\n');
      const segments = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for timestamp lines (e.g., "00:00:01.000 --> 00:00:04.000")
        if (line.includes('-->')) {
          const [startStr, endStr] = line.split('-->').map(s => s.trim());
          const startTime = this.parseVTTTimestamp(startStr);
          const endTime = this.parseVTTTimestamp(endStr);
          
          // Get the text content (next non-empty line)
          let textLine = '';
          for (let j = i + 1; j < lines.length && lines[j].trim() !== ''; j++) {
            if (lines[j].trim() && !lines[j].includes('-->')) {
              textLine += lines[j].trim() + ' ';
            }
          }
          
          if (textLine.trim()) {
            segments.push({
              startTime: Math.floor(startTime),
              duration: Math.floor(endTime - startTime),
              endTime: Math.floor(endTime),
              text: textLine.trim()
            });
          }
        }
      }
      
      console.log('SeekSpeak: Parsed', segments.length, 'segments from VTT');
      return segments;
      
    } catch (error) {
      console.error('SeekSpeak: Error parsing VTT:', error);
      return null;
    }
  }

  parseVTTTimestamp(timeStr) {
    // Parse "00:00:01.000" format
    const parts = timeStr.split(':');
    if (parts.length >= 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const secondsParts = parts[2].split('.');
      const seconds = parseInt(secondsParts[0]) || 0;
      const milliseconds = parseInt(secondsParts[1]) || 0;
      
      return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
  }

  getCurrentCaptions() {
    return this.captionCache.get(this.currentVideoId) || null;
  }
}

// Create global instance
window.captionFetcher = new CaptionFetcher();

// Create global instance
window.captionFetcher = new CaptionFetcher();