export function createControllerDetail(tag: string) {
  return {
    tags: [tag],
    security: [{ JwtAuth: [] }],
  };
}
