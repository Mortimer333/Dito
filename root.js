class RootJoint extends HTMLElement {
  constructor(node) {
    super();
    if (this.constructor === RootJoint) {
      throw new Error("RootJoint is an abstract and cannot be instantiated as separate class");
    }
  }

  methodsProxy ( object, keys ) {
    for (var i = 0; i < keys.length; i++) {
      let propertyName = keys[i];
      const type = typeof object[ propertyName ];
      if ( type == 'function') {
        if ( object[ propertyName ] == this.set.methodsProxy )  continue;
        object[ propertyName ] = new Proxy( object[ propertyName ], this._proxyHandle );
      } else if ( type == 'object' && object[ propertyName ] !== null && propertyName[0] != '_' ) {
        this.set.methodsProxy( object[ propertyName ], Object.keys( object[ propertyName ] ) );
      }
    };
  }
}

export { RootJoint };
