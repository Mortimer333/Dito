import { DitoElement } from '../../root.js';

class ThirdCheck extends DitoElement {
  init() {
    this.$.parentIter = 1;
  }

  moreGreetings() {
    console.log('bound iter', this.$.parentIter);
    this.$.parentIter += 1;
  }
}

export { ThirdCheck as default };
