import { RootJoint } from '../../root.js';

class Second extends RootJoint {
  prepare() {
    this.$.test = 'test';
    this.$.pass = 'a';
  }

  testFunc() {
    console.log("Not test");
    this.$.test = 'not test';
  }
}

export { Second as default };
