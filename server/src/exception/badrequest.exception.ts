import { HttpException } from "./http.exception";
import { ErrorParams } from "../interface/error.interface";

export class BadRequestException extends HttpException {
  constructor(params: Pick<ErrorParams, "data" | "message" | "description">) {
    super({
      status: 400,
      code: "E400",
      message: params.message,
      data: params.data,
      description:params.description,
    });
  }
}
