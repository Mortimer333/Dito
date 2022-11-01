import { DitoElement } from '../../root.js';

class Second extends DitoElement {
  init() {
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
