import { JMonkeyElement } from '../../root.js';

class Second extends JMonkeyElement {
  afterInit() {
    this.$.pass = 'second war pass';
  }

  changePass() {
    if (this.$.pass == 'second war pass') {
      this.$.pass = 'second war pass2';
    } else {
      this.$.pass = 'second war pass';
    }
  }
}

export { Second as default };
