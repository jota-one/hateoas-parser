import { describe, expect, it, beforeAll } from 'vitest'
import {
  parseLinks,
  getEndpoint,
  getCleanEndpoint
} from '../index'

let index = {}
let domainIndex = {}
let halIndex = {}

beforeAll(() => {
  index = {
    "current_user_url": "https://api.github.com/user",
    "current_user_authorizations_html_url": "https://github.com/settings/connections/applications{/client_id}",
    "authorizations_url": "https://api.github.com/authorizations",
    "code_search_url": "https://api.github.com/search/code?q={query}{&page,per_page,sort,order}",
    "commit_search_url": "https://api.github.com/search/commits?q={query}{&page,per_page,sort,order}",
    "emails_url": "https://api.github.com/user/emails",
    "emojis_url": "https://api.github.com/emojis",
    "events_url": "https://api.github.com/events",
    "feeds_url": "https://api.github.com/feeds",
    "followers_url": "https://api.github.com/user/followers",
    "following_url": "https://api.github.com/user/following{/target}",
    "gists_url": "https://api.github.com/gists{/gist_id}",
    "hub_url": "https://api.github.com/hub",
    "issue_search_url": "https://api.github.com/search/issues?q={query}{&page,per_page,sort,order}",
    "issues_url": "https://api.github.com/issues",
    "keys_url": "https://api.github.com/user/keys",
    "notifications_url": "https://api.github.com/notifications",
    "organization_repositories_url": "https://api.github.com/orgs/{org}/repos{?type,page,per_page,sort}",
    "organization_url": "https://api.github.com/orgs/{org}",
    "public_gists_url": "https://api.github.com/gists/public",
    "rate_limit_url": "https://api.github.com/rate_limit",
    "repository_url": "https://api.github.com/repos/{owner}/{repo}",
    "repository_search_url": "https://api.github.com/search/repositories?q={query}{&page,per_page,sort,order}",
    "current_user_repositories_url": "https://api.github.com/user/repos{?type,page,per_page,sort}",
    "starred_url": "https://api.github.com/user/starred{/owner}{/repo}",
    "starred_gists_url": "https://api.github.com/gists/starred",
    "team_url": "https://api.github.com/teams",
    "user_url": "https://api.github.com/users/{user}",
    "user_organizations_url": "https://api.github.com/user/orgs",
    "user_repositories_url": "https://api.github.com/users/{user}/repos{?type,page,per_page,sort}",
    "user_search_url": "https://api.github.com/search/users?q={query}{&page,per_page,sort,order}"
  }

  domainIndex = {
    "infoMessages": [],
    "data": {
      "links": [
        {
          "rel": "documents",
          "href": "http://api.domain.com/confirmation/admin/documents?someParam={someParam}{&otherParam,thirdParam}"
        },
        {
          "rel": "other",
          "href": "http://api.domain.com/confirmation/admin/other"
        }
      ]
    }
  }

  halIndex = {
    _links: {
      documents: {
        href: "someUrl"
      },
      users: {
        href: "someOtherUrl"
      }
    }
  }
})

describe('Parse hateoas links list', () => {
  it('links not provided', () => {
    expect(parseLinks({})).toEqual({})
  })

  it('some index endpoint', () => {
    expect(parseLinks(domainIndex.data)).toEqual({
      documents: 'http://api.domain.com/confirmation/admin/documents?someParam={someParam}{&otherParam,thirdParam}',
      other: 'http://api.domain.com/confirmation/admin/other'
    })
  })

  it('hal index', () => {
    expect(parseLinks(halIndex)).toEqual({
      documents: 'someUrl',
      users: 'someOtherUrl'
    })
  })
})

describe('Get clean links', () =>  {
  it('get a clean link', () => {
    expect(getCleanEndpoint(index, 'commit_search_url')).toEqual('https://api.github.com/search/commits')
  })

  it('get a clean link on already clean link', () => {
    expect(getCleanEndpoint(index, 'rate_limit_url')).toEqual('https://api.github.com/rate_limit')
  })

  it('get a clean -not existing- link', () => {
    expect(getCleanEndpoint(index, 'not_existing_key')).toEqual('')
  })
})

describe('Get links with route parameters (object provided)', () => {
  it('optional sub-resource', () => {
    expect(getEndpoint(index, 'gists_url', {gist_id: 'lalalala'})).toEqual('https://api.github.com/gists/lalalala')
  })

  it('optional sub-resources', () => {
    expect(getEndpoint(index, 'starred_url', {owner: 'karamasoff', repo: 'require-topmodel'})).toEqual('https://api.github.com/user/starred/karamasoff/require-topmodel')
  })

  it('optional sub-resources with only first provided', () => {
    expect(getEndpoint(index, 'starred_url', {owner: 'karamasoff'})).toEqual('https://api.github.com/user/starred/karamasoff')
  })

  it('optional sub-resources with only second provided', () => {
    function missingParameter () {
      getEndpoint(index, 'starred_url', {repo: 'require-topmodel'})
    }
    expect(missingParameter).toThrow()
  })

  it('optional sub-resources with useless param', () => {
    expect(getEndpoint(index, 'starred_url', {useless: 'totally', owner: 'karamasoff'})).toEqual('https://api.github.com/user/starred/karamasoff')
  })

  it('required sub-resource', () => {
    expect(getEndpoint(index, 'user_url', {user: 'karamasoff'})).toEqual('https://api.github.com/users/karamasoff')
  })
})

describe('Get links with querystring parameters (object provided)', () => {
  it('required parameter', () => {
    expect(getEndpoint(index, 'user_search_url', {query: 'kara'})).toEqual('https://api.github.com/search/users?q=kara')
  })

  it('required & optionals parameters', () => {
    expect(getEndpoint(index, 'user_search_url', {query: 'kara', page: 2, order: 'desc'})).toEqual('https://api.github.com/search/users?q=kara&page=2&order=desc')
  })

  it('required parameter & missing value', () => {
    function missingParameters () {
      getEndpoint(index, 'user_search_url')
    }
    expect(missingParameters).toThrow(/Some parameter/)
  })

  it('useless values provided', () => {
    expect(getEndpoint(index, 'current_user_repositories_url', {a: 1, b: 2, notexisting: 3})).toEqual('https://api.github.com/user/repos')
  })

  it('optional querystring (no parameters provided)', () => {
    expect(getEndpoint(index, 'current_user_repositories_url')).toEqual('https://api.github.com/user/repos')
  })

  it('optional querystring (some parameters provided)', () => {
    expect(getEndpoint(index, 'current_user_repositories_url', {type: 'js', page: 2})).toEqual('https://api.github.com/user/repos?type=js&page=2')
  })
})

describe('Get links with route parameters (array provided)', () => {
  it('optional sub-resource', () => {
    expect(getEndpoint(index, 'gists_url', ['lalalala'])).toEqual('https://api.github.com/gists/lalalala')
  })

  it('optional sub-resources', () => {
    expect(getEndpoint(index, 'starred_url', ['karamasoff', 'require-topmodel'])).toEqual('https://api.github.com/user/starred/karamasoff/require-topmodel')
  })

  it('optional sub-resources with only first provided', () => {
    expect(getEndpoint(index, 'starred_url', ['karamasoff'])).toEqual('https://api.github.com/user/starred/karamasoff')
  })

  it('required sub-resource', () => {
    expect(getEndpoint(index, 'user_url', ['karamasoff'])).toEqual('https://api.github.com/users/karamasoff')
  })
})

describe('Get links with querystring parameters (array provided)', () => {
  it('required parameter', () => {
    expect(getEndpoint(index, 'user_search_url', ['kara'])).toEqual('https://api.github.com/search/users?q=kara')
  })

  it('required & optionals parameters', () => {
    expect(getEndpoint(index, 'user_search_url', ['kara', 2, '', '', 'desc'])).toEqual('https://api.github.com/search/users?q=kara&page=2&per_page=&sort=&order=desc')
  })

  it('required & optionals parameters & skip some optionals', () => {
    expect(getEndpoint(index, 'user_search_url', ['kara', 2, undefined, undefined, 'desc'])).toEqual('https://api.github.com/search/users?q=kara&page=2&order=desc')
  })

  it('optional querystring (some parameters provided)', () => {
    expect(getEndpoint(index, 'current_user_repositories_url', ['js', 2])).toEqual('https://api.github.com/user/repos?type=js&page=2')
  })
})
