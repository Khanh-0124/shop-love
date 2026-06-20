// Cấu hình Firebase của bạn (Hãy thay đổi các thông số dưới đây bằng thông số từ Firebase Console của bạn)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Khởi tạo Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase đã được khởi tạo thành công!");
} else {
    console.error("Không tìm thấy SDK Firebase. Vui lòng kiểm tra lại liên kết CDN trong index.html.");
}

/**
 * Hàm upload ảnh lên Firebase Storage
 * @param {Blob|File} fileOrBlob - Đối tượng file hoặc blob ảnh cần upload
 * @param {string} userId - ID người dùng để tạo thư mục lưu trữ ảnh riêng biệt
 * @returns {Promise<string>} - Trả về URL tải ảnh trực tiếp sau khi upload thành công
 */
async function uploadImageToStorage(fileOrBlob, userId = 'default') {
    if (!fileOrBlob) {
        console.warn("Không có file/blob nào được chọn.");
        return null;
    }

    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK chưa được tải.");
        return null;
    }

    const storage = firebase.storage();
    const fileName = fileOrBlob.name || `image_${Date.now()}.jpg`;
    // Tạo đường dẫn lưu trữ: images/{userId}/{timestamp}_{tên_file}
    const fileRef = storage.ref().child(`images/${userId}/${Date.now()}_${fileName}`);

    try {
        console.log(`Đang tải ảnh lên: images/${userId}/${fileName}...`);
        const snapshot = await fileRef.put(fileOrBlob);
        const downloadURL = await snapshot.ref.getDownloadURL();
        console.log("Tải ảnh lên Firebase Storage thành công! Link ảnh: ", downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("Lỗi trong quá trình upload ảnh lên Firebase Storage:", error);
        throw error;
    }
}

/**
 * Hàm upload tệp nhạc lên Firebase Storage
 * @param {File} file - Đối tượng file nhạc cần upload
 * @param {string} userId - ID người dùng
 * @returns {Promise<string>} - Trả về URL tải nhạc trực tiếp sau khi upload thành công
 */
async function uploadAudioToStorage(file, userId = 'default') {
    if (!file) {
        console.warn("Không có file nhạc nào được chọn.");
        return null;
    }

    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK chưa được tải.");
        return null;
    }

    const storage = firebase.storage();
    // Tạo đường dẫn lưu trữ: audio/{userId}/{timestamp}_{tên_file}
    const fileRef = storage.ref().child(`audio/${userId}/${Date.now()}_${file.name}`);

    try {
        console.log(`Đang tải nhạc lên: audio/${userId}/${file.name}...`);
        const snapshot = await fileRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        console.log("Tải nhạc lên Firebase Storage thành công! Link nhạc: ", downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("Lỗi trong quá trình upload nhạc lên Firebase Storage:", error);
        throw error;
    }
}
