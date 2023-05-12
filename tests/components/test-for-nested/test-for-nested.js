import { DitoElement } from '../../../ditoelement.js';
class TestForNested extends DitoElement {
  init() {
    this.$.length = 3;
    this.$.objs = [
      {value: 'test1'},
      {value: 'test2'},
    ];
  }
}
export {TestForNested as default};
