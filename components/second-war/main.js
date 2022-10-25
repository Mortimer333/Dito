import { RootJoint } from '../../root.js';

class Second extends RootJoint {
  prepare() {
    this.$.test = '2';
    this.$.pass = 'a';
  }

  test() {
    console.log('b');
  }
}

export { Second as default };
