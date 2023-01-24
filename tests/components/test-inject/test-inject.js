import { DitoElement } from '../../../ditoelement.js';
class TestInject extends DitoElement {
  init() {
    this.$.test = 'bbb';
    this.$.emitted = '';
    this.$.bind = 'bind';
  }
}
export {TestInject as default};
