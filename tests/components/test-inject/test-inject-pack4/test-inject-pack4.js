import { DitoElement } from '../../../../ditoelement.js';
class TestInjectPack4 extends DitoElement {
  init() {

  }

  afterRender() {
    this.$output.emitted?.emit('emitted');
  }
}
export {TestInjectPack4 as default};
