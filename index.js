// Copyright 2010-2012 Mikeal Rogers
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

'use strict'

var extend                = require('util')._extend
  , cookies               = require('./lib/cookies')
  , helpers               = require('./lib/helpers')

var isFunction            = helpers.isFunction
  , constructObject       = helpers.constructObject
  , filterForCallback     = helpers.filterForCallback
  , constructOptionsFrom  = helpers.constructOptionsFrom
  , paramsHaveRequestBody = helpers.paramsHaveRequestBody


// organize params for patch, post, put, head, del
function initParams(uri, options, callback) {
  callback = filterForCallback([options, callback])
  options = constructOptionsFrom(uri, options)

  return constructObject()
    .extend({callback: callback})
    .extend({options: options})
    .extend({uri: options.uri})
    .done()
}

function request (uri, options, callback) {
  if (typeof uri === 'undefined') {
    throw new Error('undefined is not a valid uri or options object.')
  }

  var params = initParams(uri, options, callback)
  options = params.options
  options.callback = params.callback
  options.uri = params.uri

  if (params.options.method === 'HEAD' && paramsHaveRequestBody(params)) {
    throw new Error('HTTP HEAD requests MUST NOT include a request body.')
  }

  return new request.Request(options)
}

var verbs = ['get', 'head', 'post', 'put', 'patch', 'del']

verbs.forEach(function(verb){
  var method = verb === 'del' ? 'DELETE' : verb.toUpperCase()
  request[verb] = function(uri, options, callback){
    var params = initParams(uri, options, callback)
    params.options.method = method
    return this(params.uri || null, params.options, params.callback)
  }
})

request.jar = function (store) {
  return cookies.jar(store)
}

request.cookie = function (str) {
  return cookies.parse(str)
}

request.defaults = function (options, requester) {

  if (typeof options === 'function') {
    requester = options
    options = {}
  }

  var self = this
  var wrap = function (method) {
    var headerlessOptions = function (options) {
      options = extend({}, options)
      delete options.headers
      return options
    }

    var getHeaders = function (params, options) {
      return constructObject()
        .extend(options.headers)
        .extend(params.options.headers)
        .done()
    }

    return function (uri, opts, callback) {
      var params = initParams(uri, opts, callback)
      params.options = extend(headerlessOptions(options), params.options)

      if (options.headers) {
        params.options.headers = getHeaders(params, options)
      }

      if (isFunction(requester)) {
        method = requester
      }

      return method(params.options, params.callback)
    }
  }

  var defaults      = wrap(self)
  defaults.get      = self.get
  defaults.patch    = self.patch
  defaults.post     = self.post
  defaults.put      = self.put
  defaults.head     = self.head
  defaults.del      = self.del
  defaults.cookie   = self.cookie
  defaults.jar      = self.jar
  defaults.defaults = self.defaults
  return defaults
}

request.forever = function (agentOptions, optionsArg) {
  var options = constructObject()
  if (optionsArg) {
    options.extend(optionsArg)
  }
  if (agentOptions) {
    options.extend({agentOptions: agentOptions})
  }

  options.extend({forever: true})
  return request.defaults(options.done())
}

// Exports

module.exports = request
request.Request = require('./request')
request.initParams = initParams

// Backwards compatibility for request.debug
Object.defineProperty(request, 'debug', {
  enumerable : true,
  get : function() {
    return request.Request.debug
  },
  set : function(debug) {
    request.Request.debug = debug
  }
})
