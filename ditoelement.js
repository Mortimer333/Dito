class DitoElement extends HTMLElement {
  keyName = "$key";
  valueName = "$value";
  eventName = "$event";
  indexAtr = 'dito-i';
  packAttrName = 'dito-pack';
  timeAtr = 'dito-t';

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

  /* "EVENTS" */
  prepare(){}               // Before constructor starts but after HTMLElement constructor
  init(){}                  // After constructor finishes
  beforeRender(){}          // Before render
  afterRender(result){}     // After render
  beforeCssRender(){}       // Before CSS render
  afterCssRender(result){}  // After CSS render

  connectedCallback() {
    if (!document.body.contains(this)) {
      return;
    }

    if (!this.$self.rendered) {
      window.__dito.main.firstRendered.set(this);
      delete window.__dito.main.downloadCheck[this.localName];
      this.firstRenderBeforeActions();
      this.init();
    }

    this.queueRender();
  }

  firstRenderBeforeActions() {
    const parent = this.$self.parent;
    if (parent) {
      const inputs = parent.$self.toInput.get(this) || [];
      inputs.forEach(input => {
        this.setInput.bind(parent)(input, this);
      });
    }

    this.setCssScope();
  }

  setCssScope() {
    this.setAttribute(this.timeAtr, +new Date());
    this.setAttribute(this.indexAtr, Array.prototype.indexOf.call(this.parentElement.children, this));
    this.$self.path = this.getPath(this);
    this.$self.cssPath = this.pathToCss(this.$self.path);
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

            if (this.tag.$binded[prop]) {
              const { provider, receiver } = this.tag.$binded[prop];
              if (provider.target.$[provider.name] !== value) {
                provider.target.$[provider.name] = value;
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
      value: {},
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
        attributes: {},
        actions: {},
        children: [],
        binds: {},
        cssIndices: [],
        cssPath: null,
        default: {
          injected: [],
        },
        for: {},
        forBox: {
          key: null,
          value: null,
          keyName: null,
          valueName: null
        },
        forNodes: [],
        injected: [],
        injectedPacks: {},
        parent: null,
        path: null,
        rendered: false,
        rendering: false,
        scope: {},
        toBind: [],
        toInput: new WeakMap(),
        uniqueChildren: [],
        uniqueNodes: new WeakMap(),
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

    this.beforeCssRender();
    try {
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
      this.afterCssRender({success: true});
    } catch (e) {
      this.afterCssRender({success: false, error: e});
    }
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

    if (this.$self.parent && this.$self.parent.$self.rendering) {
      this.queueRender();
      return;
    }

    this.clearRenderQueue();
    this.$self.rendering = true;
    if (document.body.querySelector(this.localName + ' ' + this.localName)) {
      throw new Error('Custom element ' + this.localName + ' is recursively called. Stopping the render....');
    }

    let res = false;
    this.beforeRender();
    try {
      if (!this.__dito.compiledHTML) {
        this.compile();
      }

      if (!this.$self.rendered) {
        this.$self.default.injected = Object.values(this.childNodes);
        this.innerHTML = this.__dito.html;
        this.assignChildren(this);
        this.retrieveBindedValues();
        this.renderInjected(this);
        this.queueCssRender();
      }

      this.$self.forNodes.forEach(child => {
        this.actionFor(child);
      });

      this.searchForNotDownloaded(this);
      this.querySelectorAll(Object.keys(window.__dito.registered).join(', ')).forEach(custom => {
        if (!custom.$self) {
          this.defineSelf(custom);
        }
        custom.$self.parent = this;
      });

      while (this.$self.uniqueChildren.length > 0) {
        this.setupUnique(this.$self.uniqueChildren[0]);
        this.$self.uniqueChildren.splice(0, 1);
      }

      this.$self.children.forEach(child => {
        this.actionItem(child);
      });

      this.updateBinds();

      this.afterRender({success: true});
      if (!this.$self.rendered) {
        window.__dito.main.firstRendered.delete(this);
        this.$self.rendered = true;
        window.__dito.main.allDownloaded();
      }
      res = true;
    } catch (e) {
      console.error('There was an error during rendering', e);
      this.afterRender({success: false, error: e});
    }
    this.$self.rendering = false;
    return res;
  }

  renderInjected(item) {
    this.querySelectorAll('dito-inject').forEach(inject => {
      if (inject.$self?.actions?.packs?.length > 0) {
        inject.$self.actions.packs.forEach(pack => {
          this.$self.default.injected.forEach(function (node) {
            if (node.nodeType === 3) {
              return;
            }
            const packName = node.getAttribute(this.packAttrName);
            if (packName == pack) {
              this.insertBefore(node, inject);
              node.removeAttribute(this.packAttrName);
            } else {
              node.querySelectorAll('[' + this.packAttrName + '="' + pack + '"]').forEach(subnode => {
                this.insertBefore(subnode, inject);
                subnode.removeAttribute(this.packAttrName);
              });
            }
          }.bind(this));
        });
      } else {
        this.$self.default.injected.forEach(node => {
          this.insertBefore(node, inject);
        });
      }
      inject.remove();
    });
  }

  setupUnique(item) {
    this.setupEvents(item);
    this.setupBinds(item);
    this.setupInputs(item);
    this.setupOutputs(item);
  }

  setupOutputs(item) {
    const actions = item.$self?.actions?.outputs;
    if (!actions) {
      return;
    }
    actions.forEach(action => {
      if (!item.$output) {
        this.defineOutput(item);
      }

      item.$output[action.name] = {};
      item.$output[action.name].emit = function (e) {
        const observableKeys = this.getObservablesKeys(item);
        const valuesBefore = this.getObservablesValues(item);
        try {
          const res = this.getFunction(action.value, item, [this.eventName]).bind(this)(e, ...valuesBefore);
          this.updatedChangedValues(res, observableKeys, valuesBefore);
        } catch (e) {
          console.error("Error on output", e);
        }
      }.bind(item);
    });
  }

  setupInputs(item) {
    const actions = item.$self?.actions?.inputs;
    if (!actions) {
      return;
    }

    actions.forEach(action => {
      if (!item.$) {
        if (window.__dito.registered[item.localName]) {
          const input = this.$self.toInput.get(item);
          if (input) {
            this.$self.toInput.set(item, [...input, action]);
          } else {
            this.$self.toInput.set(item, [action]);
          }
        } else {
          console.error("Selected node was not made with Dito library and can't have assigned input");
        }
      } else {
        this.setInput(action, item);
      }
    });
  }

  setInput(input, node) {
    node.$[input.name] = this.getExecuteable(input.value, node)(...this.getObservablesValues(node));
  }

  setupBinds(item) {
    const actions = item.$self?.actions?.binds;
    if (!actions) {
      return;
    }

    actions.forEach(function (action) {
      if (typeof this.$[action.value] == 'undefined') {
        console.error(
          'Observable in `' + this.constructor.name + '` doesn\'t have `'
          + action.value + '` variable, skipping binding...'
        );
        return;
      }

      if (!item.$) {
        if (window.__dito.registered[item.localName]) {
          this.$self.toBind.push({bind: action, node: item});
        } else if (typeof item[action.name] != undefined) {
          this.setupNativeBind(item, action);
        }
      } else {
        this.setBind(action, item);
      }
      this.$self.children.push(item);
    }.bind(this));
  }

  setupNativeBind(node, action) {
    const {name, value} = action;
    node.setAttribute(name, this.$[value]);

    if (!node.$self) {
      this.defineSelf(node);
    }

    const item = {
      provider: {
        target: this,
        name: value
      },
      receiver: {
        target: node,
        name: name
      }
    };
    if (this.$binder[value]) {
      this.$binder[value].push(item);
    } else {
      this.$binder[value] = [item];
    }

    node.$self.binds[name] = item;

    // Mutation for attributes like class (outside) and change for like value (inside)
    this.setMutationObserver(node);
    node.addEventListener("change", function (e) {
      if (this.$[value] === node[name]) {
        return;
      }

      if (typeof node[name] != 'undefined') {
        this.$[value] = node[name];
      }
    }.bind(this))
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
    const {name, value} = bind;
    node.$[name] = this.$[value];
    const item = {
      provider: {
        target: this,
        name: value
      },
      receiver: {
        target: node,
        name: name
      }
    };
    node.$binded[name] = item;

    if (this.$binder[value]) {
      this.$binder[value].push(item);
    } else {
      this.$binder[value] = [item];
    }
  }

  updateBinds() {
    Object.values(this.$binder).forEach(binds => {
      binds.forEach(bind => {
        const {receiver, provider} = bind;
        const child = receiver.target;
        if (window.__dito.registered[child.localName]) {
          receiver.target.$[receiver.name] = this.$[provider.name];
        } else {
          if (typeof child[receiver.name] != 'undefined') {
            child[receiver.name] = this.$[provider.name];
          } else if (typeof child.getAttribute(receiver.name) != 'undefined') {
            child.setAttribute(receiver.name, this.$[provider.name]);
          }
        }
      });
    });
  }

  setupEvents(item) {
    const actions = item.$self?.actions?.events;
    if (!actions) {
      return;
    }

    actions.forEach(action => {
      item.addEventListener(action.name, (e) => {
        const observableKeys = this.getObservablesKeys(item);
        const valuesBefore = this.getObservablesValues(item);
        const res = this.getFunction(action.value, item, [this.eventName])(e, ...valuesBefore);
        this.updatedChangedValues(res, observableKeys, valuesBefore);
      });
    });
  }

  actionItem(item) {
    const actions = item.$self?.actions;
    if (!actions) {
      return;
    }

    this.actionIf(item, actions.ifs || [], 'ifs');
    this.actionAttrs(item, actions.attrs || [], 'attrs');
    this.actionExecutables(item, actions.executables || [], 'executables');
  }

  actionFor(node, indent = ' ') {
    if (!node.$self.for) {
      throw new Error("Node marked as for doesn't have required values");
    }
    const {condition, anchors} = node.$self.for;

    let res = this.getExecuteable(condition, node)(...this.getObservablesValues(node));
    let type = typeof res;
    if (type == 'string') {
      res = res * 1;
      type = typeof res;
    }

    let keys, values;
    if (type != 'number' && type != 'object' || (isNaN(res) && type != 'object')) {
      console.error('For in `' + this.constructor.name + '` doesn\'t have iterable value, removing node...');
      node.remove();
      return;
    } else {
      if (type == 'number') {
        res = new Array(res).fill(null);
      }

      keys = Object.keys(res);
      values = Object.values(res);
    }

    for (var i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      if (!document.body.contains(anchor)) {
        node.$self.for.anchors.splice(i, 1);
        i--;
        continue;
      }

      this.renderFor(node, anchor, values, keys, indent);
    }
  }

  renderFor(node, anchor, values, keys, indent) {
    if (keys.length < anchor.$self.children.length) {
      anchor.$self.children.splice(keys.length).forEach(child => {
        child.remove();
      });
    }

    const tmpParent = document.createElement('div');
    const actions = this.__dito.actions;
    for (var i = anchor.$self.children.length; i < keys.length; i++) {
      const key = keys[i], value = values[i], clone = node.cloneNode(true);
      tmpParent.appendChild(clone);
      this.iterateOverActions(tmpParent, (action, alias, child) => {
        child = this.defineChild(child, action, alias, actions[action][alias]);
        child.$self.forBox.key = key;
        child.$self.forBox.value = value;
        child.$self.forBox.keyName = node.$self.forBox.keyName;
        child.$self.forBox.valueName = node.$self.forBox.valueName;
        child.$self.scope = Object.assign({}, anchor.$self.scope, child.$self.scope);
      });

      anchor.parentElement.insertBefore(clone, anchor);

      // Nested fors
      node.$self.forBox.anchors.forEach(path => {
        const newAnchor = clone.querySelector(path);
        const realAnchor = node.querySelector(path);
        if (!newAnchor || !realAnchor) {
        } else {
          const newTextA = this.reconstructForAnchor(newAnchor, realAnchor)
          newTextA.$self.children = [];
          const nested = newTextA.$self.parent;
          newTextA.$self.scope = Object.assign({}, anchor.$self.scope, nested.$self.scope);
          if (node.$self.forBox.keyName) {
            newTextA.$self.scope[node.$self.forBox.keyName] = key;
          }

          if (node.$self.forBox.valueName) {
            newTextA.$self.scope[node.$self.forBox.valueName] = value;
          }

          this.actionFor(newTextA.$self.parent, indent + '  ');
        }
      });

      anchor.$self.children.push(clone);
    }
    if (anchor.nodeType !== 3) {
      this.reconstructForAnchor(anchor, anchor)
    }
  }

  reconstructForAnchor(oldAnchor, realAnchor) {
    const newAnchor = document.createTextNode('');
    oldAnchor.parentElement.replaceChild(newAnchor, oldAnchor);
    newAnchor.$self = Object.assign({}, realAnchor.$self);
    const forTemplate = newAnchor.$self.parent;
    forTemplate.$self.for.anchors.push(newAnchor);
    return newAnchor;
  }

  actionExecutables(node, actions) {
    if (actions.length > 1) {
      throw new Error('There can only be one execute script on single node');
    }

    if (actions.length == 0) {
      return;
    }

    node.nodeValue = this.getExecuteable(actions[0], node)(...this.getObservablesValues(node))
  }

  actionAttrs(node, actions) {
    actions.forEach(action => {
      node.setAttribute(action.name, this.getExecuteable(action.value, node)(...this.getObservablesValues(node)));
    });
  }

  actionIf(node, actions) {
    if (actions.length > 1) {
      throw new Error('There can only be one if on single node');
    }

    if (actions.length == 0) {
      return;
    }

    if (!node.$self.if) {
      node.$self.if = {
        condition: actions[0],
        replacement: document.createTextNode('')
      }
    }

    const res = this.getExecuteable(node.$self.if.condition, node)(...this.getObservablesValues(node))
    const rep = node.$self.if.replacement;
    if (res && !document.body.contains(node)) {
      rep.parentElement.replaceChild(node, rep);
    } else if (!res && document.body.contains(node)) {
      node.parentElement.replaceChild(rep, node);
    }
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

  getPath(node) {
    const index = this.attributes[this.indexAtr].value,
      time = this.attributes[this.timeAtr].value,
      path = node.localName + '@' + index + '@' + time;
    if (!this.$self.parent) {
      return path;
    }
    return this.$self.parent.$self.path + '.' + path;
  }

  pathToCss(path) {
    let cssRule = '';

    path.split('.').forEach(link => {
      const [name, index, time] = link.split('@');
      cssRule += name + '[' + this.indexAtr + '="' + index + '"' + ']';
      cssRule += '[' + this.timeAtr + '="' + time + '"' + ']';
      cssRule += ' ';
    });
    return cssRule.trim();
  }

  assignChildren(tmp) {
    const actions = this.__dito.actions;
    const forKeys = Object.keys(actions.fors);
    if (forKeys.length > 0) {
      Object.values(tmp.querySelectorAll('[' + forKeys.join('], [') + ']')).reverse().forEach(node => {
        this.defineFor(node);
      });
      this.$self.forNodes = this.$self.forNodes.reverse();
    }
    this.iterateOverActions(tmp, (action, alias, node) => {
      this.defineChild(node, action, alias, actions[action][alias]);
    });
  }

  defineFor(node) {
    const actions = this.__dito.actions, aliases = [], keys = [], values = [];
    node.getAttributeNames().forEach(name => {
      if (actions.fors[name]) {
        aliases.push(name);
      }
      if (actions.for_keys[name]) {
        keys.push(actions.for_keys[name]);
      }
      if (actions.for_values[name]) {
        values.push(actions.for_values[name]);
      }
    });

    if (aliases.length > 1) {
      throw new Error('There can only be one `for` on single node');
    }

    if (keys.length > 1) {
      throw new Error('There can only be one `key` on single node');
    }

    if (values.length > 1) {
      throw new Error('There can only be one `value` on single node');
    }

    const alias = aliases[0], anchor = document.createElement('a');
    anchor.setAttribute('dito-anchor', 1);
    anchor.setAttribute('dito-anchor-alias', alias);
    this.defineSelf(node);
    this.defineSelf(anchor);
    node.removeAttribute(alias);

    if (keys.length > 0) {
      node.$self.forBox.keyName = keys[0];
    }

    if (values.length > 0) {
      node.$self.forBox.valueName = values[0];
    }

    node.$self.forBox.anchors = this.getAnchorPaths(node);
    this.$self.forNodes.push(node);
    anchor.$self.parent = node;
    node.parentElement.replaceChild(anchor, node);
    node.$self.for = {
      condition: actions.fors[alias],
      anchors: [anchor]
    }
  }

  getAnchorPaths(node) {
    const paths = [];
    node.querySelectorAll('[dito-anchor]').forEach((anchor, i) => {
      paths.push(this.buildPath(anchor, node) + '[dito-anchor="' + i + '"]');
      anchor.setAttribute('dito-anchor', i);
    });
    return paths;
  }

  buildPath(node, parent) {
    if (node == parent || !node.parentElement) {
      return '';
    }
    const index = Array.prototype.indexOf.call(node.parentElement.children, node);
    return this.buildPath(node.parentElement, parent) + ' ' + node.localName;
  }

  iterateOverActions(parent, callback) {
    const actions = this.__dito.actions;
    Object.keys(actions).forEach(function (action) {
      if (action === 'fors') {
        return;
      }
      Object.keys(actions[action]).forEach(alias => {
        parent.querySelectorAll('[' + alias + ']').forEach(node => {
          callback(action, alias, node);
        });
      });
    }.bind(this));
  }

  defineChild(node, actionName, alias, action) {
    if (actionName === 'executables') {
      const text = document.createTextNode('');
      node.parentElement.replaceChild(text, node);
      node = text;
    } else if (actionName === 'packs') {
      node.setAttribute(this.packAttrName, action);
    }

    if (!node.$self) {
      this.defineSelf(node);
    }

    if (!node.$self.actions[actionName]) {
      node.$self.actions[actionName] = [];
    }

    node.$self.actions[actionName].push(action);

    if (node.attributes) {
      node.removeAttribute(alias);
    }

    if (this.$self.uniqueNodes.get(node)) {
      return node;
    }

    node.$self.parent = this;
    node.$self.scope = Object.assign({}, this.$self.scope);

    this.$self.uniqueNodes.set(node, true)

    const unique = {
      "events" : true,
      "binds" : true,
      "outputs" : true,
      "inputs" : true
    };

    if (unique[actionName]) {
      this.$self.uniqueChildren.push(node);
    } else {
      this.$self.children.push(node);
    }

    if (node.nodeType == 3) {
      return node;
    }

    return node;
  }

  searchForNotDownloaded(parent) {
    const notDownloaded = window.__dito.main.notDownloaded, keys = Object.keys(notDownloaded);
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

    html = this.compileFindAndReplace(html, ' @b:', 'b', 'binds', true);
    html = this.compileFindAndReplace(html, ' @i:', 'i', 'inputs', true);
    html = this.compileFindAndReplace(html, ' @o:', 'o', 'outputs', true);
    html = this.compileFindAndReplace(html, ' @a:', 'a', 'attrs', true);
    html = this.compileExecutables(html);
    html = this.compileFindAndReplace(html, ' @e:', 'e', 'events', true);
    html = this.compileFindAndReplace(html, ' @if', 'if', 'ifs');
    html = this.compileFindAndReplace(html, ' @value', 'v', 'for_values');
    html = this.compileFindAndReplace(html, ' @key', 'k', 'for_keys');
    html = this.compileFindAndReplace(html, ' @pack', 'p', 'packs');
    this.__dito.html = this.compileFindAndReplace(html, ' @for', 'for', 'fors');

    this.__dito.compiledHTML = true;
  }

  compileFindAndReplace(html, lm, prefix, attrName, hasName = false) {
    let attr, start = 0;
    const action = this.__dito.actions[attrName];
    while (attr = this.getCompiledAttribute(html, lm, start)) {
      const { name, value } = attr;
      const plc = prefix + name.start + '-' + value.end;
      if (hasName) {
        action[plc] = {
          name: html.substr(name.start + lm.length, name.end - (name.start + lm.length)).trim(),
          value: html.substr(value.start + 1, value.end - 1 - value.start),
        };
      } else {
        action[plc] = html.substr(value.start + 1, value.end - 1 - value.start);
      }
      html = html.replaceAll(html.substr(name.start + 1, value.end + 1 - (name.start + 1)), plc);
    }

    return html;
  }

  getCompiledAttribute(text, lm, start = 0) {
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
      return this.getCompiledAttribute(text, lm, aEnd)
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
      const name = 'exec_' + start + '_' + end;
      this.__dito.actions.executables[name] = html.substr(start + 2, end - (start + 2));
      html = html.replaceAll(html.substr(start, end + 2 - start), '<span ' + name + '></span>');
      start = html.indexOf('{{', start + name.length);
    }

    return html;
  }

  getExecuteable(script, node) {
    return new Function(...this.getObservablesKeys(node), 'return ' + script).bind({});
  }

  getCSSExecuteable(script) {
    return new Function(...this.getCSSObservablesKeys(), 'return ' + script).bind({});
  }

  getFunction(script, node, vars = []) {
    const observableKeys = this.getObservablesKeys(node);
    return new Function(...vars, ...observableKeys, script + '; return [' + observableKeys.join(',') + '];').bind({});
  }

  getObservablesKeys(node) {
    const keys = [
      ...Object.keys(this.methods),
      ...Object.keys(this.$),
      ...Object.keys(node.$self.scope)
    ];

    if (node.$self.forBox.key) {
      keys.push(node.$self.forBox.keyName || this.keyName);
    }

    if (node.$self.forBox.value) {
      keys.push(node.$self.forBox.valueName || this.valueName);
    }

    return keys;
  }

  getCSSObservablesKeys() {
    return [
      ...Object.keys(this.methods),
      ...Object.keys(this.$css)
    ];
  }

  getObservablesValues(node) {
    const values = [
      ...Object.values(this.methods),
      ...Object.values(this.$),
      ...Object.values(node.$self.scope)
    ];

    if (node.$self.forBox.key) {
      values.push(node.$self.forBox.key);
    }

    if (node.$self.forBox.value) {
      values.push(node.$self.forBox.value);
    }

    return values;
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
      if (args[0] === "clear") {
        return;
      }

      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }
}

export { DitoElement };
