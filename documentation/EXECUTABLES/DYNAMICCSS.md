[< Back](../EXECUTABLES.md)      
[< Table of Contents](../../README.md#advanced-stuff)

# Dynamic CSS
Dynamic CSS is very cool name, but it's also very simple module with only two features. 

Dynamic CSS allows for scoping chosen rules just for this instance of component and using inside this rule
variables set in `$css`. 
```css
@self .tab {
  width: {{ tabWidth }}px;
}
```
`@self` marks rule as dynamic and allow for using `Executables` inside of it. Without marking class as scoped (`@self`)
any use of `Executables` will result in error/rule disappearing.

Also, any noticeable change on `$css` will result on automatic rerender of all assigned scoped rules.

> I could add all the stuff available in the HTML, but I can't really find it that useful in CSS. 
> I'm think of expanding this with additional pseudo classes like `:previous` or something similar which I really need.

[@actions >](../ACTIONS.md)
