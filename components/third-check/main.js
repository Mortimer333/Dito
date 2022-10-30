import { DitoElement } from '../../root.js';

class ThirdCheck extends DitoElement {
  init() {
    this.$.settings = {
      a: "a",
      b: "b"
    }
  }
}

export { ThirdCheck as default };
