Test:
- [DONE] Main instance
  - [DONE] url
  - [DONE] params
  - [DONE] headers
- [DONE] Input
  - [DONE] injected input
  - [DONE] native (error expected)
- [DONE] Outputs
  - [DONE] injected output
  - [DONE] native (error expected)
- Focus
- Binds
  - native
  - ladder binding (one <-> two <-> three)
  - injected binding
- Events
  - injected
  - functions
  - inline
- Attributes
  - injected
  - native
  - custom
- Registering
  - [DONE] tags present on site are downloaded
  - [DONE] tags from downloaded content are also being imported
  - [DONE] localStorage on/off
  - [DONE] force
  - nested
- Dynamic CSS
  - executables (two same components different styles)
- Observables
  - one render per multiple changes if possible
    - css
    - html
- Rendering
  - First render should happen only once per component
  - reusing components
- Lify cycle
  - prepare
  - init
  - beforeRender
  - afterRender
- executables
  - functions and operations
  - injected
- For
  - injected
  - $key and value
  - combine with if
- If
  - injected
  - functions and operations
- injected
  - packing
  - no packing
  - mix
- Kamikaze
  - If
  - for
  - inject


For flow:
1. AssignChildren
   1. Get all aliases for `fors`
   2. Retrieve them from dome and reverse their order so we set up most nested first and iterate:
      1.Find for, for_keys and for_values attributes
      2. Create anchor and set `$self` on it and node with `@for`
      3. Retrieve path to the all nested fors and save them in `$self.forBox.anchors`
      4. Replace node with `@for` with anchor and set relation
   3. Set other actions
