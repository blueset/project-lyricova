import { AxiosRequestConfig } from "axios";

export default {
    responseType: "text",
    transformResponse: [(resp: string) => {
        console.log("Response", `[${resp}]`);
        JSON.parse(resp.slice(resp.indexOf("(") + 1, -1))
    }]
} as Partial<AxiosRequestConfig>;