class RootJoint extends HTMLElement {
  renderInProgress = false;
  injectName = '$inject';
  key = null;
  value = null;
  queueRender;

  constructor() {
    super();
    if (this.constructor === RootJoint) {
      throw new Error("RootJoint is an abstract and cannot be instantiated as separate class");
    }
    this.defineObservable();
    this.saveMethods();
    this[this.injectName] = this.innerHTML;
    this.queueRender = this.debounce(e => {
      this.renderInProgress = false;
      this.render();
    });
    this.prepare();

    console.log(this);
  }

  /* EVENTS */
  prepare(){}    // Just after constructor
  beforeRender(){} // Before first render
  afterRender(){}  // After first render

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
          set (obj, prop, value) {
            if (value !== obj[prop]) {
              this.tag.renderInProgress = true;
              this.tag.queueRender();
            }

            if (this.tag.$input[prop]) {
              this.tag.$input[prop][prop] = value;
            }

            return Reflect.set(...arguments);
          },
          get (target, prop, receiver) {
            let value = target[prop];

            if (typeof value == 'function') {
              return value.bind(this.tag)();
            }
            return Reflect.get(...arguments);
          }
        }),
        writable: false
    });

    Object.defineProperty(this, "$input", {
        value: {},
        writable: false
    });
  }

  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
  }

  render() {
    if (this.renderInProgress || !document.body.contains(this)) {
      return;
    }
    this.queueRender('clear');

    if (document.body.querySelector(this.localName + ' ' + this.localName)) {
      throw new Error('Custom element ' + this.localName + ' is recursively called. Stopping the render....');
    }

    this.beforeRender();
    try {
      if (!this.__jmonkey.compiled) {
        this.compile();
      }

      this.innerHTML = '';
      const tmp = document.createElement('div');
      tmp.innerHTML = this.__jmonkey.html;

      if (this.__jmonkeyId) {
        const components = tmp.querySelectorAll(Object.keys(window.__jmonkey.registered).join(','));
        components.forEach((component, i) => {
          const rendered = window.__jmonkey.rendered[this.__jmonkeyId + 1 + i];
          if (rendered) {
            component.parentElement.insertBefore(rendered, component);
            component.remove();
          }
        });
      }

      this.resolveVars(tmp);
      this.resolveAttrs(tmp);
      this.resolveIfs(tmp);
      this.attachEvents(tmp);
      this.renderFors(tmp);
      this.renderFunctions(tmp);
      while (tmp.childNodes.length > 0) {
        this.appendChild(tmp.childNodes[0]);
      }

      if (!this.__jmonkeyId) {
        window.__jmonkey.lastId++;
        this.__jmonkeyId = window.__jmonkey.lastId;
        window.__jmonkey.rendered[this.__jmonkeyId] = this;
      }

      this.afterRender({success: true});
      return true;
    } catch (e) {
      console.error('There was an error during rendering', e);
      this.afterRender({success: false, error: e});
      return false;
    }
  }

  resolveVars(parent) {
    Object.keys(this.__jmonkey.vars).forEach(alias => {
      const varName = this.__jmonkey.vars[alias];
      let skip = false;
      if (!this.$[varName]) {
        console.error(
          'Observable in `' + this.constructor.name + '` doesn\'t have `' + varName + '` variable, skipping'
        );
        skip = true;
      }
      parent.querySelectorAll('[' + alias + ']').forEach((node) => {
        if (!skip) {
          node.$[varName] = this.$[varName];
          node.$input[varName] = this.$;
        }
        node.removeAttribute(alias);
      });
    });
  }

  resolveAttrs(parent) {
    Object.keys(this.__jmonkey.attrs).forEach(alias => {
      const attr = this.__jmonkey.attrs[alias];
      let skip = false;
      parent.querySelectorAll('[' + alias + ']').forEach((node) => {
        node.setAttribute(attr.name, this.getExecuteable(attr.value)(...this.getObservablesValues()));
        node.removeAttribute(alias);
      });
    });
  }

  renderFors(parent) {
    Object.keys(this.__jmonkey.fors).forEach(alias => {
      let res = this.getExecuteable(this.__jmonkey.fors[alias])(...this.getObservablesValues());
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
    Object.keys(this.__jmonkey.ifs).forEach(alias => {
      const ifRes = this.getExecuteable(this.__jmonkey.ifs[alias])(...this.getObservablesValues());
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
    Object.keys(this.__jmonkey.events).forEach(alias => {
      const event = this.__jmonkey.events[alias];
      parent.querySelectorAll('[' + alias + ']').forEach(node => {
        node.addEventListener(event.name, (e) => {
          this.getEventFunction(event.value)(e, ...this.getObservablesValues());
        });
        node.removeAttribute(alias);
      });
    });
  }

  renderFunctions(parent) {
    Object.keys(this.__jmonkey.functions).forEach(alias => {
      parent.querySelectorAll('[' + alias + ']').forEach(node => {
        let res = this.getExecuteable(this.__jmonkey.functions[alias])(...this.getObservablesValues());
        node.outerHTML = res;
      });
    });
  }

  compile() {
    let html = this.__jmonkey.html;
    this.__jmonkey.functions = {};

    html = this.compileVars(html);
    html = this.compileAttributes(html);
    html = this.compileExecutables(html);
    html = this.compileEvents(html);
    html = this.compileIfs(html);
    html = this.compileFors(html);

    this.__jmonkey.html = html;
    this.__jmonkey.compiled = true;
  }

  compileAttributes(html) {
    const lm = ' @a:';
    let attr, start = 0;
    this.__jmonkey.attrs = {};
    while (attr = this.getAttribute(html, lm, start)) {
      const { name, value } = attr;
      const attPlc = 'a' + name.start + '-' + value.end;
      this.__jmonkey.attrs[attPlc] = {
        name: html.substr(name.start + lm.length, name.end - (name.start + lm.length)).trim(),
        value: html.substr(value.start + 1, value.end - 1 - value.start),
      };
      html = html.replaceAll(html.substr(name.start + 1, value.end + 1 - (name.start + 1)), attPlc);
    }

    return html;
  }

  compileVars(html) {
    const lm = ' @v';
    let attr, start = 0;
    this.__jmonkey.vars = {};
    while (attr = this.getAttribute(html, lm, start)) {
      const { name, value } = attr;
      start = value.end + 1;
      const varPlc = 'v' + name.start + '-' + value.end;
      this.__jmonkey.vars[varPlc] = html.substr(value.start + 1, value.end - 1 - value.start);
      html = html.replaceAll(html.substr(name.start + 1, value.end + 1 - (name.start + 1)), varPlc);
    }

    return html;
  }

  compileFors(html) {
    const lm = ' @for';
    let attr, start = 0;
    this.__jmonkey.fors = {};
    while (attr = this.getAttribute(html, lm, start)) {
      const { name, value } = attr;
      start = value.end + 1;
      const forPlc = 'for' + name.start + '-' + value.end;
      this.__jmonkey.fors[forPlc] = html.substr(value.start + 1, value.end - 1 - value.start);
      html = html.replaceAll(html.substr(name.start + 1, value.end + 1 - (name.start + 1)), forPlc);
    }

    return html;
  }

  compileIfs(html) {
    const lm = ' @if';
    let attr, start = 0;
    this.__jmonkey.ifs = {};
    while (attr = this.getAttribute(html, lm, start)) {
      const { name, value } = attr;
      start = value.end + 1;
      const ifPlc = 'if' + name.start + '-' + value.end;
      this.__jmonkey.ifs[ifPlc] = html.substr(value.start + 1, value.end - 1 - value.start);
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
    const lm = ' @e:';
    let attr, start = 0;
    this.__jmonkey.events = {};
    while (attr = this.getAttribute(html, lm, start)) {
      const { name, value } = attr;
      const ePlc = 'e' + name.start + '-' + value.end;
      this.__jmonkey.events[ePlc] = {
        name: html.substr(name.start + lm.length, name.end - (name.start + lm.length)).trim(),
        value: html.substr(value.start + 1, value.end - 1 - value.start),
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
      this.__jmonkey.functions[name] = html.substr(start + 2, end - (start + 2));
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
