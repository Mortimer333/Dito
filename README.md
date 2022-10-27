# jMonkey
Light weight library to allow separating frontend into components

# Features:
- [DONE] changes in events and outputs should update actual value in observable
- [DONE] passing methods on change - (bind)
- [DONE] passing arguments - [bind]
- [REMOVED] pipes
- [DONE] Attributes
- [DONE] persistent storage
- [DONE] two way binding - ([bind])
- [DONE] if and for's
- [DONE] reusable templates
- [DONE] file separation
- [DONE] events and {{}}
- [DONE] passing html to the inside of element will result in rendering it inside of it
- [DONE] allow choosing where to put injected html

# Weird behaviour

Due to this being simple library there are few weird behaviours.

## Values set in events and outputs overwrite those set in functions
Becuase of how script gets variable values from those features the actual change is applied after the event/output finishes - overwritting any change in process.
So any change during the call, inside classes scope, will be overwritten by the change inside the output/event after it finishes.
### Example:
#### HTML of `<cake-block>` element
```html
{{ test }}
<cake-room @o:test="test = 'output test'; testFn()"></cake-room>
```

#### JS of `<cake-block>` element
```js
class CakeBlock extends RootJoin {
  [...]
  testFn() {
    this.$.test = 'function test';
  }
  [...]
}
```
#### Output
```html
output test
<div class="cake-room">Cake room!</div>
```

As you can see `test` got changed to `"output test"` even thought `testFn` got called later. This happened because `test` in this scope is disconnected from main observer and assigned again. **if changed**. after the event/output finishes. But if there was no change:

### New HTML of `<cake-block>` element
```html
{{ test }}
<cake-room @o:test="testFn()"></cake-room>
```
Then output will be as expected:

### Output:
```html
function test
<div class="cake-room">Cake room!</div>
```

The same rule applies to events:

#### HTML of `<event-cake-block>` element
```html
{{ test }}
<button @e:click="testEvent = 'output test event'; testEventFn()">Click</button>
```

#### JS of `<event-cake-block>` element
```js
class CakeBlock extends RootJoin {
  [...]
  testEventFn() {
    this.$.testEvent = 'function test event';
  }
  [...]
}
```

#### Output:
```html
output test event
<button>Click</button>
```
