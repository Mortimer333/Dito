class Dito {
  url;
  styleNode;
  params = {};
  headers = {};
  components = {};
  registered = [];
  _SKIP = '_skip';
  notDownloaded = {};
  downloadCheck = {};
  localStorage = true;
  downloadFinished = false;
  firstRendered = new Map();

  constructor(settings = {}) {
    if (this.detectCSPRestriction()) {
      throw new Error('CSP restriction');
    }

    if (window.__dito) {
      throw new Error('There can be only one instance of Dito');
    }

    this.url = settings.url || window.location.origin;
    if (this.url[this.url.length - 1] != '/') {
      this.url += '/';
    }

    this.headers = settings.headers || this.headers;
    this.params = settings.params || this.params;
    this.callback = settings.callback || (() => {});
    this.arguments = settings.arguments || [];
    this.localStorage = typeof settings.localStorage != 'undefined' ? settings.localStorage : this.localStorage;
    this.styleNode = document.createElement('style');
    document.head.appendChild(this.styleNode);

    Object.defineProperty(window, "__dito", {
      value: {
        main: this,
        registered: {}
      },
      writable: false
    });

    this.defineMutationObserver();
    this.defineCustomEvents();
  }

  defineCustomEvents() {
    window.__dito.events = {};
    window.__dito.events.render = new CustomEvent("render", {
      detail: {},
      bubbles: false,
      cancelable: true,
      composed: false,
    });

    window.__dito.events.rendered = new CustomEvent("rendered", {
      detail: {},
      bubbles: false,
      cancelable: true,
      composed: false,
    });

    window.__dito.events.firstrender = new CustomEvent("firstrender", {
      detail: {},
      bubbles: false,
      cancelable: true,
      composed: false,
    });

    window.__dito.events.firstrendered = new CustomEvent("firstrendered", {
      detail: {},
      bubbles: false,
      cancelable: true,
      composed: false,
    });

    window.__dito.events.loadfinished = new CustomEvent("loadfinished", {
      detail: {},
      bubbles: false,
      cancelable: true,
      composed: false,
    });
  }

  /**
   * Mutation observer is used when two-way binding was set on native element
   */
  defineMutationObserver() {
    // Callback function to execute when mutations are observed
    const callback = mutationList => {
      for (const mutation of mutationList) {
        const binds = mutation?.target?.$self?.binds;
        if (mutation.type === 'attributes' || !binds || !binds[mutation.attributeName]) {
          return;
        }

        const {receiver, provider} = binds[mutation.attributeName];

        if (mutation.target.getAttribute(receiver.name) === provider.target.$[provider.name]) {
          return;
        }

        provider.target.$[provider.name] = mutation.target.getAttribute(receiver.name);
      }
    };

    const mutationObserver = new MutationObserver(callback);

    const config = { attributes: true };
    window.__dito.mutationObserver = node => {
      mutationObserver.observe(node, config)
    }
  }

  /**
   * Checks if all currently loading components have been loaded
   */
  allDownloaded() {
    if (
      this.downloadFinished
      || Object.values(this.downloadCheck).length > 0
      || !this.firstRendered.keys().next().done
    ) {
      return;
    }
    this.downloadFinished = true;
    this.callback(...this.arguments);
  }

  bulk(components, version, prefix = '') {
    if (!Array.isArray(components) && typeof components == 'object' && components !== null) {
      const keys = Object.keys(components);
      keys.forEach(key => {
        this.handleBulk(components[key], version, prefix + key);
      });
    } else if (Array.isArray(components)) {
      this.handleBulk(components, version, prefix);
    }
  }

  handleBulk(paths, version, prefix = '') {
    paths.forEach(component => {
      if (typeof component == 'string') {
        let force = false;
        if (component[0] === '!') {
          force = true;
          component = component.substring(1);
        }
        let absolute = (prefix + component).split('/');
        let absolutePrefix = absolute.slice(0,-1).join('/');
        if (absolutePrefix.length > 0) {
          absolutePrefix += '/';
        }
        this.register(
          absolute.slice(-1).join(''),
          version,
          absolutePrefix,
          force
        );
      } else {
        const keys = Object.keys(component);
        keys.forEach(key => {
          this.handleBulk(component[key], version, prefix + key);
        });
      }
    });
  }

  register(name, version, path = '', force = false) {
    if (name.indexOf('-') === -1) {
      throw new Error('Custom elements name must contain hyphen (-)');
    }

    window.__dito.registered[name] = true;
    const sheet = this.styleNode.sheet;
    const index = sheet.cssRules.length;
    sheet.insertRule(
      name + ':not([dito-ready]):not([dito-show]) {opacity: 0;}',
      sheet.cssRules.length
    );
    sheet.insertRule(
      name + '[dito-ready]:not([dito-show]) {opacity: 1; transition: opacity .5s;}',
      sheet.cssRules.length
    );

    // If it's not force and there is currently no instance of this component on site - don't retrieve it
    if (!force && !document.querySelector(name)) {
      this.notDownloaded[name] = { name, version, path };
      return;
    }

    this.registered.push(...this.createRegisterPromise(path, name, version, force));
  }

  getStorageName(name) {
    return '_dito_' + name;
  }

  createRegisterPromise(path, name, version, force = false) {
    let skip = false;
    if (this.localStorage && !force && localStorage.getItem(this.getStorageName(name))) {
      const comp = JSON.parse(localStorage.getItem(this.getStorageName(name)));
      if (comp._version == version) {
        skip = true;
      }
    }

    if (!force) {
      this.downloadCheck[name] = true;
    }

    path = this.url + path + name + '/' + name + '.';
    const js = import(path + 'js?v=' + version + this.getQuery());
    const html = skip ? Promise.resolve(this._SKIP) : this.fetch(path + 'html?v=' + version + this.getQuery());
    const css = skip ? Promise.resolve(this._SKIP) : this.fetch(path + 'css?v=' + version + this.getQuery());

    return [
      Promise.resolve(name + '_' + version),
      html.catch((error) => error),
      js.catch((error) => error),
      css.catch((error) => error)
    ];
  }

  async load(registered = null) {
    let clearRegistered = false;
    if (!registered) {
      clearRegistered = true;
      registered = this.registered;
    }

    await Promise.all(registered).then(async values => {
      for (var i = 0; i < values.length; i += 4) {
        const result = await this.handlePromies(values, i);
        if (!result) {
            continue;
        }

        let {promises, html, htmlSkipped, css, cssSkipped, js, component, version} = result;
        await Promise.all(promises).then(values => {
          if (!htmlSkipped && !cssSkipped) {
            html = values[0];
            css = values[1];
          } else if (!htmlSkipped) {
            css = values[0];
          } else if (!cssSkipped) {
            html = values[0];
          }

          this.saveComponent(component, JSON.stringify({ html, css, _version: version, _time: +new Date() }));

          const range = document.createRange();
          range.selectNodeContents(document.createElement('div')); // fix for safari

          ({ default: js } = js);
          this.defineDito(js, html, css);

          this.components[component] = {name: component, js, html, css};
          delete this.notDownloaded[component];
        });
      }

      this.defineElements();
      if (clearRegistered) {
        this.registered = [];
      }
    }).catch(err => console.error(err));
  }

  async handlePromies(values, i) {
    let html = values[i + 1];
    let js   = values[i + 2];
    let css  = values[i + 3];

    if (html.message || js.message || css.message) {
      console.error(
        'There was unexpected network error at #' + ((i/4) + 1) + '. Skipping...',
        html,
        js,
        css
      );
      return null;
    }

    if (typeof values[i] != 'string') {
      console.error('The name of component loaded as #' + ((i/4) + 1) + ' wasn\'t found. Skipping...');
      return null;
    }

    const compAndVer = (values[i].split('_')),
      version = compAndVer[compAndVer.length - 1],
      component = compAndVer.slice(0, -1).join('_');

    if (!await this.validateFiles(component, {html, css})) {
      return null;
    }

    const localComponent = JSON.parse(localStorage.getItem(this.getStorageName(component)) || 'false');
    if (!localComponent && (html === this._SKIP || css === this._SKIP)) {
      console.error(
        'The component `' + component + '` was marked as already loaded once but' +
        ' he is missing from localStorage. Skipping...'
      );
      return null;
    }

    let cssSkipped = false,
      htmlSkipped = false,
      promises = [];
    if (html === this._SKIP) {
      htmlSkipped = true;
      html = localComponent.html;
    } else {
      promises.push(html.text());
    }

    if (css === this._SKIP) {
      cssSkipped = true;
      css = localComponent.css;
    } else {
      promises.push(css.text());
    }

    return {promises, html, htmlSkipped, css, cssSkipped, js, component, version};
  }

  defineDito(js, html, css) {
    Object.defineProperty(js.prototype, "__dito", {
      value: {
        actions: {
          fors: {},
          for_keys: {},
          for_values: {},
          ifs: {},
          outputs: {},
          inputs: {},
          attrs: {},
          binds: {},
          events: {},
          executables: {},
          packs: {},
          unames: {},
          uses: {},
          gets: {},
          for_mins: {},
          for_min_defs: {}
        },
        css: {
          actions: {
            scopes: {},
            executables: {},
            templates: {}
          },
          content: '',
          scoped: [],
          global: [],
        },
      },
      writable: false
    });
    js.prototype.__dito.html = html;
    js.prototype.__dito.css.content = css;
  }

  saveComponent(key, data) {
    if (!this.localStorage) {
      return;
    }
    try {
      localStorage.setItem(this.getStorageName(key), data);
    } catch (e) {
      // Check if we didn't cross storage limit
      if (e.name.toLowerCase().match(/quota/)) {
        const lengthBefore = localStorage.length;
        this.removeOldestComponent();
        if (lengthBefore === localStorage.length) {
          console.error("Component `" + key + "` won't be cached because there is no space in localStorage");
          return;
        }
        this.saveComponent(key, data);
      }
    }
  }

  isDitoComponentKey(name) {
    return name.substring(0, 6) === '_dito_';
  }

  removeOldestComponent() {
    const oldest = {
      key: null,
      time: null,
    }
    for (let i=0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!this.isDitoComponentKey(key)) {
        continue;
      }
      const component = localStorage.getItem(key);
      if (!oldest.time) {
        oldest.time = component.time;
        oldest.key = key;
        continue;
      }

      if (oldest.time > component.time) {
        oldest.time = component.time;
        oldest.key = key;
      }
    }

    if (oldest.key) {
      localStorage.removeItem(oldest.key);
    }
  }

  defineElements() {
    Object.keys(this.components).forEach(tagName => {
      const component = this.components[tagName];
      if (!customElements.get(component.name) && typeof component.js == 'function') {
        customElements.define(component.name, component.js);
      }
    });
  }

  async validateFiles(component, compFiles) {
    const fileKeys = Object.keys(compFiles);
    for (var j = 0; j < fileKeys.length; j++) {
      const file = compFiles[fileKeys[j]];

      if (!file.ok && file !== this._SKIP) {
        const error = await file.text();
        console.error(
          key.toUpperCase() + " of component `" + component + "` returned an error: " + error + '. Skipping...'
        );
        return false;
      }
    }

    return true;
  }

  fetch(url) {
    let query = this.getQuery();
    if (url.indexOf('?') === -1) {
      url += '?';
      query = query.substring(1);
    }
    return fetch(url + query, {
      method: 'GET',
      headers: this.headers,
    });
  }

  getQuery() {
    let query = '';
    const keys = Object.keys(this.params);
    if (keys.length > 0) {
      keys.forEach(key => {
        query += '&' + key + '=' + encodeURIComponent(this.params[key]);
      });
    }
    return query;
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
          'It seems you are using the Dito in an ' +
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
export { Dito };
