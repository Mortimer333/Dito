import { DitoElement } from '../../root.js';

class ThirdCheck extends DitoElement {
  init() {
    this.$.iterParent = 1;
    console.log("a");
  }

  moreGreetings() {
    this.$.iterParent++;
  }
}

export { ThirdCheck as default };
