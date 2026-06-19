const canvas = document.getElementById('loveRainCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

const messages = ['Love you more', 'Mãi bên nhau nhé', 'I love you', 'Thương', 'Bình yên là đây', 'Chỉ cần nhau thôi', 'Forever', 'My everything', 'Now and forever'];
const icons = ['❤️', '💖', '💗', '💕', '🌹', '✨'];
const starColors = ['#ffffff', '#fff5fb', '#ffb6e6', '#ff7ed1', '#ff4dbe'];
const rainItems = [];
const stars = [];
const imageCards = [];
const qrToggle = document.querySelector('.qr-toggle');
const qrPanel = document.getElementById('qrPanel');
const qrClose = document.querySelector('.qr-panel__close');
const qrCanvas = document.getElementById('qrCanvas');
const qrForm = document.getElementById('qrForm');
const qrUrlInput = document.getElementById('qrUrlInput');
const qrStatus = document.getElementById('qrStatus');
const defaultShareUrl = 'https://khanh-0124.github.io/shop-love/';

let width = 0;
let height = 0;
let dpr = 1;
let lastFrameTime = performance.now();
let frameAccumulator = 0;
let spawnIndex = 0;
let rotateX = 0;
let rotateY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let startRotateX = 0;
let startRotateY = 0;
let needsDepthSort = true;
let sortedRainItems = [];
const targetFrameMs = 1000 / 45;

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function getFontSize(depth) {
    const base = width < 520 ? 17 : 21;
    return base + depth * (width < 520 ? 3 : 5);
}

function getLineHeight(fontSize) {
    return Math.round(fontSize * 1.32);
}

function setTextFont(fontSize) {
    ctx.font = '700 ' + fontSize + 'px "Dancing Script", cursive';
}

function drawRoundedQrModule(qrCtx, x, y, size, radius) {
    qrCtx.beginPath();
    qrCtx.moveTo(x + radius, y);
    qrCtx.lineTo(x + size - radius, y);
    qrCtx.quadraticCurveTo(x + size, y, x + size, y + radius);
    qrCtx.lineTo(x + size, y + size - radius);
    qrCtx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
    qrCtx.lineTo(x + radius, y + size);
    qrCtx.quadraticCurveTo(x, y + size, x, y + size - radius);
    qrCtx.lineTo(x, y + radius);
    qrCtx.quadraticCurveTo(x, y, x + radius, y);
    qrCtx.fill();
}

function drawQrToCanvas(text) {
    if (typeof qrcode !== 'function') {
        throw new Error('Chưa tải được thư viện QR, hãy kiểm tra kết nối mạng.');
    }

    const qr = qrcode(0, 'H');
    qr.addData(text);
    qr.make();

    const qrCtx = qrCanvas.getContext('2d');
    const moduleCount = qr.getModuleCount();
    const quietZone = 5;
    const totalModules = moduleCount + quietZone * 2;
    const pixelSize = qrCanvas.width;
    const scale = Math.floor(pixelSize / totalModules);
    const qrSize = scale * totalModules;
    const offset = Math.floor((pixelSize - qrSize) / 2);
    const finderLimit = 7;
    const heartSize = Math.max(24, scale * 4.2);

    qrCtx.fillStyle = '#ffffff';
    qrCtx.fillRect(0, 0, pixelSize, pixelSize);

    for (let y = 0; y < moduleCount; y++) {
        for (let x = 0; x < moduleCount; x++) {
            if (qr.isDark(y, x)) {
                const inFinder = x < finderLimit && y < finderLimit
                    || x >= moduleCount - finderLimit && y < finderLimit
                    || x < finderLimit && y >= moduleCount - finderLimit;
                const cellX = offset + (x + quietZone) * scale;
                const cellY = offset + (y + quietZone) * scale;

                qrCtx.fillStyle = inFinder ? '#14000d' : '#ff2d9f';
                drawRoundedQrModule(qrCtx, cellX + scale * 0.08, cellY + scale * 0.08, scale * 0.84, inFinder ? 0 : scale * 0.28);
            }
        }
    }

    qrCtx.save();
    qrCtx.translate(pixelSize / 2, pixelSize / 2);
    qrCtx.fillStyle = '#ffffff';
    qrCtx.beginPath();
    qrCtx.arc(0, 0, heartSize * 0.66, 0, Math.PI * 2);
    qrCtx.fill();
    qrCtx.fillStyle = '#ff2d9f';
    qrCtx.beginPath();
    qrCtx.moveTo(0, heartSize * 0.34);
    qrCtx.bezierCurveTo(-heartSize * 0.76, -heartSize * 0.2, -heartSize * 0.45, -heartSize * 0.72, 0, -heartSize * 0.34);
    qrCtx.bezierCurveTo(heartSize * 0.45, -heartSize * 0.72, heartSize * 0.76, -heartSize * 0.2, 0, heartSize * 0.34);
    qrCtx.fill();
    qrCtx.restore();
}

function getQrShareUrl() {
    if (window.location.protocol === 'file:' || isLocalShareUrl(window.location.href)) {
        return defaultShareUrl;
    }

    return window.location.href;
}

function isLocalShareUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === 'file:' || parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
    } catch (error) {
        return false;
    }
}

function updateQrStatus(url) {
    if (!url) {
        qrStatus.textContent = 'Nhập link deploy hoặc link IP LAN rồi bấm Tạo.';
        return;
    }

    qrStatus.textContent = isLocalShareUrl(url)
        ? 'Link local chỉ mở trên máy này. Hãy dùng link GitHub Pages hoặc IP LAN.'
        : 'Máy khác quét QR sẽ mở link này.';
}

function renderQr(url) {
    if (!url) {
        const qrCtx = qrCanvas.getContext('2d');
        qrCtx.fillStyle = '#ffffff';
        qrCtx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
        updateQrStatus('');
        return;
    }

    drawQrToCanvas(url);
    updateQrStatus(url);
}

function initQrPanel() {
    const shareUrl = getQrShareUrl();
    qrUrlInput.value = shareUrl;
    renderQr(shareUrl);

    qrToggle.addEventListener('click', () => {
        const isOpen = qrPanel.classList.toggle('is-open');
        qrToggle.setAttribute('aria-expanded', String(isOpen));
    });

    qrClose.addEventListener('click', () => {
        qrPanel.classList.remove('is-open');
        qrToggle.setAttribute('aria-expanded', 'false');
    });

    qrForm.addEventListener('submit', (event) => {
        event.preventDefault();

        try {
            const url = qrUrlInput.value.trim();
            renderQr(url);
        } catch (error) {
            qrStatus.textContent = error.message;
        }
    });
}

function createImageCard(index) {
    const card = document.createElement('canvas');
    const cardCtx = card.getContext('2d');
    const size = 220;
    const gradients = [
        ['#ff7ed1', '#2b001d'],
        ['#fff5fb', '#ff4dbe'],
        ['#ffb6e6', '#540037']
    ];
    const colors = gradients[index % gradients.length];

    card.width = size;
    card.height = size;

    const gradient = cardCtx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    cardCtx.fillStyle = gradient;
    cardCtx.fillRect(0, 0, size, size);

    cardCtx.globalAlpha = 0.2;
    cardCtx.fillStyle = '#ffffff';
    cardCtx.beginPath();
    cardCtx.arc(size * 0.2, size * 0.18, size * 0.28, 0, Math.PI * 2);
    cardCtx.fill();

    cardCtx.globalAlpha = 1;
    cardCtx.textAlign = 'center';
    cardCtx.textBaseline = 'middle';
    cardCtx.font = '700 78px "Quicksand", sans-serif';
    cardCtx.fillStyle = '#fff';
    cardCtx.shadowBlur = 22;
    cardCtx.shadowColor = '#fff';
    cardCtx.fillText(['💖', '🌹', '✨'][index % 3], size / 2, size / 2);

    cardCtx.font = '700 24px "Dancing Script", cursive';
    cardCtx.lineJoin = 'round';
    cardCtx.lineWidth = 2.2;
    cardCtx.strokeStyle = 'rgba(255, 77, 190, 0.92)';
    cardCtx.shadowBlur = 7;
    cardCtx.shadowColor = '#ff4dbe';
    cardCtx.strokeText(messages[index % messages.length], size / 2, size * 0.78);
    cardCtx.shadowBlur = 3;
    cardCtx.fillStyle = '#fff8fd';
    cardCtx.fillText(messages[index % messages.length], size / 2, size * 0.78);

    return card;
}

function initImageCards() {
    imageCards.length = 0;

    for (let i = 0; i < 3; i++) {
        imageCards.push(createImageCard(i));
    }
}

function wrapText(text, maxWidth, fontSize) {
    setTextFont(fontSize);
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (let i = 0; i < words.length; i++) {
        const testLine = line ? line + ' ' + words[i] : words[i];

        if (ctx.measureText(testLine).width > maxWidth && line) {
            lines.push(line);
            line = words[i];
        } else {
            line = testLine;
        }
    }

    if (line) {
        lines.push(line);
    }

    return lines;
}

function getLanePosition(index, totalItems, spreadInitial, blockHeight) {
    const columnCount = width < 520 ? 3 : 5;
    const rowCount = Math.ceil(totalItems / columnCount);
    const column = index % columnCount;
    const row = Math.floor(index / columnCount);
    const focusWidth = width * (width < 520 ? 0.82 : 0.7);
    const startX = (width - focusWidth) / 2;
    const columnWidth = focusWidth / columnCount;
    const rowHeight = (height + blockHeight * 3.1) / Math.max(rowCount, 1);
    const stagger = row % 2 === 0 ? columnWidth * 0.06 : -columnWidth * 0.06;
    const jitterX = randomBetween(-columnWidth * 0.04, columnWidth * 0.04);
    const jitterY = randomBetween(-rowHeight * 0.035, rowHeight * 0.035);
    const x = startX + columnWidth * (column + 0.5) + stagger + jitterX;
    const y = spreadInitial
        ? rowHeight * row - blockHeight - height * 0.18 + jitterY
        : -blockHeight - rowHeight * 0.55 - (index % columnCount) * 24;

    return {
        x: Math.min(Math.max(x, width * 0.16), width * 0.84),
        y
    };
}

function createRainItem(spreadInitial = false, index = spawnIndex, totalItems = rainItems.length || 1) {
    const depth = Math.floor(randomBetween(0, 5));
    const fontSize = getFontSize(depth);
    const lineHeight = getLineHeight(fontSize);
    const maxTextWidth = Math.min(width * 0.84, width < 520 ? 310 : 720);
    const randomType = Math.random();
    const isImage = randomType < 0.18;
    const isIcon = !isImage && randomType < 0.32;
    const text = messages[Math.floor(Math.random() * messages.length)];
    const lines = isImage ? [] : isIcon ? [icons[Math.floor(Math.random() * icons.length)]] : wrapText(text, maxTextWidth, fontSize);
    const imageSize = Math.round((width < 520 ? 64 : 82) + depth * (width < 520 ? 9 : 13));
    const blockHeight = isImage ? imageSize : lines.length * lineHeight;
    const position = getLanePosition(index, totalItems, spreadInitial, blockHeight);
    spawnIndex++;

    return {
        lines,
        image: isImage ? imageCards[Math.floor(Math.random() * imageCards.length)] : null,
        imageSize,
        x: position.x,
        y: position.y,
        z: depth,
        fontSize,
        lineHeight,
        blockHeight,
        speed: randomBetween(34, 58) * (0.78 + depth * 0.15),
        drift: randomBetween(-5, 5),
        wave: randomBetween(0, Math.PI * 2),
        waveSpeed: randomBetween(0.35, 0.75),
        opacity: randomBetween(0.62, 0.98) + depth * 0.03,
        hue: randomBetween(326, 334),
        isImage,
        isIcon,
        projectedX: position.x,
        projectedY: position.y,
        projectedScale: 1,
        projectedZ: 0
    };
}

function createStar() {
    return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: randomBetween(1.3, 3.7),
        opacity: randomBetween(0.34, 0.92),
        pulse: randomBetween(0, Math.PI * 2),
        speed: randomBetween(0.18, 0.62),
        color: starColors[Math.floor(Math.random() * starColors.length)]
    };
}

function initScene() {
    const itemCount = width < 520 ? 16 : 28;
    const starCount = width < 520 ? 90 : 160;
    rainItems.length = 0;
    stars.length = 0;
    spawnIndex = 0;
    needsDepthSort = true;
    sortedRainItems = [];
    initImageCards();

    for (let i = 0; i < itemCount; i++) {
        rainItems.push(createRainItem(true, i, itemCount));
    }

    for (let i = 0; i < starCount; i++) {
        stars.push(createStar());
    }
}

function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initScene();
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#070002');
    gradient.addColorStop(0.18, '#15000d');
    gradient.addColorStop(0.5, '#31001f');
    gradient.addColorStop(0.82, '#120009');
    gradient.addColorStop(1, '#000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.32;
    const blurA = ctx.createRadialGradient(width * 0.5, height * 0.46, 0, width * 0.5, height * 0.46, Math.max(width, height) * 0.62);
    blurA.addColorStop(0, 'rgba(255, 0, 150, 0.28)');
    blurA.addColorStop(0.45, 'rgba(255, 0, 150, 0.12)');
    blurA.addColorStop(1, 'rgba(255, 0, 150, 0)');
    ctx.fillStyle = blurA;
    ctx.fillRect(0, 0, width, height);

    const blurB = ctx.createRadialGradient(width * 0.24, height * 0.74, 0, width * 0.24, height * 0.74, Math.max(width, height) * 0.36);
    blurB.addColorStop(0, 'rgba(255, 105, 180, 0.18)');
    blurB.addColorStop(1, 'rgba(255, 105, 180, 0)');
    ctx.fillStyle = blurB;
    ctx.fillRect(0, 0, width, height);

    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.74);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

function drawStars(deltaTime, time) {
    ctx.save();

    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.y += star.speed * deltaTime * 8;

        if (star.y > height + 4) {
            star.y = -4;
            star.x = Math.random() * width;
        }

        const opacity = star.opacity * (0.72 + Math.sin(time * 1.8 + star.pulse) * 0.28);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = star.color;
        ctx.shadowBlur = star.size * 4;
        ctx.shadowColor = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        if (star.size > 2.4) {
            ctx.globalAlpha = opacity * 0.75;
            ctx.lineWidth = 0.8;
            ctx.strokeStyle = star.color;
            ctx.beginPath();
            ctx.moveTo(star.x - star.size * 2.1, star.y);
            ctx.lineTo(star.x + star.size * 2.1, star.y);
            ctx.moveTo(star.x, star.y - star.size * 2.1);
            ctx.lineTo(star.x, star.y + star.size * 2.1);
            ctx.stroke();
        }
    }

    ctx.restore();
}

function projectPoint(x, y, depth) {
    const rotateXRadians = rotateX * Math.PI / 180;
    const rotateYRadians = rotateY * Math.PI / 180;
    const perspective = 980;
    const centerX = width / 2;
    const centerY = height / 2;
    const sourceX = x - centerX;
    const sourceY = y - centerY;
    const sourceZ = (depth - 2) * 150;
    const cosY = Math.cos(rotateYRadians);
    const sinY = Math.sin(rotateYRadians);
    const cosX = Math.cos(rotateXRadians);
    const sinX = Math.sin(rotateXRadians);
    const rotatedX = sourceX * cosY + sourceZ * sinY;
    const rotatedZAfterY = -sourceX * sinY + sourceZ * cosY;
    const rotatedY = sourceY * cosX - rotatedZAfterY * sinX;
    const rotatedZ = sourceY * sinX + rotatedZAfterY * cosX;
    const scale = perspective / Math.max(360, perspective - rotatedZ);

    return {
        x: centerX + rotatedX * scale,
        y: centerY + rotatedY * scale,
        scale,
        z: rotatedZ
    };
}

function roundedRect(x, y, rectWidth, rectHeight, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + rectWidth - radius, y);
    ctx.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + radius);
    ctx.lineTo(x + rectWidth, y + rectHeight - radius);
    ctx.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - radius, y + rectHeight);
    ctx.lineTo(x + radius, y + rectHeight);
    ctx.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
}

function drawRoundedImage(image, size, opacity) {
    const radius = Math.max(10, size * 0.11);
    const half = size / 2;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.shadowBlur = isDragging ? 22 : 42;
    ctx.shadowColor = 'rgba(255, 0, 150, 1)';
    ctx.fillStyle = 'rgba(255, 0, 150, 0.34)';
    ctx.beginPath();
    roundedRect(-half - 6, -6, size + 12, size + 12, radius + 6);
    ctx.fill();

    ctx.shadowBlur = isDragging ? 10 : 18;
    ctx.shadowColor = 'rgba(255, 245, 251, 0.95)';
    ctx.fillStyle = 'rgba(255, 245, 251, 0.22)';
    ctx.beginPath();
    roundedRect(-half - 2, -2, size + 4, size + 4, radius + 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    roundedRect(-half, 0, size, size, radius);
    ctx.clip();
    ctx.drawImage(image, -half, 0, size, size);
    ctx.restore();
}

function drawNeonText(item, opacity) {
    const glowColor = 'hsla(' + item.hue + ', 100%, 58%, ';
    const hotCoreColor = 'hsla(' + item.hue + ', 100%, 72%, ' + Math.min(opacity * 1.08, 1) + ')';
    const fillColor = 'rgba(255, 248, 253, ' + Math.min(opacity * 1.18, 1) + ')';

    ctx.lineJoin = 'round';

    ctx.lineWidth = Math.max(3.5, item.fontSize * 0.14);
    ctx.strokeStyle = glowColor + '0.14)';
    ctx.shadowBlur = isDragging ? 12 : item.z > 2 ? 20 : 16;
    ctx.shadowColor = glowColor + '1)';

    for (let i = 0; i < item.lines.length; i++) {
        ctx.strokeText(item.lines[i], 0, i * item.lineHeight);
    }

    ctx.lineWidth = Math.max(1.8, item.fontSize * 0.072);
    ctx.strokeStyle = glowColor + '0.92)';
    ctx.shadowBlur = isDragging ? 6 : item.z > 2 ? 8 : 6;
    ctx.shadowColor = 'rgba(255, 0, 150, 1)';

    for (let i = 0; i < item.lines.length; i++) {
        ctx.strokeText(item.lines[i], 0, i * item.lineHeight);
    }

    ctx.lineWidth = Math.max(0.9, item.fontSize * 0.038);
    ctx.strokeStyle = hotCoreColor;
    ctx.fillStyle = fillColor;
    ctx.shadowBlur = isDragging ? 2 : item.z > 2 ? 3 : 2;
    ctx.shadowColor = 'rgba(255, 245, 251, 1)';

    for (let i = 0; i < item.lines.length; i++) {
        const y = i * item.lineHeight;
        ctx.strokeText(item.lines[i], 0, y);
        ctx.fillText(item.lines[i], 0, y);
    }
}

function drawRainItem(item, deltaTime, time) {
    item.y += item.speed * deltaTime;
    item.wave += item.waveSpeed * deltaTime;

    if (item.y > height + item.blockHeight + 80) {
        Object.assign(item, createRainItem(false, spawnIndex, rainItems.length));
        const recycledX = item.x + Math.sin(item.wave + time * 0.45) * item.drift;
        const recycledProjection = projectPoint(recycledX, item.y, item.z);
        item.projectedX = recycledProjection.x;
        item.projectedY = recycledProjection.y;
        item.projectedScale = recycledProjection.scale;
        item.projectedZ = recycledProjection.z;
        needsDepthSort = true;
    }

    if (item.projectedX === 0 && item.projectedY === 0) {
        return;
    }

    const depthScale = 0.78 + item.z * 0.08;
    const fadeIn = Math.min((item.y + item.blockHeight + 80) / 140, 1);
    const fadeOut = item.y > height - 160 ? Math.max(0, (height + item.blockHeight - item.y) / (item.blockHeight + 160)) : 1;
    const perspectiveOpacity = Math.min(Math.max(item.projectedScale, 0.58), 1.28);
    const opacity = Math.max(0, Math.min(item.opacity, item.opacity * fadeIn * fadeOut * perspectiveOpacity));

    ctx.save();
    ctx.translate(item.projectedX, item.projectedY);
    ctx.scale(depthScale * item.projectedScale, depthScale * item.projectedScale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '700 ' + item.fontSize + 'px "' + (item.isIcon ? 'Quicksand' : 'Dancing Script') + '", cursive';

    if (item.isImage) {
        drawRoundedImage(item.image, item.imageSize, opacity);
    } else {
        drawNeonText(item, opacity);
    }

    ctx.restore();
}

function handlePointerDown(event) {
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    startRotateX = rotateX;
    startRotateY = rotateY;
    needsDepthSort = true;
    canvas.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
    if (!isDragging) {
        return;
    }

    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    rotateY = Math.max(-42, Math.min(42, startRotateY + deltaX * 0.14));
    rotateX = Math.max(-28, Math.min(28, startRotateX - deltaY * 0.14));
}

function handlePointerEnd() {
    isDragging = false;
}

function animate(currentTime) {
    const elapsed = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    frameAccumulator += elapsed;

    if (frameAccumulator < targetFrameMs) {
        requestAnimationFrame(animate);
        return;
    }

    const deltaTime = Math.min(frameAccumulator / 1000, 0.08);
    frameAccumulator = 0;
    const time = currentTime / 1000;

    drawBackground();
    drawStars(deltaTime, time);

    for (let i = 0; i < rainItems.length; i++) {
        const item = rainItems[i];
        const x = item.x + Math.sin(item.wave + time * 0.45) * item.drift;
        const projected = projectPoint(x, item.y, item.z);
        item.projectedX = projected.x;
        item.projectedY = projected.y;
        item.projectedScale = projected.scale;
        item.projectedZ = projected.z;
    }

    if (needsDepthSort) {
        sortedRainItems = rainItems.slice().sort((itemA, itemB) => itemA.projectedZ - itemB.projectedZ);
        needsDepthSort = false;
    }

    for (let i = 0; i < sortedRainItems.length; i++) {
        drawRainItem(sortedRainItems[i], deltaTime, time);
    }

    requestAnimationFrame(animate);
}

resizeCanvas();
initQrPanel();
window.addEventListener('resize', resizeCanvas);
canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerEnd);
canvas.addEventListener('pointercancel', handlePointerEnd);
canvas.addEventListener('pointerleave', handlePointerEnd);
requestAnimationFrame(animate);
