import { DitoElement } from '../../../src/ditoelement.js';
class TestGet extends DitoElement {
  init() {
    this.$.pName = 'pName';
    this.$.items = 2;
  }
}
export {TestGet as default};
