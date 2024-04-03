class DitoElement extends HTMLElement {
  keyName = '$key';
  valueName = '$value';
  nodeName = '$node';
  eventName = '$event';
  indexAtr = 'dito-i';
  readyAtr = 'dito-ready';
  packAttrName = 'dito-pack';
  useNameAttrName = 'dito-use-name';
  timeAtr = 'dito-t';
  anchorAliasAttr = 'dito-anchor-alias';
  cachedScripts = {};

  constructor() {
    super();
    if (this.constructor === DitoElement) {
      throw new Error('DitoElement is an abstract and cannot be instantiated as separate class');
    }
    this.prepare();
    this.defineObservable();
    this.saveMethods();
    this.$self.cssQueueRenderInProgress = false;
    this.$self.queueRenderInProgress = false;
    this.defineCallback();
    this.defineCssCallback();
    this.defineDefaults();
  }

  prepare() {} // Before constructor starts but after HTMLElement constructor
  init() {} // After constructor finishes
  beforeRender() {} // Before render
  beforeFirstRender() {} // Before first render
  afterRender(result) {} // After render
  afterFirstRender(result) {} // After first render
  beforeCssRender() {} // Before CSS render
  afterCssRender(result) {} // After CSS render
  getDefaults() {} // Set component default attributes

  async connectedCallback() {
    if (!document.body.contains(this)) {
      return;
    }

    this.clearRenderQueue();

    if (!this.$self.rendered) {
      __dito.main.firstRendered.set(this, true);
      delete __dito.main.downloadCheck[this.localName];
      this.beforeFirstRenderActions();
      await this.init();
    }

    this.queueRender();
  }

  defineCallback() {
    this.$self.debounceRender = this.debounce(_ => {
      this.$self.queueRenderInProgress = false;
      this.render();
    });
  }

  defineCssCallback() {
    this.$self.debounceCssRender = this.debounce(_ => {
      this.$self.cssQueueRenderInProgress = false;
      this.cssRender();
    });
  }

  defineDefaults() {
    const defaults = this.getDefaults() || {},
        types = {
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
        }
    ;

    Object.defineProperty(this.$self, 'default', {
      value: defaults,
      writable: false,
    });

    Object.keys(defaults).forEach(key => {
      const attr = defaults[key],
          type = attr.type || 'append'
      ;

      if (!types[type]) {
        console.error('Attribute "create" `' + type + '` is not supported');
        return;
      }

      types[type](key, attr);
    });
  }

  beforeFirstRenderActions() {
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
    properties.forEach(methodName => {
      if (typeof this[methodName] != 'function' || methodName == 'constructor') {
        return;
      }

      this.methods[methodName] = this[methodName].bind(this);
    });
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
    this.$self.cssQueueRenderInProgress = true;
    this.$self.debounceCssRender();
  }

  clearCssRenderQueue() {
    this.$self.cssQueueRenderInProgress = false;
    this.$self.debounceCssRender('clear');
  }

  defineObservable() {
    Object.defineProperty(this, '$', {
      value: new Proxy({}, {
        tag: this,
        set(obj, prop, value) {
          if (prop[0] == '$') {
            throw new Error('You can\'t create variables on this.$ starting with `$`, it\'s a taken prefix');
          }

          if (value !== obj[prop]) {
            this.tag.queueRender();
          }

          if (this.tag.$bound[prop]) {
            const { provider } = this.tag.$bound[prop];
            provider.target.$[provider.name] = value;
          }

          return Reflect.set(...arguments);
        },
      }),
      writable: false,
    });

    Object.defineProperty(this, '$bound', {
      value: {},
      writable: true,
    });

    Object.defineProperty(this, '$binder', {
      value: {},
      writable: true,
    });

    Object.defineProperty(this, '$css', {
      value: new Proxy({}, {
        tag: this,
        set(obj, prop, value) {
          if (prop[0] == '$') {
            throw new Error('You can\'t create variables on this.$css starting with `$`, it\'s a taken prefix');
          }

          if (value !== obj[prop]) {
            this.tag.queueCssRender(prop);
          }

          return Reflect.set(...arguments);
        },
      }),
      writable: false,
    });

    if (!this.$output) {
      this.defineOutput(this);
    }

    if (!this.$self) {
      this.defineSelf(this);
    }
  }

  defineSelf(obj) {
    Object.defineProperty(obj, '$self', {
      value: {
        attributes: {},
        actions: {},
        setEvents: {},
        children: [],
        binds: {},
        css: {
          compiled: false,
          indices: [],
          path: null,
          rendered: false,
          queueRenderInProgress: false,
          scoped: null,
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
          valueName: null,
          anchor: null,
          index: null,
          anchors: [],
        },
        forNodes: [],
        injected: [],
        injectedPacks: {},
        parent: null,
        injectedParent: {},
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
      writable: true,
    });
  }

  defineOutput(obj) {
    Object.defineProperty(obj, '$output', {
      value: {},
      writable: true,
    });
  }

  compileCSS() {
    this.__dito.css.content = this.compileCSSExecutables(this.__dito.css.content);
    this.categorizeCssRules();
    this.__dito.compiledCSS = true;
  }

  categorizeCssRules() {
    const css = this.__dito.css,
        rules = this.separateRules(css.content)
    ;
    css.scoped = [];
    css.global = [];
    rules.forEach(rule => {
      if (rule.indexOf('@self') !== -1) {
        css.scoped.push({
          rule,
          index: -1,
        });
      } else {
        css.global.push({
          rule,
          index: -1,
        });
      }
    });

    const sheet = __dito.main.styleNode.sheet;
    css.global.forEach(rule => {
      rule.index = sheet.cssRules.length;
      sheet.insertRule(rule.rule, rule.index);
    });
  }

  separateRules(css) {
    let inRule = false,
        lastEnd = 0,
        nested = 0
    ;
    const rules = [];

    for (let i = 0; i < css.length; i++) {
      const letter = css[i];

      if (!inRule && letter === '{') {
        inRule = true;
        continue;
      }

      if (!inRule) {
        continue;
      }

      const stringLm = {
        '"': true,
        '\'': true,
        '`': true,
      };

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

        rules.push(css.substring(lastEnd, i + 1).trim());
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

      this.__dito.css.actions.executables[name] = css.substring(start + 2, end);
      css = css.replaceAll(css.substring(start, end + 2), name);
      start = css.indexOf('{{', start + name.length);
    }
    return css;
  }

  async cssRender() {
    const css = this.$self.css;
    if (css.queueRenderInProgress || !document.body.contains(this)) {
      return;
    }

    this.clearCssRenderQueue();
    await this.beforeCssRender();
    try {
      if (!this.__dito.compiledCSS) {
        this.compileCSS();
      }

      if (!css.scoped) {
        css.scoped = JSON.parse(JSON.stringify(this.__dito.css.scoped));
      }

      const sheet = __dito.main.styleNode.sheet;
      css.scoped.forEach(rule => {
        const ruleCss = rule.rule.replaceAll('@self', css.path),
            cssRules = this.resolveCssExecutables(ruleCss)
        ;
        if (rule.index === -1) {
          rule.index = sheet.cssRules.length;
          sheet.insertRule(cssRules, sheet.cssRules.length);
        } else {
          sheet.deleteRule(rule.index);
          sheet.insertRule(cssRules, rule.index);
        }
      });
      await this.afterCssRender({ success: true });
      css.rendered = true;
    } catch (e) {
      await this.afterCssRender({ success: false, error: e });
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
    const self = this.$self;
    if (!force && (self.queueRenderInProgress || self.rendering || !document.body.contains(this))) {
      if (!document.body.contains(this)) {
        this.dispatchEvent(__dito.events.loadfinished);
      }
      return;
    }

    if (self.parent?.$self?.rendering) {
      this.queueRender();
      return;
    }

    // TODO
    // if (self.parent) {
    //   const injectParent = this.isInjected.bind(self.parent)(this);
    //   console.log(this.localName, injectParent)
    //   if (injectParent && (injectParent?.$self?.rendering || !injectParent?.$self?.rendered)) {
    //     console.log('queue')
    //     this.queueRender();
    //     return;
    //   }
    // }

    this.clearRenderQueue();

    self.rendering = true;
    let res = false;
    if (document.querySelector(self.css.path) !== this) {
      this.setCssScope();
    }

    await this.beforeRender();
    if (!self.rendered) {
      await this.beforeFirstRender();
      this.dispatchEvent(__dito.events.firstrender);
    } else {
      this.dispatchEvent(__dito.events.render);
    }

    try {
      if (!this.__dito.compiledHTML) {
        this.compile();
      }

      if (!self.rendered) {
        if (!self.default.injected) {
          self.default.injected = Object.values(this.childNodes);
        }
        this.innerHTML = this.__dito.html;
        this.assignChildren(this);
        this.retrieveBoundValues();
        this.renderInjected(this);
        if (!self.css.rendered) {
          await this.cssRender();
        }
      }

      self.children.forEach(child => {
        try {
          this.actionIf(child, child.$self?.actions?.ifs || []);
        } catch (e) {
          console.error('If error', e);
        }
      });

      self.forNodes.forEach(child => {
        try {
          this.actionFor(child);
        } catch (e) {
          console.error('For error', e);
        }
      });

      this.searchForNotDownloaded(this);
      const promises = [];
      this.querySelectorAll(Object.keys(__dito.registered).join(', ')).forEach(custom => {
        if (!custom.$self) {
          this.defineSelf(custom);
        }

        if (!custom.$self.parent) {
          custom.$self.parent = this;
        }

        if (!self.rendered) {
          promises.push(new Promise(resolve => {
            const fn = e => {
              custom.removeEventListener('loadfinished', fn, true);
              resolve();
            };
            custom.addEventListener('loadfinished', fn, true);
          }));
        }
      });

      while (self.uniqueChildren.length > 0) {
        this.setupUnique(self.uniqueChildren[0]);
        self.uniqueChildren.splice(0, 1);
      }

      for (let i=0; i < self.children.length; i++) {
        const child = self.children[i];
        if (this.shouldRemoveChild(child)) {
          self.children.splice(i, 1);
          i--;
        } else {
          this.actionItem(child);
        }
      };

      // @todo Might be good idea to update binds before item actions
      this.updateBinds();

      await this.afterRender({ success: true });
      if (promises.length > 0) {
        Promise.all(promises).then(e => {
          this.dispatchEvent(__dito.events.loadfinished);
        });
      } else {
        this.dispatchEvent(__dito.events.loadfinished);
      }
      if (!self.rendered) {
        await this.afterFirstRender({ success: true });
        this.dispatchEvent(__dito.events.firstrendered);
        __dito.main.firstRendered.delete(this);
        self.rendered = true;
        __dito.main.allDownloaded();
        this.setAttribute(this.readyAtr, '1');
      } else {
        this.dispatchEvent(__dito.events.rendered);
      }
      res = true;
    } catch (e) {
      console.error('There was an error during rendering', e, this);
      await this.afterRender({ success: false, error: e });
    }
    self.rendering = false;
    return res;
  }

  shouldRemoveChild(child) {
    if (document.contains(child)) {
      return false;
    }

    const isInIf = this.isInIf(child, true);
    if (
        isInIf
        && (
            document.contains(isInIf)
            || document.contains(isInIf.$self?.if?.replacement)
        )
    ) {
      return false;
    }

    if (child.$self.injectedParent instanceof Node && document.contains(child.$self.injectedParent)) {
      return false;
    }

    return true;
  }

  actionItems(node, currentScope, forAnchor = false) {
    if (node.$self) {
      if (!forAnchor && currentScope.isInjected(node)) {
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
      this.actionItems(child, currentScope, forAnchor);
    });
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

  renderInjected(item, scope = this, forAnchor = false, forIndex = false) {
    console.log('rrender ========')
    let rendered = [];
    const found = scope.querySelectorAll('dito-inject');
    found.forEach(inject => {
      const parent = inject?.$self?.parent || this;
      if (!inject.$self) {
        this.defineSelf(inject);
        inject.$self.parent = parent;
      }
      if (this.isInjected(inject)) {
        return;
      }
      const uses = inject.$self?.actions?.uses;
      let use = null;
      if (uses?.length > 1) {
        throw new Error('Dito inject can have only one use variable');
      }

      if (uses?.length > 0) {
        use = this.getExecuteable(uses[0], inject)(...this.getObservablesValues(inject));
      }

      if (inject.$self?.actions?.packs?.length > 0) {
        inject.$self.actions.packs.forEach(function (pack) {
          pack = this.getExecuteable(pack, inject)(...this.getObservablesValues(inject));
          this.$self.default.injected.forEach(template => {
            if (template.nodeType === 3 || !template.getAttribute(this.packAttrName)) {
              return;
            }

            const packName = this.getExecuteable(
                template.getAttribute(this.packAttrName),
                item,
            )(...this.getObservablesValues(item));

            if (packName != pack) {
              return;
            }

            const [, subRendered] = this.initInjected(inject, template, use, uses, forAnchor, forIndex);
            rendered = rendered.concat(subRendered);
          });
        }.bind(parent));
      } else {
        inject.$self.parent.$self.default.injected.forEach(function (template) {
          const [, subRendered] = this.initInjected(inject, template, use, uses, forAnchor, forIndex);
          rendered = rendered.concat(subRendered);
        }.bind(parent));
      }
      inject.remove();
    });

    if (found.length > 0 && rendered.length > 0) {
      rendered = rendered.concat(this.renderInjected(item, scope, forAnchor, forIndex));
    }

    return rendered;
  }

  initInjected(inject, template, use, uses, forAnchor, forIndex) {
    let scope = null,
        useName = 'use',
        rendered = []
    ;
    const forActions = [],
        toRender = [],
        tag = this
    ;
    if (use && template.getAttribute && template.getAttribute(this.useNameAttrName)) {
      useName = template.getAttribute(this.useNameAttrName);
      scope = { [useName]: use };
    } else if (use) {
      scope = { use };
    }

    const node = this.cloneNodeRecursive(template, function(template, node) {
      if (!template.$self.parent) {
        return;
      }
      node.$self = Object.assign({}, template.$self);
      node.$self.injectedParent = tag;
      node.$self.setEvents = {};
      node.$self.toBind = [];
      node.$self.rendered = false;
      node.$self.actions.uses = template.$self?.actions?.uses || { value: uses, name: useName };
      node.$self.css = {
        compiled: false,
        indices: [],
        path: null,
        rendered: false,
        queueRenderInProgress: false,
        scoped: null,
      };
      node.$binder = {};
      node.$bound = {};
      if (template.$self.for.anchor) {
        template.$self.for.anchor.$self.children[template.$self.for.index] = node;
      }

      if (node.$self.if?.isReplacement) {
        node.$self.if.parent.$self.if.replacement = node;
      }

      if (template.$output) {
        node.$output = Object.assign({}, template.$output);
      }

      if (scope) {
        node.$self.scope = Object.assign({}, node.$self.scope, scope);
        template.$self.scope = Object.assign({}, node.$self.scope);
      }

      if (__dito.main.firstRendered.get(template)) {
        __dito.main.firstRendered.delete(template);
      }

      if (__dito.main.components[node.localName]) {
        toRender.push(node);
      }

      if (node.getAttribute && node.getAttribute(this.useNameAttrName)) {
        node.removeAttribute(this.useNameAttrName);
      }

      node.$self.children = [];
      if (node.$self.for.parent) {
        node.$self.for.parent.$self.for.anchors.push(node);
        node.$self.parent.$self.forNodes.push(node.$self.for.parent);
        forActions.push([node.$self.for.parent, node.$self.parent]);
        template.$self.children.forEach(child => {
          child.remove();
        });
        node.$self.forBox.injectParent = forAnchor;
        node.$self.forBox.injectIndex = forIndex;
      }

      rendered.push(node);
      node.$self.parent.$self.children.push(node);
      node.$self.parent.queueRender();
    }.bind(this.$self.parent));
    if (!node) {
      throw new Error('Injected node wasn\'t properly cloned');
    }

    inject.parentElement.insertBefore(node, inject);
    forActions.forEach(child => {
      child[1].actionFor(child[0]);
    });

    toRender.forEach(child => {
      child.setCssScope();
      child.defineCallback();
      child.defineCssCallback();
      child.queueRender();
    });
    if (node.$self) {
      node.$self.parent?.actionItems(node, this, forAnchor);
    } else {
      this.$self.parent?.actionItems(node, this, forAnchor);
    }

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
    item.$self.getName = null;
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

      item.$output[action.name] = {
        emit: async function(e) {
          const parent = this.$self.parent,
              observableKeys = this.getObservablesKeys.bind(parent)(item),
              valuesBefore = this.getObservablesValues.bind(parent)(item)
          ;
          try {
            let res = await this.getFunction.bind(parent)(action.value, item, [this.eventName]).bind(parent);
            res = await res(e, ...valuesBefore);
            this.updateChangedValues.bind(parent)(res.slice(0, -1), observableKeys, valuesBefore);
            return res[res.length - 1];
          } catch (e) {
            console.error('Error on output', e);
          }
        }.bind(item),
      };
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
        if (__dito.registered[item.localName]) {
          const input = this.$self.toInput.get(item);
          if (input) {
            this.$self.toInput.set(item, [...input, action]);
          } else {
            this.$self.toInput.set(item, [action]);
          }
        } else {
          console.error(
              'Selected node ' + item.localName + ' was not made with Dito library and can\'t have assigned input',
          );
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

    actions.forEach(action => {
      if (typeof this.$[action.value] == 'undefined') {
        console.error(
            'Observable in `' + this.constructor.name + '` doesn\'t have `'
            + action.value + '` variable, skipping binding...',
        );
        return;
      }

      if (!item.$) {
        if (__dito.registered[item.localName]) {
          this.$self.toBind.push({ bind: action, node: item });
        } else if (typeof item[action.name] != undefined) {
          this.setupNativeBind(item, action);
        }
      } else {
        this.setBind(action, item);
      }
      this.$self.children.push(item);
    });
  }

  setupNativeBind(node, action) {
    const { name, value } = action;
    node.setAttribute(name, this.$[value]);

    if (!node.$self) {
      this.defineSelf(node);
    }

    const item = this.generateBindItem(node, value, name);
    if (this.$binder[value]) {
      this.$binder[value].push(item);
    } else {
      this.$binder[value] = [item];
    }

    node.$self.binds[name] = item;

    // Mutation for attributes like class (outside) and change for attributes like value (inside)
    this.setMutationObserver(node);
    node.addEventListener('change', _ => {
      if (this.$[value] === node[name] || typeof node[name] == 'undefined') {
        return;
      }

      this.$[value] = node[name];
    });
  }

  retrieveBoundValues() {
    if (this.$self.parent) {
      this.checkBinds.bind(this.$self.parent)();
    }
  }

  checkBinds() {
    const toBind = this.$self.toBind;
    for (let i = 0; i < toBind.length; i++) {
      const item = toBind[i];
      if (item.node.$) {
        this.setBind(item.bind, item.node);
        toBind.splice(i, 1);
        i--;
      }
    }
  }

  generateBindItem(target, providerName, name) {
    return {
      provider: {
        target: this,
        name: providerName,
      },
      receiver: {
        target,
        name,
      },
    };
  }

  setBind(bind, node) {
    const { name, value } = bind;
    node.$[name] = this.$[value];
    const item = this.generateBindItem(node, value, name);
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
        const { receiver, provider } = bind,
            child = receiver.target
        ;
        if (__dito.registered[child.localName]) {
          receiver.target.$[receiver.name] = this.$[provider.name];
          return;
        }

        if (typeof child[receiver.name] != 'undefined') {
          child[receiver.name] = this.$[provider.name];
        } else if (typeof child.getAttribute(receiver.name) != 'undefined') {
          child.setAttribute(receiver.name, this.$[provider.name]);
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
        const observableKeys = this.getObservablesKeys(item),
            valuesBefore = this.getObservablesValues(item),
            res = this.getFunction(action.value, item, [this.eventName])(e, ...valuesBefore);
        this.updateChangedValues(res, observableKeys, valuesBefore);
      };
      item.$self.setEvents[action.name].push(fun);
      item.addEventListener(action.name, fun, false);
    });
  }

  tearEvents(item) {
    const actions = item.$self?.setEvents,
        keys = Object.keys(actions)
    ;
    if (keys.length == 0) {
      return;
    }

    keys.forEach(actionName => {
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
      this.actionIf(item, actions.ifs || []);
    } catch (e) {
      console.error('If error', e);
    }

    try {
      this.actionAttrs(item, actions.attrs || []);
    } catch (e) {
      console.error('Attr error', e);
    }

    try {
      this.actionExecutables(item, actions.executables || []);
    } catch (e) {
      console.error('Exec error', e);
    }

    try {
      this.setupInputs(item);
    } catch (e) {
      console.error('Input error', e);
    }

    if (item.queueRender) {
      item.queueRender();
    }
  }

  isInIf(node, inDocument = false, top = true) {
    let res;
    if (node.$self?.actions?.ifs && this.onlyIfInDocument(node, inDocument)) {
      res = node;
    } else if (node.parentElement) {
      res = this.isInIf(node.parentElement, inDocument, false);
    } else if (node.$self?.if?.replacement?.parentElement) {
      res = this.isInIf(node.$self?.if?.replacement?.parentElement, inDocument, false);
    } else {
      res = false;
    }

    return res;
  }

  onlyIfInDocument(node, inDocument) {
    return !inDocument
        || (
            inDocument
            && (
                document.contains(node)
                || document.contains(node.$self?.if?.replacement)
            )
        );
  }

  actionFor(node) {
    if (!node.$self.for) {
      throw new Error('Node marked as for doesn\'t have required values');
    }

    const { condition, anchors } = node.$self.for;

    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];

      if (!document.body.contains(anchor.parentElement)) {
        if (anchors.length > 1 && !this.isInIf(anchor)) {
          node.$self.for.anchors.splice(i, 1);
          i--;
        }
        continue;
      }

      if (!anchor.$self.forGenerated) {
        anchor.$self.forGenerated = [];
      }

      if (!anchor.$self.anchorGenerated) {
        anchor.$self.anchorGenerated = [];
      }

      let res = this.getExecuteable(condition, anchor)(...this.getObservablesValues(anchor)),
          type = typeof res
      ;
      if (type == 'string') {
        res = res * 1;
        type = typeof res;
      }

      let keys, values;
      if ((type != 'number' && type != 'object') || (isNaN(res) && type != 'object')) {
        console.error(
            'For in `' + this.constructor.name + '` doesn\'t have iterable value, removing node...',
            condition,
        );
        node.remove();
        return;
      } else {
        if (type == 'number') {
          res = new Array(res).fill(null);
        }

        if (node.$self.for?.min) {
          const min = this.getExecuteable(node.$self.for.min, anchor)(...this.getObservablesValues(anchor));
          let item = undefined;
          if (node.$self.for?.minDef) {
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

      this.renderFor(node, anchor, values, keys);
    }
  }

  renderFor(node, anchor, values, keys) {
    if (keys.length < anchor.$self.children.length) {
      anchor.$self.children.splice(keys.length).forEach(child => {
        this.removeFromChildren(child);
      });
      anchor.$self.anchorGenerated.splice(keys.length);
      anchor.$self.forGenerated.splice(keys.length);
    }

    const tmpParent = document.createElement('div');
    anchor.$self.forGenerated.forEach((generatedChildren, i) => {
      const key = keys[i],
          value = values[i]
      ;
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
          console.log('use', use, uses.value, child, this.getObservablesValues(child), this.getObservablesKeys(child))
          child.$self.scope[uses.name] = use;
          child.$self.parent.actionItem(child);
        }
      });
    });

    anchor.$self.anchorGenerated.forEach((subAnchors, i) => {
      const key = keys[i],
          value = values[i]
      ;
      subAnchors.forEach(subAnchor => {
        if (node.$self.forBox.keyName) {
          subAnchor.$self.scope[node.$self.forBox.keyName] = key;
        }

        if (node.$self.forBox.valueName) {
          subAnchor.$self.scope[node.$self.forBox.valueName] = value;
        }

        this.actionFor(subAnchor.$self.for.parent);
      });
    });

    const actions = this.__dito.actions;
    for (var i = anchor.$self.children.length; i < keys.length; i++) {
      const key = keys[i],
          value = values[i],
          clone = node.cloneNode(true)
      ;
      anchor.$self.forGenerated[i] = [];
      tmpParent.appendChild(clone);
      this.iterateOverActions(tmpParent, (action, alias, child) => {
        child = this.defineChild(child, action, alias, actions[action][alias]);
        if (!child.$self.forBox.isItem) {
          child.$self.forBox = Object.assign(child.$self.forBox, {
            isItem: true,
            key: key,
            value: value,
            keyName: node.$self.forBox.keyName,
            valueName: node.$self.forBox.valueName,
          });
          child.$self.scope = Object.assign({}, anchor.$self.scope, child.$self.scope);
          anchor.$self.forGenerated[i].push(child);
        }
      });

      anchor.parentElement.insertBefore(clone, anchor);
      anchor.$self.anchorGenerated[i] = [];

      // Nested fors
      node.$self.forBox.anchors.forEach(path => {
        const newAnchor = clone.querySelector(path),
            realAnchor = node.querySelector(path)
        ;
        if (!newAnchor || !realAnchor) {
          throw new Error('No anchor found!');
        }

        const newTextA = this.reconstructForAnchor(newAnchor, realAnchor);
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
        this.actionFor(newTextA.$self.for.parent);
      });

      if (!clone.$self) {
        this.defineSelf(clone);
        clone.$self.parent = this;
        clone.$self.for.anchor = anchor;
        clone.$self.for.index = i;
      }
      anchor.$self.children.push(clone);

      if (this.$self.parent) {
        const rendered = this.renderInjected(this.$self.parent, clone, anchor, i);
        anchor.$self.forGenerated[i] = anchor.$self.forGenerated[i].concat(rendered);
      }
    }

    if (anchor.nodeType !== 3) {
      const newAnchor = this.reconstructForAnchor(anchor, anchor);
      if (anchor.$self.forBox.injectParent) {
        anchor.$self.forBox.injectParent.$self.forGenerated[anchor.$self.forBox.injectIndex].push(newAnchor);
      }
    }
  }

  isInUnique(item) {
    return this.$self.uniqueChildren.includes(item);
  }

  removeFromChildren(item) {
    const removed = [],
        children = (item.$self ? item.$self.parent : this).$self.children
    ;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (item.contains(child) || item === child) {
        removed.push(child);
        children.splice(i, 1);
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
    realAnchor.$self.children.forEach((child, i) => {
      child.$self.for.anchor = newAnchor;
      child.$self.for.index = i;
    });

    return newAnchor;
  }

  actionExecutables(node, actions) {
    if (actions.length > 1) {
      throw new Error('There can only be one execute script on single node');
    }

    if (actions.length == 0) {
      return;
    }

    node.nodeValue = this.getExecuteable(actions[0], node)(...this.getObservablesValues(node));
  }

  actionAttrs(node, actions) {
    actions.forEach(action => {
      let value = this.getExecuteable(action.value, node)(...this.getObservablesValues(node));
      if (action.name === 'src' && !value) {
        value = '';
      }
      node.setAttribute(action.name, value);
    });
  }

  actionIf(node, actions) {
    if (actions.length > 1) {
      throw new Error('There can only be one "if" on single node');
    }

    if (actions.length == 0) {
      return;
    }

    if (!node.$self.if) {
      const replacement = document.createTextNode('');
      node.$self.if = {
        condition: actions[0],
        replacement,
      };
      this.defineSelf(replacement);
      replacement.$self.parent = this;
      replacement.$self.if = {
        isReplacement: true,
        parent: node,
      };
    }

    const rep = node.$self.if.replacement;
    if (!document.body.contains(rep) && !document.body.contains(node)) {
      return;
    }

    const res = this.getExecuteable(node.$self.if.condition, node)(...this.getObservablesValues(node));
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
    const actions = this.__dito.actions,
        forKeys = Object.keys(actions.fors)
    ;
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
    const actions = this.__dito.actions,
        aliases = [],
        keys = [],
        values = []
    ;
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

    const alias = aliases[0],
        anchor = document.createElement('a')
    ;
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

    node.$self.forBox.anchors = this.getAnchorPaths(node); // Save nested fors to action them later in renderFor

    if (!this.isInjected(node)) {
      this.$self.forNodes.push(node);
    } else {
      // Reset attribute on old anchor, so script picks them up again
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
      minDef,
    };
  }

  isInjected(node) {
    const copy = { ...__dito.registered };
    delete copy[this.localName];
    const keys = Object.keys(copy),
        path = this.$self.css.path
    ;
    if (keys.length === 0) {
      return false;
    }

    const all = path + ' ' + keys.join(' [dito-find-me], ' + path + ' ') + ' [dito-find-me]';

    if (node.nodeType !== 3) {
      node.setAttribute('dito-find-me', '');
    } else {
      node.parentElement.setAttribute('dito-find-me', '');
    }

    let res = this.querySelector(all);
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
    Object.keys(actions).forEach(action => {
      if (action === 'fors') {
        return;
      }
      Object.keys(actions[action]).forEach(alias => {
        parent.querySelectorAll('[' + alias + ']').forEach(node => {
          callback(action, alias, node);
        });
      });
    });
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
      'events': true,
      'binds': true,
      'outputs': true,
      'gets': true,
    };

    if (unique[actionName]) {
      if (!this.$self.uniqueChildren.includes(node)) {
        this.$self.uniqueChildren.push(node);
      }
    } else if (!this.$self.childNodes.get(node) && !this.isInjected(node)) {
      this.$self.children.push(node);
      this.$self.childNodes.set(node, true);
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
      this.$self.uniqueNodes.set(node, true);
    }

    return node;
  }

  searchForNotDownloaded(parent) {
    const notDownloaded = __dito.main.notDownloaded,
        keys = Object.keys(notDownloaded)
    ;
    if (keys.length == 0) {
      return;
    }

    const promises = [];
    parent.querySelectorAll(keys.join(',')).forEach(node => {
      if (notDownloaded[node.localName]) {
        const component = notDownloaded[node.localName];
        delete notDownloaded[node.localName];
        promises.push(...__dito.main.createRegisterPromise(component.path, component.name, component.version));
      }
    });

    if (promises.length > 0) {
      __dito.main.load(promises);
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
    let attr,
        start = 0,
        { hasName, isCss, skipValue, replace } = settings,
        action = isCss ? this.__dito.css.actions[attrName] : this.__dito.actions[attrName]
    ;

    while (attr = this.getCompiledAttribute(text, lm, skipValue, start)) {
      const { name, value } = attr,
          plc = replace || prefix + name.start + '-' + value.end
      ;
      if (hasName) {
        action[plc] = {
          name: text.substring(name.start + lm.length, name.end).trim(),
          value: text.substring(value.start + 1, value.end),
        };
      } else {
        action[plc] = text.substring(value.start + 1, value.end);
      }
      text = text.replaceAll(text.substring(name.start, value.end + 1), plc);
    }

    return text;
  }

  getCompiledAttribute(text, lm, skipValue = false, start = 0) {
    const aStart = text.indexOf(lm, start);
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
        name: {
          start: aStart,
          end: end,
        },
        value: {
          start: end,
          end,
        },
      };
    }

    const aEnd = text.indexOf('=', aStart);
    if (aEnd === -1) {
      return false;
    }

    const strings = {
          '"': true,
          '\'': true,
          '`': true,
        },
        wrapper = strings[text[aEnd + 1]]
    ;
    if (!wrapper) {
      console.error(
          'String wrapper for `' + lm + '` in `' + this.constructor.name
          + '` not found (found letter: `' + text[aEnd + 1] + '`), skipping',
      );
      return this.getCompiledAttribute(text, lm, skipValue, aEnd);
    }

    return {
      name: {
        start: aStart,
        end: aEnd,
      },
      value: {
        start: aEnd + 1,
        end: this.getStringEnd(text, text[aEnd + 1], aEnd + 2),
      },
    };
  }

  getStringEnd(text, sLandmark, start = 0) {
    const pos = text.indexOf(sLandmark, start);
    if (text[pos - 1] == '\\') {
      return this.getStringEnd(text, sLandmark, pos + 1);
    }

    return pos;
  }

  compileExecutables(text) {
    let start = text.indexOf('{{');
    while (start !== -1) {
      const end = text.indexOf('}}', start);
      if (end === -1) {
        break;
      }
      const name = 'exec_' + start + '_' + end;
      this.__dito.actions.executables[name] = text.substring(start + 2, end);
      text = text.replaceAll(text.substring(start, end + 2), '<span ' + name + '></span>');
      start = text.indexOf('{{', start + name.length);
    }

    return text;
  }

  cacheScript(cacheKey, script, keys) {
    this.cachedScripts[cacheKey] = new Function(...keys, script).bind({});
  }

  getExecuteable(script, node) {
    script = 'return ' + script;
    const keys = this.getObservablesKeys(node),
        cacheKey = keys.join(',') + script
    ;
    if (!this.cachedScripts[cacheKey]) {
      this.cacheScript(cacheKey, script, this.getObservablesKeys(node));
    }

    return this.cachedScripts[cacheKey];
  }

  getCSSExecuteable(script) {
    script = 'return ' + script;
    const keys = this.getCSSObservablesKeys(),
        cacheKey = keys.join(',') + script
    ;
    if (!this.cachedScripts[cacheKey]) {
      this.cacheScript(cacheKey, script, keys);
    }

    return this.cachedScripts[cacheKey];
  }

  getFunction(script, node, vars = []) {
    const keys = this.getObservablesKeys(node);
    if (script.length === 0) {
      script = 'null';
    }
    script = 'const $result = ' + script + '; return [' + keys.join(',') + ', $result];';

    const cacheKey = keys.join(',') + script;

    if (!this.cachedScripts[cacheKey]) {
      this.cacheScript(cacheKey, script, [...vars, ...keys]);
    }

    return this.cachedScripts[cacheKey];
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

  getCSSObservablesKeys() {
    return [
      ...Object.keys(this.methods),
      ...Object.keys(this.$css),
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

  getInjectedScopes(parent) {
    let scope = {};
    if (parent?.$self?.injectedParent) {
      scope = Object.assign({}, this.getInjectedScopes(parent.$self.injectedParent), scope);
    }

    if (parent?.$self?.scope) {
      scope = Object.assign({}, parent.$self.scope, scope);
    }

    return scope;
  }

  getCSSObservablesValues() {
    return [
      ...Object.values(this.methods),
      ...Object.values(this.$css),
    ];
  }

  setMutationObserver(node) {
    __dito.mutationObserver(node);
  }

  debounce(func, timeout = 10) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      if (args[0] === 'clear') {
        return;
      }

      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  }
}

export { DitoElement };
