/**
 * SeekSpeak Search Engine
 * Handles caption indexing and search functionality
 */

class SearchEngine {
  constructor() {
    this.wordIndex = new Map();       // word -> [timestamps]
    this.segments = [];               // ordered caption segments  
    this.ngramIndex = new Map();      // bigrams/trigrams for phrase search
    this.resultCache = new Map();     // cached search results
    this.isIndexed = false;
  }

  init() {
    console.log('SeekSpeak: Search engine initialized');
  }

  async buildIndex(captionData) {
    if (!captionData || !captionData.segments) {
      console.warn('SeekSpeak: No caption data to index');
      return false;
    }

    console.log('SeekSpeak: Building search index for', captionData.segments.length, 'segments');
    
    this.segments = captionData.segments;
    this.wordIndex.clear();
    this.ngramIndex.clear();
    this.resultCache.clear();

    // Build word index
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const words = this.tokenize(segment.text);
      
      for (const word of words) {
        if (!this.wordIndex.has(word)) {
          this.wordIndex.set(word, []);
        }
        
        this.wordIndex.get(word).push({
          segmentIndex: i,
          timestamp: segment.startTime,
          text: segment.text
        });
      }
    }

    // Build n-gram index for phrase searches
    this.buildNGramIndex();
    
    this.isIndexed = true;
    console.log('SeekSpeak: Search index built with', this.wordIndex.size, 'unique words');
    
    return true;
  }

  buildNGramIndex() {
    // Create bigrams and trigrams for better phrase searching
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const words = this.tokenize(segment.text);
      
      // Create bigrams
      for (let j = 0; j < words.length - 1; j++) {
        const bigram = `${words[j]} ${words[j + 1]}`;
        if (!this.ngramIndex.has(bigram)) {
          this.ngramIndex.set(bigram, []);
        }
        this.ngramIndex.get(bigram).push({
          segmentIndex: i,
          timestamp: segment.startTime,
          text: segment.text
        });
      }
      
      // Create trigrams
      for (let j = 0; j < words.length - 2; j++) {
        const trigram = `${words[j]} ${words[j + 1]} ${words[j + 2]}`;
        if (!this.ngramIndex.has(trigram)) {
          this.ngramIndex.set(trigram, []);
        }
        this.ngramIndex.get(trigram).push({
          segmentIndex: i,
          timestamp: segment.startTime,
          text: segment.text
        });
      }
    }
  }

  search(query, options = {}) {
    if (!this.isIndexed) {
      console.warn('SeekSpeak: Search index not built yet');
      return [];
    }

    if (!query || query.trim().length < 2) {
      return [];
    }

    const cleanQuery = query.trim();
    
    // Check cache first
    const cacheKey = `${cleanQuery}_${JSON.stringify(options)}`;
    if (this.resultCache.has(cacheKey)) {
      return this.resultCache.get(cacheKey);
    }

    const results = this.performSearch(cleanQuery, options);
    
    // Cache results (limit cache size)
    if (this.resultCache.size >= 50) {
      const firstKey = this.resultCache.keys().next().value;
      this.resultCache.delete(firstKey);
    }
    this.resultCache.set(cacheKey, results);
    
    return results;
  }

  performSearch(query, options) {
    const {
      fuzzy = true,
      caseSensitive = false,
      exactPhrase = false,
      maxResults = 20
    } = options;

    let results = [];

    if (exactPhrase) {
      results = this.searchExactPhrase(query, caseSensitive);
    } else {
      results = this.searchWords(query, { fuzzy, caseSensitive });
    }

    // Rank and format results
    const rankedResults = this.rankResults(results, query);
    
    return rankedResults.slice(0, maxResults);
  }

  searchWords(query, { fuzzy, caseSensitive }) {
    const queryWords = this.tokenize(query);
    const allMatches = new Map(); // timestamp -> match info

    for (const queryWord of queryWords) {
      const matches = this.findWordMatches(queryWord, { fuzzy, caseSensitive });
      
      for (const match of matches) {
        const key = match.timestamp;
        if (!allMatches.has(key)) {
          allMatches.set(key, {
            ...match,
            matchedWords: [],
            score: 0
          });
        }
        
        allMatches.get(key).matchedWords.push(queryWord);
      }
    }

    return Array.from(allMatches.values());
  }

  findWordMatches(word, { fuzzy, caseSensitive }) {
    const matches = [];
    const searchWord = caseSensitive ? word : word.toLowerCase();

    // Exact matches first
    if (this.wordIndex.has(searchWord)) {
      matches.push(...this.wordIndex.get(searchWord));
    }

    // Fuzzy matches if enabled
    if (fuzzy && matches.length < 5) {
      for (const [indexedWord, wordMatches] of this.wordIndex) {
        if (indexedWord !== searchWord && this.isFuzzyMatch(searchWord, indexedWord)) {
          matches.push(...wordMatches.map(match => ({
            ...match,
            fuzzyMatch: true,
            originalWord: indexedWord
          })));
        }
      }
    }

    return matches;
  }

  searchExactPhrase(phrase, caseSensitive) {
    const searchPhrase = caseSensitive ? phrase : phrase.toLowerCase();
    const matches = [];

    // Check n-gram index first for efficiency
    if (this.ngramIndex.has(searchPhrase)) {
      matches.push(...this.ngramIndex.get(searchPhrase));
    }

    // Fall back to segment-by-segment search
    if (matches.length === 0) {
      for (let i = 0; i < this.segments.length; i++) {
        const segment = this.segments[i];
        const segmentText = caseSensitive ? segment.text : segment.text.toLowerCase();
        
        if (segmentText.includes(searchPhrase)) {
          matches.push({
            segmentIndex: i,
            timestamp: segment.startTime,
            text: segment.text,
            phraseMatch: true
          });
        }
      }
    }

    return matches;
  }

  rankResults(results, query) {
    return results
      .map(result => ({
        ...result,
        score: this.calculateScore(result, query),
        context: this.getContext(result.segmentIndex)
      }))
      .sort((a, b) => b.score - a.score);
  }

  calculateScore(result, query) {
    let score = 0;
    const queryWords = this.tokenize(query);
    
    // Base score for having matches
    score += result.matchedWords ? result.matchedWords.length * 10 : 10;
    
    // Bonus for exact phrase matches
    if (result.phraseMatch) {
      score += 15;
    }
    
    // Penalty for fuzzy matches
    if (result.fuzzyMatch) {
      score -= 3;
    }
    
    // Bonus for word proximity in text
    if (result.matchedWords && result.matchedWords.length > 1) {
      score += this.calculateProximityBonus(result.text, queryWords);
    }
    
    // Slight penalty for very long segments
    if (result.text.length > 200) {
      score -= 2;
    }
    
    return score;
  }

  calculateProximityBonus(text, queryWords) {
    const textWords = this.tokenize(text);
    const positions = [];
    
    for (const queryWord of queryWords) {
      const pos = textWords.indexOf(queryWord.toLowerCase());
      if (pos !== -1) {
        positions.push(pos);
      }
    }
    
    if (positions.length > 1) {
      const span = Math.max(...positions) - Math.min(...positions);
      return Math.max(0, 5 - span); // Closer words get higher bonus
    }
    
    return 0;
  }

  getContext(segmentIndex, contextSize = 2) {
    const start = Math.max(0, segmentIndex - contextSize);
    const end = Math.min(this.segments.length, segmentIndex + contextSize + 1);
    
    const contextSegments = this.segments.slice(start, end);
    
    return {
      fullText: contextSegments.map(seg => seg.text).join(' '),
      beforeText: this.segments.slice(start, segmentIndex).map(seg => seg.text).join(' '),
      matchText: this.segments[segmentIndex].text,
      afterText: this.segments.slice(segmentIndex + 1, end).map(seg => seg.text).join(' ')
    };
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim()
      .split(' ')
      .filter(word => word.length > 1); // Remove single characters
  }

  isFuzzyMatch(word1, word2, threshold = 0.7) {
    if (Math.abs(word1.length - word2.length) > 3) {
      return false; // Too different in length
    }
    
    const distance = this.levenshteinDistance(word1, word2);
    const maxLength = Math.max(word1.length, word2.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity >= threshold;
  }

  levenshteinDistance(a, b) {
    const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        if (a[i-1] === b[j-1]) {
          matrix[j][i] = matrix[j-1][i-1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j-1][i] + 1,     // deletion
            matrix[j][i-1] + 1,     // insertion  
            matrix[j-1][i-1] + 1    // substitution
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  getIndexStats() {
    return {
      totalSegments: this.segments.length,
      uniqueWords: this.wordIndex.size,
      ngramCount: this.ngramIndex.size,
      isIndexed: this.isIndexed
    };
  }
}

// Create global instance
window.searchEngine = new SearchEngine();