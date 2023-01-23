import { DitoElement } from '../../../ditoelement.js';
class TestInject extends DitoElement {
  init() {
    this.$.test = 'bbb';
    this.$.emitted = '';
  }
}
export {TestInject as default};
