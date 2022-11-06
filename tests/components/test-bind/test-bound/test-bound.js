import { DitoElement } from '../../../../root.js';
class TestBound extends DitoElement {
  init() {
    this.$.bound = 'a';
    this.$css.color = 'red';
  }

  output() {
    this.$css.color = 'blue';
    console.log("a");
    this.$output?.output?.emit('a')
  }
}
export {TestBound as default};
