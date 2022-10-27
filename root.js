class JMonkeyElement extends HTMLElement {
  renderInProgress = false;
  injectName = '$inject';
  key = null;
  value = null;
  queueRender;

  constructor() {
    super();
    if (this.constructor === JMonkeyElement) {
      throw new Error("JMonkeyElement is an abstract and cannot be instantiated as separate class");
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

            if (this.tag.$binded[prop] && this.tag.$binded[prop][prop] !== value) {
              this.tag.$binded[prop][prop] = value;
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

    Object.defineProperty(this, "$binded", {
      value: {},
      writable: false
    });

    Object.defineProperty(this, "$binder", {
      value: new WeakMap(),
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
            const binded = this.$binder.get(rendered);
            if (binded) {
              binded.forEach(name => {
                rendered.$[name] = this.$[name];
              });
            }
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
          node.$binded[bind.name] = this.$;
          const binded = this.$binder.get(node);
          if (binded) {
            this.$binder.set(node, [...binded, bind.name]);
          } else {
            this.$binder.set(node, [bind.name]);
          }
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

export { JMonkeyElement };
