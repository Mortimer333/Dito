[< Back](REGISTER&LOAD.md)      
[< Table of Contents](../README.md#advanced-stuff)

# Observables & Scope

- [Variables](#variables)
- [Methods](#methods)
- [Render Now](#render-now)
- [Object and Arrays](#object-and-arrays)

Now with working components we should start filling our components with content to make them useful.
Unfortunately before we can jump to the fun part we need to understand what is visible in which file 
and how this library detect change and rerenders file content. 

We need to talk about `Observables`:
Observables are that part of the component which defines the scope of the accessible variables inside the file:
- `$` - HTML scope
- `$css` - CSS scope

### Variables
Everything you have set inside the `$` will be available inside the HTML file and everything ou have set in `$css`
will be visible in CSS file. Also any change on the `$` attribute will result in rerendering of the HTML file and any 
change on the `$css`result in rerendering of the CSS rules (more on that in `Dynamic CSS`).

So to access `showTitle` variable inside the HTML we need to define it inside our component before 
component is rendered, so it won't throw an error about missing variable. To achieve such result we can use
`init` method (read more in `Life Cycles`):
```js
class UserPanel extends DitoElement {
  init() {
    this.$.showTitle = false;
  }
}
```
With this variable set we can create our HTML which will conditionally show title of the User Panel:
```html
<h1 @if="showTitle">User Panel Title</h1>
```

### Methods
But this is boring, now we can't see the title whatever we do. Let's add button which will let us preview it:
```html
<button @e:click="toggleTitle()">Toggle title</button>
```
> Ignore for now anything prefixed with `@`, it will be explained later

We also need to created used method `toggleTitle`:
```js
class UserPanel extends DitoElement {
  init() {
    this.$.showTitle = false;
  }
  
  toggleTitle() {
    this.$.showTitle = !this.$.showTitle;
  }
}
```
Notice that we didn't add the function to the `$` set we were able to access it inside the HTML. 
It is because methods are scoped per class, so anything in this class can be used in the HTML/CSS
but any methods from the parent are inaccessible to the script.

### Render Now
Now clicking the button should resolve in title showing up after small moment. Why was there a moment of timeout
before action took effect?

To not rerender component each time variable has been changed there is a debounce queue which will resolve the action 
in 200ms after last change was detected. But if you need for the change to appear right away you need to clear
queue and request render manually:
```js
toggleTitleNow() {
  this.$.showTitle = !this.$.showTitle;
  this.clearRenderQueue();
  this.render();
}
```
code above will result in instantaneous change in the website, be it disappearance of the title or its reappearance.

### Object and Arrays
Change detection works ideally with simple types but has problems with objects and arrays. If you didn't
assign new object or array it won't detect that inside of it was changed due to performance reasons. To 
manually trigger render you can use `render` method but this might not work as intended due to multiple 
checks and validation before allowing for component to render. To make sure that component will be rerendered
use `queueRender` which will after short while will result in the component rerendering:
```js
addToArray(item) {
  this.$.array.push(item);
  this.queueRender();
}
```
As you might notice this library allows for a lot of manual interaction with core components and allows to
overwrite script decisions with your own. It's all about control and flexibility.

[{{ Executables }} >](EXECUTABLES.md)
