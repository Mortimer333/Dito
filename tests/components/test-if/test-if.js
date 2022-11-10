import { DitoElement } from '../../../ditoelement.js';
class TestIf extends DitoElement {
  init() {
    this.$.display1 = true;
    this.$.display2 = true;
    this.$.display2Iter = 2;
    this.$.display3 = true;
    this.$.display4 = true;
    this.$.display4Iter = 2;
  }
}
export {TestIf as default};
