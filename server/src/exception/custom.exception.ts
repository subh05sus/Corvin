import { ErrorParams } from "../interface/error.interface";
import { HttpException } from "./http.exception";

export class CustomException extends HttpException {
  constructor(
    params: Pick<ErrorParams, "data" | "message" | "code" | "status" | "description">
  ) {
    super({
      status: params?.status || 500,
      code: params?.code || "",
      message: params?.message,
      data: params.data || "",
      description:params?.description || "",
    });
  }
}
