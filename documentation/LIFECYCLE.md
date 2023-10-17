[< Back](COMPONENTSCOMMUNICATION.md)      
[< Table of Contents](../README.md#advanced-stuff)

# Life Cycle
Each component follows the same `Life Cycle`:
1. [`init`](#init)
2. First render
   - [`beforeFirstRender`](#beforefirstrender)
   - [`afterFirstRender`](#afterfirstrender)
3. Component's usage (rerendering)
    - [`beforeRender`](#beforerender)
    - [`aftereRender`](#afterrender)
    - [`beforeCssRender`](#beforecssrender)
    - [`afterCssRender`](#aftercssrender)
4. Removal from page - Not implemented yet, still have to figure out how to differ between `@if` page 
removal and the actual remove

All `render` methods have equivalence in form of events:
- beforeFirstRender => [firstrender](#firstrender---beforefirstrender)
- afterFirstRender => [firstrendered](#firstrendered---afterfirstrender)
- beforeRender => [render](#render---beforerender)
- afterRender => [rendered](#rendered---afterrender)

And additional event for internal purposes: [loadfinished](#loadfinished)

### `init`

Init method is called first time new instance of component has been added to the page. If it was hidden with `@if`
it should trigger only when condition returns truthy value. 

So, it at the top of the `Life Cycle` which means that it is before anything has been rendered. 
In `init` you don't have access to any contents of the component (this also refers to `@get`) because component wasn't
rendered yet for the first time.

I normally use `init` for retrieving data from server and/or set all variables on `$` - initialize your component.
> `init` method is treated by script as a `Promise`, which means that you can do any calls you need and script will
> wait for them to finish before going to another step.
```js
class ElementTest extends DitoElement {
  async init() {
    const response = await fetch("http://website.com/posts.json");
    this.$.posts = await response.json();
  }
}
```

### `beforeFirstRender`
As a name suggests this method is fired just before the first render occurs. It is very similar to `init` method
but is slightly later in the process (still, `init` and `beforeFirstRender` can be used interchangeably in most cases).

And like `init` - `beforeFirstRender` - you cannot access anything in the component contents as it is before first 
render. Also, can be used as promise to retrieve needed values:
```js
class ElementTest extends DitoElement {
  async beforeFirstRender() {
    const response = await fetch("http://website.com/posts.json");
    this.$.posts = await response.json();
  }
}
```

### `afterFirstRender`
The supplementary method to `beforeFirstRender`, fired after first render of component (but just shy away to its 
finish). Finally, you can access any part of component's `HTML` after it was rendered. It also can be used as 
promise, but it will only prolong the render execution as after it there are only actions that add finishing touches 
(like setting `dito-ready` attribute). 

> `afterFirstRender` accepts one argument - render status. If render was a success it will be an object with `status` 
> set to `true` 
```json
{ "success": true }
```
> if `error` it will also contain the error object:
```json
{ "success": false, "error": Error }
```
```js
class ElementTest extends DitoElement {
  async afterFirstRender(result) {
    if (!result.success) {
        throw result.error;
    }
    this.ctx = this.$self.get.canvas.getContext('2d');
    this.inputs = this.querySelectorAll('input');
  }
}
```

### `beforeRender`
Basically the same method as `beforeFirstRender` but is called each time the render occurs - even the first one! 
So, if you want to skip the first render you can use internal variable `$self.rendered` that decides if first render 
occurred or not:
```js
class ElementTest extends DitoElement {
  [...]
  async beforeRender() {
    if (!this.$self.rendered) {
        return;
    }

    const canvas = this.ctx.canvas;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
```

### `afterRender`
Same goes for `afterRender` - called each time after component was rendered (also with the status variable).
```js
class ElementTest extends DitoElement {
  [...]
  async afterRender(result) {
    if (!this.$self.rendered) {
        return;
    }

    if (!result.success) {
      throw result.error;
    }

    this.ctx.rect(10, 20, 150, 100);
    this.ctx.fill();
  }
}
```

## CSS Life Cycle
Just like HTML template CSS also has its own Life Cycle - completely independent to HTML methods/events.

### `beforeCssRender`
Fired each time before CSS is rendered. Because it is missing `beforeFirstCssRender` if you need to differ between
first render and rest you can use `$self.css.rendered` internal variable:
```js
class ElementTest extends DitoElement {
  [...]
  async beforeCssRender() {
    if (!this.$self.css.rendered) {
        return;
    }

    if (this.$css.myWidth > 1000) {
      this.$css.myWidth = 1000;
    }
  }
}
```
> First time CSS is rendered is during the first render of the component. This means that CSS render might affect 
> first HTML render time as it calls CSS render synchronously. Any other time it's completely asynchronous to the 
> rest of the process.

### `afterCssRender`
Fired each time after CSS is rendered. Similarly to `afterFirstRender` and `afterRender` it accepts into first argument 
the result of the render (same object as for `afterFirstRender` and `afterRender`), Because it is missing 
`afterFirstCssRender` if you need to differ between first render and rest, you can use `$self.css.rendered` 
internal variable:
```js
class ElementTest extends DitoElement {
  [...]
  async afterCssRender(result) {
    if (!this.$self.css.rendered) {
        return;
    }

    if (!result.success) {
      throw result.error;
    }
  }
}
```

## Events

In case you might need to wait until some nested component loads you can listen for equivalence of the `Life Cycles` 
in form of events:
```html
<shared-input-text @e:firstrender="beforeInputFirstRender($event)"></shared-input-text>
```
#### `loadfinished`

Fired when script is loaded but not in render process yet (not on the page), not really useful outside the internal working

##### `firstrender` - `beforeFirstRender`
##### `firstrendered` - `afterFirstRender`
##### `render` - `beforeRender`
##### `rendered` - `afterRender`

There are no events for CSS life cycle, I might add them later if needed.
> All events are fired after the methods, so script firstly waits until appropriate method has finished 
> (`afterFirstRender`) and then fires the event (`firstrendered`).

[Injectables >](INJECTABLES.md)
