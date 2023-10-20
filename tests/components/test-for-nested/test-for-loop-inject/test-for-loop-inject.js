import { DitoElement } from '../../../../src/ditoelement.js';
class TestForLoopInject extends DitoElement {
  init() {
    this.$.length = [
      {
        num: 0,
      }, {
        num: 1,
      }, {
        num: 2,
      }
    ];
  }
}
export {TestForLoopInject as default};
