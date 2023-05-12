import { DitoElement } from '../../../../../ditoelement.js';
class TestForNestedLvl2 extends DitoElement {
  init() {
    this.$.value = this.$.value || '';
  }
}
export {TestForNestedLvl2 as default};
