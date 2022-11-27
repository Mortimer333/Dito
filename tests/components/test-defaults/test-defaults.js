import { DitoElement } from '../../../ditoelement.js';
class TestDefaults extends DitoElement {
  getDefaults() {
    return {
      class: {
        value: 'test class'
      },
      value: {
        value: "value",
        type: "replace"
      },
      name: {
        value: 'test',
        type: 'add'
      }
    };
  }
}
export {TestDefaults as default};
