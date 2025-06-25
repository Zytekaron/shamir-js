// Basic usage: defaults to using AES field parameters, with no tagging.
import { splitString, combineString } from "@zytekaron/shamir";

const secret = "Hello, World!";

// Split the secret into 5 shares, numbered 1 to 5,
// where at least 3 are required to recover the secret.
const shares = splitString(secret, 3, 5);

// Delete 2 of the shares, leaving only the required 3 shares.
shares.delete(2);
shares.delete(4);

// Combine using the 3 remaining shares, which will succeed.
const combined = combineString(shares);

console.log(combined); // Hello, World!
