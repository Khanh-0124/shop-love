const canvas = document.getElementById('loveRainCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

const messages = ['Love you more', 'Mãi bên nhau nhé', 'I love you', 'Thương', 'Bình yên là đây', 'Chỉ cần nhau thôi', 'Forever', 'My everything', 'Now and forever'];
const icons = ['❤️', '✨💍', '💗', '💕', '🌹', '✨💍'];
const starColors = ['#ffffff', '#fff5fb', '#ffb6e6', '#ff7ed1', '#ff4dbe'];
const rainItems = [];
const stars = [];
const imageCards = [];
const galleryStorageKey = 'loveRainAdminGallery';
const defaultUserId = 'default';
const allUsersId = '__all';
const defaultUsers = [
    {
        id: defaultUserId,
        name: 'Default',
        musicUrl: '',
        musicSrc: '',
        images: []
    }
];

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
let galleryUsers = [];
let activeUser = defaultUsers[0];
let activeUserImages = [];
let imageBurstUntil = 0;
let galleryReady = false;
let userMusic = null;
let pendingMusicUrl = '';
const targetFrameMs = 1000 / 45;

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function getFontSize(depth) {
    const base = width < 520 ? 18 : 19;
    return base + depth * (width < 520 ? 2.4 : 3.4);
}

function getLineHeight(fontSize) {
    return Math.round(fontSize * 1.72);
}

function setTextFont(fontSize) {
    ctx.font = '700 ' + fontSize + 'px "Dancing Script", cursive';
}

function normalizeUserId(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'user';
}

function normalizeUsers(rawUsers) {
    const sourceUsers = Array.isArray(rawUsers) ? rawUsers : Object.values(rawUsers || {});
    return sourceUsers.map((user) => ({
        id: user.id || normalizeUserId(user.name || 'user'),
        name: user.name || 'User',
        musicUrl: user.musicUrl || '',
        musicSrc: user.musicSrc || '',
        images: Array.isArray(user.images) ? user.images : []
    }));
}

// Giới hạn thời gian chờ của một Promise để tránh bị treo trang khi chạy file cục bộ (file://)
function promiseWithTimeout(promise, ms) {
    let timeout = new Promise((resolve, reject) => {
        let id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error("Timeout kết nối Firebase Database sau " + ms + "ms"));
        }, ms);
    });
    return Promise.race([promise, timeout]);
}

async function readGalleryUsersAsync() {
    if (typeof firebase !== 'undefined') {
        try {
            console.log("Đang tải dữ liệu từ Firebase Realtime Database...");
            const snapshot = await promiseWithTimeout(firebase.database().ref('galleryUsers').once('value'), 6000);
            const data = snapshot.val();
            const remoteUsers = normalizeUsers(data);
            if (remoteUsers.length > 0) {
                localStorage.setItem(galleryStorageKey, JSON.stringify(remoteUsers));
                return remoteUsers;
            }
        } catch (error) {
            console.warn("Không thể tải từ Firebase Realtime Database (treo hoặc lỗi), sử dụng dữ liệu dự phòng.", error);
        }
    }

    try {
        const savedUsers = JSON.parse(localStorage.getItem(galleryStorageKey));
        if (Array.isArray(savedUsers) && savedUsers.length > 0) {
            return normalizeUsers(savedUsers);
        }
    } catch (e) {}

    return defaultUsers;
}

function getUserIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('user') || '';
}

function createCombinedUser(users) {
    const sharedUsers = users.filter((user) => user.id !== defaultUserId && user.images.length > 0);
    const sourceUsers = sharedUsers.length > 0 ? sharedUsers : users;
    const musicUser = sourceUsers.find((user) => user.musicSrc || user.musicUrl);

    return {
        id: allUsersId,
        name: 'All',
        musicUrl: musicUser ? musicUser.musicUrl : '',
        musicSrc: musicUser ? musicUser.musicSrc : '',
        images: sourceUsers.flatMap((user) => user.images)
    };
}

function pickActiveUser(users) {
    const requestedUserId = getUserIdFromUrl();

    if (requestedUserId) {
        return users.find((user) => user.id === requestedUserId) || createCombinedUser(users);
    }

    return createCombinedUser(users);
}

function loadImage(src) {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });
}

async function loadActiveUserImages() {
    const loadedImages = await Promise.all(activeUser.images.map((image) => loadImage(image.src)));
    activeUserImages = loadedImages.filter(Boolean);
    galleryReady = true;
    initScene();
    startUserMusic(activeUser.musicSrc || activeUser.musicUrl || '');
}

function setActiveUser(userId, shouldUpdateUrl = true) {
    activeUser = galleryUsers.find((user) => user.id === userId) || galleryUsers[0] || defaultUsers[0];
    localStorage.setItem('loveRainActiveUser', activeUser.id);

    if (shouldUpdateUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set('user', activeUser.id);
        window.history.replaceState({}, '', url);
    }

    imageBurstUntil = performance.now() + 4200;
    loadActiveUserImages();
}

function stopUserMusic() {
    if (userMusic) {
        userMusic.pause();
        userMusic.removeAttribute('src');
        userMusic.load();
    }

    userMusic = null;
    pendingMusicUrl = '';
}

function playUserMusic() {
    if (!pendingMusicUrl) {
        return;
    }

    if (!userMusic) {
        userMusic = new Audio();
        userMusic.crossOrigin = 'anonymous';
        userMusic.loop = true;
        userMusic.preload = 'auto';
        userMusic.src = pendingMusicUrl;
    }

    userMusic.volume = 0.72;
    userMusic.play().catch((error) => {
        console.warn('Không thể tự phát nhạc. Hãy chạm màn hình hoặc dùng link file audio trực tiếp.', error);
    });
}

function startUserMusic(musicUrl) {
    if (!musicUrl) {
        stopUserMusic();
        return;
    }

    if (pendingMusicUrl === musicUrl && userMusic) {
        playUserMusic();
        return;
    }

    stopUserMusic();
    pendingMusicUrl = musicUrl;
    playUserMusic();
}

async function initGalleryUsers() {
    galleryUsers = await readGalleryUsersAsync();
    activeUser = pickActiveUser(galleryUsers);
    loadActiveUserImages();

    if (typeof firebase !== 'undefined') {
        firebase.database().ref('galleryUsers').on('value', (snapshot) => {
            const remoteUsers = normalizeUsers(snapshot.val());

            if (remoteUsers.length === 0) {
                return;
            }

            galleryUsers = remoteUsers;
            localStorage.setItem(galleryStorageKey, JSON.stringify(remoteUsers));
            activeUser = pickActiveUser(galleryUsers);
            loadActiveUserImages();
        }, (error) => {
            console.warn('Không thể lắng nghe Firebase Realtime Database.', error);
        });
    }
}

function createImageCard(index) {
    const card = document.createElement('canvas');
    const cardCtx = card.getContext('2d');
    const size = 220;
    const sourceImage = activeUserImages[index % activeUserImages.length];
    const gradients = [
        ['#ff7ed1', '#2b001d'],
        ['#fff5fb', '#ff4dbe'],
        ['#ffb6e6', '#540037']
    ];
    const colors = gradients[index % gradients.length];

    card.width = size;
    card.height = size;

    if (sourceImage) {
        const scale = Math.max(size / sourceImage.width, size / sourceImage.height);
        const drawWidth = sourceImage.width * scale;
        const drawHeight = sourceImage.height * scale;
        const drawX = (size - drawWidth) / 2;
        const drawY = (size - drawHeight) / 2;
        cardCtx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
    } else {
        const gradient = cardCtx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        cardCtx.fillStyle = gradient;
        cardCtx.fillRect(0, 0, size, size);
    }

    if (!sourceImage) {
        cardCtx.globalAlpha = 0.2;
        cardCtx.fillStyle = '#ffffff';
        cardCtx.beginPath();
        cardCtx.arc(size * 0.2, size * 0.18, size * 0.28, 0, Math.PI * 2);
        cardCtx.fill();
    }

    cardCtx.globalAlpha = 1;
    cardCtx.textAlign = 'center';
    cardCtx.textBaseline = 'middle';
    cardCtx.font = '700 78px "Quicksand", sans-serif';
    cardCtx.fillStyle = '#fff';
    cardCtx.shadowBlur = 22;
    cardCtx.shadowColor = '#fff';
    if (!sourceImage) {
        cardCtx.fillText(['💖', '🌹', '✨'][index % 3], size / 2, size / 2);
    }

    return card;
}

function initImageCards() {
    imageCards.length = 0;
    const cardCount = Math.max(3, activeUserImages.length);

    for (let i = 0; i < cardCount; i++) {
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
    const columnCount = width < 520 ? 4 : 7;
    const rowCount = Math.ceil(totalItems / columnCount);
    const column = index % columnCount;
    const row = Math.floor(index / columnCount);
    const focusWidth = width * (width < 520 ? 0.82 : 0.7);
    const startX = (width - focusWidth) / 2;
    const columnWidth = focusWidth / columnCount;
    const rowHeight = (height + blockHeight * 3.2) / Math.max(rowCount, 1);
    const stagger = row % 2 === 0 ? columnWidth * 0.06 : -columnWidth * 0.06;
    const jitterX = randomBetween(-columnWidth * 0.04, columnWidth * 0.04);
    const jitterY = randomBetween(-rowHeight * 0.018, rowHeight * 0.018);
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
    const imageChance = activeUserImages.length > 0 && performance.now() < imageBurstUntil ? 0.58 : 0.22;
    const isImage = randomType < imageChance;
    const isIcon = !isImage && randomType < imageChance + 0.14;
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
    const itemCount = width < 520 ? 26 : 46;
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

    if (galleryReady) {
        initScene();
    }
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
    const glowColor = 'rgba(204, 0, 112, ';
    const hotCoreColor = 'rgba(226, 25, 137, ' + Math.min(opacity * 1.02, 1) + ')';
    const fillColor = 'rgba(255, 235, 247, ' + Math.min(opacity * 1.12, 1) + ')';

    ctx.lineJoin = 'round';

    ctx.lineWidth = Math.max(3.2, item.fontSize * 0.2);
    ctx.strokeStyle = glowColor + '0.1)';
    ctx.shadowBlur = 4;
    ctx.shadowColor = glowColor + '0.72)';

    for (let i = 0; i < item.lines.length; i++) {
        ctx.strokeText(item.lines[i], 0, i * item.lineHeight);
    }

    ctx.lineWidth = Math.max(1.7, item.fontSize * 0.09);
    ctx.strokeStyle = glowColor + '0.78)';
    ctx.shadowBlur = 1.5;
    ctx.shadowColor = 'rgba(204, 0, 112, 0.82)';

    for (let i = 0; i < item.lines.length; i++) {
        ctx.strokeText(item.lines[i], 0, i * item.lineHeight);
    }

    ctx.lineWidth = Math.max(1, item.fontSize * 0.045);
    ctx.strokeStyle = hotCoreColor;
    ctx.fillStyle = fillColor;
    ctx.shadowBlur = 0.4;
    ctx.shadowColor = 'rgba(226, 25, 137, 0.65)';

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
    playUserMusic();
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

/**
 * Hàm upload ảnh mới lên Cloudinary và thêm vào danh sách ảnh của activeUser
 * @param {File} file - File ảnh được upload từ input
 */
async function addNewImageToActiveUser(file) {
    try {
        const downloadURL = await uploadToCloudinary(file, 'image');
        if (!downloadURL) return;

        // Thêm vào danh sách ảnh của user hiện tại
        activeUser.images.push({ src: downloadURL });

        // Cập nhật lại danh sách gallery trong localStorage
        const userIndex = galleryUsers.findIndex(u => u.id === activeUser.id);
        if (userIndex !== -1) {
            galleryUsers[userIndex] = activeUser;
        } else {
            galleryUsers.push(activeUser);
        }
        localStorage.setItem(galleryStorageKey, JSON.stringify(galleryUsers));

        // Load lại ảnh và cập nhật UI
        await loadActiveUserImages();
        console.log("Đã cập nhật ảnh thành công vào giao diện!");
    } catch (error) {
        console.error("Lỗi khi thêm ảnh mới:", error);
    }
}

resizeCanvas();
initGalleryUsers();
window.addEventListener('resize', resizeCanvas);
canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerEnd);
canvas.addEventListener('pointercancel', handlePointerEnd);
canvas.addEventListener('pointerleave', handlePointerEnd);
requestAnimationFrame(animate);
