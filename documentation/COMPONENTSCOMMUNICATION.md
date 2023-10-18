[< Back](DEFAULTATTRIBUTES.md)      
[< Table of Contents](../README.md#advanced-stuff)

# Component's Communication

Inspired with Angular, communication between components is resolved by `inputs` and `outputs`.

- [`@i`](#i)
- [`@o`](#o)
- [`@b` Experimental](#b-experimental)
  - [Binding native nodes](#binding-native-nodes)

### @i
First and most basic is `input`. It is a simple way to pass variables or value from parent to child component:
```html
<shared-input @i:type="'text'" 
            @i:value="titleValue" 
            @i:label="'Title'">
</shared-input>
```

`input` is very similar to `@e` in its syntax:
- start with `@i`
- then add colon to separate tag from label (`type`, `value`, `label`, etc.)
- and finish like you would normally attribute with value between apostrophes `"`
(`'text'`, `titleValue`, `'Title'`, etc.)

The label after colon `:` is the name of variable you want to set/update inside the child component.

I personally like to do this setup when expecting inputs:
```js
class SharedInput extends DitoElement {
    init() {
        this.$.type = 'select';
        this.$.value = [];
        this.$.label = '';
    }
}
```
It works because variables from inputs will be updated during render, so setting them before first render 
works like setting default values. You can skip that step if you are sure that those values
are provided. (you can also use `beforeFirstRender` method to set them, just anything before first render)

### `@o`

Output is a way to fire an event that only parent can listen to. This is basically easier way to creating custom events:

```html
<shared-input @i:type="'select'" 
              @i:value="options" 
              @i:label="'Options'"
              @o:selected="optionSelected($event)">
</shared-input>
```
Notice that we are using the same `$event` variable like with `$e`. It is used to store value from child component - 
can be empty if we only want to signal something.
```js
class SharedInput extends DitoElement {
  optionSelected(option) {
    this.$output.select?.emit(option);
  }
}
```
To fire and output we use `$output` variable which holds all subscribed `outputs` on this component. But be aware that
if parent didn't subscribe to it will be set to `undefined` (that's why I'm using optional chaining operator `?.`).

Each existing `output` has method `emit` on it which allows to send the message to the parent. `emit` accepts any 
value, so feel free to use it like you wish to.

### `@b` Experimental

Binding or Two-way communication. It works by updating value in both components at the same time - think of it as shared 
space on both components `$` variable. It also works with more than two components! You can have whole row of binds and 
change in the 10th link will update all previous nine and make them rerender:
```html
<shared-input @i:type="'select'" 
              @b:value="options" 
              @i:label="'Options'"
              @o:selected="optionSelected($event)">
</shared-input>
```
Not `value` will automatically update in parent and child, wherever it was changed. 
> The catch is that you **must** define this variable in both components. You must set the default value for it.

> Be aware that this is experimental feature and sometime might result in not desired actions

#### Binding native nodes
One of the ways of using `binding` is to set it on the native element like `input`. `@i` and `@o` don't work 
on native elements but `@b` does. It does it by setting `MutationObserver` and event on `change`, so it is not 
omnipotent but is pretty useful for inputs:

```html
<input type="text" @b:value="value">
```

[Life Cycle >](LIFECYCLE.md)
