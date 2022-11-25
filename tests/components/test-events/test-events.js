import { DitoElement } from '../../../ditoelement.js';
class TestEvents extends DitoElement {
  init() {
    this.$.type = null;
    this.$.event = null;
    this.$self.renderEventBefore = null;
    this.$self.renderEventAfter = null;
  }

  updateEvent(e) {
    this.$.type = e.type;
    this.$.event = e;
  }

  updateRenderEventBefore(update) {
    this.$self.renderEventBefore = update;
  }

  updateRenderEventAfter(update) {
    this.$self.renderEventAfter = update;
  }
}
export {TestEvents as default};
