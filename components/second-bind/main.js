import { DitoElement } from '../../root.js';

class SecondBind extends DitoElement {
  init() {
    this.$.greetings = 'HI!';
    this.$.iter = 2;
  }

  moreGreetings2() {
    this.$.iter++;
  }
}

export { SecondBind as default };
