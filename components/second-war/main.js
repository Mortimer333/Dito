import { JMonkeyElement } from '../../root.js';

class Second extends JMonkeyElement {
  afterInit() {
    this.$css.color = 'blue';
    this.$.pass = 'second war pass';
  }

  changePass() {
    if (this.$.pass == 'second war pass') {
      this.$.pass = 'second war pass2';
    } else {
      this.$.pass = 'second war pass';
    }
  }

  changeColor() {
    this.$css.color = "brown";
  }
}

export { Second as default };
