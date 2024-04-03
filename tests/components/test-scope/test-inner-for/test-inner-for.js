import { DitoElement } from '../../../../src/ditoelement.js';
class TestScopeForItem extends DitoElement {
    init() {
        this.$.row = 'hello';
        this.$.rows = [{test: 'test'},{test: 'test2'}]
    }

    change() {
        console.log('change')
        this.$.rows = [{test: 'test'},{test: 'test4'},{test: 'test3'}]
    }
}
export {TestScopeForItem as default};
