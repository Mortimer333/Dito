# Dito
Lightweight library with components, template syntax, bindings and dynamic CSS.

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
Main purpose of this library is to have reusable Front End components with their own scope (both CSS and JS) without need for large framework to make it work.

The main difference between this and i.e. Vue is that components are not on the site but are downloaded later. So you can register hundreds of components but if they are not used on current page they will not be downloaded which helps with keeping the website slim.

**!IMPORTANT** - To use any of the library features you have to create component and point Dito instance where to look for it. You cannot use any of it functionality inside the plain html file even if you've included library. Script is forcing the use of components.

To start whole process create new instance of `Dito` and set URL path to the folder containing your components:
```js
const container = new Dito({
  url: 'http://localhost/components/',
});
```
## Settings
You can pass into the instance few settings to customize the behaviour of the library:
- **[Required] url** - url to the folder with components
- **[Optional] headers** - what headers should be sent with requests for components' files (except for JS file request as this is done with native `import` method)
  - Default: `<empty object>`
- **[Optional] params** - what parameters should be sent in `uri` when requesting `CSS` and `HTML`
  - Default: `<empty object>`
- **[Optional] localStorage** - should your components be saved into `localStorage` for later use or retrieved each time user requests your site from server
  - Default: `true`
- **[Optional] callback** - function which will be fired when all components are downloaded and rendered
- **[Optional] arguments** - arguments to pass into callback function

## Register component

```js
container.register('earth-element', 1);
```

`register` method accepts 4 arguments:
1. **[Required]** Components tag name (which is also name of the files).
   - Tags' name must contain `-` (hyphen), it's a requirement forced by `HTMLElement` native API
2. **[Required]** Version, used when deciding if to request files from server or use components saved in `localStorage` (also `cache bursting`)
3. **[Optional]** Additional path to the component (in case it was nested).
   - **Default**: `<empty string>`
   - For example you've created component inside other component's folder (`element-one/element-two`) then you need to tell library to search for the component inside `element-one` folder by passing `element-one/` into 3rd argument. It will then check folder `http://localhost/components/element-one/` in search of component `element-two`.
4. **[Optional]** Force request -  it will retrieve component even if it's not on the page
   - **Default**: `false`

```js
container.register('element-two', 1, 'element-one/', true);
```

## Loading components
When you have registered all your components you have to call `load` method. It's an `async` method which will load components behind the scene but if you want to wait until top components are loaded you can `await` its end:
```js
await container.load();
```

With this you are good to go and create your first component.

## Create component

### Structure
Dito expects you to create specific structure of files, so the script knows where to search for data:
```
components/
-- element-one/
---- element-one.js
---- element-one.css
---- element-one.html
---- element-two/
------ element-two.js
------ element-two.css
------ element-two.html
-- element-three/
---- element-three.js
---- element-three.css
---- element-three.html
```
As you can see on the example above, components' files have to be put inside the folder with the same name as elements' tag name and even have the name as the tag (this helps with debugging). Components can be nested (in case of nesting you have to specify path to the nested element) and each of them must have three files:
- **.js** - Module with your component class extending imported `DitoElement` class and exporting created class as default
- **.html** - Your components' template, here you can use all the feature presented you by this library
- **.css** - Your component scoped styles. Each rule will be prefixed in a way that will make styles there be only applied to this component
  - **!IMPORTANT** Even if there will be two components with the same name their styles might differ due to Dynamic CSS feature

#### Bare minimum:

`main.js`
```js
import { DitoElement } from './ditoelement.js';
class ElementOne extends DitoElement {}
export { ElementOne as default };
```
`main.html` and `main.css` can be empty.

### Usage
When you've had created all required file and made sure to follow all the instruction then you can register your component and use it on the site:
```html
<element-one></element-one>
<script type="text/javascript">
  const container = new Dito({
    url: 'http://localhost/components/',
  });
  container.register('element-one', 1);
  container.load();
</script>
```

# Observables
Any variable you would use in HTML or CSS must be defined in **Main Observables** - `$` and `$css`.

Any class created from `DitoElement` has access to these variables inside their instance (as well as other functionality). Anything defined in `$` will be available in template and anything defined in `$css` will be available in styles _(separation of those file was made to avoid re-renders without any change)_.

Templates can only access attributes defined in `$` and methods. Styles can access attributes defined in `$css` and methods. Any change to `$` will make template re-render, any change in `$css` will make styles re-render. It is pretty straight forward ;D.

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

## Life cycle
In the previous example, you can see, that I've used method called `init` inside the `ElementOne` class. It's one of the few "event calls" during the life cycle of the components:
- **prepare** - called before any preparation of the `DitoElement` constructor but after `HTMLElement` constructor was called
- **init** - called only once per component instance - before its first render
- **beforeRender** - called each time the render of component is about to start
- **afterRender** - called each time render finishes (successfully or not), as first argument it accepts result for the render
Those exist so they can be set in parents and inherited by extensions:
```js
class Parent extends DitoElement
{
  beforeRender() {
    childBeforeRender();
  }
  childBeforeRender() {} // placeholder
}
class Child extends Parent
{
  childBeforeRender() {
    // before it will be called all parent code is executed as function `beforeRender` is inherited
  }
}
```

### Custom events
The real events can be listened only on custom elements (which should be obvious):
- `firstrender` - called before component will be rendered for the first time
- `firstrendered` - called after component was rendered for the first time
- `render` - called each time component is rendered but first
- `render` - called each time component was rendered but first

```html
<custom-component @e:firstrender="console.log('First Render!');">
</custom-component>
```

# Template language
Quick and easy way to build HTML without need for additional JS. In template inline call you have access to all values inside `$` and methods defined on the class.

## Executables

Similarly to other frameworks with template language (Twig, Vue, Angluar etc.) for injecting values into template we are using moustache syntax: `{{ value }}`.
```html
Your value: {{value}}
```
## If and For

The library also supports `if` and `for` features. Like all special actions you have to prefix them with `@`:
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
Anything inside `if` and `for` have to be wrapped in string symbols and is resolved similarly to `executables`. As `if` is pretty self-explanatory we will move to the `for`:

### `for`
`for` accepts:
- numbers
- arrays
- objects

It will iterate over all 3 of those but each of them will behave slightly differently:
- When `number` was passed, `for` will iterate the amount of time the `number` is equal or bigger than zero. It will also create key for it, but no value will be available.
- When `array` was passed, `for` will iterate the same amount of time as its array's length. It will create key and value.
- When `object` was passed, `for` will iterate the number of time that equals length of array from `Object.key` method. It will create key and value.

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

##### `@value` and `@key`
You can rename `$key` and `$value` variables when you want, for example, use it inside nested for:
```html
<div @for="['a','b']" @key="index" @value="letter">
  <p @for="2">{{ index }} : {{ letter }} - {{ $key }}</p>
</div>
```
Output:
```html
<div>
  <p>0 : a - 0</p>
  <p>0 : a - 1</p>
</div>
<div>
  <p>1 : b - 0</p>
  <p>1 : b - 1</p>
</div>
```

##### `@min` and `@def-min`
If you want to render a tray with at least some amount of items you can use `@min` special attribute. It will make sure that `for` iterated at least the amount of times you passed there (it only accepts numbers).
```html
<p @for="['1', '2']" @min="3">
  {{ $key }} {{ $value }}
</p>
```
Output:
```html
<p>
  0 1
</p>
<p>
  1 2
</p>
<p>
  2
</p>
```
As you can see there are 3 paragraphs even though the passed array had only 2 items. But the last item doesn't have a value which might create need for creating not needed ifs and checks which mostly can be resolved with default item: `@def-min`:
```html
<p @for="['1', '2']" @min="3" @def-min="'default'">
  {{ $key }} {{ $value }}
</p>
```
Output:
```html
<p>
  0 1
</p>
<p>
  1 2
</p>
<p>
  2 default
</p>
```

## Events
You can attach any kind of event to the element that will be resolved with functionality from the template by adding `@e:` prefix and transforming name to the one used by `addEventListener`:
#### before:
```html
<button type="button" name="button" onclick='ClassInstance.changeColor()'>Change color!</button>
```
#### after:
```html
<button type="button" name="button" @e:click='changeColor()'>Change color!</button>
```

Variables changed inside the `event` will be replaced in real `$` - see "Weird behaviour" for more info.

#### `$event`
Event variable passed normaly to the function call is now available under new name `$event`. Use it like you would with normal variable:
```html
<button type="button" name="button" @e:click='console.log($event); changeColor($event)'>Change color!</button>
```

## Attributes
Binding attributes to observables is similar to the `events` - prefix your attribute with `@a:` then add name of chosen attribute (remember to use JS names):
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

### Defaults

You can define default attributes for custom element in `getDefaults` method:
##### HTML
```html
<custom-element class="test" value="replace" name="add: "></custom-element>
```
##### JS
```js
  getDefaults() {
    return {
      class: {
        value: 'appended'
      },
      value: {
        value: 'value',
        type: 'replace'
      },
      name: {
        value: 'test',
        type: 'add'
      }
    };
  }
```
as you can see in the example above the name of the attribute you want to set is in the key of the object and item has two properties:
- value - string value to be put in the attribute
- type - not required - defaults to `append`, defines how data should be inserted into attribute:
  - `append` - `value` will be added after space - `class="test"` => `class="test appended"`
  - `add` - `value` will be added to the existing attribute (without space) - `name="add: "` => `name="add: test"`
  - `replace` - `value` will replace the content of chosen attribute - `value="replace"` => `value="value"`

## Communication between components
All the components are downloaded asynchronously and can't really see each other without some setup, so to fix this problem library presents similar solution to Angular: `inputs`, `outputs` and `binds`.

### Inputs
To pass values into the instance and severe connection to it, you would use `input` - start with `@i:` then add the name of the chosen attribute (it can exist or not):
```html
<element-two @i:list="[1,2,3]" @i:name="customName"></element-two>
```
Now this element will have two additional values `list` and `name` which will replace or create new value inside of the component.

### Outputs
Outputs are used when you want to dispatch an event without the need to create custom one. When you emit this value the parent element will run its assigned script which provides an option to sent data from child to parent. Similarly to `input` start with `@o:` and than you add the name of (existing or not) attribute in `$output` variable, in the child element:
```html
<element-two @o:change="childChanged($event)"></element-two>
```
#### `$event`
Outputs have their own special variable, called `$event` (like `events`), which holds the value passed from the emiter (from the child which dispatched this output).

#### Child setup
To set up `outputs` you don't have to do anything special, the only thing to remember is to actually call the `emit` on `output`:

```es
  outFn() {
    this.$output?.change.emit({ status: 'changed' });
  }
```

As you can see we are checking if `$output` variable has attribute before calling emit on it (`$output?.change`). The script automatically detects when output was set and creates/replace attribute to the one containing `emit` method. So creation of output actually comes from parent and not from child.

Variable changed inside `output` will be replaced in real `$` - see "Weird behaviour" for more info.

### Binds
Bound value when changed is updated across all bound parents and children. It will always have the same value across all bound instances and will appear the same in all templates. It syntax is similar but completely different from other special actions: start with `@b:` then name of attribute to bind in child and in value place only the name of variable you want to bind (nothing else):
```js
<element-two @b:twoBind="oneBind"></element-two>
```
Now when `twoBind` is updated `oneBind` will be updated and when `oneBind` changes `twoBind` will also change. Remember that this will make re-render all the bound components which might be performance issue when wrongly implemented.

#### Native tags
You can bind values to native tags like `input`. It is extremely useful when used on `value`:
```js
<input @b:value="inputValue">
```
**!IMPORTANT**: update happens on `change` event or `MutationObserver` for native elements.

## Injected HTML
You can inject HTML to the component and decide where to use it inside the template with `dito-inject` tag:
```html
<element-two>
  <h1>Hello, its ElementOne</h1>
  <h3>Just simple Dito component</h3>
</element-two>
```
And `element-two` template:
```html
Our parent:
<dito-inject></dito-inject>
```
This will result in all HTML between `element-two` tags being rendered in place of `dito-inject` tag:

```html
Our parent:
<h1>Hello, its ElementOne</h1>
<h3>Just simple Dito component</h3>
```

### Packing
You can pack injected nodes in packages and use them in different places inside template with `dito-pack` attribute:
```html
<element-two>
  <h1 dito-pack="'helloPackage'">Hello, its ElementOne</h1>
  <h3 dito-pack="'bio'">Just simple Dito component</h3>
</element-two>
```
`element-two` template:
```html
Our parent:
<dito-inject dito-pack="'helloPackage'"></dito-inject>
Bio:
<dito-inject dito-pack="'bio'"></dito-inject>
```
#### Note
Pack names are defined in strings to enable arguments passing and calculating the name. Thanks to that you can use injects like templates.

This will separate injected HTML and render it in two different places:
```html
Our parent:
<h1 dito-pack="'helloPackage'">Hello, its ElementOne</h1>
Bio:
<h3 dito-pack="'bio'">Just simple Dito component</h3>
```
Injected HTML benefits from all special actions this library offers but this also means that injection cannot be multiplied. What does this mean?
If we were to put the same package twice but in different place:
```html
Our parent:
<dito-inject dito-pack="'helloPackage'"></dito-inject>
Bio:
<dito-inject dito-pack="'bio'"></dito-inject>
Other Bio:
<dito-inject dito-pack="'bio'"></dito-inject>
```
Notice that the same component was rendered twice:
```html
Our parent:
<h1 dito-pack="'helloPackage'">Hello, its ElementOne</h1>
Bio:
<h3 dito-pack="'bio'">Just simple Dito component</h3>
Other Bio:
<h3 dito-pack="'bio'">Just simple Dito component</h3>
```
This is because we are reusing generated components with all their attributes and special actions. But, the other way around, injected HTML with the same name of package will be bundled and rendered altogether:
```html
<element-two>
  <h1 dito-pack="'helloPackage'">Hello, its ElementOne</h1>
  <h3 dito-pack="'bio'">Just simple Dito component</h3>
  <p dito-pack="'bio'">Trying to live my best life</p>
</element-two>
```
Rendered:
```html
Our parent:
<h1 dito-pack="helloPackage">Hello, its ElementOne</h1>
Bio:
<h3 dito-pack="bio">Just simple Dito component</h3>
<p dito-pack="bio">Trying to live my best life</p>
```

### @use
You can also inject some data into injected element (normally `dito-inject` has scope of the parent component so this was you can pass data into it - great when using as template):
Element One:
```html
<element-two>
  <h1>{{ use.name }}</h1>
</element-two>
```
Element Two:
```html
<dito-inject @use="{name: 'test'}"></dito-inject>
```
Render:
```html
<element-two>
  <h1>test</h1>
</element-two>
```
### @nuse
If you need to specify the name for the `use` variable you can do it by `@nuse`:
Element One:
```html
<element-two>
  <h1 @nuse="data">{{ data.name }}</h1>
</element-two>
```

## `@get`
To avoid additional IDs you can retrieve node by `@get` special attribute:
```html
<div @get="'div'"></div>
```
And then access it inside `$self` attribute of all custom and some native nodes:
```js
this.$self.get.div // div
```
Notice that I'm using string to set the name of the node as this attribute it threated as JS field which means you can automitize retrival of the nodes:
```html
<div @get="'div' + $key" for="3"></div>
```
JS:
```js
this.$self.get.div0 // div
this.$self.get.div1 // div
this.$self.get.div2 // div
```

# Dynamic CSS
CSS is also being downloaded and assigned to the component, so why not allow using variables inside of it? Anything set in `$css` will be available inside your components CSS file in scoped styles. To understand what is means you have to understand that there are two types of CSS rules:
- scoped - assigned to single custom element and repeated for each present element
- global - only assigned to document once, normal style without template functionality and never rerended

## Scoped - `@self`
Simple example of scoped style:
```css
@self h1 {
  color: {{ color }};
}
```
will turn into something like this:
```css
custom-element[dito-t="1669705750862"][dito-i="0"] h1 {
  color: red;
}
```
To enable template syntax in CSS you have to use `@self` special rule, but it doesn't have to be at the start of rule like with other at-rules:
```css
@media only screen and (max-width:768px) {
  main @self p {
    color: {{ color }};
  }

  div {
    padding: {{ padding }};
  }
}
```
Notice that I used template syntax in rule without `@self` in the definition and that's because, for performance reasons, script treat the whole media as a single rule with enabled syntax language and will replace it when `$css` changes even though only one rule there has `@self` on it.

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
