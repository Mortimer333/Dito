import { RootJoint } from '../../root.js';

class Second extends RootJoint {
  test() {
    console.log('b');
  }
}

export { Second as default };
