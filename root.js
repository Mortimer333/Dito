class RootJoint extends HTMLElement {
  renderInProgress = false;
  injectName = '$inject';
  key = null;
  value = null;

  constructor() {
    super();
    if (this.constructor === RootJoint) {
      throw new Error("RootJoint is an abstract and cannot be instantiated as separate class");
    }
    this.defineObservable();
    this.saveMethods();
    this[this.injectName] = this.innerHTML;
    console.log("new", this.constructor.name);
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
            if (value !== obj[prop]) {
              this.tag.renderInProgress = true;
              this.queueRender();
            }

            return Reflect.set(...arguments);
          },
          get (target, prop, receiver) {
            if (typeof target[prop] == 'function') {
              return target[prop].bind(this.tag)();
            }
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
    if (this.renderInProgress || !document.body.contains(this)) {
      return;
    }

    const recursion = document.body.querySelector(this.localName + ' ' + this.localName);
    if (recursion) {
      throw new Error('Custom element ' + this.localName + ' is recursively called. Stopping rendering....');
    }

    if (!this._joint.compiled) {
      this.compile();
    }

    this.innerHTML = '';
    const tmp = document.createElement('div');
    tmp.innerHTML = this._joint.html;
    this.resolveIfs(tmp);
    this.attachEvents(tmp);
    this.renderFors(tmp);
    this.renderFunctions(tmp);
    while (tmp.childNodes.length > 0) {
      this.appendChild(tmp.childNodes[0]);
    }
  }

  renderFors(parent) {
    Object.keys(this._joint.fors).forEach(alias => {
      let res = this._joint.fors[alias](...this.getObservablesValues());
      let type = typeof res;
      if (type == 'string') {
        res = res * 1;
        type = typeof res;
      }

      let keys, values, skip = false;
      if (type != 'number' && type != 'object') {
        console.error('For in `' + this.constructor.name + '` doesn\'t have iterable value, removing node...');
        skip = true;
      } else {
        if (type == 'number') {
          res = new Array(res).fill(null);
        }

        keys = Object.keys(res);
        values = Object.values(res);
      }


      parent.querySelectorAll('[' + alias + ']').forEach(function (node) {
        if (skip) {
          node.remove();
          return
        }

        node.removeAttribute(alias);
        let current = node;
        for (var i = 0; i < keys.length; i++) {
          this.key = keys[i];
          this.value = values[i];
          const clone = node.cloneNode(true);
          this.renderFunctions(clone);
          node.parentElement.insertBefore(clone, current.nextSibling);
          current = clone;
        }
        node.remove();
      }.bind(this));
      this.key = null;
      this.value = null;
    });
  }

  resolveIfs(parent) {
    Object.keys(this._joint.ifs).forEach(alias => {
      const ifRes = this._joint.ifs[alias](...this.getObservablesValues());
      parent.querySelectorAll('[' + alias + ']').forEach(node => {
        if (ifRes) {
          node.removeAttribute(alias);
        } else {
          node.remove();
        }
      });
    });
  }

  attachEvents(parent) {
    Object.keys(this._joint.events).forEach(alias => {
      const event = this._joint.events[alias];
      parent.querySelectorAll('[' + alias + ']').forEach(node => {
        node.addEventListener(event.name, (e) => {
          event.value(e, ...this.getObservablesValues());
        });
        node.removeAttribute(alias);
      });
    });
  }

  renderFunctions(parent) {
    Object.keys(this._joint.functions).forEach(alias => {
      parent.querySelectorAll('[' + alias + ']').forEach(node => {
        let res = this._joint.functions[alias](...this.getObservablesValues());
        node.outerHTML = res;
      });
    });
  }

  compile() {
    let html = this._joint.html;
    this._joint.functions = {};

    html = this.compileExecutables(html);
    html = this.compileEvents(html);
    html = this.compileIfs(html);
    html = this.compileFors(html);

    this._joint.html = html;
    this._joint.compiled = true;
  }

  compileFors(html) {
    const lm = ' j@for';
    let attr, start = 0;
    this._joint.fors = {};
    while (attr = this.getAttribute(html, lm, start)) {
      const { name, value } = attr;
      start = value.end + 1;
      const forPlc = 'for' + name.start + '-' + value.end;
      this._joint.fors[forPlc] = this.getExecuteable(html.substr(value.start + 1, value.end - 1 - value.start));
      html = html.replaceAll(html.substr(name.start + 1, value.end + 1 - (name.start + 1)), forPlc);
    }

    return html;
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
      html = html.replaceAll(html.substr(start, end + 2 - start), '<span ' + name + '></span>');
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
      this.injectName,
      '$key',
      '$value',
    ];
  }

  getObservablesValues() {
    return [
      ...Object.values(this.methods),
      ...Object.values(this.$),
      this[this.injectName],
      this.key,
      this.value,
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
