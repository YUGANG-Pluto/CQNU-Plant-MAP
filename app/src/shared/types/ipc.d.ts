export interface IpcSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface IpcFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type IpcResponse<T = unknown> = IpcSuccess<T> | IpcFailure;
