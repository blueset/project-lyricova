import { AxiosRequestConfig } from "axios";

export default {
    responseType: "text",
    transformResponse: [(resp: string) => JSON.parse(resp.slice(resp.indexOf("(") + 1, -1))]
} as Partial<AxiosRequestConfig>;