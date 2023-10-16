[< Back](../ACTIONS.md)      
[< Table of Contents](../.README.md#advanced-stuff)

# `@for` in detail

`@for` has few `conjoined actions` which allow us to expand its possibilities. 

- [`@value` and `@key`](#value-and-key)
- [`@min`](#min)
- [`@def-min`](#def-min)

### `@value` and `@key`

As we know `@for` has 2 assigned variables: `$value` and `$key`. But what when you nest two for's:
```html
<div @for="[1,2]">
  <div @for="[3,4]">
    {{ $key }} : {{ $value }}
  </div>
</div>
```
Output:
```html
<div>
  <div>0 : 3</div>
  <div>1 : 4</div>
</div>
<div>
  <div>0 : 3</div>
  <div>1 : 4</div>
</div>
```
We are loosing key and value from the loop above. For that we can change the name of assigned variables
by using `@value` and `@key`:
```html
<div @for="[1,2]" @value="topValue" @key="topKey">
  <div @for="[3,4]" @value="bottomValue" @key="bottomKey">
    {{ topKey }} : {{ topValue }} => {{ bottomKey }} : {{ bottomValue }}
  </div>
</div>
```
Output:
```html
<div>
  <div>0 : 1 => 0 : 3</div>
  <div>0 : 1 => 1 : 4</div>
</div>
<div>
  <div>1 : 2 => 0 : 3</div>
  <div>1 : 2 => 1 : 4</div>
</div>
```
Thanks to them, we can nest loops as our soul desire and have better readability. 

### `@min`
If you want to make sure your `for` will loop at least some amount of times you can use `@min` conjoined action. 
It will make sure that `@for` action will iterate until defined minimum or end of the iterable is reached
(whichever is higher).
```html
<p @for="['1', '2']" @min="3">{{ $key }} : {{ $value }}</p>
```
Output:
```html
<p>0 : 1</p>
<p>1 : 2</p>
<p>2 : </p>
```
Notice that we are missing value for the additional loop because script sets `$value` to `null`. We can fix it with the 
another action.

### `@def-min`

To this `action` we can pass the default value which will be injected into `$value` when `for` will start doing additional 
loops to reach the bare minimum:
```html
<p @for="['1', '2']" @min="3" @def-min="'default'">{{ $key }} : {{ $value }}</p>
```
Output:
```html
<p>0 : 1</p>
<p>1 : 2</p>
<p>2 : default</p>
```

[Component's Communication >](../COMPONENTSCOMMUNICATION.md)
