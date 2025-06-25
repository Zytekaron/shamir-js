import { describe, expect, it } from "bun:test";
import { combine, Generators, GF256, Polynomials, split } from "../src";
import { randomBytes } from "crypto";

describe('Shamir Secret Sharing', () => {
  // Test utilities
  const generateRandomSecret = (length: number): Uint8Array => {
    return randomBytes(length);
  };

  const setupShares = (
    secret: Uint8Array,
    k: number,
    n: number,
    options: { gf?: GF256; tagged?: boolean } = {}
  ) => {
    return split(secret, k, n, options);
  };

  const testShamirShareCombination = (
    secret: Uint8Array,
    k: number,
    n: number,
    kToUse: number,
    options: { gf?: GF256; tagged?: boolean } = {}
  ) => {
    const shares = setupShares(secret, k, n, options);
    expect(shares.size).toBe(n);

    // Select exactly kToUse shares randomly
    const allShareIndexes = Array.from(shares.keys());
    const selectedShareIndexes: number[] = [];
    
    while (selectedShareIndexes.length < kToUse) {
      const randomIndex = Math.floor(Math.random() * allShareIndexes.length);
      const shareIndex = allShareIndexes[randomIndex]!;
      
      if (!selectedShareIndexes.includes(shareIndex)) {
        selectedShareIndexes.push(shareIndex);
      }
    }

    // Create a new map with only the selected shares
    const selectedShares = new Map<number, Uint8Array>();
    for (const idx of selectedShareIndexes) {
      selectedShares.set(idx, shares.get(idx)!);
    }

    // Combine the selected shares
    const reconstructed = combine(selectedShares, options);
    
    // Compare the original secret with the reconstructed one
    return {
      originalSecret: secret,
      reconstructedSecret: reconstructed,
      match: Buffer.from(secret).toString() === Buffer.from(reconstructed).toString()
    };
  };

  describe('using AES polynomial/generator (default)', () => {
    describe('untagged secret sharing', () => {
      it('should correctly split and combine a simple string secret', () => {
        const secret = new TextEncoder().encode('Hello, World!');
        const result = testShamirShareCombination(secret, 3, 5, 3);
        expect(result.match).toBe(true);
      });

      it('should correctly split and combine a binary secret', () => {
        const secret = generateRandomSecret(32);
        const result = testShamirShareCombination(secret, 3, 5, 3);
        expect(Buffer.compare(result.originalSecret, result.reconstructedSecret)).toBe(0);
      });

      it('should correctly combine with exactly k shares', () => {
        const secret = generateRandomSecret(64);
        const result = testShamirShareCombination(secret, 3, 6, 3);
        expect(Buffer.compare(result.originalSecret, result.reconstructedSecret)).toBe(0);
      });

      it('should correctly combine with more than k shares', () => {
        const secret = generateRandomSecret(64);
        const result = testShamirShareCombination(secret, 3, 6, 5);
        expect(Buffer.compare(result.originalSecret, result.reconstructedSecret)).toBe(0);
      });

      it('should work with large secrets', () => {
        const secret = generateRandomSecret(1024);
        const result = testShamirShareCombination(secret, 4, 10, 6);
        expect(Buffer.compare(result.originalSecret, result.reconstructedSecret)).toBe(0);
      });

      it('should work with edge case threshold values', () => {
        const secret = generateRandomSecret(32);
        const result = testShamirShareCombination(secret, 2, 5, 2);
        expect(Buffer.compare(result.originalSecret, result.reconstructedSecret)).toBe(0);
      });
    });

    describe('tagged secret sharing', () => {
      it('should correctly split and combine a simple string secret with tagging', () => {
        const secret = new TextEncoder().encode('Hello, World!');
        const result = testShamirShareCombination(secret, 3, 5, 3, { tagged: true });
        expect(result.match).toBe(true);
      });

      it('should correctly split and combine a binary secret with tagging', () => {
        const secret = generateRandomSecret(32);
        const result = testShamirShareCombination(secret, 3, 5, 3, { tagged: true });
        expect(Buffer.compare(result.originalSecret, result.reconstructedSecret)).toBe(0);
      });

      it('should correctly combine with exactly k shares with tagging', () => {
        const secret = generateRandomSecret(64);
        const result = testShamirShareCombination(secret, 3, 6, 3, { tagged: true });
        expect(Buffer.compare(result.originalSecret, result.reconstructedSecret)).toBe(0);
      });

      it('should correctly combine with more than k shares with tagging', () => {
        const secret = generateRandomSecret(64);
        const result = testShamirShareCombination(secret, 3, 6, 5, { tagged: true });
        expect(Buffer.compare(result.originalSecret, result.reconstructedSecret)).toBe(0);
      });

      it('should throw an error when tag verification fails', () => {
        const secret = generateRandomSecret(32);
        const shares = split(secret, 3, 5, { tag: true });
        
        // Corrupt one of the shares by modifying the tag area
        const shareKey = Array.from(shares.keys())[0]!;
        const corruptedShare = shares.get(shareKey)!;
        corruptedShare[0] = (corruptedShare[0]! + 1) % 256; // Modify the first byte of the tag
        
        expect(() => {
          combine(shares, { tag: true });
        }).toThrow('tag verification failed');
      });
    });
  });

  describe('using REED_SOLOMON polynomial/generator', () => {
    const reedSolomonGF = new GF256(
      Polynomials.REED_SOLOMON,
      Generators.FAST
    );

    describe('untagged secret sharing with REED_SOLOMON', () => {
      it('should correctly split and combine a simple string secret with REED_SOLOMON', () => {
        const secret = new TextEncoder().encode('Hello, World!');
        const result = testShamirShareCombination(secret, 3, 5, 3, { gf: reedSolomonGF });
        expect(result.match).toBe(true);
      });

      it('should correctly split and combine a binary secret with REED_SOLOMON', () => {
        const secret = generateRandomSecret(32);
        const result = testShamirShareCombination(secret, 3, 5, 3, { gf: reedSolomonGF });
        expect(Buffer.compare(result.originalSecret, result.reconstructedSecret)).toBe(0);
      });
    });

    describe('tagged secret sharing with REED_SOLOMON', () => {
      it('should correctly split and combine with REED_SOLOMON and tagging', () => {
        const secret = generateRandomSecret(64);
        const result = testShamirShareCombination(secret, 3, 6, 4, { 
          gf: reedSolomonGF, 
          tagged: true 
        });
        expect(Buffer.compare(result.originalSecret, result.reconstructedSecret)).toBe(0);
      });
    });
  });

  describe('error handling', () => {
    it('should throw an error when secret is empty', () => {
      const emptySecret = new Uint8Array(0);
      expect(() => {
        split(emptySecret, 3, 5);
      }).toThrow('secret is empty');
    });

    it('should throw an error when k < 2', () => {
      const secret = generateRandomSecret(32);
      expect(() => {
        split(secret, 1, 5);
      }).toThrow('k must be at least 2');
    });

    it('should throw an error when n < k', () => {
      const secret = generateRandomSecret(32);
      expect(() => {
        split(secret, 5, 3);
      }).toThrow('n must not be less than k');
    });

    it('should return an empty array when combining an empty shares map', () => {
      const shares = new Map<number, Uint8Array>();
      const result = combine(shares);
      expect(result.length).toBe(0);
    });
  });
});