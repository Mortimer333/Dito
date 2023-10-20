import { DitoElement } from '../../../../src/ditoelement.js';
class TestBound extends DitoElement {
  init() {
    this.$.bound = 'a';
    this.$css.color = 'red';
  }

  output() {
    this.$css.color = 'blue';
    this.$output?.output?.emit('a')
  }
}
export {TestBound as default};
