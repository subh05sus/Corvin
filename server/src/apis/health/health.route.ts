import { healthSchema, minimumCliVersionSchema } from "./health.schema";
import healthController from "./health.controller";
import { API_METHODS } from "../../interface/api.interface";
import { IRouteOptions } from "../../interface/fatstify.interface";

const routes: IRouteOptions<{
    Body: any;
    Params: any;
    Querystring: any;
  }>[] = [
    {
      url: "/",
      method: API_METHODS.GET,
      schema: healthSchema,   
      handler: healthController.healthCheck,
    },
    {
      url: "/minimum-cli-version",
      method: API_METHODS.GET,
      schema: minimumCliVersionSchema,
      handler: healthController.getMinimumCliVersion,
    },
 
  ];
  
  export default routes;