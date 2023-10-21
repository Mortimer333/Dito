[< Installation](../README.md#installation)

# Installation without module bundlers


So if you want to use this package with `npm` as package manager but without module bundlers I recommend settings some 
[`esbuild`](https://esbuild.github.io/getting-started/#install-esbuild) script to retrieve it from `node_modules` and
put it somewhere easy to fetch.

In your `package.json` in `scripts` put something similar to this:

```json
{
  "scripts": {
    "dito": "esbuild dito.bundle.js --bundle --minify --platform=neutral --main-fields=module,main --outfile=dist/dito.js",
    "ditoelement": "esbuild ditoelement.bundle.js --bundle --minify --platform=neutral --main-fields=module,main --outfile=dist/ditoelement.js"
  }
}
```
and in `dito.bundle.js`:
```js
import { Dito } from '@mortimer333/dito';

export {
  Dito,
};
```
the same setup for `ditoelement.bundle.js`:
```js
import { DitoElement } from '@mortimer333/dito';

export {
  DitoElement,
};
```
This will generate in your `dist/` two files `dito.js` and `ditoelement.js` which will hold respectively `Dito`
and `DitoElement` classes in module format ready to be retrieved by `dist/dito.js` instead of
`node_modules/@mortimer333/src/dito.min.js`;

I also recommend installing [`npm-run-all`](https://github.com/mysticatea/npm-run-all) package to simplify building
process (run one command `npm run build` instead of two). Thanks to it you will be able to link those two command into one:
```json
{
  "scripts": {
    [...]
    "build": "npm-run-all --parallel dito*"
  }
}
```
