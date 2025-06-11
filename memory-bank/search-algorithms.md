# Caption Indexing and Search Implementation

## Search Algorithm Design

### Inverted Index Structure
```javascript
// Core index structure for fast lookups
class CaptionIndex {
  constructor() {
    this.wordIndex = new Map(); // word -> [timestamps]
    this.segments = [];         // ordered caption segments
    this.metadata = {
      totalWords: 0,
      language: 'en',
      videoDuration: 0
    };
  }
  
  // Build index from caption data
  buildIndex(captions) {
    this.segments = this.processCaptions(captions);
    this.createWordIndex();
  }
}
```

### Caption Processing Pipeline
1. **Normalization**: Convert timestamps to seconds, clean text
2. **Tokenization**: Split into words, handle punctuation
3. **Indexing**: Create word-to-timestamp mappings
4. **Context Building**: Link adjacent segments for result context

### Text Processing Functions
```javascript
// Clean and normalize caption text
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
}

// Tokenize text into searchable words
function tokenize(text) {
  return normalizeText(text)
    .split(' ')
    .filter(word => word.length > 1); // Remove single chars
}

// Extract timestamp from YouTube caption format
function parseTimestamp(captionSegment) {
  return Math.floor(captionSegment.tStartMs / 1000);
}
```

## Search Implementation Strategies

### Basic Text Search
```javascript
class BasicSearch {
  search(query, index) {
    const queryWords = tokenize(query);
    const results = [];
    
    for (const word of queryWords) {
      if (index.wordIndex.has(word)) {
        const timestamps = index.wordIndex.get(word);
        results.push(...this.formatResults(timestamps, word));
      }
    }
    
    return this.rankResults(results);
  }
}
```

### Fuzzy Search Implementation
```javascript
class FuzzySearch {
  // Levenshtein distance for typo tolerance
  levenshteinDistance(a, b) {
    const matrix = Array(b.length + 1).fill().map(() => 
      Array(a.length + 1).fill(0)
    );
    
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
  
  // Find fuzzy matches with similarity threshold
  fuzzyMatch(query, word, threshold = 0.7) {
    const distance = this.levenshteinDistance(query, word);
    const maxLength = Math.max(query.length, word.length);
    const similarity = 1 - (distance / maxLength);
    return similarity >= threshold;
  }
}
```

### Phrase Search Implementation
```javascript
class PhraseSearch {
  // Search for exact phrases in captions
  searchPhrase(phrase, index) {
    const normalizedPhrase = normalizeText(phrase);
    const results = [];
    
    for (let i = 0; i < index.segments.length; i++) {
      const segment = index.segments[i];
      const normalizedText = normalizeText(segment.text);
      
      if (normalizedText.includes(normalizedPhrase)) {
        results.push({
          timestamp: segment.timestamp,
          text: segment.text,
          matchType: 'exact_phrase',
          context: this.getContextAround(index.segments, i)
        });
      }
    }
    
    return results;
  }
  
  // Get surrounding context for result snippet
  getContextAround(segments, index, contextSize = 2) {
    const start = Math.max(0, index - contextSize);
    const end = Math.min(segments.length, index + contextSize + 1);
    
    return segments.slice(start, end).map(seg => seg.text).join(' ');
  }
}
```

## Performance Optimization Strategies

### Index Optimization
```javascript
class OptimizedIndex {
  constructor() {
    this.wordIndex = new Map();
    this.segmentIndex = new Map(); // timestamp -> segment
    this.ngrams = new Map();       // bigrams/trigrams for phrase search
  }
  
  // Create n-gram index for faster phrase searches
  buildNGramIndex(segments, n = 2) {
    for (const segment of segments) {
      const words = tokenize(segment.text);
      for (let i = 0; i <= words.length - n; i++) {
        const ngram = words.slice(i, i + n).join(' ');
        if (!this.ngrams.has(ngram)) {
          this.ngrams.set(ngram, []);
        }
        this.ngrams.get(ngram).push(segment.timestamp);
      }
    }
  }
  
  // Memory-efficient result caching
  cacheResults(query, results, maxCacheSize = 50) {
    if (this.resultCache.size >= maxCacheSize) {
      // Remove oldest cache entry
      const firstKey = this.resultCache.keys().next().value;
      this.resultCache.delete(firstKey);
    }
    this.resultCache.set(query, results);
  }
}
```

### Search Result Ranking
```javascript
class ResultRanker {
  // Rank search results by relevance
  rankResults(results, query) {
    return results
      .map(result => ({
        ...result,
        score: this.calculateScore(result, query)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Limit to top 20 results
  }
  
  calculateScore(result, query) {
    let score = 0;
    
    // Exact word matches get higher scores
    const queryWords = tokenize(query);
    const resultWords = tokenize(result.text);
    
    for (const queryWord of queryWords) {
      if (resultWords.includes(queryWord)) {
        score += 10; // Exact match bonus
      }
    }
    
    // Phrase proximity bonus
    if (this.wordsAreClose(queryWords, resultWords)) {
      score += 5;
    }
    
    // Length penalty for very long segments
    if (result.text.length > 200) {
      score -= 2;
    }
    
    return score;
  }
  
  wordsAreClose(queryWords, resultWords, maxDistance = 3) {
    // Check if query words appear close together in result
    for (let i = 0; i < queryWords.length - 1; i++) {
      const word1Idx = resultWords.indexOf(queryWords[i]);
      const word2Idx = resultWords.indexOf(queryWords[i + 1]);
      
      if (word1Idx !== -1 && word2Idx !== -1) {
        if (Math.abs(word2Idx - word1Idx) <= maxDistance) {
          return true;
        }
      }
    }
    return false;
  }
}
```

## Search Performance Considerations

### Large Video Handling (3+ Hours)
- **Lazy Indexing**: Build index progressively during search
- **Segment Chunking**: Process captions in manageable chunks
- **Memory Management**: Clear old indexes when switching videos
- **Background Processing**: Use Web Workers for heavy computation

### Real-Time Search Optimization
- **Debounced Input**: Wait 300ms after user stops typing
- **Progressive Results**: Show results as they're found
- **Cached Searches**: Store recent search results
- **Incremental Search**: Refine results as query lengthens
