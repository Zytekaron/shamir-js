import { GF256, Polynomials, Generators } from "@zytekaron/galois";

/**
 * Options to configure the behavior of the `split` and `combine` functions.
 *
 * @property gf - A custom GF256 field instance to use for polynomial operations.
 *                Defaults to FIELD_256 if not provided.
 * @property tag - Whether to prepend a tag to the shares for integrity checking.
 *                 When true, TAG_LENGTH bytes are prepended to each share.
 */
export interface Options {
    gf?: GF256;
    tag?: boolean;
}

/**
 * FIELD_256 is a GF(2^8) field which uses the
 * standard AES polynomial (0x11B) and generator (0x03).
 *
 * This is the default Galois Field used for Shamir Secret Sharing in
 * this library, and is the most common field found in other libraries.
 */
export const FIELD_256 = new GF256(Polynomials.AES, Generators.AES);

/**
 * TAG_LENGTH is the length of the zero prefix added to secrets when tagging
 * is enabled for integrity verification. This value will never change.
 */
export const TAG_LENGTH = 8;
