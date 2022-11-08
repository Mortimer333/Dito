import { DitoElement } from '../../../root.js';
class TestAttr extends DitoElement {
  init() {
    this.$.id = 'empty-id';
    this.$.nativeId = 'native-id';
    this.$.classTest = 'class-test';
    this.$.nativePId = 'native-p-id';
  }
}
export {TestAttr as default};
