import { readFileSync, writeFileSync } from 'fs';
import { GF256, Polynomials, Generators, split, combine } from "../src";

const gf = new GF256(
    Polynomials.REED_SOLOMON,
    Generators.FAST,
);
const tag = true;

const secret = "Hello, World!";

// Test using shares in memory without mutation
{
    const shares = split(Buffer.from(secret), 2, 3, { gf, tag });

    const combinedRaw = combine(shares, { gf, tag });
    const combined = Buffer.from(combinedRaw).toString();

    console.log(secret);
    console.log(combined);
    console.log(secret === combined ? 'SUCCESS' : 'FAIL');
}

// Test serializing and parsing shares using files
{
    const shares = split(Buffer.from(secret), 2, 3, { gf, tag });

    for (const [x, share] of shares.entries()) {
        const full = Buffer.concat([Buffer.from([x]), share]);
        writeFileSync(`./test/testdir/share_${x}`, full);
    }

    // ---
    shares.clear();
    // ---


    const paths = [1, 3].map(n => `./test/testdir/share_${n}`);
    for (const path of paths) {
        const data = readFileSync(path);
        const x = data[0]!;
        const share = data.subarray(1);

        shares.set(x, share);
    }

    const combinedRaw = combine(shares, { gf, tag });
    const combined = Buffer.from(combinedRaw).toString();

    console.log(secret);
    console.log(combined);
    console.log(secret === combined ? 'SUCCESS' : 'FAIL');
}
