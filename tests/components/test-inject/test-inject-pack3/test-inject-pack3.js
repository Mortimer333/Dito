import { DitoElement } from '../../../../src/ditoelement.js';
class TestInjectPack3 extends DitoElement {
  init() {
    this.$.data = { a: 'test'}
  }
}
export {TestInjectPack3 as default};
