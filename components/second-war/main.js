import { RootJoint } from '../../root.js';

class Second extends RootJoint {
  prepare() {
    this.$.test = 'test';
    this.$.pass = 'a';
  }

  test() {
  }
}

export { Second as default };
