import { DitoElement } from '../../../../src/ditoelement.js';
class TestScopeForItem extends DitoElement {
    init() {
        this.$.rows = [{test: 'test'},{test: 'test2'}]
    }
}
export {TestScopeForItem as default};
