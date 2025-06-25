import type { GF256, Point } from "@zytekaron/galois";
import { type Options, FIELD_256, TAG_LENGTH } from "./squad";

const decoder = new TextDecoder();

interface CombineOptions {
    gf?: GF256;
    tag?: boolean;
}

/**
 * Takes the available shares and attempts to
 * use them to recreate the original secret.
 *
 * At least k of the original shares must be present
 * for this operation to succeed, otherwise it will
 * silently fail by returning garbage output.
 *
 * @param shares - The map of shares to combine. At least `k` shares are required.
 * @param options - Options related to the Galois field and tagging.
 * @return The combined secret, or garbage if not enough or invalid shares were provided.
 */
export function combine(shares: Map<number, Uint8Array>, options: Options = {}): Uint8Array {
    const { gf = FIELD_256, tag = false } = options;

    if (shares.size === 0) {
        return new Uint8Array(0);
    }

    const firstShare = shares.values().next().value!;
    let secretLength = firstShare.length;
    if (tag) {
        secretLength -= TAG_LENGTH;
    }

    if (secretLength === 0) {
        return new Uint8Array(0);
    }

    // verify tag
    if (tag) {
        try {
            const samples: Point[] = new Array(shares.size);

            let sampleIndex = 0;
            for (let i = 0; i < TAG_LENGTH; i++) {
                sampleIndex = 0;
                for (const [x, share] of shares.entries()) {
                    samples[sampleIndex] = { x, y: share[i]! };
                    sampleIndex++;
                }

                if (gf.interpolate(samples, 0) !== 0) {
                    throw new Error("tag mismatch");
                }
            }
        } catch (err) {
            throw new Error(`tag verification failed: ${err}`);
        }
    }

    // unlock secret
    const tagOffset = tag ? TAG_LENGTH : 0;
    const secret = new Uint8Array(secretLength);
    const samples: Point[] = new Array(shares.size);

    try {
        let sampleIndex = 0;
        for (let i = 0; i < secretLength; i++) {
            sampleIndex = 0;
            for (const [x, share] of shares.entries()) {
                samples[sampleIndex] = { x, y: share[i + tagOffset]! };
                sampleIndex++;
            }

            secret[i] = gf.interpolate(samples, 0);
        }
    } catch (err) {
        throw new Error(`secret reconstruction failed: ${err}`);
    }

    return secret;
}

/**
 * Takes in a string and uses a TextDecoder to decode it from the Uint8Array.
 *
 * @param shares - The map of shares to combine. At least `k` shares are required.
 * @param options - Options related to the Galois field and tagging.
 * @return The combined secret, or garbage if not enough or invalid shares were provided.
 */
export function combineString(shares: Map<number, Uint8Array>, options: Options = {}): string {
    return decoder.decode(combine(shares, options));
}
