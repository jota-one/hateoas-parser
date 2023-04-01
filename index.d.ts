type HalObject = {
  href: string
}

type HateoasObject = {
  rel: string
  href: string
}
type Resource = {
  _links: Record<string, HalObject>
} | {
  index: HateoasObject[]
} | {
  links: HateoasObject[]
}
declare function parseLinks(result: Resource): Record<string, string>
declare function parseUrl(url: string, params: Record<string, string>): string
declare function getEndpoint(index: Record<string, string>, rel: string, params: Record<string, string>, version: string): string
declare function getCleanEndpoint(index: Record<string, string>, rel: string): string
