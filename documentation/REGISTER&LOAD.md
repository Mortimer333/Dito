[< Back](SETTINGS.md)      
[< Table of Contents](../README.md#advanced-stuff)

# Register & Load
- [Architecture Conventions](#architecture)
- [Create Component](#create-component)
- [Register Components](#register-components)
- [Start The Load](#start-loading-components)

### Architecture Conventions
All components must be registered in existing Dito instance. Registering requires to know component's:
- `name`
- `version`
- `location`

But to know those value, firstly, we need to create few valid component. 
This requires form us to pick a root folder for our components:
```
public/
-- components/          <- Our folder
```
then we can add our components. I personally like to use it with micro front end architecture 
which means having separated folders per application/domain:
```
public/
-- components/          
-- -- landingpage/
-- -- user/
-- -- shared/
```
Thanks to that I always have prefix which can be used when naming my components. 
Prefix is very important because to register your component you have to pick a name with hypen in it (like `user-login`) 
([check this documentation for more information on a valid name](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name)).

Here are some examples of possible components:
```
public/
-- components/

-- -- landingpage/
-- -- -- landingpage-contact/
-- -- -- -- landingpage-contact.html
-- -- -- -- landingpage-contact.css
-- -- -- -- landingpage-contact.js
-- -- -- landingpage-hero/
-- -- -- -- landingpage-hero.html
-- -- -- -- landingpage-hero.css
-- -- -- -- landingpage-hero.js

-- -- user/
-- -- -- user-panel/
-- -- -- -- user-panel.js
-- -- -- -- user-panel.css
-- -- -- -- user-panel.html
-- -- -- -- user-delete-modal/
-- -- -- -- -- user-delete-modal.js
-- -- -- -- -- user-delete-modal.css
-- -- -- -- -- user-delete-modal.html

-- -- shared/
-- -- -- shared-input-text/
-- -- -- -- shared-input-text.js
-- -- -- -- shared-input-text.css
-- -- -- -- shared-input-text.html

```
Redundancies like that help a lot when debuging or refactoring even if they seem unnecessary at the start. 

Let's explain a little what has happened at example above:
1. We have created 5 sets of files for new components (notice that I'm emphasizing that those are not real components yet)
    - `<landingpage-contact>`
    - `<landingpage-hero>`
    - `<user-panel>`
    - `<user-delete-modal>`
    - `<shared-input-text>`
2. Almost each of them have separate namespace which will help us to keep proper architecture instead of trash can of elements with no relation to each other
3. I have created namespace for shared components between application (`shared`) like inputs co we don't have to define them each time for every service but rather **reuse them**
4. I've nested component `<user-delete-modal>` inside `<user-panel>` to reflect the state of components on the page:
   `<user-delete-modal>` will never be used outside `<user-panel>` but it will be only loaded when user tries to delete itself
5. Top level components are considered pages expect when you are build landing page or building specialized namespace (like `shared`)

As you can see proper architecture can have positive result on our understanding of the application without need to actually open and inspect the page.

Just try to follow those rules:
1. 📌 Top level components are pages of the website
   - Landing pages are exceptions because they have only one page - chunk them by their sections (hero, contact, about etc.)
2. 📌 If component is not used anywhere else nest it 
3. 📌 Lazy load all hidden content
3. 📌 Share components between applications


### Create Component
As I stated before we haven't create proper component yet - we are lacking the contents of JS file.
We have to import `DitoElement` class, extend it and export it as default - only then we will have working component:
```js
import { DitoElement } from 'components/ditoelement.js';
class UserPanel extends DitoElement {
}
export { UserPanel as default };
```
Above in the example we have created class for component `<user-panel>` which will be later used to register mentioned component.
Name of the class doesn't really matter as we later export it as `default` but I normally convert `snake-case` of the filename 
into `PascalCase` class name.

Nothing else is needed: CSS and HTML files can remain empty.

With `UserPanel` saved and after repeating the setup in other components we can say that our application is ready to be registered.

### Register Components

Finally, we can start fulfilling the first part of the title: Register. Each component we want to use must be registered 
in Dito instance, otherwise script won't be able to differ between default tags and custom ones. Registering is pretty simple:
```js
// Create Dito instance
const container = new Dito({
  url: 'http://localhost:80/components/',
});
// Call register method
container.register('user-panel', 1, 'user/', false);
```
Register method accepts 4 values:

| Name      | Description                                                                                   | Required |         |
|-----------|-----------------------------------------------------------------------------------------------|----------|---------|
| `name`    | Component's name (folder and files)                                                           | ✅        |         |
| `version` | Component's version (can be either string or number)                                          | ✅        |         |
| `path`    | Additional path to find component                                                             | ❌        | `""`    |
| `force`   | If set to `true` then loads component at the page load, without checking if it is on the page | ❌        | `false` |
First two are required: `name` and `version`. `name` is particularly tricky as it must match the directory and files inside.
So if we want to register `shared-table` then our component file structure must look like this:
```
shared-table/
-- -- shared-table.js
-- -- shared-table.css
-- -- shared-table.html
```
All files and directory must have the same name as registered component.

And, on the contrary, `version` can be anything. It will be appended to the request as query parameter, so anything works. 
What's important is to change it each time you want to release new version to burst any cache related to the component 
on the client side (also the one used by Dito, not only browser cache).

> For development purposes you can use `Math.random()` for `version`.

Let's register the rest of our components:
```js
container.register('user-delete-modal', 1, 'user/user-panel/');
container.register('landingpage-contact', 1, 'landingpage/');
container.register('landingpage-hero', 1, 'landingpage/');
container.register('shared-input-text', 1, 'shared/');
```
For now let's ignore the fact that we are registering components for landing page and user service at the same time 
and focus on  `<user-delete-modal>` registration. As you can see `path` used for this component is longer then 
other as its  nested inside of `<user-panel>`. We have to make sure to provide correct path to the component or it 
won't load properly.

> There is an alternative to `register` which everyone should be aware of: `bulkRegister` which is very useful when 
> you have quite the amount of components with similar namespaces. [You can check it out here]().

### Start The Load

Now that have created and registered all components we need it's time to tell Dito to scan current file and download all used 
components by using `load` method:
```js
await container.load();
```
and let's say that current index looks like this:
```html
<body>
  <user-panel></user-panel>
  [...]
</body>
```

`load` returns `Promise` which gets resolved when all **top level** components are loaded (so it doesn't wait for nested ones).
So if for example we have requested `<user-panel>` then when `load` finished `<user-delete-modal>` will
still be unloaded (in this scenario we are assuming that `<user-delete-modal>` is visible from the start).

[Dito::bulkRegister >](REGISTER&LOAD/BULKREGISTER.md)
[{{ Executables }} >](EXECUTABLES.md)
