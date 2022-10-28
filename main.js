class JMonkey {
  url;
  filename = 'main';
  headers = {};
  params = {};
  components = {};
  registered = [];
  notDownloaded = {};
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
          lastId: 0,
          registered: {}
        },
        writable: false
    });
  }

  register(name, version = 1, path = '', force = false) {
    if (name.indexOf('-') === -1) {
      throw new Error('Custom elements name must contain hypen (-)');
    }

    // If it's not force and there is currently no instance of this component on site - don't retrieve it
    if (!force && !document.querySelector(name)) {
      this.notDownloaded[name] = { name, version, path };
      return;
    }

    const promises = this.createRegisterPromise(path, name, version, force);
    this.registered = [...this.registered, ...promises];
  }

  createRegisterPromise(path, name, version, force = false) {

    let skip = false;
    if (!force && localStorage.getItem(name)) {
      const comp = JSON.parse(localStorage.getItem(name));
      if (comp._version == version) {
        skip = true;
      }
    }

    this.components[name] = {js: null, html: null, css: null, cssInjected: false};
    path = this.url + path + name + '/' + this.filename + '.';
    const js = import(path + 'js');
    const html = skip ? Promise.resolve(this.SKIP) : this.fetch(path + 'html');
    const css = skip ? Promise.resolve(this.SKIP) : this.fetch(path + 'css');
    const registered = [];
    registered.push(Promise.resolve(name + '_' + version));
    registered.push(html.catch((error) => error));
    registered.push(js.catch((error) => error));
    registered.push(css.catch((error) => error));
    window.__jmonkey.registered[name] = true;
    return registered;
  }

  async load(registered = null) {
    if (!registered) {
      registered = this.registered;
    }

    const skipSize = 3;
    await Promise.all(registered).then(async (values) => {
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

        let cssSkipped = false;
        let htmlSkipped = false;
        const promises = [];
        if (html === this.SKIP) {
          htmlSkipped = true;
          html = localComponent.html;
        } else {
          promises.push(html.text());
        }

        if (css === this.SKIP) {
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
          this.components[component] = {name: component, js, html, css, cssInjected: false, _cssSkipped: cssSkipped };
          i += skipSize;
        });

      }

      this.renderComponents(document);
      registered = [];
    }).catch(err => console.error(err));
  }

  saveComponent(key, data) {
    try {
      localStorage.setItem(key, data);
    } catch (e) {
      if (e.name.toLowerCase().match(/quota/)) {
        if (localStorage.length == 0) {
          console.error('Component `' + key + '` won\'t be saved for later because of his size (over 5mb)');
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

    if (component._cssSkipped) {
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
export { JMonkey };
