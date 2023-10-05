[< back](../README.md#advanced-stuff)
# Register & Load
- [Architecture Conventions](#architecture)
- [Create Component](#create-component)

### Architecture Conventions
All components must be registered in existing Dito instance. Registering requires to know component's:
- `name`
- `version`
- `location`

But to know those value you need to firstly create your component in a way that Dito can fetch it. 
This requires form you to choose a folder which will hold all your components:
```
public/
-- components/          <- Our folder
```
then we decide on the name of the component. I personally like to use it with micro front end architecture 
and having separated folder per application/domain:
```
public/
-- components/          
-- -- landingpage/
-- -- user/
-- -- shared/
```
Thanks to that I always have prefix which can be used when naming my components. 
Prefix is very important because to register your component you have to pick a name with hypen in it (`-`) 
([check this documentation for more information on a valid name](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name)).

Here are some examples:
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
3. I have created namespace for `shared` components between application like inputs co we don't have to define them each time for every service but rather **reuse them**
4. I've nested component `<user-delete-modal>` inside `<user-panel>` to reflect the state of components on the page:
   `<user-delete-modal>` will not be used outside `<user-panel>` but it will be only loaded when user tries to delete itself
5. Top level components are considered pages expect when you are build landing page or building specialized namespace (like `shared`)

As you can see proper architecture can have positive result on our understanding of the application without need to actually opening and inspecting the page.

Just try to follow those rules:
1. Top level components are pages of the website
   1. Landing pages are exceptions because they have only one page - chunk them by their sections (hero, contact, about etc.)
2. If component is not used anywhere else nest it 
3. Lazy load all hidden content
3. Share components between applications


### Create Component
