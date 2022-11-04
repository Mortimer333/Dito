import { DitoElement } from '../../../../root.js';
class TestBound extends DitoElement {
  init() {
    this.$.bound = 'a';
  }

  output() {
      console.log(this.$.i);
      this.$output.output.emit()
  }
}
export {TestBound as default};
