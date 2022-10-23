class RootJoint extends HTMLElement {
  renderInProgress = false;
  injectName = '__inject';

  constructor() {
    super();
    if (this.constructor === RootJoint) {
      throw new Error("RootJoint is an abstract and cannot be instantiated as separate class");
    }
    this.defineObservable();
    this.saveMethods();
    this[this.injectName] = this.innerHTML;
  }

  connectedCallback() {
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
    if (!this._joint.compiled) {
      this.compile();
    }

    this.innerHTML = this.renderFunctions();

    this.resolveIfs();
    this.attachEvents();
  }

  resolveIfs() {
    Object.keys(this._joint.ifs).forEach(alias => {
      const ifRes = this._joint.ifs[alias](...this.getObservablesValues());
      this.querySelectorAll('[' + alias + ']').forEach(node => {
        if (ifRes) {
          node.removeAttribute(alias);
        } else {
          node.remove();
        }
      });
    });
  }

  attachEvents() {
    Object.keys(this._joint.events).forEach(alias => {
      const event = this._joint.events[alias];
      this.querySelectorAll('[' + alias + ']').forEach(node => {
        node.addEventListener(event.name, (e) => {
          event.value(e, ...this.getObservablesValues());
        });
        node.removeAttribute(alias);
      });
    });
  }

  renderFunctions() {
    let html = this._joint.html;
    Object.keys(this._joint.functions).forEach(key => {
      let res = '';
      try {
        res = this._joint.functions[key](...this.getObservablesValues());
      } catch (e) {
        console.error('Expression `' + key + '` in `' + this.constructor.name + '` is not returnable', e);
      }
      html = html.replaceAll(key, res);
    });
    return html;
  }

  compile() {
    let html = this._joint.html;
    this._joint.functions = {};

    html = this.compileExecutables(html);
    html = this.compileEvents(html);
    html = this.compileIfs(html);

    this._joint.html = html;
    this._joint.compiled = true;
  }

  compileIfs(html) {
    const lm = ' j@if';
    let attr, start = 0;
    this._joint.ifs = {};
    while (attr = this.getAttribute(html, lm, start)) {
      const { name, value } = attr;
      start = value.end + 1;
      const ifPlc = 'if' + name.start + '-' + value.end;
      this._joint.ifs[ifPlc] = this.getExecuteable(html.substr(value.start + 1, value.end - 1 - value.start));
      html = html.replaceAll(html.substr(name.start + 1, value.end + 1 - (name.start + 1)), ifPlc);
    }

    return html;
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

  compileEvents(html) {
    const lm = ' j@e:';
    let attr, start = 0;
    this._joint.events = {};
    while (attr = this.getAttribute(html, lm, start)) {
      const { name, value } = attr;
      start = value.end + 1;
      const ePlc = 'e' + name.start + '-' + value.end;
      this._joint.events[ePlc] = {
        name: html.substr(name.start + lm.length, name.end - (name.start + lm.length)).trim(),
        value: this.getEventFunction(html.substr(value.start + 1, value.end - 1 - value.start)),
      };
      html = html.replaceAll(html.substr(name.start + 1, value.end + 1 - (name.start + 1)), ePlc);
    }

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
    return new Function(...this.getObservablesKeys(), 'return ' + script);
  }

  getEventFunction(script) {
    return new Function('e', ...this.getObservablesKeys(), script).bind(this);
  }

  getObservablesKeys() {
    return [
      ...Object.keys(this.methods),
      ...Object.keys(this.$),
      this.injectName
    ];
  }

  getObservablesValues() {
    return [
      ...Object.values(this.methods),
      ...Object.values(this.$),
      this[this.injectName]
    ];
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
