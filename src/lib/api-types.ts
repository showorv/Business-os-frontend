// Pulls the useful parts out of the generated API types (src/api/schema.d.ts):
//   Data<...responses[200]>  the `data` of a success answer
//   Body<...["post"]>        what a request sends
type Json<T> = T extends { content: { "application/json": infer B } } ? B : never;
export type Data<T> = Json<T> extends { data: infer D } ? D : never;
export type Body<T> = T extends { requestBody?: infer R } ? Json<NonNullable<R>> : never;
