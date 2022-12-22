import { DitoElement } from '../../../ditoelement.js';
class TestGet extends DitoElement {
  init() {
    this.$.items = [
      {
        value: '2'
      }, {
        value: '3'
      }, {
        value: '4'
      }
    ];
  }
}
export {TestGet as default};
