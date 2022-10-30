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

## Lify cycle
In previous example, you can see, that I've used method called `init` inside the `ElementOne` class. It's one of the few "event" calls during the life cycle of the components:
- **prepare** - called before any preparation of the `DitoElement` constructor but after `HTMLElement` constructor was called
- **init** - called only once per component instance, before its first render
- **beforeRender** - called each time before render of component was started
- **afterRender** - called each time render finished (successfully or not), as first argument it accepts result fo ther render

# Template language
Quick and easy way to build HTML without need for additonal JS. In template inline call you have access to all values inside `$` and methods defined on the class.

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
anything inside `if` and `for` have to be wrapped in string symbols and is resolved similarly to `executables`. As `if` is pretty self explanatory we will move to the `for`:

### `for`
`for` accepts:
- numbers
- arrays
- objects

It will iterate over all those 3 types but each of them will behave slithly different:
- When `number` was passed, `for` will iterate the amount of time the `number` is equal or bigger then zero. It will also create key for it but no value will available.
- When `array` was passed, `for` will iterate the same amount of time as its arrays length. It will create kew and value.
- When `object` wass passed, `for` will iterate the numer of time that equals length of array from `Object.key` method. It will create key and value.

#### `$key` and `$value`
Inside `for` you have access to two additional values `$key` and `$value`:
- `$key` - iteration counter
- `$value` - current item (in case of `number` it will be `null`)

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

## Events
You can attach any kind of event to the element that will be resolved with functionality from template by addign `@e:` prefix and transforming name to the one used by `addEventListener`:
#### before:
```html
<button type="button" name="button" onclick='ClassInstance.changeColor()'>Change color!</button>
```
#### after:
```html
<button type="button" name="button" @e:click='changeColor()'>Change color!</button>
```

Variable changed inside `event` will be replaced in real `$` - see "Weird behaviour" for more info.

## Attributes
Binding attributes to observables is similar to the `events` - prefix your attribute with `@a:` then name of your attribute used in JS:
#### before:
```html
<p class="quote">
  Lorem ipsum
</p>
```
#### after:
```html
<p @a:className="pClass">
  Lorem ipsum
</p>
```
Class will be updated each time `pClass` changes.

## Comunication between components
All of the components are downloaded asnychroniusly and can't really see each other without some setup to fix this problem library presents similar solution to Angular: `inputs`, `outputs` and `binds`.

### Inputs
To pass values into the instance and severe connection to it you would use `input` - start with `@i:` then add the name of the chosen attribute (it can exist or not):
```html
<element-two @i:list="[1,2,3]" @i:name="customName"></element-two>
```
Now this element will have two additional value `list` and `name` which will replace or create new values inside of it.

### Outputs
Outputs are used when you want to dispatch an event without need to create custom events. When you emit this value the parent element will run its updating script. Inside the call you are able to pass value up to the parent which can later use it for its own purposes. Similarly to `input` start with `@o:` and add name of existing or not attribute in `$outputs` variable in the child element:
```html
<element-two @o:change="childChanged($event)"></element-two>
```
#### `$event`
Outputs have their own special variable, called `$event`, which holds value passed from the emitter (from child which dispatched this output).

#### Child setup
To set up `outputs` you don't have to do anything special, the only thing to remember is to actually call the `emit` on `output`:

```es
  outFn() {
    this.$output?.change.emit({ status: 'changed' });
  }
```

As you can see we are checking if `$output` variable has attribute to call emit on (`$output?.change`). Script automatically detects when output was set and creates/replace attribute to the one containing emit method. So creation of output actually comes from parent and not from child.

Variable changed inside `output` will be replaced in real `$` - see "Weird behaviour" for more info.

### Binds
Value when changed updates across all binded parents and children. It will always have the same value across all binded instances and will appear the same in all templates. It syntax is similar but completly different then other special actions: start with `@b:` then name of attribute to bind in child and in value only place name of variable you want to bind in parent - nothing else:
```js
<element-two @b:twoBind="oneBind"></element-two>
```
Now when `twoBind` is updated `oneBind` will be updated and when `oneBind` changes `twoBind` will also change. Remember that this will make rerender all of the binded components which might be performance issue when wrongly implemented.

#### Nativ tags
You can bind values on native tags like `input`. It extremly usefull when used on `value`:
```js
<input @b:value="inputValue">
```
**!IMPORTANT**: update happenes on `change` event which is triggered mostly on `focusout` when using inputs.

## Injected HTML
You can inject HTML to the components and decide where to use it inside the template with `$inject` special variable:
```html
<element-two>
  <h1>Hello, its ElementOne</h1>
  <h3>Just simple Dito component</h3>
</element-two>
```
And `element-two` template:
```html
Our parent:
{{ $inject }}
```
This will result in all html between `element-two` tags being rendered in place of `$inject` variable:

```html
Our parent:
<h1>Hello, its ElementOne</h1>
<h3>Just simple Dito component</h3>
```

**!IMPORTANT** Currently injected HTML doesn't benefit from any functionality presented by library (executables, for, if etc.). Only simple HTML is accepted.

# Dynamic CSS
CSS is also downloabeing downloaded and assigned to the component so why not allow using variables inside of it? Anything set in `$css` will be available inside your components CSS file:

#### Functionality:
```js
init() {
  this.$css.color = "brown";
}
```
#### Styles:
```css
p {
  color: {{ color }};
  background-color: {{ color }};
}
```
Rerenders of the template doesn't actually update CSS, so you need to specifically change value in `$css` to make it update.

### Currently CSS file supports only executables

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
