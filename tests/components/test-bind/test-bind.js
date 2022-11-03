import { DitoElement } from '../../../root.js';
class TestBind extends DitoElement {
  init() {
    this.$.bind = 'test';
    this.$.className2 = 'class';
    this.$.iter = 2;
  }
}
export {TestBind as default};
