import { JMonkeyElement } from '../../root.js';

class HelloWorld extends JMonkeyElement {

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
  }

  changePlanet() {
    console.log(this.$output);
    this.$output.send?.emit('asd');
    this.$.planet = 'mars';
    this.$.iter++;
    this.$.pass = 'changed';
  }

  get var1 () {
    return 'b';
  }
}
export { HelloWorld as default };
