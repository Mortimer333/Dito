import { DitoElement } from '../../../ditoelement.js';
class TestIf extends DitoElement {
  init() {
    this.$.display1 = true;
    this.$.display2 = true;
    this.$.display2Iter = 2;
    this.$.display3 = true;
    this.$.display4 = true;
    this.$.display4Iter = 2;
    this.$.injectShow = false;
    this.$.showEmpty = false;
    this.$.injectShow2 = false;
    this.$.showEmpty2 = false;
    this.$.injectShow3 = false;
    this.$.showEmpty3 = false;
  }
}
export {TestIf as default};
