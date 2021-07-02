# WebSocket 服务

## 文档

[Notion](https://www.notion.so/Websocket-63faebe9ef2e493cae9476ee623df10e)

## 协同相关，通知客户端刷新数据

### 粒度

前端在连接 websocket 时，需要提供 workspaceId，workspace 内所有资源变化都会通知到前端，前端需要判断事件是否需要处理

### 方案

因为当前 api 服务本身是无状态的，但 websocket 是有状态的。当用户通过 api 修改了某个 Story，api 需要找到所有停留在当前 Story 页面的用户和他们正在连接的 websocket 的后端服务，让 websocket 通知对应的用户

因此有以下几种做法：

1. 在 websocket 服务中使用一个 sendEvent 的 http 接口，当用户连接到 websocket 时，选将用户 id, storyId 和 websocket 服务的地址写入 pg。当某个用户 saveTransaction 时，从 pg 中找到当前 story 下所有的用户，向他们所在的 websocket 服务的地址发送 sendEvent 请求，由每个 websocket 服务推送给前端。用户断开 websocket 时再从数据库中移除相关信息。（类似于 jike-io）

   优点：1. 不依赖外部组件，架构简单

   缺点：1. 逻辑复杂，代码不易维护 2. 过于 hack, 依赖 pg 做服务发现和负载均衡 3. 可能需要发送大量 http 请求

2. 在 saveTransaction 是将事件发送到 kafka，websocket 服务订阅 kafka 中的 topic，并推送给前端

   优点： 1. 逻辑清晰 2. 性能优异

   缺点： 1. 需要引入消息队列，增加部署难度和维护成本

3. 将上述 kafka 替换成 change stream

   优点：1. 逻辑清晰 2. 架构简单 3. 性能足够

   缺点：1. 适用场景单一

4. websocket load balancer，将同一 Story 页面中的所有用户以及相关请求 load 到同一个 websocket 实例

   优点：1. 性能优异

   缺点：1. 依赖外部组件

### 最终方案

最终选定为方案二，但不引入 Kafka，使用 pg 作为消息队列，来广播事件
