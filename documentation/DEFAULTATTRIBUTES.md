[< Back](ACTIONS.md)  
[< Table of Contents](../README.md#advanced-stuff)

# Default Attributes

To set components default attributes we use `getDefaults` method. It's just a quicker method then calling 
`this.setAttribute` each time you want to set one. Also it comes in few flavours:

```js
class SharedElement extends DitoElement {
  getDefaults() {
    return {
      class: {
        value: 'flex',
        type: 'replace',
      },
      "data-index": {
        value: '1',
      }
    }
  }
}
```
It's pretty obvious that keys' are attribute names and `value` is its content. But what about `type`?
`type` accepts three values otherwise will default to `append`:

| Value   | Description                                                                   | Default |
|---------|-------------------------------------------------------------------------------|---------|
| append  | If attribute was already set by parent value will be added to it after space  | ✅       |
| replace | Even if value was set by parent it will be replaced                           | ❌       |
| add     | Similar to `append` but without adding space between already existing and new | ❌       |

Example render:
```html
<sahred-element dito-t="1697566956545" dito-i="0" dito-ready="1" class="flex" data-index="1"></sahred-element>
```

[Component's Communication >](COMPONENTSCOMMUNICATION.md)
