import { DitoElement } from '../../../ditoelement.js';
class TestInject extends DitoElement {
  init() {
    this.$.test = 'bbb';
  }
}
export {TestInject as default};
