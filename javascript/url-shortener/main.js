/**
 * URL SHORTENER Implementation in JavaScript
 * ==========================================
 * 
 * FILE PURPOSE:
 * Implements URL shortening service with short URL generation,
 * redirection, custom aliases, and click tracking.
 * 
 * DESIGN PATTERNS:
 * 1. Strategy Pattern: URL encoding strategies
 * 2. Repository Pattern: URL storage abstraction
 * 3. Factory Pattern: Short URL creation
 * 4. Singleton Pattern: Service instance
 * 
 * OOP CONCEPTS:
 * - Encapsulation: Internal mapping hidden
 * - Abstraction: Clean service interface
 * 
 * USAGE:
 * const shortener = new URLShortener();
 * const short = shortener.shorten('https://example.com/long/url');
 * const original = shortener.expand(short);
 * 
 * EXPECTED RETURN:
 * Short URL string (e.g., 'https://short.ly/abc123')
 */

/**
 * URLMapping - Represents URL mapping with metadata
 */
class URLMapping {
    constructor(shortCode, longUrl) {
        this.shortCode = shortCode;
        this.longUrl = longUrl;
        this.createdAt = new Date();
        this.clickCount = 0;
    }

    incrementClicks() {
        this.clickCount++;
    }
}

/**
 * CodeGenerator - Strategy for generating short codes
 * 
 * DESIGN PATTERN: Strategy Pattern
 */
class CodeGenerator {
    static generate(length = 6) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }

    static isValidCustomCode(code) {
        return code.length >= 3 && 
               code.length <= 20 && 
               /^[a-zA-Z0-9]+$/.test(code);
    }
}

/**
 * URLShortener - Main service
 * 
 * DESIGN PATTERN: Singleton + Repository
 */
class URLShortener {
    constructor() {
        if (URLShortener.instance) {
            return URLShortener.instance;
        }

        this.urlMap = new Map();
        this.reverseMap = new Map();
        this.baseUrl = 'https://short.ly/';

        URLShortener.instance = this;
    }

    shorten(longUrl, customAlias = null) {
        // Check if already shortened
        if (this.reverseMap.has(longUrl)) {
            const code = this.reverseMap.get(longUrl);
            const shortUrl = this.baseUrl + code;
            console.log(`✓ Already shortened: ${shortUrl}`);
            return shortUrl;
        }

        // Generate or use custom code
        let code;
        if (customAlias) {
            if (!CodeGenerator.isValidCustomCode(customAlias)) {
                console.log(`✗ Invalid custom alias: ${customAlias}`);
                return null;
            }
            if (this.urlMap.has(customAlias)) {
                console.log(`✗ Alias already taken: ${customAlias}`);
                return null;
            }
            code = customAlias;
        } else {
            code = CodeGenerator.generate();
            while (this.urlMap.has(code)) {
                code = CodeGenerator.generate();
            }
        }

        // Create mapping
        const mapping = new URLMapping(code, longUrl);
        this.urlMap.set(code, mapping);
        this.reverseMap.set(longUrl, code);

        const shortUrl = this.baseUrl + code;
        console.log(`✓ Shortened: ${shortUrl}`);
        return shortUrl;
    }

    expand(shortUrl) {
        const code = shortUrl.replace(this.baseUrl, '');
        const mapping = this.urlMap.get(code);

        if (mapping) {
            mapping.incrementClicks();
            return mapping.longUrl;
        }

        return null;
    }

    getStats(shortUrl) {
        const code = shortUrl.replace(this.baseUrl, '');
        const mapping = this.urlMap.get(code);

        if (mapping) {
            return {
                shortCode: mapping.shortCode,
                longUrl: mapping.longUrl,
                clicks: mapping.clickCount,
                createdAt: mapping.createdAt
            };
        }

        return null;
    }
}

/**
 * Demonstrate URL Shortener
 */
function main() {
    console.log('='.repeat(70));
    console.log('URL SHORTENER - Low Level Design Demo');
    console.log('='.repeat(70));

    const shortener = new URLShortener();

    // Shorten URLs
    console.log('\n🔗 Shortening URLs...');
    const short1 = shortener.shorten('https://example.com/very/long/url/path/to/resource');
    const short2 = shortener.shorten('https://github.com/user/repo/issues/123', 'myrepo');
    const short3 = shortener.shorten('https://example.com/very/long/url/path/to/resource'); // Duplicate

    // Expand URLs
    console.log('\n🔓 Expanding URLs...');
    console.log(`  ${short1} → ${shortener.expand(short1)}`);
    console.log(`  ${short2} → ${shortener.expand(short2)}`);

    // Get statistics
    console.log('\n📊 Statistics...');
    const stats = shortener.getStats(short1);
    if (stats) {
        console.log(`  Clicks: ${stats.clicks}`);
        console.log(`  Created: ${stats.createdAt}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(70));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        URLShortener,
        URLMapping,
        CodeGenerator
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}
