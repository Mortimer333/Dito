# Features:
- [DONE] CLEAR OLD NODES - old not existing nodes (for example generated with for) are still being compiled on render which is quickly becoming an issue
- [IMPROVEMENT] Move component compilation to server and generate required files separated into categories (css rules, html with filled "replace me", file with all segrageated "replace me" etc.) in case of performance problems
- [DONE] Templates: - extended dito-inject with calculated names and data injection, also can be called multiple times without problem
  - <del>can be transported between components</del>
  - <del>can be used in loops with different sets of data</del>
  - <del>have a scope of defining component</del>
  - <del>`dito-template` tag is a template with `@tname` annotation/decoration to set its name but only contents of the tag will be rendered, not tag itself</del>
  - <del>all templates are saved in `$self.template.[template name]` </del>
  - <del>can be rendered with `dito-outlet` and set `@temp` annotation in which you pass instantiation of the template</del>
    - <del>you can also add `@use` annotation to add additional object which will be available in template</del>
    - <del>in template, you can use `@uname` to set name of the variable from `@use`</del>
    - <del>`dito-outlet` will be replaced with contents of the template</del>
- Bring back Kamikaze to solve this problem (additional P tag):
```html
<div class="nav-link h-full" @for="nav" @value="link">
    <img @if="link?.type === 'logo'" @a:src="link.src" alt="logo" class="nav-logo">
    <p @if="!link?.type || link.type === 'item'">
      {{ link.title }}
    </p>
  </div>
```
- [DONE] CSS - special var which refers to the `self` so we can set styles to this container, ex: $self { display: block; } => element-one { display:block; }
  - [DUPLICATE] CSS - let decide which styles should be scoped and which should be global (global wont be duplicated)
  - [REMOVED] Add support for media queries like blocks - retrieve them first and create new recursive functionality to handle them
    - @media
    - @container
    - @font-feature-values
    - @supports
    - Not really needed as we are just need to implement skipping nested rules and resolving them
- [DONE] ability to save node (like simple div to later access it) without setting id - <div @s="div1"></div> => this.$self.nodes.div1
- [DONE] min amount of iterations on for - array = [1,2] => <div @for="array" @min="3">{{$key}} - {{$value}}</div> => <div>1 - 1</div><div>2 - 2</div><div>3 - undefined</div>
- [DONE] Add variable for default attributes of the custom elements: default classes, default value etc. - $default ?
- [DONE] only remove local storage items with proper prefix - `dito_`
- [DONE] Add custom events on renderes, will be called on elements (<custom-element @e:renderdone="" @e:renderstart="")
- [DONE] Fuction when first render finishes and every component is downloaded
- [DONE] container tag - like ng-container which will just this.outerHTML = this.innerHTML, probably gonna call him dito-kamikaze
- [DONE] allow injected html to be separate int different packages that can be used in few places
- [DONE] change name of files from `main` to name of component so debuging is easier
- [DONE] let injected html use features on library and make it so its connected with parent and not child that html is injected into
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
- [REMOVED] Insert inputs after `init` - actually this is correct flow, you can set default if there is no value but with that you can still take actions on init and not after
- [REMOVED] allow to retrieve on force and use saved components from localStorage - just call without force; force is made explicitly to not use localStorage
- [REMOVED] templates: - Not needed, just create sperate component
  - reusable in component
  - have their own scope
  - are defined like this : <dito-template @n="template1"> <h1>Lalala</h1> </dito-template> nad used like this <dito-render @t="template1"></dito-render>
- [REMOVED] allow to bind values in object (this.$.settings.password) - provides to complication which outweight benefits
- [REMOVE] create `this` variable in events and outputs so we can pass reference to the node - not really needed but slows script o fair amount
- [REMOVED] Add jmonkey-spinner class - if someone wants to have loaders they will add them
- [REMOVED] Add a way to send all templates for page in one file - can't put js modules in string and make it work with Function
- [REMOVED] Save JS in local storage and build it from Function - same reason as single file - can't put exports in string
- [REMOVED] pipes - not needed, we can actually use method
