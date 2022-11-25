import { DitoElement } from '../../../../ditoelement.js';
class TestInputChild extends DitoElement {
  init() {
    console.log("inputs child", this.$.inputValueChild);
    this.$.inputValueChild = 'test child';
    console.log("inputs child", this.$.inputValueChild);
  }
}
export {TestInputChild as default};
