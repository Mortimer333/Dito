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

  changePlanet() {
    this.$.planet = 'mars';
    this.$.iter = 3;
  }

  get var1 () {
    return 'b';
  }
}
export { HelloWorld as default };
