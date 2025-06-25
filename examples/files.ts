import { readFileSync, writeFileSync } from "fs";
import { GF256, Polynomials, Generators, split, combine } from "@zytekaron/shamir";

// Custom Galois field using Reed Solomon parameters.
const gf = new GF256(Polynomials.REED_SOLOMON, Generators.FAST);
const tag = true; // enable tagging for integrity checks

const secret = readFileSync("secret.txt");

// Split the shares and store them in files.
const shares = split(secret, 3, 5, { gf, tag });
for (const [i, share] of shares.entries()) {
    // Concatenate the share index and the share data so that the file
    // name can be changed later and isn't needed to determine the index.
    const full = Buffer.concat([Buffer.from([i]), share]);

    // Write the share to a file.
    writeFileSync(`share_${i}`, full);
}

// ---
shares.clear();
// ---

// Read some of the shares from their files and combine them.
for (const index of [2, 4, 5]) {
    // Read the share from the file.
    const share = readFileSync(`share_${index}`);

    // It's possible that the file name is wrong, so we should
    // read the share index along with its data from the contents.
    const shareIndex = share[0]!;
    const shareData = share.subarray(1);

    // Store the share at its proper index.
    shares.set(shareIndex, shareData);
}

// Attempt to recover the secret. Note that the Galois field must be the same
// as the one used during split(), however the tag parameter can be omitted
// on this end, but you will end up with an 8-byte zero prefix on your secret.
// If it fails, it will throw an error due to the tag.
const combined = combine(shares, { gf, tag });


// λ diff secret.txt combined.txt
writeFileSync("combined.txt", combined);
