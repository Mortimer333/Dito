import { DitoElement } from '../../../src/ditoelement.js';
class TestInject extends DitoElement {
  init() {
    this.$.test = 'bbb';
    this.$.emitted = '';
    this.$.bind = 'bind';
  }
}
export {TestInject as default};
