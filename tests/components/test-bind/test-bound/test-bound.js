import { DitoElement } from '../../../../root.js';
class TestBound extends DitoElement {
  init() {
    this.$.bound = 'a';
  }

  output() {
    this.$output.output.emit('a')
  }
}
export {TestBound as default};
