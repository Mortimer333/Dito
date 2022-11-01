import { DitoElement } from '../../root.js';

class SecondBind extends DitoElement {
  init() {
    this.$.set = {};
    this.$.set.a = 'bv';
    this.$.greetings = 'HI!';
    this.$.iter = 2;
  }

  moreGreetings2() {
    this.$.iter++;
    console.log("abc", this.$.iter);
  }

  emitCheck(e) {
    console.log(e);
  }
}

export { SecondBind as default };
