import { DitoElement } from '../../../src/ditoelement.js';
class TestCssScope extends DitoElement {
  init() {
    this.$css.color = 'green';
  }
}
export {TestCssScope as default};
