[< Back](OBSERVABLES.md)      
[< Table of Contents](../README.md#advanced-stuff)

# {{ EXECUTABLES }}

Now with our knowledge about Observers and File Scope we can start making components useful.
The first and easiest module to understand are `Executables`. Those are basically JS snippets that can 
be used inside HTML/CSS file (although wait before you use them in CSS until you have finished 
reading `Dynamic CSS`).

For example:
```html
<h1>{{ 'MY BIG ' + title.toUpperCase() }}</h1>
```
Will result in:
```html
<h1>MY BIG TITLE</h1>
```

But be warned! Those only work outside HTML tags due to specifics of parser/engine/script. 

This:
```js
<h1 class="{{ className }}">MY BIG TITLE</h1>
```
will result in error. To set tag attributes we use `@a` action which will be explained later.

[Dynamic CSS >](EXECUTABLES/DYNAMICCSS.md)

[@actions >](ACTIONS.md)
