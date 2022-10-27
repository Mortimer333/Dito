import { JMonkeyElement } from '../../root.js';

class SecondBind extends JMonkeyElement {
  prepare() {
    this.$.change = false;
  }
}

export { SecondBind as default };
