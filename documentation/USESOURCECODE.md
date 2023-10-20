[< Back](PROFESSIONALTOPICS.md)  
[< Table of Contents](../README.md#advanced-stuff)


# You should read and extend source code

Like for real. The whole library is about 2k lines of code. You might have problem with methods for `for` or 
`injectables` (does are pretty messily written due to complexity and continuous bug fixing and are still waiting for 
refactor) but everything else is pretty strait forward. 

Let's have a look for the code which searches HTML for actions:
```js
  compile() {
    let html = this.__dito.html;

    html = this.compileFindAndReplace(html, '@b:', 'b', 'binds', { hasName: true });
    html = this.compileFindAndReplace(html, '@i:', 'i', 'inputs', { hasName: true });
    html = this.compileFindAndReplace(html, '@o:', 'o', 'outputs', { hasName: true });
    html = this.compileFindAndReplace(html, '@a:', 'a', 'attrs', { hasName: true });
    html = this.compileExecutables(html);
    html = this.compileFindAndReplace(html, '@e:', 'e', 'events', { hasName: true });
    html = this.compileFindAndReplace(html, '@if', 'if', 'ifs');
    html = this.compileFindAndReplace(html, '@value', 'v', 'for_values');
    html = this.compileFindAndReplace(html, '@key', 'k', 'for_keys');
    html = this.compileFindAndReplace(html, '@pack', 'p', 'packs');
    html = this.compileFindAndReplace(html, '@use', 'u', 'uses');
    html = this.compileFindAndReplace(html, '@uname', 'un', 'unames');
    html = this.compileFindAndReplace(html, '@get', 'g', 'gets');
    html = this.compileFindAndReplace(html, '@min', 'm', 'for_mins');
    html = this.compileFindAndReplace(html, '@def-min', 'di', 'for_min_defs');
    this.__dito.html = this.compileFindAndReplace(html, '@for', 'for', 'fors');

    this.__dito.compiledHTML = true;
  }
```
Here is whole method which is responsible for defining actions on components. We can read from it what actions are 
available and what are their full names (`@e` => `events` or `@def-min` => `for_min_defs`).

What about method responsible for converting text into functions?

```js
  getFunction(script, node, vars = []) {
    const observableKeys = this.getObservablesKeys(node),
      keys = this.getObservablesKeys(node)
    ;
    script = script + '; return [' + keys.join(',') + '];';

    const cacheKey = keys.join(',') + script;

    if (!this.cachedScripts[cacheKey]) {
      this.cacheScript(cacheKey, script, [...vars, ...keys]);
    }

    return this.cachedScripts[cacheKey];
  }

  cacheScript(cacheKey, script, keys) {
    this.cachedScripts[cacheKey] = new Function(...keys, script).bind({});
  }

  getObservablesKeys(node) {
    return [
      ...Object.keys(this.methods),
      ...Object.keys(this.$),
      ...Object.keys(node.$self.scope),
      ...Object.keys(this.getInjectedScopes(node.$self.injectedParent)),
      node.$self.forBox.keyName || this.keyName,
      node.$self.forBox.valueName || this.valueName,
      this.nodeName,
    ];
  }

  getObservablesValues(node) {
    return [
      ...Object.values(this.methods),
      ...Object.values(this.$),
      ...Object.values(node.$self.scope),
      ...Object.values(this.getInjectedScopes(node.$self.injectedParent)),
      node.$self.forBox.key,
      node.$self.forBox.value,
      node,
    ];
  }
```

This one is longer, I'll admit, but still very simple! 

Having proper look into code before using the library is very important. I can write even hundred pages of 
documentation, but it will be still nothing in face of real code. Do yourself the favour and before using the library 
for something other than hobby project have a look at the source code? It will help you decide if you want to use it 
then all  the case studies or recommendation in the world.

Also, this is not some high level grimoire of compilers (_#angular.ts_) but simple ES6 JS class. Extend it, overwrite it - even without 
a fork - just for one component even. I do it and it's really helpful to have specialized components with different 
set of rules.

[dito.js](../src/dito.js)

[ditoelement.js](../src/ditoelement.js)
