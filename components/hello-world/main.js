import { RootJoint } from '../../root.js';

class HelloWorld extends RootJoint {

  constructor() {
    super();
    this.$.planet = 'earth';
    this.$.iter = 2;
    this.$.sun = () => {
      if (this.$.planet == 'earth') {
        return 'sun';
      }
      return 'mars sun';
    };
  }

  afterRender() {
    console.log("before change", Object.keys(this.$), this.$.pass);
  }

  changePlanet() {
    this.$.planet = 'mars';
    this.$.iter++;
    this.$.pass = 'changed';
  }

  get var1 () {
    return 'b';
  }
}
export { HelloWorld as default };
