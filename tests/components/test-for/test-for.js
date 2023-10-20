import { DitoElement } from '../../../src/ditoelement.js';
class TestGet extends DitoElement {
  init() {
    this.$.items = [
      {
        value: '2',
        values: [
          { number: 2 }
        ]
      }, {
        value: '3',
        values: [
          { number: 3 }
        ]
      }, {
        value: '4',
        values: [
          { number: 4 }
        ]
      }
    ];
  }
}
export {TestGet as default};
