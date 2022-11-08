import { DitoElement } from '../../../root.js';
class TestAttr extends DitoElement {
    init() {
        this.$.id = 'empty-id';
        this.$.nativeId = 'native-id';
    }
}
export {TestAttr as default};
