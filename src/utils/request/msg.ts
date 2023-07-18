import axios, {AxiosResponse} from "axios";
import logger from "../logger";

const MsgPushRequest = axios.create({
  timeout: 10000,
  baseURL: process.env.MSG_PUSH_API_URL,
  headers: {
    "Content-Type": "application/json"
  },
});

MsgPushRequest.interceptors.response.use((response: AxiosResponse) => {
  switch (response.status) {
    case 400:
      logger.error(`网络请求错误 - ${response.status} - ${response.data?.err_msg} 网络接口请求错误，请检查网络连接后重试。`)
      break
    case 401:
      break
    case 403:
      logger.error(`访问受限 - ${response.status} - ${response.data?.err_msg} 你没有访问指定资源的权限`)
      break
    case 404:
      logger.error(`客户端请求错误 - ${response.status} - ${response.data?.err_msg} 请求资源不存在或已被删除`)
      break
    case 408:
      logger.error(`请求超时 - ${response.status} - ${response.data?.err_msg} 接口请求超时`)
      break
    case 422:
      logger.error(`参数输入错误 - ${response.status} - ${response.data?.err_msg} 客户端参数输入错误`)
      break
    default:
      if (response.status > 300) {
        logger.error(`网络请求异常 - ${response.status} - ${response.data?.err_msg} 网络接口请求异常，请稍后重试`)
        break
      }
  }

  return response
}, (error: any) => {
  console.error(error)
  return Promise.reject(error);
})

export default MsgPushRequest