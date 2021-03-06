var androme = null;

System.config({
    packages: {
        '/build': { defaultExtension: 'js' }
    },
    map: {
        'plugin-babel': '/node_modules/systemjs-plugin-babel/plugin-babel.js',
        'systemjs-babel-build': '/node_modules/systemjs-plugin-babel/systemjs-babel-browser.js'
    },
    meta: {
       '*.js': {
           babelOptions: {
               es2015: false
           }
       }
   },
   transpiler: 'plugin-babel'
});

System.import('/build/main.js').then(result => {
    androme = result;
    System.import('/build/android/main.js').then(result => {
        androme.setFramework(result['default']);
        androme.parseDocument().then(function() {
            androme.close();
            androme.saveAllToDisk();
        });
    });
});