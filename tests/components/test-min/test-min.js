import { DitoElement } from '../../../src/ditoelement.js';
class TestMin extends DitoElement {
  init() {
    this.$.items = [1, 2, 3, 4, 5];
    this.$.min = 10;
    this.$.minItem = "min";
  }
}
export {TestMin as default};
