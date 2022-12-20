import { DitoElement } from '../../../ditoelement.js';
class TestIfNested extends DitoElement {
  init() {
    this.$.nestedIter = [{href: true, icon: true},{href: true, icon: true}];
  }
}
export {TestIfNested as default};
