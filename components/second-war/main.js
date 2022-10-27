import { JMonkeyElement } from '../../root.js';

class Second extends JMonkeyElement {
  prepare() {
    this.$.test = 'test';
    this.$.pass = 'hello pass here';
  }

  testFunc() {
    console.log("Not test");
    this.$.test = 'not test';
    this.$.pass = 'second war pass'
    console.log(this.$.test);
  }
}

export { Second as default };
