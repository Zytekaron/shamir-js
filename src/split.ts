import { GF256 } from "@zytekaron/galois";
import { type Options, FIELD_256, TAG_LENGTH } from "./squad";

const encoder = new TextEncoder();

/**
 * Takes the secret and splits it into n shares, where
 * at least k are required to recreate the secret.
 *
 * Shares are indexed in the map from 1 to n. When you
 * combine shares, the key/value pairs must match, aside
 * from omitting up to (n-k) key/value pairs. For example,
 * you cannot swap the values for shares[1] and shares[3],
 * as the key denotes the x value used in the underlying
 * algorithm, and the value is the coefficient for that key.
 * shares[0] is not used, as this is where the secret lies.
 *
 * If your use case requires that it be possible to
 * determine if the secret was properly recreated later,
 * you should add information to the secret that allows
 * you to test for garbage output. For example, you could
 * make the first 8 bytes all zeros. The combination step
 * is unaware of situations where < k shares are combined.
 *
 * Constraints:
 *   - 2 <= k <= 255
 *   - k <= n <= 255
 *
 * Reference: https://en.wikipedia.org/wiki/Shamir's_secret_sharing
 *
 * @param secret - The secret to split using Shamir.
 * @param k - The minimum number of shares required to recover the secret.
 * @param n - The total number of shares to generate.
 * @param options - Options related to the Galois field and tagging.
 * @return A map from share indices (1..=n) to shares.
 */
export function split(secret: Uint8Array, k: number, n: number, options: Options = {}): Map<number, Uint8Array> {
    const { gf = FIELD_256, tag = false } = options;

    if (gf == null) {
        throw new Error("galois field is nil");
    }
    if (secret.length === 0) {
        throw new Error("secret is empty");
    }
    if (k < 2) {
        throw new Error("k must be at least 2");
    }
    if (n < k) {
        throw new Error("n must not be less than k");
    }

    const degree = k - 1;
    const shares = new Map<number, Uint8Array>();

    // 0 for untagged, TAG_LENGTH for tagged.
    const tagLength = tag ? TAG_LENGTH : 0;

    // create share buffers
    for (let i = 1; i <= n; i++) {
        shares.set(i, new Uint8Array(secret.length + tagLength));
    }

    // encode tag
    if (tag) {
        try {
            for (let i = 0; i < TAG_LENGTH; i++) {
                const coefficients = GF256.makePolynomial(0, degree);

                for (let x = 1; x <= n; x++) {
                    shares.get(x)![i] = gf.evaluate(coefficients, x);
                }
            }
        } catch (err) {
            throw new Error(`generating polynomial: ${err}`);
        }
    }

    // encode secret
    try {
        for (let i = 0; i < secret.length; i++) {
            const coefficients = GF256.makePolynomial(secret[i]!, degree);

            for (let x = 1; x <= n; x++) {
                shares.get(x)![i + tagLength] = gf.evaluate(coefficients, x);
            }
        }
    } catch (err) {
        throw new Error(`generating polynomial: ${err}`);
    }

    return shares;
}

/**
 * Takes in a string and uses a TextEncoder to encode it into a Uint8Array, then passes it into split().
 *
 * @param secret - The secret string to split using Shamir.
 * @param k - The minimum number of shares required to recover the secret.
 * @param n - The total number of shares to generate.
 * @param options - Options related to the Galois field and tagging.
 * @return A map from share indices (1..=n) to shares.
 */
export function splitString(secret: string, k: number, n: number, options: Options = {}): Map<number, Uint8Array> {
    return split(encoder.encode(secret), k, n, options);
}
