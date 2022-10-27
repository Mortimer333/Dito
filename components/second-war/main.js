import { JMonkeyElement } from '../../root.js';

class Second extends JMonkeyElement {
  prepare() {
    this.$.pass = 'second war pass';
  }

  changePass() {
    this.$.pass = 'second war pass';
  }
}

export { Second as default };
