[< Back](LIFECYCLE.md)  
[< Table of Contents](../README.md#advanced-stuff)

# Injectables

Consider such scenario: You want to create customizable table component which can accept custom filters or cells.
But with your current knowledge you can only pass values into child components using `@i` which are pretty limited.
To rescue comes `Injectable`! With it, you can pass into child components HTML packages and reused them inside. 
- [`default behaviour`](#default-behaviour)
- [`@pack`](#pack)
- [`@use`](#use)
- [`@uname` ⚗️](#uname-)
- [`Passing down`](#passing-injected-template-passing-components-etc)

Watch:
```js
class MyBlogs extends DitoElement {
    init() {
      // Let's prepare some dummy data, so we can understand it better
      // Firstly, table header:
      this.$.column = [
        {
          name: 'Title'
        },
        {
          name: 'Link'
        },
      ];
      // Now data we will feed the for loop:
      this.$.rows = [
        [
          {
            value: 'Blog #1'
          },
          {
            // All you see here is just custom solution, nothing forced by library
            
            isCustom: true,            // We are marking it as custom, 
                                       // so we can hide the default option
            
            pack: 'direct_link',       // Passing the name of which HTML 
                                       // package use when rendering cell
            
            value: 'https://blog1.com'
          }
        ],
        [ // Another row, for better visual when all is rendered
          {
            value: 'Blog #2'
          },
          {
            isCustom: true,
            pack: 'direct_link',
            value: 'https://blog2.com'
          }
        ],
      ];
    }
}
```
```html
<!-- Passing columns and rows into the child component -->
<shared-table @i:column="columns" 
              @i:rows="rows">
  
  <!-- Creating package `cell_direct_link` -->
  <div @pack="'cell_direct_link'"> 
    <button @e:click="redirectTo(use.cell)">Go to the page!</button>
  </div>
  
</shared-table>
```
and in the `SharedTable` HTML file:
```html
<div class="shared-table">
  
  <div class="shared-table-columns flex">
    <div @for="columns" @value="column" class="shared-table-column">{{ column.name }}</div>
  </div>
  
  <div @for="rows" @value="row" class="shared-table-row flex">
    <div @for="row" @value="cell" class="shared-table-cell">
      <span @if="!cell.isCustom">{{ cell.value }}</span>
      <!-- 
        Here we are using predefined custom tag `dito-inject` 
        which script recognizes as an attempt of injecting outside code.
        
        Notice that we are using two `conjoined actions`: `@pack` and `@use`
      -->
      <dito-inject @pack="'cell_' + cell.pack" @use="{ cell }"></dito-inject>
    </div>
  </div>
  
</div>
```
And it will render into this:
```html
<shared-table dito-t="1697566956545" dito-i="0" dito-ready="1">
  <div class="shared-table">
    <div class="shared-table-columns flex">
      <div class="shared-table-column">Title</div>
      <div class="shared-table-column">Link</div>
    </div>
    <div class="shared-table-row flex">
      <div class="shared-table-cell">
        <span>Blog #1</span>
      </div>
      <div class="shared-table-cell">
        <div dito-pack="'cell_direct_link'">
          <button>Go to the page!</button>
        </div>
      </div>
    </div>
    <div class="shared-table-row flex">
      <div class="shared-table-cell">
        <span>Blog #2</span>
      </div>
      <div class="shared-table-cell">
        <div dito-pack="'cell_direct_link'">
          <button>Go to the page!</button>
        </div>
      </div>
    </div>
  </div>
</shared-table>
```
A lot to unpack here, but I still feel that an example from real life will really help us out here.

### `dito-inject`
##### Default behaviour
Dito comes with predefined custom node `dito-inject`. As you have seen it is used to mark where library
should inject code provide inside the tag (between opening and closing tags). It can be used without any `package`:
```html
<h1 class="hero-title">
  <dito-inject></dito-inject>
</h1>
```
Think of it as the default behaviour. If you pass anything into the inner part of the tag, script, will try to inject 
it into matching `dito-inject` tag. So, nodes without package will go into `dito-inject` without defined package name:
```html
<shared-title>
  <span>
    <img src="/image/award.webp" alt="Award!" class="inline mr-2 h-[20px]"> You win!
  </span>
</shared-title>
```
> Script will ignore just text nodes, they must be nested inside any available tag

Render:
```html
<shared-title dito-t="1697566956545" dito-i="0" dito-ready="1">
  <h1 class="hero-title">
    <span>
      <img src="/image/award.webp" alt="Award!" class="inline mr-2 h-[20px]"> You win!
    </span>
  </h1>
</shared-title>
```
The same package can be injected multiple times:
```html
Your fav planet: <dito-inject></dito-inject>
Also this is your fav planet: <dito-inject></dito-inject>
And this also: <dito-inject></dito-inject>
```
Will render into:
```html
Your fav planet: <span>🪐</span>
Also this is your fav planet: <span>🪐</span>
And this also: <span>🪐</span>
```
#### `@pack`
But what if we want to pass different templates and use them in specific places? We need to create an identifier by 
which library can determinate which injected tag should be put where inside the child component:
```html
<h1 class="hero-title">
  <dito-inject></dito-inject>
</h1>
<h2 class="hero-subtitle">
  <dito-inject @pack="'subtitle'"></dito-inject>
</h2>
```
For that purpose we can use `@pack` action. It is the same for defining which package should replace `dito-inject` tag
and defining the package name when passing HTML template:
```html
<shared-title>
  <span>
    <img src="/image/award.webp" alt="Award!" class="inline mr-2 h-[20px]"> You win!
  </span>
  <span @pack="'subtitle'">To receive award call +99 999 999 999!</span>
</shared-title>
```
This will render into:
```html
<shared-title dito-t="1697566956545" dito-i="0" dito-ready="1">
  <h1 class="hero-title">
    <span>
      <img src="/image/award.webp" alt="Award!" class="inline mr-2 h-[20px]"> You win!
    </span>
  </h1>
  <h2 class="hero-subtitle">
    <span dito-pack="'subtitle'">To receive award call +99 999 999 999!</span>
  </h2>
</shared-title>
```
Pretty useful, isn't it?

#### `@use`
Okey, we can now pass HTML templates into children and differ between them but what about passing data into them from 
the child component? I would like for my template to show different number depending on what award the use has won!

For that purpose we can use `@use` `conjoined action`. It will inject a variable `use` which will hold anything you 
will pass into the action's value. This variable is only available in all actions in the `injectable` scope. 

Have a look:
```html
<shared-title>
  <span>
    <img src="/image/award.webp" alt="Award!" class="inline mr-2 h-[20px]"> You win!
  </span>
  <span @pack="'subtitle'">To receive award call {{ use.number }}!</span>
</shared-title>
```
```html
<h1 class="hero-title">
  <dito-inject></dito-inject>
</h1>
<h2 class="hero-subtitle">
  <dito-inject @pack="'subtitle'" @use="{ number: '+66 666 666 666' }"></dito-inject>
</h2>
```
Render:
```html
<shared-title dito-t="1697566956545" dito-i="0" dito-ready="1">
  <h1 class="hero-title">
    <span>
      <img src="/image/award.webp" alt="Award!" class="inline mr-2 h-[20px]"> You win!
    </span>
  </h1>
  <h2 class="hero-subtitle">
    <span dito-pack="'subtitle'">To receive award call +66 666 666 666!</span>
  </h2>
</shared-title>
```

#### `@uname` ⚗️

> Experimental feature, use on your own risk

If you need to change the name of injected varibale from `use` when using `@use` action you can change it be using 
`@uname` action:
```html
<shared-title>
  <span>
    <img src="/image/award.webp" alt="Award!" class="inline mr-2 h-[20px]"> You win!
  </span>
  <span @pack="'subtitle'" @uname="number">To receive award call {{ number }}!</span>
</shared-title>
```
```html
<h1 class="hero-title">
  <dito-inject></dito-inject>
</h1>
<h2 class="hero-subtitle">
  <dito-inject @pack="'subtitle'" @use="'+66 666 666 666'"></dito-inject>
</h2>
```

#### Passing injected template, passing components etc.

In few cases you have created such convoluted component that you want to allow user to pass injected data down to even 
more nested components or even allow user to pass other components.

All is possible! At least I'm striving for it. I'm not marking this functionality as `expermiental` because I've tested
it enough to use it on my own production, but it is a pretty complex case. I am not suprised to still find bugs when 
using it with `@for` or simple `@if` actions. 

Simple scenario of what I'm taking about:
- We have three components:
  - User page with few inputs
  - Shared input 
  - Shared modal
- We want to pass from User page to shared modal title of the modal
- We have to do it through shared input for whatever reason
- Title I want to pass is another component `shared-title`
- `shared-title` also accepts injections

User page:
```html
<shared-input>
  <shared-title>
    <span>{{ title }}</span>
  </shared-title>
</shared-input>
```
`shared-input`:
```html
<shared-modal>
  <span @pack="'title'">
    <dito-inject></dito-inject>
  </span>
</shared-modal>
```
`shared-modal`:
```html
<div class="fixed f-ull w-full left-0 top-0">
  <div class="shared-modal-title">
    <dito-inject @pack="'title'"></dito-inject>
  </div>
</div>
```
`shared-title`:
```html
<h1 class="shared-title">
  <dito-inject></dito-inject>
</h1>
```
Renders into:
```html
<shared-input dito-t="1697566956545" dito-i="0" dito-ready="1">
  <shared-modal dito-t="1697566956545" dito-i="0" dito-ready="1">
    <div class="fixed f-ull w-full left-0 top-0">
      <div class="shared-modal-title">
        <span dito-pack="'title'">
          <shared-title dito-t="1697566956545" dito-i="0" dito-ready="1">
            <h1 class="shared-title">
              <span>Title</span>
            </h1>
          </shared-title>
        </span>
      </div>
    </div>
  </shared-modal>
</shared-input>
```

Add to it possibility of `@for` combined with `@use` and you can see why this might create quite a few bugs and 
complications. But this works, I have few components like this, so you can use it. It's really powerful tool and 
allows for a lot of flexibility.

[Professional Topics >](PROFESSIONAL.md)
