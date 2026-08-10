const puppeteer = require('puppeteer');

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    browserInstance = await puppeteer.launch({
      headless: 'new',
      executablePath: chromePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--ignore-certificate-errors',
        '--disable-blink-features=AutomationControlled'
      ]
    });
  }
  return browserInstance;
}

async function convertUrlToPdf(url, options = {}) {
  const { mode = 'pdf' } = options;
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    });
    await page.setViewport({ width: 1920, height: 1080 });

    await page.setRequestInterception(true);
    page.on('request', (req) => req.continue());

    const NAVIGATION_TIMEOUT = 60000;
    await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: NAVIGATION_TIMEOUT
    });

    if (response && response.status() >= 400 && response.status() !== 403 && response.status() !== 304) {
      throw new Error(`Error al cargar la página: ${response.status()}`);
    }

    await page.waitForSelector('body', { timeout: 10000 });

    // Detectar Cloudflare
    const pageContent = await page.content();
    const isCloudflare = 
      pageContent.includes('Verificación de seguridad') ||
      pageContent.includes('Cloudflare') ||
      pageContent.includes('cf_chl') ||
      pageContent.includes('ray ID') ||
      pageContent.includes('Checking your browser');

    if (isCloudflare) {
      console.log('🔒 Cloudflare detectado.');
      const error = new Error('El sitio está protegido por Cloudflare');
      error.type = 'CLOUDFLARE_BLOCK';
      throw error;
    }

    // Si modo es screenshot
    if (mode === 'screenshot') {
      console.log('📸 Tomando captura de pantalla...');
      const screenshotBuffer = await page.screenshot({ fullPage: true, encoding: 'binary' });
      return { buffer: screenshotBuffer, contentType: 'image/png', isScreenshot: true };
    }

    // Modo PDF
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight || totalHeight > 5000) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      preferCSSPageSize: true,
      width: '1920px',
      height: '1080px',
      omitBackground: false,
      timeout: 60000
    });

    if (pdfBuffer.length < 2048) {
      console.warn('⚠️ PDF muy pequeño, tomando captura...');
      const screenshotBuffer = await page.screenshot({ fullPage: true, encoding: 'binary' });
      return { buffer: screenshotBuffer, contentType: 'image/png', isScreenshot: true };
    }

    console.log('✅ PDF generado correctamente');
    return { buffer: pdfBuffer, contentType: 'application/pdf', isScreenshot: false };

  } catch (error) {
    console.error('❌ Error en convertUrlToPdf:', error);
    if (error.type) throw error;
    try {
      console.log('📸 Intentando captura de emergencia...');
      const screenshotBuffer = await page.screenshot({ fullPage: true, encoding: 'binary' });
      return { buffer: screenshotBuffer, contentType: 'image/png', isScreenshot: true };
    } catch (screenshotError) {
      console.error('❌ Falló también la captura:', screenshotError);
      throw error;
    }
  } finally {
    await page.close();
  }
}

process.on('exit', async () => {
  if (browserInstance) {
    await browserInstance.close();
  }
});

module.exports = { convertUrlToPdf };