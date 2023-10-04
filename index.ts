export type HalObject = {
  href: string
}

export type HateoasObject = {
  rel: string
  href: string
}
export type HateoasResource = Record<'_links' | 'index' | 'links', Record<string, HalObject> | HateoasObject[]>

const pipe = (...fns: Function[]): Function => x => fns.reduce((y, f) => f(y), x)

/**
 * Mixin to handle parameters replacement when an Object is provided
 *
 * @param {Object} o
 * @returns {Object}
 */
const withParamsAsObject = o => {
  return Object.assign({}, o, {
    replaceParams () {
      Object.keys(this.params).map(param => {
        this.url = this.url.replace('{' + param + '}', this.params[param])
      })
    },

    computeOptionalParamsNames (names) {
      this.optionalParams = names.reduce((acc, name) => {
        if (this.params[name] !== undefined) {
          acc[name] = this.params[name]
        }
        return acc
      }, {})
    },

    applyOptionalSubResources () {
      this.url = Object.keys(this.params).reduce((url, name) => {
        // provided param is not an optional sub-resource
        if (this.subResources.indexOf(name) < 0) {
          return url
        }

        const subresource = this.subResources.shift()

        // a sub resource has not been replaced in params list
        if (subresource !== name) {
          throw new Error('Optional subresources must be provided from left to right. "' + subresource + '" is missing.')
        }

        return url.replace('{/' + subresource + '}', '/' + this.params[subresource])
      }, this.url)
    }
  })
}

/**
 * Mixin to handle parameters replacement when an Array is provided
 *
 * @param {Object} o
 * @returns {Object}
 */
const withParamsAsArray = o => {
  return Object.assign({}, o, {
    replaceParams () {
      this.params = this.params.reduce((result, param) => {
        let placeholder = /\{([a-zA-Z0-9_]+)\}/.exec(this.url)

        if (placeholder && placeholder[0]) {
          this.url = this.url.replace(placeholder[0], param)
          return result
        }
        result.push(param)
        return result
      }, [])
    },

    computeOptionalParamsNames (names) {
      this.optionalParams = names.reduce((acc, name) => {
        let value = this.params.shift()
        if (this.params.length >= 0 && value !== undefined) {
          acc[name] = value
        }
        return acc
      }, {})
    },

    applyOptionalSubResources () {
      this.url = this.params.reduce((url, value) => {
        const subresource = this.subResources.shift()

        return url.replace('{/' + subresource + '}', '/' + value)
      }, this.url)
    }
  })
}

/**
 * Main Factory. Contains all common methods to parse a HATEOAS url
 */
const UrlParserFactory = ({ url = '', params }: { url: string, params: Record<string, string> | string[] }) => ({
  optionalParams: {},
  subResources: [],
  url,
  params,

  // abstract methods (overriden by mixin)
  computeOptionalParamsNames (names: string[]) {
    return {}
  },
  applyOptionalSubResources () {},
  replaceParams() {},

  // private
  applyOptionalParams () {
    if (Object.keys(this.optionalParams).length === 0) {
      return
    }

    const connector = this.url.indexOf('?') > -1 ? '&' : '?'
    const querystring = Object.keys(this.optionalParams).map(name => {
      return name + '=' + this.optionalParams[name]
    }).join('&')

    this.url += connector + querystring
  },

  getOptionalParamsPosition () {
    if (this.url.includes('{&')) {
      return this.url.indexOf('{&')
    } else if (this.url.includes('{?')) {
      return this.url.indexOf('{?')
    }

    return -1
  },

  createOptionalParamsHash () {
    const position = this.getOptionalParamsPosition()
    if (position < 0) {
      return
    }

    // generate an array with allowed optional paramaters names
    const optionals = this.url.slice(position)
    const optionalParametersNames = optionals.slice(2).slice(0, -1).split(',')

    // compute array to a key-value Hash with provided values
    this.computeOptionalParamsNames(optionalParametersNames)
  },

  createSubResourcesList () {
    const subResources = this.url.match(/([^{]*?)\w(?=\})/gmi) || []

    this.subResources = subResources
      .filter(name => { return name.indexOf('/') === 0 })
      .map(name => {
        return name.slice(1)
      })
  },

  removeQueryString () {
    const querystringPosition = this.url.indexOf('?')
    if (querystringPosition > -1) {
      this.url = this.url.slice(0, querystringPosition)
    }
  },

  removeOptionalParamsDefinition () {
    const position = this.getOptionalParamsPosition()
    if (position > -1) {
      this.url = this.url.slice(0, position)
    }
  },

  buildUrl () {
    if (this.subResources.length > 0) {
      this.applyOptionalSubResources()

      // drop remaining not replaced optional params
      this.url = this.url.replace(/([^{]*?)\w(?=\})/gmi, '').replace('{}', '')
    }
    this.removeOptionalParamsDefinition()
    this.applyOptionalParams()
  },

  getUrl () {
    return this.url
  },

  checkForErrors () {
    const remainingParams = this.url.match(/([^{]*?)\w(?=\})/gmi)
    if (remainingParams) {
      throw new Error('Some parameters (' + remainingParams.join(', ') + ') must be supplied in URL (' + this.url + ')')
    }
  }
})

/**
 * Factory to get a URL parser configured to handle parameters as a key-value Hash
 *
 * @param {String} url
 * @param {Object} params
 * @returns {Object}
 */
const createObjectParser = ({ url = '', params = {} } = {}) => pipe(
  withParamsAsObject,
)(UrlParserFactory({ url, params }))

/**
 * Factory to get a URL parser configured to handle parameters as an Array
 *
 * @param {String} url
 * @param {Array} params
 * @returns {Object}
 */
const createArrayParser = ({ url = '', params = [] } = {}) => pipe(
  withParamsAsArray,
)(UrlParserFactory({ url, params }))

/**
 * Simple function to convert a raw HATEOAS index result to a more usable key-value Hash
 */
export const parseLinks = function (result: HateoasResource) {
  result = result || {} as HateoasResource
  let indexContent = (result._links || result.index || result.links || [])
  if (!Array.isArray(indexContent)) {
    return Object.entries(indexContent).reduce((acc, [rel, def]) => {
      acc[rel] = def.href
      return acc
    }, {})
  }
  return indexContent.reduce((acc, value) => {
    acc[value.rel] = value.href
    return acc
  }, {})
}

export const parseUrl = function (url: string, params: Record<string, string> | string[]) {
  params = params || {}
  let parser = Array.isArray(params) ? createArrayParser({ url, params }) : createObjectParser({ url, params })

  // replace mandatory params
  parser.replaceParams()

  // handle optional params
  parser.createOptionalParamsHash()

  // handle optional sub-resources
  parser.createSubResourcesList()

  // generate final URL
  parser.buildUrl()

  // check if url is now well-formed
  parser.checkForErrors()

  return parser.getUrl()
}

/**
 * Format an endpoint by resolving eventual required and optional parameters
 */
export const getEndpoint = function (index: Record<string, string>, rel: string, params?: Record<string, string> | string[]) {
  let url = index[rel]
  return parseUrl(url || '', params)
}

/**
 * Format an endpoint by simply removing all optional or required paramaters in the querystring
 */
export const getCleanEndpoint = function (index: Record<string, string>, rel: string) {
  let url = index[rel] || ''
  let parser = createObjectParser({ url })

  parser.removeOptionalParamsDefinition()
  parser.removeQueryString()
  parser.checkForErrors()

  return parser.getUrl()
}

export default {
  parseLinks,
  parseUrl,
  getEndpoint,
  getCleanEndpoint
}
