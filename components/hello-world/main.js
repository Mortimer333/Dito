import { JMonkeyElement } from '../../root.js';

class HelloWorld extends JMonkeyElement {

  constructor() {
    super();
    this.$.pass = 'hello world pass';
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

  changePass() {
    if (this.$.pass == 'hello world pass') {
      this.$.pass = 'hello world pass 2';
    } else {
      this.$.pass = 'hello world pass';
    }
  }

  get var1 () {
    return 'b';
  }
}
export { HelloWorld as default };
