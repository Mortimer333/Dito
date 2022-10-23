class RootJoint extends HTMLElement {
  renderInProgress = false;

  constructor() {
    super();
    if (this.constructor === RootJoint) {
      throw new Error("RootJoint is an abstract and cannot be instantiated as separate class");
    }
    this.defineObservable();
    this.saveMethods();
    this.injectHTML = this.innerHTML;
  }

  connectedCallback() {
    console.log('render:', this.constructor, this._joint.html, this._joint.functions);
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
    console.log("Define", this.constructor, this);
    Object.defineProperty(this, "$", {
        value: new Proxy({}, {
          tag: this,
          queueRender: this.debounce(e => {
            this.renderInProgress = false;
            this.render()
          }),
          set (obj, prop, value) {
            // console.log('set', obj, prop, value);
            if (typeof value == 'function') {
              Object.defineProperty(this, prop, {
                get() {
                  return value.bind(this.tag)();
                },
              });
            }

            if (document.body.contains(this.tag) && value !== obj[prop]) {
              this.tag.renderInProgress = true;
              this.queueRender();
            }

            return Reflect.set(...arguments);
          },
          get (target, prop, receiver) {
            // console.log('get', target, prop, receiver);
            return Reflect.get(...arguments);
          }
        }),
        writable: false
    });
  }

  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log(name, oldValue, newValue);
  }

  render() {
    if (this.renderInProgress) {
      return;
    }
    console.log("Render, contains:", document.body.contains(this));
    if (!this._joint.compiled) {
      this.compile();
    }
    console.log('inject', this.injectHTML);
    let html = this._joint.html + this.injectHTML;
    Object.keys(this._joint.functions).forEach(key => {
      let res = '';
      try {
        res = this._joint.functions[key](...Object.values(this.$));
      } catch (e) {
        console.error('Expression `' + key + '` in `' + this.constructor.name + '` is not returnable', e);
      }
      html = html.replaceAll(key, res);
    });

    this.innerHTML = html;
    Object.keys(this._joint.events).forEach(alias => {
      const event = this._joint.events[alias];
      this.querySelectorAll('[' + alias + ']').forEach(node => {
        node.addEventListener(event.name, (e) => {
          event.value(e, ...Object.values(this.$), ...Object.values(this.methods));
        });
        node.removeAttribute(alias);
      });
    });

  }

  compile() {
    let html = this._joint.html;
    this._joint.functions = {};

    html = this.compileExecutables(html);
    html = this.compileEvents(html);

    this._joint.html = html;
    this._joint.compiled = true;
  }

  compileEvents(html) {
    let eStart = html.indexOf(' e:');
    const strings = {
      '"' : true,
      "'" : true,
      "`" : true,
    };
    this._joint.events = {};
    while (eStart !== -1) {
      let eEnd = html.indexOf('=', eStart);
      if (eEnd === -1) {
        break;
      }

      const eName = html.substr(eStart + 3, eEnd - (eStart + 3)).trim();
      const wrapper = strings[html[eEnd + 1]];
      if (!wrapper) {
        console.error(
          'Event `' + eName + '` value in `' + this.constructor.name
          + '` is not wrapped in string (found letter: `' + html[eEnd + 1] + '`), skipping'
        );
        eStart = html.indexOf(' e:', eEnd);
        continue;
      }

      const evStart = eEnd + 1;
      const evEnd = this.getStringEnd(html, html[eEnd + 1], evStart + 1);
      const ePlc = 'e' + eStart + '-' + evEnd;
      this._joint.events[ePlc] = {
        name: eName,
        value: this.getEventFunction(html.substr(evStart + 1, evEnd - 1 - evStart)),
      };
      console.log(html.substr(eStart + 1, evEnd + 1 - (eStart + 1)));
      html = html.replaceAll(html.substr(eStart + 1, evEnd + 1 - (eStart + 1)), ePlc);
      eStart = html.indexOf(' e:', eEnd);
    }
    console.log(html);

    console.log("Events:", this._joint.events);

    return html;
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
      this._joint.functions[name] = this.getExecuteable(html.substr(start + 2, end - (start + 2)));
      html = html.replaceAll(html.substr(start, end + 2 - start), name);
      start = html.indexOf('{{', start + name.length);
    }

    return html;
  }

  getExecuteable(script) {
    return new Function(...Object.keys(this.$), 'return ' + script);
  }

  getEventFunction(script) {
    return new Function('e', ...Object.keys(this.$), ...Object.keys(this.methods), script).bind(this);
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

export { RootJoint };
