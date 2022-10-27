class Joints {
  url;
  filename = 'main';
  headers = {};
  params = {};
  components = {};
  registered = [];
  SKIP = '_skip';
  styleNode;
  mutationObsConf = { childList: true, subtree: true };

  constructor(settings = {}) {
    if (this.detectCSPRestriction()) {
      throw new Error('CSP restriction');
    }

    this.url = settings.url || window.location.origin;
    if (this.url[this.url.length - 1] != '/') {
      this.url += '/';
    }

    this.filename = settings.filename || this.filename;
    this.headers = settings.headers || this.headers;
    this.params = settings.headers || this.params;
    this.styleNode = document.createElement('style');
    document.head.appendChild(this.styleNode);

    Object.defineProperty(window, "__jmonkey", {
        value: {
          main: this,
          rendered : {},
          lastId: 0,
          registered: {}
        },
        writable: false
    });
  }

  register(name, version = 1, force = false) {
    if (name.indexOf('-') === -1) {
      throw new Error('Custom elements name must contain hypen (-)');
    }

    let skip = false;
    if (!force && localStorage.getItem(name)) {
      const comp = JSON.parse(localStorage.getItem(name));
      if (comp._version == version) {
        skip = true;
      }
    }

    this.components[name] = {js: null, html: null, css: null, cssInjected: false};

    // If it's not force and there is currently no instance of this component on site don't retrieve it
    if (!force && !document.querySelector(name)) {
      return;
    }

    const path = this.url + name + '/' + this.filename + '.';
    const js = import(path + 'js');
    const html = skip ? Promise.resolve(this.SKIP) : this.fetch(path + 'html');
    const css = skip ? Promise.resolve(this.SKIP) : this.fetch(path + 'css');
    this.registered.push(Promise.resolve(name + '_' + version));
    this.registered.push(html.catch((error) => error));
    this.registered.push(js.catch((error) => error));
    this.registered.push(css.catch((error) => error));
    window.__jmonkey.registered[name] = true;
  }

  async load() {
    const skipSize = 3;
    await Promise.all(this.registered).then(async (values) => {
      for (var i = 0; i < values.length; i++) {
        if (values[i + 1].message || values[i + 2].message || values[i + 3].message) {
          console.error(
            'There was unexpected network error at #' + ((i/4) + 1) + '. Skipping...',
            values[i + 1],
            values[i + 2],
            values[i + 3]
          );
          i += skipSize;
          continue;
        }

        if (typeof values[i] != 'string') {
          console.error('The name of component loaded as #' + ((i/4) + 1) + ' wasn\'t found. Skipping...');
          i += skipSize;
          continue;
        }
        const compAndVer = (values[i].split('_'));
        const version = compAndVer[compAndVer.length - 1];
        const component = compAndVer.slice(0, -1).join('_');

        let html = values[i + 1];
        let js   = values[i + 2];
        let css  = values[i + 3];
        if (!await this.validateFiles(component, {html, css})) {
          i += skipSize;
          continue;
        }

        const localComponent = JSON.parse(localStorage.getItem(component) || 'false');
        if ((html === this.SKIP || css === this.SKIP) && !localComponent) {
          console.error(
            'The component `' + component + '` was marked as already loaded once but' +
            ' he is missing from localStorage. Skipping...'
          );
          i += skipSize;
          continue;
        }

        let skipped = false;
        if (html === this.SKIP) {
          skipped = true;
          html = localComponent.html;
        } else {
          html = await html.text();
        }

        if (css === this.SKIP) {
          skipped = true;
          css = localComponent.css;
        } else {
          css = await css.text();
        }

        localStorage.setItem(component, JSON.stringify({ html, css, _version: version }));

        const range = document.createRange();
        range.selectNodeContents(document.createElement('div')); // fix for safari
        if (range.createContextualFragment(html).querySelector(component)) {
          console.error(
            "Script detected direct recursive use of components in `" + component + "`. " +
            "Components' additional call won't be rendered to avoid inifnite loop."
          );
        }

        ({ default: js } = js);


        Object.defineProperty(js.prototype, "__jmonkey", {
            value: {},
            writable: false
        });
        js.prototype.__jmonkey.html = html;

        this.components[component] = {name: component, js, html, css, cssInjected: false, _skipped: skipped };
        i += skipSize;
      }

      this.renderComponents(document);
    }).catch(err => console.error(err));
  }

  renderComponents(parent, skip = {}) {
    Object.keys(this.components).forEach(function(tagName) {
      if (!customElements.get(this.components[tagName].name) && typeof this.components[tagName].js == 'function') {
        customElements.define(this.components[tagName].name, this.components[tagName].js);
      }

      const tags = parent.querySelectorAll(tagName);
      if (tags.length > 0) {
        this.insertCss(this.components[tagName]);
      }
    }.bind(this));
  }

  async insertCss(component) {
    if (component.cssInjected) {
      return;
    }

    component.cssInjected = true;
    const sheet = this.styleNode.sheet;

    if (component._skipped) {
      component.css.forEach(rule => {
        sheet.insertRule(rule);
      });
      component.cssInjected = true;
      return;
    }

    const stylesheet = new CSSStyleSheet();
    await stylesheet.replace(component.css).catch((err) => {
      throw new Error('Failed to replace styles in `' + component.name + '`:', err);
    });

    const styles = [];
    Object.values(stylesheet.cssRules).forEach(rule => {
      styles.push(component.name + ' ' + rule.cssText);
      sheet.insertRule(component.name + ' ' + rule.cssText);
    });
    component.css = styles;

    // Update css with compiled one
    const saved = JSON.parse(localStorage.getItem(component.name));
    saved.css = component.css;
    localStorage.setItem(component.name, JSON.stringify(saved));
  }

  async validateFiles(component, compFiles) {
    const fileKeys = Object.keys(compFiles);
    for (var j = 0; j < fileKeys.length; j++) {
      const key = fileKeys[j];
      const file = compFiles[key];

      if (!file.ok && file !== this.SKIP) {
        const error = await file.text();
        console.error(
          key.toUpperCase() + " of component `" + component
          + "` returned an error: " + error + '. Skipping...'
        );
        return false;
      }
    }

    return true;
  }

  async fetch(url) {
    return fetch(url, {
      method: 'GET',
      headers: this.headers,
    });
  }

  // From Vue
  detectCSPRestriction() {
    // detect possible CSP restriction
    try {
      new Function('return 1');
      return false;
    } catch (e) {
      if (e.toString().match(/unsafe-eval|CSP/)) {
        console.error(
          'It seems you are using the Joints in an ' +
          'environment with Content Security Policy that prohibits unsafe-eval. ' +
          'The template compiler cannot work in this environment. Consider ' +
          'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
          'templates into render functions.'
        );
      }
      return true;
    }
  }
}
class RootJoint extends HTMLElement {
  renderInProgress = false;
  injectName = '$inject';
  key = null;
  value = null;
  queueRender;

  constructor() {
    super();
    if (this.constructor === RootJoint) {
      throw new Error("RootJoint is an abstract and cannot be instantiated as separate class");
    }
    this.defineObservable();
    this.saveMethods();
    this[this.injectName] = this.innerHTML;
    this.queueRender = this.debounce(e => {
      this.renderInProgress = false;
      this.render();
    });
    this.prepare();
  }

  /* EVENTS */
  prepare(){}      // Just after constructor
  beforeRender(){} // Before first render
  afterRender(){}  // After first render

  connectedCallback() {
    this.render();
  }

  saveMethods() {
    this.methods = {};
    const properties = Object.getOwnPropertyNames(this.constructor.prototype);
    properties.forEach(function (methodName) {
      if (typeof this[methodName] != 'function' || methodName == 'constructor') {
        return;
      }

      this.methods[methodName] = this[methodName].bind(this);
    }.bind(this));
  }

  defineObservable() {
    Object.defineProperty(this, "$", {
        value: new Proxy({}, {
          tag: this,
          set (obj, prop, value) {
            if (prop[0] == '$') {
              throw new Error("You can't create variables on this.$ starting with `$`, it's a taken prefix");
            }

            if (value !== obj[prop]) {
              this.tag.renderInProgress = true;
              this.tag.queueRender();
            }

            if (this.tag.$input[prop]) {
              this.tag.$input[prop][prop] = value;
            }

            return Reflect.set(...arguments);
          },
          get (target, prop, receiver) {
            let value = target[prop];

            if (typeof value == 'function') {
              return value.bind(this.tag)();
            }
            return Reflect.get(...arguments);
          }
        }),
        writable: false
    });

    Object.defineProperty(this, "$input", {
      value: {},
      writable: false
    });

    Object.defineProperty(this, "$output", {
      value: {},
      writable: false
    });
  }

  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
  }

  render() {
    if (this.renderInProgress || !document.body.contains(this)) {
      return;
    }
    this.queueRender('clear');

    if (document.body.querySelector(this.localName + ' ' + this.localName)) {
      throw new Error('Custom element ' + this.localName + ' is recursively called. Stopping the render....');
    }

    this.beforeRender();
    try {
      if (!this.__jmonkey.compiled) {
        this.compile();
      }

      this.innerHTML = '';
      const tmp = document.createElement('div');
      tmp.innerHTML = this.__jmonkey.html;

      if (this.__jmonkeyId) {
        const components = tmp.querySelectorAll(Object.keys(window.__jmonkey.registered).join(','));
        components.forEach((component, i) => {
          const rendered = window.__jmonkey.rendered[this.__jmonkeyId + 1 + i];
          if (rendered) {
            component.parentElement.insertBefore(rendered, component);
            component.remove();
          }
        });
      }

      this.resolveBinds(tmp);
      this.resolveInputs(tmp);
      this.resolveOutputs(tmp);
      this.resolveAttrs(tmp);
      this.resolveIfs(tmp);
      this.resolveEvents(tmp);
      this.renderFors(tmp);
      this.resolveFunctions(tmp);
      while (tmp.childNodes.length > 0) {
        this.appendChild(tmp.childNodes[0]);
      }

      if (!this.__jmonkeyId) {
        window.__jmonkey.lastId++;
        this.__jmonkeyId = window.__jmonkey.lastId;
        window.__jmonkey.rendered[this.__jmonkeyId] = this;
      }

      this.afterRender({success: true});
      return true;
    } catch (e) {
      console.error('There was an error during rendering', e);
      this.afterRender({success: false, error: e});
      return false;
    }
  }

  resolveBinds(parent) {
    Object.keys(this.__jmonkey.binds).forEach(alias => {
      const bind = this.__jmonkey.binds[alias];
      let skip = false;
      if (!this.$[bind.value]) {
        console.error(
          'Observable in `' + this.constructor.name + '` doesn\'t have `' + bind.value + '` variable, skipping'
        );
        skip = true;
      }
      parent.querySelectorAll('[' + alias + ']').forEach((node) => {
        if (!skip) {
          node.$[bind.name] = this.$[bind.value];
          node.$input[bind.name] = this.$;
        }
        node.removeAttribute(alias);
      });
    });
  }

  resolveOutputs(parent) {
    Object.keys(this.__jmonkey.outputs).forEach(alias => {
      const output = this.__jmonkey.outputs[alias];
      parent.querySelectorAll('[' + alias + ']').forEach((node) => {
        node.$output[output.name] = {};
        node.$output[output.name].emit = function (e = false) {
          const observableKeys = this.getObservablesKeys();
          const valuesBefore = this.getObservablesValues();
          const res = this.getFunction(output.value, ['$event']).bind(this)(e, ...valuesBefore);
          this.updatedChangedValues(res, observableKeys, valuesBefore);
        }.bind(this);
        node.removeAttribute(alias);
      });
    });
  }

  resolveInputs(parent) {
    Object.keys(this.__jmonkey.inputs).forEach(alias => {
      const input = this.__jmonkey.inputs[alias];
      parent.querySelectorAll('[' + alias + ']').forEach((node) => {
        node.$[input.name] = this.getExecuteable(input.value)(...this.getObservablesValues());
        node.removeAttribute(alias);
      });
    });
  }

  resolveAttrs(parent) {
    Object.keys(this.__jmonkey.attrs).forEach(alias => {
      const attr = this.__jmonkey.attrs[alias];
      parent.querySelectorAll('[' + alias + ']').forEach((node) => {
        node.setAttribute(attr.name, this.getExecuteable(attr.value)(...this.getObservablesValues()));
        node.removeAttribute(alias);
      });
    });
  }

  renderFors(parent) {
    Object.keys(this.__jmonkey.fors).forEach(alias => {
      let res = this.getExecuteable(this.__jmonkey.fors[alias])(...this.getObservablesValues());
      let type = typeof res;
      if (type == 'string') {
        res = res * 1;
        type = typeof res;
      }

      let keys, values, skip = false;
      if (type != 'number' && type != 'object') {
        console.error('For in `' + this.constructor.name + '` doesn\'t have iterable value, removing node...');
        skip = true;
      } else {
        if (type == 'number') {
          res = new Array(res).fill(null);
        }

        keys = Object.keys(res);
        values = Object.values(res);
      }


      parent.querySelectorAll('[' + alias + ']').forEach(function (node) {
        if (skip) {
          node.remove();
          return
        }

        node.removeAttribute(alias);
        let current = node;
        for (var i = 0; i < keys.length; i++) {
          this.key = keys[i];
          this.value = values[i];
          const clone = node.cloneNode(true);
          this.resolveFunctions(clone);
          node.parentElement.insertBefore(clone, current.nextSibling);
          current = clone;
        }
        node.remove();
      }.bind(this));
      this.key = null;
      this.value = null;
    });
  }

  resolveIfs(parent) {
    Object.keys(this.__jmonkey.ifs).forEach(alias => {
      const ifRes = this.getExecuteable(this.__jmonkey.ifs[alias])(...this.getObservablesValues());
      parent.querySelectorAll('[' + alias + ']').forEach(node => {
        if (ifRes) {
          node.removeAttribute(alias);
        } else {
          node.remove();
        }
      });
    });
  }

  resolveEvents(parent) {
    Object.keys(this.__jmonkey.events).forEach(alias => {
      const event = this.__jmonkey.events[alias];
      parent.querySelectorAll('[' + alias + ']').forEach(node => {
        node.addEventListener(event.name, (e) => {
          const observableKeys = this.getObservablesKeys();
          const valuesBefore = this.getObservablesValues();
          const res = this.getFunction(event.value, ['e'])(e, ...valuesBefore);
          this.updatedChangedValues(res, observableKeys, valuesBefore);
        });
        node.removeAttribute(alias);
      });
    });
  }

  resolveFunctions(parent) {
    Object.keys(this.__jmonkey.functions).forEach(alias => {
      parent.querySelectorAll('[' + alias + ']').forEach(node => {
        node.outerHTML = this.getExecuteable(this.__jmonkey.functions[alias])(...this.getObservablesValues());
      });
    });
  }

  updatedChangedValues(res, observableKeys, valuesBefore) {
    const skipTypes = {
      'function': true,
      'undefined': true,
    };

    observableKeys.forEach((key, i) => {
      if (key[0] !== '$' && !skipTypes[typeof this.$[key]] && valuesBefore[i] !== res[i]) {
        this.$[key] = res[i];
      }
    });
  }

  compile() {
    let html = this.__jmonkey.html;
    this.__jmonkey.functions = {};

    html = this.compileBinds(html);
    html = this.compileInputs(html);
    html = this.compileOutputs(html);
    html = this.compileAttributes(html);
    html = this.compileExecutables(html);
    html = this.compileEvents(html);
    html = this.compileIfs(html);
    html = this.compileFors(html);

    this.__jmonkey.html = html;
    this.__jmonkey.compiled = true;
  }

  compileFindAndReplace(html, lm, prefix, attrName, hasName = false) {
    let attr, start = 0;
    this.__jmonkey[attrName] = {};
    while (attr = this.getAttribute(html, lm, start)) {
      const { name, value } = attr;
      const plc = prefix + name.start + '-' + value.end;
      if (hasName) {
        this.__jmonkey[attrName][plc] = {
          name: html.substr(name.start + lm.length, name.end - (name.start + lm.length)).trim(),
          value: html.substr(value.start + 1, value.end - 1 - value.start),
        };
      } else {
        this.__jmonkey[attrName][plc] = html.substr(value.start + 1, value.end - 1 - value.start);
      }
      html = html.replaceAll(html.substr(name.start + 1, value.end + 1 - (name.start + 1)), plc);
    }

    return html;
  }

  compileOutputs(html) {
    return this.compileFindAndReplace(html, ' @o:', 'o', 'outputs', true);
  }

  compileInputs(html) {
    return this.compileFindAndReplace(html, ' @i:', 'i', 'inputs', true);
  }

  compileAttributes(html) {
    return this.compileFindAndReplace(html, ' @a:', 'a', 'attrs', true);
  }

  compileBinds(html) {
    return this.compileFindAndReplace(html, ' @b:', 'b', 'binds', true);
  }

  compileFors(html) {
    return this.compileFindAndReplace(html, ' @for', 'for', 'fors');
  }

  compileIfs(html) {
    return this.compileFindAndReplace(html, ' @if', 'if', 'ifs');
  }

  compileEvents(html) {
    return this.compileFindAndReplace(html, ' @e:', 'e', 'events', true);
  }

  getAttribute(text, lm, start = 0) {
    let aStart = text.indexOf(lm, start);
    if (aStart === -1) {
      return false;
    }

    let aEnd = text.indexOf('=', aStart);
    if (aEnd === -1) {
      return false;
    }

    const strings = {
      '"' : true,
      "'" : true,
      "`" : true,
    };

    const wrapper = strings[text[aEnd + 1]];
    if (!wrapper) {
      console.error(
        'String wrapper for `' + lm + '` in `' + this.constructor.name
        + '` not found (found letter: `' + text[aEnd + 1] + '`), skipping'
      );
      return this.getAttribute(text, lm, aEnd)
    }

    return {
      name : {
        start: aStart,
        end: aEnd,
      },
      value: {
        start: aEnd + 1,
        end: this.getStringEnd(text, text[aEnd + 1], aEnd + 2)
      }
    }
  }

  getStringEnd(text, sLandmark, start = 0) {
    let pos = text.indexOf(sLandmark, start);
    if (text[pos - 1] == '\\') {
      return this.getStringEnd(test, sLandmark, pos + 1);
    }

    return pos;
  }

  compileExecutables(html) {
    let start = html.indexOf('{{');
    while (start !== -1) {
      let end = html.indexOf('}}', start);
      if (end === -1) {
        break;
      }
      const name = 'func_' + start + '_' + end;
      this.__jmonkey.functions[name] = html.substr(start + 2, end - (start + 2));
      html = html.replaceAll(html.substr(start, end + 2 - start), '<span ' + name + '></span>');
      start = html.indexOf('{{', start + name.length);
    }

    return html;
  }

  getExecuteable(script) {
    return new Function(...this.getObservablesKeys(), 'return ' + script);
  }

  getFunction(script, vars = []) {
    const observableKeys = this.getObservablesKeys();
    return new Function(...vars, ...observableKeys, script + '; return [' + observableKeys.join(',') + '];');
  }

  getObservablesKeys() {
    return [
      ...Object.keys(this.methods),
      ...Object.keys(this.$),
      this.injectName,
      '$key',
      '$value',
    ];
  }

  getObservablesValues() {
    return [
      ...Object.values(this.methods),
      ...Object.values(this.$),
      this[this.injectName],
      this.key,
      this.value,
    ];
  }

  debounce (func, timeout = 10) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      if ( args[0] === "clear" ) {
        return; // if passed `clear` then stop debouncing
      }

      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }
}
