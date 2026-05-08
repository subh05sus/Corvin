import { HttpException } from "./http.exception";
import { ErrorParams } from "../interface/error.interface";

export class NotFoundException extends HttpException {
  constructor(params: Pick<ErrorParams, "data" | "message" | "description">) {
    super({
      status: 404,
      code: "E404",
      message: params.message,
      data: params.data,
      description:params.description,
    });
  }
}
