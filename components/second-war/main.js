import { RootJoint } from '../../root.js';

class Second extends RootJoint {
  prepare() {
    this.$.test = 'test';
    this.$.pass = 'hello pass here';
  }

  testFunc() {
    console.log("Not test");
    this.$.test = 'not test';
    console.log(this.$.test);
  }
}

export { Second as default };
