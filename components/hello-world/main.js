import { RootJoint } from '../../root.js';

class HelloWorld extends RootJoint {

  constructor() {
    super();
    this.$.planet = 'earth';
    this.$.sun = () => {
      if (this.$.planet == 'earth') {
        return 'sun';
      }
      return 'mars sun';
    };
  }

  changePlanet() {
    this.$.planet = 'mars';
  }

  get var1 () {
    return 'b';
  }
}
export { HelloWorld as default };
