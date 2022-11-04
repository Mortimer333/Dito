class DitoElement extends HTMLElement {
  keyName = "$key";
  valueName = "$value";
  eventName = "$event";
  indexAttrName = 'dito-i';
  indexForAttrName = 'dito-for-i';
  packAttrName = 'dito-pack';
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
  init(){}               // After constructor finishes
  beforeRender(){}       // Before render
  afterRender(result){}  // After render

  connectedCallback() {
    if (!document.body.contains(this)) {
      return;
    }

    if (!this.$self.rendered) {
      delete window.__dito.main.downloadCheck[this.localName];
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
        toInput: [],
        parent: null,
        children: null,
        nativeChildren: null,
        path: null,
        cssIndices: [],
        cssPath: null,
        rendered: false,
        injected: [],
        injectedPacks: {},
        default: {
          injected: null,
        },
        for: {
          key: null,
          value: null
        }
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
    this.__dito.css = this.compileCSSExecutables(this.__dito.css);
    this.__dito.compiledCSS = true;
  }

  compileCSSExecutables(css) {
    this.__dito.cssExecutables = {};
    let start = css.indexOf('{{');
    while (start !== -1) {
      let end = css.indexOf('}}', start);
      if (end === -1) {
        break;
      }
      const name = 'cssExec_' + start + '_' + end;
      this.__dito.cssExecutables[name] = css.substr(start + 2, end - (start + 2));
      css = css.replaceAll(css.substr(start, end + 2 - start), name);
      start = css.indexOf('{{', start + name.length);
    }
    return css;
  }

  async cssRender() {
    if (this.$self.cssRenderInProgress || !document.body.contains(this)) {
      return;
    }

    if (!this.__dito.compiledCSS) {
      this.compileCSS();
    }

    let css = this.__dito.css;
    css = this.resolveCssExecutables(css)
    const stylesheet = new CSSStyleSheet();
    await stylesheet.replace(css).catch(err => {
      throw new Error('Failed to replace styles in `' + this.localName + '`: ' + err);
    });

    const styles = [];
    const sheet = window.__dito.main.styleNode.sheet;
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
      const [name, index, forIndex] = link.split('@');
      cssRule += name + '[' + this.indexAttrName + '="' + index + '"' + ']';
      if (forIndex) {
        cssRule += '[' + this.indexForAttrName + '="' + forIndex + '"' + ']';
      }
      cssRule += ' ';
    });
    return cssRule.trim();
  }

  resolveCssExecutables(css) {
    const exe = this.__dito.cssExecutables;
    Object.keys(exe).forEach(alias => {
      css = css.replaceAll(alias, this.getCSSExecuteable(exe[alias])(...this.getCSSObservablesValues()));
    });
    return css;
  }

  createQueryUp(element, parent) {
    if (element == parent) {
      return '';
    }
    const index = Array.prototype.indexOf.call(element.parentElement.children, element) + 1;
    return this.createQueryUp(element.parentElement, parent) + ' ' + element.localName + ':nth-child(' + index + ')';
  }

  render(force = false) {
    if (!force && (this.$self.renderInProgress || !document.body.contains(this))) {
      return;
    }

    this.clearRenderQueue();
    if (document.body.querySelector(this.localName + ' ' + this.localName)) {
      throw new Error('Custom element ' + this.localName + ' is recursively called. Stopping the render....');
    }

    this.beforeRender();
    try {
      let activeQuery = false;
      if (this.contains(document.activeElement)) {
        activeQuery = this.createQueryUp(document.activeElement, this);
      }
      if (!this.__dito.compiledHTML) {
        this.compile();
      }

      const tmp = document.createElement('div');
      tmp.innerHTML = this.__dito.html;
      this.renderFors(tmp); // For must be resolved first
      let firstRender = false;
      if (!this.$self.children) {
        firstRender = true;
        this.cssRender();
        this.retrieveAssigned();
        this.searchForNotDownloaded(tmp);
        this.assignChildren(tmp);
      } else {
        this.injectCustomElements(tmp);
        this.resolveNativeBinds(tmp);
        this.removeNotAssignedChildren(tmp);
      }

      Object.values(this.$self.children).forEach(child => {
        this.assignPacks(child);
      });

      this.resolveUnique(tmp);
      if (firstRender) {
      }
      this.resolveRepeatable(tmp);

      Object.values(this.$self.children || {}).forEach(child => {
        child.$self.injected = Object.values(child.childNodes);
        if (child.render) {
          child.render(true);
        }
      });

      this.innerHTML = '';
      while (tmp.childNodes.length > 0) {
        this.appendChild(tmp.childNodes[0]);
      }

      Object.values(this.$self.children || {}).forEach(child => {
        if (child.clearRenderQueue) {
          child.clearRenderQueue();
        }
      });

      if (activeQuery) {
        this.querySelector(activeQuery)?.focus();
      }
      this.afterRender({success: true});
      window.__dito.main.allDownloaded();
      return true;
    } catch (e) {
      console.error('There was an error during rendering', e);
      this.afterRender({success: false, error: e});
      return false;
    }
  }

  retrieveAssigned() {
    this.retrieveBindedValues();
    this.retrieveInputs();
  }

  resolveUnique(parent) {
    this.resolveInputs(parent);
    this.resolveOutputs(parent);
    this.resolveBinds(parent);
  }

  removeNotAssignedChildren(parent) {
    const keys = Object.keys(this.$self.children);
    for (var i = 0; i < keys.length; i++) {
      const path = keys[i];
      if (!parent.contains(this.$self.children[path])) {
        delete this.$self.children[path];
      }
    }
  }

  resolveNativeBinds(parent) {
    const nodesIter = [];
    const native = this.$self.nativeChildren;
    const keys = Object.keys(native);
    if (keys == 0) {
      return;
    }
    const toRemove = new WeakMap();
    const nodes = parent.querySelectorAll('[' + keys.join('], [') + ']');

    for (let i = nodes.length - 1; i >= 0 ; i--) {
      const node = nodes[i];
      const similar = [];
      node.getAttributeNames().forEach(name => {
        if (native[name]) {
          similar.push(name);
        }
      });

      let replace = null;
      similar.forEach(alias => {

        const item = native[alias];
        item.node.setAttribute(item.name, this.$[item.value]);
        replace = item.node;
      });

      if (replace) {
        node.parentElement.insertBefore(replace, node);
        node.remove();
      }
    }
  }

  iterateOverRegistrated(node, callableAction, reverse = false) {
    let components = node.querySelectorAll(Object.keys(window.__dito.registered).join(','));
    if (reverse) {
      components = Object.values(components).reverse();
    }

    components.forEach(function (component, i) {
      if (!component.$) {
        return;
      }

      const rendered = this.$self.children[this.getPath(component, false)];
      if (!rendered) {
        return;
      }

      callableAction(component, i, rendered);
    }.bind(this));
  }

  replaceInnerHtml(node) {
    this.iterateOverRegistrated(node, (component, i, rendered) => {
      component.innerHTML = rendered.$self.default.injected;
      this.replaceInnerHtml(component);
    });
  }

  injectCustomElements(node) {
    this.replaceInnerHtml(node);
    this.iterateOverRegistrated(node, (component, i, rendered) => {
      // Updating binded values manually to avoid infinite loop
      const binded = this.$binder.get(rendered);
      if (binded) {
        binded.forEach(name => {
          rendered.$[name.receiver] = this.$[name.provider];
        });
      }
      if (component == rendered) {
        return;
      }
      rendered.innerHTML = '';
      while (component.childNodes.length > 0) {
        rendered.appendChild(component.childNodes[0]);
      }

      component.parentElement.replaceChild(rendered, component);
    }, true);
  }

  resolveRepeatable(node) {
    this.resolveIfs(node);
    this.resolveEvents(node);
    this.resolveAttrs(node);
    this.resolveExecutables(node);
    this.resolveInjected(node);
  }

  resolveInjected(parent) {
    parent.querySelectorAll('dito-inject').forEach(node => {
      if (node.innerHTML.trim().length != 0) {
        console.error('Inject tag is not empty, everything inside of him will be removed:', node.innerHTML.trim());
      }
      const packName = node.getAttribute(this.packAttrName);
      if (packName) {
        const pack = this.$self.injectedPacks[packName];
        if (pack) {
          let current = node;
          pack.forEach(packNode => {
            current.parentElement.insertBefore(packNode, current);
            current = packNode;
          });
        }
      } else {
        this.$self.injected.forEach(child => {
          node.parentElement.insertBefore(child, node);
        });
      }
      node.remove();
    });
  }

  assignPacks(parent) {
    parent.$self.injectedPacks = {};
    parent.querySelectorAll('[' + this.packAttrName + ']').forEach(node => {
      const name = node.attributes[this.packAttrName]?.value;
      if (parent.$self.injectedPacks[name]) {
        parent.$self.injectedPacks[name].push(node);
      } else {
        parent.$self.injectedPacks[name] = [node];
      }
    });
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

  setBind(bind, node) {
    node.$[bind.name] = this.$[bind.value];
    node.clearRenderQueue();
    node.$binded[bind.name] = this;
    const item = {receiver: bind.name, provider: bind.value};
    const binded = this.$binder.get(node);
    if (binded) {
      this.$binder.set(node, [...binded, item]);
    } else {
      this.$binder.set(node, [item]);
    }
  }

  retrieveInputs(){
    if (this.$self.parent) {
      this.checkInputs.bind(this.$self.parent)()
    }
  }

  checkInputs() {
    for (var i = 0; i < this.$self.toInput.length; i++) {
      const item = this.$self.toInput[i];
      if (item.node.$) {
        this.setInput(item.input, item.node);
        this.$self.toInput.splice(i, 1);
        i--;
      }
    }
  }

  setInput(input, node) {
    this.value = node.$self.for.value;
    this.key = node.$self.for.key;
    node.$[input.name] = this.getExecuteable(input.value)(...this.getObservablesValues());
    this.value = null;
    this.key = null;
  }

  getPath(node, setAttr = true) {
    let forIndex = '';
    if (node.attributes[this.indexForAttrName]) {
      forIndex = '@' + node.attributes[this.indexForAttrName].value;
    }
    const index = Array.prototype.indexOf.call(node.parentElement.children, node);
    if (setAttr) {
      node.setAttribute(this.indexAttrName, index);
    }
    if (node === this) {
      return node.localName + '@' + index + forIndex;
    }
    return this.$self.path + '.' + node.localName + '@' + index + forIndex;
  }

  assignChildren(tmp) {
    this.$self.children = {};
    this.$self.nativeChildren = {};
    if (!this.$self.path) {
      this.$self.path = this.getPath(this);
      this.$self.cssPath = this.pathToCss(this.$self.path);
    }
    tmp.querySelectorAll(Object.keys(window.__dito.registered).join(',')).forEach((node, i) => {
      this.defineChild(node);
    });
  }

  defineChild(node) {
    if (!node.$self) {
      this.defineSelf(node);
    }
    node.$self.parent = this;
    node.$self.path = this.getPath(node);
    node.$self.cssPath = this.pathToCss(node.$self.path);
    node.$self.default.injected = node.innerHTML;
    this.$self.children[node.$self.path] = node;
  }

  searchForNotDownloaded(parent) {
    const notDownloaded = window.__dito.main.notDownloaded;
    const keys = Object.keys(notDownloaded);
    if (keys.length == 0) {
      return;
    }

    let promises = [];
    parent.querySelectorAll(keys.join(',')).forEach((node, i) => {
      if (notDownloaded[node.localName]) {
        const component = notDownloaded[node.localName];
        delete notDownloaded[node.localName];
        promises.push(
          ...window.__dito.main.createRegisterPromise(component.path, component.name, component.version)
        );
      }
    });

    if (promises.length > 0) {
      (async function() {
        await window.__dito.main.load(promises);
      }).bind(this)()
    }
  }

  setNativeDitoAttribute(node) {
    Object.defineProperty(node, "__dito", {
      value: {
        binds: {}
      },
      writable: false
    });
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
          if (window.__dito.registered[node.localName]) {
            this.$self.toBind.push({bind: item, node});
          } else if (typeof node[item.name] != undefined) {
            node.setAttribute(item.name, this.$[item.value]);
            if (!node.__dito) {
              this.setNativeDitoAttribute(node);
            }

            node.__dito.binds[item.name] = {
              provider: {
                target: this,
                name: item.value
              },
              receiver: {
                target: node,
                name: item.name
              }
            };
            // Mutation for attributes like class (outside) and change for like value (inside)
            this.setMutationObserver(node);
            node.addEventListener("change", function (e) {
              if (this.$[item.value] === node[item.name]) {
                return;
              }

              if (typeof node[item.name] != 'undefined') {
                this.$[item.value] = node[item.name];
              } else if (typeof node.getAttribute(item.name) != 'undefined') {
                // this.$[item.value] = node[item.name];
              }
            }.bind(this))
            const native = this.$self.nativeChildren;
            native[alias] = {
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
          this.value = this.$self.for.value;
          this.key = this.$self.for.key;
          const res = this.getFunction(item.value, [this.eventName]).bind(this)(e, ...valuesBefore);
          this.updatedChangedValues(res, observableKeys, valuesBefore);
          this.value = null;
          this.key = null;
        } catch (e) {
          console.error("Error on output", e);
        }
      }.bind(node);
    });
  }

  resolveInputs(parent) {
    this.resolve(parent, 'inputs', (alias, obj, item, node) => {
      if (!node.$) {
        if (window.__dito.registered[node.localName]) {
          this.$self.toInput.push({input: item, node});
        } else {
          console.error("Selected node was not made with JMokey library and can't have assigned input");
        }
      } else {
        this.setInput(item, node);
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
        const tmpParent = document.createElement('div');
        for (var i = 0; i < keys.length; i++) {
          this.key = keys[i];
          this.value = values[i];
          const clone = node.cloneNode(true);
          tmpParent.appendChild(clone);
          this.resolveRepeatable(tmpParent);

          current.parentElement.insertBefore(clone, current.nextSibling);
          if (i == 0) {
            node.remove();
          }
          current = clone;
          if (window.__dito.registered[current.localName]) {
            this.setNewCustomElement(current, i);
          }
          current.querySelectorAll(Object.keys(window.__dito.registered).join(',')).forEach(nodeIter => {
            this.setNewCustomElement(nodeIter, i);
          });
        }
      },
      (alias, obj) => {
        let res = this.getExecuteable(obj[alias])(...this.getObservablesValues());
        let type = typeof res;
        if (type == 'string') {
          res = res * 1;
          type = typeof res;
        }

        let keys, values, skip = false;
        if (isNaN(res) || (type != 'number' && type != 'object')) {
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
      null,
    );
    this.key = null;
    this.value = null;
  }

  setNewCustomElement(node, i) {
    node.setAttribute(this.indexForAttrName, i);
    const path = this.getPath(node);
    if (!node.$self) {
      this.defineSelf(node);
    }
    node.$self.for.key = this.key;
    node.$self.for.value = this.value;
    node.$self.parent = this;
    if (typeof node.$self?.default?.injected != 'undefined') {
      node.$self.default.injected = node.innerHTML;
    }

    if (this.$self?.children && !this.$self.children[path]) {
      this.$self.children[path] = node;
      node.init();
    }
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

  resolve(parent, attr, mainCallback, beforeCallback = null, afterCallback = null, reverse = false) {
    const obj = this.__dito[attr];
    let keys = Object.keys(obj);
    if (reverse) {
      keys = keys.reverse();
    }
    keys.forEach(alias => {
      const item = obj[alias];
      const args = beforeCallback ? beforeCallback.bind(this)(alias, obj, item) : [];
      parent.querySelectorAll('[' + alias + ']').forEach(node => {
        mainCallback.bind(this)(alias, obj, item, node, ...args);
        node.removeAttribute(alias);
      });
      afterCallback ? afterCallback.bind(this)(alias, obj, item) : [];
    });
  }

  updatedChangedValues(res, observableKeys, valuesBefore) {
    const skipTypes = {
      'function': true,
      'undefined': true,
      'NaN': true,
    };

    observableKeys.forEach((key, i) => {
      if (
        key[0] !== '$'
        && !skipTypes[typeof this.$[key]]
        && !skipTypes[typeof res[i]]
        && valuesBefore[i] !== res[i]
      ) {
        this.$[key] = res[i];
      }
    });
  }

  compile() {
    let html = this.__dito.html;

    html = this.compileBinds(html);
    html = this.compileInputs(html);
    html = this.compileOutputs(html);
    html = this.compileAttributes(html);
    html = this.compileExecutables(html);
    html = this.compileEvents(html);
    html = this.compileIfs(html);
    this.__dito.html = this.compileFors(html);

    this.__dito.compiledHTML = true;
  }

  compileFindAndReplace(html, lm, prefix, attrName, hasName = false) {
    let attr, start = 0;
    this.__dito[attrName] = {};
    while (attr = this.getAttribute(html, lm, start)) {
      const { name, value } = attr;
      const plc = prefix + name.start + '-' + value.end;
      if (hasName) {
        this.__dito[attrName][plc] = {
          name: html.substr(name.start + lm.length, name.end - (name.start + lm.length)).trim(),
          value: html.substr(value.start + 1, value.end - 1 - value.start),
        };
      } else {
        this.__dito[attrName][plc] = html.substr(value.start + 1, value.end - 1 - value.start);
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
    this.__dito.executables = {};
    let start = html.indexOf('{{');
    while (start !== -1) {
      let end = html.indexOf('}}', start);
      if (end === -1) {
        break;
      }
      const name = 'exec_' + start + '_' + end;
      this.__dito.executables[name] = html.substr(start + 2, end - (start + 2));
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

  setMutationObserver(node) {
    window.__dito.mutationObserve(node);
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
