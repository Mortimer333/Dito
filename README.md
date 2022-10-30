# Dito
Light weight library with components, template syntax, bindings and dynamic CSS.

### JS:
```js
import { DitoElement } from 'ditoelement.js';
class EarthElement extends DitoElement {
  init() {
    this.$.icon = '🌎';
    this.$.name = 'earth';
    this.$.className = 'earth-class';
  }
}
export { EarthElement as default };
```

### HTML:
```html
<h1 @a:class="className">Planet: {{name}} {{icon}}</h1>
```

### Output:

```html
<h1 class="earth-class">Planet: earth 🌎</h1>
```

# Components
Main purpose of this library is to have reusable Front End components with their own scope in CSS and JS without need for any large frame to make it work. So the main difference between this and ie. Vue is that components are not in the site on the load time but are downloaded later. So you can register hundrends on components but if they are not used on this page they will not be downloaded which helps with keeping website slim.
To use any of the library features you have to create component and point Dito instance where to look for it:
```js
const container = new Dito({
  url: 'http://localhost/components/',
});
```
## Settings
You can pass into Dito instance few settings to customize behaviour of the library:
- **[Required] url** - url to the folder with components
- **[Optional] filename** - default name of the component files
  - Default: `main`
- **[Optional] headers** - what headers should be sent with requests for components' files (except  for js file request as this is done with native `import` method)
  - Default: `<empty object>`
- **[Optional] params** - what parameters should be sent in `uri` when requesting `CSS` and `HTML`
  - Default: `<empty object>`
- **[Optional] localStorage** - should your components be saved into `localStorage` for later use or retrieved each time user requests you site from server
  - Default: `true`

## Register component

```js
container.register('earth-element', 1);
```

`register` method accepts 4 arguments:
1. **[Required]** Components tag name
   - Tags' name must contain `-` (hypen), it's a requirment forced by `HTMLElement` native API
2. **[Required]** Version, used when deciding if to request files from server or use components saved in `localStorage` (also `cache bursting`)
3. **[Optional]** Additional path to the component (in case it was nested).
   - **Default**: `<empty string>`
   - For example you've create component inside other components folder (`element-one/element-two`) then you need to tell library to search for the component inside `element-one` folder by passing `element-one/` into 3rd argument. It will then check folder `http://localhost/components/element-one/` in search of component `element-two`.
4. **[Optional]** Force request -  it will retrieve component even if it's not on the page
   - **Default**: `false`

```js
container.register('element-two', 1, 'element-one/', true);
```
With this you are good to go and create your first component.

## Create component

### Structure
Dito expects you to create specific structure of files, so script knows where to search for specific data:
```
components/
-- element-one/
---- main.js
---- main.css
---- main.html
---- element-two/
------ main.js
------ main.css
------ main.html
-- element-three/
---- main.js
---- main.css
---- main.html
```
As you can see on the example above, components' files have to be put inside the folder with the same name as elements' tag name. Components can be nested (in case of nesting you have to specify path to the nested element) and each of them must have three files:
- **main.js** - Module with you component classs extending imported `DitoElement` class and exporting created class as default
- **main.html** - Your components template, here you can use all the feature presented you by this library
- **main.css** - you component scoped styles. Each rule will be prefixed in a way that will make styles there be only applied to this component
  - **!IMPORTANT** Even if there will be two components with the same name their styles might differ due to Dynamic CSS feature so if you have css that matches all components and doesn't change it is recommendet to not include it in components' css file

#### `main.js` bare minimum:

```js
import { DitoElement } from 'ditoelement.js';
class ElementOne extends DitoElement {}
export { ElementOne as default };
```
`main.html` and `main.css` can be empty

### Usage
When you've had create all required file and made sure to follow all the instruction than you can register you component and use it on the site:
```html
<element-one></element-one>
<script type="text/javascript">
  const container = new Dito({
    url: 'http://localhost/components/',
  });
  container.register('element-one', 1);
</script>
```

# Observables
Any variable you would use in HTML or CSS must be defined in **Main Observables** - `$` and `$css`.

Any class created from `DitoElement` has access to this variables inside their instance (as well as other functionality). Anything defined in `$` will be available in template and anything defined in `$css` will be available in styles _(seperation of those file was made to avoid rerenders without any change)_.
Try to save in `$` and `$css` only variables that appear in files as any change which results in different value assigned to the attribute will call for rerender of the components template or styles.

#### Functionality:
```js
class ElementOne extends DitoElement {
  init() {
    this.$.value = 'value';
    this.$css.url = 'http://localhost';
  }
}
```

#### Styles:
```css
div {
  background-image: url("{{ url }}/image.png");
}
```
#### Template:
```html
<p>{{ value }}</p>
```

# Events
In previous example you can see that I used method `init` inside the `ElementOne` class. It's one of the few "event" calls during the life cycle of the components:
- **prepare** - called before any preparation of the `DitoElement` constructor but after `HTMLElement` constructor was called
- **init** - called only once per component instance, before its first render
- **beforeRender** - called each time before render of component was started
- **afterRender** - called each time render finished (successfully or not), as first argument it accepts result fo ther render

# Template language
To help with creation of html a lot of frameworks (also this one) introduced template language - syntax which allows you to dynamically change the content of your template without need for custom js.
Inside them you can

## Executables

Similarly to other frameworks with template language (Twig, Vue, Angluar etc.) for injecting values into template we are using mustache syntax: `{{ value }}`.
```html
Your value: {{value}}
```
## If and For

Library also supports `for` and `if` features. Like all special actions you have to prefix them with `@`:
```html
<div @if="display">
  I am shown!
<div>
<div @if="!display">
  I am hidden!
<div>
<p @for="3">
  I will be shown 3 times
</p>
```
anything inside `if` and `for` have to be wrapped in string and is executed similarly to `executables`. As `if` is pretty self explanatory we will move to the `for`

### `for`
`for` accepts:
- numbers
- arrays
- objects

It will iterate over all those 3 types but each will behave slithly different:
- When `number` was passed, `for` will iterate the amount of time number is equal or bigger then zero. It will also create key for it but not value will available.
- When `array` was passed, `for` will iterate the same amount of time as is arrays length. It will create kew and value.
- When `object` wass passed, `for` will iterate the numer of time that equals length of array from `Object.key` method. It will create kew and value.

#### `$key` and `$value`
Inside `for` you have access to two additional values `$key` and `$value`:
- `$key` - iteration counter
- `$value` - current item (in case of number it will be `null`)

```html
<p @for="3">
  {{ $key }}   // 0, 1, 2
  {{ $value }} // null, null, null
</p>
<p @for="['a', 'b', 'c']">
  {{ $key }}   // 0, 1, 2
  {{ $value }} // 'a', 'b', 'c'
</p>
<p @for="{aKey: 'a', bKey: 'b', cKey: 'c'}">
  {{ $key }}   // 'aKey', 'bKey', 'cKey'
  {{ $value }} // 'a', 'b', 'c'
</p>
```

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
