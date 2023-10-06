[< Back](../REGISTER&LOAD.md)      
[< Table of Contents](../../README.md#advanced-stuff)

# Bulk Register

In case simple `register` is too much hassle and code for all your components in our arsenal we can find `bulk` 
method which allows to register multiple components in quick succession:
```js
container.bulk({
  'shared/': [
    {
      'shared-': [
        '!spinner',
        'errors',
        'notification',
      ]
    }
  ],
  'user/user-': [
    'panel',
    'delete-modal',
  ]
}, version);
```
It works by passing an object of paths to the components where:
- Top levels must be namespaces with value of array
- In array there are allowed to types of data:
  - `string` which tells script that component lays there
  - `object` indicating that there are components nested even further

To give an example `bulk` method from above results in such paths:
- `shared/shared-!spinner`
- `shared/shared-errors`
- `shared/shared-notification`
- `user/user-panel`
- `user/user-delete-modal`

Which is translated into:
```js
container.register('shared-spinner', version, 'shared/', true);
container.register('shared-errors', version, 'shared/', false);
container.register('shared-notification', version, 'shared/', false);
container.register('user-panel', version, 'user/', false);
container.register('user-delete-modal', version, 'user/', false);
```
> Notice that `force` is set by beginning the name of the component with explanation mark (`!`): `!spinner`

To put it simply `bulk` is a simple way to register your component by coping your folder structure.
