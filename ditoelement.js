class DitoElement extends HTMLElement {
  keyName = "$key";
  valueName = "$value";
  eventName = "$event";
  indexAtr = 'dito-i';
  packAttrName = 'dito-pack';
  useNameAttrName = 'dito-use-name';
  timeAtr = 'dito-t';
  anchorAliasAttr = 'dito-anchor-alias';

  constructor() {
    super();
    if (this.constructor === DitoElement) {
      throw new Error("DitoElement is an abstract and cannot be instantiated as separate class");
    }
    this.prepare();
    this.defineObservable();
    this.saveMethods();
    this.$self.cssqueueRenderInProgress = false;
    this.$self.queueRenderInProgress = false;
    this.defineCallback();
    this.defineCssCallback();
    this.defineDefaults();
  }

  /* "EVENTS" */
  prepare(){}                // Before constructor starts but after HTMLElement constructor
  init(){}                   // After constructor finishes
  beforeRender(){}           // Before render
  beforeFirstRender(){}      // Before first render
  afterRender(result){}      // After render
  afterFirstRender(result){} // After first render
  beforeCssRender(){}        // Before CSS render
  afterCssRender(result){}   // After CSS render

  getDefaults(){}           // Placeholder

  async connectedCallback() {
    if (!document.body.contains(this)) {
      return;
    }

    this.clearRenderQueue();

    if (!this.$self.rendered) {
      window.__dito.main.firstRendered.set(this, true);
      delete window.__dito.main.downloadCheck[this.localName];
      this.firstRenderBeforeActions();
      await this.init();
    }

    this.queueRender();
  }

  defineCallback() {
    this.$self.debounceRender = this.debounce(e => {
      this.$self.queueRenderInProgress = false;
      this.render();
    });
  }

  defineCssCallback() {
    this.$self.debounceCssRender = this.debounce(e => {
      this.$self.cssqueueRenderInProgress = false;
      this.cssRender();
    });
  }

  defineDefaults() {
    const defaults = this.getDefaults() || {};
    const types = {
      append: (name, attr) => {
        const currentAttr = this.getAttribute(name) || '';
        this.setAttribute(name, currentAttr + ' ' + attr.value);
      },
      replace: (name, attr) => {
        this.setAttribute(name, attr.value);
      },
      add: (name, attr) => {
        const currentAttr = this.getAttribute(name) || '';
        this.setAttribute(name, currentAttr + attr.value);
      },
    };

    Object.defineProperty(this.$self, "default", {
      value: defaults,
      writable: false
    });

    Object.keys(defaults).forEach(function (key) {
      const attr = defaults[key];
      const type = attr.type || 'append';

      if (!types[type]) {
        console.error('Attribute create as type `' + type + '` is not supported');
        return;
      }

      types[type](key, attr);
    }.bind(this));
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
    if (this.$self.css.scoped) {
      this.queueCssRender();
    }
    this.setAttribute(this.timeAtr, +new Date());
    this.setAttribute(this.indexAtr, Array.prototype.indexOf.call(this.parentElement.children, this));
    this.$self.path = this.getPath(this);
    this.$self.css.path = this.pathToCss(this.$self.path);
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
    this.$self.queueRenderInProgress = true;
    this.$self.debounceRender();
  }

  clearRenderQueue() {
    this.$self.queueRenderInProgress = false;
    this.$self.debounceRender('clear');
  }

  queueCssRender() {
    this.$self.cssqueueRenderInProgress = true;
    this.$self.debounceCssRender();
  }

  clearCssRenderQueue() {
    this.$self.cssqueueRenderInProgress = false;
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

          if (this.tag.$bound[prop]) {
            const { provider, receiver } = this.tag.$bound[prop];
            if (provider.target.$[provider.name] !== value) {
              provider.target.$[provider.name] = value;
            }
          }

          return Reflect.set(...arguments);
        }
      }),
      writable: false
    });

    Object.defineProperty(this, "$bound", {
      value: {},
      writable: true
    });

    Object.defineProperty(this, "$binder", {
      value: {},
      writable: true
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
        setEvents: {},
        children: [],
        binds: {},
        css : {
          compiled: false,
          indices: [],
          path: null,
          rendered: false,
          queueRenderInProgress: false,
          scoped: null
        },
        default: {
          injected: [],
        },
        for: {},
        forBox: {
          isItem: false,
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
        childNodes: new WeakMap(),
        get: {},
        getName: '',
        template: {},
      },
      writable: true
    });
  }

  defineOutput(obj) {
    Object.defineProperty(obj, "$output", {
      value: {},
      writable: true
    });
  }

  compileCSS() {
    this.__dito.css.content = this.compileCSSExecutables(this.__dito.css.content);
    this.categorizeCssRules();
    this.__dito.compiledCSS = true;
  }

  categorizeCssRules() {
    const rules = this.separateRules(this.__dito.css.content);
    this.__dito.css.scoped = [];
    this.__dito.css.global = [];
    rules.forEach(rule => {
      if (rule.indexOf('@self') !== -1) {
        this.__dito.css.scoped.push({
          rule,
          index: -1
        });
      } else {
        this.__dito.css.global.push({
          rule,
          index: -1
        });
      }
    });

    const sheet = window.__dito.main.styleNode.sheet;
    this.__dito.css.global.forEach(rule => {
      rule.index = sheet.cssRules.length;
      sheet.insertRule(rule.rule, sheet.cssRules.length);
    });
  }

  separateRules(css) {
    let inRule = false, lastEnd = 0, nested = 0;
    const rules = [];

    for (var i = 0; i < css.length; i++) {
      const letter = css[i];

      if (!inRule && letter === '{') {
        inRule = true;
        continue;
      }

      if (!inRule) {
        continue;
      }

      const stringLm = {
        '"' : true,
        "'" : true,
        '`' : true,
      }

      if (stringLm[letter]) {
        i = this.getStringEnd(css, letter, i + 1);
        continue;
      }

      if (letter === '{') {
        nested++;
        continue;
      }

      if (letter === '}') {
        if (nested > 0) {
          nested--;
          continue;
        }

        rules.push(css.substr(lastEnd, i - lastEnd + 1).trim());
        lastEnd = i + 1;
        inRule = false;
        continue;
      }
    }

    return rules;
  }

  compileCSSExecutables(css) {
    this.__dito.css.actions.executables = {};
    let start = css.indexOf('{{');

    while (start !== -1) {
      const end = css.indexOf('}}', start);

      if (end === -1) {
        break;
      }

      const name = 'exec_' + start + '_' + end;

      this.__dito.css.actions.executables[name] = css.substr(start + 2, end - (start + 2));
      css = css.replaceAll(css.substr(start, end + 2 - start), name);
      start = css.indexOf('{{', start + name.length);
    }
    return css;
  }

  async cssRender() {
    if (this.$self.css.queueRenderInProgress || !document.body.contains(this)) {
      return;
    }

    this.clearCssRenderQueue();
    await this.beforeCssRender();
    try {
      if (!this.__dito.compiledCSS) {
        this.compileCSS();
      }

      if (!this.$self.css.scoped) {
        this.$self.css.scoped = JSON.parse(JSON.stringify(this.__dito.css.scoped));
      }

      const sheet = window.__dito.main.styleNode.sheet;
      this.$self.css.scoped.forEach(rule => {
        let ruleCss = rule.rule.replaceAll('@self', this.$self.css.path);
        let css = this.resolveCssExecutables(ruleCss);
        if (rule.index === -1) {
          rule.index = sheet.cssRules.length;
          sheet.insertRule(css, sheet.cssRules.length);
        } else {
          sheet.deleteRule(rule.index);
          sheet.insertRule(css, rule.index);
        }
      });
      await this.afterCssRender({success: true});
      this.$self.css.rendered = true;
    } catch (e) {
      await this.afterCssRender({success: false, error: e});
    }
  }

  resolveCssExecutables(css) {
    const exe = this.__dito.css.actions.executables;
    Object.keys(exe).forEach(alias => {
      css = css.replaceAll(alias, this.getCSSExecuteable(exe[alias])(...this.getCSSObservablesValues()));
    });
    return css;
  }

  async render(force = false) {
    if (!force && (this.$self.queueRenderInProgress || this.$self.rendering || !document.body.contains(this))) {
      if (document.body.contains(this)) {
        this.dispatchEvent(window.__dito.events.loadfinished);
      }
      return;
    }

    if (this.$self.parent?.$self?.rendering) {
      this.queueRender();
      return;
    }

    this.clearRenderQueue();

    this.$self.rendering = true;
    let res = false;
    if (document.querySelector(this.$self.css.path) !== this) {
      this.setCssScope();
    }

    await this.beforeRender();
    if (!this.$self.rendered) {
      await this.beforeFirstRender();
      this.dispatchEvent(window.__dito.events.firstrender);
    } else {
      this.dispatchEvent(window.__dito.events.render);
    }

    try {
      if (!this.__dito.compiledHTML) {
        this.compile();
      }

      if (!this.$self.rendered) {
        if (!this.$self.default.injected) {
          this.$self.default.injected = Object.values(this.childNodes);
        }
        this.innerHTML = this.__dito.html;
        this.assignChildren(this);
        this.retrieveBoundValues();
        this.renderInjected(this);
        if (!this.$self.css.rendered) {
          await this.cssRender();
        }
      }

      this.$self.forNodes.forEach(child => {
        try {
          this.actionFor(child);
        } catch (e) {
          console.error('For error', e)
        }
      });

      this.searchForNotDownloaded(this);
      const promises = [];
      this.querySelectorAll(Object.keys(window.__dito.registered).join(', ')).forEach(custom => {
        if (!custom.$self) {
          this.defineSelf(custom);
        }

        if (!custom.$self.parent) {
          custom.$self.parent = this;
        }

        if (!this.$self.rendered) {
          promises.push(new Promise((resolve, reject) => {
            const fn = e => {
              custom.removeEventListener('loadfinished', fn, true);
              resolve();
            };
            custom.addEventListener('loadfinished', fn, true);
          }));
        }
      });

      while (this.$self.uniqueChildren.length > 0) {
        this.setupUnique(this.$self.uniqueChildren[0]);
        this.$self.uniqueChildren.splice(0, 1);
      }

      this.$self.children.forEach(child => {
        this.actionItem(child);
      });

      this.updateBinds();

      await this.afterRender({success: true});
      if (promises.length > 0) {
        Promise.all(promises).then(value => {
          this.dispatchEvent(window.__dito.events.loadfinished);
        })
      } else {
        this.dispatchEvent(window.__dito.events.loadfinished);
      }
      if (!this.$self.rendered) {
        await this.afterFirstRender({success: true});
        this.dispatchEvent(window.__dito.events.firstrendered);
        window.__dito.main.firstRendered.delete(this);
        this.$self.rendered = true;
        window.__dito.main.allDownloaded();
      } else {
        this.dispatchEvent(window.__dito.events.rendered);
      }
      res = true;
    } catch (e) {
      console.error('There was an error during rendering', e, this);
      await this.afterRender({success: false, error: e});
    }
    this.$self.rendering = false;
    return res;
  }

  cloneNodeRecursive(template, callback = null) {
    const node = template.cloneNode();
    if (template.$self && callback) {
      callback(template, node);
    }

    template.childNodes.forEach(child => {
      node.appendChild(this.cloneNodeRecursive(child, callback));
    });

    return node;
  }

  actionItems(node, currentScope, isFor = false) {
    if (node.$self) {
      if (!isFor && currentScope.isInjected(node)) {
        return;
      }

      if (
        !node.$self.forBox.isItem
        && (
          !node.getAttribute
          || (node.getAttribute && !node.getAttribute(this.anchorAliasAttr))
        )
      ) {
        node.$self.parent.$self.children.push(node);
      }

      const parent = node.$self.parent;
      parent.setupUnique(node);
      parent.actionItem(node);
      const index = parent.$self.uniqueChildren.indexOf(node);
      if (index !== -1) {
        parent.$self.uniqueChildren.splice(index, 1);
      }
    }

    node.childNodes.forEach(child => {
      this.actionItems(child, currentScope, isFor);
    });
  }

  renderInjected(item, scope = this, isFor = false) {
    let rendered = [];
    scope.querySelectorAll('dito-inject').forEach(inject => {
      const uses = inject.$self?.actions?.uses;
      let use = null;
      if (uses?.length > 0) {
        if (uses.length > 1) {
          throw new Error('Dito inject can one have one use variable');
        }

        use = this.getExecuteable(uses[0], inject)(...this.getObservablesValues(inject));
      }

      if (inject.$self?.actions?.packs?.length > 0) {
        inject.$self.actions.packs.forEach(pack => {
          pack = this.getExecuteable(pack, inject)(...this.getObservablesValues(inject));
          this.$self.default.injected.forEach(function (template) {
            if (template.nodeType === 3 || !template.getAttribute(this.packAttrName)) {
              return;
            }

            const packName = this.getExecuteable(
              template.getAttribute(this.packAttrName),
              item
            )(...this.getObservablesValues(item));

            if (packName != pack) {
              return;
            }

            let [node, subRendered] = this.initInjected(inject, template, use, uses, isFor);
            rendered = rendered.concat(subRendered);
          }.bind(this));
        });
      } else {
        this.$self.default.injected.forEach(template => {
          this.initInjected(inject, template, use, uses, isFor);
        });
      }
      inject.remove();
    });

    return rendered;
  }

  initInjected(inject, template, use, uses, isFor) {
    let scope = null, useName = 'use', rendered = [];
    const forActions = [];
    const toRender = [];
    if (use && template.getAttribute && template.getAttribute(this.useNameAttrName)) {
      useName = template.getAttribute(this.useNameAttrName);
      scope = {[useName] : use};
    } else if (use) {
      scope = { use };
    }

    const node = this.cloneNodeRecursive(template, function(template, node) {
      node.$self = Object.assign({}, template.$self);
      node.$self.rendered = false;
      node.$self.actions.uses = {value: uses, name: useName}
      rendered.push(node);

      if (node.$self.if?.isReplacement) {
        node.$self.if.parent.$self.if.replacement = node;
      }

      if (template.$bound) {
        node.$bound = Object.assign({}, template.$bound);
      }

      if (template.$binder) {
        node.$binder = Object.assign({}, template.$binder);
      }

      if (template.$output) {
        node.$output = Object.assign({}, template.$output);
      }

      if (scope) {
        node.$self.scope = Object.assign({}, node.$self.scope, scope);
      }

      if (window.__dito.main.firstRendered.get(template)) {
        window.__dito.main.firstRendered.delete(template);
      }

      if (window.__dito.main.components[node.localName]) {
        toRender.push(node);
      }

      if (node.getAttribute && node.getAttribute(this.useNameAttrName)) {
        node.removeAttribute(this.useNameAttrName);
      }

      if (node.getAttribute && node.getAttribute(this.anchorAliasAttr)) {
        node.$self.for.parent.$self.for.anchors[0] = node;
        node.$self.parent.$self.forNodes.push(node.$self.for.parent);
        forActions.push(node.$self.for.parent);
      }
    }.bind(this.$self.parent));

    if (!node) {
      throw new Error("Injected node wasn't properly cloned");
    }

    inject.parentElement.insertBefore(node, inject);
    forActions.forEach(child => {
      this.$self.parent?.actionFor(child);
    });

    toRender.forEach(child => {
      child.setCssScope();
      child.defineCallback();
      child.defineCssCallback();
      child.queueRender();
    })
    this.$self.parent?.actionItems(node, this, isFor);

    return [node, rendered];
  }

  tearUnique(item) {
    this.tearEvents(item);
    this.tearOutput(item);
    this.tearGets(item);
  }

  setupUnique(item, skipBinding = false) {
    this.setupEvents(item);
    if (!skipBinding) {
      this.setupBinds(item);
    }
    this.setupOutputs(item);
    this.setupGets(item);
  }

  setupGets(item) {
    const actions = item.$self?.actions?.gets;
    if (!actions) {
      return;
    }

    if (actions.length > 1) {
      throw new Error('You can only retrieve the same node once');
    }
    const name = this.getExecuteable(actions[0], item)(...this.getObservablesValues(item));
    this.$self.get[name] = item;
    item.$self.getName = name;
  }

  tearGets(item) {
    delete this.$self.get[item.$self.getName];
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
        const parent = this.$self.parent;
        const observableKeys = this.getObservablesKeys.bind(parent)(item);
        const valuesBefore = this.getObservablesValues.bind(parent)(item);
        try {
          const res = this.getFunction.bind(parent)(action.value, item, [this.eventName]).bind(parent)(e, ...valuesBefore);
          this.updateChangedValues.bind(parent)(res, observableKeys, valuesBefore);
        } catch (e) {
          console.error("Error on output", e);
        }
      }.bind(item);
    });
  }

  tearOutput(item) {
    const actions = item.$self?.actions?.outputs;
    if (!actions) {
      return;
    }

    actions.forEach(action => {
      delete item.$output[action.name];
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
          console.error("Selected node " + item.localName + " was not made with Dito library and can't have assigned input");
        }
      } else {
        this.setInput(action, item);
      }
    });
  }

  setInput(input, node) {
    try {
      node.$[input.name] = this.getExecuteable(input.value, node)(...this.getObservablesValues(node));
    } catch (e) {
      console.error('Input error - ' + input.value, e);
    }
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

  retrieveBoundValues() {
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
    node.$bound[name] = item;

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
      if (!item.$self.setEvents[action.name]) {
        item.$self.setEvents[action.name] = [];
      }
      const fun = e => {
        const observableKeys = this.getObservablesKeys(item);
        const valuesBefore = this.getObservablesValues(item);
        const res = this.getFunction(action.value, item, [this.eventName])(e, ...valuesBefore);
        this.updateChangedValues(res, observableKeys, valuesBefore);
      };
      item.$self.setEvents[action.name].push(fun)
      item.addEventListener(action.name, fun, false);
    });
  }

  tearEvents(item) {
    const actions = item.$self?.setEvents;
    if (!actions) {
      return;
    }

    Object.keys(actions).forEach(actionName => {
      actions[actionName].forEach(fun => {
        item.removeEventListener(actionName, fun, false);
      });
      item.$self.setEvents[actionName] = [];
    });
  }

  actionItem(item) {
    const actions = item.$self?.actions;
    if (!actions) {
      return;
    }

    try {
      this.actionIf(item, actions.ifs || [], 'ifs');
    } catch (e) {
      console.error('If error', e)
    }

    try {
      this.actionAttrs(item, actions.attrs || [], 'attrs');
    } catch (e) {
      console.error('Attr error', e)
    }

    try {
      this.actionExecutables(item, actions.executables || [], 'executables');
    } catch (e) {
      console.error('Exec error', e)
    }

    try {
      this.setupInputs(item);
    } catch (e) {
      console.error('Input error', e)
    }

  }

  actionFor(node, indent = ' ') {
    if (!node.$self.for) {
      throw new Error("Node marked as for doesn't have required values");
    }

    const {condition, anchors} = node.$self.for;

    for (var i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];

      if (!document.body.contains(anchor) && anchors.length > 1) {
        node.$self.for.anchors.splice(i, 1);
        i--;
        continue;
      }

      if (!anchor.$self.forGenerated) {
        anchor.$self.forGenerated = [];
      }

      if (!anchor.$self.anchorGenerated) {
        anchor.$self.anchorGenerated = [];
      }

      let res = this.getExecuteable(condition, anchor)(...this.getObservablesValues(anchor));
      let type = typeof res;
      if (type == 'string') {
        res = res * 1;
        type = typeof res;
      }

      let keys, values;
      if (type != 'number' && type != 'object' || (isNaN(res) && type != 'object')) {
        console.error('For in `' + this.constructor.name + '` doesn\'t have iterable value, removing node...', condition);
        node.remove();
        return;
      } else {
        if (type == 'number') {
          res = new Array(res).fill(null);
        }

        if (node.$self.for.min) {
          const min = this.getExecuteable(node.$self.for.min, anchor)(...this.getObservablesValues(anchor));
          let item = undefined;
          if (node.$self.for.minDef) {
            item = this.getExecuteable(node.$self.for.minDef, anchor)(...this.getObservablesValues(anchor));
          }
          if (typeof min != 'number') {
            throw new Error('For min must be a number');
          }
          if (res.length < min) {
            res = res.concat(new Array(min - res.length).fill(item));
          }
        }

        keys = Object.keys(res);
        values = Object.values(res);
      }

      this.renderFor(node, anchor, values, keys, indent);
    }
  }

  renderFor(node, anchor, values, keys, indent) {
    if (keys.length < anchor.$self.children.length) {
      anchor.$self.children.splice(keys.length).forEach(child => {
        this.removeFromChildren(child);
      });
      anchor.$self.anchorGenerated.splice(keys.length);
      anchor.$self.forGenerated.splice(keys.length);
    }

    const tmpParent = document.createElement('div');
    anchor.$self.forGenerated.forEach((generatedChildren, i) => {
      const key = keys[i], value = values[i];
      generatedChildren.forEach(child => {
        if (!this.isInUnique(child)) {
          child.$self.parent.tearUnique(child);
          child.$self.parent.setupUnique(child, true);
        }
        child.$self.scope = Object.assign({}, child.$self.scope, anchor.$self.scope);
        child.$self.forBox.key = key;
        child.$self.forBox.value = value;
        const uses = child.$self.actions.uses;
        if (uses?.value) {
          child.$self.forBox.keyName = node.$self.forBox.keyName;
          child.$self.forBox.valueName = node.$self.forBox.valueName;

          const use = this.getExecuteable(uses.value, child)(...this.getObservablesValues(child));
          child.$self.scope[uses.name] = use;
          child.$self.parent.actionItem(child);
        }
      });
    });

    anchor.$self.anchorGenerated.forEach((subAnchors, i) => {
      const key = keys[i], value = values[i];
      subAnchors.forEach(subAnchor => {
        if (node.$self.forBox.keyName) {
          subAnchor.$self.scope[node.$self.forBox.keyName] = key;
        }

        if (node.$self.forBox.valueName) {
          subAnchor.$self.scope[node.$self.forBox.valueName] = value;
        }

        this.actionFor(subAnchor.$self.for.parent, indent + '-- ');
      });
    });

    const actions = this.__dito.actions;
    for (var i = anchor.$self.children.length; i < keys.length; i++) {
      const key = keys[i], value = values[i], clone = node.cloneNode(true);
      anchor.$self.forGenerated[i] = [];
      tmpParent.appendChild(clone);
      this.iterateOverActions(tmpParent, (action, alias, child) => {
        child = this.defineChild(child, action, alias, actions[action][alias]);
        if (!child.$self.forBox.isItem) {
          child.$self.forBox.isItem = true;
          child.$self.forBox.key = key;
          child.$self.forBox.value = value;
          child.$self.forBox.keyName = node.$self.forBox.keyName;
          child.$self.forBox.valueName = node.$self.forBox.valueName;
          child.$self.scope = Object.assign({}, anchor.$self.scope, child.$self.scope);
          anchor.$self.forGenerated[i].push(child);
        }
      });

      anchor.parentElement.insertBefore(clone, anchor);
      anchor.$self.anchorGenerated[i] = [];

      // Nested fors
      node.$self.forBox.anchors.forEach(path => {
        const newAnchor = clone.querySelector(path);
        const realAnchor = node.querySelector(path);
        if (!newAnchor || !realAnchor) {
          throw new Error('No anchor found!');
        } else {
          const newTextA = this.reconstructForAnchor(newAnchor, realAnchor)
          newTextA.$self.children = [];
          newTextA.$self.forGenerated = [];

          const nested = newTextA.$self.for.parent;
          newTextA.$self.scope = Object.assign({}, nested.$self.scope, anchor.$self.scope);
          if (node.$self.forBox.keyName) {
            newTextA.$self.scope[node.$self.forBox.keyName] = key;
          }

          if (node.$self.forBox.valueName) {
            newTextA.$self.scope[node.$self.forBox.valueName] = value;
          }

          anchor.$self.anchorGenerated[i].push(newTextA);
          this.actionFor(newTextA.$self.for.parent, indent + '-- ');
        }
      });

      anchor.$self.children.push(clone);

      if (this.$self.parent) {
        const rendered = this.renderInjected(this.$self.parent, clone, true);
        anchor.$self.forGenerated[i] = anchor.$self.forGenerated[i].concat(rendered);
      }
    }

    if (anchor.nodeType !== 3) {
      this.reconstructForAnchor(anchor, anchor)
    }
  }

  isInUnique(item) {
    return this.$self.uniqueChildren.includes(item);
  }

  removeFromChildren(item) {
    const removed = [];
    for (var i = 0; i < this.$self.children.length; i++) {
      const child = this.$self.children[i];
      if (item.contains(child) || item === child) {
        removed.push(child);
        this.$self.children.splice(i, 1);
        i--;
      }
    }
    item.remove();
    return removed;
  }

  reconstructForAnchor(oldAnchor, realAnchor) {
    const newAnchor = document.createTextNode('');
    oldAnchor.parentElement.replaceChild(newAnchor, oldAnchor);
    newAnchor.$self = Object.assign({}, realAnchor.$self);
    const forTemplate = newAnchor.$self.for.parent;
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
      this.defineSelf(node.$self.if.replacement);
      node.$self.if.replacement.$self.parent = this;
      node.$self.if.replacement.$self.if = {
        isReplacement: true,
        parent: node
      };
    }

    const rep = node.$self.if.replacement;
    if (!document.body.contains(rep) && !document.body.contains(node)) {
      return;
    }

    const res = this.getExecuteable(node.$self.if.condition, node)(...this.getObservablesValues(node))
    if (res && !document.body.contains(node)) {
      rep.parentElement.replaceChild(node, rep);
    } else if (!res && document.body.contains(node)) {
      node.parentElement.replaceChild(rep, node);
    }
  }

  getPath(node) {
    const index = this.attributes[this.indexAtr].value,
      time = this.attributes[this.timeAtr].value,
      path = node.localName + '@' + index + '@' + time;

    if (!this.$self.parent) {
      return path;
    }

    return this.$self.parent.getPath(this.$self.parent) + '.' + path;
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
    let min, minDef;
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
      if (actions.for_mins[name]) {
        min = actions.for_mins[name];
      }
      if (actions.for_min_defs[name]) {
        minDef = actions.for_min_defs[name];
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
    anchor.setAttribute(this.anchorAliasAttr, alias);
    if (!node.$self) {
      this.defineSelf(node);
    }
    this.defineSelf(anchor);
    anchor.$self.parent = this;
    node.removeAttribute(alias);

    if (keys.length > 0) {
      node.$self.forBox.keyName = keys[0];
    }

    if (values.length > 0) {
      node.$self.forBox.valueName = values[0];
    }

    node.$self.forBox.anchors = this.getAnchorPaths(node);
    if (!this.isInjected(node)) {
      this.$self.forNodes.push(node);
    } else {
      const keys = Object.keys(this.__dito.actions.packs);
      for (let i=0; i < keys.length; i++) {
        const alias = keys[i];
        if (null !== node.getAttribute(alias)) {
          anchor.setAttribute(alias, '');
          break;
        }
      }
    }

    anchor.$self.for.parent = node;
    node.parentElement.replaceChild(anchor, node);
    node.$self.for = {
      condition: actions.fors[alias],
      anchors: [anchor],
      min,
      minDef
    };
  }

  isInjected(node) {
    let copy = {...window.__dito.registered};
    delete copy[this.localName];
    const keys = Object.keys(copy);
    if (keys.length === 0) {
      return false;
    }

    let all = this.$self.css.path + ' ' + keys.join(' [dito-find-me], ' + this.$self.css.path + ' ')
      + ' [dito-find-me]';
    if (node.nodeType !== 3) {
      node.setAttribute('dito-find-me', '');
    } else {
      node.parentElement.setAttribute('dito-find-me', '');
    }

    let res = true;
    if (!this.querySelector(all)) {
      res = false;
    } else if(this.localName === 'test-inject-pack3') {
      throw new Error('stop')
    }

    if (node.nodeType !== 3) {
      node.removeAttribute('dito-find-me');
    } else {
      node.parentElement.removeAttribute('dito-find-me');
    }

    return res;
  }

  getAnchorPaths(node) {
    const paths = [];
    node.querySelectorAll('[dito-anchor]').forEach((anchor, i) => {
      paths.push(this.buildPath(anchor, node) + '[dito-anchor="' + i + '"]');
      anchor.setAttribute('dito-anchor', i);

      const nodes = this.$self.forNodes;
      for (var i = 0; i < nodes.length; i++) {
        if (anchor.$self.for.parent === nodes[i]) {
          nodes.splice(i, 1);
          break;
        }
      }
    });
    return paths;
  }

  buildPath(node, parent) {
    if (node == parent || !node.parentElement) {
      return '';
    }

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
    } else if (actionName === 'unames') {
      node.setAttribute(this.useNameAttrName, action);
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

    const unique = {
      "events" : true,
      "binds" : true,
      "outputs" : true,
      "gets": true
    };

    if (unique[actionName]) {
      if (!this.$self.uniqueChildren.includes(node)) {
        this.$self.uniqueChildren.push(node);
      }
    } else if (!this.$self.childNodes.get(node) && !this.isInjected(node)) {
      this.$self.children.push(node);
      this.$self.childNodes.set(node, true)
    }

    if (this.$self.uniqueNodes.get(node)) {
      return node;
    }

    if (!node.$self.parent) {
      node.$self.parent = this;
    }

    if (!node.$self.scope) {
      node.$self.scope = Object.assign({}, this.$self.scope);
    }

    if (unique[actionName]) {
      this.$self.uniqueNodes.set(node, true)
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

  updateChangedValues(res, observableKeys, valuesBefore) {
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

  compileFindAndReplace(text, lm, prefix, attrName, settings = {}) {
    let attr, start = 0, action = this.__dito.actions[attrName], { hasName, isCss, skipValue, replace } = settings;
    if (isCss) {
      action = this.__dito.css.actions[attrName]
    }
    while (attr = this.getCompiledAttribute(text, lm, skipValue, start)) {
      const { name, value } = attr;
      const plc = replace || prefix + name.start + '-' + value.end;
      if (hasName) {
        action[plc] = {
          name: text.substr(name.start + lm.length, name.end - (name.start + lm.length)).trim(),
          value: text.substr(value.start + 1, value.end - 1 - value.start),
        };
      } else {
        action[plc] = text.substr(value.start + 1, value.end - 1 - value.start);
      }
      text = text.replaceAll(text.substr(name.start, value.end - name.start + 1), plc);
    }

    return text;
  }

  getCompiledAttribute(text, lm, skipValue = false, start = 0) {
    let aStart = text.indexOf(lm, start);
    if (
      aStart === -1
      || (
        aStart === 0
        && !/\s/g.test(text[aStart - 1])
      )
    ) {
      return false;
    }

    if (skipValue) {
      const end = aStart + lm.length;
      return {
        name : {
          start: aStart,
          end: end,
        },
        value: {
          start: end,
          end
        }
      };
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
      return this.getCompiledAttribute(text, lm, skipValue, aEnd)
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

  compileExecutables(text) {
    let start = text.indexOf('{{');
    while (start !== -1) {
      let end = text.indexOf('}}', start);
      if (end === -1) {
        break;
      }
      const name = 'exec_' + start + '_' + end;
      this.__dito.actions.executables[name] = text.substr(start + 2, end - (start + 2));
      text = text.replaceAll(text.substr(start, end + 2 - start), '<span ' + name + '></span>');
      start = text.indexOf('{{', start + name.length);
    }

    return text;
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

    keys.push(node.$self.forBox.keyName || this.keyName);
    keys.push(node.$self.forBox.valueName || this.valueName);

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

    values.push(node.$self.forBox.key);
    values.push(node.$self.forBox.value);

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
