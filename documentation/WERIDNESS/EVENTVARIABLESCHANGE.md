# Values set in events and outputs overwrite those set in functions
Because of how the script retrieves variable values from those features (outputs/events) the actual change is applied after the event/output finishes - overwriting any change made in class method in process.
So any change during the call, inside classes scope, will be overwritten by the change inside the output/event after it finishes. **(that's not all, read to the end)**

### Example:

#### HTML of `<cake-block>` element
```html
{{ test }}
<cake-room @o:test="test = 'output test'; testFn()"></cake-room>
```

#### JS of `<cake-block>` element
```js
class CakeBlock extends DitoElement {
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

As you can see `test` was rendered as `"output test"` even thought `testFn` got called later. This happened because `test` in this scope is disconnected from main observer and assigned again after call finishes **(if changed)**. But if there was no change:

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
class CakeBlock extends DitoElement {
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

### The very weird part
If you emit output or dispatch method again the correct result will appear. That's because the old value matches new values in function scope. The script intentionally doesn't check if the new value is different from the one in the main observer as it would always overwrite any changed made in functions (in class scope).

#### First render of `<cake-block>`
```html
output test
<div class="cake-room">Cake room!</div>
```

#### Second render of `<cake-block>`
```html
function test
<div class="cake-room">Cake room!</div>
```

#### Third render of `<cake-block>`
```html
output test
<div class="cake-room">Cake room!</div>
```

And so on.

## Solution
Don't mix function calls and assignment in events or output. Use one or another, or you might encounter some unexpected behaviour.
### This

```html
<cake-room @o:test="test = 'output test'"></cake-room>
```

### Or this

```html
<cake-room @o:test="testFn()"></cake-room>
```

### But not both!
