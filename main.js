class Dito {
  url;
  localStorage = true;
  filename = 'main';
  headers = {};
  params = {};
  components = {};
  registered = [];
  notDownloaded = {};
  _SKIP = '_skip';
  styleNode;

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
    this.params = settings.params || this.params;
    this.localStorage = typeof settings.localStorage != 'undefined' ? settings.localStorage : this.localStorage;
    this.styleNode = document.createElement('style');
    document.head.appendChild(this.styleNode);

    Object.defineProperty(window, "__jmonkey", {
        value: {
          main: this,
          registered: {}
        },
        writable: false
    });
  }

  register(name, version, path = '', force = false) {
    if (name.indexOf('-') === -1) {
      throw new Error('Custom elements name must contain hyphen (-)');
    }

    // If it's not force and there is currently no instance of this component on site - don't retrieve it
    if (!force && !document.querySelector(name)) {
      this.notDownloaded[name] = { name, version, path };
      return;
    }

    this.registered.push(...this.createRegisterPromise(path, name, version, force));
  }

  createRegisterPromise(path, name, version, force = false) {
    let skip = false;
    if (this.localStorage && !force && localStorage.getItem(name)) {
      const comp = JSON.parse(localStorage.getItem(name));
      if (comp._version == version) {
        skip = true;
      }
    }

    path = this.url + path + name + '/' + this.filename + '.';
    const js = import(path + 'js?v=' + version + this.getQuery());
    const html = skip ? Promise.resolve(this._SKIP) : this.fetch(path + 'html?v=' + version);
    const css = skip ? Promise.resolve(this._SKIP) : this.fetch(path + 'css?v=' + version);
    window.__jmonkey.registered[name] = true;
    return [
      Promise.resolve(name + '_' + version),
      html.catch((error) => error),
      js.catch((error) => error),
      css.catch((error) => error)
    ];
  }

  async load(registered = null) {
    if (!registered) {
      registered = this.registered;
    }

    const skipSize = 3;
    await Promise.all(registered).then(async values => {
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
        if (!localComponent && (html === this._SKIP || css === this._SKIP)) {
          console.error(
            'The component `' + component + '` was marked as already loaded once but' +
            ' he is missing from localStorage. Skipping...'
          );
          i += skipSize;
          continue;
        }

        let cssSkipped = false;
        let htmlSkipped = false;
        const promises = [];
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

        await Promise.all(promises).then((values) => {
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
          js.prototype.__jmonkey.css = css;
          this.components[component] = {name: component, js, html, css, cssInjected: false, _cssSkipped: cssSkipped };
          i += skipSize;
          delete this.notDownloaded[component];

        });

      }

      this.defineElements(document);
      registered = [];
    }).catch(err => console.error(err));
  }

  saveComponent(key, data) {
    if (!this.localStorage) {
      return;
    }
    try {
      localStorage.setItem(key, data);
    } catch (e) {
      if (e.name.toLowerCase().match(/quota/)) {
        if (localStorage.length == 0) {
          console.error("Component `" + key + "` won't be cached because of his size (over 5mb)");
          return;
        }
        this.removeOldestComponent();
        this.saveComponent(key, data);
      }
    }
  }

  removeOldestComponent() {
    const oldest = {
      key: null,
      time: null,
    }
    for (let i=0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
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

  defineElements(parent, skip = {}) {
    Object.keys(this.components).forEach(function(tagName) {
      const component = this.components[tagName];
      if (!customElements.get(component.name) && typeof component.js == 'function') {
        customElements.define(component.name, component.js);
      }
    }.bind(this));
  }

  async validateFiles(component, compFiles) {
    const fileKeys = Object.keys(compFiles);
    for (var j = 0; j < fileKeys.length; j++) {
      const file = compFiles[fileKeys[j]];

      if (!file.ok && file !== this._SKIP) {
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

  fetch(url) {
    return fetch(url + this.getQuery(), {
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
export { Dito };
