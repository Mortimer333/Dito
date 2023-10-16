[< Back](EXECUTABLES.md)      
[< Table of Contents](../.README.md#advanced-stuff)

# @ctions

Anything with prefix `@` is considered an action but this chapter will only cover most basic actions:
- [`@if`](#if)
- [`@for`](#for) for more details [here](ACTIONS/FOR.md)
- [`@e`](#e)
  - [Update JS variables in HTML](#update-js-variables-in-html)
- [`@a`](#a)
- [`@get`](#get)

Very important: action's condition must start and end with Quotation Marks (`"`) otherwise script will return an error.

### `@if`
Is simplest to understand but with a small curve. Works just like JS `if` but makes node actually disappear from
document. But it's not destroyed - script later reuses the same object by inserting it and removing from document, so it won't loose 
events/observers/references/etc.
```html
<div @if="hide && !isHideDisabled()">
  Whole div will disappear not only text inside
</div>
```
Allows for making very elaborate designs without outperforming website engine with hundreds of elements 
(but it's heavy on memory though).


### `@for`
With this action you can repeat the tag amount of times equal number/array/object's attributes passed to the condition:
```html
<p @for="3">{{ $value }}</p>
<p @for="[1,2,3]">{{ $key + ': ' + $value }}</p>
<p @for="{a:1,b:2,c:3}">{{ $key + ': ' + $value }}</p>
```
Output:
```html
<p>1</p>
<p>2</p>
<p>3</p>
<p>0: 1</p>
<p>1: 2</p>
<p>2: 3</p>
<p>a: 1</p>
<p>b: 2</p>
<p>c: 3</p>
```
#### `$key`
Current key is saved in predefined `$key` variable. Will return `null` if number was used.

#### `$value`
Same goes for value - it's saved in `$value` variable.

`@for` has few additional `actions` that can be combined with it - [check out detailed explanation](ACTIONS/FOR.md).


### `@e`
This action is used to add event listeners:
```html
<button @e:click="console.log($event, 'Button was clicked')">Click me!</button>
```

Similarly to `@for` also has predefined variable `$event` which obviously hold current event object.
With `@e` you cna assign the same event multiple times if needed:
```html
<button @e:click="console.log($event, 'Button was clicked')"
        @e:click="console.log($event, 'Button was clicked again')">
  Click me!
</button>
```

#### Update JS variables in HTML

Using events you can, from HTML level, change `$`'s attribute's value by simply changing it between apostrophes:
```html
<button @e:click="showDeleteModal = true">Delete</button>
```
No additional method needed.

### `@a`

As mentioned previously you cannot assign attribute to the tag with `Executables` - you must use `@a`/attribute 
action:
```html
<input type="text" @a:input="userName">
```
If function was assigned it must return value otherwise `undefined` will be set:

```html
<input type="text" @a:input="getName()">
```

and like with other actions you don't have to limit yourself to only single variable or method:
```html
<input type="text" @a:input="(inputName ? getName() : surname) + '.'">
```

### `@get`

Simplified `getElementBy*`. After marking node:
```html
<iframe src="/screenplay.html" frameborder="0" @get="'iframe'"></iframe>
```
You can find it by using `this.$self.get` attribute:
```js
hideIFrame(){
  this.$self.get.iframe.classList.add('hidden');
}
```
> Make sure to only access those values after first render of the component otherwise the node you are looking for might 
> not be rendered yet.

> Make sure to only get nodes with `@get` if they are visible - not hidden by `@if`, otherwise you must decide when to 
> grab it by normal means (`getElementBy*`)

#### `@get` in `@for`

If you want to get all inputs inside, for example, form builder you can still use `@get` to programmatically save them 
inside `$self.get`:
```html
<div @for="form.tickets" @value="ticket">
  <input type="text" @a:value="ticket.title" @get="'ticket_title_' + $key">
</div>
```
As you can see we are passing a string (value surrounded with apostrophes) which means we can create it by using 
all variables at out disposal. This includes `@for`'s `$key` variable which holds the current index of the loop. Now we 
can access them like so:
```js
getAllTickets() {
  const tickets = [];
  this.$.tickets.forEach((ticket, i) => {
    tickets.push({
      id: ticket.id,
      title: this.$self.get['ticket_title_' + i].value ?? '',
    })
  });
}
```

[@for in detail >](ACTIONS/FOR.md)

[Component's Communication >](COMPONENTSCOMMUNICATION.md)
