import { DitoElement } from '../../../src/ditoelement.js';
class TestCss extends DitoElement {
  init() {
    this.$css.color = 'red';
  }
}
export {TestCss as default};
