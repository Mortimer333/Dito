class RootJoint extends HTMLElement {
  observables = {};

  constructor() {
    super();
    if (this.constructor === RootJoint) {
      throw new Error("RootJoint is an abstract and cannot be instantiated as separate class");
    }

    setTimeout(function () {
      console.log("title changed");
      console.log(this.title);
      this.title = 'v';
    }.bind(this), 100)

    this.observables = new Proxy(this.observables, {
      set (obj, prop, value) {
        console.log('set', target, scope, args);
        return Reflect.set(...arguments);
      },
      get (target, prop, receiver) {
        console.log('get', target, prop, receiver);
        return Reflect.get(...arguments);
      }
    });

    console.log(this.observables.e);
    this.observables.e = 'a';
  }

  connectedCallback() {
    console.log(this);
  }

  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log(name, oldValue, newValue);
  }
}

export { RootJoint };
