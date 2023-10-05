[< back](../README.md)
# Settings
You can pass into the instance few settings to customize the behaviour of the library:

| Name         | Description                                                                                | Required | Default    |
|--------------|--------------------------------------------------------------------------------------------|----------|------------|
| url          | URL of the folder with components                                                          | ✅        |            |
| headers      | What additional headers should be sent in `uri` when requesting `CSS` and `HTML`           | ❌        | `{}`       |
| params       | What parameters should be sent in `uri` when requesting `CSS` and `HTML`                   | ❌        | `{}`       |
| localStorage | Should components be cached into `localStorage`                                            | ❌        | `true`     |
| callback     | Function which will be fired when all components are downloaded and rendered (even nested) | ❌        | `() => {}` |
| arguments    | Arguments to pass into callback function                                                   | ❌        | `[]`       |

```js
new Dito({
  url: 'http://localhost:80/components/',
  headers: {
    'X-API-Token': '3h43nj13mk1231nkj2123kjkio'
  },
  params: {
    name: 'value'
  },
  localStorage: true,
  callback: (key, value) => {
    console.log('Nothing else will load without user interaction or custom timeout!');
  },
  arguments: ['key', 'value'],
});
```
### localStorage
This library saves `HTML` and `CSS` files in user localStorage to save a little on requesting data from server. 
They are saved together with their version number used when registering the components, so with new version new 
components will be retrieved. Just remember to bump a version or disable this feature. 
### callback
Callback must be function which will be called when not only top level components are loaded but also any nested 
components in them. This method being called basically means that page has loaded and is ready to use.
