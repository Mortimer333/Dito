[< Back](REGISTER&LOAD.md)      
[< Table of Contents](../README.md#advanced-stuff)

# {{ EXECUTABLES }}

Now after we have working components we can start making them useful by adding content to it.
The first and easiest to understand are `Executables`. Those are basically JS snippets that can 
be used inside HTML/CSS file (although wait before you use them in CSS until you have finished 
reading `Dynamic CSS`).
```html
<h1>{{ 'MY BIG ' + title.toUpperCase() }}</h1>
```
