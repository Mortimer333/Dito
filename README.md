# jMonkey
Light weight library to allow separating frontend into reusable components

# Features:
- [DONE] bind default attributes
- [DONE] have only one style tag
- [DONE] dynamic CSS variables?
- [DONE] Setting to allow use of local storage
- [DONE] Find a way how to figure out when local storage is overflowing and how to remove old templates
- [DONE] check if registrated component (which wasn't displayed at start) is properly downloaded
- [DONE] Check if binded value when passed as bind to the third component works as intended
- [DONE] changes in events and outputs should update actual value in observable
- [DONE] passing methods on change - (bind)
- [DONE] passing arguments - [bind]
- [DONE] Attributes
- [DONE] persistent storage
- [DONE] two way binding - ([bind])
- [DONE] if and for's
- [DONE] reusable templates
- [DONE] file separation
- [DONE] events and {{}}
- [DONE] passing html to the inside of element will result in rendering it inside of it
- [DONE] allow choosing where to put injected html
- [REMOVED] Event when first render finishes and every component is downloaded - not really doable with all those asyncs, and removing that creates pretty long waiting time
- [REMOVED] Add jmonkey-spinner class - if someone wants to have loaders they will add them
- [REMOVED] Add a way to send all templates for page in one file - can't put js modules in string and make it work with Function
- [REMOVED] Save JS in local storage and build it from Function - same reason as single file - can't put exports in string
- [REMOVED] pipes - not needed, we can actually use method

# Weird behaviour

Due to this being a very simple library there are few weird behaviours because of corner cutting.

## Values set in events and outputs overwrite those set in functions
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

and so on.

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
