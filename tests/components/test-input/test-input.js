import { DitoElement } from '../../../src/ditoelement.js';
class TestInput extends DitoElement {
  init() {
    console.log("inputs", this.$.inputValue, this.$.inputClass);
    this.$.inputValue = 'test';
    this.$.inputClass = 'class';
    console.log("inputs", this.$.inputValue, this.$.inputClass);
  }
}
export {TestInput as default};
