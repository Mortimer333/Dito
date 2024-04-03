# Dito
Lightweight library with components, template syntax, bindings and dynamic CSS.

- [Installation](#installation)
  - [native](#native)
  - [npm](#npm)
- [Framework](#framework)
- [Quick Start](#quick-start)
- [Documentation](#advanced-stuff)

## Preview
### JS:

```js
import { DitoElement } from 'src/ditoelement.js';

class PlanetElement extends DitoElement {
  init() {
    this.$.icons = ['🌎', , '🪐'];
    this.$.planets = ['earth', , 'jupiter'];
    this.$.className = 'planet-class';
  }
}

export { PlanetElement as default };
```

### HTML:
```html
<h1 @a:class="className" @for="3" @if="$value !== 1">Planet {{ $value + 1 }}: {{ planets[$value] }} {{ icons[$value] }}</h1>
```

### Output:

```html
<h1 class="planet-class">Planet 1: earth 🌎</h1>
<h1 class="planet-class">Planet 3: jupiter 🪐</h1>
```

## Why even try?
The purpose of this library is to have dynamic, scoped and reusable FE components packed with functionality 
without need for any framework or dependencies which works in plain JS. 

## Installation

#### Native
Just download [dito.min.js](src/dito.min.js) and [ditoelement.min.js](src/ditoelement.min.js) and require them as
modules on your page:
```html
<script type="module" src="/media/script/dist/dito.min.js" charset="utf-8"></script>
```
```js
import { DitoElement } from "/media/script/dist/dito.min.js";
class CustomElement extends DitoElement {
  // [...]
}
```
but remember that you will have to update them by hand each time new version is released.
#### `npm`

```bash
npm i @mortimer333/dito
```
This would be it for `node` project, but it is not really a `node` module. So if you want to use `npm` but without
`webpack` or `gulp` check this [installation document](documentation/INSTALLATION.md).

## Framework
If you are looking for a ready to go project or just example check this:
- 💥 Micro Front End,
- 💥 One-Page Application with Router,
- 💥 NPM configured Tailwind CSS and esbuild for Dito components with dev/prod mode,
- 💥 User/Permissions System,

[app skeleton made with Dito 🔥.](https://github.com/Mortimer333/IdemDito)

## Quick Start
Start with creating your first component, let's name it `showcase-earth` (must contain hyphen `-`):
```
public/ <- Website root folder
-- components/
-- -- dito.js
-- -- ditoelement.js
-- -- showcase-earth/
-- -- -- showcase-earth.js
-- -- -- showcase-earth.css
-- -- -- showcase-earth.html
```
We are following Angular-like naming pattern when creating our components. 

Now fill your JS with:
```js
import { DitoElement } from 'components/ditoelement.js';
class EarthElement extends DitoElement {
  init() {
    this.$.icon = '🌎';
    this.$.name = 'earth';
    this.$.className = 'earth-class';
  }
}
export { EarthElement as default };
```
and HTML with:
```html
<h1 @a:class="className">Planet: {{ name }} {{ icon }}</h1>
```
Notice that all variables used in the HTML file are assigned to the attribute `$` which works as a global scope for HTML template. Think of it as a barbaric version of variable visibility and anything set in `$` is accessible in HTML.

We also need to create our index file and request just created component:
```html
<body>
  <showcase-earth></showcase-earth>
</body>
```

Now create new instance of `Dito` (and only one) and set URL path to the folder containing your components:
```js
const container = new Dito({
  url: 'http://localhost:80/components/',
});
```

> There must be only one instance of Dito per website and attempt to create second will result in error. If you need to access it from different point then you can find it under `window.__dito.main` or just `__dito.main`.

Register your first component by `Dito::register` method which requires the name of the component and version (for cache bursting if necessary):
```js
container.register('showcase-earth', 1);
```
With all our components registered we can call `Dito::load` method which will start searching current file for registered components and loads them asynchronously.
```js
await container.load();
```

At this point our body should look like this:
```html
<body>
  <showcase-earth></showcase-earth>
  <script type="module">
    import { Dito } from 'components/dito.js';
    const container = new Dito({
      url: 'http://localhost:80/components/',
    });
    container.register('earth-element', 1);
    await container.load();
    console.log('Top level components loaded!')
  </script>
</body>
```
and render into this:

```html
<body>
  <showcase-earth dito-t="1696445746936" dito-i="1" dito-ready>
    <h1 class="earth-class">Planet: earth 🌎</h1>
  </showcase-earth>
  <script type="module">[...]</script>
</body>
```
We Are Done! Few steps are required and I wouldn't call it the easiest to learn library in the world. You need to 
understand basics, at least, to start with it but once learned it's pretty good and pleasant to use.

## Advanced stuff
With the ___Quick Start___ you can't really use the library, it's only to honestly show the very basics of setup and 
first usage. If you want to be able to use `@actions`, `Injectables`, `Dynamic CSS`, `Observables`, 
`In-Out Communication` and understand `Component's Life Cycle` then have a read (from top to bottom):

- [`Settings`](documentation/SETTINGS.md)
- [`Dito::register & Dito::load`](documentation/REGISTER&LOAD.md)
  - [`Dito::bulk`](documentation/REGISTER&LOAD/BULKREGISTER.md)
- [`Observables & Scope`](documentation/OBSERVABLES.md)
- [`{{ Executables }}`](documentation/EXECUTABLES.md)
  - [`@self` - Dynamic CSS](documentation/EXECUTABLES/DYNAMICCSS.md)
- [`@actions`](documentation/ACTIONS.md):
  - [`@if`](documentation/ACTIONS.md#if)
  - [`@for`](documentation/ACTIONS.md#for)
    - [`@key` and `@value`](documentation/ACTIONS/FOR.md#value-and-key)
    - [`@min`](documentation/ACTIONS/FOR.md#min)
    - [`@def-min`](documentation/ACTIONS/FOR.md#def-min)
  - [`@e` - Event Listener](documentation/ACTIONS.md#e)
    - [Update JS variables in HTML](documentation/ACTIONS.md#update-js-variables-in-html)
  - [`@a` - Attribute Setter](documentation/ACTIONS.md#a)
  - [`@get` - Getter](documentation/ACTIONS.md#get)
- [Default Attributes](documentation/DEFAULTATTRIBUTES.md)
- [`Component's Communication`](documentation/COMPONENTSCOMMUNICATION.md)
  - [`@i` - Input](documentation/COMPONENTSCOMMUNICATION.md#i)
  - [`@o` - Output](documentation/COMPONENTSCOMMUNICATION.md#o)
  - [`@b` ⚗️ - Two-Way Bind #angular](documentation/COMPONENTSCOMMUNICATION.md#b-experimental)
    - [Binding native nodes](documentation/COMPONENTSCOMMUNICATION.md#binding-native-nodes)
- [`Life Cycle`](documentation/LIFECYCLE.md)
  - Methods:
    - [`init`](documentation/LIFECYCLE.md#init)
    - [`beforeFirstRender`](documentation/LIFECYCLE.md#beforefirstrender)
    - [`afterFirstRender`](documentation/LIFECYCLE.md#afterfirstrender)
    - [`beforeRender`](documentation/LIFECYCLE.md#beforerender)
    - [`afterRender`](documentation/LIFECYCLE.md#afterrender)
    - [`beforeCssRender`](documentation/LIFECYCLE.md#beforecssrender)
    - [`afterCssRender`](documentation/LIFECYCLE.md#aftercssrender)
    - `destroyed` 🚫
  - [Events](documentation/LIFECYCLE.md#events):
    - [`loadfinished`](documentation/LIFECYCLE.md#loadfinished)
    - [`render`](documentation/LIFECYCLE.md#render---beforerender)
    - [`rendered`](documentation/LIFECYCLE.md#rendered---afterrender)
    - [`firstrender`](documentation/LIFECYCLE.md#firstrender---beforefirstrender)
    - [`firstrendered`](documentation/LIFECYCLE.md#firstrendered---afterfirstrender)
    - `destroyed` 🚫
- [`Injectables` 💀](documentation/INJECTABLES.md)
  - [`default behaviour`](documentation/INJECTABLES.md#default-behaviour)
  - [`@pack`](documentation/INJECTABLES.md#pack)
  - [`@use`](documentation/INJECTABLES.md#use)
  - [`@uname`️](documentation/INJECTABLES.md#uname-)
  - [Passing down](documentation/INJECTABLES.md#passing-injected-template-passing-components-etc)
- [Professional Topics:](documentation/PROFESSIONALTOPICS.md)
  - [`$self`](documentation/PROFESSIONALTOPICS.md#self)
  - [Manual Rendering and Render Queue](documentation/PROFESSIONALTOPICS.md#manual-render-and-render-queue)
  - [Waiting for render to finish](documentation/PROFESSIONALTOPICS.md#waiting-for-render-to-finish)
  - [Rules for setting Scope Variable (`$` and `$css`) in terms of performance](documentation/PROFESSIONALTOPICS.md#rules-for-setting-scope-variable--and-css-in-terms-of-performance)
  - [Content Security Policy that prohibits unsafe-eval](documentation/PROFESSIONALTOPICS.md#content-security-policy-that-prohibits-unsafe-eval)
- [You should read and extend source code](documentation/USESOURCECODE.md)
- Weirdness 💀
  - [Event variable change](documentation/WERIDNESS/EVENTVARIABLESCHANGE.md)
