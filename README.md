# Shamir

**version:** 0.0.1

This library implements Shamir Secret Sharing.

I plan to add a GF(2^16) aka 65536 implementation in the future.

# Compatible Libraries

- **Go:** [Zytekaron/squad-go](https://github.com/Zytekaron/squad-go) - with CLI app

# Installation & Usage

```
npm i @zytekaron/shamir
```

More usage examples are in [examples/](./examples).

```ts
// Basic usage: defaults to using AES field parameters, with no tagging.
import { splitString, combineString } from "@zytekaron/shamir";

const secret = "Hello, World!";

// Split the secret into 5 shares, numbered 1 to 5,
// where at least 3 are required to recover the secret.
const shares = splitString(secret, 3, 5);

// Delete 2 of the shares, leaving 3 available.
shares.delete(2);
shares.delete(4);

// Combine using the 3 remaining shares, which will succeed.
const combined = combineString(shares);

console.log(combined); // Hello, World!
```

More examples in 

# License

**shamir-js** is licensed under the [MIT License](./LICENSE).
