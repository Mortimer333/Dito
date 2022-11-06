import { DitoElement } from '../../../../root.js';
class TestBound extends DitoElement {
  init() {
    this.$.bound = 'a';
    console.log(this.$.inputed);
    console.log(this.$self.parent);
  }

  output() {
    this.$output.output.emit('a')
  }
}
export {TestBound as default};
