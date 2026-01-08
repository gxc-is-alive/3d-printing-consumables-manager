<script setup lang="ts">
import wxQrCode from '@/assets/images/wx.jpg';
import zfbQrCode from '@/assets/images/zfb.jpg';

const makerWorldUrl = 'https://makerworld.com.cn/zh/@ganxiaochuan';
</script>

<template>
  <div class="donate">
    <header class="page-header">
      <h1>3D打印耗材管理系统</h1>
    </header>

    <main class="page-content">
      <router-link to="/" class="back-link">← 返回首页</router-link>
      
      <div class="donate-header">
        <h2>❤️ 支持开发者</h2>
        <p class="description">
          感谢您使用本系统！如果觉得有帮助，欢迎通过以下方式支持我：
        </p>
      </div>

      <div class="donate-cards">
        <div class="donate-card">
          <div class="card-icon wechat">
            <span>💚</span>
          </div>
          <h3>微信支付</h3>
          <div class="qr-code">
            <img :src="wxQrCode" alt="微信收款码" />
          </div>
          <p class="card-desc">扫码支持</p>
        </div>

        <div class="donate-card">
          <div class="card-icon alipay">
            <span>💙</span>
          </div>
          <h3>支付宝</h3>
          <div class="qr-code">
            <img :src="zfbQrCode" alt="支付宝收款码" />
          </div>
          <p class="card-desc">扫码支持</p>
        </div>

        <div class="donate-card">
          <div class="card-icon makerworld">
            <span>🚀</span>
          </div>
          <h3>MakerWorld 助力</h3>
          <div class="makerworld-content">
            <p>访问我的 MakerWorld 主页，为我的作品点赞助力！</p>
            <a 
              :href="makerWorldUrl" 
              target="_blank" 
              rel="noopener noreferrer"
              class="makerworld-btn"
            >
              去助力 →
            </a>
          </div>
        </div>
      </div>

      <div class="thank-you">
        <p>🙏 感谢您的支持，这将激励我持续改进和维护本项目！</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.donate {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  background: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #42b883;
}

.page-content {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.back-link {
  display: inline-block;
  color: #42b883;
  text-decoration: none;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.back-link:hover {
  text-decoration: underline;
}

.donate-header {
  text-align: center;
  margin-bottom: 2rem;
}

.donate-header h2 {
  font-size: 1.75rem;
  color: #333;
  margin: 0 0 0.75rem 0;
}

.description {
  color: #666;
  font-size: 1rem;
  margin: 0;
}

.donate-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.donate-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.donate-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  font-size: 1.75rem;
}

.card-icon.wechat {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
}

.card-icon.alipay {
  background: linear-gradient(135deg, #1677ff 0%, #0958d9 100%);
}

.card-icon.makerworld {
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
}

.donate-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: #333;
}

.qr-code {
  width: 200px;
  height: 200px;
  margin: 0 auto 0.75rem;
  background: #f9f9f9;
  border-radius: 8px;
  overflow: hidden;
}

.qr-code img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-desc {
  color: #888;
  font-size: 0.9rem;
  margin: 0;
}

.makerworld-content {
  padding: 1rem 0;
}

.makerworld-content p {
  color: #666;
  font-size: 0.95rem;
  margin: 0 0 1.25rem 0;
  line-height: 1.5;
}

.makerworld-btn {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  transition: transform 0.2s, box-shadow 0.2s;
}

.makerworld-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
}

.thank-you {
  text-align: center;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.thank-you p {
  margin: 0;
  color: #666;
  font-size: 0.95rem;
}

@media (max-width: 768px) {
  .page-content {
    padding: 1rem;
  }
  
  .donate-cards {
    grid-template-columns: 1fr;
  }
  
  .qr-code {
    width: 180px;
    height: 180px;
  }
}
</style>
