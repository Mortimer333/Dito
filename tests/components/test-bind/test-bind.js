import { DitoElement } from '../../../ditoelement.js';
class TestBind extends DitoElement {
  init() {
    this.$.bind = 'test';
    this.$.className2 = 'class';
    this.$.iter = ['a','v'];
    this.$.display = true;
  }
}
export {TestBind as default};
