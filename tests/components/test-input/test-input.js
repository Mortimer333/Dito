import { DitoElement } from '../../../ditoelement.js';
class TestInput extends DitoElement {
  init() {
    this.$.inputValue = 'test';
    this.$.inputClass = 'class';
  }
}
export {TestInput as default};
