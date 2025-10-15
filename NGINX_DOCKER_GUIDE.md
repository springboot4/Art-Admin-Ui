# Docker Nginx 部署手册

## 前置准备

### 检查 Docker 是否已安装

```bash
docker --version
```

如果未安装，请先安装 Docker Desktop：

- macOS: https://docs.docker.com/desktop/install/mac-install/
- Windows: https://docs.docker.com/desktop/install/windows-install/
- Linux: https://docs.docker.com/engine/install/

---

## 1. 安装并启动 Nginx

### 方式一：使用 docker run 命令（推荐快速测试）

```bash
# 进入项目目录
cd /Users/fxz/WebstormProjects/art-admin-ui

# 启动 Nginx 容器
docker run -d \
  --name art-admin-nginx \
  -p 80:80 \
  -v $(pwd)/dist:/var/www/art-admin-ui/dist:ro \
  -v $(pwd)/nginx.conf:/etc/nginx/conf.d/art-admin.conf:ro \
  -v $(pwd)/nginx-logs:/var/log/nginx \
  --restart unless-stopped \
  nginx:alpine
```

**参数说明：**

- `-d`: 后台运行
- `--name art-admin-nginx`: 容器名称
- `-p 80:80`: 映射端口（宿主机:容器）
- `-v $(pwd)/dist:/var/www/art-admin-ui/dist:ro`: 挂载构建产物（只读）
- `-v $(pwd)/nginx.conf:/etc/nginx/conf.d/art-admin.conf:ro`: 挂载配置文件（只读）
- `-v $(pwd)/nginx-logs:/var/log/nginx`: 挂载日志目录（可读写）
- `--restart unless-stopped`: 自动重启策略
- `nginx:alpine`: 使用轻量级 Alpine 镜像

### 方式二：使用 docker-compose（推荐生产环境）

创建 `docker-compose.yml` 文件：

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: art-admin-nginx
    ports:
      - "80:80"
      # 如果需要 HTTPS，取消注释下面一行
      # - "443:443"
    volumes:
      # Vue 构建产物
      - ./dist:/var/www/art-admin-ui/dist:ro
      # Nginx 配置文件
      - ./nginx.conf:/etc/nginx/conf.d/art-admin.conf:ro
      # 日志目录
      - ./nginx-logs:/var/log/nginx
      # 如果需要 HTTPS，挂载证书目录
      # - ./ssl:/etc/nginx/ssl:ro
    restart: unless-stopped
    networks:
      - art-admin-network

networks:
  art-admin-network:
    driver: bridge
EOF
```

启动服务：

```bash
docker-compose up -d
```

---

## 2. 应用配置文件

### 检查配置文件是否正确挂载

```bash
docker exec art-admin-nginx cat /etc/nginx/conf.d/art-admin.conf
```

### 测试配置文件语法

```bash
docker exec art-admin-nginx nginx -t
```

预期输出：

```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 重新加载配置（不停机）

```bash
docker exec art-admin-nginx nginx -s reload
```

### 修改配置后重启容器

```bash
# 方式一：使用 docker restart
docker restart art-admin-nginx

# 方式二：使用 docker-compose
docker-compose restart nginx
```

---

## 3. 常用操作命令

### 查看容器状态

```bash
docker ps | grep art-admin-nginx
```

### 查看容器日志

```bash
# 实时查看日志
docker logs -f art-admin-nginx

# 查看最后 100 行日志
docker logs --tail 100 art-admin-nginx

# 查看访问日志（本地文件）
tail -f nginx-logs/art-admin-ui-access.log

# 查看错误日志（本地文件）
tail -f nginx-logs/art-admin-ui-error.log
```

### 进入容器调试

```bash
docker exec -it art-admin-nginx sh
```

容器内可用命令：

```bash
# 查看 Nginx 配置
cat /etc/nginx/conf.d/art-admin.conf

# 查看前端文件
ls -la /var/www/art-admin-ui/dist

# 查看 Nginx 进程
ps aux | grep nginx

# 退出容器
exit
```

### 停止 Nginx

```bash
# 方式一：停止容器（不删除）
docker stop art-admin-nginx

# 方式二：使用 docker-compose
docker-compose stop
```

### 启动已停止的 Nginx

```bash
# 方式一：启动已存在的容器
docker start art-admin-nginx

# 方式二：使用 docker-compose
docker-compose start
```

### 关闭并删除 Nginx 容器

```bash
# 方式一：停止并删除容器
docker stop art-admin-nginx
docker rm art-admin-nginx

# 方式二：使用 docker-compose（推荐）
docker-compose down

# 删除容器和网络，但保留卷数据
docker-compose down

# 删除所有内容（包括卷数据）
docker-compose down -v
```

### 强制重新创建容器

```bash
# 使用 docker run
docker rm -f art-admin-nginx
# 然后重新运行 docker run 命令

# 使用 docker-compose
docker-compose up -d --force-recreate
```

---
