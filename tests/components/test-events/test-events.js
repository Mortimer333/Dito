import { DitoElement } from '../../../ditoelement.js';
class TestEvents extends DitoElement {
  init() {
    this.$.type = null;
    this.$.event = null;
  }

  updateEvent(e) {
    this.$.type = e.type;
    this.$.event = e;
  }
}
export {TestEvents as default};
