[< Back](INJECTABLES.md)  
[< Table of Contents](../README.md#advanced-stuff)

# Professional Topics

Some topics are not required to know but might be useful when extending basic functionality (which I strongly encourage
you do). I will try to touch those topics and introduce you to inner working of the library but the best way to 
understand it is to reads both source files [`dito.js`](../src/dito.js) and [`ditoelement.js`](../src/ditoelement.js).

### `$self`

Next to `$` and `$css` lays `$self` which describes the status of the component. From it you can read if component was 
rendered, is being rendered, parent etc. List is huge and ever expanding so check out the [method which defines this 
variable](../src/ditoelement.js#L221) or log it on the live application.

We have already used it once to determinate if component was rendered at least once in 
[`Life Cycles`](LIFECYCLE.md#beforerender), so you can search for example there.


### Manual render and render queue

It is encouraged to manually stop queued renders and decide for yourself when it is the best time to render your 
component. I believe that having higher level of control over the rendering process we can fix existing issues or bugs
without having to wait for the fix which is a blessing in community supported library.

```js
class ExampleComponent extends DitoElement {
  renderNow() {
    this.clearRenderQueue();
    this.render();
  }
}
```
Render process forbids rendering when there is a render in the queue. This is to avoid unnecessary renders which would 
just have impact on performance and don't change anything on the page. Of course this can be bypassed by passing into
`render` force argument:
```js
this.render(true);
```
This would make script ignore all conditions making it stop the render (like other render being in progress) and force
the render right here and now. Use with huge caution as it might have disastrous consequences.

### Waiting for render to finish

It is not as easy as just adding `await` before `this.render` to stop the script before component is loaded. Of course 
most of the cases it will work but to make sure that everything is loaded I have this little script:
```js
async function waitForElementToRender (el) {
  el.clearRenderQueue();
  await el.render();
  while (!el.$self?.rendered || el.$self?.rendering) {
    await new Promise(r => setTimeout(r, 100));
  }
}
```
After starting the render we are waiting until it was rendered at least once and if is not being rendered right now.
The amount of times we wait is the same as we give it to render queue to start new render, to ensure that we wait even 
if we wanted to render component that wasn't on the page yet.

### Rules for setting Scope Variable (`$` and `$css`) in terms of performance

Setting new attributes on `$` and `$css` after first render/init is bad for performance. 

It is due to script 
compiling functions from HTML/CSS templates into actual functions and saving them with keys which include existing 
attributes on `$`/`$css` respectively. So, adding new attribute on `$`/`$css` means recompiling all template functions 
on the component.

So `Rule of the Thumb`: Set all your HTML/CSS variables at the start if you can, otherwise there might be huge spikes in performance.

### Content Security Policy that prohibits unsafe-eval

Just like Vue I'm evaling methods from HTML and CSS using `new Function`. This means that any policy that prohibits 
`unsafe-eval` will render this library useless.

I recommend not accpeting any script that didn't come from module and allowing unsafe-eval:
```
Content-Security-Policy "default-src 'self';script-src 'self' 'unsafe-eval'";
```

This means that  injected script won't be able to execute anything on the page (this also includes anything you have 
added between `<script>`)

Also, whitelisting pages which should be able to execute script on your page might be wise, here is my personal rule 
set I use:
```
Content-Security-Policy "
        default-src 'self' components.cdn.com; 
        form-action 'none';
        script-src 'self' 'unsafe-eval' components.cdn.com https://www.recaptcha.net/recaptcha/;
        style-src 'self' 'unsafe-inline';
        frame-src https://www.recaptcha.net/recaptcha/ https://recaptcha.google.com/recaptcha/;
        img-src *;
        font-src 'self' data:;
    "
```

I don't recommend using wildcards when defining domains - there is a room for trickery for the black hats.

[You should read and use source code >](USESOURCECODE.md)
