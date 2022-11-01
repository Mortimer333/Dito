import { DitoElement } from '../../root.js';

class HelloWorld extends DitoElement {

  init() {
    console.log("hello");
    this.$.password = '';
    this.$.className = 'class test';
    this.$css.color = 'violet';
    this.$.pass = 'hello world pass';
    this.$.planet = 'earth';
    this.$.iter = 2;
    this.$.sun = () => {
      if (this.$.planet == 'earth') {
        return 'sun';
      }
      return 'mars sun';
    };
  }

  afterRender() {
  }

  changePass() {
    if (this.$.pass == 'hello world pass') {
      this.$.pass = 'hello world pass 2';
    } else {
      this.$.pass = 'hello world pass';
    }
  }

  changeClass() {
    if (this.$.className == 'class test') {
      this.$.className = 'class test 2';
    } else {
      this.$.className = 'class test';
    }
  }

  changeColor() {
    if (this.$css.color == 'violet') {
      this.$css.color = 'green'
    } else {
      this.$css.color = 'violet'
    }
  }

  get var1 () {
    return 'b';
  }
}
export { HelloWorld as default };
