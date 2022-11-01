class DitoElement extends HTMLElement {
  injectName = '$inject';
  keyName = "$key";
  valueName = "$value";
  eventName = "$event";
  indexAttrName = 'jmi';
  key = null;
  value = null;

  constructor() {
    super();
    if (this.constructor === DitoElement) {
      throw new Error("DitoElement is an abstract and cannot be instantiated as separate class");
    }
    this.prepare();
    this.defineObservable();
    this.saveMethods();
    this.$self.cssRenderInProgress = false;
    this.$self.renderInProgress = false;
    this.$self.debounceRender = this.debounce(e => {
      this.$self.renderInProgress = false;
      this.render();
    });
    this.$self.debounceCssRender = this.debounce(e => {
      this.$self.cssRenderInProgress = false;
      this.cssRender();
    });
  }

  /* EVENTS */
  prepare(){}            // Before constructor starts but after HTMLElement constructor
  init(){}          // After constructor finishes
  beforeRender(){}       // Before render
  afterRender(result){}  // After render

  connectedCallback() {
    if (!document.body.contains(this)) {
      return;
    }

    if (!this.$self.rendered) {
      this.$self.rendered = true;
      this.init();
    }

    this.queueRender();
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

  queueRender() {
    this.$self.renderInProgress = true;
    this.$self.debounceRender();
  }

  clearRenderQueue() {
    this.$self.renderInProgress = false;
    this.$self.debounceRender('clear');
  }

  queueCssRender() {
    this.$self.cssRenderInProgress = true;
    this.$self.debounceCssRender();
  }

  clearCssRenderQueue() {
    this.$self.cssRenderInProgress = false;
    this.$self.debounceCssRender('clear');
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
              this.tag.queueRender();
            }

            if (this.tag.$binded[prop] && this.tag.$binded[prop][prop] !== value) {
              const binder = this.tag.$binded[prop].$binder.get(this.tag);
              if (binder) {
                binder.forEach(item => {
                  this.tag.$binded[item.receiver].$[item.provider] = value;
                });
              }
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

    Object.defineProperty(this, "$css", {
      value: new Proxy({}, {
        tag: this,
        set (obj, prop, value) {
          if (value !== obj[prop]) {
            this.tag.queueCssRender(prop);
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

    if (!this.$output) {
      this.defineOutput(this);
    }

    if (!this.$self) {
      this.defineSelf(this);
    }
  }

  defineSelf(obj) {
    Object.defineProperty(obj, "$self", {
      value: {
        toBind: [],
        parent: null,
        children: null,
        nativeChildren: null,
        path: null,
        cssIndices: [],
        cssPath: null,
        rendered: false,
        default: {}
      },
      writable: false
    });
  }

  defineOutput(obj) {
    Object.defineProperty(obj, "$output", {
      value: {},
      writable: false
    });
  }

  compileCSS() {
    this.__jmonkey.css = this.compileCSSExecutables(this.__jmonkey.css);
    this.__jmonkey.compiledCSS = true;
  }

  compileCSSExecutables(css) {
    this.__jmonkey.cssExecutables = {};
    let start = css.indexOf('{{');
    while (start !== -1) {
      let end = css.indexOf('}}', start);
      if (end === -1) {
        break;
      }
      const name = 'cssExec_' + start + '_' + end;
      this.__jmonkey.cssExecutables[name] = css.substr(start + 2, end - (start + 2));
      css = css.replaceAll(css.substr(start, end + 2 - start), name);
      start = css.indexOf('{{', start + name.length);
    }
    return css;
  }

  async cssRender() {
    if (this.$self.cssRenderInProgress || !document.body.contains(this)) {
      return;
    }

    if (!this.__jmonkey.compiledCSS) {
      this.compileCSS();
    }

    let css = this.__jmonkey.css;
    css = this.resolveCssExecutables(css)
    const stylesheet = new CSSStyleSheet();
    await stylesheet.replace(css).catch(err => {
      throw new Error('Failed to replace styles in `' + this.localName + '`: ' + err);
    });

    const styles = [];
    const sheet = window.__jmonkey.main.styleNode.sheet;
    Object.values(stylesheet.cssRules).forEach((rule, i) => {
      let index = sheet.cssRules.length;
      if (this.$self.cssIndices[i]) {
        index = this.$self.cssIndices[i];
      } else {
        this.$self.cssIndices[i] = index;
      }
      const nestedRule = this.$self.cssPath + ' ' + rule.cssText;
      if (sheet.cssRules[index]) {
        sheet.deleteRule(index);
      }
      sheet.insertRule(nestedRule, index);
    });
  }

  pathToCss(path) {
    let cssRule = '';

    path.split('.').forEach(link => {
      const [name, index] = link.split('@');
      cssRule += name + '[' + this.indexAttrName + '="' + index + '"' + ']' + ' ';
    });
    return cssRule.trim();
  }

  resolveCssExecutables(css) {
    const exe = this.__jmonkey.cssExecutables;
    Object.keys(exe).forEach(alias => {
      css = css.replaceAll(alias, this.getCSSExecuteable(exe[alias])(...this.getCSSObservablesValues()));
    });
    return css;
  }

  render() {
    if (this.$self.renderInProgress || !document.body.contains(this)) {
      return;
    }

    this.clearRenderQueue();
    if (document.body.querySelector(this.localName + ' ' + this.localName)) {
      throw new Error('Custom element ' + this.localName + ' is recursively called. Stopping the render....');
    }

    this.beforeRender();
    try {
      if (!this.__jmonkey.compiledHTML) {
        this.compile();
      }

      this.innerHTML = '';
      const tmp = document.createElement('div');
      tmp.innerHTML = this.__jmonkey.html;
      let firstRender = false;
      if (!this.$self.children) {
        firstRender = true;
        this.cssRender();
        this.retrieveBindedValues();
        this.searchForNotDownloaded(tmp);
        this.assignChildren(tmp);
      } else {
        const binded = tmp.querySelectorAll(Object.keys(window.__jmonkey.registered).join(','));
        binded.forEach(function (component, i) {
          if (!component.$) {
            return;
          }
          const rendered = this.$self.children[this.$self.path + '.' + component.localName + '@' + i];
          if (!rendered) {
            return;
          }
          // Updating binded values manually to avoid infinite loop
          const binded = this.$binder.get(rendered);
          if (binded) {
            binded.forEach(name => {
              rendered.$[name.receiver] = this.$[name.provider];
            });
          }
          rendered.innerHTML = rendered.$self.default[this.injectName];
          component.parentElement.insertBefore(rendered, component);
          component.remove();
        }.bind(this));

        const cached = {};
        Object.keys(this.$self.nativeChildren).forEach(alias => {
          tmp.querySelectorAll('[' + alias + ']').forEach((node, i) => {
            const item = this.$self.nativeChildren[alias][i];
            if (!item) {
              console.error("Couldn't find native child for `" + alias + "` at index: `" + i + "`");
            } else {
              item.node[item.name] = this.$[item.value];
              node.parentElement.insertBefore(item.node, node);
              node.remove();
            }
          });
        });
      }

      this.renderFors(tmp); // For must be resolved first
      if (firstRender) {
        this.resolveInputs(tmp);
        this.resolveOutputs(tmp);
        this.resolveBinds(tmp);
      }
      this.resolveIfs(tmp);
      this.resolveEvents(tmp);
      this.resolveAttrs(tmp);
      this.resolveExecutables(tmp);

      if (this.$self.children) {
        Object.values(this.$self.children).forEach(child => {
          child.$self[this.injectName] = child.innerHTML;
        });
      }

      while (tmp.childNodes.length > 0) {
        this.appendChild(tmp.childNodes[0]);
      }

      this.afterRender({success: true});
      return true;
    } catch (e) {
      console.error('There was an error during rendering', e);
      this.afterRender({success: false, error: e});
      return false;
    }
  }

  retrieveBindedValues() {
    if (this.$self.parent) {
      this.checkBinds.bind(this.$self.parent)()
    }
  }

  checkBinds() {
    for (var i = 0; i < this.$self.toBind.length; i++) {
      const item = this.$self.toBind[i];
      if (item.node.$) {
        this.setBind(item.bind, item.node);
        this.$self.toBind.splice(i, 1);
        i--;
      }
    }
  }

  assignChildren(tmp) {
    this.$self.children = {};
    this.$self.nativeChildren = {};
    if (!this.$self.path) {
      const index = Array.prototype.indexOf.call(this.parentElement.children, this);
      this.setAttribute(this.indexAttrName, index);
      this.$self.path = this.localName + '@' + index;
      this.$self.cssPath = this.pathToCss(this.$self.path);
    }
    tmp.querySelectorAll(Object.keys(window.__jmonkey.registered).join(',')).forEach((node, i) => {
      if (!node.$self) {
        this.defineSelf(node);
      }
      node.$self.parent = this;
      node.setAttribute(this.indexAttrName, i);
      node.$self.path = this.$self.path + '.' + node.localName + '@' + i;
      node.$self.cssPath = this.pathToCss(node.$self.path);
      node.$self.default[this.injectName] = node.innerHTML;
      this.$self.children[node.$self.path] = node;
    });
  }

  searchForNotDownloaded(parent) {
    const notDownloaded = window.__jmonkey.main.notDownloaded;
    const keys = Object.keys(notDownloaded);
    if (keys.length == 0) {
      return;
    }

    let promises = [];
    parent.querySelectorAll(keys.join(',')).forEach((node, i) => {
      if (!window.__jmonkey.registered[node.localName]) {
        console.log(notDownloaded, node.localName, notDownloaded[node.localName]);
        const component = notDownloaded[node.localName];
        promises.push(
          ...window.__jmonkey.main.createRegisterPromise(component.path, component.name, component.version)
        );
        delete notDownloaded[node.localName];
      }
    });

    if (promises.length > 0) {
      (async function() {
        await window.__jmonkey.main.load(promises);
      }).bind(this)()
    }
  }

  resolveBinds(parent) {
    this.resolve(
      parent,
      'binds',
      (alias, obj, item, node, skip) => {
        if (skip) {
          return;
        }
        if (!node.$) {
          if (window.__jmonkey.registered[node.localName]) {
            this.$self.toBind.push({bind: item, node});
          } else if (typeof node[item.name] != undefined) {
            node[item.name] = this.$[item.value];
            node.addEventListener("change", function (e) {
              this.$[item.value] = node[item.name];
            }.bind(this))
            const native = this.$self.nativeChildren;
            if (!native[alias]) {
              native[alias] = {};
            }
            native[alias][Object.keys(native[alias]).length] = {
              node,
              name: item.name,
              value: item.value
            };
          }
        } else {
          this.setBind(item, node);
        }
      },
      (alias, obj, item) => {
        if (typeof this.$[item.value] == 'undefined') {
          console.error(
            'Observable in `' + this.constructor.name + '` doesn\'t have `'
            + item.value + '` variable, skipping binding...'
          );
          return [true];
        }
        return [false];
      }
    );
  }

  setBind(bind, node) {
    node.$[bind.name] = this.$[bind.value];
    node.$binded[bind.name] = this;
    const item = {receiver: bind.name, provider: bind.value};
    const binded = this.$binder.get(node);
    if (binded) {
      this.$binder.set(node, [...binded, item]);
    } else {
      this.$binder.set(node, [item]);
    }
  }

  resolveOutputs(parent) {
    this.resolve(parent, 'outputs', (alias, obj, item, node) => {
      if (!node.$output) {
        this.defineOutput(node);
      }

      node.$output[item.name] = {};
      node.$output[item.name].emit = function (e) {
        const observableKeys = this.getObservablesKeys();
        const valuesBefore = this.getObservablesValues();
        try {
          const res = this.getFunction(item.value).bind(this)(e, ...valuesBefore);
          this.updatedChangedValues(res, observableKeys, valuesBefore);
        } catch (e) {
          console.error("Error on output", e);
        }
      }.bind(this);
    });
  }

  resolveInputs(parent) {
    this.resolve(parent, 'inputs', (alias, obj, item, node) => {
      if (!node.$) {
        console.error("Selected node was not made with JMokey library and can't have assigned input");
      } else {
        node.$[item.name] = this.getExecuteable(item.value)(...this.getObservablesValues());
      }
    });
  }

  resolveAttrs(parent) {
    this.resolve(parent, 'attrs', (alias, obj, item, node) => {
      node.setAttribute(item.name, this.getExecuteable(item.value)(...this.getObservablesValues()));
    });
  }

  renderFors(parent) {
    this.resolve(
      parent,
      'fors',
      (alias, obj, item, node, skip, keys, values) => {
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
          this.resolveIfs(clone);
          this.resolveEvents(clone);
          this.resolveAttrs(clone);
          this.resolveExecutables(clone);
          node.parentElement.insertBefore(clone, current.nextSibling);
          current = clone;
        }
        node.remove();
      },
      (alias, obj) => {
        let res = this.getExecuteable(obj[alias])(...this.getObservablesValues());
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

        return [skip, keys, values];
      },
    );
    this.key = null;
    this.value = null;
  }

  resolveIfs(parent) {
    this.resolve(
      parent,
      'ifs',
      (alias, obj, item, node, ifRes) => {
        if (!ifRes) {
          node.remove();
        }
      },
      (alias, obj) => [this.getExecuteable(obj[alias])(...this.getObservablesValues())],
    );
  }

  resolveEvents(parent) {
    this.resolve(parent, 'events', (alias, obj, item, node, key, value) => {
      node.addEventListener(item.name, (e) => {
        const observableKeys = this.getObservablesKeys();
        const valuesBefore = this.getObservablesValues(key, value);
        const res = this.getFunction(item.value, [this.eventName])(e, ...valuesBefore);
        this.updatedChangedValues(res, observableKeys, valuesBefore);
      });
    },
    () => [this.key, this.value]);
  }

  resolveExecutables(parent) {
    this.resolve(parent, 'executables', (alias, obj, item, node) => {
      node.outerHTML = this.getExecuteable(obj[alias])(...this.getObservablesValues());
    });
  }

  resolve(parent, attr, mainCallback, beforeCallback = null, afterCallback = null) {
    const obj = this.__jmonkey[attr];
    for (var alias in obj) {
      if (!obj.hasOwnProperty(alias)) {
        continue;
      }

      const item = obj[alias];
      const args = beforeCallback ? beforeCallback.bind(this)(alias, obj, item) : [];
      parent.querySelectorAll('[' + alias + ']').forEach(node => {
        mainCallback.bind(this)(alias, obj, item, node, ...args);
        node.removeAttribute(alias);
      });
      afterCallback ? afterCallback.bind(this)(alias, obj, item) : [];
    }
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

    html = this.compileBinds(html);
    html = this.compileInputs(html);
    html = this.compileOutputs(html);
    html = this.compileAttributes(html);
    html = this.compileExecutables(html);
    html = this.compileEvents(html);
    html = this.compileIfs(html);
    this.__jmonkey.html = this.compileFors(html);

    this.__jmonkey.compiledHTML = true;
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
    this.__jmonkey.executables = {};
    let start = html.indexOf('{{');
    while (start !== -1) {
      let end = html.indexOf('}}', start);
      if (end === -1) {
        break;
      }
      const name = 'exec_' + start + '_' + end;
      this.__jmonkey.executables[name] = html.substr(start + 2, end - (start + 2));
      html = html.replaceAll(html.substr(start, end + 2 - start), '<span ' + name + '></span>');
      start = html.indexOf('{{', start + name.length);
    }

    return html;
  }

  getExecuteable(script) {
    return new Function(...this.getObservablesKeys(), 'return ' + script).bind({});
  }

  getCSSExecuteable(script) {
    return new Function(...this.getCSSObservablesKeys(), 'return ' + script).bind({});
  }

  getFunction(script, vars = []) {
    const observableKeys = this.getObservablesKeys();
    return new Function(...vars, ...observableKeys, script + '; return [' + observableKeys.join(',') + '];').bind({});
  }

  getObservablesKeys() {
    return [
      ...Object.keys(this.methods),
      ...Object.keys(this.$),
      this.injectName,
      this.keyName,
      this.valueName,
    ];
  }

  getCSSObservablesKeys() {
    return [
      ...Object.keys(this.methods),
      ...Object.keys(this.$css)
    ];
  }

  getObservablesValues(key = null, value = null) {
    if (key === null) {
      key = this.key;
    }

    if (value === null) {
      value = this.value;
    }
    return [
      ...Object.values(this.methods),
      ...Object.values(this.$),
      this.$self[this.injectName],
      key,
      value,
    ];
  }

  getCSSObservablesValues() {
    return [
      ...Object.values(this.methods),
      ...Object.values(this.$css)
    ];
  }

  debounce (func, timeout = 10) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      // if passed `clear` then stop debouncing
      if (args[0] === "clear") {
        return;
      }

      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }
}

export { DitoElement };
