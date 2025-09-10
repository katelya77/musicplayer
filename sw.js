const CACHE_NAME = 'katelya-music-player-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.7/jsmediatags.min.js'
];

// 安装事件
self.addEventListener('install', (event) => {
  console.log('Service Worker: 正在安装');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: 缓存文件');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Service Worker: 缓存失败', error);
      })
  );
  self.skipWaiting();
});

// 激活事件
self.addEventListener('activate', (event) => {
  console.log('Service Worker: 正在激活');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 删除旧缓存', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  // 跳过非GET请求和音乐API请求
  if (event.request.method !== 'GET' || 
      event.request.url.includes('music-api.gdstudio.xyz')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 缓存命中，返回缓存的资源
        if (response) {
          return response;
        }
        
        // 缓存未命中，从网络获取
        return fetch(event.request).then((response) => {
          // 检查是否收到有效响应
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // 克隆响应，因为响应是流，只能使用一次
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // 网络请求失败，返回离线页面或默认内容
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
  );
});

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: 后台同步');
  }
});

// 推送通知
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : '新的音乐更新！',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '探索音乐',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/favicon.ico'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Katelya Player', options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
