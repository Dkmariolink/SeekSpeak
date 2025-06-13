/**
 * SeekSpeak Caption Fetcher
 * Retrieves and processes YouTube video captions
 */

class CaptionFetcher {
  constructor() {
    this.currentVideoId = null;
    this.captionCache = new Map();
    this.availableLanguages = [];
    this.userOpenedTranscript = false;
  }

  async init(videoId) {
    this.currentVideoId = videoId;
    this.userOpenedTranscript = false; // Reset for new video
    console.log('SeekSpeak: CaptionFetcher initializing for video:', videoId);
    
    // Small delay to let page settle before attempting extraction
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      // Check for cached captions first
      const cached = await this.getCachedCaptions(videoId);
      if (cached && cached.segments && cached.segments.length > 0) {
        console.log('SeekSpeak: Using cached captions for', videoId, '- no extraction needed');
        return cached;
      }

      // Fetch fresh captions if not cached
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
    console.log('SeekSpeak: Starting fetchCaptions for', videoId);
    
    // Check for cached captions first
    const cached = await this.getCachedCaptions(videoId);
    if (cached && cached.segments && cached.segments.length > 0) {
      console.log('SeekSpeak: Using cached captions for', videoId, ':', cached.segments.length, 'segments');
      return cached.segments;
    }
    
    console.log('SeekSpeak: No cached captions found for', videoId, '- fetching fresh captions');
    
    // Show custom loading overlay instead of transcript flash
    if (window.seekSpeakCustomUI) {
      window.seekSpeakCustomUI.showLoadingOverlay("Extracting captions...");
    }
    
    try {
      // Try multiple methods to get captions with custom loading updates
      const methods = [
        {
          name: "YouTube Internal Data",
          fn: () => this.extractFromYouTubeInternals(videoId)
        },
        {
          name: "Page Data Scraping",
          fn: () => this.extractFromPageData(videoId)
        },
        {
          name: "Player Data",
          fn: () => this.fetchFromPlayerData(videoId)
        },
        {
          name: "Existing Transcript",
          fn: () => this.parseFromTranscriptPanel()
        },
        {
          name: "TimedText API",
          fn: () => this.fetchFromTimedTextAPI(videoId)
        },
        {
          name: "Transcript Panel",
          fn: () => this.tryTranscriptPanelAccessWithCustomUI(videoId)
        }
      ];

      console.log('SeekSpeak: [DEBUG] fetchCaptions methods array length:', methods.length);

      for (let i = 0; i < methods.length; i++) {
        const method = methods[i];
        try {
          console.log('SeekSpeak: [DEBUG] Trying extraction method', i + 1, 'of', methods.length, ':', method.name);
          
          // Update loading progress
          if (window.seekSpeakCustomUI) {
            window.seekSpeakCustomUI.updateLoadingProgress(`Trying ${method.name}...`);
          }
          
          const result = await method.fn();
          if (result && result.length > 0) {
            console.log('SeekSpeak: [DEBUG] Successfully extracted', result.length, 'segments using', method.name);
            
            // Cache the successful result
            await this.cacheCaption(videoId, {
              segments: result,
              processedAt: Date.now(),
              source: method.name
            });
            
            // Update success message
            if (window.seekSpeakCustomUI) {
              window.seekSpeakCustomUI.updateLoadingProgress(`Successfully loaded ${result.length} segments!`);
              setTimeout(() => window.seekSpeakCustomUI.hideLoadingOverlay(), 1000);
            }
            
            return result;
          } else {
            console.log('SeekSpeak: [DEBUG] Method', method.name, 'returned no results');
          }
        } catch (error) {
          console.warn('SeekSpeak: Caption fetch method', method.name, 'failed:', error.message);
        }
      }

      // All methods failed - try fallback approach
      console.log('SeekSpeak: [DEBUG] All extraction methods failed, trying fallback...');
      
      if (window.seekSpeakCustomUI) {
        window.seekSpeakCustomUI.updateLoadingProgress("Creating fallback captions...");
      }
      
      const fallback = await this.createFallbackCaptions(videoId);
      
      if (window.seekSpeakCustomUI) {
        setTimeout(() => window.seekSpeakCustomUI.hideLoadingOverlay(), 1500);
      }
      
      return fallback;
      
    } catch (error) {
      console.error('SeekSpeak: Error in fetchCaptions:', error);
      
      if (window.seekSpeakCustomUI) {
        window.seekSpeakCustomUI.hideLoadingOverlay();
      }
      
      return await this.createFallbackCaptions(videoId);
    }
  }

  async fetchFromTimedTextAPI(videoId) {
    // YouTube's internal timedtext API with multiple format attempts and additional parameters
    const attempts = [
      { lang: 'en', fmt: 'srv3', name: '' },     // XML format
      { lang: 'a.en', fmt: 'srv3', name: '' },   // Auto-generated XML
      { lang: 'en', fmt: 'vtt', name: '' },      // WebVTT format  
      { lang: 'a.en', fmt: 'vtt', name: '' },    // Auto-generated WebVTT
      { lang: 'en', fmt: 'json3', name: '' },    // JSON format
      { lang: 'a.en', fmt: 'json3', name: '' },  // Auto-generated JSON
      { lang: 'en', name: '' },                  // Default format
      { lang: 'a.en', name: '' }                 // Auto-generated default
    ];
    
    console.log('SeekSpeak: Trying timedtext API with multiple formats');
    
    for (const attempt of attempts) {
      try {
        let url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${attempt.lang}`;
        if (attempt.fmt) {
          url += `&fmt=${attempt.fmt}`;
        }
        if (attempt.name !== undefined) {
          url += `&name=${attempt.name}`;
        }
        // Add additional parameters that might help
        url += `&tlang=en&ts=0&kind=asr`;
        
        console.log('SeekSpeak: Fetching captions from:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'User-Agent': navigator.userAgent,
            'Referer': window.location.href
          },
          credentials: 'same-origin'
        });
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
            parsedData = this.parseXMLResponse(responseText);
          }
          
          if (parsedData && parsedData.length > 0) {
            console.log('SeekSpeak: Successfully parsed', parsedData.length, 'caption segments');
            return parsedData;
          }
        }
      } catch (error) {
        console.warn(`SeekSpeak: Timedtext API failed for ${attempt.lang}:`, error.message);
      }
    }

    return null;
  }

  async extractFromYouTubeInternals(videoId) {
    console.log('SeekSpeak: [DEBUG] Starting extractFromYouTubeInternals for', videoId);
    
    try {
      // Method 1: Check ytInitialPlayerResponse
      console.log('SeekSpeak: [DEBUG] Checking window.ytInitialPlayerResponse');
      if (window.ytInitialPlayerResponse) {
        console.log('SeekSpeak: [DEBUG] ytInitialPlayerResponse exists');
        
        if (window.ytInitialPlayerResponse.captions) {
          console.log('SeekSpeak: Found captions in ytInitialPlayerResponse');
          const playerCaptions = window.ytInitialPlayerResponse.captions;
          
          if (playerCaptions.playerCaptionsTracklistRenderer && 
              playerCaptions.playerCaptionsTracklistRenderer.captionTracks) {
            
            const tracks = playerCaptions.playerCaptionsTracklistRenderer.captionTracks;
            console.log('SeekSpeak: Found', tracks.length, 'caption tracks in player response');
            
            // Look for English track
            const englishTrack = tracks.find(track => 
              track.languageCode === 'en' || 
              track.languageCode === 'a.en' ||
              track.name?.simpleText?.toLowerCase().includes('english')
            );
            
            if (englishTrack && englishTrack.baseUrl) {
              console.log('SeekSpeak: Found English track with baseUrl:', englishTrack.baseUrl);
              try {
                const response = await fetch(englishTrack.baseUrl, {
                  method: 'GET',
                  headers: {
                    'Accept': 'text/xml,application/xml,text/html;q=0.9,*/*;q=0.8',
                    'User-Agent': navigator.userAgent,
                    'Referer': window.location.href
                  },
                  credentials: 'same-origin'
                });
                
                if (response.ok) {
                  const text = await response.text();
                  console.log('SeekSpeak: Internal baseUrl response length:', text.length);
                  
                  if (text.length > 0) {
                    // Try to parse the content
                    if (text.includes('<text')) {
                      console.log('SeekSpeak: Parsing as XML from internal source');
                      return this.parseXMLResponse(text);
                    } else if (text.includes('WEBVTT')) {
                      console.log('SeekSpeak: Parsing as VTT from internal source');
                      return this.parseVTTFormat(text);
                    } else if (text.trim().startsWith('{')) {
                      try {
                        console.log('SeekSpeak: Parsing as JSON from internal source');
                        return this.parseJSON3Format(JSON.parse(text));
                      } catch {
                        console.warn('SeekSpeak: Failed to parse internal response as JSON');
                      }
                    }
                  }
                } else {
                  console.log('SeekSpeak: Internal baseUrl fetch failed with status:', response.status);
                }
              } catch (fetchError) {
                console.warn('SeekSpeak: Failed to fetch from internal baseUrl:', fetchError);
              }
            } else {
              console.log('SeekSpeak: No English track found or missing baseUrl');
            }
          } else {
            console.log('SeekSpeak: No playerCaptionsTracklistRenderer or captionTracks found');
          }
        } else {
          console.log('SeekSpeak: [DEBUG] No captions property in ytInitialPlayerResponse');
        }
      } else {
        console.log('SeekSpeak: [DEBUG] window.ytInitialPlayerResponse not found');
      }
      
      // Method 2: Try the "Show transcript" approach (Filmot-inspired)
      console.log('SeekSpeak: [DEBUG] Trying transcript panel approach');
      return await this.tryTranscriptPanelAccess(videoId);
      
    } catch (error) {
      console.error('SeekSpeak: Error in extractFromYouTubeInternals:', error);
    }
    
    console.log('SeekSpeak: [DEBUG] extractFromYouTubeInternals returning null');
    return null;
  }

  async tryTranscriptPanelAccess(videoId) {
    console.log('SeekSpeak: [DEBUG] Trying transcript panel access');
    
    try {
      // Comprehensive transcript button selectors for current YouTube UI
      const transcriptSelectors = [
        // Current YouTube UI patterns (2025)
        'button[aria-label*="Show transcript"]',
        'button[aria-label*="transcript" i]',
        'yt-button-shape button[aria-label*="transcript" i]',
        'ytd-button-renderer button[aria-label*="transcript" i]',
        '#description button[aria-label*="transcript" i]',
        '.ytd-engagement-panel-title-header-renderer button[aria-label*="transcript" i]',
        
        // Alternative approaches - search by text content
        'button:contains("Show transcript")',
        'button:contains("Transcript")',
        '[role="button"]:contains("Show transcript")',
        '[role="button"]:contains("Transcript")',
        
        // Fallback patterns
        'button[title*="transcript" i]',
        'yt-formatted-string:contains("Show transcript")',
        '.ytd-transcript-search-panel-renderer',
        
        // Icon-based selectors (YouTube's transcript icon)
        'button:has(svg path[d*="M14,17H4V5h10V17z"])',
        'button:has(.yt-icon[class*="transcript"])',
        
        // Broader search in description/engagement areas
        '#secondary button[aria-label*="transcript" i]',
        '.ytd-video-secondary-info-renderer button[aria-label*="transcript" i]',
        'ytd-engagement-panel-section-list-renderer button[aria-label*="transcript" i]'
      ];
      
      let transcriptButton = null;
      
      // First, try direct selectors
      for (const selector of transcriptSelectors) {
        try {
          transcriptButton = document.querySelector(selector);
          if (transcriptButton) {
            console.log('SeekSpeak: [DEBUG] Found transcript button with selector:', selector);
            break;
          }
        } catch (e) {
          // Skip invalid selectors (like :contains which isn't native)
          continue;
        }
      }
      
      // If direct selectors fail, wait a bit and try again (transcript button might load late)
      if (!transcriptButton) {
        console.log('SeekSpeak: [DEBUG] Transcript button not found, waiting 2s for YouTube to load...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try direct selectors again after waiting
        for (const selector of transcriptSelectors) {
          try {
            transcriptButton = document.querySelector(selector);
            if (transcriptButton) {
              console.log('SeekSpeak: [DEBUG] Found transcript button with selector (retry):', selector);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      // If still not found, search by text content manually
      if (!transcriptButton) {
        console.log('SeekSpeak: [DEBUG] Direct selectors failed, searching by text content');
        
        const allButtons = document.querySelectorAll('button, [role="button"]');
        console.log('SeekSpeak: [DEBUG] Found', allButtons.length, 'total buttons to check');
        
        for (const button of allButtons) {
          const text = button.textContent?.toLowerCase() || '';
          const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
          const title = button.getAttribute('title')?.toLowerCase() || '';
          
          if (text.includes('transcript') || text.includes('show transcript') ||
              ariaLabel.includes('transcript') || ariaLabel.includes('show transcript') ||
              title.includes('transcript') || title.includes('show transcript')) {
            
            console.log('SeekSpeak: [DEBUG] Found transcript button by text search:', {
              text: text.slice(0, 50),
              ariaLabel: ariaLabel.slice(0, 50),
              title: title.slice(0, 50)
            });
            
            transcriptButton = button;
            break;
          }
        }
      }
      
      // If still not found, try looking in engagement panels
      if (!transcriptButton) {
        console.log('SeekSpeak: [DEBUG] Checking engagement panels for transcript');
        
        const engagementPanels = document.querySelectorAll('ytd-engagement-panel-section-list-renderer');
        for (const panel of engagementPanels) {
          if (panel.textContent?.toLowerCase().includes('transcript')) {
            const buttons = panel.querySelectorAll('button, [role="button"]');
            for (const button of buttons) {
              if (button.textContent?.toLowerCase().includes('transcript')) {
                transcriptButton = button;
                console.log('SeekSpeak: [DEBUG] Found transcript button in engagement panel');
                break;
              }
            }
          }
          if (transcriptButton) break;
        }
      }
      
      if (transcriptButton) {
        console.log('SeekSpeak: [DEBUG] Found transcript button');
        
        // Check if transcript is already open (user opened it manually)
        const transcriptPanelSelectors = [
          '#engagement-panel-searchable-transcript',
          '.ytd-engagement-panel-section-list-renderer',
          'ytd-engagement-panel-section-list-renderer',
          '[data-target-id="engagement-panel-searchable-transcript"]'
        ];
        
        let transcriptAlreadyOpen = false;
        let existingTranscriptItems = [];
        
        // Check if transcript content is already visible and accessible
        for (const selector of transcriptPanelSelectors) {
          const panel = document.querySelector(selector);
          if (panel) {
            const panelStyles = getComputedStyle(panel);
            const isVisible = panel.offsetHeight > 0 && 
                            panelStyles.display !== 'none' && 
                            panelStyles.visibility !== 'hidden' &&
                            panel.offsetWidth > 0;
            
            if (isVisible) {
              // Check if it contains transcript content
              const segments = panel.querySelectorAll('ytd-transcript-segment-renderer, .ytd-transcript-segment-renderer, button[data-start-time]');
              if (segments.length > 0) {
                transcriptAlreadyOpen = true;
                existingTranscriptItems = Array.from(segments);
                console.log('SeekSpeak: [DEBUG] Transcript already open with', segments.length, 'segments - user opened it manually');
                break;
              }
            }
          }
        }
        
        let transcriptItems = [];
        let style = null; // Style element for making panels invisible
        
        if (transcriptAlreadyOpen) {
          // Don't click button, just use existing content
          console.log('SeekSpeak: [DEBUG] Using existing open transcript - NOT clicking button');
          transcriptItems = existingTranscriptItems;
        } else {
          // Transcript not open, we need to open it temporarily
          console.log('SeekSpeak: [DEBUG] Transcript not open - clicking button to extract content');
          
          // Prepare hiding styles but DON'T apply yet - let content load first
          const preemptiveStyle = document.createElement('style');
          preemptiveStyle.id = 'seekspeak-preemptive-hide';
          preemptiveStyle.textContent = `
            /* TRANSCRIPT HIDING - Applied after content loads */
            #engagement-panel-searchable-transcript,
            .ytd-engagement-panel-section-list-renderer,
            ytd-engagement-panel-section-list-renderer,
            [data-target-id="engagement-panel-searchable-transcript"],
            tp-yt-paper-dialog,
            #secondary-inner #panels ytd-engagement-panel-section-list-renderer,
            #panels.ytd-watch-flexy ytd-engagement-panel-section-list-renderer {
              display: none !important;
              opacity: 0 !important;
              visibility: hidden !important;
              position: fixed !important;
              left: -99999px !important;
              top: -99999px !important;
              width: 1px !important;
              height: 1px !important;
              pointer-events: none !important;
              z-index: -9999 !important;
              transform: translateX(-100000px) translateY(-100000px) !important;
              clip: rect(0 0 0 0) !important;
              clip-path: inset(100%) !important;
              overflow: hidden !important;
            }
          `;
          
          // Click the transcript button to open/load content
          transcriptButton.click();
          
          // CRITICAL: Wait for YouTube to populate transcript content before hiding
          console.log('SeekSpeak: [DEBUG] Waiting for transcript content to load before hiding...');
          await new Promise(resolve => setTimeout(resolve, 800)); // Allow content to load
          
          // NOW apply hiding after content loads
          console.log('SeekSpeak: [DEBUG] Applying hiding after content load');
          document.documentElement.classList.add('seekspeak-extraction-mode');
          document.head.appendChild(preemptiveStyle);
        
        // Wait for content to load with retry mechanism (only if we clicked the button)
        if (!transcriptAlreadyOpen) {
          let retryCount = 0;
          const maxRetries = 3;
          
          while (transcriptItems.length === 0 && retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 + (retryCount * 1000))); // Progressive delay
        
            // Enhanced transcript content detection with better selectors
            const transcriptContentSelectors = [
              // Current YouTube transcript UI (2025) - Primary selectors
              'ytd-transcript-segment-renderer',
              'ytd-transcript-segment-renderer button',
              '.ytd-transcript-segment-renderer',
              'ytd-transcript-body-renderer ytd-transcript-segment-renderer',
              
              // Engagement panel specific
              '#engagement-panel-searchable-transcript ytd-transcript-segment-renderer',
              '.ytd-engagement-panel-section-list-renderer ytd-transcript-segment-renderer',
              
              // Alternative current patterns
              'ytd-transcript-body-renderer .segment',
              '.transcript-segment',
              '[data-start-time]',
              'button[data-start-time]',
              
              // More generic fallbacks
              '.ytd-engagement-panel-section-list-renderer button:has([class*="time"])',
              '.ytd-engagement-panel-section-list-renderer [role="button"]',
              '*[class*="transcript"] button',
              
              // Broader search as last resort
              '.engagement-panel button'
            ];
            
            // Try each selector to find transcript content
            for (const selector of transcriptContentSelectors) {
              try {
                const items = document.querySelectorAll(selector);
                console.log('SeekSpeak: [DEBUG] Retry', retryCount + 1, 'Checking selector:', selector, 'found:', items.length, 'items');
                
                if (items.length > 0) {
                  // Validate that these look like transcript items (have timestamps and text)
                  let validItems = 0;
                  for (const item of items) {
                    const text = item.textContent || '';
                    if (text.match(/\d+:\d+/) || item.hasAttribute('data-start-time')) {
                      validItems++;
                    }
                  }
                  
                  console.log('SeekSpeak: [DEBUG] Validated', validItems, 'transcript-like items');
                  
                  if (validItems > 10) { // Require more items to avoid partial loads
                    transcriptItems = Array.from(items);
                    console.log('SeekSpeak: [DEBUG] Using selector:', selector);
                    break;
                  } else if (validItems > 0 && retryCount >= maxRetries - 1) {
                    // On final retry, accept smaller counts
                    transcriptItems = Array.from(items);
                    console.log('SeekSpeak: [DEBUG] Final retry - using selector:', selector);
                    break;
                  }
                }
              } catch (e) {
                // Skip invalid selectors
                continue;
              }
            }
            
            if (transcriptItems.length > 0) {
              console.log('SeekSpeak: [DEBUG] Found transcript items on retry', retryCount + 1);
              break; // Exit retry loop
            }
            
            retryCount++;
            console.log('SeekSpeak: [DEBUG] Retry', retryCount, 'of', maxRetries, '- no transcript items found, trying again...');
          } // End retry loop
        } // End if (!transcriptAlreadyOpen) block
        
        // If still no items after all attempts, do enhanced manual search
        if (transcriptItems.length === 0) {
          console.log('SeekSpeak: [DEBUG] No transcript items found, doing enhanced manual search');
          
          // First try: Look specifically in engagement panels for clickable elements with time patterns
          const engagementPanels = document.querySelectorAll('#engagement-panel-searchable-transcript, .ytd-engagement-panel-section-list-renderer');
          for (const panel of engagementPanels) {
            const clickableInPanel = panel.querySelectorAll('button, [role="button"], [tabindex="0"], div[class*="segment"], [class*="transcript"]');
            for (const element of clickableInPanel) {
              const text = element.textContent || '';
              // More specific timestamp patterns and better text validation
              if (text.match(/\b\d{1,2}:\d{2}\b/) && text.length > 3 && text.length < 1000) {
                // Check if it has additional transcript-like characteristics
                if (text.includes(' ') || element.querySelector('[class*="time"]') || element.querySelector('[class*="text"]')) {
                  transcriptItems.push(element);
                }
              }
            }
          }
          
          // If still nothing, broader search with better filtering
          if (transcriptItems.length === 0) {
            const allClickable = document.querySelectorAll('button, [role="button"], [tabindex="0"]');
            console.log('SeekSpeak: [DEBUG] Checking', allClickable.length, 'clickable elements for timestamps');
            
            for (const element of allClickable) {
              const text = element.textContent || '';
              // More precise timestamp detection and content validation
              const hasTimestamp = text.match(/\b\d{1,2}:\d{2}\b/);
              const hasWords = text.split(' ').length >= 2;
              const reasonableLength = text.length > 5 && text.length < 800;
              const notNavigation = !text.toLowerCase().match(/\b(next|previous|back|forward|home|menu|settings|profile)\b/);
              
              if (hasTimestamp && hasWords && reasonableLength && notNavigation) {
                transcriptItems.push(element);
              }
            }
          }
          
          console.log('SeekSpeak: [DEBUG] Enhanced search found', transcriptItems.length, 'items with timestamp patterns');
        }
        
        if (transcriptItems.length > 0) {
          console.log('SeekSpeak: [DEBUG] Processing', transcriptItems.length, 'transcript segments');
          
          const segments = [];
          transcriptItems.forEach((item, index) => {
            try {
              // Enhanced text extraction - try multiple approaches
              let timeElement = item.querySelector('.segment-timestamp') || 
                              item.querySelector('[data-start-time]') ||
                              item.querySelector('.cue-start-time') ||
                              item.querySelector('[class*="time"]');
              
              let textElement = item.querySelector('.segment-text') || 
                               item.querySelector('yt-formatted-string') ||
                               item.querySelector('.cue-text') ||
                               item.querySelector('[class*="text"]') ||
                               item;
              
              let timeText = '';
              let text = '';
              
              // Extract time
              if (timeElement) {
                timeText = timeElement.textContent?.trim() || timeElement.getAttribute('data-start-time') || '';
              }
              
              // Extract text with better content detection
              if (textElement) {
                text = textElement.textContent?.trim() || '';
              }
              
              // If we still don't have good content, try different extraction strategies
              if (!text || text.length < 3) {
                const fullText = item.textContent?.trim() || '';
                
                // Strategy 1: Split by timestamp pattern
                const timeMatch = fullText.match(/^(\d+:[\d:]+)/);
                if (timeMatch) {
                  timeText = timeMatch[1];
                  text = fullText.replace(timeMatch[0], '').trim();
                } else {
                  // Strategy 2: Look for timestamp anywhere and extract remaining text
                  const timeInMiddle = fullText.match(/(\d+:[\d:]+)/);
                  if (timeInMiddle) {
                    timeText = timeInMiddle[1];
                    text = fullText.replace(timeInMiddle[0], '').trim();
                  } else {
                    // Strategy 3: Use full text and estimate timing
                    text = fullText;
                    timeText = (index * 5).toString() + ':00'; // 5-second intervals as fallback
                  }
                }
              }
              
              // Clean up text content
              text = text.replace(/^\s*[-•·]\s*/, ''); // Remove bullet points
              text = text.replace(/\s+/g, ' '); // Normalize whitespace
              
              if (text.length > 0 && text !== timeText) {
                // Parse time more robustly
                let startTime = 0;
                if (timeText) {
                  const timeParts = timeText.split(':').map(n => parseInt(n) || 0);
                  if (timeParts.length === 2) {
                    startTime = timeParts[0] * 60 + timeParts[1];
                  } else if (timeParts.length === 3) {
                    startTime = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
                  } else if (timeParts.length === 1) {
                    startTime = timeParts[0];
                  }
                } else {
                  startTime = index * 5; // Fallback: 5-second intervals
                }
                
                segments.push({
                  startTime: startTime,
                  endTime: startTime + 3, // Approximate
                  duration: 3,
                  text: text
                });
                
                console.log('SeekSpeak: [DEBUG] Extracted segment:', { startTime, text: text.slice(0, 50) });
              }
            } catch (err) {
              console.warn('SeekSpeak: [DEBUG] Error processing transcript item:', err);
            }
          });
          
          if (segments.length > 0) {
            console.log('SeekSpeak: [DEBUG] Successfully extracted', segments.length, 'segments from transcript panel');
            
            // Clean up hiding after successful extraction
            console.log('SeekSpeak: [DEBUG] Cleaning up hiding after successful extraction');
            document.documentElement.classList.remove('seekspeak-extraction-mode');
            const hideStyle = document.getElementById('seekspeak-preemptive-hide');
            if (hideStyle) {
              hideStyle.remove();
            }
            
            if (transcriptAlreadyOpen) {
              // User opened transcript manually - NEVER hide it
              console.log('SeekSpeak: [DEBUG] Transcript was user-opened - leaving it completely visible');
            } else {
              // WE opened transcript for extraction - hide it again
              console.log('SeekSpeak: [DEBUG] Closing transcript panel after extraction');
              
              // Remove the hiding style
              const hideStyle = document.getElementById('seekspeak-preemptive-hide');
              if (hideStyle) {
                hideStyle.remove();
              }
              
              // Try to close via button click
              try {
                const closeButton = document.querySelector('button[aria-label*="Close transcript"]') ||
                                  document.querySelector('.ytd-engagement-panel-title-header-renderer button[aria-label*="Close"]') ||
                                  document.querySelector('#engagement-panel-searchable-transcript button[aria-label*="Close"]');
                
                if (closeButton) {
                  console.log('SeekSpeak: [DEBUG] Clicking close button');
                  closeButton.click();
                }
              } catch (error) {
                console.log('SeekSpeak: [DEBUG] Close button click failed:', error);
              }
            }
            
            return segments;
          } else {
            // If no segments found, remove hiding style
            console.log('SeekSpeak: [DEBUG] No segments found, removing hiding style');
            const hideStyle = document.getElementById('seekspeak-preemptive-hide');
            if (hideStyle) {
              hideStyle.remove();
            }
          }
        } else {
          console.log('SeekSpeak: [DEBUG] No transcript items found after clicking button');
        }
        } // End of else block for "transcript not open"
      } else {
        console.log('SeekSpeak: [DEBUG] No transcript button found with any selector');
      }
      
    } catch (error) {
      console.error('SeekSpeak: [DEBUG] Error in tryTranscriptPanelAccess:', error);
    } finally {
      // CRITICAL: Always clean up hiding styles
      console.log('SeekSpeak: [DEBUG] Cleaning up transcript hiding');
      
      // Remove extraction mode class
      document.documentElement.classList.remove('seekspeak-extraction-mode');
      
      // Remove hiding styles
      const hideStyle = document.getElementById('seekspeak-preemptive-hide');
      if (hideStyle) {
        hideStyle.remove();
      }
    }
    
    console.log('SeekSpeak: [DEBUG] tryTranscriptPanelAccess returning null');
    return null;
  }

  extractSegmentsFromItems(transcriptItems) {
    const segments = [];
    transcriptItems.forEach((item, index) => {
      try {
        // Enhanced text extraction - try multiple approaches
        let timeElement = item.querySelector('.segment-timestamp') || 
                        item.querySelector('[data-start-time]') ||
                        item.querySelector('.cue-start-time') ||
                        item.querySelector('[class*="time"]');
        
        let textElement = item.querySelector('.segment-text') || 
                         item.querySelector('yt-formatted-string') ||
                         item.querySelector('.cue-text') ||
                         item.querySelector('[class*="text"]') ||
                         item;
        
        let timeText = '';
        let text = '';
        
        // Extract time
        if (timeElement) {
          timeText = timeElement.textContent?.trim() || timeElement.getAttribute('data-start-time') || '';
        }
        
        // Extract text with better content detection
        if (textElement) {
          text = textElement.textContent?.trim() || '';
        }
        
        // If we still don't have good content, try different extraction strategies
        if (!text || text.length < 3) {
          const fullText = item.textContent?.trim() || '';
          
          // Strategy 1: Split by timestamp pattern
          const timeMatch = fullText.match(/^(\d+:[\d:]+)/);
          if (timeMatch) {
            timeText = timeMatch[1];
            text = fullText.replace(timeMatch[0], '').trim();
          } else {
            // Strategy 2: Look for timestamp anywhere and extract remaining text
            const timeInMiddle = fullText.match(/(\d+:[\d:]+)/);
            if (timeInMiddle) {
              timeText = timeInMiddle[1];
              text = fullText.replace(timeInMiddle[0], '').trim();
            } else {
              // Strategy 3: Use full text and estimate timing
              text = fullText;
              timeText = (index * 5).toString() + ':00'; // 5-second intervals as fallback
            }
          }
        }
        
        // Clean up text content
        text = text.replace(/^\s*[-•·]\s*/, ''); // Remove bullet points
        text = text.replace(/\s+/g, ' '); // Normalize whitespace
        
        if (text.length > 0 && text !== timeText) {
          // Parse time more robustly
          let startTime = 0;
          if (timeText) {
            const timeParts = timeText.split(':').map(n => parseInt(n) || 0);
            if (timeParts.length === 2) {
              startTime = timeParts[0] * 60 + timeParts[1];
            } else if (timeParts.length === 3) {
              startTime = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
            } else if (timeParts.length === 1) {
              startTime = timeParts[0];
            }
          } else {
            startTime = index * 5; // Fallback: 5-second intervals
          }
          
          segments.push({
            startTime: startTime,
            endTime: startTime + 3, // Approximate
            duration: 3,
            text: text
          });
          
          console.log('SeekSpeak: [DEBUG] Extracted segment:', { startTime, text: text.slice(0, 50) });
        }
      } catch (err) {
        console.warn('SeekSpeak: [DEBUG] Error processing transcript item:', err);
      }
    });
    
    return segments;
  }
  
  parseXMLResponse(xmlText) {
    console.log('SeekSpeak: Parsing XML response');
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const textElements = xmlDoc.querySelectorAll('text');
      console.log('SeekSpeak: Found', textElements.length, 'text elements in XML');
      
      if (textElements.length === 0) {
        return null;
      }
      
      const segments = [];
      
      for (const textEl of textElements) {
        const start = parseFloat(textEl.getAttribute('start')) || 0;
        const dur = parseFloat(textEl.getAttribute('dur')) || 3;
        const text = textEl.textContent || '';
        
        if (text.trim()) {
          segments.push({
            startTime: Math.floor(start),
            duration: Math.floor(dur),
            endTime: Math.floor(start + dur),
            text: text.trim()
          });
        }
      }
      
      console.log('SeekSpeak: Converted', segments.length, 'XML elements to segments');
      return segments;
      
    } catch (error) {
      console.error('SeekSpeak: Error parsing XML:', error);
      return null;
    }
  }

  parseVTTFormat(vttText) {
    console.log('SeekSpeak: Parsing VTT format');
    
    try {
      const lines = vttText.split('\n');
      const segments = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('-->')) {
          const [startStr, endStr] = line.split('-->').map(s => s.trim());
          const startTime = this.parseVTTTimestamp(startStr);
          const endTime = this.parseVTTTimestamp(endStr);
          
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
    const parts = timeStr.split(':');
    if (parts.length >= 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const secondsParts = parts[2].split('.');
      const seconds = parseInt(secondsParts[0]) || 0;
      const milliseconds = parseInt(secondsParts[1]) || 0;
      
      return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
    return 0;
  }

  // Fallback method for direct fetching if background script fails
  async fetchDirectly(url) {
    console.log('SeekSpeak: Attempting direct fetch as fallback');
    
    try {
      // Try multiple approaches for fetching YouTube's authenticated URLs
      const fetchOptions = [
        // Approach 1: Minimal headers
        {
          method: 'GET',
          headers: {
            'Accept': '*/*',
            'User-Agent': navigator.userAgent,
            'Referer': window.location.href
          },
          credentials: 'include',
          mode: 'cors'
        },
        // Approach 2: No credentials, basic headers
        {
          method: 'GET',
          headers: {
            'Accept': 'application/xml,text/xml,*/*',
            'User-Agent': navigator.userAgent
          },
          mode: 'cors'
        },
        // Approach 3: Same-origin approach
        {
          method: 'GET',
          headers: {
            'Accept': '*/*'
          },
          credentials: 'same-origin'
        }
      ];

      for (let i = 0; i < fetchOptions.length; i++) {
        try {
          console.log(`SeekSpeak: Trying direct fetch approach ${i + 1}`);
          const response = await fetch(url, fetchOptions[i]);
          
          console.log(`SeekSpeak: Direct fetch approach ${i + 1} status:`, response.status);
          
          if (response.ok) {
            const text = await response.text();
            console.log(`SeekSpeak: Direct fetch approach ${i + 1} response length:`, text.length);
            
            if (text.length > 0) {
              console.log('SeekSpeak: Direct fetch successful with approach', i + 1);
              console.log('SeekSpeak: First 200 chars:', text.substring(0, 200));
              
              // Parse the response
              if (text.includes('<timedtext') || text.includes('<text')) {
                return this.parseXML(text);
              } else if (text.includes('WEBVTT')) {
                return this.parseVTT(text);
              } else if (text.trim().startsWith('{')) {
                return this.parseJSON(JSON.parse(text));
              } else {
                console.log('SeekSpeak: Unknown format from direct fetch, trying as plain text');
                const lines = text.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                  return this.parseTextFormat(lines);
                }
              }
            }
          }
        } catch (fetchError) {
          console.log(`SeekSpeak: Direct fetch approach ${i + 1} failed:`, fetchError.message);
        }
      }
    } catch (error) {
      console.log('SeekSpeak: All direct fetch approaches failed:', error);
    }
    
    return null;
  }

  // Check if video is likely to be blocked based on patterns
  isVideoLikelyBlocked(videoId) {
    // Rick Roll and other heavily accessed videos are often more protected
    const knownBlockedPatterns = ['dQw4w9WgXcQ', 'vBhUyRNS-FY'];
    return knownBlockedPatterns.includes(videoId);
  }

  // Alternative approach for blocked videos
  async tryAlternativeApproach() {
    console.log('SeekSpeak: Trying alternative caption extraction methods');
    
    // Try to find any caption data in the DOM without making requests
    const alternatives = [
      () => this.extractFromDOMCaptions(),
      () => this.extractFromVideoDescription(),
      () => this.createMockCaptions() // Last resort for testing
    ];

    for (const method of alternatives) {
      try {
        const result = await method();
        if (result && result.length > 0) {
          console.log('SeekSpeak: Alternative method succeeded');
          return result;
        }
      } catch (error) {
        console.log('SeekSpeak: Alternative method failed:', error.message);
      }
    }

    return null;
  }

  // Extract any visible caption data from DOM
  extractFromDOMCaptions() {
    console.log('SeekSpeak: Trying to extract captions from DOM');
    
    // Look for any visible caption text in YouTube's player
    const captionSelectors = [
      '.ytp-caption-segment',
      '.caption-window',
      '.ytp-caption-window-container',
      '.html5-captions-text'
    ];

    for (const selector of captionSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log('SeekSpeak: Found caption elements in DOM:', elements.length);
        // This would need real-time monitoring, not suitable for our use case
      }
    }

    return null;
  }

  // Extract from video description (sometimes has transcript)
  extractFromVideoDescription() {
    console.log('SeekSpeak: Checking video description for transcript');
    
    const descriptionSelectors = [
      '#description-text',
      '.ytd-expandable-video-description-body-renderer',
      '.content.ytd-video-secondary-info-renderer'
    ];

    for (const selector of descriptionSelectors) {
      const desc = document.querySelector(selector);
      if (desc && desc.textContent) {
        const text = desc.textContent;
        // Look for transcript-like patterns
        if (text.includes('transcript') || text.includes('captions') || 
            text.includes('00:') || text.match(/\d+:\d+/)) {
          console.log('SeekSpeak: Found potential transcript in description');
          // This would need more sophisticated parsing
        }
      }
    }

    return null;
  }

  // Create mock captions for testing (when real captions fail)
  createMockCaptions() {
    console.log('SeekSpeak: Creating mock captions for testing purposes');
    
    return [
      { startTime: 0, endTime: 5, text: "This video appears to be protected from automated caption access." },
      { startTime: 5, endTime: 10, text: "SeekSpeak is unable to fetch captions due to YouTube's anti-bot protection." },
      { startTime: 10, endTime: 15, text: "Try testing with a different video that may have less protection." },
      { startTime: 15, endTime: 20, text: "Consider using videos with manual captions rather than auto-generated ones." }
    ];
  }

  // Parse simple text format (fallback)
  parseTextFormat(lines) {
    console.log('SeekSpeak: Parsing as simple text format');
    
    const segments = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // Simple fallback: assume each line is roughly 3 seconds
        const startTime = i * 3;
        const endTime = (i + 1) * 3;
        
        segments.push({
          startTime: startTime,
          endTime: endTime,
          text: line
        });
      }
    }
    
    return segments;
  }

  async fetchFromPlayerData(videoId) {
    console.log('SeekSpeak: Trying to extract captions from player data');
    
    try {
      const playerData = this.extractPlayerData();
      console.log('SeekSpeak: Player data found:', !!playerData);
      
      if (playerData && playerData.captions) {
        console.log('SeekSpeak: Captions found in player data');
        const captionInfo = this.parsePlayerCaptions(playerData.captions);
        
        if (captionInfo && captionInfo.type === 'url') {
          // Check if this video might not have captions or is heavily protected
          if (this.isVideoLikelyBlocked(this.currentVideoId)) {
            console.log('SeekSpeak: Video appears to be protected/blocked, trying alternative approach');
            return await this.tryAlternativeApproach();
          }

          console.log('SeekSpeak: Fetching captions from player data URL via background script:', captionInfo.url);
          
          try {
            // Use background script to fetch the URL (better permissions)
            console.log('SeekSpeak: Sending message to background script');
            const result = await chrome.runtime.sendMessage({
              type: 'FETCH_CAPTION_URL',
              url: captionInfo.url,
              videoId: this.currentVideoId
            });

            console.log('SeekSpeak: Background script result:', result);

            // Check if we got a valid response
            if (!result) {
              console.log('SeekSpeak: Background script returned undefined, falling back to direct fetch');
              return await this.fetchDirectly(captionInfo.url);
            }

            if (result.success && result.data && result.data.length > 0) {
              console.log('SeekSpeak: Successfully got captions via background script');
              console.log('SeekSpeak: Content-Type:', result.contentType);
              console.log('SeekSpeak: Data length:', result.length);
              console.log('SeekSpeak: First 200 chars:', result.data.substring(0, 200));

              // Determine format and parse accordingly
              if (result.data.includes('<timedtext') || result.data.includes('<text')) {
                console.log('SeekSpeak: Parsing background data as XML');
                return this.parseXML(result.data);
              } else if (result.data.includes('WEBVTT')) {
                console.log('SeekSpeak: Parsing background data as VTT');
                return this.parseVTT(result.data);
              } else if (result.data.trim().startsWith('{') || result.data.trim().startsWith('[')) {
                try {
                  console.log('SeekSpeak: Parsing background data as JSON');
                  return this.parseJSON(JSON.parse(result.data));
                } catch (jsonError) {
                  console.warn('SeekSpeak: Failed to parse background data as JSON:', jsonError);
                }
              } else {
                console.log('SeekSpeak: Trying to parse background data as plain text');
                const lines = result.data.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                  return this.parseTextFormat(lines);
                }
              }
            } else {
              console.log('SeekSpeak: Background script failed or returned empty data:', result.error || 'Unknown error');
              
              // Fallback: try direct fetch if background script fails
              console.log('SeekSpeak: Falling back to direct content script fetch');
              return await this.fetchDirectly(captionInfo.url);
            }
          } catch (fetchError) {
            console.warn('SeekSpeak: Failed to fetch from player data URL:', fetchError);
          }
        }
      }
    } catch (error) {
      console.warn('SeekSpeak: Failed to extract from player data:', error.message);
    }
    
    return null;
  }

  extractPlayerData() {
    console.log('SeekSpeak: Searching for player configuration data');
    
    if (window.ytInitialPlayerResponse) {
      console.log('SeekSpeak: Found ytInitialPlayerResponse');
      return window.ytInitialPlayerResponse;
    }
    
    const scripts = document.querySelectorAll('script');
    console.log('SeekSpeak: Searching through', scripts.length, 'script tags');
    
    for (const script of scripts) {
      const content = script.textContent;
      
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
    }
    
    console.log('SeekSpeak: No player configuration data found');
    return null;
  }

  parsePlayerCaptions(captions) {
    console.log('SeekSpeak: Parsing player captions data');
    
    try {
      if (captions.playerCaptionsTracklistRenderer) {
        const tracks = captions.playerCaptionsTracklistRenderer.captionTracks;
        
        if (tracks && tracks.length > 0) {
          console.log('SeekSpeak: Found', tracks.length, 'caption tracks');
          
          const englishTrack = tracks.find(track => 
            track.languageCode === 'en' || track.languageCode?.startsWith('en')
          );
          
          if (englishTrack && englishTrack.baseUrl) {
            console.log('SeekSpeak: Found English caption track');
            console.log('SeekSpeak: Caption URL:', englishTrack.baseUrl);
            
            // Return the caption URL so we can fetch it
            return {
              type: 'url',
              url: englishTrack.baseUrl,
              language: englishTrack.languageCode
            };
          }
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('SeekSpeak: Error parsing player captions:', error);
      return null;
    }
  }

  parseFromTranscriptPanel() {
    console.log('SeekSpeak: Trying to parse from transcript panel');
    
    // Try multiple selectors for transcript containers
    const transcriptSelectors = [
      '[data-target-id="engagement-panel-searchable-transcript"]',
      '#engagement-panel-searchable-transcript',
      '.ytd-transcript-search-panel-renderer',
      '.ytd-transcript-segment-renderer',
      '[aria-label*="transcript"]',
      '[aria-label*="Transcript"]'
    ];
    
    for (const selector of transcriptSelectors) {
      const transcriptContainer = document.querySelector(selector);
      
      if (transcriptContainer) {
        console.log('SeekSpeak: Found transcript container with selector:', selector);
        const segments = [];
        
        // Try different item selectors
        const itemSelectors = [
          '[data-start-time]',
          '.ytd-transcript-segment-renderer',
          '.segment-start-offset',
          '.cue-group'
        ];
        
        for (const itemSelector of itemSelectors) {
          const transcriptItems = transcriptContainer.querySelectorAll(itemSelector);
          console.log('SeekSpeak: Found', transcriptItems.length, 'transcript items with selector:', itemSelector);
          
          if (transcriptItems.length > 0) {
            for (const item of transcriptItems) {
              let startTime = 0;
              let text = '';
              
              // Try to extract start time
              if (item.dataset.startTime) {
                startTime = parseInt(item.dataset.startTime);
              } else if (item.dataset.offset) {
                startTime = parseInt(item.dataset.offset);
              }
              
              // Try to extract text
              const textSelectors = [
                '.segment-text',
                '.ytd-transcript-segment-renderer',
                '.transcript-text',
                '.cue-text'
              ];
              
              for (const textSelector of textSelectors) {
                const textElement = item.querySelector(textSelector);
                if (textElement) {
                  text = textElement.textContent.trim();
                  break;
                }
              }
              
              if (!text) {
                text = item.textContent.trim();
              }
              
              if (text && startTime >= 0) {
                segments.push({
                  startTime,
                  duration: 3,
                  endTime: startTime + 3,
                  text: this.cleanText(text)
                });
              }
            }
            
            if (segments.length > 0) {
              console.log('SeekSpeak: Successfully parsed', segments.length, 'segments from transcript panel');
              return segments;
            }
          }
        }
      }
    }
    
    console.log('SeekSpeak: No transcript container found');
    return null;
  }

  async extractFromPageData(videoId) {
    console.log('SeekSpeak: Trying to extract captions from page data');
    
    try {
      // Look for caption data in global variables
      const possibleSources = [
        'ytInitialData',
        'ytInitialPlayerResponse', 
        'ytcfg',
        'yt'
      ];
      
      for (const source of possibleSources) {
        if (window[source]) {
          console.log('SeekSpeak: Found', source, 'in window object');
          const captions = this.searchForCaptionsInObject(window[source], videoId);
          if (captions && captions.length > 0) {
            console.log('SeekSpeak: Found captions in', source);
            return captions;
          }
        }
      }
      
      // Look for data in script tags
      const scriptTags = document.querySelectorAll('script');
      for (const script of scriptTags) {
        if (script.textContent.includes('captionTracks') || 
            script.textContent.includes('timedTextTrack')) {
          console.log('SeekSpeak: Found potential caption data in script tag');
          try {
            // Try to extract and parse caption URLs from script content
            const captionUrls = this.extractCaptionUrlsFromScript(script.textContent);
            if (captionUrls.length > 0) {
              console.log('SeekSpeak: Found', captionUrls.length, 'caption URLs in script');
              
              // Try to fetch captions from the first working URL
              for (const url of captionUrls) {
                // Decode escaped ampersands
                const decodedUrl = url.replace(/\\u0026/g, '&');
                console.log('SeekSpeak: Trying to fetch from script URL via background script:', decodedUrl);
                
                try {
                  // Use background script for better permissions
                  console.log('SeekSpeak: Sending script URL to background script');
                  const result = await chrome.runtime.sendMessage({
                    type: 'FETCH_CAPTION_URL',
                    url: decodedUrl,
                    videoId: this.currentVideoId || videoId
                  });

                  console.log('SeekSpeak: Background script result for script URL:', result);

                  // Check if we got a valid response
                  if (!result) {
                    console.log('SeekSpeak: Background script returned undefined for script URL, trying direct fetch');
                    const directResult = await this.fetchDirectly(decodedUrl);
                    if (directResult) return directResult;
                    continue; // Try next URL
                  }

                  if (result.success && result.data && result.data.length > 0) {
                    console.log('SeekSpeak: Successfully fetched script URL via background');
                    
                    // Determine format and parse accordingly
                    if (result.data.includes('<timedtext') || result.data.includes('<text')) {
                      return this.parseXML(result.data);
                    } else if (result.data.includes('WEBVTT')) {
                      return this.parseVTT(result.data);
                    } else if (result.data.trim().startsWith('{')) {
                      return this.parseJSON(JSON.parse(result.data));
                    }
                  } else {
                    console.log('SeekSpeak: Background script failed for script URL, trying direct fetch');
                    const directResult = await this.fetchDirectly(decodedUrl);
                    if (directResult) return directResult;
                  }
                } catch (fetchError) {
                  console.warn('SeekSpeak: Failed to fetch from script URL:', fetchError);
                }
              }
            }
          } catch (error) {
            // Ignore parsing errors
          }
        }
      }
      
    } catch (error) {
      console.warn('SeekSpeak: Error extracting from page data:', error);
    }
    
    return null;
  }
  
  searchForCaptionsInObject(obj, videoId, depth = 0) {
    if (depth > 5 || !obj || typeof obj !== 'object') return null;
    
    try {
      // Look for caption tracks
      if (obj.captionTracks && Array.isArray(obj.captionTracks)) {
        return this.processCaptionTracks(obj.captionTracks);
      }
      
      // Look for timedTextTrack
      if (obj.timedTextTrack && obj.timedTextTrack.runs) {
        return this.processTimedTextRuns(obj.timedTextTrack.runs);
      }
      
      // Recursively search nested objects
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const result = this.searchForCaptionsInObject(obj[key], videoId, depth + 1);
          if (result) return result;
        }
      }
    } catch (error) {
      // Ignore errors in recursive search
    }
    
    return null;
  }
  
  processCaptionTracks(tracks) {
    // This would process caption track data if found
    console.log('SeekSpeak: Processing caption tracks:', tracks.length);
    return null; // Placeholder for now
  }
  
  processTimedTextRuns(runs) {
    // This would process timed text runs if found
    console.log('SeekSpeak: Processing timed text runs:', runs.length);
    return null; // Placeholder for now
  }
  
  extractCaptionUrlsFromScript(scriptContent) {
    const urls = [];
    const urlPattern = /https:\/\/www\.youtube\.com\/api\/timedtext[^"'\s]+/g;
    const matches = scriptContent.match(urlPattern);
    if (matches) {
      urls.push(...matches);
    }
    return urls;
  }

  processCaptionData(rawSegments) {
    if (!rawSegments || rawSegments.length === 0) {
      return null;
    }

    const sortedSegments = rawSegments.sort((a, b) => a.startTime - b.startTime);
    
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
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '')
      .trim();
  }

  // Cache management methods
  async getCachedCaptions(videoId) {
    try {
      const result = await chrome.storage.local.get([`captions_${videoId}`]);
      const cached = result[`captions_${videoId}`];
      
      if (cached && cached.processedAt) {
        // Check if cache is still valid (24 hours)
        const ageHours = (Date.now() - cached.processedAt) / (1000 * 60 * 60);
        if (ageHours < 24) {
          return cached;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('SeekSpeak: Error reading cached captions:', error);
      return null;
    }
  }

  async cacheCaption(videoId, captionData) {
    try {
      await chrome.storage.local.set({
        [`captions_${videoId}`]: captionData
      });
      this.captionCache.set(videoId, captionData);
    } catch (error) {
      console.warn('SeekSpeak: Error caching captions:', error);
    }
  }

  getCurrentCaptions() {
    if (this.currentVideoId && this.captionCache.has(this.currentVideoId)) {
      return this.captionCache.get(this.currentVideoId);
    }
    return null;
  }
}

// Instantiate and attach to window for global access
window.captionFetcher = new CaptionFetcher();  // NEW: Transcript panel access with custom UI (no flash)
  async tryTranscriptPanelAccessWithCustomUI(videoId) {
    console.log('SeekSpeak: Accessing transcript panel with custom UI');
    
    try {
      // Find transcript button
      const transcriptButton = await this.findTranscriptButton();
      if (!transcriptButton) {
        return null;
      }

      // Update loading progress - custom UI already showing
      if (window.seekSpeakCustomUI) {
        window.seekSpeakCustomUI.updateLoadingProgress("Opening transcript panel...");
      }
      
      // Click transcript button - let it show, our custom overlay covers it
      transcriptButton.click();
      
      // Wait for content to load
      if (window.seekSpeakCustomUI) {
        window.seekSpeakCustomUI.updateLoadingProgress("Loading transcript content...");
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Extract content from now-visible transcript
      const segments = await this.extractTranscriptSegments();
      
      // Close transcript panel
      const closeButton = document.querySelector('button[aria-label*="Close transcript"]');
      if (closeButton) {
        closeButton.click();
      }
      
      return segments;
      
    } catch (error) {
      console.error('SeekSpeak: Error in custom UI transcript panel access:', error);
      return null;
    }
  }

  // Helper method to find transcript button
  async findTranscriptButton() {
    const selectors = [
      'button[aria-label*="Show transcript"]',
      'button[aria-label*="transcript" i]',
      'ytd-button-renderer button[aria-label*="transcript" i]'
    ];
    
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) return button;
    }
    
    // Wait and try again
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) return button;
    }
    
    return null;
  }

  // Extract segments from visible transcript
  async extractTranscriptSegments() {
    const selectors = [
      'ytd-transcript-segment-renderer',
      '[data-start-time]',
      'button[data-start-time]'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        return this.extractSegmentsFromItems(Array.from(elements));
      }
    }
    
    return null;
  }
