import { summarizeGraphSchema } from "./graph.schema";
import { API_METHODS } from "../../interface/api.interface";
import { IRouteOptions } from "../../interface/fatstify.interface";
import graphController from "./graph.controller";

const routes: IRouteOptions<{
  Body: any;
  Params: any;
  Querystring: any;
}>[] = [
  {
    url: "/summarize",
    method: API_METHODS.POST,
    schema: summarizeGraphSchema,
    handler: graphController.summarize,
  },
];

export default routes;

