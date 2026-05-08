import { toolFunctionCallSchema } from "./tool.schema";
import { API_METHODS } from "../../interface/api.interface";
import { IRouteOptions } from "../../interface/fatstify.interface";
import toolController from "./tool.controller";

const routes: IRouteOptions<{
  Body: any;
  Params: any;
  Querystring: any;
}>[] = [
  {
    url: "/toolFunctionCall",
    method: API_METHODS.POST,
    schema: toolFunctionCallSchema,   
    handler: toolController.handleToolFunctionCall,
  },
  {
    url: "/generateyamlName",
    method: API_METHODS.POST,
    // schema: toolFunctionCallSchema,   
    handler: toolController.handleGenerateYamlName,
  },
];
  
export default routes;
