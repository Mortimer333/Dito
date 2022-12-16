import { DitoElement } from '../../../ditoelement.js';
class TestBind extends DitoElement {
  init() {
    this.$.bind = 'test';
    this.$.className2 = 'class';
    this.$.iter = ['a','v'];
    this.$.display = true;
    this.$.nested = [
      {
        value: '0',
        children: [
          "0",
          "1"
        ]
      }, {
        value: '1',
        children: [
          "0",
          "1"
        ]
      },
    ]
  }
}
export {TestBind as default};
