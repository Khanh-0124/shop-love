const galleryStorageKey = 'loveRainAdminGallery';
const defaultUserId = 'default';
const defaultUsers = [
    {
        id: defaultUserId,
        name: 'Default',
        musicUrl: '',
        musicSrc: '',
        images: []
    }
];

const userForm = document.getElementById('userForm');
const userNameInput = document.getElementById('userName');
const userList = document.getElementById('userList');
const activeUserTitle = document.getElementById('activeUserTitle');
const deleteUserButton = document.getElementById('deleteUserButton');
const musicForm = document.getElementById('musicForm');
const musicUrlInput = document.getElementById('musicUrl');
const audioInput = document.getElementById('audioInput');
const imageInput = document.getElementById('imageInput');
const adminStatus = document.getElementById('adminStatus');
const imageGrid = document.getElementById('imageGrid');

let users = readUsers();
let activeUserId = localStorage.getItem('loveRainActiveUser') || users[0].id;

function normalizeUserId(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'user';
}

function readUsers() {
    try {
        const savedUsers = JSON.parse(localStorage.getItem(galleryStorageKey));

        if (Array.isArray(savedUsers) && savedUsers.length > 0) {
            return savedUsers.map((user) => ({
                id: user.id || normalizeUserId(user.name || 'user'),
                name: user.name || 'User',
                musicUrl: user.musicUrl || '',
                musicSrc: user.musicSrc || '',
                images: Array.isArray(user.images) ? user.images : []
            }));
        }
    } catch (error) {
        localStorage.removeItem(galleryStorageKey);
    }

    return defaultUsers;
}

function saveUsers() {
    try {
        localStorage.setItem(galleryStorageKey, JSON.stringify(users));
        return true;
    } catch (error) {
        setStatus('Bộ nhớ trình duyệt đầy. Xóa bớt ảnh hoặc chọn ảnh nhẹ hơn.');
        return false;
    }
}

function getActiveUser() {
    return users.find((user) => user.id === activeUserId) || users[0];
}

function setStatus(message) {
    adminStatus.textContent = message;
}

function isTikTokUrl(url) {
    try {
        return new URL(url).hostname.includes('tiktok.com');
    } catch (error) {
        return false;
    }
}

function isDirectAudioUrl(url) {
    if (!url) {
        return true;
    }

    try {
        const parsedUrl = new URL(url);
        const pathname = parsedUrl.pathname.toLowerCase();
        return /\.(mp3|m4a|aac|wav|ogg|opus)(\?.*)?$/.test(pathname + parsedUrl.search)
            || parsedUrl.searchParams.has('audio')
            || parsedUrl.searchParams.has('download');
    } catch (error) {
        return false;
    }
}

function renderUsers() {
    userList.innerHTML = '';

    users.forEach((user) => {
        const button = document.createElement('button');
        const name = document.createElement('span');
        const count = document.createElement('span');
        button.type = 'button';
        button.className = 'user-row' + (user.id === activeUserId ? ' is-active' : '');
        name.textContent = user.name;
        count.textContent = user.images.length + ' ảnh';
        button.append(name, count);
        button.addEventListener('click', () => {
            activeUserId = user.id;
            localStorage.setItem('loveRainActiveUser', activeUserId);
            render();
        });
        userList.appendChild(button);
    });
}

function renderImages() {
    const activeUser = getActiveUser();
    imageGrid.innerHTML = '';
    activeUserTitle.textContent = activeUser.name;
    musicUrlInput.value = activeUser.musicUrl || '';
    deleteUserButton.disabled = activeUser.id === defaultUserId;

    activeUser.images.forEach((image, index) => {
        const card = document.createElement('article');
        const preview = document.createElement('img');
        const deleteButton = document.createElement('button');
        card.className = 'image-card';
        preview.src = image.src;
        preview.alt = activeUser.name;
        deleteButton.type = 'button';
        deleteButton.textContent = 'Xóa ảnh';
        deleteButton.addEventListener('click', () => {
            activeUser.images.splice(index, 1);
            if (saveUsers()) {
                render();
                setStatus('Đã xóa ảnh.');
            }
        });
        card.append(preview, deleteButton);
        imageGrid.appendChild(card);
    });
}

function render() {
    activeUserId = getActiveUser().id;
    renderUsers();
    renderImages();
}

function makeUniqueUserId(name) {
    const baseId = normalizeUserId(name);
    let nextId = baseId;
    let count = 2;

    while (users.some((user) => user.id === nextId)) {
        nextId = baseId + '-' + count;
        count++;
    }

    return nextId;
}

function resizeImageToBlob(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const image = new Image();
            image.onload = () => {
                const maxSize = 1080;
                const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.width * scale));
                canvas.height = Math.max(1, Math.round(image.height * scale));
                const imageCtx = canvas.getContext('2d');
                imageCtx.drawImage(image, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        blob.name = file.name;
                        resolve(blob);
                    } else {
                        reject(new Error("Không thể chuyển đổi canvas thành Blob."));
                    }
                }, 'image/jpeg', 0.85);
            };
            image.onerror = reject;
            image.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

userForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = userNameInput.value.trim();

    if (!name) {
        setStatus('Nhập tên user trước đã.');
        return;
    }

    const user = {
        id: makeUniqueUserId(name),
        name,
        musicUrl: '',
        musicSrc: '',
        images: []
    };
    users.push(user);
    activeUserId = user.id;
    userNameInput.value = '';
    if (saveUsers()) {
        render();
        setStatus('Đã thêm user ' + name + '.');
    }
});

deleteUserButton.addEventListener('click', () => {
    const activeUser = getActiveUser();

    if (activeUser.id === defaultUserId) {
        setStatus('Không xóa user Default.');
        return;
    }

    users = users.filter((user) => user.id !== activeUser.id);
    activeUserId = users[0].id;
    localStorage.setItem('loveRainActiveUser', activeUserId);
    if (saveUsers()) {
        render();
        setStatus('Đã xóa user.');
    }
});

musicForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const activeUser = getActiveUser();
    const musicUrl = musicUrlInput.value.trim();

    if (isTikTokUrl(musicUrl)) {
        setStatus('Link TikTok là trang video, không phải direct audio URL. Hãy dùng link .mp3/.m4a/.wav hoặc upload file nhạc.');
        return;
    }

    if (!isDirectAudioUrl(musicUrl)) {
        setStatus('URL này chưa giống file audio trực tiếp. Hãy dùng link kết thúc bằng .mp3, .m4a, .wav, .ogg...');
        return;
    }

    activeUser.musicUrl = musicUrl;
    activeUser.musicSrc = '';

    if (saveUsers()) {
        render();
        setStatus(activeUser.musicUrl ? 'Đã lưu direct audio URL cho ' + activeUser.name + '.' : 'Đã xóa link nhạc.');
    }
});

audioInput.addEventListener('change', async () => {
    const file = audioInput.files && audioInput.files[0];
    const activeUser = getActiveUser();

    if (!file) {
        return;
    }

    setStatus('Đang tải tệp nhạc lên Cloudinary...');

    try {
        const downloadUrl = await uploadToCloudinary(file, 'video');
        if (downloadUrl) {
            activeUser.musicSrc = downloadUrl;
            activeUser.musicUrl = '';
            musicUrlInput.value = '';

            if (saveUsers()) {
                render();
                setStatus('Đã tải lên và lưu file nhạc thành công cho ' + activeUser.name + '.');
            }
        }
    } catch (error) {
        setStatus('Không thể tải file nhạc lên Cloudinary. Vui lòng kiểm tra cấu hình Cloudinary.');
    }

    audioInput.value = '';
});

imageInput.addEventListener('change', async () => {
    const files = Array.from(imageInput.files || []);
    const activeUser = getActiveUser();

    if (files.length === 0) {
        return;
    }

    setStatus('Đang tải ' + files.length + ' ảnh lên Cloudinary...');

    try {
        // 1. Resize ảnh thành các Blob để tiết kiệm băng thông và dung lượng Cloudinary
        const blobs = await Promise.all(files.map((file) => resizeImageToBlob(file)));

        // 2. Upload đồng thời các ảnh lên Cloudinary
        const uploadPromises = blobs.map(blob => uploadToCloudinary(blob, 'image'));
        const downloadUrls = await Promise.all(uploadPromises);

        // 3. Lưu link download URL vào danh sách ảnh của user
        const newImages = downloadUrls.filter(Boolean).map((url, idx) => ({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2) + idx,
            name: files[idx].name,
            src: url
        }));

        activeUser.images.push(...newImages);
        if (saveUsers()) {
            render();
            setStatus('Đã thêm thành công ' + newImages.length + ' ảnh lên Cloudinary cho ' + activeUser.name + '.');
        }
    } catch (error) {
        console.error(error);
        setStatus('Lỗi tải ảnh lên Cloudinary. Vui lòng kiểm tra cấu hình Cloudinary.');
    }

    imageInput.value = '';
});

render();
