import { RootJoint } from '../../root.js';

class HelloWorld extends RootJoint {
  testVar = 'a'
  test() {
    this.title = 'b';
    console.log('a');
  }

  get var1 () {
    return 'b';
  }
}
export { HelloWorld as default };
