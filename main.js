class Joints {
  url;
  filename = 'main';
  headers = {};
  params = {};
  components = {};
  registered = [];
  SKIP = '_skip';

  constructor(settings = {}) {
    this.url = settings.url || window.location.origin;
    if (this.url[this.url.length - 1] != '/') {
      this.url += '/';
    }

    this.filename = settings.filename || this.filename;
    this.headers = settings.headers || this.headers;
    this.params = settings.headers || this.params;
  }

  newJoint(name, version = 1, force = false) {
    let skip = false;
    if (!force && localStorage.getItem(name)) {
      skip = true;
    }

    const path = this.url + name + '/' + this.filename + '.';
    const js = import(path + 'js');
    const html = skip ? Promise.resolve(this.SKIP) : this.fetch(path + 'html');
    const css = skip ? Promise.resolve(this.SKIP) : this.fetch(path + 'css');
    this.registered.push(Promise.resolve(name + '_' + version));
    this.registered.push(html.catch((error) => error));
    this.registered.push(js.catch((error) => error));
    this.registered.push(css.catch((error) => error));
  }

  load() {
    Promise.all(this.registered).then(async (values) => {
      for (var i = 0; i < values.length; i++) {
        const component = values[i];
        if (typeof component != 'string') {
          console.error('The name of component loaded as #' + (i/4 + 1) + ' wasn\'t found. Skipping...');
          i += 4;
          continue;
        }

        let html = values[i + 1];
        let js   = values[i + 2];
        let css  = values[i + 3];
        if (!this.validateFiles({html, js, css})) {
          i += 4;
          continue;
        }


        const localComponent = JSON.parse(localStorage.getItem(component) || 'false');
        if ((html === this.SKIP || css === this.SKIP) && !localComponent) {
          console.error(
            'The component `' + component + '` was marked as already loaded once but' +
            ' he is missing from localStorage. Skipping...'
          );
          i += 4;
          continue;
        }

        if (html === this.SKIP) {
          html = localComponent.html;
        } else {
          html = await html.text();
        }

        if (css === this.SKIP) {
          html = localComponent.css;
        } else {
          css = await css.text();
        }

        localStorage.setItem(component, JSON.stringify({ html, css, }));

        const range = document.createRange();
        range.selectNodeContents(document.createElement('div')); // fix for safari
        html = range.createContextualFragment('<style>' + css + '</style>' + html);

        ({ default: js } = js);
        this.components.component = {js, html, css};
        i += 4;
      }
      console.log(this.components);
    });
  }

  validateFiles(compFiles) {
    const fileKeys = Object.keys(compFiles);
    for (var j = 0; j < fileKeys.length; j++) {
      const key = fileKeys[j];
      const file = compFiles[key];

      if (typeof file == 'string' && file !== this.SKIP) {
        console.log(
          key.toUpperCase() + " of component `" + component
          + "` returned an error: " + file + '. Skipping...'
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
}
export { Joints };
