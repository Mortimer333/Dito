import { JMonkeyElement } from '../../root.js';

class SecondBind extends JMonkeyElement {
  init() {
    this.$.change = false;
  }

  outFn() {
    this.$output?.out.emit('Hello its me mario');
  }
}

export { SecondBind as default };
