'use strict';

var fs = require('fs');
var path = require('path');
var thinkit = require('thinkit');
var co = require('co');

/**
 * global cache
 * @type {Object}
 */
global.thinkCache = {};

/**
 * global think variable
 * @type {Object}
 */
global.think = {};
/**
 * apply thinkit methods to think
 */
for(var name in thinkit){
  think[name] = thinkit[name];
}
/**
 * server start time
 * @type {Number}
 */
think.startTime = Date.now();
/**
 * create class
 * @param {Object} props [methods and props]
 */
var Class = think.Class;
think.Class = function(methods, clean){
  // think.Class({})
  // think.Class({}, true)
  if (think.isObject(methods)) {
    return clean === true ? Class(methods) : Class(think.base, methods);
  }
  // think.Class(superClass, {})
  else if (think.isFunction(methods)) {
    return Class(methods, clean);
  }
  
  return function(superClass, props){
    // think.controller();
    // think.controller({})
    if (think.isObject(superClass) || !superClass) {
      props = superClass;
      superClass = methods + '_base';
    }
    // think.controller('rest', {})
    // think.controller('common/controller/base', {})
    else if (think.isString(superClass) && superClass.indexOf('/') === -1) {
      superClass = methods + '_' + superClass;
    }
    if (think.isString(superClass)) {
      superClass = think.require(superClass);
      //get class
      if (!props) {
        return superClass;
      }
    }
    return Class(superClass, props);
  }
}
/**
 * base class
 * @type {}
 */
think.base = require('./base.js');

/**
 * app dir name, can be set in init
 * @type {Object}
 */
think.dirname = {
  config: 'config',
  controller: 'controller',
  model: 'model',
  adapter: 'adapter',
  logic: 'logic',
  service: 'service',
  view: 'view',
  middleware: 'middleware',
  runtime: 'runtime',
  common: 'common',
  bootstrap: 'bootstrap',
}
/**
 * debug
 * @type {Boolean}
 */
think.debug = false;
/**
 * server port
 * @type {Number}
 */
think.port = 0;
/**
 * app mode
 * @type {String}
 */
think.mode = 'http';
/**
 * mini app mode
 * @type {Boolean}
 */
think.mini = false;
/**
 * thinkjs module root path
 * @type {String}
 */
think.THINK_PATH = path.normalize(__dirname + '/../../');
/**
 * thinkjs module lib path
 * @type {String}
 */
think.THINK_LIB_PATH = path.normalize(__dirname + '/../');
/**
 * thinkjs version
 * @param  {) []
 * @return {}         []
 */
think.version = (function(){
  var packageFile = think.THINK_PATH + '/package.json';
  var json = JSON.parse(fs.readFileSync(packageFile, 'utf-8'));
  return json.version;
})();

/**
 * module list
 * @type {Array}
 */
think.module = [];

/**
 * alias co module to think.co
 * @type {Object}
 */
think.co = co;
/**
 * get common module path
 * @return {String} []
 */
think.getModulePath = function(module){
  if (think.mini) {
    return think.APP_PATH;
  }
  module = module || think.dirname.common;
  return think.APP_PATH + '/' + module;
}

/**
 * require module
 * @param  {String} name []
 * @return {mixed}      []
 */
think.require = function(name){
  if (!think.isString(name)) {
    return name;
  }
  if (think._aliasExport[name]) {
    return think._aliasExport[name];
  }
  if (name in think._alias) {
    think._aliasExport[name] = think.safeRequire(think._alias[name]);
    return think._aliasExport[name];
  }
  var obj = require(name);
  if (think.isFunction(obj)) {
    obj.prototype.__filename = name;
  }
  //think._aliasExport[name] = obj;
  return obj;
}
/**
 * safe require
 * @param  {String} file []
 * @return {mixed}      []
 */
think.safeRequire = function(file){
  if (file[0] === '/' && !think.isFile(file)) {
    return null;
  }
  try{
    return require(file);
  }catch(e){
    if (think.debug) {
      console.error(e.stack);
    }
  }
  return null;
}
/**
 * log
 * @return {} []
 */
think.log = function(msg, type){
  if (think.isError(msg)) {
    console.log(msg.stack);
  }
}

/**
 * think sys & common config
 * @type {Object}
 */
think._config = {};
/**
 * get or set config
 * @return {mixed} []
 */
think.config = function(name, value, data){
  data = data || this._config;
  if (think.isObject(name)) {
    think.extend(data, name);
  }else if(think.isString(name)){
    name = name.toLowerCase();
    //one grade config
    if (name.indexOf('.') === -1) {
      if (value === undefined) {
        return data[name];
      }
      data[name] = value;
      return;
    }
    name = name.split('.');
    if (value === undefined) {
      value = data[name[0]] || {};
      return value[name[1]];
    }
    if (!(name[0] in data)) {
      data[name[0]] = {};
    }
    data[name[0]][name[1]] = value;
  }
}
/**
 * module config
 * @type {Object}
 */
think._moduleConfig = {};
/**
 * get module config
 * @param  {String} module []
 * @return {Object}        []
 */
think.getModuleConfig = function(module){
  if (!think.debug && module in think._moduleConfig) {
    return think._moduleConfig[module];
  }
  var rootPath;
  if (module === true) {
    rootPath = think.THINK_LIB_PATH + '/config';
  }else{
    rootPath = think.getModulePath(module) + '/' + think.dirname.config;
  }
  //config.js
  var file = rootPath + '/config.js';
  var config = think.safeRequire(file);
  //mode
  file = rootPath + '/' + think.mode + '.js';
  var modeConfig = think.safeRequire(file);
  config = think.extend({}, config, modeConfig);
  if (think.debug) {
    //debug.js
    file = rootPath + '/debug.js';
    config = think.extend(config, think.safeRequire(file));
  }
  think._moduleConfig[module] = config;
  return config;
}
/**
 * hook list
 * @type {Object}
 */
think._hook = {};
/**
 * exec hook
 * @param  {String} name []
 * @return {}      []
 */
think.hook = function(name, http, data){
  if (!(name in think._hook)) {
    return Promise.resolve();
  }
  var list = think._hook[name];
  var index = 0, length = list.length;
  function execMiddleware(){
    if (index >= length) {
      return Promise.resolve();
    }
    var item = list[index++];
    return think.middleware(item, http, data).then(function(){
      return execMiddleware();
    });
  }
  return execMiddleware();
}
/**
 * create or exec middleware
 * @param  {Function} superClass []
 * @param  {Object} props      []
 * @return {mixed}            []
 */
var middleware = null;
think.middleware = function(superClass, props, data){
  var length = arguments.length;
  var prefix = 'middleware_';
  //exec middleware
  if (length >= 2 && props && props.req && props.res) {
    var name = superClass, http = props;
    if (think.isString(name)) {
      var cls = think.require(prefix + name);
      return think.co.wrap(cls(http).run)(data);
    }else{
      return think.co.wrap(name)(http, data);
    }
  }
  //get middleware
  if (length === 1 && think.isString(superClass)) {
    var key = prefix + superClass;
    console.log(key)
    if (key in think._aliasExport) {
      return think._aliasExport[key];
    }
    if (key in think._alias) {
      think._aliasExport[key] = think.safeRequire(think._alias[key]);
      return think._aliasExport[key];
    }
    throw new Error('middleware ' + superClass + ' not found');
  }
  if (!middleware) {
    middleware = think.Class('middleware');
  }
  //create middleware
  return middleware(superClass, props);
}
/**
 * create, register, call adapter
 * @param  {String} name []
 * @return {void}      []
 */
think.adapter = function(type, name, fn){
  //load sys adapter
  think.loadAdapter();

  var length = arguments.length, key = 'adapter_';
  //register adapter
  //think.adapter('session', 'redis', function(){})
  if (length === 3 && think.isFunction(fn)) {
    key += type + '_' + name;
    think._aliasExport[key] = fn;
    return;
  }
  //invoke adapter
  //think.adapter('session', 'redis')
  if (length === 2 && think.isString(name)) {
    key += type + '_' + name;
    if (!(key in think._aliasExport)) {
      if (key in think._alias) {
        think._aliasExport[key] = think.safeRequire(think._alias[key]);
        return think._aliasExport[key];
      }
      throw new Error('adapter ' + type + ':' + name + ' not found');
    }
    return think._aliasExport[key];
  }
  //create adapter
  //module.exports = think.adapter({})
  //module.exports = think.adapter(superClass, {});
  var superClass, methods = type;
  if (think.isFunction(type)) {
    superClass = type;
    methods = name;
  }else if (think.isString(type)) {
    //get superClass from alias
    if (think._aliasExport[key]) {
      superClass = think._aliasExport[key];
    }else{
      //superClass is base class
      superClass = think.base;
    }
    methods = name;
  }
  //create clean Class
  if (!superClass) {
    return think.Class(type, true);
  }
  return think.Class(superClass, methods);
}
/**
 * load system & comon module adapter
 * @return {} []
 */
var adapterLoaded = false;
think.loadAdapter = function(force){
  if (adapterLoaded && !force) {
    return;
  }
  adapterLoaded = true;
  var paths = [think.THINK_LIB_PATH + '/adapter'];
  //common module adapter
  var adapterPath = think.getModulePath() + '/' + think.dirname.adapter;
  if (think.isDir(adapterPath)) {
    paths.push(adapterPath);
  }
  paths.forEach(function(path){
    var dirs = fs.readdirSync(path);
    dirs.forEach(function(dir){
      think.alias('adapter_' + dir, path + '/' + dir);
    })
  })
}

/**
 * module alias
 * @type {Object}
 */
think._alias = {};
/**
 * module alias export
 * @type {Object}
 */
think._aliasExport = {};
/**
 * load alias
 * @param  {String} type  []
 * @param  {Array} paths []
 * @return {Object}       []
 */
think.alias = function(type, paths, slash){
  if (!think.isArray(paths)) {
    paths = [paths];
  }
  paths.forEach(function(path){
    var files = think.getFiles(path);
    files.forEach(function(file){
      var name = file.slice(0, -3);
      name = type + (slash ? '/' : '_') + name;
      think._alias[name] = path + '/' + file;
    })
  })
}
/**
 * route list
 * @type {Array}
 */
think._route = null;
/**
 * load route
 * @return {} []
 */
think.route = function(clear){
  if (clear) {
    //clear route
    if (clear === true) {
      think._route = null;
    }
    //set route
    else if (think.isArray(clear)) {
      think._route = clear;
    }
    return;
  }
  if (think._route !== null) {
    return think._route;
  }
  var file = think.getModulePath() + '/' + think.dirname.config + '/route.js';
  var config = think.safeRequire(file) || {};
  //route config is funciton
  //may be is dynamic save in db
  if (think.isFunction(config)) {
    var fn = think.co.wrap(config);
    return fn().then(function(route){
      think._route = route;
      return route;
    })
  }else{
    think._route = config;
  }
  return think._route;
}
/**
 * gc timer list
 * @type {Object}
 */
think.gcTimer = {};
/**
 * regist gc
 * @param  {Object} instance [class instance]
 * @return {}          []
 */
think.gc = function(instance){
  if (!instance || !instance.gcType) {
    throw new Error('instance must have gcType property');
  }
  var type = instance.gcType;
  if (think.APP_DEBUG || think.mode === 'cli' || type in think.gcTimer) {
    return;
  }
  think.gcTimer[type] = setInterval(function(){
    var hour = (new Date()).getHours();
    var hours = think._config.cache_gc_hour || [];
    if (hours.indexOf(hour) === -1) {
      return;
    }
    return instance.gc && instance.gc(Date.now());
  }, 3600 * 1000);
}
/**
 * create controller sub class
 * @type {Function}
 */
think.controller = think.Class('controller');
/**
 * create logic class
 * @type {Function}
 */
think.logic = think.controller;
/**
 * create model sub class
 * @type {Function}
 */
think.model = think.Class('model');
/**
 * create service sub class
 * @type {Function}
 */
think.service = think.Class('service');
/**
 * create middleware sub class
 * @type {Function}
 */
think.middleware = think.Class('middleware');